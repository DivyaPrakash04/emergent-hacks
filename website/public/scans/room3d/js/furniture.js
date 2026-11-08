// js/furniture.js — parametric furniture catalog (rooms-schema.md, furniture[]).
// buildFurniture() iterates S.furniture[] and dispatches each item on item.type.
// Every constructor builds at a local origin = footprint center on the floor,
// facing +Z at rotY 0; the dispatcher applies world x/z/rotY. banquette is the
// one world-space special case (x0..x1 against WALL B, as the original).
// Identical items share one prototype and are clone()d (geometry + materials
// shared); plain/rounded-box and cylinder geometries are also cached by dims.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { S } from './spec.js';
import { PAL, M, TEX } from './materials.js';
import * as H from './helpers.js';

const DEG = Math.PI / 180;
const WOOD = '#b89468'; // case-goods birch, a step darker than the chair shells

// ---------- cached geometries (shared across items and clones) ----------
const _rbox = new Map();
function rbox(w, h, d, seg, r) {
  const k = `${w}|${h}|${d}|${seg}|${r}`;
  let g = _rbox.get(k);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, seg, r); _rbox.set(k, g); }
  return g;
}
const _cyl = new Map();
function cyl(rTop, rBot, h, seg) {
  const k = `${rTop}|${rBot}|${h}|${seg}`;
  let g = _cyl.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rTop, rBot, h, seg); _cyl.set(k, g); }
  return g;
}

// ---------- lazy shared materials (one instance each, built on first use) ----------
const std = (o) => new THREE.MeshStandardMaterial(o);
const MATDEFS = {
  banqBase: () => std({ color: PAL.banqBase, roughness: 0.85 }),
  banqSeat: () => std({ map: TEX.fabric(PAL.banqSeat, 8, false), roughness: 0.96 }),
  banqBack: () => std({ map: TEX.fabric(PAL.banqBack, 12, true), color: '#b5aea2', roughness: 0.96 }),
  birch: () => std({ map: TEX.wood(PAL.chairWood, 1.5), roughness: 0.5 }),
  cream: () => std({ color: PAL.baseCab, roughness: 0.35 }),
  trashBody: () => std({ color: PAL.trash, roughness: 0.72, flatShading: true }),
  voidDark: () => std({ color: '#111213', roughness: 0.95 }),
  wood: () => std({ map: TEX.wood(WOOD, 2), roughness: 0.6 }),
  steelDark: () => std({ color: '#3a3d41', roughness: 0.45, metalness: 0.8 }),
  plinthDark: () => std({ color: '#26272a', roughness: 0.75 }),
  mattress: () => std({ color: '#e9e7e0', roughness: 0.9 }),
  duvet: () => std({ map: TEX.fabric('#dfd9cc', 7, false), roughness: 0.97 }),
  pillow: () => std({ map: TEX.fabric('#f1eee6', 9, false), roughness: 0.95 }),
  sofaFab: () => std({ map: TEX.fabric('#8a8f86', 9, false), roughness: 0.96 }),
  porcelain: () => std({ color: '#f4f3ef', roughness: 0.25 }),
  porcelainDim: () => std({ color: '#d8d5cd', roughness: 0.5 }), // dark-white basin/cavity insets
  showerTile: () => std({
    map: H.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#eceae3'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90,88,80,0.35)'; ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo((i * w) / 4, 0); ctx.lineTo((i * w) / 4, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (i * h) / 4); ctx.lineTo(w, (i * h) / 4); ctx.stroke();
      }
    }, { repeat: [3, 6] }),
    roughness: 0.4,
  }),
};
const _mat = new Map();
function mat(key, make) {
  let m = _mat.get(key);
  if (!m) { m = (make || MATDEFS[key])(); _mat.set(key, m); }
  return m;
}

// ---------- small helpers (unchanged from the original module) ----------
// Up-axis of a Y-cylinder after rotation.set(rx, 0, rz) (three.js 'XYZ' Euler).
function legUp(rx, rz) {
  return new THREE.Vector3(-Math.sin(rz), Math.cos(rx) * Math.cos(rz), Math.sin(rx) * Math.cos(rz));
}

// Slim splayed steel leg: top end tucked in at (ax, topY, az), foot on the floor.
function placeLeg(geo, m, len, ax, topY, az, rx, rz) {
  const msh = new THREE.Mesh(geo, m);
  msh.rotation.set(rx, 0, rz);
  const u = legUp(rx, rz);
  msh.position.set(ax - u.x * len / 2, topY - u.y * len / 2, az - u.z * len / 2);
  return msh;
}

