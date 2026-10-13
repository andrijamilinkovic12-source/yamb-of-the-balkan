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
    }
};

const context = {
    window: { showNotification() { notifications++; } },
    document: {
        querySelectorAll: selector => selector === '.btn-ad-state-aware' ? [button] : [],
        getElementById: () => null
    },
    localStorage: { getItem: key => key === 'yamb_uid' ? 'test-user' : null },
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

    controller.canRequestAds = false;
    controller.updateUI(false);
    assert.equal(button.disabled, true, 'Bez saglasnosti dugme mora biti onemogućeno');
    controller.canRequestAds = true;
    context.navigator.onLine = false;
    controller.updateUI(false);
    assert.equal(button.disabled, true, 'Offline dugme ne sme pokretati učitavanje oglasa');
    console.log('Rewarded flow checks passed: contextual load, UI, single flight, success, failed show, expiration, offline.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
