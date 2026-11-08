// Merged room specification — single source of truth for all build modules.
// Derived from the five analysis reports + frame cross-checks. Units: meters.
// Coordinate system (CONTRACT.md): origin = floor corner at the fridge (west) end
// of WALL K. +X east along WALL K, +Z into the room, +Y up.
// Walls: K = kitchen (z=0) · W = window (x=0) · B = banquette (z=room.d) · F = entry/east (x=room.w)

export const S = {
  room: { w: 5.05, d: 4.90, h: 2.72 },
  cove: { h: 0.10 }, // dark vinyl cove base on all walls (M.baseboard)

  // --- WALL W (x = 0): the single big double-hung window ---
  window: {
    z0: 1.55, z1: 3.07,          // opening span along the wall (width 1.52)
    sill: 0.85, head: 2.45,
    sillDepth: 0.50, sillThick: 0.05, trimW: 0.09,
    upperGrid: [4, 2],           // muntin panes on upper sash (cols x rows)
    lowerGrid: [4, 2],           // lower sash grid, drawn lighter (sash is raised in source)
  },
  radiator: { z0: 0.95, z1: 3.55, h: 0.60, d: 0.22 }, // cream fin-tube enclosure under window

  // --- WALL F (x = room.w): glazed aluminum entry to the lounge ---
  doors: {
    z0: 2.87, z1: 4.52,          // double-door leaves span
    head: 2.35,
    transomTop: 2.62,            // glass transom band above the leaves
    sideliteZ1: 4.90,            // fixed glass sidelite from z1 to the B corner
    frameT: 0.06,                // aluminum frame bar width
  },

  // --- pantry stub wall + nook (east end of kitchen run) ---
  // Stub runs parallel to WALL K at z = stub.z, from x0 to the F wall; the nook
  // behind it (x > stub.x0, z < stub.z) opens toward the sink run (west).
  stub: { z: 0.62, x0: 4.30, x1: 5.05, t: 0.10 },

  // --- WALL K kitchen run (west -> east) ---
  fridge: { x0: 0.55, x1: 1.35, d: 0.70, h: 1.70, freezerSplit: 1.18 }, // hinge on window side (west)
  microCab: { x0: 1.35, x1: 2.30 },          // white 2-door base cabinet, microwave on top
  micro: { w: 0.50, d: 0.38, h: 0.30, cx: 1.80 },
  counter: {
    h: 0.91, t: 0.04, d: 0.60,
    segs: [[1.35, 3.50], [4.26, 5.05]],      // range sits in the gap
    kneeOpen: [2.30, 3.45],                   // open accessible bay (no base below)
    toeH: 0.10,
  },
  sink: { cx: 2.80, w: 0.56, d: 0.44 },      // drop-in stainless, twin gooseneck faucets
  range: { x0: 3.50, x1: 4.26, d: 0.66, h: 0.91, backH: 0.10 }, // GE slide-in stainless/black
  hood: { x0: 3.50, x1: 4.26, y0: 1.56, y1: 1.86, d: 0.50 },
  hoodCab: { y0: 1.90, y1: 2.42 },           // doored white cabinet above hood
  splash: {
    subway: { x0: 1.35, x1: 2.30, y0: 0.91, y1: 1.60 },  // black-glass colorway zone
    mosaic: { x0: 2.30, x1: 5.05, y0: 0.91, y1: 1.50 },  // main mosaic zone (continues in nook)
  },
  cubbies: {
    depth: 0.30, shelfT: 0.019,
    top: { x0: 1.35, x1: 5.05, y0: 2.00, y1: 2.42 },     // full-width band, ~7 cells
    midZones: [
      { x0: 2.30, x1: 3.45, y0: 1.50, y1: 1.98 },        // over sink (3 cells, light bar under)
      { x0: 4.30, x1: 5.05, y0: 1.50, y1: 1.98 },        // kettle nook food cells
      { x0: 1.35, x1: 2.30, y0: 1.60, y1: 2.00 },        // over microwave
    ],
  },
  kettle: { x: 4.62, z: 0.30 },

  // --- WALL B dining ---
  banquette: {
    x0: 0.22, x1: 4.67,
    plinthH: 0.12, seatH: 0.45, seatD: 0.55,
    backTop: 0.92, backT: 0.10, backTilt: 8,  // degrees
    seamPitch: 1.07,
  },
  tables: {
    w: 1.07, d: 0.76, h: 0.74, topT: 0.025,
    cz: 3.95,
    cxs: [0.89, 1.96, 3.03, 4.10],
  },
  chairs: {
    // birch molded-ply shells, steel legs; rotY faces the seat direction
    birch: [
      { x: 1.42, z: 3.28, rotY: Math.PI },
      { x: 2.22, z: 3.28, rotY: Math.PI },
      { x: 2.88, z: 3.28, rotY: Math.PI },
      { x: 3.62, z: 3.28, rotY: Math.PI },
      { x: 4.30, z: 3.28, rotY: Math.PI },
      { x: 4.72, z: 3.95, rotY: -Math.PI / 2 },
    ],
    cream: [{ x: 0.42, z: 3.80, rotY: Math.PI / 2 }], // white molded shell at window end
  },

  // --- lighting fixtures ---
  pendants: [
    { x: 0.85, z: 3.70, lit: false },
    { x: 2.50, z: 3.70, lit: true },
    { x: 4.15, z: 3.70, lit: true },
  ],
  pendant: { cube: 0.30, bottomY: 2.10, stemR: 0.012 },
  lightBars: [ // linear LED bars under cubby cells (all OFF in source)
    { x0: 2.42, x1: 3.33, y: 1.50, z: 0.26 },
    { x0: 4.36, x1: 4.99, y: 1.50, z: 0.26 },
    { x0: 1.47, x1: 2.18, y: 1.60, z: 0.26 },
  ],

  // --- east wall props zone (decor detail in specs/decor.md) ---
  trash: { x: 4.62, z: 1.15, r: 0.28, h: 0.69 },

  // window sill props
  sillProps: { umbrellaZ: 2.75, cartonZ: 2.05 },
};
