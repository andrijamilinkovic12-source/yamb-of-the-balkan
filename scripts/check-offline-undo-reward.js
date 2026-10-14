const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'www', 'vracanjeupisa.js'), 'utf8');
const start = source.indexOf('class UndoManager {');
const end = source.indexOf('// Inicijalizacija i povezivanje menadžera', start);
assert(start >= 0 && end > start, 'UndoManager nije pronađen');

let adResult = false;
const requests = [];
const context = {
    window: {
        Capacitor: { isNativePlatform: () => true },
        adMobGlobal: {
            showRewardVideo: async options => {
                requests.push(options);
                return adResult;
            }
        }
    },
    document: { getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    gt: () => '',
    console,
    setTimeout,
    clearTimeout
};
const UndoManager = vm.runInNewContext(`${source.slice(start, end)}\nUndoManager`, context);

function makeApp() {
    const snapshot = {
        pIdx: 0, col: 'Dole', row: '1', diceVals: [1, 2, 3, 4, 5],
        held: [false, false, false, false, false], rollCount: 2,
        najavljenoPolje: null, najavaAktivna: false, hasSvetiIlija: false,
        hasProphet: false, consecutiveNajava: 0
    };
    return {
        onlineMode: false,
        lastMoveSnapshot: snapshot,
        allScores: [{ Dole: { '1': 1 } }],
        modal: { confirm: async () => true },
        effectMgr: { stop() {} },
        loadEquippedEffect() {}, highlightCurrentPlayer() {},
        updateTableVisuals() {}, updateDiceVisuals() {},
        updateStatusLabel() {}, autoSaveGame() {}
    };
}

async function main() {
    const app = makeApp();
    const undo = new UndoManager(app);

    await undo.executeUndo();
    assert.equal(app.allScores[0].Dole['1'], 1, 'Bez reward potvrde upis mora ostati');
    assert.equal(app.lastMoveSnapshot?.row, '1', 'Neuspeo oglas mora sačuvati mogućnost ponovnog pokušaja');

    adResult = true;
    await undo.executeUndo();
    assert.equal(app.allScores[0].Dole['1'], null, 'Potvrđen rewarded vraća upis');
    assert.equal(app.lastMoveSnapshot, null, 'Ispravka se koristi samo jednom');
    assert.equal(requests.length, 2);
    assert.equal(requests[0].context, 'offline_undo');
    assert.equal(requests[0].amount, 1);
    console.log('Offline undo reward checks passed: failure keeps move, confirmed reward restores it.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
