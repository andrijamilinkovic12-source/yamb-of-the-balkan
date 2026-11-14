const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const output = path.resolve('tmp/global-chat-message-actions');
const server = fork(path.join(__dirname, 'serve-global-chat-activity-qa.cjs'), { env: { ...process.env, CHAT_QA_PORT: '0' }, stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
(async () => {
    let browser;
    try {
        const { port } = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Local fixture startup timed out')), 10000);
            server.once('message', data => { clearTimeout(timer); resolve(data); });
            server.once('exit', code => { clearTimeout(timer); reject(new Error(`Fixture exited: ${code}`)); });
        });
        const base = `http://127.0.0.1:${port}`;
        browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
        const createClient = async id => {
            const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
            await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
            const page = await context.newPage();
            await page.goto(`${base}/?client=${id}`);
            await page.waitForFunction(() => app.globalChat.activityLoaded);
            await page.evaluate(() => app.globalChat.open());
            await page.waitForFunction(() => app.globalChat.historyReady);
            return page;
        };
        const alice = await createClient('alice'), bob = await createClient('bob');
        await alice.locator('#global-chat-input').fill('Original <b>message</b>');
        await alice.locator('#btn-global-send').click();
        await bob.waitForFunction(() => document.querySelectorAll('.msg-incoming').length === 1);
        await alice.waitForFunction(() => document.querySelectorAll('.msg-outgoing .global-chat-message-action').length === 2);
        assert.equal(await alice.locator('[data-lang="chat_edit_action"]').count(), 1);
        assert.equal(await bob.locator('[data-lang="chat_edit_action"]').count(), 0);
        assert.equal(await bob.locator('.global-chat-message-text b').count(), 0, 'Message HTML stays literal');
        const id = await alice.locator('.msg-outgoing').getAttribute('data-chat-id');
        for (const event of ['edit_global_chat_msg', 'delete_global_chat_msg']) {
            const result = await bob.evaluate(({ event, id }) => new Promise(resolve => app.socket.emit(event,
                { messageId: id, revision: 0, uid: 'qa-chat-alice', senderUid: 'qa-chat-alice', msg: 'forged' }, resolve)), { event, id });
            assert.equal(result.reason, 'err_chat_not_owner');
        }
        await alice.locator('#global-chat-input').fill('Nacrt nove poruke');
        await alice.locator('[data-lang="chat_edit_action"]').click();
        assert.equal(await alice.locator('#global-chat-input').inputValue(), 'Original <b>message</b>');
        assert.equal(await alice.locator('#global-chat-editing').isVisible(), true);
        await alice.locator('#btn-global-cancel-edit').click();
        assert.equal(await alice.locator('#global-chat-input').inputValue(), 'Nacrt nove poruke', 'Cancel restores the unsent draft');
        await bob.evaluate(() => app.globalChat.close(true));
        await alice.locator('[data-lang="chat_edit_action"]').click();
        const updated = 'Izmenjeno <img src=x onerror="window.badEdit=true">';
        await alice.locator('#global-chat-input').fill(updated);
        await alice.locator('#btn-global-send').click();
        await alice.waitForFunction(() => !app.globalChat.editingMessage && !app.globalChat.mutationPending);
        assert.equal(await alice.locator('.global-chat-message-text').textContent(), updated);
        assert.equal(await alice.locator('.global-chat-message-text img').count(), 0);
        assert.equal(await alice.locator('.global-chat-edited').textContent(), 'izmenjeno');
        assert.equal(await alice.locator('#global-chat-input').inputValue(), 'Nacrt nove poruke');
        assert.equal(await bob.evaluate(() => app.globalChat.unreadCount()), 0, 'Editing a read message is not a new message');
        await bob.evaluate(() => app.globalChat.open());
        await bob.waitForFunction(text => document.querySelector('.global-chat-message-text')?.textContent === text, updated);
        assert.equal(await bob.locator('.global-chat-edited').textContent(), 'izmenjeno');
        assert.equal(await bob.locator('.msg-incoming').getAttribute('data-chat-id'), id, 'Edit keeps the same ID');
        const stale = await alice.evaluate(id => new Promise(resolve => app.socket.emit('edit_global_chat_msg', { messageId: id, revision: 0, msg: 'stale' }, resolve)), id);
        assert.equal(stale.reason, 'err_chat_message_changed');
        alice.once('dialog', dialog => dialog.dismiss());
        await alice.locator('[data-lang="chat_delete_action"]').click();
        assert.equal(await alice.locator('.msg-outgoing').count(), 1, 'Canceled delete is a no-op');
        alice.once('dialog', dialog => dialog.accept());
        await alice.locator('[data-lang="chat_delete_action"]').click();
        await alice.waitForFunction(() => document.querySelectorAll('.msg-bubble').length === 0 && !app.globalChat.mutationPending);
        await bob.waitForFunction(() => document.querySelectorAll('.msg-bubble').length === 0);
        assert.equal(await bob.locator('[data-chat-state="empty"]').count(), 1);
        await bob.evaluate(() => app.globalChat.close(true));
        await alice.locator('#global-chat-input').fill('Nepročitana pa obrisana');
        await alice.locator('#btn-global-send').click();
        await bob.waitForFunction(() => app.globalChat.unreadCount() === 1);
        await alice.locator('[data-lang="chat_edit_action"]').click();
        alice.once('dialog', dialog => dialog.accept());
        await alice.locator('[data-lang="chat_delete_action"]').click();
        await bob.waitForFunction(() => app.globalChat.unreadCount() === 0);
        assert.equal(await alice.locator('#global-chat-input').inputValue(), '', 'Deleting the edited message restores the prior draft');

        await alice.locator('#global-chat-input').fill('Message for all theme layouts');
        await alice.locator('#btn-global-send').click();
        await alice.waitForFunction(() => document.querySelectorAll('.msg-outgoing').length === 1);
        await alice.locator('[data-lang="chat_edit_action"]').click();
        fs.mkdirSync(output, { recursive: true });
        for (const [width, height] of [[320, 568], [360, 780], [430, 932]]) for (const theme of themes) {
            await alice.setViewportSize({ width, height });
            await alice.evaluate(theme => applyQaTheme(theme), theme);
            const boxes = await alice.evaluate(() => {
                const rect = el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
                const controls = [...document.querySelectorAll('.global-chat-message-action,#btn-global-cancel-edit,#global-chat-input,#btn-global-send')];
                return { rects: controls.map(rect), footer: rect(document.querySelector('.global-chat-footer')), width: innerWidth, height: innerHeight };
            });
            for (const [x, y, w, h] of boxes.rects) {
                assert(x >= 0 && y >= 0 && x + w <= width + 1 && y + h <= height + 1, `${theme}/${width} action crosses the viewport`);
            }
            assert(boxes.rects[0][3] >= 32, 'Message action keeps its touch height');
            if (width === 360) await alice.screenshot({ path: path.join(output, `${theme}-editing.png`) });
        }
        await alice.locator('#global-chat-input').fill('Nesačuvana izmena posle prekida');
        await alice.evaluate(() => {
            const original = app.socket.emit;
            app.socket.emit = function (event, ...args) { if (event === 'edit_global_chat_msg') { app.socket.disconnect(); return this; } return original.call(this, event, ...args); };
        });
        await alice.locator('#btn-global-send').click();
        await alice.waitForFunction(() => !app.globalChat.mutationPending);
        assert.equal(await alice.locator('#btn-global-send').isEnabled(), true, 'Disconnected edit cannot block the composer');
        assert.equal(await alice.locator('#global-chat-input').inputValue(), 'Nesačuvana izmena posle prekida');
        console.log('Global Chat message UI: two real local clients, owner-only actions, edit/cancel/draft preservation, literal text, edited label, stale revision, delete/cancel, unread removal, disconnect recovery and 30 mobile theme layouts passed.');
    } finally {
        await browser?.close();
        server.kill();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
