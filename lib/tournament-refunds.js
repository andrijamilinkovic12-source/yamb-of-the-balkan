'use strict';

async function creditTournamentEntry({ collection, options, entry, reason, at, maxBalance }) {
    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0 || !Number.isSafeInteger(entry.refundedAmount)
        || entry.refundedAmount < 0 || entry.refundedAmount > entry.amount) throw new Error('tournament_refund_ledger_invalid');
    let user = await collection('userprofiles').findOne({ firebaseUid: entry.uid }, options);
    if (user && (!Number.isSafeInteger(user.balance) || user.balance < 0)) throw new Error('tournament_refund_balance_invalid');
    const remaining = entry.amount - entry.refundedAmount;
    const capacity = user ? Math.max(0, maxBalance - user.balance) : 0;
    const credit = Math.min(remaining, capacity);
    if (entry.status === 'refunded' && credit === 0) return { user: null, pending: remaining };
    if (credit > 0) {
        user = await collection('userprofiles').findOneAndUpdate({ firebaseUid: entry.uid }, { $inc: { balance: credit } },
            { ...options, returnDocument: 'after', includeResultMetadata: false });
    }
    await collection('tournamententries').updateOne({ _id: entry._id }, { $set: {
        status: 'refunded', refundedAmount: entry.refundedAmount + credit, refundReason: reason, refundRequestedAt: entry.refundRequestedAt || at
    } }, options);
    return { user: credit > 0 ? user : null, pending: remaining - credit };
}

module.exports = { creditTournamentEntry };
