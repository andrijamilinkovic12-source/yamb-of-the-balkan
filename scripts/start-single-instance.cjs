'use strict';

const http = require('node:http');
const DRAIN_MS = 180000;

function startDrain({ port, host, delayMs = DRAIN_MS, load = () => require('../server') }) {
    // Render routes to the healthy maintenance bridge before retiring the old
    // process. Do not load the app, its database or its workers during this gap.
    const bridge = http.createServer((req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        if (req.method === 'GET' && req.url === '/healthz') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, maintenance: true, environment: 'production', phase: 'deployment_drain' }));
        } else {
            res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(Math.ceil(delayMs / 1000)) });
            res.end('Maintenance. Please try again shortly.');
        }
    });
    bridge.on('upgrade', (_req, socket) => socket.destroy());
    bridge.listen(port, host, () => {
        console.log('Deployment drain: maintenance bridge active; application and database not loaded.');
        setTimeout(() => {
            bridge.close(() => {
                console.log('Deployment drain complete: starting single application process.');
                load();
            });
            bridge.closeAllConnections();
        }, delayMs);
    });
    return bridge;
}

if (require.main === module) {
    if (/^(production|prod)$/i.test(process.env.YAMB_RUNTIME_ENV || 'production')) {
        startDrain({ port: Number(process.env.PORT) || 3000 });
    } else {
        require('../server');
    }
}

module.exports = { startDrain, DRAIN_MS };
