// Furniture editor — select / drag / rotate / delete / add / undo / save.
// The room spec is the document: every edit mutates S.furniture (and rewrites
// S.colliders), then rebuilds the furniture group. See rooms-schema.md.
import * as THREE from 'three';
import { S } from './spec.js';

const SNAP = 0.05;          // drag grid (m)
const MARGIN = 0.05;        // min gap to walls (m)

// Footprint [w, d] per type (pre-rotation), matching furniture.js defaults.
const FOOT = {
  table: it => [it.w ?? 1.07, it.d ?? 0.76],
  chair: () => [0.48, 0.48],
  trashCan: it => [2 * (it.r ?? 0.28), 2 * (it.r ?? 0.28)],
  bed: it => [it.w ?? 0.98, it.len ?? 2.0],
  wardrobe: it => [it.w ?? 1.0, it.d ?? 0.6],
  desk: it => [it.w ?? 1.2, it.d ?? 0.6],
  dresser: it => [it.w ?? 0.9, it.d ?? 0.5],
  nightstand: () => [0.45, 0.42],
  sofa: it => [it.w ?? 1.5, 0.72],
  shelfUnit: it => [it.w ?? 0.8, it.d ?? 0.3],
  genericBox: it => [it.w ?? 0.5, it.d ?? 0.5],
};

// Defaults for newly added items (palette).
export const ADD_DEFAULTS = {
  table: { w: 1.07, d: 0.76, h: 0.74, style: 'whiteBlue' },
  tableWood: { type: 'table', w: 1.2, d: 0.75, h: 0.74, style: 'wood' },
  chair: { style: 'birchShell' },
  chairCream: { type: 'chair', style: 'creamShell' },
  sofa: { w: 1.5 },
  bed: { w: 0.98, len: 2.0, h: 0.55 },
  desk: { w: 1.2, d: 0.6, h: 0.74 },
  wardrobe: { w: 1.0, d: 0.6, h: 1.9 },
  dresser: { w: 0.9, d: 0.5, h: 0.8, drawers: 3 },
  nightstand: {},
  shelfUnit: { w: 0.8, d: 0.3, h: 1.8, shelves: 4 },
  trashCan: { r: 0.2, h: 0.5 },
  genericBox: { w: 0.5, d: 0.5, h: 0.5, color: '#a8a195' },
};

function footprintBox(item) {
  if (!item) return null;
  if (item.type === 'banquette') {
    const d = (item.seatD ?? 0.55) + 0.2;
    return [item.x0, item.x1, S.room.d - d, S.room.d];
  }
  const f = FOOT[item.type] || FOOT.genericBox;
  let [w, d] = f(item);
  const r = item.rotY || 0;
  if (Math.abs(Math.sin(r)) > 0.707) [w, d] = [d, w];
  const x = item.x || 0, z = item.z || 0;
  return [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
}

const boxesTouch = (a, b) =>
  a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];

