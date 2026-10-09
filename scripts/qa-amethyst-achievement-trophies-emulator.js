const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA app WebView is unavailable');
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
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result?.value;
    };
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await evaluate("localStorage.setItem('yamb_theme','amethyst'); localStorage.setItem('yamb_last_theme','amethyst'); localStorage.setItem('yamb_lang','sr'); true");
        await send('Page.navigate', { url: 'https://localhost/' });
        let state;
        for (let attempt = 0; attempt < 40; attempt++) {
            state = await evaluate(`({
                theme: document.documentElement?.dataset?.splashTheme,
                bodyClass: document.body?.className || '',
                viewport: [innerWidth, innerHeight, devicePixelRatio],
                lang: localStorage.getItem('yamb_lang') || 'sr',
                trophies: typeof SHOP_DATA === 'undefined' ? -1 : SHOP_DATA.TROPHIES.length,
                amethystIcon: typeof SHOP_DATA === 'undefined' ? '' : SHOP_DATA.TROPHIES[0].amethystIcon,
                treasuryManager: typeof riznicaManager,
                app: typeof window.app
            })`);
            if (state.theme === 'amethyst' && state.bodyClass.includes('amethyst-theme') && state.trophies === 26) break;
            await sleep(500);
        }
        assert.equal(state.theme, 'amethyst');
        assert.equal(state.trophies, 26);
        const treasury = await evaluate(`(async () => {
            riznicaManager.switchTab('trophy');
            const images = [...document.querySelectorAll('#riznica-screen .riznica-trophy-soft-clay-icon')];
            images.forEach(img => { img.loading = 'eager'; });
            await Promise.all(images.map(img => img.decode().catch(() => null)));
            return {
                cardImages: images.length,
                loadedImages: images.filter(img => img.naturalWidth === 256).length,
                firstSource: images[0]?.getAttribute('src'),
                firstDisplay: images[0] ? getComputedStyle(images[0]).display : null,
                firstFallbackDisplay: getComputedStyle(document.querySelector('#riznica-screen .riznica-trophy-fallback')).display
            };
        })()`);
        assert.equal(treasury.cardImages, 26);
        assert.equal(treasury.loadedImages, 26);
        assert.equal(treasury.firstDisplay, 'block');
        assert.equal(treasury.firstFallbackDisplay, 'none');
        await evaluate("riznicaManager.showRiznica(); true");
        await sleep(800);
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const screenshotPath = path.resolve(__dirname, '../docs/qa-amethyst-trophy-emulator.png');
        fs.writeFileSync(screenshotPath,
            Buffer.from(screenshot.data, 'base64'));
        await evaluate("window.app.showTrophyUnlockShowcase(SHOP_DATA.TROPHIES.slice(0, 2)); true");
        await sleep(500);
        const showcase = await evaluate(`(async () => {
            const images = [...document.querySelectorAll('.trophy-showcase .amethyst-trophy-showcase-icon')];
            await Promise.all(images.map(img => img.decode().catch(() => null)));
            return { count: images.length, loaded: images.filter(img => img.naturalWidth === 256).length };
        })()`);
        assert.equal(showcase.count, 2);
        assert.equal(showcase.loaded, 2);
        const showcaseShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.resolve(__dirname, '../docs/qa-amethyst-trophy-showcase-emulator.png'),
            Buffer.from(showcaseShot.data, 'base64'));
        await evaluate("document.querySelector('.trophy-showcase')?.remove(); window.trophyManager.showNotification(SHOP_DATA.TROPHIES[2], 500); true");
        await sleep(800);
        const popup = await evaluate(`(async () => {
            const image = document.querySelector('.trophy-popup .amethyst-trophy-popup-icon');
            await image?.decode().catch(() => null);
            const rect = image?.closest('.trophy-popup')?.getBoundingClientRect();
            return { count: document.querySelectorAll('.trophy-popup .amethyst-trophy-popup-icon').length,
                loaded: image?.naturalWidth === 256,
                visible: !!rect && rect.bottom > 0 && rect.top < innerHeight,
                popupTop: rect?.top };
        })()`);
        assert.equal(popup.count, 1);
        assert(popup.loaded);
        assert(popup.visible, `Trophy popup is outside the viewport at top ${popup.popupTop}`);
        const popupShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.resolve(__dirname, '../docs/qa-amethyst-trophy-popup-emulator.png'),
            Buffer.from(popupShot.data, 'base64'));
        const report = {
            date: '2026-10-09',
            device: 'Easter_QA_10GB Android emulator',
            build: 'qaLocal 12.2 (versionCode 112)',
            viewportCssPx: state.viewport.slice(0, 2),
            devicePixelRatio: state.viewport[2],
            language: state.lang,
            theme: state.theme,
            trophyCount: treasury.cardImages,
            loadedPngCount: treasury.loadedImages,
            firstCardSource: treasury.firstSource,
            imageDisplay: treasury.firstDisplay,
            fallbackDisplay: treasury.firstFallbackDisplay,
            screenshots: [
                'docs/qa-amethyst-trophy-emulator.png',
                'docs/qa-amethyst-trophy-showcase-emulator.png',
                'docs/qa-amethyst-trophy-popup-emulator.png'
            ],
            showcaseIconsLoaded: showcase.loaded,
            popupIconLoaded: popup.loaded
        };
        fs.writeFileSync(path.resolve(__dirname, '../docs/qa-amethyst-trophy-emulator-2026-10-09.json'),
            JSON.stringify(report, null, 2) + '\n');
        console.log('PASS: 26/26 Kraljevski Ametist trophies render in Treasury; showcase and popup icons load in Android WebView.');
    } finally {
        socket.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });



