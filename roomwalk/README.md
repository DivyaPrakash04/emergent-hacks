# RoomWalk

Video in, walkable 3D room out. Drop a walkthrough video into the page; a few minutes later you're walking through the room in first person with WASD and the mouse, like a game.

```
roomwalk/
  viewer/      the web app: first-person viewer + "scan from video" panel
  scan/        the scan backend: cloud (Modal) or local GPU, plus a Colab fallback
  tools/       makes the synthetic demo room
```

## 1. Run the viewer (one minute)

```bash
cd roomwalk/viewer
python3 serve.py          # or: python3 -m http.server 8000
```

Open http://localhost:8000. It streams a **real photographed room** (a public 51 MB sample scan) and drops you inside it; with no internet it falls back to the built-in synthetic room. Click the room, then:

| Key | Action |
| --- | --- |
| Mouse | Look (click to capture, Esc to release) |
| W A S D | Walk |
| Shift | Run |
| Space / C | Up / down |
| U | Cycle the up-axis (scans come in random orientations) |
| F | Flip the up-axis |
| [ ] | Slower / faster |
| R | Respawn at the room centre |
| B | Toggle the "stay inside the room" clamp |

Buttons: **Real room** (the sample scan), **Demo room** (offline synthetic room), **Open scan…** (any `.ply` / `.splat` / `.ksplat`). Dragging a scan file onto the page opens it; dragging a video starts a scan.

The viewer must be served over HTTP, not opened as a `file://` page.

## 2. Scan your own room from a video

Film 60 to 120 seconds walking slowly around the room: edges first, then the middle, catch corners from several angles, lights on, no fast turns, avoid mirrors and big windows. This matters more than anything else.

Then drop the video onto the page (or use the **Scan a room from a video** panel). The page uploads it, shows progress (frames → camera solve → training → export) and loads the finished room by itself. Quality presets: Fast ~10 min, Normal ~20 min, Best ~40 min.

The panel needs a **scan server**, because training runs on an NVIDIA GPU. Pick one:

### Option A: cloud GPU on Modal (recommended, no GPU needed, free tier)

```bash
pip install modal
modal setup                        # log in once in the browser
modal deploy scan/modal_app.py     # ~10 min the first time (builds the image), then seconds
```

It prints a URL like `https://<you>--roomwalk-api.modal.run`. Paste it into the viewer's **Scan server** box (it's remembered). Each scan runs on an A10G, roughly $0.30–0.80 of credit at normal quality.

### Option B: your own NVIDIA machine

Install [nerfstudio](https://docs.nerf.studio/quickstart/installation.html), COLMAP and ffmpeg, then:

```bash
pip install -r scan/requirements.txt
python3 scan/server.py --port 8080      # Scan server: http://localhost:8080
```

### Option C: Google Colab (no setup, more clicking)

`scan/RoomWalk_Colab.ipynb`: GPU runtime, run the cells, upload the video, download `splat.ply`, open it in the viewer.

### Test the flow without any GPU

`python3 scan/server.py --demo` fakes the GPU stages and returns the demo room, so you can rehearse the upload → progress → load path anywhere.

### No time at all?

Scan the room with **Scaniverse** (free), **Polycam** or **KIRI Engine**, export the Gaussian splat as `.ply` or `.splat`, and open it with **Open scan…**.

## Why real scans look real and the demo room doesn't

A Gaussian splat trained from video is made of millions of tiny coloured blobs optimised until renders match the video frames, so its texture is literally the room's pixels, including reflections and lighting. The synthetic demo room is procedurally coloured and will always look like a game. Load the **Real room** sample or scan your own to see the difference.

## How the pipeline works

1. `ffmpeg` samples ~200 frames from the video.
2. `COLMAP` matches features between frames and solves every camera position.
3. `nerfstudio splatfacto` optimises the Gaussians until renders match the frames.
4. `ns-export gaussian-splat` writes `splat.ply`.
5. The viewer renders with [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) on Three.js; a small first-person controller moves the camera on the floor plane of whichever axis is "up".

Splats have no collision geometry, so you can walk through walls; the clamp (B) keeps you inside the scanned volume. Next step for solid walls: `ns-export poisson` for a mesh and raycast against it.

## Credits

Sample scene: the Mip-NeRF 360 "room" capture, converted to `.splat` by [antimatter15/splat](https://github.com/antimatter15/splat) and hosted on Hugging Face (`cakewalk/splat-data`). Renderer: [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) (MIT). Training: [nerfstudio](https://nerf.studio) (Apache-2.0).
