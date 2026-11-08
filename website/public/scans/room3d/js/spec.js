// Spec loader — the viewer is spec-driven. A room is rooms/<id>.json, picked by
// ?room=<id> (default "kitchen"). See rooms-schema.md. Modules import { S } and
// read it inside their build functions; main.js awaits loadSpec() first.

export let S = null;

const DEFAULT_WALLS = { K: '#eae3cf', W: '#eae3cf', B: '#eae3cf', F: '#eae3cf' };

export async function loadSpec() {
  const id = (new URLSearchParams(location.search).get('room') || 'kitchen')
    .replace(/[^a-z0-9_-]/gi, '');
  const res = await fetch(`./rooms/${id}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Room spec "${id}" not found (HTTP ${res.status})`);
  S = normalize(await res.json());
  return S;
}

function normalize(raw) {
  const s = {
    windows: [], glazedWalls: [], doors: [], stubs: [], radiators: [], backdrops: [],
    furniture: [], props: [], colliders: [],
    ...raw,
  };
  if (!s.room || !s.room.w || !s.room.d || !s.room.h) {
    throw new Error('Room spec is missing room.w/d/h');
  }
  s.wallColors = { ...DEFAULT_WALLS, ...(raw.wallColors || {}) };
  s.cove = { h: 0.10, ...(raw.cove || {}) };
  const L = raw.lighting || {};
  s.lighting = {
    pendants: L.pendants || [],
    ceiling: L.ceiling || [],
    pendantGeom: { cube: 0.30, bottomY: 2.10, stemR: 0.012, ...(L.pendantGeom || {}) },
  };
  s.walkSpawn = { x: s.room.w / 2, z: s.room.d / 2, yaw: 0, ...(raw.walkSpawn || {}) };
  return s;
}
