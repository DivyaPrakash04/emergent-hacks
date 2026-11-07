"""RoomWalk scan server: upload a video, get back a walkable splat.ply.

Run locally on a machine with an NVIDIA GPU (nerfstudio + COLMAP + ffmpeg installed):

    pip install -r scan/requirements.txt
    python3 scan/server.py --port 8080

Then paste http://localhost:8080 into the viewer's "Scan server" box.
`--demo` fakes the GPU stages (no nerfstudio needed) so you can test the upload flow anywhere.

API (also served by modal_app.py in the cloud):
    POST /scan                 multipart: video, frames, iterations   -> {"job_id"}
    GET  /jobs/{id}            -> {"status": queued|running|done|failed, "stage", "progress", "detail", "eta", "error"}
    GET  /jobs/{id}/splat.ply  -> the model
    GET  /health
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

import pipeline

Submit = Callable[[str, int, int], None]

MAX_FRAMES, MAX_ITERS = 600, 60000


def write_status(job_dir: Path, **fields) -> dict:
    """Merge fields into status.json atomically."""
    path = job_dir / "status.json"
    current = read_status(job_dir) or {}
    current.update(fields, updated=time.time())
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(current), encoding="utf-8")
    os.replace(tmp, path)
    return current


def read_status(job_dir: Path) -> Optional[dict]:
    path = job_dir / "status.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def find_video(job_dir: Path) -> Optional[Path]:
    hits = sorted(job_dir.glob("input.*"))
    return hits[0] if hits else None


def process_job(job_dir: Path, frames: int, iterations: int, demo: bool = False,
                after_write: Callable[[], None] = lambda: None, workdir: Optional[Path] = None) -> None:
    """Run the pipeline for one job, keeping status.json up to date. Safe to call from a thread or a cloud worker.

    `workdir` holds the big intermediate files (frames, checkpoints); only status.json, pipeline.log and
    splat.ply land in `job_dir`, so a cloud worker can keep `workdir` on fast local disk.
    """
    job_dir = Path(job_dir)
    video = find_video(job_dir)
    work = Path(workdir) if workdir else job_dir / "work"
    last_write = {"t": 0.0, "stage": None}

    def progress(stage: str, frac: float, detail: Optional[str] = None, eta: Optional[str] = None) -> None:
        now = time.time()
        if stage == last_write["stage"] and frac < 1.0 and now - last_write["t"] < 2.0:
            return  # throttle: training reports every few steps
        last_write.update(t=now, stage=stage)
        write_status(job_dir, status="running", stage=stage, progress=round(frac, 3), detail=detail, eta=eta)
        after_write()

    try:
        if video is None:
            raise pipeline.PipelineError("The uploaded video is missing.")
        if demo:
            ply = pipeline.run_demo_pipeline(video, work, frames, iterations, progress,
                                             seconds=float(os.environ.get("ROOMWALK_DEMO_SECONDS", "20")))
        else:
            ply = pipeline.run_pipeline(video, work, frames, iterations, progress)
        shutil.copyfile(ply, job_dir / "splat.ply")
        shutil.rmtree(work / "outputs", ignore_errors=True)  # checkpoints are large; keep data + export only
        write_status(job_dir, status="done", stage="Done", progress=1.0, detail=None, eta=None)
    except Exception as e:  # noqa: BLE001 - anything that breaks the job should reach the UI
        write_status(job_dir, status="failed", error=str(e)[-2000:], eta=None)
    finally:
        log = work / "pipeline.log"
        if log.exists() and log.resolve() != (job_dir / "pipeline.log").resolve():
            shutil.copyfile(log, job_dir / "pipeline.log")
        after_write()


def create_app(jobs_dir: Path, submit: Submit, before_read: Callable[[], None] = lambda: None) -> FastAPI:
    jobs_dir = Path(jobs_dir)
    jobs_dir.mkdir(parents=True, exist_ok=True)
    app = FastAPI(title="RoomWalk scan server")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    def job_path(job_id: str) -> Path:
        if not job_id.isalnum() or len(job_id) > 32:
            raise HTTPException(400, "bad job id")
        p = jobs_dir / job_id
        if not p.exists():
            raise HTTPException(404, "unknown job")
        return p

    @app.get("/health")
    def health():
        return {"ok": True, "service": "roomwalk-scan"}

    @app.post("/scan")
    async def scan(video: UploadFile = File(...), frames: int = Form(200), iterations: int = Form(15000)):
        frames = max(30, min(MAX_FRAMES, int(frames)))
        iterations = max(1000, min(MAX_ITERS, int(iterations)))
        ext = Path(video.filename or "video.mp4").suffix.lower() or ".mp4"
        if ext not in {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}:
            raise HTTPException(415, f"unsupported video type {ext}")
        job_id = uuid.uuid4().hex[:12]
        job_dir = jobs_dir / job_id
        job_dir.mkdir(parents=True)
        dest = job_dir / f"input{ext}"
        size = 0
        with open(dest, "wb") as f:
            while chunk := await video.read(8 * 1024 * 1024):
                f.write(chunk)
                size += len(chunk)
        if size < 100_000:
            shutil.rmtree(job_dir, ignore_errors=True)
            raise HTTPException(400, "that video is too small to be a room walkthrough")
        write_status(job_dir, status="queued", stage="Queued", progress=0.0, frames=frames, iterations=iterations,
                     filename=video.filename, bytes=size, created=time.time())
        submit(job_id, frames, iterations)
        return {"job_id": job_id}

    @app.get("/jobs/{job_id}")
    def job(job_id: str):
        before_read()
        st = read_status(job_path(job_id))
        if st is None:
            return JSONResponse({"status": "queued", "stage": "Starting", "progress": 0.0})
        return st

    @app.get("/jobs/{job_id}/splat.ply")
    def splat(job_id: str):
        before_read()
        p = job_path(job_id) / "splat.ply"
        if not p.exists():
            raise HTTPException(404, "not finished yet")
        return FileResponse(p, media_type="application/octet-stream", filename="splat.ply")

    @app.get("/jobs/{job_id}/log")
    def log(job_id: str):
        before_read()
        d = job_path(job_id)
        p = d / "pipeline.log" if (d / "pipeline.log").exists() else d / "work" / "pipeline.log"
        return FileResponse(p, media_type="text/plain") if p.exists() else JSONResponse({"log": ""})

    return app


def main() -> None:
    import uvicorn

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--jobs-dir", default=os.environ.get("ROOMWALK_JOBS", str(Path(tempfile.gettempdir()) / "roomwalk-jobs")))
    ap.add_argument("--demo", action="store_true", help="fake the GPU stages and return the demo room (for testing the flow)")
    ap.add_argument("--workers", type=int, default=1, help="jobs to run at once (one per GPU)")
    args = ap.parse_args()

    jobs_dir = Path(args.jobs_dir)
    pool = ThreadPoolExecutor(max_workers=args.workers)
    lock = threading.Lock()

    def submit(job_id: str, frames: int, iterations: int) -> None:
        def run():
            with lock if args.workers == 1 else threading.Lock():
                process_job(jobs_dir / job_id, frames, iterations, demo=args.demo)
        pool.submit(run)

    app = create_app(jobs_dir, submit)
    mode = "DEMO mode (no GPU work, returns the sample room)" if args.demo else "GPU mode"
    print(f"RoomWalk scan server · {mode} · jobs in {jobs_dir}\nPaste http://localhost:{args.port} into the viewer's Scan server box.")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
