const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const gameSource = fs.readFileSync(path.join(root, 'www', 'game.js'), 'utf8');
const undoSource = fs.readFileSync(path.join(root, 'www', 'vracanjeupisa.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');
const rulesSource = fs.readFileSync(path.join(root, 'www', 'pravilaigre.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(root, 'www', 'managers.js'), 'utf8');
const dailySource = fs.readFileSync(path.join(root, 'www', 'dnevniizazov.js'), 'utf8');
const turnirSource = fs.readFileSync(path.join(root, 'www', 'turnir.js'), 'utf8');
const envExampleSource = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const powerIndexCore = require(path.join(root, 'www', 'powerIndexCore.js'));

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.notStrictEqual(start, -1, `Missing server function: ${name}`);

    const methodBodyMarker = source.indexOf(') {', start);
    assert.notStrictEqual(methodBodyMarker, -1, `Missing server function body: ${name}`);
    const bodyStart = methodBodyMarker + 2;
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }

    throw new Error(`Unclosed server function: ${name}`);
}

function extractAsyncFunction(source, name) {
    const start = source.indexOf(`async function ${name}`);
    assert.notStrictEqual(start, -1, `Missing async server function: ${name}`);

    const methodBodyMarker = source.indexOf(') {', start);
    assert.notStrictEqual(methodBodyMarker, -1, `Missing async server function body: ${name}`);
    const bodyStart = methodBodyMarker + 2;
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }

    throw new Error(`Unclosed async server function: ${name}`);
}

function extractClassMethod(source, signature) {
    const start = source.indexOf(signature);
    assert.notStrictEqual(start, -1, `Missing client method: ${signature}`);

    const methodBodyMarker = source.indexOf(') {', start);
    assert.notStrictEqual(methodBodyMarker, -1, `Missing client method body: ${signature}`);
    const bodyStart = methodBodyMarker + 2;
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let i = bodyStart; i < source.length; i++) {
        const char = source[i];

        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }

    throw new Error(`Unclosed client method: ${signature}`);
}

function toSafeInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isDailyKeyToday(value, today, legacyToday) {
    return value === today || value === legacyToday;
}

function checkBalanceSyncAllowance() {
    assert(
        !serverSource.includes('MAX_AD_REWARD_PER_SYNC'),
        'Profile sync still contains a generic ad reward allowance'
    );

    const context = {
        Math,
        Number,
        Date,
        REQUIRE_ADMOB_SSV: false,
        MAX_DAILY_REWARD: 5000,
        MAX_REWARD_PER_GAME: 500,
        MAX_TOURNEY_REWARD: 10000,
        toSafeInt,
        isDailyKeyToday,
        getDailyChallengeDayKey() { return '2026-06-29'; },
        getLegacyDailyDayKey() { return '2026-06-29'; },
        getDailyChallengeForUid() { return { reward: 750 }; }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'calculateAllowedBalanceIncrease'), context);
    const calculateAllowedBalanceIncrease = vm.runInContext('calculateAllowedBalanceIncrease', context);

    const existingUser = {
        firebaseUid: 'test-firebase-uid',
        lastDaily: '',
        lastDailyRewardClaimed: ''
    };

    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 10, tournamentWins: 2 }, 10, 2, 0),
        0,
        'Unchanged stats received an unexplained balance allowance'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 10, tournamentWins: 2 }, 10, 2, 5000),
        0,
        'Profile sync must not grant trophy reward balance outside claim_trophy_reward'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 11, tournamentWins: 2 }, 10, 2, 0),
        0,
        'Client-reported game delta must not create a balance allowance'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, { games: 10, tournamentWins: 3 }, 10, 2, 0),
        0,
        'Client-reported tournament win created a balance allowance'
    );
    assert.strictEqual(
        calculateAllowedBalanceIncrease(existingUser, {
            games: 10,
            tournamentWins: 2,
            lastDaily: '2026-06-29',
            dailyRewardClaimed: '2026-06-29',
            dailyRewardAmount: 750
        }, 10, 2, 0),
        750,
        'Daily reward allowance regressed'
    );

    assert(
        !serverSource.includes('gameDelta * MAX_REWARD_PER_GAME') &&
        !serverSource.includes('acceptedGameDelta) * MAX_REWARD_PER_GAME') &&
        !serverSource.includes('games * MAX_REWARD_PER_GAME') &&
        !serverSource.includes('getPendingGameRewardIncrease') &&
        !serverSource.includes('tournamentDelta * MAX_TOURNEY_REWARD') &&
        !serverSource.includes('getNewTrophyRewards') &&
        !serverSource.includes('newTrophyRewards') &&
        !serverSource.includes('acceptsPaidUnlocks ? requestedBalance'),
        'Profile sync still allows balance increases from client-reported game/trophy deltas'
    );

    assert(
        serverSource.includes('const acceptedTournamentDelta = 0;'),
        'Migrated profiles can still import client-reported tournament wins'
    );
    assert(
        serverSource.includes('const maxGameDelta = allowLegacyImport ? MAX_PROFILE_LEGACY_GAME_IMPORT : 0;') &&
        serverSource.includes(': oldStats.highscore;'),
        'Migrated profiles can still inflate games or highscore through profile sync'
    );
    assert(
        serverSource.includes('const verifiedTournamentWins = await getVerifiedTournamentWins(verifiedUid);'),
        'New profiles do not restore tournament wins from the official server ledger'
    );
}

