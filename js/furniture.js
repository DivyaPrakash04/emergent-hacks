// js/furniture.js — dining-side furniture: banquette (WALL B), 4 white tables,
// 6 birch café chairs + 1 cream shell chair, Brute-style trash can.
// Contract: CONTRACT.md. All dims/positions come from S (js/spec.js), world meters.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { S } from './spec.js';
import { PAL, M, TEX } from './materials.js';
import * as H from './helpers.js';

const DEG = Math.PI / 180;

// Up-axis of a Y-cylinder after rotation.set(rx, 0, rz) (three.js 'XYZ' Euler).
function legUp(rx, rz) {
  return new THREE.Vector3(-Math.sin(rz), Math.cos(rx) * Math.cos(rz), Math.sin(rx) * Math.cos(rz));
}

// Slim splayed steel leg: top end tucked in at (ax, topY, az), foot on the floor.
function placeLeg(geo, mat, len, ax, topY, az, rx, rz) {
  const m = new THREE.Mesh(geo, mat);
  m.rotation.set(rx, 0, rz);
  const u = legUp(rx, rz);
  m.position.set(ax - u.x * len / 2, topY - u.y * len / 2, az - u.z * len / 2);
  return m;
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

export function buildFurniture() {
  const g = new THREE.Group();
  g.name = 'furniture';

  // ---------- materials (one instance each, reused everywhere) ----------
  const matBanqBase = new THREE.MeshStandardMaterial({ color: PAL.banqBase, roughness: 0.85 });
  const matBanqSeat = new THREE.MeshStandardMaterial({ map: TEX.fabric(PAL.banqSeat, 8, false), roughness: 0.96 });
  const matBanqBack = new THREE.MeshStandardMaterial({
    map: TEX.fabric(PAL.banqBack, 12, true), color: '#b5aea2', roughness: 0.96,
  });
  const matBirch = new THREE.MeshStandardMaterial({ map: TEX.wood(PAL.chairWood, 1.5), roughness: 0.5 });
  const matCream = new THREE.MeshStandardMaterial({ color: PAL.baseCab, roughness: 0.35 });
  const matTrashBody = new THREE.MeshStandardMaterial({ color: PAL.trash, roughness: 0.72, flatShading: true });
  const matVoid = new THREE.MeshStandardMaterial({ color: '#111213', roughness: 0.95 });

  /* ============ BANQUETTE — WALL B (z = S.room.d) ============ */
  {
    const B = S.banquette, zWall = S.room.d;
    const len = B.x1 - B.x0, cx = (B.x0 + B.x1) * 0.5;

    // black plinth, recessed behind the upholstered front (shadow gap)
    const plinthD = 0.47;
    g.add(H.boxOnFloor(len - 0.08, B.plinthH, plinthD, matBanqBase, cx, 0, zWall - 0.004 - plinthD / 2));

    // charcoal upholstered seat frame (the front face below the cushions)
    const frameH = 0.35 - B.plinthH;
    const frameD = B.seatD - 0.015;
    g.add(H.boxOnFloor(len, frameH, frameD, matBanqSeat, cx, B.plinthH, zWall - 0.004 - frameD / 2));

    // seat + back cushions, split every ~seamPitch with 9 mm seams
    const n = Math.max(1, Math.round(len / B.seamPitch)); // 4 sections
    const gap = 0.009;
    const cw = (len - (n - 1) * gap) / n;

    const seatT = 0.13;
    const seatGeo = new RoundedBoxGeometry(cw, seatT, B.seatD, 3, 0.042); // soft front edge
    const tilt = B.backTilt * DEG;
    const backH = 0.50;
    const backGeo = new RoundedBoxGeometry(cw, backH, B.backT, 3, 0.045); // rounded top/ends

    // tilt back cushions so the top-back corner kisses the wall at backTop
    const bcy = B.backTop - (backH / 2) * Math.cos(tilt);
    const bcz = (zWall - 0.005) - ((backH / 2) * Math.sin(tilt) + (B.backT / 2) * Math.cos(tilt));

    for (let i = 0; i < n; i++) {
      const x = B.x0 + cw / 2 + i * (cw + gap);
      g.add(H.mesh(seatGeo, matBanqSeat, x, B.seatH - seatT / 2, zWall - 0.0025 - B.seatD / 2));
      const back = H.mesh(backGeo, matBanqBack, x, bcy, bcz);
      back.rotation.x = tilt; // recline toward the wall
      g.add(back);
    }
  }

  /* ============ 4 WHITE TABLES in a row (long sides abutting along X) ============ */
  {
    const T = S.tables;
    const w = T.w - 0.006, d = T.d - 0.004; // small reveal where tops abut (no z-fight)
    const topGeo = new RoundedBoxGeometry(w, T.topT, d, 2, 0.006);
    const bandH = 0.012; // cornflower edge band just under the top edge
    const bandGeo = new THREE.BoxGeometry(w, bandH, d);
    const rxA = 8 * DEG, rzA = 5 * DEG; // leg splay: 8° to the room, 5° along the row
    const legTopY = T.h - T.topT - bandH + 0.014;
    const legLen = legTopY / (Math.cos(rxA) * Math.cos(rzA));
    const legGeo = new THREE.CylinderGeometry(0.015, 0.012, legLen, 12);

    for (const tx of T.cxs) {
      g.add(H.mesh(topGeo, M.tableTop, tx, T.h - T.topT / 2, T.cz));
      g.add(H.mesh(bandGeo, M.tableEdge, tx, T.h - T.topT - bandH / 2, T.cz));
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const ax = tx + sx * (w / 2 - 0.09);
          const az = T.cz + sz * (d / 2 - 0.07);
          g.add(placeLeg(legGeo, M.tableLeg, legLen, ax, legTopY, az, -sz * rxA, sx * rzA));
        }
      }
    }
  }

  /* ============ CAFÉ CHAIRS (one constructor, cloned) ============ */
  // Default orientation: seat faces +Z (back panel on the -Z side); spec rotY applied on top.
  const panGeo = new RoundedBoxGeometry(0.43, 0.026, 0.41, 2, 0.009);
  const backGeoC = new RoundedBoxGeometry(0.43, 0.19, 0.016, 2, 0.007); // used twice (bent-ply arc)
  const cSplay = 6 * DEG;
  const cLegTop = 0.442;
  const cLegLen = cLegTop / (Math.cos(cSplay) * Math.cos(cSplay));
  const cLegGeo = new THREE.CylinderGeometry(0.011, 0.009, cLegLen, 10);

  function makeChair(shellMat) {
    const c = new THREE.Group();
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

  const birchProto = makeChair(matBirch);
  S.chairs.birch.forEach((p, i) => {
    const c = i === 0 ? birchProto : birchProto.clone();
    c.position.set(p.x, 0, p.z);
    c.rotation.y = p.rotY;
    g.add(c);
  });
  const creamProto = makeChair(matCream);
  S.chairs.cream.forEach((p, i) => {
    const c = i === 0 ? creamProto : creamProto.clone();
    c.position.set(p.x, 0, p.z);
    c.rotation.y = p.rotY;
    g.add(c);
  });

  /* ============ TRASH CAN (gray Brute + white liner) ============ */
  {
    const T = S.trash;
    const bodyH = T.h - 0.03; // rolled rim brings total to ~T.h
    // 14-sided faceted body = molded vertical rib hints
    const body = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r * 0.8, bodyH, 14, 1), matTrashBody);
    body.position.set(T.x, bodyH / 2, T.z);
    g.add(body);
    // rolled rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(T.r + 0.004, 0.016, 10, 28), M.trash);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(T.x, bodyH, T.z);
    g.add(rim);
    // dark interior void just below the opening
    const voidC = new THREE.Mesh(new THREE.CylinderGeometry(T.r - 0.055, T.r - 0.09, 0.28, 18), matVoid);
    voidC.position.set(T.x, bodyH - 0.045 - 0.14, T.z);
    g.add(voidC);
    // white liner folded over the rim, hanging ~10 cm down the outside, wavy edge
    const liner = H.lathe([
      [T.r - 0.045, bodyH - 0.05],
      [T.r - 0.030, bodyH + 0.012],
      [T.r + 0.006, bodyH + 0.026],
      [T.r + 0.026, bodyH - 0.006],
      [T.r + 0.019, bodyH - 0.10],
    ], M.liner, 36);
    linerWobble(liner.geometry, bodyH);
    liner.position.set(T.x, 0, T.z);
    liner.userData.noShadow = true;
    g.add(liner);
  }

  H.applyShadows(g);
  return g;
}
