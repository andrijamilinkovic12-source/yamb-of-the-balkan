'use strict';

// Loopback-only visual preview. Production renderers, synthetic game state,
// no auth, Socket.IO, database, rewards, advertising or game-server endpoints.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const managers = read('www/managers.js');
const modal = managers.slice(managers.indexOf('class ModalManager {'), managers.indexOf('// --- 4. EFFECT MANAGER'));
const fixture = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prikaz igre</title>
${styles.map(src => `<link rel="stylesheet" href="/${src}">`).join('')}
<style>.screen{transition:none!important}#confetti-canvas{display:none!important}</style></head>${body}
<script src="/config.js"></script><script src="/languages.js"></script><script src="/__preview/modal.js"></script>
<script src="/__preview/app.js"></script><script src="/__preview/runtime.js"></script><script src="/theme-game-header.js"></script></html>`;
const scripts = new Set(['config.js', 'languages.js', 'theme-game-header.js']);
const css = new Set(styles.map(src => src.split('?')[0]));
const types = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const port = Number(process.env.GAME_TIMER_PREVIEW_PORT || 3147);
const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'none'; frame-src 'self'; media-src 'none'");
    const send = (type, value) => { res.writeHead(200, { 'Content-Type': type }); res.end(value); };
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') return send(types['.html'], read('qa/game-timer-preview.html'));
    if (url.pathname === '/game-preview') return send(types['.html'], fixture);
    if (url.pathname === '/__preview/app.js') return send(types['.js'], read('www/game.js').replace('window.app = new YambApp();', 'window.PreviewApp = YambApp;'));
    if (url.pathname === '/__preview/modal.js') return send(types['.js'], 'window._safeT = key => t(key);\n' + modal);
    if (url.pathname === '/__preview/runtime.js') return send(types['.js'], read('qa/game-timer-preview-runtime.js'));
    let requested;
    try { requested = decodeURIComponent(url.pathname).slice(1); } catch (_) { res.writeHead(400); res.end(); return; }
    if ((!scripts.has(requested) && !css.has(requested) && !requested.startsWith('assets/')) || requested.includes('..') || requested.includes('\\')) {
        res.writeHead(404); res.end(); return;
    }
    const file = path.resolve(www, requested), type = types[path.extname(file)];
    if (!file.startsWith(www + path.sep) || !type || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    send(type, fs.readFileSync(file));
});
server.listen(port, '127.0.0.1', () => console.log(`Timer preview: http://127.0.0.1:${port}`));