function checkAdMobRewardVerificationDefaults() {
    assert(
        !serverSource.includes("process.env.REQUIRE_ADMOB_SSV === 'true'"),
        'AdMob SSV regressed to default-off verification'
    );
    assert(
        serverSource.includes('parseRequiredAdMobSsv(process.env.REQUIRE_ADMOB_SSV)'),
        'AdMob SSV does not use the fail-closed env parser'
    );

    const context = { String };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'parseRequiredAdMobSsv'), context);
    vm.runInContext(extractFunction(serverSource, 'parseOptionalBooleanEnv'), context);
    const parseRequiredAdMobSsv = vm.runInContext('parseRequiredAdMobSsv', context);
    const parseOptionalBooleanEnv = vm.runInContext('parseOptionalBooleanEnv', context);

    assert.strictEqual(parseRequiredAdMobSsv(undefined), true, 'Missing REQUIRE_ADMOB_SSV must require SSV');
    assert.strictEqual(parseRequiredAdMobSsv(''), true, 'Blank REQUIRE_ADMOB_SSV must require SSV');
    assert.strictEqual(parseRequiredAdMobSsv('true'), true, 'REQUIRE_ADMOB_SSV=true must require SSV');
    assert.strictEqual(parseRequiredAdMobSsv('false'), false, 'REQUIRE_ADMOB_SSV=false must explicitly disable SSV');
    assert.strictEqual(parseRequiredAdMobSsv('0'), false, 'REQUIRE_ADMOB_SSV=0 must explicitly disable SSV');
    assert.strictEqual(parseOptionalBooleanEnv(undefined, true), true, 'Client rewarded fallback must keep completed rewarded ads payable by default');
    assert.strictEqual(parseOptionalBooleanEnv('true', false), true, 'Client rewarded fallback env true is not accepted');
    assert.strictEqual(parseOptionalBooleanEnv('false', true), false, 'Client rewarded fallback env false is not accepted');
    assert(envExampleSource.includes('REQUIRE_ADMOB_SSV=true'), '.env.example disables AdMob SSV verification');
    assert(envExampleSource.includes('ALLOW_ADMOB_CLIENT_REWARD_FALLBACK=true'), '.env.example omits client rewarded fallback switch');
    assert(envExampleSource.includes('LOCAL_GAME_SESSION_SECRET='), '.env.example omits the signed local session secret');
}

async function checkRewardedAdClientFallback() {
    assert(
        serverSource.includes('const ALLOW_ADMOB_CLIENT_REWARD_FALLBACK = parseOptionalBooleanEnv(process.env.ALLOW_ADMOB_CLIENT_REWARD_FALLBACK, true);'),
        'Server can silently reject completed rewarded ads when the deployment omits the fallback env switch'
    );
    assert(serverSource.includes('ADMOB_CLIENT_FALLBACK_GRACE_MS'), 'Server is missing a bounded fallback grace window');
    assert(serverSource.includes('const clientFallbackAllowed = ALLOW_ADMOB_CLIENT_REWARD_FALLBACK && options.clientRewarded === true;'), 'SSV fallback is not gated by the SDK rewarded signal');
    assert(serverSource.includes('clientFallback: true'), 'SSV fallback does not return a distinguishable fallback result');
    assert(
        serverSource.includes('clientRewarded: data?.clientRewarded === true'),
        'Reward handlers do not pass the client rewarded signal into SSV verification'
    );

    assert(managersSource.includes("{ ssvNonce, clientRewarded: true }"), 'Shop coin rewarded claim does not send clientRewarded');
    assert(managersSource.includes("{ itemId, ssvNonce, clientRewarded: true }"), 'Shop discount/ad-unlock claims do not send clientRewarded');
    assert(undoSource.includes("{ type, ssvNonce, clientRewarded: true }"), 'Undo token rewarded claim does not send clientRewarded');
    assert(dailySource.includes("{ amount, doubled: !!doubled, ssvNonce, clientRewarded: !!doubled }"), 'Daily double rewarded claim does not send clientRewarded');
    assert(gameSource.includes('clientRewarded: !!doubled'), 'Game-over double rewarded claim does not send clientRewarded');

    const rewardWait = extractClassMethod(managersSource, 'async waitForRewardVideoReadyFor');
    const showRewardVideo = extractClassMethod(managersSource, 'showRewardVideo(rewardOptions = {})');
    assert(
        rewardWait.includes("this.triggerHighPriorityLoad('rewarded', rewardOptions)") &&
        rewardWait.includes('this.isRewardVideoReadyFor(rewardOptions)'),
        'AdMob controller does not load and wait for the exact rewarded context'
    );
    assert(
        showRewardVideo.includes('await this.waitForRewardVideoReadyFor(rewardOptions)'),
        'showRewardVideo can still fail immediately instead of waiting for the exact rewarded ad'
    );
    assert(
        showRewardVideo.includes('const rewardItem = await this.adMobPlugin.showRewardVideoAd();') &&
        showRewardVideo.includes('if (rewardItem && this.rewardResolve) this.settleRewardVideo(true);'),
        'showRewardVideo does not accept the native rewarded promise result as a client reward signal'
    );

    let now = 100000;
    class TestDate extends Date {
        static now() {
            now += 1000;
            return now;
        }
    }

    const verificationContext = {
        Array,
        Date: TestDate,
        Math,
        Set,
        REQUIRE_ADMOB_SSV: true,
        ALLOW_ADMOB_CLIENT_REWARD_FALLBACK: true,
        ADMOB_SSV_WAIT_TIMEOUT_MS: 2000,
        ADMOB_CLIENT_FALLBACK_GRACE_MS: 2000,
        ADMOB_SSV_MAX_AGE_MS: 600000,
        ADMOB_SSV_POLL_MS: 750,
        toSafeInt,
        sleep: async () => {},
        recordMonitorAdOutcome() {},
        AdMobRewardVerification: {
            findOneAndUpdate: async () => null
        },
        console
    };
    vm.createContext(verificationContext);
    ['sanitizeAdMobNonce', 'sanitizeAdMobContext', 'sanitizeAdMobUid']
        .forEach(name => vm.runInContext(extractFunction(serverSource, name), verificationContext));
    vm.runInContext(extractAsyncFunction(serverSource, 'waitForVerifiedAdMobReward'), verificationContext);
    const waitForVerifiedAdMobReward = vm.runInContext('waitForVerifiedAdMobReward', verificationContext);

    const sdkFallback = await waitForVerifiedAdMobReward(
        'firebase-user-1234567890',
        'reward-nonce-123456',
        ['shop_ad_reward'],
        { claimedBy: 'shop_ad_reward', clientRewarded: true }
    );
    assert.strictEqual(sdkFallback.ok, true, 'Completed native rewarded ad was not accepted when SSV was unavailable');
    assert.strictEqual(sdkFallback.clientFallback, true, 'Completed native rewarded ad did not use the bounded SDK fallback');

    const missingSdkReward = await waitForVerifiedAdMobReward(
        'firebase-user-1234567890',
        'reward-nonce-654321',
        ['shop_ad_reward'],
        { claimedBy: 'shop_ad_reward', clientRewarded: false }
    );
    assert.strictEqual(missingSdkReward.ok, false, 'Reward was accepted without SSV or the native rewarded signal');
    assert.strictEqual(missingSdkReward.reason, 'ad_verification_pending', 'Missing native reward returned the wrong verification state');

    verificationContext.AdMobRewardVerification.findOneAndUpdate = async () => ({
        uid: 'firebase-user-1234567890',
        nonce: 'reward-nonce-ssv',
        context: 'daily_double'
    });
    const ssvReward = await waitForVerifiedAdMobReward(
        'firebase-user-1234567890',
        'reward-nonce-ssv',
        ['daily_double'],
        { claimedBy: 'daily_double', clientRewarded: true }
    );
    assert.strictEqual(ssvReward.ok, true, 'Verified AdMob SSV reward was rejected');
    assert.strictEqual(ssvReward.clientFallback, undefined, 'SSV reward incorrectly used the client fallback');

    const coinReward = extractClassMethod(undoSource, "async claimCoinAdReward(type = 'rewarded')");
    const tokenReward = extractClassMethod(undoSource, 'async buyTokens(type)');
    assert(
        coinReward.includes("if (!isCoinRewardReady && typeof adMob.prepareReward === 'function') adMob.prepareReward(rewardOptions);"),
        'Coin reward flow can still reject before showRewardVideo waits for the ad'
    );
    assert(
        tokenReward.includes("if (!isTokenRewardReady && typeof adMob.prepareReward === 'function') adMob.prepareReward(rewardOptions);"),
        'Undo token reward flow can still reject before showRewardVideo waits for the ad'
    );
}

