#!/usr/bin/env python3
"""Generate a synthetic Gaussian-splat room (3DGS .ply) for testing the viewer.

Usage: python3 make_demo_room.py out.ply

Coordinates: metres, Y up, origin at floor centre. Room 6 m x 5 m x 2.7 m.
"""
import struct
import sys

import numpy as np

SH_C0 = 0.28209479177387814
rng = np.random.default_rng(7)

W, D, H = 6.0, 5.0, 2.7  # x width, z depth, y height
STEP = 0.05  # splat spacing on surfaces (m)

parts = []  # each: (xyz [n,3], rgb [n,3] 0..1, scale [n,3], quat [n,4] wxyz, alpha)


def quat_from_normal(n):
    """Rotation taking +Z (the thin axis) to normal n. Returns wxyz."""
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


def plane(origin, u, v, nu, nv, normal, color_fn, step=STEP, size=None, alpha=0.95):
    """A rectangle of splats. origin + a*u + b*v, a in [0,nu*step], b in [0,nv*step]."""
    a = (np.arange(nu) + 0.5) * step
    b = (np.arange(nv) + 0.5) * step
    A, B = np.meshgrid(a, b, indexing="ij")
    A = A.ravel()
    B = B.ravel()
    xyz = origin[None, :] + A[:, None] * u[None, :] + B[:, None] * v[None, :]
    xyz += rng.normal(0, 0.004, xyz.shape)
    rgb = color_fn(A, B)
    rgb = np.clip(rgb + rng.normal(0, 0.02, rgb.shape), 0, 1)
    s = size or step * 0.9
    scale = np.tile([s, s, s * 0.08], (len(xyz), 1))
    q = np.tile(quat_from_normal(normal), (len(xyz), 1))
    parts.append((xyz, rgb, scale, q, alpha))


def solid(c):
    c = np.array(c, dtype=float)
    return lambda A, B: np.tile(c, (len(A), 1))


def box(x0, y0, z0, x1, y1, z1, color, step=STEP):
    """Axis-aligned box with all six faces."""
    f = solid(color)
    nx, ny, nz = [max(1, int(round((hi - lo) / step))) for lo, hi in ((x0, x1), (y0, y1), (z0, z1))]
    X, Y, Z = np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), np.array([0, 0, 1.0])
    plane(np.array([x0, y1, z0]), X, Z, nx, nz, Y, f, step)   # top
    plane(np.array([x0, y0, z0]), X, Z, nx, nz, -Y, f, step)  # bottom
    plane(np.array([x0, y0, z1]), X, Y, nx, ny, Z, f, step)   # front
    plane(np.array([x0, y0, z0]), X, Y, nx, ny, -Z, f, step)  # back
    plane(np.array([x1, y0, z0]), Z, Y, nz, ny, X, f, step)   # right
    plane(np.array([x0, y0, z0]), Z, Y, nz, ny, -X, f, step)  # left


X, Y, Z = np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), np.array([0, 0, 1.0])
hw, hd = W / 2, D / 2
nx, nz, ny = int(W / STEP), int(D / STEP), int(H / STEP)

# Floor: warm oak planks
def floor_color(A, B):
    plank = np.floor(B / 0.18).astype(int)
    tone = 0.08 * ((plank * 7919) % 5) / 4
    base = np.array([0.62, 0.47, 0.32])
    return base[None, :] * (0.9 + tone[:, None]) + 0.015 * np.sin(A * 40)[:, None]

plane(np.array([-hw, 0, -hd]), X, Z, nx, nz, Y, floor_color)
# Ceiling: off-white
plane(np.array([-hw, H, -hd]), X, Z, nx, nz, -Y, solid([0.93, 0.92, 0.89]))
# Walls: sage paint, with a white skirting strip at the bottom
def wall_color(A, B):
    sage = np.array([0.72, 0.78, 0.70])
    white = np.array([0.95, 0.95, 0.93])
    return np.where((B < 0.12)[:, None], white, sage)

plane(np.array([-hw, 0, -hd]), X, Y, nx, ny, Z, wall_color)      # back wall (z = -hd), faces +z
plane(np.array([-hw, 0, hd]), X, Y, nx, ny, -Z, wall_color)      # front wall
plane(np.array([-hw, 0, -hd]), Z, Y, nz, ny, X, wall_color)      # left wall (x = -hw)
plane(np.array([hw, 0, -hd]), Z, Y, nz, ny, -X, wall_color)      # right wall

