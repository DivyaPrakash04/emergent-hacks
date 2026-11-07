// Viewer bootstrap — Common Kitchen 3D. See CONTRACT.md.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { S } from './spec.js';
import { buildShell } from './shell.js';
import { buildKitchen } from './kitchen.js';
import { buildFurniture } from './furniture.js';
import { buildDecor } from './decor.js';
import { buildLighting } from './lighting.js';
import { initWalk } from './walk.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
const cx = S.room.w / 2, cz = S.room.d / 2;
const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 120);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(cx, 1.0, cz);
controls.maxDistance = 22;
controls.minDistance = 0.4;

const errors = [];
function tryBuild(name, fn) {
  try {
    const g = fn();
    if (g) scene.add(g);
  } catch (e) {
    console.error(`[build:${name}]`, e);
    errors.push(`${name}: ${e.message}`);
  }
}
tryBuild('shell', () => buildShell());
tryBuild('kitchen', () => buildKitchen());
tryBuild('furniture', () => buildFurniture());
tryBuild('decor', () => buildDecor());
tryBuild('lighting', () => buildLighting(renderer, scene));

if (errors.length) {
  const chip = document.getElementById('errchip');
  chip.hidden = false;
  chip.textContent = 'Build issues: ' + errors.join(' | ');
}

// ---------- toast (status pill, top center) ----------
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(text, { sticky = false, pulse = false } = {}) {
  clearTimeout(toastTimer);
  toastEl.textContent = text;
  toastEl.classList.toggle('pulse', pulse);
  toastEl.classList.remove('gone');
  toastEl.hidden = false;
  if (!sticky) toastTimer = setTimeout(hideToast, 3200);
}
function hideToast() {
  clearTimeout(toastTimer);
  toastEl.classList.add('gone');
  toastEl.classList.remove('pulse');
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 500);
}

// ---------- assembly intro: scattered blocks tween together ----------
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const parts = [];
let assembling = false, assembleT = 0;
if (!reduceMotion) {
  scene.updateMatrixWorld(true);
  const wp = new THREE.Vector3();
  const rand = (a, b) => a + Math.random() * (b - a);
  scene.traverse(o => {
    if (!o.isMesh || o.material?.isMeshBasicMaterial) return; // exterior backdrops stay put
    o.getWorldPosition(wp);
    const dir = new THREE.Vector3(wp.x - cx, 0, wp.z - cz);
    if (dir.lengthSq() < 0.04) dir.set(rand(-1, 1), 0, rand(-1, 1));
    dir.normalize();
    const fromPos = o.position.clone()
      .addScaledVector(dir, rand(1.6, 4.5))
      .add(new THREE.Vector3(rand(-0.6, 0.6), rand(0.6, 3.2), rand(-0.6, 0.6)));
    const fromRot = new THREE.Euler(
      o.rotation.x + rand(-0.5, 0.5),
      o.rotation.y + rand(-0.8, 0.8),
      o.rotation.z + rand(-0.5, 0.5),
      o.rotation.order);
    parts.push({
      m: o,
      toPos: o.position.clone(), toRot: o.rotation.clone(),
      fromPos, fromRot,
      delay: rand(0, 1.3), dur: rand(0.9, 1.5),
    });
  });
  for (const p of parts) { p.m.position.copy(p.fromPos); p.m.rotation.copy(p.fromRot); }
  assembling = parts.length > 0;
  if (assembling) showToast('Generating room…', { sticky: true, pulse: true });
}
function finishAssembly() {
  for (const p of parts) { p.m.position.copy(p.toPos); p.m.rotation.copy(p.toRot); }
  parts.length = 0;
  if (assembling) hideToast();
  assembling = false;
}
function stepAssembly(dt) {
  assembleT += dt;
  let done = true;
  for (const p of parts) {
    let k = (assembleT - p.delay) / p.dur;
    if (k < 1) done = false;
    k = Math.max(0, Math.min(1, k));
    const e = 1 - Math.pow(1 - k, 3); // ease-out cubic
    p.m.position.lerpVectors(p.fromPos, p.toPos, e);
    p.m.rotation.set(
      p.fromRot.x + (p.toRot.x - p.fromRot.x) * e,
      p.fromRot.y + (p.toRot.y - p.fromRot.y) * e,
      p.fromRot.z + (p.toRot.z - p.fromRot.z) * e);
  }
  if (done) finishAssembly();
}

