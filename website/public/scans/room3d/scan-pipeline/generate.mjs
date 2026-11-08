#!/usr/bin/env node
// generate.mjs — VIDEO-TO-SPEC pipeline for the spec-driven three.js room viewer.
//
// Frames from a room video go through five parallel Claude analyst calls
// (architecture+coordinates, furniture, materials, lighting, props/decor) plus
// one merge call, and out comes rooms/<id>.json that the viewer renders at
// /scans/room3d/?room=<id>.
//
// Usage:
//   node scan-pipeline/generate.mjs --frames <dir> --id <roomId> [--out rooms/] [--model <id>]
//
// Requirements: Node 18+ (global fetch), ANTHROPIC_API_KEY in the environment.
// Dependency-free on purpose: raw Messages API over fetch, no SDK packages.
//
// The prompt text below is duplicated from scan-pipeline/PROMPTS.md so this file
// runs standalone — edit both together.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import process from "node:process";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
// Default per the claude-api skill: claude-opus-5-5 is the current Opus and the
// default vision-capable model (override with --model, e.g. claude-fable-5-1).
const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 32000; // generous; streaming keeps long generations safe
const EFFORT = "high"; // output_config.effort (Opus 5.5 defaults to medium)

// Speed profile: the four descriptive analysts run on Sonnet at medium effort —
// fast, and medium leaves output budget (high-effort thinking once starved the
// architecture report to 526 chars). Geometry (architecture) and the merge stay
// on Opus. An explicit --model overrides everything.
const ANALYST_MODEL = "claude-sonnet-5-5";
const ARCH_MODEL = DEFAULT_MODEL;
const MERGE_MODEL = DEFAULT_MODEL;
const ANALYST_EFFORT = "medium";
const MERGE_EFFORT = "high";
const DEFAULT_MAX_FRAMES = 24; // evenly sampled; analysts rarely need more
const MAX_IMAGES = 100; // Messages API limit per request
const MAX_B64_BYTES = 27 * 1024 * 1024; // stay under the 32MB request cap

// $/MTok [input, output] — for the cost note only.
const USD_PER_MTOK = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-fable-5-1": [10, 50],
  "claude-fable-5": [10, 50],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

const FURNITURE_TYPES = new Set([
  "banquette", "table", "chair", "bed", "wardrobe", "desk", "dresser",
  "nightstand", "sofa", "shelfUnit", "trashCan", "genericBox",
  "toilet", "sinkVanity", "pedestalSink", "bathtub", "shower",
]);
const PROP_TYPES = new Set([
  "bottle", "jar", "box", "paperSheet", "poster", "bookStack", "plant", "mug",
  "pan", "lamp", "laptop", "pillow", "carton", "umbrella", "duffel",
  "mirror", "towelBar", "bathmat",
]);

// ---------------------------------------------------------------------------
// Prompts (duplicated verbatim from PROMPTS.md — keep in sync)
// ---------------------------------------------------------------------------

const SHARED_PREAMBLE = `You are one of five parallel analysts converting frames from a single handheld
video pan of ONE room into a written build spec for a spec-driven three.js room
viewer. You see every extracted frame in capture order; each image is preceded
by a label like "Frame 12/50 (frame_011.jpg)" — cite frame numbers as evidence.
Other analysts cover the other domains. Write only your domain, but write it so
a merge model that has NOT seen the video can reconcile all five reports.

COORDINATE SYSTEM AND WALL LABELING (anchor rule — all five analysts use this):
- Identify the room's FEATURE WALL: the wall carrying the most built-in or large
  content (a kitchen run, a wardrobe/desk wall, a headboard wall). Call it
  WALL K.
- Stand in the room facing WALL K. The wall on your LEFT is WALL W, the wall
  BEHIND you is WALL B, the wall on your RIGHT is WALL F.
- Origin (0,0,0) = the floor corner where WALL K meets WALL W (the left end of
  the feature wall as you face it). +X runs rightward along WALL K; +Z runs from
  WALL K into the room toward WALL B; +Y is up; floor y=0. So WALL K is the
  plane z=0, WALL W is x=0, WALL B is z=d (room depth), WALL F is x=w (room
  width).
- In your report's FIRST section, state which physical wall you chose as WALL K
  and one identifying feature of each of the four walls, so the merge can detect
  label disagreements between analysts.
- Units: meters at 0.05 precision. Angles: radians. Tag every estimate [HIGH],
  [MED] or [LOW] confidence.

SCALE ANCHORS (calibrate every dimension from objects of known size; cite which
anchors you used):
- interior/glazed door leaf height 2.03 (head typically 2.10-2.35)
- kitchen counter height 0.91, depth 0.60-0.65
- dining/desk table height 0.74 ; chair or bench seat height 0.45
- apartment top-freezer fridge height 1.70 ; 30-inch slide-in range width 0.76
- letter/A4 paper 0.22 x 0.28 ; twin mattress 0.99 wide x 1.90 long (full 1.37)
- sanity bound: residential ceilings 2.40-2.95

EXCLUSIONS (hard rules):
- NOTHING beyond windows or glass doors is part of this room. Summarize the view
  in one line as a backdrop ("campus lawn + brick building", "bright sunroom",
  "plain") and stop. Never give geometry for outside content or for adjacent
  rooms seen through openings.
- NEVER transcribe real-world text: posters, notices, labels, whiteboards,
  screens, stickers, handwriting. Describe printed matter as generic sheets or
  posters by size, color and layout only.
- Ignore people, pets, the camera operator and their reflection, and
  motion-blur artifacts.`;