function checkUnverifiedInterstitialRewardsBlocked() {
    assert(
        !serverSource.includes('SHOP_INTERSTITIAL_REWARD_AMOUNT') &&
        !serverSource.includes('UNDO_INTERSTITIAL_REWARD_AMOUNT'),
        'Server still defines unverifiable interstitial economy rewards'
    );

    const coinHandlerStart = serverSource.indexOf("socket.on('claim_shop_interstitial_reward'");
    assert.notStrictEqual(coinHandlerStart, -1, 'Missing legacy shop interstitial reward handler');
    const coinHandlerEnd = serverSource.indexOf("socket.on('claim_undo_token_reward'", coinHandlerStart);
    assert.notStrictEqual(coinHandlerEnd, -1, 'Could not isolate shop interstitial reward handler');
    const coinHandler = serverSource.slice(coinHandlerStart, coinHandlerEnd);
    assert(
        coinHandler.includes("reason: 'unsupported_unverified_ad_reward'") &&
        !coinHandler.includes('user.balance') &&
        !coinHandler.includes('localFallback'),
        'Shop interstitial handler can still grant an unverifiable coin reward'
    );

    const undoHandlerStart = serverSource.indexOf("socket.on('claim_undo_token_reward'");
    assert.notStrictEqual(undoHandlerStart, -1, 'Missing undo token reward handler');
    const undoHandlerEnd = serverSource.indexOf("socket.on('get_previous_quarter_winner'", undoHandlerStart);
    assert.notStrictEqual(undoHandlerEnd, -1, 'Could not isolate undo token reward handler');
    const undoHandler = serverSource.slice(undoHandlerStart, undoHandlerEnd);
    assert(
        undoHandler.includes("rewardType === 'interstitial'") &&
        undoHandler.includes("reason: 'unsupported_unverified_ad_reward'") &&
        !undoHandler.includes('lastUndoInterstitialRewardAt'),
        'Undo interstitial reward is not rejected before token grant logic'
    );

    assert(!indexSource.includes("claimCoinAdReward('interstitial')"), 'Economy UI still offers interstitial ducat rewards');
    assert(!indexSource.includes('kratku reklamu') && !indexSource.includes('short ad'), 'Economy UI still mentions short ad economy rewards');
    assert(!undoSource.includes("claimServerCoinReward('interstitial')"), 'Client still calls server coin interstitial reward');
    assert(!undoSource.includes("claimServerUndoTokenReward('interstitial')"), 'Client still calls server undo interstitial reward');
    assert(undoSource.includes("reason: 'unsupported_unverified_ad_reward'"), 'Client does not handle unsupported interstitial rewards');
}

function checkUndoRewardedTokenAmount() {
    assert(
        serverSource.includes('const UNDO_REWARDED_REWARD_AMOUNT = 1;'),
        'Rewarded undo token ads must grant exactly 1 token'
    );
    assert(undoSource.includes("return { context: 'undo_tokens', amount: 1 };"), 'Undo rewarded SSV amount must be 1 token');
    assert(!undoSource.includes("return { context: 'undo_tokens', amount: 3 };"), 'Undo rewarded SSV amount still advertises 3 tokens');
    assert(!undoSource.includes('this.applyTokenReward(result, 3)'), 'Undo rewarded local fallback still grants 3 tokens');
    assert(!undoSource.includes('if (parsedType === 1)'), 'buyUndoTokens(1) still follows the old interstitial branch');
    assert(undoSource.includes("requestedType === 'interstitial'"), 'Undo interstitial requests must be blocked explicitly, not by token amount');
    assert(indexSource.includes('onclick="app.buyUndoTokens(1)"'), 'Economy UI must claim exactly 1 rewarded undo token');
    assert(!indexSource.includes('onclick="app.buyUndoTokens(3)"'), 'Economy UI still claims 3 rewarded undo tokens');
    assert(!indexSource.includes('<strong>+3 <svg class="token-icon-inline"'), 'Economy UI still displays +3 undo tokens');
    assert(!rulesSource.includes('+3 tokena za nagradni video'), 'Serbian rules still describe +3 rewarded undo tokens');
    assert(!rulesSource.includes('+3 tokens for a rewarded video'), 'English rules still describe +3 rewarded undo tokens');
}

