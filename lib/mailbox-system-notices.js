'use strict';

const FACEBOOK_NOTICE_ID = 'game:official-facebook-follow-v1';
const REFERRAL_NOTICE_ID = 'game:official-referral-invite-v1';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61588191682382';

// These two permanent notices keep their order even when seeded on different
// deploys. The original Facebook ID/date and each account's read state survive.
const permanentOrder = new Map([[FACEBOOK_NOTICE_ID, 0], [REFERRAL_NOTICE_ID, 1]]);
function compareMailboxMessages(first, second) {
    return Number(!!second.pinned) - Number(!!first.pinned)
        || (first.pinned && second.pinned ? (permanentOrder.get(first.id) ?? 2) - (permanentOrder.get(second.id) ?? 2) : 0)
        || second.createdAt - first.createdAt
        || (first.id < second.id ? 1 : first.id > second.id ? -1 : 0);
}

// Stable identity preserves each account's read state across deploys. The date
// is written only on first insertion; a restart never creates a second notice.
function systemMailboxNotices(at = Date.now()) {
    return [{ id: FACEBOOK_NOTICE_ID, type: 'facebook_follow', createdAt: at,
        pinned: true, protected: true, action: { type: 'facebook', url: FACEBOOK_URL } },
        { id: REFERRAL_NOTICE_ID, type: 'referral_invite', createdAt: at, pinned: true, protected: true }];
}

module.exports = { systemMailboxNotices, compareMailboxMessages, FACEBOOK_NOTICE_ID, REFERRAL_NOTICE_ID, FACEBOOK_URL };
