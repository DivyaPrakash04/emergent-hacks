#!/usr/bin/env python3
"""Generate a synthetic Gaussian-splat room (3DGS .ply) for testing the viewer offline.

Usage: python3 make_demo_room.py out.ply [--step 0.035]

Coordinates: metres, Y up, origin at floor centre. Room 6 m x 5 m x 2.7 m.
Textures are procedural (wood grain, plaster, fabric) with simple corner shading and
window light, so it reads as a room rather than flat colour. A real scan is still the
only way to get photo-real texture; this file exists so the viewer works with no network.
"""
import argparse

import numpy as np

SH_C0 = 0.28209479177387814
rng = np.random.default_rng(7)

W, D, H = 6.0, 5.0, 2.7  # x width, z depth, y height
hw, hd = W / 2, D / 2
WINDOW = np.array([0.0, 1.6, -hd])  # centre of the window (light source)

parts = []  # (xyz, rgb, scale, quat_wxyz, alpha)


# ---------- small procedural-noise helpers ----------
def hash2(ix, iy):
    h = (ix * 374761393 + iy * 668265263) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / 0xFFFFFF


def value_noise(x, y, freq):
    """Smooth 2D value noise in [0,1] at frequency `freq` (cells per metre)."""
    xs, ys = x * freq, y * freq
    ix, iy = np.floor(xs).astype(np.int64), np.floor(ys).astype(np.int64)
    fx, fy = xs - ix, ys - iy
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a, b = hash2(ix, iy), hash2(ix + 1, iy)
    c, d = hash2(ix, iy + 1), hash2(ix + 1, iy + 1)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(x, y, freq, octaves=4):
    out, amp, tot = 0.0, 1.0, 0.0
    for i in range(octaves):
        out = out + amp * value_noise(x + 17.3 * i, y - 9.1 * i, freq * 2 ** i)
        tot += amp
        amp *= 0.5
    return out / tot


# ---------- geometry ----------
def quat_from_normal(n):
    n = n / np.linalg.norm(n)
    z = np.array([0.0, 0.0, 1.0])
    if np.allclose(n, z):
        return np.array([1.0, 0, 0, 0])
    if np.allclose(n, -z):
        return np.array([0.0, 1, 0, 0])
    axis = np.cross(z, n)
    axis /= np.linalg.norm(axis)
    ang = np.arccos(np.clip(np.dot(z, n), -1, 1))
    return np.array([np.cos(ang / 2), *(axis * np.sin(ang / 2))])


def shade(xyz, normal):
    """Cheap lighting: window light falloff + darkening near floor/ceiling/wall corners."""
    d = np.linalg.norm(xyz - WINDOW[None, :], axis=1)
    light = 0.72 + 0.45 / (1 + (d / 3.2) ** 2)
    # ambient occlusion: distance to the nearest other surface
    dx = hw - np.abs(xyz[:, 0])
    dz = hd - np.abs(xyz[:, 2])
    dy = np.minimum(xyz[:, 1], H - xyz[:, 1])
    cands = [c for c, keep in ((dx, abs(normal[0]) < 0.5), (dz, abs(normal[2]) < 0.5), (dy, abs(normal[1]) < 0.5)) if keep]
    near = np.min(np.stack(cands), axis=0) if cands else np.full(len(xyz), 1.0)
    ao = 1 - 0.28 * np.exp(-near / 0.22)
    return (light * ao)[:, None]


def plane(origin, u, v, nu, nv, normal, color_fn, step, size_mult=0.62, alpha=0.97, lit=True, jitter=0.004):
    a = (np.arange(nu) + 0.5) * step
    b = (np.arange(nv) + 0.5) * step
    A, B = np.meshgrid(a, b, indexing="ij")
    A, B = A.ravel(), B.ravel()
    xyz = origin[None, :] + A[:, None] * u[None, :] + B[:, None] * v[None, :]
    xyz = xyz + rng.normal(0, jitter, xyz.shape)
    rgb = np.asarray(color_fn(A, B, xyz), dtype=float)
    if lit:
        rgb = rgb * shade(xyz, normal)
    rgb = np.clip(rgb + rng.normal(0, 0.012, rgb.shape), 0, 1)
    s = step * size_mult
    scale = np.tile([s, s, s * 0.06], (len(xyz), 1)) * rng.uniform(0.85, 1.15, (len(xyz), 1))
    q = np.tile(quat_from_normal(normal), (len(xyz), 1))
    parts.append((xyz, rgb, scale, q, alpha))