function checkShopDiscountRequiresServerVerification() {
    assert(serverSource.includes('shopDiscounts: { type: Object, default: {} }'), 'User profile does not persist pending shop discounts');
    assert(serverSource.includes("socket.on('claim_shop_discount'"), 'Server is missing verified shop discount claim handler');
    assert(serverSource.includes("waitForVerifiedAdMobReward(\n                uid,\n                data?.ssvNonce,\n                [discountContext]"), 'Shop discount handler does not require item-specific SSV verification');
    assert(serverSource.includes('getPaidUnlockPurchaseSummary(requestedUnlocks, existingUnlocksBefore, requestedTrophies, user.shopDiscounts)'), 'Profile sync does not price purchases with server-side discount state');
    assert(serverSource.includes('total += Math.max(0, price);'), 'Paid unlock cost no longer defaults to the full item price');
    assert(!serverSource.includes('total += Math.floor(price * 0.8);'), 'Paid unlock cost still grants default 20% discount without server verification');
    assert(serverSource.includes('delete pendingDiscounts[id];'), 'Accepted discounted purchases do not consume pending discount state');

    assert(managersSource.includes("context: `shop_discount:${itemId}`"), 'Client discount ad does not use item-specific SSV context');
    assert(managersSource.includes("app.socket.emit('claim_shop_discount'"), 'Client discount flow does not claim discount on the server');
    assert(!managersSource.includes('this.discountedItems[id] = true;'), 'Client can still apply shop discount locally without server confirmation');
}

function checkAdUnlockItemsAreNotFreeUnlocks() {
    assert(serverSource.includes('const SHOP_AD_UNLOCK_TARGETS = Object.freeze({'), 'Server is missing explicit adUnlock target map');
    assert(serverSource.includes('desert: 3'), 'Desert adUnlock target is not represented on the server');
    assert(
        serverSource.includes('price === 0 && !SHOP_AD_UNLOCK_IDS.has(id)'),
        'AdUnlock zero-price items can still enter FREE_UNLOCK_IDS'
    );
    assert(serverSource.includes('acceptPaidUnlocks && isPaidShopUnlockId(id)'), 'AdUnlock items can still pass through paid unlock filtering');
    assert(serverSource.includes("socket.on('claim_shop_ad_unlock'"), 'Server is missing verified adUnlock claim handler');
    assert(serverSource.includes('[adContext]'), 'AdUnlock handler does not use item-specific SSV context');
    assert(serverSource.includes('addUnlockedShopItemToUser(user, itemId)'), 'AdUnlock handler does not unlock through server inventory');

    const watchStart = managersSource.indexOf('async watchAdForUnlock');
    assert.notStrictEqual(watchStart, -1, 'Client is missing watchAdForUnlock');
    const watchEnd = managersSource.indexOf('addBalance(', watchStart);
    assert.notStrictEqual(watchEnd, -1, 'Could not isolate watchAdForUnlock');
    const watchHandler = managersSource.slice(watchStart, watchEnd);
    assert(watchHandler.includes("context: `shop_ad_unlock:${itemId}`") || managersSource.includes("context: `shop_ad_unlock:${itemId}`"), 'Client adUnlock ad does not use item-specific SSV context');
    assert(watchHandler.includes('claimServerShopAdUnlock'), 'Client adUnlock flow does not claim progress on the server');
    assert(!watchHandler.includes('progress++;'), 'Client still increments adUnlock progress locally without server confirmation');
    assert(!watchHandler.includes('adCtrl.prepareReward();'), 'Client still prepares generic reward ads for adUnlock');

    assert(
        gameSource.includes("const localThemes = statsAuthoritative ? [] : this.readLocalJson('yamb_unlocked_themes', []);"),
        'Authoritative profile sync still preserves local unlockedThemes'
    );
}

function checkPowerIndexUsesRolledLeagueScore() {
    assert.strictEqual(
        powerIndexCore.calculateLeaguePowerPoints({ baselineScore: 120000, quarterlyScore: 3000 }),
        123000,
        'Power Index league helper must include both archived baseline and current quarter score'
    );

    const baseStats = {
        games: 10,
        wins: 7,
        losses: 3,
        draws: 0,
        highscore: 2500,
        totalScoreSum: 21000,
        maxWinStreak: 4,
        tournamentWins: 1,
        unlockedTrophies: ['first_play', 'legend'],
        penaltyPoints: 0
    };
    const beforeQuarterRoll = powerIndexCore.calculatePowerIndex({
        ...baseStats,
        leagueData: { year: 2026, quarter: 2, baselineScore: 0, quarterlyScore: 200000 }
    });
    const afterQuarterRoll = powerIndexCore.calculatePowerIndex({
        ...baseStats,
        leagueData: { year: 2026, quarter: 3, baselineScore: 200000, quarterlyScore: 0 }
    });

    assert.strictEqual(
        afterQuarterRoll,
        beforeQuarterRoll,
        'Power Index dropped after quarterly league score rolled into baselineScore'
    );

    const clientPowerIndexMethod = extractClassMethod(gameSource, 'calculatePowerIndex(statsObj, isLocal = false)');
    assert(
        clientPowerIndexMethod.includes('calculateLeaguePowerPoints(leagueData)'),
        'Client local Power Index still sends only current quarterly league points'
    );

    const tournamentPiMethod = extractClassMethod(turnirSource, 'calculateMyPI()');
    assert(
        tournamentPiMethod.includes('calculateLeaguePowerPoints(ls)'),
        'Tournament PI fallback still sends only current quarterly league points'
    );
}

