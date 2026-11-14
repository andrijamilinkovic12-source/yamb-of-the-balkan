// Loopback-only emulator fixture. Uses production markup/CSS/manager, never game/auth APIs.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const { createGlobalChatActivity } = require('../lib/global-chat-activity');
const { createGlobalChatMutations } = require('../lib/global-chat-mutations');
const { createGlobalChatModeration } = require('../lib/global-chat-moderation');
const { createDuelChat } = require('../lib/duel-chat');
const { createModerationQaStore } = require('./global-chat-moderation-qa-store.cjs');
const root = path.resolve(__dirname, '..', 'www');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const iconStart = index.indexOf('<div class="main-global-chat-btn"');
const icon = index.slice(iconStart, index.indexOf('<div class="main-summary-row"', iconStart));
const roomStart = index.indexOf('<div id="global-chat-overlay"');
const room = index.slice(roomStart, index.indexOf('<div id="online-players-overlay"', roomStart));
const fixture = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Global chat — LOKALNI QA</title>
${styles.map(source => `<link rel="stylesheet" href="/${source}">`).join('')}
<style>
body{margin:0}#qa-controls{position:absolute;top:120px;left:20px;right:20px;max-width:380px;margin:auto;padding:18px;box-sizing:border-box;border-radius:16px;background:var(--theme-card-surface,#E9DDBB);color:var(--theme-card-ink,#193E2B);font:14px/1.5 Arial,sans-serif;box-shadow:0 4px 12px #0004}
#qa-controls h1{font-size:19px;margin:0 0 10px}#qa-controls p{margin:8px 0}#qa-theme{width:100%;height:42px;font:inherit;color:inherit;background:var(--theme-card-raised,#D6C996);border-radius:8px;padding:4px;border:1px solid currentColor}#qa-status{font-weight:700}#qa-open{margin-top:12px;width:100%;min-height:42px;font:700 14px Arial;color:inherit;background:var(--theme-card-raised,#D6C996);border:1px solid currentColor;border-radius:8px}
</style></head><body><div id="main-menu" class="screen active">${icon}<section id="qa-controls"><h1>LOKALNI TEST CHATA</h1><p id="qa-client"></p><p>Postojeća ikona je gore levo. Broj označava nove poruke, a pokretne tačke tuđe kucanje.</p><label for="qa-theme">Tema</label><select id="qa-theme"><option value="dark">Zelena</option><option value="light">Svetlo zlato</option><option value="medium">Trula višnja</option><option value="winter">Plavi okean</option><option value="neon">Neon Cyber</option><option value="amethyst">Kraljevski ametist</option><option value="easter">Vaskršnja</option><option value="desert">Pustinjsko staklo</option><option value="moon">Mesečev sjaj</option><option value="severna">Severna maglina</option></select><p id="qa-status" role="status">Povezivanje…</p><button id="qa-open" onclick="app.openGlobalChat()">OTVORI CHAT</button><p>Izolovan pregled. Bez pravih naloga, nagrada, reklama i produkcionih poruka.</p></section></div>${room}
<script src="/socket.io/socket.io.js"></script><script src="/languages.js"></script><script src="/globalchat.js"></script><script src="/globalchat-moderation.js"></script><script src="/theme-quality-assets.js"></script>
<script>
const query=new URLSearchParams(location.search), uid=query.get('client')==='bob'?'qa-chat-bob':'qa-chat-alice';
localStorage.setItem('yamb_uid',uid);localStorage.setItem('yamb_chat_rules_accepted','true');localStorage.setItem('yamb_lang','sr');
window.YambSecurity={escapeHtml:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),escapeAttr:value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;'),jsString:value=>JSON.stringify(value)};
const socket=io({auth:{uid},transports:['websocket'],reconnectionDelay:300});
window.app={socket,socketVerifiedUid:uid,playerName:uid,requireLogin:()=>true,initSocketConnection(){},openGlobalChat(){return this.globalChat.open()},closeGlobalChat(){return this.globalChat.close(true)},modal:{confirm:text=>Promise.resolve(window.confirm(text)),prompt:text=>Promise.resolve(window.prompt(text))}};
app.globalChat=new GlobalChatManager(app);app.globalChat.ensureChatReady=async()=>socket.connected;app.globalChat.bindSocket(socket);
socket.on('connect',()=>app.globalChat.requestActivity());
const originalActivity=app.globalChat.renderActivity.bind(app.globalChat);app.globalChat.renderActivity=()=>{originalActivity();document.getElementById('qa-status').textContent='Status: '+document.querySelector('.main-global-chat-btn').getAttribute('aria-label')};app.globalChat.renderActivity();
document.getElementById('qa-client').textContent=uid==='qa-chat-alice'?'Test klijent A · emulator':'Test klijent B · lokalni računar';
window.applyQaTheme=theme=>{document.body.className=theme==='dark'?'':theme+'-theme';document.documentElement.dataset.splashTheme=theme;localStorage.setItem('yamb_theme',theme);document.getElementById('qa-theme').value=theme};
document.getElementById('qa-theme').addEventListener('change',event=>applyQaTheme(event.target.value));applyQaTheme(query.get('theme')||'dark');
</script><script src="/theme-main-room-icons.js"></script></body></html>`;
const app = express();
app.get('/', (_req, res) => res.type('html').send(fixture));
// Only public assets and a small explicit script/CSS allowlist are exposed.
app.use('/assets', express.static(path.join(root, 'assets')));
const files = new Set([...styles.map(source => source.split('?')[0]), 'languages.js', 'globalchat.js', 'globalchat-moderation.js', 'theme-quality-assets.js', 'theme-main-room-icons.js']);
app.get('/:file', (req, res) => files.has(req.params.file) ? res.sendFile(path.join(root, req.params.file)) : res.sendStatus(404));
const server = http.createServer(app);
const io = new Server(server, { serveClient: true });
const history = [];
const activity = createGlobalChatActivity({ io, getHistory: () => history });
let mutationQueue = Promise.resolve();
const enqueue = operation => { const result = mutationQueue.then(operation); mutationQueue = result.catch(() => {}); return result; };
const moderationStore = createModerationQaStore(() => history);
const testDuel = { id: 'qa-duel', state: { matchId: 'qa-private-match', players: [], playerUids: ['qa-chat-alice', 'qa-chat-bob'] } };
const duelChat = createDuelChat({
    getRoom: () => testDuel,
    getSocket: id => io.sockets.sockets.get(id),
    checkPosting: async uid => await moderationStore.restriction(uid, Date.now()) ? 'err_chat_suspended' : '',
    saveReport: async data => {
        moderationStore.reportDuel(data);
        for (const client of io.sockets.sockets.values())
            if (moderation.isOwner(client)) client.emit('global_chat_moderation_changed', { kind: 'report' });
    },
    filterText: text => text
});
const moderation = createGlobalChatModeration({ ownerUid: process.env.CHAT_QA_OWNER_ENABLED === 'true' ? 'qa-chat-alice' : '',
    store: moderationStore, getHistory: () => history, enqueue,
    publish: (event, data) => io.emit(event, data),
    notify: (uid, event, data) => { for (const client of io.sockets.sockets.values()) if (client.verifiedUid === uid) client.emit(event, data); } });
const mutations = createGlobalChatMutations({
    getHistory: () => history,
    enqueue: operation => { const result = mutationQueue.then(operation); mutationQueue = result.catch(() => {}); return result; },
    persist: async () => true, // QA has no database or real accounts.
    publish: (event, data) => io.emit(event, data),
    filterText: text => text,
    canEdit: async socket => await moderationStore.restriction(socket.verifiedUid, Date.now()) ? 'err_chat_suspended' : ''
});
let nextId = 0;
io.on('connection', socket => {
    const uid = socket.handshake.auth?.uid;
    if (!['qa-chat-alice', 'qa-chat-bob'].includes(uid)) return socket.disconnect(true);
    socket.verifiedUid = uid;
    socket.playerName = uid === 'qa-chat-alice' ? 'QA A' : 'QA B';
    testDuel.state.players[uid === 'qa-chat-alice' ? 0 : 1] = socket.id;
    duelChat.bind(socket);
    activity.bind(socket);
    mutations.bind(socket);
    moderation.bind(socket);
    void moderation.pushCapabilities(socket);
    socket.on('report_global_chat_msg', data => {
        const message = history.find(message => message.id === data?.messageId);
        if (!message || message.senderUid === uid) return;
        moderationStore.report(socket, message, data?.reason);
        socket.emit('global_chat_report_result', { ok: true, reason: 'chat_report_sent' });
        for (const client of io.sockets.sockets.values()) if (moderation.isOwner(client)) client.emit('global_chat_moderation_changed', { kind: 'report' });
    });
    socket.on('request_global_chat_history', () => socket.emit('global_chat_history', history));
    socket.on('global_chat_msg', async data => {
        if (await moderationStore.restriction(uid, Date.now())) return socket.emit('error_msg', 'err_chat_suspended');
        const msg = typeof data?.msg === 'string' ? data.msg.trim().slice(0, 550) : '';
        if (!msg) return;
        const message = { id: `qa-${++nextId}`, createdAt: Date.now(), sender: socket.playerName, senderId: socket.id, senderUid: uid, msg };
        history.push(message);
        if (history.length > 50) history.shift();
        activity.stop(socket);
        io.emit('global_chat_msg', message);
    });
});
const port = Number(process.env.CHAT_QA_PORT || 3142);
server.listen(port, '127.0.0.1', () => {
    const actualPort = server.address().port;
    console.log(`Local-only Chat QA: http://127.0.0.1:${actualPort}/?client=alice — second client ?client=bob`);
    process.send?.({ port: actualPort });
});
