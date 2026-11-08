// shell.js — architectural shell: floor, ceiling, inward-facing walls, pantry stub,
// cove base, double-hung window + deep sill, glazed aluminum entry, radiator and
// exterior backdrop billboards. See CONTRACT.md; all dims from spec.js.
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

export function buildShell() {
  const g = new THREE.Group();
  g.name = 'shell';

  const room = S.room, WIN = S.window, D = S.doors, R = S.radiator, stub = S.stub;

  // ---------- floor ----------------------------------------------------------------
  const floorMat = new THREE.MeshStandardMaterial({
    map: TEX.floor(room.w, room.d), roughness: 0.58, metalness: 0.0,
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
  const T_K = 0.10, T_B = 0.10, T_W = 0.30, T_F = 0.12;

  // WALL K (z = 0, faces +Z) — solid, cream.
  const wallK = inwardWall(room.w, room.h, T_K, [], M.wallCream);
  wallK.position.set(0, 0, -T_K);
  g.add(wallK);

  // WALL B (z = room.d, faces -Z) — solid, pale butter yellow (frames 031/035).
  const wallB = inwardWall(room.w, room.h, T_B, [], M.wallYellow);
  wallB.rotation.y = Math.PI;
  wallB.position.set(room.w, 0, room.d + T_B);
  g.add(wallB);

  // WALL W (x = 0, faces +X) — thick masonry wall with the window punched out.
  // local x runs opposite world z: hole.x measured from the B-corner end.
  const winHole = { x: room.d - WIN.z1, y: WIN.sill, w: WIN.z1 - WIN.z0, h: WIN.head - WIN.sill };
  const wallW = inwardWall(room.d, room.h, T_W, [winHole], M.wallCream);
  wallW.rotation.y = Math.PI / 2;
  wallW.position.set(-T_W, 0, room.d);
  g.add(wallW);

  // WALL F (x = room.w, faces -X) — glazed-entry opening z0..sideliteZ1, floor to
  // transomTop. The opening reaches the floor and the B corner, so the slab is
  // oversized (0.04 below floor, 0.06 past the corner, both hidden) to keep the
  // hole interior to the extrude outline.
  const doorHole = { x: D.z0, y: 0.04, w: D.sideliteZ1 - D.z0, h: D.transomTop };
  const wallF = inwardWall(room.d + 0.06, room.h + 0.04, T_F, [doorHole], M.wallCream);
  wallF.rotation.y = -Math.PI / 2;
  wallF.position.set(room.w + T_F, -0.04, 0);
  g.add(wallF);

  // ---------- pantry stub wall (interior, box is fine) ------------------------------
  g.add(H.boxOnFloor(stub.x1 - stub.x0, room.h, stub.t, M.wallCream,
    (stub.x0 + stub.x1) / 2, 0, stub.z + stub.t / 2));

  // ---------- dark vinyl cove base ---------------------------------------------------
  const coveT = 0.012;
  const coveX = (x0, x1, z) => H.boxOnFloor(x1 - x0, S.cove.h, coveT, M.baseboard, (x0 + x1) / 2, 0, z);
  const coveZ = (z0, z1, x) => H.boxOnFloor(coveT, S.cove.h, z1 - z0, M.baseboard, x, 0, (z0 + z1) / 2);
  g.add(coveX(0.003, room.w - 0.003, 0.002 + coveT / 2));                 // WALL K
  g.add(coveX(0.003, room.w - 0.003, room.d - 0.002 - coveT / 2));        // WALL B
  g.add(coveZ(0.003, room.d - 0.003, 0.002 + coveT / 2));                 // WALL W
  g.add(coveZ(0.003, D.z0, room.w - 0.002 - coveT / 2));                  // WALL F, stops at door
  g.add(coveX(stub.x0, room.w - 0.003, stub.z + stub.t + 0.002 + coveT / 2)); // stub south face
  g.add(coveZ(stub.z - 0.002, stub.z + stub.t + 0.014, stub.x0 - 0.002 - coveT / 2)); // stub west end

  // ---------- WIN-1: white double-hung window on WALL W ------------------------------
  const zc = (WIN.z0 + WIN.z1) / 2;             // 2.31
  const ow = WIN.z1 - WIN.z0;                   // 1.52 opening width
  const oh = WIN.head - WIN.sill;               // 1.60 opening height
  const sashH = oh / 2;                         // 0.80 per sash
  const sashOW = ow - 0.008, sashOH = sashH - 0.008; // 4 mm channel gap all round
  const bar = 0.055, sashD = 0.045;
  const inW = sashOW - 2 * bar, inH = sashOH - 2 * bar;

  // casing: two side legs + head (bottom is the stool + apron)
  g.add(H.boxOnFloor(0.022, WIN.head - 0.853, WIN.trimW, M.trim, 0.012, 0.853, WIN.z0 - WIN.trimW / 2));
  g.add(H.boxOnFloor(0.022, WIN.head - 0.853, WIN.trimW, M.trim, 0.012, 0.853, WIN.z1 + WIN.trimW / 2));
  g.add(H.boxOnFloor(0.022, 0.09, ow + 2 * WIN.trimW, M.trim, 0.012, WIN.head, zc));

  // deep stool: runs from inside the reveal out past the wall face, with horns
  const stoolBack = -(T_W - 0.03);              // -0.27
  g.add(H.boxOnFloor(WIN.sillDepth, WIN.sillThick, ow + 2 * WIN.trimW + 0.06, M.trim,
    stoolBack + WIN.sillDepth / 2, WIN.sill - WIN.sillThick + 0.002, zc));
  // apron under the stool
  g.add(H.boxOnFloor(0.02, 0.089, ow + 2 * WIN.trimW, M.trim, 0.011, WIN.sill - WIN.sillThick - 0.088, zc));

  // upper sash: deep in the reveal, 3x2 muntin grid
  const upX = -0.26;
  const upYc = WIN.head - 0.004 - sashOH / 2;   // 2.05
  const upFrame = H.rectFrame(inW, inH, bar, sashD, M.sash);
  upFrame.rotation.y = Math.PI / 2;
  upFrame.position.set(upX, upYc, zc);
  g.add(upFrame);
  const upMunt = H.muntins(inW, inH, WIN.upperGrid[0], WIN.upperGrid[1], 0.02, 0.028, M.sash);
  upMunt.rotation.y = Math.PI / 2;
  upMunt.position.set(upX, upYc, zc);
  g.add(upMunt);
  const upGlass = new THREE.Mesh(new THREE.PlaneGeometry(inW + 0.06, inH + 0.06), M.glass);
  upGlass.rotation.y = Math.PI / 2;
  upGlass.position.set(upX - 0.01, upYc, zc);
  upGlass.userData.noShadow = true;
  g.add(upGlass);

  // lower sash: raised ~85% so it overlaps the upper (rails read doubled), room side
  const loX = -0.205;
  const loY0 = WIN.sill + 0.85 * sashH;         // 1.53 — clear strip below
  const loYc = loY0 + sashOH / 2;
  const loFrame = H.rectFrame(inW, inH, bar, sashD, M.sash);
  loFrame.rotation.y = Math.PI / 2;
  loFrame.position.set(loX, loYc, zc);
  g.add(loFrame);
  const loMunt = H.muntins(inW, inH, WIN.lowerGrid[0], WIN.lowerGrid[1], 0.016, 0.024, M.sash);
  loMunt.rotation.y = Math.PI / 2;
  loMunt.position.set(loX, loYc, zc);
  g.add(loMunt);
  const loGlass = new THREE.Mesh(new THREE.PlaneGeometry(inW + 0.06, inH + 0.06), M.glass);
  loGlass.rotation.y = Math.PI / 2;
  loGlass.position.set(loX - 0.01, loYc, zc);
  loGlass.userData.noShadow = true;
  g.add(loGlass);

  // hardware: two chrome cam locks on the lower sash top rail, two sash lifts below
  const lockGeo = H.boxGeo(0.035, 0.026, 0.06);
  const liftGeo = H.boxGeo(0.014, 0.022, 0.05);
  for (const dz of [-0.33, 0.33]) {
    g.add(H.mesh(lockGeo, M.chrome, loX, loY0 + sashOH + 0.014, zc + dz));
    g.add(H.mesh(liftGeo, M.chrome, loX + sashD / 2 + 0.006, loY0 + bar / 2, zc + dz * 0.91));
  }

  // ---------- radiator enclosure under the window ------------------------------------
  const rzc = (R.z0 + R.z1) / 2;
  const rLen = R.z1 - R.z0;
  g.add(H.boxOnFloor(0.19, R.h - 0.075, rLen - 0.07, M.radiator, 0.115, 0.025, rzc));      // body
  g.add(H.boxOnFloor(R.d - 0.002, 0.055, rLen, M.radiator, 0.002 + (R.d - 0.002) / 2, R.h - 0.055, rzc)); // top cap
  g.add(H.boxOnFloor(0.12, 0.006, rLen - 0.16, M.baseboard, 0.115, R.h - 0.002, rzc));     // top slot grille
  g.add(H.boxOnFloor(0.005, 0.028, rLen - 0.16, M.baseboard, 0.211, 0.465, rzc));          // front slot band (subtle)
  g.add(H.boxOnFloor(0.215, R.h - 0.02, 0.035, M.radiator, 0.1115, 0.015, R.z0 + 0.0135)); // end cap N
  g.add(H.boxOnFloor(0.215, R.h - 0.02, 0.035, M.radiator, 0.1115, 0.015, R.z1 - 0.0135)); // end cap S

  // ---------- glazed aluminum entry on WALL F (frame 038) ----------------------------
  const fD = 0.10;                     // frame depth, x room.w .. room.w+0.10
  const fx = room.w + fD / 2;          // 5.10
  const fT = D.frameT;                 // 0.06 member width
  const gzMidN = D.z0 + fT, gzMidS = D.sideliteZ1 - fT; // 2.93 .. 4.84 between jambs

  // continuous frame: jambs full height, head at transom top, transom bar at door head
  g.add(H.boxOnFloor(fD, D.transomTop, fT, M.doorMetal, fx, 0, D.z0 + fT / 2));            // N jamb
  g.add(H.boxOnFloor(fD, D.transomTop, fT, M.doorMetal, fx, 0, D.sideliteZ1 - fT / 2));    // S jamb (corner)
  const railGeo = H.boxGeo(fD, fT, gzMidS - gzMidN);
  g.add(H.mesh(railGeo, M.doorMetal, fx, D.transomTop - fT / 2, (gzMidN + gzMidS) / 2));   // head
  g.add(H.mesh(railGeo, M.doorMetal, fx, D.head + fT / 2, (gzMidN + gzMidS) / 2));         // transom bar
  g.add(H.mesh(H.boxGeo(fD, D.head, fT), M.doorMetal, fx, D.head / 2, D.z1 + fT / 2));     // mullion at sidelite
  g.add(H.mesh(H.boxGeo(0.14, 0.016, D.z1 - D.z0 - fT), M.doorMetal, room.w, 0.008,
    (D.z0 + fT + D.z1) / 2));                                                              // threshold

  // transom glass band across the whole opening
  const transGlass = new THREE.Mesh(new THREE.PlaneGeometry(gzMidS - gzMidN + 0.04, 0.17), M.glass);
  transGlass.rotation.y = -Math.PI / 2;
  transGlass.position.set(fx, (D.head + fT + D.transomTop - fT) / 2, (gzMidN + gzMidS) / 2);
  transGlass.userData.noShadow = true;
  g.add(transGlass);

  // fixed glass sidelite z1 .. sideliteZ1
  g.add(H.mesh(H.boxGeo(fD, 0.10, gzMidS - (D.z1 + fT) - 0.008), M.doorMetal, fx, 0.05,
    (D.z1 + fT + gzMidS) / 2));                                                            // bottom rail
  const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(gzMidS - (D.z1 + fT) + 0.04, 2.31), M.glass);
  sideGlass.rotation.y = -Math.PI / 2;
  sideGlass.position.set(fx - 0.002, 0.09 + 2.31 / 2, (D.z1 + fT + gzMidS) / 2);
  sideGlass.userData.noShadow = true;
  g.add(sideGlass);

  // two closed door leaves, aluminum frames with full-height glass
  const leafH = D.head - 0.02;                              // 2.33
  const zoneL = gzMidN + 0.004, zoneR = D.z1 - 0.004;
  const leafW = (zoneR - zoneL - 0.008) / 2;                // ~0.787, 8 mm meeting gap
  const lx = room.w + 0.035;                                // leaf plane center
  const leafCz = [zoneL + leafW / 2, zoneR - leafW / 2];
  const leafRailGeo = H.boxGeo(0.045, 0.20, leafW - 0.10);
  const leafMidGeo = H.boxGeo(0.045, 0.08, leafW - 0.10);
  const pullGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 12);
  const standGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.034, 8);
  const pullCz = [leafCz[0] + leafW / 2 - 0.07, leafCz[1] - leafW / 2 + 0.07];
  for (let i = 0; i < 2; i++) {
    const czi = leafCz[i];
    const lf = H.rectFrame(leafW - 0.10, leafH - 0.10, 0.05, 0.045, M.doorMetal);
    lf.rotation.y = -Math.PI / 2;
    lf.position.set(lx, 0.01 + leafH / 2, czi);
    g.add(lf);
    g.add(H.mesh(leafRailGeo, M.doorMetal, lx, 0.16, czi));          // tall bottom rail
    g.add(H.mesh(leafMidGeo, M.doorMetal, lx, 1.00, czi));           // lock rail
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.08, leafH - 0.12), M.glass);
    lg.rotation.y = -Math.PI / 2;
    lg.position.set(lx, 0.01 + leafH / 2, czi);
    lg.userData.noShadow = true;
    g.add(lg);
    g.add(H.mesh(pullGeo, M.chrome, room.w - 0.02, 1.05, pullCz[i])); // vertical pull bar
    for (const dy of [-0.145, 0.145]) {
      const so = H.mesh(standGeo, M.chrome, room.w - 0.002, 1.05 + dy, pullCz[i]);
      so.rotation.z = Math.PI / 2;
      g.add(so);
    }
  }
  // overhead closer on the north leaf
  g.add(H.mesh(H.boxGeo(0.05, 0.07, 0.28), M.blackMatte, room.w - 0.01, 2.295, leafCz[0] - 0.10));
  const closerArm = H.mesh(H.boxGeo(0.018, 0.015, 0.42), M.blackMatte, room.w + 0.01, 2.42, leafCz[0]);
  closerArm.rotation.x = -0.45;
  g.add(closerArm);

  // ---------- exterior backdrops (FrontSide, facing the room only) -------------------
  const bdW = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.9),
    new THREE.MeshBasicMaterial({ map: TEX.windowBackdrop() }));
  bdW.rotation.y = Math.PI / 2;                 // faces +X, into the room
  bdW.position.set(-0.85, 1.75, zc);
  bdW.userData.noShadow = true;
  g.add(bdW);

  const bdF = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.9),
    new THREE.MeshBasicMaterial({ map: TEX.sunroomBackdrop() }));
  bdF.rotation.y = -Math.PI / 2;                // faces -X, into the room
  bdF.position.set(room.w + 0.85, 1.5, (D.z0 + D.sideliteZ1) / 2);
  bdF.userData.noShadow = true;
  g.add(bdF);

  H.applyShadows(g);
  return g;
}