function checkTournamentChampionFallbackPayload() {
    const fallbackFn = extractFunction(serverSource, 'getCurrentFinishedChampionStatsFallback');
    assert(
        fallbackFn.includes("tournamentState.status !== 'finished'") &&
        fallbackFn.includes('buildCurrentFinishedChampionshipFallback(statsItem)'),
        'Missing finished tournament champion fallback stats builder'
    );

    const payloadFn = extractAsyncFunction(serverSource, 'buildTourneyStatsPayload');
    assert(
        payloadFn.includes('const currentChampionFallback = getCurrentFinishedChampionStatsFallback();') &&
        payloadFn.includes('stats.push(storedCurrentChampion || currentChampionFallback);'),
        'Tournament champions payload does not include the current finished champion when absent from the limited stats query'
    );

    const recordFn = extractAsyncFunction(serverSource, 'recordTournamentChampion');
    assert(
        recordFn.includes('const stats = await buildTourneyStatsPayload(20);'),
        'Tournament champion live update bypasses the resilient champions payload builder'
    );
}

function checkQuarterRewardAtomicClaim() {
    const rewardStart = serverSource.indexOf("socket.on('check_quarter_reward'");
    assert.notStrictEqual(rewardStart, -1, 'Missing check_quarter_reward handler');
    const rewardEnd = serverSource.indexOf("socket.on('claim_shop_ad_reward'", rewardStart);
    assert.notStrictEqual(rewardEnd, -1, 'Could not isolate check_quarter_reward handler');
    const handler = serverSource.slice(rewardStart, rewardEnd);

    assert(handler.includes('UserProfile.findOneAndUpdate('), 'Quarter reward claim is not persisted atomically');
    assert(handler.includes('claimedLeagueRewards: { $ne: rewardKey }'), 'Quarter reward claim lacks duplicate-claim guard in the DB query');
    assert(handler.includes('$addToSet: { claimedLeagueRewards: rewardKey }'), 'Quarter reward claim does not use $addToSet for the claimed period');
    assert(handler.includes('$inc: { balance: rewardAmount }'), 'Quarter reward claim does not increment balance in the same DB update');
    assert(handler.includes('const freshUser = await UserProfile.findOne({ firebaseUid: playerId });'), 'Quarter reward race loser does not reload fresh server state');
    assert(handler.includes("status: 'already_claimed'"), 'Quarter reward duplicate claim does not return already_claimed');
    assert(handler.includes('if (toSafeInt(updatedUser.balance, 0) > MAX_BALANCE)'), 'Quarter reward claim does not clamp balance after atomic increment');
    assert(!handler.includes('user.claimedLeagueRewards.push(rewardKey)'), 'Quarter reward claim still mutates the claimed ledger non-atomically');
    assert(!handler.includes('user.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(user.balance, 0)) + rewardAmount)'), 'Quarter reward claim still mutates balance non-atomically');
}

function checkDailyRewardAtomicClaim() {
    const rewardStart = serverSource.indexOf("socket.on('claim_daily_reward'");
    assert.notStrictEqual(rewardStart, -1, 'Missing claim_daily_reward handler');
    const rewardEnd = serverSource.indexOf("socket.on('get_online_players_list'", rewardStart);
    assert.notStrictEqual(rewardEnd, -1, 'Could not isolate claim_daily_reward handler');
    const handler = serverSource.slice(rewardStart, rewardEnd);

    assert(handler.includes('UserProfile.findOneAndUpdate('), 'Daily reward claim is not persisted atomically');
    assert(handler.includes('lastDailyRewardClaimed: { $nin: [todayStr, legacyTodayStr] }'), 'Daily reward claim lacks a duplicate-claim guard in the DB query');
    assert(handler.includes('$set: {\n                        lastDaily: todayStr,\n                        lastDailyRewardClaimed: todayStr'), 'Daily reward claim does not mark the day in the atomic update');
    assert(handler.includes('$inc: { balance: reward }'), 'Daily reward claim does not increment balance in the same DB update');
    assert(handler.includes('const freshUser = await UserProfile.findOne({ firebaseUid: uid });'), 'Daily reward race loser does not reload fresh server state');
    assert(handler.includes("reason: 'daily_already_claimed'"), 'Daily reward duplicate claim does not return already-claimed status');
    assert(handler.includes('if (toSafeInt(updatedUser.balance, 0) > MAX_BALANCE)'), 'Daily reward claim does not clamp balance after atomic increment');
    assert(!handler.includes('user.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(user.balance, 0)) + reward)'), 'Daily reward claim still mutates balance non-atomically');
}

function checkEmptySnapshotSettingsGuard() {
    const settingsStart = serverSource.indexOf('const requestedSoundEnabled = coerceBooleanSetting(s.soundEnabled);');
    assert.notStrictEqual(settingsStart, -1, 'Missing profile settings sync block');

    const settingsEnd = serverSource.indexOf('if (s.penaltyPoints', settingsStart);
    assert.notStrictEqual(settingsEnd, -1, 'Could not find end of profile settings sync block');

    const settingsSection = serverSource.slice(settingsStart, settingsEnd);
    const guardStart = settingsSection.indexOf('if (canApplyClientProfileSettings) {');
    assert.notStrictEqual(guardStart, -1, 'Profile settings are not guarded against empty client snapshots');

    const beforeGuard = settingsSection.slice(0, guardStart);
    const guardedBlock = settingsSection.slice(guardStart);
    [
        'user.soundEnabled =',
        'user.vibrationEnabled =',
        'user.musicEnabled =',
        'user.musicVolume =',
        'user.language ='
    ].forEach(assignment => {
        assert(
            !beforeGuard.includes(assignment),
            `${assignment} can run before the empty snapshot guard`
        );
        assert(
            guardedBlock.includes(assignment),
            `${assignment} is missing from the guarded settings block`
        );
    });

    assert(
        settingsSection.includes('const canApplyClientProfileSettings = !ignoreEmptyClientSnapshot;'),
        'Profile settings guard does not depend on ignoreEmptyClientSnapshot'
    );
}

function checkAuthWriteBoundary() {
    const handlerStart = serverSource.indexOf("socket.on('set_player_data'");
    assert.notStrictEqual(handlerStart, -1, 'Missing set_player_data handler');

    const handlerEnd = serverSource.indexOf("socket.on('get_online_players_list'", handlerStart);
    assert.notStrictEqual(handlerEnd, -1, 'Could not isolate set_player_data handler');

    const handler = serverSource.slice(handlerStart, handlerEnd);
    const unauthStart = handler.indexOf('if (!verifiedUid)');
    assert.notStrictEqual(unauthStart, -1, 'set_player_data no longer checks verified Firebase UID');

    const unauthEnd = handler.indexOf('try {', unauthStart);
    assert.notStrictEqual(unauthEnd, -1, 'Could not isolate unauthenticated set_player_data branch');

    const unauthBlock = handler.slice(unauthStart, unauthEnd);
    assert(
        unauthBlock.includes("socket.emit('auth_required'") && unauthBlock.includes('return;'),
        'Unauthenticated set_player_data can continue toward profile writes'
    );
}

function checkAuthoritativeOnlineDuelStats() {
    const profilePayload = extractFunction(serverSource, 'buildProfileSyncPayload');
    assert(
        profilePayload.includes('statsAuthoritative: true') && profilePayload.includes('h2hAuthoritative: true'),
        'Profile sync does not mark server stats and H2H as authoritative'
    );

    const completedPayloadStart = serverSource.indexOf("io.to(roomId).emit('online_game_finished'");
    assert.notStrictEqual(completedPayloadStart, -1, 'Missing authoritative online game result payload');
    const completedPayload = serverSource.slice(completedPayloadStart, completedPayloadStart + 1200);
    assert(
        completedPayload.includes('serverStatsAppliedUids'),
        'Online game result does not tell each client whether the server saved its stats'
    );

    const clientFinishStart = gameSource.indexOf('const serverStatsApplied = !!(');
    assert.notStrictEqual(clientFinishStart, -1, 'Client does not detect server-applied regular duel stats');
    const clientFinish = gameSource.slice(clientFinishStart, clientFinishStart + 900);
    assert(
        clientFinish.includes('serverApplied: serverStatsApplied'),
        'Client does not pass the server-applied marker into updateStats'
    );

    const updateStatsStart = gameSource.indexOf('updateStats(score, resultType');
    assert.notStrictEqual(updateStatsStart, -1, 'Missing client updateStats method');
    const updateStats = gameSource.slice(updateStatsStart, updateStatsStart + 5200);
    assert(
        updateStats.includes('const serverAppliedResult = !!options.serverApplied;') &&
        updateStats.includes('!serverAppliedResult && !isTechnical') &&
        updateStats.includes('!serverAppliedResult && !options.deferServerSync'),
        'Server-applied regular duel can still increment or re-sync client stats'
    );

    const cloudMergeStart = gameSource.indexOf('mergeCloudH2HStats(h2hStats)');
    assert.notStrictEqual(cloudMergeStart, -1, 'Missing cloud H2H sync method');
    const cloudMerge = gameSource.slice(cloudMergeStart, cloudMergeStart + 900);
    assert(
        cloudMerge.includes("localStorage.setItem('yamb_h2h_stats', JSON.stringify(cloudH2H))") &&
        !cloudMerge.includes('combineCounts'),
        'Corrected authoritative cloud H2H can still be combined with stale local counters'
    );

    const cloudProfileStart = gameSource.indexOf('applyCloudProfileSync(data = {})');
    assert.notStrictEqual(cloudProfileStart, -1, 'Missing client cloud profile sync method');
    const cloudProfile = gameSource.slice(cloudProfileStart, cloudProfileStart + 18000);
    assert(
        cloudProfile.includes('const statsAuthoritative = data.statsAuthoritative === true;') &&
        cloudProfile.includes('statsAuthoritative ? cloudValue : Math.max(localValue, cloudValue)') &&
        cloudProfile.includes('if (data.h2hAuthoritative === true)') &&
        cloudProfile.includes('this.mergeCloudH2HStats(data.h2hStats);'),
        'Corrected lower server counters can be restored from stale local profile data'
    );

    const h2hSyncStart = serverSource.indexOf('if (s.h2hStats) {');
    assert.notStrictEqual(h2hSyncStart, -1, 'Missing server H2H profile sync block');
    const h2hSync = serverSource.slice(h2hSyncStart, h2hSyncStart + 1300);
    assert(
        serverSource.includes('const allowLegacyH2HImport = !user.h2hMigrationApplied && !user.statsMigrationApplied;') &&
        h2hSync.includes('|| !allowLegacyH2HImport') &&
        h2hSync.includes('user.h2hMigrationApplied = true;') &&
        !h2hSync.includes('mergeH2HRecord('),
        'Existing server H2H can still add untrusted client counters'
    );

    const quitToMenu = extractClassMethod(gameSource, 'async quitToMenu()');
    assert(
        quitToMenu.includes("this.socket.emit('back_to_menu')") &&
        quitToMenu.includes('backToMenuSent = true') &&
        quitToMenu.includes('this.showMainMenu({ skipBackToMenu: backToMenuSent })'),
        'Manual online quit does not notify the server exactly once before navigation'
    );
    [
        'this.updateStats(',
        "localStorage.setItem('yamb_dukati'",
        'window.kvartalnaLiga.addPoints('
    ].forEach(forbidden => {
        assert(
            !quitToMenu.includes(forbidden),
            `Manual online quit still applies client-side penalty via ${forbidden}`
        );
    });

    const showMainMenu = extractClassMethod(gameSource, 'async showMainMenu(options = {})');
    assert(
        showMainMenu.includes('!options.skipBackToMenu') && showMainMenu.includes("this.socket.emit('back_to_menu')"),
        'Main menu navigation can resend an already reported online quit'
    );
}

