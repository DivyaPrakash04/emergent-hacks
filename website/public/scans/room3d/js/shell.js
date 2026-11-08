// shell.js — architectural shell: floor, ceiling, inward-facing walls and their
// openings (double-hung windows, glazed aluminum entries, plain interior doors),
// stub partitions, radiators, cove base and exterior backdrop billboards.
// Spec-driven: builds only what rooms/<id>.json declares. See rooms-schema.md.
import * as THREE from 'three';
import { S } from './spec.js';
import { PAL, M, TEX } from './materials.js';
import * as H from './helpers.js';

// ---------------------------------------------------------------------------------
// H.wallWithHoles extrudes along local +Z. Slabs are oriented so local +Z points
// INTO the room; dropping every triangle that faces local -Z removes the outward
// cap, leaving the interior face + hole reveals. Walls are then invisible from
// outside the room (dollhouse view, CONTRACT rule 4) while still casting shadows.
function stripOuterCap(mesh) {
  let geo = mesh.geometry;
  if (geo.index) geo = geo.toNonIndexed();
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  const P = [], N = [], U = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    fn.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
    if (fn.z < 0 && Math.abs(fn.z) > Math.abs(fn.x) + Math.abs(fn.y)) continue; // outward cap
    for (let k = i; k < i + 3; k++) {
      P.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      if (nor) N.push(nor.getX(k), nor.getY(k), nor.getZ(k));
      if (uv) U.push(uv.getX(k), uv.getY(k));
    }
  }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  if (N.length) g2.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  if (U.length) g2.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  mesh.geometry = g2;
  return mesh;
}

function inwardWall(width, height, depth, holes, mat) {
  return stripOuterCap(H.wallWithHoles(width, height, depth, holes, mat));
}

// Per-hex material caches so repeated colors share one material. Seeded with the
// shared M.* instances so default-palette rooms keep the exact same materials.
const _wallMats = new Map([
  [PAL.wallCream, M.wallCream],
  [PAL.wallYellow, M.wallYellow],
  [PAL.wallPartition, M.wallPartition],
]);
function wallMat(hex) {
  if (!_wallMats.has(hex)) _wallMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.93 }));
  return _wallMats.get(hex);
}
const _doorMats = new Map();
function doorSlabMat(hex) {
  if (!_doorMats.has(hex)) _doorMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 }));
  return _doorMats.get(hex);
}

// ---------------------------------------------------------------------------------
// Wall-local frame. Every wall gets a Group whose local axes are: +X along the
// wall, +Y up, +Z INTO the room. K/F map the spec's along-coordinate c directly
// (lx(c) = c); W/B come out mirrored (lx(c) = len - c) so a single proper rotation
// serves every wall — no negative scale. Assemblies place every part through lx(),
// which keeps asymmetric details (sidelites, hinge sides) on the declared end.
// Local z < 0 is inside the wall slab / outside the room.

