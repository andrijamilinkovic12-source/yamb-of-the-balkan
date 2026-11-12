'use strict';
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { startDrain, DRAIN_MS } = require('./start-single-instance.cjs');

(async () => {
    assert.equal(DRAIN_MS, 180000);
    let loaded = 0, release;
    const finished = new Promise(resolve => { release = resolve; });
    const bridge = startDrain({ port: 0, host: '127.0.0.1', delayMs: 1500,
        load() { loaded++; assert(!bridge.listening); release(); } });
    await once(bridge, 'listening');
    const base = `http://127.0.0.1:${bridge.address().port}`;
    const status = await fetch(base + '/healthz');
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { ok: true, maintenance: true, environment: 'production', phase: 'deployment_drain' });
    for (const route of ['/', '/api/firebase-auth-status', '/socket.io/?EIO=4&transport=polling']) {
        const response = await fetch(base + route);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('retry-after'), '2');
    }
    await new Promise((resolve, reject) => {
        const socket = new WebSocket(base.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket');
        const timer = setTimeout(() => { socket.close(); reject(Error('Bridge retained a WebSocket')); }, 500);
        socket.onopen = () => { clearTimeout(timer); socket.close(); reject(Error('Bridge accepted a WebSocket')); };
        socket.onerror = () => { clearTimeout(timer); resolve(); };
    });
    assert.equal(loaded, 0, 'The application and its workers must not load while the old process drains');
    await finished;
    assert.equal(loaded, 1);
    const reservation = http.createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'yamb-drain-test-'));
    const child = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], { cwd, windowsHide: true,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, PORT: String(port), YAMB_RUNTIME_ENV: 'production' },
        stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    try {
        let status;
        for (let n = 0; n < 30; n++) {
            try { status = await (await fetch(`http://127.0.0.1:${port}/healthz`)).json(); break; } catch (_) {}
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal(status?.phase, 'deployment_drain', 'The actual production entry must not bypass the bridge');
        assert(!/Firebase|MongoDB|Turnir/.test(output), 'No app worker or database initialization is allowed during drain');
    } finally {
        const exited = once(child, 'exit');
        child.kill();
        await exited;
        fs.rmdirSync(cwd);
    }
    console.log('PASS: maintenance-only bridge, honest phase status, blocked public/socket requests, delayed single app load and port release.');
})().catch(error => { console.error(error); process.exitCode = 1; });
