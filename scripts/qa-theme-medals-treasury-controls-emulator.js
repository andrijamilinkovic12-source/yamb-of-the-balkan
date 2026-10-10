const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
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
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        for (let attempt = 0; attempt < 30; attempt++) {
            if (await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'")) break;
            await sleep(500);
        }
        await evaluate("riznicaManager.switchTab('trophy'); true");
        const report = {
            date: '2026-10-10',
            device: 'Easter_QA_10GB Android emulator',
            build: 'qaLocal from current www; theme-DNA medal and Treasury-control revision 2',
            viewport: await evaluate('[innerWidth, innerHeight, devicePixelRatio]'),
            themes: []
        };
        for (const theme of themes) {
            const result = await evaluate(`(async () => {
                const theme = ${JSON.stringify(theme)};
                localStorage.setItem('yamb_theme', theme);
                window.app.applyTheme(theme, { initialLoad: true });
                const controls = ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes',
                    'status-owned', 'status-active', 'status-locked', 'status-insufficient'];
                const contexts = ['collection', 'leaderboard', 'tournament', 'quarterlyLeague', 'powerIndex', 'fireStreak'];
                const paths = [
                    ...controls.map(role => getThemeTreasuryControlSource(role, theme)),
                    ...contexts.flatMap(context => ['gold', 'silver', 'bronze'].map(tier => getThemeMedalSource(context, tier, theme)))
                ];
                const images = paths.map(src => { const img = new Image(); img.src = src; return img; });
                await Promise.all(images.map(img => img.decode().catch(() => null)));
                const tabs = [...document.querySelectorAll('#riznica-screen img[data-treasury-control]')];
                await Promise.all(tabs.map(img => img.decode().catch(() => null)));
                const renderedStatus = [...document.querySelectorAll('#riznica-screen img.treasury-status-icon, #riznica-screen img.treasury-lock-icon')];
                await Promise.all(renderedStatus.map(img => img.decode().catch(() => null)));
                return {
                    theme: document.documentElement.dataset.splashTheme,
                    bodyThemeClass: theme === 'dark' ? !document.body.classList.contains('light-theme') : document.body.classList.contains(theme + '-theme'),
                    loadedControls: images.slice(0, 8).filter(img => img.naturalWidth === 256).length,
                    loadedMedals: images.slice(8).filter(img => img.naturalWidth === 256).length,
                    tabs: tabs.filter(img => img.classList.contains('treasury-control-icon')).map(img => ({ role: img.dataset.treasuryControl, src: img.getAttribute('src'), loaded: img.naturalWidth === 256,
                        display: getComputedStyle(img).display, width: getComputedStyle(img).width, height: getComputedStyle(img).height })),
                    renderedStatusCount: renderedStatus.length,
                    renderedStatusLoaded: renderedStatus.filter(img => img.naturalWidth === 256).length,
                    renderedStatusPathsCorrect: renderedStatus.every(img => img.getAttribute('src')?.includes(theme === 'dark' ? 'green-soft-clay' : 'theme-packs/' + theme))
                };
            })()`);
            assert.equal(result.theme, theme, `${theme}: wrong theme`);
            assert(result.bodyThemeClass, `${theme}: body class wrong`);
            assert.equal(result.loadedControls, 8, `${theme}: controls did not load`);
            assert.equal(result.loadedMedals, 18, `${theme}: medals did not load`);
            assert.equal(result.tabs.length, 4, `${theme}: missing tabs`);
            assert(result.renderedStatusCount > 0, `${theme}: missing rendered statuses`);
            assert.equal(result.renderedStatusLoaded, result.renderedStatusCount, `${theme}: status PNG did not load`);
            assert(result.renderedStatusPathsCorrect, `${theme}: stale rendered status from previous theme`);
            for (const tab of result.tabs) {
                assert(tab.loaded, `${theme}/${tab.role}: tab did not load`);
                assert.equal(tab.display, 'block');
                assert.equal(tab.width, '34px');
                assert.equal(tab.height, '34px');
                assert(tab.src.includes(theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`));
            }
            report.themes.push(result);
            console.log(`${theme}: 8 controls, 18 medals, 4 tabs at 34px`);
            if (theme === 'light' || theme === 'neon') {
                await evaluate("riznicaManager.showRiznica(); true");
                await sleep(5000);
                const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                const file = `docs/qa-${theme}-theme-dna-emulator-2026-10-10.png`;
                fs.writeFileSync(path.join(root, file), Buffer.from(shot.data, 'base64'));
                result.screenshot = file;
            }
        }
        fs.writeFileSync(path.join(root, 'docs/qa-theme-dna-medals-controls-emulator-2026-10-10.json'),
            JSON.stringify(report, null, 2) + '\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
