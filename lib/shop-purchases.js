'use strict';

const { createHash } = require('node:crypto');
const { walletState, changeDucats } = require('./ducat-wallet');

function createShopPurchases({ connection, profiles, purchases, profileWrites, guardWrite, limit,
    itemFor, ownedItems, discountFor, addItem }) {
    async function purchase(uid, input = {}) {
        if (!/^[A-Za-z0-9_-]{12,96}$/.test(input.requestId || '') || typeof input.itemId !== 'string') {
            return { ok: false, reason: 'invalid_purchase', permanent: true };
        }
        if (!profileWrites.owns(uid)) return profileWrites.run(uid, () => purchase(uid, input));
        const item = itemFor(input.itemId);
        if (!item || item.price <= 0 || item.adUnlock || item.themeGift) {
            return { ok: false, reason: 'invalid_shop_item', permanent: true };
        }
        const id = createHash('sha256').update(JSON.stringify([uid, input.requestId])).digest('hex');
        const release = await guardWrite(uid);
        try {
            return await connection.transaction(async session => {
                const previous = await purchases.findOne({ _id: id }, null, { session });
                if (previous && previous.itemId !== item.id) return { ok: false, reason: 'purchase_conflict', permanent: true };
                const user = await profiles.findOne({ firebaseUid: uid }, null, { session });
                if (!user) return { ok: false, reason: 'auth_required' };
                if (previous || ownedItems(user).has(item.id)) {
                    return { ok: true, alreadyPurchased: true, itemId: item.id, price: previous?.price || 0, user };
                }
                if (item.req && !ownedItems(user).has(item.req)) return { ok: false, reason: 'shop_requirement_missing', permanent: true };
                const discount = discountFor(user, item.id);
                const price = discount ? Math.floor(item.price * .8) : item.price;
                if (input.expectedPrice !== price) return { ok: false, reason: 'shop_price_changed', price, permanent: true, user };
                Object.assign(user, walletState(user, limit));
                if (user.balance < price) return { ok: false, reason: 'shop_insufficient_balance', permanent: true, user };
                changeDucats(user, -price, limit);
                addItem(user, item.id);
                if (discount) {
                    const discounts = { ...user.shopDiscounts };
                    delete discounts[item.id];
                    user.shopDiscounts = discounts;
                    user.markModified('shopDiscounts');
                }
                for (const field of ['yamb_unlocked', 'unlockedSkins', 'unlockedEffects']) user.markModified(field);
                await user.save({ session });
                await purchases.create([{ _id: id, uid, requestId: input.requestId, itemId: item.id, price, createdAt: new Date() }], { session });
                return { ok: true, itemId: item.id, price, user };
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } finally { release(); }
    }
    return { purchase };
}

module.exports = { createShopPurchases };
