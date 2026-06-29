const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

const SERVER_KOLONE = ['Nadole', 'Slobodna', 'Sredina', 'Nagore', 'Ručno', 'Najava'];
const REDOVI_IGRA = ['1', '2', '3', '4', '5', '6', 'Max', 'Min', 'Triling', 'Kenta', 'Ful', 'Poker', 'Yamb'];

function sliceBalancedBlock(source, start) {
    const bodyStart = source.indexOf('{', start);
    assert.notStrictEqual(bodyStart, -1, `Missing block body near offset ${start}`);

    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }

        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }

    throw new Error(`Unclosed block near offset ${start}`);
}

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.notStrictEqual(start, -1, `Missing function: ${name}`);
    return sliceBalancedBlock(source, start);
}

function extractClientMethod(source, name) {
    let marker = `\n    ${name}(`;
    let start = source.indexOf(marker);
    if (start === -1) {
        marker = `\n    async ${name}(`;
        start = source.indexOf(marker);
    }
    assert.notStrictEqual(start, -1, `Missing YambApp method: ${name}`);
    return sliceBalancedBlock(source, start + 5);
}

function createEmptySheet() {
    const sheet = {};
    SERVER_KOLONE.forEach(col => {
        sheet[col] = {};
        REDOVI_IGRA.forEach(row => {
            sheet[col][row] = null;
        });
    });
    return sheet;
}

function fillRows(sheet, col, rows) {
    rows.forEach((row, index) => {
        sheet[col][row] = index + 1;
    });
}

function checkClientToggleHold() {
    const ToggleHarness = new Function(`return class ToggleHarness { ${extractClientMethod(gameSource, 'toggleHold')} }`)();

    function makeHarness(overrides = {}) {
        const emitted = [];
        const harness = new ToggleHarness();

        Object.assign(harness, {
            onlineMode: false,
            currentPlayerIdx: 0,
            myOnlineIndex: 0,
            isSpectator: false,
            onlineTurnTimerPaused: false,
            brojBacanja: 1,
            onlineRollPending: false,
            isAnimating: false,
            zadrzane: [false, false, false, false, false, false],
            roomId: '',
            updateCount: 0,
            clickCount: 0,
            vibrateCount: 0,
            saveCount: 0,
            updateDiceVisuals() { this.updateCount++; },
            soundMgr: { click() { harness.clickCount++; } },
            vibrate() { this.vibrateCount++; },
            socket: {
                emit(event, payload) {
                    emitted.push({ event, payload });
                }
            },
            autoSaveGame() { this.saveCount++; },
            emitted
        }, overrides);

        return harness;
    }

    let harness = makeHarness({ onlineMode: true, roomId: 'room_test', brojBacanja: 3 });
    harness.toggleHold(2);
    assert.strictEqual(harness.zadrzane[2], true, 'Online player cannot mark a die after the third roll');
    assert.deepStrictEqual(harness.emitted, [{
        event: 'dice_hold',
        payload: { roomId: 'room_test', index: 2, status: true }
    }], 'Online third-roll hold did not emit the visual hold update');
    harness.toggleHold(2);
    assert.strictEqual(harness.zadrzane[2], false, 'Online player cannot unmark a die after the third roll');

    harness = makeHarness({ onlineMode: false, brojBacanja: 3 });
    harness.toggleHold(4);
    assert.strictEqual(harness.zadrzane[4], true, 'Local player cannot mark a die after the third roll');

    harness = makeHarness({ brojBacanja: 0 });
    harness.toggleHold(0);
    assert.strictEqual(harness.zadrzane[0], false, 'Hold changed before any roll');

    harness = makeHarness({ onlineMode: true, currentPlayerIdx: 1, myOnlineIndex: 0, brojBacanja: 3 });
    harness.toggleHold(0);
    assert.strictEqual(harness.zadrzane[0], false, 'Online opponent turn can change held dice');

    harness = makeHarness({ onlineMode: true, onlineTurnTimerPaused: true, brojBacanja: 3 });
    harness.toggleHold(0);
    assert.strictEqual(harness.zadrzane[0], false, 'Paused online turn can change held dice');

    harness = makeHarness({ onlineRollPending: true, brojBacanja: 3 });
    harness.toggleHold(0);
    assert.strictEqual(harness.zadrzane[0], false, 'Pending online roll can change held dice');

    harness = makeHarness({ isAnimating: true, brojBacanja: 3 });
    harness.toggleHold(0);
    assert.strictEqual(harness.zadrzane[0], false, 'Animating dice can change held dice');
}

