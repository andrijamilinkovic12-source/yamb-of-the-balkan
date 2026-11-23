'use strict';

function createAdMobRewardClaims({ connection, receipts, profiles, profileWrites, guardWrite }) {
    async function claim(uid, verification, claimKey, operation) {
        if (!verification?.ok) return verification;
        if (!profileWrites.owns(uid)) {
            return profileWrites.run(uid, () => claim(uid, verification, claimKey, operation));
        }
        if (verification.bypassed) return operation(null);
        const proof = verification.reward;
        if (!proof?._id || !proof.nonce || !claimKey) {
            return { ok: false, reason: 'ad_verification_required', permanent: false };
        }

        const release = await guardWrite(uid);
        try {
            return await connection.transaction(async session => {
                const receipt = await receipts.findOne({ _id: proof._id, uid, nonce: proof.nonce }, null, { session });
                if (!receipt) return { ok: false, reason: 'ad_verification_pending', permanent: false };
                const target = receipt.context === 'game_double' ? receipt.claimData?.matchId
                    : receipt.context === 'daily_double' ? receipt.claimData?.dayKey : '';
                if (target && claimKey !== `${receipt.context}:${target}`) {
                    return { ok: false, reason: 'ad_reward_target_mismatch', permanent: true };
                }
                if (receipt.claimedAt) {
                    if (receipt.claimKey !== claimKey || !receipt.claimResult) {
                        return { ok: false, reason: 'ad_reward_already_claimed', permanent: true };
                    }
                    const user = await profiles.findOne({ firebaseUid: uid }, null, { session });
                    if (!user) return { ok: false, reason: 'profile_not_found', permanent: false };
                    return { ...receipt.claimResult, reward: 0, alreadyClaimed: true,
                        balance: user.balance, pendingDucats: user.pendingDucats, undoTokens: user.undoTokens, user };
                }

                // The receipt and every economic mutation commit or roll back together.
                // Retrying an unknown commit outcome reads the recorded result instead.
                const result = await operation(session);
                if (!result?.ok) return result;
                const { user, ...claimResult } = result;
                const saved = await receipts.updateOne({ _id: receipt._id, uid, claimedAt: null }, {
                    $set: { claimedAt: new Date(), claimedBy: claimKey.split(':')[0], claimKey, claimResult }
                }, { session });
                if (saved.modifiedCount !== 1) throw new Error('ad_reward_claim_conflict');
                return result;
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } finally { release(); }
    }

    return { claim };
}

module.exports = { createAdMobRewardClaims };
