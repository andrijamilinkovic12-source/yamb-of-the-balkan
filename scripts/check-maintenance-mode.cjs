const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const server = read('server.js');
const index = read('www/index.html');
const game = read('www/game.js');
const client = read('www/maintenance-mode.js');
const css = read('www/maintenance.css');
const page = read('www/maintenance.html');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

assert(server.includes("error.data = { code: 'server_maintenance' }"), 'Socket maintenance code is missing');
assert(server.indexOf("app.get('/healthz'") < server.indexOf('if (!MAINTENANCE_MODE) return next();', server.indexOf("app.get('/healthz'")), 'Health route must remain available during maintenance');
assert(server.includes("req.path === '/maintenance.css'") && server.includes("req.path === '/maintenance-mode.js'"), 'Maintenance resources are blocked by server middleware');
assert(server.includes("req.path.startsWith('/assets/')"), 'Theme assets are blocked during maintenance');

assert(index.includes('maintenance.css?v=2'), 'Live app does not load maintenance CSS');
assert(index.includes('maintenance-mode.js?v=2'), 'Live app does not load maintenance client');
const configScript = index.indexOf('<script src="config.js?');
const maintenanceScript = index.indexOf('<script src="maintenance-mode.js?');
const gameScript = index.indexOf('<script src="game.js?');
assert(configScript >= 0 && maintenanceScript >= 0 && gameScript >= 0, 'Required app scripts are missing');
assert(configScript < maintenanceScript, 'Maintenance client must load after server configuration');
assert(maintenanceScript < gameScript, 'Maintenance client must exist before socket setup');
assert(game.includes('window.yambMaintenance?.handleSocketError?.(err)'), 'Live app does not surface Socket.IO maintenance errors');

for (const theme of themes) {
    assert(client.includes(`${theme}: '/assets/`) || theme === 'dark', `Missing ${theme} brand asset`);
    if (theme !== 'dark') assert(css.includes(`[data-maintenance-theme="${theme}"]`), `Missing ${theme} maintenance theme`);
}

assert(client.includes("badge: 'Planirano održavanje'") && client.includes("badge: 'Scheduled maintenance'"), 'Bilingual maintenance copy is incomplete');
assert(client.includes("status?.maintenance === true"), 'Health response does not activate maintenance UI');
assert(client.includes("window.setInterval(() => check(false), 15000)"), 'Active maintenance polling is missing');
assert(css.includes('height: 100dvh'), 'Maintenance overlay is not dynamic-viewport fullscreen');
assert(css.includes('env(safe-area-inset-top)') && css.includes('env(safe-area-inset-bottom)'), 'Safe-area padding is incomplete');
assert(css.includes('z-index: 2147483647'), 'Maintenance overlay is not guaranteed to cover the app');
assert(page.includes('viewport-fit=cover') && page.includes('data-maintenance-standalone'), 'Standalone maintenance page is not mobile fullscreen');

console.log('Maintenance checks passed: live detection, standalone page, bilingual copy, 10 themes, fullscreen and safe-area guards.');
