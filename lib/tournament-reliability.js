'use strict';
const { createHash } = require('node:crypto');
const core = require('../www/tournamentReliabilityCore');
const clock = require('../www/tournamentReadinessCore');

const WINDOW = 3;
const REASONS = new Set(['verified_no_show', 'unanswered_valid_proposal', 'both_inactive']);

function decide(previous, edition, appearancesSinceWarning) {
    if (!Number.isSafeInteger(edition) || edition < 1 || (previous?.lastIncidentEdition || 0) >= edition) return null;
    const repeat = previous?.warningEdition > 0 && appearancesSinceWarning >= 1 && appearancesSinceWarning <= WINDOW;
    return { warningEdition: repeat ? null : edition, blockedEdition: repeat ? edition + 1 : null,
        lastIncidentEdition: edition, kind: repeat ? 'reliability_suspension' : 'reliability_warning' };
}

async function officialAppearances(collection, uid, afterEdition, throughEdition, options) {
    if (!Number.isSafeInteger(afterEdition) || afterEdition < 1) return 0;
    const editions = await collection('tournamententries').distinct('tournamentNumber', { uid, startedAt: { $gt: 0 },
        tournamentNumber: { $gt: afterEdition, $lte: throughEdition } }, options);
    return editions.length;
}

async function recordIncidents({ collection, options, incident }) {
    if (!incident || !REASONS.has(incident.reason) || !Array.isArray(incident.inactiveUids)) return;
    const ledger = collection('tournamentreliabilities');
    for (const uid of new Set(incident.inactiveUids)) {
        if (typeof uid !== 'string' || !uid || uid.startsWith('deleted_')) continue;
        const previous = await ledger.findOne({ _id: uid }, options);
        if ((previous?.lastIncidentEdition || 0) >= incident.tournamentNumber) continue;
        const entry = await collection('tournamententries').findOne({ uid, cycleId: incident.cycleId,
            tournamentNumber: incident.tournamentNumber, startedAt: { $gt: 0 } }, options);
        if (!entry) throw new Error('tournament_reliability_appearance_missing');
        const count = await officialAppearances(collection, uid, previous?.warningEdition, incident.tournamentNumber, options);
        const decision = decide(previous, incident.tournamentNumber, count);
        if (!decision) continue;
        const { kind, ...status } = decision;
        await ledger.updateOne({ _id: uid }, { $set: { uid, ...status, updatedAt: incident.at } }, { ...options, upsert: true });
        const noticeId = 'tr:' + createHash('sha256').update(JSON.stringify([uid, incident.tournamentNumber, kind])).digest('hex');
        const dueAt = clock.windowAt(incident.at).start;
        await collection('tournamentnotices').updateOne({ _id: noticeId }, { $setOnInsert: { _id: noticeId, noticeId, uid, kind,
            cycleId: incident.cycleId, entryId: entry.entryId, tournamentNumber: incident.tournamentNumber,
            blockedEdition: decision.blockedEdition, createdAt: incident.at, dueAt, nextPushAt: dueAt, pushSentAt: null,
            obsoleteAt: null, readAt: null, pushLeaseAt: null } }, { ...options, upsert: true });
    }
}

async function readStatus(collection, uid, edition, options) {
    const row = await collection('tournamentreliabilities').findOne({ _id: uid }, options);
    const blockedEdition = row?.blockedEdition >= edition ? row.blockedEdition : null;
    const appearances = await officialAppearances(collection, uid, row?.warningEdition, edition, options);
    return { blocked: blockedEdition === edition, blockedEdition,
        warningEdition: row?.warningEdition && appearances < WINDOW ? row.warningEdition : null };
}

async function currentNotice(collection, notice, state) {
    const row = await collection('tournamentreliabilities').findOne({ _id: notice.uid });
    if (row?.lastIncidentEdition !== notice.tournamentNumber) return false;
    if (notice.kind === 'reliability_suspension') {
        return row.blockedEdition === notice.blockedEdition && Number(state?.tournamentNumber || 0) <= row.blockedEdition;
    }
    return row.warningEdition === notice.tournamentNumber
        && await officialAppearances(collection, notice.uid, row.warningEdition, Number(state?.tournamentNumber || 0)) < WINDOW;
}

module.exports = { ...core, WINDOW, decide, readStatus, recordIncidents, currentNotice };
