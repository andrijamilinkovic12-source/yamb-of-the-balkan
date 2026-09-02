const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const powerIndexCore = require(path.join(__dirname, '..', 'www', 'powerIndexCore.js'));

const MAX_SCORE = 3500;
const RECENT_MATCH_RESULT_MEMORY = 200;
const SAMPLE_LIMIT = 12;
const ONLINE_MODES = new Set(['random', 'friend_invite', 'challenge', 'tournament', 'online']);
const LOCAL_MODES = new Set(['solo', 'hotseat', 'ai']);

function safeInt(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function normalizeName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function getCurrentLeaguePeriod(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Belgrade',
            year: 'numeric',
            month: 'numeric'
        }).formatToParts(now).map(part => [part.type, part.value])
    );
    const year = Number(parts.year);
    const month = Number(parts.month);
    return { year, quarter: Math.floor((month - 1) / 3) + 1 };
}

function playerLabel(profile) {
    return String(profile?.playerName || 'Nepoznat').trim() || 'Nepoznat';
}

function addIssue(report, severity, code, details = {}) {
    const bucket = report[severity];
    if (!bucket[code]) bucket[code] = { count: 0, samples: [] };
    bucket[code].count += 1;
    if (bucket[code].samples.length < SAMPLE_LIMIT) bucket[code].samples.push(details);
}

function isValidStoredInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && Number.isInteger(number) && number >= 0;
}

function getOpponentUid(key, record, profilesByUid) {
    const recordUid = String(record?.uid || '').trim();
    if (profilesByUid.has(recordUid)) return recordUid;
    const keyUid = String(key || '').trim();
    return profilesByUid.has(keyUid) ? keyUid : '';
}

function findH2HRecord(profile, opponentUid, profilesByUid) {
    for (const [key, record] of Object.entries(profile?.h2hStats || {})) {
        if (getOpponentUid(key, record, profilesByUid) === opponentUid) return record;
    }
    return null;
}

function getTrackedPlayer(map, uid) {
    if (!map.has(uid)) {
        map.set(uid, {
            games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            totalScoreSum: 0,
            highscore: 0,
            penaltyPoints: 0,
            maxWinStreak: 0,
            currentWinStreak: 0,
            matchIds: [],
            h2h: new Map()
        });
    }
    return map.get(uid);
}

function getTrackedH2H(player, opponentUid, opponentName) {
    if (!player.h2h.has(opponentUid)) {
        player.h2h.set(opponentUid, {
            opponentName,
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
        });
    }
    return player.h2h.get(opponentUid);
}