function checkDistinctH2HRivalsStaySeparate() {
    assert(
        serverSource.includes('h2hMigrationApplied: { type: Boolean, default: false }') &&
        serverSource.includes('h2hMigrationApplied: true'),
        'H2H legacy import is not tracked independently for existing and new profiles'
    );

    const context = {
        Math,
        Number,
        Object,
        String,
        toSafeInt,
        sanitizeTournamentName(value) { return String(value || '').trim().substring(0, 24); }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(serverSource, 'isStableH2HUid'), context);
    vm.runInContext(extractFunction(serverSource, 'normalizeH2HNameKey'), context);
    vm.runInContext(extractFunction(serverSource, 'isGuestH2HName'), context);
    vm.runInContext(extractFunction(serverSource, 'mergeH2HRecord'), context);
    vm.runInContext(extractFunction(serverSource, 'normalizeH2HStatsForUser'), context);

    const normalizeServerH2H = vm.runInContext('normalizeH2HStatsForUser', context);
    const firstUid = 'firebase-user-one-1234567890';
    const secondUid = 'firebase-user-two-1234567890';
    const normalized = normalizeServerH2H({
        [firstUid]: { uid: firstUid, name: 'Isto Ime', wins: 3, losses: 1, draws: 0 },
        [secondUid]: { uid: secondUid, name: 'Isto Ime', wins: 1, losses: 4, draws: 2 }
    }, 'firebase-self-user-1234567890', 'Moj Profil');

    assert.deepStrictEqual(
        Object.keys(normalized).sort(),
        [firstUid, secondUid].sort(),
        'Server merged two distinct H2H rivals that share the same display name'
    );
    assert.strictEqual(normalized[firstUid].wins, 3, 'First same-name rival received another rival\'s results');
    assert.strictEqual(normalized[secondUid].losses, 4, 'Second same-name rival received another rival\'s results');

    const clientNormalize = extractClassMethod(gameSource, 'normalizeH2HStats(h2hStats = {})');
    assert(
        clientNormalize.includes('identity.uid !== existingUid) continue;'),
        'Client can still merge distinct stable UIDs into one same-name H2H card'
    );
}

function checkClientDuelStatsBehavior() {
    const storage = new Map();
    const localStorage = {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); }
    };
    const context = { Math, Number, JSON, parseInt, localStorage, window: { statsManager: null } };
    vm.createContext(context);

    const updateStatsSource = extractClassMethod(gameSource, 'updateStats(score, resultType');
    const updateStats = vm.runInContext(`(function ${updateStatsSource})`, context);
    const initialStats = {
        games: 10,
        totalGames: 10,
        wins: 4,
        losses: 6,
        highscore: 2700,
        totalScoreSum: 20000,
        currentWinStreak: 0,
        maxWinStreak: 2
    };

    function makeHarness() {
        storage.set('yamb_stats', JSON.stringify(initialStats));
        const calls = { h2h: 0, sync: 0 };
        return {
            harness: {
                stats: { ...initialStats },
                onlineMode: true,
                isSpectator: false,
                players: ['Igrač A', 'Igrač B'],
                playerName: 'Igrač A',
                myOnlineIndex: 0,
                currentOpponentPhoto: '',
                currentOpponentUid: 'opponent-stable-uid',
                socket: { connected: true },
                readLocalJson(key, fallback) {
                    const raw = localStorage.getItem(key);
                    return raw ? JSON.parse(raw) : fallback;
                },
                updateH2HStats() { calls.h2h++; },
                emitPlayerData() { calls.sync++; }
            },
            calls
        };
    }

    let test = makeHarness();
    updateStats.call(test.harness, 2500, 'loss', 2600, false, {
        serverApplied: true,
        skipH2H: true,
        deferServerSync: true
    });
    assert.strictEqual(test.harness.stats.games, 10, 'Server-applied duel incremented client games');
    assert.strictEqual(test.harness.stats.losses, 6, 'Server-applied duel incremented client losses');
    assert.strictEqual(test.harness.stats.totalScoreSum, 20000, 'Server-applied duel duplicated total score');
    assert.deepStrictEqual(test.calls, { h2h: 0, sync: 0 }, 'Server-applied duel updated H2H or echoed profile sync');

    test = makeHarness();
    updateStats.call(test.harness, 2500, 'loss', 2600, false, {
        serverApplied: false,
        deferServerSync: false
    });
    assert.strictEqual(test.harness.stats.games, 11, 'Server failure fallback did not count the duel locally');
    assert.strictEqual(test.harness.stats.losses, 7, 'Server failure fallback did not count the result locally');
    assert.strictEqual(test.harness.stats.totalScoreSum, 22500, 'Server failure fallback did not add the score');
    assert.deepStrictEqual(test.calls, { h2h: 1, sync: 1 }, 'Server failure fallback did not update H2H and request sync once');

    const mergeSource = extractClassMethod(gameSource, 'mergeCloudH2HStats(h2hStats)');
    const mergeCloudH2HStats = vm.runInContext(`(function ${mergeSource})`, context);
    const authoritative = { opponent: { name: 'Protivnik', wins: 2, losses: 2, draws: 0 } };
    storage.set('yamb_h2h_stats', JSON.stringify({ opponent: { name: 'Protivnik', wins: 2, losses: 3, draws: 0 } }));
    mergeCloudH2HStats.call({ normalizeH2HStats(value) { return value; } }, authoritative);
    assert.deepStrictEqual(
        JSON.parse(storage.get('yamb_h2h_stats')),
        authoritative,
        'Authoritative cloud H2H did not replace the inflated local record'
    );
}

