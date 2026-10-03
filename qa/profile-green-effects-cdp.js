// Diagnostic profile only: isolated EffectManager, no account, shop or game server.
// Run with scripts/serve-green-qa.js and Android Chrome DevTools forwarded to 9222.
const http = require('node:http');

const defaultEffectIds = ['gold_rain', 'supernova', 'royal_yamb', 'drones', 'ufo_abduction', 'balkan'];
const onlyId = process.argv.find(argument => argument.startsWith('--only='))?.slice('--only='.length);
if (onlyId && !defaultEffectIds.includes(onlyId)) throw new Error(`Unknown profile effect: ${onlyId}`);
const effectIds = onlyId ? [onlyId] : defaultEffectIds;
const origin = 'http://127.0.0.1:3130';

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
    const page = tabs.find(tab => tab.type === 'page' && tab.url?.includes('green-effect-runtime.html'));
    if (!page) throw new Error('Open the local Green FX QA tab first.');
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
    const metrics = async () => {
        const result = await send('Performance.getMetrics');
        const values = Object.fromEntries(result.metrics.map(metric => [metric.name, metric.value]));
        return {
            jsHeapMb: +(values.JSHeapUsedSize / 1048576).toFixed(2),
            domNodes: values.Nodes,
            layoutCount: values.LayoutCount,
            recalcStyleCount: values.RecalcStyleCount,
            taskDurationMs: +(values.TaskDuration * 1000).toFixed(1)
        };
    };
    const frameProbe = `new Promise(resolve => {
        const times = [];
        const started = performance.now();
        let active = true;
        let frameId = 0;
        const tick = time => {
            if (!active) return;
            times.push(time);
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        setTimeout(() => {
            active = false;
            cancelAnimationFrame(frameId);
            const intervals = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b);
            resolve({ count: times.length, wallMs: Math.round(performance.now() - started),
                firstFrameDelayMs: times.length ? Math.round(times[0] - started) : null,
                medianMs: intervals.length ? +intervals[Math.floor(intervals.length / 2)].toFixed(1) : null,
                p95Ms: intervals.length ? +intervals[Math.min(intervals.length - 1, Math.ceil(intervals.length * .95) - 1)].toFixed(1) : null,
                longGaps: intervals.filter(value => value > 50).length });
        }, 1800);
    })`;
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Performance.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 700, deviceScaleFactor: 1, mobile: true });
        await send('Page.navigate', { url: `${origin}/__green_qa__/green-effect-runtime.html?qa_profile=${Date.now()}` });
        let ready = false;
        for (let attempt = 0; attempt < 40 && !ready; attempt++) {
            await sleep(200);
            try { ready = await evaluate('window.qaEffectReady === true'); } catch (_) {}
        }
        if (!ready) throw new Error('Performance fixture not ready');

        const idle = await evaluate(frameProbe);
        const cases = [];
        for (const id of effectIds) {
            // One warmup pass loads/caches assets; the second pass is measured.
            await evaluate(`window.qaRunEffect(${JSON.stringify(id)}); true`);
            await sleep(500);
            await evaluate('window.qaStopEffect(); true');
            await sleep(150);
            await send('HeapProfiler.collectGarbage');
            const before = await metrics();

            await evaluate(`window.qaRunEffect(${JSON.stringify(id)}); true`);
            const frames = await evaluate(frameProbe);
            const active = await metrics();
            await evaluate('window.qaStopEffect(); true');
            await sleep(200);
            await send('HeapProfiler.collectGarbage');
            const after = await metrics();
            const cleanup = await evaluate(`(() => ({ resources: window.qaFxMetrics(),
                timeouts: window.effectMgr.effectTimeouts.length,
                connectedNodes: document.querySelectorAll('*').length,
                activeDocumentAnimations: document.getAnimations().length,
                fxNodes: document.querySelectorAll('.gold-rain-atmosphere, .supernova-container, .royal-yamb-container, .drone-night-sky, .ufo-abduction-container, .kafana-overlay').length,
                bodyFxClasses: [...document.body.classList].filter(name => name.startsWith('fx-')) }))()`);
            if (cleanup.resources.pendingRafs || cleanup.resources.resizeListeners || cleanup.timeouts || cleanup.fxNodes || cleanup.bodyFxClasses.length) {
                throw new Error(`${id}: resources left after profile: ${JSON.stringify(cleanup)}`);
            }
            let delayedAfter = null;
            if (id === 'royal_yamb' || id === 'ufo_abduction' || id === 'balkan') {
                await sleep(5000);
                await send('HeapProfiler.collectGarbage');
                delayedAfter = await metrics();
            }
            cases.push({ id, frames, before, active, after, cleanup, delayedAfter,
                heapAfterMinusBeforeMb: +(after.jsHeapMb - before.jsHeapMb).toFixed(2) });
        }
        process.stdout.write(`${JSON.stringify({ device: 'Pixel_7_Pro Android emulator, Chrome, headless', viewportCssPx: [360, 700], idle, cases }, null, 2)}\n`);
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
