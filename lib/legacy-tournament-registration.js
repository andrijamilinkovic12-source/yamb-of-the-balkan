'use strict';

const { changeDucats, walletState } = require('./ducat-wallet');
const { trusted } = require('mongoose');

function registrationSnapshotFilter(state) {
    const filter = { tournamentNumber: state.tournamentNumber, status: 'registration',
        readinessPolicyVersion: trusted({ $in: [null, ''] }), players: trusted({ $size: state.players.length }) };
    state.players.forEach((player, index) => { filter['players.' + index + '.id'] = player.id; });
    return filter;
}

function createLegacyTournamentRegistration({ connection, profiles, states, profileWrites, guardWrite,
    entryFee, maxBalance, seatPlayer }) {
    async function register(tournamentNumber, player) {
        const uid = player.id;
        if (!profileWrites.owns(uid)) return profileWrites.run(uid, () => register(tournamentNumber, player));
        const release = await guardWrite(uid);
        try {
            return await connection.transaction(async session => {
                const stored = await states.findOne({ tournamentNumber }, null, { session }).lean();
                if (!stored || stored.readinessPolicyVersion) return { ok: false, reason: 'tourney_readiness_stale' };
                if (stored.players.some(p => p.id === uid)) return { ok: true, alreadyRegistered: true, state: stored };
                if (stored.status !== 'registration' || stored.players.length >= 8) return { ok: false, reason: 'msg_room_full' };

                const user = await profiles.findOne({ firebaseUid: uid }, null, { session });
                if (!user) return { ok: false, reason: 'auth_required' };
                if (!Number.isSafeInteger(user.balance) || user.balance < entryFee) return { ok: false, reason: 'tourney_not_enough_money' };
                seatPlayer(stored, player);
                const debited = await profiles.findOneAndUpdate({ _id: user._id }, {
                    $set: walletState(changeDucats(user, -entryFee, maxBalance), maxBalance)
                }, { session, new: true });
                if (!debited) throw new Error('tournament_entry_profile_missing');
                const { status, players, bracket } = stored;
                const saved = await states.updateOne({ _id: stored._id, status: 'registration' }, {
                    $set: { status, players, bracket }
                }, { session });
                if (saved.modifiedCount !== 1) throw new Error('tournament_registration_conflict');
                return { ok: true, user: debited, state: stored };
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } finally { release(); }
    }
    return { register };
}

module.exports = { createLegacyTournamentRegistration, registrationSnapshotFilter };