// Wavy folded-over top edge + slight radial slump for the trash-can liner bag.
function linerWobble(geo, rimY) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const fTop = THREE.MathUtils.smoothstep(y, rimY - 0.06, rimY + 0.03);
    const fAll = THREE.MathUtils.smoothstep(y, rimY - 0.13, rimY + 0.03);
    const rs = 1 + 0.02 * Math.sin(4 * a + 2.0) * fAll;
    pos.setX(i, x * rs);
    pos.setZ(i, z * rs);
    pos.setY(i, y + fTop * (0.013 * Math.sin(3 * a + 1.2) + 0.008 * Math.sin(7 * a + 0.5)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/* ============ banquette — WORLD SPACE, x0..x1 against WALL B (z = S.room.d) ============ */
function banquette(it) {
  const c = new THREE.Group();
  const B = {
    x0: 0, x1: S.room.w, plinthH: 0.12, seatH: 0.45, seatD: 0.55,
    backTop: 0.92, backT: 0.10, backTilt: 8, seamPitch: 1.07, ...it,
  };
  const zWall = S.room.d;
  const len = B.x1 - B.x0, cx = (B.x0 + B.x1) * 0.5;

  // black plinth, recessed behind the upholstered front (shadow gap)
  const plinthD = 0.47;
  c.add(H.boxOnFloor(len - 0.08, B.plinthH, plinthD, mat('banqBase'), cx, 0, zWall - 0.004 - plinthD / 2));

  // charcoal upholstered seat frame (the front face below the cushions)
  const frameH = 0.35 - B.plinthH;
  const frameD = B.seatD - 0.015;
  c.add(H.boxOnFloor(len, frameH, frameD, mat('banqSeat'), cx, B.plinthH, zWall - 0.004 - frameD / 2));

  // seat + back cushions, split every ~seamPitch with 9 mm seams
  const n = Math.max(1, Math.round(len / B.seamPitch));
  const gap = 0.009;
  const cw = (len - (n - 1) * gap) / n;

  const seatT = 0.13;
  const seatGeo = rbox(cw, seatT, B.seatD, 3, 0.042); // soft front edge
  const tilt = B.backTilt * DEG;
  const backH = 0.50;
  const backGeo = rbox(cw, backH, B.backT, 3, 0.045); // rounded top/ends

  // tilt back cushions so the top-back corner kisses the wall at backTop
  const bcy = B.backTop - (backH / 2) * Math.cos(tilt);
  const bcz = (zWall - 0.005) - ((backH / 2) * Math.sin(tilt) + (B.backT / 2) * Math.cos(tilt));

  for (let i = 0; i < n; i++) {
    const x = B.x0 + cw / 2 + i * (cw + gap);
    c.add(H.mesh(seatGeo, mat('banqSeat'), x, B.seatH - seatT / 2, zWall - 0.0025 - B.seatD / 2));
    const back = H.mesh(backGeo, mat('banqBack'), x, bcy, bcz);
    back.rotation.x = tilt; // recline toward the wall
    c.add(back);
  }
  return c;
}

/* ============ table — splayed-leg café table; 'whiteBlue' (default) | 'wood' ============ */
function table(it) {
  const c = new THREE.Group();
  const style = it.style || 'whiteBlue';
  const h = it.h ?? 0.74, topT = it.topT ?? 0.025;
  const w = (it.w ?? 1.07) - 0.006, d = (it.d ?? 0.76) - 0.004; // small reveal where tops abut (no z-fight)
  const wood = style === 'wood';
  const matTop = wood ? mat('wood') : M.tableTop;
  const matBand = wood ? mat('steelDark') : M.tableEdge; // cornflower band / dark steel apron
  const matLeg = wood ? mat('steelDark') : M.tableLeg;

  const bandH = 0.012; // edge band just under the top edge
  const rxA = 8 * DEG, rzA = 5 * DEG; // leg splay: 8° to the room, 5° along the row
  const legTopY = h - topT - bandH + 0.014;
  const legLen = legTopY / (Math.cos(rxA) * Math.cos(rzA));
  const legGeo = cyl(0.015, 0.012, legLen, 12);

  c.add(H.mesh(rbox(w, topT, d, 2, 0.006), matTop, 0, h - topT / 2, 0));
  c.add(H.mesh(H.boxGeo(w, bandH, d), matBand, 0, h - topT - bandH / 2, 0));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      c.add(placeLeg(legGeo, matLeg, legLen, sx * (w / 2 - 0.09), legTopY, sz * (d / 2 - 0.07), -sz * rxA, sx * rzA));
    }
  }
  return c;
}

