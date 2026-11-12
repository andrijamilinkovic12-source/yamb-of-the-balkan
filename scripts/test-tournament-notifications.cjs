'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scheduling = require('../www/tournamentSchedulingCore');
const core = require('../www/tournamentNotificationsCore');
const date = value => Date.parse(value);
const at = value => date('2026-11-' + value + ':00+01:00');
const cycleId = 'fixture-cycle';
let sequence = 0;
const id = () => 'fixture-' + ++sequence;

function fixture(start = at('11T09:00'), round = 'qf') {
    const match = { p1: { id: 'a', name: 'Player A' }, p2: { id: 'b', name: 'Player B' } };
    scheduling.open(match, round, start, id());
    const state = { schedulingPolicyVersion: scheduling.VERSION, notificationPolicyVersion: core.VERSION,
        registrationCycleId: cycleId, tournamentNumber: 15, status: 'active', players: [match.p1, match.p2], bracket: { [round]: [match] } };
    const apply = (command, uid, now, proposedTime) => {
        const s = match.scheduling;
        assert(scheduling.apply(match, command, { scheduleId: s.id, revision: s.revision,
            uid, proposedTime, proposalId: s.pending?.id }, now, id).ok);
    };
    return { match, state, round, apply, at: (now, busy) => core.collect(state, now, busy) };
}

function business() {
    const f = fixture();
    const to = (kind, time, target = f) => target.at(time).filter(n => n.kind === kind).map(n => n.uid);
    const kinds = (time, target = f) => target.at(time).map(n => n.kind);
    assert.deepEqual(core.collect({ ...f.state, notificationPolicyVersion: '' }, at('11T10:00')), []);
    assert.deepEqual(to('match_opened', at('11T09:00')), ['a', 'b']);
    for (const time of ['11T10:00', '11T19:00', '12T10:29', '12T19:00']) {
        assert.deepEqual(to('match_daily_propose', at(time)), ['a', 'b'], time);
    }
    for (const time of ['11T09:59', '11T10:30', '11T18:59', '11T19:30', '11T22:00']) {
        assert.deepEqual(to('match_daily_propose', at(time)), [], time);
    }
    assert.deepEqual(to('match_deadline', f.match.scheduling.deadlineAt), ['a', 'b']);
    assert.deepEqual(f.at(f.match.scheduling.deadlineAt, () => true), [], 'in-progress game gets no deadline notice');

    f.apply('propose', 'a', at('11T09:00'), '2026-11-12T22:40');
    const firstProposal = f.at(at('11T09:00')).find(n => n.kind === 'match_proposed');
    assert.equal(firstProposal.uid, 'b');
    assert.deepEqual(to('match_daily_reply', at('11T10:00')), ['b']);
    assert.deepEqual(to('match_daily_propose', at('11T10:00')), []);
    f.apply('propose', 'b', at('11T10:00'), '2026-11-12T23:00');
    assert(!core.isCurrent(f.state, firstProposal, at('11T10:00')));
    assert.deepEqual(to('match_proposed', at('11T10:00')), ['a']);
    assert.deepEqual(to('match_daily_reply', at('11T10:00')), [], 'do not double-notify during the same slot');
    f.apply('accept', 'a', at('11T10:00'));
    assert.deepEqual(to('match_confirmed', at('11T10:00')), ['a', 'b']);
    assert.deepEqual(to('match_reminder_30', at('12T22:29')), []);
    assert.deepEqual(to('match_reminder_30', at('12T22:30')), ['a', 'b']);
    assert(f.at(at('12T22:30')).every(n => n.nightAllowed));
    assert.deepEqual(kinds(at('12T22:55')), ['match_reminder_5', 'match_reminder_5']);
    assert.deepEqual(kinds(at('12T23:00')), []);
    assert.deepEqual(core.duelRequest(f.state, 'qf', 0, 'b', at('11T14:00')).map(n => n.uid), ['a']);
    assert.deepEqual(core.duelRequest(f.state, 'qf', 0, 'not-a-player', at('11T14:00')), []);
    assert.deepEqual(core.duelRequest(f.state, 'qf', 0, 'b', at('12T22:40')), [], 'manual push does not have a night exception');

    const morning = fixture();
    morning.apply('propose', 'a', at('11T10:00'), '2026-11-12T09:10');
    morning.apply('accept', 'b', at('11T10:01'));
    assert.deepEqual(kinds(at('12T08:45'), morning), [], 'morning appointment does not exempt night quiet hours');
    assert.deepEqual(to('match_reminder_30', at('12T09:00'), morning), ['a', 'b']);
    assert.deepEqual(to('match_daily_play', at('12T10:00'), morning), ['a', 'b']);
    const short = fixture();
    short.apply('propose', 'a', at('11T09:00'), '2026-11-11T09:20');
    short.apply('accept', 'b', at('11T09:01'));
    assert.deepEqual(kinds(at('11T09:01'), short), ['match_confirmed', 'match_confirmed'], 'short notice confirmation replaces redundant 30-minute notice');
    assert.deepEqual(kinds(at('11T09:15'), short), ['match_reminder_5', 'match_reminder_5']);

    const late = fixture(at('11T23:00'));
    assert.deepEqual(kinds(at('11T23:30'), late), []);
    assert.deepEqual(to('match_opened', at('12T09:00'), late), ['a', 'b']);
    const summer = fixture(date('2027-03-27T20:00:00+01:00'));
    assert.deepEqual(to('match_daily_propose', date('2027-03-28T10:00:00+02:00'), summer), ['a', 'b'], 'local slot after DST transition');

    const replay = fixture();
    const original = replay.at(at('11T09:00'))[0];
    scheduling.open(replay.match, 'qf', at('11T11:00'), id());
    replay.match.rematchRequired = true;
    assert(!core.isCurrent(replay.state, original, at('11T11:00')));
    assert.deepEqual(to('match_replay_draw', at('11T11:00'), replay), ['a', 'b']);
    replay.match.replayReason = 'mutual_disconnect';
    assert.deepEqual(to('match_replay_network', at('11T11:00'), replay), ['a', 'b']);
    Object.assign(replay.match, { winnerId: 'a', resultRecordedAt: at('11T23:00'), resultType: 'technical', scoreLabel: '1-0 TP' });
    replay.state.status = 'finished';
    assert.deepEqual(kinds(at('11T23:30'), replay), []);
    const result = replay.at(at('12T09:00'));
    assert.deepEqual(result.map(n => [n.uid, n.won]), [['a', true], ['b', false]]);
    assert(result.every(n => n.kind === 'match_result' && n.scoreLabel === '1-0 TP'));
    assert.equal(core.copy(result[0], 'en').title, 'Quarterfinal: Match won');
    assert.equal(core.copy(result[0], 'sr').title, 'Četvrtfinale: Pobeda');
    replay.match.p2.id = 'deleted_fixture';
    assert.deepEqual(to('match_result', at('12T09:00'), replay), ['a']);
}

