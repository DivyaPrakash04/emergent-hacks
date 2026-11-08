// Lighting — environment, 3 cube pendants (2 lit / 1 off) and the daylight rig.
// See CONTRACT.md and specs/lighting.md. Only module allowed to create lights,
// set scene.environment / scene.background, and use RoomEnvironment + PMREM.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { S } from './spec.js';
import { PAL, M } from './materials.js';
import * as H from './helpers.js';

export function buildLighting(renderer, scene) {
  const g = new THREE.Group();
  g.name = 'lighting';

  // ---------- environment + backdrop (dollhouse exterior) ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  envScene.dispose?.();
  scene.background = new THREE.Color(PAL.sky).multiplyScalar(0.86); // overcast sky, slightly darkened

  // ---------- pendant fixtures (frames 028 / 035 / 038) ----------
  const C = S.pendant.cube;                 // 0.30 shade cube
  const botY = S.pendant.bottomY;           // 2.10
  const topY = botY + C;                    // 2.40 cube top
  const midY = (botY + topY) / 2;
  const ceil = S.room.h;
  const bar = 0.009;                        // slim frame bar

  // local materials (shared M.* stay untouched)
  const stemMat = new THREE.MeshStandardMaterial({ color: '#4b4e52', roughness: 0.45, metalness: 0.7 });
  const shadeOffMat = M.pendantLit.clone(); // dull mustard-tan, no glow (frame 028/030)
  shadeOffMat.color.set('#c6a24f');
  shadeOffMat.emissiveIntensity = 0;
  const diffLitMat = new THREE.MeshStandardMaterial({
    color: '#f4f1e6', emissive: '#fff3dd', emissiveIntensity: 4.0, roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const diffOffMat = new THREE.MeshStandardMaterial({ color: PAL.ambient, roughness: 0.55 });

  // shared geometry
  const canopyGeo = new THREE.CylinderGeometry(0.052, 0.064, 0.022, 20);
  const stemGeo = new THREE.CylinderGeometry(S.pendant.stemR, S.pendant.stemR, ceil - topY + 0.01, 10);
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

  S.pendants.forEach((p, i) => {
    g.add(pendantFixture(p));
    if (!p.lit) return;
    // warm 2700K source inside the shade, slightly below cube center (physical falloff)
    const pt = new THREE.PointLight(0xffb45e, 19, 6, 2);
    pt.position.set(p.x, midY - 0.07, p.z);
    if (i === 1) { // only the mid pendant casts shadow (perf)
      pt.castShadow = true;
      pt.shadow.mapSize.set(1024, 1024);
      pt.shadow.bias = -0.0005;
      pt.shadow.camera.near = 0.05;
      pt.shadow.camera.far = 6;
    }
    g.add(pt);
  });

  // ---------- daylight rig (overcast, no sun — specs/lighting.md §2/§6) ----------
  g.add(new THREE.HemisphereLight(0xbfccd8, 0x66625a, 0.45)); // sky cool / ground warm-gray
  g.add(new THREE.AmbientLight(0x3f444c, 0.18));              // flat fill so shadows don't crush

  // cool daylight through the single big window on WALL W (x = 0), facing +X, tilted down.
  // One window here vs two in the source recipe -> intensity nudged 7.5 -> 8.5.
  const winZ = (S.window.z0 + S.window.z1) / 2;
  const winL = new THREE.RectAreaLight(
    0xdfe8f0, 8.5,
    S.window.z1 - S.window.z0,          // 1.52 opening width
    S.window.head - S.window.sill,      // 1.60 glass height
  );
  winL.position.set(0.03, (S.window.sill + S.window.head) / 2, winZ);
  winL.lookAt(2.6, 1.0, winZ);
  g.add(winL);

  // borrowed lounge light through the glazed entry on WALL F (x = room.w), facing -X
  const doorZ = (S.doors.z0 + S.doors.sideliteZ1) / 2;
  const doorL = new THREE.RectAreaLight(0xd8e0e4, 2.0, S.doors.sideliteZ1 - S.doors.z0 - 0.1, 2.1);
  doorL.position.set(S.room.w - 0.02, 1.4, doorZ);
  doorL.lookAt(3.0, 1.0, doorZ);
  g.add(doorL);

  // soft directional from outside the window — the one broad shadow shaper
  const key = new THREE.DirectionalLight(0xccd9e4, 0.8);
  key.position.set(-2.5, 2.6, winZ);
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

  H.applyShadows(g);
  return g;
}
