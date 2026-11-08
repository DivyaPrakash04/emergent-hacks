// Scan Studio server: upload a room video -> extract frames -> run the
// video-to-spec pipeline -> the room JSON lands in rooms/ for the viewer.
//
//   node website/public/scans/room3d/scan-pipeline/server.mjs
//   open http://127.0.0.1:8140/scan-studio/
//
// Serves website/public statically (same origin as the viewer) plus:
//   POST /api/scan            (raw video bytes; headers: x-filename, x-mock)
//   GET  /api/scan/<id>       job status {state, log, roomId}
//
// ANTHROPIC_API_KEY comes from the environment, or is read (value only,
// never logged) from platform/.env.local. Mock jobs skip the API and copy
// the sample generated room, so the plumbing can be tested for free.

import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));       // .../scans/room3d/scan-pipeline
const ROOM3D = normalize(join(HERE, '..'));                  // .../scans/room3d
const PUBLIC = normalize(join(ROOM3D, '..', '..'));          // website/public
const ROOMS = join(ROOM3D, 'rooms');
const REPO = normalize(join(PUBLIC, '..', '..'));            // repo root
const PORT = 8140;
const MAX_BYTES = 500 * 1024 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml',
};

const jobs = new Map(); // id -> { state, phase, log: [], roomId, error, ... }

// ---------- progress / ETA model (from the measured pipeline run) ----------
const EST = { extract: 35, analysts: 180, merge: 60, mockgen: 4 }; // seconds (fast profile, frames capped at 24)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function progressOf(job) {
  if (job.state === 'done') return { progress: 1, etaSeconds: 0, stage: 'Done' };
  if (job.state === 'error') return { progress: 0, etaSeconds: 0, stage: 'Failed' };
  const now = Date.now();
  const A = EST.analysts, M = EST.merge; // generate.mjs caps frames, so timings are stable
  const el = job.phaseStart ? (now - job.phaseStart) / 1000 : 0;
  let p = 0.02, eta = EST.extract + A + M, stage = 'Starting…';
  if (job.phase === 'extract') {
    p = 0.02 + 0.10 * Math.min(el / EST.extract, 0.95);
    eta = Math.max(EST.extract - el, 3) + (job.mock ? EST.mockgen : A + M);
    stage = 'Reading your video…';
  } else if (job.phase === 'mockgen') {
    p = 0.12 + 0.86 * Math.min(el / EST.mockgen, 0.95);
    eta = Math.max(EST.mockgen - el, 1);
    stage = 'Building your 3D room…';
  } else if (job.phase === 'analysts') {
    const inner = Math.max(Math.min(el / A, 0.95), (job.analystsDone / 5) * 0.95);
    p = 0.12 + 0.60 * inner;
    eta = Math.max(A - el, 15 * (5 - job.analystsDone), 10) + M;
    stage = 'Measuring the room…';
  } else if (job.phase === 'merge') {
    p = 0.72 + 0.26 * Math.min(el / M, 0.95);
    eta = Math.max(M - el, 8);
    stage = 'Building your 3D room…';
  }
  return { progress: Math.min(p, 0.99), etaSeconds: Math.round(eta), stage };
}

function log(job, line) {
  job.log.push(line);
  if (job.log.length > 400) job.log.shift();
  console.log(`[${job.id}] ${line}`);
}

async function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const env = await readFile(join(REPO, 'platform', '.env.local'), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (m && m[1].trim()) return m[1].trim();
    }
  } catch { /* no env file */ }
  return null;
}

function run(job, cmd, args, opts = {}, onLine = null) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts });
    const tail = (buf) => buf.toString().split('\n').forEach(l => {
      const t = l.trim();
      if (!t || t.startsWith('warning:') || t.includes('DeprecatedDeclaration')) return;
      if (/^\d+\s*\|/.test(t) || /^[|^~+-]+$/.test(t)) return; // compiler context lines
      log(job, t);
      onLine?.(t);
    });
    p.stdout.on('data', tail);
    p.stderr.on('data', tail);
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function hasFfmpeg() {
  return new Promise(res => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => res(false));
    p.on('close', c => res(c === 0));
  });
}

