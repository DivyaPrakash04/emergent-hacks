// decor.js — props[] catalog + the kitchenClutter preset (rooms-schema.md). See CONTRACT.md.
// buildDecor() iterates S.props[]: typed entries place parametric clutter at world
// x/y/z (y = height of the surface the prop rests on) with optional rotY/color/scale;
// {preset:"kitchenClutter"} replays the original Common Kitchen prop set against the
// spec's kitchen / stubs[0] / trashCan-furniture / glazedWalls[0] anchors.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { S } from './spec.js';
import { PAL, M, TEX } from './materials.js';
import * as H from './helpers.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

// ---------- shared unit geometries (scaled per instance) ----------
const UBOX = new THREE.BoxGeometry(1, 1, 1);
const UCYL = new THREE.CylinderGeometry(1, 1, 1, 20);
const UTAP = new THREE.CylinderGeometry(0.8, 1, 1, 20);        // tapered (dishes, platters)
const UPOT = new THREE.CylinderGeometry(1, 0.78, 1, 18);       // plant pot
const USHADE = new THREE.CylinderGeometry(0.72, 1, 1, 18, 1, true); // open lamp shade
const USPH = new THREE.SphereGeometry(1, 16, 12);
const UDOME = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const UICO = new THREE.IcosahedronGeometry(1, 0);              // crumpled wads
const UPLANE = new THREE.PlaneGeometry(1, 1);
const UCONE = new THREE.ConeGeometry(1, 1, 7);
const UTOR = new THREE.TorusGeometry(1, 0.16, 8, 18);          // mug handle
const UPILLOW = new RoundedBoxGeometry(1, 0.34, 0.68, 3, 0.1);
const UDUFFEL = new RoundedBoxGeometry(1, 0.52, 0.46, 3, 0.12);
const USLAB = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);        // towels, mats (scaled thin)
// open pan (lathe, normalized r=1 h=1)
const UPAN = new THREE.LatheGeometry(
  [[0.04, 0.06], [0.82, 0.06], [0.95, 0.12], [1.0, 1.0]].map(p => new THREE.Vector2(p[0], p[1])), 24);
// generic bottle (normalized r=1 h=1)
const UBOT = new THREE.LatheGeometry(
  [[0.03, 0], [0.9, 0.01], [1, 0.08], [1, 0.58], [0.52, 0.74], [0.38, 0.78], [0.38, 0.96],
   [0.43, 0.97], [0.43, 1.0], [0.03, 1.0]].map(p => new THREE.Vector2(p[0], p[1])), 20);

// milk/juice carton side art (lazy, shared by every carton instance)
let _cartonTex = null;
function cartonTex() {
  _cartonTex = _cartonTex || H.makeCanvasTexture(64, 160, (ctx, w, h) => {
    ctx.fillStyle = '#f2ecd8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e4c23a'; ctx.fillRect(0, 0, w, h * 0.3); ctx.fillRect(0, h * 0.86, w, h * 0.14);
    H.textLines(ctx, 8, h * 0.4, w - 16, 10, 4, '#6b6b5e', 12);
  });
  return _cartonTex;
}

// local-space part: unit geometry scaled to (sx,sy,sz), CENTERED at (x,y,z)
function part(gr, geo, mat, sx, sy, sz, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, mat);
  o.scale.set(sx, sy, sz);
  o.position.set(x, y, z);
  gr.add(o);
  return o;
}

