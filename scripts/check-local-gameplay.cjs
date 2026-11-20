'use strict';

// Production game methods with rendering, sound, storage and animations stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../www', file), 'utf8');
const elements = new Map();
const element = id => {
    if (!elements.has(id)) elements.set(id, { classList: { add() {}, remove() {} }, disabled: false, innerText: '' });
    return elements.get(id);
};
const context = {
    window: { location: { hostname: 'fixture.local', protocol: 'http:', origin: 'http://fixture.local' } },
    document: { getElementById: element },
    localStorage: { getItem: () => null },
    console: { log() {}, warn() {}, error(...args) { throw Error(args.join(' ')); } },
    t: key => key,
    setTimeout: callback => { callback(); return 0; },
    clearTimeout() {},
    URL
};
vm.createContext(context);
vm.runInContext(read('config.js'), context);
vm.runInContext(read('game.js').replace('window.app = new YambApp();', 'globalThis.TestYambApp = YambApp;'), context);
vm.runInContext('this.columns = KOLONE; this.rows = REDOVI_IGRA;', context);

function createApp(count) {
    const app = Object.create(context.TestYambApp.prototype);
    Object.assign(app, {
        players: count === 1 ? ['Account'] : ['Account', 'Guest'], playerName: 'Account',
        modeTag: count === 1 ? 'Solo' : 'Hotseat', onlineMode: false, isSpectator: false,
        currentPlayerIdx: 0, roomId: '', gameActive: true, onlineRollPending: false, isAnimating: false,
        diceBtns: [], soundMgr: { roll() {}, click() {}, score() {}, error() {}, announce() {} },
        effectMgr: { trigger() {}, celebrateYamb() {} }, features: { checkMoveEffects() {} },
        modal: { alert: async () => {}, confirm: async () => true },
        finishCount: 0,
        beginOnlineFinalBoardDelay() { this.finishCount++; this.gameActive = false; }
    });
    for (const method of ['vibrate', 'updateStatusLabel', 'updateDiceVisuals', 'updateTableVisuals',
        'highlightCurrentPlayer', 'autoSaveGame', 'startClientTimer']) app[method] = () => {};
    app.initScores();
    app.resetTurnLogic();
    return app;
}

async function run(count) {
    const app = createApp(count);
    assert.equal(await app.writeScore('1', 'Slobodna', 0), false, 'Cannot score before rolling');
    app.toggleHold(0);
    assert.equal(app.zadrzane[0], false);
    for (let pIdx = 0; pIdx < count; pIdx++) {
        await app.throwDice();
        assert.equal(app.brojBacanja, 1);
        assert(app.kockiceVals.every(value => Number.isInteger(value) && value >= 1 && value <= 6));
        assert.equal(await app.writeScore('2', 'Nadole', pIdx), false, 'Cannot skip ordered rows');
        if (count === 2) assert.equal(await app.writeScore('1', 'Slobodna', 1 - pIdx), false, 'Cannot write the other sheet');
        app.toggleHold(0);
        const heldValue = app.kockiceVals[0];
        app.clickNajava();
        assert.equal(app.najavaAktivna, true);
        assert.equal(await app.writeScore('1', 'Najava', pIdx), true);
        assert.equal(app.allScores[pIdx].Najava['1'], null, 'Selecting an announcement is not a move');
        app.clickNajava();
        assert.equal(app.najavljenoPolje, null, 'Can cancel before reroll');
        app.clickNajava();
        await app.writeScore('1', 'Najava', pIdx);
        await app.throwDice();
        assert.equal(app.kockiceVals[0], heldValue);
        assert.equal(app.brojBacanja, 2);
        app.clickNajava();
        assert.equal(app.najavljenoPolje.row, '1', 'Cannot cancel after reroll');
        assert.equal(await app.writeScore('1', 'Slobodna', pIdx), false, 'Must honor announcement');
        await app.throwDice();
        const lastDice = [...app.kockiceVals];
        await app.throwDice();
        assert.equal(app.brojBacanja, 3);
        assert.deepEqual([...app.kockiceVals], lastDice);
        app.toggleHold(0);
        assert.equal(app.zadrzane[0], false, 'Can mark/unmark after third roll');
        const expected = lastDice.filter(value => value === 1).length;
        assert.equal(await app.writeScore('1', 'Najava', pIdx), true);
        assert.equal(app.allScores[pIdx].Najava['1'], expected);
        assert.equal(app.currentPlayerIdx, (pIdx + 1) % count);
        assert.equal(app.brojBacanja, 0);
        assert(app.zadrzane.every(value => !value));
    }
    const order = col => col === 'Nagore' ? [...context.rows].reverse() : col === 'Sredina'
        ? ['Max', '6', '5', '4', '3', '2', '1', 'Min', 'Triling', 'Kenta', 'Ful', 'Poker', 'Yamb'] : context.rows;
    let moves = count;
    for (const col of context.columns) for (const row of order(col)) for (let pIdx = 0; pIdx < count; pIdx++) {
        if (col === 'Najava' && row === '1') continue;
        assert.equal(app.currentPlayerIdx, pIdx);
        await app.throwDice();
        if (col === 'Ru\u010dno' && row === '1') await app.throwDice();
        assert.equal(await app.writeScore(row, col, pIdx), true, `${col}/${row}/${pIdx}`);
        moves++;
        if (col === 'Ru\u010dno' && row === '1') assert.equal(app.allScores[pIdx][col][row], 0);
    }
    assert.equal(moves, 78 * count);
    assert.equal(app.finishCount, 1);
    assert.equal(app.gameActive, false);
    assert(app.allScores.every(sheet => context.columns.every(col => context.rows.every(row => Number.isFinite(sheet[col][row])))));
    console.log(`PASS: ${app.modeTag} complete ${moves}-move game, dice/hold/roll limits, sheet/order guards, announcement, manual zero, turn resets and one finish transition.`);
}

(async () => { await run(1); await run(2); })().catch(error => { console.error(error); process.exitCode = 1; });