def solid(c):
    c = np.array(c, dtype=float)
    return lambda A, B, P: np.tile(c, (len(A), 1))


def textured(base, freq=6.0, amount=0.08):
    base = np.array(base, dtype=float)
    return lambda A, B, P: base[None, :] * (1 + amount * (fbm(A, B, freq) - 0.5) * 2)[:, None]


X, Y, Z = np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), np.array([0, 0, 1.0])


def box(x0, y0, z0, x1, y1, z1, color_fn, step):
    n = lambda lo, hi: max(1, int(round((hi - lo) / step)))
    nx, ny, nz = n(x0, x1), n(y0, y1), n(z0, z1)
    plane(np.array([x0, y1, z0]), X, Z, nx, nz, Y, color_fn, step)    # top
    plane(np.array([x0, y0, z0]), X, Z, nx, nz, -Y, color_fn, step)   # bottom
    plane(np.array([x0, y0, z1]), X, Y, nx, ny, Z, color_fn, step)    # front
    plane(np.array([x0, y0, z0]), X, Y, nx, ny, -Z, color_fn, step)   # back
    plane(np.array([x1, y0, z0]), Z, Y, nz, ny, X, color_fn, step)    # right
    plane(np.array([x0, y0, z0]), Z, Y, nz, ny, -X, color_fn, step)   # left


# ---------- materials ----------
def oak_floor(A, B, P):
    plank_w, plank_l = 0.14, 1.2
    row = np.floor(B / plank_w)
    offset = (row % 3) * 0.4
    col = np.floor((A + offset) / plank_l)
    seed = hash2(row.astype(np.int64), col.astype(np.int64))
    base = np.array([0.66, 0.50, 0.33])
    tone = 0.80 + 0.35 * seed
    grain = 0.10 * (fbm(A * 1.0, B * 18.0, 3.0) - 0.5) * 2        # streaks along the plank
    knots = np.exp(-((value_noise(A, B, 1.7) - 0.9) ** 2) / 0.002) * 0.25
    gap = ((B % plank_w) < 0.006) | (((A + offset) % plank_l) < 0.006)
    c = base[None, :] * (tone + grain - knots)[:, None]
    return np.where(gap[:, None], c * 0.55, c)


def plaster(A, B, P):
    sage = np.array([0.70, 0.76, 0.68])
    white = np.array([0.94, 0.94, 0.91])
    skirting = (B < 0.12)[:, None]
    n = 1 + 0.06 * (fbm(A, B, 9.0, 5) - 0.5) * 2
    return np.where(skirting, white, sage[None, :] * n[:, None])


def ceiling(A, B, P):
    return np.array([0.93, 0.92, 0.89])[None, :] * (1 + 0.04 * (fbm(A, B, 5.0) - 0.5))[:, None]


def duvet(A, B, P):
    base = np.array([0.24, 0.40, 0.60])
    weave = 0.05 * np.sin(A * 300) * np.sin(B * 300)
    folds = 0.14 * (fbm(A, B, 2.2, 3) - 0.5) * 2
    return base[None, :] * (1 + weave + folds)[:, None]


def linen(A, B, P):
    return np.array([0.95, 0.94, 0.90])[None, :] * (1 + 0.08 * (fbm(A, B, 4.0, 3) - 0.5) * 2 + 0.03 * np.sin(A * 250))[:, None]


def rug(A, B, P):
    tile = ((np.floor(A / 0.3) + np.floor(B / 0.3)) % 2 == 0)
    red, cream = np.array([0.70, 0.26, 0.23]), np.array([0.88, 0.80, 0.70])
    pile = 1 + 0.10 * (value_noise(A, B, 90.0) - 0.5)
    border = (A < 0.08) | (B < 0.08) | (A > 2.32) | (B > 1.72)
    c = np.where(tile[:, None], red, cream) * pile[:, None]
    return np.where(border[:, None], np.array([0.35, 0.18, 0.15]) * pile[:, None], c)


