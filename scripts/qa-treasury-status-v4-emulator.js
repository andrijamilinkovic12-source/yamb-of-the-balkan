const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['status-owned', 'status-active', 'status-locked', 'status-insufficient'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'Android QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let nextId = 0;
    const pending = new Map();
    socket.on('message', bytes => {
        const response = JSON.parse(String(bytes));
        const waiter = pending.get(response.id);
        if (!waiter) return;
        pending.delete(response.id);
        response.error ? waiter.reject(new Error(JSON.stringify(response.error))) : waiter.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }), error => error && reject(error));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result?.value;
    };
    const report = { date: '2026-10-10', build: 'Android qaLocal built from current www', themes: [] };
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        for (let attempt = 0; attempt < 30; attempt++) {
            if (await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'")) break;
            await sleep(500);
        }
        assert(await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'"));
        report.viewport = await evaluate('[innerWidth, innerHeight, devicePixelRatio]');
        for (const theme of themes) {
            const result = await evaluate(`(async () => {
                const theme = ${JSON.stringify(theme)};
                const roles = ${JSON.stringify(roles)};
                localStorage.setItem('yamb_theme', theme);
                window.app.applyTheme(theme, { initialLoad: true });
                riznicaManager.showRiznica();
                const natural = [];
                for (const tab of ['skin', 'effect', 'theme', 'trophy']) {
                    riznicaManager.switchTab(tab);
                    const images = [...document.querySelectorAll('#riznica-screen img[data-treasury-control^="status-"]')];
                    await Promise.all(images.map(image => image.decode().catch(() => null)));
                    natural.push({ tab, count: images.length, images: images.map(image => ({
                        role: image.dataset.treasuryControl,
                        src: image.getAttribute('src'), naturalWidth: image.naturalWidth,
                        width: getComputedStyle(image).width, height: getComputedStyle(image).height
                    })) });
                }
                const host = document.querySelector('#riznica-screen');
                const probes = await Promise.all(roles.map(async role => {
                    const image = document.createElement('img');
                    image.className = role === 'status-locked' ? 'treasury-lock-icon' : 'treasury-status-icon';
                    image.dataset.treasuryControl = role;
                    image.style.position = 'absolute';
                    image.style.opacity = '0';
                    image.src = getThemeTreasuryControlSource(role, theme);
                    host.appendChild(image);
                    await image.decode().catch(() => null);
                    const sample = { role, src: image.getAttribute('src'),
                        expected: getThemeTreasuryControlSource(role, theme),
                        naturalWidth: image.naturalWidth, width: getComputedStyle(image).width,
                        height: getComputedStyle(image).height };
                    image.remove();
                    return sample;
                }));
                return { theme, natural, probes };
            })()`);
            assert.equal(result.probes.length, 4);
            for (const probe of result.probes) {
                assert.equal(probe.src, probe.expected, `${theme}/${probe.role}: stale source`);
                assert.equal(probe.naturalWidth, 256, `${theme}/${probe.role}: PNG did not decode`);
                const size = probe.role === 'status-locked' ? '20px' : '22px';
                assert.equal(probe.width, size);
                assert.equal(probe.height, size);
                assert(probe.src.endsWith(theme === 'dark' ? '?v=2' : '?v=4'));
            }
            for (const group of result.natural) {
                for (const image of group.images) {
                    assert.equal(image.src, result.probes.find(probe => probe.role === image.role)?.src,
                        `${theme}/${group.tab}/${image.role}: stale visible icon`);
                    assert.equal(image.naturalWidth, 256);
                    const size = image.width === '20px' ? '20px' : '22px';
                    assert.equal(image.width, size);
                    assert.equal(image.height, size);
                }
            }
            report.themes.push({
                theme,
                probes: result.probes,
                natural: result.natural.map(group => ({
                    tab: group.tab,
                    count: group.count,
                    roles: [...new Set(group.images.map(image => image.role))]
                }))
            });
            console.log(`${theme}: four current PNG status sources decoded; room icons checked`);
        }
        fs.writeFileSync(path.join(root, 'docs/qa-treasury-status-v4-emulator-2026-10-10.json'),
            JSON.stringify(report, null, 2) + '\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
