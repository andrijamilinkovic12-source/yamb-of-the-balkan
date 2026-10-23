const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const game = read('www/game.js');
const server = read('server.js');
const html = read('www/index.html');
const css = read('www/theme-online-random-finish.css');
const languages = read('www/languages.js');
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const manifest = JSON.parse(read('source-assets/theme-online-rematch-v1/manifest.json'));
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const modeSource = server.match(/^function getOnlineDuelType\(roomId = ''\) \{[\s\S]*?^\}/m)?.[0];
assert(modeSource);
const duelMode = vm.runInNewContext(`(${modeSource})`);
assert.equal(duelMode('room_qa'), 'random', 'matchmaking room must use random mode');
assert.equal(duelMode('yamb-friend-qa'), 'friend_invite');
assert.equal(duelMode('duel_chat_qa'), 'challenge');
assert.equal(duelMode('tourney_qf_0_qa'), 'tournament');

assert.equal(manifest.assets.length, 10);
assert.deepEqual(manifest.assets.map(item => item.theme), themes);
assert.equal(new Set(manifest.assets.map(item => item.masterSha256)).size, 10,
    'each theme needs an independently generated rematch glyph');
assert.equal(new Set(manifest.assets.map(item => item.buttonSha256)).size, 10);
assert(definitions.onlineDuelFinishRules?.rematchAssets.includes('source-assets/theme-online-rematch-v1/manifest.json'));
for (const item of manifest.assets) {
    const expectedDirection = ['dark', 'medium', 'amethyst', 'desert', 'moon'].includes(item.theme)
        ? 'clay' : 'smooth_rubber_matte_plastic';
    assert.equal(item.direction, expectedDirection, `${item.theme}: wrong material direction`);
    for (const [role, width, height] of [['icon', 256, 256], ['button', 768, 128]]) {
        const bytes = fs.readFileSync(path.join(root, item[role]));
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), width, `${item.theme}/${role}: wrong width`);
        assert.equal(bytes.readUInt32BE(20), height, `${item.theme}/${role}: wrong height`);
        assert.equal(bytes[25], 6, `${item.theme}/${role}: must be RGBA PNG`);
        assert.equal(sha256(bytes), item[`${role}Sha256`], `${item.theme}/${role}: digest mismatch`);
    }
    assert.equal(sha256(fs.readFileSync(path.join(root, item.master))), item.masterSha256);
    assert(game.includes(item.theme === 'dark' ? 'assets/green-soft-clay/canonical/online-random-rematch/'
        : 'assets/theme-packs/${theme}/canonical/online-random-rematch/'));
}

const button = html.match(/<button id="btn-rematch"[\s\S]*?<\/button>/)?.[0];
assert(button && button.includes('go-rematch-icon') && button.includes('go-rematch-label'));
assert(!/<svg\b|<use\b|🔄|background:/.test(button), 'no old SVG/emoji/CSS graphic in Rematch button');
assert(html.indexOf('id="btn-rematch"') > html.indexOf('id="go-claim-label"'), 'Rematch must be at the bottom');
assert(css.includes('#game-over-screen.is-online-duel-result #btn-rematch:not([hidden])'));
assert(css.includes('background-image: var(--online-rematch-button-image) !important'));
assert(css.includes('min-height: 44px'));
assert(/@media \(max-height:\s*700px\)/.test(css)
    && /display:\s*grid\s*!important/.test(css)
    && /#game-over-screen\.is-solo-result\.is-online-duel-result \.game-over-claim-button\s*\{[^}]*grid-column:\s*1/s.test(css)
    && /#game-over-screen\.is-online-duel-result #btn-rematch:not\(\[hidden\]\)\s*\{[^}]*grid-column:\s*2/s.test(css),
    'short online finish must fit Claim and Rematch in one row without scrolling');
