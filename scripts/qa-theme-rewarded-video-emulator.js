/** Decode all nine rewarded-video packs in the actual Android QA WebView. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const themes = process.env.QA_THEME
    ? [process.env.QA_THEME]
    : ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = [
    'canonical/rewarded-video/rewarded-video-active-v1.png',
    'canonical/rewarded-video/rewarded-video-active-inline-v1.png',
    'canonical/rewarded-video/rewarded-video-unavailable-v1.png',
    'canonical/rewarded-video/rewarded-video-unavailable-inline-v1.png',
    'daily/reward-video-v3.png',
    'treasury/reward-video-v3.png',
    'solo/finish-reward-video-v3.png'
];
const sizes = [256, 128, 256, 128, 384, 256, 384];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'Local QA WebView is unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let id = 0;
    const pending = new Map();
    socket.on('message', bytes => {
        const response = JSON.parse(String(bytes));
        const entry = pending.get(response.id);
        if (!entry) return;
        pending.delete(response.id);
        response.error ? entry.reject(new Error(JSON.stringify(response.error))) : entry.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }), error => error && reject(error));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result?.value;
    };
    const report = [];
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        for (const theme of themes) {
            await evaluate(`localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); localStorage.setItem('yamb_last_theme', ${JSON.stringify(theme)}); true`);
            await send('Page.navigate', { url: 'https://localhost/' });
            let ready = false;
            for (let attempt = 0; attempt < 50; attempt++) {
                try {
                    ready = await evaluate(`document.documentElement?.dataset?.splashTheme === ${JSON.stringify(theme)}
                        && document.body?.classList?.contains(${JSON.stringify(theme + '-theme')})
                        && document.body?.classList?.contains('theme-rewarded-video-pack-active')`);
                } catch (_) { ready = false; }
                if (ready) break;
                await sleep(500);
            }
            assert(ready, `${theme}: app theme did not settle`);
            const result = await evaluate(`(async () => {
                const theme = ${JSON.stringify(theme)};
                const roles = ${JSON.stringify(roles)};
                const greenPrefix = 'assets/green-soft-clay/';
                const mapped = [...document.querySelectorAll('img[data-theme-src]')]
                    .filter(img => roles.some(role => img.dataset.themeSrc.startsWith(greenPrefix + role)))
                    .map(img => ({ original: img.dataset.themeSrc.split('?')[0], source: img.getAttribute('src') }));
                const legacy = [...document.querySelectorAll('.theme-rewarded-video-legacy')];
                const decoded = await Promise.all(roles.map(role => new Promise(resolve => {
                    const image = new Image();
                    image.onload = () => resolve({ role, width: image.naturalWidth, height: image.naturalHeight });
                    image.onerror = () => resolve({ role, error: true });
                    image.src = 'assets/theme-packs/' + theme + '/' + role;
                })));
                return {
                    viewport: [innerWidth, innerHeight, devicePixelRatio],
                    language: localStorage.getItem('yamb_lang') || 'sr',
                    mapped, legacyCount: legacy.length,
                    visibleLegacyCount: legacy.filter(img => getComputedStyle(img).display !== 'none').length,
                    legacyDetails: legacy.map(img => ({
                        source: img.dataset.themeSrc, display: getComputedStyle(img).display,
                        parentClass: img.parentElement?.className || ''
                    })),
                    decoded
                };
            })()`);
            for (const item of result.mapped) {
                const role = item.original.slice('assets/green-soft-clay/'.length);
                assert.equal(item.source, `assets/theme-packs/${theme}/${role}`, `${theme}: wrong DOM source`);
            }
            assert(result.mapped.length >= 4, `${theme}: expected real rewarded-video DOM anchors`);
            assert.equal(result.visibleLegacyCount, 0, `${theme}: a legacy icon is visible ${JSON.stringify(result.legacyDetails)}`);
            result.decoded.forEach((item, index) => {
                assert.equal(item.width, sizes[index], `${theme}/${item.role}: PNG failed to decode`);
                assert.equal(item.height, sizes[index], `${theme}/${item.role}: wrong height`);
            });
            const { legacyDetails, ...summary } = result;
            report.push({ theme, ...summary });
            console.log(`${theme}: ${result.mapped.length} mapped DOM images, 7/7 PNGs decoded, 0 visible legacy`);
        }
        const root = path.resolve(__dirname, '..');
        const apk = path.join(root, 'android/app/build/outputs/apk/qaLocal/app-qaLocal.apk');
        const evidence = {
            date: '2026-10-08',
            device: 'Easter_QA_10GB Android emulator',
            build: 'qaLocal 12.2 (versionCode 112)',
            apkModifiedAt: fs.statSync(apk).mtime.toISOString(),
            result: 'runtime asset routing and decoding passed; real rewarded-ad transaction and room-level visual QA remain separate',
            themes: report
        };
        fs.writeFileSync(path.join(root, 'docs/qa-theme-rewarded-video-emulator-2026-10-08.json'),
            JSON.stringify(evidence, null, 2) + '\n');
        console.log('PASS: 9 themes × 7 rewarded-video PNGs decode in Android WebView.');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
