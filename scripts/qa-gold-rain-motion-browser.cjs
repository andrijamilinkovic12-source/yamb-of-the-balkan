const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/gold-rain-motion';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['neon', 320, 480], ['light', 1280, 800]]) {
            const page = await browser.newPage({ viewport: { width, height } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=gold_rain&theme=' + theme);
            await page.locator('.gold-rain-particle').first().waitFor({ state: 'attached' });
            const stats = await page.evaluate(() => {
                const coins = [...document.querySelectorAll('.gold-rain-particle')];
                const [fall, rock] = coins[0].getAnimations();
                for (const coin of coins) for (const animation of coin.getAnimations()) animation.pause();
                const {delay, duration} = fall.effect.getTiming();
                const progress = [0, .25, .5, .75, 1];
                const ys = progress.map(t => {
                    fall.currentTime = delay + duration * t;
                    const box = coins[0].getBoundingClientRect();
                    return box.y + box.height / 2;
                });
                const cycle = rock.effect.getTiming();
                const tilts = [0, .5, 1].map(t => {
                    rock.currentTime = cycle.delay + cycle.duration * (2 + t);
                    return getComputedStyle(coins[0]).transform;
                });
                for (const coin of coins) for (const animation of coin.getAnimations()) animation.currentTime = 2200;
                const visible = coins.filter(coin => {
                    const r = coin.getBoundingClientRect();
                    return coin.naturalWidth && Number(getComputedStyle(coin).opacity) > .5 &&
                        r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
                });
                return {ys, tilts, count: coins.length, visible: visible.length,
                    poses: [...new Set(visible.map(c => c.src))].length};
            });
            assert.equal(stats.count, width < 640 ? 72 : 104);
            assert(stats.visible >= stats.count / 2 && stats.poses === 3, JSON.stringify(stats));
            const dy = stats.ys.slice(1).map((y, i) => y - stats.ys[i]);
            assert(dy.every((v, i) => v > 0 && (!i || v > dy[i-1])), 'The fall must accelerate');
            assert.equal(new Set(stats.tilts).size, 3, 'The coin should rock independently of its descent');
            await page.screenshot({ path: output + '/' + theme + '.png' });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.locator('[data-effect=play]').click();
            const still = page.locator('.gold-rain-static-particle');
            await still.first().waitFor();
            assert.equal(await still.count(), 3);
            assert.equal(await still.evaluateAll(coins => coins.flatMap(c => c.getAnimations()).length), 0);
            assert.deepEqual(errors, []);
            console.log(theme, width, 'x', height, stats.visible, 'visible, all three poses');
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