// ---------- view presets ----------
const views = {
  overview: () => ({
    pos: [cx + S.room.w * 0.95, S.room.h * 2.1, cz + S.room.d * 1.55],
    tgt: [cx, 0.6, cz],
  }),
  inside: () => ({
    pos: [cx + S.room.w * 0.28, 1.55, S.room.d - 0.5],
    tgt: [cx - S.room.w * 0.1, 1.15, 0.6],
  }),
  kitchen: () => ({
    pos: [cx + 0.4, 1.5, cz + S.room.d * 0.32],
    tgt: [cx - 0.6, 1.05, 0.05],
  }),
  dining: () => ({
    pos: [S.room.w * 0.25, 1.5, S.room.d * 0.3],
    tgt: [S.room.w * 0.75, 0.9, S.room.d * 0.75],
  }),
};
let animTo = null;
function setView(name, instant = false) {
  const v = views[name]?.();
  if (!v) return;
  if (walk?.active) walk.exit();
  if (instant) {
    camera.position.set(...v.pos);
    controls.target.set(...v.tgt);
    controls.update();
  } else {
    animTo = { pos: new THREE.Vector3(...v.pos), tgt: new THREE.Vector3(...v.tgt), t: 0 };
  }
  document.querySelectorAll('[data-view]').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.view === name ? 'true' : 'false');
  });
}
document.querySelectorAll('[data-view]').forEach(b => {
  b.addEventListener('click', () => setView(b.dataset.view));
});

// ---------- first-person walk mode ----------
const walkBtn = document.querySelector('[data-walk]');
const walk = initWalk({
  camera, orbit: controls, canvas,
  onChange: (on) => {
    animTo = null;
    walkBtn.textContent = on ? 'Exit walk' : 'Walk';
    walkBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) showToast('WASD move · mouse look · Shift run · Esc to exit');
    else { hideToast(); setView('overview'); }
  },
});
walkBtn.addEventListener('click', () => (walk.active ? walk.exit() : walk.enter()));

setView('overview', true);

// Render one frame immediately (and on demand) so the scene is visible even when
// the pane is backgrounded and requestAnimationFrame is throttled or paused.
function renderOnce() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  document.getElementById('loading').hidden = true;
}

// debug / QA hooks (harmless in production)
window.__setCam = (px, py, pz, tx, ty, tz) => {
  camera.position.set(px, py, pz); controls.target.set(tx, ty, tz);
  animTo = null;
  renderOnce();
};
window.__walk = walk;
window.__render = () => { controls.enabled = !walk.active; renderer.render(scene, camera); };
window.__skipAssembly = () => { finishAssembly(); renderOnce(); };
window.__exportGLB = async (postUrl = '/save-glb') => {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(scene, async (res) => {
      try {
        const body = res instanceof ArrayBuffer ? res : JSON.stringify(res);
        const r = await fetch(postUrl, { method: 'POST', body });
        resolve('saved: ' + await r.text());
      } catch (e) { reject(e); }
    }, (e) => reject(e), { binary: true });
  });
};

// ---------- resize & loop ----------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
renderOnce();
let firstFrame = true;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  resize();
  const dt = Math.min(clock.getDelta(), 0.05);
  if (assembling) stepAssembly(dt);
  if (walk.active) {
    walk.update(dt);
  } else {
    if (animTo) {
      animTo.t = Math.min(1, animTo.t + 0.035);
      const k = 1 - Math.pow(1 - animTo.t, 3);
      camera.position.lerp(animTo.pos, k * 0.18 + 0.02);
      controls.target.lerp(animTo.tgt, k * 0.18 + 0.02);
      if (animTo.t >= 1 && camera.position.distanceTo(animTo.pos) < 0.02) animTo = null;
    }
    controls.update();
  }
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    document.getElementById('loading').hidden = true;
  }
});
