"""Video -> Gaussian splat (.ply) pipeline, shared by server.py (local) and modal_app.py (cloud).

Stages: ffmpeg frame extraction + COLMAP poses (ns-process-data) -> nerfstudio splatfacto
training -> ns-export gaussian-splat. Needs an NVIDIA GPU, nerfstudio, COLMAP and ffmpeg.

`run_pipeline()` reports progress through a callback so a web UI can show a bar, and
`run_demo_pipeline()` fakes the same stages without a GPU so the upload flow can be tested.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Callable, Optional

Progress = Callable[[str, float, Optional[str], Optional[str]], None]  # (stage, fraction 0..1, detail, eta)

STEP_RE = re.compile(r"(\d+)\s*\(\s*(\d+(?:\.\d+)?)%\s*\)")  # nerfstudio's "Step (% Done)" column


class PipelineError(RuntimeError):
    pass


def _fmt_eta(seconds: float) -> str:
    seconds = max(0, int(seconds))
    return f"{seconds // 60} min" if seconds >= 60 else f"{seconds} s"


def _run(cmd: list[str], log: Path, on_line: Optional[Callable[[str], None]] = None, env: Optional[dict] = None) -> None:
    """Run a command, tee its output to `log`, and stream lines to `on_line`."""
    full_env = {**os.environ, "PYTHONUNBUFFERED": "1", "COLUMNS": "200", "NO_COLOR": "1", "TERM": "dumb", **(env or {})}
    with open(log, "a", encoding="utf-8") as lf:
        lf.write("\n$ " + " ".join(cmd) + "\n")
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace", env=full_env)
        assert proc.stdout is not None
        for line in proc.stdout:
            lf.write(line)
            if on_line:
                try:
                    on_line(line)
                except Exception:
                    pass
        code = proc.wait()
    if code != 0:
        tail = log.read_text(encoding="utf-8", errors="replace")[-1500:]
        raise PipelineError(f"`{cmd[0]}` exited with code {code}. Last output:\n{tail}")


def colmap_has_cuda() -> bool:
    try:
        r = subprocess.run(["colmap", "-h"], capture_output=True, text=True, timeout=30)
        out = (r.stdout + r.stderr).lower()
    except Exception:
        return False
    return "without cuda" not in out and "cuda" in out


def run_pipeline(video: Path, workdir: Path, frames: int = 200, iterations: int = 15000,
                 progress: Progress = lambda *a: None) -> Path:
    """Turn `video` into `workdir/export/splat.ply`. Raises PipelineError with a readable message."""
    video, workdir = Path(video), Path(workdir)
    data, outputs, export = workdir / "data", workdir / "outputs", workdir / "export"
    log = workdir / "pipeline.log"
    workdir.mkdir(parents=True, exist_ok=True)
    for tool in ("ns-process-data", "ns-train", "ns-export", "colmap", "ffmpeg"):
        if shutil.which(tool) is None:
            raise PipelineError(f"`{tool}` is not installed on the scan server. Install nerfstudio, COLMAP and ffmpeg (see scan/README.md).")

    # ---- 1. frames + camera poses --------------------------------------------------------
    progress("Extracting frames and solving camera positions (COLMAP)", 0.02, f"{frames} frames", None)
    t0 = time.time()
    shutil.rmtree(data, ignore_errors=True)
    gpu_flag = "--gpu" if colmap_has_cuda() else "--no-gpu"

    def colmap_line(line: str) -> None:
        l = line.lower()
        if "extracting" in l and "frame" in l:
            progress("Extracting frames from the video", 0.04, None, None)
        elif "feature" in l and "extract" in l:
            progress("Finding features in every frame (COLMAP)", 0.08, None, None)
        elif "matching" in l:
            progress("Matching features between frames (COLMAP)", 0.14, None, None)
        elif "sparse" in l or "mapper" in l or "reconstruct" in l:
            progress("Solving camera positions (COLMAP)", 0.20, None, None)

    _run(["ns-process-data", "video", "--data", str(video), "--output-dir", str(data),
          "--num-frames-target", str(frames), gpu_flag, "--matching-method", "sequential", "--verbose"],
         log, colmap_line)
    images = list((data / "images").glob("*")) if (data / "images").exists() else []
    if not (data / "transforms.json").exists() or len(images) < 20:
        raise PipelineError(
            f"COLMAP could only use {len(images)} frames. The video is probably too fast, too dark, or shows too many "
            "plain surfaces. Re-film slower, with more overlap, and keep a few objects in frame at all times.")
    progress("Camera positions solved", 0.25, f"{len(images)} frames registered in {_fmt_eta(time.time() - t0)}", None)

    # ---- 2. train the splat ---------------------------------------------------------------
    shutil.rmtree(outputs, ignore_errors=True)
    t1 = time.time()
    state = {"last": 0.0}

    def train_line(line: str) -> None:
        m = STEP_RE.search(line)
        if not m:
            return
        step = int(m.group(1))
        frac = min(1.0, step / max(1, iterations))
        if frac <= state["last"]:
            return
        state["last"] = frac
        elapsed = time.time() - t1
        eta = _fmt_eta(elapsed / frac - elapsed) if frac > 0.02 else None
        progress("Training the 3D model", 0.25 + 0.68 * frac, f"step {step:,} / {iterations:,}", eta)

    progress("Training the 3D model", 0.26, f"0 / {iterations:,} steps", None)
    _run(["ns-train", "splatfacto", "--data", str(data), "--output-dir", str(outputs),
          "--experiment-name", "room", "--vis", "tensorboard",
          "--max-num-iterations", str(iterations),
          "--pipeline.model.cull-alpha-thresh", "0.005",
          "--pipeline.model.use-scale-regularization", "True",
          "--logging.steps-per-log", "50"],
         log, train_line)

    # ---- 3. export ------------------------------------------------------------------------
    progress("Exporting splat.ply", 0.95, None, None)
    configs = sorted(outputs.glob("room/splatfacto/*/config.yml"), key=lambda p: p.stat().st_mtime)
    if not configs:
        raise PipelineError("Training finished but no config.yml was written. See pipeline.log.")
    shutil.rmtree(export, ignore_errors=True)
    _run(["ns-export", "gaussian-splat", "--load-config", str(configs[-1]), "--output-dir", str(export)], log)
    ply = export / "splat.ply"
    if not ply.exists():
        raise PipelineError("ns-export did not produce splat.ply. See pipeline.log.")
    progress("Done", 1.0, f"{ply.stat().st_size / 1e6:.0f} MB", None)
    return ply


def run_demo_pipeline(video: Path, workdir: Path, frames: int = 200, iterations: int = 15000,
                      progress: Progress = lambda *a: None, demo_ply: Optional[Path] = None,
                      seconds: float = 20.0) -> Path:
    """Same stages and progress shape as run_pipeline, no GPU: copies the demo room instead of training."""
    workdir = Path(workdir)
    export = workdir / "export"
    export.mkdir(parents=True, exist_ok=True)
    src = Path(demo_ply) if demo_ply else Path(__file__).resolve().parent.parent / "viewer" / "demo" / "room.ply"
    stages = [("Extracting frames and solving camera positions (COLMAP)", 0.02, 0.25),
              ("Training the 3D model", 0.26, 0.93),
              ("Exporting splat.ply", 0.95, 0.99)]
    ticks = 20
    for stage, a, b in stages:
        for i in range(ticks):
            frac = a + (b - a) * i / ticks
            detail = f"step {int(iterations * (frac - 0.25) / 0.68):,} / {iterations:,}" if stage.startswith("Training") else None
            progress(stage, frac, detail, _fmt_eta(seconds * (1 - frac)))
            time.sleep(seconds / (ticks * len(stages)))
    shutil.copyfile(src, export / "splat.ply")
    progress("Done", 1.0, "demo mode: this is the sample room, not your video", None)
    return export / "splat.ply"
