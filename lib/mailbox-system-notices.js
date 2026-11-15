'use strict';

const FACEBOOK_NOTICE_ID = 'game:official-facebook-follow-v1';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61588191682382';

// Stable identity preserves each account's read state across deploys. The date
// is written only on first insertion; a restart never creates a second notice.
function systemMailboxNotices(at = Date.now()) {
    return [{ id: FACEBOOK_NOTICE_ID, type: 'facebook_follow', createdAt: at,
        pinned: true, protected: true, action: { type: 'facebook', url: FACEBOOK_URL } }];
}

module.exports = { systemMailboxNotices, FACEBOOK_NOTICE_ID, FACEBOOK_URL };
