'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
const managersSource = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const soundSource = managersSource.slice(managersSource.indexOf('class SoundManager {'),
    managersSource.indexOf('// --- 6. SHOP MANAGER'));

function fixture(saved = {}) {
    const storage = new Map(Object.entries({ yamb_uid: 'account-a', ...saved }));
    const elements = new Map();
    for (const id of ['setting-sound', 'setting-music', 'setting-vibration',
        'btn-gh-sound', 'btn-gh-music', 'btn-gh-vib', 'music-volume-slider']) {
        elements.set(id, { checked: true, dataset: {}, attributes: {},
            setAttribute(key, value) { this.attributes[key] = value; } });
    }
    class AudioMock {
        constructor() { this.paused = true; this.playCalls = 0; this.currentTime = 0; }
        set volume(value) {
            assert(Number.isFinite(value) && value >= 0 && value <= 1, 'Invalid HTMLMediaElement volume');
            this._volume = value;
        }
        get volume() { return this._volume; }
        addEventListener() {}
        play() { this.paused = false; this.playCalls++; return Promise.resolve(); }
        pause() { this.paused = true; }
    }
    const timers = new Map();
    let timerId = 0;
    const context = {
        window: {}, Audio: AudioMock, navigator: { vibrate: () => true },
        document: { getElementById: id => elements.get(id) || null,
            querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} },
        localStorage: { getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
        setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
        clearTimeout(id) { timers.delete(id); },
        console: { log() {}, warn() {} }
    };
    vm.runInNewContext(soundSource + '\nwindow.TestSoundManager = SoundManager;', context);
    vm.runInNewContext(gameSource.replace('window.app = new YambApp();', 'window.TestApp = YambApp;'), context);
    const app = Object.create(context.window.TestApp.prototype);
    const sound = new context.window.TestSoundManager();
    sound.click = () => {};
    const sent = [];
    Object.assign(app, { soundMgr: sound, soundEnabled: sound.enabled,
        vibrationEnabled: storage.get('yamb_vibration') !== 'false',
        gameActive: true, onlineMode: false, stats: {}, players: [],
        socket: { connected: true }, mergeCloudLeagueData() {},
        async emitPlayerData() { sent.push(snapshot()); } });
    context.window.app = app;
    const snapshot = () => ({ soundEnabled: app.soundEnabled, vibrationEnabled: app.vibrationEnabled,
        musicEnabled: sound.musicEnabled, musicVolume: sound.musicVolume });
    const checked = () => ['sound', 'music', 'vibration'].map(key => elements.get('setting-' + key).checked);
    const pending = (uid = 'account-a') => JSON.parse(storage.get('yamb_audio_pending_sync_' + uid) || '{}');
    const flush = async () => {
        for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
        await Promise.resolve();
    };
    return { app, sound, storage, elements, sent, snapshot, checked, pending, flush };
}

const enabled = { soundEnabled: true, vibrationEnabled: true, musicEnabled: true, musicVolume: 0.4 };
const disabled = { soundEnabled: false, vibrationEnabled: false, musicEnabled: false, musicVolume: 0.4 };

test('quick choices survive an old cloud reply before the debounce sends them', async () => {
    const f = fixture();
    f.app.toggleQuickSound(); f.app.toggleQuickMusic(); f.app.toggleQuickVib();
    assert.equal(f.storage.get('yamb_music_volume'), '0.4', 'Protected volume must also be included in the profile push');
    f.app.applyCloudProfileSync(enabled);
    assert.deepEqual(f.snapshot(), disabled);
    assert.deepEqual(f.checked(), [false, false, false]);
    await f.flush();
    assert.deepEqual(f.sent, [disabled]);
});

test('main Settings choices and quick controls stay synchronized', () => {
    const f = fixture();
    for (const setting of ['sound', 'music', 'vibration']) f.app.saveSettingAuto(setting, false);
    f.app.applyCloudProfileSync(enabled);
    assert.deepEqual(f.snapshot(), disabled);
    assert.deepEqual(f.checked(), [false, false, false]);
    for (const key of ['sound', 'music', 'vib']) {
        const button = f.elements.get('btn-gh-' + key);
        assert.equal(button.dataset.enabled, 'false');
        assert.equal(button.attributes['aria-pressed'], 'false');
    }
});

