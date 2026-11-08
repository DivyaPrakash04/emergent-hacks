// Lighting — environment, spec-driven fixtures (cube pendants + flush ceiling
// discs from S.lighting) and a daylight rig derived from the room's openings
// (S.windows / S.glazedWalls). See CONTRACT.md and rooms-schema.md. Only module
// allowed to create lights, set scene.environment / scene.background, and use
// RoomEnvironment + PMREM.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { S } from './spec.js';
import { PAL, M } from './materials.js';
import * as H from './helpers.js';

// Wall planes (rooms-schema.md): K z=0 faces +Z, W x=0 faces +X,
// B z=room.d faces -Z, F x=room.w faces -X. Opening coords c0/c1 run along X
// for K/B and along Z for W/F. wallPoint() maps (c, y, inset) to world space,
// where `inset` is the signed distance INTO the room from the wall plane
// (negative = outside, behind the glass).
function wallPoint(wall, c, y, inset) {
  switch (wall) {
    case 'K': return new THREE.Vector3(c, y, inset);
    case 'B': return new THREE.Vector3(c, y, S.room.d - inset);
    case 'W': return new THREE.Vector3(inset, y, c);
    case 'F': return new THREE.Vector3(S.room.w - inset, y, c);
    default: return new THREE.Vector3(S.room.w / 2, y, S.room.d / 2);
  }
}
// Room span along the wall's inward normal (how deep the room is behind it).
function wallDepth(wall) {
  return (wall === 'K' || wall === 'B') ? S.room.d : S.room.w;
}