async function client() {
    const f = fixture();
    const time = at('11T09:15');
    f.apply('propose', 'b', time, '2026-11-12T15:00');
    const row = f.at(time)[0];
    const notice = { ...row, noticeId: 'tm:fixture', recipientUid: row.uid };
    delete notice.uid;
    const local = new Map();
    const emits = [], shown = [], navigation = [];
    let confirm;
    const context = vm.createContext({ window: { tournamentNotificationsCore: core },
        localStorage: { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value) },
        document: { getElementById: () => null }, setTimeout: () => 1, console });
    const source = fs.readFileSync(require.resolve('../www/turnir.js'), 'utf8');
    vm.runInContext(source + '\nglobalThis.Manager = TournamentManager;', context);
    const manager = Object.create(context.Manager.prototype);
    manager.app = { playerId: 'a', socket: { connected: true, emit: (...args) => emits.push(args) },
        modal: { confirm: (_body, options) => { shown.push(options); return new Promise(resolve => { confirm = resolve; }); } } };
    manager.state = f.state;
    manager.readinessTimeBase = {};
    manager.tournamentNow = () => time;
    manager.open = options => navigation.push(options.skipIntro);
    manager.openMatchModal = (round, index) => navigation.push([round, index]);
    await manager.maybeShowReadinessNotice({ ...notice, recipientUid: 'b' });
    assert.equal(shown.length, 0, 'other account notice cannot pop');
    manager.app.gameActive = true;
    await manager.maybeShowReadinessNotice(notice);
    manager.openTournamentNotice(notice);
    assert.equal(shown.length, 0, 'notifications never interrupt an active game');
    assert.equal(emits.length, 0, 'push taps cannot leave an active game');
    manager.app.gameActive = false;
    const showing = manager.maybeShowReadinessNotice();
    await manager.maybeShowReadinessNotice(notice);
    assert.equal(shown.length, 1, 'in-app and push fetch share one prompt');
    assert.equal(shown[0].contextClass, 'tournament');
    confirm(true);
    await showing;
    assert.deepEqual(emits.map(event => event[0]), ['tourney_get_state', 'tourney_notice_read']);
    assert.equal(navigation.length, 0, 'wait for fresh state before navigation');
    manager.applyTournamentNoticeNavigation();
    assert.deepEqual(navigation, [true, ['qf', 0]]);
    await manager.maybeShowReadinessNotice(notice);
    assert.equal(shown.length, 1, 'acknowledged notice does not repeat');

    f.apply('accept', 'a', time);
    manager.openTournamentNotice({ ...notice, index: '0', expiresAt: String(notice.expiresAt) });
    manager.applyTournamentNoticeNavigation();
    assert.equal(navigation.length, 2, 'stale push for an accepted proposal cannot open a match');
    manager.openTournamentNotice({ ...notice, recipientUid: 'b' });
    assert.equal(manager.pendingNoticeNavigation, null);
}

