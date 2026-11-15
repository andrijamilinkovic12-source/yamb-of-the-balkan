'use strict';

const { randomUUID } = require('node:crypto');
const { createMail, appendMail } = require('./player-mailbox');
const POWER_STEP = 5000;
const STREAK_STEP = 3;
const number = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const milestone = (value, step) => Math.floor(number(value) / step) * step;
const FIELDS = ['wins', 'losses', 'games', 'totalScoreSum', 'highscore', 'maxWinStreak', 'currentWinStreak',
    'tournamentWins', 'leagueData', 'unlockedTrophies', 'penaltyPoints', 'h2hStats'];

function installStatisticsMail(schema, { calculatePowerIndex, publish }) {
    function snapshot(profile) {
        if (![...FIELDS, 'statisticsMailState', 'pendingStatisticsMail'].every(field => profile.isSelected(field))) return null;
        return { power: number(calculatePowerIndex(profile)), streak: number(profile.currentWinStreak) };
    }
    function remember(profile) { profile.$locals.statisticsMailBefore = snapshot(profile); }
    schema.post('init', remember);
    schema.pre('save', function () {
        const current = snapshot(this);
        if (!current) return;
        this.statisticsMailDirty = false;
        const previous = this.$locals.statisticsMailBefore || current;
        let state = this.statisticsMailState;
        if (!state) {
            this.statisticsMailState = { powerMilestone: milestone(previous.power, POWER_STEP),
                streakMilestone: milestone(previous.streak, STREAK_STEP), streakCount: previous.streak, episode: randomUUID() };
            state = this.statisticsMailState;
        }
        // Imports and repairs establish a baseline, never congratulate a player
        // for replaying statistics that were already earned before this feature.
        if (this.isNew || this.$locals.statisticsMailSuppressed) {
            state.powerMilestone = Math.max(number(state.powerMilestone), milestone(current.power, POWER_STEP));
            state.streakMilestone = milestone(current.streak, STREAK_STEP);
            if (current.streak < number(state.streakCount)) state.episode = randomUUID();
            state.streakCount = current.streak;
            return;
        }
        const stage = (type, statistics, id) => {
            this.pendingStatisticsMail ||= [];
            this.pendingStatisticsMail.push(createMail(type, { statistics }, id));
        };
        const target = milestone(current.power, POWER_STEP);
        for (let threshold = number(state.powerMilestone) + POWER_STEP; threshold <= target; threshold += POWER_STEP) {
            stage('power_index_milestone', { milestone: threshold, value: current.power, next: threshold + POWER_STEP },
                `statistics:power:${threshold}`);
            state.powerMilestone = threshold;
        }
        const oldStreak = number(state.streakCount);
        if (current.streak < oldStreak) {
            if (oldStreak >= STREAK_STEP) stage('fire_streak_ended', { value: oldStreak, best: number(this.maxWinStreak) },
                `statistics:streak:${state.episode}:ended`);
            state.episode = randomUUID();
            state.streakMilestone = 0;
        }
        const streakTarget = milestone(current.streak, STREAK_STEP);
        for (let threshold = number(state.streakMilestone) + STREAK_STEP; threshold <= streakTarget; threshold += STREAK_STEP) {
            stage('fire_streak_milestone', { milestone: threshold, value: current.streak,
                best: number(this.maxWinStreak), next: threshold + STREAK_STEP }, `statistics:streak:${state.episode}:${threshold}`);
            state.streakMilestone = threshold;
        }
        state.streakCount = current.streak;
    });
    schema.post('save', function (profile) {
        remember(profile);
        delete profile.$locals.statisticsMailSuppressed;
        if (profile.pendingStatisticsMail?.length) publish(profile.firebaseUid);
    });
    // Atomic awards and older technical-result paths use query updates rather
    // than document.save(). Mark them for the same serialized checkpoint job.
    for (const hook of ['updateOne', 'findOneAndUpdate', 'updateMany']) schema.pre(hook, function () {
        const update = this.getUpdate();
        if (!update || Array.isArray(update)) return;
        const changed = Object.values(update).some(fields => fields && typeof fields === 'object'
            && Object.keys(fields).some(path => FIELDS.includes(path.split('.')[0])));
        if (changed) this.setUpdate({ ...update, $set: { ...update.$set, statisticsMailDirty: true } });
    });
}

async function publishStatisticsMail(profiles, uid, changed) {
    const profile = await profiles.findOne({ firebaseUid: uid }).select('pendingStatisticsMail').lean();
    for (const entry of profile?.pendingStatisticsMail || []) {
        const result = await profiles.updateOne({ firebaseUid: uid, 'pendingStatisticsMail.id': entry.id }, {
            $push: { playerMailbox: appendMail(entry) }, $pull: { pendingStatisticsMail: { id: entry.id } }
        });
        if (result.modifiedCount) changed(uid);
    }
}

module.exports = { installStatisticsMail, publishStatisticsMail, POWER_STEP, STREAK_STEP };
