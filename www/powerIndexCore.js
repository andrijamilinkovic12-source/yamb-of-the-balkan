(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.powerIndexCore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const TROPHY_IDS = [
        'first_play', 'apprentice', 'kafana', 'score_1000', 'grandmaster', 'legend',
        'mythic', 'godlike', 'surgeon', 'prophet', 'sniper', 'math', 'sveti_ilija',
        'hazard', 'firecracker', 'concrete', 'perfectionist', 'miner', 'immortal',
        'potato', 'minimal', 'achilles', 'close_call', 'night_owl', 'spite', 'veteran'
    ];

    const TROPHY_ID_SET = new Set(TROPHY_IDS);

    function toSafeNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
    }

    function summarizeH2H(h2hStats) {
        const summary = { wins: 0, losses: 0, draws: 0, games: 0 };
        if (!h2hStats || typeof h2hStats !== 'object') return summary;

        Object.values(h2hStats).forEach(record => {
            if (!record || typeof record !== 'object') return;
            const name = String(record.name || '').trim();
            if (!name || name === 'undefined' || name === 'null' || name === 'Nepoznat') return;

            summary.wins += toSafeNumber(record.wins);
            summary.losses += toSafeNumber(record.losses);
            summary.draws += toSafeNumber(record.draws);
        });

        summary.games = summary.wins + summary.losses + summary.draws;
        return summary;
    }

    function countPowerIndexTrophies(unlockedTrophies) {
        if (!Array.isArray(unlockedTrophies)) return 0;
        return unlockedTrophies.reduce((count, trophyId) => count + (TROPHY_ID_SET.has(trophyId) ? 1 : 0), 0);
    }

    function calculateLeaguePowerPoints(leagueData) {
        if (!leagueData || typeof leagueData !== 'object') return 0;
        return toSafeNumber(leagueData.baselineScore) + toSafeNumber(leagueData.quarterlyScore);
    }

    function calculatePowerIndex(statsObj, options = {}) {
        if (!statsObj) return 0;

        const h2hSummary = summarizeH2H(statsObj.h2hStats);
        const wins = h2hSummary.games > 0 ? h2hSummary.wins : toSafeNumber(statsObj.wins);
        const losses = h2hSummary.games > 0 ? h2hSummary.losses : toSafeNumber(statsObj.losses);
        const draws = h2hSummary.games > 0 ? h2hSummary.draws : toSafeNumber(statsObj.draws);
        const totalCompetitive = wins + losses + draws;
        const rate = totalCompetitive > 0 ? (wins / totalCompetitive) * 100 : 0;
        const games = toSafeNumber(statsObj.games);
        const avg = games > 0 ? toSafeNumber(statsObj.totalScoreSum) / games : 0;
        const hs = toSafeNumber(statsObj.highscore);
        const maxStreak = toSafeNumber(statsObj.maxWinStreak);
        const tourneyWins = toSafeNumber(statsObj.tournamentWins);
        const leaguePts = options.leaguePts !== undefined
            ? toSafeNumber(options.leaguePts)
            : calculateLeaguePowerPoints(statsObj.leagueData);
        const trophyCount = countPowerIndexTrophies(statsObj.unlockedTrophies);
        const penalty = toSafeNumber(statsObj.penaltyPoints);

        const basePI = Math.round(
            (rate * 10) + (leaguePts * 0.02) + (tourneyWins * 300) +
            (avg * 0.5) + (hs * 0.2) + (maxStreak * 30) + (trophyCount * 50)
        );

        return Math.max(0, basePI - penalty);
    }

    return {
        TROPHY_IDS,
        calculatePowerIndex,
        calculateLeaguePowerPoints,
        countPowerIndexTrophies,
        summarizeH2H
    };
}));
