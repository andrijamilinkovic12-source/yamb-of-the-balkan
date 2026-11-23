'use strict';

// Production handlers/methods with in-memory profiles, fake time and no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { walletUpdate, walletState } = require('../lib/ducat-wallet');
const { applyUpdate, matches } = require('./economy-mongo-fixture.cjs');
const crypto = require('node:crypto');
const dailyChallengeCore = require('../www/dailyChallengeCore');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const serverSource = read('server.js');
const dailySource = read('www/dnevniizazov.js');
const authSource = read('www/auth.js');
const results = [];
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};

function fakeClock() {
    let now = Date.parse('2026-11-18T11:00:00Z');
    class ClockDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    let nextId = 0;
    const timers = new Map();
    const intervals = new Map();
    return {
        Date: ClockDate,
        set(value) { now = Date.parse(value); },
        setTimeout(fn, ms) { const id = ++nextId; timers.set(id, { fn, at: now + ms }); return id; },
        clearTimeout(id) { timers.delete(id); },
        setInterval(fn) { const id = ++nextId; intervals.set(id, fn); return id; },
        clearInterval(id) { intervals.delete(id); },
        pendingTimers: () => timers.size,
        pendingIntervals: () => intervals.size,
        advance(ms) {
            now += ms;
            for (const [id, timer] of [...timers]) {
                if (timer.at <= now) { timers.delete(id); timer.fn(); }
            }
        }
    };
}

function createServer(clock = fakeClock()) {
    const handlers = new Map();
    const profiles = new Map();
    const adCalls = [];
    const socket = { verifiedUid: 'review-user', on: (name, fn) => handlers.set(name, fn), emit() {} };
    const cloneDoc = profile => profile && Object.assign({}, profile, {
        async save() { profiles.set(this.firebaseUid, { ...this }); }
    });
    const context = vm.createContext({
        ...clock, console, crypto, Buffer, walletUpdate, walletState,
        socket, DAILY_CHALLENGE_TIME_ZONE: 'Europe/Belgrade', DAILY_CHALLENGE_SECRET: 'review-only',
        DAILY_REWARD_CLAIM_SECRET: 'private-review-claim-secret',
        dailyChallengeCore,
        MONGO_URI: 'in-memory-fixture', MAX_DAILY_REWARD: dailyChallengeCore.MAX_REWARD * 2,
        MAX_DAILY_BASE_REWARD: dailyChallengeCore.MAX_REWARD, MAX_BALANCE: 1e9,
        padDatePart: value => String(value).padStart(2, '0'),
        toSafeInt(value, fallback = 0) { const n = parseInt(value, 10); return Number.isFinite(n) ? n : fallback; },
        getVerifiedUid: value => value.verifiedUid,
        emitProfileSync() {},
        async waitForVerifiedAdMobReward(...args) { adCalls.push(args); return context.adResult; },
        grantVerifiedAdMobReward: async (_uid, _proof, _key, operation) => operation(null),
        adResult: { ok: true },
        UserProfile: {
            async findOne(query) { return cloneDoc(profiles.get(query.firebaseUid)); },
            async findOneAndUpdate(query, update) {
                const value = profiles.get(query.firebaseUid);
                if (!value || !matches(value, query)) return null;
                applyUpdate(value, update);
                return cloneDoc(value);
            }
        }
    });
    const helpers = serverSource.slice(serverSource.indexOf('function getTimeZoneParts('), serverSource.indexOf('function getTimeZoneOffsetMs('));
    vm.runInContext(helpers, context);
    for (const [event, next] of [['request_daily_challenge', 'set_player_data'], ['claim_daily_reward', 'get_online_players_list']]) {
        const start = serverSource.indexOf(`    socket.on('${event}'`);
        const end = serverSource.indexOf(`    socket.on('${next}'`, start);
        assert(start >= 0 && end > start);
        vm.runInContext(serverSource.slice(start, end), context);
    }
    profiles.set('review-user', { firebaseUid: 'review-user', balance: 1000, lastDaily: '', lastDailyRewardClaimed: '' });
    return {
        clock, context, socket, profiles, adCalls,
        async call(event, data = {}) {
            let response;
            await handlers.get(event)(data, value => { response = value; });
            return response;
        }
    };
}

