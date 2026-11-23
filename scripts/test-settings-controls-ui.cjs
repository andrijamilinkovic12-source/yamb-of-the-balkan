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
        await page.addScriptTag({ content: read('www/languages.js') });
        await page.addScriptTag({ content: read('www/dailyChallengeCore.js') });
        await page.addScriptTag({ content: read('www/dnevniizazov.js') });
        await page.evaluate(() => {
            window.dnevniIzazov = new DnevniIzazov({});
            document.getElementById('splash-login-container').style.display = 'flex';
            applyTranslations();
        });
        const themes = await page.locator('#setting-theme option').evaluateAll(options => options.map(option => option.value));
        assert.ok(themes.includes('easter') && themes.includes('desert'));
        for (const theme of themes) {
            await page.evaluate(theme => {
                document.documentElement.dataset.splashTheme = theme;
                document.body.className = theme + '-theme';
                localStorage.setItem('yamb_theme', theme);
            }, theme);
            for (const [lang, welcome, labels] of [['en', 'WELCOME', ['W', 'D', 'L']], ['sr', 'DOBRODOŠLI', ['POB', 'NER', 'POR']]]) {
                await page.locator(`.splash-language-switcher [onclick="setLanguage('${lang}')"]`).click();
                assert.equal(await page.locator('[data-lang="splash_welcome_short"]').textContent(), welcome);
                assert.equal(await page.locator('.daily-glass-title').textContent(), lang === 'en' ? 'DAILY CHALLENGE' : 'DNEVNI IZAZOV');
                assert.equal(await page.locator('.daily-glass-subtitle').textContent(), lang === 'en' ? 'Stop the dice at the right moment!' : 'Zaustavi kockice u pravom trenutku!');
                assert.equal(await page.locator('html').getAttribute('lang'), lang);
                assert.deepEqual(await page.locator('#easter-invite-rival-record [data-green-record]').allTextContents(), labels);
                assert.equal(await page.locator('#invite-link').getAttribute('aria-label'), lang === 'en' ? 'Game invitation link' : 'Link za poziv u partiju');
                const reward = await page.evaluate(() => {
                    const daily = window.dnevniIzazov;
                    daily.serverDiceValues = [6, 6, 6, 6, 6, 6];
                    const { reward, yambBonus } = dailyChallengeCore.calculateReward(daily.serverDiceValues);
                    daily.calculatedReward = reward;
                    daily.currentYambBonus = yambBonus;
                    daily.showResultModal();
                    const view = document.getElementById('glass-daily-result');
                    const text = selector => view.querySelector(selector).textContent.trim();
                    const copy = [view.getAttribute('aria-label'), text('.daily-glass-btn-double'),
                        text('.daily-glass-btn-claim'), text('.daily-yamb-heading span'),
                        text('.daily-reward-total dt'), text('.daily-reward-total dd')];
                    daily.clearDailyResult();
                    daily.currentYambBonus = 0;
                    const message = document.createElement('div');
                    message.innerHTML = daily.getDailyRewardMessage('dc_reward_doubled', 260);
                    return { copy, message: message.textContent.trim(), icons: message.querySelectorAll('img').length };
                });
                const english = lang === 'en';
                assert.deepEqual(reward.copy, english
                    ? ['SUCCESS', 'DOUBLE', 'CLAIM', '6 matching dice', 'Total', '1,864']
                    : ['USPEŠNO', 'DUPLIRAJ', 'PREUZMI', '6 istih kockica', 'Ukupno', '1.864']);
                const short = theme === 'dark' || theme === 'easter';
                assert.equal(reward.message.replace(/\s+/g, ' '), english
                    ? 'Reward doubled! You won 260' + (short ? ' !' : ' ducats!')
                    : 'Nagrada je duplirana! Osvojili ste 260' + (short ? ' !' : ' dukata!'));
                assert.equal(reward.icons, 1);
            }
        }
        await page.reload();
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
            localStorage.setItem('yamb_lang_changed_at', '0');
            app.applyCloudProfileSync({ language: 'sr' });
        });
        assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'A stale cloud language cannot undo a pending selection');
        await page.evaluate(() => {
            app.applyCloudProfileSync({ language: 'en' });
            app.applyCloudProfileSync({ language: 'sr' });
        });
        assert.equal(await page.locator('[data-settings-lang="sr"]').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-settings-lang="en"]').click();
        await page.locator('[data-settings-lang="sr"]').click();
        assert.equal(await page.locator('[data-lang="settings_title"]').textContent(), 'PODEŠAVANJA');
        await page.evaluate(() => {
            localStorage.removeItem('yamb_audio_pending_sync_settings-fixture');
            app.manualAudioSettings = null;
            app.applyCloudProfileSync({ soundEnabled: false, musicEnabled: false, vibrationEnabled: false, musicVolume: 0.2 });
        });
        assert.deepEqual((await states()).checked, [false, false, false]);
        assert.equal((await states()).slider, 0.2);
        assert.deepEqual(errors, []);
        console.log('PASS: splash SR/EN across ' + themes.length + ' themes, daily challenge, records, Settings clicks, persisted language and stale/confirmed profile replies. No live account or service used.');
    } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
