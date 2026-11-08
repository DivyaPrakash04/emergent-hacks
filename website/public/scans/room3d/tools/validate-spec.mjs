#!/usr/bin/env node
// Dependency-free validator for room specs (rooms-schema.md v1).
// Usage: node tools/validate-spec.mjs rooms/kitchen.json rooms/bedroom.json ...
// Prints PASS/FAIL per file with reasons; exits 1 if any file fails.

import { readFileSync } from 'node:fs';
import process from 'node:process';

const TOL = 0.02; // geometric tolerance (m)

// Catalogs hardcoded from rooms-schema.md.
const FURNITURE_TYPES = new Set([
  'banquette', 'table', 'chair', 'bed', 'wardrobe', 'desk', 'dresser',
  'nightstand', 'sofa', 'shelfUnit', 'trashCan', 'genericBox',
  'toilet', 'sinkVanity', 'pedestalSink', 'bathtub', 'shower',
]);
const PROP_TYPES = new Set([
  'bottle', 'jar', 'box', 'paperSheet', 'poster', 'bookStack', 'plant',
  'mug', 'pan', 'lamp', 'laptop', 'pillow', 'carton', 'umbrella', 'duffel',
  'mirror', 'towelBar', 'bathmat',
]);
const PRESETS = new Set(['kitchenClutter']);
const WALLS = new Set(['K', 'W', 'B', 'F']);

const num = (v) => typeof v === 'number' && Number.isFinite(v);

