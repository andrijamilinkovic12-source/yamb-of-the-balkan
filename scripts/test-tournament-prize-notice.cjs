const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const game = read('www/game.js');
const server = read('server.js');
const appSource = game.slice(0, game.indexOf('window.app = new YambApp()'));
const uid = 'verified-tournament-account';
const otherUid = 'another-tournament-account';
const notice = (id, matchId, role = 'winner') => ({
    id: id.repeat(64), matchId, role, recipientUid: uid, reward: role === 'winner' ? 44000 : 5500
});

function client(storage = new Map()) {
    const sent = [];
    const dialogs = [];
    let screen = 'game-scene';
    let time = 10000;
    let ceremonyOverlay;
    let clickNext;
    let blockingDialog = false;
    const next = { disabled: true, classList: { add() {} }, addEventListener: (_event, listener) => { clickNext = listener; } };
    const document = {
        hidden: false,
        createElement: () => ({ setAttribute() {}, querySelector: () => next, classList: { add() {} },
            remove() { ceremonyOverlay = null; } }),
        body: { appendChild: node => { ceremonyOverlay = node; } },
        getElementById(id) {
            if (id === 'main-menu') return { classList: { contains: () => screen === 'main-menu' } };
            if (id === 'tournament-final-ceremony') return ceremonyOverlay;
            if (id === 'custom-modal-overlay' && blockingDialog) return { style: { display: 'flex' } };
            return null;
        }
    };
    storage.set('yamb_uid', uid);
    const timers = new Map();
    let timerSequence = 0;
    const setTimer = (callback, delay) => {
        const id = ++timerSequence;
        timers.set(id, { callback, delay });
        return id;
    };
    const prototype = vm.runInNewContext(`${appSource}\nYambApp.prototype`, {
        window: {}, document,
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        Date: class extends Date { static now() { return time; } },
        t: key => key, dukatIconHtml: () => '', getTournamentFinalistSource: () => 'silver.png',
        getThemeMedalSource: () => 'silver.png',
        setTimeout: setTimer, clearTimeout: id => timers.delete(id),
        setInterval: setTimer, clearInterval: id => timers.delete(id),
        requestAnimationFrame: callback => callback()
    });
    const app = Object.create(prototype);
    Object.assign(app, {
        pendingTournamentPrizes: new Map(),
        socketVerifiedUid: uid,
        socket: { connected: true, emit: (event, data) => sent.push([event, data.id]) },
        modal: { alert: (_message, _title, { contextClass }) => {
            dialogs.push(contextClass);
            return new Promise(resolve => { app.confirm = resolve; });
        } }
    });
    return {
        app, sent, dialogs, storage, document, next,
        setScreen: value => { screen = value; },
        blockModal: value => { blockingDialog = value; },
        clickNext: () => { clickNext(); },
        runTimer(delay) {
            const found = [...timers].find(([, timer]) => timer.delay === delay);
            assert.ok(found, `missing timer ${delay}`);
            const [id, timer] = found;
            timers.delete(id);
            time += delay;
            timer.callback();
        }
    };
}

