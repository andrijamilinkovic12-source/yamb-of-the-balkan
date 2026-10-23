// Browser geometry check for the Solo finish card and its record panel.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const root = path.resolve(__dirname, '..');
const preview = pathToFileURL(path.join(root, 'docs/theme-solo-finish-screen-mobile.html')).href;
const review = pathToFileURL(path.join(root, 'docs/theme-solo-finish-screen-review.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }];
const records = ['none', 'pwma', 'pending'];
const tiers = ['solo_rough', 'solo_more', 'solo_progress', 'solo_good', 'solo_masterful', 'solo_perfect'];
const columns = ['Nadole', 'Slobodna', 'Sredina', 'Nagore', 'Ručno', 'Najava'];

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH || chromium.executablePath(),
        args: ['--no-sandbox'],
    });
    const page = await browser.newPage({ deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const failures = [];
    const typographyByViewport = new Map();
    let checked = 0;
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const theme of themes) {
            for (const record of records) {
                const cases = viewport.width === 320
                    ? tiers.flatMap((tier, index) => ['1', '2', '3'].map(variant => ({ tier, variant, column: columns[index] })))
                    : [{ tier: 'solo_masterful', variant: '1', column: 'Najava' }];
                for (const { tier, variant, column } of cases) {
                await page.goto(`${preview}?theme=${theme}&record=${record}&tier=${tier}&variant=${variant}&column=${encodeURIComponent(column)}`, { waitUntil: 'load' });
                const geometry = await page.evaluate(() => {
                    const card = document.querySelector('#game-over-screen > .modal-box');
                    const claim = document.querySelector('.game-over-claim-button');
                    const ad = document.getElementById('btn-ad-double');
                    const panel = document.getElementById('solo-record-panel');
                    const bestColumn = document.getElementById('solo-finish-best-column');
                    const column = new URL(location.href).searchParams.get('column');
                    const columnClass = { Nadole: 'c-nadole', Slobodna: 'c-slobodna', Sredina: 'c-sredina', Nagore: 'c-nagore', 'Ručno': 'c-rucno', Najava: 'c-najava' }[column];
                    const boardHeader = document.querySelector(`#game-scene .player-table .col-header.${columnClass}`);
                    const boardIcon = [...boardHeader.querySelectorAll('img')].find(icon => getComputedStyle(icon).display !== 'none');
                    const mark = bestColumn.querySelector('.solo-finish-column-mark');
                    const markIcon = mark.querySelector('img');
                    const box = card.getBoundingClientRect();
                    const typeSelectors = ['#go-title', '#go-msg', '.solo-record-panel-title', '.solo-record-panel-footer', '[data-lang="go_msg_solo"]', '#go-score', '.easter-solo-finish-stats span', '.easter-solo-finish-stats strong', '#btn-ad-double', '.game-over-claim-button'];
                    return {
                        left: box.left, right: box.right, top: box.top, bottom: box.bottom,
                        scrollHeight: card.scrollHeight, clientHeight: card.clientHeight,
                        adBottom: ad.getBoundingClientRect().bottom,
                        claimBottom: claim.getBoundingClientRect().bottom,
                        panelBottom: panel.getBoundingClientRect().bottom,
                        bestColumnFits: bestColumn.scrollWidth <= bestColumn.clientWidth + 1,
                        markColorMatches: getComputedStyle(mark).color === getComputedStyle(boardHeader).color,
                        markSizeMatches: getComputedStyle(mark).fontSize === getComputedStyle(boardHeader).fontSize,
                        markContentMatches: boardIcon
                            ? !!markIcon && markIcon.src === boardIcon.src
                                && getComputedStyle(markIcon).width === getComputedStyle(boardIcon).width
                            : !markIcon && mark.textContent.trim() === boardHeader.textContent.trim(),
                        recordIconsLoaded: [...panel.querySelectorAll('img[data-solo-record-icon]')]
                            .every(image => image.complete && image.naturalWidth === 160),
                        typography: Object.fromEntries(typeSelectors.map(selector => {
                            const style = getComputedStyle(document.querySelector(selector));
                            return [selector, `${style.fontSize}|${style.fontFamily}`];
                        })),
                    };
                });
                checked++;
                const viewportKey = `${viewport.width}x${viewport.height}`;
                if (!typographyByViewport.has(viewportKey)) typographyByViewport.set(viewportKey, geometry.typography);
                else if (JSON.stringify(geometry.typography) !== JSON.stringify(typographyByViewport.get(viewportKey))) {
                    failures.push({ viewport, theme, record, tier, variant, reason: 'typography differs from Green', expected: typographyByViewport.get(viewportKey), actual: geometry.typography });
                }
                if (geometry.left < 11 || geometry.right > viewport.width - 11 || geometry.top < 17 || geometry.bottom > viewport.height - 17 || geometry.scrollHeight > geometry.clientHeight + 1 || geometry.claimBottom > geometry.bottom - 1 || geometry.adBottom > geometry.claimBottom || geometry.panelBottom > geometry.claimBottom || !geometry.bestColumnFits || !geometry.markColorMatches || !geometry.markSizeMatches || !geometry.markContentMatches || !geometry.recordIconsLoaded) {
                    failures.push({ viewport, theme, record, tier, variant, column, geometry });
                }
                }
            }
        }
    }
    await page.setViewportSize({ width: 320, height: 568 });
    for (const theme of themes) {
        await page.goto(`${preview}?theme=${theme}&record=pwma&tier=solo_masterful&variant=1&column=Najava`, { waitUntil: 'load' });
        const safeGeometry = await page.evaluate(() => {
            for (const [name, value] of Object.entries({ '--safe-top': '24px', '--safe-bottom': '28px', '--safe-left': '16px', '--safe-right': '16px' })) {
                document.documentElement.style.setProperty(name, value);
            }
            const card = document.querySelector('#game-over-screen > .modal-box');
            const bounds = card.getBoundingClientRect();
            const claim = document.querySelector('.game-over-claim-button').getBoundingClientRect();
            return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
                scrollHeight: card.scrollHeight, clientHeight: card.clientHeight, claimBottom: claim.bottom };
        });
        if (safeGeometry.left < 15 || safeGeometry.right > 305 || safeGeometry.top < 23 || safeGeometry.bottom > 541
            || safeGeometry.scrollHeight > safeGeometry.clientHeight + 1 || safeGeometry.claimBottom > safeGeometry.bottom - 1) {
            failures.push({ viewport: { width: 320, height: 568 }, theme, reason: 'safe-area inset', geometry: safeGeometry });
        }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(review, { waitUntil: 'load' });
    const payoutLabels = async () => page.evaluate(() => ({
        score: document.getElementById('payout-score').textContent,
        bonus: document.getElementById('payout-bonus').textContent,
        base: document.getElementById('payout-base').textContent,
        ad: document.getElementById('payout-ad').textContent
    }));
    const expectedLabels = [
        { score: '2.860', bonus: '+50%', base: '4.290 dukata', ad: '8.000 dukata' },
        { score: '2.860', bonus: '+0%', base: '2.860 dukata', ad: '5.720 dukata' },
        { score: '2.860', bonus: 'Čeka potvrdu', base: 'Čeka potvrdu', ad: 'Čeka potvrdu' },
        { score: '650', bonus: '+10%', base: '715 dukata', ad: '1.430 dukata' }
    ];
    const actualLabels = [await payoutLabels()];
    await page.selectOption('#record', 'none');
    actualLabels.push(await payoutLabels());
    await page.selectOption('#record', 'pending');
    actualLabels.push(await payoutLabels());
    await page.selectOption('#record', 'p');
    await page.selectOption('#tier', 'solo_rough');
    actualLabels.push(await payoutLabels());
    for (let index = 0; index < expectedLabels.length; index++) {
        if (JSON.stringify(actualLabels[index]) !== JSON.stringify(expectedLabels[index])) {
            failures.push({ reviewCase: index, expected: expectedLabels[index], actual: actualLabels[index] });
        }
    }
    await browser.close();
    if (failures.length) {
        const byViewport = Object.fromEntries(viewports.map(({ width, height }) => [
            `${width}x${height}`,
            failures.filter(failure => failure.viewport?.width === width && failure.viewport?.height === height).length,
        ]));
        console.error(`${failures.length} of ${checked} Solo finish layouts failed:`, JSON.stringify({ byViewport, examples: failures.slice(0, 6) }, null, 2));
        process.exitCode = 1;
    } else {
        console.log(`${checked} Solo finish layouts plus 10 simulated safe-area cases fit without scrolling; typography and four payout states correct`);
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
