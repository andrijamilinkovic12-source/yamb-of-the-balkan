'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const output = path.resolve(__dirname, '../tmp/global-chat-send-qa');
const server = fork(path.join(__dirname, 'serve-global-chat-activity-qa.cjs'), {
    env: { ...process.env, CHAT_QA_PORT: '0' }, stdio: ['ignore', 'ignore', 'inherit', 'ipc']
});
async function main() {
    let browser;
    try {
        const { port } = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error('Fixture startup timeout')), 10000);
            server.once('message', data => { clearTimeout(timer); resolve(data); });
            server.once('exit', code => { clearTimeout(timer); reject(Error(`Fixture exited: ${code}`)); });
        });
        const base = `http://127.0.0.1:${port}`;
        browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
        const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
        await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/?client=alice`);
        await page.waitForFunction(() => app.globalChat.activityLoaded);
        await page.evaluate(() => app.globalChat.open());
        await page.waitForFunction(() => app.globalChat.historyReady);
        const config = fs.readFileSync(path.join(__dirname, '../www/config.js'), 'utf8');
        await page.addScriptTag({ content: config.slice(config.indexOf('const YambSecurity ='), config.indexOf('const SHOP_DATA =')) });

        await page.evaluate(() => {
            window.realEmit = app.socket.emit;
            window.postCount = 0;
            app.socket.emit = function (event, ...args) {
                if (event !== 'global_chat_msg') return realEmit.call(this, event, ...args);
                window.postCount++;
                window.releasePost = () => realEmit.call(this, event, ...args);
                return this;
            };
        });
        await page.locator('#global-chat-input').fill('Confirmed <img src=x onerror="window.badChat=true">');
        await page.locator('#btn-global-send').click();
        assert.equal(await page.locator('#btn-global-send').isDisabled(), true);
        assert.equal(await page.locator('#global-chat-input').getAttribute('readonly'), '');
        assert((await page.locator('#global-chat-input').inputValue()).startsWith('Confirmed'));
        await page.evaluate(() => app.globalChat.send());
        assert.equal(await page.evaluate(() => postCount), 1);
        await page.evaluate(() => { releasePost(); app.socket.emit = realEmit; });
        await page.waitForFunction(() => !app.globalChat.mutationPending);
        assert.equal(await page.locator('#global-chat-input').inputValue(), '');
        assert.equal(await page.locator('.msg-outgoing').count(), 1);
        assert.equal(await page.locator('.global-chat-message-text img').count(), 0);
        assert.equal(await page.evaluate(() => window.badChat), undefined);

        await page.evaluate(() => {
            app.socket.emit = function (event, ...args) {
                if (event !== 'global_chat_msg') return realEmit.call(this, event, ...args);
                setTimeout(() => args.at(-1)({ ok: false, reason: 'err_chat_save_failed' }), 30);
                return this;
            };
        });
        await page.locator('#global-chat-input').fill('Draft after failed persistence');
        await page.locator('#btn-global-send').click();
        await page.waitForFunction(() => !app.globalChat.mutationPending);
        assert.equal(await page.locator('#global-chat-input').inputValue(), 'Draft after failed persistence');
        assert.equal(await page.locator('#global-chat-status').isVisible(), true);
        assert.equal(await page.locator('#btn-global-send').isEnabled(), true);

        fs.mkdirSync(output, { recursive: true });
        for (const [width, height] of [[320, 568], [360, 780], [768, 1024]]) {
            await page.setViewportSize({ width, height });
            await page.locator('#global-chat-input').fill('x'.repeat(550));
            const geometry = await page.locator('#global-chat-input').evaluate(input => {
                const rect = input.getBoundingClientRect();
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                    scrollWidth: input.scrollWidth, clientWidth: input.clientWidth, viewport: innerHeight };
            });
            assert(geometry.height > 45, 'Long drafts grow vertically');
            assert(geometry.scrollWidth <= geometry.clientWidth + 1, 'Long unbroken text wraps without horizontal scrolling');
            assert(geometry.x >= 0 && geometry.x + geometry.width <= width + 1);
            assert(geometry.y >= 0 && geometry.y + geometry.height <= height + 1);
            await page.screenshot({ path: path.join(output, `${width}x${height}.png`) });
        }
        await page.evaluate(() => {
            app.socket.emit = function (event, ...args) {
                if (event !== 'global_chat_msg') return realEmit.call(this, event, ...args);
                this.disconnect();
                return this;
            };
        });
        await page.locator('#global-chat-input').fill('Draft retained after disconnect');
        await page.locator('#btn-global-send').click();
        await page.waitForFunction(() => !app.globalChat.mutationPending);
        assert.equal(await page.locator('#global-chat-input').inputValue(), 'Draft retained after disconnect');
        assert.equal(await page.locator('#btn-global-send').isEnabled(), true);
        assert.deepEqual(errors, []);
        console.log('Global Chat browser composer: pending/ack, double-click protection, literal HTML, failed-save/disconnect drafts and long-text wrapping at three viewports passed.');
    } finally {
        await browser?.close();
        if (server.exitCode === null) {
            const exited = new Promise(resolve => server.once('exit', resolve));
            server.kill();
            await exited;
        }
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
