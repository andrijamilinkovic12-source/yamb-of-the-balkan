'use strict';

// Unfriending changes the relationship on both accounts, never their match
// history, scores or mailbox history. No player-facing notification is created.
async function removeFriendship({ connection, profiles }, uid, targetUid) {
    return connection.transaction(async session => {
        const me = await profiles.findOne({ firebaseUid: uid }).select('friends').session(session).lean();
        if (!me) return { ok: false, reason: 'err_friend_profile_missing' };
        const other = await profiles.findOne({ firebaseUid: targetUid }).select('friends').session(session).lean();
        const related = me.friends?.includes(targetUid) || other?.friends?.includes(uid);
        // A repeated request must not cancel a new friend request that arrived
        // after the original removal was already completed.
        if (!related) return { ok: true, removed: false };
        for (const [recipient, formerFriend] of [[uid, targetUid], [targetUid, uid]]) {
            await profiles.updateOne({ firebaseUid: recipient }, { $pull: {
                friends: formerFriend, friendRequests: formerFriend, friendNotifications: { fromUid: formerFriend }
            } }, { session });
        }
        return { ok: true, removed: true };
    }, { writeConcern: { w: 'majority' } });
}

module.exports = { removeFriendship };
