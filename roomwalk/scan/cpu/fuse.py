"""Kitchen from a phone video, CPU only:
  frames + metric monocular depth (Depth Anything V2 indoor)  ->  RGB-D PnP odometry for camera poses
  ->  unproject keyframe pixels  ->  voxel merge  ->  oriented disc splats  ->  3DGS .ply

Usage: python3 fuse.py depth_vitb out.ply [--kf 3] [--voxel 0.015] [--maxdepth 7]
"""
import argparse, glob, sys, time
from pathlib import Path
import numpy as np, cv2, open3d as o3d

ap = argparse.ArgumentParser()
ap.add_argument("depth_dir"); ap.add_argument("out")
ap.add_argument("--kf", type=int, default=3, help="use every k-th frame for points")
ap.add_argument("--voxel", type=float, default=0.015)
ap.add_argument("--maxdepth", type=float, default=7.0)
ap.add_argument("--stride", type=int, default=2, help="pixel stride when unprojecting")
ap.add_argument("--poses", default="poses.npy")
ap.add_argument("--skip_poses", action="store_true")
ap.add_argument("--minsharp", type=float, default=35, help="Laplacian variance below which a frame is too blurred to use")
ap.add_argument("--exclude", default="", help="comma-separated frame ranges to leave out of the model, e.g. 80-99")
ap.add_argument("--reach", type=float, default=4.5, help="drop points farther than this from the camera path (m)")
ap.add_argument("--splat", action="store_true", help="also write the compact .splat format")
args = ap.parse_args()

frames = sorted(glob.glob("frames_colmap/f_*.jpg"))
depths = {Path(f).stem: f"{args.depth_dir}/{Path(f).stem}.npy" for f in frames}
frames = [f for f in frames if Path(depths[Path(f).stem]).exists()]
N = len(frames)
print(f"{N} frames with depth")

# Intrinsics from COLMAP (OPENCV model) at 720x1280
W, H = 720, 1280
K = np.array([[1082.47, 0, 360.0], [0, 1087.52, 640.0], [0, 0, 1]], np.float64)
dist = np.array([0.17, -0.33, 0.0, 0.0], np.float64)
DW, DH = 518, 924
sx, sy = DW / W, DH / H


def load(i):
    img = cv2.imread(frames[i])
    d = np.load(depths[Path(frames[i]).stem])
    return img, d


def depth_at(d, pts):
    """Bilinear depth lookup for pixel coords in the 720x1280 frame."""
    u = np.clip(pts[:, 0] * sx, 0, DW - 1.001); v = np.clip(pts[:, 1] * sy, 0, DH - 1.001)
    u0, v0 = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = u - u0, v - v0
    z = (d[v0, u0] * (1 - fu) * (1 - fv) + d[v0, u0 + 1] * fu * (1 - fv) + d[v0 + 1, u0] * (1 - fu) * fv + d[v0 + 1, u0 + 1] * fu * fv)
    # reject lookups that straddle a depth edge
    nb = np.stack([d[v0, u0], d[v0, u0 + 1], d[v0 + 1, u0], d[v0 + 1, u0 + 1]], 1)
    edge = (nb.max(1) - nb.min(1)) / np.maximum(nb.min(1), 1e-3) > 0.08
    return z, ~edge


def unproject(pix, z):
    und = cv2.undistortPoints(pix.reshape(-1, 1, 2).astype(np.float64), K, dist).reshape(-1, 2)
    return np.c_[und * z[:, None], z]


# ------------------------------------------------------------------ poses
sift = cv2.SIFT_create(nfeatures=4000)
bf = cv2.BFMatcher(cv2.NORM_L2)