function validateProfiles(profiles, profilesByUid, report) {
    const numericFields = [
        'games', 'wins', 'losses', 'highscore', 'totalScoreSum',
        'currentWinStreak', 'maxWinStreak', 'tournamentWins', 'penaltyPoints'
    ];
    const checkedPairs = new Set();

    for (const profile of profiles) {
        const uid = String(profile.firebaseUid || '').trim();
        const name = playerLabel(profile);
        if (!uid) addIssue(report, 'critical', 'profile_missing_uid', { player: name });

        for (const field of numericFields) {
            if (!isValidStoredInteger(profile[field] || 0)) {
                addIssue(report, 'critical', 'invalid_profile_number', { player: name, field, value: profile[field] });
            }
        }

        const games = safeInt(profile.games);
        const wins = safeInt(profile.wins);
        const losses = safeInt(profile.losses);
        const highscore = safeInt(profile.highscore);
        const totalScoreSum = safeInt(profile.totalScoreSum);
        const currentWinStreak = safeInt(profile.currentWinStreak);
        const maxWinStreak = safeInt(profile.maxWinStreak);
        const h2hSummary = powerIndexCore.summarizeH2H(profile.h2hStats);

        if (highscore > MAX_SCORE) addIssue(report, 'critical', 'profile_highscore_out_of_range', { player: name, highscore });
        if (totalScoreSum > games * MAX_SCORE) {
            addIssue(report, 'critical', 'profile_score_sum_out_of_range', { player: name, games, totalScoreSum });
        }
        if (currentWinStreak > maxWinStreak || maxWinStreak > wins) {
            addIssue(report, 'critical', 'profile_streak_invalid', { player: name, wins, currentWinStreak, maxWinStreak });
        }
        if (h2hSummary.wins !== wins) {
            addIssue(report, 'warning', 'legacy_profile_wins_h2h_mismatch', { player: name, profile: wins, h2h: h2hSummary.wins });
        }
        if (h2hSummary.losses !== losses) {
            addIssue(report, 'warning', 'legacy_profile_losses_h2h_mismatch', { player: name, profile: losses, h2h: h2hSummary.losses });
        }
        if (h2hSummary.games > games) {
            addIssue(report, 'critical', 'h2h_games_exceed_profile_games', { player: name, profileGames: games, h2hGames: h2hSummary.games });
        }
        if (wins + losses > 0 && h2hSummary.games === 0) {
            addIssue(report, 'warning', 'legacy_competitive_profile_without_h2h', { player: name, wins, losses });
        }

        const seenOpponentUids = new Set();
        for (const [key, record] of Object.entries(profile.h2hStats || {})) {
            report.counts.h2hCards += 1;
            const opponentUid = getOpponentUid(key, record, profilesByUid);
            const opponentName = String(record?.name || '').trim();
            if (opponentUid) report.counts.stableH2HCards += 1;
            else report.counts.legacyNameOnlyH2HCards += 1;

            if (!opponentName || ['undefined', 'null', 'nepoznat'].includes(normalizeName(opponentName))) {
                addIssue(report, 'critical', 'invalid_h2h_identity', { player: name, opponent: opponentName || '(empty)' });
            }
            if (String(key).startsWith('guest_') || String(record?.uid || '').startsWith('guest_')) {
                addIssue(report, 'critical', 'guest_h2h_card', { player: name, opponent: opponentName });
            }
            if (opponentUid && opponentUid === uid) {
                addIssue(report, 'critical', 'self_h2h_card', { player: name });
            }
            if (opponentUid && seenOpponentUids.has(opponentUid)) {
                addIssue(report, 'critical', 'duplicate_h2h_opponent', { player: name, opponent: opponentName });
            }
            if (opponentUid) seenOpponentUids.add(opponentUid);

            const winsOnCard = safeInt(record?.wins);
            const lossesOnCard = safeInt(record?.losses);
            const drawsOnCard = safeInt(record?.draws);
            const cardGames = winsOnCard + lossesOnCard + drawsOnCard;
            const gamesWithScore = safeInt(record?.gamesWithScore);
            const myTotalScore = safeInt(record?.myTotalScore);
            const myHighScore = safeInt(record?.myHighScore);
            const currentStreak = safeInt(record?.currentWinStreak);
            const maxStreak = safeInt(record?.maxWinStreak);
            const maxWinMargin = safeInt(record?.maxWinMargin);
            const maxLossMargin = safeInt(record?.maxLossMargin);
            const cardFields = [
                'wins', 'losses', 'draws', 'gamesWithScore', 'myTotalScore',
                'myHighScore', 'currentWinStreak', 'maxWinStreak', 'maxWinMargin', 'maxLossMargin'
            ];

            for (const field of cardFields) {
                if (!isValidStoredInteger(record?.[field] || 0)) {
                    addIssue(report, 'critical', 'invalid_h2h_number', { player: name, opponent: opponentName, field });
                }
            }
            if (gamesWithScore > cardGames) {
                addIssue(report, 'critical', 'h2h_scored_games_exceed_games', { player: name, opponent: opponentName });
            }
            if (myTotalScore > gamesWithScore * MAX_SCORE || myHighScore > MAX_SCORE) {
                addIssue(report, 'critical', 'h2h_score_out_of_range', { player: name, opponent: opponentName });
            }
            if (maxWinMargin > MAX_SCORE || maxLossMargin > MAX_SCORE) {
                addIssue(report, 'critical', 'h2h_margin_out_of_range', { player: name, opponent: opponentName });
            }
            if (currentStreak > maxStreak || maxStreak > winsOnCard) {
                addIssue(report, 'critical', 'h2h_streak_invalid', { player: name, opponent: opponentName });
            }

            if (!opponentUid) continue;
            const pairKey = [uid, opponentUid].sort().join('|');
            if (checkedPairs.has(pairKey)) continue;
            checkedPairs.add(pairKey);
            const opponent = profilesByUid.get(opponentUid);
            const reverse = findH2HRecord(opponent, uid, profilesByUid);
            if (!reverse) {
                addIssue(report, 'critical', 'missing_reverse_h2h_card', { player: name, opponent: playerLabel(opponent) });
                continue;
            }
            report.counts.verifiedH2HPairs += 1;
            const mismatch = {};
            if (winsOnCard !== safeInt(reverse.losses)) mismatch.winsVsLosses = [winsOnCard, safeInt(reverse.losses)];
            if (lossesOnCard !== safeInt(reverse.wins)) mismatch.lossesVsWins = [lossesOnCard, safeInt(reverse.wins)];
            if (drawsOnCard !== safeInt(reverse.draws)) mismatch.draws = [drawsOnCard, safeInt(reverse.draws)];
            if (gamesWithScore !== safeInt(reverse.gamesWithScore)) {
                mismatch.gamesWithScore = [gamesWithScore, safeInt(reverse.gamesWithScore)];
            }
            if (Object.keys(mismatch).length > 0) {
                addIssue(report, 'critical', 'asymmetric_h2h_pair', {
                    player: name,
                    opponent: playerLabel(opponent),
                    mismatch
                });
            }
        }

        const powerIndex = powerIndexCore.calculatePowerIndex(profile);
        if (!Number.isInteger(powerIndex) || powerIndex < 0 || !Number.isFinite(powerIndex)) {
            addIssue(report, 'critical', 'invalid_power_index', { player: name, powerIndex });
        }
        report.counts.minPowerIndex = report.counts.minPowerIndex === null
            ? powerIndex
            : Math.min(report.counts.minPowerIndex, powerIndex);
        report.counts.maxPowerIndex = Math.max(report.counts.maxPowerIndex, powerIndex);
    }
}

