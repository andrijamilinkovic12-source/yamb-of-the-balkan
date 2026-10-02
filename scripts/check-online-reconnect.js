const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');
const socketClientSource = fs.readFileSync(path.join(root, 'www', 'socket.io.min.js'), 'utf8');
const tournamentSource = fs.readFileSync(path.join(root, 'www', 'turnir.js'), 'utf8');
const languagesSource = fs.readFileSync(path.join(root, 'www', 'languages.js'), 'utf8');
const monitorSource = fs.readFileSync(path.join(root, 'tools', 'online-indicator.html'), 'utf8');

function extractClassMethod(source, methodName) {
    const signature = `${methodName}(`;
    const definitionMatch = new RegExp(`^    (?:async )?${methodName}\\(`, 'm').exec(source);
    const start = definitionMatch ? definitionMatch.index + 4 : -1;
    assert(start >= 0, `Nedostaje metoda ${methodName}`);

    const signatureEnd = source.indexOf(') {', start + signature.length);
    const bodyStart = signatureEnd >= 0 ? signatureEnd + 2 : -1;
    assert(bodyStart >= 0, `Nedostaje telo metode ${methodName}`);

    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = bodyStart; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }
    throw new Error(`Nezatvoreno telo metode ${methodName}`);
}

function extractServerFunction(source, functionName) {
    let start = source.indexOf(`async function ${functionName}(`);
    if (start === -1) start = source.indexOf(`function ${functionName}(`);
    assert(start >= 0, `Nedostaje serverska funkcija ${functionName}`);
    const signatureEnd = source.indexOf(') {', start);
    const bodyStart = signatureEnd >= 0 ? signatureEnd + 2 : -1;
    assert(bodyStart >= 0, `Nedostaje telo serverske funkcije ${functionName}`);

    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = bodyStart; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}' && --depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`Nezatvoreno telo serverske funkcije ${functionName}`);
}

const classSource = [
    extractClassMethod(gameSource, 'formatReconnectGraceTime'),
    extractClassMethod(gameSource, 'clearOpponentReconnectGraceCountdown'),
    extractClassMethod(gameSource, 'showOpponentReconnectGraceCountdown')
].join('\n');

const lifecycleSandbox = {
    setTimeout,
    clearTimeout,
    Math,
    Number,
    Date,
    document: { visibilityState: 'visible' },
    window: {},
    localStorage: {
        values: new Map(),
        setItem(key, value) { this.values.set(key, String(value)); },
        getItem(key) { return this.values.get(key) || null; }
    }
};
vm.createContext(lifecycleSandbox);
vm.runInContext(`
    ${extractClassMethod(gameSource, 'handlePotentialAppPause').replace('handlePotentialAppPause(', 'function handlePotentialAppPause(')}
    ${extractClassMethod(gameSource, 'handleAppPause').replace('handleAppPause(', 'function handleAppPause(')}
    ${extractClassMethod(gameSource, 'handleAppResume').replace('handleAppResume(', 'function handleAppResume(')}
    ${extractClassMethod(gameSource, 'checkOnlineForegroundRecovery').replace('checkOnlineForegroundRecovery(', 'function checkOnlineForegroundRecovery(')}
    ${extractClassMethod(gameSource, 'emitOnlinePresencePing').replace('emitOnlinePresencePing(', 'function emitOnlinePresencePing(')}
`, lifecycleSandbox);

const sceneClasses = new Set();
const timerDisplay = { style: {}, innerHTML: '' };
const sandbox = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Number,
    Math,
    gt: () => '',
    document: {
        getElementById(id) {
            if (id === 'game-scene') {
                return {
                    classList: {
                        remove: (...names) => names.forEach(name => sceneClasses.delete(name)),
                        toggle: (name, enabled) => enabled ? sceneClasses.add(name) : sceneClasses.delete(name)
                    }
                };
            }
            if (id === 'turn-timer-display') return timerDisplay;
            return null;
        }
    }
};

vm.runInNewContext(`class ReconnectHarness {\n${classSource}\n}\nthis.ReconnectHarness = ReconnectHarness;`, sandbox);