assert(!/overflow-y:\s*auto/.test(css), 'online finish must not introduce scrolling');
assert(game.includes("gameOverScreen.classList.toggle('is-solo-result', isSharedFinish)"));
assert(game.includes("gameOverScreen.classList.toggle('is-hotseat-result', isHeadToHeadFinish)"));
assert(game.includes("gameOverScreen.classList.toggle('is-online-duel-result', isOnlineDuelFinish)"));
assert(game.includes('const isOnlineDuelFinish = this.onlineMode && !this.isSpectator'));
assert(game.includes('const isSharedFinish = isLocalFinish || isOnlineDuelFinish'));
assert(game.includes("this.prepareThemeRoomAssets('gameOver', { root: document.getElementById('game-over-screen') })"));
const roomSourcesMethod = game.match(/^    getThemeRoomSources\(theme, roomId\) \{[\s\S]*?(?=^    collectThemeSourcesFromRoot\()/m)?.[0];
assert(roomSourcesMethod);
const getThemeRoomSources = vm.runInNewContext(`({${roomSourcesMethod}}).getThemeRoomSources`);
for (const duelType of ['random', 'friend_invite', 'challenge', 'tournament', 'online']) {
    const sources = getThemeRoomSources.call({
        onlineMode: true, onlineDuelType: duelType,
        getThemeLoadingPack: () => ({ assets: [] }),
        getThemeAssetRoot: () => 'assets/theme-packs/neon/',
        getOnlineRematchSource: (_theme, role) => `rematch-${role}`,
        getRewardedVideoPackSources: () => ['rewarded-video']
    }, 'neon', 'gameOver');
    assert(sources.includes('rematch-icon') && sources.includes('rematch-button'));
    assert(sources.some(source => source.includes('solo-results/record-panel-v2.png')));
    assert(sources.some(source => source.includes('solo-record-icons/all_time-v1.png')));
    assert(sources.some(source => source.includes('statistics-overview/power-index-v1.png')));
    assert(sources.includes('rewarded-video'), `${duelType}: shared finish assets were not preloaded`);
}
assert(game.includes("? (index === 0 ? 'go_online_you' : 'go_online_opponent')"));
assert(game.includes("if (isHeadToHeadFinish && finalResults.length === 2)"));
assert(game.includes('this.lastOnlineGameResult = null;') && game.includes("this.soloFinishMatchId = '';"));
assert(game.includes("if (this.roomId) localStorage.setItem('yamb_active_online_room', this.roomId)"));
assert(game.includes("const result = await this.emitSocketAck('request_rematch', {}, 8000)"));
assert(game.includes("const response = await this.emitSocketAck('accept_rematch', {}, 8000)"));
assert(game.includes('this.claimPendingBaseRewardBeforeRematch()'));
assert(game.includes('const showRematch = !isTournament || isDraw;'));
assert(game.includes('this.lastOnlineGameResult?.isDraw !== true'));
for (const key of ['go_online_you', 'go_online_opponent', 'go_rematch', 'go_rematch_waiting',
    'go_tourney_replay', 'go_tourney_replay_waiting', 'go_tourney_replay_ask',
    'go_tourney_replay_started', 'go_tourney_replay_declined', 'go_tourney_replay_unavailable',
    'go_rematch_unavailable', 'go_exit_after_claim']) {
    assert.equal([...languages.matchAll(new RegExp(`"${key}":`, 'g'))].length, 2, `${key}: missing localization`);
}

const tournamentRoomId = 'tourney_f_0_test';
const tournamentMatch = {
    p1: { id: 'uid-A' }, p2: { id: 'uid-B' }, winnerId: null,
    rematchRequired: true, lastDrawRoomId: tournamentRoomId, lastDrawMatchId: 'draw-match'
};
const tournamentState = { status: 'active' };
const tournamentRoom = { gameFinished: true, players: ['A', 'B'], matchId: 'draw-match', scores: [400, 400] };
const drawGuardSource = server.match(/^function isTournamentDrawRematchAllowed\(roomId, state\) \{[\s\S]*?^\}/m)?.[0];
assert(drawGuardSource, 'server tournament draw guard missing');
const isTournamentDrawRematchAllowed = vm.runInNewContext(`(${drawGuardSource})`, {
    tournamentState,
    parseTournamentRoomId: id => id === tournamentRoomId ? { round: 'f', index: 0 } : null,
    getTournamentMatch: () => ({ match: tournamentMatch }),
    getTournamentRoomMatchScores: (_id, stateMatch) => stateMatch === tournamentMatch
        ? { p1Score: tournamentRoom.scores[0], p2Score: tournamentRoom.scores[1] } : null
});
assert.equal(isTournamentDrawRematchAllowed(tournamentRoomId, tournamentRoom), true);
tournamentRoom.scores = [401, 400];
assert.equal(isTournamentDrawRematchAllowed(tournamentRoomId, tournamentRoom), false, 'a win cannot be replayed');
tournamentRoom.scores = [400, 400];
tournamentMatch.winnerId = 'uid-A';
assert.equal(isTournamentDrawRematchAllowed(tournamentRoomId, tournamentRoom), false, 'bracket winner blocks replay');
tournamentMatch.winnerId = null;
tournamentRoom.matchId = 'stale-match';
assert.equal(isTournamentDrawRematchAllowed(tournamentRoomId, tournamentRoom), false, 'stale room result cannot replay');
tournamentRoom.matchId = 'draw-match';
tournamentState.status = 'finished';
assert.equal(isTournamentDrawRematchAllowed(tournamentRoomId, tournamentRoom), false, 'finished tournament blocks replay');
tournamentState.status = 'active';

// Exercise the actual server handlers with two connected sockets and a finished room.
const handlers = server.match(/    socket\.on\('request_rematch',[\s\S]*?(?=    socket\.on\('tourney_reset')/)?.[0];
assert(handlers, 'server rematch handlers missing');
const roomId = 'online-test';
const state = { gameFinished: false, players: ['A', 'B'] };
const roomState = { [roomId]: state };
const playerRooms = { A: roomId, B: roomId };
const sockets = new Map(['A', 'B'].map(id => [id, { rooms: new Set([roomId]), playerName: id }]));
const delivered = [];
const io = {
    sockets: { sockets: { get: id => sockets.get(id) } },
    to: id => ({ emit: (name, payload) => delivered.push([id, name, payload]) }),
    in: id => ({ emit: (name, payload) => delivered.push([id, name, payload]) })
};
const registered = {};
for (const id of ['A', 'B']) {
    const socket = { id, on: (name, callback) => { registered[id] ??= {}; registered[id][name] = callback; },
        to: target => ({ emit: (name, payload) => delivered.push([target, name, payload]) }) };
    vm.runInNewContext(handlers, {
        socket, roomState, playerRooms, io, gameStartTimes: {},
        getOnlineDuelType: id => id.startsWith('tourney_') ? 'tournament' : 'random',
        isTournamentDrawRematchAllowed,
        getSocketUid: socketId => `uid-${socketId}`, createServerMatchId: () => 'new-match',
        createEmptyScores: () => ({ reset: true }), startTurnTimer: () => {},
        clearFinishedRoomCleanup: () => {},
        notifyOnlinePlayersStatusChanged: () => {}, console, Date, Array, Number
    });
}
const ack = (id, event, payload = {}) => {
    let response;
    registered[id][event](payload, result => { response = result; });
    return response;
};
assert.equal(ack('A', 'request_rematch').ok, false, 'unfinished room must reject rematch');
roomState[roomId].gameFinished = true;
assert.equal(ack('A', 'request_rematch').ok, true);
assert(delivered.some(([, name]) => name === 'rematch_requested'));
assert.equal(ack('A', 'accept_rematch').ok, false, 'requester cannot accept own request');
registered.B.decline_rematch();
assert(delivered.some(([target, name]) => target === 'A' && name === 'rematch_declined'));
assert.equal(ack('A', 'request_rematch').ok, true);
assert.equal(ack('B', 'accept_rematch').ok, true);
assert.equal(roomState[roomId].matchId, 'new-match');
assert.equal(roomState[roomId].gameFinished, undefined);
assert.equal(roomState[roomId].allScores.reset, true);
assert(delivered.some(([target, name]) => target === roomId && name === 'rematch_started'));
roomState[tournamentRoomId] = tournamentRoom;
playerRooms.A = tournamentRoomId;
playerRooms.B = tournamentRoomId;
sockets.get('A').rooms.add(tournamentRoomId);
sockets.get('B').rooms.add(tournamentRoomId);
assert.equal(ack('A', 'request_rematch').ok, true, 'drawn tournament game permits a consented replay');
assert.equal(ack('B', 'accept_rematch').ok, true);
assert.equal(roomState[tournamentRoomId].matchId, 'new-match', 'tournament replay needs a new matchId');
assert.equal(roomState[tournamentRoomId].gameFinished, undefined, 'replay must start as an unfinished game');
roomState[tournamentRoomId].gameFinished = true;
tournamentMatch.winnerId = 'uid-A';
assert.equal(ack('A', 'request_rematch').ok, false, 'completed bracket cannot start another replay');
tournamentMatch.winnerId = null;
playerRooms.A = roomId;
playerRooms.B = roomId;

// Online personal best must query only this UID's Online results; local best keeps Solo/Hotseat.
const classifyMethod = server.match(/^async function getSoloRecordAchievementsBeforeInsert\(uid, score, recordDate, snapshots, mode = 'Solo'\) \{[\s\S]*?^\}/m)?.[0];
assert(classifyMethod);
let queried;
const classify = vm.runInNewContext(`(${classifyMethod})`, {
    Score: { findOne: query => { queried = query; return { sort() { return this; }, select() { return this; },
        async lean() { return { score: 100 }; } }; } },
    LEADERBOARD_RECORD_PERIODS: [], getLeaderboardPeriodStart: () => null,
    normalizeSoloRecordAchievements: value => value, toSafeInt: Number, Math
});
(async () => {
    const recordDrawSource = server.match(/^async function recordTournamentDrawReplay\(roomId\) \{[\s\S]*?^\}/m)?.[0];
    assert(recordDrawSource, 'tournament draw recorder missing');
    const drawRoomState = { [tournamentRoomId]: { matchId: 'draw-one' } };
    const drawMatch = { p1: { id: 'uid-A' }, p2: { id: 'uid-B' }, winnerId: null, drawCount: 0 };
    const recordDraw = vm.runInNewContext(`(${recordDrawSource})`, {
        roomState: drawRoomState,
        parseTournamentRoomId: id => id === tournamentRoomId ? { round: 'f', index: 0 } : null,
        getTournamentMatch: () => ({ match: drawMatch }),
        getTournamentRoomMatchScores: () => ({ p1Score: 400, p2Score: 400 }),
        saveTournamentToDb: async () => {}, io: { emit() {} }, tournamentState: {},
        toSafeInt: Number, Date
    });
    assert.equal(await recordDraw(tournamentRoomId), true);
    assert.equal(await recordDraw(tournamentRoomId), false, 'duplicate settlement must not count twice');
    drawRoomState[tournamentRoomId].matchId = 'draw-two';
    assert.equal(await recordDraw(tournamentRoomId), true, 'second draw in the same room must count');
    assert.equal(drawMatch.drawCount, 2);
    assert.equal(drawMatch.lastDrawMatchId, 'draw-two');

    const claimMethod = game.match(/^    async claimReward\(doubled\) \{[\s\S]*?(?=^    getBest5\()/m)?.[0];
    assert(claimMethod, 'claimReward method missing');
    const claimReward = vm.runInNewContext(`({${claimMethod}}).claimReward`, {
        document: { getElementById: () => ({ classList: { contains: () => true } }) }
    });
    let exitCount = 0;
    await claimReward.call({ onlineMode: true, rewardClaimed: true, showMainMenu: () => { exitCount++; } }, false);
    assert.equal(exitCount, 1, 'after a doubled claim, Exit must leave without requesting the reward again');
    const elements = {
        'game-over-screen': { classList: { contains: name => name === 'is-online-duel-result' } },
        'btn-ad-double': { style: { display: 'flex' } },
        'go-claim-label': { dataset: {}, textContent: '' }
    };
    const liveClaim = vm.runInNewContext(`({${claimMethod}}).claimReward`, {
        document: { getElementById: id => elements[id] || null },
        window: {}, gt: key => key, dukatIconHtml: () => '', console, parseInt
    });
    let menuVisits = 0;
    let serverClaims = 0;
    let appliedBalance = 0;
    const app = {
        onlineMode: true, rewardClaimed: false, rewardClaimInProgress: false,
        pendingScore: 250, pendingRewardMatchId: 'finished-match', lastGameType: 'normal',
        socket: { connected: true },
        ensurePendingRewardMatchSubmitted: async () => ({ ok: true }),
        claimServerGameReward: async () => { serverClaims++; return { ok: true, reward: 550, balance: 10550 }; },
        applyAuthoritativeGameRewardBalance: balance => { appliedBalance = balance; },
        forgetPendingGameReward() {},
        modal: { alert: async () => {} },
        showMainMenu: () => { menuVisits++; },
        soundMgr: { win() {} }, effectMgr: { trigger() {}, stop() {} }
    };
    await liveClaim.call(app, true);
    await Promise.resolve();
    assert.equal(serverClaims, 1, 'double reward must be requested exactly once');
    assert.equal(appliedBalance, 10550, 'double reward must use the confirmed server balance');
    assert.equal(app.rewardClaimed, true);
    assert.equal(menuVisits, 0, 'double payout must leave Rematch available');
    assert.equal(elements['btn-ad-double'].style.display, 'none');
    assert.equal(elements['go-claim-label'].textContent, 'go_exit_after_claim');
    await liveClaim.call(app, false);
    assert.equal(menuVisits, 1, 'Exit after double must leave the finish screen');
    assert.equal(serverClaims, 1, 'Exit after double must not request another payout');

    let forgotten = '';
    const zeroScoreApp = {
        onlineMode: true, rewardClaimed: false, lastGameType: 'normal',
        pendingScore: 0, pendingRewardMatchId: 'zero-match',
        forgetPendingGameReward: matchId => { forgotten = matchId; },
        showMainMenu: () => { menuVisits++; },
        claimServerGameReward: () => { throw new Error('zero score must not request a payout'); }
    };
    await liveClaim.call(zeroScoreApp, false);
    assert.equal(zeroScoreApp.rewardClaimed, true);
    assert.equal(forgotten, 'zero-match');
    assert.equal(menuVisits, 2, 'zero-point game must leave without a reward request');
    const baseMethod = game.match(/^    async claimPendingBaseRewardBeforeRematch\(\) \{[\s\S]*?(?=^    async claimPendingRewardBeforeExternalNavigation)/m)?.[0];
    assert(baseMethod, 'base reward claim before Rematch missing');
    const stored = new Map();
    const baseClaim = vm.runInNewContext(`({${baseMethod}}).claimPendingBaseRewardBeforeRematch`, {
        document: { getElementById: id => elements[id] || null },
        window: {}, gt: key => key, console, parseInt,
        localStorage: { setItem: (key, value) => stored.set(key, String(value)) }
    });
    elements['btn-ad-double'].style.display = 'flex';
    elements['go-claim-label'].textContent = 'Preuzmi i izađi';
    let baseClaims = 0;
    const waitingForRematch = {
        onlineMode: true, lastGameType: 'normal', rewardClaimed: false,
        pendingScore: 250, pendingRewardMatchId: 'base-match',
        ensurePendingRewardMatchSubmitted: async () => ({ ok: true }),
        claimServerGameReward: async () => { baseClaims++; return { ok: true, reward: 250, balance: 10250 }; },
        forgetPendingGameReward() {}
    };
    assert.equal(await baseClaim.call(waitingForRematch), true);
    assert.equal(baseClaims, 1);
    assert.equal(stored.get('yamb_dukati'), '10250');
    assert.equal(elements['btn-ad-double'].style.display, 'none', 'Rematch wait must hide spent double option');
    assert.equal(elements['go-claim-label'].textContent, 'go_exit_after_claim',
        'Rematch wait must show Exit after automatically claiming the base reward');
    const participantMethod = server.match(/^async function findVerifiedMatchParticipant\(uid, submittedMatchId, expectedScore = null, options = \{\}\) \{[\s\S]*?^\}/m)?.[0];
    assert(participantMethod, 'verified match participant lookup missing');
    const verifiedParticipant = vm.runInNewContext(`(${participantMethod})`, {
        MatchResult: { findOne: async () => ({
            matchId: 'zero-match', resultType: 'regular', participants: [{ uid: 'account-a', score: 0 }]
        }) },
        MAX_SCORE: 10000, toSafeInt: value => Math.floor(Number(value) || 0)
    });
    assert.equal((await verifiedParticipant('account-a', 'zero-match')).ok, false,
        'zero-point games must not become eligible for a reward claim');
    assert.equal((await verifiedParticipant('account-a', 'zero-match', null, { allowZeroScore: true })).ok, true,
        'zero-point games must remain eligible for their Power Index result');
    assert(server.includes("findVerifiedMatchParticipant(uid, data?.matchId, null, { allowZeroScore: true })"));
    assert(/if \(onlineDuelFinish\) \{\s*const adButton = document\.getElementById\('btn-ad-double'\)/.test(game),
        'successful online double must keep the result and permitted Rematch visible');
    assert(game.includes("if (!onlineDuelFinish) this.showMainMenu();"));
    assert(game.includes("claimLabel.dataset.lang = 'go_exit_after_claim'"));
    assert(/setTimeout\(\(\) => \{\s*if \(this\.rematchRequestToken !== requestToken/.test(game),
        'unanswered Rematch request must eventually unlock the button');
    for (const mode of ['random', 'friend_invite', 'challenge', 'tournament', 'online']) {
        assert.deepEqual([...(await classify('account-a', 200, new Date(), {}, mode))], ['personal']);
        assert(queried.mode.test('random') && queried.mode.test('friend_invite')
            && queried.mode.test('challenge') && queried.mode.test('tournament')
            && queried.mode.test('Online') && !queried.mode.test('Hotseat'));
        assert(queried.$or.some(entry => entry.playerId === 'account-a'));
    }
    await classify('account-a', 200, new Date(), {}, 'Hotseat');
    assert(queried.mode.test('Solo') && queried.mode.test('Hotseat') && !queried.mode.test('Online'));
    assert(server.includes("['solo', 'hotseat', 'random', 'online', 'friend_invite', 'challenge', 'tournament'].includes(finalMode.toLowerCase())"));
    assert(server.includes("['solo', 'hotseat', 'random', 'online', 'friend_invite', 'challenge', 'tournament'].includes(String(rewardSession.mode || '').toLowerCase())"));
    assert(server.includes("const isOnlineDuelRecord = ['random', 'online', 'friend_invite', 'challenge', 'tournament'].includes(mode.toLowerCase())"));
    assert(server.includes('rememberRecentPowerIndexGain(user, matchId, powerIndexGain)'));
    console.log('Online duel finish: five online modes, 10 themed PNG sets, shared layout, rewards, records and bracket-safe rematch OK.');
})().catch(error => { console.error(error); process.exitCode = 1; });