function validateMatchShape(match, profilesByUid, report) {
    const participants = Array.isArray(match.participants) ? match.participants : [];
    const stableParticipants = participants.filter(participant => String(participant?.uid || '').trim());
    const matchLabel = String(match.matchId || '').slice(-16);
    const appliedUids = new Set(Array.isArray(match.statsAppliedUids) ? match.statsAppliedUids : []);
    const expectedUids = new Set(stableParticipants.map(participant => String(participant.uid).trim()));

    if (!match.matchId) addIssue(report, 'critical', 'match_missing_id', { match: matchLabel });
    if (!match.statsComplete) addIssue(report, 'critical', 'match_stats_incomplete', { match: matchLabel, mode: match.mode });
    for (const uid of expectedUids) {
        if (!appliedUids.has(uid)) addIssue(report, 'critical', 'match_participant_not_applied', { match: matchLabel, mode: match.mode });
        if (!profilesByUid.has(uid)) addIssue(report, 'critical', 'match_profile_missing', { match: matchLabel, mode: match.mode });
    }
    for (const uid of appliedUids) {
        if (!expectedUids.has(uid)) addIssue(report, 'critical', 'match_applied_to_nonparticipant', { match: matchLabel, mode: match.mode });
    }

    if (match.resultType === 'regular') {
        for (const participant of participants) {
            if (!Number.isInteger(Number(participant.score)) || Number(participant.score) < 0 || Number(participant.score) > MAX_SCORE) {
                addIssue(report, 'critical', 'regular_match_score_invalid', { match: matchLabel, mode: match.mode });
            }
        }
        const scores = participants.map(participant => Number(participant.score));
        const maxScore = scores.length ? Math.max(...scores) : 0;
        const winners = participants.filter(participant => Number(participant.score) === maxScore);
        const expectedDraw = participants.length > 1 && winners.length > 1;
        if (!!match.isDraw !== expectedDraw) addIssue(report, 'critical', 'match_draw_flag_invalid', { match: matchLabel, mode: match.mode });

        participants.forEach(participant => {
            const expectedResult = match.mode === 'solo'
                ? 'solo'
                : (expectedDraw ? 'draw' : (Number(participant.score) === maxScore ? 'win' : 'loss'));
            if (participant.result !== expectedResult) {
                addIssue(report, 'critical', 'match_result_invalid', { match: matchLabel, mode: match.mode });
            }
        });

        if (ONLINE_MODES.has(match.mode) && stableParticipants.length !== 2) {
            addIssue(report, 'critical', 'online_match_identity_invalid', { match: matchLabel, mode: match.mode, stablePlayers: stableParticipants.length });
        }
        if (LOCAL_MODES.has(match.mode) && stableParticipants.length !== 1) {
            addIssue(report, 'critical', 'local_match_identity_invalid', { match: matchLabel, mode: match.mode, stablePlayers: stableParticipants.length });
        }
    } else if (match.resultType === 'technical') {
        const wins = participants.filter(participant => participant.result === 'win').length;
        const losses = participants.filter(participant => participant.result === 'loss').length;
        if (stableParticipants.length !== 2 || wins !== 1 || losses !== 1 || match.isDraw) {
            addIssue(report, 'critical', 'technical_match_result_invalid', { match: matchLabel, mode: match.mode });
        }
    } else {
        addIssue(report, 'critical', 'unknown_match_result_type', { match: matchLabel, resultType: match.resultType });
    }
}

