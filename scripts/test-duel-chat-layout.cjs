'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const start = index.indexOf('<button id="chat-float-btn"');
const markup = index.slice(start, index.indexOf('<div id="splash-screen"', start));
const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];

async function main() {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
        await page.route('https://duel.test/**', route => {
            const filename = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
            if (!filename) return route.fulfill({ contentType: 'text/html', body: '<meta name="viewport" content="width=device-width,initial-scale=1">' + markup });
            const file = path.resolve(root, filename);
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
            return route.fulfill({ path: file });
        });
        await page.goto('https://duel.test/');
        for (const css of ['style.css', 'teme.css', 'theme-card-surfaces.css', 'theme-duel-chat.css'])
            await page.addStyleTag({ content: read(css) });
        await page.addStyleTag({ content: ':root{--safe-top:24px;--safe-bottom:27px;--safe-left:8px;--safe-right:8px}' });
        for (const js of ['languages.js','theme-main-room-icons.js','duel-chat.js']) await page.addScriptTag({ content: read(js) });
        await page.evaluate(() => {
            localStorage.setItem('yamb_uid','qa-alice');
            localStorage.setItem('yamb_lang','sr');
            localStorage.removeItem('yamb_duel_chat_disabled_qa-alice');
            const handlers = new Map(), requests = [];
            const socket = {
                connected: true,
                on(event, fn) { handlers.set(event, fn); },
                off(event) { handlers.delete(event); },
                timeout() { return this; },
                emit(event, data, reply) {
                    requests.push({ event, ...data });
                    const result = event === 'chat_msg' ? { ok: true, message: {
                        id: 'outgoing', roomId: data.roomId, senderUid: 'qa-alice', msg: data.msg } }
                        : { ok: true, roomId: data.roomId, matchId: 'match-1', messages: [] };
                    reply(null, result);
                }
            };
            window.fixture = { requests, incoming: data => handlers.get('duel_chat_message')(data),
                app: { socket, onlineMode: true, gameActive: true, modeTag: 'Online', roomId: 'qa-room',
                    modal: { prompt: async () => 'QA reason' } } };
            window.chat = new DuelChat(fixture.app);
            chat.bind(socket);
            chat.navigate('game-scene');
        });
        const launcher = page.locator('#chat-float-btn');
        const panel = page.locator('#chat-window');
        await page.evaluate(() => fixture.incoming({ id:'m1', matchId:'match-1', roomId:'qa-room',
            senderUid:'qa-bob', msg:'Test <b>poruke</b>' }));
        assert.equal(await page.locator('#chat-badge').textContent(), '1');
        await launcher.tap();
        assert(await panel.isVisible());
        assert.equal(await page.locator('#chat-badge').isVisible(), false);
        assert.equal(await panel.locator('.duel-chat-text b').count(), 0);
        await panel.getByRole('button', { name: 'Prijavi poruku', exact: true }).tap();
        await panel.getByRole('button', { name: 'Poruka je prijavljena.', exact: true }).waitFor();
        assert((await page.evaluate(() => fixture.requests)).some(x => x.event === 'report_duel_chat_msg' && x.messageId === 'm1'));
        await panel.getByRole('button', { name: 'Isključi chat' }).tap();
        assert.equal(await page.locator('#duel-chat-compose').isVisible(), false);
        await page.evaluate(() => fixture.incoming({ id:'m2', roomId:'qa-room', senderUid:'qa-bob', msg:'hidden' }));
        assert.equal(await page.evaluate(() => chat.messages.has('m2')), false);
        await panel.getByRole('button', { name: 'Uključi chat' }).tap();
        await page.locator('#chat-input-field').fill('QA odgovor');
        await page.locator('#btn-chat-send').tap();
        await panel.getByText('QA odgovor', { exact: true }).waitFor();
        await page.locator('#duel-chat-minimize').tap();
        assert.equal(await panel.isVisible(), false);
        const session = await page.context().newCDPSession(page);
        const drag = async (x, y, endX, endY) => {
            await session.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
            await session.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:endX, y:endY }] });
            await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
        };
        const first = await launcher.boundingBox();
        await drag(first.x + 22, first.y + 22, 1, 2);
        const moved = await launcher.boundingBox();
        assert(moved.x < first.x - 30 && moved.x >= 8 && moved.y >= 24);
        assert.equal(await panel.isVisible(), false, 'Dragging a touch control must not open chat');
        await launcher.tap();
        assert.equal(await page.evaluate(() => chat.open), true, 'A fresh tap after drag opens the panel');
        const handle = await page.locator('#duel-chat-handle').boundingBox();
        await drag(handle.x + 20, handle.y + 12, 355, 760);
        assert.equal(await page.evaluate(() => chat.open), true, 'Dragging the header leaves the panel open');
        const draggedPanel = await panel.boundingBox();
        assert(draggedPanel.y > 200 && draggedPanel.y + draggedPanel.height <= 780 - 27);
        await page.locator('#chat-input-field').focus();
        await page.setViewportSize({ width: 360, height: 360 });
        await page.waitForFunction(() => {
            const rect = document.getElementById('chat-window').getBoundingClientRect();
            return rect.top >= 24 && rect.bottom <= 333;
        }, null, { timeout: 3000 });
        const keyboard = await panel.boundingBox();
        assert(keyboard.y >= 24 && keyboard.y + keyboard.height <= 360 - 27,
            'Panel must fit when Android keyboard reduces the visible viewport');
        for (const [width,height] of [[320,568],[360,780],[430,932]]) {
            await page.setViewportSize({ width,height });
            for (const theme of themes) {
                await page.evaluate(theme => {
                    document.documentElement.dataset.splashTheme = theme;
                    document.body.className = theme === 'dark' ? '' : theme + '-theme';
                    chat.layout();
                }, theme);
                const expectedFolder = theme === 'dark' ? 'green-soft-clay/' : 'theme-packs/' + theme + '/';
                await page.waitForFunction(folder => {
                    const img = document.querySelector('.duel-chat-launcher-icon');
                    return img.src.includes(folder) && img.complete && img.naturalWidth > 0;
                }, expectedFolder);
                const box = await panel.boundingBox();
                assert(box.x >= 8 && box.y >= 24 && box.x + box.width <= width - 8 && box.y + box.height <= height - 27, theme + '/' + width);
                assert(await page.locator('#duel-chat-switch').isVisible());
            }
        }
        await page.evaluate(() => { fixture.app.isSpectator = true; chat.navigate('game-scene'); });
        assert.equal(await panel.isVisible(), false);
        assert.equal(await launcher.isVisible(), false);
        console.log('Duel chat UI: 30 theme/viewport combinations, real touch drag, minimize, keyboard clearance, reporting, opt-out, unread and spectator exclusion passed.');
    } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
