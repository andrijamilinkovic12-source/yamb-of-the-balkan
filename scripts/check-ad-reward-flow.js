const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const managers = fs.readFileSync(path.join(__dirname, '..', 'www', 'managers.js'), 'utf8');
const start = managers.indexOf('class AdMobController {');
const end = managers.indexOf('// --- GLOBALNE INSTANCE ---', start);
assert(start >= 0 && end > start, 'AdMobController nije pronađen');

const listeners = new Map();
const requests = [];
let shows = 0;
let showMode = 'pending';
let notifications = 0;
let interstitialShows = 0;
let interstitialMode = 'success';
let resolveInterstitial;
const savedValues = new Map();
let button = { classList: { add() {}, remove() {} }, disabled: true, style: {}, dataset: {}, innerHTML: 'Reward' };
const plugin = {
    addListener: async (name, callback) => listeners.set(name, callback),
    prepareRewardVideoAd: async options => {
        requests.push(options);
        listeners.get('onRewardedVideoAdLoaded')?.();
        return { adUnitId: options.adId };
    },
    showRewardVideoAd: () => {
        shows++;
        if (showMode === 'throw') throw new Error('mock show failure');
        if (showMode === 'reward') return Promise.resolve({ type: 'coins', amount: 1 });
        return new Promise(() => {});
    },
    showInterstitial: () => {
        interstitialShows++;
        if (interstitialMode === 'throw') throw new Error('mock interstitial failure');
        if (interstitialMode === 'pending') return new Promise(resolve => { resolveInterstitial = resolve; });
        return Promise.resolve();
    }
};

const context = {
    window: { showNotification() { notifications++; } },
    document: {
        querySelectorAll: selector => selector === '.btn-ad-state-aware' ? [button] : [],
        getElementById: () => null
    },
    localStorage: {
        getItem: key => key === 'yamb_uid' ? 'test-user' : (savedValues.get(key) || null),
        setItem: (key, value) => savedValues.set(key, String(value))
    },
    navigator: { onLine: true },
    console: { info() {}, warn() {}, error() {} },
    _safeT: () => '',
    setTimeout,
    clearTimeout,
    Date
};

const AdMobController = vm.runInNewContext(`${managers.slice(start, end)}\nAdMobController`, context);