const ANALYST_PROMPTS = {
  architecture: `YOUR ROLE: ARCHITECTURE + COORDINATES. You own the coordinate frame: the merge
step resolves every geometric disagreement toward YOUR report, so be explicit,
quantitative, and justify dimensions by arithmetic from the scale anchors.

Deliver a markdown report with these numbered sections:

0. CANONICAL COORDINATE SYSTEM — the anchor rule applied to THIS room: which
   physical wall is WALL K and why, what sits at the origin corner, and a
   one-line identity for each of W, B, F. If any walls could plausibly be
   labeled differently, say so.
1. ROOM PLAN — overall w (along K) x d (along W) x h, each with arithmetic
   justification (sum the known-size elements along each wall). Note alcoves,
   nooks, stub/partition walls and chases: position, span, thickness,
   full or partial height, and what they enclose.
2. WALLS AND OPENINGS TABLE — every wall with plan endpoints, then every
   opening with positions measured along the wall from its low corner (walls K
   and B measure X from x=0; walls W and F measure Z from z=0):
   - windows: c0, c1, sill height, head height, muntin grid (cols x rows) for
     upper and lower sash, sill depth;
   - glazed door assemblies: c0, c1, leaf split, head, transom top, sidelite
     extent, frame thickness;
   - plain interior doors: c0, c1, head, slab color;
   - stub partition walls: plane ("z" or "x"), position, span c0-c1, thickness.
3. WINDOW DETAIL — type (double-hung, casement, fixed), sash division, trim
   width, sill depth and thickness, hardware, open/closed state, and the
   one-line backdrop summary of what is visible through the glass.
4. CEILING — height, flat or soffits/bulkheads with extents, color, and the
   positions of visible ceiling fixtures (positions only — the lighting analyst
   owns their states).
5. FLOOR — material, base color, pattern and direction, wear, transitions at
   doorways.
6. TRIM AND HEATING — baseboard/cove height and color per wall; every radiator
   with wall, span c0-c1, height, depth.
7. PER-WALL ELEVATIONS — for each of K, W, B, F: a left-to-right inventory of
   everything attached to or standing against the wall, with along-axis ranges
   and heights.
8. ASCII FLOOR PLAN — top view with the origin, +X and +Z axes, and major
   elements labeled.
9. SCALE ANCHORS USED — which anchor calibrated which dimension.
10. LOW-CONFIDENCE ITEMS — everything [MED] or [LOW], each with the most likely
    alternative reading.`,

  furniture: `YOUR ROLE: FURNITURE. Inventory every piece of furniture — movable and built-in
— with dimensions, world position, and facing. The merge step maps your items
onto a fixed constructor catalog, so classify each item as the NEAREST of:
banquette (upholstered bench built against a wall), table, chair, bed, wardrobe,
desk, dresser, nightstand, sofa, shelfUnit (open bookcase), trashCan,
toilet, sinkVanity (basin on a small cabinet), pedestalSink, bathtub,
shower (enclosed stall),
genericBox (fallback for anything else). For rooms with a built-in kitchen,
also detail the kitchen run itself: counter segments, base/upper cabinets and
open cubby shelving, sink, range, hood, fridge, microwave, kettle — these
become the spec's dedicated kitchen block on WALL K.

Report sections:

0. COORDINATE ASSUMPTIONS — restate your wall labeling (which physical wall you
   took as WALL K) and your room-size estimate so the merge can reconcile your
   positions with the architecture report. Flag any labeling doubts loudly.
1..N. ONE SECTION PER ITEM OR BUILT-IN RUN, each with:
   - catalog type and count (identical repeated items: one section, all
     positions);
   - a dimensions table: w x d x h, plus seat/back heights for seating, counter
     heights and depths for runs, mattress height for beds;
   - position: footprint center (x, z) and rotY facing in RADIANS (state your
     convention explicitly, e.g. "rotY 0 faces +Z, pi faces the K wall,
     +/-1.571 face the side walls") — or, for wall-spanning built-ins, the
     along-wall span (x0-x1 or z0-z1) and the wall name;
   - construction and style notes: leg type, slab vs framed fronts, upholstery
     weave, hardware, visible wear — one color word per part is enough (the
     materials analyst owns exact hexes);
   - any props resting on it worth keeping, one line each (the decor analyst
     owns their details).

Finish with:
- SUMMARY — a numbered list, one line per furniture group with counts.
- WALK-BLOCKING FOOTPRINTS — a table of [x0, x1, z0, z1] floor rectangles for
  every item that blocks walking (counter runs including fridge, tables,
  chairs, bench, bins, radiators deeper than 0.15 m). These seed the spec's
  colliders.`,

  materials: `YOUR ROLE: MATERIALS AND COLOR. Produce the PBR palette for a three.js build:
for every distinct surface in the room give an sRGB hex, roughness 0-1,
metalness 0-1, and short notes. Video footage carries lighting color casts —
estimate the TRUE surface color and note where the on-video rendering differs
(warm lamp spill, auto white balance, daylight blow-out). Say explicitly that
hexes are perceptual estimates.

Report sections:

0. LABEL NOTE — one paragraph stating which physical wall you treat as
   K / W / B / F (per the anchor rule) so your hexes land on the right walls.
1. MASTER MATERIAL TABLE — one row per surface: # | surface | hex | roughness |
   metalness | notes. Cover at least: wall paint PER WALL (K, W, B, F often
   differ), ceiling, floor (base hex plus mottle/pattern hexes and scale),
   countertops, backsplash or tiled zones (grout color, tile module size),
   cabinet/shelving finishes, every appliance finish (brushed vs polished,
   grain direction, glass parts), sink and faucet, table tops and legs, chair
   shells and legs, upholstery (weave character and sheen), window frame vs
   sash vs sill whites (they usually differ), radiator, doors and frames,
   glass tint, and the 5-10 most visible props.
2. TILE / PATTERN PALETTES — for any mosaic or patterned surface: a per-tile
   table of hex, finish (gloss/matte), and approximate frequency share.
3. RENDERER LIGHTING COLORS — hex and color temperature for each light family
   (daylight through each opening, each fixture type), plus a one-line contrast
   recipe: which zones of the room read warm vs cool and how strongly.
4. KEY PALETTE SUMMARY — 8-12 numbered lines: the colors that define the room.`,

  lighting: `YOUR ROLE: LIGHTING. Inventory every light source and the daylight, with
on/off states and evidence. The viewer builds exactly these: cube/box pendants
(x, z, lit) sharing one pendantGeom (shade size "cube", shade bottom height
"bottomY", stem radius "stemR"); flush ceiling discs (x, z, radius, lit); and
it derives all daylight automatically from the windows and glazed walls — so
report in those terms. Small lamps on desks/tables are PROPS (emissive shade
only, no light source); note them but do not design lights for them. The
renderer allows at most 2 shadow-casting point lights, so recommend at most 2-3
lit fixtures.

Report sections:

1. ELECTRIC FIXTURES — every fixture: kind (pendant / flush or recessed
   ceiling / under-shelf bar / hood lamp / desk or floor lamp / other), shade
   geometry and color, mounting heights (shade top and bottom y), plan position
   (x, z), and STATE (on/off) with frame evidence — glow, light pools, and
   reflections in glass all count. Include tiny emitters (appliance clocks,
   standby LEDs) as one-line authenticity notes.
2. DAYLIGHT — time of day and weather read; which openings admit light;
   direction, relative strength and color temperature per opening; any direct
   sun patches (or confirm none).
3. LIGHT BALANCE MAP — a table of room zones with character (warm/cool,
   bright/dim) and approximate relative luminance 0-1, plus one line on where
   the warm-to-cool gradient runs.
4. SHADOWS — soft or hard, and the contact shadows that matter most.
5. REFLECTIONS AND SHEEN — which surfaces visibly reflect which sources.
6. SUGGESTED SPEC MAPPING — a literal JSON sketch of the spec's lighting block:
   pendants [{x, z, lit}...], pendantGeom {cube, bottomY, stemR}, ceiling
   [{type:"flush", x, z, r, lit}...] — and name which wall's windows are the
   primary daylight source. At most 2-3 lit fixtures.
7. CONFIDENCE NOTES — any count or state you are unsure of, with the
   alternative reading.`,

  decor: `YOUR ROLE: PROPS AND DECOR. Catalog the small items that sell the scene:
everything on counters, shelves, sills, tables, appliances, walls and floor
that is not furniture or architecture. The merge step maps each item onto a
fixed prop catalog, so classify each as the NEAREST of:
bottle {h, r} ; jar ; box {w, h, d} ; paperSheet {w, h} (any paper, notice or
sheet on a wall or surface) ; poster (infographic-style print) ; bookStack
{count} ; plant {h} ; mug ; pan {r} ; lamp {lit?} ; laptop {open?} ;
pillow {w} ; carton (beverage carton) ; umbrella (collapsed) ; duffel
{w, color} ; mirror {w, h} (wall-hung, y = center height) ; towelBar {w}
(wall-hung chrome bar with a draped towel) ; bathmat {w, d}.
Anything unmappable: describe it anyway and suggest the closest
type or write "skip".

Report sections:

0. COUNT SUMMARY — a table of zones (one per wall or surface cluster) with
   prop counts and the highlight items, plus a total.
1..N. ONE SECTION PER ZONE, every item numbered, each with:
   - what it is, catalog type, size (h, or w x h x d) and color(s);
   - position: x, z, the SURFACE it rests on and that surface's height y
     (floor 0, counter ~0.91, table ~0.74, window sill, shelf heights...);
     wall-mounted papers get their center height and the wall name;
   - orientation where it matters (rotY in radians; papers face away from
     their wall);
   - remember the exclusion: printed matter is described by layout and color
     blocks only — never the words.
2. MODELING PRIORITY — an ordered list of the 8-12 props that sell the scene
   fastest, most salient first.`,
};

