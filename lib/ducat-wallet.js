'use strict';

const nonnegative = value => Math.max(0, Math.floor(Number(value) || 0));

function walletState(user, limit) {
    const total = nonnegative(user.balance) + nonnegative(user.pendingDucats);
    if (!Number.isSafeInteger(total)) throw new Error('wallet_total_out_of_range');
    return { balance: Math.min(limit, total), pendingDucats: Math.max(0, total - limit) };
}

function changeDucats(user, amount, limit) {
    if (!Number.isSafeInteger(amount)) throw new Error('invalid_wallet_amount');
    const current = walletState(user, limit);
    const total = Math.max(0, current.balance + current.pendingDucats + amount);
    if (!Number.isSafeInteger(total)) throw new Error('wallet_total_out_of_range');
    Object.assign(user, { balance: Math.min(limit, total), pendingDucats: Math.max(0, total - limit) });
    return user;
}

function walletUpdate(amount, limit, fields = {}) {
    const total = { $max: [0, { $add: [{ $ifNull: ['$balance', 0] }, { $ifNull: ['$pendingDucats', 0] }, amount] }] };
    return [{ $set: { balance: { $min: [limit, total] }, pendingDucats: { $max: [0, { $subtract: [total, limit] }] }, ...fields } }];
}

module.exports = { walletState, changeDucats, walletUpdate };