function checkServerHoldAndRollGuards() {
    const holdStart = serverSource.indexOf("else if (eventName === 'remote_hold')");
    assert.notStrictEqual(holdStart, -1, 'Missing server remote_hold branch');
    const holdEnd = serverSource.indexOf("else if (eventName === 'remote_announce')", holdStart);
    assert.notStrictEqual(holdEnd, -1, 'Could not find end of server remote_hold branch');
    const holdSection = serverSource.slice(holdStart, holdEnd);

    assert(
        /state\.brojBacanja\s*<=\s*0/.test(holdSection),
        'Server hold guard must still reject holding before the first roll'
    );
    assert(
        !/state\.brojBacanja\s*(>=\s*3|>\s*2|===\s*3)/.test(holdSection),
        'Server hold guard blocks visual dice marking after the third roll'
    );

    const rollStart = serverSource.indexOf("else if (eventName === 'remote_roll')");
    assert.notStrictEqual(rollStart, -1, 'Missing server remote_roll branch');
    const rollEnd = serverSource.indexOf("else if (eventName === 'remote_hold')", rollStart);
    assert.notStrictEqual(rollEnd, -1, 'Could not find end of server remote_roll branch');
    const rollSection = serverSource.slice(rollStart, rollEnd);

    assert(
        /state\.brojBacanja\s*>=\s*3/.test(rollSection),
        'Server roll guard must still block a fourth roll'
    );
    assert(
        /state\.najavaAktivna/.test(rollSection),
        'Server roll guard must still block rolling while announcement selection is active'
    );
    assert(
        /state\.brojBacanja\s*\+\s*1/.test(rollSection),
        'Server roll branch must increment roll count by exactly one'
    );
    assert(
        /state\.zadrzane\s*=\s*held/.test(rollSection),
        'Server roll branch must persist normalized held dice'
    );
}

function buildRuleContexts() {
    const sum = arr => arr.reduce((total, value) => total + value, 0);
    const ClientRules = new Function('sum', 'REDOVI_IGRA', `
        return class ClientRules {
            constructor() { this.brojBacanja = 3; }
            ${extractClientMethod(gameSource, 'getBest5')}
            ${extractClientMethod(gameSource, 'calcPoints')}
            ${extractClientMethod(gameSource, 'isValidColumnOrder')}
        }
    `)(sum, REDOVI_IGRA);

    const randomCalls = [];
    const serverContext = {
        console,
        crypto: {
            randomInt(min, max) {
                randomCalls.push([min, max]);
                return 4;
            }
        },
        randomCalls
    };
    vm.createContext(serverContext);
    vm.runInContext(`
        const KOLONE = ${JSON.stringify(SERVER_KOLONE)};
        const REDOVI_IGRA = ${JSON.stringify(REDOVI_IGRA)};
        ${extractFunction(serverSource, 'sumDice')}
        ${extractFunction(serverSource, 'normalizeDiceValues')}
        ${extractFunction(serverSource, 'normalizeHeldValues')}
        ${extractFunction(serverSource, 'getBestDiceForRow')}
        ${extractFunction(serverSource, 'calculateMovePoints')}
        ${extractFunction(serverSource, 'calculateServerMovePoints')}
        ${extractFunction(serverSource, 'isValidColumnOrderForMove')}
        ${extractFunction(serverSource, 'rollServerDice')}
        this.normalizeDiceValues = normalizeDiceValues;
        this.normalizeHeldValues = normalizeHeldValues;
        this.calculateServerMovePoints = calculateServerMovePoints;
        this.isValidColumnOrderForMove = isValidColumnOrderForMove;
        this.rollServerDice = rollServerDice;
    `, serverContext);

    return {
        clientRules: new ClientRules(),
        serverRules: serverContext
    };
}

