// Read-only visual QA timing through Android Chrome DevTools on the local QA preview.
// Usage: node scripts/measure-easter-treasury.js [devtools-port]
'use strict';

const port = Number(process.argv[2] || 9222);
const previewPath = '/themes/easter/qa-preview.html';

async function getTarget() {
    const response = await fetch(`http://127.0.0.1:${port}/json`);
    const pages = await response.json();
    const target = pages.find(page => page.type === 'page'
        && page.url?.includes(previewPath)
        && page.url.includes('#main'))
        || pages.find(page => page.type === 'page' && page.url?.includes(previewPath));
    if (!target?.webSocketDebuggerUrl) throw new Error('No Easter QA preview tab found');
    return target;
}

function connect(url) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        let nextId = 0;
        const pending = new Map();
        socket.addEventListener('open', () => resolve({
            send(method, params = {}) {
                const id = ++nextId;
                return new Promise((accept, fail) => {
                    pending.set(id, { accept, fail });
                    socket.send(JSON.stringify({ id, method, params }));
                });
            },
            close() { socket.close(); }
        }));
        socket.addEventListener('error', reject);
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            const request = pending.get(message.id);
            if (!request) return;
            pending.delete(message.id);
            if (message.error) request.fail(new Error(message.error.message));
            else request.accept(message.result);
        });
    });
}

async function main() {
    const target = await getTarget();
    const cdp = await connect(target.webSocketDebuggerUrl);
    try {
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Page.enable');
        const expression = `
            (async () => {
                const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
                location.hash = 'main';
                let frame = document.getElementById('qa-frame');
                const seed = String(Date.now());
                frame.src = '/index.html?easter-qa-preview=' + seed;
                for (let i = 0; i < 100; i++) {
                    frame = document.getElementById('qa-frame');
                    if (frame?.contentWindow?.riznicaManager
                        && frame.contentDocument?.readyState === 'complete'
                        && frame.contentWindow.location.search.includes(seed)) break;
                    await wait(100);
                }
                if (!frame?.contentWindow?.riznicaManager) throw new Error('QA frame did not initialize');
                await wait(150);
                const manager = frame.contentWindow.riznicaManager;
                const hadWarmup = manager.trophyWarmupPromises.has('easter');
                const start = performance.now();
                const warmup = manager.warmTrophyAssets('easter');
                let warmupDoneMs = null;
                warmup.then(() => { warmupDoneMs = Math.round(performance.now() - start); });
                location.hash = 'treasury';
                let images = [];
                for (let i = 0; i < 100; i++) {
                    images = [...frame.contentDocument.querySelectorAll('#riznica-screen .riznica-trophy-soft-clay-icon')];
                    if (images.length) break;
                    await wait(20);
                }
                const renderedMs = performance.now() - start;
                const firstFour = images.slice(0, 4);
                await Promise.all(firstFour.map(img => img.decode().catch(() => {})));
                const firstFourDecodedMs = performance.now() - start;
                let warmupFinished = false;
                await Promise.race([warmup.then(() => { warmupFinished = true; }), wait(20000)]);
                const warmupMs = performance.now() - start;
                const failed = images.filter(img => img.complete && img.naturalWidth === 0).length;
                return {
                    renderedMs: Math.round(renderedMs),
                    firstFourDecodedMs: Math.round(firstFourDecodedMs),
                    warmupMs: Math.round(warmupMs),
                    warmupDoneMs,
                    hadWarmup,
                    trophyCards: images.length,
                    failedImages: failed,
                    visibleLoaded: firstFour.filter(img => img.naturalWidth > 0).length,
                    warmupFinished
                };
            })()
        `;
        const result = await cdp.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true
        });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
        console.log(JSON.stringify(result.result.value, null, 2));
    } finally {
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: false }).catch(() => {});
        cdp.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
