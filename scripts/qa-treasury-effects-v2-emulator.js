const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['confetti', 'gold-rain', 'wedding', 'thunder', 'fireworks', 'bubbles', 'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'ice-age', 'black-hole', 'supernova', 'neon-pulse', 'drones', 'ufo-abduction'];
const roleClasses = ['confetti', 'gold_rain', 'balkan', 'thunder', 'fireworks', 'bubbles', 'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'glass', 'black-hole', 'supernova', 'neon', 'drones', 'ufo-abduction'];

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView is unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let nextId = 0;
    const pending = new Map();
    socket.on('message', bytes => {
        const response = JSON.parse(String(bytes));
        const request = pending.get(response.id);
        if (!request) return;
        pending.delete(response.id);
        response.error ? request.reject(new Error(JSON.stringify(response.error))) : request.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, {resolve, reject});
        socket.send(JSON.stringify({id, method, params}), error => error && reject(error));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result?.value;
    };
    const report = {date: '2026-10-11', build: 'Android qaLocal from current www', themes: []};
    try {
        await send('Runtime.enable');
        for (let attempt = 0; attempt < 40; attempt++) {
            if (await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'")) break;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        assert(await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'"));
        report.viewport = await evaluate('[innerWidth, innerHeight, devicePixelRatio]');
        for (const theme of themes) {
            const result = await evaluate(`(async () => {
                const theme = ${JSON.stringify(theme)};
                const roles = ${JSON.stringify(roles)};
                window.app.applyTheme(theme, {initialLoad: true});
                riznicaManager.showRiznica();
                riznicaManager.switchTab('effect');
                await new Promise(resolve => setTimeout(resolve, 550));
                const boxes = [...document.querySelectorAll('#riznica-screen .effect-preview-box')];
                const preview = await Promise.all(boxes.map(async box => {
                    const source = getComputedStyle(box, '::before').backgroundImage;
                    const match = source.match(/url\\(["']?([^"')]+)/);
                    const image = new Image();
                    if (match) image.src = match[1];
                    await image.decode().catch(() => null);
                    return {classes: box.className, source, width: image.naturalWidth, height: image.naturalHeight,
                        after: getComputedStyle(box, '::after').content,
                        boxWidth: Math.round(box.getBoundingClientRect().width), boxHeight: Math.round(box.getBoundingClientRect().height)};
                }));
                return {theme, count: boxes.length, preview};
            })()`);
            assert.equal(result.count, 16, `${theme}: expected 16 effect cards`);
            for (let index = 0; index < roles.length; index++) {
                const item = result.preview.find(entry => entry.classes.split(/\s+/).includes(`prev-${roleClasses[index]}`));
                assert(item, `${theme}/${roles[index]}: effect card is missing`);
                const expected = theme === 'dark'
                    ? `green-soft-clay/canonical/treasury-effect-previews/preview-${roles[index]}-v1.png`
                    : `theme-packs/${theme}/canonical/treasury-effect-previews/preview-${roles[index]}-v1.png`;
                assert(item.source.includes(expected), `${theme}/${roles[index]}: incorrect PNG binding ${item.source}`);
                assert.equal(item.width, 384, `${theme}/${roles[index]}: PNG did not decode`);
                assert.equal(item.height, 256, `${theme}/${roles[index]}: unexpected PNG dimensions`);
                assert.equal(item.boxWidth, 152, `${theme}/${roles[index]}: preview width differs from Green`);
                assert.equal(item.boxHeight, 70, `${theme}/${roles[index]}: preview height differs from Green`);
                assert.equal(item.after, 'none', `${theme}/${roles[index]}: legacy overlay remains`);
            }
            report.themes.push({theme, count: result.count, decoded: result.preview.length,
                previewWidth: result.preview[0].boxWidth, previewHeight: result.preview[0].boxHeight,
                dimensions: [...new Set(result.preview.map(item => `${item.boxWidth}x${item.boxHeight}`))],
                afterLayers: result.preview.filter(item => item.after !== 'none').length});
            console.log(`${theme}: 16/16 theme-specific PNGs decoded`);
        }
        report.pass = true;
    } finally {
        socket.close();
        fs.writeFileSync(path.join(root, 'docs/qa-treasury-effects-v2-emulator-2026-10-11.json'), JSON.stringify(report, null, 2) + '\n');
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