const MERGE_RULES = `You are the MERGE step of a video-to-spec pipeline. Five analysts examined the
same room video. Below you get: the output schema, one complete worked example
spec, and then the five analyst reports. Produce the single JSON room spec for
THIS room.

OUTPUT RULES (absolute):
1. Output ONLY one JSON object. No prose, no markdown fences, no comments, no
   trailing commas. The first character of your reply is "{" and the last is
   "}".
2. The JSON must follow the schema exactly: required keys id, name,
   room {w, d, h}; every other key optional; NO keys that the schema does not
   define.
3. Use ONLY the catalog types listed below. Never invent a furniture or prop
   type. A furniture item that fits no type becomes "genericBox" with
   w, d, h, color — or is dropped. A prop that fits no type becomes "box" — or
   is dropped.

RECONCILIATION RULES:
4. The ARCHITECTURE report is authoritative for room dimensions, wall labels
   (K/W/B/F), the origin, and every opening position. When another report
   disagrees — different wall labels, a rotated frame, different sizes — re-map
   its content into the architecture frame. Do not average, and do not import
   the other report's labels.
5. Division of trust: the furniture report drives furniture[] and the kitchen
   block details; the materials report drives every color (true-surface hexes,
   not on-video casts); the lighting report drives lighting{} and all lit
   flags; the decor report drives props[]. Architecture still wins wherever a
   position conflicts with walls or openings.
6. Honor the capture exclusions: no geometry beyond windows or glass doors
   (express the view as backdrops), no real text anywhere (papers and posters
   are generic), no people.

SPEC-BUILDING RULES:
7. Units meters. Angles RADIANS — convert anything reported in degrees
   (rotY 0 faces +Z, 3.142 faces the K wall, 1.571 faces +X, -1.571 faces -X;
   when in doubt mirror the worked example's orientation conventions). The one
   exception: the banquette's backTilt is in DEGREES, per the catalog.
8. Walls: K is the plane z=0, W is x=0, B is z=d, F is x=w. Window, door,
   glazed-wall and radiator c0/c1 run along the wall's axis measured from its
   low corner: X for walls K and B, Z for walls W and F. Always c0 < c1, both
   within the wall's length; sill < head <= room.h.
9. Every furniture x/z and prop x/z must lie inside the room (0..w, 0..d).
   Every prop's y is the height of the surface it rests on (floor 0, counter
   ~0.91, table ~0.74, sill or shelf height).
10. kitchen block: include it ONLY if the room has a built-in kitchen run, and
    that run must be WALL K (its x0/x1/cx values are along-K X coordinates).
    Rooms without a kitchen omit the key entirely. The prop preset
    {"preset":"kitchenClutter"} is only valid when the kitchen block exists.
11. colliders: one [x0, x1, z0, z1] RAW floor footprint per walk-blocking
    obstacle (kitchen run including fridge, tables, chairs, banquette, bins,
    radiators deeper than 0.15). Do NOT inflate them — the viewer does. Place
    walkSpawn on open floor with yaw facing something interesting.
12. lighting: pendants and flush ceiling fixtures with lit flags per the
    lighting report; keep at most 2-3 lit. Daylight is derived automatically
    from windows[] and glazedWalls[] — never add fixtures to fake it.
13. Prefer 10-40 props, highest-saliency first per the decor report's priority
    list; cluster dense shelf goods into a few representative bottles, jars and
    boxes rather than transcribing all of them.
14. Sanity pass before you answer: the JSON parses; room w/d/h positive;
    all c0 < c1 within their wall; sill < head <= h; every furniture and prop
    type comes from the catalogs; rotY values are radians (magnitude <= 6.3);
    collider rectangles sit inside the room; walkSpawn is not inside a
    collider.

CATALOGS (the only legal types):
- furniture type: banquette | table | chair | bed | wardrobe | desk | dresser |
  nightstand | sofa | shelfUnit | trashCan | toilet | sinkVanity |
  pedestalSink | bathtub | shower | genericBox
- prop type: bottle | jar | box | paperSheet | poster | bookStack | plant |
  mug | pan | lamp | laptop | pillow | carton | umbrella | duffel |
  mirror | towelBar | bathmat
  (plus the preset entry {"preset":"kitchenClutter"}, kitchen rooms only)`;