function buildTrackedStatistics(matches, profilesByUid, report) {
    const tracked = new Map();
    const sortedMatches = [...matches].sort((a, b) => new Date(a.finishedAt || a.createdAt) - new Date(b.finishedAt || b.createdAt));

    for (const match of sortedMatches) {
        validateMatchShape(match, profilesByUid, report);
        const stableParticipants = (match.participants || []).filter(participant => String(participant?.uid || '').trim());
        const isDuel = stableParticipants.length === 2;

        for (const participant of stableParticipants) {
            const uid = String(participant.uid).trim();
            const player = getTrackedPlayer(tracked, uid);
            const score = safeInt(participant.score);
            player.games += 1;
            player.matchIds.push(String(match.matchId || ''));

            if (match.resultType === 'regular') {
                player.totalScoreSum += score;
                player.highscore = Math.max(player.highscore, score);
            } else if (participant.result === 'win') {
                player.totalScoreSum += safeInt(match.winnerReward);
            }

            if (isDuel) {
                if (participant.result === 'win') {
                    player.wins += 1;
                    player.currentWinStreak += 1;
                    player.maxWinStreak = Math.max(player.maxWinStreak, player.currentWinStreak);
                } else if (participant.result === 'loss') {
                    player.losses += 1;
                    player.currentWinStreak = 0;
                    if (match.resultType === 'technical') player.penaltyPoints += safeInt(match.penaltyPoints);
                } else if (participant.result === 'draw') {
                    player.draws += 1;
                    player.currentWinStreak = 0;
                }
            }

            if (!isDuel) continue;
            const opponent = stableParticipants.find(candidate => String(candidate.uid).trim() !== uid);
            const h2h = getTrackedH2H(player, String(opponent.uid).trim(), opponent.name);
            const opponentScore = safeInt(opponent.score);
            if (participant.result === 'win') {
                h2h.wins += 1;
                h2h.currentWinStreak += 1;
                h2h.maxWinStreak = Math.max(h2h.maxWinStreak, h2h.currentWinStreak);
                if (match.resultType === 'regular') h2h.maxWinMargin = Math.max(h2h.maxWinMargin, score - opponentScore);
            } else if (participant.result === 'loss') {
                h2h.losses += 1;
                h2h.currentWinStreak = 0;
                if (match.resultType === 'regular') h2h.maxLossMargin = Math.max(h2h.maxLossMargin, opponentScore - score);
            } else if (participant.result === 'draw') {
                h2h.draws += 1;
                h2h.currentWinStreak = 0;
            }
            if (match.resultType === 'regular') {
                h2h.myTotalScore += score;
                h2h.gamesWithScore += 1;
                h2h.myHighScore = Math.max(h2h.myHighScore, score);
            }
        }
    }
    return tracked;
}