// ====================================================================
// Typed prop constructors (rooms-schema.md props[] catalog).
// Each returns a Group whose origin is the resting point (base at local y=0);
// buildDecor() moves it to the entry's world x/y/z and applies rotY/scale.
// ====================================================================
const PROPS = {
  bottle(p) {
    const g = new THREE.Group();
    const h = p.h ?? 0.26, r = p.r ?? 0.034;
    part(g, UBOT, std({ color: p.color || PAL.bottle[0], roughness: 0.25 }), r, h, r);
    part(g, UCYL, std({ color: '#1d1e20', roughness: 0.5 }), r * 0.46, h * 0.07, r * 0.46, 0, h * 0.985, 0);
    return g;
  },

  jar(p) {
    const g = new THREE.Group();
    const h = 0.11, r = 0.042;
    const glass = M.glass.clone();
    glass.color = new THREE.Color(p.color || '#cfd8cc');
    glass.opacity = 0.35; glass.roughness = 0.15;
    part(g, UCYL, glass, r, h, r, 0, h / 2, 0).userData.noShadow = true;
    part(g, UCYL, M.paperFlat, r * 1.005, h * 0.38, r * 1.005, 0, h * 0.46, 0);  // label band
    part(g, UCYL, std({ color: '#c9a23a', roughness: 0.4, metalness: 0.5 }),
      r * 1.04, 0.016, r * 1.04, 0, h + 0.008, 0);                               // lid
    return g;
  },

  box(p) {
    const g = new THREE.Group();
    const w = p.w ?? 0.16, h = p.h ?? 0.12, d = p.d ?? 0.11;
    part(g, UBOX, std({ color: p.color || '#c9b58f', roughness: 0.62 }), w, h, d, 0, h / 2, 0);
    if (p.accent) {
      part(g, UBOX, std({ color: p.accent, roughness: 0.55 }), w * 1.01, h * 0.26, d * 1.01, 0, h * 0.78, 0);
    }
    return g;
  },

  // thin sheet; abstract print only (TEX.paper never draws real text).
  // Wall papers: give rotY so the face points away from the wall; y = bottom edge.
  paperSheet(p, seed) {
    const g = new THREE.Group();
    const w = p.w ?? 0.21, h = p.h ?? 0.28;
    const o = part(g, UPLANE, std({ map: TEX.paper(p.header || null, seed, 9), roughness: 0.92 }),
      w, h, 1, 0, h / 2, 0);
    o.userData.noShadow = true;
    return g;
  },

  poster(p, seed) {
    const g = new THREE.Group();
    const o = part(g, UPLANE, std({ map: TEX.infographic(seed), roughness: 0.9 }), 0.45, 0.57, 1, 0, 0.285, 0);
    o.userData.noShadow = true;
    return g;
  },

  bookStack(p, seed) {
    const g = new THREE.Group();
    const n = Math.max(2, Math.min(5, Math.round(p.count ?? 3)));
    const r = H.rng(97 + seed);
    const spines = ['#8a3b2e', '#2b4a7e', '#4f7a3a', '#b5932e', '#5b4a68', '#2e2f33'];
    let y = 0;
    for (let i = 0; i < n; i++) {
      const bw = 0.16 + r() * 0.06, bh = 0.024 + r() * 0.016, bd = 0.12 + r() * 0.04;
      const b = part(g, UBOX,
        std({ color: p.color || spines[Math.floor(r() * spines.length)], roughness: 0.7 }),
        bw, bh, bd, (r() - 0.5) * 0.025, y + bh / 2, (r() - 0.5) * 0.025);
      b.rotation.y = (r() - 0.5) * 0.45;
      y += bh;
    }
    return g;
  },

  plant(p, seed) {
    const g = new THREE.Group();
    const h = p.h ?? 0.26;
    const potH = h * 0.34, potR = Math.max(0.03, h * 0.23);
    part(g, UPOT, std({ color: p.color || '#a8674d', roughness: 0.78 }), potR, potH, potR, 0, potH / 2, 0);
    part(g, UCYL, std({ color: '#3a2d22', roughness: 1 }), potR * 0.86, 0.012, potR * 0.86, 0, potH - 0.004, 0);
    const leafM = [std({ color: '#4c7a3d', roughness: 0.8 }), std({ color: '#3d6631', roughness: 0.8 })];
    const r = H.rng(71 + seed);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + r();
      const lh = h * (0.45 + r() * 0.3);
      const cone = part(g, UCONE, leafM[i % 2], h * 0.1, lh, h * 0.1,
        Math.cos(a) * potR * 0.45, potH + lh / 2 - 0.01, Math.sin(a) * potR * 0.45);
      cone.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);           // lean outward
    }
    part(g, USPH, leafM[0], h * 0.11, h * 0.13, h * 0.11, 0, potH + h * 0.52, 0);
    return g;
  },

  mug(p) {
    const g = new THREE.Group();
    const m = std({ color: p.color || '#4f7ec2', roughness: 0.35 });
    const r = 0.041, h = 0.096;
    part(g, UCYL, m, r, h, r, 0, h / 2, 0);
    part(g, UTOR, m, 0.028, 0.028, 0.028, r + 0.017, h * 0.52, 0);             // handle loop
    return g;
  },

  pan(p) {
    const g = new THREE.Group();
    const r = p.r ?? 0.12;
    const m = std({ color: p.color || '#15161a', roughness: 0.42, side: THREE.DoubleSide });
    part(g, UPAN, m, r, r * 0.3, r);
    part(g, UBOX, m, r * 1.3, 0.012, 0.024, -r * 1.3, r * 0.27, 0);            // handle
    return g;
  },

  // small table lamp; lit = emissive warm shade ONLY, never a THREE light.
  lamp(p) {
    const g = new THREE.Group();
    const metal = std({ color: '#2c2d30', roughness: 0.4, metalness: 0.6 });
    part(g, UCYL, metal, 0.065, 0.018, 0.065, 0, 0.009, 0);                    // base
    part(g, UCYL, metal, 0.007, 0.215, 0.007, 0, 0.125, 0);                    // stem
    const shadeM = p.lit
      ? std({ color: '#2a1c08', emissive: '#f3a93c', emissiveIntensity: 1.15, roughness: 0.7, side: THREE.DoubleSide })
      : std({ color: p.color || '#e9dfc6', roughness: 0.85, side: THREE.DoubleSide });
    const shade = part(g, USHADE, shadeM, 0.085, 0.115, 0.085, 0, 0.275, 0);
    if (p.lit) shade.userData.noShadow = true;
    return g;
  },

  laptop(p) {
    const g = new THREE.Group();
    const dark = std({ color: '#26272b', roughness: 0.45, metalness: 0.35 });
    const w = 0.3, d = 0.21, t = 0.012;
    part(g, UBOX, dark, w, t, d, 0, t / 2, 0);                                 // base slab
    if (p.open !== false) {
      const sh = 0.2, a = -0.32;                                               // tilted back
      const s = part(g, UBOX, dark, w, sh, 0.007,
        0, t + Math.cos(a) * sh / 2, -d / 2 + 0.004 + Math.sin(a) * sh / 2);
      s.rotation.x = a;
    } else {
      part(g, UBOX, dark, w * 0.99, 0.008, d * 0.99, 0, t + 0.004, 0);         // closed lid
    }
    return g;
  },

  pillow(p) {
    const g = new THREE.Group();
    const w = p.w ?? 0.45;
    const o = new THREE.Mesh(UPILLOW, std({ color: p.color || '#e3dccb', roughness: 0.95 }));
    o.scale.set(w, w, w);
    o.position.y = w * 0.17;
    g.add(o);
    return g;
  },

  carton(p) {
    const g = new THREE.Group();
    const cartM = std({ map: cartonTex(), roughness: 0.92 });
    const topM = std({ color: p.color || '#e4c23a', roughness: 0.6 });
    const o = new THREE.Mesh(UBOX, [cartM, cartM, topM, cartM, cartM, cartM]);
    o.scale.set(0.07, 0.2, 0.07);
    o.position.y = 0.1;
    o.rotation.y = 0.15;                                                       // jaunty, as on the original sill
    g.add(o);
    return g;
  },

  // collapsed (blown-open) black umbrella — ported from the original sill prop.
  umbrella(p) {
    const g = new THREE.Group();
    const uM = std({ color: p.color || PAL.umbrella, roughness: 0.78 });
    const rr = H.rng(17);
    const base = part(g, UCONE, uM, 0.20, 0.085, 0.18, 0, 0.075, 0);
    base.rotation.x = Math.PI;                                                 // apex down, rim up
    for (let i = 0; i < 8; i++) {                                              // rib tips past the rim
      const a = (i / 8) * Math.PI * 2 + rr() * 0.25;
      const rib = part(g, UCYL, uM, 0.004, 0.085, 0.004,
        Math.cos(a) * 0.205, 0.105 + rr() * 0.02, Math.sin(a) * 0.185);
      rib.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
    }
    for (let i = 0; i < 5; i++) {                                              // crumple lobes in the bowl
      const a = (i / 5) * Math.PI * 2 + 0.5;
      part(g, USPH, uM, 0.075, 0.045, 0.065, Math.cos(a) * 0.09, 0.1, Math.sin(a) * 0.08);
    }
    const shaft = part(g, UCYL, M.blackPlastic, 0.007, 0.15, 0.007, -0.02, 0.1, 0);
    shaft.rotation.z = 0.35;                                                   // ferrule up-left
    part(g, USPH, M.blackPlastic, 0.016, 0.016, 0.016, -0.075, 0.245, 0);      // handle knob
    const strap = part(g, UBOX, uM, 0.02, 0.12, 0.004, 0.19, -0.03, -0.06);
    strap.rotation.z = 0.15;                                                   // strap over the ledge edge
    return g;
  },

  duffel(p) {
    const g = new THREE.Group();
    const w = p.w ?? 0.55;
    const m = std({ color: p.color || '#4a4e55', roughness: 0.8 });
    const dark = std({ color: '#24262a', roughness: 0.6 });
    const body = new THREE.Mesh(UDUFFEL, m);
    body.scale.set(w, w, w);
    body.position.y = w * 0.26;
    g.add(body);
    for (const sx of [-0.17, 0.17]) {                                          // wrap bands
      part(g, UBOX, dark, w * 0.05, w * 0.53, w * 0.47, sx * w, w * 0.26, 0);
    }
    part(g, UBOX, dark, w * 0.3, w * 0.035, w * 0.045, 0, w * 0.545, 0);       // grab-handle bar
    return g;
  },

  // wall-mounted mirror: hangs flat facing +Z before rotY, CENTERED at the
  // entry's y. Reflective look is fake — high metalness + envMap sheen only.
  mirror(p) {
    const g = new THREE.Group();
    const w = p.w ?? 0.5, h = p.h ?? 0.7;
    part(g, UBOX, std({ color: p.color || '#e8e6e0', roughness: 0.3, metalness: 0.4 }),
      w + 0.036, h + 0.036, 0.018, 0, 0, -0.002);                              // thin frame
    const face = part(g, UPLANE, std({ color: '#cfd6da', metalness: 0.9, roughness: 0.08 }),
      w, h, 1, 0, 0, 0.0085);
    face.userData.noShadow = true;
    return g;
  },

  // wall-mounted towel bar: chrome bar (along X, CENTERED at the entry's y) on
  // two standoffs into the wall (-Z), with a draped towel hanging over it.
  towelBar(p) {
    const g = new THREE.Group();
    const w = p.w ?? 0.6;
    const bar = part(g, UCYL, M.chrome, 0.011, w, 0.011, 0, 0, 0);
    bar.rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) {
      const st = part(g, UCYL, M.chrome, 0.009, 0.07, 0.009, sx * (w / 2 - 0.03), 0, -0.035);
      st.rotation.x = Math.PI / 2;
    }
    const tw = w * 0.55;
    const towelM = std({ color: p.color || '#d8d2c6', roughness: 0.92 });
    part(g, USLAB, towelM, tw, 0.034, 0.085, 0, 0.016, 0.004);                 // fold over the bar
    part(g, USLAB, towelM, tw, 0.33, 0.017, 0, -0.155, 0.034);                 // front drop
    part(g, USLAB, towelM, tw * 0.97, 0.26, 0.015, 0, -0.12, -0.03);           // back drop
    return g;
  },

  bathmat(p) {
    const g = new THREE.Group();
    const w = p.w ?? 0.6, d = p.d ?? 0.4;
    part(g, USLAB, std({ color: p.color || '#cdd6d2', roughness: 0.97 }), w, 0.014, d, 0, 0.007, 0);
    return g;
  },
};

