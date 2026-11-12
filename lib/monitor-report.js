'use strict';

// Read-only history. All calendar boundaries use Europe/Belgrade, including DST.
function getReportPeriod(period, anchorValue, todayKey, getBelgradeDayRange) {
    if (!['day', 'week', 'month', 'year'].includes(period)) return null;
    const anchor = anchorValue || todayKey;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return null;
    const date = new Date(`${anchor}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== anchor) return null;
    const today = new Date(`${todayKey}T12:00:00Z`);
    if (date > today) date.setTime(today.getTime());
    const first = new Date(date);
    if (period === 'week') first.setUTCDate(first.getUTCDate() - (first.getUTCDay() + 6) % 7);
    if (period === 'month') first.setUTCDate(1);
    if (period === 'year') { first.setUTCMonth(0); first.setUTCDate(1); }
    const after = new Date(first);
    if (period === 'day') after.setUTCDate(after.getUTCDate() + 1);
    if (period === 'week') after.setUTCDate(after.getUTCDate() + 7);
    if (period === 'month') after.setUTCMonth(after.getUTCMonth() + 1);
    if (period === 'year') after.setUTCFullYear(after.getUTCFullYear() + 1);
    return {
        period,
        startKey: first.toISOString().slice(0, 10),
        endKey: after.toISOString().slice(0, 10),
        todayKey,
        start: getBelgradeDayRange(first).start,
        end: getBelgradeDayRange(after).start
    };
}

function mountMonitorReport(app, deps) {
    const {
        isAuthorized, hasToken, hasDatabase, getBelgradeDayKey, getBelgradeDayRange,
        ServerMonitorDaily, ServerMonitorDailyActivity, MatchResult, AdMobRewardVerification,
        normalizeMonitorTheme
    } = deps;
    app.get('/api/monitor/report', async (req, res) => {
        if (!isAuthorized(req)) {
            return res.status(hasToken ? 401 : 503).json({ ok: false, reason: hasToken ? 'unauthorized' : 'monitor_not_configured' });
        }
        const range = getReportPeriod(String(req.query.period || 'day'), String(req.query.anchor || ''), getBelgradeDayKey(), getBelgradeDayRange);
        if (!range) return res.status(400).json({ ok: false, reason: 'invalid_period_or_anchor' });
        if (!hasDatabase) return res.status(503).json({ ok: false, reason: 'monitor_history_unavailable' });
        try {
            const keyFilter = { $gte: range.startKey, $lt: range.endKey };
            const dateFilter = { $gte: range.start, $lt: range.end };
            const [dailyRecords, matches, activeByDay, activeUnique, themeRows, adRows, activeByMonth, adPending] = await Promise.all([
                ServerMonitorDaily.find({ dayKey: keyFilter }).lean(),
                MatchResult.aggregate([
                    { $match: { finishedAt: dateFilter } },
                    { $group: { _id: {
                        dayKey: { $dateToString: { format: '%Y-%m-%d', date: '$finishedAt', timezone: 'Europe/Belgrade' } },
                        mode: '$mode', resultType: '$resultType'
                    }, count: { $sum: 1 } } }
                ]),
                ServerMonitorDailyActivity.aggregate([
                    { $match: { dayKey: keyFilter } },
                    { $group: { _id: '$dayKey', count: { $sum: 1 } } }
                ]),
                ServerMonitorDailyActivity.aggregate([
                    { $match: { dayKey: keyFilter } },
                    { $group: { _id: '$anonId' } },
                    { $count: 'count' }
                ]),
                ServerMonitorDailyActivity.aggregate([
                    { $match: { dayKey: keyFilter } },
                    { $group: { _id: '$theme', count: { $sum: 1 } } }
                ]),
                AdMobRewardVerification.aggregate([
                    { $match: { claimedAt: dateFilter } },
                    { $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$claimedAt', timezone: 'Europe/Belgrade' } },
                        count: { $sum: 1 }
                    } }
                ]),
                range.period === 'year' ? ServerMonitorDailyActivity.aggregate([
                    { $match: { dayKey: keyFilter } },
                    { $group: { _id: { month: { $substrBytes: ['$dayKey', 0, 7] }, anonId: '$anonId' } } },
                    { $group: { _id: '$_id.month', count: { $sum: 1 } } }
                ]) : Promise.resolve([]),
                AdMobRewardVerification.countDocuments({ receivedAt: dateFilter, claimedAt: null })
            ]);
            const dailyByKey = new Map(dailyRecords.map(row => [row.dayKey, row]));
            const activeByKey = new Map(activeByDay.map(row => [row._id, row.count]));
            const adsByKey = new Map(adRows.map(row => [row._id, row.count]));
            const matchesByKey = new Map();
            for (const row of matches) {
                const key = row._id?.dayKey;
                if (!matchesByKey.has(key)) matchesByKey.set(key, []);
                matchesByKey.get(key).push(row);
            }
            const totals = {
                completed: 0, technicalResults: 0, modes: { solo: 0, hotseat: 0, random: 0, friend: 0, other: 0 },
                activePlayers: activeUnique[0]?.count || 0, playerDays: 0, peakOnline: 0,
                disconnects: 0, waitTotalMs: 0, waitSamples: 0, averageWaitSeconds: null,
                adGranted: 0, adPending, adErrors: 0, trackedDays: dailyRecords.length
            };
            const rooms = {};
            const days = [];
            for (let cursor = new Date(`${range.startKey}T12:00:00Z`);
                cursor.toISOString().slice(0, 10) < range.endKey && cursor.toISOString().slice(0, 10) <= range.todayKey;
                cursor.setUTCDate(cursor.getUTCDate() + 1)) {
                const dayKey = cursor.toISOString().slice(0, 10);
                const stored = dailyByKey.get(dayKey);
                const modes = { solo: 0, hotseat: 0, random: 0, friend: 0, other: 0 };
                let completed = 0, technicalResults = 0;
                for (const match of matchesByKey.get(dayKey) || []) {
                    const count = Math.max(0, Number(match.count) || 0);
                    completed += count;
                    if (match._id?.resultType === 'technical') technicalResults += count;
                    const mode = String(match._id?.mode || '');
                    const bucket = ['solo', 'hotseat', 'random'].includes(mode) ? mode :
                        (['friend_invite', 'challenge'].includes(mode) ? 'friend' : 'other');
                    modes[bucket] += count;
                    totals.modes[bucket] += count;
                }
                const day = {
                    dayKey, label: dayKey, tracked: Boolean(stored), completed, technicalResults, modes,
                    activePlayers: Math.max(0, Number(activeByKey.get(dayKey)) || 0),
                    peakOnline: Math.max(0, Number(stored?.peakOnline) || 0),
                    disconnects: Math.max(0, Number(stored?.disconnectsToday) || 0),
                    adGranted: Math.max(0, Number(adsByKey.get(dayKey)) || 0),
                    adErrors: Math.max(0, Number(stored?.adRewardErrors) || 0),
                    waitTotalMs: Math.max(0, Number(stored?.matchmakingWaitTotalMs) || 0),
                    waitSamples: Math.max(0, Number(stored?.matchmakingWaitSamples) || 0)
                };
                days.push(day);
                totals.completed += completed;
                totals.technicalResults += technicalResults;
                totals.playerDays += day.activePlayers;
                totals.peakOnline = Math.max(totals.peakOnline, day.peakOnline);
                totals.disconnects += day.disconnects;
                totals.adGranted += day.adGranted;
                totals.adErrors += day.adErrors;
                totals.waitTotalMs += day.waitTotalMs;
                totals.waitSamples += day.waitSamples;
                for (const [room, visits] of Object.entries(stored?.roomVisits || {})) {
                    rooms[room] = (rooms[room] || 0) + Math.max(0, Number(visits) || 0);
                }
            }
            totals.averageWaitSeconds = totals.waitSamples ? Math.round(totals.waitTotalMs / totals.waitSamples / 1000) : null;
            totals.observedDays = days.length;
            const activeMonthMap = new Map(activeByMonth.map(row => [row._id, row.count]));
            const months = [];
            if (range.period === 'year') {
                for (const day of days) {
                    const monthKey = day.dayKey.slice(0, 7);
                    let month = months[months.length - 1];
                    if (!month || month.label !== monthKey) {
                        month = {
                            label: monthKey, tracked: false, trackedDays: 0, completed: 0, technicalResults: 0,
                            modes: { solo: 0, hotseat: 0, random: 0, friend: 0, other: 0 },
                            activePlayers: Math.max(0, Number(activeMonthMap.get(monthKey)) || 0),
                            peakOnline: 0, disconnects: 0, adGranted: 0, adErrors: 0,
                            waitTotalMs: 0, waitSamples: 0
                        };
                        months.push(month);
                    }
                    if (day.tracked) { month.tracked = true; month.trackedDays++; }
                    for (const mode of Object.keys(month.modes)) month.modes[mode] += day.modes[mode];
                    for (const field of ['completed', 'technicalResults', 'disconnects', 'adGranted', 'adErrors', 'waitTotalMs', 'waitSamples']) month[field] += day[field];
                    month.peakOnline = Math.max(month.peakOnline, day.peakOnline);
                }
            }
            // Teme su korisnički dani: isti anonimni igrač može se pojaviti u više dana.
            const themeTotal = themeRows.reduce((sum, row) => sum + Math.max(0, Number(row.count) || 0), 0);
            res.set('Cache-Control', 'no-store');
            return res.json({
                ok: true, generatedAt: new Date().toISOString(),
                period: range.period, startKey: range.startKey, endKey: range.endKey, todayKey: range.todayKey,
                totals,
                topRooms: Object.entries(rooms).map(([room, visits]) => ({ room, visits }))
                    .sort((a, b) => b.visits - a.visits || a.room.localeCompare(b.room)).slice(0, 8),
                themes: themeRows.map(row => ({
                    theme: normalizeMonitorTheme(row._id), count: Math.max(0, Number(row.count) || 0),
                    percent: themeTotal ? Math.round(Math.max(0, Number(row.count) || 0) / themeTotal * 100) : 0
                })).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme)),
                granularity: range.period === 'year' ? 'month' : 'day',
                breakdown: range.period === 'year' ? months : days
            });
        } catch (error) {
            console.error('Monitor izveštaj nije dostupan:', error);
            return res.status(500).json({ ok: false, reason: 'report_query_failed' });
        }
    });
}

module.exports = { getReportPeriod, mountMonitorReport };