def feats(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    kp, des = sift.detectAndCompute(g, None)
    return np.array([k.pt for k in kp], np.float32), des


def match(d1, d2):
    if d1 is None or d2 is None or len(d1) < 8 or len(d2) < 8:
        return np.zeros((0, 2), int)
    m = bf.knnMatch(d1, d2, k=2)
    good = [(a.queryIdx, a.trainIdx) for a, b in (p for p in m if len(p) == 2) if a.distance < 0.75 * b.distance]
    return np.array(good, int).reshape(-1, 2)


def pnp(P3, P2):
    """Robust PnP -> camera-to-world 4x4 and inlier count, or (None, 0)."""
    if len(P3) < 30:
        return None, 0
    try:
        ok, rvec, tvec, inl = cv2.solvePnPRansac(P3, P2, K, dist, iterationsCount=800, reprojectionError=5.0,
                                                 confidence=0.999, flags=cv2.SOLVEPNP_ITERATIVE)
    except cv2.error:
        return None, 0
    if not ok or inl is None or len(inl) < 25:
        return None, 0
    try:
        rvec, tvec = cv2.solvePnPRefineLM(P3[inl[:, 0]], P2[inl[:, 0]], K, dist, rvec, tvec)
    except cv2.error:
        pass
    Rcw, _ = cv2.Rodrigues(rvec)
    T = np.eye(4); T[:3, :3] = Rcw.T; T[:3, 3] = (-Rcw.T @ tvec).ravel()
    if not np.all(np.isfinite(T)) or np.linalg.norm(T[:3, 3]) > 1e3:
        return None, 0
    return T, len(inl)


def plausible(T, T_prev, gap):
    """A walking person at 4 fps: < 0.5 m and < 60 deg per frame step."""
    dt = np.linalg.norm(T[:3, 3] - T_prev[:3, 3])
    R = T[:3, :3].T @ T_prev[:3, :3]
    ang = np.degrees(np.arccos(np.clip((np.trace(R) - 1) / 2, -1, 1)))
    return dt < 0.5 * gap and ang < 60 * gap and np.all(np.isfinite(T))


def corr(i, j, F, D, pose_i):
    """3D points of frame i (world, via its pose and depth) matched to 2D points of frame j."""
    pi, di = F[i]; pj, dj = F[j]
    mm = match(di, dj)
    if len(mm) < 15:
        return None
    z, ok = depth_at(D[i], pi[mm[:, 0]])
    ok &= (z > 0.3) & (z < args.maxdepth)
    if ok.sum() < 15:
        return None
    Xc = unproject(pi[mm[ok, 0]], z[ok])
    return (pose_i[:3, :3] @ Xc.T).T + pose_i[:3, 3], pj[mm[ok, 1]].astype(np.float64)


if args.skip_poses and Path(args.poses).exists():
    poses = np.load(args.poses)
    bad = set(np.load(Path(args.poses).with_suffix(".bad.npy")).tolist())
else:
    t0 = time.time()
    F, D = {}, {}
    for i in range(N):
        img, d = load(i)
        F[i] = feats(img); D[i] = d
    print(f"features for {N} frames: {time.time()-t0:.0f}s")

    # 1) chain frames into segments. SIFT against a window of trusted frames when the image is sharp;
    #    dense optical flow from the previous frame when it is blurred; a new segment when both fail.
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    gray_cache = {}
    def gray(i, S):
        key = (i, S)
        if key not in gray_cache:
            g = cv2.cvtColor(cv2.imread(frames[i]), cv2.COLOR_BGR2GRAY)
            gray_cache[key] = cv2.resize(g, None, fx=S, fy=S, interpolation=cv2.INTER_AREA)
            for k in [k for k in gray_cache if k[0] < i - 3]:
                del gray_cache[k]
        return gray_cache[key]

    def flow_corr(i, j, S, stride, thr):
        g1, g2 = gray(i, S), gray(j, S)
        f12 = dis.calc(g1, g2, None); f21 = dis.calc(g2, g1, None)
        h, w = g1.shape
        ys, xs = np.mgrid[stride // 2:h:stride, stride // 2:w:stride]
        p1 = np.c_[xs.ravel(), ys.ravel()].astype(np.float32)
        p2 = p1 + f12[p1[:, 1].astype(int), p1[:, 0].astype(int)]
        inb = (p2[:, 0] >= 1) & (p2[:, 0] < w - 1) & (p2[:, 1] >= 1) & (p2[:, 1] < h - 1)
        p1, p2 = p1[inb], p2[inb]
        err = np.linalg.norm(p1 - (p2 + f21[p2[:, 1].astype(int), p2[:, 0].astype(int)]), axis=1)
        keep = err < thr
        return p1[keep] / S, p2[keep] / S

    src_cache = {}
    def gray_src(sidx):
        if sidx not in src_cache:
            src_cache[sidx] = cv2.imread(f"frames_all/a_{sidx:04d}.jpg", 0)
            for k in [k for k in src_cache if k < sidx - 40]:
                del src_cache[k]
        return src_cache[sidx]

    def chain_flow_corr(a, b, stride=8):
        """Track a pixel grid from 4 fps frame a to frame b through every 30 fps frame in between (360x640)."""
        sa, sb = round(7.5 * a) + 4, round(7.5 * b) + 4
        imgs = [gray_src(k) for k in range(sa, sb + 1)]
        h, w = imgs[0].shape
        ys, xs = np.mgrid[stride // 2:h:stride, stride // 2:w:stride]
        p0 = np.c_[xs.ravel(), ys.ravel()].astype(np.float32)
        p = p0.copy(); alive = np.ones(len(p), bool)
        for k in range(len(imgs) - 1):
            f12 = dis.calc(imgs[k], imgs[k + 1], None); f21 = dis.calc(imgs[k + 1], imgs[k], None)
            pi_ = np.clip(p, 0, [w - 1, h - 1]).astype(int)
            q = p + f12[pi_[:, 1], pi_[:, 0]]
            inb = (q[:, 0] >= 1) & (q[:, 0] < w - 1) & (q[:, 1] >= 1) & (q[:, 1] < h - 1)
            qi = np.clip(q, 0, [w - 1, h - 1]).astype(int)
            back = q + f21[qi[:, 1], qi[:, 0]]
            alive &= inb & (np.linalg.norm(p - back, axis=1) < 0.8)
            p = q
        return p0[alive] * 2, p[alive] * 2

    def chain_pose(a, b):
        p1, p2 = chain_flow_corr(a, b)
        z, ok = depth_at(D[a], p1)
        ok &= (z > 0.3) & (z < args.maxdepth)
        if ok.sum() < 60:
            return None, 0
        Xc = unproject(p1[ok], z[ok])
        Xw = (poses[a][:3, :3] @ Xc.T).T + poses[a][:3, 3]
        T, n = pnp(Xw, p2[ok].astype(np.float64))
        if T is not None and n >= 60 and plausible(T, poses[a], b - a):
            return T, n
        return None, 0

    def frame_cloud(i, T, stride=6):
        ys, xs = np.mgrid[0:H:stride, 0:W:stride]
        pix = np.c_[xs.ravel(), ys.ravel()].astype(np.float32) + stride / 2
        z, ok = depth_at(D[i], pix)
        ok &= (z > 0.3) & (z < args.maxdepth)
        Xc = unproject(pix[ok], z[ok])
        return (T[:3, :3] @ Xc.T).T + T[:3, 3]

    def extrapolate_pose(hist, j):
        """Constant angular/linear velocity from the last posed frames, refined by ICP on the depth clouds."""
        (i0, T0), (i1, T1) = hist[-2], hist[-1]
        steps = j - i1
        R_rel = T0[:3, :3].T @ T1[:3, :3]
        rv, _ = cv2.Rodrigues(R_rel)
        R_step, _ = cv2.Rodrigues(rv / (i1 - i0))
        v_step = (T1[:3, 3] - T0[:3, 3]) / (i1 - i0)
        T = T1.copy()
        for _ in range(steps):
            T[:3, :3] = T[:3, :3] @ R_step
        T[:3, 3] = T1[:3, 3] + v_step * steps
        # ICP: frame j's cloud against the last four posed frames
        tgt = np.concatenate([frame_cloud(i, Tk) for i, Tk in hist[-4:]])
        src = frame_cloud(j, T)
        pt = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(tgt)).voxel_down_sample(0.03)
        ps = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(src)).voxel_down_sample(0.03)
        pt.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=0.12, max_nn=30))
        reg = o3d.pipelines.registration.registration_icp(
            ps, pt, 0.25, np.eye(4), o3d.pipelines.registration.TransformationEstimationPointToPlane(),
            o3d.pipelines.registration.ICPConvergenceCriteria(max_iteration=60))
        corr_T = reg.transformation
        ang = np.degrees(np.arccos(np.clip((np.trace(corr_T[:3, :3]) - 1) / 2, -1, 1)))
        shift = np.linalg.norm(corr_T[:3, 3])
        note = f"extrapolated {steps} step(s), rot/step {np.degrees(np.linalg.norm(rv))/(i1-i0):.1f} deg"
        if reg.fitness > 0.4 and ang < 15 and shift < 0.4:
            T = corr_T @ T
            note += f", ICP fitness {reg.fitness:.2f} corrected {ang:.1f} deg / {shift:.2f} m"
        else:
            note += f", ICP rejected (fitness {reg.fitness:.2f}, {ang:.1f} deg, {shift:.2f} m)"
        return T, note

    def flow_pose(i, j):
        for S, stride, thr in ((0.5, 10, 1.0), (0.25, 6, 0.7)):
            p1, p2 = flow_corr(i, j, S, stride, thr)
            z, ok = depth_at(D[i], p1)
            ok &= (z > 0.3) & (z < args.maxdepth)
            if ok.sum() < 60:
                continue
            Xc = unproject(p1[ok], z[ok])
            Xw = (poses[i][:3, :3] @ Xc.T).T + poses[i][:3, 3]
            T, n = pnp(Xw, p2[ok].astype(np.float64))
            if T is not None and n >= 60 and plausible(T, poses[i], j - i):
                return T, n
        return None, 0

    poses = np.zeros((N, 4, 4)); poses[0] = np.eye(4)
    seg = np.zeros(N, int); bad = set(); how = {0: "start"}
    WINDOW = 6
    good = [0]            # SIFT-trusted frames of the current segment
    last = 0              # last frame with any pose in the current segment
    hist = [(0, poses[0].copy())]   # (frame, pose) of every posed frame, for extrapolation
    for j in range(1, N):
        P3, P2 = [], []
        for i, _ in hist[-WINDOW:]:
            c = corr(i, j, F, D, poses[i])
            if c is not None:
                P3.append(c[0]); P2.append(c[1])
        T, ninl = (None, 0) if not P3 else pnp(np.concatenate(P3), np.concatenate(P2))
        if T is not None and ninl >= 40 and plausible(T, poses[last], j - last):
            poses[j] = T; seg[j] = seg[last]; good.append(j); last = j; how[j] = f"sift {ninl}"; hist.append((j, T.copy()))
            continue
        if j - last <= 2:
            T, ninl = flow_pose(last, j)
            if T is not None:
                poses[j] = T; seg[j] = seg[last]; last = j; how[j] = f"flow {ninl}"; hist.append((j, T.copy()))
                continue
        if j - last <= 8:
            T, ninl = chain_pose(last, j)
            if T is not None:
                poses[j] = T; seg[j] = seg[last]; last = j; how[j] = f"chain {ninl}"; hist.append((j, T.copy()))
                continue
        if j - last <= 2:
            bad.add(j); how[j] = "gap"
            continue
        # Nothing to track on (blank wall + motion blur): carry the camera's motion forward and let ICP settle it.
        T, note = extrapolate_pose(hist, j)
        print(f"frame {j}: {note}")
        poses[j] = T; seg[j] = seg[last]; last = j; how[j] = "extrap"; hist.append((j, T.copy()))
    print("tracking:", " ".join(f"{j}:{how[j].split()[0][0]}" for j in range(N)))
    for k in sorted(set(seg)):
        fr = [i for i in range(N) if seg[i] == k and i not in bad]
        print(f"segment {k}: frames {fr[0]}..{fr[-1]} ({len(fr)} posed)")

    # 2) anchor later segments to earlier ones (loop closure: the camera comes back to the same walls).
    #    Every frame of the segment gets its own PnP against the anchored map; the segment is placed by the
    #    best one and accepted only if a second frame agrees, so a single bad match can't swing it.
    anchored = {0}
    for k in sorted(set(seg) - {0}):
        A = [i for i in range(N) if seg[i] in anchored and i not in bad][::2]
        B = [j for j in range(N) if seg[j] == k and j not in bad]
        cands = []
        for j in B:
            P3, P2 = [], []
            for i in A:
                c = corr(i, j, F, D, poses[i])
                if c is not None and len(c[0]) >= 20:
                    P3.append(c[0]); P2.append(c[1])
            if not P3:
                continue
            T, ninl = pnp(np.concatenate(P3), np.concatenate(P2))
            if T is not None and ninl >= 30 and np.linalg.norm(T[:3, 3]) < 8:
                cands.append((ninl, j, T))
        cands.sort(key=lambda c: -c[0])
        placed = False
        for ninl, j, T_world in cands:
            align = T_world @ np.linalg.inv(poses[j])
            agree = [j2 for n2, j2, T2 in cands if j2 != j and plausible(align @ poses[j2], T2, 1)]
            if agree or len(cands) == 1 and ninl >= 80:
                for i in B:
                    poses[i] = align @ poses[i]
                anchored.add(k); placed = True
                print(f"segment {k}: anchored through frame {j} ({ninl} inliers, confirmed by {len(agree)} more), camera at {np.round(poses[j][:3,3],2)}")
                break
        if not placed:
            print(f"segment {k}: no consistent overlap with the anchored map ({len(cands)} candidates); dropping {len(B)} frames")
            bad.update(B)
    np.save(args.poses, poses)
    np.save(Path(args.poses).with_suffix(".bad.npy"), np.array(sorted(bad), int))
    print(f"poses done {time.time()-t0:.0f}s")