// ====================================================================
// buildDecor — iterate S.props[]
// ====================================================================
export function buildDecor() {
  const g = new THREE.Group();
  g.name = 'decor';
  const warned = new Set();
  const warnOnce = (key, msg) => { if (!warned.has(key)) { warned.add(key); console.warn(msg); } };

  (S.props || []).forEach((p, i) => {
    if (p.preset) {
      if (p.preset === 'kitchenClutter') {
        if (S.kitchen) g.add(buildKitchenClutter());
        else warnOnce('preset:kitchenClutter', 'decor: preset "kitchenClutter" requires a kitchen block — skipped');
      } else {
        warnOnce(`preset:${p.preset}`, `decor: unknown preset "${p.preset}" — skipped`);
      }
      return;
    }
    const build = PROPS[p.type];
    if (!build) {
      warnOnce(`type:${p.type}`, `decor: unknown prop type "${p.type}" — skipped`);
      return;
    }
    const o = build(p, 40 + i * 7);                 // seed: deterministic per entry
    o.position.set(p.x || 0, p.y || 0, p.z || 0);
    if (p.rotY) o.rotation.y = p.rotY;
    if (p.scale) o.scale.multiplyScalar(p.scale);
    g.add(o);
  });

  H.applyShadows(g);
  return g;
}