function compareTrackedStatistics(profilesByUid, tracked, report) {
    for (const [uid, expected] of tracked) {
        const profile = profilesByUid.get(uid);
        if (!profile) continue;
        const name = playerLabel(profile);
        const lowerBounds = {
            games: expected.games,
            wins: expected.wins,
            losses: expected.losses,
            totalScoreSum: expected.totalScoreSum,
            highscore: expected.highscore,
            penaltyPoints: expected.penaltyPoints,
            maxWinStreak: expected.maxWinStreak
        };

        for (const [field, minimum] of Object.entries(lowerBounds)) {
            if (safeInt(profile[field]) < minimum) {
                addIssue(report, 'critical', 'profile_below_match_ledger', {
                    player: name,
                    field,
                    profile: safeInt(profile[field]),
                    ledgerMinimum: minimum
                });
            }
        }

        if (safeInt(profile.games) === expected.games) {
            report.counts.fullyTrackedProfiles += 1;
        } else {
            report.counts.profilesWithLegacyBaseline += 1;
        }

        const recentIds = new Set(Array.isArray(profile.recentMatchResultIds) ? profile.recentMatchResultIds : []);
        const expectedRecent = expected.matchIds.slice(-RECENT_MATCH_RESULT_MEMORY);
        for (const matchId of expectedRecent) {
            if (!recentIds.has(matchId)) {
                addIssue(report, 'critical', 'recent_profile_ledger_missing_match', { player: name, match: matchId.slice(-16) });
            }
        }
        for (const matchId of recentIds) {
            if (!expected.matchIds.includes(matchId)) {
                addIssue(report, 'critical', 'profile_ledger_has_foreign_match', { player: name, match: String(matchId).slice(-16) });
            }
        }

        for (const [opponentUid, expectedCard] of expected.h2h) {
            const actual = findH2HRecord(profile, opponentUid, profilesByUid);
            if (!actual) {
                addIssue(report, 'critical', 'tracked_duel_missing_h2h_card', { player: name, opponent: expectedCard.opponentName });
                continue;
            }
            const cardLowerBounds = {
                wins: expectedCard.wins,
                losses: expectedCard.losses,
                draws: expectedCard.draws,
                myTotalScore: expectedCard.myTotalScore,
                gamesWithScore: expectedCard.gamesWithScore,
                myHighScore: expectedCard.myHighScore,
                maxWinMargin: expectedCard.maxWinMargin,
                maxLossMargin: expectedCard.maxLossMargin,
                maxWinStreak: expectedCard.maxWinStreak
            };
            for (const [field, minimum] of Object.entries(cardLowerBounds)) {
                if (safeInt(actual[field]) < minimum) {
                    addIssue(report, 'critical', 'h2h_below_match_ledger', {
                        player: name,
                        opponent: expectedCard.opponentName,
                        field,
                        card: safeInt(actual[field]),
                        ledgerMinimum: minimum
                    });
                }
            }
        }
    }
}

function validateScores(scores, matches, report) {
    const scoreByMatchAndPlayer = new Map();
    const matchesById = new Map(matches.map(match => [String(match.matchId || ''), match]));

    for (const score of scores) {
        const key = `${String(score.playerId || score.uid || '')}|${String(score.matchId || '')}`;
        if (score.matchId && scoreByMatchAndPlayer.has(key)) {
            addIssue(report, 'critical', 'duplicate_score_for_match', { player: score.playerName, match: String(score.matchId).slice(-16) });
        }
        if (score.matchId) scoreByMatchAndPlayer.set(key, score);
    }

    for (const match of matches) {
        if (match.resultType !== 'regular' || match.economyEligible !== true) continue;
        for (const participant of match.participants || []) {
            const uid = String(participant?.uid || '').trim();
            const score = safeInt(participant?.score);
            if (!uid || score <= 0) continue;
            const stored = scoreByMatchAndPlayer.get(`${uid}|${String(match.matchId || '')}`);
            if (!stored) {
                addIssue(report, 'critical', 'match_missing_leaderboard_score', {
                    player: participant.name,
                    match: String(match.matchId || '').slice(-16),
                    mode: match.mode
                });
            } else if (safeInt(stored.score) !== score) {
                addIssue(report, 'critical', 'leaderboard_score_mismatch', {
                    player: participant.name,
                    match: String(match.matchId || '').slice(-16),
                    matchScore: score,
                    leaderboardScore: safeInt(stored.score)
                });
            }
        }
    }

    for (const score of scores) {
        if (!score.matchId) continue;
        const match = matchesById.get(String(score.matchId));
        if (!match) {
            addIssue(report, 'critical', 'leaderboard_score_without_match', {
                player: score.playerName,
                match: String(score.matchId).slice(-16)
            });
            continue;
        }
        const uid = String(score.playerId || score.uid || '');
        const participant = (match.participants || []).find(candidate => String(candidate?.uid || '') === uid);
        if (!participant || safeInt(participant.score) !== safeInt(score.score)) {
            addIssue(report, 'critical', 'leaderboard_score_wrong_match_proof', {
                player: score.playerName,
                match: String(score.matchId).slice(-16)
            });
        }
    }
}

