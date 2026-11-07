"""Metric depth (metres) for every frame with Depth Anything V2 (indoor, ViT-B) on CPU."""
import sys, time, glob
from pathlib import Path
import numpy as np, cv2, onnxruntime as ort

model = sys.argv[1] if len(sys.argv) > 1 else "models/da2_vitb_indoor_dynamic.onnx"
out = Path(sys.argv[2] if len(sys.argv) > 2 else "depth_vitb"); out.mkdir(exist_ok=True)
W, H = 518, 924  # multiples of 14, same 9:16 aspect as the frames
so = ort.SessionOptions(); so.intra_op_num_threads = 2
s = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
name = s.get_inputs()[0].name
mean, std = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
frames = sorted(glob.glob("frames_colmap/f_*.jpg"))
t0 = time.time()
for k, f in enumerate(frames):
    dst = out / (Path(f).stem + ".npy")
    if dst.exists():
        continue
    img = cv2.imread(f)[:, :, ::-1]
    x = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    x = ((x - mean) / std).transpose(2, 0, 1)[None]
    d = s.run(None, {name: x})[0][0].astype(np.float32)
    np.save(dst, d)
    if k % 10 == 0:
        print(f"{k+1}/{len(frames)} {time.time()-t0:.0f}s  median {np.median(d):.2f} m", flush=True)
print("done %.0fs" % (time.time() - t0))