/* ============ chair — molded-ply shell; 'birchShell' (default) | 'creamShell' ============ */
// Default orientation: seat faces +Z (back panel on the -Z side).
function chair(it) {
  const c = new THREE.Group();
  const shellMat = (it.style === 'creamShell') ? mat('cream') : mat('birch');
  const panGeo = rbox(0.43, 0.026, 0.41, 2, 0.009);
  const backGeoC = rbox(0.43, 0.19, 0.016, 2, 0.007); // used twice (bent-ply arc)
  const cSplay = 6 * DEG;
  const cLegTop = 0.442;
  const cLegLen = cLegTop / (Math.cos(cSplay) * Math.cos(cSplay));
  const cLegGeo = cyl(0.011, 0.009, cLegLen, 10);

  // seat pan, gently scooped (dips toward the back)
  const pan = H.mesh(panGeo, shellMat, 0, 0.447, 0.012);
  pan.rotation.x = -0.045;
  c.add(pan);
  // back panel in two slabs — curves up with an increasing backward arc
  const lo = H.mesh(backGeoC, shellMat, 0, 0.5425, -0.1955);
  lo.rotation.x = -0.10;
  c.add(lo);
  const hi = H.mesh(backGeoC, shellMat, 0, 0.722, -0.227); // top ~0.81
  hi.rotation.x = -0.26;
  c.add(hi);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      c.add(placeLeg(cLegGeo, M.chairLeg, cLegLen, sx * 0.165, cLegTop, sz * 0.15, -sz * cSplay, sx * cSplay));
    }
  }
  return c;
}

/* ============ trashCan — gray Brute; liner:true adds the white bag overhang ============ */
function trashCan(it) {
  const c = new THREE.Group();
  const r = it.r ?? 0.28, h = it.h ?? 0.69;
  const bodyH = h - 0.03; // rolled rim brings total to ~h
  // 14-sided faceted body = molded vertical rib hints
  const body = new THREE.Mesh(cyl(r, r * 0.8, bodyH, 14), mat('trashBody'));
  body.position.set(0, bodyH / 2, 0);
  c.add(body);
  // rolled rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.016, 10, 28), M.trash);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, bodyH, 0);
  c.add(rim);
  // dark interior void just below the opening
  const voidC = new THREE.Mesh(cyl(r - 0.055, r - 0.09, 0.28, 18), mat('voidDark'));
  voidC.position.set(0, bodyH - 0.045 - 0.14, 0);
  c.add(voidC);
  if (it.liner) {
    // white liner folded over the rim, hanging ~10 cm down the outside, wavy edge
    const liner = H.lathe([
      [r - 0.045, bodyH - 0.05],
      [r - 0.030, bodyH + 0.012],
      [r + 0.006, bodyH + 0.026],
      [r + 0.026, bodyH - 0.006],
      [r + 0.019, bodyH - 0.10],
    ], M.liner, 36);
    linerWobble(liner.geometry, bodyH);
    liner.userData.noShadow = true;
    c.add(liner);
  }
  return c;
}

/* ============ bed — 'dorm': low wood frame, mattress, duvet, pillows (head = -Z) ============ */
function bed(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.98, len = it.len ?? 2.0, h = it.h ?? 0.55; // h = mattress top
  const wood = mat('wood');
  const mattT = 0.18, railH = 0.12, railT = 0.035;
  const deckTop = h - mattT;
  const railY = Math.max(railH / 2, deckTop - railH / 2);
  const legH = Math.max(0.05, deckTop - railH / 2);

  // legs + perimeter rails
  const legGeo = H.boxGeo(0.045, legH, 0.045);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      c.add(H.mesh(legGeo, wood, sx * (w / 2 - 0.045), legH / 2, sz * (len / 2 - 0.045)));
    }
  }
  const sideGeo = rbox(railT, railH, len - 2 * railT, 2, 0.008);
  const endGeo = rbox(w, railH, railT, 2, 0.008);
  for (const sx of [-1, 1]) c.add(H.mesh(sideGeo, wood, sx * (w / 2 - railT / 2), railY, 0));
  for (const sz of [-1, 1]) c.add(H.mesh(endGeo, wood, 0, railY, sz * (len / 2 - railT / 2)));
  // dark slat deck so nothing sees through under the mattress
  c.add(H.mesh(H.boxGeo(w - 0.08, 0.02, len - 0.08), mat('voidDark'), 0, deckTop - 0.02, 0));

  // mattress
  c.add(H.mesh(rbox(w - 0.05, mattT, len - 0.05, 2, 0.035), mat('mattress'), 0, h - mattT / 2, 0));

  // duvet: soft slab from below the pillows past the foot, overhanging the sides
  c.add(H.mesh(rbox(w + 0.08, 0.09, len - 0.30, 3, 0.035), mat('duvet'), 0, h + 0.028, 0.21));

  // pillows at the head (-Z); two across on wide beds
  const pilGeo = rbox(0.46, 0.10, 0.32, 3, 0.04);
  const py = h + 0.04, pz = -len / 2 + 0.26;
  const xs = (w > 1.15) ? [-0.26, 0.26] : [0];
  xs.forEach((px, i) => {
    const p = H.mesh(pilGeo, mat('pillow'), px, py, pz);
    p.rotation.y = (i % 2 ? -1 : 1) * 0.05;
    c.add(p);
  });
  return c;
}