def sky(A, B, P):
    t = B / 1.2
    return np.stack([0.58 + 0.25 * t, 0.74 + 0.16 * t, 0.98 - 0.02 * t], 1) * 1.25


def build(step):
    nx, nz, ny = int(W / step), int(D / step), int(H / step)
    plane(np.array([-hw, 0, -hd]), X, Z, nx, nz, Y, oak_floor, step)
    plane(np.array([-hw, H, -hd]), X, Z, nx, nz, -Y, ceiling, step)
    plane(np.array([-hw, 0, -hd]), X, Y, nx, ny, Z, plaster, step)
    plane(np.array([-hw, 0, hd]), X, Y, nx, ny, -Z, plaster, step)
    plane(np.array([-hw, 0, -hd]), Z, Y, nz, ny, X, plaster, step)
    plane(np.array([hw, 0, -hd]), Z, Y, nz, ny, -X, plaster, step)

    fine = step * 0.7
    white = textured([0.97, 0.97, 0.95], 8, 0.03)
    # Window: bright sky panel, frame, sill
    plane(np.array([-0.9, 1.0, -hd + 0.012]), X, Y, int(1.8 / step), int(1.2 / step), Z, sky, step, alpha=0.995, lit=False)
    for x0, x1 in ((-0.96, -0.9), (0.9, 0.96)):
        box(x0, 0.95, -hd + 0.005, x1, 2.25, -hd + 0.035, white, fine)
    box(-0.96, 2.2, -hd + 0.005, 0.96, 2.25, -hd + 0.035, white, fine)
    box(-1.02, 0.92, -hd + 0.005, 1.02, 0.97, -hd + 0.09, white, fine)
    box(-0.015, 1.0, -hd + 0.005, 0.015, 2.2, -hd + 0.03, white, fine)

    # Door with handle
    plane(np.array([hw - 0.012, 0, 0.8]), -Z, Y, int(0.9 / step), int(2.05 / step), -X, textured([0.86, 0.85, 0.81], 4, 0.03), step)
    box(hw - 0.07, 1.0, 0.74, hw - 0.02, 1.035, 0.71, solid([0.80, 0.68, 0.32]), 0.012)

    # Bed
    box(-hw + 0.05, 0.0, -hd + 0.3, -hw + 1.45, 0.35, -hd + 2.3, textured([0.36, 0.30, 0.25], 5, 0.10), step)
    box(-hw + 0.08, 0.35, -hd + 0.33, -hw + 1.42, 0.56, -hd + 2.27, duvet, fine)
    box(-hw + 0.15, 0.56, -hd + 0.40, -hw + 0.75, 0.70, -hd + 0.85, linen, fine)
    box(-hw + 0.75, 0.56, -hd + 0.40, -hw + 1.35, 0.70, -hd + 0.85, linen, fine)
    # Headboard
    box(-hw + 0.05, 0.35, -hd + 0.30, -hw + 1.45, 1.05, -hd + 0.36, textured([0.36, 0.30, 0.25], 5, 0.10), fine)

    # Desk, chair, lamp
    desk = textured([0.80, 0.70, 0.55], 7, 0.08)
    box(-0.9, 0.72, -hd + 0.05, 0.9, 0.76, -hd + 0.65, desk, fine)
    for x0 in (-0.88, 0.84):
        for z0 in (-hd + 0.07, -hd + 0.59):
            box(x0, 0.0, z0, x0 + 0.04, 0.72, z0 + 0.04, solid([0.28, 0.28, 0.30]), 0.02)
    box(-0.25, 0.0, -hd + 0.85, 0.25, 0.45, -hd + 1.35, textured([0.20, 0.20, 0.22], 6, 0.08), fine)
    box(-0.25, 0.45, -hd + 1.30, 0.25, 0.95, -hd + 1.35, textured([0.20, 0.20, 0.22], 6, 0.08), fine)
    box(0.55, 0.76, -hd + 0.2, 0.65, 1.15, -hd + 0.3, solid([0.92, 0.92, 0.90]), 0.02)
    box(0.42, 1.15, -hd + 0.08, 0.78, 1.32, -hd + 0.42, solid([1.0, 0.95, 0.75]), 0.02)
    # Laptop on the desk
    box(-0.55, 0.76, -hd + 0.25, -0.2, 0.775, -hd + 0.48, solid([0.75, 0.76, 0.78]), 0.012)
    box(-0.55, 0.775, -hd + 0.47, -0.2, 0.99, -hd + 0.485, solid([0.12, 0.13, 0.16]), 0.012)

    # Bookshelf with books
    shelf = textured([0.50, 0.40, 0.30], 6, 0.10)
    box(1.6, 0.0, hd - 0.32, 2.6, 1.8, hd - 0.02, shelf, step)
    for i, c in enumerate([[0.78, 0.22, 0.20], [0.20, 0.34, 0.68], [0.90, 0.70, 0.22], [0.28, 0.58, 0.34], [0.58, 0.30, 0.60], [0.92, 0.92, 0.88]]):
        box(1.66 + i * 0.15, 1.2, hd - 0.28, 1.77 + i * 0.15, 1.52 + 0.04 * (i % 3), hd - 0.06, solid(c), 0.015)
    for i, c in enumerate([[0.95, 0.94, 0.90], [0.25, 0.25, 0.28], [0.80, 0.50, 0.20], [0.30, 0.55, 0.70]]):
        box(1.70 + i * 0.2, 0.62, hd - 0.28, 1.85 + i * 0.2, 0.95, hd - 0.06, solid(c), 0.015)

    # Rug
    plane(np.array([-1.2, 0.014, -0.6]), X, Z, int(2.4 / fine), int(1.8 / fine), Y, rug, fine, size_mult=0.75)

    # Plant in the corner: pot + leaves
    box(2.3, 0.0, -hd + 0.2, 2.7, 0.4, -hd + 0.6, textured([0.62, 0.40, 0.30], 8, 0.08), fine)
    leaves = rng.normal(0, 0.22, (900, 3)) * np.array([1, 1.4, 1]) + np.array([2.5, 0.85, -hd + 0.4])
    parts.append((leaves.astype(float),
                  np.clip(np.array([0.18, 0.45, 0.20])[None, :] * rng.uniform(0.7, 1.3, (900, 1)), 0, 1),
                  np.tile([0.045, 0.02, 0.004], (900, 1)),
                  rng.normal(size=(900, 4)), 0.9))

    # Framed picture on the right wall
    box(hw - 0.03, 1.3, -1.3, hw - 0.005, 1.9, -0.5, solid([0.15, 0.12, 0.10]), 0.012)
    plane(np.array([hw - 0.032, 1.33, -0.53]), -Z, Y, int(0.74 / 0.012), int(0.54 / 0.012), -X,
          lambda A, B, P: np.stack([0.85 - 0.5 * B, 0.55 + 0.2 * fbm(A, B, 3), 0.35 + 0.5 * B], 1), 0.012, lit=False)