function validateLeague(profiles, leagueScores, report) {
    const currentPeriod = getCurrentLeaguePeriod();
    const currentScores = new Map(
        leagueScores
            .filter(score => score.year === currentPeriod.year && score.quarter === currentPeriod.quarter)
            .map(score => [String(score.playerId || ''), score])
    );

    for (const profile of profiles) {
        const league = profile.leagueData || {};
        if (league.year !== currentPeriod.year || league.quarter !== currentPeriod.quarter) {
            if (safeInt(profile.games) > 0) {
                addIssue(report, 'warning', 'profile_league_period_not_current', {
                    player: playerLabel(profile),
                    year: league.year || 0,
                    quarter: league.quarter || 0
                });
            }
            continue;
        }
        const expectedScore = safeInt(league.quarterlyScore);
        const stored = currentScores.get(String(profile.firebaseUid || ''));
        if (expectedScore > 0 && !stored) {
            addIssue(report, 'critical', 'profile_missing_current_league_row', { player: playerLabel(profile), expectedScore });
        } else if (stored && safeInt(stored.score) !== expectedScore) {
            addIssue(report, 'critical', 'league_score_profile_mismatch', {
                player: playerLabel(profile),
                profileScore: expectedScore,
                leaderboardScore: safeInt(stored.score)
            });
        }
    }
}

async function validateIndexes(db, report) {
    const requirements = [
        ['userprofiles', 'firebaseUid_1'],
        ['matchresults', 'matchId_1'],
        ['matchresults', 'gameSessionId_1'],
        ['scores', 'playerId_1_matchId_1'],
        ['leaguescores', 'playerId_1_year_1_quarter_1']
    ];
    for (const [collectionName, indexName] of requirements) {
        const indexes = await db.collection(collectionName).indexes();
        const index = indexes.find(candidate => candidate.name === indexName);
        if (!index || index.unique !== true) {
            addIssue(report, 'critical', 'missing_unique_index', { collection: collectionName, index: indexName });
        }
    }
}

function summarizeIssues(bucket) {
    return Object.fromEntries(Object.entries(bucket).map(([code, value]) => [code, value.count]));
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI nije konfigurisan.');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    const db = mongoose.connection.db;
    const [profiles, matches, scores, leagueScores] = await Promise.all([
        db.collection('userprofiles').find({}).toArray(),
        db.collection('matchresults').find({}).toArray(),
        db.collection('scores').find({}).toArray(),
        db.collection('leaguescores').find({}).toArray()
    ]);

    const report = {
        auditedAt: new Date().toISOString(),
        counts: {
            profiles: profiles.length,
            matches: matches.length,
            scores: scores.length,
            leagueScores: leagueScores.length,
            h2hCards: 0,
            stableH2HCards: 0,
            legacyNameOnlyH2HCards: 0,
            verifiedH2HPairs: 0,
            fullyTrackedProfiles: 0,
            profilesWithLegacyBaseline: 0,
            minPowerIndex: null,
            maxPowerIndex: 0
        },
        currentLeaguePeriod: getCurrentLeaguePeriod(),
        critical: {},
        warning: {}
    };
    const profilesByUid = new Map(profiles.map(profile => [String(profile.firebaseUid || '').trim(), profile]));

    validateProfiles(profiles, profilesByUid, report);

    const matchIds = new Set();
    const gameSessionIds = new Set();
    for (const match of matches) {
        const matchId = String(match.matchId || '');
        if (matchIds.has(matchId)) addIssue(report, 'critical', 'duplicate_match_id', { match: matchId.slice(-16) });
        matchIds.add(matchId);
        const sessionId = String(match.gameSessionId || '');
        if (sessionId && gameSessionIds.has(sessionId)) {
            addIssue(report, 'critical', 'duplicate_game_session_id', { session: sessionId.slice(-16) });
        }
        if (sessionId) gameSessionIds.add(sessionId);
    }

    const tracked = buildTrackedStatistics(matches, profilesByUid, report);
    compareTrackedStatistics(profilesByUid, tracked, report);
    validateScores(scores, matches, report);
    validateLeague(profiles, leagueScores, report);
    await validateIndexes(db, report);

    const output = {
        auditedAt: report.auditedAt,
        counts: report.counts,
        criticalIssueCounts: summarizeIssues(report.critical),
        warningCounts: summarizeIssues(report.warning),
        criticalDetails: report.critical,
        warningDetails: report.warning
    };
    console.log(JSON.stringify(output, null, 2));
    if (Object.keys(report.critical).length > 0) process.exitCode = 1;
}

main()
    .catch(error => {
        console.error(JSON.stringify({ error: error.message }, null, 2));
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