async function checkServerDuelIdempotency() {
    const roomState = {
        duel: {
            players: ['socket-a', 'socket-b'],
            playerUids: ['uid-player-a', 'uid-player-b'],
            playerNames: ['Igrač A', 'Igrač B'],
            allScores: [2500, 2600],
            turnIndex: 0
        }
    };
    const saves = [];
    const profileSyncs = [];
    const emitted = [];
    const leagueDeltas = [];
    const ledger = new Map();
    const users = new Map([
        ['uid-player-a', { firebaseUid: 'uid-player-a', async save() { saves.push(this.firebaseUid); } }],
        ['uid-player-b', { firebaseUid: 'uid-player-b', async save() { saves.push(this.firebaseUid); } }]
    ]);
    const context = {
        MONGO_URI: 'mongodb://test',
        roomState,
        calculateCompletedDuelTotal(sheet) { return sheet; },
        getDuelParticipantMeta(socketId, fallbackName, fallbackUid) {
            return { uid: fallbackUid, name: fallbackName, photoUrl: '' };
        },
        UserProfile: { async findOne(query) { return users.get(query.firebaseUid) || null; } },
        ensureRoomMatchId(roomId, state) {
            if (!state.matchId) state.matchId = `match-${roomId}`;
            return state.matchId;
        },
        async ensureMatchResult(payload) {
            let result = ledger.get(payload.matchId);
            const created = !result;
            if (!result) {
                result = { ...payload, statsAppliedUids: [] };
                ledger.set(payload.matchId, result);
            }
            return { ok: true, created, result };
        },
        async markMatchResultStatsApplied(matchId, uid) {
            const result = ledger.get(matchId);
            if (!result) return false;
            if (!result.statsAppliedUids.includes(uid)) result.statsAppliedUids.push(uid);
            return true;
        },
        hasUserAppliedMatchResult(user, matchId) {
            return Array.isArray(user.recentMatchResultIds) && user.recentMatchResultIds.includes(matchId);
        },
        rememberUserAppliedMatchResult(user, matchId) {
            user.recentMatchResultIds = [...(user.recentMatchResultIds || []), matchId];
        },
        queueMatchResultReconciliation() {},
        applyCompletedDuelProfileStats(user, resultType, score) { user.profileResult = { resultType, score }; },
        applyCompletedDuelH2H(user, opponent, resultType, score, opponentScore) {
            user.h2hResult = { opponent: opponent.uid, resultType, score, opponentScore };
        },
        async applyTechnicalLeagueDelta(user, delta) {
            leagueDeltas.push({ uid: user.firebaseUid, delta });
            user.leagueDelta = (user.leagueDelta || 0) + delta;
        },
        emitProfileSyncToUid(uid, user, extra) { profileSyncs.push({ uid, user, extra }); },
        getOnlineDuelType() { return 'random'; },
        io: { to() { return { emit(event, payload) { emitted.push({ event, payload }); } }; } },
        console: { log() {}, error() {} },
        Array, Math
    };
    vm.createContext(context);
    vm.runInContext(extractAsyncFunction(serverSource, 'applyServerSideCompletedDuel'), context);
    vm.runInContext(extractFunction(serverSource, 'emitCompletedOnlineGame'), context);

    const firstApplied = await context.applyServerSideCompletedDuel('duel', 'socket-a');
    assert.deepStrictEqual(Array.from(firstApplied), ['uid-player-a', 'uid-player-b'], 'Server did not save both duel profiles');
    assert.deepStrictEqual(saves, ['uid-player-a', 'uid-player-b'], 'Server saved an unexpected number of duel profiles');
    assert.strictEqual(profileSyncs.length, 2, 'Server did not return the saved profile to both players');
    assert.deepStrictEqual(
        leagueDeltas,
        [
            { uid: 'uid-player-a', delta: 2500 },
            { uid: 'uid-player-b', delta: 2600 }
        ],
        'Server-saved duel did not apply quarterly league deltas for both players'
    );

    const repeatedApplied = await context.applyServerSideCompletedDuel('duel', 'socket-b');
    assert.deepStrictEqual(Array.from(repeatedApplied), ['uid-player-a', 'uid-player-b'], 'Repeated game_over lost applied UID state');
    assert.strictEqual(saves.length, 2, 'Repeated game_over saved the same duel twice');
    assert.strictEqual(leagueDeltas.length, 2, 'Repeated game_over duplicated quarterly league deltas');
    assert.deepStrictEqual(
        Array.from(ledger.get('match-duel').statsAppliedUids),
        ['uid-player-a', 'uid-player-b'],
        'Durable match ledger did not retain both applied profile markers'
    );

    assert.strictEqual(context.emitCompletedOnlineGame('duel'), true, 'Completed online game payload was not emitted');
    assert.deepStrictEqual(
        Array.from(emitted[0].payload.serverStatsAppliedUids),
        ['uid-player-a', 'uid-player-b'],
        'Completed payload did not identify both server-saved profiles'
    );

    roomState.partial = {
        players: ['socket-partial-a', 'socket-partial-b'],
        playerUids: ['uid-partial-a', 'uid-partial-b'],
        playerNames: ['Igrač C', 'Igrač D'],
        allScores: [2700, 2400],
        turnIndex: 0
    };
    users.set('uid-partial-a', {
        firebaseUid: 'uid-partial-a',
        async save() { saves.push(this.firebaseUid); }
    });
    users.set('uid-partial-b', {
        firebaseUid: 'uid-partial-b',
        async save() { throw new Error('simulated database failure'); }
    });

    const partialApplied = await context.applyServerSideCompletedDuel('partial', 'socket-partial-a');
    assert.deepStrictEqual(Array.from(partialApplied), ['uid-partial-a'], 'Partial save marked a failed profile as server-applied');
    assert.strictEqual(context.emitCompletedOnlineGame('partial'), true, 'Partial result payload was not emitted');
    assert.deepStrictEqual(
        Array.from(emitted[1].payload.serverStatsAppliedUids),
        ['uid-partial-a'],
        'Partial result payload did not isolate the successfully saved profile'
    );
}

async function main() {
    checkBalanceSyncAllowance();
    checkAdMobRewardVerificationDefaults();
    await checkRewardedAdClientFallback();
    checkUnverifiedInterstitialRewardsBlocked();
    checkUndoRewardedTokenAmount();
    checkShopDiscountRequiresServerVerification();
    checkAdUnlockItemsAreNotFreeUnlocks();
    checkPowerIndexUsesRolledLeagueScore();
    checkTournamentChampionFallbackPayload();
    checkQuarterRewardAtomicClaim();
    checkDailyRewardAtomicClaim();
    checkEmptySnapshotSettingsGuard();
    checkAuthWriteBoundary();
    checkAuthoritativeOnlineDuelStats();
    checkDistinctH2HRivalsStaySeparate();
    checkClientDuelStatsBehavior();
    await checkServerDuelIdempotency();

    console.log('Profile sync checks passed: auth boundary, profile guards, balance allowance, authoritative duel stats, Power Index, tournament champions fallback, and idempotency.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
