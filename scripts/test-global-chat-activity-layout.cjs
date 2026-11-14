// Isolated production markup and scripts. No real accounts, chat messages or network APIs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const start = index.indexOf('<div class="main-global-chat-btn"');
const icon = index.slice(start, index.indexOf('<div class="main-summary-row"', start));
const roomStart = index.indexOf('<div id="global-chat-overlay"');
const room = index.slice(roomStart, index.indexOf('<div id="online-players-overlay"', roomStart));
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${styles.map(source => `<link rel="stylesheet" href="${source}">`).join('')}
<div id="main-menu" class="screen active">${icon}</div>${room}`;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const output = path.join(root, 'tmp/global-chat-activity');
fs.mkdirSync(output, { recursive: true });
const contrast = (a, b) => {
    const luminance = value => value.match(/[\d.]+/g).slice(0, 3).map(x => +x / 255)
        .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
        .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};
(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    const results = [];
    try {
        const context = await browser.newContext();
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'chat-fixture.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ contentType: ({ '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        const page = await context.newPage();
        await page.goto('http://chat-fixture.local/www/fixture.html');
        await page.addScriptTag({ content: read('www/languages.js') });
        await page.addScriptTag({ content: read('www/globalchat.js') });
        await page.evaluate(() => {
            localStorage.setItem('yamb_uid', 'alice');
            localStorage.setItem('yamb_chat_rules_accepted', 'true');
            const handlers = new Map();
            const socket = { id: 'test-alice', connected: true, sent: [],
                on(event, fn) { if (!handlers.has(event)) handlers.set(event, []); handlers.get(event).push(fn); },
                off(event, fn) { if (!fn) handlers.delete(event); else handlers.set(event, (handlers.get(event) || []).filter(h => h !== fn)); },
                emit(event, data) { this.sent.push({ event, data }); },
                receive(event, data) { for (const fn of handlers.get(event) || []) fn(data); }
            };
            window.app = { socket, socketVerifiedUid: 'alice', requireLogin: () => true, initSocketConnection() {},
                openGlobalChat() { return this.globalChat.open(); } };
            window.app.globalChat = new GlobalChatManager(window.app);
            window.app.globalChat.ensureChatReady = async () => true;
            window.app.globalChat.bindSocket(socket);
            window.YambSecurity = { escapeHtml: text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;'),
                escapeAttr: text => String(text).replaceAll('"', '&quot;'), jsString: value => JSON.stringify(value) };
        });
        await page.addScriptTag({ content: read('www/theme-quality-assets.js') });
        await page.addScriptTag({ content: read('www/theme-main-room-icons.js') });
        for (const [width, height] of [[320, 568], [360, 780], [430, 932]]) for (const theme of themes) {
            await page.setViewportSize({ width, height });
            await page.evaluate(theme => {
                document.getElementById('global-chat-overlay').style.display = 'none';
                document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
                document.documentElement.dataset.splashTheme = theme;
                localStorage.setItem('yamb_theme', theme);
                localStorage.removeItem('yamb_global_chat_read_alice');
                const manager = app.globalChat;
                manager.activityUid = '';
                manager.syncActivityIdentity();
                app.socket.receive('global_chat_activity', { uid: 'alice', messages: [{ id: 'baseline', createdAt: 100, senderUid: 'bob' }] });
            }, theme);
            const button = page.locator('.main-global-chat-btn');
            await page.waitForFunction(() => {
                const image = document.querySelector('.main-global-chat-btn img');
                return image.complete && image.naturalWidth > 0 && getComputedStyle(image).visibility !== 'hidden';
            });
            const before = await button.boundingBox();
            assert.equal(await page.locator('#global-chat-unread').textContent(), '0');
            await page.evaluate(() => {
                for (let i = 0; i < 12; i++) app.socket.receive('global_chat_msg', { id: `new-${i}`, createdAt: 200 + i, senderUid: 'bob' });
                app.socket.receive('global_chat_typing', { uids: ['bob'] });
            });
            assert.equal(await page.locator('#global-chat-unread').textContent(), '12');
            assert.equal(await page.locator('#global-chat-typing').isVisible(), true);
            assert.deepEqual(await button.boundingBox(), before, 'Indicators must not resize/reposition the icon');
            const measured = await page.evaluate(() => {
                const badge = document.getElementById('global-chat-unread'), s = getComputedStyle(badge), rect = badge.getBoundingClientRect();
                return { color: s.color, background: s.backgroundColor, rect: [rect.x, rect.y, rect.width, rect.height],
                    clipped: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.main-global-chat-btn') == null,
                    label: document.querySelector('.main-global-chat-btn').getAttribute('aria-label'),
                    image: document.querySelector('.main-global-chat-btn img').getAttribute('src') };
            });
            assert(contrast(measured.color, measured.background) >= 4.5, `${theme} badge contrast`);
            assert(measured.rect[0] >= 0 && measured.rect[1] >= 0 && measured.rect[0] + measured.rect[2] <= width, 'Badge must remain within viewport');
            assert(!measured.clipped, `${theme} badge is clipped or covered`);
            assert(measured.label.includes('12') && measured.label.includes('Neko piše'), 'Accessible label conveys both real states');
            if (width === 360) await page.screenshot({ path: path.join(output, `${theme}-unread.png`), clip: { x: 0, y: 10, width: 145, height: 110 } });
            results.push({ theme, width, height, button: before, ...measured, contrast: contrast(measured.color, measured.background) });
            // Opening alone must not clear the number; the visible history must arrive first.
            await button.focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#global-chat-unread').textContent(), '12');
            await page.evaluate(() => app.socket.receive('global_chat_history', [{ id: 'read-now', createdAt: 300, senderUid: 'alice', sender: 'Alice', msg: 'Fixture message' }]));
            assert.equal(await page.locator('#global-chat-unread').textContent(), '0');
        }
        await context.close();
        fs.writeFileSync(path.join(output, 'layout.json'), JSON.stringify(results, null, 2));
        console.log(`Global Chat indicators: ${results.length} theme/viewport cases; geometry unchanged, readable badges, keyboard opening and read-after-history passed. Minimum badge contrast ${Math.min(...results.map(r => r.contrast)).toFixed(2)}:1.`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
