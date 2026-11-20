'use strict';

// Production controls and client methods; all account/network actions are isolated fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(src => `<link rel="stylesheet" href="${src}">`).join('')}<style>*{animation:none!important;transition:none!important}</style>${body}`;

async function main() {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const context = await browser.newContext({ viewport: { width: 384, height: 824 } });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'settings-controls.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ body: fs.readFileSync(file), contentType: ({ '.css': 'text/css',
                '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' })[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.setDefaultTimeout(5000);
        await page.goto('http://settings-controls.local/www/fixture.html');
        await page.evaluate(() => {
            localStorage.clear();
            for (const [key, value] of Object.entries({ yamb_uid: 'settings-fixture', yamb_player_name: 'QA',
                yamb_music_volume: '0.65', yamb_lang: 'sr', yamb_theme: 'dark' })) localStorage.setItem(key, value);
        });
        const bootstrap = async () => {
            await page.evaluate(() => {
                document.querySelectorAll('.screen').forEach(element => element.classList.remove('active'));
                document.querySelectorAll('[id*="splash"],[id*="loading-gate"],#rotate-lock-overlay').forEach(element => element.remove());
                document.getElementById('custom-modal-overlay').style.display = 'none';
                HTMLMediaElement.prototype.play = () => Promise.resolve();
                window._safeT = key => t(key);
            });
            await page.addScriptTag({ content: read('www/languages.js') });
            const managers = read('www/managers.js');
            await page.addScriptTag({ content: managers.slice(managers.indexOf('class SoundManager {'),
                managers.indexOf('// --- 6. SHOP MANAGER')) + '\nwindow.TestSoundManager=SoundManager;' });
            await page.addScriptTag({ content: read('www/game.js').replace('window.app = new YambApp();', 'window.TestApp=YambApp;') });
            await page.evaluate(() => {
                window.sentSettings = [];
                window.app = Object.create(TestApp.prototype);
                Object.assign(app, { playerName: 'QA', soundMgr: new TestSoundManager(),
                    soundEnabled: localStorage.getItem('yamb_sound') !== 'false',
                    vibrationEnabled: localStorage.getItem('yamb_vibration') !== 'false',
                    gameActive: false, onlineMode: false, stats: {}, players: [], socket: { connected: true },
                    reportMonitorRoomVisit() {}, shouldPlayThemedRoomIntro: () => false,
                    renderQuickSkinChoices() {}, mergeCloudLeagueData() {},
                    navigateTo(id) { document.querySelectorAll('.screen').forEach(element => element.classList.toggle('active', element.id === id)); },
                    async emitPlayerData() { sentSettings.push({ sound: this.soundEnabled, music: this.soundMgr.musicEnabled,
                        vibration: this.vibrationEnabled, volume: this.soundMgr.musicVolume }); }
                });
                app.showSettings(); app.updateQuickMenuIcons(); applyTranslations();
            });
            await page.addScriptTag({ content: read('www/theme-game-header.js') });
            await page.addScriptTag({ content: read('www/theme-settings-room.js') });
            await page.addScriptTag({ content: read('www/theme-settings-picker.js') });
        };
        const states = () => page.evaluate(() => ({ checked: ['sound', 'music', 'vibration'].map(key => document.getElementById('setting-' + key).checked),
            quick: ['sound', 'music', 'vib'].map(key => document.getElementById('btn-gh-' + key).dataset.enabled),
            sound: app.soundEnabled, music: app.soundMgr.musicEnabled, vibration: app.vibrationEnabled,
            volume: app.soundMgr.musicVolume, slider: Number(document.getElementById('music-volume-slider').value) }));
        await bootstrap();
        for (const setting of ['sound', 'music', 'vibration']) {
            await page.locator('label.settings-row').filter({ has: page.locator('#setting-' + setting) }).click();
        }
        await page.evaluate(() => app.applyCloudProfileSync({ soundEnabled: true, musicEnabled: true, vibrationEnabled: true, musicVolume: 0.65 }));
        assert.deepEqual((await states()).checked, [false, false, false]);
        assert.deepEqual((await states()).quick, ['false', 'false', 'false']);

        await page.reload(); await bootstrap();
        await page.evaluate(() => app.applyCloudProfileSync({ soundEnabled: true, musicEnabled: true, vibrationEnabled: true, musicVolume: 0.65 }));
        assert.deepEqual((await states()).checked, [false, false, false], 'Offline/unconfirmed changes must survive a document reload');
        await page.evaluate(() => {
            app.changeMusicVolume('0');
            app.toggleQuickSound(); app.toggleQuickVib();
        });
        await page.locator('label.settings-row').filter({ has: page.locator('#setting-music') }).click();
        const unmuted = await states();
        assert.deepEqual(unmuted.checked, [true, true, true]);
        assert.equal(unmuted.volume, 0.65); assert.equal(unmuted.slider, 0.65);
        await page.locator('[data-settings-lang="en"]').click();
        assert.equal(await page.locator('[data-lang="settings_title"]').textContent(), 'SETTINGS');

        await page.reload(); await bootstrap();
        assert.deepEqual((await states()).checked, [true, true, true]);
        assert.equal(await page.locator('[data-lang="settings_title"]').textContent(), 'SETTINGS');
        await page.evaluate(() => {
            localStorage.removeItem('yamb_audio_pending_sync_settings-fixture');
            app.manualAudioSettings = null;
            app.applyCloudProfileSync({ soundEnabled: false, musicEnabled: false, vibrationEnabled: false, musicVolume: 0.2 });
        });
        assert.deepEqual((await states()).checked, [false, false, false]);
        assert.equal((await states()).slider, 0.2);
        assert.deepEqual(errors, []);
        console.log('PASS: real Settings labels, stale replies, document reloads, quick/main state, music unmute, slider and language persistence. No live account or service used.');
    } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
