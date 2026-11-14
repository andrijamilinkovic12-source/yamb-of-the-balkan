// Exercise the production chat UI and socket authorization on an isolated local fixture.
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const server = fork(path.join(__dirname, 'serve-global-chat-activity-qa.cjs'), {
    env: { ...process.env, CHAT_QA_PORT: '0', CHAT_QA_OWNER_ENABLED: 'true' },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc']
});

async function main() {
    let browser;
    try {
        const { port } = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Local chat fixture timed out')), 10000);
            server.once('message', data => { clearTimeout(timer); resolve(data); });
            server.once('exit', code => { clearTimeout(timer); reject(new Error(`Fixture exited: ${code}`)); });
        });
        const base = `http://127.0.0.1:${port}/`;
        browser = await chromium.launch({ headless: true,
            ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
        async function client(name) {
            const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
            await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
            const page = await context.newPage();
            await page.goto(base + '?client=' + name);
            await page.locator('#qa-open').click();
            await page.waitForFunction(() => app.globalChat.historyReady);
            return page;
        }
        const owner = await client('alice');
        const player = await client('bob');
        await owner.locator('#btn-chat-moderation').waitFor();
        assert.equal(await player.locator('#btn-chat-moderation').isVisible(), false);
        const rpc = (page, event, data) => page.evaluate(({ event, data }) => app.globalChat.moderation.rpc(event, data), { event, data });
        for (const [event, data] of [
            ['request_global_chat_moderation', { tab: 'reports' }],
            ['global_chat_moderation_action', { action: 'mute', targetUid: 'qa-chat-alice', duration: 'permanent', reason: 'Privileged action' }]
        ]) {
            const result = await rpc(player, event, { ...data, owner: true, actorUid: 'qa-chat-alice' });
            assert.deepEqual(result, { ok: false, reason: 'err_chat_moderator_required' });
        }
        const original = 'Test <b>poruke</b> za prijavu';
        await player.locator('#global-chat-input').fill(original);
        await player.locator('#btn-global-send').click();
        owner.once('dialog', dialog => dialog.accept('Test razloga prijave'));
        await owner.locator('.global-chat-report-btn').click();
        await owner.waitForFunction(() => app.globalChat.moderation.pending === 1);
        await player.locator('[data-lang="chat_edit_action"]').click();
        await player.locator('#global-chat-input').fill('Naknadno izmenjena poruka');
        await player.locator('#btn-global-send').click();
        await owner.getByText('Naknadno izmenjena poruka', { exact: true }).waitFor();
        await owner.locator('#btn-chat-moderation').click();
        await owner.getByText(original, { exact: true }).waitFor();
        await owner.getByText('Test razloga prijave', { exact: true }).waitFor();
        assert.equal(await owner.locator('#chat-mod-list b').count(), 0);
        assert.equal(await owner.locator('#global-chat-footer').isVisible(), false);
        await owner.locator('[data-chat-mod-tab="messages"]').click();
        await owner.locator('#chat-mod-list').getByText('Naknadno izmenjena poruka', { exact: true }).waitFor();
        await owner.getByRole('button', { name: 'Zabrani pisanje', exact: true }).click();
        await owner.locator('#chat-mod-reason').fill('Test privremene zabrane');
        await owner.locator('#chat-mod-duration').selectOption('15m');
        for (const [width, height] of [[320, 568], [360, 780], [430, 932]]) {
            await owner.setViewportSize({ width, height });
            for (const theme of themes) {
                await owner.evaluate(theme => applyQaTheme(theme), theme);
                for (const selector of ['#chat-moderation-panel', '#chat-mod-decision', '#chat-mod-submit']) {
                    const box = await owner.locator(selector).boundingBox();
                    assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1
                        && box.y + box.height <= height + 1, `${theme} at ${width} clips ${selector}`);
                }
            }
        }
        owner.once('dialog', dialog => dialog.dismiss());
        await owner.locator('#chat-mod-submit').click();
        assert.equal(await player.locator('#chat-moderation-restriction').isVisible(), false);
        owner.once('dialog', dialog => dialog.accept());
        await owner.locator('#chat-mod-submit').click();
        await player.getByText(/Test privremene zabrane/).waitFor();
        assert.equal(await player.locator('#btn-global-send').isDisabled(), true);
        const count = await player.locator('.msg-outgoing').count();
        await player.evaluate(() => { app.socket.emit('global_chat_msg', { msg: 'Poruka tokom zabrane' }); });
        await player.locator('#global-chat-status').waitFor();
        assert.equal(await player.locator('.msg-outgoing').count(), count);
        await owner.locator('[data-chat-mod-tab="bans"]').click();
        await owner.getByRole('button', { name: 'Ukini zabranu', exact: true }).click();
        await owner.locator('#chat-mod-reason').fill('Test ukidanja zabrane');
        owner.once('dialog', dialog => dialog.accept());
        await owner.locator('#chat-mod-submit').click();
        await player.locator('#chat-moderation-restriction').waitFor({ state: 'hidden' });
        assert.equal(await player.locator('#btn-global-send').isEnabled(), true);
        await owner.locator('[data-chat-mod-tab="reports"]').click();
        await owner.getByRole('button', { name: 'Ukloni poruku', exact: true }).click();
        await owner.locator('#chat-mod-reason').fill('Test uklanjanja prijavljene poruke');
        owner.once('dialog', dialog => dialog.accept());
        await owner.locator('#chat-mod-submit').click();
        await player.locator('.msg-outgoing').waitFor({ state: 'detached' });
        await player.getByText(/Test uklanjanja prijavljene poruke/).waitFor();
        await owner.getByText('Nema stavki u ovom prikazu.', { exact: true }).waitFor();
        await owner.locator('[data-chat-mod-tab="audit"]').click();
        await owner.getByText('Test uklanjanja prijavljene poruke', { exact: true }).waitFor();
        await owner.getByText('Test ukidanja zabrane', { exact: true }).waitFor();
        const sendDuel = async text => rpc(player, 'chat_msg', { roomId: 'qa-duel', msg: text });
        assert((await sendDuel('Druga privatna poruka')).ok);
        await player.waitForTimeout(1205);
        const privateMessage = await sendDuel('Prijavljena privatna poruka');
        assert(privateMessage.ok);
        assert((await rpc(owner, 'report_duel_chat_msg', { roomId: 'qa-duel',
            messageId: privateMessage.message.id, reason: 'Razlog privatne prijave' })).ok);
        await owner.locator('[data-chat-mod-tab="reports"]').click();
        await owner.getByText('Prijavljena privatna poruka', { exact: true }).waitFor();
        await owner.getByText(/Privatna poruka iz online duela · qa-private-match/).waitFor();
        assert.equal(await owner.getByText('Druga privatna poruka', { exact: true }).count(), 0);
        assert.equal(await owner.getByRole('button', { name: 'Ukloni poruku', exact: true }).count(), 0);
        await owner.evaluate(() => {
            localStorage.removeItem('yamb_uid');
            app.globalChat.syncActivityIdentity();
        });
        assert.equal(await owner.locator('#btn-chat-moderation').isVisible(), false);
        assert.equal(await owner.locator('#chat-mod-list .chat-mod-card').count(), 0);
        console.log('Moderation UI: owner-only controls, report snapshot, moderation decisions, live limits/removal, audit and 30 theme/viewport cases passed.');
    } finally {
        await browser?.close();
        server.kill();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
