const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../www/game.js'), 'utf8');
const appSource = source.slice(0, source.indexOf('window.app = new YambApp()'));
const opening = source.slice(source.indexOf('    initSocketConnection() {'), source.indexOf('    async authenticateSocketIdentity('));
assert.ok(opening.indexOf("this.socket.on('previous_quarter_winner_data'") >= 0);
assert.ok(opening.indexOf("this.socket.on('previous_quarter_winner_data'") < opening.indexOf("this.socket.on('connect'"));
assert.match(source, /if \(screenId === 'main-menu'\) this\.checkQuarterWinner\(\)/);
assert.doesNotMatch(source, /\.off\('previous_quarter_winner_data'/);

const julyStart = new Date('2026-06-30T22:00:00Z');
const julyReady = new Date('2026-07-01T04:06:00Z');
const julyEnd = new Date('2026-07-03T22:00:00Z');
const julyKey = 'yamb_winner_shown_2026_Q2';
const winner = { year: 2026, quarter: 2, playerName: 'Test igrač', score: 1400 };

function fixture({ now = julyReady, menu = true } = {}) {
    let clock = now.getTime();
    let overlay = false;
    let timer;
    const requests = [];
    const rendered = [];
    const storage = new Map([['yamb_uid', 'test-account']]);
    const document = {
        visibilityState: 'visible',
        getElementById(id) {
            if (id === 'main-menu') return { classList: { contains: () => menu } };
            if (id === 'winner-modal-overlay') return overlay ? {} : null;
            return null;
        }
    };
    const prototype = vm.runInNewContext(`${appSource}\nYambApp.prototype`, {
        window: {}, document,
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        Date: class extends Date { constructor() { super(clock); } },
        setTimeout: (callback, delay) => { timer = { callback, delay }; },
        clearTimeout: () => { timer = undefined; }
    });
    const app = Object.create(prototype);
    app.socket = {
        connected: true,
        emit: (name, data) => requests.push({ name, ...data })
    };
    app.showQuarterWinnerModal = data => { overlay = true; rendered.push(data); };
    return {
        app, document, storage, requests, rendered,
        close: () => { overlay = false; },
        setMenu: enabled => { menu = enabled; },
        setTime: date => { clock = date.getTime(); },
        fireTimer: () => {
            assert.ok(timer);
            const { callback, delay } = timer;
            timer = undefined;
            clock += delay;
            callback();
        }
    };
}

{
    const f = fixture({ menu: false });
    f.app.checkQuarterWinner();
    assert.equal(f.requests.length, 0);
    f.setMenu(true);
    f.app.checkQuarterWinner();
    f.app.checkQuarterWinner();
    assert.deepEqual(f.requests, [{ name: 'get_previous_quarter_winner', year: 2026, quarter: 2 }]);
    f.setMenu(false);
    f.app.gameActive = true;
    f.app.receiveQuarterWinner({ ...winner, quarter: 1 });
    f.app.receiveQuarterWinner(winner);
    assert.deepEqual(f.rendered, []);
    assert.equal(f.storage.has(julyKey), false);
    f.setMenu(true);
    f.app.gameActive = false;
    f.document.visibilityState = 'hidden';
    f.app.checkQuarterWinner();
    assert.deepEqual(f.rendered, []);
    f.document.visibilityState = 'visible';
    f.app.checkQuarterWinner();
    f.close();
    f.app.checkQuarterWinner();
    assert.deepEqual(f.rendered, [winner]);
    assert.equal(f.storage.get(julyKey), 'true');
    assert.equal(f.requests.length, 1);
}

{
    const f = fixture({ now: julyStart });
    f.app.checkQuarterWinner();
    f.app.receiveQuarterWinner({ ...winner, settling: true, retryAfterMs: 21900000 });
    f.app.checkQuarterWinner();
    assert.equal(f.requests.length, 1);
    f.fireTimer();
    assert.equal(f.requests.length, 2);
    f.app.receiveQuarterWinner(winner);
    assert.deepEqual(f.rendered, [winner]);
}

{
    const f = fixture();
    f.app.checkQuarterWinner();
    f.app.receiveQuarterWinner(null);
    assert.equal(f.storage.has(julyKey), false);
    f.app.checkQuarterWinner();
    assert.equal(f.requests.length, 1);
    f.setTime(new Date(julyReady.getTime() + 60000));
    f.app.checkQuarterWinner();
    assert.equal(f.requests.length, 2);
    f.setTime(julyEnd);
    f.app.receiveQuarterWinner(winner);
    f.app.checkQuarterWinner();
    assert.deepEqual(f.rendered, []);
    assert.equal(f.storage.has(julyKey), false);
}

{
    const f = fixture({ now: new Date('2026-12-31T23:00:00Z') });
    f.app.checkQuarterWinner();
    assert.deepEqual(f.requests, [{ name: 'get_previous_quarter_winner', year: 2026, quarter: 4 }]);
}

console.log('Quarterly champion notice: startup listener, deferred menu display, settlement, repeat, empty archive and Belgrade date boundaries verified.');