const SCHEMA = `Units meters, +Y up, angles in RADIANS. Origin at the floor corner where wall K
meets wall W; +X along wall K, +Z along wall W into the room.
Walls are named K (plane z=0), W (x=0), B (z=room.d), F (x=room.w).
Each wall has an "along" axis for opening coordinates (c0/c1 measured from the
wall's low corner): K and B use X; W and F use Z.

Top-level keys ("req" = required, "opt" = optional):
  id, name     req  strings (id = the room id, lowercase)
  room         req  {w, d, h}
  wallColors   opt  {K, W, B, F} hex strings (default warm cream "#eae3cf")
  cove         opt  {h} dark vinyl cove base (default 0.10; h:0 disables)
  windows      opt  array, see Openings
  glazedWalls  opt  array, see Openings
  doors        opt  array, see Openings
  stubs        opt  array, see Openings
  radiators    opt  array of {wall, c0, c1, h, d}
  backdrops    opt  array of {behind: wall, kind: "campus"|"sunroom"|"plain",
                    color?} — what shows beyond that wall's glass
  kitchen      opt  the kitchen block — omit for non-kitchens
  floor        opt  {base hex, spots [hex,...], seamEvery m (0.1 = small tile,
               0.92 = large vinyl tiles, 0 = none), seamAlpha, roughness} —
               take the floor colors from the MATERIALS report
  furniture    opt  array of furniture items (catalog above)
  props        opt  array of prop items (catalog above)
  lighting     opt  {pendants, pendantGeom, ceiling}
  colliders    opt  array of [x0, x1, z0, z1] RAW obstacle footprints
  walkSpawn    opt  {x, z, yaw} (default room center, yaw 0)

Openings:
  windows[]: {wall, c0, c1, sill, head, sillDepth, sillThick, trimW,
              upperGrid:[cols,rows], lowerGrid:[cols,rows]}
    Double-hung window with deep interior sill; the viewer builds casing,
    sashes, muntins and glass from these numbers.
  glazedWalls[]: {wall, c0, c1, head, transomTop, sideliteC1?, frameT}
    Aluminum-framed glass double-door assembly: two leaves across c0..c1, pull
    bars, closer, transom band up to transomTop, optional fixed sidelite from
    c1 to sideliteC1.
  doors[]: {wall, c0, c1, head, color?}
    Plain interior door, rendered CLOSED: cased opening with a painted slab
    (default "#e9e4d8") and lever handle.
  stubs[]: {plane:"z"|"x", at, c0, c1, t} — full-height partition slab.
    plane "z" = wall at z=at spanning x c0..c1; plane "x" = wall at x=at
    spanning z c0..c1.

kitchen block (kitchen rooms only; everything lives on WALL K, x along K):
  {fridge, microCab, micro, counter, sink, range, hood, hoodCab, splash,
   cubbies, kettle, lightBars} — copy the exact sub-shapes from the worked
  example below; omit sub-keys for elements the room does not have.

furniture[] catalog details — every item has type, world x, z (footprint
center) and rotY in radians; floor-standing (y=0):
  banquette   x0, x1 span against wall B, plinthH, seatH, seatD, backTop,
              backT, backTilt (DEGREES), seamPitch — the one wall-spanning
              special (no x/z/rotY)
  table       w, d, h, style:"whiteBlue"(default)|"wood"
  chair       style:"birchShell"(default)|"creamShell"
  bed         w, len, h (mattress top ~0.55), style:"dorm"
  wardrobe    w, d, h (2 doors, handles)
  desk        w, d, h (slim steel legs)
  dresser     w, d, h (3 drawers with pulls)
  nightstand  ~0.45 cube, 1 drawer
  sofa        w, style:"loveseat"
  shelfUnit   w, d, h (open 4-shelf bookcase)
  trashCan    r, h, liner:true adds a white liner overhang
  toilet      w ~0.38, d ~0.66, h ~0.76 — tank side faces its wall (-Z before rotY)
  sinkVanity  w ~0.6, d ~0.5, h ~0.85 — basin on a small cabinet, faucet
  pedestalSink w ~0.55, d ~0.45, h ~0.85
  bathtub     w ~0.75, len ~1.5, h ~0.55 — alcove tub, faucet end at -X before rotY
  shower      w ~0.9, d ~0.9, h ~2.0 — stall; closed sides toward -Z/-X before rotY
  genericBox  w, d, h, color — fallback

props[] catalog details — every item has type, x, y, z (y = height of the
surface it rests on), optional rotY, color, scale:
  mirror {w, h} (wall-hung flat against its wall; y = CENTER height; rotY faces
  it into the room) ; towelBar {w, color?} (wall-hung) ; bathmat {w, d, color?} ;
  bottle {h, r} ; jar ; box {w, h, d, accent?} ; paperSheet {w, h, header?}
  (wall papers: rotY to face away from the wall; never real text) ; poster ;
  bookStack {count} ; plant {h} ; mug ; pan {r} ; lamp {lit?} (lit = emissive
  shade only — no light source) ; laptop {open?} ; pillow {w} ; carton ;
  umbrella (collapsed black, usually on a sill) ; duffel {w, color}

lighting: {pendants:[{x, z, lit}...], pendantGeom:{cube, bottomY, stemR},
           ceiling:[{type:"flush", x, z, r, lit}...]}
  Daylight is derived automatically from windows[] and glazedWalls[] (first
  window wall = primary daylight). Zero pendants is fine. "flush" = ceiling
  disc; lit fixtures get point lights (max 2 shadow casters scene-wide).`;

