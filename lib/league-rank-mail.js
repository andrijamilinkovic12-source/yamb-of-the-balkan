'use strict';

const { createMail, appendMail } = require('./player-mailbox');

function installLeagueRankMail(schema, { currentPeriod, rankFor, publish }) {
    function remember(profile) {
        const league = profile.leagueData;
        profile.$locals.rankMailBefore = league ? { year: league.year, quarter: league.quarter,
            score: Math.max(0, Number(league.quarterlyScore) || 0) } : null;
    }
    schema.post('init', remember);
    schema.pre('save', function () {
        if (this.isNew || !this.isModified('leagueData')) return;
        const league = this.leagueData;
        const period = currentPeriod();
        if (!league || league.year !== period.year || league.quarter !== period.quarter) return;
        const before = this.$locals.rankMailBefore;
        if (!before) return;
        const previousScore = before.year === period.year && before.quarter === period.quarter ? before.score : 0;
        const score = Math.max(0, Number(league.quarterlyScore) || 0);
        const previousRank = rankFor(previousScore);
        const nextRank = rankFor(score);
        if (!previousRank || !nextRank || previousRank === nextRank) return;
        const signature = JSON.stringify([period.year, period.quarter, previousScore, score]);
        if (this.$locals.rankMailStaged === signature) return;
        const entry = createMail('league_rank_changed', { leagueRank: { year: period.year, quarter: period.quarter,
            previousRank, nextRank, score, direction: score > previousScore ? 'up' : 'down' } });
        this.pendingLeagueRankMail ||= [];
        this.pendingLeagueRankMail.push(entry);
        this.$locals.rankMailStaged = signature;
    });
    schema.post('save', function (profile) {
        remember(profile);
        delete profile.$locals.rankMailStaged;
        if (profile.pendingLeagueRankMail?.length) publish(profile.firebaseUid);
    });
}

async function publishLeagueRankMail(profiles, uid, changed) {
    const profile = await profiles.findOne({ firebaseUid: uid }).select('pendingLeagueRankMail').lean();
    for (const entry of profile?.pendingLeagueRankMail || []) {
        const result = await profiles.updateOne({ firebaseUid: uid, 'pendingLeagueRankMail.id': entry.id }, {
            $push: { playerMailbox: appendMail(entry) },
            $pull: { pendingLeagueRankMail: { id: entry.id } }
        });
        if (result.modifiedCount) changed(uid);
    }
}

module.exports = { installLeagueRankMail, publishLeagueRankMail };