# Window on the back wall: bright sky panel with a frame
plane(np.array([-0.9, 1.0, -hd + 0.01]), X, Y, int(1.8 / STEP), int(1.2 / STEP), Z,
      lambda A, B: np.stack([0.62 + 0.1 * B, 0.78 + 0.1 * B, 0.98 - 0.05 * B], 1), alpha=0.995)
box(-0.95, 0.95, -hd + 0.005, -0.9, 2.25, -hd + 0.03, [0.98, 0.98, 0.97], 0.03)
box(0.9, 0.95, -hd + 0.005, 0.95, 2.25, -hd + 0.03, [0.98, 0.98, 0.97], 0.03)
box(-0.95, 0.95, -hd + 0.005, 0.95, 1.0, -hd + 0.03, [0.98, 0.98, 0.97], 0.03)
box(-0.95, 2.2, -hd + 0.005, 0.95, 2.25, -hd + 0.03, [0.98, 0.98, 0.97], 0.03)

# Door on the right wall
plane(np.array([hw - 0.01, 0, 0.8]), -Z, Y, int(0.9 / STEP), int(2.05 / STEP), -X, solid([0.85, 0.84, 0.80]))
box(hw - 0.06, 1.0, 0.75, hw - 0.02, 1.04, 0.72, [0.75, 0.65, 0.3], 0.02)  # handle

# Bed against the left wall
box(-hw + 0.05, 0.0, -hd + 0.3, -hw + 1.45, 0.35, -hd + 2.3, [0.35, 0.3, 0.26])          # frame
box(-hw + 0.08, 0.35, -hd + 0.33, -hw + 1.42, 0.55, -hd + 2.27, [0.25, 0.42, 0.62])       # duvet
box(-hw + 0.15, 0.55, -hd + 0.4, -hw + 0.75, 0.68, -hd + 0.85, [0.95, 0.95, 0.93])        # pillow
box(-hw + 0.75, 0.55, -hd + 0.4, -hw + 1.35, 0.68, -hd + 0.85, [0.95, 0.95, 0.93])        # pillow

# Desk under the window with a chair and a lamp
box(-0.9, 0.72, -hd + 0.05, 0.9, 0.76, -hd + 0.65, [0.82, 0.74, 0.6])                      # desk top
box(-0.88, 0.0, -hd + 0.07, -0.84, 0.72, -hd + 0.11, [0.3, 0.3, 0.32], 0.03)               # legs
box(0.84, 0.0, -hd + 0.07, 0.88, 0.72, -hd + 0.11, [0.3, 0.3, 0.32], 0.03)
box(-0.88, 0.0, -hd + 0.59, -0.84, 0.72, -hd + 0.63, [0.3, 0.3, 0.32], 0.03)
box(0.84, 0.0, -hd + 0.59, 0.88, 0.72, -hd + 0.63, [0.3, 0.3, 0.32], 0.03)
box(-0.25, 0.0, -hd + 0.85, 0.25, 0.45, -hd + 1.35, [0.2, 0.2, 0.22])                      # chair seat block
box(-0.25, 0.45, -hd + 1.3, 0.25, 0.95, -hd + 1.35, [0.2, 0.2, 0.22])                      # chair back
box(0.55, 0.76, -hd + 0.2, 0.65, 1.15, -hd + 0.3, [0.9, 0.9, 0.88], 0.03)                  # lamp stem
box(0.42, 1.15, -hd + 0.08, 0.78, 1.32, -hd + 0.42, [1.0, 0.93, 0.7], 0.03)                # lamp shade

# Bookshelf on the front wall
box(1.6, 0.0, hd - 0.32, 2.6, 1.8, hd - 0.02, [0.5, 0.4, 0.3])
for i, c in enumerate([[0.8, 0.2, 0.2], [0.2, 0.35, 0.7], [0.9, 0.7, 0.2], [0.3, 0.6, 0.35], [0.6, 0.3, 0.6]]):
    box(1.68 + i * 0.17, 1.2, hd - 0.28, 1.8 + i * 0.17, 1.55, hd - 0.06, c, 0.03)

# Rug in the middle of the floor
plane(np.array([-1.2, 0.012, -0.6]), X, Z, int(2.4 / STEP), int(1.8 / STEP), Y,
      lambda A, B: np.where(((np.floor(A / 0.3) + np.floor(B / 0.3)) % 2 == 0)[:, None],
                            np.array([0.72, 0.28, 0.25]), np.array([0.88, 0.80, 0.70])))

# Pack
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

out = sys.argv[1] if len(sys.argv) > 1 else "room.ply"
with open(out, "wb") as f:
    f.write(header.encode("ascii"))
    f.write(data.tobytes())
print("wrote %s: %d splats, %.1f MB" % (out, n, data.nbytes / 1e6))
