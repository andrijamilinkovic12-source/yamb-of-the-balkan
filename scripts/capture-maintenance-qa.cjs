const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'tmp', 'maintenance-qa');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9339;
const baseUrl = 'http://localhost:3189/';
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const cases = [
    ...themes.map(theme => ({ name: `${theme}-390x844`, theme, language: theme === 'neon' ? 'en' : 'sr', width: 390, height: 844 })),
    { name: 'dark-small-320x568', theme: 'dark', language: 'sr', width: 320, height: 568 },
    { name: 'easter-large-430x932', theme: 'easter', language: 'en', width: 430, height: 932 },
    { name: 'severna-landscape-844x390', theme: 'severna', language: 'sr', width: 844, height: 390 }
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForDebugEndpoint() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
            if (response.ok) return response.json();
        } catch (_) {}
        await delay(100);
    }
    throw new Error('Edge remote debugging endpoint did not start');
}

function createClient(url) {
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();

    socket.on('message', raw => {
        const message = JSON.parse(raw.toString());
        if (!message.id || !pending.has(message.id)) return;
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result || {});
    });

    const ready = new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });

    return {
        ready,
        send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = nextId++;
                pending.set(id, { resolve, reject });
                socket.send(JSON.stringify({ id, method, params }));
            });
        },
        close() { socket.close(); }
    };
}

async function waitForPage(client) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await client.send('Runtime.evaluate', {
            expression: `document.readyState === 'complete' && !!document.querySelector('#yamb-maintenance-overlay:not([hidden])') && (!document.fonts || document.fonts.status === 'loaded')`,
            returnByValue: true
        });
        if (result.result?.value === true) return;
        await delay(100);
    }
    throw new Error('Maintenance page did not become ready');
}

async function main() {
    fs.mkdirSync(outputDir, { recursive: true });
    const profileDir = path.join(outputDir, 'edge-profile');
    const edge = spawn(edgePath, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDir}`,
        'about:blank'
    ], { stdio: 'ignore' });

    try {
        const targets = await waitForDebugEndpoint();
        const target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
        if (!target) throw new Error('No Edge page target found');
        const client = createClient(target.webSocketDebuggerUrl);
        await client.ready;
        await client.send('Page.enable');
        await client.send('Runtime.enable');

        const report = [];
        for (const testCase of cases) {
            await client.send('Emulation.setDeviceMetricsOverride', {
                width: testCase.width,
                height: testCase.height,
                deviceScaleFactor: 1,
                mobile: true,
                screenWidth: testCase.width,
                screenHeight: testCase.height,
                screenOrientation: {
                    type: testCase.width > testCase.height ? 'landscapePrimary' : 'portraitPrimary',
                    angle: testCase.width > testCase.height ? 90 : 0
                }
            });
            const url = `${baseUrl}?maintenance-theme=${testCase.theme}&maintenance-lang=${testCase.language}`;
            await client.send('Page.navigate', { url });
            await waitForPage(client);
            const metricsResult = await client.send('Runtime.evaluate', {
                expression: `(() => {
                    const overlay = document.getElementById('yamb-maintenance-overlay');
                    const stage = overlay.querySelector('.yamb-maintenance__safe-stage').getBoundingClientRect();
                    const panel = overlay.querySelector('.yamb-maintenance__panel').getBoundingClientRect();
                    return {
                        theme: overlay.dataset.maintenanceTheme,
                        language: document.documentElement.lang,
                        innerWidth, innerHeight,
                        scrollWidth: document.documentElement.scrollWidth,
                        scrollHeight: document.documentElement.scrollHeight,
                        stage: { top: stage.top, right: stage.right, bottom: stage.bottom, left: stage.left, width: stage.width, height: stage.height },
                        panel: { top: panel.top, right: panel.right, bottom: panel.bottom, left: panel.left, width: panel.width, height: panel.height },
                        title: overlay.querySelector('.yamb-maintenance__title').textContent,
                        visible: !overlay.hidden
                    };
                })()`,
                returnByValue: true
            });
            const screenshot = await client.send('Page.captureScreenshot', {
                format: 'png',
                fromSurface: true,
                captureBeyondViewport: false
            });
            fs.writeFileSync(path.join(outputDir, `${testCase.name}.png`), Buffer.from(screenshot.data, 'base64'));
            report.push({ name: testCase.name, ...metricsResult.result.value });
        }

        fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
        client.close();
        console.log(JSON.stringify(report, null, 2));
    } finally {
        edge.kill();
    }
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