/* ============ wardrobe — tall 2-door cabinet, gap line, bar handles, plinth ============ */
function wardrobe(it) {
  const c = new THREE.Group();
  const w = it.w ?? 1.0, d = it.d ?? 0.6, h = it.h ?? 1.9;
  const wood = mat('wood');

  c.add(H.mesh(H.boxGeo(w - 0.06, 0.06, d - 0.05), mat('plinthDark'), 0, 0.03, 0)); // plinth
  c.add(H.mesh(rbox(w, h - 0.06, d, 2, 0.008), wood, 0, 0.06 + (h - 0.06) / 2, 0)); // carcass

  // two door fronts, proud of the carcass, with a dark 2 mm center gap line
  const doorH = h - 0.09, doorY = 0.075 + doorH / 2;
  const doorW = (w - 0.032) / 2;
  const doorGeo = rbox(doorW, doorH, 0.016, 2, 0.004);
  for (const sx of [-1, 1]) c.add(H.mesh(doorGeo, wood, sx * (doorW / 2 + 0.001), doorY, d / 2 + 0.007));
  c.add(H.mesh(H.boxGeo(0.004, doorH, 0.004), mat('voidDark'), 0, doorY, d / 2 + 0.002));

  // vertical bar handles on 2 standoff pegs each, by the center gap
  const barGeo = cyl(0.0055, 0.0055, 0.30, 10);
  const pegGeo = cyl(0.004, 0.004, 0.026, 8);
  const hy = 0.075 + doorH * 0.52;
  for (const sx of [-1, 1]) {
    c.add(H.mesh(barGeo, M.doorMetal, sx * 0.05, hy, d / 2 + 0.036));
    for (const sy of [-1, 1]) {
      const peg = H.mesh(pegGeo, M.doorMetal, sx * 0.05, hy + sy * 0.115, d / 2 + 0.024);
      peg.rotation.x = Math.PI / 2;
      c.add(peg);
    }
  }
  return c;
}

/* ============ desk — rounded-nose worktop, 4 slim steel legs, modesty panel ============ */
function desk(it) {
  const c = new THREE.Group();
  const w = it.w ?? 1.2, d = it.d ?? 0.6, h = it.h ?? 0.74;
  const topT = 0.03;
  c.add(H.mesh(rbox(w, topT, d, 2, 0.01), mat('wood'), 0, h - topT / 2, 0));
  const legH = h - topT;
  const legGeo = cyl(0.014, 0.012, legH, 12);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      c.add(H.mesh(legGeo, mat('steelDark'), sx * (w / 2 - 0.05), legH / 2, sz * (d / 2 - 0.05)));
    }
  }
  // thin modesty panel across the back (-Z), tucked under the top
  c.add(H.mesh(H.boxGeo(w - 0.18, 0.28, 0.014), mat('wood'), 0, h - topT - 0.14, -(d / 2 - 0.035)));
  return c;
}