const EXAMPLE_SPEC = `{
  "id": "kitchen",
  "name": "Common Kitchen",
  "room": {"w":5.05,"d":4.9,"h":2.72},
  "wallColors": {"K":"#eae3cf","W":"#eae3cf","B":"#e4d9b6","F":"#eae3cf"},
  "cove": {"h":0.1},
  "windows": [
    {
      "wall": "W",
      "c0": 1.55,
      "c1": 3.07,
      "sill": 0.85,
      "head": 2.45,
      "sillDepth": 0.5,
      "sillThick": 0.05,
      "trimW": 0.09,
      "upperGrid": [4,2],
      "lowerGrid": [4,2]
    }
  ],
  "glazedWalls": [
    {
      "wall": "F",
      "c0": 2.87,
      "c1": 4.52,
      "head": 2.35,
      "transomTop": 2.62,
      "sideliteC1": 4.9,
      "frameT": 0.06
    }
  ],
  "stubs": [{"plane":"z","at":0.62,"c0":4.3,"c1":5.05,"t":0.1}],
  "radiators": [{"wall":"W","c0":0.95,"c1":3.55,"h":0.6,"d":0.22}],
  "backdrops": [{"behind":"W","kind":"campus"},{"behind":"F","kind":"sunroom"}],
  "kitchen": {
    "fridge": {"x0":0.55,"x1":1.35,"d":0.7,"h":1.7,"freezerSplit":1.18},
    "microCab": {"x0":1.35,"x1":2.3},
    "micro": {"w":0.5,"d":0.38,"h":0.3,"cx":1.8},
    "counter": {
      "h": 0.91,
      "t": 0.04,
      "d": 0.6,
      "segs": [[1.35,3.5],[4.26,5.05]],
      "kneeOpen": [2.3,3.45],
      "toeH": 0.1
    },
    "sink": {"cx":2.8,"w":0.56,"d":0.44},
    "range": {"x0":3.5,"x1":4.26,"d":0.66,"h":0.91,"backH":0.1},
    "hood": {"x0":3.5,"x1":4.26,"y0":1.56,"y1":1.86,"d":0.5},
    "hoodCab": {"y0":1.9,"y1":2.42},
    "splash": {
      "subway": {"x0":1.35,"x1":2.3,"y0":0.91,"y1":1.6},
      "mosaic": {"x0":2.3,"x1":5.05,"y0":0.91,"y1":1.5}
    },
    "cubbies": {
      "depth": 0.3,
      "shelfT": 0.019,
      "top": {"x0":1.35,"x1":5.05,"y0":2,"y1":2.42},
      "midZones": [
        {"x0":2.3,"x1":3.45,"y0":1.5,"y1":1.98},
        {"x0":4.3,"x1":5.05,"y0":1.5,"y1":1.98},
        {"x0":1.35,"x1":2.3,"y0":1.6,"y1":2}
      ]
    },
    "kettle": {"x":4.62,"z":0.3},
    "lightBars": [
      {"x0":2.42,"x1":3.33,"y":1.5,"z":0.26},
      {"x0":4.36,"x1":4.99,"y":1.5,"z":0.26},
      {"x0":1.47,"x1":2.18,"y":1.6,"z":0.26}
    ]
  },
  "furniture": [
    {
      "type": "banquette",
      "x0": 0.22,
      "x1": 4.67,
      "plinthH": 0.12,
      "seatH": 0.45,
      "seatD": 0.55,
      "backTop": 0.92,
      "backT": 0.1,
      "backTilt": 8,
      "seamPitch": 1.07
    },
    {
      "type": "table",
      "x": 0.89,
      "z": 3.95,
      "rotY": 0,
      "w": 1.07,
      "d": 0.76,
      "h": 0.74,
      "style": "whiteBlue"
    },
    {
      "type": "table",
      "x": 1.96,
      "z": 3.95,
      "rotY": 0,
      "w": 1.07,
      "d": 0.76,
      "h": 0.74,
      "style": "whiteBlue"
    },
    {
      "type": "table",
      "x": 3.03,
      "z": 3.95,
      "rotY": 0,
      "w": 1.07,
      "d": 0.76,
      "h": 0.74,
      "style": "whiteBlue"
    },
    {
      "type": "table",
      "x": 4.1,
      "z": 3.95,
      "rotY": 0,
      "w": 1.07,
      "d": 0.76,
      "h": 0.74,
      "style": "whiteBlue"
    },
    {"type":"chair","x":1.42,"z":3.28,"rotY":3.142,"style":"birchShell"},
    {"type":"chair","x":2.22,"z":3.28,"rotY":3.142,"style":"birchShell"},
    {"type":"chair","x":2.88,"z":3.28,"rotY":3.142,"style":"birchShell"},
    {"type":"chair","x":3.62,"z":3.28,"rotY":3.142,"style":"birchShell"},
    {"type":"chair","x":4.3,"z":3.28,"rotY":3.142,"style":"birchShell"},
    {"type":"chair","x":4.72,"z":3.95,"rotY":-1.571,"style":"birchShell"},
    {"type":"chair","x":0.42,"z":3.8,"rotY":1.571,"style":"creamShell"},
    {"type":"trashCan","x":4.62,"z":1.15,"rotY":0,"r":0.28,"h":0.69,"liner":true}
  ],
  "props": [
    {"preset":"kitchenClutter"},
    {"type":"umbrella","x":0.3,"y":0.85,"z":2.75},
    {"type":"carton","x":0.28,"y":0.85,"z":2.05}
  ],
  "lighting": {
    "pendants": [
      {"x":0.85,"z":3.7,"lit":false},
      {"x":2.5,"z":3.7,"lit":true},
      {"x":4.15,"z":3.7,"lit":true}
    ],
    "pendantGeom": {"cube":0.3,"bottomY":2.1,"stemR":0.012}
  },
  "colliders": [
    [0.5,5.05,0,0.8],
    [4.3,5.05,0,0.67],
    [0.22,4.67,3.55,4.9],
    [4.34,4.9,0.87,1.43],
    [0,0.24,0.95,3.55],
    [1.18,1.66,3.04,3.52],
    [1.98,2.46,3.04,3.52],
    [2.64,3.12,3.04,3.52],
    [3.38,3.86,3.04,3.52],
    [4.06,4.54,3.04,3.52],
    [4.48,4.96,3.71,4.19],
    [0.18,0.66,3.56,4.04]
  ],
  "walkSpawn": {"x":2.6,"z":2.55,"yaw":0}
}`;

