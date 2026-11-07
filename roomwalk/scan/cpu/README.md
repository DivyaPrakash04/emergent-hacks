# CPU-only reconstruction (how the bundled kitchen was made)

No GPU, no Colab: these three scripts turned `IMG_2057.mov` (25 s, iPhone, portrait 720×1280 after scaling) into `viewer/demo/kitchen.splat` on a laptop-class CPU in about 25 minutes. The result is a fused depth cloud rendered as oriented disc splats — recognisable and walkable, but softer than a trained Gaussian splat. Use `scan/modal_app.py` or `scan/server.py` when a GPU is available.

```
video ─ffmpeg─► frames ─► COLMAP (intrinsics only) ─► Depth Anything V2 metric depth per frame
      ─► RGB-D PnP odometry (SIFT, optical-flow fallback) ─► unproject keyframes ─► consistency filter
      ─► 2 cm voxel merge ─► normals / level / yaw-align / crop to the room ─► .ply + .splat + .json
```

## Steps

```bash
pip install numpy opencv-python open3d onnxruntime scipy pycolmap   # python 3.10+

mkdir frames_colmap frames_all
ffmpeg -i IMG_2057.mov -vf "fps=4,scale=720:1280" -q:v 2 frames_colmap/f_%04d.jpg   # 4 fps, for depth + poses
ffmpeg -i IMG_2057.mov -vf "scale=360:640" -q:v 3 frames_all/a_%04d.jpg            # 30 fps, for optical-flow chaining

python3 run_colmap.py            # only to get the camera intrinsics (prints them; paste into fuse.py K/dist)
python3 run_depth.py models/da2_vitb_indoor_dynamic.onnx depth_vitb   # metric depth (metres), ~8 s/frame on CPU
python3 fuse.py depth_vitb kitchen.ply --kf 3 --voxel 0.02 --splat --exclude 80-99
cp kitchen.splat kitchen.json ../../viewer/demo/
```

`run_depth.py` wants the ONNX export of **Depth Anything V2 Metric Indoor (ViT-B, dynamic input size)** in `models/`; search Hugging Face for "depth-anything-v2 metric indoor onnx". The small ViT-S export also works (faster, noisier).

### fuse.py options worth knowing

| Flag | Meaning |
| --- | --- |
| `--kf 3` | unproject every 3rd pose-tracked frame (fewer = cleaner, more = denser) |
| `--voxel 0.02` | merge resolution in metres; 0.015 gives ~780k splats, 0.02 gives ~470k |
| `--exclude 80-99` | frames to leave out (here: the end of the walk, past the glass doors) |
| `--reach 4.5` | drop anything farther than this from the camera path, which trims the view through windows |
| `--minsharp 35` | Laplacian-variance threshold; blurrier frames are skipped |
| `--poses poses.npy --skip_poses` | reuse the odometry from a previous run (poses take ~5 min) |

The sidecar `kitchen.json` holds `up`, `spawn`, `forward`, `floorY`, `bounds` and the camera path; the viewer reads it from `<scene>.json` next to any `.ply`/`.splat` and spawns you where the phone was, facing what it filmed first.

## Known limits

- Odometry drifts on rotation-heavy or blurred footage, so walls can sit at slightly wrong angles and surfaces seen twice can ghost.
- Plain walls that only appear in one or two blurred frames come out with holes.
- Depth is monocular: absolute scale is roughly right (metres) but not survey-grade.
- Intrinsics in `fuse.py` (`K`, `dist`) are for this particular phone/video; rerun `run_colmap.py` for another camera.