print(f"{len(bad)} frames without a pose: {sorted(bad)}")

centres = poses[:, :3, 3]
print("camera path extent (m):", np.round(centres.max(0) - centres.min(0), 2))

# ------------------------------------------------------------------ keyframes
def sharpness(img):
    return cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()

sharp = np.array([sharpness(cv2.imread(f)) for f in frames])
kfs = []
for s in range(0, N, args.kf):
    grp = [i for i in range(s, min(N, s + args.kf)) if i not in bad and sharp[i] >= args.minsharp]
    if grp:
        kfs.append(max(grp, key=lambda i: sharp[i]))   # sharpest frame of each group
excl = set()
for part in filter(None, args.exclude.split(",")):
    a, b = (part.split("-") + [part])[:2]
    excl.update(range(int(a), int(b) + 1))
kfs = [k for k in kfs if k not in excl]
print(f"{len(kfs)} keyframes: {kfs}")

# ------------------------------------------------------------------ unproject
ys, xs = np.mgrid[0:H:args.stride, 0:W:args.stride]
pix_all = np.c_[xs.ravel(), ys.ravel()].astype(np.float32) + args.stride / 2
all_xyz, all_rgb, all_cam = [], [], []
for i in kfs:
    img, d = load(i)
    z, ok = depth_at(d, pix_all)
    ok &= (z > 0.25) & (z < args.maxdepth)
    # drop the outer 3 % border (lens vignetting / rolling shutter smear)
    ok &= (pix_all[:, 0] > 0.03 * W) & (pix_all[:, 0] < 0.97 * W) & (pix_all[:, 1] > 0.03 * H) & (pix_all[:, 1] < 0.97 * H)
    Xc = unproject(pix_all[ok], z[ok])
    Xw = (poses[i][:3, :3] @ Xc.T).T + poses[i][:3, 3]
    col = img[pix_all[ok, 1].astype(int), pix_all[ok, 0].astype(int), ::-1].astype(np.float32) / 255
    all_xyz.append(Xw); all_rgb.append(col); all_cam.append(np.full(len(Xw), i))