// ---------- WIN: white double-hung window with deep interior stool --------------
function buildWindow(wg, lx, T, e) {
  const c0 = e.c0, c1 = e.c1, sill = e.sill, head = e.head;
  const trimW = e.trimW ?? 0.09, sillDepth = e.sillDepth ?? 0.5, sillThick = e.sillThick ?? 0.05;
  const xc = (lx(c0) + lx(c1)) / 2;
  const ow = c1 - c0;                           // opening width
  const oh = head - sill;                       // opening height
  const sashH = oh / 2;                         // per sash
  const sashOW = ow - 0.008, sashOH = sashH - 0.008; // 4 mm channel gap all round
  const bar = 0.055, sashD = 0.045;
  const inW = sashOW - 2 * bar, inH = sashOH - 2 * bar;

  // casing: two side legs + head (bottom is the stool + apron)
  const legY = sill + 0.003;
  wg.add(H.boxOnFloor(trimW, head - legY, 0.022, M.trim, lx(c0 - trimW / 2), legY, 0.012));
  wg.add(H.boxOnFloor(trimW, head - legY, 0.022, M.trim, lx(c1 + trimW / 2), legY, 0.012));
  wg.add(H.boxOnFloor(ow + 2 * trimW, 0.09, 0.022, M.trim, xc, head, 0.012));

  // deep stool: runs from inside the reveal out past the wall face, with horns
  const stoolBack = -(T - 0.03);
  wg.add(H.boxOnFloor(ow + 2 * trimW + 0.06, sillThick, sillDepth, M.trim,
    xc, sill - sillThick + 0.002, stoolBack + sillDepth / 2));
  // apron under the stool
  wg.add(H.boxOnFloor(ow + 2 * trimW, 0.089, 0.02, M.trim, xc, sill - sillThick - 0.088, 0.011));

  // upper sash: deep in the reveal, muntin grid per spec
  const upZ = -0.26;
  const upYc = head - 0.004 - sashOH / 2;
  const ug = e.upperGrid ?? [2, 2], lg = e.lowerGrid ?? [2, 2];
  const upFrame = H.rectFrame(inW, inH, bar, sashD, M.sash);
  upFrame.position.set(xc, upYc, upZ);
  wg.add(upFrame);
  const upMunt = H.muntins(inW, inH, ug[0], ug[1], 0.02, 0.028, M.sash);
  upMunt.position.set(xc, upYc, upZ);
  wg.add(upMunt);
  const upGlass = new THREE.Mesh(new THREE.PlaneGeometry(inW + 0.06, inH + 0.06), M.glass);
  upGlass.position.set(xc, upYc, upZ - 0.01);
  upGlass.userData.noShadow = true;
  wg.add(upGlass);

  // lower sash: raised ~85% so it overlaps the upper (rails read doubled), room side
  const loZ = -0.205;
  const loY0 = sill + 0.85 * sashH;             // clear strip below
  const loYc = loY0 + sashOH / 2;
  const loFrame = H.rectFrame(inW, inH, bar, sashD, M.sash);
  loFrame.position.set(xc, loYc, loZ);
  wg.add(loFrame);
  const loMunt = H.muntins(inW, inH, lg[0], lg[1], 0.016, 0.024, M.sash);
  loMunt.position.set(xc, loYc, loZ);
  wg.add(loMunt);
  const loGlass = new THREE.Mesh(new THREE.PlaneGeometry(inW + 0.06, inH + 0.06), M.glass);
  loGlass.position.set(xc, loYc, loZ - 0.01);
  loGlass.userData.noShadow = true;
  wg.add(loGlass);

  // hardware: two chrome cam locks on the lower sash top rail, two sash lifts below
  const lockGeo = H.boxGeo(0.06, 0.026, 0.035);
  const liftGeo = H.boxGeo(0.05, 0.022, 0.014);
  for (const dx of [-0.33, 0.33]) {
    wg.add(H.mesh(lockGeo, M.chrome, xc + dx, loY0 + sashOH + 0.014, loZ));
    wg.add(H.mesh(liftGeo, M.chrome, xc + dx * 0.91, loY0 + bar / 2, loZ + sashD / 2 + 0.006));
  }
}