/* ============ dresser — chest with N drawer fronts (gap lines) + knobs ============ */
function dresser(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.9, d = it.d ?? 0.5, h = it.h ?? 0.8;
  const n = Math.max(1, Math.round(it.drawers ?? 3));
  const wood = mat('wood');

  c.add(H.mesh(H.boxGeo(w - 0.05, 0.04, d - 0.04), mat('plinthDark'), 0, 0.02, 0)); // plinth
  c.add(H.mesh(rbox(w, h - 0.04, d, 2, 0.008), wood, 0, 0.04 + (h - 0.04) / 2, 0)); // carcass

  const y0 = 0.065, y1 = h - 0.02, gap = 0.004;
  const fh = (y1 - y0 - (n - 1) * gap) / n;
  const frontGeo = rbox(w - 0.055, fh, 0.016, 2, Math.min(0.004, fh * 0.3));
  const knobGeo = cyl(0.011, 0.011, 0.022, 10);
  for (let i = 0; i < n; i++) {
    const y = y0 + fh / 2 + i * (fh + gap);
    c.add(H.mesh(frontGeo, wood, 0, y, d / 2 + 0.007));
    for (const sx of [-1, 1]) {
      const k = H.mesh(knobGeo, M.doorMetal, sx * w * 0.24, y, d / 2 + 0.024);
      k.rotation.x = Math.PI / 2;
      c.add(k);
    }
  }
  return c;
}

/* ============ nightstand — ~0.45 cube, one drawer front + knob, short legs ============ */
function nightstand(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.45, d = it.d ?? 0.42, h = it.h ?? 0.45;
  const wood = mat('wood');
  const legH = 0.07;
  const legGeo = H.boxGeo(0.032, legH, 0.032);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      c.add(H.mesh(legGeo, wood, sx * (w / 2 - 0.04), legH / 2, sz * (d / 2 - 0.04)));
    }
  }
  c.add(H.mesh(rbox(w, h - legH, d, 2, 0.008), wood, 0, legH + (h - legH) / 2, 0)); // body
  const fy = h - 0.095; // drawer front near the top
  c.add(H.mesh(rbox(w - 0.06, 0.13, 0.014, 2, 0.004), wood, 0, fy, d / 2 + 0.006));
  const k = H.mesh(cyl(0.01, 0.01, 0.02, 10), M.doorMetal, 0, fy, d / 2 + 0.021);
  k.rotation.x = Math.PI / 2;
  c.add(k);
  return c;
}

/* ============ sofa — 'loveseat': plinth, 2+2 fabric cushions, rounded arms ============ */
function sofa(it) {
  const c = new THREE.Group();
  const w = it.w ?? 1.5, d = 0.72; // loveseat depth fixed by style
  const fab = mat('sofaFab');
  const armW = 0.12, inW = w - 2 * armW;

  c.add(H.mesh(H.boxGeo(w - 0.1, 0.08, d - 0.1), mat('plinthDark'), 0, 0.04, 0)); // shadow-gap plinth
  c.add(H.mesh(rbox(inW, 0.14, d - 0.04, 2, 0.02), fab, 0, 0.15, 0)); // seat deck
  c.add(H.mesh(rbox(inW, 0.58, 0.14, 2, 0.03), fab, 0, 0.37, -(d / 2 - 0.07))); // back frame
  const armGeo = rbox(armW, 0.54, d, 3, 0.05); // rounded arms
  for (const sx of [-1, 1]) c.add(H.mesh(armGeo, fab, sx * (w / 2 - armW / 2), 0.35, 0));

  const cw = (inW - 0.015) / 2;
  const seatGeo = rbox(cw, 0.15, 0.5, 3, 0.05);
  const backGeo = rbox(cw, 0.40, 0.13, 3, 0.05);
  for (const sx of [-1, 1]) {
    c.add(H.mesh(seatGeo, fab, sx * (cw / 2 + 0.0075), 0.295, 0.08));
    const b = H.mesh(backGeo, fab, sx * (cw / 2 + 0.0075), 0.50, -0.175);
    b.rotation.x = -0.09; // recline against the back frame
    c.add(b);
  }
  return c;
}

/* ============ shelfUnit — open bookcase: sides, back panel, N shelf bays ============ */
function shelfUnit(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.8, d = it.d ?? 0.3, h = it.h ?? 1.8;
  const n = Math.max(1, Math.round(it.shelves ?? 4));
  const wood = mat('wood');

  const sideGeo = rbox(0.024, h, d, 2, 0.006);
  for (const sx of [-1, 1]) c.add(H.mesh(sideGeo, wood, sx * (w / 2 - 0.012), h / 2, 0));
  // painted back panel
  c.add(H.mesh(H.boxGeo(w - 0.048, h - 0.05, 0.01), M.baseCab, 0, h / 2, -(d / 2 - 0.005)));
  // n+1 boards (bottom board + one per bay, top included) = n open bays
  const boardGeo = H.boxGeo(w - 0.048, 0.022, d - 0.012);
  const yBot = 0.051, yTop = h - 0.011;
  for (let k = 0; k <= n; k++) {
    c.add(H.mesh(boardGeo, wood, 0, yBot + (k * (yTop - yBot)) / n, 0.004));
  }
  return c;
}