function createClient(server = createServer()) {
    const storage = new Map([['yamb_uid', 'review-user'], ['yamb_dukati', '1000']]);
    const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
    function element() {
        const classes = new Set();
        const attributes = new Map();
        return {
            style: {}, dataset: {}, disabled: false, innerText: '', innerHTML: '',
            classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) },
            querySelector() { return null; }, querySelectorAll() { return []; },
            setAttribute: (name, value) => attributes.set(name, value),
            getAttribute: name => attributes.get(name), replaceChildren() {}
        };
    }
    const nodes = new Map(['glass-daily-overlay', 'glass-btn-action', 'glass-daily-sum', ...Array.from({ length: 6 }, (_, i) => `gd-${i}`)].map(id => [id, element()]));
    const alerts = [];
    const socketCalls = [];
    const listeners = new Map();
    const document = { getElementById: id => nodes.get(id), querySelector: () => null, querySelectorAll: () => [], body: element() };
    const app = {
        playerId: 'review-user', requireLogin: () => !!localStorage.getItem('yamb_uid'),
        async authenticateSocketIdentity() { return { ok: true }; },
        socket: {
            connected: true, disconnected: false,
            emit(event, data, ack) { socketCalls.push({ event, data }); server.call(event, data).then(ack); },
            once(event, fn) { listeners.set(event, fn); },
            off(event, fn) { if (listeners.get(event) === fn) listeners.delete(event); },
            connect() {},
            disconnect() { this.connected = false; this.disconnected = true; }
        },
        modal: { alert(...args) { alerts.push(args); return Promise.resolve(); } },
        effectMgr: { stop() {}, trigger() {} },
        setInviteBusyState(busy, reason = '') { this.clientInviteBusy = busy; this.clientInviteBusyReason = busy ? reason : ''; }
    };
    const context = vm.createContext({ ...server.clock, console, localStorage, document, app, t: key => key });
    context.window = context;
    vm.runInContext(read('www/dailyChallengeCore.js'), context);
    vm.runInContext(dailySource + '\nglobalThis.DailyClass = DnevniIzazov;', context);
    const Daily = context.DailyClass;
    Daily.prototype.injectGlassCSS = function () {};
    Daily.prototype.buildUI = function () {};
    const daily = new Daily(app);
    daily.prepareDailyAssets = async () => [];
    daily.syncDailyThemeAssets = () => {};
    daily.syncDailyProgress = () => {};
    daily.getDailyRewardMessage = (key, reward) => `${key}:${reward}`;
    daily.showResultModal = function () { this.resultShown = true; };
    context.dnevniIzazov = daily;
    context.yambAuthState = { uid: 'review-user' };
    context.normalizeFirebaseAuthUser = user => user;
    context.migrateLegacyLocalProgressToUid = () => {};
    vm.runInContext(authSource.slice(authSource.indexOf('function setYambAuthState('), authSource.indexOf('function safeParseLocalJson(')), context);
    return {
        daily, app, alerts, localStorage, nodes, context, server, socketCalls, element,
        switchAccount(uid) { context.setYambAuthState(uid ? { uid } : null); },
        connect() { app.socket.connected = true; app.socket.disconnected = false; listeners.get('connect')?.(); }
    };
}