// ---------- glazed aluminum entry: double leaves, transom, optional sidelite ----
function buildGlazed(wg, lx, e) {
  const c0 = e.c0, c1 = e.c1, head = e.head, transomTop = e.transomTop;
  const fT = e.frameT ?? 0.06;                  // member width
  const hasSide = e.sideliteC1 != null;
  const ext = hasSide ? e.sideliteC1 : c1;      // full opening extent
  const fD = 0.10;                              // frame depth, inside the slab
  const fz = -fD / 2;
  const gzMidN = c0 + fT, gzMidS = ext - fT;    // clear span between jambs
  const midX = (lx(gzMidN) + lx(gzMidS)) / 2;
  const doorHi = hasSide ? c1 : c1 - fT;        // leaves run c0+fT .. doorHi

  // continuous frame: jambs full height, head at transom top, transom bar at door head
  wg.add(H.boxOnFloor(fT, transomTop, fD, M.doorMetal, lx(c0 + fT / 2), 0, fz));
  wg.add(H.boxOnFloor(fT, transomTop, fD, M.doorMetal, lx(ext - fT / 2), 0, fz));
  const railGeo = H.boxGeo(gzMidS - gzMidN, fT, fD);
  wg.add(H.mesh(railGeo, M.doorMetal, midX, transomTop - fT / 2, fz));  // head
  wg.add(H.mesh(railGeo, M.doorMetal, midX, head + fT / 2, fz));        // transom bar
  if (hasSide) {
    wg.add(H.mesh(H.boxGeo(fT, head, fD), M.doorMetal, lx(c1 + fT / 2), head / 2, fz)); // mullion
  }
  wg.add(H.mesh(H.boxGeo(doorHi - (c0 + fT), 0.016, 0.14), M.doorMetal,
    lx((c0 + fT + doorHi) / 2), 0.008, 0));                             // threshold

  // transom glass band across the whole opening
  const transGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(gzMidS - gzMidN + 0.04, transomTop - head - 2 * fT + 0.02), M.glass);
  transGlass.position.set(midX, (head + transomTop) / 2, fz);
  transGlass.userData.noShadow = true;
  wg.add(transGlass);

  // fixed glass sidelite c1 .. sideliteC1
  if (hasSide) {
    const sMid = (lx(c1 + fT) + lx(gzMidS)) / 2;
    wg.add(H.mesh(H.boxGeo(gzMidS - (c1 + fT) - 0.008, 0.10, fD), M.doorMetal, sMid, 0.05, fz)); // bottom rail
    const sgH = head - 0.04;
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(gzMidS - (c1 + fT) + 0.04, sgH), M.glass);
    sideGlass.position.set(sMid, 0.09 + sgH / 2, fz + 0.002);
    sideGlass.userData.noShadow = true;
    wg.add(sideGlass);
  }

  // two closed door leaves, aluminum frames with full-height glass
  const leafH = head - 0.02;
  const zoneL = gzMidN + 0.004, zoneR = doorHi - 0.004;
  const leafW = (zoneR - zoneL - 0.008) / 2;    // 8 mm meeting gap
  const leafCc = [zoneL + leafW / 2, zoneR - leafW / 2];
  const pullCc = [leafCc[0] + leafW / 2 - 0.07, leafCc[1] - leafW / 2 + 0.07];
  const leafRailGeo = H.boxGeo(leafW - 0.10, 0.20, 0.045);
  const leafMidGeo = H.boxGeo(leafW - 0.10, 0.08, 0.045);
  const pullGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 12);
  const standGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.034, 8);
  for (let i = 0; i < 2; i++) {
    const cx = lx(leafCc[i]);
    const lf = H.rectFrame(leafW - 0.10, leafH - 0.10, 0.05, 0.045, M.doorMetal);
    lf.position.set(cx, 0.01 + leafH / 2, -0.035);
    wg.add(lf);
    wg.add(H.mesh(leafRailGeo, M.doorMetal, cx, 0.16, -0.035));          // tall bottom rail
    wg.add(H.mesh(leafMidGeo, M.doorMetal, cx, 1.00, -0.035));           // lock rail
    const lgl = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.08, leafH - 0.12), M.glass);
    lgl.position.set(cx, 0.01 + leafH / 2, -0.035);
    lgl.userData.noShadow = true;
    wg.add(lgl);
    wg.add(H.mesh(pullGeo, M.chrome, lx(pullCc[i]), 1.05, 0.02));        // vertical pull bar
    for (const dy of [-0.145, 0.145]) {
      const so = H.mesh(standGeo, M.chrome, lx(pullCc[i]), 1.05 + dy, 0.002);
      so.rotation.x = Math.PI / 2;
      wg.add(so);
    }
  }
  // overhead closer on the first leaf
  wg.add(H.mesh(H.boxGeo(0.28, 0.07, 0.05), M.blackMatte, lx(leafCc[0] - 0.10), head - 0.055, 0.01));
  const closerArm = H.mesh(H.boxGeo(0.42, 0.015, 0.018), M.blackMatte, lx(leafCc[0]), head + 0.07, -0.01);
  closerArm.rotation.z = 0.45;
  wg.add(closerArm);
}

