# ARCHITECTURAL SHELL SPEC — Communal Dorm Kitchen/Dining Room

Source: 50-frame portrait phone pan (~400 deg sweep, CCW then walk-back toward kitchen).
All dimensions in meters, 0.05 precision. Confidence flags: [HIGH]/[MED]/[LOW].

## 0. CANONICAL COORDINATE SYSTEM (all teams use this)

- Origin `(0,0,0)` = floor corner at the LEFT END of WALL K when standing in the room
  facing WALL K. This is the corner next to the FRIDGE (the fridge is at K's left end).
- **+X** runs rightward along WALL K (fridge -> range -> pantry corner).
- **+Z** runs from WALL K into the room (toward the banquette).
- **+Y** up. Floor y=0, ceiling y=2.70.

Compass used below for prose only: WALL K = "north" (z=0), WALL W = "west" (x=0),
WALL B = "south" (z=4.90), WALL F = "east" (x=5.05).

### IMPORTANT label-to-physical-wall mapping (labels share walls)
- **WALL K (label)** = the physical north wall, x=0 -> 5.05 at z=0. It carries the ENTIRE
  kitchen run INCLUDING the fridge and the microwave counter at its WEST (left) end.
  The quick-scan brief grouped "fridge + microwave counter" under WALL F; the video shows
  they are physically on the SAME wall plane as the sink/range (continuous counter,
  continuous mosaic backsplash, continuous cubby shelving). [HIGH]
- **WALL F (label)** = the physical east wall (x=5.05) PLUS the pantry alcove that wraps
  the K/F (NE) corner. Its contents: pantry nook with open food shelves, gray trash can,
  white dustpan, notices, and the glazed entry doors. So label F spans the east wall and
  the nook; labels K and F meet at the pantry corner. [HIGH]
- **WALL W (label)** = physical west wall (x=0): one large window, deep sill, one fin-tube
  radiator. [HIGH]
- **WALL B (label)** = physical south wall (z=4.90): full-length upholstered banquette with
  the white table row in front. [HIGH]

## 1. ROOM PLAN

Shape: RECTANGLE, 5.05 (X, east-west) x 4.90 (Z, north-south), ~24.7 m^2, with ONE
full-height stub wall (a chase) near the NE corner that forms an open PANTRY ALCOVE.
No other jogs; flat ceiling at 2.70. [MED on absolute size +-0.35; aspect ratio HIGH]

- Dim justification X=5.05: sum of kitchen run elements (0.55 wall + 0.80 fridge + 0.95
  cabinet + 1.15 knee bay + 0.76 range + 0.80 counter) using 0.76 m range as the ruler.
- Dim justification Z=4.90: east wall sum (1.15 alcove + 0.12 stub + 1.15 notice bay +
  0.45 sidelite + 1.65 door pair + 0.40 pillar); cross-checked by ~2.9 m clear aisle
  between counter edge (z=0.63) and table row (z=3.55).

### Pantry alcove (open nook at NE corner) [HIGH it exists; MED on dims]
- A full-height stub wall (chase) spans x=4.50 -> 5.05 at z=1.15 -> 1.27 (0.55 long,
  0.12 thick, floor to ceiling). North of it, the volume x=4.50-5.05 / z=0-1.15 is an
  open alcove reached from the west (no door): the dark countertop, mosaic backsplash and
  open food cubbies of WALL K continue INTO it to the east wall. An electric kettle sits
  on the counter at its mouth (x~4.40). Opening: plane x=4.50, z=0.02-1.15, full height
  (head = ceiling), width ~1.13.
- The stub's south face carries one generic notice. The gray trash can stands just
  south-west of the stub at ~(4.55, 1.45).

### Entry door (the room's only door) [HIGH]
- Glazed aluminum-framed assembly on WALL F (east wall, x=5.05), opening to an adjacent
  carpeted lounge (striped carpet, own windows/radiator — not part of this room).
- North fixed sidelite z=2.42-2.87 (0.45 wide); DOOR PAIR z=2.87-4.52 (two 0.825 leaves,
  center z=3.70); wall pillar z=4.52-4.90 to the SE corner.
- Leaf height 2.25, frame head 2.35, clear glass full-height lites, dark metal bottom
  rails (~0.25), overhead closers, metal threshold. [MED on head height]

## 2. WALLS AS ENDPOINTS, AND ALL OPENINGS

Walls (plan endpoints, (x,z), thickness drawn outward; interior faces given):
| Wall | From | To | Length | Notes |
|---|---|---|---|---|
| K (north) | (0.00, 0.00) | (5.05, 0.00) | 5.05 | kitchen run, incl. alcove back portion |
| W (west) | (0.00, 0.00) | (0.00, 4.90) | 4.90 | window wall |
| B (south) | (0.00, 4.90) | (5.05, 4.90) | 5.05 | banquette wall, blank above bench |
| F (east) | (5.05, 0.00) | (5.05, 4.90) | 4.90 | notices/dustpan, doors |
| Stub/chase | (4.50, 1.15) | (5.05, 1.15) | 0.55 | 0.12 thick, full height, forms alcove |

Openings (wall, center (x,z), width, sill, head):
| ID | Wall | Center | Width | Sill | Head | Type |
|---|---|---|---|---|---|---|
| WIN-1 | W | (0.00, 2.31) | 1.52 glass/frame (1.70 w/ casing) | 0.85 | 2.45 | double-hung window [HIGH location / MED dims] |
| DOOR-1 | F | (5.05, 3.70) | 1.65 pair (2.10 incl. sidelite, center 3.47) | 0.00 | 2.35 | glazed double door to lounge [HIGH] |
| NOOK-1 | plane x=4.50 | (4.50, 0.58) | 1.13 | 0.00 | 2.70 (open) | pantry alcove opening, no door [MED] |

No other windows or doors exist in this room (south and north walls are solid). [HIGH]

## 3. WINDOW DETAIL (WIN-1)

- Count: exactly ONE window in the room, on WALL W. [HIGH]
- Type: white double-hung; BOTH sashes divided 3 lites wide x 2 high (6-over-6).
  In the captured state the LOWER SASH IS RAISED ~0.45 (open), so the two 3x2 grids
  overlap and read as a 3-wide x 4-high grid with a CLEAR strip at the bottom; two cam
  locks sit on the meeting rail, two metal sash lifts on the lower sash rail.
  [MED — alternative reading: fixed 12-lite (3x4) upper over a 1-lite lower sash.
  For the scene, modeling closed 6-over-6 is recommended; pane proportions ~0.47w x 0.36h.]
- Muntins ~0.020 wide, white. Frame/sash white (painted wood or white metal-clad).
- Casing: flat white trim ~0.09 wide, slight back-band; head casing ~0.25 below ceiling.
- Sill: DEEP white stool ~0.50 deep x ~0.04 thick (thick masonry wall), eased bullnose,
  projecting past casing; painted apron below. Justification: umbrella and 1 L juice
  carton (0.09 wide, on sill) both fit with room to spare. [HIGH deep / MED exact]
- Reveal: jambs splay slightly; glass plane ~0.35 outboard of interior wall face.
- Hardware: 2 chrome cam locks, 2 chrome lifts. Items on sill (umbrella, juice carton)
  are set dressing, not architecture.
- Backdrop through glass (render as distant billboard only): flat mowed lawn with
  scattered leaves, a 4-storey red-brick dormitory ~18 m away with regular white windows
  and pale stone bands, bare tree branches upper-left, soft overcast daylight. [HIGH]

## 4. CEILING

- Height 2.70 flat throughout; NO soffits or bulkheads — the open cubby shelving stops
  ~0.28 below the ceiling with plain wall above (checked above hood and above fridge).
  Justification: fridge 1.70 + ~1.0 of shelf/wall above it; door head 2.35 + 0.35 band.
  [HIGH flat / MED 2.70 +-0.10]
- Color: flat ceiling white with a warm cast, approx #F4F1E8.
- Fixtures: 3 pendant cube lights over the table row — amber/ochre fabric cube shades
  ~0.25, on thin stems, shade bottoms ~2.00; approx at (0.70, 3.60), (2.55, 3.60),
  (4.40, 3.40). [MED positions] One small white flush/recessed rectangle near the door
  at ~(4.20, 2.40). [LOW] Round smoke detector ~(4.20, 3.60). Under-shelf task light
  strip above the sink (on WALL K shelving underside, x 2.30-3.10, y 1.44).

## 5. FLOOR

- Material: dark charcoal stone/slate-look resilient flooring (VCT or sheet vinyl),
  base color ~#3B3E41 with lighter gray #55585C marbling/mottle; low sheen.
- Pattern: non-directional mottle; if tiled, large ~0.45 squares grid-aligned to the
  room axes, near-invisible joints. [MED on tile vs sheet]
- Wear: lighter scuffed patches in front of the range and at the door threshold.
- Transition: metal threshold strip at DOOR-1; striped carpet beyond (lounge).

## 6. TRIM, BASEBOARDS, RADIATORS

- Baseboard: dark charcoal/black vinyl cove base, 0.10 high, on all drywall walls
  (visible by doors, pillar, and bench wall ends). No chair rail, no crown. [MED]
- Kitchen toe space: continuous brushed STAINLESS/metal toe-kick strip, 0.10 high,
  under the base cabinets and knee-space counter run of WALL K. [HIGH]
- Window casing: per Section 3. Door trim: none (aluminum storefront-style frames).
  Pantry opening: plain painted drywall jambs, no casing. [MED]
- Radiators: EXACTLY ONE in the room — white hydronic fin-tube baseboard with sheet-metal
  enclosure, sloped top with continuous slotted grille, end caps both ends.
  - Position: WALL W, from (0.00, 0.95) to (0.00, 3.55) -> length 2.60, centered under
    WIN-1 biased slightly south. Height 0.27, depth 0.085, raised 0.02 off floor.
    Justification: spans window width plus ~0.5 each side; height ~1/3 of sill. [HIGH]
  - (The adjacent lounge's radiator seen through DOOR-1 glass is outside this room.)

## 7. WALL FINISHES AND ELEVATION NOTES (per wall)

Paint (eggshell; warm scheme; whites approximate):
- WALL K and alcove: warm cream #EDE7D4 (visible above shelving and on the stub). [MED]
- WALL W: cream, slightly lighter read #F0EBDC. [MED]
- WALL B: pale butter YELLOW #EAE0B9 — distinctly yellower than the others (some of the
  cast is from the amber pendants; keep a mild yellow). [MED]
- WALL F: light warm greige #E7E3D7 around the doors; cream on the notice bay. [MED]

### WALL K elevation (x left->right = 0 -> 5.05), the kitchen run [HIGH layout]
- 0.00-0.55 blank cream wall (corner gap).
- 0.55-1.35 FRIDGE: stainless top-freezer, 0.76 w x 1.70 h x 0.75 d, black sides,
  long vertical tube handles on right of doors, generic notices + yellow sticky on front.
- 1.35-5.05 continuous dark countertop, h 0.91, depth 0.63 (brown-black granite-look
  laminate, 0.04 built-up edge), running into the pantry alcove to x=5.05.
  - 1.35-2.30 white 2-door base cabinet (slab fronts, stainless D-pulls); black
    countertop microwave on top (0.55 w x 0.33 h) at x 1.45-2.00.
  - 2.30-3.45 OPEN KNEE SPACE (ADA style, cantilevered counter, white back/underside);
    stainless drop-in single-bowl sink 0.56 x 0.46 centered x=2.80, chrome gooseneck
    faucet; white soap + sanitizer dispensers on tile x~2.05/2.35, y~1.25.
  - 3.45-3.50 white support panel.
  - 3.50-4.25 RANGE: GE slide-in electric smooth-top, stainless/black, 0.76 w, front
    controls; black glass top at 0.91.
  - 4.25-5.05 east counter (electric kettle x~4.40); x>4.50 lies inside the alcove.
- Backsplash: glass/ceramic MOSAIC of ~0.025 squares, mixed gloss black/white/gray/
  steel-blue, stacked grid, light grout; field y 0.91-1.45 along x 1.35-5.05 (incl.
  alcove), rising to y~1.60 behind the range up to the hood. [HIGH]
- Hood: stainless under-cabinet hood, 0.76 w, underside y 1.60, over the range, with a
  shallow white cabinet box above (y 2.00-2.42).
- Upper OPEN CUBBY SHELVING, white melamine, depth 0.30: continuous x 0.55-5.05;
  field y 1.45-2.42, 3 rows (~0.32 pitch), vertical dividers every ~0.40; above the
  fridge the field starts at y 1.85. Two closed-door units embedded near the hood
  (2-door unit x 2.95-3.50 and a single door x 3.95-4.35, top rows). White fascia/valance
  at the underside with task light over the sink. End panel visible at x=0.55... runs to
  the W end; the shelving's west end panel shows at the K/W corner. [HIGH]
- Wall outlets on tile, y 1.15: x ~1.95, ~2.95, ~4.30 (kettle plugged in), plus one
  inside the alcove x~4.90. Paper-towel dispenser (white, commercial, rounded) on tile
  x 3.15-3.45, y 1.15-1.50. Generic "kitchen rules" letter sheet and a colorful
  food-safety infographic taped to the tile above the sink (do not render text).

### WALL F elevation (z top->bottom = 0 -> 4.90, facing west) [HIGH order / MED dims]
- z 0.00-1.15 alcove interior (east wall of nook; small open shelves w/ food, lit bright).
- z 1.15-1.27 stub wall edge (alcove cheek).
- z 1.27-2.42 notice bay: 2 generic letter-size notices y 1.55-2.10; white long-handled
  DUSTPAN hung at y 0.75-1.50, z~1.90; gray round BRUTE-style trash can (0.56 dia,
  0.69 h, white liner) in front at (4.55, 1.45).
- z 2.42-2.87 fixed glass sidelite.
- z 2.87-4.52 glazed DOOR PAIR (per Section 1).
- z 4.52-4.90 pillar: silver light-switch plate z~4.60 y 1.15; red fire extinguisher on
  bracket z~4.72, y 1.00-1.55; red horn/strobe y~2.20; small orange alarm device near
  z~4.40, y~2.30.

### WALL B elevation (x 0 -> 5.05, facing north) [HIGH]
- Continuous BANQUETTE: back panel x 0.15-4.60 (4.45 long), upholstered gray-taupe
  (ribbed weave), rounded top at y 0.88, built on black base; charcoal seat cushions,
  seat y 0.45, seat depth 0.55. Visible seams split the back into ~1.1 modules.
- Wall above bench: blank pale yellow; duplex outlets y~1.00 at x ~0.55, 1.75, 2.95,
  4.00; two small blank/silver plates x~4.35-4.50, y~1.30; white thermostat-style box
  near SE end x~4.55, y~1.35. [MED positions]
- White laminate TABLE ROW in front (furniture, for reference): 4 tables ~1.10 x 0.75,
  h 0.74, at z 3.55-4.30, spanning x 0.25-4.65; beech/chrome chairs on the north side.

### WALL W elevation (z 0 -> 4.90, facing east) [HIGH]
- z 0.00-1.55 blank cream wall (fridge's west flank space).
- z 1.55-3.07 WIN-1 (casing z 1.45-3.17; see Section 3).
- z 3.07-4.90 blank wall to the SW corner.
- Radiator z 0.95-3.55 at floor (Section 6). Nothing else mounted.

## 8. ASCII FLOOR PLAN (top view)

```
      +X ->
      0         1         2         3         4         5.05
 0,0  +---------+---------+---------+---------+---------+  (5.05, 0)
      | gap |FRIDGE| cab+microwave | KNEE/SINK |RANGE| c.|   WALL K (kitchen)
      |     '------'  counter depth 0.63, h 0.91 ====== P|<- pantry alcove
  1   |                                           ___====|   (x4.50-5.05, z0-1.15)
      | (o)<- radiator z0.95                     stub%%%%|<- stub wall z1.15-1.27
      |  |                                      TRASH o  |
  2   | WIN-1                                   notices/ |   dustpan on E wall
      |  |  z1.55-3.07                          dustpan  |
 Z    |  |  sill 0.85                           ---------|<- sidelite z2.42-2.87
  3   | (o)<- radiator to z3.55                 =========|<- DOOR-1 pair
 |    |                                         ========= -> to carpeted lounge
 v    |      [tbl][tbl][tbl][tbl]  z3.55-4.30   =========|   (z2.87-4.52, head 2.35)
  4   |     ~~~~~~~~ bench seat ~~~~~~~~~        pillar##|<- extinguisher/switches
      |====== BANQUETTE back x0.15-4.60 =================|
 4.90 +---------+---------+---------+---------+---------+  (5.05, 4.90)
      (0,4.90)            WALL B (banquette)

      Legend: ==== upholstered bench/doors, %%%% stub wall, P pantry alcove,
      (o) radiator end caps, [tbl] white tables, o trash can.
      Origin (0,0) = fridge-end corner of WALL K. +Y up out of the page.
```

## 9. SCALE ANCHORS USED
- Range 0.76 w (standard 30" slide-in) -> kitchen run lengths.
- Counter h 0.91 / depth 0.63 -> sill, tile, dispenser heights.
- Fridge 1.70 h -> ceiling 2.70 (1.0 of shelf+wall above it).
- Table 0.74 / bench seat 0.45 -> bench back 0.88, outlet heights.
- BRUTE can 0.69 h / 0.56 dia -> stub width 0.55, dustpan length 0.75.
- Door leaf 2.25 (storefront pair) -> door head 2.35, ceiling band 0.35.
- 1 L juice carton (0.09 w) on sill -> sill depth ~0.50.

## 10. LOW/MEDIUM-CONFIDENCE ITEMS (flagged)
- Absolute room size +-0.35 each axis (no measured reference in frames). [MED]
- Window grid: 6-over-6 with raised lower sash vs 12-lite fixed over 1-lite. [MED]
- Stub wall z-position 1.15 (+-0.25) and alcove depth 0.55 (+-0.15). [MED]
- Ceiling 2.70 (+-0.10); door head 2.35 (+-0.10). [MED]
- Wall B yellow may be partly pendant color cast. [MED]
- Flush ceiling fixture near door, pendant exact positions. [LOW]
- Alcove interior east-face shelving contents. [LOW]

## 11. EXCLUSIONS HONORED
Outside-window content = generic backdrop only (lawn, red-brick dorm, bare branches,
overcast). Lounge beyond DOOR-1 = render as dim carpeted space, no detail. All posters/
notices = generic white/colored sheets, NO legible text.