xyz = np.concatenate(all_xyz); rgb = np.concatenate(all_rgb); cam = np.concatenate(all_cam)
print(f"{len(xyz):,} raw points")
xyz_raw = xyz[::20].copy(); cam_raw = cam[::20].copy()

# ------------------------------------------------------------------ multi-view consistency
# A point that floats in front of the surface another keyframe saw (by >12 % of the depth) and that no other
# keyframe confirms (within 8 %) is a depth error or a ghost from pose drift: drop it.
agree = np.zeros(len(xyz), np.int16); front = np.zeros(len(xyz), np.int16)
for i in kfs:
    Rwc = poses[i][:3, :3].T; t = -Rwc @ poses[i][:3, 3]
    Xc = (Rwc @ xyz.T).T + t
    z = Xc[:, 2]
    vis = (z > 0.2) & (cam != i)
    pr = cv2.projectPoints(Xc[vis].reshape(-1, 1, 3), np.zeros(3), np.zeros(3), K, dist)[0].reshape(-1, 2)
    u = pr[:, 0] * sx; v = pr[:, 1] * sy
    inb = (u >= 0) & (u < DW - 1) & (v >= 0) & (v < DH - 1)
    d = load(i)[1]
    dm = d[v[inb].astype(int), u[inb].astype(int)]
    idx = np.flatnonzero(vis)[inb]
    ratio = z[vis][inb] / np.maximum(dm, 1e-3)
    agree[idx[np.abs(ratio - 1) < 0.08]] += 1
    front[idx[ratio < 0.88]] += 1