// ---------- plain interior door, CLOSED: cased opening + painted slab -----------
function buildDoor(wg, lx, T, e) {
  const c0 = e.c0, c1 = e.c1, head = e.head ?? 2.04;
  const ow = c1 - c0, xc = (lx(c0) + lx(c1)) / 2;
  const trimW = 0.09;

  // casing on the interior face: two full-height legs + head
  wg.add(H.boxOnFloor(trimW, head + 0.005, 0.022, M.trim, lx(c0 - trimW / 2), 0, 0.012));
  wg.add(H.boxOnFloor(trimW, head + 0.005, 0.022, M.trim, lx(c1 + trimW / 2), 0, 0.012));
  wg.add(H.boxOnFloor(ow + 2 * trimW, 0.09, 0.022, M.trim, xc, head + 0.005, 0.012));

  // painted slab mid-reveal, 4 mm perimeter reveal all round
  const slabT = 0.04;
  wg.add(H.boxOnFloor(ow - 0.008, head - 0.012, slabT, doorSlabMat(e.color || '#e9e4d8'),
    xc, 0.004, -T / 2));
  // dark hinge-side gap line, slightly proud of the slab so it reads as a seam
  wg.add(H.boxOnFloor(0.006, head - 0.012, slabT + 0.006, M.baseboard, lx(c0 + 0.006), 0.004, -T / 2));

  // chrome lever on the latch side, rosette through the slab, handles both faces
  const hx = lx(c1 - 0.075), hy = 1.03;
  const rose = H.mesh(new THREE.CylinderGeometry(0.023, 0.023, slabT + 0.024, 14), M.chrome, hx, hy, -T / 2);
  rose.rotation.x = Math.PI / 2;
  wg.add(rose);
  const leverGeo = H.boxGeo(0.115, 0.016, 0.016);
  const lvX = lx(c1 - 0.12);
  wg.add(H.mesh(leverGeo, M.chrome, lvX, hy, -T / 2 + slabT / 2 + 0.014));
  wg.add(H.mesh(leverGeo, M.chrome, lvX, hy, -T / 2 - slabT / 2 - 0.014));
}

// ---------- radiator enclosure against a wall ------------------------------------
function buildRadiator(wg, lx, e) {
  const xc = (lx(e.c0) + lx(e.c1)) / 2;
  const len = e.c1 - e.c0, h = e.h, d = e.d;
  wg.add(H.boxOnFloor(len - 0.07, h - 0.075, d - 0.03, M.radiator, xc, 0.025, 0.02 + (d - 0.03) / 2));   // body
  wg.add(H.boxOnFloor(len, 0.055, d - 0.002, M.radiator, xc, h - 0.055, 0.002 + (d - 0.002) / 2));       // top cap
  wg.add(H.boxOnFloor(len - 0.16, 0.006, d - 0.10, M.baseboard, xc, h - 0.002, 0.02 + (d - 0.03) / 2));  // top slot grille
  wg.add(H.boxOnFloor(len - 0.16, 0.028, 0.005, M.baseboard, xc, h - 0.135, d - 0.009));                 // front slot band (subtle)
  const capZ = 0.004 + (d - 0.005) / 2;
  wg.add(H.boxOnFloor(0.035, h - 0.02, d - 0.005, M.radiator, lx(e.c0 + 0.0135), 0.015, capZ));          // end cap
  wg.add(H.boxOnFloor(0.035, h - 0.02, d - 0.005, M.radiator, lx(e.c1 - 0.0135), 0.015, capZ));          // end cap
}

// Cove runs along a wall: [0.003, len-0.003] minus floor-reaching openings.
function coveSegments(len, blocked) {
  let segs = [[0.003, len - 0.003]];
  for (const [b0, b1] of blocked) {
    const out = [];
    for (const [a0, a1] of segs) {
      if (b1 <= a0 || b0 >= a1) { out.push([a0, a1]); continue; }
      if (b0 > a0) out.push([a0, b0]);
      if (b1 < a1) out.push([b1, a1]);
    }
    segs = out;
  }
  return segs.filter(s => s[1] - s[0] > 0.02);
}

