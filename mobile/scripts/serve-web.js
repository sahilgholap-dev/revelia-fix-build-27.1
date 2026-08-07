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

    // 🔴 THE PHONE-TESTING TRAP, PRINTED BECAUSE IT COSTS AN AFTERNOON OTHERWISE.
    // A service worker — and therefore PWA installability — requires a SECURE
    // CONTEXT. Browsers exempt localhost, so installing from this machine works
    // and looks like proof the PWA is fine. A phone on the LAN hits the address
    // below over plain http, which is NOT exempt: the worker never registers,
    // and Android Chrome offers "Create shortcut" (a bookmark) instead of
    // "Install app". Nothing is wrong with the manifest when that happens.
    const nets = require('os').networkInterfaces();
    const lan = Object.values(nets)
      .flat()
      .filter((n) => n && n.family === 'IPv4' && !n.internal)
      .map((n) => n.address);

    if (lan.length) {
      console.log('');
      console.log('  On this machine  http://localhost:%d  → installs (localhost is a secure origin)', PORT);
      for (const ip of lan) {
        console.log('  From a phone     http://%s:%d  → loads, but will NOT install', ip, PORT);
      }
      console.log('');
      console.log('  To test installation on a real Android device, either:');
      console.log('    a) chrome://flags → "Insecure origins treated as secure"');
      console.log('       → add http://%s:%d → Enabled → relaunch Chrome', lan[0], PORT);
      console.log('    b) put it behind an https tunnel (cloudflared / ngrok / npx localtunnel)');
      console.log('  Production is https, so this caveat disappears on deploy.');
    }
  });
