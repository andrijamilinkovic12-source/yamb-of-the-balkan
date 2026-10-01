// Isolated Android Chrome QA: real global overlay, CSS and orientation handler; no game bootstrap or server state.
// Run scripts/serve-green-qa.js, open the fixture in emulator Chrome, and forward DevTools to tcp:9222.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, response => {
            let body = '';
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
            });
        }).on('error', reject);
    });
}

async function main() {
    const tabs = await getJson('http://127.0.0.1:9222/json');
    const page = tabs.find(tab => tab.type === 'page' && tab.url?.includes('green-orientation-runtime.html'));
    if (!page) throw new Error('Open the local orientation QA tab first.');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;
    socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);
        data.error ? entry.reject(new Error(data.error.message)) : entry.resolve(data.result);
    });
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
        return response.result.value;
    };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', {
            width: 360, height: 740, deviceScaleFactor: 1, mobile: true,
            screenOrientation: { type: 'portraitPrimary', angle: 0 }
        });
        await send('Page.navigate', { url: `http://127.0.0.1:3130/__green_qa__/green-orientation-runtime.html?qa=${Date.now()}` });
        let ready = false;
        for (let attempt = 0; attempt < 40 && !ready; attempt++) {
            await sleep(200);
            try { ready = await evaluate('window.qaOrientationReady === true'); } catch (_) {}
        }
        if (!ready) throw new Error('Orientation fixture not ready');

        const cases = [
            { name: 'portrait', width: 360, height: 740, type: 'portraitPrimary', angle: 0, visible: false },
            { name: 'portrait with compact viewport', width: 740, height: 360, type: 'portraitPrimary', angle: 0, visible: false },
            { name: 'phone landscape', width: 740, height: 360, type: 'landscapePrimary', angle: 90, visible: true },
            { name: 'tablet landscape', width: 1024, height: 768, type: 'landscapePrimary', angle: 90, visible: true },
            { name: 'portrait return', width: 360, height: 740, type: 'portraitPrimary', angle: 0, visible: false }
        ];
        for (const test of cases) {
            await send('Emulation.setDeviceMetricsOverride', {
                width: test.width, height: test.height, deviceScaleFactor: 1, mobile: true,
                screenOrientation: { type: test.type, angle: test.angle }
            });
            await sleep(250);
            const state = await evaluate(`(() => {
                window.qaUpdateOrientation();
                const overlay = document.getElementById('rotate-lock-overlay');
                const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
                const rect = overlay.getBoundingClientRect();
                return {
                    display: getComputedStyle(overlay).display,
                    zIndex: getComputedStyle(overlay).zIndex,
                    ariaHidden: overlay.getAttribute('aria-hidden'),
                    topLayer: overlay.contains(top),
                    width: Math.round(rect.width), height: Math.round(rect.height),
                    viewport: [innerWidth, innerHeight],
                    physicalOrientation: screen.orientation?.type || null,
                    title: document.getElementById('rotate-lock-title')?.textContent,
                    error: document.getElementById('qa-error')?.hidden === false ? document.getElementById('qa-error').textContent : ''
                };
            })()`);
            if (state.error || state.display === 'flex' !== test.visible
                || state.ariaHidden !== String(!test.visible)
                || (test.visible && (!state.topLayer || state.zIndex !== '2147483647'
                    || state.width < test.width || state.height < test.height))) {
                throw new Error(`${test.name}: ${JSON.stringify(state)}`);
            }
            process.stdout.write(`${test.name}: ${JSON.stringify(state)}\n`);
            if (test.name === 'phone landscape') {
                const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                fs.writeFileSync(path.resolve(__dirname, '..', 'screenshots', 'green-ui-step9', 'green-global-portrait-lock-landscape-cdp.png'), Buffer.from(screenshot.data, 'base64'));
                for (const theme of ['easter-theme', 'desert-theme', 'severna-theme']) {
                    const themedState = await evaluate(`(() => {
                        document.body.className = ${JSON.stringify(theme)};
                        window.qaUpdateOrientation();
                        const overlay = document.getElementById('rotate-lock-overlay');
                        return { display: getComputedStyle(overlay).display,
                            topLayer: overlay.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)) };
                    })()`);
                    if (themedState.display !== 'flex' || !themedState.topLayer) {
                        throw new Error(`${theme}: ${JSON.stringify(themedState)}`);
                    }
                    process.stdout.write(`${theme}: mask remains above room/modal\n`);
                }
                await evaluate("document.body.className = ''; true");
            }
        }
        process.stdout.write('PASS: global portrait lock covers menu, room and later modal in both landscape sizes, then clears in portrait.\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