function createHarness() {
    const instance = new sandbox.ReconnectHarness();
    instance.opponentReconnectGraceTimer = null;
    instance.opponentReconnectNoticeTimer = null;
    instance.opponentReconnectNoticeVisible = false;
    instance.opponentReconnectGraceDeadline = 0;
    instance.roomId = 'challenge-test-room';
    instance.onlineDuelType = 'challenge';
    instance.inferOnlineDuelType = () => 'challenge';
    return instance;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    assert(gameSource.includes('reconnectionAttempts: 30'));
    assert(gameSource.includes('reconnectionDelay: 250'));
    assert(gameSource.includes('reconnectionDelayMax: 1500'));
    assert(gameSource.includes('randomizationFactor: 0.25'));
    assert(gameSource.includes('noticeDelayMs: 1500'));
    assert(socketClientSource.includes('Socket.IO v4.8.3'));
    assert(socketClientSource.includes('tryAllTransports'));
    assert(indexSource.includes('socket.io.min.js?v=4.8.3'));
    assert(/game\.js\?v=\d+(?:\.\d+)*/.test(indexSource), 'index.html ne učitava verzionisani game.js');
    assert(serverSource.includes("outcome: 'mutual_disconnect'"), 'Obostrani prekid nije posebno evidentiran');
    assert(serverSource.includes("socket.on('connection_diagnostic_snapshot'"), 'Server ne prima poslednji poznati tip mreže');
    assert(gameSource.includes("this.socket.emit('connection_diagnostic_snapshot'"), 'Klijent ne šalje poslednji poznati tip mreže');
    assert(gameSource.includes("addListener('appStateChange'"), 'Capacitor lifecycle nije povezan sa grace periodom');
    assert(gameSource.includes("addEventListener('pageshow'"), 'Povratak browser stranice nije povezan sa oporavkom');
    assert(gameSource.includes('tournamentReplay'), 'Klijent ne razlikuje turnirski replay od običnog isteka sobe');
    assert(tournamentSource.includes("match.replayReason === 'mutual_disconnect'"), 'Turnirski ekran ne prikazuje mrežni replay');
    assert(languagesSource.includes('tourney_network_replay_modal'), 'Nedostaje lokalizovana poruka turnirskog mrežnog replay-a');
    assert(serverSource.includes('disconnectDiagnosticSummary'), 'Monitor nema sedmodnevni sažetak mrežnih incidenata');
    assert(monitorSource.includes('coalesceDisconnectDiagnostics'), 'Monitor ne povezuje zapise iste lifecycle epizode');
    assert(monitorSource.includes("back_to_menu: 'napuštanje partije'"), 'Monitor prikazuje interni razlog umesto jasnog konačnog ishoda');
    assert(monitorSource.includes('Dijagnostika zatvorena bez mrežne kazne'), 'Monitor i dalje meša zatvaranje dijagnostike sa ishodom partije');

    const recoveryRoutingSandbox = {
        String,
        localStorage: {
            value: '',
            getItem() { return this.value || null; }
        }
    };
    vm.createContext(recoveryRoutingSandbox);
    vm.runInContext(
        extractClassMethod(gameSource, 'isOnlineRecoveryEventRelevant').replace('isOnlineRecoveryEventRelevant(', 'function isOnlineRecoveryEventRelevant('),
        recoveryRoutingSandbox
    );
    assert.strictEqual(recoveryRoutingSandbox.isOnlineRecoveryEventRelevant.call({ gameActive: true, onlineMode: false, isSpectator: false, roomId: 'local_solo' }, 'duel_old'), false, 'Stari online recovery ne sme prekinuti lokalnu partiju');
    assert.strictEqual(recoveryRoutingSandbox.isOnlineRecoveryEventRelevant.call({ gameActive: true, onlineMode: true, isSpectator: false, roomId: 'duel_new' }, 'duel_old'), false, 'Recovery stare sobe ne sme upravljati novom online partijom');
    assert.strictEqual(recoveryRoutingSandbox.isOnlineRecoveryEventRelevant.call({ gameActive: true, onlineMode: true, isSpectator: false, roomId: 'duel_new' }, 'duel_new'), true, 'Recovery aktivne online sobe mora ostati dozvoljen');
    recoveryRoutingSandbox.localStorage.value = 'duel_saved';
    assert.strictEqual(recoveryRoutingSandbox.isOnlineRecoveryEventRelevant.call({ gameActive: false }, 'duel_saved', { requireSavedWhenInactive: true }), true, 'Sačuvana prekinuta soba mora moći da se oporavi iz menija');
    assert.strictEqual(recoveryRoutingSandbox.isOnlineRecoveryEventRelevant.call({ gameActive: false }, 'duel_old', { requireSavedWhenInactive: true }), false, 'Zakašnjeli force-cancel bez odgovarajuće sačuvane sobe mora biti ignorisan');
    assert(gameSource.includes('Ignorišem zakašnjeli timeout druge sobe'), 'Klijent ne odbacuje timeout stare sobe');
    assert(gameSource.includes('Ignorišem opponent_left iz stare/nepoznate sobe'), 'Klijent ne odbacuje završni događaj stare sobe');
    const reconnectLostEmit = serverSource.slice(serverSource.indexOf("emit('opponent_connection_lost'"), serverSource.indexOf("emit('opponent_connection_lost'") + 300);
    const timeoutEmit = serverSource.slice(serverSource.indexOf("emit('game_over_timeout'"), serverSource.indexOf("emit('game_over_timeout'") + 300);
    assert(reconnectLostEmit.includes('roomId: activeRoomId'), 'Reconnect signal nema identitet sobe');
    assert(timeoutEmit.includes('roomId,'), 'Serverski timeout nema identitet sobe');

    const incidentKeySandbox = { String };
    vm.createContext(incidentKeySandbox);
    vm.runInContext(extractServerFunction(serverSource, 'getDisconnectIncidentKey'), incidentKeySandbox);
    const incidentBase = { eventId: 'event-1', matchId: 'match-1', playerName: 'A', clientLifecycleEpisodeId: 'episode-1', outcome: 'recovered' };
    assert.strictEqual(incidentKeySandbox.getDisconnectIncidentKey(incidentBase), incidentKeySandbox.getDisconnectIncidentKey({ ...incidentBase, eventId: 'event-2' }), 'Ista lifecycle epizoda mora biti jedan incident');
    assert.notStrictEqual(incidentKeySandbox.getDisconnectIncidentKey(incidentBase), incidentKeySandbox.getDisconnectIncidentKey({ ...incidentBase, playerName: 'B' }), 'Epizode različitih igrača ne smeju biti spojene');

    const monitorSandbox = {
        Map,
        Array,
        Date,
        Number,
        outcomePriority: { pending: 0, ended_without_penalty: 1, recovered: 2, mutual_disconnect: 3, technical_result: 4 }
    };
    vm.createContext(monitorSandbox);
    vm.runInContext(extractServerFunction(monitorSource, 'coalesceDisconnectDiagnostics'), monitorSandbox);
    const coalescedIncidents = monitorSandbox.coalesceDisconnectDiagnostics([
        { incidentKey: 'lifecycle:match-1:A:episode-1', eventId: 'event-2', occurredAt: '2026-10-01T20:15:39Z', outcome: 'technical_result', subsequentSocketReason: 'transport close' },
        { incidentKey: 'lifecycle:match-1:A:episode-1', eventId: 'event-1', occurredAt: '2026-10-01T20:15:37Z', outcome: 'recovered', reconnectDurationMs: 500 },
        { incidentKey: 'lifecycle:match-1:A:episode-2', eventId: 'event-3', occurredAt: '2026-10-01T20:20:00Z', outcome: 'recovered', reconnectDurationMs: 1000 }
    ]);
    assert.strictEqual(coalescedIncidents.length, 2, 'Samo zapisi iste lifecycle epizode smeju biti objedinjeni');
    const mergedIncident = coalescedIncidents.find(item => item.incidentKey.endsWith('episode-1'));
    assert.strictEqual(mergedIncident.combinedRecords, 2);
    assert.strictEqual(mergedIncident.outcome, 'technical_result', 'Ozbiljniji konačni ishod epizode mora ostati vidljiv');
    assert.strictEqual(mergedIncident.reconnectDurationMs, 500, 'Objedinjeni incident mora sačuvati vreme kratkog povratka pre konačnog prekida');

    const duelTypeSandbox = {};
    vm.createContext(duelTypeSandbox);
    vm.runInContext(extractServerFunction(serverSource, 'getOnlineDuelType'), duelTypeSandbox);
    assert.strictEqual(duelTypeSandbox.getOnlineDuelType('room_random-test'), 'random');
    assert.strictEqual(duelTypeSandbox.getOnlineDuelType('duel_challenge-test'), 'challenge');
    assert.strictEqual(duelTypeSandbox.getOnlineDuelType('yamb-friend-test'), 'friend_invite');
    assert.strictEqual(duelTypeSandbox.getOnlineDuelType('tourney_qf_0_test'), 'tournament');

    const backgroundHandlerStart = serverSource.indexOf("socket.on('online_app_backgrounded'");
    const backgroundHandlerEnd = serverSource.indexOf("socket.on('online_presence_ping'", backgroundHandlerStart);
    const backgroundHandler = serverSource.slice(backgroundHandlerStart, backgroundHandlerEnd);
    assert(backgroundHandlerStart >= 0 && backgroundHandlerEnd > backgroundHandlerStart, 'Nedostaje serverska obrada odlaska u pozadinu');
    assert(backgroundHandler.includes('isLocalRoomId(roomId)'), 'Lokalne partije nisu isključene iz online grace toka');
    assert(!backgroundHandler.includes('isTournamentRoomId(roomId)'), 'Odlazak u pozadinu je i dalje ograničen samo na turnir');
    assert(backgroundHandler.includes("beginReconnectGraceForSocket(socket, roomId, 'app_backgrounded', '', data)"), 'Pozadina ne pokreće reconnect grace sa lifecycle metapodacima');
    assert(backgroundHandler.includes('rememberClientConnectionDiagnosticSnapshot(socket, data)'), 'Pozadina ne čuva poslednji mrežni tip');

    const pauseSignals = [];
    const potentialPauseApp = {
        handleAppPause(source, options) { pauseSignals.push({ source, nativeConfirmed: options.nativeConfirmed }); },
        scheduleAppResume() { pauseSignals.push({ source: 'premature_resume' }); }
    };
    lifecycleSandbox.window.Capacitor = { Plugins: { App: { async getState() { return { isActive: true }; } } } };
    lifecycleSandbox.handlePotentialAppPause.call(potentialPauseApp, 'document_pause');
    await wait(0);
    assert.strictEqual(pauseSignals.length, 1, 'Staro native active stanje tokom pause ne sme prerano prijaviti povratak');
    assert.strictEqual(pauseSignals[0].nativeConfirmed, false);
    lifecycleSandbox.window.Capacitor.Plugins.App.getState = async () => ({ isActive: false });
    lifecycleSandbox.handlePotentialAppPause.call(potentialPauseApp, 'visibility_hidden');
    await wait(0);
    assert.strictEqual(pauseSignals.at(-1).nativeConfirmed, true, 'Stvarno native odsustvo mora potvrditi pozadinu');

    for (const roomId of ['duel_challenge', 'yamb-friend', 'room_random', 'tourney_round']) {
        const emitted = [];
        const app = {
            appLifecyclePaused: false,
            appResumeTimer: null,
            gameActive: true,
            onlineMode: true,
            isSpectator: false,
            roomId,
            socket: {
                connected: true,
                emit(event, payload) { emitted.push({ event, payload }); }
            },
            getConnectionDiagnosticSnapshot() {
                return { onlineAtDisconnect: true, connectionType: '4g' };
            }
        };
        lifecycleSandbox.handleAppPause.call(app);
        lifecycleSandbox.handleAppPause.call(app);
        assert.strictEqual(emitted.length, 1, `${roomId} mora tačno jednom prijaviti odlazak u pozadinu`);
        assert.strictEqual(emitted[0].event, 'online_app_backgrounded');
        assert.strictEqual(emitted[0].payload.roomId, roomId);
        assert.strictEqual(emitted[0].payload.connectionType, '4g');
    }

    const resumedEvents = [];
    const resumedApp = {
        appLifecyclePaused: true,
        gameActive: true,
        onlineMode: true,
        isSpectator: false,
        roomId: 'yamb-friend',
        tournamentManager: null,
        socket: {
            connected: true,
            emit(event, payload) { resumedEvents.push({ event, payload }); }
        },
        checkForInvite() {},
        getConnectionDiagnosticSnapshot() { return { onlineAtDisconnect: true, connectionType: 'wifi' }; },
        isTournamentOnlineDuel() { return false; },
        requestOnlineStateSync(roomId) { resumedEvents.push({ event: 'state_sync', payload: { roomId } }); },
        checkSavedGame() {}
    };
    lifecycleSandbox.handleAppResume.call(resumedApp);
    assert.strictEqual(resumedApp.appLifecyclePaused, false, 'Resume mora vratiti lifecycle u aktivno stanje');
    assert(resumedEvents.some(item => item.event === 'online_app_resumed'), 'Običan duel ne prijavljuje povratak aplikacije');
    assert(resumedEvents.some(item => item.event === 'state_sync'), 'Povratak aplikacije ne traži autoritativno stanje');

    const foregroundApp = {
        ...resumedApp,
        appLifecyclePaused: true,
        handleAppResume() { lifecycleSandbox.handleAppResume.call(this); },
        emitOnlinePresencePing(force, options) { lifecycleSandbox.emitOnlinePresencePing.call(this, force, options); }
    };
    lifecycleSandbox.window.Capacitor = { Plugins: { App: { async getState() { return { isActive: false }; } } } };
    await lifecycleSandbox.checkOnlineForegroundRecovery.call(foregroundApp);
    assert.strictEqual(foregroundApp.appLifecyclePaused, true, 'Vidljiv WebView nije dovoljan dok native aplikacija nije aktivna');
    lifecycleSandbox.window.Capacitor.Plugins.App.getState = async () => ({ isActive: true });
    await lifecycleSandbox.checkOnlineForegroundRecovery.call(foregroundApp);
    assert.strictEqual(foregroundApp.appLifecyclePaused, false, 'Propušteni resume mora biti popravljen native proverom');
    assert(resumedEvents.some(item => item.event === 'online_presence_ping' && item.payload.foreground === true));
    const beforeHiddenPing = resumedEvents.length;
    lifecycleSandbox.document.visibilityState = 'hidden';
    lifecycleSandbox.emitOnlinePresencePing.call(foregroundApp, true);
    assert.strictEqual(resumedEvents.length, beforeHiddenPing, 'Pozadina ne sme slati foreground heartbeat');
    lifecycleSandbox.document.visibilityState = 'visible';
    foregroundApp.appLifecyclePaused = true;
    lifecycleSandbox.window.Capacitor.Plugins.App.getState = async () => {
        foregroundApp.appLifecycleRevision = (foregroundApp.appLifecycleRevision || 0) + 1;
        return { isActive: true };
    };
    await lifecycleSandbox.checkOnlineForegroundRecovery.call(foregroundApp);
    assert.strictEqual(foregroundApp.appLifecyclePaused, true, 'Zakašnjeli getState ne sme poništiti noviji pause');

    let delayedResume;
    const delayedApp = { ...resumedApp, appLifecyclePaused: false,
        socket: { connected: false, once(event, fn) { delayedResume = fn; } } };
    lifecycleSandbox.handleAppResume.call(delayedApp);
    delayedApp.appLifecyclePaused = true;
    delayedResume(); // Must not emit to a socket after another pause.
    delayedApp.appLifecyclePaused = false;
    delayedApp.roomId = 'duel_new';
    delayedResume(); // Must not recover a newer room using an older callback.
    delayedApp.roomId = resumedApp.roomId;
    delayedApp.appLifecycleRevision = 2;
    delayedResume(); // Same room ID can be reused, but the lifecycle generation is different.

    let localSaved = 0;
    let localPaused = 0;
    const localApp = { gameActive: true, onlineMode: false,
        pauseLocalGameClock() { localPaused++; }, autoSaveGame() { localSaved++; } };
    lifecycleSandbox.handleAppPause.call(localApp);
    assert.strictEqual(localPaused, 1);
    assert.strictEqual(localSaved, 1);
    for (const flags of [{ gameActive: false }, { isSpectator: true }]) {
        const excludedApp = { ...resumedApp, ...flags, appLifecyclePaused: false,
            socket: { connected: true, emit() { throw new Error('Menu/spectator must not start grace'); } } };
        lifecycleSandbox.handleAppPause.call(excludedApp);
    }

    // Execute the real server lifecycle handlers with deterministic timers and no database.
    const serverEvents = [];
    const callbacks = [];
    const handlers = {};
    const lifecycleMarkers = new Map();
    const lifecycleGhostSessions = {};
    const serverSandbox = {
        Date, Math, Number, String, Object, Promise,
        console: { log() {}, warn() {} },
        MONGO_URI: '', DISCONNECT_GRACE_MS: 30000, TOURNAMENT_DISCONNECT_GRACE_MS: 300000,
        LIFECYCLE_PROVISIONAL_MS: 2000, LIFECYCLE_FLAP_MERGE_MS: 5000,
        ghostSessions: lifecycleGhostSessions, disconnectTimers: {}, roomState: {}, playerRooms: {},
        recentLifecycleGraceByUid: lifecycleMarkers,
        parseTournamentRoomId: id => id.startsWith('tourney_'),
        isLocalRoomId: id => id.startsWith('local_'),
        getSocketUid: id => id === 'socket-a' ? 'uid-a' : 'uid-b',
        toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
        createDisconnectDiagnostic: () => `diag-${callbacks.length}`,
        confirmDisconnectDiagnostic(uid) {
            const ghost = lifecycleGhostSessions[uid];
            if (ghost && !ghost.diagnosticEventId) ghost.diagnosticEventId = `diag-${callbacks.length}`;
            return ghost?.diagnosticEventId || '';
        },
        updateDisconnectDiagnostic() {},
        getReconnectTurnBudgetState(roomId) {
            const graceMs = roomId.startsWith('tourney_') ? 300000 : 30000;
            return { turnKey: '0:0', graceMs, usedMs: 0, remainingMs: graceMs };
        },
        consumeReconnectTurnBudget() {},
        rememberRecentLifecycleGrace(uid, ghost) {
            lifecycleMarkers.set(uid, {
                roomId: ghost.roomId,
                startedAt: ghost.startedAt,
                deadlineAt: ghost.deadlineAt,
                recoveredAt: Date.now()
            });
        },
        pauseRoomForDisconnectGrace() {}, resumeRoomAfterDisconnectGrace() {},
        rememberClientConnectionDiagnosticSnapshot() {},
        emitAuthoritativeRoomState() {},
        io: { to: roomId => ({ emit: (event, data) => serverEvents.push({ roomId, event, data }) }) },
        setTimeout(fn, ms) { callbacks.push({ fn, ms }); return callbacks.length; },
        clearTimeout() {},
        handleDisconnectGraceTimeout() { throw new Error('Zastareli timeout se izvršio'); },
        socket: { id: 'socket-a', connected: true, on(event, fn) { handlers[event] = fn; } }
    };
    vm.createContext(serverSandbox);
    for (const name of ['isTournamentRoomId', 'getDisconnectGraceMs', 'rememberRoomPresence',
        'resolveDisconnectDiagnostic', 'clearDisconnectGraceForUid', 'clearDisconnectGraceForRoom',
        'scheduleDisconnectGraceTimeout', 'beginReconnectGraceForSocket']) {
        vm.runInContext(extractServerFunction(serverSource, name), serverSandbox);
    }
    const handlerEnd = serverSource.indexOf("socket.on('auth_firebase_token'", backgroundHandlerEnd);
    vm.runInContext(serverSource.slice(backgroundHandlerStart, handlerEnd), serverSandbox);
    const realResolver = serverSandbox.resolveDisconnectDiagnostic;
    const resolutions = [];
    serverSandbox.resolveDisconnectDiagnostic = (eventId, fields) => {
        resolutions.push({ eventId, fields });
        realResolver(eventId, fields);
    };
    for (const roomId of ['duel_challenge', 'yamb-friend', 'room_random', 'tourney_round']) {
        const recoveredBefore = resolutions.filter(item => item.fields.outcome === 'recovered').length;
        serverSandbox.playerRooms['socket-a'] = roomId;
        serverSandbox.roomState[roomId] = { players: ['socket-a', 'socket-b'] };
        handlers.online_app_backgrounded({ roomId, lifecycleSource: 'visibility_hidden' });
        const firstGhost = serverSandbox.ghostSessions['uid-a'];
        assert(firstGhost, `${roomId}: grace must start`);
        assert.strictEqual(firstGhost.diagnosticEventId, '', `${roomId}: provisional lifecycle signal ne sme odmah upisati incident`);
        const provisionalCallback = callbacks.at(-2);
        const staleGraceCallback = callbacks.at(-1).fn;
        assert.strictEqual(provisionalCallback.ms, 2000, `${roomId}: lifecycle potvrda mora sačekati 2 sekunde`);
        assert.strictEqual(callbacks.at(-1).ms, roomId.startsWith('tourney_') ? 300000 : 30000);
        handlers.online_app_backgrounded({ roomId });
        assert.strictEqual(serverSandbox.ghostSessions['uid-a'], firstGhost, 'Dupli pause ne produžava rok');
        handlers.online_presence_ping({ roomId });
        assert(serverSandbox.ghostSessions['uid-a'], 'Legacy ping ne sme poništiti background grace');
        handlers.online_presence_ping({ roomId: 'duel_old', foreground: true });
        assert(serverSandbox.ghostSessions['uid-a'], 'Stara soba ne sme oporaviti novu');
        handlers.online_presence_ping({ roomId, foreground: true });
        assert(!serverSandbox.ghostSessions['uid-a'], 'Foreground ping mora popraviti propušteni resume');
        assert.strictEqual(
            resolutions.filter(item => item.fields.outcome === 'recovered').length,
            recoveredBefore,
            'Kratak provisional prekid ne sme ostaviti recovered incident'
        );
        handlers.online_app_backgrounded({ roomId });
        const mergedGhost = serverSandbox.ghostSessions['uid-a'];
        assert.strictEqual(mergedGhost.deadlineAt, firstGhost.deadlineAt, 'Brzi lifecycle flap ne sme resetovati fiksni rok');
        callbacks.at(-2).fn();
        assert(mergedGhost.diagnosticEventId, 'Prekid duži od provisional prozora mora dobiti dijagnostički zapis');
        staleGraceCallback();
        assert(serverSandbox.ghostSessions['uid-a'], 'Stari timeout ne sme obrisati novi grace');
        handlers.online_app_resumed({ roomId });
        assert(!serverSandbox.ghostSessions['uid-a'], 'Same-socket resume mora zatvoriti grace');
        assert.strictEqual(resolutions.at(-1).fields.outcome, 'recovered');
    }
    serverSandbox.playerRooms['socket-a'] = 'duel_challenge';
    serverSandbox.roomState.duel_challenge = { players: ['socket-a', 'socket-b'] };
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    serverSandbox.ghostSessions['uid-a'].clientSnapshot = { lifecycleEpisodeId: 'episode-1', lifecycleSeq: 5 };
    handlers.online_app_resumed({ roomId: 'duel_challenge', lifecycleEpisodeId: 'episode-1', lifecycleSeq: 4 });
    assert(serverSandbox.ghostSessions['uid-a'], 'Zakašnjeli resume nižeg rednog broja ne sme poništiti noviji pause');
    handlers.online_app_resumed({ roomId: 'duel_challenge', lifecycleEpisodeId: 'episode-1', lifecycleSeq: 6 });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Noviji resume iste lifecycle epizode mora vratiti igrača');

    handlers.online_app_backgrounded({ roomId: 'duel_old' });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Zakašnjeli pause stare sobe ne sme pauzirati novu');
    serverSandbox.roomState.duel_challenge.players = ['socket-b'];
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Gledalac ne sme pokrenuti grace');
    serverSandbox.roomState.duel_challenge.players = ['socket-a', 'socket-b'];
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    serverSandbox.confirmDisconnectDiagnostic('uid-a');
    serverSandbox.clearDisconnectGraceForRoom('duel_challenge');
    assert.strictEqual(resolutions.at(-1).fields.outcome, 'ended_without_penalty');
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    serverSandbox.confirmDisconnectDiagnostic('uid-a');
    serverSandbox.resolveDisconnectDiagnostic(serverSandbox.ghostSessions['uid-a'].diagnosticEventId, { outcome: 'technical_result' });
    serverSandbox.clearDisconnectGraceForRoom('duel_challenge');
    assert.strictEqual(resolutions.at(-1).fields.outcome, 'technical_result', 'Cleanup ne sme pregaziti tehnički rezultat');
    serverSandbox.playerRooms['socket-a'] = 'local_solo';
    serverSandbox.roomState.local_solo = { players: ['socket-a'] };
    handlers.online_app_backgrounded({ roomId: 'local_solo' });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Server mora isključiti lokalne partije');

    for (const settlementFlag of ['completionSettlementPromise', 'technicalTimeoutInProgress', 'disconnectResolutionInProgress', 'menuExitInProgress']) {
        serverSandbox.playerRooms['socket-a'] = 'duel_settling';
        serverSandbox.roomState.duel_settling = { players: ['socket-a', 'socket-b'], [settlementFlag]: true };
        assert.strictEqual(
            serverSandbox.beginReconnectGraceForSocket(serverSandbox.socket, 'duel_settling', 'app_backgrounded'),
            false,
            `${settlementFlag}: konačna obrada ne sme otvoriti novi reconnect grace`
        );
        assert(!serverSandbox.ghostSessions['uid-a'], `${settlementFlag}: ne sme nastati lažna ghost sesija`);
        delete serverSandbox.roomState.duel_settling;
    }
    assert(serverSource.includes('state.technicalTimeoutInProgress || state.disconnectResolutionInProgress || state.menuExitInProgress'), 'Regularni rezultat nije zaštićen od paralelnog tehničkog ishoda');
    assert(serverSource.includes('state.completionSettlementPromise || state.disconnectResolutionInProgress || state.menuExitInProgress'), 'Timeout poteza nije zaštićen od paralelnog konačnog ishoda');
    assert(serverSource.includes('if (state) state.menuExitInProgress = true;'), 'Napuštanje menija ne zaključava konačni ishod pre asinhronog upisa');

    const settlementGuardSandbox = {
        roomState: {},
        hasCompletedOnlineDuelScores() { return true; },
        console: { log() {} }
    };
    vm.createContext(settlementGuardSandbox);
    vm.runInContext(extractServerFunction(serverSource, 'settleCompletedOnlineRoom'), settlementGuardSandbox);
    for (const settlementFlag of ['technicalTimeoutInProgress', 'disconnectResolutionInProgress', 'menuExitInProgress']) {
        settlementGuardSandbox.roomState.room = { [settlementFlag]: true };
        assert.strictEqual(
            await settlementGuardSandbox.settleCompletedOnlineRoom('room'),
            false,
            `${settlementFlag}: regularni ishod ne sme preuzeti paralelnu konačnu obradu`
        );
    }

    const technicalGuardSandbox = { roomState: {}, console: { log() {} } };
    vm.createContext(technicalGuardSandbox);
    vm.runInContext(extractServerFunction(serverSource, 'handleTechnicalTimeout'), technicalGuardSandbox);
    for (const settlementFlag of ['completionSettlementPromise', 'disconnectResolutionInProgress', 'menuExitInProgress']) {
        technicalGuardSandbox.roomState.room = { [settlementFlag]: true };
        assert.strictEqual(
            await technicalGuardSandbox.handleTechnicalTimeout('room'),
            undefined,
            `${settlementFlag}: timeout poteza mora odustati od paralelnog konačnog ishoda`
        );
    }

    const resumedTurnDurations = [];
    const budgetState = { moveCount: 7, turnIndex: 1, pausedTurnRemainingMs: 5000 };
    const budgetSandbox = {
        Date, Math, Number,
        roomState: { 'room-budget': budgetState },
        RECONNECT_RESUME_MIN_TURN_MS: 15000,
        GRACE_PERIOD: 3000,
        TOTAL_TIMEOUT: 93000,
        toSafeInt(value, fallback = 0) {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : fallback;
        },
        getDisconnectGraceMs() { return 30000; },
        hasActiveDisconnectGraceForRoom() { return false; },
        startTurnTimer(roomId, durationMs) { resumedTurnDurations.push({ roomId, durationMs }); }
    };
    vm.createContext(budgetSandbox);
    for (const name of ['getReconnectTurnKey', 'getReconnectTurnBudgetState',
        'consumeReconnectTurnBudget', 'resumeRoomAfterDisconnectGrace']) {
        vm.runInContext(extractServerFunction(serverSource, name), budgetSandbox);
    }

    const firstTurnBudget = budgetSandbox.getReconnectTurnBudgetState('room-budget', budgetState, 'uid-a');
    assert.strictEqual(firstTurnBudget.remainingMs, 30000, 'Novi potez mora dobiti puni postojeći reconnect rok');
    const budgetGhost = {
        roomId: 'room-budget',
        reconnectTurnKey: firstTurnBudget.turnKey,
        reconnectBudgetStartedAt: 1000,
        reconnectBudgetAllocatedMs: 30000
    };
    assert.strictEqual(budgetSandbox.consumeReconnectTurnBudget('uid-a', budgetGhost, 12000), 11000);
    const repeatedTurnBudget = budgetSandbox.getReconnectTurnBudgetState('room-budget', budgetState, 'uid-a');
    assert.strictEqual(repeatedTurnBudget.remainingMs, 19000, 'Ponovljeni prekid istog poteza ne sme dobiti novih 30 sekundi');
    budgetState.moveCount = 8;
    assert.strictEqual(
        budgetSandbox.getReconnectTurnBudgetState('room-budget', budgetState, 'uid-a').remainingMs,
        30000,
        'Novi potez mora resetovati reconnect budžet'
    );

    budgetState.moveCount = 9;
    budgetState.pausedTurnRemainingMs = 5000;
    budgetSandbox.resumeRoomAfterDisconnectGrace('room-budget');
    assert.strictEqual(resumedTurnDurations.at(-1).durationMs, 18000, 'Prvi oporavak poteza mora ostaviti bezbednih 15 sekundi plus serverski buffer');
    budgetState.pausedTurnRemainingMs = 5000;
    budgetSandbox.resumeRoomAfterDisconnectGrace('room-budget');
    assert.strictEqual(resumedTurnDurations.at(-1).durationMs, 5000, 'Ponovljeni oporavak istog poteza ne sme ponovo dopuniti tajmer');
    budgetState.moveCount = 10;
    budgetState.pausedTurnRemainingMs = 5000;
    budgetSandbox.resumeRoomAfterDisconnectGrace('room-budget');
    assert.strictEqual(resumedTurnDurations.at(-1).durationMs, 18000, 'Novi potez ponovo dobija jednu recovery dopunu');

    const mutualSandbox = {
        Date,
        Math,
        Number,
        Set,
        MUTUAL_DISCONNECT_WINDOW_MS: 2000,
        MUTUAL_APP_BACKGROUND_WINDOW_MS: 2500,
        ghostSessions: {},
        disconnectTimers: {},
        toSafeInt(value, fallback = 0) {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : fallback;
        },
        getDisconnectGraceMs() { return 30000; },
        isTournamentRoomId(roomId) { return String(roomId || '').startsWith('tourney_'); },
        getRoomParticipantMeta(state, socketId) {
            const index = state.players.indexOf(socketId);
            return { uid: index >= 0 ? state.playerUids[index] : '' };
        }
    };
    vm.createContext(mutualSandbox);
    vm.runInContext(extractServerFunction(serverSource, 'getMutualDisconnectGraceState'), mutualSandbox);
    const mutualState = { players: ['socket-a', 'socket-b'], playerUids: ['uid-a', 'uid-b'] };
    mutualSandbox.ghostSessions['uid-a'] = { roomId: 'room-1', oldSocketId: 'socket-a', startedAt: 1000 };
    mutualSandbox.disconnectTimers['uid-a'] = 1;
    assert.strictEqual(
        mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 31000),
        null,
        'Jedan prekid ne sme biti proglašen obostranim'
    );

    mutualSandbox.ghostSessions['uid-b'] = { roomId: 'room-1', oldSocketId: 'socket-b', startedAt: 1009 };
    mutualSandbox.disconnectTimers['uid-b'] = 2;
    const waitingForBoth = mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 31000);
    assert.strictEqual(waitingForBoth.remainingMs, 9, 'Server mora sačekati puni grace period drugog igrača');
    const mutualExpired = mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 31009);
    assert.strictEqual(mutualExpired.remainingMs, 0, 'Obostrani prekid mora dospeti po isteku oba grace perioda');
    assert.deepStrictEqual(
        Array.from(mutualExpired.entries, entry => entry.uid),
        ['uid-a', 'uid-b'],
        'Obostrani prekid mora obuhvatiti oba učesnika'
    );
    mutualSandbox.ghostSessions['uid-a'].roomId = 'tourney_qf_0_test';
    mutualSandbox.ghostSessions['uid-b'].roomId = 'tourney_qf_0_test';
    assert(
        mutualSandbox.getMutualDisconnectGraceState('tourney_qf_0_test', mutualState, 31009),
        'Obostrani turnirski prekid mora ući u bezbedan replay tok umesto dodele odsutnog pobednika'
    );
    mutualSandbox.ghostSessions['uid-a'].roomId = 'room-1';
    mutualSandbox.ghostSessions['uid-b'].roomId = 'room-1';

    mutualSandbox.ghostSessions['uid-a'].source = 'app_backgrounded';
    mutualSandbox.ghostSessions['uid-b'].source = 'app_backgrounded';
    mutualSandbox.ghostSessions['uid-b'].startedAt = 3017;
    assert(
        mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 33017),
        'Obostrana pozadina sa mrežnim kašnjenjem od 2017 ms mora biti tretirana kao zajednički prekid'
    );
    mutualSandbox.ghostSessions['uid-b'].startedAt = 3501;
    const overlappingBackground = mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 33501);
    assert(overlappingBackground, 'Preklopljeni rokovi oba odsutna igrača ne smeju dodeliti pobedu odsutnom protivniku');
    assert.strictEqual(overlappingBackground.withinClassificationWindow, false, 'Odvojene lifecycle epizode moraju ostati posebno klasifikovane');
    delete mutualSandbox.ghostSessions['uid-a'].source;
    delete mutualSandbox.ghostSessions['uid-b'].source;

    mutualSandbox.ghostSessions['uid-b'].startedAt = 3001;
    const overlappingSocketDrops = mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 33001);
    assert(overlappingSocketDrops, 'Ako su oba igrača odsutna na isteku prvog roka, server mora sačekati fiksni rok drugog');
    assert.strictEqual(overlappingSocketDrops.withinClassificationWindow, false);
    mutualSandbox.ghostSessions['uid-b'].startedAt = 1009;
    delete mutualSandbox.disconnectTimers['uid-b'];
    assert.strictEqual(
        mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 31009),
        null,
        'Povratak jednog igrača mora ostaviti samo protivnikov tehnički timeout'
    );

    const tournamentReplayMatch = {
        p1: { id: 'uid-a' },
        p2: { id: 'uid-b' },
        winnerId: null,
        timeAccepted: true,
        time: '2026-10-01T20:00:00.000Z',
        rematchRequired: false
    };
    let tournamentReplaySaves = 0;
    let tournamentReplayBroadcasts = 0;
    const tournamentReplaySandbox = {
        Date, Math, Number,
        parseTournamentRoomId(roomId) {
            return roomId.startsWith('tourney_qf_0_') ? { round: 'qf', index: 0 } : null;
        },
        getTournamentMatch() { return { match: tournamentReplayMatch, index: 0 }; },
        toSafeInt(value, fallback = 0) {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : fallback;
        },
        async saveTournamentToDb() { tournamentReplaySaves++; },
        tournamentState: { bracket: { qf: [tournamentReplayMatch], sf: [], f: [] } },
        io: { emit(event) { if (event === 'tourney_state_update') tournamentReplayBroadcasts++; } }
    };
    vm.createContext(tournamentReplaySandbox);
    vm.runInContext(extractServerFunction(serverSource, 'recordTournamentNetworkReplay'), tournamentReplaySandbox);
    assert.strictEqual(
        await tournamentReplaySandbox.recordTournamentNetworkReplay('tourney_qf_0_network-test'),
        true,
        'Turnirski mrežni prekid mora pripremiti replay'
    );
    assert.strictEqual(tournamentReplayMatch.winnerId, null, 'Replay ne sme dodeliti turnirskog pobednika');
    assert.strictEqual(tournamentReplayMatch.rematchRequired, true);
    assert.strictEqual(tournamentReplayMatch.replayReason, 'mutual_disconnect');
    assert.strictEqual(tournamentReplayMatch.timeAccepted, true, 'Dogovoreni termin ostaje važeći za ponovno pokretanje');
    assert.strictEqual(tournamentReplaySaves, 1);
    assert.strictEqual(tournamentReplayBroadcasts, 1);
    await tournamentReplaySandbox.recordTournamentNetworkReplay('tourney_qf_0_network-test');
    assert.strictEqual(tournamentReplaySaves, 1, 'Dupli timeout iste sobe ne sme duplirati turnirski replay');

    const handled = { diagnostics: [], events: [], endedRooms: [], technical: [], cleaned: [] };
    const handlerNow = Date.now();
    const handlerSandbox = {
        Date,
        Math,
        Number,
        Set,
        String,
        MUTUAL_DISCONNECT_WINDOW_MS: 2000,
        MUTUAL_APP_BACKGROUND_WINDOW_MS: 2500,
        ghostSessions: {
            'uid-a': { roomId: 'room-1', oldSocketId: 'socket-a', startedAt: handlerNow - 30010, diagnosticEventId: 'diag-a' },
            'uid-b': { roomId: 'room-1', oldSocketId: 'socket-b', startedAt: handlerNow - 30001, diagnosticEventId: 'diag-b' }
        },
        disconnectTimers: { 'uid-a': 1, 'uid-b': 2 },
        roomState: {
            'room-1': { players: ['socket-a', 'socket-b'], playerUids: ['uid-a', 'uid-b'], playerNames: ['A', 'B'], matchId: 'match-1' }
        },
        toSafeInt(value, fallback = 0) {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : fallback;
        },
        getDisconnectGraceMs() { return 30000; },
        isTournamentRoomId(roomId) { return String(roomId || '').startsWith('tourney_'); },
        getRoomParticipantMeta(state, socketId) {
            const index = state.players.indexOf(socketId);
            return {
                socketId,
                uid: index >= 0 ? state.playerUids[index] : '',
                name: index >= 0 ? state.playerNames[index] : 'Igrac'
            };
        },
        rememberEndedOnlineRoom(...args) { handled.endedRooms.push(args); },
        confirmDisconnectDiagnostic() {},
        resolveDisconnectDiagnostic(eventId, fields) { handled.diagnostics.push({ eventId, fields }); },
        playerRooms: { 'socket-a': 'room-2' },
        io: {
            sockets: { sockets: new Map([['socket-a', { connected: true }]]) },
            to() { return { emit(event, data) { handled.events.push({ event, data }); } }; }
        },
        cleanupOnlineRoom(roomId) { handled.cleaned.push(roomId); },
        scheduleDisconnectGraceTimeout() { throw new Error('Istekli obostrani prekid ne sme ponovo zakazati timeout'); },
        getDynamicPenalty() { return 50; },
        getH2HKeyForOpponent() { return 'opponent'; },
        async applyServerSideTechnicalResult(...args) {
            handled.technical.push(args);
            return { matchId: 'match-1', winnerReward: 500, loserCoinPenalty: 50, serverApplied: true };
        },
        async applyTournamentTechnicalWinner() {},
        getOnlineDuelType() { return 'challenge'; },
        ensureRoomMatchId() { return 'match-1'; },
        console: { log() {}, error() {} }
    };
    vm.createContext(handlerSandbox);
    vm.runInContext(extractServerFunction(serverSource, 'getMutualDisconnectGraceState'), handlerSandbox);
    vm.runInContext(extractServerFunction(serverSource, 'handleDisconnectGraceTimeout'), handlerSandbox);
    await handlerSandbox.handleDisconnectGraceTimeout('uid-a', 'room-1', 'socket-a');
    assert.strictEqual(handled.technical.length, 0, 'Obostrani prekid ne sme upisati tehnički rezultat');
    assert.deepStrictEqual(
        handled.diagnostics.map(item => item.fields.outcome),
        ['mutual_disconnect', 'mutual_disconnect'],
        'Oba dijagnostička zapisa moraju biti označena kao obostrani prekid'
    );
    assert.strictEqual(handled.cleaned.length, 1, 'Obostrani prekid mora tačno jednom zatvoriti sobu');

    handled.diagnostics.length = 0;
    handled.events.length = 0;
    handled.technical.length = 0;
    handled.cleaned.length = 0;
    handlerSandbox.ghostSessions = {
        'uid-b': { roomId: 'room-2', oldSocketId: 'socket-b', startedAt: handlerNow - 30001, diagnosticEventId: 'diag-b' }
    };
    handlerSandbox.disconnectTimers = { 'uid-b': 2 };
    handlerSandbox.roomState = {
        'room-2': { players: ['socket-a', 'socket-b'], playerUids: ['uid-a', 'uid-b'], playerNames: ['A', 'B'], matchId: 'match-2' }
    };
    await handlerSandbox.handleDisconnectGraceTimeout('uid-b', 'room-2', 'socket-b');
    assert.strictEqual(handled.technical.length, 1, 'Pojedinačni prekid mora zadržati tehnički rezultat');
    assert.strictEqual(handled.technical[0][0], 'uid-a', 'Igrač koji je ostao povezan mora biti tehnički pobednik');
    assert.strictEqual(handled.technical[0][1], 'uid-b', 'Igrač koji se nije vratio mora biti tehnički poražen');

    handled.technical.length = 0;
    handled.cleaned.length = 0;
    handlerSandbox.ghostSessions = {
        'uid-b': { roomId: 'room-3', oldSocketId: 'socket-b', startedAt: handlerNow - 30001, diagnosticEventId: 'diag-c' }
    };
    handlerSandbox.disconnectTimers = { 'uid-b': 3 };
    handlerSandbox.roomState = {
        'room-3': {
            players: ['socket-a', 'socket-b'], playerUids: ['uid-a', 'uid-b'], playerNames: ['A', 'B'], matchId: 'match-3',
            disconnectResolutionInProgress: true, disconnectResolutionOwnerUid: 'uid-a'
        }
    };
    await handlerSandbox.handleDisconnectGraceTimeout('uid-b', 'room-3', 'socket-b');
    assert.strictEqual(handled.technical.length, 0, 'Paralelni reconnect timeout ne sme upisati drugi tehnički rezultat');
    assert.strictEqual(handled.cleaned.length, 0, 'Paralelni reconnect timeout ne sme prerano čistiti sobu');

    const shortDrop = createHarness();
    timerDisplay.innerHTML = '';
    shortDrop.showOpponentReconnectGraceCountdown({ remainingMs: 30000, noticeDelayMs: 80 });
    assert.strictEqual(shortDrop.opponentReconnectNoticeVisible, false, 'Kratki prekid ne sme odmah biti vidljiv');
    await wait(30);
    shortDrop.clearOpponentReconnectGraceCountdown();
    await wait(90);
    assert.strictEqual(shortDrop.opponentReconnectNoticeVisible, false, 'Oporavljen kratki prekid ne sme naknadno bljesnuti');
    assert.strictEqual(timerDisplay.innerHTML, '', 'Sakriven prekid ne sme promeniti prikaz tajmera');

    const longDrop = createHarness();
    timerDisplay.innerHTML = '';
    longDrop.showOpponentReconnectGraceCountdown({ remainingMs: 30000, noticeDelayMs: 40 });
    await wait(70);
    assert.strictEqual(longDrop.opponentReconnectNoticeVisible, true, 'Duzi prekid mora postati vidljiv');
    assert(timerDisplay.innerHTML.length > 0, 'Duzi prekid mora prikazati reconnect stanje');
    longDrop.clearOpponentReconnectGraceCountdown();
    assert.strictEqual(longDrop.opponentReconnectNoticeVisible, false, 'Reconnect stanje mora biti uklonjeno posle oporavka');

    const syncedDrop = createHarness();
    timerDisplay.innerHTML = '';
    syncedDrop.showOpponentReconnectGraceCountdown({ remainingMs: 12000 });
    assert.strictEqual(syncedDrop.opponentReconnectNoticeVisible, true, 'Autoritativni sync duzeg prekida mora odmah biti vidljiv');
    syncedDrop.clearOpponentReconnectGraceCountdown();

    console.log('Online reconnect checks passed: all modes and entry paths, foreground recovery, native background guard, lifecycle and settlement races, per-turn anti-stall budget, timer top-up guard, stale room/timer/event guards, same-socket diagnostic resolution, cleanup outcomes, mutual disconnect fairness, tournament bracket replay, network diagnostics, and reconnect UI.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
