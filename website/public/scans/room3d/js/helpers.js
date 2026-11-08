// Shared helpers — Common Kitchen 3D. See CONTRACT.md.
import * as THREE from 'three';

// ---------- deterministic rng ----------
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

// ---------- canvas texture ----------
export function makeCanvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return t;
}

// ---------- shadows ----------
export function applyShadows(root, { cast = true, receive = true } = {}) {
  root.traverse(o => {
    if (o.isMesh) {
      if (o.userData.noShadow) { o.castShadow = false; o.receiveShadow = receive; return; }
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return root;
}

// ---------- geometry helpers ----------
const _box = new Map();
export function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!_box.has(k)) _box.set(k, new THREE.BoxGeometry(w, h, d));
  return _box.get(k);
}

export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// Box whose origin is its floor center (easy placement on surfaces).
export function boxOnFloor(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}

// Cylinder standing on its base.
export function cylOnFloor(rTop, rBot, h, mat, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}

// Lathe from 2D profile points [[r, y], ...] (y from 0 up).
export function lathe(profile, mat, seg = 28) {
  const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
}

// A wall slab with rectangular holes cut out.
// width along local X, height along local Y, thickness along local Z.
// holes: [{x, y, w, h}] with x measured from the LEFT edge of the wall,
// y from the floor (both to the hole's lower-left corner).
export function wallWithHoles(width, height, thickness, holes, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(width, 0);
  shape.lineTo(width, height); shape.lineTo(0, height); shape.closePath();
  for (const h of holes || []) {
    const p = new THREE.Path();
    p.moveTo(h.x, h.y); p.lineTo(h.x + h.w, h.y);
    p.lineTo(h.x + h.w, h.y + h.h); p.lineTo(h.x, h.y + h.h); p.closePath();
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat);
  // center the slab on its inner face: caller positions/rotates.
  return m;
}

// Frame made of 4 box bars around a rectangular opening (local XY plane).
// Returns a group centered on the opening center, bars of given depth (Z) and size.
export function rectFrame(openW, openH, barW, depth, mat) {
  const g = new THREE.Group();
  const horiz = new THREE.BoxGeometry(openW + 2 * barW, barW, depth);
  const vert = new THREE.BoxGeometry(barW, openH, depth);
  g.add(mesh(horiz, mat, 0, openH / 2 + barW / 2, 0));
  g.add(mesh(horiz, mat, 0, -openH / 2 - barW / 2, 0));
  g.add(mesh(vert, mat, -openW / 2 - barW / 2, 0, 0));
  g.add(mesh(vert, mat, openW / 2 + barW / 2, 0, 0));
  return g;
}

// Muntin grid inside an opening (local XY plane): cols x rows panes.
export function muntins(openW, openH, cols, rows, barW, depth, mat) {
  const g = new THREE.Group();
  for (let i = 1; i < cols; i++) {
    const x = -openW / 2 + (openW / cols) * i;
    g.add(mesh(new THREE.BoxGeometry(barW, openH, depth), mat, x, 0, 0));
  }
  for (let j = 1; j < rows; j++) {
    const y = -openH / 2 + (openH / rows) * j;
    g.add(mesh(new THREE.BoxGeometry(openW, barW, depth), mat, 0, y, 0));
  }
  return g;
}

// Simple value noise painter: scatter soft blobs.
export function mottle(ctx, w, h, base, spots, count, rMin, rMax, seed = 7, alpha = 0.5) {
  const r = rng(seed);
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    const c = spots[Math.floor(r() * spots.length)];
    ctx.globalAlpha = alpha * (0.3 + 0.7 * r());
    ctx.fillStyle = c;
    const rad = rMin + r() * (rMax - rMin);
    ctx.beginPath();
    ctx.ellipse(r() * w, r() * h, rad, rad * (0.5 + r()), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Abstract "text" lines for notices/posters (NEVER real words).
export function textLines(ctx, x, y, w, lineH, lines, color, seed = 3) {
  const r = rng(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < lines; i++) {
    const lw = w * (0.55 + r() * 0.45);
    ctx.fillRect(x, y + i * lineH, lw, lineH * 0.45);
  }
}
