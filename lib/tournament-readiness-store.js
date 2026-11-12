'use strict';

const core = require('../www/tournamentReadinessCore');
const matchNotices = require('../www/tournamentNotificationsCore');
const { createHash } = require('node:crypto');
const { creditTournamentEntry } = require('./tournament-refunds');
const reliability = require('./tournament-reliability');

function createTournamentReadinessStore({ connection, guardWrite, profileWrites, maxBalance, now = Date.now, getRuntimeState, isMatchInPlay = () => false }) {
    const collection = name => connection.db.collection(name);
    const protect = guardWrite || (async () => () => {});

    async function transaction(operation, actorUids = []) {
        if (!profileWrites) return transact(operation);
        // Sweep can refund any current entrant. Acquire every affected wallet
        // before starting the MongoDB snapshot, not from inside that snapshot.
        for (let attempt = 0; attempt < 16; attempt++) {
            const states = await collection('tournamentstates').find({}, { projection: { 'players.id': 1 } }).toArray();
            const uids = [actorUids, states.flatMap(state => (state.players || []).map(player => player.id))];
            try { return await profileWrites.run(uids, () => transact(operation)); }
            catch (error) {
                if (error.message !== 'tournament_profile_scope_changed') throw error;
            }
        }
        throw new Error('tournament_profile_scope_changed');
    }

    function requireScope(uids) {
        if (profileWrites && !profileWrites.owns(uids)) throw new Error('tournament_profile_scope_changed');
    }

    async function transact(operation) {
        const releases = [];
        try {
            return await connection.transaction(async session => {
                const options = { session };
                let original;
                const hold = async value => { releases.push(await protect(value)); };

                async function creditRefund(entry, reason, at) {
                    requireScope(entry.uid);
                    await hold(entry.uid);
                    return creditTournamentEntry({ collection, options, entry, reason, at, maxBalance });
                }

                return operation({
                    async loadState(cycleId) {
                        original = await collection('tournamentstates').findOne({
                            registrationCycleId: cycleId, readinessPolicyVersion: core.VERSION
                        }, options);
                        if (original) await hold(original);
                        if (!original) return null;
                        requireScope((original.players || []).map(player => player.id));
                        const state = { ...original };
                        delete state._id;
                        delete state.__v;
                        return structuredClone(state);
                    },
                    async saveState(state) {
                        const revision = Number(original.readinessRevision || 0);
                        const fields = { ...state, readinessRevision: revision + 1 };
                        delete fields._id;
                        delete fields.__v;
                        const result = await collection('tournamentstates').updateOne({
                            _id: original._id, registrationCycleId: original.registrationCycleId,
                            readinessRevision: revision
                        }, { $set: fields }, options);
                        if (result.matchedCount !== 1) throw new Error('tournament_readiness_revision_conflict');
                        state.readinessRevision = revision + 1;
                    },
                    findEntry(uid, requestId) {
                        return collection('tournamententries').findOne({ cycleId: original.registrationCycleId, uid, requestId }, options);
                    },
                    reliabilityStatus(uid, edition) { return reliability.readStatus(collection, uid, edition, options); },
                    async charge(uid, amount) {
                        requireScope(uid);
                        await hold(uid);
                        return collection('userprofiles').findOneAndUpdate(
                            { firebaseUid: uid, balance: { $gte: amount } }, { $inc: { balance: -amount } },
                            { ...options, returnDocument: 'after', includeResultMetadata: false }
                        );
                    },
                    async createEntry(entry) {
                        await collection('tournamententries').insertOne({ _id: entry.entryId, ...entry }, options);
                    },
                    async refund(entryId, reason, at) {
                        const entry = await collection('tournamententries').findOne({ _id: entryId }, options);
                        if (!entry || !['paid', 'refunded'].includes(entry.status)) throw new Error('tournament_entry_not_refundable');
                        return creditRefund(entry, reason, at);
                    },
                    async startEntry(entryId, at) {
                        const result = await collection('tournamententries').updateOne(
                            { _id: entryId, status: 'paid' }, { $set: { status: 'started', startedAt: at } }, options
                        );
                        if (result.matchedCount !== 1) throw new Error('tournament_entry_not_paid');
                    },
                    async requestConfirmation(entryId, at, deadlineAt) {
                        const result = await collection('tournamententries').updateOne({ _id: entryId, status: 'paid' }, {
                            $set: { readinessRequestedAt: at, readinessDeadlineAt: deadlineAt }
                        }, options);
                        if (result.matchedCount !== 1) throw new Error('tournament_entry_not_paid');
                    },
                    async confirmEntry(entryId, at) {
                        const result = await collection('tournamententries').updateOne({ _id: entryId, status: 'paid' }, {
                            $set: { readinessConfirmedAt: at }
                        }, options);
                        if (result.matchedCount !== 1) throw new Error('tournament_entry_not_paid');
                    },
                    async notice(notice) {
                        await collection('tournamentnotices').updateOne({ _id: notice.noticeId }, {
                            $setOnInsert: { ...notice, pushSentAt: null, readAt: null,
                                obsoleteAt: null, pushLeaseAt: null, nextPushAt: notice.dueAt }
                        }, { ...options, upsert: true });
                    },
                    async audit(row) {
                        await collection('tournamentmatchaudits').updateOne({ _id: row._id }, { $setOnInsert: row }, { ...options, upsert: true });
                    },
                    async settleRefund(entryId) {
                        const entry = await collection('tournamententries').findOne({ _id: entryId, status: 'refunded' }, options);
                        if (!entry) return null;
                        return creditRefund(entry, entry.refundReason, now());
                    }
                });
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } finally {
            releases.forEach(release => release());
        }
    }

    function readinessNotice(notice) {
        return ['readiness_requested', 'readiness_halfway', 'readiness_last_call'].includes(notice.kind);
    }

    async function currentNotice(notice) {
        if (reliability.isNotice(notice)) {
            const state = getRuntimeState ? getRuntimeState() : await collection('tournamentstates').findOne({});
            return reliability.currentNotice(collection, notice, state);
        }
        if (matchNotices.isMatchNotice(notice)) {
            const at = now();
            if (at >= notice.expiresAt || (getRuntimeState && !matchNotices.isCurrent(getRuntimeState(), notice, at))) return false;
            const state = await collection('tournamentstates').findOne({ registrationCycleId: notice.cycleId });
            return matchNotices.isCurrent(state, notice, now());
        }
        if (!readinessNotice(notice)) return true;
        const state = await collection('tournamentstates').findOne({ registrationCycleId: notice.cycleId });
        const player = state?.players?.find(item => item.id === notice.uid && item.entryId === notice.entryId);
        return core.isPrestart(state) && !!player && !core.isReady(player)
            && now() < Number(player.readyDeadlineAt) && now() < Number(state.readiness?.expiresAt);
    }

    function publicNotice(notice) {
        return { noticeId: notice._id, kind: notice.kind, tournamentNumber: notice.tournamentNumber,
            recipientUid: notice.uid,
            entryId: notice.entryId, cycleId: notice.cycleId, deadlineAt: notice.deadlineAt,
            ...(reliability.isNotice(notice) ? { blockedEdition: notice.blockedEdition || null } : {}),
            amount: notice.amount || 0, refundPending: notice.refundPending || 0,
            ...(matchNotices.isMatchNotice(notice) ? {
                round: notice.round, index: notice.index, scheduleId: notice.scheduleId, referenceId: notice.referenceId,
                dueAt: notice.dueAt, expiresAt: notice.expiresAt, scheduledAt: notice.scheduledAt,
                replyDueAt: notice.replyDueAt, resultType: notice.resultType, scoreLabel: notice.scoreLabel, won: notice.won,
                reviewKind: notice.reviewKind
            } : {}) };
    }

    function matchBusy(notice) {
        return matchNotices.isMatchNotice(notice) && !['match_result', 'match_review'].includes(notice.kind)
            && isMatchInPlay(notice.round, notice.index, notice.scheduleId);
    }

    async function saveMatchNotices(rows) {
        if (!rows.length) return [];
        const inbox = collection('tournamentnotices');
        const candidates = rows.map(row => ({ ...row, _id: 'tm:' + createHash('sha256')
            .update(JSON.stringify([row.cycleId, row.scheduleId, row.key, row.referenceId, row.uid])).digest('hex') }));
        const existing = new Set((await inbox.find({ _id: { $in: candidates.map(row => row._id) } }, { projection: { _id: 1 } })
            .toArray()).map(row => row._id));
        const inserted = new Map();
        for (const row of candidates) {
            if (existing.has(row._id) || matchBusy(row)
                || (getRuntimeState && !matchNotices.isCurrent(getRuntimeState(), row, now()))) continue;
            let release;
            try { release = await protect(row.uid); }
            catch (error) {
                if (error.code === 'account_deleted') continue;
                throw error;
            }
            try {
                if (!await currentNotice(row) || matchBusy(row)) continue;
                const result = await inbox.updateOne({ _id: row._id }, { $setOnInsert: { ...row, readAt: null,
                    pushSentAt: null, obsoleteAt: null, pushLeaseAt: null, nextPushAt: row.dueAt,
                    purgeAt: new Date(row.expiresAt + 7 * 86400000) } },
                { upsert: true, writeConcern: { w: 'majority' } });
                if (result.upsertedCount === 1 && !matchBusy(row)) {
                    const key = JSON.stringify([row.uid, row.scheduleId]);
                    if ((inserted.get(key)?.dueAt ?? -Infinity) <= row.dueAt) inserted.set(key, publicNotice(row));
                }
            } finally { release(); }
        }
        return [...inserted.values()];
    }

    async function syncMatchNotices(cycleId) {
        const state = await collection('tournamentstates').findOne({ registrationCycleId: cycleId,
            notificationPolicyVersion: matchNotices.VERSION });
        return saveMatchNotices(matchNotices.collect(state, now(), isMatchInPlay));
    }

    async function getNotices(uid) {
        const rows = await collection('tournamentnotices').find({ uid, readAt: null, obsoleteAt: null,
            $or: [{ kind: { $in: ['readiness_requested', 'readiness_withdrawn', 'readiness_expired', 'readiness_cancelled'] } },
                { dueAt: { $lte: now() } }] })
            .sort({ dueAt: -1 }).limit(30).toArray();
        const result = [];
        const seen = new Set();
        for (const row of rows) {
            const key = readinessNotice(row) ? 'entry:' + row.entryId
                : matchNotices.isMatchNotice(row) ? 'match:' + row.scheduleId : null;
            if (key && seen.has(key)) continue;
            if (!matchBusy(row) && await currentNotice(row)) {
                result.push(publicNotice(row));
                if (key) seen.add(key);
            }
        }
        return result;
    }

    async function acknowledge(uid, noticeId) {
        const release = await protect(uid);
        try {
            const inbox = collection('tournamentnotices');
            const at = now();
            const update = { $set: { readAt: at } };
            const result = await inbox.updateOne({ _id: noticeId, uid, readAt: null }, update);
            if (result.modifiedCount === 1 && noticeId.startsWith('tm:')) {
                const row = await inbox.findOne({ _id: noticeId, uid });
                if (row) await inbox.updateMany({ uid, cycleId: row.cycleId, scheduleId: row.scheduleId,
                    dueAt: { $lt: row.dueAt }, readAt: null }, update);
            }
        } finally { release(); }
    }

    async function deliver(send) {
        const at = now();
        const quiet = matchNotices.inQuietHours(at);
        const rows = await collection('tournamentnotices').find({ pushSentAt: null, obsoleteAt: null,
            ...(quiet ? { nightAllowed: true } : {}),
            nextPushAt: { $lte: at }, $or: [{ pushLeaseAt: null }, { pushLeaseAt: { $lt: at - 120000 } }] })
            .sort({ dueAt: -1 }).limit(50).toArray();
        for (const row of rows) {
            const matchNotice = matchNotices.isMatchNotice(row);
            if (matchBusy(row)) continue;
            let release;
            try { release = await protect(row.uid); }
            catch (error) {
                if (error.code === 'account_deleted') continue;
                throw error;
            }
            try {
                if (!(await currentNotice(row))) {
                    await collection('tournamentnotices').updateOne({ _id: row._id }, { $set: { obsoleteAt: at } });
                    continue;
                }
                // Do not deliver an older reminder after a newer one was sent during catch-up.
                const fresh = await collection('tournamentnotices').findOne({ _id: row._id, obsoleteAt: null });
                if (!fresh) continue;
                if (matchNotice && fresh.readAt != null) {
                    await collection('tournamentnotices').updateOne({ _id: row._id }, { $set: { nextPushAt: row.expiresAt } });
                    continue;
                }
                const lease = await collection('tournamentnotices').updateOne({ _id: row._id, pushSentAt: null, obsoleteAt: null,
                    ...(matchNotice ? { readAt: null } : {}),
                    $or: [{ pushLeaseAt: null }, { pushLeaseAt: { $lt: at - 120000 } }] },
                { $set: { pushLeaseAt: at } });
                if (lease.modifiedCount !== 1) continue;
                let sent = false;
                try {
                    const canSend = (!matchNotices.inQuietHours(now()) || row.nightAllowed)
                        && !matchBusy(row) && (!matchNotice || await currentNotice(row));
                    if (canSend) sent = Number((await send(row.uid, publicNotice(row)))?.sent || 0) > 0;
                }
                catch (_) { /* The durable outbox retries after backoff. */ }
                await collection('tournamentnotices').updateOne({ _id: row._id, pushLeaseAt: at }, {
                    $set: { pushLeaseAt: null, nextPushAt: at + 300000, ...(sent ? { pushSentAt: at } : {}) }
                });
                if (sent && readinessNotice(row)) {
                    await collection('tournamentnotices').updateMany({ entryId: row.entryId,
                        kind: { $in: ['readiness_requested', 'readiness_halfway', 'readiness_last_call'] },
                        dueAt: { $lt: row.dueAt }, obsoleteAt: null }, { $set: { obsoleteAt: at } });
                }
                if (sent && matchNotice) {
                    await collection('tournamentnotices').updateMany({ uid: row.uid, cycleId: row.cycleId,
                        scheduleId: row.scheduleId, dueAt: { $lt: row.dueAt }, obsoleteAt: null }, { $set: { obsoleteAt: at } });
                }
            } finally { release(); }
        }
    }

    async function settleRefunds() {
        const rows = await collection('tournamententries').find({ status: 'refunded',
            $expr: { $lt: ['$refundedAmount', '$amount'] } }).limit(50).toArray();
        const users = [];
        for (const row of rows) {
            const result = await transaction(tx => tx.settleRefund(row._id), [row.uid]);
            if (result?.user) users.push(result.user);
        }
        return users;
    }

    return { transaction, getNotices, acknowledge, deliver, settleRefunds, syncMatchNotices, saveMatchNotices,
        reliabilityStatus: (uid, edition) => reliability.readStatus(collection, uid, edition) };
}

module.exports = { createTournamentReadinessStore };