/* ============ toilet — plinth, bowl, seat + lid, tank at the back (-Z) ============ */
function toilet(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.38, d = it.d ?? 0.66, h = it.h ?? 0.76;
  const po = mat('porcelain');
  const tankD = 0.16, tankZ = -(d / 2 - tankD / 2 - 0.01);
  const seatTop = 0.405;
  // base plinth under the bowl
  c.add(H.mesh(rbox(w * 0.58, 0.16, 0.34, 2, 0.02), po, 0, 0.08, 0.06));
  // bowl: squashed cylinder, elongated toward the front (+Z)
  const bowl = H.mesh(cyl(w * 0.44, w * 0.29, 0.26, 24), po, 0, 0.24, 0.06);
  bowl.scale.z = 1.35;
  c.add(bowl);
  // seat + slightly raised closed lid (rounded slabs)
  c.add(H.mesh(rbox(w - 0.02, 0.032, 0.45, 2, 0.013), po, 0, seatTop - 0.016, 0.05));
  c.add(H.mesh(rbox(w - 0.05, 0.026, 0.42, 2, 0.011), po, 0, seatTop + 0.013, 0.04));
  // tank against the wall behind (-Z) + bridge closing the gap to the bowl
  c.add(H.mesh(rbox(w - 0.02, 0.32, tankD, 2, 0.015), po, 0, h - 0.16, tankZ));
  c.add(H.mesh(rbox(w * 0.76, 0.18, 0.2, 2, 0.02), po, 0, 0.36, -0.18));
  // small chrome flush button on the tank top
  c.add(H.mesh(cyl(0.017, 0.017, 0.012, 14), M.chrome, 0, h + 0.004, tankZ));
  return c;
}

/* ============ sinkVanity — white 2-door cabinet, counter lip, basin hint, faucet ============ */
function sinkVanity(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.6, d = it.d ?? 0.5, h = it.h ?? 0.85;
  const po = mat('porcelain'), white = mat('cream');
  const topT = 0.04, plinthH = 0.05;
  const carcH = h - topT - plinthH;
  c.add(H.mesh(H.boxGeo(w - 0.08, plinthH, d - 0.1), mat('plinthDark'), 0, plinthH / 2, -0.01)); // toe kick
  c.add(H.mesh(rbox(w, carcH, d - 0.04, 2, 0.008), white, 0, plinthH + carcH / 2, -0.01));       // carcass
  // counter, slightly proud all around, + backsplash lip
  c.add(H.mesh(rbox(w + 0.02, topT, d, 2, 0.012), po, 0, h - topT / 2, 0));
  c.add(H.mesh(rbox(w + 0.02, 0.06, 0.02, 2, 0.008), po, 0, h + 0.03, -(d / 2 - 0.01)));
  // inset oval basin hint (thin dark-white disc, barely proud of the counter)
  const basin = H.mesh(cyl(0.16, 0.16, 0.012, 24), mat('porcelainDim'), 0, h - 0.001, 0.04);
  basin.scale.z = 0.7;
  c.add(basin);
  // two door fronts with a dark center gap line + chrome knobs
  const frontZ = -0.01 + (d - 0.04) / 2;
  const doorH = carcH - 0.05, doorY = plinthH + 0.025 + doorH / 2;
  const doorW = (w - 0.044) / 2;
  const doorGeo = rbox(doorW, doorH, 0.014, 2, 0.004);
  for (const sx of [-1, 1]) c.add(H.mesh(doorGeo, white, sx * (doorW / 2 + 0.002), doorY, frontZ + 0.009));
  c.add(H.mesh(H.boxGeo(0.004, doorH, 0.004), mat('voidDark'), 0, doorY, frontZ + 0.004));
  const knobGeo = cyl(0.009, 0.009, 0.02, 10);
  for (const sx of [-1, 1]) {
    const k = H.mesh(knobGeo, M.chrome, sx * 0.04, doorY + doorH / 2 - 0.09, frontZ + 0.026);
    k.rotation.x = Math.PI / 2;
    c.add(k);
  }
  // chrome gooseneck faucet at the back of the counter
  const fz = -(d / 2 - 0.08);
  c.add(H.mesh(cyl(0.011, 0.013, 0.14, 12), M.chrome, 0, h + 0.07, fz));
  const arm = H.mesh(cyl(0.008, 0.008, 0.12, 10), M.chrome, 0, h + 0.133, fz + 0.06);
  arm.rotation.x = Math.PI / 2;
  c.add(arm);
  c.add(H.mesh(cyl(0.007, 0.007, 0.03, 10), M.chrome, 0, h + 0.118, fz + 0.116)); // down tip
  return c;
}