function validate(spec) {
  const errs = [];
  const err = (m) => errs.push(m);

  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return ['spec is not a JSON object'];
  }

  // ---- required top-level keys ----
  if (typeof spec.id !== 'string' || !spec.id) err('missing/invalid "id" (non-empty string)');
  if (typeof spec.name !== 'string' || !spec.name) err('missing/invalid "name" (non-empty string)');
  const room = spec.room;
  if (!room || !num(room.w) || !num(room.d) || !num(room.h)
      || room.w <= 0 || room.d <= 0 || room.h <= 0) {
    err('missing/invalid "room" (needs positive numeric w, d, h)');
    return errs; // every geometric check below needs the room box
  }

  // K (z=0) and B (z=d) run along X; W (x=0) and F (x=w) run along Z.
  const alongLen = (wall) => (wall === 'K' || wall === 'B' ? room.w : room.d);

  // ---- openings: c0 < c1 within the wall's length; sill < head <= room.h ----
  const openingKinds = [
    ['windows', { needSill: true }],
    ['doors', { needSill: false }],
    ['glazedWalls', { needSill: false }],
  ];
  for (const [key, opts] of openingKinds) {
    const arr = spec[key];
    if (arr == null) continue;
    if (!Array.isArray(arr)) { err(`"${key}" must be an array`); continue; }
    arr.forEach((o, i) => {
      const tag = `${key}[${i}]`;
      if (!o || typeof o !== 'object') { err(`${tag}: not an object`); return; }
      if (!WALLS.has(o.wall)) { err(`${tag}: wall must be one of K/W/B/F (got ${JSON.stringify(o.wall)})`); return; }
      const len = alongLen(o.wall);
      if (!num(o.c0) || !num(o.c1)) {
        err(`${tag}: c0/c1 must be numbers`);
      } else {
        if (o.c0 >= o.c1) err(`${tag}: c0 (${o.c0}) must be < c1 (${o.c1})`);
        if (o.c0 < -TOL || o.c1 > len + TOL) {
          err(`${tag}: c0..c1 (${o.c0}..${o.c1}) outside wall ${o.wall} length 0..${len}`);
        }
      }
      if (!num(o.head)) {
        err(`${tag}: head must be a number`);
      } else {
        if (o.head > room.h + TOL) err(`${tag}: head (${o.head}) exceeds room.h (${room.h})`);
        const sill = opts.needSill ? o.sill : (o.sill ?? 0);
        if (opts.needSill && !num(o.sill)) {
          err(`${tag}: sill must be a number`);
        } else if (num(sill)) {
          if (sill < -TOL) err(`${tag}: sill (${sill}) below the floor`);
          if (sill >= o.head) err(`${tag}: sill (${sill}) must be < head (${o.head})`);
        }
      }
    });
  }

  // ---- furniture: catalog types; x/z (banquette: x0/x1) inside the room ----
  const furn = spec.furniture;
  if (furn != null && !Array.isArray(furn)) err('"furniture" must be an array');
  (Array.isArray(furn) ? furn : []).forEach((f, i) => {
    const tag = `furniture[${i}]`;
    if (!f || typeof f !== 'object') { err(`${tag}: not an object`); return; }
    if (typeof f.type !== 'string' || !FURNITURE_TYPES.has(f.type)) {
      err(`${tag}: unknown type ${JSON.stringify(f.type)} (not in furniture catalog)`);
      return;
    }
    if (f.type === 'banquette') {
      if (!num(f.x0) || !num(f.x1)) { err(`${tag}: banquette needs numeric x0/x1`); return; }
      if (f.x0 >= f.x1) err(`${tag}: banquette x0 (${f.x0}) must be < x1 (${f.x1})`);
      if (f.x0 < -TOL || f.x1 > room.w + TOL) {
        err(`${tag}: banquette x0..x1 (${f.x0}..${f.x1}) outside room width 0..${room.w}`);
      }
      return;
    }
    if (!num(f.x) || !num(f.z)) { err(`${tag} (${f.type}): needs numeric x/z`); return; }
    if (f.x < -TOL || f.x > room.w + TOL || f.z < -TOL || f.z > room.d + TOL) {
      err(`${tag} (${f.type}): x/z (${f.x}, ${f.z}) outside room ${room.w} x ${room.d}`);
    }
  });

  // ---- props: catalog types, or a known preset entry ----
  const props = spec.props;
  if (props != null && !Array.isArray(props)) err('"props" must be an array');
  (Array.isArray(props) ? props : []).forEach((p, i) => {
    const tag = `props[${i}]`;
    if (!p || typeof p !== 'object') { err(`${tag}: not an object`); return; }
    if ('preset' in p) {
      if (!PRESETS.has(p.preset)) err(`${tag}: unknown preset ${JSON.stringify(p.preset)}`);
      else if (p.preset === 'kitchenClutter' && !spec.kitchen) {
        err(`${tag}: preset "kitchenClutter" is only valid when a kitchen block exists`);
      }
      return;
    }
    if (typeof p.type !== 'string' || !PROP_TYPES.has(p.type)) {
      err(`${tag}: unknown type ${JSON.stringify(p.type)} (not in prop catalog)`);
    }
  });

  // ---- colliders: [x0, x1, z0, z1] raw footprints inside room bounds ----
  const colliders = [];
  const colArr = spec.colliders;
  if (colArr != null && !Array.isArray(colArr)) err('"colliders" must be an array');
  (Array.isArray(colArr) ? colArr : []).forEach((c, i) => {
    const tag = `colliders[${i}]`;
    if (!Array.isArray(c) || c.length !== 4 || !c.every(num)) {
      err(`${tag}: must be an array of exactly 4 numbers [x0, x1, z0, z1]`);
      return;
    }
    const [x0, x1, z0, z1] = c;
    if (x0 >= x1 || z0 >= z1) err(`${tag}: needs x0 < x1 and z0 < z1 (got [${c}])`);
    if (x0 < -TOL || x1 > room.w + TOL || z0 < -TOL || z1 > room.d + TOL) {
      err(`${tag}: [${c}] outside room bounds ${room.w} x ${room.d}`);
    }
    colliders.push([x0, x1, z0, z1]);
  });

  // ---- walkSpawn: inside the room, not inside any collider ----
  // (spec.js defaults a missing walkSpawn to the room center, so validate that too)
  const ws = spec.walkSpawn ?? {};
  const sx = ws.x ?? room.w / 2;
  const sz = ws.z ?? room.d / 2;
  if (!num(sx) || !num(sz) || (ws.yaw != null && !num(ws.yaw))) {
    err('walkSpawn: x/z/yaw must be numbers');
  } else {
    if (!(sx > 0 && sx < room.w && sz > 0 && sz < room.d)) {
      err(`walkSpawn (${sx}, ${sz}) is not inside the room ${room.w} x ${room.d}`);
    }
    colliders.forEach((b, i) => {
      if (sx > b[0] && sx < b[1] && sz > b[2] && sz < b[3]) {
        err(`walkSpawn (${sx}, ${sz}) is inside colliders[${i}] [${b}]`);
      }
    });
  }

  return errs;
}

// ---------- CLI ----------
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node tools/validate-spec.mjs <room.json> [more.json ...]');
  process.exit(2);
}

let anyFail = false;
for (const file of files) {
  let errs;
  try {
    errs = validate(JSON.parse(readFileSync(file, 'utf8')));
  } catch (e) {
    errs = [`cannot read/parse: ${e.message}`];
  }
  if (errs.length) {
    anyFail = true;
    console.log(`FAIL ${file}`);
    for (const m of errs) console.log(`  - ${m}`);
  } else {
    console.log(`PASS ${file}`);
  }
}
process.exit(anyFail ? 1 : 0);