def write_ply(out):
    xyz = np.concatenate([p[0] for p in parts]).astype(np.float32)
    rgb = np.concatenate([p[1] for p in parts])
    scale = np.concatenate([p[2] for p in parts])
    quat = np.concatenate([p[3] for p in parts])
    alpha = np.concatenate([np.full(len(p[0]), p[4]) for p in parts])
    n = len(xyz)
    f_dc = ((rgb - 0.5) / SH_C0).astype(np.float32)
    opacity = np.log(alpha / (1 - alpha)).astype(np.float32)[:, None]
    log_scale = np.log(scale).astype(np.float32)
    quat = (quat / np.linalg.norm(quat, axis=1, keepdims=True)).astype(np.float32)
    normals = np.zeros((n, 3), np.float32)
    data = np.concatenate([xyz, normals, f_dc, opacity, log_scale, quat], axis=1).astype("<f4")
    props = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity",
             "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    header = "ply\nformat binary_little_endian 1.0\nelement vertex %d\n" % n
    header += "".join("property float %s\n" % p for p in props) + "end_header\n"
    with open(out, "wb") as f:
        f.write(header.encode("ascii"))
        f.write(data.tobytes())
    print("wrote %s: %d splats, %.1f MB" % (out, n, data.nbytes / 1e6))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default="room.ply")
    ap.add_argument("--step", type=float, default=0.035, help="splat spacing on large surfaces (m)")
    args = ap.parse_args()
    build(args.step)
    write_ply(args.out)
