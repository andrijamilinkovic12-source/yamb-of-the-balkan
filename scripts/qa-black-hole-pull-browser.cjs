const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/black-hole-pull-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['light', 1280, 800], ['neon', 320, 480]]) {
            const page = await browser.newPage({ viewport: { width, height } }), errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=black_hole&theme=' + theme);
            await page.waitForFunction(() => window.qaFx && document.querySelector('.black-hole-projection'));
            const state = () => page.evaluate(() => {
                const board = document.querySelector('.qa-board'), rect = board.getBoundingClientRect();
                return { bounds: [rect.left, rect.top, rect.width, rect.height], html: board.innerHTML,
                    style: board.getAttribute('style'), opacity: getComputedStyle(board).opacity };
            });
            await page.evaluate(() => qaFx.fx.stop());
            const before = await state();
            await page.locator('[data-effect=play]').click();
            const phase = name => page.waitForFunction(p => document.querySelector('.black-hole-container')?.dataset.pullPhase === p, name);
            await phase('capture'); await page.waitForFunction(() => document.querySelectorAll('[data-bh-score-away]').length >= 17);
            await page.waitForTimeout(260);
            assert(await page.evaluate(() => [...document.querySelectorAll('[data-bh-score-away]')].every(n => n.textContent === '48')));
            await page.screenshot({ path: output + '/' + theme + '-capture.png' });
            await phase('collapse');
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.qa-board')).filter.includes('opacity(0)'));
            const opaque = await page.evaluate(() => {
                const canvas = document.querySelector('.black-hole-projection'), c = canvas.getContext('2d');
                const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
                let solid = 0;
                for (let i = 3; i < pixels.length; i += 16) if (pixels[i] > 40) solid++;
                return solid;
            });
            assert(opaque > 100, 'Visible board projection replaces the veiled board');
            assert.deepEqual((await state()).bounds, before.bounds, 'Original board never moves');
            await page.screenshot({ path: output + '/' + theme + '-collapse.png' });
            await phase('core');
            await page.waitForSelector('.black-hole-container', { state: 'detached' });
            assert.deepEqual(await state(), before);
            assert.equal(await page.locator('[data-bh-score-away]').count(), 0);
            if (theme === 'dark') {
                // Exercise production button markup as well as the demo grid. The visible neighbouring table
                // deliberately comes first so accidental global queries would move its scores too.
                await page.evaluate(() => {
                    const make = id => {
                        const el = document.createElement('div');
                        el.id = 'ptable-' + id; el.className = 'player-table';
                        el.style.cssText = 'position:fixed;left:5px;top:' + (id * 60 + 70) + 'px;width:130px;height:54px;opacity:0.82';
                        el.style.setProperty('opacity', '0.82', 'important');
                        el.innerHTML = '<div class="grid-cell row-header">1</div><div class="grid-cell"><button disabled class="score-btn filled">0</button></div><div class="grid-cell"><button class="score-btn"></button></div>';
                        document.body.appendChild(el);
                    };
                    make(0); make(1); app.currentPlayerIdx = 1; qaFx.run('black_hole');
                });
                await page.waitForSelector('#ptable-1 [data-bh-score-away]');
                assert.equal(await page.locator('#ptable-0 [data-bh-score-away]').count(), 0);
                assert.equal(await page.locator('.row-header[data-bh-score-away], .score-btn:not(.filled)[data-bh-score-away]').count(), 0);
                await phase('collapse');
                await page.waitForFunction(() => getComputedStyle(document.querySelector('#ptable-1')).filter.includes('opacity(0)'));
                assert.equal(await page.locator('#ptable-0').evaluate(el => getComputedStyle(el).filter), 'none');
                await page.evaluate(() => qaFx.fx.stop());
                assert.equal(await page.locator('[data-bh-score-away], .black-hole-container').count(), 0);
                assert(await page.locator('#ptable-1 .score-btn.filled').isDisabled());
                assert.equal(await page.locator('#ptable-1 .score-btn.filled').textContent(), '0');
                assert.equal(await page.locator('#ptable-1').evaluate(el => getComputedStyle(el).opacity), '0.82');
                assert.equal(await page.locator('#ptable-1').evaluate(el => getComputedStyle(el).filter), 'none');
                await page.evaluate(() => qaFx.run('black_hole')); await phase('capture');
                await page.setViewportSize({ width: 410, height }); await page.waitForSelector('.black-hole-container', { state: 'detached' });
                assert.equal(await page.locator('[data-bh-score-away]').count(), 0);
                await page.emulateMedia({ reducedMotion: 'reduce' });
                await page.evaluate(() => qaFx.run('black_hole'));
                await page.waitForSelector('.black-hole-container--reduced');
                assert.equal(await page.locator('.black-hole-projection, [data-bh-score-away]').count(), 0);
            }
            assert.deepEqual(errors, []); await page.close();
        }
        console.log('Black Hole browser QA passed: capture, collapse, exact restoration, interruption, resize, reduced motion and current-board-only score selection.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
