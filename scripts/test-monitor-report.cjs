'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { getReportPeriod, mountMonitorReport } = require('../lib/monitor-report');

const fakeRange = date => ({ start: new Date(`${date.toISOString().slice(0, 10)}T00:00:00Z`) });
assert.equal(getReportPeriod('week', '2026-11-06', '2026-11-06', fakeRange).startKey, '2026-11-02');
assert.equal(getReportPeriod('week', '2026-11-06', '2026-11-06', fakeRange).endKey, '2026-11-09');
assert.equal(getReportPeriod('month', '2026-11-06', '2026-11-06', fakeRange).endKey, '2026-12-01');
assert.equal(getReportPeriod('year', '2026-11-06', '2026-11-06', fakeRange).startKey, '2026-01-01');
assert.equal(getReportPeriod('week', '2026-01-01', '2026-11-06', fakeRange).startKey, '2025-12-29');
assert.equal(getReportPeriod('month', '2024-02-29', '2026-11-06', fakeRange).endKey, '2024-03-01');
assert.equal(getReportPeriod('day', '2026-02-30', '2026-11-06', fakeRange), null);
assert.equal(getReportPeriod('day', '2026-12-01', '2026-11-06', fakeRange).startKey, '2026-11-06');
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const helpers = serverSource.slice(serverSource.indexOf('function getBelgradeDateParts('), serverSource.indexOf('function resetMonitorRuntimeDayIfNeeded('));
const actualRange = vm.runInNewContext(`${helpers}\ngetBelgradeDayRange`, { Intl, Date, Number, String });
const spring = getReportPeriod('day', '2026-03-29', '2026-11-06', actualRange);
const autumn = getReportPeriod('day', '2026-10-25', '2026-11-06', actualRange);
assert.equal(spring.start.toISOString(), '2026-03-28T23:00:00.000Z');
assert.equal(spring.end.toISOString(), '2026-03-29T22:00:00.000Z');
assert.equal(autumn.start.toISOString(), '2026-10-24T22:00:00.000Z');
assert.equal(autumn.end.toISOString(), '2026-10-25T23:00:00.000Z');

let handler;
const app = { get(path, fn) { assert.equal(path, '/api/monitor/report'); handler = fn; } };
let activityCall = 0;
mountMonitorReport(app, {
    isAuthorized: req => req.headers.token === 'valid', hasToken: true, hasDatabase: true,
    getBelgradeDayKey: () => '2026-11-06', getBelgradeDayRange: fakeRange,
    normalizeMonitorTheme: value => value,
    ServerMonitorDaily: { find: () => ({ lean: async () => [
        { dayKey: '2026-11-05', peakOnline: 7, disconnectsToday: 2, matchmakingWaitTotalMs: 20000, matchmakingWaitSamples: 2, adRewardErrors: 1, roomVisits: { daily: 3 } },
        { dayKey: '2026-11-06', peakOnline: 5, disconnectsToday: 1, matchmakingWaitTotalMs: 30000, matchmakingWaitSamples: 1, adRewardErrors: 0, roomVisits: { daily: 2, solo: 1 } }
    ] }) },
    MatchResult: { aggregate: async () => [
        { _id: { dayKey: '2026-11-05', mode: 'solo' }, count: 2 },
        { _id: { dayKey: '2026-11-06', mode: 'friend_invite', resultType: 'technical' }, count: 1 }
    ] },
    ServerMonitorDailyActivity: { aggregate: async () => {
        activityCall++;
        if (activityCall === 1) return [{ _id: '2026-11-05', count: 2 }, { _id: '2026-11-06', count: 1 }];
        if (activityCall === 2) return [{ count: 2 }];
        if (activityCall === 3) return [{ _id: 'dark', count: 3 }];
        return [{ _id: '2026-11', count: 2 }];
    } },
    AdMobRewardVerification: {
        aggregate: async () => [{ _id: '2026-11-05', count: 1 }],
        countDocuments: async () => 2
    }
});
function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        set() { return this; },
        json(value) { this.body = value; return this; }
    };
}
(async () => {
    let res = response();
    await handler({ headers: { token: 'bad' }, query: {} }, res);
    assert.equal(res.statusCode, 401);
    res = response();
    await handler({ headers: { token: 'valid' }, query: { period: 'day', anchor: 'bad' } }, res);
    assert.equal(res.statusCode, 400);
    res = response();
    await handler({ headers: { token: 'valid' }, query: { period: 'week', anchor: '2026-11-06' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.totals.completed, 3);
    assert.equal(res.body.totals.technicalResults, 1);
    assert.equal(res.body.totals.activePlayers, 2);
    assert.equal(res.body.totals.playerDays, 3);
    assert.equal(res.body.totals.peakOnline, 7);
    assert.equal(res.body.totals.averageWaitSeconds, 17);
    assert.equal(res.body.totals.disconnects, 3);
    assert.equal(res.body.totals.adGranted, 1);
    assert.equal(res.body.totals.modes.friend, 1);
    assert.equal(res.body.breakdown.length, 5);
    assert.equal(res.body.breakdown[0].tracked, false);
    assert.equal(res.body.totals.adPending, 2);
    assert.equal(res.body.totals.observedDays, 5);
    assert.deepEqual(res.body.topRooms[0], { room: 'daily', visits: 5 });
    activityCall = 0;
    res = response();
    await handler({ headers: { token: 'valid' }, query: { period: 'year', anchor: '2026-11-06' } }, res);
    assert.equal(res.body.granularity, 'month');
    assert.equal(res.body.breakdown.length, 11);
    assert.equal(res.body.breakdown[10].activePlayers, 2);
    assert.equal(res.body.breakdown[10].completed, 3);
    console.log('Monitor report tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