function checkClientThrowDiceGuards() {
    const throwDiceSource = extractClientMethod(gameSource, 'throwDice');

    assert(
        /if\s*\(\s*this\.isSpectator\s*\)\s*return/.test(throwDiceSource),
        'Client throwDice must block spectators'
    );
    assert(
        /this\.onlineMode\s*&&\s*this\.onlineTurnTimerPaused/.test(throwDiceSource),
        'Client throwDice must block rolling while an online turn is paused'
    );
    assert(
        /this\.brojBacanja\s*>=\s*3\s*\|\|\s*isOnlineOpponent/.test(throwDiceSource),
        'Client throwDice must block fourth rolls and opponent turns'
    );
    assert(
        /this\.najavaAktivna/.test(throwDiceSource),
        'Client throwDice must block rolling while announcement selection is active'
    );
    assert(
        /this\.onlineRollPending/.test(throwDiceSource),
        'Client throwDice must block duplicate online roll requests'
    );
    assert(
        /this\.isAnimating/.test(throwDiceSource),
        'Client throwDice must block rolls while dice animation is active'
    );
    assert(
        /this\.socket\.emit\('dice_roll'[\s\S]*held:\s*this\.zadrzane/.test(throwDiceSource),
        'Client online throwDice must send held dice to the server'
    );
    assert(
        /if\s*\(!this\.zadrzane\[i\]\)\s*newValues\[i\]\s*=/.test(throwDiceSource),
        'Client local throwDice must only reroll unheld dice'
    );
    assert(
        /this\.brojBacanja\+\+/.test(throwDiceSource),
        'Client local throwDice must increment roll count exactly once'
    );
}

function checkClientWriteScoreGuards() {
    const writeScoreSource = extractClientMethod(gameSource, 'writeScore');

    assert(
        /if\s*\(\s*this\.isSpectator\s*\)\s*return false/.test(writeScoreSource),
        'Client writeScore must block spectators'
    );
    assert(
        /this\.onlineRollPending/.test(writeScoreSource),
        'Client writeScore must block while an online roll is pending'
    );
    assert(
        /pIdx\s*!==\s*this\.currentPlayerIdx/.test(writeScoreSource),
        'Client writeScore must block writes to the wrong player sheet'
    );
    assert(
        /this\.brojBacanja\s*===\s*0/.test(writeScoreSource),
        'Client writeScore must require at least one roll'
    );
    assert(
        /sheet\[col\]\[row\]\s*!==\s*null/.test(writeScoreSource),
        'Client writeScore must block filled cells'
    );
    assert(
        /col\s*===\s*["']Najava["'][\s\S]*this\.brojBacanja\s*>\s*1/.test(writeScoreSource),
        'Client writeScore must block Najava column after first roll unless a field was announced'
    );
    assert(
        /if\s*\(\s*this\.najavaAktivna\s*\)/.test(writeScoreSource),
        'Client writeScore must handle active announcement selection before scoring'
    );
    assert(
        /if\s*\(\s*this\.najavljenoPolje\s*\)/.test(writeScoreSource),
        'Client writeScore must enforce the announced field'
    );
    assert(
        /!this\.isValidColumnOrder\(row,\s*col,\s*sheet\)/.test(writeScoreSource),
        'Client writeScore must enforce column order'
    );
    assert(
        /this\.getBest5\(row,\s*this\.kockiceVals\)[\s\S]*this\.calcPoints\(row,\s*best5\)/.test(writeScoreSource),
        'Client writeScore must score the best five dice for the selected row'
    );
    assert(
        /col\s*===\s*["']Ručno["'][\s\S]*this\.brojBacanja\s*>\s*1[\s\S]*pts\s*=\s*0/.test(writeScoreSource),
        'Client writeScore must force manual column to zero after first roll'
    );
    assert(
        /sheet\[col\]\[row\]\s*=\s*pts/.test(writeScoreSource),
        'Client writeScore must write the calculated points'
    );
    assert(
        /this\.socket\.emit\('player_move'[\s\S]*points:\s*pts/.test(writeScoreSource),
        'Client writeScore must send calculated points to online server validation'
    );
    assert(
        /this\.switchPlayer\(\)/.test(writeScoreSource),
        'Client writeScore must switch player after a successful write'
    );
}

function checkServerMoveGuards() {
    const moveStart = serverSource.indexOf("if (eventName === 'remote_move')");
    assert.notStrictEqual(moveStart, -1, 'Missing server remote_move branch');
    const moveEnd = serverSource.indexOf("else if (eventName === 'remote_roll')", moveStart);
    assert.notStrictEqual(moveEnd, -1, 'Could not find end of server remote_move branch');
    const moveSection = serverSource.slice(moveStart, moveEnd);

    assert(/data\?\.pIdx/.test(moveSection), 'Server move branch must validate player sheet index');
    assert(/!KOLONE\.includes\(moveCol\)/.test(moveSection), 'Server move branch must validate move column');
    assert(/!REDOVI_IGRA\.includes\(moveRow\)/.test(moveSection), 'Server move branch must validate move row');
    assert(/state\.brojBacanja\s*<=\s*0/.test(moveSection), 'Server move branch must require at least one roll');
    assert(/playerSheet\[moveCol\]\[moveRow\]\s*!==\s*null/.test(moveSection), 'Server move branch must block filled cells');
    assert(/state\.najavaAktivna/.test(moveSection), 'Server move branch must block while announcement selection is active');
    assert(/moveCol\s*!==\s*["']Najava["']\s*\|\|\s*moveRow\s*!==\s*state\.najavljenoPolje\.row/.test(moveSection), 'Server move branch must enforce announced field');
    assert(/moveCol\s*===\s*["']Najava["']\s*&&\s*state\.brojBacanja\s*>\s*1/.test(moveSection), 'Server move branch must block Najava without announcement after first roll');
    assert(/!isValidColumnOrderForMove\(moveRow,\s*moveCol,\s*playerSheet\)/.test(moveSection), 'Server move branch must enforce column order');
    assert(/const serverPoints\s*=\s*calculateServerMovePoints\(moveRow,\s*moveCol,\s*diceValues,\s*state\.brojBacanja\)/.test(moveSection), 'Server move branch must calculate authoritative points');
    assert(/playerSheet\[moveCol\]\[moveRow\]\s*=\s*serverPoints/.test(moveSection), 'Server move branch must write authoritative server points');
    assert(/state\.brojBacanja\s*=\s*0/.test(moveSection), 'Server move branch must reset roll count after a move');
    assert(/state\.zadrzane\s*=\s*\[false,false,false,false,false,false\]/.test(moveSection), 'Server move branch must reset held dice after a move');
    assert(/state\.najavaAktivna\s*=\s*false/.test(moveSection), 'Server move branch must reset active announcement after a move');
    assert(/state\.najavljenoPolje\s*=\s*null/.test(moveSection), 'Server move branch must reset announced field after a move');
    assert(/points:\s*serverPoints/.test(moveSection), 'Server move branch must relay server-corrected points');

    const afterMoveSection = serverSource.slice(moveEnd, serverSource.indexOf("socket.on('dice_roll'", moveEnd));
    assert(
        /eventName\s*===\s*['"]remote_move['"][\s\S]*roomState\[roomId\]\.turnIndex\s*=\s*roomState\[roomId\]\.turnIndex\s*===\s*0\s*\?\s*1\s*:\s*0/.test(afterMoveSection),
        'Server must advance turn after a valid move'
    );
}

function checkServerDiceRolling(serverRules) {
    assert.deepStrictEqual(
        serverRules.normalizeDiceValues([1, 2, 3, 4, 5, 6]),
        [1, 2, 3, 4, 5, 6],
        'Valid dice values should normalize unchanged'
    );
    assert.strictEqual(
        serverRules.normalizeDiceValues([0, 0, 0, 0, 0, 0]),
        null,
        'Zero dice values must be invalid after a real roll'
    );
    assert.deepStrictEqual(
        serverRules.normalizeDiceValues([0, 0, 0, 0, 0, 0], true),
        [0, 0, 0, 0, 0, 0],
        'Zero dice values should be allowed only before the first roll'
    );
    assert.strictEqual(
        serverRules.normalizeDiceValues([1, 2, 3, 4, 5]),
        null,
        'Dice arrays must contain exactly six dice'
    );
    assert.deepStrictEqual(
        serverRules.normalizeHeldValues([true, false, 1, 0, 'yes', '']),
        [true, false, true, false, true, false],
        'Held dice values should normalize to booleans'
    );
    assert.strictEqual(
        serverRules.normalizeHeldValues([true, false]),
        null,
        'Held dice arrays must contain exactly six flags'
    );

    serverRules.randomCalls.length = 0;
    assert.deepStrictEqual(
        serverRules.rollServerDice([1, 2, 3, 4, 5, 6], [true, false, true, false, false, true]),
        [1, 4, 3, 4, 4, 6],
        'Server roll must preserve held dice and reroll unheld dice'
    );
    assert.strictEqual(serverRules.randomCalls.length, 3, 'Server roll rerolled the wrong number of dice');
    assert.deepStrictEqual(
        serverRules.randomCalls,
        [[1, 7], [1, 7], [1, 7]],
        'Server roll must use crypto.randomInt(1, 7)'
    );

    serverRules.randomCalls.length = 0;
    assert.deepStrictEqual(
        serverRules.rollServerDice([0, 2, 0, 4, 0, 6], [true, true, true, true, true, true]),
        [4, 2, 4, 4, 4, 6],
        'Server roll must not preserve invalid held zero dice'
    );
    assert.strictEqual(serverRules.randomCalls.length, 3, 'Server roll did not reroll invalid held zero dice');

    serverRules.randomCalls.length = 0;
    assert.deepStrictEqual(
        serverRules.rollServerDice([1, 2, 3, 4, 5, 6], null),
        [4, 4, 4, 4, 4, 4],
        'Invalid held flags should reroll all dice'
    );
    assert.strictEqual(serverRules.randomCalls.length, 6, 'Invalid held flags did not reroll every die');
}

function checkClientServerScoringParity(clientRules, serverRules) {
    const rows = REDOVI_IGRA;
    let checked = 0;

    for (let a = 1; a <= 6; a++) {
        for (let b = 1; b <= 6; b++) {
            for (let c = 1; c <= 6; c++) {
                for (let d = 1; d <= 6; d++) {
                    for (let e = 1; e <= 6; e++) {
                        for (let f = 1; f <= 6; f++) {
                            const dice = [a, b, c, d, e, f];
                            checked++;

                            for (const row of rows) {
                                for (const rollCount of [1, 2, 3]) {
                                    clientRules.brojBacanja = rollCount;
                                    const clientPoints = clientRules.calcPoints(row, clientRules.getBest5(row, dice));
                                    const serverPoints = serverRules.calculateServerMovePoints(row, 'Slobodna', dice, rollCount);

                                    assert.strictEqual(
                                        clientPoints,
                                        serverPoints,
                                        `Client/server score mismatch for row=${row}, roll=${rollCount}, dice=${dice.join(',')}`
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    assert.strictEqual(checked, 46656, 'Did not check all six-dice combinations');
}

function checkColumnOrderParity(clientRules, serverRules) {
    function expectBoth(row, col, sheet, expected, label) {
        assert.strictEqual(
            clientRules.isValidColumnOrder(row, col, sheet),
            expected,
            `Client column order failed: ${label}`
        );
        assert.strictEqual(
            serverRules.isValidColumnOrderForMove(row, col, sheet),
            expected,
            `Server column order failed: ${label}`
        );
    }

    REDOVI_IGRA.forEach((row, index) => {
        let sheet = createEmptySheet();
        fillRows(sheet, 'Nadole', REDOVI_IGRA.slice(0, index));
        expectBoth(row, 'Nadole', sheet, true, `Nadole accepts ${row} after prefix`);

        if (index > 0) {
            sheet = createEmptySheet();
            fillRows(sheet, 'Nadole', REDOVI_IGRA.slice(0, index - 1));
            expectBoth(row, 'Nadole', sheet, false, `Nadole rejects ${row} before prefix`);
        }

        sheet = createEmptySheet();
        fillRows(sheet, 'Nagore', REDOVI_IGRA.slice(index + 1));
        expectBoth(row, 'Nagore', sheet, true, `Nagore accepts ${row} after reverse prefix`);

        if (index < REDOVI_IGRA.length - 1) {
            sheet = createEmptySheet();
            fillRows(sheet, 'Nagore', REDOVI_IGRA.slice(index + 2));
            expectBoth(row, 'Nagore', sheet, false, `Nagore rejects ${row} before reverse prefix`);
        }
    });

    [
        ['Max', '6', '5', '4', '3', '2', '1'],
        ['Min', 'Triling', 'Kenta', 'Ful', 'Poker', 'Yamb']
    ].forEach(sequence => {
        sequence.forEach((row, index) => {
            let sheet = createEmptySheet();
            fillRows(sheet, 'Sredina', sequence.slice(0, index));
            expectBoth(row, 'Sredina', sheet, true, `Sredina accepts ${row} after middle prefix`);

            if (index > 0) {
                sheet = createEmptySheet();
                fillRows(sheet, 'Sredina', sequence.slice(0, index - 1));
                expectBoth(row, 'Sredina', sheet, false, `Sredina rejects ${row} before middle prefix`);
            }
        });
    });

    ['Slobodna', 'Ručno', 'Najava'].forEach(col => {
        REDOVI_IGRA.forEach(row => {
            expectBoth(row, col, createEmptySheet(), true, `${col} accepts ${row} in order check`);
        });
    });
}

function checkManualAndAnnounceGuards(serverRules) {
    assert.strictEqual(
        serverRules.calculateServerMovePoints('Yamb', 'Ručno', [6, 6, 6, 6, 6, 5], 1),
        80,
        'Manual column should score normally after first roll'
    );
    assert.strictEqual(
        serverRules.calculateServerMovePoints('Yamb', 'Ručno', [6, 6, 6, 6, 6, 5], 2),
        0,
        'Manual column must be forced to zero after the first roll'
    );

    assert(
        serverSource.includes('moveCol === "Najava" && state.brojBacanja > 1'),
        'Server no-announce guard for Najava column is missing'
    );
    assert(
        gameSource.includes('col === "Najava" && !this.najavljenoPolje && !this.najavaAktivna && this.brojBacanja > 1'),
        'Client no-announce guard for Najava column is missing'
    );
}

checkClientToggleHold();
checkServerHoldAndRollGuards();
checkClientThrowDiceGuards();
checkClientWriteScoreGuards();
checkServerMoveGuards();

const { clientRules, serverRules } = buildRuleContexts();
checkServerDiceRolling(serverRules);
checkClientServerScoringParity(clientRules, serverRules);
checkColumnOrderParity(clientRules, serverRules);
checkManualAndAnnounceGuards(serverRules);

console.log('Game rule checks passed: dice rolling, hold behavior, roll guards, move guards, scoring parity, column order, manual and announce guards.');
