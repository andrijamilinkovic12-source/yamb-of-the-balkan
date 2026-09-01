const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');

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
    assert(indexSource.includes('game.js?v=4.84'));

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

    console.log('Online reconnect checks passed: fast retry config, hidden short drop, visible long drop, sync recovery, and cache version.');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
