// RoomWalk: first-person walkthrough of a Gaussian-splat scan, plus scan-from-video upload.
import * as THREE from 'three';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const statusEl = $('status');
const upBtn = $('upBtn');

// A real photographed room (Mip-NeRF 360 "room" scene, converted to .splat by antimatter15).
// Streams from the public Hugging Face dataset; ~51 MB, cached by the browser after the first load.
const REAL_ROOM = 'https://huggingface.co/cakewalk/splat-data/resolve/main/room.splat';
const DEMO_ROOM = './demo/room.ply';
// The kitchen from the team's own phone video: metric depth + camera tracking fused on CPU (scan/fuse.py).
const KITCHEN = './demo/kitchen.splat';

// ---------- renderer & camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
$('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.02, 500);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- player ----------
const UPS = [
  { name: 'auto', v: null },
  { name: '+Y', v: [0, 1, 0] }, { name: '-Y', v: [0, -1, 0] },
  { name: '+Z', v: [0, 0, 1] }, { name: '-Z', v: [0, 0, -1] },
  { name: '+X', v: [1, 0, 0] }, { name: '-X', v: [-1, 0, 0] },
];
let upIndex = 0;
const up = new THREE.Vector3(0, 1, 0);
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
let yaw = 0, pitch = 0;
const pos = new THREE.Vector3();
let speed = 1.6;
let bounds = null;
let clampToRoom = params.get('clamp') !== '0';
let userMoved = false;
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
  return out.set(0, 0, 0).addScaledVector(e1, c * Math.cos(yaw)).addScaledVector(e2, c * Math.sin(yaw)).addScaledVector(up, Math.sin(pitch));
}
const tmpDir = new THREE.Vector3(), tmpFwd = new THREE.Vector3(), tmpRight = new THREE.Vector3(), tmpTarget = new THREE.Vector3();
function applyCamera() {
  camera.position.copy(pos);
  camera.lookAt(tmpTarget.copy(pos).add(viewDir(tmpDir)));
}

function computeBounds(viewer) {
  const mesh = viewer.splatMesh;
  const n = mesh.getSplatCount();
  const step = Math.max(1, Math.floor(n / 80000));
  const xs = [], ys = [], zs = [];
  const c = new THREE.Vector3();
  for (let i = 0; i < n; i += step) { mesh.getSplatCenter(i, c, false); xs.push(c.x); ys.push(c.y); zs.push(c.z); }
  const pct = (arr, p) => { arr.sort((a, b) => a - b); return arr[Math.floor((arr.length - 1) * p)]; };
  // Real scans have stray splats far outside the room; trim the outer 3 % per axis.
  const min = new THREE.Vector3(pct(xs, 0.03), pct(ys, 0.03), pct(zs, 0.03));
  const max = new THREE.Vector3(pct(xs, 0.97), pct(ys, 0.97), pct(zs, 0.97));
  if (scenePreset?.bounds) { min.fromArray(scenePreset.bounds.min); max.fromArray(scenePreset.bounds.max); }
  return { min, max, size: new THREE.Vector3().subVectors(max, min), count: n };
}
function autoUp(b) {
  const s = b.size; // the thinnest axis of a room scan is floor-to-ceiling
  if (s.y <= s.x && s.y <= s.z) return new THREE.Vector3(0, 1, 0);
  if (s.z <= s.x) return new THREE.Vector3(0, 0, 1);
  return new THREE.Vector3(1, 0, 0);
}
function axisName(v) {
  let i = 0;
  if (Math.abs(v.y) > Math.abs(v.getComponent(i))) i = 1;
  if (Math.abs(v.z) > Math.abs(v.getComponent(i))) i = 2;
  return (v.getComponent(i) < 0 ? '-' : '+') + 'XYZ'[i];
}
let sceneUpHint = null; // a known-good up for a built-in scene
let scenePreset = null; // optional sidecar (<scene>.json): { up, spawn, forward, speed, bounds }
function resolveUp() {
  const preset = UPS[upIndex];
  const hint = scenePreset?.up ? new THREE.Vector3(...scenePreset.up) : sceneUpHint;
  setUp(preset.v ? new THREE.Vector3(...preset.v) : hint ? hint.clone() : (bounds ? autoUp(bounds) : new THREE.Vector3(0, 1, 0)));
  upBtn.textContent = 'Up: ' + preset.name + (preset.v ? '' : ` (${axisName(up)})`);
}
function respawn() {
  if (scenePreset?.spawn && upIndex === 0) {
    // A scanned scene knows where the camera stood: start there, looking where it looked.
    pos.set(...scenePreset.spawn);
    const f = new THREE.Vector3(...(scenePreset.forward || [0, 0, -1]));
    yaw = Math.atan2(f.dot(e2), f.dot(e1));
    pitch = Math.max(-0.6, Math.min(0.6, Math.asin(Math.max(-1, Math.min(1, f.dot(up))))));
    speed = Number(params.get('speed')) || scenePreset.speed || 1.2;
    applyCamera();
    return;
  }
  if (!bounds) { pos.set(0, 1.6, 0); yaw = 0; pitch = 0; applyCamera(); return; }
  const centre = new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
  const extentUp = Math.abs(bounds.size.dot(up));
  const minUp = Math.min(bounds.min.dot(up), bounds.max.dot(up));
  pos.copy(centre).addScaledVector(up, (minUp + 0.6 * extentUp) - centre.dot(up));
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
    .filter(a => Math.abs(a.dot(up)) < 0.5)
    .sort((a, b) => Math.abs(bounds.size.dot(b)) - Math.abs(bounds.size.dot(a)));
  yaw = axes.length ? Math.atan2(axes[0].dot(e2), axes[0].dot(e1)) : 0;
  pitch = 0;
  const horiz = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
  speed = Number(params.get('speed')) || Math.max(0.2, horiz * 0.3);
  applyCamera();
}