test('acknowledgement clears pending values but later old replies cannot revert the session', () => {
    const f = fixture();
    f.app.toggleQuickSound(); f.app.toggleQuickMusic(); f.app.toggleQuickVib();
    assert.deepEqual(f.pending(), disabled);
    f.app.applyCloudProfileSync(disabled);
    assert.equal(f.storage.has('yamb_audio_pending_sync_account-a'), false);
    f.app.applyCloudProfileSync(enabled);
    assert.deepEqual(f.snapshot(), disabled);
});

test('the latest explicit choice wins, and only touched fields are protected', () => {
    const f = fixture();
    f.app.toggleQuickSound(); f.app.toggleQuickSound();
    f.app.applyCloudProfileSync({ ...disabled, musicVolume: 0.2 });
    assert.deepEqual(f.snapshot(), { ...disabled, soundEnabled: true, musicVolume: 0.2 });
    assert.deepEqual(f.checked(), [true, false, false]);
    assert.deepEqual(f.pending(), { soundEnabled: true });
});

test('unconfirmed offline choices survive restart, then fresh sessions accept cloud preferences', () => {
    const first = fixture(); first.app.socket.connected = false;
    first.app.toggleQuickSound(); first.app.changeMusicVolume('0.25');
    const second = fixture(Object.fromEntries(first.storage));
    second.app.applyCloudProfileSync(enabled);
    assert.equal(second.app.soundEnabled, false);
    assert.equal(second.sound.musicVolume, 0.25);
    second.app.applyCloudProfileSync({ ...enabled, soundEnabled: false, musicVolume: 0.25 });
    assert.deepEqual(second.pending(), {});
    const third = fixture(Object.fromEntries(second.storage));
    third.app.applyCloudProfileSync(enabled);
    assert.deepEqual(third.snapshot(), enabled);
});

test('pending choices and delayed writes do not cross accounts', async () => {
    const f = fixture(); f.app.toggleQuickSound();
    f.storage.set('yamb_uid', 'account-b');
    f.app.applyCloudProfileSync(enabled);
    assert.deepEqual(f.snapshot(), enabled);
    await f.flush(); assert.deepEqual(f.sent, []);
    assert.deepEqual(f.pending('account-a'), { soundEnabled: false });
    f.app.toggleQuickVib();
    assert.deepEqual(f.pending('account-b'), { vibrationEnabled: false });
    f.storage.set('yamb_uid', 'account-a');
    f.app.applyCloudProfileSync(enabled);
    assert.equal(f.app.soundEnabled, false);
    assert.equal(f.app.vibrationEnabled, true);
});

test('cloud restore refreshes visible checkboxes, quick buttons and the slider', () => {
    const f = fixture();
    f.app.applyCloudProfileSync({ ...disabled, musicVolume: 0.2 });
    assert.deepEqual(f.checked(), [false, false, false]);
    assert.equal(Number(f.elements.get('music-volume-slider').value), 0.2);
    for (const key of ['sound', 'music', 'vib']) assert.equal(f.elements.get('btn-gh-' + key).dataset.enabled, 'false');
    f.elements.clear();
    assert.doesNotThrow(() => f.app.applyCloudProfileSync(enabled));
});

test('invalid cloud audio values cannot disable or corrupt local preferences', () => {
    const f = fixture();
    f.app.applyCloudProfileSync({ soundEnabled: null, vibrationEnabled: 'false', musicEnabled: null, musicVolume: null });
    assert.deepEqual(f.snapshot(), enabled);
    f.app.applyCloudProfileSync({ musicVolume: NaN });
    assert.equal(f.sound.musicVolume, 0.4);
});