export function buildShell() {
  const g = new THREE.Group();
  g.name = 'shell';

  const room = S.room;
  const coveT = 0.012;

  // ---------- floor ----------------------------------------------------------------
  const floorMat = new THREE.MeshStandardMaterial({
    map: TEX.floor(room.w, room.d, S.floor || {}),
    roughness: S.floor?.roughness ?? 0.58, metalness: 0.0,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.d), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(room.w / 2, 0, room.d / 2);
  g.add(floor);

  // ---------- ceiling (faces down; invisible from above) ---------------------------
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.d), M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(room.w / 2, room.h, room.d / 2);
  g.add(ceiling);

  // ---------- walls (inward faces only) ---------------------------------------------
  // K is z=0 along +X, W is x=0 along +Z, B is z=room.d along +X, F is x=room.w
  // along +Z (rooms-schema.md). org/rotY orient each wall group's frame; flip
  // marks the two walls whose local X runs against the spec's along axis.
  const WALLS = {
    K: { len: room.w, rotY: 0, org: [0, 0, 0], flip: false },
    W: { len: room.d, rotY: Math.PI / 2, org: [0, 0, room.d], flip: true },
    B: { len: room.w, rotY: Math.PI, org: [room.w, 0, room.d], flip: true },
    F: { len: room.d, rotY: -Math.PI / 2, org: [room.w, 0, 0], flip: false },
  };

  // collect the openings that pierce each wall
  const open = { K: [], W: [], B: [], F: [] };
  for (const e of S.windows) if (open[e.wall]) {
    open[e.wall].push({ kind: 'window', c0: e.c0, c1: e.c1, y0: e.sill, y1: e.head });
  }
  for (const e of S.glazedWalls) if (open[e.wall]) {
    open[e.wall].push({ kind: 'glazed', c0: e.c0, c1: e.sideliteC1 ?? e.c1, y0: 0, y1: e.transomTop });
  }
  // (spec.js does not default doors like the other arrays, so guard it)
  const doors = S.doors || [];
  for (const e of doors) if (open[e.wall]) {
    open[e.wall].push({ kind: 'door', c0: e.c0, c1: e.c1, y0: 0, y1: e.head ?? 2.04 });
  }

  // wall thickness: deep masonry reveal where a double-hung window sits (the sash
  // stack needs it), slimmer storefront slab for glazed entries, 0.10 otherwise.
  const thick = w => open[w].some(o => o.kind === 'window') ? 0.30
    : open[w].some(o => o.kind === 'glazed') ? 0.12 : 0.10;

  const eps = 1e-6;
  for (const wname of ['K', 'W', 'B', 'F']) {
    const def = WALLS[wname];
    const lx = c => (def.flip ? def.len - c : c);
    const T = thick(wname);
    const ops = open[wname];

    const wg = new THREE.Group();
    wg.rotation.y = def.rotY;
    wg.position.set(def.org[0], def.org[1], def.org[2]);
    g.add(wg);

    // slab: holes must stay interior to the extrude outline, so a hole reaching
    // the floor or a wall end oversizes the slab slightly (hidden outside the room)
    let xPad0 = 0, xPad1 = 0;
    const yPad = ops.some(o => o.y0 <= eps) ? 0.04 : 0;
    const holes = ops.map(o => {
      const x0 = def.flip ? def.len - o.c1 : o.c0;
      if (x0 <= eps) xPad0 = 0.06;
      if (x0 + (o.c1 - o.c0) >= def.len - eps) xPad1 = 0.06;
      return { x: x0, y: o.y0, w: o.c1 - o.c0, h: o.y1 - o.y0 };
    });
    for (const hh of holes) { hh.x += xPad0; hh.y += yPad; }
    const slab = inwardWall(def.len + xPad0 + xPad1, room.h + yPad, T, holes, wallMat(S.wallColors[wname]));
    slab.position.set(-xPad0, -yPad, -T);
    wg.add(slab);

    // opening assemblies + radiators, all in the wall-local frame
    for (const e of S.windows) if (e.wall === wname) buildWindow(wg, lx, T, e);
    for (const e of S.glazedWalls) if (e.wall === wname) buildGlazed(wg, lx, e);
    for (const e of doors) if (e.wall === wname) buildDoor(wg, lx, T, e);
    for (const e of S.radiators) if (e.wall === wname) buildRadiator(wg, lx, e);

    // dark vinyl cove base, skipping floor-reaching openings (door casings too)
    if (S.cove.h > 0) {
      const blocked = ops.filter(o => o.y0 <= eps)
        .map(o => (o.kind === 'door' ? [o.c0 - 0.1, o.c1 + 0.1] : [o.c0, o.c1]));
      for (const [a0, a1] of coveSegments(def.len, blocked)) {
        wg.add(H.boxOnFloor(a1 - a0, S.cove.h, coveT, M.baseboard,
          (lx(a0) + lx(a1)) / 2, 0, 0.002 + coveT / 2));
      }
    }

    // exterior backdrops (FrontSide, facing the room only), ~0.85m past the wall,
    // centered on the wall's openings
    for (const bd of S.backdrops) if (bd.behind === wname) {
      const ctr = ops.length
        ? ops.reduce((s, o) => s + (o.c0 + o.c1) / 2, 0) / ops.length
        : def.len / 2;
      let geo, yC, mat;
      if (bd.kind === 'campus') {
        geo = [3.6, 2.9]; yC = 1.75;
        mat = new THREE.MeshBasicMaterial({ map: TEX.windowBackdrop() });
      } else if (bd.kind === 'sunroom') {
        geo = [3.2, 2.9]; yC = 1.5;
        mat = new THREE.MeshBasicMaterial({ map: TEX.sunroomBackdrop() });
      } else {
        geo = [3.6, 2.9]; yC = 1.45;
        mat = new THREE.MeshBasicMaterial({ color: bd.color || PAL.sky });
      }
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(geo[0], geo[1]), mat);
      bm.position.set(lx(ctr), yC, -0.85);
      bm.userData.noShadow = true;
      wg.add(bm);
    }
  }

  // ---------- stub partition walls (interior, boxes are fine) ------------------------
  for (const st of S.stubs) {
    const alongX = st.plane !== 'x';            // plane "z": slab at z=at, runs along X
    const wallLen = alongX ? room.w : room.d;   // extent of the along axis
    const span = alongX ? room.d : room.w;      // room extent across the stub plane
    g.add(alongX
      ? H.boxOnFloor(st.c1 - st.c0, room.h, st.t, M.wallCream, (st.c0 + st.c1) / 2, 0, st.at + st.t / 2)
      : H.boxOnFloor(st.t, room.h, st.c1 - st.c0, M.wallCream, st.at + st.t / 2, 0, (st.c0 + st.c1) / 2));

    // cove along the exposed long face (the side away from the nearest parallel
    // wall) and around any free end; ends touching a wall get none
    if (S.cove.h > 0) {
      const cove = (la, lb, aC, bC) => (alongX
        ? H.boxOnFloor(la, S.cove.h, lb, M.baseboard, aC, 0, bC)
        : H.boxOnFloor(lb, S.cove.h, la, M.baseboard, bC, 0, aC));
      const far = st.at + st.t / 2 < span / 2;
      const bF = far ? st.at + st.t + 0.002 + coveT / 2 : st.at - 0.002 - coveT / 2;
      const a0 = Math.max(st.c0, 0.003), a1 = Math.min(st.c1, wallLen - 0.003);
      g.add(cove(a1 - a0, coveT, (a0 + a1) / 2, bF));
      const e0 = far ? st.at - 0.002 : st.at - 0.014;
      const e1 = far ? st.at + st.t + 0.014 : st.at + st.t + 0.002;
      if (st.c0 > 0.01) g.add(cove(coveT, e1 - e0, st.c0 - 0.002 - coveT / 2, (e0 + e1) / 2));
      if (st.c1 < wallLen - 0.01) g.add(cove(coveT, e1 - e0, st.c1 + 0.002 + coveT / 2, (e0 + e1) / 2));
    }
  }

  H.applyShadows(g);
  return g;
}
