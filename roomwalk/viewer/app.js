// RoomWalk: first-person walkthrough of a Gaussian-splat scan.
import * as THREE from 'three';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');
const upBtn = document.getElementById('upBtn');

// ---------- renderer & camera (ours; the splat viewer draws into them) ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
stage.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 500);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- player state ----------
const UPS = [
  { name: 'auto', v: null },
  { name: '+Y', v: [0, 1, 0] }, { name: '-Y', v: [0, -1, 0] },
  { name: '+Z', v: [0, 0, 1] }, { name: '-Z', v: [0, 0, -1] },
  { name: '+X', v: [1, 0, 0] }, { name: '-X', v: [-1, 0, 0] },
];
let upIndex = 0;
let up = new THREE.Vector3(0, 1, 0);      // resolved up vector
let e1 = new THREE.Vector3(), e2 = new THREE.Vector3(); // horizontal basis
let yaw = 0, pitch = 0;
const pos = new THREE.Vector3();
let speed = Number(params.get('speed')) || 1.6;   // metres per second at walking pace
let bounds = null;                                 // { min, max } percentile box of the scan
let clampToRoom = params.get('clamp') !== '0';
const keys = new Set();

function setUp(v) {
  up.copy(v).normalize();
  const helper = Math.abs(up.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  e1.crossVectors(helper, up).normalize();
  e2.crossVectors(up, e1).normalize();
  camera.up.copy(up);
}

function viewDir(out) {
  const c = Math.cos(pitch);
  return out.set(0, 0, 0)
    .addScaledVector(e1, c * Math.cos(yaw))
    .addScaledVector(e2, c * Math.sin(yaw))
    .addScaledVector(up, Math.sin(pitch));
}

const tmpDir = new THREE.Vector3(), tmpFwd = new THREE.Vector3(), tmpRight = new THREE.Vector3(), tmpTarget = new THREE.Vector3();
function applyCamera() {
  camera.position.copy(pos);
  viewDir(tmpDir);
  camera.lookAt(tmpTarget.copy(pos).add(tmpDir));
}

// ---------- scene bounds (percentile box, ignores floaters) ----------
function computeBounds(viewer) {
  const mesh = viewer.splatMesh;
  const n = mesh.getSplatCount();
  const step = Math.max(1, Math.floor(n / 60000));
  const xs = [], ys = [], zs = [];
  const c = new THREE.Vector3();
  for (let i = 0; i < n; i += step) {
    mesh.getSplatCenter(i, c, false);
    xs.push(c.x); ys.push(c.y); zs.push(c.z);
  }
  const pct = (arr, p) => { arr.sort((a, b) => a - b); return arr[Math.floor((arr.length - 1) * p)]; };
  const min = new THREE.Vector3(pct(xs, 0.02), pct(ys, 0.02), pct(zs, 0.02));
  const max = new THREE.Vector3(pct(xs, 0.98), pct(ys, 0.98), pct(zs, 0.98));
  return { min, max, size: new THREE.Vector3().subVectors(max, min), count: n };
}

function autoUp(b) {
  // In a room scan the thinnest axis of the point cloud is floor-to-ceiling.
  const s = b.size;
  if (s.y <= s.x && s.y <= s.z) return new THREE.Vector3(0, 1, 0);
  if (s.z <= s.x) return new THREE.Vector3(0, 0, 1);
  return new THREE.Vector3(1, 0, 0);
}

function resolveUp() {
  const preset = UPS[upIndex];
  setUp(preset.v ? new THREE.Vector3(...preset.v) : (bounds ? autoUp(bounds) : new THREE.Vector3(0, 1, 0)));
  upBtn.textContent = 'Up: ' + preset.name + (preset.v ? '' : ` (${axisName(up)})`);
}
function axisName(v) {
  const a = ['x', 'y', 'z']; let i = 0;
  if (Math.abs(v.y) > Math.abs(v.getComponent(i))) i = 1;
  if (Math.abs(v.z) > Math.abs(v.getComponent(i))) i = 2;
  return (v.getComponent(i) < 0 ? '-' : '+') + a[i].toUpperCase();
}

function respawn() {
  if (!bounds) { pos.set(0, 1.6, 0); yaw = 0; pitch = 0; applyCamera(); return; }
  const centre = new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
  // Eye level: 60% of the way from floor to ceiling along the up axis.
  const extentUp = Math.abs(bounds.size.dot(up));
  const minUp = Math.min(bounds.min.dot(up), bounds.max.dot(up));
  const eye = minUp + 0.6 * extentUp;
  pos.copy(centre).addScaledVector(up, eye - centre.dot(up));
  // Face along the room's longest horizontal axis so the first view isn't a wall.
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
    .filter(a => Math.abs(a.dot(up)) < 0.5)
    .sort((a, b) => Math.abs(bounds.size.dot(b)) - Math.abs(bounds.size.dot(a)));
  yaw = axes.length ? Math.atan2(axes[0].dot(e2), axes[0].dot(e1)) : 0;
  pitch = 0;
  // Scale walking speed to the room: ~1.6 m/s for a 5 m room, proportional otherwise.
  const horiz = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
  speed = Number(params.get('speed')) || Math.max(0.2, horiz * 0.3);
  applyCamera();
}

// ---------- input ----------
const canvas = renderer.domElement;
canvas.addEventListener('click', () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= e.movementX * 0.0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * 0.0022));
});
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (e.code === 'KeyU') { upIndex = (upIndex + 1) % UPS.length; resolveUp(); respawn(); }
  if (e.code === 'KeyF') { up.negate(); setUp(up); upBtn.textContent = 'Up: ' + axisName(up); respawn(); }
  if (e.code === 'KeyR') respawn();
  if (e.code === 'BracketLeft') speed = Math.max(0.05, speed / 1.3);
  if (e.code === 'BracketRight') speed = Math.min(50, speed * 1.3);
  if (e.code === 'KeyB') clampToRoom = !clampToRoom;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
