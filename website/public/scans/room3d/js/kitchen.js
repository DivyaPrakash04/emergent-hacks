// js/kitchen.js — the WALL K kitchen run (z = 0): backsplash tile, counter run
// with base cabinets / accessible knee bay, drop-in sink + twin goosenecks,
// GE slide-in range + under-cabinet hood + doored cabinet above, open cubby
// shelving, top-freezer fridge, countertop microwave, pantry-nook shelves and
// the three OFF light bars. All layout values come from S (js/spec.js).
// See CONTRACT.md for coordinate system and rules.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { S } from './spec.js';
import { PAL, M, TEX } from './materials.js';
import * as H from './helpers.js';

export function buildKitchen() {
  const g = new THREE.Group();
  g.name = 'kitchen';

  const CT = S.counter.h;          // 0.91 counter height
  const CTH = S.counter.t;         // 0.04 top thickness
  const SHT = S.cubbies.shelfT;    // 0.019 melamine
  const CUD = S.cubbies.depth;     // 0.30 cubby depth
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const NS = (m) => { m.userData.noShadow = true; return m; };

  // ---------- local materials ----------
  const counterEdge = std({ color: PAL.counter, roughness: 0.45 });
  const glassBlack = std({ color: '#0d0e10', roughness: 0.14, metalness: 0.25 });
  const sinkSteel = std({ color: '#c3c7c9', roughness: 0.3, metalness: 0.85 });
  const burnerMat = std({ color: '#222326', roughness: 0.35, metalness: 0.15 });
  const lensMat = std({ color: '#efede4', roughness: 0.45 });   // frosted, lights OFF
  const clockMat = std({ color: '#09130b', emissive: '#34d158', emissiveIntensity: 1.1 });
  const dispMat = std({ color: '#0b0e13', emissive: '#7fb5f2', emissiveIntensity: 0.8 });
  const glowHint = std({ color: '#2e3136', roughness: 0.3 });
  const drainMat = std({ color: '#70757a', roughness: 0.4, metalness: 0.8 });
  const counterMat = (w, d) => std({ map: TEX.counter(w, d), roughness: 0.38 });

  // ---------- shared small geometries / assemblies ----------
  const standoffGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 0.034, 10);
  standoffGeo.rotateX(Math.PI / 2);
  const _bars = new Map();
  const barGeo = (len, r) => {
    const k = `${len}|${r}`;
    if (!_bars.has(k)) _bars.set(k, new THREE.CylinderGeometry(r, r, len, 12));
    return _bars.get(k);
  };
  // vertical tube pull: bar + two standoffs, chrome
  const vHandle = (x, yC, len, zFace, r = 0.0085) => {
    g.add(H.mesh(barGeo(len, r), M.chrome, x, yC, zFace + 0.032));
    g.add(H.mesh(standoffGeo, M.chrome, x, yC + len / 2 - 0.03, zFace + 0.016));
    g.add(H.mesh(standoffGeo, M.chrome, x, yC - len / 2 + 0.03, zFace + 0.016));
  };
  const doorSlab = (x0, x1, y0, y1, zFront, mat = M.baseCab) =>
    H.mesh(H.boxGeo(x1 - x0, y1 - y0, 0.018), mat, (x0 + x1) / 2, (y0 + y1) / 2, zFront - 0.009);

  // ====================================================== backsplash tile
  const tilePlane = (x0, x1, y0, y1, texFn, seed, z, rotY = 0) => {
    const w = x1 - x0, h = y1 - y0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      std({ map: texFn(w, h, seed), roughness: 0.22 }));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    m.rotation.y = rotY;
    return NS(m);
  };
  const sb = S.splash.subway, mo = S.splash.mosaic, rg = S.range;
  g.add(tilePlane(sb.x0, sb.x1, sb.y0, sb.y1, TEX.subway, 15, 0.003)); // black glass, behind microwave
  g.add(tilePlane(mo.x0, rg.x0, mo.y0, mo.y1, TEX.mosaic, 9, 0.003));
  g.add(tilePlane(rg.x0, rg.x1, mo.y0, S.hood.y0, TEX.mosaic, 10, 0.003)); // rises to hood behind range
  g.add(tilePlane(rg.x1, mo.x1, mo.y0, mo.y1, TEX.mosaic, 11, 0.003));     // continues into pantry nook
  // tile return on the stub wall's inner (nook-facing) face
  g.add(tilePlane(S.stub.x0, S.stub.x1, mo.y0, mo.y1, TEX.mosaic, 12, S.stub.z - 0.004, Math.PI));

  // ====================================================== counter tops
  const [segA, segB] = S.counter.segs;              // [[1.35,3.50],[4.26,5.05]]
  const sinkX0 = S.sink.cx - S.sink.w / 2, sinkX1 = S.sink.cx + S.sink.w / 2;
  const sinkZ0 = 0.075, sinkZ1 = sinkZ0 + S.sink.d; // rear-of-counter basin
  const sinkZc = (sinkZ0 + sinkZ1) / 2;
  const topY = CT - CTH / 2;
  const topPiece = (x0, x1, z0, z1) =>
    g.add(H.mesh(H.boxGeo(x1 - x0, CTH, z1 - z0), counterMat(x1 - x0, z1 - z0),
      (x0 + x1) / 2, topY, (z0 + z1) / 2));
  // segment A with the sink cut-out
  topPiece(segA[0], sinkX0, 0.002, 0.602);
  topPiece(sinkX1, segA[1], 0.002, 0.602);
  topPiece(sinkX0, sinkX1, 0.002, sinkZ0);
  topPiece(sinkX0, sinkX1, sinkZ1, 0.602);
  // segment B (through the pantry nook to the F wall)
  topPiece(segB[0], segB[1] - 0.004, 0.002, 0.602);
  // rounded laminate nose strips (25 mm overhang feel past cabinet faces)
  const nose = (x0, x1) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, CTH + 0.004, 0.024, 2, 0.008), counterEdge);
    m.position.set((x0 + x1) / 2, topY, 0.602);
    g.add(m);
  };
  nose(segA[0], segA[1]);
  nose(segB[0], segB[1] - 0.004);

  // ====================================================== base cabinets / knee bay
  const toeH = S.counter.toeH, baseTop = CT - CTH; // 0.87 underside of top
  const toe = (x0, x1) =>
    g.add(H.mesh(H.boxGeo(x1 - x0, toeH, 0.505), M.toeKick, (x0 + x1) / 2, toeH / 2, 0.2725));

  // white 2-door cabinet under the microwave zone
  const mc = S.microCab;
  g.add(H.mesh(H.boxGeo(mc.x1 - mc.x0, baseTop - toeH, 0.537), M.baseCab,
    (mc.x0 + mc.x1) / 2, (toeH + baseTop) / 2, 0.2885));
  g.add(doorSlab(mc.x0 + 0.003, (mc.x0 + mc.x1) / 2 - 0.0015, 0.115, 0.855, 0.575));
  g.add(doorSlab((mc.x0 + mc.x1) / 2 + 0.0015, mc.x1 - 0.003, 0.115, 0.855, 0.575));
  vHandle((mc.x0 + mc.x1) / 2 - 0.038, 0.60, 0.30, 0.575);
  vHandle((mc.x0 + mc.x1) / 2 + 0.038, 0.60, 0.30, 0.575);
  toe(mc.x0 + 0.02, mc.x1 - 0.02);

  // open accessible knee bay: white back panel + thin cheeks + apron
  const ko = S.counter.kneeOpen;
  g.add(H.mesh(H.boxGeo(ko[1] - ko[0], baseTop - 0.005, 0.02), M.baseCab,
    (ko[0] + ko[1]) / 2, (baseTop + 0.005) / 2, 0.016));
  g.add(H.mesh(H.boxGeo(0.018, baseTop, 0.537), M.baseCab, ko[0] + 0.009, baseTop / 2, 0.2885));
  g.add(H.mesh(H.boxGeo(0.05, baseTop, 0.555), M.baseCab, (ko[1] + segA[1]) / 2, baseTop / 2, 0.2975)); // support panel by range
  g.add(H.mesh(H.boxGeo(ko[1] - ko[0] - 0.036, 0.09, 0.018), M.baseCab,
    (ko[0] + ko[1]) / 2, baseTop - 0.045, 0.548)); // apron strip under the top

  // nook base: white single-door cabinet (per frames 000/003) + end cheek at the mouth
  g.add(H.mesh(H.boxGeo(0.018, baseTop, 0.555), M.baseCab, segB[0] + 0.009, baseTop / 2, 0.2975));
  g.add(H.mesh(H.boxGeo(0.768, baseTop - toeH, 0.537), M.baseCab, 4.662, (toeH + baseTop) / 2, 0.2885));
  g.add(doorSlab(4.313, 5.013, 0.115, 0.855, 0.575));
  vHandle(4.357, 0.62, 0.32, 0.575);
  toe(4.298, 5.026);

  // ====================================================== sink + faucets
  const rim = H.rectFrame(0.545, 0.425, 0.02, 0.006, sinkSteel);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(S.sink.cx, CT + 0.002, sinkZc);
  g.add(rim);
  const bd = 0.195; // bowl depth
  const bwY = CT - bd / 2 + 0.002;
  g.add(H.mesh(H.boxGeo(S.sink.w, bd, 0.008), sinkSteel, S.sink.cx, bwY, sinkZ0 + 0.004));
  g.add(H.mesh(H.boxGeo(S.sink.w, bd, 0.008), sinkSteel, S.sink.cx, bwY, sinkZ1 - 0.004));
  g.add(H.mesh(H.boxGeo(0.008, bd, S.sink.d - 0.016), sinkSteel, sinkX0 + 0.004, bwY, sinkZc));
  g.add(H.mesh(H.boxGeo(0.008, bd, S.sink.d - 0.016), sinkSteel, sinkX1 - 0.004, bwY, sinkZc));
  g.add(H.mesh(H.boxGeo(S.sink.w - 0.016, 0.01, S.sink.d - 0.016), sinkSteel,
    S.sink.cx, CT - bd + 0.007, sinkZc));
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), drainMat);
  drain.rotation.x = -Math.PI / 2;
  drain.position.set(S.sink.cx, CT - bd + 0.014, sinkZc);
  g.add(NS(drain));

  // twin tall gooseneck faucets with lever handles, deck-mounted behind the basin
  const leverGeo = new THREE.CylinderGeometry(0.0045, 0.006, 0.06, 8);
  const gooseneck = (x, sc) => {
    const pts = [[0, 0, 0], [0, 0.26, 0], [0, 0.345, 0.012], [0, 0.397, 0.055],
      [0, 0.386, 0.105], [0, 0.342, 0.14], [0, 0.30, 0.148]]
      .map(v => new THREE.Vector3(v[0] * sc, v[1] * sc, v[2] * sc));
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0115 * sc, 10), M.chrome));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * sc, 0.023 * sc, 0.045, 16), M.chrome);
    base.position.y = 0.0225;
    grp.add(base);
    const lever = new THREE.Mesh(leverGeo, M.chrome);
    lever.position.set(0.03 * sc, 0.052, 0.012);
    lever.rotation.set(0, 0.3, -0.5);
    grp.add(lever);
    grp.position.set(x, CT - 0.002, 0.039); // base sits on the rear deck
    g.add(grp);
  };
  gooseneck(2.70, 1);
  gooseneck(2.92, 0.84);

  // ====================================================== GE slide-in range
  const rxc = (rg.x0 + rg.x1) / 2, rw = rg.x1 - rg.x0 - 0.01; // 0.75 body
  g.add(H.mesh(H.boxGeo(rw - 0.05, 0.08, 0.57), M.blackMatte, rxc, 0.04, 0.315));       // plinth
  g.add(H.mesh(H.boxGeo(rw, 0.78, 0.63), M.stainlessRange, rxc, 0.47, 0.33));           // carcass
  g.add(NS(H.mesh(new THREE.PlaneGeometry(rw, 0.78), M.blackMatte, rxc, 0.47, 0.6475))); // dark reveal
  g.add(H.mesh(H.boxGeo(rw, 0.02, 0.667), glassBlack, rxc, CT - 0.01, 0.339));          // black glass cooktop
  const burner = (x, z, r) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(r, 28), burnerMat);
    b.rotation.x = -Math.PI / 2;
    b.position.set(x, CT + 0.002, z);
    g.add(NS(b));
  };
  burner(3.69, 0.47, 0.10);
  burner(3.69, 0.195, 0.072);
  burner(4.07, 0.47, 0.085);
  burner(4.07, 0.195, 0.072);
  // slim back rail (S.range.backH) with stainless cap
  g.add(H.mesh(H.boxGeo(rw, S.range.backH - 0.008, 0.05), glassBlack, rxc, CT + (S.range.backH - 0.008) / 2, 0.037));
  g.add(H.mesh(H.boxGeo(rw, 0.008, 0.056), M.stainlessRange, rxc, CT + S.range.backH - 0.004, 0.037));
  // front control band: 4 knobs + oval display (per frames 005/010, GE slide-in)
  g.add(H.mesh(H.boxGeo(rw, 0.064, 0.02), M.stainlessRange, rxc, 0.856, 0.656));
  const knobGeo = new THREE.CylinderGeometry(0.016, 0.0175, 0.02, 16);
  knobGeo.rotateX(Math.PI / 2);
  [3.60, 3.695, 4.065, 4.16].forEach(kx => g.add(H.mesh(knobGeo, M.chrome, kx, 0.856, 0.676)));
  g.add(H.mesh(H.boxGeo(0.13, 0.036, 0.008), M.blackMatte, rxc, 0.856, 0.670));
  g.add(NS(H.mesh(new THREE.PlaneGeometry(0.08, 0.015), dispMat, rxc, 0.858, 0.6765)));
  // oven door + window + stainless top strip + wide tube handle + drawer
  const ovenDoor = new THREE.Mesh(new RoundedBoxGeometry(rw - 0.014, 0.49, 0.02, 2, 0.005), M.blackMatte);
  ovenDoor.position.set(rxc, 0.565, 0.66);
  g.add(ovenDoor);
  g.add(NS(H.mesh(new THREE.PlaneGeometry(0.56, 0.30), glassBlack, rxc, 0.525, 0.6725)));
  g.add(H.mesh(H.boxGeo(rw - 0.014, 0.07, 0.024), M.stainlessRange, rxc, 0.775, 0.663));
  const rangeStand = new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10);
  rangeStand.rotateX(Math.PI / 2);
  g.add(H.mesh(rangeStand, M.stainlessRange, 3.60, 0.782, 0.695));
  g.add(H.mesh(rangeStand, M.stainlessRange, 4.16, 0.782, 0.695));
  const rangeHandle = H.mesh(barGeo(0.67, 0.0135), M.stainlessRange, rxc, 0.782, 0.722);
  rangeHandle.rotation.z = Math.PI / 2;
  g.add(rangeHandle);
  const drawer = new THREE.Mesh(new RoundedBoxGeometry(rw - 0.014, 0.185, 0.016, 2, 0.004), M.stainlessRange);
  drawer.position.set(rxc, 0.2075, 0.657);
  g.add(drawer);

  // ====================================================== range hood (wedge profile)
  const hd = S.hood;
  const hs = new THREE.Shape(); // u = -z, v = y
  hs.moveTo(0, hd.y0);
  hs.lineTo(-hd.d, hd.y0);
  hs.lineTo(-hd.d, hd.y0 + 0.11);
  hs.lineTo(-0.12, hd.y1);
  hs.lineTo(0, hd.y1);
  hs.closePath();
  const hood = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: hd.x1 - hd.x0, bevelEnabled: false }), M.stainless);
  hood.rotation.y = Math.PI / 2; // local +Z -> world +X, u -> -z
  hood.position.set(hd.x0, 0, 0.004);
  g.add(hood);
  // small light recess + frosted lens (OFF) + two rocker switches front-right
  g.add(H.mesh(H.boxGeo(0.21, 0.01, 0.13), M.blackMatte, 3.88, hd.y0 - 0.004, 0.30));
  const hoodLens = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.11), lensMat);
  hoodLens.rotation.x = Math.PI / 2;
  hoodLens.position.set(3.88, hd.y0 - 0.011, 0.30);
  g.add(NS(hoodLens));
  g.add(H.mesh(H.boxGeo(0.02, 0.012, 0.01), M.blackPlastic, 4.12, hd.y0 + 0.055, 0.508));
  g.add(H.mesh(H.boxGeo(0.02, 0.012, 0.01), M.blackPlastic, 4.155, hd.y0 + 0.055, 0.508));

  // doored white cabinet band above the hood
  const hc = S.hoodCab;
  g.add(H.mesh(H.boxGeo(rg.x1 - rg.x0, hc.y1 - hc.y0, 0.32), M.cubby,
    rxc, (hc.y0 + hc.y1) / 2, 0.165));
  g.add(H.mesh(H.boxGeo(0.3755, hc.y1 - hc.y0 - 0.006, 0.016), M.baseCab, 3.69075, (hc.y0 + hc.y1) / 2, 0.333));
  g.add(H.mesh(H.boxGeo(0.3755, hc.y1 - hc.y0 - 0.006, 0.016), M.baseCab, 4.06925, (hc.y0 + hc.y1) / 2, 0.333));
  g.add(H.mesh(barGeo(0.095, 0.0055), M.chrome, 3.8575, 1.96, 0.349));
  g.add(H.mesh(barGeo(0.095, 0.0055), M.chrome, 3.9025, 1.96, 0.349));

  // ====================================================== open cubby shelving
  // back panel + top/bottom boards + cheeks + dividers (visible 19 mm edges)
  const cubbyRun = (x0, x1, y0, y1, nCells, midShelf = false) => {
    const w = x1 - x0, h = y1 - y0, zc = CUD / 2 + 0.002, yc = y0 + h / 2;
    g.add(H.mesh(H.boxGeo(w, h, 0.014), M.cubby, x0 + w / 2, yc, 0.011));
    g.add(H.mesh(H.boxGeo(w, SHT, CUD), M.cubby, x0 + w / 2, y0 + SHT / 2, zc));
    g.add(H.mesh(H.boxGeo(w, SHT, CUD), M.cubby, x0 + w / 2, y1 - SHT / 2, zc));
    const vGeo = H.boxGeo(SHT, h - 2 * SHT, CUD);
    g.add(H.mesh(vGeo, M.cubby, x0 + SHT / 2, yc, zc));
    g.add(H.mesh(vGeo, M.cubby, x1 - SHT / 2, yc, zc));
    const pitch = (w - 2 * SHT) / nCells;
    for (let k = 1; k < nCells; k++) g.add(H.mesh(vGeo, M.cubby, x0 + SHT + pitch * k, yc, zc));
    if (midShelf) g.add(H.mesh(H.boxGeo(w - 2 * SHT, SHT, CUD - 0.01), M.cubby, x0 + w / 2, yc, zc - 0.005));
  };
  const tb = S.cubbies.top;
  cubbyRun(tb.x0, rg.x0, tb.y0, tb.y1, 5);  // west of hood cabinet: 5 cells
  cubbyRun(rg.x1, tb.x1, tb.y0, tb.y1, 2);  // east, over the nook: 2 cells (~7 total)
  const [mzSink, mzNook, mzMicro] = S.cubbies.midZones;
  cubbyRun(mzSink.x0, mzSink.x1, mzSink.y0, mzSink.y1, 3);            // over sink
  cubbyRun(mzMicro.x0, mzMicro.x1, mzMicro.y0, mzMicro.y1 - 0.001, 3); // over microwave
  cubbyRun(mzNook.x0, mzNook.x1, mzNook.y0, mzNook.y1, 1, true);       // nook: 2 simple open shelves

  // ====================================================== top-freezer fridge
  const fr = S.fridge, fxc = (fr.x0 + fr.x1) / 2, fw = fr.x1 - fr.x0;
  g.add(H.mesh(H.boxGeo(fw - 0.16, 0.065, 0.58), M.blackMatte, fxc, 0.0325, 0.345));   // plinth
  g.add(H.mesh(H.boxGeo(fw - 0.01, fr.h - 0.065, 0.67), M.fridgeSide,                  // gloss black body
    fxc, 0.065 + (fr.h - 0.065) / 2, 0.37));
  const fridgeDoor = (y0, y1) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(fw - 0.016, y1 - y0, 0.028, 2, 0.007), M.stainlessFridge);
    m.position.set(fxc, (y0 + y1) / 2, 0.719);
    g.add(m);
  };
  fridgeDoor(0.075, fr.freezerSplit - 0.0015);  // fresh-food door
  fridgeDoor(fr.freezerSplit + 0.0015, fr.h - 0.0035); // freezer door, 3 mm gap
  // long vertical tube handles on the EAST edge (hinges on the window side)
  vHandle(fr.x1 - 0.075, 0.67, 0.86, 0.733, 0.012);
  vHandle(fr.x1 - 0.075, 1.445, 0.37, 0.733, 0.012);

  // ====================================================== countertop microwave
  const mi = S.micro;
  g.add(H.mesh(H.boxGeo(mi.w - 0.06, 0.012, 0.05), M.blackPlastic, mi.cx, CT + 0.006, 0.07));  // feet
  g.add(H.mesh(H.boxGeo(mi.w - 0.06, 0.012, 0.05), M.blackPlastic, mi.cx, CT + 0.006, 0.36));
  const miY = CT + 0.012 + (mi.h - 0.012) / 2;
  g.add(H.mesh(H.boxGeo(mi.w, mi.h - 0.012, mi.d), M.blackMatte, mi.cx, miY, 0.03 + mi.d / 2));
  const miFrame = H.rectFrame(mi.w - 0.042, mi.h - 0.054, 0.021, 0.012, M.stainlessRange);
  miFrame.position.set(mi.cx, miY, 0.03 + mi.d + 0.002);
  g.add(miFrame);
  const miFace = 0.03 + mi.d; // 0.41
  g.add(H.mesh(H.boxGeo(0.335, mi.h - 0.056, 0.006), glassBlack, mi.cx - 0.0615, miY, miFace + 0.001)); // dark glass door
  const miGlow = new THREE.Mesh(new THREE.CircleGeometry(0.065, 24), glowHint); // faint inner glow hint
  miGlow.position.set(mi.cx - 0.0615, miY, miFace + 0.0065);
  g.add(NS(miGlow));
  g.add(H.mesh(H.boxGeo(0.117, mi.h - 0.056, 0.008), M.blackMatte, mi.cx + 0.1705, miY, miFace + 0.002)); // control panel
  g.add(H.mesh(H.boxGeo(0.05, 0.014, 0.004), clockMat, mi.cx + 0.1705, miY + 0.084, miFace + 0.009));     // green clock

  // ====================================================== OFF linear light bars
  S.lightBars.forEach(b => {
    const w = b.x1 - b.x0, xc = (b.x0 + b.x1) / 2;
    g.add(H.mesh(H.boxGeo(w, 0.045, 0.09), M.baseCab, xc, b.y - 0.0225, b.z)); // slim white housing
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.02, 0.07), lensMat);
    lens.rotation.x = Math.PI / 2; // faces down
    lens.position.set(xc, b.y - 0.047, b.z);
    g.add(NS(lens));
  });

  H.applyShadows(g);
  return g;
}