/* ============ pedestalSink — lathe column, rounded basin top, chrome faucet ============ */
function pedestalSink(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.55, d = it.d ?? 0.45, h = it.h ?? 0.85;
  const po = mat('porcelain');
  const colTop = h - 0.15;
  // tapered pedestal column
  c.add(H.lathe([
    [0.105, 0], [0.1, 0.02], [0.062, colTop * 0.2], [0.052, colTop * 0.57],
    [0.058, colTop * 0.8], [0.095, colTop * 0.95], [0.105, colTop],
  ], po, 28));
  // wider basin top with rounded rim + oval inset hint
  c.add(H.mesh(rbox(w, 0.15, d, 3, 0.05), po, 0, h - 0.075, 0));
  const inset = H.mesh(cyl(0.19, 0.19, 0.012, 24), mat('porcelainDim'), 0, h, 0.015);
  inset.scale.z = 0.74;
  c.add(inset);
  // chrome faucet at the back
  const fz = -(d / 2 - 0.1);
  c.add(H.mesh(cyl(0.011, 0.013, 0.13, 12), M.chrome, 0, h + 0.065, fz));
  const arm = H.mesh(cyl(0.008, 0.008, 0.1, 10), M.chrome, 0, h + 0.122, fz + 0.05);
  arm.rotation.x = Math.PI / 2;
  c.add(arm);
  return c;
}

/* ============ bathtub — alcove tub; len along X, faucet/shower head end = -X ============ */
function bathtub(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.75, len = it.len ?? 1.5, h = it.h ?? 0.55;
  const po = mat('porcelain');
  c.add(H.mesh(rbox(len, h - 0.06, w, 3, 0.04), po, 0, (h - 0.06) / 2, 0));        // outer shell
  c.add(H.mesh(rbox(len + 0.04, 0.07, w + 0.04, 3, 0.03), po, 0, h - 0.035, 0));   // rolled rim
  // inner cavity: smaller dark-white inset, barely proud — reads hollow from above
  c.add(H.mesh(rbox(len - 0.18, 0.03, w - 0.18, 2, 0.012), mat('porcelainDim'), 0, h - 0.011, 0));
  // chrome tub faucet + shower head on a vertical pipe at the head end (-X)
  const hx = -len / 2 + 0.08;
  c.add(H.mesh(cyl(0.011, 0.011, 1.2, 12), M.chrome, hx, h + 0.6, 0));             // riser pipe
  const spout = H.mesh(cyl(0.015, 0.015, 0.14, 12), M.chrome, hx + 0.06, h + 0.07, 0);
  spout.rotation.z = Math.PI / 2;
  c.add(spout);
  const knob = H.mesh(cyl(0.018, 0.018, 0.024, 12), M.chrome, hx, h + 0.32, 0.03); // mixer knob
  knob.rotation.x = Math.PI / 2;
  c.add(knob);
  const arm = H.mesh(cyl(0.008, 0.008, 0.12, 10), M.chrome, hx + 0.06, h + 1.17, 0);
  arm.rotation.z = Math.PI / 2;
  c.add(arm);
  const head = H.mesh(cyl(0.05, 0.05, 0.016, 18), M.chrome, hx + 0.11, h + 1.13, 0);
  head.rotation.z = -2.7;                                                          // face down into the tub
  c.add(head);
  return c;
}

