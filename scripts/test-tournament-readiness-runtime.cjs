'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const core = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const notifications = require('../www/tournamentNotificationsCore');
const audit = require('../lib/tournament-match-audit');
const adjudication = require('../www/tournamentAdjudicationCore');
const reliability = require('../www/tournamentReliabilityCore');
const { createAccountDeletion } = require('../lib/account-deletion');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8').replace(/\r\n/g, '\n');

function actual(name) {
    const start = source.search(new RegExp('(?:async )?function ' + name + '\\('));
    assert(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

function socketHandler(event, context) {
    const start = source.indexOf("    socket.on('" + event + "',");
    assert(start >= 0, event);
    vm.runInContext(source.slice(start, source.indexOf('\n    });', start) + 8), context);
}

async function main() {
    const flagStart = source.indexOf('const TOURNAMENT_READINESS_ENABLED =');
    const flagEnd = source.indexOf('\nlet analyticsGoogleAuth', flagStart);
    for (const environment of ['production', 'staging']) {
        for (const enabled of ['', 'false', 'true']) {
            for (const approved of ['', 'false', 'true']) {
                const flags = vm.createContext({ process: { env: { TOURNAMENT_READINESS_ENABLED: enabled,
                    TOURNAMENT_ROLLOUT_APPROVED: approved } }, SERVER_RUNTIME: { environment } });
                vm.runInContext(source.slice(flagStart, flagEnd) + '\nglobalThis.enabled = TOURNAMENT_READINESS_ENABLED;', flags);
                assert.equal(flags.enabled, enabled === 'true' && (environment !== 'production' || approved === 'true'));
                let status;
                const health = vm.createContext({ SERVER_RUNTIME: { environment, instanceId: '' },
                    MAINTENANCE_MODE: false, TOURNAMENT_READINESS_ENABLED: flags.enabled,
                    app: { get: (_route, handler) => handler({}, { setHeader() {}, status: () => ({ json: value => { status = value; } }) }) } });
                const healthStart = source.indexOf("app.get('/healthz',");
                vm.runInContext(source.slice(healthStart, source.indexOf('\n});', healthStart) + 4), health);
                assert.equal(status.tournamentReadinessEnabled, flags.enabled);
            }
        }
    }
    const events = [], commands = [], handlers = new Map();
    let authenticated = true;
    const initial = { status: 'confirmation', players: [], tournamentNumber: 11,
        readinessPolicyVersion: core.VERSION, registrationCycleId: 'verified-current-cycle-id', readinessRevision: 0 };
    const socket = { playerName: 'Verified name', photoUrl: '',
        emit: (...args) => events.push(args), on: (name, handler) => handlers.set(name, handler) };
    const context = vm.createContext({ socket, Date, console, crypto,
        tournamentReadinessCore: core, tournamentSchedulingCore: scheduling, tournamentNotificationsCore: notifications, tournamentAudit: audit,
        tournamentAdjudicationCore: adjudication, tournamentReliability: reliability,
        tournamentState: initial, tournamentStateInitialized: true,
        TOURNAMENT_READINESS_ENABLED: false, TOURNEY_PARTICIPATION_RULES_VERSION: '2026-10-23',
        requireTournamentAuth: () => authenticated ? 'verified-user' : null,
        safeTournamentNumber: value => Number(value),
        sanitizeTournamentName: value => value, sanitizeTournamentPhotoUrl: value => value,
        calculateTournamentPi: async () => '1000',
        runTournamentReadinessCommand: async (command, input) => {
            commands.push({ command, input });
            return { ok: true, users: [] };
        },
        getTournamentReadinessStore: () => ({ acknowledge: async (uid, noticeId) => commands.push({ command: 'ack', input: { uid, noticeId } }) }),
        MONGO_URI: 'synthetic-do-not-connect',
        rejectTournamentAction: (_socket, reason) => events.push(['rejected', reason]),
        isTournamentAdmin: () => true
    });
    for (const event of ['tourney_register', 'tourney_unregister', 'tourney_readiness_confirm', 'tourney_notice_read', 'tourney_reset']) {
        socketHandler(event, context);
    }
    authenticated = false;
    await handlers.get('tourney_register')({});
    await handlers.get('tourney_unregister')({});
    await handlers.get('tourney_readiness_confirm')({});
    assert.equal(commands.length, 0, 'unauthenticated clients cannot mutate readiness or money');
    authenticated = true;
    context.tournamentStateInitialized = false;
    await handlers.get('tourney_register')({ tournamentRulesAccepted: true, tournamentRulesVersion: '2026-10-23' });
    assert.equal(commands.length, 0, 'startup must load durable tournament before accepting payments');
    context.tournamentStateInitialized = true;
    await handlers.get('tourney_register')({ tournamentRulesAccepted: false });
    assert.equal(commands.length, 0, 'rules must be accepted before the registration command');
    await handlers.get('tourney_register')({
        tournamentRulesAccepted: true, tournamentRulesVersion: '2026-10-23',
        readinessPolicyVersion: core.VERSION, readinessPolicyAccepted: true,
        cycleId: initial.registrationCycleId, entryRequestId: 'request-from-client-unique',
        id: 'forged-other-player', name: 'Forged name'
    });
    assert.equal(commands[0].command, 'register');
    assert.equal(commands[0].input.uid, 'verified-user', 'registration identity comes only from verified socket');
    assert.equal(commands[0].input.player.name, 'Verified name');
    await handlers.get('tourney_readiness_confirm')({ uid: 'forged-other-player', cycleId: initial.registrationCycleId, entryId: 'entry-1' });
    assert.equal(commands[1].input.uid, 'verified-user', 'confirmation identity is verified');
    await handlers.get('tourney_unregister')({ uid: 'forged-other-player', cycleId: initial.registrationCycleId, entryId: 'entry-1' });
    assert.equal(commands[2].input.uid, 'verified-user', 'refund identity is verified');
    await handlers.get('tourney_notice_read')({ noticeId: { $ne: null } });
    assert.equal(commands.length, 3, 'notice query injection blocked');
    await handlers.get('tourney_notice_read')({ noticeId: 'own-notice' });
    assert.equal(commands[3].input.uid, 'verified-user', 'inbox acknowledgement is account scoped');
    context.tournamentState.players.push({ id: 'paid-participant' });
    await handlers.get('tourney_reset')();
    assert(events.some(event => event[0] === 'rejected' && event[1] === 'tourney_readiness_reset_blocked'), 'admin reset cannot lose pending fees');

    vm.runInContext(actual('createFreshTournamentState'), context);
    assert.equal(context.createFreshTournamentState(12).readinessPolicyVersion, '', 'rollout is off by default');
    context.TOURNAMENT_READINESS_ENABLED = true;
    const future = context.createFreshTournamentState(12);
    assert.equal(future.readinessPolicyVersion, core.VERSION, 'only newly created cycle enables policy');
    assert.equal(future.schedulingPolicyVersion, scheduling.VERSION);
    assert.equal(future.notificationPolicyVersion, notifications.VERSION);
    assert.equal(future.auditPolicyVersion, audit.VERSION);
    assert.equal(future.adjudicationPolicyVersion, adjudication.VERSION);
    assert.equal(future.reliabilityPolicyVersion, reliability.VERSION);
    assert.equal(future.players.length, 0);
    assert.equal(initial.registrationCycleId, 'verified-current-cycle-id', 'no rewrite of existing cycle');

    const synchronized = [], commits = [];
    let calls = 0;
    const runContext = vm.createContext({ console, Date, Map, Promise,
        MONGO_URI: 'synthetic-do-not-connect', mongoose: { connection: { readyState: 1 }, model: () => ({ init: async () => {} }) },
        tournamentReadinessQueue: Promise.resolve(), tournamentState: initial,
        tournamentReadinessService: { execute: async (_command, input) => {
            calls += 1;
            if (input.fail) throw new Error('simulated_commit_failure');
            const state = { ...initial, readinessRevision: calls };
            commits.push(calls);
            return { ok: true, changed: true, state, users: [{ firebaseUid: 'verified-user', balance: 94500 }] };
        } },
        emitTournamentStateUpdate: () => synchronized.push('state'),
        emitProfileSyncToUid: (uid, user) => synchronized.push([uid, user.balance])
    });
    vm.runInContext(actual('runTournamentReadinessCommand'), runContext);
    await assert.rejects(runContext.runTournamentReadinessCommand('register', { fail: true }), /simulated_commit_failure/);
    assert.equal(synchronized.length, 0, 'failed commit never publishes debit/state');
    await runContext.runTournamentReadinessCommand('register', {});
    assert.equal(commits.length, 1, 'serialized command queue recovers after failure');
    assert.equal(runContext.tournamentState.readinessRevision, 2, 'runtime changes only after commit');
    assert.equal(synchronized.length, 2, 'state and authoritative profile published after commit');

    const deleted = [];
    const privacy = createAccountDeletion({ enabled: true,
        getModels: () => new Proxy({}, { get: (_target, name) => ({ collection: { name } }) }),
        getDb: () => ({ collection: name => ({
            find: () => ({ toArray: async () => [], async *[Symbol.asyncIterator]() {} }),
            deleteMany: async query => deleted.push({ name, query }), updateMany: async () => {}
        }) }), getAuth: () => null, monitorId: uid => uid });
    await privacy.scrubData('verified-user');
    for (const name of ['TournamentEntry', 'TournamentNotice']) {
        assert(deleted.some(call => call.name === name && call.query.uid === 'verified-user'),
            name + ' must be removed when its owner deletes the account');
    }
    console.log('PASS: actual Socket.IO readiness handlers, verified identity, safe admin reset, feature gating and commit-before-publish queue.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