async function main() {
    const controller = new AdMobController();
    controller.canRequestAds = true;
    controller.adMobPlugin = plugin;
    controller.scheduleAdRetry = () => {};
    await controller.setupListeners();

    controller.updateUI(false);
    assert.equal(button.disabled, false, 'Dugme mora ostati dostupno za učitavanje svog SSV konteksta');

    controller.triggerHighPriorityLoad('rewarded');
    assert.equal(requests.length, 0, 'Generički rewarded zahtev ne sme otići AdMob-u');

    const coin = { context: 'shop_ad_reward', amount: 500 };
    const undo = { context: 'undo_tokens', amount: 1 };
    controller.prepareReward(coin);
    assert.equal(requests.length, 1);
    assert.equal(controller.isRewardVideoReadyFor(coin), true);
    assert.equal(controller.isRewardVideoReadyFor(undo), false);

    controller.ads.rewarded.isReady = false;
    controller.ads.rewarded.retryTimer = setTimeout(() => {}, 1000);
    controller.prepareReward(undo);
    assert.equal(requests.length, 1, 'Pritisak tokom retry pauze ne sme poslati novi AdMob zahtev');
    assert.equal(controller.pendingRewardOptions.context, 'undo_tokens', 'Retry mora sačuvati poslednji izabrani tip nagrade');
    clearTimeout(controller.ads.rewarded.retryTimer);
    controller.ads.rewarded.retryTimer = null;
    controller.pendingRewardOptions = null;

    controller.prepareReward(undo);
    assert.equal(requests.length, 2, 'Promena nagrade zahteva novi SSV kontekst');
    assert.equal(controller.isRewardVideoReadyFor(undo), true);

    const firstShow = controller.showRewardVideo(undo);
    assert.equal(await controller.showRewardVideo(coin), false, 'Drugi paralelni zahtev ne sme preuzeti prvu nagradu');
    assert.equal(shows, 1);
    listeners.get('onRewardedVideoAdFailedToShow')?.({ message: 'mock failure' });
    assert.equal(await firstShow, false, 'Neuspeo prikaz mora razrešiti zahtev');
    assert.equal(controller.rewardShowInProgress, false);
    assert.equal(notifications, 1, 'Korisnik mora dobiti poruku o neuspelom prikazu');

    controller.prepareReward(coin);
    assert.equal(controller.isRewardVideoReadyFor(coin), true);
    listeners.get('onRewardedVideoAdFailedToShow')?.({ message: 'late failure from previous show' });
    assert.equal(controller.isRewardVideoReadyFor(coin), true, 'Zakasneli signal ne sme poništiti novi oglas');
    const successfulShow = controller.showRewardVideo(coin);
    await Promise.resolve();
    listeners.get('onRewardedVideoAdReward')?.();
    assert.equal(await successfulShow, true, 'Potvrđena nagrada mora uspešno razrešiti zahtev');
    assert(controller.consumeLastRewardSsvNonce(), 'Nagrada mora zadržati SSV nonce za serversku potvrdu');
    assert.equal(controller.rewardShowInProgress, false);

    controller.adLoadedAt.rewarded = Date.now() - controller.adMaxAgeMs - 1;
    controller.prepareReward(coin);
    assert.equal(requests.length, 4, 'Istekao oglas mora se zameniti');

    showMode = 'reward';
    assert.equal(await controller.showRewardVideo(coin), true, 'Nativni odgovor o nagradi mora razrešiti zahtev');
    controller.ads.rewarded.isReady = false;
    controller.adLoadedAt.rewarded = 0;
    controller.prepareReward(coin);

    showMode = 'throw';
    assert.equal(await controller.showRewardVideo(coin), false, 'Neposredna greška dodatka ne sme zaglaviti zahtev');
    assert.equal(controller.rewardShowInProgress, false);
    assert.equal(notifications, 2);

    controller.ads.interstitial.isReady = true;
    controller.adLoadedAt.interstitial = Date.now();
    interstitialMode = 'pending';
    const firstInterstitial = controller.showInterstitial();
    assert.equal(await controller.showInterstitial(), false, 'Paralelni interstitial ne sme se prikazati');
    assert.equal(interstitialShows, 1);
    resolveInterstitial();
    assert.equal(await firstInterstitial, true);
    assert.equal(await controller.showInterstitial(), false, 'Desetominutna pauza važi posle prikaza');
    assert.equal(interstitialShows, 1);

    const restartedController = new AdMobController();
    restartedController.canRequestAds = true;
    restartedController.adMobPlugin = plugin;
    restartedController.ads.interstitial.isReady = true;
    restartedController.adLoadedAt.interstitial = Date.now();
    assert.equal(await restartedController.showInterstitial(), false, 'Pauza ostaje i posle ponovnog otvaranja aplikacije');

    savedValues.set(controller.interstitialLastShownKey, String(Date.now() - controller.interstitialCooldownMs - 1));
    controller.lastInterstitialShownAt = Number(savedValues.get(controller.interstitialLastShownKey));
    interstitialMode = 'throw';
    controller.handleAdFailed = () => {};
    assert.equal(await controller.showInterstitial(), false, 'Neuspeo prikaz ne sme važiti kao prikazan oglas');
    assert(Number(savedValues.get(controller.interstitialLastShownKey)) < Date.now() - controller.interstitialCooldownMs);
    interstitialMode = 'success';
    assert.equal(await controller.showInterstitial(), true, 'Posle pauze novi oglas može da se prikaže');
    assert.equal(interstitialShows, 3);

    let baseSelected = false;
    let doubledAttempts = 0;
    const cancelledDouble = await controller.claimRewardWithSsvRetry(
        async () => {
            doubledAttempts++;
            baseSelected = true;
            return { ok: false, reason: 'ad_verification_pending', permanent: false };
        },
        { nonce: 'pending-ssv', context: 'game_double', shouldCancel: () => baseSelected }
    );
    assert.equal(cancelledDouble.reason, 'base_reward_selected', 'Izbor osnovne nagrade mora prekinuti SSV ponavljanje');
    assert.equal(doubledAttempts, 1, 'SSV zahtev se ponavlja i posle izbora osnovne nagrade');

    controller.canRequestAds = false;
    controller.updateUI(false);
    assert.equal(button.disabled, true, 'Bez saglasnosti dugme mora biti onemogućeno');
    controller.canRequestAds = true;
    context.navigator.onLine = false;
    controller.updateUI(false);
    assert.equal(button.disabled, true, 'Offline dugme ne sme pokretati učitavanje oglasa');
    console.log('Ad flow checks passed: rewarded contexts and results, interstitial cooldown, single flight, failure, restart.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