/* ============ shower — tray, tiled back panels (-Z/-X), glass front/side, chrome set ============ */
function shower(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.9, d = it.d ?? 0.9, h = it.h ?? 2.0;
  const po = mat('porcelain'), tile = mat('showerTile');
  const trayH = 0.09, panelT = 0.024;
  // low tray with rim: porcelain tray + recessed-looking dark-white floor inset
  c.add(H.mesh(rbox(w, trayH, d, 2, 0.02), po, 0, trayH / 2, 0));
  c.add(H.mesh(rbox(w - 0.14, 0.025, d - 0.14, 2, 0.01), mat('porcelainDim'), 0, trayH - 0.0085, 0));
  // tiled back panels on the two wall sides (-Z and -X)
  const panelH = h - trayH, panelY = trayH + panelH / 2;
  c.add(H.mesh(rbox(w, panelH, panelT, 2, 0.006), tile, 0, panelY, -(d / 2 - panelT / 2)));
  c.add(H.mesh(rbox(panelT, panelH, d - panelT, 2, 0.006), tile, -(w / 2 - panelT / 2), panelY, panelT / 2));
  // glass front (+Z) + glass side (+X)
  const glassH = h - trayH - 0.1;
  const gf = H.mesh(H.boxGeo(w - 0.06, glassH, 0.008), M.glass, 0, trayH + glassH / 2, d / 2 - 0.006);
  gf.userData.noShadow = true;
  c.add(gf);
  const gs = H.mesh(H.boxGeo(0.008, glassH, d - 0.08), M.glass, w / 2 - 0.006, trayH + glassH / 2, -0.01);
  gs.userData.noShadow = true;
  c.add(gs);
  // chrome head on a pipe + mixer disc on the back panel
  c.add(H.mesh(cyl(0.009, 0.009, 0.9, 10), M.chrome, 0, h - 0.5, -(d / 2 - panelT - 0.012)));
  const arm = H.mesh(cyl(0.008, 0.008, 0.16, 10), M.chrome, 0, h - 0.08, -(d / 2 - 0.12));
  arm.rotation.x = Math.PI / 2;
  c.add(arm);
  const head = H.mesh(cyl(0.055, 0.055, 0.016, 18), M.chrome, 0, h - 0.115, -(d / 2 - 0.2));
  head.rotation.x = 2.7;                                                           // face down into the tray
  c.add(head);
  const mixer = H.mesh(cyl(0.05, 0.05, 0.02, 16), M.chrome, 0, 1.05, -(d / 2 - panelT - 0.008));
  mixer.rotation.x = Math.PI / 2;
  c.add(mixer);
  const lever = H.mesh(cyl(0.012, 0.012, 0.05, 10), M.chrome, 0, 1.05, -(d / 2 - panelT - 0.03));
  lever.rotation.x = Math.PI / 2;
  c.add(lever);
  return c;
}

/* ============ genericBox — fallback crate ============ */
function genericBox(it) {
  const c = new THREE.Group();
  const w = it.w ?? 0.5, d = it.d ?? 0.5, h = it.h ?? 0.5;
  const color = it.color || '#a8a195';
  const m = mat('generic:' + color, () => std({ color, roughness: 0.8 }));
  c.add(H.mesh(rbox(w, h, d, 2, Math.min(0.01, w / 4, h / 4, d / 4)), m, 0, h / 2, 0));
  return c;
}

// ---------- registry + dispatcher ----------
const BUILDERS = {
  banquette, table, chair, trashCan,
  bed, wardrobe, desk, dresser, nightstand, sofa, shelfUnit,
  toilet, sinkVanity, pedestalSink, bathtub, shower, genericBox,
};

// Prototype key: the item minus its placement — identical items share a proto.
function protoKey(type, item) {
  const p = { ...item };
  delete p.type; delete p.x; delete p.z; delete p.rotY;
  return type + '|' + JSON.stringify(p);
}

export function buildFurniture() {
  const g = new THREE.Group();
  g.name = 'furniture';
  const protos = new Map();
  const warned = new Set();

  const items = S.furniture || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') continue;
    let type = item.type;
    if (!BUILDERS[type]) {
      if (!warned.has(type)) {
        console.warn(`furniture: unknown type "${type}" — building a genericBox stand-in`);
        warned.add(type);
      }
      type = 'genericBox';
    }
    if (type === 'banquette') { // world-space x0..x1, fixed to its wall
      const bq = BUILDERS.banquette(item);
      bq.userData.itemIndex = i; bq.userData.itemType = 'banquette'; bq.userData.locked = true;
      g.add(bq); continue;
    }

    const key = protoKey(type, item);
    const proto = protos.get(key);
    let node;
    if (proto) {
      node = proto.clone(); // clones share geometries + materials
    } else {
      node = BUILDERS[type](item);
      protos.set(key, node);
    }
    node.position.set(item.x || 0, 0, item.z || 0);
    node.rotation.y = item.rotY || 0;
    node.userData.itemIndex = i;
    node.userData.itemType = type;
    g.add(node);
  }

  H.applyShadows(g);
  return g;
}