const ANALYST_SYSTEM =
  "You are a meticulous 3D scene analyst. You convert frames of a room video " +
  "into precise, quantitative written build specifications for a spec-driven " +
  "three.js room viewer. Be exhaustive and honest about uncertainty.";

const MERGE_SYSTEM =
  "You are the merge stage of a 3D scan pipeline. You reconcile analyst " +
  "reports into a single schema-valid JSON room spec and output nothing else.";

const ANALYSTS = [
  { key: "architecture", title: "ARCHITECTURE + COORDINATES (authoritative for geometry)" },
  { key: "furniture", title: "FURNITURE" },
  { key: "materials", title: "MATERIALS + COLORS" },
  { key: "lighting", title: "LIGHTING" },
  { key: "decor", title: "PROPS + DECOR" },
];

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const T0 = Date.now();
const log = (...a) => console.error(`[${elapsed()}]`, ...a);
const elapsed = () => {
  const s = Math.round((Date.now() - T0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const USAGE = `Usage: node scan-pipeline/generate.mjs --frames <dir> --id <roomId> [--out rooms/] [--model <id>]

  --frames <dir>   directory of extracted video frames (.jpg/.jpeg/.png), read sorted
  --id <roomId>    room id ([a-z0-9_-]), becomes <out>/<id>.json and ?room=<id>
  --out <dir>      output directory (default: rooms/, relative to the cwd)
  --model <id>     force ONE model for every call (default: Sonnet analysts,
                   Opus for architecture + merge)
  --max-frames <n> frames sent to each analyst, sampled evenly (default: ${DEFAULT_MAX_FRAMES})

Environment: ANTHROPIC_API_KEY must be set (never hardcoded).`;

function parseArgs(argv) {
  const args = { out: "rooms/", model: DEFAULT_MODEL, maxFrames: DEFAULT_MAX_FRAMES };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) die(`missing value for ${a}\n\n${USAGE}`);
      return argv[++i];
    };
    if (a === "--frames") args.frames = next();
    else if (a === "--id") args.id = next();
    else if (a === "--out") args.out = next();
    else if (a === "--model") { args.model = next(); args.modelSet = true; }
    else if (a === "--max-frames") {
      args.maxFrames = parseInt(next(), 10);
      if (!Number.isFinite(args.maxFrames) || args.maxFrames < 4) die("--max-frames must be >= 4");
    }
    else if (a === "--help" || a === "-h") args.help = true;
    else die(`unknown argument: ${a}\n\n${USAGE}`);
  }
  return args;
}

