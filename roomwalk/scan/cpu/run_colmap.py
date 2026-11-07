import time, shutil, sys
from pathlib import Path
import pycolmap

root = Path(".")
db = root / "colmap" / "database.db"
imgs = root / "frames_colmap"
out = root / "colmap" / "sparse"
shutil.rmtree(root / "colmap", ignore_errors=True)
(root / "colmap").mkdir()
out.mkdir()

t = time.time()
reader = pycolmap.ImageReaderOptions()
reader.camera_model = "OPENCV"          # phone lens: allow mild distortion
ext = pycolmap.FeatureExtractionOptions()
ext.sift.max_num_features = 6000
pycolmap.extract_features(db, imgs, camera_mode=pycolmap.CameraMode.SINGLE, reader_options=reader,
                          extraction_options=ext, device=pycolmap.Device.cpu)
print("features %.0fs" % (time.time() - t)); t = time.time()

pair = pycolmap.SequentialPairingOptions()
pair.overlap = 15
pair.quadratic_overlap = True
pycolmap.match_sequential(db, pairing_options=pair, device=pycolmap.Device.cpu)
print("matching %.0fs" % (time.time() - t)); t = time.time()

opts = pycolmap.IncrementalPipelineOptions()
opts.min_model_size = 10
opts.num_threads = 8
opts.extract_colors = True
maps = pycolmap.incremental_mapping(db, imgs, out, options=opts)
print("mapping %.0fs, %d model(s)" % (time.time() - t, len(maps)))
for i, rec in maps.items():
    print(f"model {i}: {rec.num_reg_images()} images, {rec.num_points3D()} points, mean reproj err {rec.compute_mean_reprojection_error():.2f}px, mean track {rec.compute_mean_track_length():.1f}")
    cam = list(rec.cameras.values())[0]
    print("camera", cam.model, cam.width, cam.height, [round(p, 2) for p in cam.params])