// ---------- input ----------
const canvas = renderer.domElement;
canvas.addEventListener('click', () => { if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  userMoved = true;
  yaw -= e.movementX * 0.0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * 0.0022));
});
addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
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
  tmpFwd.copy(tmpDir).addScaledVector(up, -tmpDir.dot(up)).normalize();
  tmpRight.crossVectors(tmpFwd, up).normalize();
  if (keys.size) userMoved = true;
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
let loadSeq = 0;

function fmt(url, name = '') {
  // Format comes from the URL's extension; blob: URLs (files opened from disk) have none, so fall back to the file name.
  const pick = s => {
    const ext = String(s).toLowerCase().split('?')[0].split('.').pop();
    return ext === 'ksplat' ? GaussianSplats3D.SceneFormat.KSplat
         : ext === 'splat' ? GaussianSplats3D.SceneFormat.Splat
         : ext === 'ply' ? GaussianSplats3D.SceneFormat.Ply : null;
  };
  return pick(url) ?? pick(name) ?? GaussianSplats3D.SceneFormat.Ply;
}

async function fetchPreset(url) {
  // Scenes made by scan/fuse.py ship a <name>.json beside the .ply with the camera's real position.
  if (!/^(\.|\/|https?:)/.test(url) || !/\.(ply|splat|ksplat)(\?|$)/i.test(url)) return null;
  try {
    const r = await fetch(url.replace(/\.(ply|splat|ksplat)(\?.*)?$/i, '.json'));
    if (!r.ok) return null;
    const j = await r.json();
    return j && typeof j === 'object' ? j : null;
  } catch { return null; }
}

