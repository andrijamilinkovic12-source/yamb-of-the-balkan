const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes'];
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
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result?.value;
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
                localStorage.setItem('yamb_theme', theme);
                window.app.applyTheme(theme, { initialLoad: true });
                riznicaManager.showRiznica();
                const images = [...document.querySelectorAll('#riznica-screen .tab-btn img.treasury-control-icon')];
                await Promise.all(images.map(image => image.decode().catch(() => null)));
                const categories = [];
                for (const [tab, role] of [['trophy', 'tab-trophies'], ['skin', 'tab-skins'],
                                           ['effect', 'tab-effects'], ['theme', 'tab-themes']]) {
                    riznicaManager.switchTab(tab);
                    const image = document.querySelector('#riznica-screen .category-header img[data-treasury-control="' + role + '"]');
                    if (image) await image.decode().catch(() => null);
                    categories.push({ tab, role, src: image?.getAttribute('src'),
                        expected: getThemeTreasuryControlSource(role, theme), naturalWidth: image?.naturalWidth });
                }
                return {
                    theme,
                    tabs: images.map(image => ({
                        role: image.dataset.treasuryControl,
                        src: image.getAttribute('src'),
                        expected: getThemeTreasuryControlSource(image.dataset.treasuryControl, theme),
                        naturalWidth: image.naturalWidth,
                        width: getComputedStyle(image).width,
                        height: getComputedStyle(image).height,
                        visible: Boolean(image.getBoundingClientRect().width && image.getBoundingClientRect().height)
                    })),
                    categories
                };
            })()`);
            assert.equal(result.tabs.length, 4, `${theme}: missing Treasury tab`);
            assert.deepEqual(result.tabs.map(tab => tab.role), roles, `${theme}: tab order`);
            for (const tab of result.tabs) {
                assert.equal(tab.src, tab.expected, `${theme}/${tab.role}: stale PNG`);
                assert.equal(tab.naturalWidth, 256, `${theme}/${tab.role}: PNG did not load`);
                assert.equal(tab.width, '34px');
                assert.equal(tab.height, '34px');
                assert(tab.visible, `${theme}/${tab.role}: hidden`);
                assert(tab.src.endsWith(theme === 'dark' ? '?v=2' : '?v=3'));
            }
            assert.equal(result.categories.length, 4);
            for (const category of result.categories) {
                assert.equal(category.src, category.expected, `${theme}/${category.tab}: category PNG missing or stale`);
                assert.equal(category.naturalWidth, 256);
            }
            report.themes.push(result);
            console.log(`${theme}: four current PNG tabs and four category icons, all loaded at 34px`);
        }
        fs.writeFileSync(path.join(root, 'docs/qa-treasury-tabs-v3-emulator-2026-10-10.json'),
            JSON.stringify(report, null, 2) + '\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