export function buildLighting(renderer, scene) {
  const g = new THREE.Group();
  g.name = 'lighting';

  const ceil = S.room.h;
  const L = S.lighting; // { pendants: [], ceiling: [], pendantGeom: {} } (spec.js defaults)
  const hasWindows = S.windows.length > 0;

  // ---------- environment + backdrop (dollhouse exterior) ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  envScene.dispose?.();
  scene.background = new THREE.Color(PAL.sky).multiplyScalar(0.86); // overcast sky, slightly darkened

  // ---------- shadow budget: at most 2 casters in the scene ----------
  // 1) the window directional (only when windows exist), plus
  // 2) the first LIT pendant. A windowless room has no directional, so the
  //    first lit pendant — or, with no lit pendant, the first lit flush disc —
  //    carries the single point-light shadow instead.
  const pendantShadowIdx = L.pendants.findIndex(p => p.lit);
  const flushShadowIdx = (!hasWindows && pendantShadowIdx < 0)
    ? L.ceiling.findIndex(c => c.lit && (c.type || 'flush') === 'flush')
    : -1;
  function pointShadow(pt, far) {
    pt.castShadow = true;
    pt.shadow.mapSize.set(1024, 1024);
    pt.shadow.bias = -0.0005;
    pt.shadow.camera.near = 0.05;
    pt.shadow.camera.far = far;
  }

  // ---------- pendant fixtures (cube shades; geometry from S.lighting.pendantGeom) ----------
  if (L.pendants.length) {
    const C = L.pendantGeom.cube;             // shade cube size (0.30 default)
    const botY = L.pendantGeom.bottomY;       // cube bottom height (2.10 default)
    const topY = botY + C;
    const midY = (botY + topY) / 2;
    const bar = 0.009;                        // slim frame bar

    // local materials (shared M.* stay untouched)
    const stemMat = new THREE.MeshStandardMaterial({ color: '#4b4e52', roughness: 0.45, metalness: 0.7 });
    const shadeOffMat = M.pendantLit.clone(); // dull mustard-tan, no glow
    shadeOffMat.color.set('#c6a24f');
    shadeOffMat.emissiveIntensity = 0;
    const diffLitMat = new THREE.MeshStandardMaterial({
      color: '#f4f1e6', emissive: '#fff3dd', emissiveIntensity: 4.0, roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const diffOffMat = new THREE.MeshStandardMaterial({ color: PAL.ambient, roughness: 0.55 });

    // shared geometry
    const canopyGeo = new THREE.CylinderGeometry(0.052, 0.064, 0.022, 20);
    const stemGeo = new THREE.CylinderGeometry(L.pendantGeom.stemR, L.pendantGeom.stemR, ceil - topY + 0.01, 10);
    const panelGeo = H.boxGeo(C, C, 0.004);                 // fabric side panel
    const capGeo = H.boxGeo(C - 0.012, 0.01, C - 0.012);    // metal top plate
    const diffGeo = H.boxGeo(C - 0.024, 0.006, C - 0.024);  // acrylic bottom diffuser
    const vBarGeo = H.boxGeo(bar, C, bar);
    const hBarGeo = H.boxGeo(C + bar, bar, bar);

    function pendantFixture(p) {
      const f = new THREE.Group();
      f.position.set(p.x, 0, p.z);
      const shadeMat = p.lit ? M.pendantLit : shadeOffMat;
      const diffMat = p.lit ? diffLitMat : diffOffMat;

      // canopy disc + stem down to the cube top
      f.add(H.mesh(canopyGeo, M.pendantFrame, 0, ceil - 0.011, 0));
      f.add(H.mesh(stemGeo, stemMat, 0, (ceil + topY - 0.01) / 2, 0));

      // 4 fabric panels, metal cap, bottom diffuser — all noShadow so the glow escapes
      const glow = [];
      glow.push(H.mesh(panelGeo, shadeMat, 0, midY, C / 2 - 0.002));
      glow.push(H.mesh(panelGeo, shadeMat, 0, midY, -(C / 2 - 0.002)));
      const pe = H.mesh(panelGeo, shadeMat, C / 2 - 0.002, midY, 0); pe.rotation.y = Math.PI / 2;
      const pw = H.mesh(panelGeo, shadeMat, -(C / 2 - 0.002), midY, 0); pw.rotation.y = Math.PI / 2;
      glow.push(pe, pw);
      glow.push(H.mesh(capGeo, M.pendantFrame, 0, topY - 0.006, 0));
      glow.push(H.mesh(diffGeo, diffMat, 0, botY + 0.006, 0));
      for (const m of glow) { m.userData.noShadow = true; f.add(m); }

      // slim metal edging: top/bottom rims + 4 corner posts
      for (const y of [botY + bar / 2, topY - bar / 2]) {
        for (const s of [-1, 1]) {
          f.add(H.mesh(hBarGeo, M.pendantFrame, 0, y, s * C / 2));
          const zb = H.mesh(hBarGeo, M.pendantFrame, s * C / 2, y, 0);
          zb.rotation.y = Math.PI / 2;
          f.add(zb);
        }
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) f.add(H.mesh(vBarGeo, M.pendantFrame, sx * C / 2, midY, sz * C / 2));
      }
      return f;
    }

    L.pendants.forEach((p, i) => {
      g.add(pendantFixture(p));
      if (!p.lit) return;
      // warm 2700K source inside the shade, slightly below cube center (physical falloff)
      const pt = new THREE.PointLight(0xffb45e, 19, 6, 2);
      pt.position.set(p.x, midY - 0.07, p.z);
      if (i === pendantShadowIdx) pointShadow(pt, 6); // first lit pendant only (perf)
      g.add(pt);
    });
  }

  // ---------- flush ceiling discs (S.lighting.ceiling, type "flush") ----------
  if (L.ceiling.length) {
    const flushOffMat = new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.5 });
    const flushLitMat = new THREE.MeshStandardMaterial({
      color: '#f6efdd', emissive: '#ffe2b0', emissiveIntensity: 2.4, roughness: 0.45,
    });
    L.ceiling.forEach((f, i) => {
      if ((f.type || 'flush') !== 'flush') return; // only "flush" defined in schema v1
      const r = f.r ?? 0.15;
      // squashed white dome just below the ceiling + thin metal trim ring
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        f.lit ? flushLitMat : flushOffMat);
      dome.scale.y = 0.55;
      dome.position.set(f.x, ceil - 0.002, f.z);
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.016, 28), M.pendantFrame);
      ring.position.set(f.x, ceil - 0.008, f.z);
      dome.userData.noShadow = true; // hugs the ceiling; must never occlude its own light
      ring.userData.noShadow = true;
      g.add(dome, ring);
      if (!f.lit) return;
      const pt = new THREE.PointLight(0xffe2b0, 10, 7, 2); // warm wash just below the disc
      pt.position.set(f.x, ceil - r * 0.55 - 0.06, f.z);
      if (i === flushShadowIdx) pointShadow(pt, 7);
      g.add(pt);
    });
  }

  // ---------- daylight rig (overcast, no sun) ----------
  // Windowless interiors get ~35% more hemisphere + ambient so they aren't dead.
  const fill = hasWindows ? 1 : 1.35;
  g.add(new THREE.HemisphereLight(0xbfccd8, 0x66625a, 0.45 * fill)); // sky cool / ground warm-gray
  g.add(new THREE.AmbientLight(0x3f444c, 0.18 * fill));              // flat fill so shadows don't crush

  // cool daylight through EVERY window: a RectAreaLight the size of the glass,
  // just inside the wall plane, aimed into the room and tilted down.
  for (const win of S.windows) {
    const cMid = (win.c0 + win.c1) / 2;
    const rect = new THREE.RectAreaLight(0xdfe8f0, 8.5, win.c1 - win.c0, win.head - win.sill);
    rect.position.copy(wallPoint(win.wall, cMid, (win.sill + win.head) / 2, 0.03));
    rect.lookAt(wallPoint(win.wall, cMid, 1.0, wallDepth(win.wall) / 2));
    g.add(rect);
  }

  // borrowed light through each glazed interior wall: weaker, grayer rect
  for (const gw of S.glazedWalls) {
    const c1 = gw.sideliteC1 ?? gw.c1; // sidelite extends the glass span
    const cMid = (gw.c0 + c1) / 2;
    const rect = new THREE.RectAreaLight(0xd8e0e4, 2.0, c1 - gw.c0 - 0.1, 2.1);
    rect.position.copy(wallPoint(gw.wall, cMid, 1.4, 0.02));
    rect.lookAt(wallPoint(gw.wall, cMid, 1.0, wallDepth(gw.wall) / 2));
    g.add(rect);
  }

  // soft directional from OUTSIDE the first window's wall, through the opening
  // toward room center — the one broad shadow shaper.
  if (hasWindows) {
    const win = S.windows[0];
    const cMid = (win.c0 + win.c1) / 2;
    const key = new THREE.DirectionalLight(0xccd9e4, 0.8);
    key.position.copy(wallPoint(win.wall, cMid, 2.6, -2.5)); // 2.5 m behind the glass
    key.target.position.set(S.room.w / 2, 0.6, S.room.d / 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 7;
    const sc = key.shadow.camera;
    sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4;
    sc.near = 0.5; sc.far = 14;
    g.add(key, key.target);
  }

  H.applyShadows(g);
  return g;
}