// ====================================================================
// kitchenClutter preset — the original Common Kitchen prop set (specs/decor.md),
// re-anchored: counters/cubbies/range/kettle/micro/fridge from S.kitchen.*,
// stub from S.stubs[0], trash corner from the trashCan furniture item, the
// extinguisher/strobe/card-reader cluster from S.glazedWalls[0], dining crumbs
// from table/banquette furniture. The window-sill umbrella + carton are NOT
// here anymore — they are explicit props[] entries. Only called with S.kitchen.
// ====================================================================
function buildKitchenClutter() {
  const g = new THREE.Group();
  g.name = 'kitchenClutter';
  const add = (o) => { g.add(o); return o; };
  const K = S.kitchen;

  // ---------- materials ----------
  const mWhite = M.baseCab, mPaperM = M.paperFlat, mBlack = M.blackPlastic;
  const mSteel = M.toeKick, mChrome = M.chrome;
  const mIron = std({ color: '#1b1c1d', roughness: 0.62, side: THREE.DoubleSide });
  const mPanB = std({ color: '#121315', roughness: 0.4, side: THREE.DoubleSide });
  const mPanRed = std({ color: PAL.panRed, roughness: 0.45 });
  const mGloss = std({ color: '#f4f3ef', roughness: 0.25 });
  const mGlassK = M.glass.clone(); mGlassK.opacity = 0.38;                 // kettle
  mGlassK.color = new THREE.Color('#c8d2d5'); mGlassK.roughness = 0.12;
  const mGlassB = M.glass.clone(); mGlassB.opacity = 0.3; mGlassB.color = new THREE.Color('#e4ece6');
  const mGlassD = M.glass.clone(); mGlassD.opacity = 0.16;                 // pie dish
  const mDomeG = std({ color: '#9aa0a3', roughness: 0.3, metalness: 0.65 });
  const mRedExt = std({ color: '#b32620', roughness: 0.35, metalness: 0.15 });
  const bagM = (hex, metal = 0.28, rough = 0.42) => std({ color: hex, roughness: rough, metalness: metal });
  const paperM = (tex) => std({ map: tex, roughness: 0.92 });

  // ---------- tiny canvas textures ----------
  const zebraTex = H.makeCanvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e8e6e0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#17181a'; ctx.lineWidth = 7;
    for (let i = -2; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * 12 - 20, h + 8); ctx.lineTo(i * 12 + 20, -8); ctx.stroke(); }
  }, { repeat: [2, 2] });
  const pizzaTop = H.makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2ee'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.posterBlue; ctx.fillRect(0, 6, w, 16); ctx.fillRect(0, h - 22, w, 16);
    ctx.fillStyle = PAL.posterRed; ctx.beginPath(); ctx.arc(w / 2, h / 2, 74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0e6cf'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 30, 0, Math.PI * 2); ctx.fill();
  });
  const pizzaSide = H.makeCanvasTexture(128, 32, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2ee'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.posterBlue; ctx.fillRect(10, h / 2 - 5, 42, 10);
    ctx.fillStyle = PAL.posterRed; ctx.fillRect(62, h / 2 - 5, 20, 10);
  });
  const navyCardT = H.makeCanvasTexture(96, 54, (ctx, w, h) => {
    ctx.fillStyle = PAL.paperWhite; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#22355c'; ctx.fillRect(0, 10, w, h - 20);
    H.textLines(ctx, 8, 18, w - 16, 9, 3, 'rgba(255,255,255,0.85)', 7);
  });
  const cardStickT = H.makeCanvasTexture(72, 48, (ctx, w, h) => {
    ctx.fillStyle = PAL.paperWhite; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = PAL.posterBlue; ctx.lineWidth = 5; ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#3f8a4f'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 12, 0, Math.PI * 2); ctx.fill();
  });

  // ---------- placement helpers ----------
  // floor-based box (y = base)
  function box(w, h, d, m, x, y, z, ry = 0, rz = 0, rx = 0) {
    const o = new THREE.Mesh(UBOX, m);
    o.scale.set(w, h, d);
    o.position.set(x, y + h / 2 + (rz ? Math.abs(Math.sin(rz)) * w * 0.18 : 0), z);
    o.rotation.set(rx, ry, rz);
    return add(o);
  }
  function cyl(rad, h, m, x, y, z) {
    const o = new THREE.Mesh(UCYL, m);
    o.scale.set(rad, h, rad); o.position.set(x, y + h / 2, z);
    return add(o);
  }
  function tapered(rad, h, m, x, y, z) {
    const o = new THREE.Mesh(UTAP, m);
    o.scale.set(rad, h, rad); o.position.set(x, y + h / 2, z);
    return add(o);
  }
  // paper plane; face: 'z+' (walls K/stub/fridge) or 'x-' (east wall)
  function sheet(tex, w, h, x, y, z, face = 'z+', tilt = 0) {
    const o = new THREE.Mesh(UPLANE, paperM(tex));
    o.scale.set(w, h, 1);
    o.position.set(x, y, z);
    if (face === 'x-') o.rotation.set(0, -Math.PI / 2, tilt);
    else o.rotation.set(0, 0, tilt);
    o.userData.noShadow = true;
    return add(o);
  }
  function bottle(r, h, m, x, y, z) {
    const o = new THREE.Mesh(UBOT, m);
    o.scale.set(r, h, r); o.position.set(x, y, z);
    return add(o);
  }
  function labelBand(r, h, x, y, z, m = mPaperM) {
    const o = cyl(r, h, m, x, y, z); return o;
  }
  function spiceJar(x, y, z, h = 0.11, bodyHex = '#cfc9ba', capHex = '#1d1e20') {
    cyl(0.019, h * 0.8, bagM(bodyHex, 0.05, 0.3), x, y, z);
    cyl(0.02, h * 0.2, std({ color: capHex, roughness: 0.5 }), x, y + h * 0.8, z);
  }

  // ---------- anchors (all from the spec) ----------
  const CY = K.counter.h;                       // counter top y
  const shT = K.cubbies.shelfT;
  const topY = K.cubbies.top.y0 + shT;          // top cubby band shelf surface
  const zSink = K.cubbies.midZones[0], zNook = K.cubbies.midZones[1], zMicro = K.cubbies.midZones[2];
  const sinkY = zSink.y0 + shT, nookY = zNook.y0 + shT, microY = zMicro.y0 + shT;
  const nookY2 = (zNook.y0 + zNook.y1) / 2 + shT / 2;   // nook mid-shelf surface (kitchen.js midShelf)
  const EW = S.room.w;                          // east wall plane
  const stub = S.stubs[0] || null;              // trash-corner partition
  const shelfEdgeZ = K.cubbies.depth + 0.006;   // taped-to-shelf-front plane

  // ====================================================================
  // K1 — cooktop: grill pan + mitt + spatula + skillet
  // ====================================================================
  const cookY = K.range.h + 0.006;
  const grill = new THREE.Mesh(UPAN, mIron);
  grill.scale.set(0.13, 0.042, 0.13); grill.position.set(3.88, cookY, 0.24); add(grill);
  box(0.09, 0.018, 0.034, mIron, 4.045, cookY + 0.016, 0.24);                       // stub handle (right)
  const mitt = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.035, 0.24, 2, 0.015),
    std({ map: zebraTex, roughness: 0.85 }));
  mitt.position.set(3.84, cookY + 0.052, 0.3); mitt.rotation.set(0.1, 0.5, 0.2); add(mitt);
  box(0.075, 0.006, 0.085, mBlack, 3.87, cookY + 0.044, 0.21);                      // spatula blade on rim
  box(0.17, 0.01, 0.022, mBlack, 3.99, cookY + 0.05, 0.16, -0.5, -0.1);             // spatula handle
  const skil = new THREE.Mesh(UPAN, mIron);
  skil.scale.set(0.12, 0.04, 0.12); skil.position.set(3.36, CY + 0.004, 0.22); add(skil);
  box(0.075, 0.016, 0.03, mIron, 3.21, CY + 0.014, 0.22);                           // short handle (left)

  // ====================================================================
  // K2 — sink run: dispensers, posters, stickers, dome, soap, sponges, T-fal
  // ====================================================================
  // paper-towel dispenser (white capsule)
  box(0.26, 0.3, 0.018, mWhite, 3.1, 1.03, 0.012);                                  // back plate
  const twl = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.32, 0.22, 3, 0.07), mGloss);
  twl.position.set(3.1, 1.18, 0.13); add(twl);
  const insetM = std({ color: '#6f7276', roughness: 0.5 });
  for (const sx of [-1, 1]) {
    const d = cyl(0.09, 0.008, insetM, 3.1 + sx * 0.151, 1.18 - 0.004, 0.13);
    d.rotation.z = Math.PI / 2;
  }
  box(0.2, 0.024, 0.03, std({ color: '#3a3b3d', roughness: 0.6 }), 3.1, 1.028, 0.21); // dispense slot
  const brand = cyl(0.02, 0.006, insetM, 3.1, 1.247, 0.238); brand.rotation.x = Math.PI / 2;
  const greenDot = cyl(0.011, 0.005, std({ color: '#3f8a4f', roughness: 0.6 }), 3.0, 1.075, 0.236);
  greenDot.rotation.x = Math.PI / 2;
  // soap dispenser
  const soap = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.16, 0.09, 2, 0.02), mGloss);
  soap.position.set(2.5, 1.1, 0.057); add(soap);
  box(0.06, 0.07, 0.014, std({ color: '#c6d8e8', roughness: 0.3 }), 2.5, 1.075, 0.097); // window
  box(0.09, 0.024, 0.02, insetM, 2.5, 1.023, 0.095);                                // push bar
  // notices on tile
  sheet(TEX.paper(null, 5, 11), 0.215, 0.28, 2.5, 1.33, 0.012, 'z+', -0.035);       // kitchen rules
  sheet(TEX.infographic(8), 0.24, 0.3, 2.79, 1.28, 0.012, 'z+', 0.025);             // infographic
  sheet(cardStickT, 0.09, 0.06, 2.85, 1.1, 0.012, 'z+', 0.0);                       // card sticker
  sheet(TEX.paper(null, 19, 2), 0.05, 0.03, 2.72, 1.05, 0.012, 'z+', 0.04);         // tiny label sticker
  // counter props
  const dome = new THREE.Mesh(UDOME, mDomeG);
  dome.scale.set(0.065, 0.056, 0.065); dome.position.set(2.44, CY, 0.14); add(dome);
  const soapB = cyl(0.025, 0.15, mGlassB, 2.7, CY, 0.09); soapB.userData.noShadow = true;
  labelBand(0.026, 0.05, 2.7, CY + 0.04, 0.09, std({ color: '#3f6fb0', roughness: 0.6 }));
  cyl(0.013, 0.028, mGloss, 2.7, CY + 0.15, 0.09);                                  // flip cap
  box(0.12, 0.02, 0.1, std({ color: '#3f6fb0', roughness: 0.85 }), 3.12, CY, 0.09, 0.2); // blue cloth
  box(0.11, 0.03, 0.07, std({ color: '#e3c53a', roughness: 0.9 }), 3.24, CY, 0.08, -0.15); // sponge
  box(0.11, 0.012, 0.07, std({ color: '#4f7a3a', roughness: 0.9 }), 3.24, CY + 0.03, 0.08, -0.15);
  box(0.09, 0.025, 0.055, std({ color: '#e3c53a', roughness: 0.9 }), 3.18, 1.012, 0.2, 0.3); // sponge on lip
  // T-fal pan
  const tfal = new THREE.Mesh(UPAN, mPanB);
  tfal.scale.set(0.13, 0.034, 0.13); tfal.position.set(3.18, CY + 0.003, 0.42); add(tfal);
  cyl(0.04, 0.003, mPanRed, 3.18, CY + 0.009, 0.42);                                // red disc
  box(0.14, 0.014, 0.03, mBlack, 3.05, CY + 0.026, 0.46, -2.7);                     // handle toward sink
  // white duplex outlets on tile (left of range, above kettle)
  const outW = std({ color: '#f3f2ee', roughness: 0.35 });
  box(0.07, 0.115, 0.014, outW, 3.42, 1.062, 0.012);
  box(0.07, 0.115, 0.014, outW, 4.45, 1.092, 0.012);

  // ====================================================================
  // K3 — cubby contents (sink midzone, top band) + pantry nook + microwave cells
  // ====================================================================
  // sink midzone (floor sinkY): cell A ~2.49
  box(0.19, 0.24, 0.05, bagM('#6e2430'), 2.43, sinkY, 0.12, 0.12, 0.1);             // maroon snack bag
  cyl(0.04, 0.13, mGloss, 2.61, sinkY, 0.13);                                       // salt canister
  labelBand(0.041, 0.035, 2.61, sinkY + 0.045, 0.13, std({ color: '#4a6fa5', roughness: 0.6 }));
  // cell B ~2.88
  bottle(0.028, 0.2, std({ color: '#2a1f18', roughness: 0.3 }), 2.82, sinkY, 0.14); // soy sauce
  cyl(0.012, 0.016, std({ color: '#c33b2e', roughness: 0.5 }), 2.82, sinkY + 0.2, 0.14);
  spiceJar(2.93, sinkY, 0.15, 0.105);
  spiceJar(2.99, sinkY, 0.12, 0.12);
  // cell C ~3.26: single upside-down plate
  tapered(0.12, 0.016, mGloss, 3.26, sinkY, 0.15);
  // top band: leaning stainless platter (left end)
  const platter = new THREE.Mesh(UCYL, M.stainless);
  platter.scale.set(0.155, 0.012, 0.155);
  platter.position.set(1.61, topY + 0.125, 0.1); platter.rotation.x = -1.2; add(platter);
  tapered(0.14, 0.022, std({ color: '#3a3d40', roughness: 0.4 }), 2.43, topY, 0.15); // dark platter
  for (let i = 0; i < 3; i++) cyl(0.115, 0.016, mGloss, 3.2, topY + i * 0.017, 0.15); // plate stack
  // top band right of hood: oils + chili bag
  bottle(0.032, 0.29, std({ color: PAL.bottle[0], roughness: 0.25 }), 4.42, topY, 0.13); // olive oil
  cyl(0.013, 0.02, std({ color: PAL.bottle[2], roughness: 0.5 }), 4.42, topY + 0.29, 0.13);
  labelBand(0.034, 0.08, 4.42, topY + 0.09, 0.13);
  bottle(0.03, 0.27, std({ color: PAL.bottle[6], roughness: 0.25 }), 4.52, topY, 0.19); // dark oil #2
  box(0.1, 0.2, 0.04, bagM('#8a1f24'), 4.35, topY, 0.21, 0.15, 0.1);                // chili/jerky bag
  const bag9 = new THREE.Mesh(USPH, std({ color: '#c89d5e', roughness: 0.85 }));
  bag9.scale.set(0.033, 0.05, 0.08); bag9.position.set(4.38, topY + 0.045, 0.06);
  bag9.rotation.z = 0.5; add(bag9);                                                 // baguette end
  const defl = new THREE.Mesh(UICO, std({ color: '#efece4', roughness: 0.9 }));
  defl.scale.set(0.075, 0.05, 0.065); defl.position.set(4.57, topY + 0.045, 0.09);
  defl.rotation.y = 0.8; add(defl);                                                 // deflated white bag
  // top band, east cell (divider ~4.655): bread + chips
  box(0.32, 0.13, 0.17, std({ color: '#e9e2d2', roughness: 0.6 }), 4.85, topY, 0.1, 0.1); // bread bag
  box(0.19, 0.26, 0.06, bagM('#3a8f8a'), 4.92, topY, 0.23, -0.2, 0.1);              // teal chip bag
  // nook mid shelf (nookY2): oils/condiments row
  bottle(0.031, 0.2, std({ color: PAL.bottle[4], roughness: 0.25 }), 4.37, nookY2, 0.13); // amber vinegar
  labelBand(0.033, 0.06, 4.37, nookY2 + 0.05, 0.13);
  labelBand(0.0335, 0.012, 4.37, nookY2 + 0.12, 0.13, std({ color: '#c33b2e', roughness: 0.6 }));
  cyl(0.027, 0.15, mGloss, 4.46, nookY2, 0.17);                                     // mayo squeeze bottle
  cyl(0.015, 0.024, mGloss, 4.46, nookY2 + 0.15, 0.17);
  box(0.08, 0.16, 0.06, bagM('#e8c23a', 0.05, 0.5), 4.57, nookY2, 0.12, 0.1);       // yellow carton box
  box(0.12, 0.17, 0.05, bagM('#c9b58f', 0.1, 0.6), 4.68, nookY2, 0.07, -0.08);      // tan pouch
  cyl(0.032, 0.115, mGloss, 4.79, nookY2, 0.1);                                     // baking-powder canister
  labelBand(0.033, 0.04, 4.79, nookY2 + 0.07, 0.1, mSteel);
  spiceJar(4.89, nookY2, 0.12, 0.1);
  spiceJar(4.95, nookY2, 0.13, 0.12, '#5a7a4a');
  // nook bottom shelf (nookY): snack jumble
  cyl(0.032, 0.095, std({ color: '#7a2a1e', roughness: 0.3 }), 4.74, nookY, 0.18);  // salsa jar
  cyl(0.033, 0.013, std({ color: '#c9a23a', roughness: 0.4, metalness: 0.5 }), 4.74, nookY + 0.095, 0.18);
  box(0.17, 0.2, 0.05, bagM('#c4542a'), 4.86, nookY, 0.12, 0.1, -0.12);             // orange chip bag
  box(0.16, 0.13, 0.05, bagM('#2b4a9e'), 4.95, nookY, 0.06, -0.15);                 // blue cookie bag
  box(0.1, 0.14, 0.04, bagM('#b5342c'), 4.4, nookY, 0.08, 0.2, 0.1);                // red snack bag
  bottle(0.027, 0.15, std({ color: '#2f5230', roughness: 0.3 }), 4.35, nookY, 0.17); // green bottle
  spiceJar(4.52, nookY, 0.13, 0.1);
  spiceJar(4.58, nookY, 0.15, 0.11, '#cfc9ba', '#c33b2e');
  // handwritten notes + shelf tags taped to shelf front edges
  sheet(TEX.paper(null, 51, 3), 0.13, 0.1, 4.62, 1.972, shelfEdgeZ, 'z+', 0.05);    // note A
  sheet(TEX.paper(null, 52, 3), 0.11, 0.085, 4.93, 1.976, shelfEdgeZ, 'z+', -0.04); // note B
  sheet(TEX.paper(null, 53, 2), 0.04, 0.05, 4.4, 1.985, shelfEdgeZ, 'z+', 0.03);    // tag
  sheet(TEX.paper(null, 54, 2), 0.04, 0.05, 4.76, 1.983, shelfEdgeZ, 'z+', -0.05);  // tag
  sheet(TEX.paper(null, 55, 2), 0.04, 0.05, 2.9, 1.975, shelfEdgeZ, 'z+', 0.04);    // tag over sink
  // microwave cells (floor microY)
  box(0.15, 0.075, 0.1, mGloss, 1.55, microY, 0.13, 0.06);                          // paper-tray stack
  box(0.15, 0.01, 0.1, std({ color: '#4f7ec2', roughness: 0.6 }), 1.55, microY + 0.075, 0.13, 0.06);
  box(0.07, 0.11, 0.04, std({ color: '#dfe7f2', roughness: 0.5 }), 1.62, microY, 0.05, -0.1); // blue/white box
  const wad = new THREE.Mesh(UICO, std({ color: '#8a6a42', roughness: 0.9 }));
  wad.scale.set(0.085, 0.07, 0.08); wad.position.set(1.78, microY + 0.065, 0.08);
  wad.rotation.y = 0.6; add(wad);                                                   // crumpled brown bag
  box(0.03, 0.008, 0.02, std({ color: PAL.posterRed, roughness: 0.7 }), 1.94, microY, 0.09, 0.4); // scrap
  const trayR = std({ color: '#b22a22', roughness: 0.25 });
  box(0.24, 0.007, 0.14, trayR, 1.83, microY, 0.235, 0.06);                         // red trays, protruding
  box(0.24, 0.007, 0.14, trayR, 1.82, microY + 0.008, 0.225, -0.05);
  const pie = tapered(0.12, 0.05, mGlassD, 2.13, microY, 0.14); pie.userData.noShadow = true; // pie dish

  // ====================================================================
  // F1 — kettle + utensil (counter in pantry nook)
  // ====================================================================
  const kx = K.kettle.x, kz = K.kettle.z;
  cyl(0.09, 0.028, mBlack, kx, CY, kz);                                             // power base
  cyl(0.08, 0.022, mChrome, kx, CY + 0.028, kz);                                    // bottom band
  const kbody = cyl(0.078, 0.165, mGlassK, kx, CY + 0.034, kz);
  kbody.userData.noShadow = true;                                                   // glass body
  cyl(0.074, 0.022, mBlack, kx, CY + 0.199, kz);                                    // lid
  cyl(0.016, 0.015, mBlack, kx, CY + 0.221, kz);                                    // knob
  box(0.05, 0.014, 0.02, mBlack, kx + 0.1, CY + 0.2, kz);                           // handle top stub
  box(0.014, 0.12, 0.02, mBlack, kx + 0.128, CY + 0.085, kz);                       // handle bar
  box(0.044, 0.014, 0.02, mBlack, kx + 0.1, CY + 0.072, kz);                        // handle bottom stub
  box(0.12, 0.006, 0.013, mBlack, 4.85, CY, 0.4, 0.5);                              // black fork handle
  box(0.045, 0.005, 0.024, mBlack, 4.91, CY, 0.365, 0.5);                           // fork head

  // ====================================================================
  // F3 — microwave top: pizza boxes, bottle, tin
  // ====================================================================
  const microTopY = CY + K.micro.h;
  const mSideP = paperM(pizzaSide);
  const pbox2 = new THREE.Mesh(UBOX, [mSideP, mSideP, mGloss, mGloss, mSideP, mSideP]);
  pbox2.scale.set(0.4, 0.03, 0.4); pbox2.position.set(1.79, microTopY + 0.015, 0.225);
  pbox2.rotation.y = 0.07; add(pbox2);
  const pbox1 = new THREE.Mesh(UBOX, [mSideP, mSideP, paperM(pizzaTop), mGloss, mSideP, mSideP]);
  pbox1.scale.set(0.4, 0.045, 0.4); pbox1.position.set(1.77, microTopY + 0.053, 0.235);
  pbox1.rotation.y = -0.17; add(pbox1);
  const wine = bottle(0.04, 0.3, mGlassB, 2.0, microTopY, 0.13); wine.userData.noShadow = true;
  labelBand(0.041, 0.05, 2.0, microTopY + 0.1, 0.13);                               // scuffed label
  cyl(0.03, 0.02, std({ color: '#3a8f8a', roughness: 0.4, metalness: 0.4 }), 1.6, microTopY, 0.36); // tin

  // ====================================================================
  // F4 — fridge face papers (plane just past the door fronts)
  // ====================================================================
  const fr = K.fridge;
  const fz = fr.d + 0.036;                      // kitchen.js door fronts sit ~0.03 past the box
  const fcx = (fr.x0 + fr.x1) / 2;
  const fsY = fr.freezerSplit;
  sheet(TEX.paper(PAL.posterRed, 21, 8), 0.215, 0.28, fcx - 0.05, fsY + 0.22, fz, 'z+', 0.05); // QR-style notice
  sheet(navyCardT, 0.09, 0.05, fcx + 0.24, fsY + 0.16, fz, 'z+', 0.0);              // navy card
  const sticky = box(0.075, 0.075, 0.003, std({ color: '#f2d24b', roughness: 0.9 }),
    fcx + 0.17, fsY - 0.267, fz, 0.06, 0.05);
  sticky.userData.noShadow = true;

  // ====================================================================
  // F2/G — stub + trash corner + glazed-door wall devices
  // ====================================================================
  // notices on the stub's room face (facing +Z) — skipped when no stub
  if (stub && stub.plane === 'z') {
    const stubFace = stub.at + stub.t + 0.004;
    sheet(TEX.paper(null, 34, 9), 0.215, 0.28, stub.c0 + 0.22, 1.56, stubFace, 'z+', 0.05);
    sheet(TEX.paper(PAL.posterBlue, 35, 6), 0.215, 0.28, stub.c0 + 0.5, 1.48, stubFace, 'z+', -0.04);
  }
  // trash corner (east wall) — anchored to the trashCan furniture item
  const tcan = S.furniture.find(f => f.type === 'trashCan');
  if (tcan) {
    const tz = tcan.z + 0.27;                   // hook/dustpan line past the can rim
    sheet(TEX.paper(null, 31, 10), 0.215, 0.28, EW - 0.006, 1.6, tz - 0.04, 'x-', 0.07);
    sheet(TEX.paper(null, 32, 13), 0.215, 0.28, EW - 0.006, 1.29, tz - 0.04, 'x-', 0.0);
    if (stub) {                                 // dustpan belongs to the stub-made corner
      box(0.02, 0.025, 0.03, mSteel, EW - 0.01, 1.1, tz);                           // hook
      const dpG = new THREE.Group(); dpG.position.set(EW - 0.045, 0.8, tz); dpG.rotation.z = -0.08;
      const dpHandle = new THREE.Mesh(UCYL, mGloss); dpHandle.scale.set(0.012, 0.56, 0.012); dpG.add(dpHandle);
      const dpCollar = new THREE.Mesh(UCYL, std({ color: '#2b4a9e', roughness: 0.5 }));
      dpCollar.scale.set(0.014, 0.05, 0.014); dpCollar.position.y = 0.04; dpG.add(dpCollar);
      const dpCap = new THREE.Mesh(UCYL, std({ color: '#2b4a9e', roughness: 0.5 }));
      dpCap.scale.set(0.016, 0.03, 0.016); dpCap.position.y = 0.29; dpG.add(dpCap);
      add(dpG);
      const dpPan = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.22, 0.25, 2, 0.02), mGloss);
      dpPan.position.set(EW - 0.055, 0.51, tz); dpPan.rotation.z = -0.05; add(dpPan);
      box(0.04, 0.015, 0.2, mGloss, EW - 0.095, 0.405, tz, 0, 0.5);                 // pan lip
    }
  }
  // extinguisher / strobe / card-reader cluster — anchored to the glazed doors
  const gw = S.glazedWalls[0];
  if (gw && gw.wall === 'F') {
    const dz = gw.c0;                           // door-leaf start along the wall
    sheet(TEX.paper(PAL.posterBlue, 33, 9), 0.215, 0.28, EW - 0.006, 1.58, dz - 0.67, 'x-', -0.03);
    // fire extinguisher at the pillar south of the doors
    const exX = EW - 0.085, exZ = dz - 0.32;
    box(0.016, 0.1, 0.06, mSteel, EW - 0.016, 0.95, exZ);                           // wall bracket
    cyl(0.052, 0.4, mRedExt, exX, 0.76, exZ);                                       // red body
    const exDome = new THREE.Mesh(UDOME, mRedExt);
    exDome.scale.set(0.052, 0.03, 0.052); exDome.position.set(exX, 1.16, exZ); add(exDome);
    cyl(0.015, 0.045, mBlack, exX, 1.185, exZ);                                     // neck
    box(0.1, 0.012, 0.025, mBlack, exX - 0.02, 1.23, exZ);                          // lever x2
    box(0.1, 0.012, 0.025, mBlack, exX - 0.015, 1.252, exZ, 0, 0.12);
    const gauge = cyl(0.013, 0.006, mGloss, exX - 0.028, 1.2, exZ + 0.03);
    gauge.rotation.z = Math.PI / 2;                                                 // gauge dot
    const hose1 = cyl(0.007, 0.12, mBlack, exX - 0.01, 1.09, exZ + 0.055); hose1.rotation.x = 0.35;
    const hose2 = cyl(0.007, 0.26, mBlack, exX, 0.84, exZ + 0.062); hose2.rotation.x = -0.08;
    sheet(TEX.paper(null, 61, 4), 0.05, 0.09, exX - 0.055, 1.08, exZ - 0.045, 'x-', 0.2); // inspection tag
    box(0.004, 0.03, 0.02, std({ color: PAL.posterRed, roughness: 0.6 }), exX - 0.053, 0.98, exZ + 0.01); // sticker
    // red strobe box, high
    box(0.07, 0.15, 0.15, std({ color: '#c0392b', roughness: 0.5 }), EW - 0.04, 2.08, dz - 0.45);
    const ring = cyl(0.05, 0.006, mGloss, EW - 0.078, 2.155, dz - 0.45); ring.rotation.z = Math.PI / 2;
    // push plate + card reader + outlet by the door
    box(0.008, 0.12, 0.12, mSteel, EW - 0.008, 1.06, dz - 0.17);                    // push plate
    box(0.03, 0.12, 0.08, mSteel, EW - 0.019, 1.09, dz - 0.06);                     // card-reader box
    box(0.012, 0.115, 0.07, mSteel, EW - 0.01, 1.045, dz - 0.55);                   // steel outlet
  }

  // ====================================================================
  // B — banquette wall outlet plates (steel) + white half plate
  // ====================================================================
  const bz = S.room.d - 0.008;
  for (const [px, py] of [[0.6, 1.12], [1.85, 1.13], [2.7, 1.2], [3.95, 1.14]]) {
    box(0.07, 0.115, 0.012, mSteel, px, py - 0.057, bz);
  }
  box(0.07, 0.07, 0.012, outW, 4.35, 1.1, bz);                                      // white half plate

  // ====================================================================
  // D — dining: napkins, crust, crumbs (anchored to table/banquette furniture)
  // ====================================================================
  const crumbM = std({ color: '#b89968', roughness: 0.9 });
  const tbl = S.furniture.find(f => f.type === 'table');
  if (tbl) {
    const tY = tbl.h;
    const nap1 = new THREE.Mesh(UICO, std({ color: '#f6f5f1', roughness: 0.95 }));
    nap1.scale.set(0.07, 0.04, 0.06); nap1.position.set(0.7, tY + 0.036, 3.72);
    nap1.rotation.y = 0.9; add(nap1);                                               // crumpled napkin wad
    box(0.025, 0.012, 0.02, std({ color: '#8a5a2c', roughness: 0.9 }), 0.78, tY, 3.69, 0.4); // crust
    box(0.16, 0.004, 0.13, mPaperM, 2.3, tY, 3.8, 0.4);                             // flat napkin
    box(0.012, 0.006, 0.01, crumbM, 3.1, tY, 3.92, 0.2);                            // table crumb
  }
  const bq = S.furniture.find(f => f.type === 'banquette');
  if (bq) {
    box(0.012, 0.006, 0.01, crumbM, 2.62, bq.seatH, 4.52, 0.5);                     // seat crumbs
    box(0.01, 0.005, 0.012, crumbM, 2.78, bq.seatH, 4.6, 1.1);
  }

  // ====================================================================
  // C — ceiling smoke detector
  // ====================================================================
  cyl(0.065, 0.026, mGloss, 3.2, S.room.h - 0.026, 2.5);

  return g;
}
