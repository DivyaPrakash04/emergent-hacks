#!/usr/bin/env bash
# RoomWalk scan pipeline: video -> splat.ply, on a machine with an NVIDIA GPU.
# Needs: nerfstudio (pip install nerfstudio), COLMAP, ffmpeg. See README.md.
#
# Usage: ./pipeline.sh room.mp4 [out_dir] [iterations] [frames]
set -euo pipefail

VIDEO="${1:?usage: pipeline.sh video.mp4 [out_dir] [iterations] [frames]}"
OUT="${2:-roomwalk_out}"
ITERS="${3:-15000}"
FRAMES="${4:-200}"
GPU_FLAG="--gpu"
colmap -h 2>&1 | grep -qi cuda || GPU_FLAG="--no-gpu"

echo "==> 1/3 frames + COLMAP poses ($FRAMES frames)"
ns-process-data video --data "$VIDEO" --output-dir "$OUT/data" \
  --num-frames-target "$FRAMES" $GPU_FLAG --matching-method sequential

echo "==> 2/3 training splatfacto ($ITERS iterations)"
ns-train splatfacto --data "$OUT/data" --output-dir "$OUT/outputs" \
  --experiment-name room --vis tensorboard \
  --max-num-iterations "$ITERS" \
  --pipeline.model.cull-alpha-thresh 0.005 \
  --pipeline.model.use-scale-regularization True

echo "==> 3/3 export"
CFG=$(ls -t "$OUT"/outputs/room/splatfacto/*/config.yml | head -1)
ns-export gaussian-splat --load-config "$CFG" --output-dir "$OUT/export"

echo
echo "Done: $OUT/export/splat.ply"
echo "Open it in the viewer: cd ../viewer && python3 -m http.server 8000, then http://localhost:8000"