async function loadScene(url, name, { upHint = null, progressive = false, sh = null } = {}) {
  const seq = ++loadSeq;
  cancelAnimationFrame(raf);
  statusEl.innerHTML = `Loading <b>${name}</b>…`;
  if (viewer) { const old = viewer; viewer = null; try { await old.dispose(); } catch (e) { console.warn(e); } }
  if (seq !== loadSeq) return false;
  const format = fmt(url, name);
  const v = new GaussianSplats3D.Viewer({
    selfDrivenMode: false,
    renderer, camera,
    useBuiltInControls: false,
    // Shared memory needs COOP/COEP headers (viewer/serve.py sends them); plain static hosting still works.
    sharedMemoryForWorkers: params.has('sm') ? params.get('sm') === '1' : self.crossOriginIsolated === true,
    gpuAcceleratedSort: params.get('gs') === '1',   // off: renders black on some GPUs/software renderers
    integerBasedSort: true,
    halfPrecisionCovariancesOnGPU: true,
    // .ply files from training carry view-dependent colour (spherical harmonics); .splat files don't.
    sphericalHarmonicsDegree: sh ?? Number(params.get('sh') ?? (format === GaussianSplats3D.SceneFormat.Ply ? 1 : 0)),
    renderMode: GaussianSplats3D.RenderMode.Always,
    sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
    logLevel: GaussianSplats3D.LogLevel.None,
  });
  viewer = v;
  sceneUpHint = upHint;
  scenePreset = await fetchPreset(url);
  if (seq !== loadSeq) return false;
  bounds = null;
  let placed = false;
  const place = () => {
    if (placed || !v.splatMesh || v.splatMesh.getSplatCount() === 0) return;
    placed = true;
    bounds = computeBounds(v);
    resolveUp();
    respawn();
    userMoved = false;
  };
  // Start rendering right away so progressive loads appear as they stream in.
  last = performance.now();
  const loop = now => {
    raf = requestAnimationFrame(loop);
    if (!placed) place();
    if (placed) step(now);
    v.update(); v.render();
  };
  raf = requestAnimationFrame(loop);
  try {
    await v.addSplatScene(url, {
      format, splatAlphaRemovalThreshold: 5, showLoadingUI: true, progressiveLoad: progressive,
      onProgress: (pct, msg, stage) => { if (!placed && pct) statusEl.innerHTML = `Loading <b>${name}</b>… ${Math.round(pct)}%`; },
    });
  } catch (err) {
    if (seq !== loadSeq) return false;
    console.error(err);
    cancelAnimationFrame(raf);
    statusEl.innerHTML = `<b>Could not load ${name}.</b> ${err?.message || err}`;
    return false;
  }
  if (seq !== loadSeq) return false;
  // Progressive loads were placed from partial data: refresh the bounds now that the whole scene is in,
  // and only move the player if they haven't started walking yet.
  if (progressive) {
    bounds = computeBounds(v);
    resolveUp();
    if (!userMoved) respawn();
  } else if (!placed) place();
  const s = bounds.size;
  statusEl.innerHTML = `<b>${name}</b> · ${bounds.count.toLocaleString()} splats · ${s.x.toFixed(1)} × ${s.y.toFixed(1)} × ${s.z.toFixed(1)} units · click to walk`;
  return true;
}

async function loadRealRoom() {
  // COLMAP-space scenes have -Y up; the auto-detector can't know the sign, so give it the hint.
  const ok = await loadScene(REAL_ROOM, 'real room (sample scan)', { upHint: new THREE.Vector3(0, -1, 0), progressive: true });
  if (!ok) {
    statusEl.innerHTML += ' · falling back to the demo room';
    await loadScene(DEMO_ROOM, 'demo room');
  }
}

// ---------- file input / drag & drop ----------
const isVideo = f => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(f.name);
$('file').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadScene(URL.createObjectURL(f), f.name); });
$('demo').addEventListener('click', () => loadScene(DEMO_ROOM, 'demo room'));
$('kitchen').addEventListener('click', () => loadScene(KITCHEN, 'kitchen scan'));
$('real').addEventListener('click', loadRealRoom);
const drop = $('drop');
addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
addEventListener('dragleave', e => { if (e.relatedTarget === null) drop.classList.remove('on'); });
addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('on');
  const f = e.dataTransfer.files[0]; if (!f) return;
  if (isVideo(f)) startScan(f); else loadScene(URL.createObjectURL(f), f.name);
});