export function initEditor({ camera, orbit, canvas, scene, rebuildFurniture, walk, onSelect, showToast }) {
  let active = false;
  let furnGroup = scene.getObjectByName('furniture');
  let selected = null;              // { node, index }
  let helper = null;                // THREE.BoxHelper
  let savedButtons = null;
  const undoStack = [], redoStack = [];

  // Static (architectural) colliders: the spec entries that don't contain any
  // original furniture's center. Everything else is re-derived from footprints.
  const staticColliders = (S.colliders || []).filter(c =>
    !(S.furniture || []).some(it => {
      const f = footprintBox(it);
      if (!f) return false;
      const cx = (f[0] + f[1]) / 2, cz = (f[2] + f[3]) / 2;
      return cx > c[0] && cx < c[1] && cz > c[2] && cz < c[3];
    }));

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let drag = null;                  // { item, node, offX, offZ, moved, before }

  // ---------- helpers ----------
  function toNDC(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  function pickItem(e) {
    toNDC(e);
    ray.setFromCamera(ndc, camera);
    furnGroup = scene.getObjectByName('furniture');
    if (!furnGroup) return null;
    const hits = ray.intersectObjects(furnGroup.children, true);
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node.parent && node.parent !== furnGroup) node = node.parent;
    return node.userData.itemIndex === undefined ? null : node;
  }

  function floorPoint(e) {
    toNDC(e);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(floor, hit) ? hit : null;
  }

  function syncColliders() {
    S.colliders = [
      ...staticColliders,
      ...(S.furniture || []).map(footprintBox).filter(Boolean),
    ].map(b => b.map(v => Math.round(v * 1000) / 1000));
    walk.refreshColliders();
  }

  function select(node) {
    deselect();
    if (!node) { onSelect?.(null); return; }
    selected = { node, index: node.userData.itemIndex };
    helper = new THREE.BoxHelper(node, 0xe0a63c);
    helper.userData.noShadow = true;
    scene.add(helper);
    onSelect?.({ index: selected.index, type: node.userData.itemType, locked: !!node.userData.locked });
  }

  function deselect() {
    if (helper) { scene.remove(helper); helper.geometry.dispose(); helper.material.dispose(); helper = null; }
    selected = null;
    onSelect?.(null);
  }

  function rebuild(keepIndex = -1) {
    deselect();
    rebuildFurniture();
    furnGroup = scene.getObjectByName('furniture');
    if (keepIndex >= 0 && furnGroup) {
      const node = furnGroup.children.find(c => c.userData.itemIndex === keepIndex);
      if (node) select(node);
    }
    syncColliders();
  }

  function pushUndo(beforeJSON) {
    undoStack.push(beforeJSON);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }

  const snapshot = () => JSON.stringify(S.furniture || []);

  function clampToRoom(item) {
    const f = footprintBox(item);
    if (!f || item.type === 'banquette') return;
    const hw = (f[1] - f[0]) / 2, hd = (f[3] - f[2]) / 2;
    item.x = Math.min(S.room.w - hw - MARGIN, Math.max(hw + MARGIN, item.x));
    item.z = Math.min(S.room.d - hd - MARGIN, Math.max(hd + MARGIN, item.z));
  }

  // ---------- mutations (exported) ----------
  function rotateSelected(step = Math.PI / 4) {
    if (!selected || selected.node.userData.locked) return;
    const item = S.furniture[selected.index];
    const before = snapshot();
    item.rotY = ((item.rotY || 0) + step) % (Math.PI * 2);
    clampToRoom(item);
    selected.node.rotation.y = item.rotY;
    selected.node.position.set(item.x, 0, item.z);
    helper?.update();
    pushUndo(before);
    syncColliders();
  }

  function deleteSelected() {
    if (!selected) return;
    const before = snapshot();
    S.furniture.splice(selected.index, 1);
    pushUndo(before);
    rebuild();
    showToast?.('Deleted · ⌘Z to undo');
  }

  function addItem(paletteKey) {
    const def = ADD_DEFAULTS[paletteKey];
    if (!def) return;
    const before = snapshot();
    const item = { type: def.type || paletteKey, ...def };
    delete item.typeOverride;
    // spawn where the camera looks, on the floor
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const p = ray.ray.intersectPlane(floor, hit) ? hit : { x: S.room.w / 2, z: S.room.d / 2 };
    item.x = Math.round(Math.min(S.room.w - 0.4, Math.max(0.4, p.x)) / SNAP) * SNAP;
    item.z = Math.round(Math.min(S.room.d - 0.4, Math.max(0.4, p.z)) / SNAP) * SNAP;
    item.rotY = 0;
    clampToRoom(item);
    S.furniture.push(item);
    pushUndo(before);
    rebuild(S.furniture.length - 1);
    showToast?.(`${item.type} added · drag to place`);
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    S.furniture = JSON.parse(undoStack.pop());
    rebuild();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    S.furniture = JSON.parse(redoStack.pop());
    rebuild();
  }

  function exportJSON() {
    syncColliders();
    return JSON.stringify(S, null, 2);
  }

  function saveJSON() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    a.download = `${S.id || 'room'}-edited.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- pointer handling ----------
  function onPointerDown(e) {
    if (!active || e.button !== 0) return;
    const node = pickItem(e);
    if (!node) { deselect(); return; }
    select(node);
    if (node.userData.locked) { showToast?.('This piece is fixed to the wall (delete is allowed)'); return; }
    const item = S.furniture[node.userData.itemIndex];
    const p = floorPoint(e);
    if (!p || !item) return;
    drag = { item, node, offX: p.x - (item.x || 0), offZ: p.z - (item.z || 0), moved: false, before: snapshot() };
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!active) return;
    if (!drag) {
      canvas.style.cursor = pickItem(e) ? 'grab' : 'default';
      return;
    }
    const p = floorPoint(e);
    if (!p) return;
    drag.item.x = Math.round((p.x - drag.offX) / SNAP) * SNAP;
    drag.item.z = Math.round((p.z - drag.offZ) / SNAP) * SNAP;
    clampToRoom(drag.item);
    drag.node.position.set(drag.item.x, 0, drag.item.z);
    drag.moved = true;
    helper?.update();
  }

  function onPointerUp() {
    if (!active || !drag) return;
    if (drag.moved) { pushUndo(drag.before); syncColliders(); }
    drag = null;
    canvas.style.cursor = 'default';
  }

  function onKeyDown(e) {
    if (!active) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
    if (e.code === 'KeyR') { rotateSelected(e.shiftKey ? Math.PI / 12 : Math.PI / 4); return; }
    if (e.code === 'Escape') deselect();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  // ---------- mode ----------
  function enter() {
    if (active) return;
    active = true;
    if (walk.active) walk.exit();
    orbit.enabled = true;
    savedButtons = { ...orbit.mouseButtons };
    orbit.mouseButtons.LEFT = -1;   // left is ours; orbit with right-drag, zoom with wheel
    // planner view
    camera.position.set(S.room.w / 2 + S.room.w * 0.5, S.room.h * 2.2, S.room.d * 1.35);
    orbit.target.set(S.room.w / 2, 0.2, S.room.d / 2);
    orbit.update();
    showToast?.('Edit mode · drag furniture · right-drag orbits · R rotate · Del delete · ⌘Z undo');
  }

  function exit() {
    if (!active) return;
    active = false;
    deselect();
    drag = null;
    if (savedButtons) { Object.assign(orbit.mouseButtons, savedButtons); savedButtons = null; }
    canvas.style.cursor = 'default';
  }

  return {
    get active() { return active; },
    enter, exit,
    addItem, deleteSelected, rotateSelected, undo, redo, saveJSON, exportJSON,
    // QA hooks
    selectByIndex(i) {
      furnGroup = scene.getObjectByName('furniture');
      const node = furnGroup?.children.find(c => c.userData.itemIndex === i);
      if (node) select(node);
      return !!node;
    },
    moveSelected(x, z) {
      if (!selected) return false;
      const item = S.furniture[selected.index];
      const before = snapshot();
      item.x = x; item.z = z;
      clampToRoom(item);
      selected.node.position.set(item.x, 0, item.z);
      helper?.update();
      pushUndo(before);
      syncColliders();
      return { x: item.x, z: item.z };
    },
    get selection() { return selected ? { index: selected.index, type: selected.node.userData.itemType } : null; },
    get counts() { return { furniture: (S.furniture || []).length, undo: undoStack.length, redo: redoStack.length }; },
  };
}
