// Shared palette, materials and texture builders — Common Kitchen 3D. See CONTRACT.md.
// Palette values come from the materials analysis of the source video (specs/materials.md).
import * as THREE from 'three';
import { makeCanvasTexture, mottle, rng, textLines } from './helpers.js';

// ---------- palette ----------
export const PAL = {
  wallCream: '#eae3cf',   // WALL K / F / W
  wallYellow: '#e4d9b6',  // WALL B (banquette) pale butter
  wallPartition: '#dedcd4', // glass-door partition wall (grayer white)
  ceiling: '#f3f1eb',
  trim: '#f1eee6',        // window trim / casings
  sash: '#f4f2ec',        // window sashes
  baseboard: '#383b3e',  // dark vinyl cove base
  radiator: '#edeae0',
  floorBase: '#3d4043',
  floorSpots: ['#53565a', '#2d3034', '#5c5649', '#282b2e'],
  counter: '#3b332a',
  counterSpots: ['#8a6f4e', '#5e4a35', '#a89066', '#241f19'],
  cubby: '#eae4d4',       // almond open shelving
  baseCab: '#f0efea',
  toeKick: '#999a98',
  stainlessHood: '#b9b6b0',
  stainlessRange: '#a9a7a3',
  stainlessFridge: '#adaba7',
  chrome: '#c4c7c9',
  fridgeSide: '#1a1a1c',  // gloss black side panels
  blackAppliance: '#242528',
  mosaic: ['#262627', '#dad8d0', '#aba8a2', '#777672', '#68808f', '#b0a48c'],
  mosaicW: [25, 20, 15, 15, 15, 10],
  grout: '#c9c6be',
  subwayDark: ['#1f2022', '#3a3b3d', '#6b5844', '#8b8880', '#5d7080', '#cfcbc2'],
  subwayW: [50, 20, 8, 10, 8, 4],
  subwayGrout: '#b9b6ae',
  banqBack: '#827c70',    // taupe fine-rib
  banqSeat: '#3a3d3c',    // charcoal
  banqBase: '#1e1f20',    // black plinth
  tableTop: '#f2f1ed',
  tableEdge: '#5d86d1',   // cornflower edge banding
  tableLeg: '#93959a',
  chairWood: '#d0ae7e',   // birch molded ply
  chairLeg: '#6e7584',
  trash: '#7d8084',
  liner: '#f7f7f5',
  pendantShade: '#d9a832',    // mustard cube
  pendantEmissive: '#ffc95e',
  pendantFrame: '#b9bcbe',
  doorMetal: '#b9bcbe',
  lightWarm: '#ffd9a3',   // ~3000K
  lightCool: '#d9e6f2',   // ~6800K daylight
  ambient: '#cfcbc2',
  lawn: '#5e7a3a',
  brick: '#7e4a3c',
  sky: '#d8dcdd',
  umbrella: '#1c1d1f',
  kettleTop: '#141516',
  panRed: '#b33a31',
  paperWhite: '#fbfaf6',
  posterRed: '#c23b32',
  posterBlue: '#3a6ea8',
  posterOrange: '#d98a35',
  bottle: ['#3e4a22', '#c33b2e', '#e0b13a', '#4a6fa5', '#7a4a2c', '#d8d4c8', '#2c2c2e'],
};

