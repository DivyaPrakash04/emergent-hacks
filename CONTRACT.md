# Module contract — Common Kitchen 3D

Every build module MUST follow this exactly. Modules are ES modules loaded in a browser
via an import map. There is no bundler and no node_modules.

## Coordinate system (world space, shared by all modules)
- Units: meters. +Y is up. Floor is at y = 0.
- Origin and axes are defined in `js/spec.js` (constant `S`), generated from the
  architecture analysis. Origin = floor corner at the LEFT end of the kitchen wall
  (WALL K) when facing it from inside the room; +X runs along WALL K, +Z runs from
  WALL K into the room.
- Place everything in WORLD coordinates using the numbers in `S`. Never invent room
  dimensions — read them from `S`.

## Allowed imports (NOTHING else)
```js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'; // lighting.js only
import { S } from './spec.js';
import { PAL, M, TEX } from './materials.js';
import * as H from './helpers.js';
```

## Exports — exactly one build function per file
| file            | export                                  | returns |
|-----------------|------------------------------------------|---------|
| js/shell.js     | `export function buildShell()`          | THREE.Group |
| js/kitchen.js   | `export function buildKitchen()`        | THREE.Group |
| js/furniture.js | `export function buildFurniture()`      | THREE.Group |
| js/decor.js     | `export function buildDecor()`          | THREE.Group |
| js/lighting.js  | `export function buildLighting(renderer, scene)` | THREE.Group |

`buildLighting` is the ONLY module that may create THREE lights, set
`scene.environment` / `scene.background`, and use `RoomEnvironment` + PMREM.
Other modules express glow with emissive materials only.

## Hard rules
1. Pure functions: no top-level side effects, no globals, no async, no fetch, no
   texture loading from URLs — all textures are canvas-generated via `TEX.*` or
   `H.makeCanvasTexture`.
2. Call `H.applyShadows(group)` once before returning. Set
   `mesh.userData.noShadow = true` on glass or very thin planes you want skipped.
3. Geometry hygiene: nothing floats above or sinks below the floor unless it should;
   offset coplanar surfaces by ≥ 0.002 m to prevent z-fighting (posters, tile planes,
   backsplash sit 0.002–0.005 off the wall).
4. Walls of the room shell must face INWARD with `side: THREE.FrontSide` so the room
   reads as a dollhouse from outside (shell.js responsibility).
5. Reuse geometries and materials aggressively (one geometry per repeated prop).
   Target < 200 meshes and < 120k triangles per module.
6. Name the returned group: `g.name = 'shell' | 'kitchen' | ...`.
7. Every module must parse standalone: `node --check js/<file>.js` passes (package.json
   sets type=module).
8. No text rendering of real-world notices: use `TEX.paper*` generators (abstract
   text lines only).

## Realism bar
Model silhouettes honestly: counters have thickness and overhang; the range has a
control panel, oven door w/ handle, burners; windows are true double-hung (outer frame,
two sashes, muntin grid on the upper sash, deep sill); chairs are bent-ply shells with
four slim metal legs; the banquette has separate back cushions (seam every ~0.75 m)
and seat cushions with rounded fronts (RoundedBoxGeometry). Add 1–3 mm bevels/rounding
on furniture edges. Small believable clutter sells the scene.
