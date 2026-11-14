const assert = require('node:assert/strict');
const { createGlobalChatMutations, persistGlobalChatMutation } = require('../lib/global-chat-mutations');
const own = () => ({ id: 'one', senderUid: 'alice', sender: 'Alice', senderId: 'old-socket', msg: 'Original', createdAt: 100, revision: 0 });
const socket = uid => ({ id: 'new-socket', verifiedUid: uid, playerName: uid });
const payload = (extra = {}) => ({ messageId: 'one', revision: 0, msg: 'Updated', ...extra });
function fixture(options = {}) {
    let history = [own()], queue = Promise.resolve();
    const writes = [], events = [];
    const service = createGlobalChatMutations({
        getHistory: () => history,
        enqueue: operation => { const result = queue.then(operation); queue = result.catch(() => {}); return result; },
        persist: async change => { writes.push(change); return true; },
        publish: (event, data) => events.push({ event, data }),
        filterText: text => text.replace('banned', '***'), now: () => 1234,
        ...options
    });
    return { service, writes, events, get history() { return history; }, reset() { history = []; } };
}
(async () => {
    const auth = fixture();
    assert.equal((await auth.service.edit(socket(''), payload())).reason, 'err_chat_auth_required');
    assert.equal((await auth.service.edit(socket('bob'), payload({ uid: 'alice', senderUid: 'alice' }))).reason, 'err_chat_not_owner');
    assert.equal((await auth.service.remove(socket('bob'), payload())).reason, 'err_chat_not_owner');
    assert.equal(auth.writes.length, 0, 'Forged owner metadata never reaches persistence');
    assert.equal((await auth.service.edit(socket('alice'), payload({ revision: -1 }))).reason, 'err_chat_invalid_message');
    assert.equal((await auth.service.edit(socket('alice'), payload({ msg: '  ' }))).reason, 'err_chat_edit_length');
    assert.equal((await auth.service.edit(socket('alice'), payload({ msg: 'x'.repeat(551) }))).reason, 'err_chat_edit_length');
    assert.equal((await auth.service.edit(socket('alice'), payload({ msg: 'banned' }))).reason, 'err_chat_edit_profanity');
    const banned = fixture({ canEdit: async () => 'err_chat_suspended' });
    assert.equal((await banned.service.edit(socket('alice'), payload())).reason, 'err_chat_suspended');
    assert.equal((await banned.service.remove(socket('alice'), payload())).ok, true, 'A restricted user may still remove their own message');
    const limited = fixture({ checkRate: () => false });
    assert.equal((await limited.service.edit(socket('alice'), payload())).reason, 'err_chat_slow_down');
    const changedIdentity = fixture({ canEdit: async socket => { socket.verifiedUid = 'bob'; return ''; } });
    assert.equal((await changedIdentity.service.edit(socket('alice'), payload())).reason, 'err_chat_auth_required');
    assert.equal(changedIdentity.writes.length, 0, 'Changing accounts during authorization cannot edit the old account message');
    const system = fixture(); system.history[0].senderUid = '';
    assert.equal((await system.service.remove(socket('alice'), payload())).reason, 'err_chat_not_owner');

    const good = fixture();
    const changed = await good.service.edit(socket('alice'), payload({ msg: '  Updated\n text  ' }));
    assert.equal(changed.ok, true);
    assert.equal(good.history[0].msg, 'Updated text');
    assert.equal(good.history[0].id, 'one');
    assert.equal(good.history[0].createdAt, 100, 'Editing never turns the message into a newly-created message');
    assert.equal(good.history[0].revision, 1);
    assert.equal(good.history[0].editedAt, 1234);
    assert.equal(good.events[0].event, 'global_chat_msg_updated');
    assert.equal((await good.service.edit(socket('alice'), payload())).reason, 'err_chat_message_changed');
    assert.equal((await good.service.edit(socket('alice'), payload({ revision: 1, msg: 'Updated text' }))).ok, true);
    assert.equal(good.writes.length, 1, 'An unchanged save does not write or emit another update');
    assert.equal((await good.service.remove(socket('alice'), payload({ revision: 1 }))).ok, true);
    assert.equal(good.history.length, 0);
    assert.equal(good.events[1].event, 'global_chat_msg_deleted');
    assert(!('msg' in good.events[1].data), 'Deletion events do not republish the deleted text');
    assert.equal((await good.service.remove(socket('alice'), payload({ revision: 1 }))).reason, 'err_chat_message_missing');

    for (const persist of [async () => false, async () => { throw new Error('database unavailable'); }]) {
        const failed = fixture({ persist });
        assert.equal((await failed.service.edit(socket('alice'), payload())).reason, 'err_chat_save_failed');
        assert.equal(failed.history[0].msg, 'Original');
        assert.equal((await failed.service.remove(socket('alice'), payload())).reason, 'err_chat_save_failed');
        assert.equal(failed.history.length, 1);
        assert.equal(failed.events.length, 0, 'No speculative broadcast before durable success');
    }
    const concurrent = fixture();
    const results = await Promise.all([concurrent.service.edit(socket('alice'), payload()), concurrent.service.edit(socket('alice'), payload({ msg: 'A stale second device' }))]);
    assert.equal(results.filter(result => result.ok).length, 1);
    assert.equal(results.find(result => !result.ok).reason, 'err_chat_message_changed');
    let release;
    const reset = fixture({ persist: () => new Promise(resolve => { release = resolve; }) });
    const pending = reset.service.edit(socket('alice'), payload());
    while (!release) await new Promise(resolve => setImmediate(resolve));
    reset.reset();
    release(true);
    assert.equal((await pending).reason, 'err_chat_message_missing');
    assert.equal(reset.history.length, 0, 'Weekly reset during a write cannot resurrect a message');
    assert.equal(reset.events.length, 0);

    const queries = [];
    const model = { updateOne: async (query, update) => { queries.push({ query, update }); return { matchedCount: 1 }; } };
    const edit = { operation: 'edit', id: 'one', uid: 'alice', expectedRevision: 0, message: { msg: 'New', editedAt: 1234, revision: 1 } };
    assert(await persistGlobalChatMutation(model, edit));
    assert.deepEqual(queries[0].query.messages.$elemMatch, { id: 'one', senderUid: 'alice', $or: [{ revision: 0 }, { revision: { $exists: false } }] });
    assert.deepEqual(queries[0].update.$set, { 'messages.$.msg': 'New', 'messages.$.editedAt': 1234, 'messages.$.revision': 1 });
    assert(await persistGlobalChatMutation(model, { ...edit, operation: 'delete', expectedRevision: 1 }));
    assert.equal(queries[1].query.messages.$elemMatch.revision, 1);
    assert.deepEqual(queries[1].update, { $pull: { messages: { id: 'one', senderUid: 'alice' } } });
    assert.equal(await persistGlobalChatMutation({ updateOne: async () => ({ matchedCount: 0 }) }, edit), false);
    console.log('Global Chat mutations: verified ownership, legacy/system messages, validation/moderation, durable owner-scoped writes, stale revisions, concurrency, reset and failed persistence passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
