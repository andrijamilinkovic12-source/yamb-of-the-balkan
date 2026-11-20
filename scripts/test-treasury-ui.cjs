'use strict';

// Real Treasury markup, renderer and confirmation dialogs; synthetic account/ads only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const styles = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(src => `<link rel="stylesheet" href="${src}">`).join('')}<style>*{animation:none!important;transition:none!important}</style>${body}`;

async function main() {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const context = await browser.newContext();
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'treasury-functional.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ body: fs.readFileSync(file), contentType: ({ '.css': 'text/css',
                '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.setDefaultTimeout(8000);
        const bootstrap = async (intro = false) => {
            await page.evaluate(() => {
                document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('[id*="splash"],[id*="loading-gate"],#rotate-lock-overlay').forEach(el => el.remove());
                document.getElementById('custom-modal-overlay').style.display = 'none';
            });
            await page.addScriptTag({ content: read('www/languages.js') });
            await page.addScriptTag({ content: read('www/theme-quality-assets.js') });
            await page.addScriptTag({ content: read('www/config.js') });
            await page.addScriptTag({ content: read('www/managers.js').split('// --- GLOBALNE INSTANCE ---')[0] });
            await page.addScriptTag({ content: read('www/trophyManager.js') });
            await page.evaluate(() => {
                window.statsManager = new StatsManager();
                window.trophyManager = new TrophyManager(window.statsManager, null);
                window.modalManager = new ModalManager();
                window.app = { socket: { connected: false }, prepareTreasuryTheme: async () => true,
                    applyTheme(theme) { document.body.className = theme === 'dark' ? '' : theme + '-theme'; },
                    navigateTo(id) { document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === id)); },
                    showMainMenu() { this.navigateTo('main-menu'); } };
            });
            await page.addScriptTag({ content: read('www/riznica.js') });
            await page.evaluate(intro => intro ? riznicaManager.open() : riznicaManager.showRiznica(), intro);
            await page.locator('#riznica-screen.active').waitFor();
            await page.waitForFunction(() => document.getElementById('riznica-intro').classList.contains('hidden'));
        };
        const card = title => page.locator('#riznica-shop-container .card').filter({ has: page.locator('.title', { hasText: title }) });
        const stored = key => page.evaluate(key => localStorage.getItem(key), key);
        const dismiss = () => page.locator('#cm-ok').click();
        for (const viewport of [{ width: 360, height: 780 }, { width: 1280, height: 900 }]) {
            await page.setViewportSize(viewport);
            await page.goto('http://treasury-functional.local/www/fixture.html');
            await page.evaluate(() => {
                localStorage.clear();
                localStorage.setItem('yamb_uid', 'isolated-treasury-ui');
                localStorage.setItem('yamb_lang', 'sr');
                localStorage.setItem('yamb_theme', 'dark');
                localStorage.setItem('yamb_dukati', '30000');
                localStorage.setItem('yamb_stats', JSON.stringify({ balance: 30000, games: 1,
                    unlockedTrophies: ['first_play'], unlockedSkins: [], unlockedEffects: [], unlockedThemes: [] }));
            });
            await bootstrap(true);
            assert.equal(await page.locator('.card').count(), 26);
            assert.equal(await page.locator('.card.locked').count(), 25);
            await page.evaluate(async () => {
                const trophy = SHOP_DATA.TROPHIES.find(item => item.id === 'prophet');
                await trophyManager.unlock(trophy, { flags: { hasProphet: true } }, { silent: true }).claimPromise;
            });
            assert.equal(await page.locator('.card.locked').count(), 24, 'Award refreshes the visible trophy card');
            assert.equal(await stored('yamb_dukati'), '31500');
            assert.equal(await page.evaluate(() => shop.balance), 31500, 'Award refreshes the visible balance');
            await page.evaluate(() => {
                trophyManager.rollbackLocalTrophy('prophet', 1500);
                trophyManager.removePendingClaim('prophet');
            });
            assert.equal(await page.locator('.card.locked').count(), 25, 'Rollback refreshes the visible card');
            assert.equal(await page.evaluate(() => shop.balance), 30000);
            console.log(`PASS: ${viewport.width}px trophy award and rollback refresh ownership and balance without reopening Treasury.`);
            await page.locator('#tab-skins').click();
            await card('Kazino Red').locator('.btn-buy').click();
            await page.locator('#cm-cancel').click();
            assert.equal(await stored('yamb_dukati'), '30000');
            await card('Kazino Red').locator('.btn-buy').click();
            await dismiss(); await dismiss();
            assert.equal(await stored('yamb_dukati'), '28500');
            await card('Kazino Red').locator('.btn-equip').click();
            assert.equal(await stored('yamb_active_skin'), 'classic_red');
            assert.equal(await card('Kazino Red').locator('.btn-active').count(), 1);
            await page.locator('#tab-effects').click();
            assert.equal(await card('Gromovnik').count(), 1);
            assert.equal(await card('Gromovnik').locator('.btn-buy').count(), 0);
            const firefliesName = await page.evaluate(() => resolveText(SHOP_DATA.EFFECTS.find(item => item.id === 'fireflies').name));
            await card(firefliesName).locator('.btn-buy').click();
            await dismiss(); await dismiss();
            await card(firefliesName).locator('.btn-equip').click();
            assert.equal(await stored('yamb_active_effect'), 'fireflies');
            await page.locator('#tab-themes').click();
            const easterName = await page.evaluate(() => resolveText(SHOP_DATA.THEMES.find(item => item.id === 'easter').name));
            await card(easterName).locator('.btn-buy').click();
            await dismiss(); await dismiss();
            await card(easterName).locator('.btn-equip').click();
            assert.equal(await stored('yamb_theme'), 'easter');
            assert.equal(await stored('yamb_dukati'), '13500');
            await page.evaluate(() => {
                const sources = [...document.querySelectorAll('img[data-theme-src]:not([src])')];
                sources.forEach(el => el.src = resolveThemeQualityAsset(el.dataset.themeSrc));
            });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            const out = path.join(root, 'tmp/treasury-functional');
            fs.mkdirSync(out, { recursive: true });
            await page.screenshot({ path: path.join(out, `treasury-${viewport.width}.png`) });
            await page.reload(); await bootstrap();
            await page.locator('#tab-skins').click();
            assert.equal(await card('Kazino Red').locator('.btn-active').count(), 1);
            await page.locator('#tab-effects').click();
            assert.equal(await card(firefliesName).locator('.btn-active').count(), 1);
            await page.locator('#tab-themes').click();
            assert.equal(await card(easterName).locator('.btn-active').count(), 1);
            await page.locator('#riznica-screen .riznica-close-btn').click();
            assert.equal(await page.locator('#main-menu').evaluate(el => el.classList.contains('active')), true);
            console.log(`PASS: ${viewport.width}px real tab clicks, cancel/confirm, purchases, equip, locked content, reload and close.`);
        }
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
