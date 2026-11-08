// First-person walk mode: WASD + mouse look (pointer lock with drag fallback),
// touch zones on mobile, and 2D collision against the room's furniture footprint.
import * as THREE from 'three';
import { S } from './spec.js';

const EYE = 1.60;        // eye height (m)
const R = 0.28;          // player radius (m)
const SPEED = 2.1;       // walk m/s
const RUN = 3.5;         // shift-run m/s
const LOOK = 0.0024;     // rad per px (locked)

// Colliders come straight from the spec as raw footprints; inflate by player radius.
function buildColliders() {
  return (S.colliders || []).map(b => [b[0] - R, b[1] + R, b[2] - R, b[3] + R]);
}

export function initWalk({ camera, orbit, canvas, onChange }) {
  const CO = buildColliders();
  const keys = new Set();
  const pos = new THREE.Vector3(S.walkSpawn.x, EYE, S.walkSpawn.z);
  let active = false, hadLock = false;
  let yaw = S.walkSpawn.yaw || 0, pitch = -0.04; // yaw 0 faces wall K (-Z)

  const hit = (x, z) => CO.some(b => x > b[0] && x < b[1] && z > b[2] && z < b[3]);
  const clampWalls = () => {
    pos.x = Math.min(S.room.w - R, Math.max(R, pos.x));
    pos.z = Math.min(S.room.d - R, Math.max(R, pos.z));
  };

  function apply() {
    camera.position.copy(pos);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  function look(dx, dy) {
    yaw -= dx * LOOK;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - dy * LOOK));
    if (active) apply();
  }

  function move(f, s, dt, run) {
    const sp = (run ? RUN : SPEED) * dt;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const dx = (-sin * f + cos * s) * sp;
    const dz = (-cos * f - sin * s) * sp;
    const nx = pos.x + dx;
    if (!hit(nx, pos.z)) pos.x = nx;    // slide along obstacles, axis by axis
    const nz = pos.z + dz;
    if (!hit(pos.x, nz)) pos.z = nz;
    clampWalls();
  }

  function inputAxes() {
    let f = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
    if (touchMove) { f += touchMove.f; s += touchMove.s; }
    return [f, s];
  }

  function update(dt) {
    if (!active) return;
    const [f, s] = inputAxes();
    if (f || s) move(f, s, dt, keys.has('ShiftLeft') || keys.has('ShiftRight'));
    apply();
  }

  function enter() {
    if (active) return;
    active = true;
    hadLock = false;
    orbit.enabled = false;
    apply();
    try {
      const p = canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* fallback: drag-look */ }
    onChange?.(true);
  }

  function exit() {
    if (!active) return;
    active = false;
    keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    orbit.enabled = true;
    onChange?.(false);
  }

  // ---------- keyboard ----------
  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.code === 'Escape' && !document.pointerLockElement) {
      // Esc toggles the mouse back INTO look mode (browser Esc handles release).
      // Browsers may throttle an immediate re-lock; clicking the canvas also works.
      try { const p = canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch (err) {}
      return;
    }
    keys.add(e.code);
    if (/^(Arrow|Space)/.test(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // ---------- pointer lock ----------
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) hadLock = true;
    // Losing the lock no longer exits walk mode: Esc just frees the cursor,
    // and a click (or Esc) captures it again.
  });
  document.addEventListener('mousemove', (e) => {
    if (active && document.pointerLockElement === canvas) look(e.movementX, e.movementY);
  });

  // ---------- drag-look fallback + touch zones ----------
  let touchMove = null;                  // {f, s} from the left-half virtual stick
  const pointers = new Map();            // pointerId -> {x, y, zone}
  canvas.addEventListener('pointerdown', (e) => {
    if (!active || document.pointerLockElement === canvas) return;
    if (e.pointerType === 'mouse' && e.button === 0) {
      // click re-captures the mouse; drag-look below stays as the fallback
      try { const p = canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch (err) {}
    }
    const zone = (e.pointerType === 'touch' && e.clientX < window.innerWidth / 2) ? 'move' : 'look';
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, zone });
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (document.pointerLockElement === canvas) return; // locked: document mousemove handles look
    const p = pointers.get(e.pointerId);
    if (!p || !active) return;
    if (p.zone === 'look') {
      look((e.clientX - p.x) * 1.6, (e.clientY - p.y) * 1.6);
      p.x = e.clientX; p.y = e.clientY;
    } else {
      const dx = (e.clientX - p.sx) / 60, dy = (e.clientY - p.sy) / 60;
      touchMove = {
        f: Math.max(-1, Math.min(1, -dy)),
        s: Math.max(-1, Math.min(1, dx)),
      };
    }
  });
  const endPointer = (e) => {
    const p = pointers.get(e.pointerId);
    if (p?.zone === 'move') touchMove = null;
    pointers.delete(e.pointerId);
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  return {
    get active() { return active; },
    enter, exit, update,
    // Re-derive colliders from S.colliders (the editor rewrites them after edits).
    refreshColliders() {
      const next = buildColliders();
      CO.length = 0;
      CO.push(...next);
    },
    // QA helper: simulate `seconds` of held input synchronously
    step(f, s, seconds) {
      const n = Math.max(1, Math.ceil(seconds / 0.016));
      for (let i = 0; i < n; i++) move(f, s, seconds / n, false);
      apply();
      return { x: +pos.x.toFixed(3), z: +pos.z.toFixed(3), yaw: +yaw.toFixed(3) };
    },
    setYaw(v) { yaw = v; apply(); },
  };
}
