// Tiny static server + GLB save endpoint (local dev only).
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(import.meta.url), '..', '..'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary',
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/save-glb') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const buf = Buffer.concat(chunks);
      const out = join(root, 'room.glb');
      await writeFile(out, buf);
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`room.glb ${buf.length} bytes`);
      return;
    }
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});
server.listen(8123, '127.0.0.1', () => console.log('serving on http://127.0.0.1:8123'));
