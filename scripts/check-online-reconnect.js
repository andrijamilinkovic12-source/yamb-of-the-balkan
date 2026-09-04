const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');
const socketClientSource = fs.readFileSync(path.join(root, 'www', 'socket.io.min.js'), 'utf8');

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
    assert(indexSource.includes('game.js?v=5.6'));
    assert(serverSource.includes("outcome: 'mutual_disconnect'"), 'Obostrani prekid nije posebno evidentiran');
    assert(serverSource.includes("socket.on('connection_diagnostic_snapshot'"), 'Server ne prima poslednji poznati tip mreže');
    assert(gameSource.includes("this.socket.emit('connection_diagnostic_snapshot'"), 'Klijent ne šalje poslednji poznati tip mreže');
    assert(gameSource.includes("addListener('appStateChange'"), 'Capacitor lifecycle nije povezan sa grace periodom');
    assert(gameSource.includes("addEventListener('pageshow'"), 'Povratak browser stranice nije povezan sa oporavkom');

    const backgroundHandlerStart = serverSource.indexOf("socket.on('online_app_backgrounded'");
    const backgroundHandlerEnd = serverSource.indexOf("socket.on('online_presence_ping'", backgroundHandlerStart);
    const backgroundHandler = serverSource.slice(backgroundHandlerStart, backgroundHandlerEnd);
    assert(backgroundHandlerStart >= 0 && backgroundHandlerEnd > backgroundHandlerStart, 'Nedostaje serverska obrada odlaska u pozadinu');
    assert(backgroundHandler.includes('isLocalRoomId(roomId)'), 'Lokalne partije nisu isključene iz online grace toka');
    assert(!backgroundHandler.includes('isTournamentRoomId(roomId)'), 'Odlazak u pozadinu je i dalje ograničen samo na turnir');
    assert(backgroundHandler.includes("beginReconnectGraceForSocket(socket, roomId, 'app_backgrounded')"), 'Pozadina ne pokreće reconnect grace');
    assert(backgroundHandler.includes('rememberClientConnectionDiagnosticSnapshot(socket, data)'), 'Pozadina ne čuva poslednji mrežni tip');

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
        emitOnlinePresencePing(force) { lifecycleSandbox.emitOnlinePresencePing.call(this, force); }
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
    const serverSandbox = {
        Date, Math, Number, String, Object, Promise,
        console: { log() {}, warn() {} },
        MONGO_URI: '', DISCONNECT_GRACE_MS: 30000, TOURNAMENT_DISCONNECT_GRACE_MS: 300000,
        ghostSessions: {}, disconnectTimers: {}, roomState: {}, playerRooms: {},
        parseTournamentRoomId: id => id.startsWith('tourney_'),
        isLocalRoomId: id => id.startsWith('local_'),
        getSocketUid: id => id === 'socket-a' ? 'uid-a' : 'uid-b',
        toSafeInt: (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback,
        createDisconnectDiagnostic: () => `diag-${callbacks.length}`,
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
        serverSandbox.playerRooms['socket-a'] = roomId;
        serverSandbox.roomState[roomId] = { players: ['socket-a', 'socket-b'] };
        handlers.online_app_backgrounded({ roomId, lifecycleSource: 'visibility_hidden' });
        const firstGhost = serverSandbox.ghostSessions['uid-a'];
        assert(firstGhost, `${roomId}: grace must start`);
        assert.strictEqual(callbacks.at(-1).ms, roomId.startsWith('tourney_') ? 300000 : 30000);
        handlers.online_app_backgrounded({ roomId });
        assert.strictEqual(serverSandbox.ghostSessions['uid-a'], firstGhost, 'Dupli pause ne produžava rok');
        handlers.online_presence_ping({ roomId });
        assert(serverSandbox.ghostSessions['uid-a'], 'Legacy ping ne sme poništiti background grace');
        handlers.online_presence_ping({ roomId: 'duel_old', foreground: true });
        assert(serverSandbox.ghostSessions['uid-a'], 'Stara soba ne sme oporaviti novu');
        handlers.online_presence_ping({ roomId, foreground: true });
        assert(!serverSandbox.ghostSessions['uid-a'], 'Foreground ping mora popraviti propušteni resume');
        assert(resolutions.some(item => item.eventId === firstGhost.diagnosticEventId && item.fields.outcome === 'recovered'));
        const expiredCallback = callbacks.at(-1).fn;
        handlers.online_app_backgrounded({ roomId });
        expiredCallback();
        assert(serverSandbox.ghostSessions['uid-a'], 'Stari timeout ne sme obrisati novi grace');
        handlers.online_app_resumed({ roomId });
        assert(!serverSandbox.ghostSessions['uid-a'], 'Same-socket resume mora zatvoriti grace');
        assert.strictEqual(resolutions.at(-1).fields.outcome, 'recovered');
    }
    serverSandbox.playerRooms['socket-a'] = 'duel_challenge';
    handlers.online_app_backgrounded({ roomId: 'duel_old' });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Zakašnjeli pause stare sobe ne sme pauzirati novu');
    serverSandbox.roomState.duel_challenge.players = ['socket-b'];
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Gledalac ne sme pokrenuti grace');
    serverSandbox.roomState.duel_challenge.players = ['socket-a', 'socket-b'];
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    serverSandbox.clearDisconnectGraceForRoom('duel_challenge');
    assert.strictEqual(resolutions.at(-1).fields.outcome, 'ended_without_penalty');
    handlers.online_app_backgrounded({ roomId: 'duel_challenge' });
    serverSandbox.resolveDisconnectDiagnostic(serverSandbox.ghostSessions['uid-a'].diagnosticEventId, { outcome: 'technical_result' });
    serverSandbox.clearDisconnectGraceForRoom('duel_challenge');
    assert.strictEqual(resolutions.at(-1).fields.outcome, 'technical_result', 'Cleanup ne sme pregaziti tehnički rezultat');
    serverSandbox.playerRooms['socket-a'] = 'local_solo';
    serverSandbox.roomState.local_solo = { players: ['socket-a'] };
    handlers.online_app_backgrounded({ roomId: 'local_solo' });
    assert(!serverSandbox.ghostSessions['uid-a'], 'Server mora isključiti lokalne partije');

    const mutualSandbox = {
        Date,
        Math,
        Number,
        Set,
        MUTUAL_DISCONNECT_WINDOW_MS: 2000,
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
    assert.strictEqual(
        mutualSandbox.getMutualDisconnectGraceState('tourney_round-1', mutualState, 31009),
        null,
        'Turnirski meč ne sme biti poništen bez zasebne bracket odluke'
    );

    mutualSandbox.ghostSessions['uid-b'].startedAt = 3001;
    assert.strictEqual(
        mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 33001),
        null,
        'Vremenski odvojeni prekidi ne smeju poništiti regularnu tehničku pobedu'
    );
    mutualSandbox.ghostSessions['uid-b'].startedAt = 1009;
    delete mutualSandbox.disconnectTimers['uid-b'];
    assert.strictEqual(
        mutualSandbox.getMutualDisconnectGraceState('room-1', mutualState, 31009),
        null,
        'Povratak jednog igrača mora ostaviti samo protivnikov tehnički timeout'
    );

    const handled = { diagnostics: [], events: [], endedRooms: [], technical: [], cleaned: [] };
    const handlerNow = Date.now();
    const handlerSandbox = {
        Date,
        Math,
        Number,
        Set,
        String,
        MUTUAL_DISCONNECT_WINDOW_MS: 2000,
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
        resolveDisconnectDiagnostic(eventId, fields) { handled.diagnostics.push({ eventId, fields }); },
        io: { to() { return { emit(event, data) { handled.events.push({ event, data }); } }; } },
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

    console.log('Online reconnect checks passed: all modes, foreground recovery, native background guard, lifecycle races, stale room/timer guards, same-socket diagnostic resolution, cleanup outcomes, mutual disconnect fairness, network diagnostics, and reconnect UI.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
