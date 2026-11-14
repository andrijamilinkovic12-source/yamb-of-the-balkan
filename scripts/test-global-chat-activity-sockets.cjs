// Two isolated browser clients and a loopback Socket.IO server. No production accounts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { Server } = require('socket.io');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const { createGlobalChatActivity } = require('../lib/global-chat-activity');
const source = fs.readFileSync('www/globalchat.js', 'utf8');
const markup = `<!doctype html><meta charset="utf-8"><div class="main-global-chat-btn"><span id="global-chat-unread" hidden></span><span id="global-chat-typing" hidden></span></div>
<div id="global-chat-overlay" style="display:none"><div id="global-chat-body"></div><textarea id="global-chat-input"></textarea><span id="global-chat-typing-status" hidden></span></div>
<script src="/socket.io/socket.io.js"></script>`;
const server = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(markup); });
const io = new Server(server, { serveClient: true });
const history = [];
const activity = createGlobalChatActivity({ io, getHistory: () => history });
let id = 0;
io.on('connection', socket => {
    // Fixture identities only. Production identities come from Firebase verification.
    socket.verifiedUid = ['alice', 'bob'].includes(socket.handshake.auth.uid) ? socket.handshake.auth.uid : '';
    socket.playerName = socket.verifiedUid;
    activity.bind(socket);
    socket.on('request_global_chat_history', () => socket.emit('global_chat_history', history));
    socket.on('global_chat_msg', data => {
        if (!socket.verifiedUid) return;
        const message = { id: String(++id), createdAt: Date.now(), senderUid: socket.verifiedUid,
            senderId: socket.id, sender: socket.playerName, msg: data.msg };
        history.push(message);
        activity.stop(socket);
        io.emit('global_chat_msg', message);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
        const makeClient = async uid => {
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(base);
            await page.addScriptTag({ content: source });
            await page.evaluate(uid => {
                localStorage.setItem('yamb_uid', uid);
                localStorage.setItem('yamb_chat_rules_accepted', 'true');
                const socket = io({ auth: { uid }, transports: ['websocket'] });
                window.app = { socket, socketVerifiedUid: uid, requireLogin: () => true, initSocketConnection() {},
                    openGlobalChat() { return this.globalChat.open(); } };
                app.globalChat = new GlobalChatManager(app);
                app.globalChat.ensureChatReady = async () => true;
                app.globalChat.appendMessage = () => {}; // Record-read behavior is tested; text rendering is a separate fixture.
                app.globalChat.bindSocket(socket);
                socket.on('connect', () => app.globalChat.requestActivity());
            }, uid);
            await page.waitForFunction(() => app.globalChat.activityLoaded);
            return page;
        };
        const alice = await makeClient('alice'), bob = await makeClient('bob');
        await bob.evaluate(() => app.globalChat.open());
        await bob.locator('#global-chat-input').fill('Real loopback test');
        await alice.waitForFunction(() => !document.getElementById('global-chat-typing').hidden);
        assert.equal(await alice.locator('#global-chat-unread').textContent(), '0', 'Typing is not yet a message');
        await bob.evaluate(() => app.globalChat.send());
        await alice.waitForFunction(() => document.getElementById('global-chat-unread').textContent === '1');
        await alice.waitForFunction(() => document.getElementById('global-chat-typing').hidden);
        assert.equal(await bob.evaluate(() => app.globalChat.unreadCount()), 0, 'Sender does not notify itself');
        await alice.evaluate(() => app.globalChat.open());
        await alice.waitForFunction(() => app.globalChat.historyReady && app.globalChat.unreadCount() === 0);
        await alice.evaluate(() => app.globalChat.close(true));
        await alice.evaluate(() => app.socket.disconnect());
        await bob.evaluate(() => { document.getElementById('global-chat-input').value = 'While Alice is offline'; return app.globalChat.send(); });
        await bob.waitForFunction(() => app.globalChat.activityMessages.length === 2);
        await alice.evaluate(() => app.socket.connect());
        await alice.waitForFunction(() => app.globalChat.unreadCount() === 1);
        await alice.evaluate(() => app.globalChat.open());
        await alice.waitForFunction(() => app.globalChat.historyReady && app.globalChat.unreadCount() === 0);
        await alice.evaluate(() => app.socket.disconnect());
        await bob.evaluate(() => { document.getElementById('global-chat-input').value = 'Reconnect with room open'; return app.globalChat.send(); });
        await bob.waitForFunction(() => app.globalChat.activityMessages.length === 3);
        await alice.evaluate(() => app.socket.connect());
        await alice.waitForFunction(() => app.globalChat.historyReady && app.globalChat.activityMessages.length === 3 && app.globalChat.unreadCount() === 0);
        console.log('Loopback Socket.IO: two browsers, live typing, send/receive, own-message exclusion, visible read, missed-message reconnect and open-room resynchronization passed.');
    } finally {
        await browser?.close();
        await new Promise(resolve => io.close(resolve));
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
