const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createGlobalChatActivity } = require('../lib/global-chat-activity');

let time = 100000;
const timers = new Map();
let timerId = 0;
const setTimer = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: time + delay }); return id; };
const clearTimer = id => timers.delete(id);
const advance = ms => {
    time += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); }
};
const message = (id, at, uid = 'other') => ({ id, createdAt: at, senderUid: uid, sender: uid, msg: 'hello' });
let history = [message('a', 1000)];
const broadcasts = [];
const activity = createGlobalChatActivity({
    io: { to: room => ({ emit: (event, payload) => broadcasts.push({ room, event, payload }) }) },
    getHistory: () => history, now: () => time, setTimer, clearTimer
});
function makeSocket(uid, id = uid) {
    const listeners = new Map(), sent = [];
    return {
        id, verifiedUid: uid, playerName: uid, connected: true, sent,
        on(event, fn) { const handlers = listeners.get(event) || []; handlers.push(fn); listeners.set(event, handlers); },
        off(event, fn) { if (!fn) listeners.delete(event); else listeners.set(event, (listeners.get(event) || []).filter(h => h !== fn)); },
        emit(event, data) { sent.push({ event, data }); },
        receive(event, data) { for (const fn of listeners.get(event) || []) fn(data); },
        join(room) { this.room = room; }
    };
}
const alice = makeSocket('alice'), bob = makeSocket('bob'), guest = makeSocket('');
for (const socket of [alice, bob, guest]) activity.bind(socket);
guest.receive('request_global_chat_activity');
guest.receive('global_chat_typing', { active: true, uid: 'alice' });
assert.equal(guest.sent.length, 0);
assert.equal(broadcasts.length, 0, 'Unauthenticated clients cannot announce typing');
alice.receive('request_global_chat_activity');
assert.equal(alice.sent.length, 1);
assert.equal(alice.sent[0].data.uid, 'alice');
assert(!('msg' in alice.sent[0].data.messages[0]), 'Menu snapshots contain no message text');
alice.receive('request_global_chat_activity');
assert.equal(alice.sent.length, 1, 'Activity requests are rate limited');
alice.receive('global_chat_typing', { active: true, uid: 'forged' });
assert.deepEqual(broadcasts.at(-1).payload.uids, ['alice'], 'Typing uses the verified identity');
alice.receive('global_chat_typing', { active: true });
assert.equal(broadcasts.length, 1, 'Typing is throttled');
bob.receive('global_chat_typing', { active: true });
assert.deepEqual(broadcasts.at(-1).payload.uids, ['alice', 'bob']);
activity.stop(alice);
assert.deepEqual(broadcasts.at(-1).payload.uids, ['bob']);
advance(6001);
assert.deepEqual(broadcasts.at(-1).payload.uids, [], 'A crashed/idle typer expires');
bob.receive('global_chat_typing', { active: true });
bob.receive('disconnect');
assert.deepEqual(broadcasts.at(-1).payload.uids, [], 'Disconnect clears typing immediately');

const storage = new Map([['yamb_uid', 'alice']]);
const node = () => ({ hidden: true, textContent: '', dataset: {}, style: { setProperty() {}, removeProperty() {} },
    setAttribute(key, value) { this[key] = value; }, addEventListener() {}, querySelector() { return null; } });
const button = node(), overlay = node(); overlay.style.display = 'none';
const elements = new Map(['global-chat-unread', 'global-chat-typing', 'global-chat-typing-status'].map(id => [id, node()]));
elements.set('global-chat-overlay', overlay);
elements.set('global-chat-body', node());
const docListeners = {};
const document = { visibilityState: 'visible', documentElement: node(),
    getElementById: id => elements.get(id), querySelector: selector => selector === '.main-global-chat-btn' ? button : null,
    addEventListener(event, fn) { docListeners[event] = fn; } };
