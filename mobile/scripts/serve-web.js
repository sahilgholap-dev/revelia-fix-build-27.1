#!/usr/bin/env node
/**
 * serve-web.js — serves dist/ the way Cloudflare Pages will.
 *
 * The one thing that matters here is the SPA REWRITE: web.output is "single",
 * so any path other than "/" must return index.html rather than 404. Production
 * gets that from public/_redirects; a plain static server does not, and testing
 * against one is actively misleading — it 404s every deep link, and the service
 * worker used to cache that 404 as the app.
 *
 * Usage: npm run web:serve [port]   (default 8093)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist');
const PORT = Number(process.argv[2] || 8093);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(ROOT)) {
  console.error('serve-web: dist/ not found — run `npm run web:export` first.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400);
      res.end('bad request');
      return;
    }

    // Contain path traversal before touching the filesystem.
    let file = path.normalize(path.join(ROOT, urlPath));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const index = path.join(file, 'index.html');
      file = fs.existsSync(index) ? index : path.join(ROOT, 'index.html'); // SPA rewrite
    }

    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(500);
        res.end('read error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        // The worker is served from the root scope; never let a proxy pin it.
        'Cache-Control': path.basename(file) === 'sw.js' ? 'no-cache' : 'no-store',
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => {
    console.log(`serve-web: http://localhost:${PORT}  (root ${ROOT}, SPA rewrite on)`);
  });