async function runJob(job, videoPath, mock) {
  try {
    const framesDir = join(job.dir, 'frames');
    await mkdir(framesDir, { recursive: true });

    job.state = 'extracting';
    job.phase = 'extract';
    job.phaseStart = Date.now();
    log(job, 'extracting frames…');
    if (await hasFfmpeg()) {
      await run(job, 'ffmpeg', ['-i', videoPath, '-vf',
        'fps=2,scale=1024:1024:force_original_aspect_ratio=decrease:force_divisible_by=2',
        '-q:v', '3', join(framesDir, 'frame_%03d.jpg'), '-loglevel', 'error']);
    } else {
      await run(job, 'swift', [join(HERE, 'extract.swift'), videoPath, framesDir]);
    }
    const frames = (await readdir(framesDir)).filter(f => /\.(jpe?g|png)$/i.test(f));
    if (frames.length < 4) throw new Error(`only ${frames.length} frames extracted — is this a video?`);
    log(job, `${frames.length} frames ready`);
    job.frames = frames.length;

    job.state = 'generating';
    job.phase = mock ? 'mockgen' : 'analysts';
    job.phaseStart = Date.now();
    job.analystsDone = 0;
    if (mock) {
      log(job, 'DRY RUN: skipping the five analyst calls (no API cost)…');
      await new Promise(r => setTimeout(r, 2500));
      const sample = join(ROOMS, 'kitchen-gen.json');
      const spec = JSON.parse(await readFile(sample, 'utf8'));
      spec.id = job.roomId;
      spec.name = `${spec.name} (dry run)`;
      await writeFile(join(ROOMS, `${job.roomId}.json`), JSON.stringify(spec, null, 2));
      log(job, 'DRY RUN: copied the sample generated room');
    } else {
      const key = await apiKey();
      if (!key) throw new Error('no ANTHROPIC_API_KEY in env or platform/.env.local');
      log(job, 'running 5 analyst calls + merge (minutes, costs a few dollars)…');
      await run(job, process.execPath,
        [join(HERE, 'generate.mjs'), '--frames', framesDir, '--id', job.roomId, '--out', ROOMS],
        { env: { ...process.env, ANTHROPIC_API_KEY: key } },
        (line) => { // advance the progress model on real pipeline milestones
          if (/analyst .+: done/.test(line)) job.analystsDone = Math.min(5, (job.analystsDone || 0) + 1);
          if (/running merge call/.test(line)) { job.phase = 'merge'; job.phaseStart = Date.now(); }
        });
    }

    // sanity: the room file must exist and parse
    const out = join(ROOMS, `${job.roomId}.json`);
    JSON.parse(await readFile(out, 'utf8'));
    job.state = 'done';
    log(job, `room ready: rooms/${job.roomId}.json`);
  } catch (e) {
    job.state = 'error';
    job.error = String(e.message || e);
    log(job, `ERROR: ${job.error}`);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  // CORS for the /api routes, so the host page works from the Vite dev origin
  // (or any local origin) while this server handles generation on :8140.
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, x-filename, x-mock');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  }
  try {
    if (req.method === 'POST' && url.pathname === '/api/scan') {
      const name = (req.headers['x-filename'] || 'video.mov').toString();
      const mock = req.headers['x-mock'] === '1';
      const slug = name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'room';
      const id = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const dir = join(tmpdir(), 'roomsure-scan', id);
      await mkdir(dir, { recursive: true });
      const ext = extname(name) || '.mov';
      const videoPath = join(dir, `video${ext}`);

      let bytes = 0;
      const out = createWriteStream(videoPath);
      req.on('data', c => {
        bytes += c.length;
        if (bytes > MAX_BYTES) { req.destroy(); out.destroy(); }
      });
      req.pipe(out);
      await new Promise((ok, bad) => { out.on('finish', ok); out.on('error', bad); req.on('error', bad); });

      const job = { id, roomId: id, dir, state: 'queued', log: [], error: null };
      jobs.set(id, job);
      log(job, `received ${name} (${(bytes / 1048576).toFixed(1)} MB)${mock ? ' — dry run' : ''}`);
      runJob(job, videoPath, mock); // fire and forget
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id }));
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/scan/')) {
      const job = jobs.get(url.pathname.split('/').pop());
      if (!job) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"no such job"}'); return; }
      // Presentation-friendly status: progress + ETA only (the detailed log stays
      // in this server's terminal).
      const { progress, etaSeconds, stage } = progressOf(job);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        state: job.state, stage, progress, etaSeconds,
        roomId: job.roomId, error: job.error,
      }));
      return;
    }

    // static: website/public
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(PUBLIC, p));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, '127.0.0.1', () =>
  console.log(`Scan Studio: http://127.0.0.1:${PORT}/scan-studio/  (rooms land in ${ROOMS})`));
