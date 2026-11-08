# scan-pipeline — video → `rooms/<id>.json`

The "3D scan" generator for the spec-driven three.js room viewer in this folder.
Frames from a phone video of a room go through **five parallel Claude analyst
calls** (architecture+coordinates, furniture, materials/colors, lighting,
props/decor) plus **one merge call**, and out comes a `rooms/<id>.json` that the
viewer renders. The prompt pack is in [`PROMPTS.md`](./PROMPTS.md); the runner
is [`generate.mjs`](./generate.mjs) (dependency-free Node 18+, raw Messages
API over global `fetch` — no SDK packages).

## Prerequisites

- Node 18+ (20+ recommended)
- An Anthropic API key in the environment (**never hardcode it**):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## 1. Shoot the video

One slow, continuous pan from roughly the middle of the room, portrait or
landscape, covering all four walls (overlap the start a little). 20–30 seconds
is plenty. Daylight on, no people in frame.

## 2. Extract frames

Aim for **30–60 frames** covering the full pan (hard cap 100 — the API's
images-per-request limit), long edge ~1000–1500 px (Claude resizes beyond
1568 px anyway; smaller frames cost less).

**With ffmpeg** (one-liner — `fps=2` on a ~25 s pan gives ~50 frames):

```bash
mkdir -p frames
ffmpeg -i room.mp4 -vf "fps=2,scale='min(1024,iw)':-2" -qscale:v 3 frames/frame_%03d.jpg
```

**macOS without ffmpeg:** the original kitchen run used a tiny AVFoundation
Swift extractor (`AVAssetImageGenerator` sampling N evenly spaced timestamps —
no Homebrew needed, `swift` ships with Xcode CLT). Equivalent single file,
run as `swift extract-frames.swift room.mov frames 50`:

```swift
import AVFoundation
import AppKit

let args = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let outDir = args[2], count = Int(args[3]) ?? 50
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.maximumSize = CGSize(width: 1024, height: 1024)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let dur = CMTimeGetSeconds(asset.duration)
for i in 0..<count {
    let t = CMTime(seconds: dur * Double(i) / Double(count), preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: t, actualTime: nil) else { continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])
    try? data?.write(to: URL(fileURLWithPath: String(format: "%@/frame_%03d.jpg", outDir, i)))
}
```

## 3. Generate the spec

From the `room3d/` directory (so the default `--out rooms/` lands next to
`kitchen.json`):

```bash
node scan-pipeline/generate.mjs --frames frames/ --id myroom
# options: --out rooms/   --model claude-opus-5-5
```

What it does: reads every `.jpg`/`.jpeg`/`.png` in `--frames` sorted, base64s
them, fires the 5 analyst calls in parallel (each gets **all** frames + its
prompt), then one merge call with the five reports + the schema + the
`kitchen.json` worked example, extracts the JSON (code fences tolerated),
validates `room {w,d,h}`, and writes `rooms/myroom.json`. One automatic retry
on 429/529 (honoring `retry-after`); a cost/time summary prints at the end. If
the merge output doesn't parse, the raw text is saved to
`rooms/<id>.merge-raw.txt` so the run isn't wasted.

**Expected runtime/cost (ballpark, 50 frames @ ~1024 px, default
`claude-opus-5-5`):** each analyst call carries ~60–80K input tokens of images,
so the whole run is roughly **350–450K input + ~30K output tokens ≈ $2–4**, and
takes **~4–10 minutes** (analysts run concurrently; the merge adds a couple of
minutes). Fewer/smaller frames scale the cost down almost linearly.

## 4. View it

Serve the site's `public/` directory with any static server, then:

```
open /scans/room3d/?room=myroom
```

(e.g. `npx serve website/public` from the repo root, then browse to
`http://localhost:3000/scans/room3d/?room=myroom`.)

## Honest limitations — review before publishing

- **Scale is ±0.3 m-ish.** There's no metric reference in a video; dimensions
  are inferred from anchors (door 2.03 m, counter 0.91 m...). Rooms render
  plausibly but not survey-accurately.
- **Props are approximate.** Counts, positions and colors of small items are
  best-effort; the merge intentionally clusters dense shelf clutter.
- **Wall labeling can wobble.** The "feature wall = K" anchor rule usually
  converges, but a room with two equally busy walls may label differently
  between runs; the merge resolves conflicts toward the architecture report.
- **The viewer only builds cataloged types.** Anything exotic becomes a
  `genericBox` or is dropped; the script warns about unknown types.
- **Always review the JSON** (and walk the room in the viewer) before
  publishing: check `room` dims, collider rects, `walkSpawn`, and that no real
  text or outside-the-window content sneaked in. The spec contract is in
  `../rooms-schema.md`; the normalizer (`../js/spec.js`) fills defaults but
  won't fix bad geometry.
