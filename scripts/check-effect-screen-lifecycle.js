const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'www', 'game.js'), 'utf8');
const dailySource = fs.readFileSync(path.join(__dirname, '..', 'www', 'dnevniizazov.js'), 'utf8');
const start = source.indexOf('    async showMainMenu(options = {}) {');
const end = source.indexOf('    showRules(options = {}) {', start);
assert(start >= 0 && end > start, 'Cannot extract the real showMainMenu method');
const MenuRoute = new Function(`return class { ${source.slice(start, end)} };`)();
const dailyStart = dailySource.indexOf('    close() {');
const dailyEnd = dailySource.indexOf('    resetGame() {', dailyStart);
assert(dailyStart >= 0 && dailyEnd > dailyStart, 'Cannot extract the real Daily Challenge close method');
const DailyRoute = new Function(`return class { ${dailySource.slice(dailyStart, dailyEnd)} };`)();

function makeHarness(rewardReady) {
    const events = [];
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                classList: { add() {}, remove() {} },
                style: {}
            });
            return elements.get(id);
        }
    };
    const app = new MenuRoute();
    Object.assign(app, {
        isSpectator: false,
        gameActive: true,
        onlineMode: false,
        roomId: null,
        effectMgr: { stop() { events.push('stop'); } },
        soundMgr: { stopMusic() { events.push('stopMusic'); } },
        clearOnlineGameOverDelay() {},
        async claimPendingRewardBeforeExternalNavigation() {
            events.push('rewardCheck');
            return rewardReady;
        },
        async autoSaveGame() { events.push('autoSave'); },
        pauseLocalGameClock() {},
        setInviteBusyState() {},
        navigateTo(screen) { events.push(`navigate:${screen}`); }
    });
    return { app, events, document };
}

async function main() {
    const originalDocument = global.document;
    const originalStorage = global.localStorage;
    try {
        global.localStorage = { removeItem() {} };
        const approved = makeHarness(true);
        global.document = approved.document;
        await approved.app.showMainMenu();
        assert.equal(approved.events.filter(event => event === 'stop').length, 1);
        assert(approved.events.indexOf('stop') > approved.events.indexOf('rewardCheck'));
        assert(approved.events.indexOf('stop') < approved.events.indexOf('navigate:main-menu'));

        const pending = makeHarness(false);
        global.document = pending.document;
        await pending.app.showMainMenu();
        assert.deepEqual(pending.events, ['rewardCheck'], 'Pending reward must block both FX cleanup and menu navigation');

        let dailyStops = 0;
        const dailyOverlay = {
            active: true,
            classList: {
                contains(name) { return name === 'active' && dailyOverlay.active; },
                remove(name) { if (name === 'active') dailyOverlay.active = false; }
            }
        };
        global.document = { getElementById(id) { return id === 'glass-daily-overlay' ? dailyOverlay : null; } };
        const daily = new DailyRoute();
        daily.app = { effectMgr: { stop() { dailyStops++; } } };
        daily.isActive = true;
        daily.close();
        assert.equal(dailyStops, 0, 'Rolling challenge must not be closed');
        assert.equal(dailyOverlay.active, true);
        daily.isActive = false;
        daily.close();
        assert.equal(dailyStops, 1, 'Closing a completed challenge must stop its effect');
        assert.equal(dailyOverlay.active, false);
        daily.close();
        assert.equal(dailyStops, 1, 'Repeated close must not stop an unrelated effect');
    } finally {
        global.document = originalDocument;
        global.localStorage = originalStorage;
    }
    console.log('Effect screen lifecycle checks passed: menu and Daily Challenge close effects without interrupting blocked reward or active rolling.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