keep = ~((front >= 1) & (agree == 0))
print(f"consistency filter: dropped {np.sum(~keep):,} floating points ({100*np.mean(~keep):.1f} %)")
xyz, rgb, cam = xyz[keep], rgb[keep], cam[keep]

# ------------------------------------------------------------------ merge
pc = o3d.geometry.PointCloud()
pc.points = o3d.utility.Vector3dVector(xyz); pc.colors = o3d.utility.Vector3dVector(rgb)
pc, _, idx_lists = pc.voxel_down_sample_and_trace(args.voxel, xyz.min(0) - 1, xyz.max(0) + 1)
pc, keep = pc.remove_statistical_outlier(nb_neighbors=16, std_ratio=2.5)
xyz = np.asarray(pc.points); rgb = np.asarray(pc.colors)
print(f"{len(xyz):,} points after {args.voxel*100:.1f} cm merge + outlier removal")

# normals, oriented toward the camera path centre
pc.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=args.voxel * 4, max_nn=24))
pc.orient_normals_towards_camera_location(centres.mean(0))
nrm = np.asarray(pc.normals)

# ------------------------------------------------------------------ level the world
# Gravity: the phone was held upright, so "down" is near the first camera's +Y axis (OpenCV convention).
# Refine with the point normals: floor/ceiling normals cluster around the true vertical.
g0 = poses[0][:3, :3] @ np.array([0, -1.0, 0])          # rough up
cos = nrm @ g0
sel = np.abs(cos) > np.cos(np.deg2rad(25))
up_est = (nrm[sel] * np.sign(cos[sel])[:, None]).mean(0)
up_est /= np.linalg.norm(up_est)
print(f"up vector refined from {sel.sum():,} floor/ceiling normals; tilt vs camera {np.rad2deg(np.arccos(np.clip(up_est@g0,-1,1))):.1f} deg")

