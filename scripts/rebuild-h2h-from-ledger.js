const crypto = require('crypto');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATION_ID = 'h2h-ledger-v1';
const H2H_LEDGER_VERSION = 1;
const ONLINE_MODES = new Set(['random', 'friend_invite', 'challenge', 'tournament', 'online']);
const ACCEPTED_VERIFICATIONS = new Set(['server', 'authenticated_client']);
const VALID_RESULT_TYPES = new Set(['regular', 'technical']);
const MAX_SCORE = 10000;

function safeInt(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function getFinishedAt(match) {
    const value = new Date(match?.finishedAt || match?.createdAt || 0).getTime();
    return Number.isFinite(value) ? value : 0;
}

function normalizeName(value, fallback = 'Igrac') {
    const name = String(value || '').trim().substring(0, 24);
    return name && name !== 'undefined' && name !== 'null' ? name : fallback;
}

function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function createCard(opponent) {
    return {
        name: normalizeName(opponent.name),
        uid: opponent.uid,
        photo: String(opponent.photoUrl || opponent.photo || '').substring(0, 500),
        wins: 0,
        losses: 0,
        draws: 0,
        myTotalScore: 0,
        gamesWithScore: 0,
        myHighScore: 0,
        maxWinMargin: 0,
        maxLossMargin: 0,
        currentWinStreak: 0,
        maxWinStreak: 0
    };
}

function getCard(cards, opponent) {
    if (!cards[opponent.uid]) cards[opponent.uid] = createCard(opponent);
    return cards[opponent.uid];
}

function applyParticipantResult(card, result, score, opponentScore, resultType) {
    if (result === 'win') {
        card.wins += 1;
        card.currentWinStreak += 1;
        card.maxWinStreak = Math.max(card.maxWinStreak, card.currentWinStreak);
        if (resultType === 'regular') card.maxWinMargin = Math.max(card.maxWinMargin, score - opponentScore);
    } else if (result === 'loss') {
        card.losses += 1;
        card.currentWinStreak = 0;
        if (resultType === 'regular') card.maxLossMargin = Math.max(card.maxLossMargin, opponentScore - score);
    } else {
        card.draws += 1;
        card.currentWinStreak = 0;
    }

    if (resultType === 'regular') {
        card.myTotalScore += score;
        card.gamesWithScore += 1;
        card.myHighScore = Math.max(card.myHighScore, score);
    }
}

function getVerifiedDuel(match, profilesByUid) {
    if (!ONLINE_MODES.has(String(match?.mode || '').trim())) return { ok: false, reason: 'not_online' };
    if (!VALID_RESULT_TYPES.has(String(match?.resultType || '').trim())) return { ok: false, reason: 'invalid_type' };
    if (!ACCEPTED_VERIFICATIONS.has(String(match?.verification || '').trim())) return { ok: false, reason: 'unverified' };
    if (!match?.statsComplete) return { ok: false, reason: 'incomplete' };

    const participants = Array.isArray(match.participants) ? match.participants : [];
    if (participants.length !== 2) return { ok: false, reason: 'participant_count' };
    const uids = participants.map(participant => String(participant?.uid || '').trim());
    if (!uids[0] || !uids[1] || uids[0] === uids[1]) return { ok: false, reason: 'identity' };
    if (!profilesByUid.has(uids[0]) || !profilesByUid.has(uids[1])) return { ok: false, reason: 'missing_profile' };

    const resultType = String(match.resultType).trim();
    const scores = participants.map(participant => safeInt(participant.score));
    if (resultType === 'regular' && scores.some(score => score > MAX_SCORE)) return { ok: false, reason: 'invalid_score' };

    let results;
    if (resultType === 'regular') {
        if (scores[0] === scores[1]) results = ['draw', 'draw'];
        else results = scores[0] > scores[1] ? ['win', 'loss'] : ['loss', 'win'];
    } else {
        const submitted = participants.map(participant => String(participant?.result || '').trim());
        if (!((submitted[0] === 'win' && submitted[1] === 'loss') || (submitted[0] === 'loss' && submitted[1] === 'win'))) {
            return { ok: false, reason: 'invalid_technical_result' };
        }
        results = submitted;
    }

    return {
        ok: true,
        resultType,
        participants: participants.map((participant, index) => ({
            uid: uids[index],
            name: normalizeName(profilesByUid.get(uids[index])?.playerName || participant?.name),
            photoUrl: String(profilesByUid.get(uids[index])?.photoUrl || participant?.photoUrl || '').substring(0, 500),
            score: scores[index],
            result: results[index]
        }))
    };
}

function rebuildH2HFromMatches(profiles, matches) {
    const profilesByUid = new Map(profiles.map(profile => [String(profile?.firebaseUid || '').trim(), profile]).filter(([uid]) => uid));
    const rebuilt = new Map();
    const skipped = {};
    const seenMatchIds = new Set();
    let acceptedMatches = 0;

    for (const profile of profiles) rebuilt.set(String(profile.firebaseUid || '').trim(), {});
    const sortedMatches = [...matches].sort((left, right) => {
        const dateDifference = getFinishedAt(left) - getFinishedAt(right);
        return dateDifference || String(left.matchId || '').localeCompare(String(right.matchId || ''));
    });

    for (const match of sortedMatches) {
        const matchId = String(match?.matchId || '').trim();
        if (!matchId || seenMatchIds.has(matchId)) {
            skipped.duplicate_or_missing_match_id = (skipped.duplicate_or_missing_match_id || 0) + 1;
            continue;
        }
        seenMatchIds.add(matchId);

        const duel = getVerifiedDuel(match, profilesByUid);
        if (!duel.ok) {
            skipped[duel.reason] = (skipped[duel.reason] || 0) + 1;
            continue;
        }

        acceptedMatches += 1;
        const [first, second] = duel.participants;
        applyParticipantResult(getCard(rebuilt.get(first.uid), second), first.result, first.score, second.score, duel.resultType);
        applyParticipantResult(getCard(rebuilt.get(second.uid), first), second.result, second.score, first.score, duel.resultType);
    }

    return { rebuilt, acceptedMatches, skipped };
}

function validateRebuiltH2H(rebuilt) {
    const errors = [];
    for (const [uid, cards] of rebuilt) {
        for (const [opponentUid, card] of Object.entries(cards)) {
            const reverse = rebuilt.get(opponentUid)?.[uid];
            if (!reverse) {
                errors.push({ code: 'missing_reverse_card', uid, opponentUid });
                continue;
            }
            if (
                card.wins !== reverse.losses ||
                card.losses !== reverse.wins ||
                card.draws !== reverse.draws ||
                card.gamesWithScore !== reverse.gamesWithScore ||
                card.currentWinStreak > card.maxWinStreak ||
                card.maxWinStreak > card.wins
            ) {
                errors.push({ code: 'asymmetric_or_invalid_card', uid, opponentUid });
            }
        }
    }
    return errors;
}

function buildPlan(profiles, matches) {
    const { rebuilt, acceptedMatches, skipped } = rebuildH2HFromMatches(profiles, matches);
    const changes = [];
    let rebuiltCards = 0;
    let existingCards = 0;
    let profilesWithH2HChange = 0;

    for (const profile of profiles) {
        const uid = String(profile?.firebaseUid || '').trim();
        const nextH2H = rebuilt.get(uid) || {};
        const currentH2H = profile?.h2hStats && typeof profile.h2hStats === 'object' ? profile.h2hStats : {};
        rebuiltCards += Object.keys(nextH2H).length;
        existingCards += Object.keys(currentH2H).length;
        if (stableJson(currentH2H) === stableJson(nextH2H)) continue;
        profilesWithH2HChange += 1;
        changes.push({
            uid,
            playerName: normalizeName(profile?.playerName),
            beforeH2H: currentH2H,
            afterH2H: nextH2H
        });
    }

    const planPayload = changes.map(change => ({ uid: change.uid, afterH2H: change.afterH2H }));
    return {
        migrationId: MIGRATION_ID,
        ledgerVersion: H2H_LEDGER_VERSION,
        generatedAt: new Date().toISOString(),
        acceptedMatches,
        skipped,
        profiles: profiles.length,
        rebuiltCards,
        existingCards,
        profilesWithH2HChange,
        profilesToUpdate: changes.length,
        planHash: crypto.createHash('sha256').update(stableJson(planPayload)).digest('hex'),
        validationErrors: validateRebuiltH2H(rebuilt),
        changes
    };
}

function summarizePlan(plan) {
    return {
        migrationId: plan.migrationId,
        ledgerVersion: plan.ledgerVersion,
        generatedAt: plan.generatedAt,
        acceptedMatches: plan.acceptedMatches,
        skippedMatches: plan.skipped,
        profiles: plan.profiles,
        rebuiltCards: plan.rebuiltCards,
        existingCards: plan.existingCards,
        profilesWithH2HChange: plan.profilesWithH2HChange,
        profilesToUpdate: plan.profilesToUpdate,
        planHash: plan.planHash,
        validationErrors: plan.validationErrors
    };
}

function parseArgs(argv) {
    return {
        apply: argv.includes('--apply'),
        confirmMaintenanceWindow: argv.includes('--confirm-maintenance-window'),
        resume: argv.includes('--resume')
    };
}

async function applyPlan(db, plan, options) {
    if (!options.apply || !options.confirmMaintenanceWindow) {
        throw new Error('Primena zahteva --apply i --confirm-maintenance-window nakon zaustavljanja online partija.');
    }

    const runs = db.collection('statisticsmigrationruns');
    const snapshots = db.collection('h2hledgerbackups');
    await runs.createIndex({ migrationId: 1 }, { unique: true });
    await snapshots.createIndex({ migrationId: 1, firebaseUid: 1 }, { unique: true });

    const existingRun = await runs.findOne({ migrationId: MIGRATION_ID });
    if (existingRun?.state === 'complete') {
        throw new Error(`Migracija ${MIGRATION_ID} je vec zavrsena ${existingRun.completedAt?.toISOString?.() || ''}.`);
    }
    if (existingRun && !options.resume) {
        throw new Error(`Migracija ${MIGRATION_ID} je vec zapoceta (${existingRun.state}); proverite zapis pa nastavite sa --resume.`);
    }

    const now = new Date();
    if (!existingRun) {
        await runs.insertOne({
            migrationId: MIGRATION_ID,
            state: 'preparing_backup',
            plan: summarizePlan(plan),
            startedAt: now,
            updatedAt: now
        });
    } else {
        await runs.updateOne({ migrationId: MIGRATION_ID }, { $set: { state: 'preparing_backup', plan: summarizePlan(plan), updatedAt: now } });
    }

    if (plan.changes.length) {
        await snapshots.bulkWrite(plan.changes.map(change => ({
            updateOne: {
                filter: { migrationId: MIGRATION_ID, firebaseUid: change.uid },
                update: {
                    $setOnInsert: {
                        migrationId: MIGRATION_ID,
                        firebaseUid: change.uid,
                        playerName: change.playerName,
                        h2hStats: change.beforeH2H,
                        snapshotHash: crypto.createHash('sha256').update(stableJson(change.beforeH2H)).digest('hex'),
                        createdAt: now
                    }
                },
                upsert: true
            }
        })), { ordered: true });
    }

    const snapshotCount = await snapshots.countDocuments({ migrationId: MIGRATION_ID });
    if (snapshotCount !== plan.changes.length) {
        throw new Error(`Bekap nije potpun: sacuvano ${snapshotCount}, ocekivano ${plan.changes.length}.`);
    }
    await runs.updateOne({ migrationId: MIGRATION_ID }, { $set: { state: 'applying', backupCount: snapshotCount, updatedAt: new Date() } });

    if (plan.changes.length) {
        await db.collection('userprofiles').bulkWrite(plan.changes.map(change => ({
            updateOne: {
                filter: { firebaseUid: change.uid },
                update: {
                    $set: {
                        h2hStats: change.afterH2H,
                        h2hLedgerVersion: H2H_LEDGER_VERSION,
                        h2hLedgerMigratedAt: new Date()
                    }
                }
            }
        })), { ordered: true });
    }

    const updatedProfiles = await db.collection('userprofiles').find(
        { firebaseUid: { $in: plan.changes.map(change => change.uid) } },
        { projection: { firebaseUid: 1, h2hStats: 1, h2hLedgerVersion: 1 } }
    ).toArray();
    const updatedByUid = new Map(updatedProfiles.map(profile => [String(profile.firebaseUid), profile]));
    const invalidUpdate = plan.changes.find(change => {
        const stored = updatedByUid.get(change.uid);
        return !stored || safeInt(stored.h2hLedgerVersion) !== H2H_LEDGER_VERSION || stableJson(stored.h2hStats || {}) !== stableJson(change.afterH2H);
    });
    if (invalidUpdate) {
        await runs.updateOne({ migrationId: MIGRATION_ID }, { $set: { state: 'verification_failed', failedUid: invalidUpdate.uid, updatedAt: new Date() } });
        throw new Error(`Provera nakon upisa nije prosla za profil ${invalidUpdate.uid}. Bekap je sacuvan; ne nastavljajte bez istrage.`);
    }

    await runs.updateOne({ migrationId: MIGRATION_ID }, {
        $set: {
            state: 'complete',
            appliedProfiles: plan.changes.length,
            completedAt: new Date(),
            updatedAt: new Date()
        }
    });
    return { backupCount: snapshotCount, appliedProfiles: plan.changes.length };
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI nije konfigurisan.');
    const options = parseArgs(process.argv.slice(2));
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    const db = mongoose.connection.db;
    const [profiles, matches] = await Promise.all([
        db.collection('userprofiles').find({}).toArray(),
        db.collection('matchresults').find({}).toArray()
    ]);
    const plan = buildPlan(profiles, matches);
    if (plan.validationErrors.length) {
        throw new Error(`Obnovljene H2H kartice nisu simetricne (${plan.validationErrors.length} gresaka).`);
    }

    if (!options.apply) {
        console.log(JSON.stringify({ mode: 'dry-run', ...summarizePlan(plan) }, null, 2));
        return;
    }

    const applied = await applyPlan(db, plan, options);
    console.log(JSON.stringify({ mode: 'applied', ...summarizePlan(plan), ...applied }, null, 2));
}

if (require.main === module) {
    main()
        .catch(error => {
            console.error(JSON.stringify({ error: error.message }, null, 2));
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.disconnect().catch(() => {});
        });
}

module.exports = {
    H2H_LEDGER_VERSION,
    buildPlan,
    rebuildH2HFromMatches,
    stableJson
};