async function main() {
    const early = notice('a', 'final-1');
    const active = client();
    active.app.gameActive = true;
    active.app.queueTournamentPrizeNotice(early);
    await active.app.showPendingTournamentPrizeNotice();
    assert.equal(active.dialogs.length, 0);
    const ceremony = active.app.showTournamentFinalCeremony({ ...early, myScore: 2687 });
    active.clickNext();
    assert.equal(active.sent.length, 0, 'disabled continue cannot acknowledge');
    active.runTimer(6000);
    active.setScreen('main-menu');
    active.app.gameActive = false;
    await active.app.showPendingTournamentPrizeNotice();
    assert.equal(active.dialogs.length, 0, 'ceremony wins over the short notice');
    active.clickNext();
    active.runTimer(260);
    await ceremony;
    assert.deepEqual(active.sent, [['tourney_prize_notice_read', early.id]]);

    const replay = client(active.storage);
    replay.setScreen('main-menu');
    replay.app.queueTournamentPrizeNotice(early);
    await replay.app.showPendingTournamentPrizeNotice();
    assert.equal(replay.dialogs.length, 0, 'reconnect retries a lost acknowledgement without another dialog');
    assert.deepEqual(replay.sent, [['tourney_prize_notice_read', early.id]]);

    const later = notice('b', 'final-2', 'runnerup');
    const offline = client();
    offline.setScreen('main-menu');
    offline.document.hidden = true;
    offline.app.queueTournamentPrizeNotice(later);
    offline.app.queueTournamentPrizeNotice({ ...notice('c', 'final-3'), recipientUid: otherUid });
    await offline.app.showPendingTournamentPrizeNotice();
    assert.equal(offline.dialogs.length, 0);
    offline.document.hidden = false;
    offline.blockModal(true);
    await offline.app.showPendingTournamentPrizeNotice();
    assert.equal(offline.dialogs.length, 0);
    offline.blockModal(false);
    const shown = offline.app.showPendingTournamentPrizeNotice();
    assert.deepEqual(offline.dialogs, ['tourney-finalist']);
    assert.equal(offline.sent.length, 0);
    offline.app.confirm(true);
    await shown;
    assert.deepEqual(offline.sent, [['tourney_prize_notice_read', later.id]]);

    const late = client();
    const lateCeremony = late.app.showTournamentFinalCeremony({ ...later, myScore: 2620 });
    late.runTimer(6000);
    late.clickNext();
    late.runTimer(260);
    await lateCeremony;
    late.setScreen('main-menu');
    late.app.queueTournamentPrizeNotice(later);
    await late.app.showPendingTournamentPrizeNotice();
    assert.equal(late.dialogs.length, 0);
    assert.deepEqual(late.sent, [['tourney_prize_notice_read', later.id]]);

    const builders = server.slice(server.indexOf('function buildTournamentPrizeNotice('), server.indexOf('async function debitTournamentEntryFee('));
    const delivery = [];
    const socket = { connected: true, verifiedUid: uid, emit: (...args) => delivery.push(args) };
    const database = {
        findOne(filter) {
            assert.equal(filter.firebaseUid, uid);
            return { select: () => ({ lean: async () => ({ pendingTournamentPrizes: [later] }) }) };
        }
    };
    const { buildTournamentPrizeNotice, emitTournamentPrizeToUid, emitPendingTournamentPrizes } = vm.runInNewContext(
        `${builders}\n({ buildTournamentPrizeNotice, emitTournamentPrizeToUid, emitPendingTournamentPrizes })`,
        { crypto, MONGO_URI: 'local-fixture', UserProfile: database, getVerifiedUid: socket => socket.verifiedUid,
            onlinePlayers: { [uid]: 'socket-1', [otherUid]: 'socket-1' },
            io: { sockets: { sockets: new Map([['socket-1', socket]]) } } });
    const built = buildTournamentPrizeNotice({ tournamentNumber: 9 }, {
        winnerId: uid, resultRecordedAt: 1234, resultType: 'regular', lastResolvedGameId: early.matchId
    }, 'winner', 44000);
    assert.equal(built.matchId, early.matchId);
    assert.match(built.id, /^[a-f0-9]{64}$/);
    emitTournamentPrizeToUid(otherUid, built);
    assert.equal(delivery.length, 0);
    emitTournamentPrizeToUid(uid, built);
    await emitPendingTournamentPrizes(socket);
    assert.deepEqual(delivery.map(([event, payload]) => [event, payload.recipientUid]), [
        ['tourney_prize_awarded', uid], ['tourney_pending_prizes', uid]
    ]);

    console.log('Tournament prize notices: early/late events, acknowledgement, reconnect, offline dialog, other account and modal overlap verified.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