def rot_a_to_b(a, b):
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    v, c = np.cross(a, b), float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3) if c > 0 else np.diag([1, -1, -1.0])
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))

R_level = rot_a_to_b(up_est, np.array([0, 1.0, 0]))
# Yaw: align the dominant wall normal with the Z axis so the room sits square to the grid.
hn = (R_level @ nrm.T).T
hn = hn[np.abs(hn[:, 1]) < 0.3]
ang = np.arctan2(hn[:, 0], hn[:, 2]) % (np.pi / 2)
hist, edges = np.histogram(ang, bins=90, range=(0, np.pi / 2))
yaw = edges[np.argmax(hist)] + (edges[1] - edges[0]) / 2
R_yaw = np.array([[np.cos(yaw), 0, -np.sin(yaw)], [0, 1, 0], [np.sin(yaw), 0, np.cos(yaw)]])
R_world = R_yaw @ R_level
origin = R_world @ centres[0]
xyz_all_levelled = (R_world @ xyz_raw.T).T - origin
xyz = (R_world @ xyz.T).T - origin
nrm = (R_world @ nrm.T).T
centres = (R_world @ centres.T).T - origin
fwd0 = R_world @ poses[0][:3, :3] @ np.array([0, 0, 1.0])
floor_y = np.percentile(xyz[:, 1], 1.0)
print(f"levelled: floor at y={floor_y:.2f} m below the first camera, first camera looks along {np.round(fwd0,2)}")

# ------------------------------------------------------------------ crop to the room
path = centres[[i for i in range(N) if i not in bad]]
tree = o3d.geometry.KDTreeFlann(o3d.geometry.PointCloud(o3d.utility.Vector3dVector(path)))
dist_to_path = np.array([np.sqrt(tree.search_knn_vector_3d(q, 1)[2][0]) for q in xyz])
inroom = (dist_to_path < args.reach) & (xyz[:, 1] > floor_y - 0.05) & (xyz[:, 1] < floor_y + 3.2)
print(f"crop: keeping {inroom.sum():,} of {len(xyz):,} points within {args.reach} m of the camera path")
xyz, rgb, nrm = xyz[inroom], rgb[inroom], nrm[inroom]