async function channels() {
    const source = file => fs.readFileSync(require.resolve(file), 'utf8').replace(/\r\n/g, '\n');
    const actual = (file, name, indent = '') => {
        const start = file.search(new RegExp('(?:async )?function ' + name + '\\('));
        assert(start >= 0, name);
        return file.slice(start, file.indexOf('\n' + indent + '}', start) + indent.length + 2);
    };
    const f = fixture();
    const time = at('11T09:00');
    const row = f.at(time)[0];
    const notice = { ...row, noticeId: 'tm:fixture', recipientUid: row.uid };
    const sent = [], socket = [], timers = [];
    let now = time;
    const server = vm.createContext({ Date: { now: () => now }, tournamentNotificationsCore: core,
        tournamentReadinessCore: require('../www/tournamentReadinessCore'), tournamentState: f.state,
        isTournamentMatchInPlay: () => false, PUSH_NOTIFICATION_CHANNEL_ID: 'tournament_notifications',
        stringifyPushData: payload => payload, buildLocalizedPushContent: (title, body) => ({ title, body }),
        tournamentReminderCheckInProgress: false, checkUpcomingTournamentMatchReminders: async () => sent.push('legacy-reminder'),
        getTournamentAttentionReminderSlot: () => null });
    const serverCode = source('../server.js');
    for (const fn of ['buildTournamentMatchPush', 'buildPushMessage', 'checkTournamentMatchReminders']) vm.runInContext(actual(serverCode, fn), server);
    const push = server.buildTournamentMatchPush(notice);
    assert.equal(push.data.recipientUid, 'a');
    assert.equal(push.data.scheduleId, row.scheduleId);
    assert.equal(push.data.expiresAt, row.expiresAt, 'deep-link validity is not the transport TTL');
    assert.equal(push.expiresAt, at('11T22:00'), 'ordinary FCM cannot queue past quiet hours');
    assert.equal(server.buildPushMessage(push, ['fixture-token']).android.ttl, at('11T22:00') - now);
    assert(push.isCurrent());
    f.apply('propose', 'a', time, '2026-11-12T23:00');
    assert(!push.isCurrent(), 'revalidate after token query before sending');
    await server.checkTournamentMatchReminders();
    assert.equal(sent.length, 0, 'legacy job skips the new policy');
    f.state.notificationPolicyVersion = '';
    server.Date = Date;
    await server.checkTournamentMatchReminders();
    assert.deepEqual(sent, ['legacy-reminder'], 'existing edition keeps its current job');

    const app = { playerId: 'a', socket: { connected: true, emit: event => socket.push(event) },
        tournamentManager: { openTournamentNotice: data => sent.push(data.noticeId) } };
    const native = vm.createContext({ window: { app }, document: { readyState: 'complete' },
        setTimeout: task => timers.push(task), claimPendingRewardBeforeNotificationNavigation: async () => true });
    const nativeCode = source('../www/pushNotifications.js');
    for (const fn of ['openTournamentFromNotification', 'showForegroundNotification']) vm.runInContext(actual(nativeCode, fn, '    '), native);
    const data = { ...push.data, scope: 'tournament' };
    native.showForegroundNotification({ data: { ...data, recipientUid: 'b' } });
    assert.equal(socket.length, 0);
    native.showForegroundNotification({ data });
    assert.deepEqual(socket, ['tourney_get_state'], 'foreground FCM refreshes the private inbox instead of showing a second popup');
    app.gameActive = true;
    native.openTournamentFromNotification(data);
    await timers.shift()();
    assert.equal(sent.length, 1);
    app.gameActive = false;
    native.openTournamentFromNotification(data);
    await timers.shift()();
    assert.deepEqual(sent, ['legacy-reminder', 'tm:fixture']);
}

(async () => {
    business();
    await client();
    await channels();
    console.log('PASS: participant-only match notifications, Belgrade slots and DST, quiet hours, night appointments, stale/deferred push navigation and results.');
})().catch(error => { console.error(error); process.exitCode = 1; });