upBtn.addEventListener('click', () => { upIndex = (upIndex + 1) % UPS.length; resolveUp(); respawn(); });

let last = performance.now();
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.2 : 1;
  const v = speed * run * dt;
  viewDir(tmpDir);
  tmpFwd.copy(tmpDir).addScaledVector(up, -tmpDir.dot(up)).normalize(); // forward on the floor plane
  tmpRight.crossVectors(tmpFwd, up).normalize();
  if (keys.has('KeyW') || keys.has('ArrowUp')) pos.addScaledVector(tmpFwd, v);
  if (keys.has('KeyS') || keys.has('ArrowDown')) pos.addScaledVector(tmpFwd, -v);
  if (keys.has('KeyD') || keys.has('ArrowRight')) pos.addScaledVector(tmpRight, v);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) pos.addScaledVector(tmpRight, -v);
  if (keys.has('Space') || keys.has('KeyE')) pos.addScaledVector(up, v * 0.7);
  if (keys.has('KeyC') || keys.has('KeyQ')) pos.addScaledVector(up, -v * 0.7);
  if (clampToRoom && bounds) pos.clamp(bounds.min, bounds.max);
  applyCamera();
}

// ---------- splat viewer ----------
let viewer = null;
let raf = 0;

function fmt(name) {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'ksplat' ? GaussianSplats3D.SceneFormat.KSplat
       : ext === 'splat' ? GaussianSplats3D.SceneFormat.Splat
       : GaussianSplats3D.SceneFormat.Ply;
}

async function loadScene(url, name) {
  cancelAnimationFrame(raf);
  statusEl.innerHTML = `Loading <b>${name}</b>…`;
  if (viewer) { try { await viewer.dispose(); } catch (e) { console.warn(e); } viewer = null; }
  viewer = new GaussianSplats3D.Viewer({
    selfDrivenMode: false,
    renderer, camera,
    useBuiltInControls: false,
    sharedMemoryForWorkers: false,   // works from a plain static server (no COOP/COEP headers)
    gpuAcceleratedSort: false,
    integerBasedSort: true,
    halfPrecisionCovariancesOnGPU: true,
    sphericalHarmonicsDegree: Number(params.get('sh') ?? 0),
    renderMode: GaussianSplats3D.RenderMode.Always,
    sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
    logLevel: GaussianSplats3D.LogLevel.None,
  });
  try {
    await viewer.addSplatScene(url, { format: fmt(name), splatAlphaRemovalThreshold: 5, showLoadingUI: true, progressiveLoad: false });
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<b>Could not load ${name}.</b> ${err?.message || err}. Is it a 3D Gaussian Splatting .ply, .splat or .ksplat?`;
    return;
  }
  bounds = computeBounds(viewer);
  resolveUp();
  respawn();
  const s = bounds.size;
  statusEl.innerHTML = `<b>${name}</b> · ${bounds.count.toLocaleString()} splats · ${s.x.toFixed(1)} × ${s.y.toFixed(1)} × ${s.z.toFixed(1)} units · click to walk`;
  last = performance.now();
  const loop = now => { raf = requestAnimationFrame(loop); step(now); viewer.update(); viewer.render(); };
  raf = requestAnimationFrame(loop);
}

// ---------- file input / drag & drop ----------
document.getElementById('file').addEventListener('change', e => {
  const f = e.target.files[0]; if (f) loadScene(URL.createObjectURL(f), f.name);
});
document.getElementById('demo').addEventListener('click', () => loadScene('./demo/room.ply', 'demo room'));
const drop = document.getElementById('drop');
addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
addEventListener('dragleave', e => { if (e.relatedTarget === null) drop.classList.remove('on'); });
addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('on');
  const f = e.dataTransfer.files[0]; if (f) loadScene(URL.createObjectURL(f), f.name);
});

// ---------- boot ----------
setUp(new THREE.Vector3(0, 1, 0));
const initial = params.get('scene') || './demo/room.ply';
loadScene(initial, initial.split('/').pop());