test('quick music enable restores the last audible volume and protects both values', () => {
    const f = fixture();
    f.app.changeMusicVolume('0.65'); f.app.changeMusicVolume('0');
    assert.equal(f.sound.bgMusic.paused, true);
    f.app.toggleQuickMusic();
    assert.equal(f.sound.musicEnabled, true);
    assert.equal(f.sound.musicVolume, 0.65);
    assert.equal(f.sound.bgMusic.paused, false);
    assert.equal(f.storage.get('yamb_music_volume'), '0.65');
    f.app.applyCloudProfileSync({ musicEnabled: false, musicVolume: 0 });
    assert.equal(f.sound.musicVolume, 0.65);
    assert.equal(f.sound.musicEnabled, true);
    assert.equal(f.elements.get('setting-music').checked, true);
});

test('main Settings can unmute after restart without changing unrelated audio settings', () => {
    const first = fixture(); first.app.changeMusicVolume('0.3'); first.app.changeMusicVolume('0');
    const second = fixture(Object.fromEntries(first.storage));
    second.app.gameActive = false;
    second.app.saveSettingAuto('music', true);
    assert.equal(second.sound.musicVolume, 0.3);
    assert.equal(second.sound.bgMusic.paused, true, 'Settings must not start in-game music outside a match');
    assert.equal(second.elements.get('setting-music').checked, true);
    const fresh = fixture({ yamb_music: 'false', yamb_music_volume: '0' });
    fresh.app.saveSettingAuto('music', true);
    assert.equal(fresh.sound.musicVolume, 0.4);
    const legacy = fixture({ yamb_music_volume: '0.8' });
    legacy.app.changeMusicVolume('0');
    const restored = fixture(Object.fromEntries(legacy.storage));
    restored.app.toggleQuickMusic();
    assert.equal(restored.sound.musicVolume, 0.8, 'Existing installs must remember their volume when first muted');
});

test('cloud restore preserves intentional zero volume and does not play disabled music', () => {
    const f = fixture();
    f.app.applyCloudProfileSync({ musicEnabled: false, musicVolume: 0.7 });
    assert.equal(f.sound.bgMusic.playCalls, 0);
    f.app.applyCloudProfileSync({ musicEnabled: true, musicVolume: 0 });
    assert.equal(f.sound.musicVolume, 0);
    assert.equal(f.sound.bgMusic.paused, true);
});

test('saved and incoming volume values are finite and bounded without materializing untouched defaults', () => {
    for (const [raw, expected] of [['2', 1], ['-1', 0], ['NaN', 0.4], ['', 0.4],
        ['Infinity', 0.4], ['0.3junk', 0.4], ['0', 0], ['0.75', 0.75]]) {
        const f = fixture({ yamb_music_volume: raw });
        assert.equal(f.sound.musicVolume, expected, raw);
        assert.equal(f.sound.bgMusic.volume, expected, raw);
        assert.equal(Number(f.storage.get('yamb_music_volume')), expected, raw);
    }
    const f = fixture();
    assert.equal(f.storage.has('yamb_music_volume'), false, 'Default is not an explicit local preference');
    f.sound.setMusicVolume(0.6);
    for (const raw of [NaN, Infinity, '', null, 'invalid']) {
        assert.doesNotThrow(() => f.sound.setMusicVolume(raw));
        assert.equal(f.sound.musicVolume, 0.6);
    }
    f.sound.setMusicVolume(2); assert.equal(f.sound.musicVolume, 1);
    f.sound.setMusicVolume(-1); assert.equal(f.sound.musicVolume, 0);
    f.app.changeMusicVolume(-2);
    assert.equal(f.sound.musicEnabled, false, 'Mute behavior must use the normalized slider value');
});

test('account cleanup includes pending choices and remembered audible volume', () => {
    const source = fs.readFileSync(path.join(root, 'www/auth.js'), 'utf8');
    const getKeys = vm.runInNewContext('(' + source.match(/function getAccountSnapshotStorageKeys\(uid\) \{[\s\S]*?\n\}/)[0] + ')');
    const keys = getKeys('account-a');
    assert(keys.includes('yamb_audio_pending_sync_account-a'));
    assert(keys.includes('yamb_music_last_volume'));
    assert(!getKeys('account-b').includes('yamb_audio_pending_sync_account-a'));
});