// Evenly sample n items across a list (always keeps first + last).
function sampleEvenly(list, n) {
  if (list.length <= n) return list;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

const MEDIA_TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

function loadFrames(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch (e) {
    die(`cannot read --frames directory "${dir}": ${e.message}`);
  }
  const frames = names
    .filter((n) => MEDIA_TYPES[extname(n).toLowerCase()])
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => {
      const buf = readFileSync(join(dir, name));
      return {
        name,
        media_type: MEDIA_TYPES[extname(name).toLowerCase()],
        data: buf.toString("base64"),
      };
    });
  if (frames.length === 0) die(`no .jpg/.jpeg/.png frames found in "${dir}"`);
  if (frames.length > MAX_IMAGES) {
    die(`${frames.length} frames exceeds the API limit of ${MAX_IMAGES} images per request — extract fewer frames (30-60 covering one full pan works well)`);
  }
  const totalB64 = frames.reduce((n, f) => n + f.data.length, 0);
  if (totalB64 > MAX_B64_BYTES) {
    die(`frames total ${(totalB64 / 1048576).toFixed(1)} MB base64 — over the request size cap. Downscale (e.g. ffmpeg scale=1024:-2) or use fewer frames.`);
  }
  if (totalB64 > 18 * 1024 * 1024) {
    log(`warning: frames total ${(totalB64 / 1048576).toFixed(1)} MB base64 — close to the request cap; consider downscaling`);
  }
  return frames;
}

function frameBlocks(frames) {
  const blocks = [];
  frames.forEach((f, i) => {
    blocks.push({ type: "text", text: `Frame ${i + 1}/${frames.length} (${f.name})` });
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: f.media_type, data: f.data },
    });
  });
  return blocks;
}

// ---------------------------------------------------------------------------
// Claude Messages API over raw fetch (streaming SSE), 1 retry on 429/529
// ---------------------------------------------------------------------------

function retryAfterMs(res) {
  const h = res.headers.get("retry-after");
  const s = h ? parseInt(h, 10) : NaN;
  const ms = Number.isFinite(s) ? s * 1000 : 15000;
  return Math.min(Math.max(ms, 1000), 120000);
}

