const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/firefly-flight';

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'msedge' });
    try {
        for (const [theme, width, height] of [['dark',390,844], ['neon',320,480], ['light',1280,800]]) {
            const page = await browser.newPage({ viewport: {width,height} });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(base + '/qa/theme-live-effects-review.html?effect=fireflies&theme=' + theme);
            const images = page.locator('.magic-firefly__frame img');
            await images.first().waitFor({ state:'attached' });
            const result = await images.evaluateAll(async images => {
                await images[0].decode();
                for (const a of document.querySelector('.firefly-field').getAnimations({ subtree:true })) {
                    a.pause(); a.currentTime = 2400;
                }
                const img = images.find(el => el.style.top === '0%');
                const [wing] = img.getAnimations();
                const { delay, duration } = wing.effect.getTiming();
                const width = parseFloat(getComputedStyle(img.parentNode).width);
                const steps = [.01,.24,.46,.68,.90].map(t => {
                    wing.currentTime = delay + duration * (2 + t);
                    return Math.round(Math.abs(new DOMMatrix(getComputedStyle(img).transform).m41) / width);
                });
                const canvas = document.createElement('canvas');
                const size = img.naturalWidth / 5;
                canvas.width = canvas.height = size;
                const ctx = canvas.getContext('2d', { willReadFrequently:true });
                function cell(col, row) {
                    ctx.clearRect(0,0,size,size);
                    ctx.drawImage(img,col*size,row*size,size,size,0,0,size,size);
                    return ctx.getImageData(0,0,size,size).data;
                }
                const strokes = [0,1,2].map(row => {
                    const a = cell(0,row), b = cell(4,row);
                    let moving = 0, bodyMotion = 0, bodyPixels = 0;
                    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                        const i = (y*size+x)*4;
                        const diff = Math.abs(a[i+3]-b[i+3]);
                        if (diff > 50) moving++;
                        if (y >= size*.70 && a[i+3] > 128) {
                            bodyPixels++;
                            if (diff > 10) bodyMotion++;
                        }
                    }
                    return { moving, bodyMotion, bodyPixels };
                });
                return { steps, strokes, rows: [...new Set(images.map(el => el.style.top))],
                    count: images.length, clip: getComputedStyle(img.parentNode).overflow,
                    safeBottom: document.querySelector('.firefly-flight').getBoundingClientRect().bottom };
            });
            assert.deepEqual(result.steps, [0,1,2,3,4]);
            assert.equal(result.rows.length,3);
            assert.equal(result.clip,'hidden');
            assert(result.safeBottom < height);
            assert.equal(result.count,width < 760 ? 23 : 32);
            for (const stroke of result.strokes)
                assert(stroke.moving > 120 && stroke.bodyMotion === 0 && stroke.bodyPixels > 0, JSON.stringify(stroke));
            await page.screenshot({ path: output + '/' + theme + '.png' });
            await page.emulateMedia({ reducedMotion:'reduce' });
            await page.locator('[data-effect=play]').click();
            await page.locator('.firefly-field--reduced').waitFor();
            assert.equal(await images.count(),3);
            assert.equal(await images.evaluateAll(nodes => nodes.flatMap(n => n.getAnimations()).length),0);
            await page.locator('[data-effect=stop]').click();
            assert.equal(await page.locator('.firefly-field').count(),0);
            assert.deepEqual(errors,[]);
            console.log(theme, width, height, 'five wing frames, three poses, stable tail, reduced motion and stop passed');
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
