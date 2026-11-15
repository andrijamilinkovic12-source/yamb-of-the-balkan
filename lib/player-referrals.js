'use strict';

const { randomBytes } = require('node:crypto');
const { appendMail, createMail } = require('./player-mailbox');

const REFERRAL_REWARDS = Object.freeze([3000, 3000, 5000]);
const NEW_ACCOUNT_AGE_MS = 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;

function normalizeReferralCode(value) {
    return typeof value === 'string' && /^[A-F0-9]{12}$/.test(value.trim().toUpperCase())
        ? value.trim().toUpperCase() : '';
}

function createPlayerReferrals({ profiles, matches, enabled, connection, profileWrites, guardWrite, isBlocked, maxBalance, onReward }) {
    async function issueCode(uid) {
        if (!enabled || !uid) return '';
        const profile = await profiles.findOneAndUpdate({ firebaseUid: uid, referralCode: { $exists: false } },
            { $set: { referralCode: randomBytes(6).toString('hex').toUpperCase() } }, { new: true, projection: { referralCode: 1 } });
        if (profile) return profile.referralCode;
        return (await profiles.findOne({ firebaseUid: uid }).select('referralCode').lean())?.referralCode || '';
    }

    async function prepareAttribution(uid, value, getAuthUser) {
        const code = normalizeReferralCode(value);
        if (!enabled || !code) return;
        const inviter = await profiles.findOne({ referralCode: code }).select('firebaseUid referralRewardsClaimed').lean();
        if (!inviter || inviter.firebaseUid === uid || inviter.referralRewardsClaimed >= REFERRAL_REWARDS.length) return;
        const [authUser, priorGame] = await Promise.all([getAuthUser(uid),
            matches.exists({ 'participants.uid': uid, resultType: 'regular' })]);
        const now = new Date();
        const created = Date.parse(authUser?.metadata?.creationTime);
        const age = Number(now) - created;
        if (authUser?.uid !== uid || priorGame ||
            !Number.isFinite(age) || age < 0 || age > NEW_ACCOUNT_AGE_MS ||
            !authUser.providerData?.some(provider => ['google.com', 'facebook.com'].includes(provider.providerId)) ||
            await isBlocked(inviter.firebaseUid)) return;
        return { inviterUid: inviter.firebaseUid, startedAt: now, checkAfter: now };
    }

    async function settle(candidate, now) {
        const uid = candidate.firebaseUid;
        const { inviterUid, startedAt } = candidate.referral;
        const match = await matches.findOne({
            resultType: 'regular', verification: 'server', economyEligible: true,
            'participants.uid': uid, statsAppliedUids: uid, createdAt: { $gte: startedAt }
        }).sort({ createdAt: 1 }).select('matchId').lean();
        if (!match) return false;

        return profileWrites.run([uid, inviterUid], async () => {
            const release = await guardWrite([uid, inviterUid]);
            try {
                return await connection.transaction(async session => {
                    const claimFilter = { firebaseUid: uid, 'referral.inviterUid': inviterUid,
                        'referral.startedAt': startedAt, 'referral.settledAt': { $exists: false } };
                    const claim = await profiles.findOne(claimFilter).select('referral').session(session).lean();
                    if (!claim) return false;
                    const inviter = await profiles.findOne({ firebaseUid: inviterUid })
                        .select('balance referralRewardsClaimed').session(session).lean();
                    if (!inviter) {
                        await profiles.updateOne(claimFilter, { $unset: { referral: 1 } }, { session });
                        return false;
                    }
                    const paidCount = inviter.referralRewardsClaimed ?? 0;
                    if (!Number.isSafeInteger(paidCount) || paidCount < 0) throw new Error('invalid_referral_count');
                    const reward = REFERRAL_REWARDS[paidCount] || 0;
                    if (!reward) {
                        await profiles.updateOne(claimFilter, {
                            $set: { 'referral.settledAt': now, 'referral.reward': 0, 'referral.outcome': 'limit_reached' },
                            $unset: { 'referral.checkAfter': 1 }
                        }, { session });
                        return false;
                    }
                    const balance = Math.max(0, Number(inviter.balance) || 0);
                    if (balance > maxBalance - reward) return false;
                    const marker = await profiles.updateOne(claimFilter, {
                        $set: { 'referral.settledAt': now, 'referral.reward': reward,
                            'referral.rewardNumber': paidCount + 1, 'referral.outcome': 'rewarded' },
                        $unset: { 'referral.checkAfter': 1 }
                    }, { session });
                    if (!marker.modifiedCount) return false;
                    const mail = createMail('referral_reward', { reward, rank: paidCount + 1 });
                    const credited = await profiles.updateOne({ firebaseUid: inviterUid }, {
                        $set: { balance: balance + reward }, $inc: { referralRewardsClaimed: 1 },
                        $push: { playerMailbox: appendMail(mail) }
                    }, { session });
                    if (credited.modifiedCount !== 1) throw new Error('referral_credit_failed');
                    return true;
                });
            } finally { release(); }
        });
    }

    async function processDue(now = new Date()) {
        if (!enabled || connection.readyState !== 1) return 0;
        const candidates = await profiles.find({ 'referral.checkAfter': { $lte: now }, 'referral.settledAt': { $exists: false } })
            .sort({ 'referral.checkAfter': 1 }).limit(50).select('referral firebaseUid').lean();
        let rewarded = 0;
        for (const candidate of candidates) {
            const { firebaseUid, referral } = candidate;
            const reservation = await profiles.updateOne({ _id: candidate._id,
                'referral.checkAfter': referral.checkAfter }, {
                $set: { 'referral.checkAfter': new Date(Number(now) + RETRY_MS) }
            });
            if (!reservation.modifiedCount) continue;
            try {
                if (await settle(candidate, now)) {
                    rewarded += 1;
                    await onReward(referral.inviterUid);
                }
            } catch (error) {
                if (error.code !== 'account_deleted') console.warn('[Referral] Retry required:', error.code || error.name);
            }
        }
        return rewarded;
    }

    async function wake(uid) {
        if (!enabled) return;
        await profiles.updateOne({ firebaseUid: uid, 'referral.checkAfter': { $exists: true } },
            { $min: { 'referral.checkAfter': new Date() } });
    }

    return { issueCode, prepareAttribution, processDue, wake };
}

module.exports = { createPlayerReferrals, normalizeReferralCode, REFERRAL_REWARDS };
