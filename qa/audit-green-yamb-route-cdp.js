// Isolated Android Chrome QA of the real game-scene, createScoreTables, writeScore and EffectManager.
// No app bootstrap, account, socket, purchase, reward or server-side score write.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

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
    const page = tabs.find(tab => tab.type === 'page' && tab.url?.includes('green-yamb-route.html'));
    if (!page) throw new Error('Open the local Green Yamb route QA tab first.');
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
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const capture = async name => {
        const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const target = path.resolve(__dirname, '..', 'screenshots', 'green-ui-step9', `green-yamb-route-${name}-cdp.png`);
        fs.writeFileSync(target, Buffer.from(result.data, 'base64'));
    };
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Page.bringToFront');
        await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 700, deviceScaleFactor: 1, mobile: true });
        await send('Page.navigate', { url: `http://127.0.0.1:3130/__green_qa__/green-yamb-route.html?qa_run=${Date.now()}` });
        let ready = false;
        for (let attempt = 0; attempt < 40 && !ready; attempt++) {
            await sleep(200);
            ready = await evaluate('window.qaYambReady === true');
        }
        if (!ready) throw new Error(await evaluate("document.getElementById('qa-error')?.textContent || document.body.innerText.slice(-400)"));

        const first = await evaluate("window.qaWriteYamb('ufo_abduction', 1)");
        // Headless emulator can defer animation frames; seek only the QA screenshot to a visible keyframe.
        await evaluate("(() => { for (const element of document.querySelectorAll('.anim-thunder, .green-thunder-clay')) for (const animation of element.getAnimations()) animation.currentTime = 850; return true; })()");
        await sleep(100);
        const firstState = await evaluate(`(() => { const clay = document.querySelector('.green-thunder-clay[src*="preview-thunder-v1.png"]'); return { thunder: Boolean(document.querySelector('.anim-thunder')), greenClay: Boolean(clay), clayOpacity: clay ? getComputedStyle(clay).opacity : null, ufo: Boolean(document.querySelector('.ufo-abduction-container')), score: document.getElementById('btn-0-Slobodna-Yamb')?.textContent, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }; })()`);
        if (!first.ok || first.points !== 80 || !first.hasSvetiIlija || !firstState.thunder || !firstState.greenClay || Number(firstState.clayOpacity) < 0.2 || firstState.ufo || firstState.overflow) {
            throw new Error(`First-roll Yamb did not route to thunder: ${JSON.stringify({ first, firstState })}`);
        }
        await capture('first-roll-thunder');
        await evaluate('window.qaStopYambEffect(); true');

        const later = await evaluate("window.qaWriteYamb('ufo_abduction', 2)");
        await evaluate("(() => { const container = document.querySelector('.ufo-abduction-container'); if (!container) return false; for (const animation of container.getAnimations({ subtree: true })) animation.currentTime = 2200; return true; })()");
        await sleep(100);
        const laterState = await evaluate(`(() => { const container = document.querySelector('.ufo-abduction-container--green'); const stage = container?.querySelector('.ufo-stage'); const style = container ? getComputedStyle(container) : null; return { ufo: Boolean(container?.querySelector('.ufo-green-clay[src*="preview-ufo-abduction-v1.png"]')), oldShip: Boolean(document.querySelector('.ufo-ship')), thunder: Boolean(document.querySelector('.anim-thunder')), score: document.getElementById('btn-0-Slobodna-Yamb')?.textContent, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, opacity: style?.opacity, stageOpacity: stage ? getComputedStyle(stage).opacity : null, animationTime: container?.getAnimations()[0]?.currentTime, animationState: container?.getAnimations()[0]?.playState, animationName: style?.animationName, animationDuration: style?.animationDuration, documentHidden: document.hidden }; })()`);
        if (!later.ok || later.points !== 80 || later.hasSvetiIlija || !laterState.ufo || Number(laterState.opacity) < 0.2 || laterState.oldShip || laterState.thunder || laterState.overflow) {
            throw new Error(`Later-roll Yamb did not route to equipped Green UFO: ${JSON.stringify({ later, laterState })}`);
        }
        await capture('equipped-ufo');
        process.stdout.write(`UFO visual state: ${JSON.stringify(laterState)}\n`);
        await evaluate('window.qaStopYambEffect(); true');

        const royal = await evaluate("window.qaWriteYamb('royal_yamb', 2)");
        await sleep(650);
        const royalState = await evaluate(`({ greenRoyal: Boolean(document.querySelector('.royal-yamb-emblem--green img[src*="preview-royal-yamb-v1.png"]')), oldLogo: Boolean(document.querySelector('.royal-yamb-emblem img[src="Logo_green.png"]')) })`);
        if (!royal.ok || royal.points !== 80 || !royalState.greenRoyal || royalState.oldLogo) {
            throw new Error(`Equipped Royal Yamb did not use Green motif: ${JSON.stringify({ royal, royalState })}`);
        }
        await evaluate('window.qaStopYambEffect(); true');
        const clean = await evaluate("!document.querySelector('.anim-thunder, .green-thunder-clay, .ufo-abduction-container, .royal-yamb-container') && ![...document.body.classList].some(name => name.startsWith('fx-'))");
        if (!clean) throw new Error('Effect cleanup failed after score-route test');
        process.stdout.write('PASS: first-roll thunder, later-roll equipped Green UFO and Royal Yamb, 80 points, no overflow, clean stop.\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