# ------------------------------------------------------------------ write splats
def quats_from_normals(n):
    n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    z = np.array([0, 0, 1.0])
    axis = np.cross(np.tile(z, (len(n), 1)), n)
    s = np.linalg.norm(axis, axis=1); c = n[:, 2]
    ang = np.arctan2(s, c)
    axis = axis / np.maximum(s[:, None], 1e-9)
    axis[s < 1e-6] = [1, 0, 0]
    return np.c_[np.cos(ang / 2), axis * np.sin(ang / 2)[:, None]]

SH_C0 = 0.28209479177387814
n = len(xyz)
# Adaptive disc size: grow splats where the surface was sampled sparsely (walls seen at a grazing angle)
# so they close the gaps, keep them small where it is dense.
try:
    from scipy.spatial import cKDTree
    dk = cKDTree(xyz).query(xyz, k=7)[0][:, -1]            # distance to the 6th neighbour
    s_xy = np.clip(1.05 * dk, args.voxel * 1.2, args.voxel * 4.0)
except Exception as e:  # scipy missing: constant size
    print("adaptive scale skipped:", e); s_xy = np.full(n, args.voxel * 1.35)
scale = np.log(np.c_[s_xy, s_xy, s_xy * 0.12]).astype(np.float32)
print(f"splat radius: median {np.median(s_xy)*100:.1f} cm, 95th pct {np.percentile(s_xy,95)*100:.1f} cm")
quat = quats_from_normals(nrm).astype(np.float32)
f_dc = ((rgb - 0.5) / SH_C0).astype(np.float32)
opacity = np.full((n, 1), np.log(0.92 / 0.08), np.float32)
data = np.concatenate([xyz.astype(np.float32), np.zeros((n, 3), np.float32), f_dc, opacity, scale, quat], 1).astype("<f4")
props = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
header = "ply\nformat binary_little_endian 1.0\nelement vertex %d\n" % n + "".join(f"property float {p}\n" for p in props) + "end_header\n"
with open(args.out, "wb") as f:
    f.write(header.encode()); f.write(data.tobytes())
if args.splat:
    # antimatter15 .splat: position f32x3, scale f32x3, rgba u8x4, rotation u8x4 (w,x,y,z scaled to 0..255)
    sc = np.exp(scale).astype(np.float32)
    rgba = np.c_[np.clip(rgb * 255, 0, 255), np.full(n, 235)].astype(np.uint8)
    q8 = np.clip(np.round(quat * 128 + 128), 0, 255).astype(np.uint8)
    rec = np.zeros(n, dtype=[("p", "<f4", 3), ("s", "<f4", 3), ("c", "u1", 4), ("r", "u1", 4)])
    rec["p"] = xyz; rec["s"] = sc; rec["c"] = rgba; rec["r"] = q8
    sp = Path(args.out).with_suffix(".splat"); sp.write_bytes(rec.tobytes())
    print(f"wrote {sp}: {sp.stat().st_size/1e6:.1f} MB")
import json
spawn = np.median(path, axis=0); spawn[1] = float(np.median(path[:, 1]))
# Look at what the first seconds of the video looked at (the counter): centroid of the early keyframes' points.
early = np.isin(cam_raw, [k for k in kfs if k <= 13])
if early.any():
    target = xyz_all_levelled[early].mean(0)
    fwd0 = target - spawn; fwd0[1] *= 0.3; fwd0 /= np.linalg.norm(fwd0)
side = {"up": [0, 1, 0], "spawn": [float(v) for v in spawn], "forward": [float(v) for v in fwd0], "floorY": float(floor_y),
        "cameraPath": [[round(float(v), 3) for v in centres[i]] for i in range(N) if i not in bad],
        "cameraFrames": [i for i in range(N) if i not in bad],
        "bounds": {"min": [float(v) for v in xyz.min(0)], "max": [float(v) for v in xyz.max(0)]}, "speed": 1.2}
Path(args.out).with_suffix(".json").write_text(json.dumps(side))
print(f"wrote {args.out} (+ .json): {n:,} splats, {data.nbytes/1e6:.1f} MB; bounds min {np.round(xyz.min(0),2)} max {np.round(xyz.max(0),2)}")