// ---------- texture builders ----------
export const TEX = {
  // Whole-floor texture (non-repeating; plane UV 0..1). wM/hM = floor size in meters.
  // Floor texture. opts (all optional, from the room spec's `floor` field):
  // base hex, spots [hex...], seamEvery meters (0 disables seams), seamAlpha.
  floor(wM, hM, opts = {}) {
    const px = 160;
    const base = opts.base || PAL.floorBase;
    const spots = (opts.spots && opts.spots.length ? opts.spots : PAL.floorSpots);
    const seamEvery = opts.seamEvery ?? 0.92;
    const seamAlpha = opts.seamAlpha ?? 0.10;
    return makeCanvasTexture(Math.round(wM * px), Math.round(hM * px), (ctx, w, h) => {
      mottle(ctx, w, h, base, spots, Math.round(w * h / 450), 13, 32, 11, 0.24); // 8-20cm clouds
      mottle(ctx, w, h, 'rgba(0,0,0,0)', spots.slice(0, 3), Math.round(w * h / 60), 1, 3, 23, 0.35); // speckle
      if (seamEvery > 0.02) {
        ctx.strokeStyle = `rgba(0,0,0,${seamAlpha})`; ctx.lineWidth = seamEvery < 0.3 ? 1 : 2;
        const step = seamEvery * px;
        for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      }
    });
  },

  counter(wM, dM) {
    const px = 220;
    return makeCanvasTexture(Math.max(64, Math.round(wM * px)), Math.max(64, Math.round(dM * px)), (ctx, w, h) => {
      mottle(ctx, w, h, PAL.counter, PAL.counterSpots, Math.round(w * h / 26), 1, 3.5, 5, 0.8);
    });
  },

  // weighted tile bag
  _bag(colors, weights) {
    const bag = [];
    colors.forEach((c, i) => { for (let k = 0; k < weights[i]; k++) bag.push(c); });
    return bag;
  },

  // Main mosaic: 2.5cm squares with occasional 2.5x5 bricks.
  mosaic(wM, hM, seed = 9) {
    const tile = 0.025, gapPx = 3, px = 640;
    const cols = Math.max(1, Math.round(wM / tile));
    const rows = Math.max(1, Math.round(hM / tile));
    const tw = Math.round(wM * px / cols) || 16, th = Math.round(hM * px / rows) || 16;
    return makeCanvasTexture(cols * tw, rows * th, (ctx, w, h) => {
      const r = rng(seed);
      const bag = TEX._bag(PAL.mosaic, PAL.mosaicW);
      ctx.fillStyle = PAL.grout; ctx.fillRect(0, 0, w, h);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const double = r() < 0.1 && i < cols - 1;
          const c = bag[Math.floor(r() * bag.length)];
          const wpx = double ? tw * 2 : tw;
          ctx.fillStyle = c;
          ctx.fillRect(i * tw + gapPx, j * th + gapPx, wpx - 2 * gapPx, th - 2 * gapPx);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(i * tw + gapPx, j * th + gapPx, wpx - 2 * gapPx, Math.max(1, th * 0.18));
          if (double) i++;
        }
      }
    });
  },

  // Microwave-station black-glass colorway.
  subway(wM, hM, seed = 15) {
    const tW = 0.05, tH = 0.025, gapPx = 3, px = 560;
    const cols = Math.max(1, Math.round(wM / tW));
    const rows = Math.max(1, Math.round(hM / tH));
    const tw = Math.round(wM * px / cols) || 24, th = Math.round(hM * px / rows) || 12;
    return makeCanvasTexture(cols * tw, rows * th, (ctx, w, h) => {
      const r = rng(seed);
      const bag = TEX._bag(PAL.subwayDark, PAL.subwayW);
      ctx.fillStyle = PAL.subwayGrout; ctx.fillRect(0, 0, w, h);
      for (let j = 0; j < rows; j++) {
        const off = (j % 2) * tw * 0.5;
        for (let i = -1; i < cols + 1; i++) {
          ctx.fillStyle = bag[Math.floor(r() * bag.length)];
          ctx.fillRect(i * tw + off + gapPx, j * th + gapPx, tw - 2 * gapPx, th - 2 * gapPx);
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillRect(i * tw + off + gapPx, j * th + gapPx, tw - 2 * gapPx, Math.max(1, th * 0.22));
        }
      }
    });
  },

  // Fine horizontal-rib fabric (banquette backs) or plain weave.
  fabric(hex, scale = 10, rib = true) {
    return makeCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = rib ? 0.2 : 0.12;
      for (let y = 0; y < h; y += 2) { ctx.fillStyle = (y % 4 === 0) ? '#000' : '#fff'; ctx.fillRect(0, y, w, 1); }
      ctx.globalAlpha = 0.06;
      for (let x = 0; x < w; x += 3) { ctx.fillStyle = '#000'; ctx.fillRect(x, 0, 1, h); }
      ctx.globalAlpha = 1;
    }, { repeat: [scale, scale] });
  },

  // Light birch ply (grain along X).
  wood(hex = PAL.chairWood, scale = 2) {
    return makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h);
      const r = rng(31);
      for (let i = 0; i < 46; i++) {
        ctx.strokeStyle = `rgba(120,80,30,${0.05 + r() * 0.09})`;
        ctx.lineWidth = 1 + r() * 2;
        ctx.beginPath();
        const y = r() * h;
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (r() - 0.5) * 4);
        ctx.stroke();
      }
    }, { repeat: [scale, scale] });
  },

  // Brushed stainless (horizontal grain by default).
  brushed(hex = PAL.stainlessHood) {
    return makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = hex; ctx.fillRect(0, 0, w, h);
      const r = rng(41);
      for (let i = 0; i < 700; i++) {
        const y = r() * h;
        ctx.strokeStyle = `rgba(${r() > 0.5 ? '255,255,255' : '40,42,45'},${0.03 + r() * 0.05})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }, { repeat: [2, 2] });
  },

  // Generic notice sheet (abstract text only).
  paper(headerHex = null, seed = 3, lines = 9) {
    return makeCanvasTexture(256, 340, (ctx, w, h) => {
      ctx.fillStyle = PAL.paperWhite; ctx.fillRect(0, 0, w, h);
      let y = 26;
      if (headerHex) { ctx.fillStyle = headerHex; ctx.fillRect(20, 18, w - 40, 30); y = 66; }
      textLines(ctx, 24, y, w - 48, 22, lines, '#6b6b68', seed);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.strokeRect(1, 1, w - 2, h - 2);
    });
  },

  // 4-panel infographic poster.
  infographic(seed = 8) {
    return makeCanvasTexture(300, 380, (ctx, w, h) => {
      ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = PAL.posterBlue; ctx.fillRect(0, 0, w, 54);
      const cells = [[10, 70], [w / 2 + 5, 70], [10, 225], [w / 2 + 5, 225]];
      const cs = [PAL.posterBlue, PAL.posterOrange, '#4a8a5c', PAL.posterOrange];
      cells.forEach((c, i) => {
        ctx.fillStyle = cs[i];
        ctx.fillRect(c[0], c[1], w / 2 - 15, 140);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(c[0] + (w / 2 - 15) / 2, c[1] + 55, 26, 0, Math.PI * 2); ctx.fill();
        textLines(ctx, c[0] + 8, c[1] + 95, w / 2 - 31, 12, 3, 'rgba(255,255,255,0.9)', seed + i);
      });
    });
  },

  // Backdrop seen through exterior windows.
  windowBackdrop() {
    return makeCanvasTexture(1024, 1024, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      sky.addColorStop(0, '#e2e6e7'); sky.addColorStop(1, PAL.sky);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.45);
      ctx.fillStyle = PAL.brick; ctx.fillRect(0, h * 0.18, w, h * 0.5);
      const r = rng(77);
      for (let i = 0; i < 60; i++) {
        const x = r() * w, y = h * 0.2 + r() * h * 0.42;
        ctx.fillStyle = `rgba(206,216,224,${0.5 + r() * 0.4})`;
        ctx.fillRect(x, y, 26 + r() * 20, 36 + r() * 16);
      }
      ctx.fillStyle = 'rgba(126,74,60,0.55)';
      for (let y = h * 0.18; y < h * 0.68; y += 8) ctx.fillRect(0, y, w, 1.5);
      ctx.strokeStyle = 'rgba(70,60,52,0.5)';
      for (let i = 0; i < 7; i++) {
        const x = r() * w; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, h * 0.62); ctx.quadraticCurveTo(x + 20, h * 0.3, x + (r() - 0.5) * 120, h * 0.1); ctx.stroke();
      }
      const lawn = ctx.createLinearGradient(0, h * 0.66, 0, h);
      lawn.addColorStop(0, '#6d8a48'); lawn.addColorStop(1, '#4c6630');
      ctx.fillStyle = lawn; ctx.fillRect(0, h * 0.66, w, h * 0.34);
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = `rgba(${180 + r() * 60},${120 + r() * 60},40,${0.25 + r() * 0.3})`;
        ctx.fillRect(r() * w, h * 0.68 + r() * h * 0.3, 3, 2);
      }
      ctx.fillStyle = 'rgba(225,228,230,0.10)'; ctx.fillRect(0, 0, w, h);
    });
  },

  // Backdrop behind the interior glass doors (sunroom impression).
  sunroomBackdrop() {
    return makeCanvasTexture(1024, 768, (ctx, w, h) => {
      ctx.fillStyle = '#e8e2d2'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(222,229,233,0.95)'; ctx.fillRect(w * 0.05, h * 0.18, w * 0.9, h * 0.34);
      ctx.fillStyle = '#b9bcbe';
      for (let x = w * 0.05; x < w * 0.95; x += w * 0.09) ctx.fillRect(x, h * 0.18, 6, h * 0.34);
      for (let y = h * 0.58; y < h; y += 14) {
        const k = Math.floor((y - h * 0.58) / 14) % 3;
        ctx.fillStyle = ['#7c8ba0', '#5d6b80', '#93a0b2'][k];
        ctx.fillRect(0, y, w, 14);
      }
      ctx.fillStyle = 'rgba(90,80,70,0.45)';
      ctx.fillRect(w * 0.55, h * 0.44, w * 0.2, h * 0.16);
      ctx.fillRect(w * 0.2, h * 0.47, w * 0.12, h * 0.13);
      ctx.fillStyle = 'rgba(233,213,150,0.8)';
      ctx.fillRect(w * 0.47, h * 0.12, w * 0.05, h * 0.07);
      ctx.fillStyle = 'rgba(232,226,210,0.25)'; ctx.fillRect(0, 0, w, h);
    });
  },
};

// ---------- shared materials ----------
function std(opts) { return new THREE.MeshStandardMaterial(opts); }

export const M = {
  wallCream: std({ color: PAL.wallCream, roughness: 0.93 }),
  wallYellow: std({ color: PAL.wallYellow, roughness: 0.93 }),
  wallPartition: std({ color: PAL.wallPartition, roughness: 0.93 }),
  ceiling: std({ color: PAL.ceiling, roughness: 0.95 }),
  trim: std({ color: PAL.trim, roughness: 0.55 }),
  sash: std({ color: PAL.sash, roughness: 0.5 }),
  baseboard: std({ color: PAL.baseboard, roughness: 0.7 }),
  cubby: std({ color: PAL.cubby, roughness: 0.55 }),
  baseCab: std({ color: PAL.baseCab, roughness: 0.45 }),
  toeKick: std({ color: PAL.toeKick, roughness: 0.4, metalness: 0.7 }),
  radiator: std({ color: PAL.radiator, roughness: 0.6, metalness: 0.1 }),
  tableTop: std({ color: PAL.tableTop, roughness: 0.32 }),
  tableEdge: std({ color: PAL.tableEdge, roughness: 0.5 }),
  tableLeg: std({ color: PAL.tableLeg, roughness: 0.4, metalness: 0.8 }),
  chairLeg: std({ color: PAL.chairLeg, roughness: 0.4, metalness: 0.8 }),
  chrome: std({ color: PAL.chrome, roughness: 0.08, metalness: 1.0 }),
  blackPlastic: std({ color: '#1d1e20', roughness: 0.55 }),
  blackMatte: std({ color: PAL.blackAppliance, roughness: 0.4, metalness: 0.3 }),
  fridgeSide: std({ color: PAL.fridgeSide, roughness: 0.15, metalness: 0.4 }),
  trash: std({ color: PAL.trash, roughness: 0.7 }),
  liner: std({ color: PAL.liner, roughness: 0.9, side: THREE.DoubleSide }),
  paperFlat: std({ color: PAL.paperWhite, roughness: 0.9 }),
  doorMetal: std({ color: PAL.doorMetal, roughness: 0.4, metalness: 0.7 }),
  // near-black diffuse so room light barely adds; the glow is all emissive and
  // stays saturated amber through ACES instead of washing to cream
  pendantLit: std({
    color: '#1a1205', emissive: '#f08c1a',
    emissiveIntensity: 1.25, roughness: 0.7, side: THREE.DoubleSide,
  }),
  pendantFrame: std({ color: PAL.pendantFrame, roughness: 0.35, metalness: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#dce4ea', roughness: 0.06, metalness: 0,
    transparent: true, opacity: 0.12, side: THREE.DoubleSide,
    envMapIntensity: 1.3,
  }),
  stainless: null,
  stainlessRange: null,
  stainlessFridge: null,
};

const hoodTex = TEX.brushed(PAL.stainlessHood);
M.stainless = std({ color: '#d9e0e8', roughness: 0.38, metalness: 0.85, map: hoodTex, envMapIntensity: 0.6 });
const rangeTex = TEX.brushed(PAL.stainlessRange);
M.stainlessRange = std({ color: '#ffffff', roughness: 0.34, metalness: 0.85, map: rangeTex });
const fridgeTex = TEX.brushed(PAL.stainlessFridge);
fridgeTex.rotation = Math.PI / 2; fridgeTex.center.set(0.5, 0.5); // vertical brush
M.stainlessFridge = std({ color: '#ffffff', roughness: 0.34, metalness: 0.85, map: fridgeTex });
