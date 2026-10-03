// Read-only isolated EffectManager audit; no shop, account, game score or server writes.
// Prerequisites: scripts/serve-green-qa.js and Android Chrome via adb forward tcp:9222.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const origin = 'http://127.0.0.1:3130';
const cases = [
    ['confetti', '#confetti-canvas'],
    ['gold_rain', '.gold-rain-atmosphere'],
    ['fireflies', '.firefly-field'],
    ['bubbles', '.magic-bubble'],
    ['ice_age', '.ice-age-atmosphere'],
    ['black_hole', '.black-hole-container'],
    ['supernova', '.supernova-container'],
    ['neon_pulse', '.anim-neon-pulse'],
    ['drones', '.drone-night-sky'],
    ['thunder', '.anim-thunder'],
    ['balkan', '.kafana-overlay'],
    ['fireworks', '.fw-rocket, .fw-particle'],
    ['cosmic_dust', '.cosmic-container'],
    ['ufo_abduction', '.ufo-abduction-container'],
    ['dragon_fire', '.dragon-container'],
    ['royal_yamb', '.royal-yamb-container']
];
const captures = new Set(['ice_age', 'neon_pulse', 'balkan', 'drones', 'ufo_abduction', 'royal_yamb']);
const onlyId = process.argv.find(argument => argument.startsWith('--only='))?.slice('--only='.length);
const theme = process.argv.find(argument => argument.startsWith('--theme='))?.slice('--theme='.length) || 'green';
const stress = process.argv.includes('--stress');
const natural = process.argv.includes('--natural');
const navigation = process.argv.includes('--navigation');
if (!['green', 'easter', 'desert'].includes(theme)) throw new Error(`Unknown theme: ${theme}`);
const selectedCases = onlyId ? cases.filter(([id]) => id === onlyId) : cases;
if (!selectedCases.length) throw new Error(`Unknown effect ID: ${onlyId}`);

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
    const report = [];
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 700, deviceScaleFactor: 1, mobile: true });
        if (natural) {
            if (!['supernova', 'royal_yamb'].includes(onlyId)) throw new Error('--natural requires --only=supernova or --only=royal_yamb');
            await send('Page.navigate', { url: `${origin}/__green_qa__/green-effect-runtime.html?theme=${theme}&qa_natural=${Date.now()}` });
            let ready = false;
            for (let attempt = 0; attempt < 30 && !ready; attempt++) {
                await sleep(200);
                try { ready = await evaluate('window.qaEffectReady === true'); } catch (_) {}
            }
            if (!ready) throw new Error('Natural-completion fixture not ready');
            await evaluate(`window.qaRunEffect(${JSON.stringify(onlyId)}); true`);
            await sleep(onlyId === 'supernova' ? 8100 : 8600);
            const state = await evaluate(`(() => ({ metrics: window.qaFxMetrics(),
                nodes: document.querySelectorAll('.supernova-container, .royal-yamb-container').length,
                timeouts: window.effectMgr.effectTimeouts.length,
                effectClasses: [...document.body.classList].filter(name => name.startsWith('fx-')) }))()`);
            if (state.metrics.pendingRafs || state.metrics.resizeListeners || state.nodes || state.timeouts || state.effectClasses.length) {
                throw new Error(`Natural completion leaked resources: ${JSON.stringify(state)}`);
            }
            process.stdout.write(`PASS: ${onlyId} completed naturally without stale resources.\n`);
            return;
        }
        if (navigation) {
            await send('Page.navigate', { url: `${origin}/__green_qa__/green-effect-runtime.html?theme=${theme}&qa_navigation=${Date.now()}` });
            let ready = false;
            for (let attempt = 0; attempt < 30 && !ready; attempt++) {
                await sleep(200);
                try { ready = await evaluate('window.qaEffectReady === true'); } catch (_) {}
            }
            if (!ready) throw new Error('Navigation fixture not ready');
            const inspect = () => evaluate(`(() => ({
                metrics: window.qaFxMetrics(),
                timeouts: window.effectMgr.effectTimeouts.length,
                bodyFxClasses: [...document.body.classList].filter(name => name.startsWith('fx-')),
                documentFxClasses: [...document.documentElement.classList].filter(name => name.includes('thunder')),
                effectNodes: document.querySelectorAll('.falling-coin, .firefly-field, .magic-bubble, .ice-age-atmosphere, .black-hole-container, .supernova-container, .drone-night-sky, .kafana-overlay, .fw-rocket, .fw-particle, .cosmic-container, .ufo-abduction-container, .dragon-container, .royal-yamb-container, .gold-rain-atmosphere, .gold-rain-canvas, .green-thunder-clay').length,
                tableFxClasses: [...document.querySelector('.player-table').classList].filter(name => name.startsWith('anim-') || name.startsWith('active-')),
                goldRainActive: Boolean(document.querySelector('.gold-rain-atmosphere')),
                error: document.getElementById('qa-error')?.hidden === false ? document.getElementById('qa-error').textContent : ''
            }))()`);
            const assertClean = async label => {
                const state = await inspect();
                if (state.metrics.pendingRafs || state.metrics.resizeListeners || state.timeouts
                    || state.bodyFxClasses.length || state.documentFxClasses.length
                    || state.effectNodes || state.tableFxClasses.length || state.error) {
                    throw new Error(`${label}: stale resources: ${JSON.stringify(state)}`);
                }
                process.stdout.write(`${label}: clean\n`);
            };

            await evaluate('window.effectMgr.celebrateWin(); true');
            await sleep(180);
            await evaluate('window.qaStopEffect(); true');
            await sleep(1550);
            await assertClean('win closed before delayed gold rain');

            await evaluate('window.effectMgr.celebrateWin(); true');
            await sleep(2100);
            const winState = await inspect();
            if (!winState.goldRainActive) throw new Error(`win did not start delayed gold rain: ${JSON.stringify(winState)}`);
            await evaluate('window.qaStopEffect(); true');
            await sleep(300);
            await assertClean('win closed during gold rain');

            const ids = selectedCases.map(([id]) => id);
            for (let cycle = 1; cycle <= 3; cycle++) {
                for (const id of ids) {
                    await evaluate(`window.qaRunEffect(${JSON.stringify(id)}); true`);
                    await sleep(130);
                }
                await evaluate('window.qaStopEffect(); true');
                await sleep(500);
                await assertClean(`mixed effect cycle ${cycle}`);
            }
            process.stdout.write(`PASS: win interruption and ${ids.length} mixed effects × 3 cycles on ${theme}.\n`);
            return;
        }
        if (stress) {
            await send('Page.navigate', { url: `${origin}/__green_qa__/green-effect-runtime.html?theme=${theme}&qa_stress=${Date.now()}` });
            let ready = false;
            for (let attempt = 0; attempt < 30 && !ready; attempt++) {
                await sleep(200);
                try { ready = await evaluate('window.qaEffectReady === true'); } catch (_) {}
            }
            if (!ready) throw new Error('Stress fixture not ready');
            const ids = selectedCases.map(([id]) => id);
            for (const id of ids) {
                for (let iteration = 0; iteration < 4; iteration++) {
                    await evaluate(`window.qaRunEffect(${JSON.stringify(id)}); true`);
                    await sleep(200);
                    await evaluate('window.qaStopEffect(); true');
                    await sleep(250);
                }
                const state = await evaluate(`(() => ({
                    id: ${JSON.stringify(id)}, metrics: window.qaFxMetrics(),
                    timeouts: window.effectMgr.effectTimeouts.length,
                    effectClasses: [...document.body.classList].filter(name => name.startsWith('fx-')),
                    effectNodes: document.querySelectorAll('.supernova-container, .royal-yamb-container, .gold-rain-atmosphere, .ufo-abduction-container, .drone-night-sky, .kafana-overlay, .anim-thunder, .green-thunder-clay').length
                }))()`);
                if (state.metrics.pendingRafs || state.metrics.resizeListeners || state.timeouts
                    || state.effectClasses.length || state.effectNodes) {
                    throw new Error(`stress ${id}: stale effect resources: ${JSON.stringify(state)}`);
                }
                process.stdout.write(`stress ${id}: ${JSON.stringify(state)}\n`);
            }
            if (theme === 'green' && ids.includes('royal_yamb')) {
                await evaluate(`(() => {
                    const manager = window.effectMgr;
                    const original = manager.loadGreenDucatParticleSprite.bind(manager);
                    manager.loadGreenDucatParticleSprite = () => new Promise(resolve => setTimeout(() => resolve(null), 350));
                    window.qaRunEffect('royal_yamb');
                    window.qaStopEffect();
                    manager.loadGreenDucatParticleSprite = original;
                    return true;
                })()`);
                await sleep(500);
                const lateRoyal = await evaluate(`(() => ({ metrics: window.qaFxMetrics(),
                    nodes: document.querySelectorAll('.royal-yamb-container').length,
                    timeouts: window.effectMgr.effectTimeouts.length }))()`);
                if (lateRoyal.metrics.pendingRafs || lateRoyal.metrics.resizeListeners || lateRoyal.nodes || lateRoyal.timeouts) {
                    throw new Error(`Delayed Royal Yamb canvas survived stop: ${JSON.stringify(lateRoyal)}`);
                }
                process.stdout.write('stress royal_yamb: delayed Green ducat sprite cannot restart stopped canvas\n');
            }
            if (theme === 'green' && ids.includes('gold_rain')) {
                await evaluate(`(() => {
                    const manager = window.effectMgr;
                    manager.loadGreenDucatParticleSprite = () => Promise.resolve(null);
                    window.qaRunEffect('gold_rain');
                    return true;
                })()`);
                await sleep(2200);
                const fallback = await evaluate(`(() => ({
                    canonicalDucats: document.querySelectorAll('.falling-coin img[src*="ducat-inline-v1.png"]').length,
                    legacySpritesCached: Boolean(window.effectMgr.goldRainSprites)
                }))()`);
                await evaluate('window.qaStopEffect(); true');
                if (!fallback.canonicalDucats || fallback.legacySpritesCached) {
                    throw new Error(`Green Gold Rain fallback is not canonical: ${JSON.stringify(fallback)}`);
                }
                process.stdout.write('stress gold_rain: missing sprite falls back to canonical Green dukat\n');
            }
            process.stdout.write(`PASS: ${ids.length} effect IDs, 4 rapid trigger/stop cycles each.\n`);
            return;
        }
        for (const [id, selector] of selectedCases) {
            await send('Page.navigate', { url: `${origin}/__green_qa__/green-effect-runtime.html?theme=${theme}&qa_run=${id}-${Date.now()}` });
            let ready = false;
            for (let attempt = 0; attempt < 30 && !ready; attempt++) {
                await sleep(200);
                try { ready = await evaluate('window.qaEffectReady === true'); } catch (_) {}
            }
            if (!ready) {
                const error = await evaluate("document.getElementById('qa-error')?.textContent || document.body.innerText.slice(-300)");
                throw new Error(`${id}: fixture not ready: ${error}`);
            }
            await evaluate(`window.qaRunEffect(${JSON.stringify(id)}); true`);
            await sleep(id === 'ufo_abduction' ? 3000 : 900);
            const state = await evaluate(`(() => {
                const target = document.querySelector(${JSON.stringify(selector)});
                const visible = target && getComputedStyle(target).display !== 'none';
                return {
                    id: ${JSON.stringify(id)}, present: Boolean(target), visible: Boolean(visible),
                    theme: document.documentElement.dataset.splashTheme,
                    bodyClasses: [...document.body.classList],
                    domCount: document.querySelectorAll('body *').length,
                    oldLogo: [...document.querySelectorAll('img')].some(image => image.getAttribute('src') === 'Logo_green.png'),
                    greenWeddingImage: Boolean(document.querySelector('.green-wedding-emblem[src*="preview-wedding-v1.png"]')),
                    greenRoyalImage: Boolean(document.querySelector('.royal-yamb-emblem--green img[src*="preview-royal-yamb-v1.png"]')),
                    greenUfoImage: Boolean(document.querySelector('.ufo-green-clay[src*="preview-ufo-abduction-v1.png"]')),
                    greenThunderImage: Boolean(document.querySelector('.green-thunder-clay[src*="preview-thunder-v1.png"]')),
                    legacyGoldSpritesCached: Boolean(window.effectMgr.goldRainSprites),
                    greenGoldSparkCached: Boolean(window.effectMgr.greenGoldRainSparkSprite),
                    oldUfoShip: Boolean(document.querySelector('.ufo-ship')),
                    weddingEmoji: [...document.querySelectorAll('.wedding-particle, .trumpet-icon-v2')].map(el => el.textContent).slice(0, 8),
                    bubbleEmoji: [...document.querySelectorAll('.magic-bubble')].map(el => el.textContent).slice(0, 4),
                    gameOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    error: document.getElementById('qa-error')?.hidden === false ? document.getElementById('qa-error').textContent : ''
                };
            })()`);
            if (!state.present || !state.visible || (theme === 'green' && state.gameOverflow) || state.error) {
                throw new Error(`${id}: ${JSON.stringify(state)}`);
            }
            if (theme === 'green') {
                if (state.oldLogo
                    || (id === 'balkan' && (!state.greenWeddingImage || state.weddingEmoji.some(Boolean)))
                    || (id === 'royal_yamb' && !state.greenRoyalImage)
                    || (id === 'ufo_abduction' && (!state.greenUfoImage || state.oldUfoShip))
                    || (id === 'thunder' && !state.greenThunderImage)
                    || (id === 'gold_rain' && (state.legacyGoldSpritesCached || !state.greenGoldSparkCached))
                    || (id === 'bubbles' && state.bubbleEmoji.some(Boolean))) {
                    throw new Error(`${id}: Green visual isolation failed: ${JSON.stringify(state)}`);
                }
            } else if (state.greenWeddingImage || state.greenRoyalImage || state.greenUfoImage || state.greenThunderImage) {
                throw new Error(`${id}: Green image leaked into ${theme}: ${JSON.stringify(state)}`);
            }
            report.push(state);
            if (theme === 'green' && captures.has(id)) {
                const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                const target = path.resolve(__dirname, '..', 'screenshots', 'green-ui-step9', `green-live-fx-${id}-cdp.png`);
                fs.writeFileSync(target, Buffer.from(screenshot.data, 'base64'));
            }
            await evaluate('window.qaStopEffect(); true');
            await sleep(120);
            const afterStop = await evaluate(`(() => ({
                targetStillPresent: Boolean(document.querySelector(${JSON.stringify(selector)})),
                effectBodyClasses: [...document.body.classList].filter(name => name.startsWith('fx-')),
                scoreStillDimmed: Boolean(document.querySelector('.ufo-score-dimmed')),
                tableStillAnimated: Boolean(document.querySelector('.anim-ufo-table'))
            }))()`);
            if ((id !== 'confetti' && afterStop.targetStillPresent) || afterStop.effectBodyClasses.length || afterStop.scoreStillDimmed || afterStop.tableStillAnimated) {
                throw new Error(`${id}: incomplete stop cleanup: ${JSON.stringify(afterStop)}`);
            }
            if (theme === 'green' && id === 'gold_rain') {
                await evaluate(`window.effectMgr.loadGreenDucatParticleSprite = () => new Promise(resolve => setTimeout(() => resolve(null), 350)); window.effectMgr.trigger('gold_rain'); window.qaStopEffect(); true`);
                await sleep(500);
                const lateGoldRain = await evaluate("Boolean(document.querySelector('.gold-rain-atmosphere, .gold-rain-canvas')) || document.body.classList.contains('fx-gold-rain')");
                if (lateGoldRain) throw new Error('gold_rain restarted after stop while its Green ducat sprite was loading');
            }
            process.stdout.write(`${id}: visible, ${state.domCount} DOM nodes${state.oldLogo ? ', old Logo_green.png' : ''}\n`);
        }
        process.stdout.write(`All ${report.length} isolated ${theme} live effects triggered and stopped cleanly.\n`);
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
