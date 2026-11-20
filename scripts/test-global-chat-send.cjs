'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { deferred } = require('./test-global-chat-posting.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'www/globalchat.js'), 'utf8');
function fixture(options = {}) {
    const storage = new Map([['yamb_uid', 'alice']]), listeners = new Map(), timers = new Map(), emitted = [];
    const input = { value: 'Draft to keep', style: {} }, count = {}, button = { dataset: {}, setAttribute() {} };
    const status = { style: {}, dataset: {} }, overlay = { querySelectorAll: () => [] };
    const elements = { 'global-chat-input': input, 'global-chat-char-count': count, 'btn-global-send': button,
        'global-chat-status': status, 'global-chat-overlay': overlay };
    const context = vm.createContext({ document: { getElementById: id => elements[id] }, window: {},
        localStorage: { getItem: key => storage.get(key) || '' },
        setTimeout(fn) { const id = {}; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id) });
    const Manager = vm.runInContext(source + '\nGlobalChatManager', context);
    const socket = { connected: true, on(event, fn) { listeners.set(event, fn); },
        off(event) { listeners.delete(event); }, emit(event, data, ack) {
            emitted.push({ event, data, ack });
            if (options.emit) options.emit(event, data, ack);
        } };
    const manager = Object.create(Manager.prototype);
    Object.assign(manager, { app: { socket }, mutationPending: false, editingMessage: null,
        ensureChatReady: options.ready || (async () => true), gt: key => key,
        resizeInput() {}, stopTyping() {}, requestHistory() { this.historyRequested = true; } });
    return { manager, input, count, button, status, socket, storage, emitted, listeners, timers };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function main() {
    const auth = deferred(), first = fixture({ ready: () => auth.promise });
    const sending = first.manager.send();
    await first.manager.send();
    assert.equal(first.input.readOnly, true);
    assert.equal(first.button.disabled, true);
    assert.equal(first.input.value, 'Draft to keep');
    auth.resolve(true);
    await tick();
    assert.equal(first.emitted.length, 1, 'Double tapping during authentication sends one request');
    assert.equal(first.input.value, 'Draft to keep', 'Keep the draft until the server confirms');
    first.emitted[0].ack({ ok: true, message: { id: 'committed' } });
    await sending;
    assert.equal(first.input.value, '');
    assert.equal(first.button.disabled, false);
    assert.equal(first.count.textContent, '0/550');

    for (const reason of ['err_chat_save_failed', 'err_chat_slow_down', 'err_chat_suspended']) {
        const f = fixture({ emit: (_event, _data, ack) => ack({ ok: false, reason }) });
        await f.manager.send();
        assert.equal(f.input.value, 'Draft to keep');
        assert.equal(f.status.innerText, reason);
        assert.equal(f.manager.mutationPending, false);
    }
    const disconnect = fixture();
    const interrupted = disconnect.manager.send();
    await tick();
    disconnect.socket.connected = false;
    disconnect.listeners.get('disconnect')();
    await interrupted;
    assert.equal(disconnect.input.value, 'Draft to keep');
    assert.equal(disconnect.button.disabled, false);

    const timeout = fixture();
    const uncertain = timeout.manager.send();
    await tick();
    [...timeout.timers.values()][0]();
    await uncertain;
    assert.equal(timeout.input.value, 'Draft to keep');
    assert.equal(timeout.status.innerText, 'err_chat_save_failed');
    timeout.input.value = 'New draft after timeout';
    timeout.emitted[0].ack({ ok: true });
    assert.equal(timeout.input.value, 'New draft after timeout', 'Late acknowledgements cannot erase newer text');

    for (const beforeEmit of [true, false]) {
        const ready = deferred(), changed = fixture({ ready: () => ready.promise });
        const pending = changed.manager.send();
        if (!beforeEmit) { ready.resolve(true); await tick(); }
        changed.storage.set('yamb_uid', 'bob');
        changed.input.value = 'Bob draft';
        if (beforeEmit) ready.resolve(true);
        else changed.emitted[0].ack({ ok: true });
        await pending;
        assert.equal(changed.input.value, 'Bob draft');
        assert.equal(changed.emitted.length, beforeEmit ? 0 : 1);
    }
    const replacement = fixture();
    const replacing = replacement.manager.send();
    await tick();
    replacement.input.value = 'Replacement draft';
    replacement.emitted[0].ack({ ok: true });
    await replacing;
    assert.equal(replacement.input.value, 'Replacement draft');

    for (const options of [{ ready: async () => false }, { emit: () => { throw Error('transport failed'); } },
        { emit: (_event, _data, ack) => ack({}) }]) {
        const f = fixture(options);
        await f.manager.send();
        assert.equal(f.input.value, 'Draft to keep');
        assert.equal(f.button.disabled, false);
        assert.equal(f.timers.size, 0);
        assert.equal(f.listeners.size, 0);
    }
    console.log('Global Chat composer: single in-flight send, durable confirmation, preserved drafts on rejection/disconnect/timeout, late replies and account changes passed.');
}
const watchdog = setTimeout(() => { console.error('Global Chat send test timed out'); process.exit(1); }, 10000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