async function callClaude({ apiKey, model, effort = EFFORT, system, content, label }) {
  const body = JSON.stringify({
    model,
    max_tokens: MAX_TOKENS,
    stream: true, // long image-heavy inputs + long outputs: stream to dodge timeouts
    system,
    output_config: { effort },
    messages: [{ role: "user", content }],
  });

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body,
    });

    if (res.status === 429 || res.status === 529) {
      const detail = await res.text().catch(() => "");
      if (attempt >= 1) {
        throw new Error(`[${label}] HTTP ${res.status} again after retry: ${detail.slice(0, 300)}`);
      }
      const wait = retryAfterMs(res);
      log(`[${label}] HTTP ${res.status} (rate limited/overloaded) — retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`[${label}] HTTP ${res.status}: ${detail.slice(0, 500)}`);
    }

    try {
      return await readSSE(res, label);
    } catch (err) {
      if (err && err.retryable && attempt < 1) {
        log(`[${label}] overloaded mid-stream — retrying in 15s`);
        await sleep(15000);
        continue;
      }
      throw err;
    }
  }
}

async function readSSE(res, label) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let inTok = 0;
  let outTok = 0;
  let stopReason = null;

  const handle = (line) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload) return;
    let ev;
    try {
      ev = JSON.parse(payload);
    } catch {
      return; // ignore malformed keep-alives
    }
    switch (ev.type) {
      case "message_start": {
        const u = ev.message?.usage || {};
        inTok =
          (u.input_tokens || 0) +
          (u.cache_creation_input_tokens || 0) +
          (u.cache_read_input_tokens || 0);
        break;
      }
      case "content_block_delta":
        if (ev.delta?.type === "text_delta") text += ev.delta.text;
        break;
      case "message_delta":
        if (ev.usage?.output_tokens) outTok = ev.usage.output_tokens;
        if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
        break;
      case "error": {
        const e = new Error(`[${label}] API stream error: ${ev.error?.type}: ${ev.error?.message}`);
        e.retryable = ev.error?.type === "overloaded_error";
        throw e;
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      handle(buf.slice(0, nl).trimEnd());
      buf = buf.slice(nl + 1);
    }
  }
  if (buf.trim()) handle(buf.trim());

  if (stopReason === "refusal") {
    throw new Error(`[${label}] the model declined this request (stop_reason: refusal)`);
  }
  if (stopReason === "max_tokens") {
    log(`[${label}] warning: output hit max_tokens (${MAX_TOKENS}) and may be truncated`);
  }
  return { text, inTok, outTok, stopReason };
}

// ---------------------------------------------------------------------------
// Merge output handling
// ---------------------------------------------------------------------------

function extractJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); // tolerate code fences
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found in merge output");
  return JSON.parse(t.slice(start, end + 1));
}

function validateSpec(spec, roomId) {
  const num = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!spec || typeof spec !== "object") throw new Error("merge output is not an object");
  if (!spec.room || !num(spec.room.w) || !num(spec.room.d) || !num(spec.room.h)) {
    throw new Error("spec is missing a valid room {w, d, h}");
  }
  if (spec.id !== roomId) {
    if (spec.id) log(`note: merge wrote id "${spec.id}" — overriding with "${roomId}" (the filename is what the viewer loads)`);
    spec.id = roomId;
  }
  if (!spec.name || typeof spec.name !== "string") spec.name = roomId;

  // Non-fatal sanity warnings for human review.
  for (const f of spec.furniture || []) {
    if (!FURNITURE_TYPES.has(f.type)) log(`warning: unknown furniture type "${f.type}" — the viewer will ignore it`);
    if (typeof f.rotY === "number" && Math.abs(f.rotY) > 6.3) log(`warning: furniture rotY ${f.rotY} looks like degrees, not radians`);
  }
  for (const p of spec.props || []) {
    if (!p.preset && !PROP_TYPES.has(p.type)) log(`warning: unknown prop type "${p.type}" — the viewer will ignore it`);
  }
  if ((spec.props || []).some((p) => p.preset === "kitchenClutter") && !spec.kitchen) {
    log(`warning: kitchenClutter preset without a kitchen block — remove it or add the block`);
  }
  return spec;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (!args.frames || !args.id) die(`--frames and --id are required\n\n${USAGE}`);
  if (!/^[a-z0-9_-]+$/i.test(args.id)) die(`--id must match [a-z0-9_-]+ (the viewer strips anything else from ?room=)`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    die(
      "ANTHROPIC_API_KEY is not set.\n" +
        "  export ANTHROPIC_API_KEY=sk-ant-...   # https://platform.claude.com\n" +
        "The key is read from the environment only; never hardcode it."
    );
  }

  const outDir = resolve(args.out);
  const outPath = join(outDir, `${args.id}.json`);
  const allFrames = loadFrames(args.frames);
  const frames = sampleEvenly(allFrames, args.maxFrames);
  const blocks = frameBlocks(frames);
  const mp = frames.reduce((n, f) => n + f.data.length * 0.75, 0) / 1048576;
  const modelFor = (key) =>
    args.modelSet ? args.model : key === "architecture" ? ARCH_MODEL : ANALYST_MODEL;
  const mergeModel = args.modelSet ? args.model : MERGE_MODEL;
  log(`loaded ${allFrames.length} frames from ${args.frames}; sending ${frames.length} (${mp.toFixed(1)} MB), sampled evenly`);
  log(`models: analysts ${modelFor("x")} / architecture ${modelFor("architecture")} / merge ${mergeModel}; max_tokens ${MAX_TOKENS}`);
  log(`running 5 analyst calls in parallel (each sees ${frames.length} frames)...`);

  // --- 5 analysts, in parallel ---------------------------------------------
  const reports = await Promise.all(
    ANALYSTS.map(({ key, title }) =>
      callClaude({
        apiKey,
        model: modelFor(key),
        effort: ANALYST_EFFORT,
        system: ANALYST_SYSTEM,
        content: [...blocks, { type: "text", text: `${SHARED_PREAMBLE}\n\n${ANALYST_PROMPTS[key]}` }],
        label: key,
      }).then((r) => {
        log(`analyst ${key}: done (${r.text.length} chars, ${r.inTok} in / ${r.outTok} out tokens)`);
        return { key, title, model: modelFor(key), ...r };
      })
    )
  );

  // --- merge ----------------------------------------------------------------
  log("running merge call...");
  const mergeText = [
    MERGE_RULES,
    "\n\n=== OUTPUT SCHEMA (rooms/<id>.json) ===\n\n" + SCHEMA,
    "\n\n=== WORKED EXAMPLE — a complete real spec (rooms/kitchen.json) ===\n\n" + EXAMPLE_SPEC,
    ...reports.map(
      (r, i) => `\n\n=== ANALYST REPORT ${i + 1}/5 — ${r.title} ===\n\n${r.text}`
    ),
    `\n\nNow output the room spec JSON for THIS room (id: "${args.id}"). Remember: output ONLY the JSON object — the first character of your reply must be "{".`,
  ].join("");

  const merge = await callClaude({
    apiKey,
    model: mergeModel,
    effort: MERGE_EFFORT,
    system: MERGE_SYSTEM,
    content: [{ type: "text", text: mergeText }],
    label: "merge",
  });
  log(`merge: done (${merge.text.length} chars, ${merge.inTok} in / ${merge.outTok} out tokens)`);

  // --- extract, validate, write --------------------------------------------
  mkdirSync(outDir, { recursive: true });
  let spec;
  try {
    spec = validateSpec(extractJson(merge.text), args.id);
  } catch (e) {
    const dump = join(outDir, `${args.id}.merge-raw.txt`);
    writeFileSync(dump, merge.text);
    die(`merge output invalid (${e.message}) — raw output saved to ${dump} for inspection`);
  }
  writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n");
  log(`wrote ${outPath}`);

  // --- cost/time note --------------------------------------------------------
  const calls = [...reports, { model: mergeModel, inTok: merge.inTok, outTok: merge.outTok }];
  const inTok = calls.reduce((n, c) => n + c.inTok, 0);
  const outTok = calls.reduce((n, c) => n + c.outTok, 0);
  let cost = 0, costKnown = true;
  for (const c of calls) {
    const rates = USD_PER_MTOK[c.model];
    if (!rates) { costKnown = false; break; }
    cost += (c.inTok / 1e6) * rates[0] + (c.outTok / 1e6) * rates[1];
  }
  console.error("");
  console.error("--- cost / time ---");
  console.error(
    `frames sent: ${frames.length} of ${allFrames.length} — each analyst carried all of them ` +
      `(${frames.length * 5} image blocks total)`
  );
  console.error(`input tokens:  ${inTok.toLocaleString()} (5 analysts + 1 merge)`);
  console.error(`output tokens: ${outTok.toLocaleString()}`);
  console.error(
    costKnown
      ? `est. cost across the model mix: $${cost.toFixed(2)}`
      : `est. cost: unknown rates for one of the models — see platform.claude.com pricing`
  );
  console.error(`wall time: ${elapsed()}`);
  console.error("");
  console.error(`review ${outPath}, then open /scans/room3d/?room=${args.id}`);
}

main().catch((e) => {
  console.error(`error: ${e.message}`);
  process.exit(1);
});
