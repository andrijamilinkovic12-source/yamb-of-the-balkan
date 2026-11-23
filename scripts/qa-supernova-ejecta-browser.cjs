const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/supernova-ejecta-preview';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark', 390, 844], ['light', 1280, 800], ['neon', 320, 480]]) {
            const page = await browser.newPage({ viewport: { width, height } }), errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=supernova&theme=' + theme);
            await page.waitForSelector('.sn-board-projection');
            const before = await page.evaluate(() => {
                qaFx.fx.stop();
                const board = document.querySelector('.qa-board'), r = board.getBoundingClientRect();
                const nums = [...board.querySelectorAll('.qa-board-grid > span')].filter(n => n.textContent === '48');
                nums.forEach((n,i) => n.textContent = String(i === 0 ? 0 : 10+i));
                const read = () => ({html: board.innerHTML, style: board.getAttribute('style'), filter: getComputedStyle(board).filter,
                    bounds: board.getBoundingClientRect().toJSON()});
                window.boardState = read;
                const target = nums[Math.floor(nums.length / 3)], orig = target.getBoundingClientRect();
                const cx = r.left + r.width/2, cy = r.top + r.height/2;
                window.samples = [];
                const paint = CanvasRenderingContext2D.prototype.fillText;
                CanvasRenderingContext2D.prototype.fillText = function(value, x, y, ...rest) {
                    if (this.canvas.classList.contains('sn-canvas') && value === target.textContent) {
                        const m = this.getTransform(), dpr = this.canvas.width / innerWidth;
                        samples.push({ zoom: m.a / dpr, dist: Math.hypot(m.e/dpr-cx, m.f/dpr-cy) });
                    }
                    return paint.call(this, value, x, y, ...rest);
                };
                return { state: read(), dist: Math.hypot(orig.x+orig.width/2-cx, orig.y+orig.height/2-cy) };
            });
            await page.locator('[data-effect=play]').click();
            await page.waitForFunction(() => samples.some(p => p.zoom > 1.70));
            const sample = await page.evaluate(() => samples.find(p => p.zoom > 1.70));
            assert(sample.dist > before.dist * 1.15, 'A real score moves away from the centre as it grows');
            await page.screenshot({path: output + '/' + theme + '-blast.png'});
            await page.waitForSelector('.supernova-container', {state:'detached'});
            assert.deepEqual(await page.evaluate(() => boardState()), before.state);
            assert.equal(await page.evaluate(() => document.querySelector('.qa-board').getAnimations().length), 0);
            if (theme === 'dark') {
                // Change turns immediately after triggering, before the awaited preload resumes.
                await page.evaluate(() => {
                    const first = document.createElement('div');
                    first.id = 'ptable-0'; first.className = 'player-table';
                    first.style.cssText = 'position:fixed;top:70px;width:130px;height:85px;opacity:1!important';
                    first.innerHTML = '<div class="grid-cell"><button disabled class="score-btn filled">0</button></div>';
                    document.body.append(first);
                    document.querySelector('.qa-board').id = 'ptable-1';
                    app.currentPlayerIdx = 0; qaFx.run('supernova'); app.currentPlayerIdx = 1;
                });
                await page.waitForFunction(() => getComputedStyle(document.querySelector('#ptable-0')).filter.includes('opacity(0)'));
                assert.equal(await page.locator('#ptable-1').evaluate(n => getComputedStyle(n).filter), 'none');
                await page.evaluate(() => qaFx.setTheme('light'));
                assert.equal(await page.locator('.supernova-container').count(), 0);
                assert.equal(await page.locator('#ptable-0').evaluate(n => getComputedStyle(n).filter), 'none');
                assert(await page.locator('#ptable-0 button').isDisabled());
                assert.equal(await page.locator('#ptable-0 button').textContent(), '0');
                await page.emulateMedia({reducedMotion:'reduce'}); await page.evaluate(() => qaFx.run('supernova'));
                await page.waitForSelector('.supernova-container');
                assert.equal(await page.locator('.sn-board-projection').count(), 0);
            }
            assert.deepEqual(errors, []); await page.close();
        }
        console.log('Supernova browser passed: three viewports, scores travel out and enlarge, exact restoration, scoring board anchored before turn switch, reduced motion.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
