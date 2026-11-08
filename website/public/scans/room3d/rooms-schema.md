# Room spec schema (v1) — spec-driven 3D scan engine

Every room the viewer can render is one JSON file in `rooms/<id>.json`, loaded by
`js/spec.js` via `?room=<id>` (default `kitchen`). Modules NEVER hardcode room
content; they build only what the spec declares. Units meters, +Y up, angles in
RADIANS. Coordinates: origin at the floor corner where wall K meets wall W;
+X along wall K, +Z along wall W into the room.

Walls are named K (z=0), W (x=0), B (z=room.d), F (x=room.w).
Each wall has an "along" axis for opening coordinates (c0/c1 measured from the
wall's low corner): K and B use X; W and F use Z.

## Top level

| key | req | shape |
|---|---|---|
| id, name | yes | strings |
| room | yes | {w, d, h} |
| wallColors | no | {K, W, B, F} hex (default warm cream #eae3cf) |
| cove | no | {h} dark vinyl cove base (default 0.10; h:0 disables) |
| floor | no | {base hex, spots [hex...], seamEvery m (0.1 small tile, 0 none), seamAlpha, roughness} |
| windows | no | array, see below |
| glazedWalls | no | array, see below |
| doors | no | array, see below |
| stubs | no | array, see below |
| radiators | no | array of {wall, c0, c1, h, d} |
| backdrops | no | array of {behind: wall, kind: "campus"\|"sunroom"\|"plain", color?} |
| kitchen | no | the kitchen block (see below) — omit for non-kitchens |
| furniture | no | array of furniture items (catalog below) |
| props | no | array of prop items (catalog below) |
| lighting | no | {pendants, pendantGeom, ceiling, ambient?} |
| colliders | no | array of [x0, x1, z0, z1] RAW obstacle footprints (walk.js inflates by player radius) |
| walkSpawn | no | {x, z, yaw} (default room center, yaw 0) |

## Openings

**windows[]**: `{wall, c0, c1, sill, head, sillDepth, sillThick, trimW, upperGrid:[cols,rows], lowerGrid:[cols,rows]}`
Double-hung with deep interior sill; shell.js builds casing/sashes/muntins/glass.

**glazedWalls[]**: `{wall, c0, c1, head, transomTop, sideliteC1?, frameT}`
Aluminum-framed glass double door assembly (two leaves across c0..c1, pull bars,
closer, transom band to transomTop, optional fixed sidelite from c1 to sideliteC1).

**stubs[]**: `{plane:"z"|"x", at, c0, c1, t}` — full-height partition slab.
plane "z" = wall at z=`at` spanning x c0..c1; plane "x" = wall at x=`at` spanning z c0..c1.

**doors[]**: `{wall, c0, c1, head, color?}` — plain interior door, CLOSED: cased
opening with a painted slab door (default #e9e4d8), lever handle, hinge-side gap
lines. shell.js cuts the hole and builds the door.

## kitchen block (all keys exactly as the kitchen modules consume them)

`{fridge, microCab, micro, counter, sink, range, hood, hoodCab, splash, cubbies,
kettle, lightBars}` — same shapes as the original kitchen spec. kitchen.js builds
nothing when the block is absent.

## furniture[] catalog (furniture.js owns these constructors)

Common: every item has `type`, world `x, z` (footprint center), `rotY` (radians,
0 faces +Z). Floor-standing (y=0).

| type | params |
|---|---|
| banquette | x0, x1, wall:"B"-style back against a wall via rotY, plinthH, seatH, seatD, backTop, backT, backTilt(deg), seamPitch |
| table | w, d, h, style:"whiteBlue"(default)\|"wood" |
| chair | style:"birchShell"(default)\|"creamShell" |
| bed | w, len, h (mattress top ~0.55), style:"dorm": frame, mattress, duvet, 1–2 pillows |
| wardrobe | w, d, h, doors:2, handles |
| desk | w, d, h, slim steel legs, modesty panel optional |
| dresser | w, d, h, drawers:3 with pulls |
| nightstand | ~0.45 cube, 1 drawer |
| sofa | w, style:"loveseat": base, 2 seat + 2 back cushions, arms |
| shelfUnit | w, d, h, shelves:4 open bookcase |
| trashCan | r, h, liner:true adds white liner overhang |
| toilet | w, d, h: plinth, bowl, rounded seat + slightly raised lid, tank at the back (-Z), chrome flush button |
| sinkVanity | w, d, h: white 2-door cabinet (gap line + knobs), porcelain counter + backsplash lip, oval basin inset, chrome gooseneck faucet |
| pedestalSink | w, d, h: tapered porcelain pedestal (lathe), wider basin top with rounded rim, chrome faucet |
| bathtub | w, len, h — len along X, faucet + shower-pipe head end = -X: shell, rolled rim, dark-white hollow inset, chrome spout + shower head |
| shower | w, d, h: low tray with rim, tiled back panels toward -Z/-X, glass front (+Z) + glass side (+X), chrome head on pipe + mixer disc |
| genericBox | w, d, h, color — fallback for anything else |

banquette is special: x0/x1 span against wall B (as today). All others place by x/z/rotY.

## props[] catalog (decor.js owns these constructors)

Common: `type, x, y, z` (y = height of the surface it rests on), optional `rotY,
color, scale`. Types: `bottle {h, r}`, `jar`, `box {w, h, d, accent?}`,
`paperSheet {w, h, header?}` (wall papers: give rotY to face away from wall; never
real text), `poster` (infographic), `bookStack {count}`, `plant {h}`, `mug`,
`pan {r}`, `lamp {lit?}` (small desk/table lamp; lit adds emissive + tiny light is
NOT allowed — emissive only), `laptop {open?}`, `pillow {w}`, `carton`, `umbrella`
(collapsed black, on a sill), `duffel {w, color}`, `mirror {w, h}` (wall-mounted:
thin frame + fake-reflective face; hangs flat facing +Z before rotY, CENTERED at
the given y), `towelBar {w}` (wall-mounted chrome bar centered at the given y,
draped towel — color overrides the towel, default #d8d2c6), `bathmat {w, d}`
(very thin rounded slab, default #cdd6d2).

Preset entries: `{"preset": "kitchenClutter"}` runs the full original kitchen prop
set (only valid when `kitchen` block exists).

## lighting

`{pendants: [{x, z, lit}], pendantGeom: {cube, bottomY, stemR},
ceiling: [{type:"flush", x, z, r, lit}], }`
lighting.js also derives daylight RectAreas/Directional from `windows[]` and
`glazedWalls[]` (first window wall = primary daylight). Zero pendants is fine.
`flush` = ceiling-mounted disc fixture; lit ones get a PointLight (max 2 shadow
casters total in the scene, pendants first).

## Module ownership (unchanged from CONTRACT.md)

shell.js: floor/ceiling/walls + windows/glazedWalls/stubs/radiators/cove/backdrops.
kitchen.js: the kitchen block. furniture.js: furniture[]. decor.js: props[].
lighting.js: lighting + daylight + environment. walk.js: colliders/walkSpawn only.
Every module must no-op gracefully on absent spec sections and must still
`node --check` clean standalone.
