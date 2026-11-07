# RoomWalk scan backend

Turns a walkthrough video into a Gaussian splat (`splat.ply`) that the viewer can walk through. Three ways to run it; all speak the same tiny API, so the viewer doesn't care which one you pick.

| File | What it is |
| --- | --- |
| `pipeline.py` | The actual work: ffmpeg → COLMAP → nerfstudio splatfacto → export, with progress callbacks |
| `server.py` | FastAPI server around it (`POST /scan`, `GET /jobs/{id}`, `GET /jobs/{id}/splat.ply`); `--demo` fakes the GPU |
| `modal_app.py` | The same server deployed on Modal's cloud GPUs with one command |
| `RoomWalk_Colab.ipynb` | Manual fallback on Google Colab |
| `pipeline.sh` | Manual fallback on a local NVIDIA machine |

## Modal (cloud GPU)

```bash
pip install modal
modal setup
modal deploy scan/modal_app.py
```

Paste the printed `https://…--roomwalk-api.modal.run` URL into the viewer. Useful commands:

```bash
modal app logs roomwalk                      # watch a scan run
modal run scan/modal_app.py --video room.mp4 # scan from the terminal, writes ./splat.ply
modal volume ls roomwalk-jobs                # finished jobs live here
```

The first deploy builds the GPU image (CUDA 11.8, torch 2.1.2, gsplat prebuilt wheel, nerfstudio 1.1.5, COLMAP from apt). That takes ~10 minutes once; later deploys reuse it.

## Local NVIDIA machine

```bash
# nerfstudio + COLMAP + ffmpeg per https://docs.nerf.studio/quickstart/installation.html, then:
pip install -r scan/requirements.txt
python3 scan/server.py --port 8080
```

## API

```
POST /scan                 multipart form: video (file), frames (int), iterations (int)   -> {"job_id": "…"}
GET  /jobs/{id}            -> {"status": "queued|running|done|failed", "stage": "…", "progress": 0.0–1.0, "detail": "…", "eta": "…", "error": "…"}
GET  /jobs/{id}/splat.ply  -> the model (3D Gaussian Splatting .ply, SH degree 3)
GET  /jobs/{id}/log        -> pipeline log, for debugging a failed scan
GET  /health
```

Quality presets the viewer sends: fast = 120 frames / 7 000 iterations, normal = 200 / 15 000, best = 300 / 30 000.

## When a scan fails

- **"COLMAP could only use N frames"**: the video was too fast, too dark, or mostly plain walls. Re-film slower with more overlap and keep objects in frame.
- **Out of memory during training**: use the Fast preset, or film a smaller area.
- **Everything else**: `GET /jobs/{id}/log` has the full output.
