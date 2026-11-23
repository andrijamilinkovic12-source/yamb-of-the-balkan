'use strict';
const { changeDucats, walletState } = require('./ducat-wallet');

function createLegacyTournamentWithdrawals({ connection, profiles, states, profileWrites, guardWrite,
    entryFee, maxBalance, removeFromBracket }) {
    async function withdraw(uid, tournamentNumber) {
        if (!profileWrites.owns(uid)) return profileWrites.run(uid, () => withdraw(uid, tournamentNumber));
        const release = await guardWrite(uid);
        try {
            return await connection.transaction(async session => {
                const options = { session };
                const stored = await states.findOne({ tournamentNumber }, null, options);
                if (!stored || stored.status !== 'registration' || stored.readinessPolicyVersion) {
                    return { ok: false, reason: 'tourney_cannot_unregister' };
                }
                const user = await profiles.findOne({ firebaseUid: uid }, null, options);
                if (!stored.players.some(player => player.id === uid)) {
                    return { ok: true, alreadyUnregistered: true, user,
                        state: stored.toObject ? stored.toObject() : structuredClone(stored) };
                }
                if (!user || !Number.isSafeInteger(user.balance) || user.balance < 0) {
                    throw new Error('tournament_refund_profile_invalid');
                }
                const state = stored.toObject ? stored.toObject() : structuredClone(stored);
                state.players = state.players.filter(player => player.id !== uid);
                removeFromBracket(uid, state);
                state.pushFlags = { ...state.pushFlags };
                if (state.players.length < 7) delete state.pushFlags.oneSpotLeft;
                const saved = await states.updateOne({ _id: stored._id, status: 'registration', 'players.id': uid }, {
                    $set: { players: state.players, bracket: state.bracket, pushFlags: state.pushFlags }
                }, options);
                if (saved.modifiedCount !== 1) throw new Error('tournament_withdrawal_conflict');
                changeDucats(user, entryFee, maxBalance);
                const refunded = await profiles.findOneAndUpdate({ firebaseUid: uid }, {
                    $set: walletState(user, maxBalance)
                }, { ...options, new: true });
                if (!refunded) throw new Error('tournament_refund_profile_missing');
                return { ok: true, user: refunded, state };
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } finally { release(); }
    }
    return { withdraw };
}

module.exports = { createLegacyTournamentWithdrawals };
