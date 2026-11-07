"""RoomWalk scan server on Modal (cloud GPU), so nobody has to open Colab.

One-time setup (about 10 minutes, mostly waiting for the image to build):

    pip install modal
    modal setup                      # opens the browser once to log in (free tier includes GPU credits)
    modal deploy scan/modal_app.py   # prints a URL like https://<you>--roomwalk-api.modal.run

Paste that URL into the viewer's "Scan server" box. Each scan runs on an A10G for ~10–30 min
depending on the quality setting. The web endpoint and the GPU worker share a Modal Volume.

Same API as server.py (POST /scan, GET /jobs/{id}, GET /jobs/{id}/splat.ply).
"""
from __future__ import annotations

from pathlib import Path

import modal

APP_NAME = "roomwalk"
JOBS = Path("/jobs")
HERE = Path(__file__).resolve().parent

app = modal.App(APP_NAME)
jobs_volume = modal.Volume.from_name(f"{APP_NAME}-jobs", create_if_missing=True)

# GPU image: CUDA 11.8 + torch 2.1.2 is the combination nerfstudio documents; gsplat has prebuilt
# wheels for it, so nothing compiles at build time. COLMAP comes from apt (CPU build, which is fine).
gpu_image = (
    modal.Image.from_registry("nvidia/cuda:11.8.0-devel-ubuntu22.04", add_python="3.10")
    .apt_install("colmap", "ffmpeg", "git", "libgl1", "libglib2.0-0", "libegl1")
    .env({"TORCH_CUDA_ARCH_LIST": "7.5;8.0;8.6;8.9;9.0", "PYTHONUNBUFFERED": "1"})
    .pip_install("torch==2.1.2+cu118", "torchvision==0.16.2+cu118", extra_index_url="https://download.pytorch.org/whl/cu118")
    .pip_install("gsplat==1.4.0", extra_index_url="https://docs.gsplat.studio/whl/pt21cu118")
    .pip_install("nerfstudio==1.1.5", "fastapi", "python-multipart")
    .add_local_file(HERE / "pipeline.py", "/root/pipeline.py")
    .add_local_file(HERE / "server.py", "/root/server.py")
)

# Web image: small and fast to start; it only moves files and reads status.
web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]", "python-multipart")
    .add_local_file(HERE / "pipeline.py", "/root/pipeline.py")
    .add_local_file(HERE / "server.py", "/root/server.py")
)


@app.function(image=gpu_image, gpu="A10G", cpu=8.0, memory=32768, timeout=3 * 60 * 60, volumes={str(JOBS): jobs_volume})
def process(job_id: str, frames: int, iterations: int) -> None:
    """GPU worker: runs the whole pipeline for one job and writes status + splat.ply to the volume."""
    import server

    jobs_volume.reload()
    # Frames and checkpoints stay on the container's local disk; only status, log and splat.ply hit the volume.
    server.process_job(JOBS / job_id, frames, iterations, demo=False, after_write=jobs_volume.commit,
                       workdir=Path("/tmp/work") / job_id)


@app.function(image=web_image, volumes={str(JOBS): jobs_volume}, timeout=60 * 60, min_containers=0)
@modal.concurrent(max_inputs=20)
@modal.asgi_app(label=f"{APP_NAME}-api")
def api():
    import server

    def submit(job_id: str, frames: int, iterations: int) -> None:
        jobs_volume.commit()                      # make the uploaded video visible to the worker
        process.spawn(job_id, frames, iterations)

    return server.create_app(JOBS, submit, before_read=jobs_volume.reload)


@app.local_entrypoint()
def main(video: str, frames: int = 200, iterations: int = 15000):
    """CLI use without the web UI: `modal run scan/modal_app.py --video room.mp4` -> ./splat.ply"""
    import shutil
    import time
    import uuid

    job_id = uuid.uuid4().hex[:12]
    ext = Path(video).suffix.lower() or ".mp4"
    with jobs_volume.batch_upload() as batch:
        batch.put_file(video, f"{job_id}/input{ext}")
    call = process.spawn(job_id, frames, iterations)
    print(f"job {job_id} started; training on an A10G…")
    last = ""
    while True:
        time.sleep(10)
        jobs_volume.reload()
        try:
            st = b"".join(jobs_volume.read_file(f"{job_id}/status.json")).decode()
        except Exception:
            st = ""
        if st != last:
            print(st)
            last = st
        if '"status": "done"' in st or '"status": "failed"' in st:
            break
    call.get()
    if '"status": "done"' in last:
        with open("splat.ply", "wb") as f:
            for chunk in jobs_volume.read_file(f"{job_id}/splat.ply"):
                f.write(chunk)
        print("wrote ./splat.ply — open it in the viewer")
