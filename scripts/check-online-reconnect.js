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
    const definitionMatch = new RegExp(`^    ${methodName}\\(`, 'm').exec(source);
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
    const bodyStart = source.indexOf('{', start);
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
    assert(indexSource.includes('game.js?v=4.88'));
    assert(serverSource.includes("outcome: 'mutual_disconnect'"), 'Obostrani prekid nije posebno evidentiran');
    assert(serverSource.includes("socket.on('connection_diagnostic_snapshot'"), 'Server ne prima poslednji poznati tip mreže');
    assert(gameSource.includes("this.socket.emit('connection_diagnostic_snapshot'"), 'Klijent ne šalje poslednji poznati tip mreže');

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

    console.log('Online reconnect checks passed: fast retry config, mutual disconnect fairness, cached network diagnostics, hidden short drop, visible long drop, sync recovery, and cache version.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
