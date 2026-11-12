'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

// The live-match server has one process. All wallet read/modify/save flows must
// hold the same account scopes as native tournament transactions, before reading.
function createProfileWrites() {
    const context = new AsyncLocalStorage();
    const tails = new Map();
    const bound = new WeakSet();
    const keysFor = values => [...new Set([values].flat(Infinity)
        .filter(value => typeof value === 'string' && value.length))].sort();

    function owns(values) {
        const held = context.getStore();
        return !!held?.active && keysFor(values).every(uid => held.keys.has(uid));
    }

    async function run(values, operation) {
        const keys = keysFor(values);
        const held = context.getStore();
        if (held?.active) {
            if (!owns(keys)) throw new Error('profile_write_scope_expansion');
            return operation();
        }
        const releases = [];
        const scope = { keys: new Set(keys), active: true };
        try {
            // Reserving in stable order prevents opposite-pair deadlocks.
            for (const uid of keys) {
                const previous = tails.get(uid);
                let release;
                const current = new Promise(resolve => { release = resolve; });
                tails.set(uid, current);
                releases.push(() => {
                    if (tails.get(uid) === current) tails.delete(uid);
                    release();
                });
                if (previous) await previous;
            }
            return await context.run(scope, operation);
        } finally {
            scope.active = false;
            releases.reverse().forEach(release => release());
        }
    }

    function bindSocket(socket, events) {
        if (bound.has(socket)) return;
        bound.add(socket);
        const on = socket.on;
        const selected = new Set(events);
        const identity = () => socket.verifiedUid || socket.playerId || '';
        // Keep the handler's validation and response contract; serialize its
        // entire read/modify/save lifetime, including asynchronous ad verification.
        socket.on = function (event, handler) {
            if (!selected.has(event)) return on.call(this, event, handler);
            return on.call(this, event, async (...args) => {
                const uid = identity();
                return run(uid, () => {
                    if (identity() !== uid) {
                        socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
                        const ack = args.at(-1);
                        if (typeof ack === 'function') ack({ ok: false, reason: 'auth_required' });
                        return;
                    }
                    return handler.apply(socket, args);
                });
            });
        };
    }

    return { run, owns, bindSocket };
}

module.exports = { createProfileWrites };
