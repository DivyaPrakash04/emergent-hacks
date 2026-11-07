# MATERIALS & COLOR SPEC — Communal Dorm Kitchen/Dining
*PBR palette for three.js (sRGB hex, roughness, metalness). Derived from 50 video frames (portrait pan).*
*All hexes are TRUE-surface estimates: the footage has a warm auto-WB cast overall and strong yellow pendant spill in the dining corner (frames 28–46). Rendered-on-video values, where usefully different, are noted. No pixel sampler was available in this environment, so values are perceptual estimates cross-checked across multiple frames/lighting zones.*

Wall labels: **WALL K** = kitchen run (range/sink/cubbies) · **WALL W** = window wall · **WALL B** = banquette wall · **WALL F** = fridge/pantry side.

## Master material table

| # | SURFACE | HEX | ROUGH | METAL | NOTES |
|---|---------|-----|-------|-------|-------|
| 1a | Wall paint — WALL K (kitchen run) | `#EAE3CF` | 0.90 | 0.0 | Cream/antique white, flat latex. Renders warmer (#ECE2C6) on video. Only visible in strips above/beside cubbies and around pantry niche. |
| 1b | Wall paint — WALL F (fridge/pantry side) | `#EBE5D3` | 0.90 | 0.0 | Same cream family; pillar/jamb by trash can reads a touch lighter `#EEE9DB`. |
| 1c | Wall paint — WALL W (window wall) | `#E9E2CE` | 0.90 | 0.0 | Cream; blown toward white near glass by daylight. Below-sill area identical. |
| 1d | Wall paint — WALL B (banquette wall, dining corner) | `#E4D9B6` | 0.90 | 0.0 | Genuinely one step yellower — pale butter/straw. Under lit pendants it renders strongly yellow-khaki (#DDD3A8); don't bake that in. |
| 1e | Wall paint — glass-door partition wall (dining end, around double doors) | `#DEDCD4` | 0.90 | 0.0 | Noticeably whiter/grayer than WALL B (frames 36–38). Cool gray-white. |
| 1f | Ceiling | `#F3F1EB` | 0.95 | 0.0 | Flat white, slight warm age. No visible fixtures except pendant canopies (gray metal) + small round detectors. |
| 2 | Floor — vinyl, terrazzo/stone-look | base `#45484B` | 0.60 | 0.0 | Dark charcoal with directionless cloudy mottle. Mottle hexes: smoke gray `#5E6163` (patches 8–20 cm), near-black `#33363A` (5–15 cm), sparse warm-taupe fleck `#6B6457` (0.5–2 cm speckle). Low-satin sheen; mild blurry reflections under pendants (clearcoat ~0.1, clearcoatRough ~0.6). Dining-end frames read green-khaki only because of pendant spill. |
| 3a | Backsplash mosaic — main kitchen run | see tile palette below | 0.15 (glass gloss) | 0.0 | Glass/ceramic mix mosaic; module ≈ **2.5 cm squares** mixed with occasional 2.5×5 cm horizontal bricks (sheet-mounted, stacked/offset hybrid). Grout `#C9C6BE`, ~3 mm. Extent: **from countertop up to underside of cubbies (~45–50 cm)** along the whole run; behind range it continues up to the hood underside (~75 cm panel). Wraps behind sink and paper-towel/soap dispensers. |
| 3b | Backsplash mosaic — microwave station / fridge end (DIFFERENT, darker) | see tile palette below | 0.12 | 0.0 | Same 2.5 cm module but **black-dominated glossy colorway** (frames 16–19, 48–49): reads as near-continuous dark horizontal banding. Grout `#B9B6AE`, ~3 mm. Extent: counter to underside of cubbies (~50 cm), behind/around microwave to the fridge-side corner. |
| 4 | Countertop — dark speckled laminate | base `#3B332A` | 0.35 | 0.0 | Dark chocolate/charcoal "burnt strand" laminate. Speckles: tan `#8A6F4E`, mid-brown `#5E4A35`, cream fleck `#A89066`, black `#211D18`; dense even speckle 2–6 mm, no direction. Semi-gloss: soft blurred reflections of kettle/pans (clearcoat 0.25, clearcoatRough 0.35). Square laminate edge, same color; matching waterfall side panel beside range. |
| 5a | Cubby open shelving (uppers, whole run) | `#EAE4D4` | 0.50 | 0.0 | Warm off-white/almond melamine-painted wood. Satin. Shelf/divider thickness ~18–20 mm (3/4"). Rows of shelf-pin holes on verticals. Square edges. |
| 5b | Upper cabinet slab doors (over hood / left end) | `#EDE9DE` | 0.45 | 0.0 | Slightly brighter white than cubby carcass; flat slab fronts, brushed steel bar pulls. |
| 6a | Range hood | `#B9B6B0` | 0.30 | 1.0 | Brushed stainless, **horizontal** grain on face band; underside mid-gray. Anisotropy ~0.8. |
| 6b | Range (GE slide-in) | `#A9A7A3` | 0.32 | 1.0 | Brushed SS front, **horizontal** grain; black glass cooktop `#0E0F10` (rough 0.05); dark gray oven-door window band `#2A2B2D`; knobs polished SS `#C2C3C4` (rough 0.12). |
| 6c | Refrigerator (top-freezer) | `#ADABA7` | 0.28 | 1.0 | Brushed SS doors, **vertical** grain; long curved SS handles `#B5B4B0`; side panels glossy black `#1A1A1C` (rough 0.25, metal 0). Papers/stickers on door (white/yellow). |
| 6d | Microwave | trim `#B4B2AE` | 0.30 | 1.0 | SS wrap + handle, horizontal grain; black glass door face `#121214` (rough 0.08, metal 0); green LED clock. |
| 6e | Sink (drop-in, single bowl) | `#9FA0A0` | 0.30 | 1.0 | Brushed SS, fine linear grain; slightly duller than appliances (scratched satin). |
| 6f | Faucet (tall gooseneck) + soap pump | `#C4C7C9` | 0.08 | 1.0 | Polished chrome; near-mirror. |
| 7a | White base cabinets (microwave station + sink run) | `#F0EFEA` | 0.45 | 0.0 | Cooler bright-white slab laminate than cubbies; vertical brushed-steel pulls. |
| 7b | Metal toe-kick / counter apron trim | `#999A98` | 0.35 | 1.0 | Brushed aluminum band under base cabinets and along counter support edge; horizontal grain. |
| 8a | Banquette back cushion | `#827C70` | 0.80 | 0.0 | Gray-taupe, **finely ribbed cord weave, horizontal ribs ~1–1.5 mm pitch**, slight sheen on rib crests (sheen 0.3, sheenColor `#9A948A`). Long continuous bolster, rounded top, ~45 cm tall, in 2 sections per wall. Renders warm khaki under pendants. |
| 8b | Banquette seat cushions | `#3A3D3C` | 0.85 | 0.0 | Deep charcoal with faint green-blue cast; tighter micro-weave/suede feel (no visible rib at normal view). Slabs ~8 cm thick. |
| 8c | Banquette base/kick | `#1E1F20` | 0.70 | 0.0 | Black painted plinth band under seat. |
| 9a | Table tops (square, ganged in rows) | `#F2F1ED` | 0.35 | 0.0 | White matte laminate; faint warm reflections only. Thickness ~25 mm. |
| 9b | Table edge detail — blue line | `#5D86D1` | 0.35 | 0.0 | Thin bright cornflower-blue band on the top's edge arris (~1–2 mm visible line). Where two tables abut it reads as a blue seam line across the white field; also faint pale-blue hairline seams `#AFC3E3` near edges. Not a printed grid — edge banding only. |
| 9c | Table legs/frame | `#93959A` | 0.40 | 0.9 | Gray painted-steel tube legs (some read darker blue-gray `#5F6B78` in shade); satin metal. |
| 10 | Chairs — molded plywood (NOT white plastic — correction) | `#D0AE7E` | 0.40 | 0.0 | One-piece curved birch/beech ply shell (seat+back), clear satin coat; edge shows ply layers `#B98F5C`. Under pendants reads amber `#CFA05E`; in daylight `#D9B98A`. Legs: steel tube, blue-gray `#6E7584` (rough 0.35, metal 0.9). A chair back can blow out near-white in bright frames — do not model as white plastic. |
| 11a | Window casing + deep sill/stool | `#F1EEE6` | 0.25 | 0.0 | Semi-gloss white enamel, slightly warm. Sill is deep (~25 cm), paint-smooth. |
| 11b | Window sash (double-hung, gridded upper) | `#F4F2EC` | 0.30 | 0.0 | A half-step brighter/cooler than casing (newer paint/vinyl). Grid muntins same. |
| 11c | Radiator (fin-tube baseboard enclosure, full wall) | `#EDEAE0` | 0.50 | 0.0 | Duller, slightly creamier white than trim (aged enamel over metal, metal 0.1 acceptable); louvered top grille rows ~2 cm. |
| 12 | Window glass | tint `#DCE4EA` | 0.02 | 0.0 | Double-pane, faint cool gray-green tint; transmission ~0.85, reflectivity enough to mirror the lit pendants (yellow blobs in frames 22–27). Daylight through it: overcast, ~6500–7000 K. Glass doors to lounge: clear, satin-anodized aluminum frames `#A8A9A6` (rough 0.35, metal 1.0). |
| 13a | Pendant lights (2×, cube shades, dining corner) | unlit `#D9A832` | 0.70 | 0.0 | Fabric cube shade, saffron/mustard. **Lit: sides emissive `#FFC95E` (~2900–3100 K), bottom diffuser `#FFE9B8` brightest**; thin silver frame top/bottom `#B9B9B5` (metal 1.0, rough 0.3); gray stem/canopy `#8A8B88`. |
| 13b | Trash can (large, round) | `#7D8084` | 0.70 | 0.0 | Gray Brute-style HDPE, matte; white liner bag `#F4F4F2` folded over rim; second slimmer bin dark gray `#4A4D50`; white dustpan/brush `#EFEFEA` hung on wall. |
| 13c | Umbrella (on sill) | `#1C1D1F` | 0.50 | 0.0 | Black nylon canopy, low sheen (sheen 0.4); black shaft/handle. |
| 13d | Kettle (electric, glass) | glass clear / `#C7D2D6` | 0.05 | 0.0 | Clear glass body (slight cool tint), black plastic lid/handle/base `#141516` (rough 0.3), SS heating plate + trim ring. |
| 13e | Pans | `#141414` | 0.55 | 0.0 | Two black nonstick skillets (one on cooktop, one by sink); one has red center disc `#B33A31`; black handles. A dark plate/bowl `#1A1A1A` on counter end. |
| 13f | Shelf-goods bottle/jar mini-palette | — | — | — | Olive-oil glass `#3E4A22` + lighter olive `#556326`; white squeeze bottles `#E9E7E0`; red can/jar labels `#C33B2E`; mustard yellow `#E0B13A`; orange snack bag `#D97A2B`; tan bread bag `#C9A96E`; blue tin/label `#4A6FA5`; blue-white yogurt packs `#D7E3EA`/`#3F6FB4`; pizza box white + red disc `#C8362F` + blue logo `#2458A5`; juice carton pale yellow `#E8D98A`; spice jars amber `#8A5A2B` with black caps. Posters: white paper `#F5F4EF` with teal/orange infographic blocks `#2E8C8C`/`#D97B2E`. Dispensers (towel+soap): white plastic `#EFEEEA`, rough 0.4. Outlet/switch plates: brushed SS `#A7A7A4`. Fire extinguisher `#B5231E` on silver bracket; red alarm strobe `#A32B22`. |
| 14 | Backdrop through windows (single note) | — | — | — | Overcast daylight sky `#D8DCDD`; autumn lawn green `#5E7A3A` scattered with tan leaves `#B59A5C`; neighboring brick dorm red-brown `#7E4A3C` with cream stone string-courses `#C9BFA8`, dark window openings `#3C4248`, bare gray-brown branches `#6B5F52`. |

## Backsplash tile palettes (per-tile hexes + frequency)

**Main kitchen-run mosaic (3a)** — glossy glass + matte ceramic mix, 2.5 cm squares with occasional 2.5×5 cm bricks, grout `#C9C6BE` @ 3 mm:

| Tile color | HEX | Finish | Approx. share |
|---|---|---|---|
| Black | `#262627` | matte ceramic | 25% |
| Warm white | `#DAD8D0` | gloss | 20% |
| Light gray | `#ABA8A2` | gloss | 15% |
| Mid gray | `#777672` | matte | 15% |
| Steel blue-gray | `#68808F` | gloss glass | 15% |
| Tan/beige | `#B0A48C` | gloss | 10% |
Random (non-repeating) distribution; slight gloss variation tile-to-tile sells it. Roughness: gloss tiles 0.10–0.18, matte tiles 0.45.

**Microwave-station mosaic (3b)** — darker colorway, same module, grout `#B9B6AE`:

| Tile color | HEX | Finish | Approx. share |
|---|---|---|---|
| Gloss black | `#1F2022` | gloss glass | 50% |
| Charcoal | `#3A3B3D` | matte | 20% |
| Bronze-brown | `#6B5844` | gloss | 10% |
| Warm gray | `#8B8880` | matte | 10% |
| Blue-gray | `#5D7080` | gloss | 5% |
| White | `#CFCBC2` | gloss | 5% |

## Renderer lighting (item 14)

| Light | Hex | CCT | Notes |
|---|---|---|---|
| Pendant cubes (dining corner, 2×) | `#FFD9A3` | ~3000 K | Point/area inside cube; bottom face brightest; drives the yellow cast on WALL B + banquette. Emissive shade sides `#FFC95E`. |
| Window daylight (WALL W) | `#D9E6F2` | ~6800 K | Large soft area light, overcast; cool fill on kitchen end, strongest at sill/floor near window. |
| Suggested ambient | `#CFCBC2` low intensity | — | Keeps cream walls from going gray between the two sources. |

Contrast recipe: kitchen end ≈ daylight-dominated (cool, desaturated); dining corner ≈ pendant-dominated (warm, +yellow shift ~+8 b* on everything). Window glass should visibly reflect the two lit pendant cubes.

## Key palette summary

1. Walls: cream `#EAE3CF` (K/F/W), pale butter `#E4D9B6` (B), gray-white `#DEDCD4` at the glass-door wall; ceiling `#F3F1EB`.
2. Floor: charcoal mottled vinyl `#45484B` + `#5E6163`/`#33363A`/`#6B6457`, satin (rough 0.6).
3. Main mosaic: black/white/grays/steel-blue/tan 2.5 cm chips, grout `#C9C6BE`; counter→cubby underside (~50 cm).
4. Microwave splash: separate black-glass mosaic `#1F2022`-dominated.
5. Counter: dark-brown speckled laminate `#3B332A` + tan/cream flecks, semi-gloss.
6. Cubbies/uppers: almond white `#EAE4D4`, satin, 19 mm shelves; base cabinets brighter `#F0EFEA` + brushed toe-kick.
7. Stainless: hood/range/fridge/micro `#A9A7A3`–`#B9B6B0`, rough ~0.3, brushed (fridge vertical, rest horizontal); chrome faucet `#C4C7C9`.
8. Banquette: taupe ribbed back `#827C70`, charcoal seats `#3A3D3C`; tables white `#F2F1ED` with cornflower edge line `#5D86D1`; chairs birch ply `#D0AE7E` (not white).
9. Trim/sash/radiator whites: `#F1EEE6` / `#F4F2EC` / `#EDEAE0` (three slightly different whites).
10. Lights: pendants `#FFD9A3` @3000 K vs. window `#D9E6F2` @6800 K; backdrop = brick `#7E4A3C`, lawn `#5E7A3A`, sky `#D8DCDD`.
