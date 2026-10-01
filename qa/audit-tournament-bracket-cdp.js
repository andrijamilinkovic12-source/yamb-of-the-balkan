// Read-only visual audit of the isolated Green tournament bracket in a local CDP browser.
// Start scripts/serve-green-qa.js and Android Chrome with adb forward tcp:9222.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const origin = 'http://127.0.0.1:3130';
const screenshots = path.resolve(__dirname, '..', 'screenshots', 'green-ui-step9');
const viewportHeight = Number(process.env.TOURNEY_QA_HEIGHT || 700);

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
    const page = tabs.find(tab => tab.type === 'page' && tab.url?.includes('green-runtime.html'));
    if (!page) throw new Error('Local Green QA browser tab not found.');
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
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    };
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 360, height: viewportHeight, deviceScaleFactor: 1, mobile: true });
        await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
        const states = [
            ['quarter', 0, 4], ['semi', 1, 2], ['final', 2, 1]
        ];
        for (const [name, pageIndex, expectedCount] of states) {
            await send('Page.navigate', { url: `${origin}/__green_qa__/green-runtime.html?qa_run=${name}-${Date.now()}#tournament-${name}` });
            for (let attempt = 0; attempt < 30; attempt++) {
                await pause(200);
                try {
                    const ready = await evaluate(`Boolean(document.querySelector('#tournament-screen.active #tourney-carousel') && location.hash === '#tournament-${name}')`);
                    if (ready) break;
                } catch (_) { /* navigation is still replacing its execution context */ }
            }
            if (pageIndex > 0) {
                await evaluate(`document.getElementById('tdot-${pageIndex}').click()`);
                await pause(450);
            }
            let metrics;
            for (let attempt = 0; attempt < 30 && !metrics; attempt++) {
                await pause(200);
                try { metrics = await evaluate(`(() => {
                document.documentElement.style.fontSize = '130%';
                const screen = document.querySelector('#tournament-screen');
                const carousel = document.querySelector('#tourney-carousel');
                if (!screen?.classList.contains('active') || !carousel || location.hash !== '#tournament-${name}') return null;
                const page = carousel?.querySelectorAll('.tourney-page')[${pageIndex}];
                const card = page?.querySelector('.tourney-card');
                const matches = page?.querySelector('.tourney-matches');
                const round = page?.querySelector('.tourney-round-title');
                const dots = [...document.querySelectorAll('.tourney-pagination .dot')];
                const bounds = [...(matches?.children || [])].map(item => {
                    const box = item.getBoundingClientRect();
                    return { top: box.top, bottom: box.bottom, height: box.height, scrollHeight: item.scrollHeight, clientHeight: item.clientHeight };
                });
                const content = matches?.getBoundingClientRect();
                return {
                    error: document.querySelector('#qa-error')?.textContent || '',
                    screenActive: screen?.classList.contains('active'),
                    cardBottom: card?.getBoundingClientRect().bottom,
                    cardBorder: getComputedStyle(card).borderTopWidth,
                    cardShadow: getComputedStyle(card).boxShadow,
                    contentBottom: content?.bottom,
                    shellBottom: screen?.querySelector('.tourney-shell')?.getBoundingClientRect().bottom,
                    tabBottom: screen?.querySelector('.tourney-tabs')?.getBoundingClientRect().bottom,
                    dotsBottom: screen?.querySelector('.tourney-pagination')?.getBoundingClientRect().bottom,
                    tabPaddingBottom: getComputedStyle(screen?.querySelector('.tourney-tab-content')).paddingBottom,
                    count: bounds.length,
                    matchesScrollHeight: matches?.scrollHeight,
                    matchesClientHeight: matches?.clientHeight,
                    matchesOverflowY: getComputedStyle(matches).overflowY,
                    matchBounds: bounds,
                    dots: dots.map(dot => ({ type: dot.tagName, active: dot.classList.contains('active'), width: dot.getBoundingClientRect().width })),
                    title: round?.textContent.trim(),
                    carouselWidth: carousel?.clientWidth,
                    pageIndex: Math.round((carousel?.scrollLeft || 0) / (carousel?.clientWidth || 1)),
                    docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
                };
            })()`); } catch (_) { /* navigation may still be replacing its execution context */ }
            }
            if (!metrics) throw new Error(`${name}: fixture did not load`);
            if (metrics.error || !metrics.screenActive || metrics.count !== expectedCount || metrics.docOverflow
                || metrics.cardBorder !== '0px' || metrics.cardShadow !== 'none') {
                throw new Error(`${name}: invalid fixture/layout ${JSON.stringify(metrics)}`);
            }
            const shortQuarter = viewportHeight <= 640 && name === 'quarter';
            if ((shortQuarter && metrics.matchesOverflowY !== 'auto')
                || (!shortQuarter && metrics.matchesScrollHeight > metrics.matchesClientHeight + 2)
                || metrics.matchBounds.some(box => box.scrollHeight > box.clientHeight + 2
                    || (!shortQuarter && (box.top < 0 || box.bottom > metrics.contentBottom + 2)))) {
                throw new Error(`${name}: bracket content clipped or nested scroll ${JSON.stringify(metrics)}`);
            }
            if (metrics.pageIndex !== pageIndex || metrics.dots.filter(dot => dot.active).length !== 1
                || !metrics.dots[pageIndex].active || metrics.dots.some(dot => dot.type !== 'BUTTON' || dot.width < 40)) {
                throw new Error(`${name}: pagination invalid ${JSON.stringify(metrics)}`);
            }
            await evaluate(`(async () => {
                document.getElementById('qa-caption').style.display = 'none';
                const visible = [...document.querySelectorAll('#tournament-screen img')]
                    .filter(image => image.currentSrc && getComputedStyle(image).display !== 'none');
                await Promise.all(visible.map(image => image.decode().catch(() => {})));
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                return true;
            })()`);
            const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            const suffix = viewportHeight === 700 ? '' : `-h${viewportHeight}`;
            fs.writeFileSync(path.join(screenshots, `green-tournament-${name}-swipe-layout${suffix}-cdp.png`), Buffer.from(shot.data, 'base64'));
            process.stdout.write(`${name}: ${metrics.title}, ${metrics.count} matches, ${shortQuarter ? 'short-screen scroll fallback' : 'no nested scroll'}\n`);
        }

        await evaluate(`document.getElementById('tdot-0').click()`);
        await pause(550);
        const afterDot = await evaluate(`Math.round(document.getElementById('tourney-carousel').scrollLeft / document.getElementById('tourney-carousel').clientWidth)`);
        if (afterDot !== 0) throw new Error(`Dot navigation failed: ${afterDot}`);

        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 320, id: 1 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 185, y: 323, id: 1 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 72, y: 325, id: 1 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await pause(550);
        const afterSwipe = await evaluate(`Math.round(document.getElementById('tourney-carousel').scrollLeft / document.getElementById('tourney-carousel').clientWidth)`);
        if (afterSwipe !== 1) throw new Error(`Horizontal swipe failed: ${afterSwipe}`);

        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 70, y: 320, id: 2 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 185, y: 322, id: 2 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y: 325, id: 2 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await pause(300);
        const afterRightSwipe = await evaluate(`Math.round(document.getElementById('tourney-carousel').scrollLeft / document.getElementById('tourney-carousel').clientWidth)`);
        if (afterRightSwipe !== 0) throw new Error(`Right swipe failed: ${afterRightSwipe}`);
        process.stdout.write('Dot navigation and both swipe directions passed.\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
