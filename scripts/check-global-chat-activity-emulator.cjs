// Targets only the loopback QA tab in Android Chrome. Does not inspect or drive the game app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = 'http://127.0.0.1:3142';
const output = path.resolve('tmp/global-chat-activity-emulator');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const tabs = await (await fetch('http://127.0.0.1:9224/json')).json();
    const tab = tabs.find(tab => tab.type === 'page' && tab.url === `${base}/?client=alice`);
    assert(tab?.webSocketDebuggerUrl, 'Open the isolated local Alice QA tab on the emulator first');
    const cdp = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { cdp.once('open', resolve); cdp.once('error', reject); });
    const pending = new Map();
    let serial = 0;
    cdp.on('message', raw => {
        const message = JSON.parse(String(raw)), waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++serial;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Android CDP timed out: ${method}`)); }, 10000);
        pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
        cdp.send(JSON.stringify({ id, method, params }));
    });
    cdp.on('message', raw => {
        const event = JSON.parse(String(raw));
        if (event.method === 'Page.javascriptDialogOpening' && event.params.type === 'confirm'
            && event.params.message === 'Obrisati ovu poruku za sve učesnike chata? Ovo ne može da se poništi.') {
            void send('Page.handleJavaScriptDialog', { accept: true });
        }
    });
    cdp.on('close', () => { for (const waiter of pending.values()) waiter.reject(new Error('Android Chrome debug connection closed')); pending.clear(); });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    const wait = async expression => {
        for (let attempt = 0; attempt < 50; attempt++) {
            if (await evaluate(expression)) return;
            await pause(200);
        }
        throw new Error(`Emulator condition timed out: ${expression}`);
    };
    const screenshot = async name => {
        const image = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(image.data, 'base64'));
    };
    let browser;
    const report = { fixture: `${base}/?client=alice`, productionAccess: false, themes: [], checks: [] };
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Page.reload', { ignoreCache: true });
        await wait(`location.origin === '${base}' && window.app?.globalChat?.activityLoaded`);
        await evaluate(`applyQaTheme('dark')`);
        assert.equal(await evaluate('app.globalChat.unreadCount()'), 0);
        const initialHistorySize = await evaluate('app.globalChat.activityMessages.length');
        await screenshot('01-zero');
        browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
        const context = await browser.newContext();
        await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
        const bob = await context.newPage();
        await bob.goto(`${base}/?client=bob`);
        await bob.waitForFunction(() => app.globalChat.activityLoaded);
        await bob.evaluate(() => app.globalChat.open());
        await bob.locator('#global-chat-input').fill('Kucanje sa drugog lokalnog klijenta');
        await wait('!document.getElementById("global-chat-typing").hidden');
        assert.equal(await evaluate('app.globalChat.unreadCount()'), 0);
        await screenshot('02-typing');
        await bob.evaluate(() => app.globalChat.send());
        await wait('app.globalChat.unreadCount() === 1 && document.getElementById("global-chat-typing").hidden');
        await screenshot('03-one-message');
        await bob.evaluate(() => { document.getElementById('global-chat-input').value = 'Druga lokalna test poruka'; return app.globalChat.send(); });
        await wait('app.globalChat.unreadCount() === 2');
        report.checks.push('real peer typing, typing stop on send, live unread 0→1→2');
        for (const theme of themes) {
            await evaluate(`applyQaTheme(${JSON.stringify(theme)})`);
            await wait(`(()=>{const image=document.querySelector('.main-global-chat-btn img');return image.complete&&image.naturalWidth>0&&getComputedStyle(image).visibility!=='hidden'})()`);
            const state = await evaluate(`(()=>{const button=document.querySelector('.main-global-chat-btn'),badge=document.getElementById('global-chat-unread'),r=button.getBoundingClientRect(),b=badge.getBoundingClientRect(),s=getComputedStyle(badge);return {theme:${JSON.stringify(theme)},count:app.globalChat.unreadCount(),label:button.getAttribute('aria-label'),viewport:[innerWidth,innerHeight],host:[r.x,r.y,r.width,r.height],badge:[b.x,b.y,b.width,b.height],text:badge.textContent,colors:[s.color,s.backgroundColor],image:document.querySelector('.main-global-chat-btn img').src}})()`);
            assert.equal(state.count, 2);
            assert.equal(state.text, '2');
            assert(state.badge[0] >= 0 && state.badge[1] >= 0 && state.badge[0] + state.badge[2] <= state.viewport[0]);
            if (report.themes.length) assert.deepEqual(state.host, report.themes[0].host, `${theme} changed icon geometry`);
            report.themes.push(state);
            await screenshot(`theme-${theme}-unread`);
        }
        await evaluate(`document.querySelector('.main-global-chat-btn').click()`);
        await wait('app.globalChat.historyReady && app.globalChat.unreadCount() === 0');
        assert.equal(await evaluate(`document.querySelectorAll('#global-chat-body .msg-bubble').length`), Math.min(50, initialHistorySize + 2));
        await screenshot('04-read-room');
        await evaluate('app.globalChat.close(true)');
        report.checks.push('opening renders both messages and returns the real marker to 0');
        await evaluate('void app.socket.disconnect()');
        await wait(`document.querySelector('.main-global-chat-btn').dataset.chatActivity==='offline'`);
        await screenshot('05-offline');
        await bob.evaluate(() => { document.getElementById('global-chat-input').value = 'Poruka dok je emulator bez veze'; return app.globalChat.send(); });
        await bob.waitForFunction(expected => app.globalChat.activityMessages.length === expected, Math.min(50, initialHistorySize + 3));
        await evaluate('void app.socket.connect()');
        await wait('app.globalChat.unreadCount() === 1');
        await send('Page.reload', { ignoreCache: true });
        await wait('window.app?.globalChat?.activityLoaded && app.globalChat.unreadCount() === 1');
        await screenshot('06-reconnect-and-reload');
        report.checks.push('offline ? marker, missed message on reconnect and unread persistence after reload');
        await evaluate(`document.querySelector('.main-global-chat-btn').click()`);
        await wait('app.globalChat.historyReady && app.globalChat.unreadCount() === 0');
        await evaluate(`document.getElementById('global-chat-input').value='Sopstvena test poruka emulatora';app.globalChat.send()`);
        await wait(`app.globalChat.activityMessages.length === ${Math.min(50, initialHistorySize + 4)}`);
        assert.equal(await evaluate('app.globalChat.unreadCount()'), 0);
        const ownId = await evaluate(`document.querySelector('.msg-outgoing').dataset.chatId`);
        await evaluate(`app.globalChat.beginEdit(${JSON.stringify(ownId)})`);
        await screenshot('08-own-message-editing');
        await evaluate(`document.getElementById('global-chat-input').value='Izmenjena sopstvena poruka na emulatoru';app.globalChat.send()`);
        await wait(`!app.globalChat.mutationPending && app.globalChat.messagesById.get(${JSON.stringify(ownId)})?.revision===1`);
        await bob.waitForFunction(id => app.globalChat.messagesById.get(id)?.msg === 'Izmenjena sopstvena poruka na emulatoru', ownId);
        await screenshot('09-own-message-updated');
        await evaluate(`app.globalChat.deleteMessage(${JSON.stringify(ownId)})`);
        await wait(`!app.globalChat.mutationPending && !app.globalChat.messagesById.has(${JSON.stringify(ownId)})`);
        await bob.waitForFunction(id => !app.globalChat.messagesById.has(id), ownId);
        report.checks.push('own-message edit and confirmed delete on emulator are synchronized to the other client');
        await evaluate(`document.getElementById('global-chat-input').value='Moja probna poruka — možeš je izmeniti ili obrisati.';app.globalChat.send()`);
        await wait(`document.querySelectorAll('.msg-outgoing .global-chat-message-action').length===2`);
        await evaluate('app.globalChat.close(true)');
        report.checks.push('own emulator message does not increase the unread count');
        await evaluate(`applyQaTheme('dark')`);
        await bob.evaluate(() => { document.getElementById('global-chat-input').value = 'Test je uspeo. Otvori chat i broj će ponovo biti 0.'; return app.globalChat.send(); });
        await wait('app.globalChat.unreadCount() === 1');
        await screenshot('07-left-open-for-review');
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ result: 'passed', themes: report.themes.length, checks: report.checks, evidence: output, leftOnEmulator: 'Green, 1 unread local test message' }, null, 2));
    } finally {
        cdp.close();
        await browser?.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