async function check(name, run) {
    try { await run(); results.push({ name, pass: true }); console.log(`PASS ${name}`); }
    catch (error) { results.push({ name, pass: false, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}

async function main() {
    await check('Every dice combination grants one bonus iff at least five dice match', () => {
        const c = createClient();
        let bonusCombinations = 0;
        let maxReward = 0;
        for (let index = 0; index < 6 ** 6; index++) {
            let value = index;
            const dice = Array.from({ length: 6 }, () => { const face = value % 6 + 1; value = Math.floor(value / 6); return face; });
            const matching = Math.max(...dice.map(face => dice.filter(other => other === face).length));
            const expectedBase = (dice[0] + dice[1] + dice[2] + dice[3]) * dice[4] * dice[5];
            const expectedBonus = matching >= 5 ? 1000 : 0;
            const actual = dailyChallengeCore.calculateReward(dice);
            assert.equal(actual.baseReward, expectedBase);
            assert.equal(actual.yambBonus, expectedBonus);
            assert.equal(actual.reward, expectedBase + expectedBonus);
            assert.equal(c.daily.calculateRewardFromDice(dice), actual.reward);
            assert.equal(c.server.context.calculateDailyChallengeReward(dice), actual.reward);
            if (expectedBonus) bonusCombinations++;
            maxReward = Math.max(maxReward, actual.reward);
        }
        assert.equal(bonusCombinations, 186);
        assert.equal(maxReward, 1864);
        assert.equal(dailyChallengeCore.MAX_REWARD * 2, 3728);
    });
    await check('Incomplete, out-of-range or malformed dice cannot earn a bonus', () => {
        for (const dice of [null, [], [6, 6, 6, 6, 6], [6, 6, 6, 6, 6, 7], [1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, NaN], [1, 1, 1, 1, 1, 1, 1]]) {
            assert.equal(dailyChallengeCore.calculateReward(dice).reward, 0);
        }
    });
    await check('Yamb without an ad pays the full bonus once, with no ad check', async () => {
        for (const dice of [[5, 5, 3, 5, 5, 5], [6, 6, 6, 6, 6, 6]]) {
            const s = createServer();
            s.context.getDailyChallengeDice = () => dice;
            s.context.adResult = { ok: false, reason: 'ad_verification_required' };
            const c = createClient(s); await c.daily.open();
            const challenge = await s.call('request_daily_challenge');
            assert.equal(challenge.yambBonus, 1000);
            assert.equal(challenge.yambCount, dice[2] === 3 ? 5 : 6);
            for (let i = 0; i < 6; i++) c.daily.stopDice();
            s.clock.advance(600);
            assert.equal(c.daily.currentYambBonus, 1000);
            assert.equal(c.daily.calculatedReward, challenge.baseReward + 1000);
            const summary = c.daily.getYambRewardBreakdownHtml();
            assert.match(summary, /dc_yamb_bonus/);
            assert.match(summary, /\+1\.000/);
            assert.match(summary, new RegExp(challenge.yambCount === 6 ? 'dc_yamb_six' : 'dc_yamb_five'));
            await c.daily.claim(false);
            assert.equal(s.profiles.get('review-user').balance, 1000 + challenge.reward);
            assert.equal(s.adCalls.length, 0);
            assert.equal((await s.call('claim_daily_reward', { amount: challenge.reward })).reason, 'daily_already_claimed');
        }
    });
    await check('A verified ad doubles both base reward and bonus, up to 3728', async () => {
        const s = createServer(); s.context.getDailyChallengeDice = () => [6, 6, 6, 6, 6, 6];
        const c = createClient(s); await c.daily.open();
        for (let i = 0; i < 6; i++) c.daily.stopDice();
        s.clock.advance(600);
        assert.equal(c.daily.getDoubleRewardOptions().amount, 3728);
        s.context.adResult = { ok: false, reason: 'ad_verification_pending' };
        await c.daily.claim(true, 'fixture');
        assert.equal(s.profiles.get('review-user').balance, 1000);
        assert.equal(c.daily.rewardClaimed, false);
        s.context.adResult = { ok: true };
        await c.daily.claim(true, 'fixture');
        assert.equal(s.profiles.get('review-user').balance, 4728);
        assert.equal(s.adCalls.length, 2);
        assert.match(c.daily.getYambRewardBreakdownHtml(true), /\+2\.000/);
        assert.match(c.daily.getYambRewardBreakdownHtml(true), /3\.728/);
    });
    await check('Older clients submitting only the base still receive the server-computed bonus', async () => {
        for (const doubled of [false, true]) {
            const s = createServer(); s.context.getDailyChallengeDice = () => [5, 5, 5, 5, 5, 3];
            const challenge = await s.call('request_daily_challenge');
            const factor = doubled ? 2 : 1;
            assert.equal(challenge.baseReward, 300);
            assert.equal(challenge.reward, 1300);
            const response = await s.call('claim_daily_reward', { amount: 300 * factor, doubled });
            assert.equal(response.ok, true);
            assert.equal(response.reward, 1300 * factor);
            assert.equal(s.profiles.get('review-user').balance, 1000 + 1300 * factor);
        }
    });
    await check('A forged bonus on non-Yamb dice cannot increase the balance', async () => {
        const s = createServer(); s.context.getDailyChallengeDice = () => [1, 2, 3, 4, 5, 6];
        const challenge = await s.call('request_daily_challenge');
        assert.equal(challenge.yambBonus, 0);
        assert.equal((await s.call('claim_daily_reward', { amount: challenge.reward + 1000 })).reason, 'invalid_reward');
        assert.equal(s.profiles.get('review-user').balance, 1000);
    });
    await check('Win confirmation explains the bonus in Serbian and English', () => {
        const c = createClient();
        const source = read('www/languages.js');
        vm.runInContext(source.slice(0, source.indexOf('function setLanguage(')), c.context);
        const renderMessage = c.context.DailyClass.prototype.getDailyRewardMessage;
        c.daily.serverDiceValues = [5, 5, 5, 5, 5, 3];
        c.daily.currentYambBonus = 1000; c.daily.calculatedReward = 1300;
        for (const lang of ['sr', 'en']) {
            c.localStorage.setItem('yamb_lang', lang);
            const text = renderMessage.call(c.daily, 'dc_reward_won', 1300);
            assert.match(text, /YAMB BONUS/);
            assert.match(text, lang === 'en' ? /5 matching dice/ : /5 istih kockica/);
            assert.match(text, lang === 'en' ? /\+1,000/ : /\+1\.000/);
            const doubled = renderMessage.call(c.daily, 'dc_reward_doubled', 2600);
            assert.match(doubled, lang === 'en' ? /\+2,000/ : /\+2\.000/);
        }
        c.daily.currentYambBonus = 0;
        assert.doesNotMatch(renderMessage.call(c.daily, 'dc_reward_won', 300), /daily-yamb-summary/);
    });
    await check('Server and client day keys agree at midnight and DST boundaries', () => {
        const c = createClient();
        for (const iso of ['2026-11-18T22:59:59Z', '2026-11-18T23:00:00Z', '2026-03-29T00:59:59Z', '2026-03-29T01:00:00Z', '2026-10-25T00:59:59Z', '2026-10-25T01:00:00Z']) {
            c.server.clock.set(iso);
            assert.equal(c.daily.getTodayKey(), c.server.context.getDailyChallengeDayKey());
        }
        c.server.clock.set('2026-11-18T23:00:00Z');
        assert.equal(c.daily.getTodayKey(), '2026-11-19');
    });
    await check('Unauthenticated request and claim denied', async () => {
        const s = createServer(); s.socket.verifiedUid = '';
        assert.equal((await s.call('request_daily_challenge')).reason, 'auth_required');
        assert.equal((await s.call('claim_daily_reward', { amount: 100 })).reason, 'auth_required');
    });
    await check('Reopening/reinstalling returns identical dice and reward before claim', async () => {
        const s = createServer();
        const first = await s.call('request_daily_challenge');
        const next = await s.call('request_daily_challenge');
        assert.equal(JSON.stringify(first.dice), JSON.stringify(next.dice));
        assert.equal(first.reward, next.reward); assert.equal(next.alreadyClaimed, false);
        assert.equal(createClient(s).daily.calculateRewardFromDice(first.dice), first.reward);
    });
    await check('Standard six stops, score, claim and reentry', async () => {
        const c = createClient(); await c.daily.open();
        const expected = c.daily.currentBaseReward;
        for (let i = 0; i < 6; i++) c.daily.stopDice();
        c.server.clock.advance(600);
        assert.equal(c.daily.calculatedReward, expected); assert.equal(c.daily.resultShown, true);
        await c.daily.claim(false);
        assert.equal(c.localStorage.getItem('yamb_dukati'), String(1000 + expected));
        assert.equal(c.server.profiles.get('review-user').balance, 1000 + expected);
        assert.equal((await c.server.call('request_daily_challenge')).alreadyClaimed, true);
        await c.daily.open();
        assert.equal(c.daily.isActive, false);
        assert.match(c.alerts.at(-1)[0], /dc_done/);
        assert.equal(c.daily.claimInProgress, false);
    });
    await check('Concurrent duplicate claims credit only once', async () => {
        const s = createServer(); const challenge = await s.call('request_daily_challenge');
        const replies = await Promise.all([s.call('claim_daily_reward', { amount: challenge.reward }), s.call('claim_daily_reward', { amount: challenge.reward })]);
        assert.equal(replies.filter(r => r.ok).length, 1);
        assert.equal(replies.filter(r => r.reason === 'daily_already_claimed').length, 1);
        assert.equal(s.profiles.get('review-user').balance, 1000 + challenge.reward);
    });
    await check('Invalid amount rejected and doubled claim requires ad approval', async () => {
        const s = createServer(); const challenge = await s.call('request_daily_challenge');
        assert.equal((await s.call('claim_daily_reward', { amount: challenge.reward + 1 })).reason, 'invalid_reward');
        s.context.adResult = { ok: false, reason: 'ad_verification_pending' };
        assert.equal((await s.call('claim_daily_reward', { amount: challenge.reward * 2, doubled: true, ssvNonce: 'fixture' })).reason, 'ad_verification_pending');
        assert.equal(s.profiles.get('review-user').balance, 1000);
        s.context.adResult = { ok: true };
        const result = await s.call('claim_daily_reward', { amount: challenge.reward * 2, doubled: true, ssvNonce: 'fixture' });
        assert.equal(result.reward, challenge.reward * 2); assert.equal(s.adCalls.length, 2);
    });
    await check('Network failure leaves base reward available for retry', async () => {
        const c = createClient();
        const challenge = await c.server.call('request_daily_challenge'); c.daily.setChallengeState(challenge); c.daily.calculatedReward = challenge.reward;
        const original = c.daily.claimDailyRewardOnServer.bind(c.daily);
        c.daily.claimDailyRewardOnServer = async () => ({ ok: false, reason: 'err_server_conn' });
        await c.daily.claim(false);
        assert.equal(c.daily.rewardClaimed, false); assert.equal(c.daily.claimInProgress, false);
        assert.equal(c.server.profiles.get('review-user').balance, 1000);
        c.daily.claimDailyRewardOnServer = original; await c.daily.claim(false);
        assert.equal(c.server.profiles.get('review-user').balance, 1000 + challenge.reward);
    });
    await check('A signed x2 top-up after midnight credits only the difference and leaves the new day available', async () => {
        const s = createServer(); s.clock.set('2026-11-18T22:59:50Z');
        const original = await s.call('request_daily_challenge');
        const input = { dayKey: original.dayKey, claimToken: original.claimToken, amount: original.reward };
        assert.equal((await s.call('claim_daily_reward', input)).reward, original.reward);
        s.clock.set('2026-11-19T11:00:00Z');
        const topup = await s.call('claim_daily_reward', { ...input, amount: original.reward * 2, doubled: true, ssvNonce: 'original-ad' });
        assert.equal(topup.reward, original.reward);
        assert.equal(topup.totalReward, original.reward * 2);
        assert.equal(s.profiles.get('review-user').balance, 1000 + original.reward * 2);
        assert.equal((await s.call('request_daily_challenge')).alreadyClaimed, false);
        assert.equal((await s.call('claim_daily_reward', input)).reason, 'daily_already_claimed');
    });
    await check('Signed old daily reward does not conflict with the current legacy date marker', async () => {
        const s = createServer();
        const original = await s.call('request_daily_challenge');
        s.clock.set('2026-11-19T11:00:00Z');
        s.profiles.get('review-user').lastDailyRewardClaimed = s.context.getLegacyDailyDayKey();
        const result = await s.call('claim_daily_reward', { dayKey: original.dayKey, claimToken: original.claimToken, amount: original.reward });
        assert.equal(result.ok, true);
        assert.equal(s.profiles.get('review-user').balance, 1000 + original.reward);
        assert.equal((await s.call('request_daily_challenge')).alreadyClaimed, true);
    });
    await check('The public daily seed cannot forge a backdated reward token or a different account entitlement', async () => {
        const s = createServer();
        const original = await s.call('request_daily_challenge');
        s.clock.set('2026-11-19T11:00:00Z');
        const forged = crypto.createHmac('sha256', 'review-only').update(JSON.stringify(['daily-claim', 'review-user', original.dayKey])).digest('hex');
        const input = { dayKey: original.dayKey, amount: original.reward };
        assert.equal((await s.call('claim_daily_reward', { ...input, claimToken: forged })).reason, 'daily_challenge_expired');
        assert.equal(s.context.verifyDailyClaimToken('another-user', original.dayKey, original.claimToken), false);
        assert.equal(s.profiles.get('review-user').balance, 1000);
        assert.equal((await s.call('claim_daily_reward', { ...input, claimToken: original.claimToken })).ok, true);
    });
    await check('Claim works after a short same-day background delay (logic only)', async () => {
        const c = createClient(); const challenge = await c.server.call('request_daily_challenge');
        c.daily.setChallengeState(challenge); c.daily.calculatedReward = challenge.reward;
        c.server.clock.advance(180000); await c.daily.claim(false);
        assert.equal(c.server.profiles.get('review-user').balance, 1000 + challenge.reward);
    });
    await check('Next day allows a fresh challenge after previous reward', async () => {
        const s = createServer(); const first = await s.call('request_daily_challenge');
        await s.call('claim_daily_reward', { amount: first.reward });
        s.clock.set('2026-11-19T11:00:00Z');
        const next = await s.call('request_daily_challenge');
        assert.equal(next.dayKey, '2026-11-19'); assert.equal(next.alreadyClaimed, false);
    });
    await check('Signed previous-day reward remains payable without consuming the new daily challenge', async () => {
        const c = createClient(); c.server.clock.set('2026-11-18T22:59:50Z');
        const challenge = await c.server.call('request_daily_challenge'); c.daily.setChallengeState(challenge); c.daily.calculatedReward = challenge.reward;
        c.server.clock.set('2026-11-18T23:00:05Z');
        const result = await c.server.call('claim_daily_reward', { amount: challenge.reward, dayKey: challenge.dayKey });
        assert.equal(result.reason, 'daily_challenge_expired');
        await c.daily.claim(false);
        assert.equal(c.daily.currentDayKey, '2026-11-18');
        assert.equal(c.server.profiles.get('review-user').balance, 1000 + challenge.reward);
        assert.equal((await c.server.call('request_daily_challenge')).alreadyClaimed, false);
        assert.equal(c.socketCalls.find(call => call.event === 'claim_daily_reward').data.dayKey, '2026-11-18');
    });
    await check('Pending open must not apply previous account data after account switch', async () => {
        const c = createClient(); let releaseAssets; let responseReceived;
        const assets = new Promise(resolve => { releaseAssets = resolve; });
        const received = new Promise(resolve => { responseReceived = resolve; });
        c.daily.prepareDailyAssets = () => assets;
        c.daily.requestDailyChallengeFromServer = async () => {
            const result = await c.server.call('request_daily_challenge');
            responseReceived();
            return result;
        };
        const pending = c.daily.open();
        await received;
        c.localStorage.setItem('yamb_uid', 'other-account'); c.app.playerId = 'other-account'; c.localStorage.setItem('yamb_dukati', '250');
        c.app.socket.connected = false;
        releaseAssets([]);
        await pending;
        assert.equal(c.localStorage.getItem('yamb_dukati'), '250', 'Late challenge response overwrote new account balance');
        assert.equal(c.daily.isActive, false);
    });
    await check('Pending claim must not overwrite another account balance', async () => {
        const c = createClient(); let deliver;
        c.daily.currentDayKey = '2026-11-18'; c.daily.calculatedReward = 300;
        c.daily.claimDailyRewardOnServer = () => new Promise(resolve => { deliver = resolve; });
        const pending = c.daily.claim(false);
        c.localStorage.setItem('yamb_uid', 'other-account'); c.app.playerId = 'other-account'; c.localStorage.setItem('yamb_dukati', '250');
        deliver({ ok: true, reward: 300, balance: 1300 }); await pending;
        assert.equal(c.localStorage.getItem('yamb_dukati'), '250', 'Late claim response overwrote new account balance');
    });
    await check('Already-claimed response preserves authoritative zero balance', async () => {
        const c = createClient(); c.daily.currentDayKey = '2026-11-18'; c.daily.calculatedReward = 300;
        c.daily.claimDailyRewardOnServer = async () => ({ ok: false, reason: 'daily_already_claimed', balance: 0 });
        await c.daily.claim(false);
        assert.equal(c.localStorage.getItem('yamb_dukati'), '0');
    });
    await check('Zero-balance duplicate response is masked by the separate profile-sync event', async () => {
        const c = createClient(); const challenge = await c.server.call('request_daily_challenge');
        c.daily.setChallengeState(challenge); c.daily.calculatedReward = challenge.reward;
        c.server.profiles.get('review-user').lastDailyRewardClaimed = challenge.dayKey;
        c.server.profiles.get('review-user').balance = 0;
        c.server.context.emitProfileSync = (_socket, profile) => c.localStorage.setItem('yamb_dukati', profile.balance);
        await c.daily.claim(false);
        assert.equal(c.localStorage.getItem('yamb_dukati'), '0');
    });
    await check('An expired day cannot claim even when its amount matches today', async () => {
        const s = createServer(); const challenge = await s.call('request_daily_challenge');
        const result = await s.call('claim_daily_reward', { amount: challenge.reward, dayKey: '2026-11-17' });
        assert.equal(result.reason, 'daily_challenge_expired');
        assert.equal(result.dayKey, challenge.dayKey);
        assert.equal(s.profiles.get('review-user').balance, 1000);
    });
    await check('Midnight during ad verification cannot credit an expired reward', async () => {
        const s = createServer(); s.clock.set('2026-11-18T22:59:59Z');
        const challenge = await s.call('request_daily_challenge');
        const entered = deferred(); const ad = deferred();
        s.context.waitForVerifiedAdMobReward = () => { entered.resolve(); return ad.promise; };
        const pending = s.call('claim_daily_reward', { amount: challenge.reward * 2, doubled: true, dayKey: challenge.dayKey });
        await entered.promise;
        s.clock.set('2026-11-18T23:00:01Z'); ad.resolve({ ok: true });
        assert.equal((await pending).reason, 'daily_challenge_expired');
        assert.equal(s.profiles.get('review-user').balance, 1000);
        assert.equal(s.profiles.get('review-user').lastDailyRewardClaimed, '');
    });
    await check('Logout and login to the same UID cancel a pending open', async () => {
        const c = createClient(); const response = deferred();
        c.daily.requestDailyChallengeFromServer = () => response.promise;
        const opening = c.daily.open();
        c.switchAccount(null); c.switchAccount('review-user'); c.localStorage.setItem('yamb_dukati', '250');
        response.resolve({ ok: true, dayKey: '2026-11-18', dice: [1, 2, 3, 4, 5, 6], reward: 300, balance: 1000 });
        await opening;
        assert.equal(c.localStorage.getItem('yamb_dukati'), '250');
        assert.equal(c.daily.isActive, false);
    });
    await check('An obsolete open cannot clear the newer loading flag', async () => {
        const c = createClient(); const oldResponse = deferred(); const newResponse = deferred();
        c.daily.requestDailyChallengeFromServer = () => oldResponse.promise;
        const oldOpen = c.daily.open();
        c.switchAccount('other-account');
        c.daily.requestDailyChallengeFromServer = () => newResponse.promise;
        const newOpen = c.daily.open();
        oldResponse.resolve({ ok: false, reason: 'auth_required' }); await oldOpen;
        assert.equal(c.daily.loadingChallenge, true);
        newResponse.resolve({ ok: false, reason: 'err_server_conn' }); await newOpen;
        assert.equal(c.daily.loadingChallenge, false);
        assert.equal(c.alerts.length, 1);
    });
    await check('Logout cancels both intro callbacks and hides the backdrop', () => {
        const c = createClient(); const intro = c.element();
        c.nodes.set('daily-intro', intro);
        c.daily.showIntroBackdrop();
        let completed = 0;
        c.daily.playIntro(() => { completed++; });
        assert.equal(c.daily.isIntroPlaying, true);
        c.switchAccount(null); c.server.clock.advance(4000);
        assert.equal(completed, 0);
        assert.equal(intro.classList.contains('hidden'), true);
        assert.equal(c.nodes.get('glass-daily-overlay').classList.contains('active'), false);
        assert.equal(c.server.clock.pendingTimers(), 0);
    });
    await check('Logout cancels rolling and a delayed finish callback', async () => {
        const c = createClient(); await c.daily.open();
        assert.equal(c.server.clock.pendingIntervals(), 1);
        for (let i = 0; i < 6; i++) c.daily.stopDice();
        assert.equal(c.server.clock.pendingIntervals(), 0);
        c.switchAccount(null); c.server.clock.advance(600);
        assert.equal(c.daily.resultShown, undefined);
        assert.equal(c.daily.isActive, false);
        assert.equal(c.app.clientInviteBusy, false);
    });
    await check('Logout before reconnect prevents sending a stale claim', async () => {
        const c = createClient(); c.app.socket.connected = false; c.app.socket.disconnected = true;
        c.daily.setChallengeState({ dayKey: '2026-11-18', dice: [1, 2, 3, 4, 5, 6], reward: 300 });
        c.daily.calculatedReward = 300;
        const pending = c.daily.claim(false);
        c.switchAccount('other-account'); c.connect(); await pending;
        assert.equal(c.socketCalls.length, 0);
        assert.equal(c.alerts.length, 0);
    });
    await check('Logout during authentication prevents sending a stale claim', async () => {
        const c = createClient(); const auth = deferred();
        c.app.authenticateSocketIdentity = () => auth.promise;
        c.daily.calculatedReward = 300;
        const pending = c.daily.claim(false);
        c.switchAccount('other-account'); auth.resolve({ ok: true }); await pending;
        assert.equal(c.socketCalls.length, 0);
        assert.equal(c.alerts.length, 0);
    });
    await check('Logout during an ad prevents its late callback from claiming', async () => {
        const c = createClient(); const ad = deferred();
        let consumed = 0;
        c.context.adMobGlobal = { showRewardVideo: () => ad.promise, consumeLastRewardSsvNonce: () => { consumed++; return 'fixture'; } };
        c.daily.calculatedReward = 300;
        const pending = c.daily.watchAdToDouble();
        c.switchAccount('other-account'); ad.resolve(true); await pending;
        assert.equal(consumed, 0); assert.equal(c.socketCalls.length, 0);
        assert.equal(c.daily.adInProgress, false);
    });
    await check('Closing an older notice cannot hide a newer daily session', async () => {
        const c = createClient(); const notice = deferred();
        c.app.modal.alert = () => notice.promise;
        c.daily.showAlreadyPlayedInfo();
        c.switchAccount('other-account'); c.daily.showIntroBackdrop();
        notice.resolve(); await Promise.resolve();
        assert.equal(c.nodes.get('glass-daily-overlay').classList.contains('active'), true);
    });
    await check('Expiry notice cannot reopen the challenge after logout', async () => {
        const c = createClient(); const notice = deferred();
        c.app.modal.alert = () => notice.promise;
        const recovering = c.daily.recoverExpiredChallenge(c.daily.getSession());
        c.switchAccount(null); notice.resolve(); await recovering;
        assert.equal(c.socketCalls.length, 0);
        assert.equal(c.daily.isActive, false);
    });
    await check('Reentering from a blank backdrop makes the dice card visible', () => {
        const c = createClient(); c.daily.showIntroBackdrop(); c.daily.startDailyChallenge();
        assert.equal(c.nodes.get('glass-daily-overlay').classList.contains('daily-glass-overlay--blank'), false);
    });
    await check('Native logout cancels daily state even without an auth-state event', async () => {
        const c = createClient(); await c.daily.open();
        Object.assign(c.context, {
            Capacitor: { Plugins: { FirebaseAuthentication: { async signOut() {} } } },
            _t: (_key, fallback) => fallback,
            saveAccountLocalSnapshot() {}, syncLoggedInProfileToCloud: async () => true,
            clearAccountLocalCache: async () => {}, osveziAuthUI() {}, refreshLeagueDashboardForCurrentUser() {},
            updateFacebookControls() {},
            prikaziObavestenje: async message => { throw new Error(message); },
            modalManager: { confirm: async () => true }
        });
        c.app.navigateTo = () => {};
        const start = authSource.indexOf('async function odjaviSe(');
        const end = authSource.indexOf('// --- PROVERA STATUSA', start);
        vm.runInContext('let authActionInProgress = false;\n' + authSource.slice(start, end), c.context);
        await c.context.odjaviSe();
        assert.equal(c.daily.isActive, false);
        assert.equal(c.localStorage.getItem('yamb_uid'), null);
        assert.equal(c.server.clock.pendingIntervals(), 0);
    });
    const failed = results.filter(result => !result.pass);
    console.log(`\nSUMMARY ${results.length - failed.length}/${results.length} passed; ${failed.length} failures. No live services contacted.`);
    process.exitCode = failed.length ? 1 : 0;
}
const watchdog = setTimeout(() => { console.error('Daily challenge tests timed out'); process.exit(1); }, 10000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