// ---------- scan from video (talks to scan/server.py, locally or on Modal) ----------
const apiInput = $('api'), jobBar = $('jobBar'), jobMsg = $('jobMsg'), cancelBtn = $('cancelJob');
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
                set: (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
apiInput.value = params.get('api') || store.get('roomwalk.api') || '';
apiInput.addEventListener('change', () => store.set('roomwalk.api', apiInput.value.trim()));
const apiBase = () => apiInput.value.trim().replace(/\/+$/, '');
const QUALITY = { fast: { frames: 120, iterations: 7000 }, normal: { frames: 200, iterations: 15000 }, best: { frames: 300, iterations: 30000 } };

function setJob(pct, msg, err = false) {
  jobBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  jobBar.style.background = err ? 'var(--bad)' : 'var(--accent)';
  jobMsg.textContent = msg; jobMsg.classList.toggle('err', err);
}

async function startScan(file) {
  if (!apiBase()) {
    setJob(0, 'Enter a scan server URL first (deploy one with: modal deploy scan/modal_app.py).', true);
    apiInput.focus(); return;
  }
  const q = QUALITY[$('quality').value] || QUALITY.normal;
  const body = new FormData();
  body.append('video', file, file.name);
  body.append('frames', q.frames);
  body.append('iterations', q.iterations);
  setJob(2, `Uploading ${file.name} (${(file.size / 1e6).toFixed(0)} MB)…`);
  // XHR instead of fetch so we can show upload progress for big videos.
  const jobId = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiBase() + '/scan');
    xhr.upload.onprogress = e => { if (e.lengthComputable) setJob(2 + 8 * e.loaded / e.total, `Uploading… ${Math.round(100 * e.loaded / e.total)}%`); };
    xhr.onload = () => { try { xhr.status < 300 ? resolve(JSON.parse(xhr.responseText).job_id) : reject(new Error(`${xhr.status} ${xhr.responseText.slice(0, 200)}`)); } catch (e) { reject(e); } };
    xhr.onerror = () => reject(new Error('could not reach the scan server (is it running, and is the URL right?)'));
    xhr.send(body);
  }).catch(err => { setJob(0, 'Upload failed: ' + err.message, true); return null; });
  if (!jobId) return;
  store.set('roomwalk.job', jobId);
  pollJob(jobId);
}

let pollTimer = 0;
async function pollJob(jobId) {
  clearTimeout(pollTimer);
  cancelBtn.hidden = false;
  let res;
  try {
    const r = await fetch(`${apiBase()}/jobs/${jobId}`);
    if (!r.ok) throw new Error(`${r.status}`);
    res = await r.json();
  } catch (err) {
    setJob(10, `Waiting for the scan server… (${err.message})`);
    pollTimer = setTimeout(() => pollJob(jobId), 5000);
    return;
  }
  if (res.status === 'failed') {
    setJob(100, 'Scan failed: ' + (res.error || 'unknown error') + '. Try a slower, brighter video.', true);
    cancelBtn.hidden = false; store.set('roomwalk.job', null); return;
  }
  if (res.status === 'done') {
    setJob(100, 'Done. Loading your room…');
    store.set('roomwalk.job', null); cancelBtn.hidden = true;
    await loadScene(`${apiBase()}/jobs/${jobId}/splat.ply`, 'your scan', { progressive: false });
    setJob(100, 'Your room is loaded. Click it and walk. Press U or F if it looks tilted.');
    return;
  }
  setJob(10 + 90 * (res.progress || 0), `${res.stage || res.status}${res.detail ? ' · ' + res.detail : ''}${res.eta ? ' · ~' + res.eta + ' left' : ''}`);
  pollTimer = setTimeout(() => pollJob(jobId), 3000);
}
cancelBtn.addEventListener('click', () => { clearTimeout(pollTimer); store.set('roomwalk.job', null); cancelBtn.hidden = true; setJob(0, ''); });
$('video').addEventListener('change', e => { const f = e.target.files[0]; if (f) startScan(f); e.target.value = ''; });
const zone = $('videoZone');
zone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); zone.classList.add('on'); });
zone.addEventListener('dragleave', () => zone.classList.remove('on'));
zone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('on'); drop.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) startScan(f); });

// ---------- boot ----------
setUp(new THREE.Vector3(0, 1, 0));
const initial = params.get('scene');
if (initial) loadScene(initial, initial.split('/').pop());
else if (params.get('start') === 'real') loadRealRoom();
else if (params.get('start') === 'demo') loadScene(DEMO_ROOM, 'demo room');
else loadScene(KITCHEN, 'kitchen scan').then(ok => { if (!ok) loadScene(DEMO_ROOM, 'demo room'); });
const pendingJob = store.get('roomwalk.job');
if (pendingJob && apiBase()) { setJob(10, 'Resuming your scan…'); pollJob(pendingJob); }
