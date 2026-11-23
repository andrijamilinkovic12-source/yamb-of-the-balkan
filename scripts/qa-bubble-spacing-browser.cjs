const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/bubble-spacing';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme,width,height] of [['dark',390,844], ['neon',320,480], ['light',1280,800]]) {
            const page = await browser.newPage({ viewport: {width,height} });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?theme=' + theme + '&effect=bubbles');
            const bubbles = page.locator('.bubble-field img');
            await bubbles.first().waitFor({state:'attached'});
            let covered = 0, visible = 0, count;
            for (const seed of [137,5009,8219,23081]) {
                const result = await page.evaluate(async seed => {
                    const native = Math.random;
                    try {
                        Math.random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
                        await qaFx.fx.spawnBubbles();
                    } finally { Math.random = native; }
                    const imgs = [...document.querySelectorAll('.magic-bubble')];
                    await imgs[0].decode();
                    const animations = imgs.map(el => el.getAnimations()[0]);
                    animations.forEach(a => a.pause());
                    let visible = 0, covered = 0;
                    for (let ms = 500; ms <= 6700; ms += 200) {
                        animations.forEach(a => { a.currentTime = ms; });
                        const small = [], large = [];
                        for (const img of imgs) {
                            if (img.classList.contains('magic-bubble--medium')) continue;
                            const r = img.getBoundingClientRect(), x = r.x+r.width/2, y = r.y+r.height/2;
                            if (x < 0 || x > innerWidth || y < 0 || y > innerHeight || +getComputedStyle(img).opacity < .55) continue;
                            (img.classList.contains('magic-bubble--small') ? small : large).push({x,y,r:img.offsetWidth / 2});
                        }
                        visible += small.length;
                        covered += small.filter(s => large.some(l => Math.hypot(s.x-l.x,s.y-l.y) < l.r - s.r*.35)).length;
                    }
                    animations.forEach(a => { a.currentTime = 2800; });
                    return { count:imgs.length, visible, covered };
                },seed);
                visible += result.visible; covered += result.covered; count = result.count;
            }
            await page.screenshot({path: output + '/' + theme + '.png'});
            assert(visible > 100 && new Set(await bubbles.evaluateAll(els => els.map(el => el.currentSrc))).size === 1);
            assert.equal(count, width <= 760 ? 30 : 42);
            const limit = width === 320 ? .135 : width === 390 ? .06 : .016;
            assert(covered / visible < limit, theme + ': small bubbles frequently hide inside large ones');
            console.log(theme, width + 'x' + height, count, 'bubbles;', covered + '/' + visible, 'visible small centers inside large bubbles');
            await page.emulateMedia({ reducedMotion:'reduce' });
            await page.locator('[data-effect=play]').click();
            await page.locator('.bubble-field--reduced').waitFor();
            assert.equal(await bubbles.count(),3);
            assert.equal(await bubbles.evaluateAll(els => els.flatMap(el => el.getAnimations()).length),0);
            assert(await bubbles.evaluateAll(els => els.every(el => {
                const r = el.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
            })), 'Static bubbles must all fit on screen');
            await page.locator('[data-effect=stop]').click();
            assert.equal(await bubbles.count(),0);
            assert.deepEqual(errors,[]);
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