const context = vm.createContext({ document, window: { addEventListener() {}, innerHeight: 800 },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: setTimer, clearTimeout: clearTimer, t: key => key, Date });
const Manager = vm.runInContext(fs.readFileSync('www/globalchat.js', 'utf8') + '\nGlobalChatManager', context);
const clientSocket = makeSocket('alice');
const app = { socket: clientSocket, socketVerifiedUid: 'alice' };
const manager = new Manager(app);
manager.renderHistoryState = () => {};
manager.renderWelcome = () => {};
manager.appendMessage = () => {};
manager.bindSocket(clientSocket);
const receive = (event, data) => clientSocket.receive(event, data);
receive('global_chat_activity', { uid: 'alice', messages: [message('a', 1000)] });
assert.equal(manager.unreadCount(), 0, 'First sync baselines the existing history');
receive('global_chat_msg', message('b', 2000));
receive('global_chat_msg', message('b', 2000));
assert.equal(manager.unreadCount(), 1, 'Duplicate delivery cannot inflate unread count');
receive('global_chat_msg', message('c', 2100, 'alice'));
assert.equal(manager.unreadCount(), 1, 'Own messages are excluded');
assert.equal(elements.get('global-chat-unread').hidden, false);
assert.equal(button.dataset.chatActivity, 'unread');
receive('global_chat_history', [message('a', 1000), message('b', 2000), message('c', 2100, 'alice')]);
assert.equal(manager.unreadCount(), 1, 'Background history does not mark messages as read');
overlay.style.display = 'flex';
document.visibilityState = 'hidden';
receive('global_chat_history', [message('b', 2000)]);
assert.equal(manager.unreadCount(), 1, 'Hidden app cannot read a message');
document.visibilityState = 'visible';
receive('global_chat_history', [message('b', 2000)]);
assert.equal(manager.unreadCount(), 0, 'Visible room clears unread after history arrives');
assert.equal(elements.get('global-chat-unread').textContent, '0', 'A real zero covers decorative PNG notification dots');
overlay.style.display = 'none';
receive('global_chat_msg', message('same-millisecond', 2000));
assert.equal(manager.unreadCount(), 1, 'A new ID with the same timestamp stays unread');
manager.bindSocket(clientSocket);
receive('global_chat_msg', message('d', 3000));
assert.equal(manager.unreadCount(), 2, 'Rebinding listeners does not duplicate messages');
clientSocket.connected = false;
receive('disconnect');
clientSocket.connected = true;
receive('global_chat_activity', { uid: 'alice', messages: [message('b', 2000), message('same-millisecond', 2000), message('d', 3000), message('missed', 4000)] });
assert.equal(manager.unreadCount(), 3, 'Reconnect discovers missed messages');
const reloaded = new Manager(app);
reloaded.receiveActivity([message('b', 2000), message('missed', 4000)]);
assert.equal(reloaded.unreadCount(), 1, 'A reload preserves the account read cursor');
storage.set('yamb_uid', 'bob');
manager.syncActivityIdentity();
assert.equal(manager.unreadCount(), 0, 'Switching accounts never carries the unread count');
receive('global_chat_activity', { uid: 'alice', messages: [message('wrong-account', 5000)] });
assert.equal(manager.activityMessages.length, 0, 'Late snapshots for a previous account are ignored');
storage.set('yamb_uid', 'alice');
manager.syncActivityIdentity();
manager.receiveActivity([message('b', 2000), message('missed', 4000)]);
assert.equal(manager.unreadCount(), 1);
receive('global_chat_history', []);
assert.equal(manager.unreadCount(), 0, 'Weekly reset/deletion removes vanished unread messages');
receive('global_chat_typing', { uids: ['alice'] });
assert.equal(elements.get('global-chat-typing').hidden, true, 'Own typing does not notify oneself');
receive('global_chat_typing', { uids: ['bob'] });
assert.equal(elements.get('global-chat-typing').hidden, false);
advance(6501);
assert.equal(elements.get('global-chat-typing').hidden, true, 'Client also expires stale typing');
clientSocket.connected = false;
receive('disconnect');
assert.equal(button.dataset.chatActivity, 'offline', 'Offline never claims there are no new messages');
clientSocket.connected = true;
manager.receiveActivity([message('missed', 4000)]);
overlay.style.display = 'flex';
manager.historyReady = false;
manager.receiveMessage(message('arriving-during-load', 5000), clientSocket);
assert.equal(manager.unreadCount(), 2, 'A live message during history loading cannot clear unread history');
console.log('Global Chat activity: authenticated snapshots, throttled/expiring typing, unread deduplication, own-message filtering, read visibility, reconnect, reload, account separation, reset and offline states passed.');
