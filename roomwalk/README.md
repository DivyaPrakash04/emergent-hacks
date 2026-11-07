# RoomWalk

Video in, walkable 3D room out. Film a slow walkthrough on your phone, turn it into a 3D Gaussian splat, then walk through it in the browser in first person: WASD to move, mouse to look, like a game.

```
roomwalk/
  viewer/      first-person web viewer (open this)
  scan/        video -> splat.ply pipeline (Colab notebook + local script)
  tools/       makes the synthetic demo room
```

## 1. Try the viewer right now (no scan needed)

```bash
cd roomwalk/viewer
python3 -m http.server 8000
```

Open http://localhost:8000. The demo room loads by itself. Click the room, then:

| Key | Action |
| --- | --- |
| Mouse | Look around (click to capture, Esc to release) |
| W A S D | Walk |
| Shift | Run |
| Space / C | Up / down |
| U | Cycle the up-axis (scans come in random orientations) |
| F | Flip the up-axis |
| [ ] | Slower / faster |
| R | Respawn at the room centre |
| B | Toggle "stay inside the room" clamp |

The viewer must be served over HTTP (not opened as a `file://` page), because it loads the scan with a web worker. Any static server works.

## 2. Scan a real room

**Film it (the part that matters most):**
- 60 to 120 seconds, walking slowly around the room; no fast turns.
- Lots of overlap: walk the edges, then the middle, and catch corners from several angles.
- Even lighting. Avoid mirrors, big windows and bare white walls as the only thing in frame.
- Landscape, 1080p is plenty; lock exposure if your camera app allows it.

**Build the model (needs a GPU):**
- Easiest: open `scan/RoomWalk_Colab.ipynb` in Google Colab, switch the runtime to GPU, run the cells, upload the video, download `splat.ply`. About 30 to 50 minutes on a free T4.
- Local NVIDIA machine: install [nerfstudio](https://docs.nerf.studio/quickstart/installation.html) and COLMAP, then `scan/pipeline.sh room.mp4`.

**Walk through it:** in the viewer click **Open scan…** and pick `splat.ply`, or drag the file onto the page. If the room is tilted or upside down press **U** or **F**.

### No GPU and no time?

Scan the room with a phone app that exports a Gaussian splat, then open the file in the viewer:
- **Scaniverse** (free, on-device): export as PLY.
- **Polycam** or **KIRI Engine**: export the splat as `.ply` or `.splat`.

The viewer accepts standard 3DGS `.ply`, `.splat` and `.ksplat` files from any tool.

## How it works

1. `ffmpeg` samples ~200 frames from the video.
2. `COLMAP` finds matching features between frames and solves every camera position (structure from motion).
3. `nerfstudio splatfacto` starts from COLMAP's sparse points and optimizes millions of tiny 3D Gaussians until renders match the video frames.
4. `ns-export gaussian-splat` writes `splat.ply`.
5. The viewer renders the splats with [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) on Three.js, and a small first-person controller moves the camera on the floor plane of whichever axis is "up".

Splats have no collision geometry, so you can walk through walls; the clamp (B) keeps you inside the scanned volume. A collision mesh is the next step: export a mesh with `ns-export poisson` and raycast against it.

## Regenerate the demo room

```bash
python3 tools/make_demo_room.py viewer/demo/room.ply
```
