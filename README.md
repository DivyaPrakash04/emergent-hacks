# Common Kitchen 3D

A walkable, realistic 3D replica of a dorm common kitchen, reconstructed from a
25-second phone video by a swarm of Claude agents — no photogrammetry, no mesh
scanning. Every wall, counter, chair, and pizza box was inferred from frames and
hand-modeled in three.js.

## Run it

```
node tools/server.js
```

Then open http://127.0.0.1:8123 (any static server works too; the saved-GLB
endpoint is only needed for re-exporting).

## Controls

The room assembles itself from scattered blocks on load (skipped under
`prefers-reduced-motion`), waits a beat, then drops you into first-person
at eye height. There is no other UI.

- **Click** the room to capture the mouse for look control
- **WASD** / arrows to move, **Shift** to run
- **Esc** releases the mouse; click (or Esc) captures it again
- Real collision against counters, tables, banquette, chairs, and the trash can
- On touch screens: left half of the screen is a move stick, right half looks

## How it was built

1. 50 frames extracted from the source video (AVFoundation).
2. Five analysis agents each read all frames and wrote structured specs
   (`specs/`): architecture & floor plan, furniture inventory, PBR
   materials/colors, lighting plan, and a ~100-item decor catalog.
3. Reports merged into one coordinate system (`js/spec.js`) and a shared
   procedural material/texture library (`js/materials.js` — canvas-generated
   mosaic tile, mottled vinyl, brushed stainless, fabrics, notice papers).
4. Five build agents wrote the scene modules in parallel against a strict
   contract (`CONTRACT.md`): `shell`, `kitchen`, `furniture`, `decor`,
   `lighting`.
5. Screenshot-vs-footage QA rounds fixed geometry, color, and glow mismatches.

## Files

- `index.html` + `js/` — the viewer (three.js 0.160 via CDN import map)
- `js/spec.js` — the merged room spec, single source of truth for all dimensions
- `specs/` — the raw analysis reports the agents produced from the video
- `room.glb` — exported model (2.2 MB, textures embedded; opens in Blender)
- `CONTRACT.md` — the module contract the build agents coded against

Dimensions are visual estimates (±0.3 m). Posters and notices are abstract —
no real-world text was reproduced. Nothing beyond the windows/glass doors is
modeled, by design; the glass shows painted backdrops.
