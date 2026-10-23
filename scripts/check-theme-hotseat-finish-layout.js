// Browser check of the shared Hotseat result card on portrait phones.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const preview = pathToFileURL(path.resolve(__dirname, '../docs/theme-solo-finish-screen-mobile.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }];
const outcomes = [
    { title: 'POBEDA!', scores: ['2860', '2530'], comment: 'Andrija Milinković je odigrao odlučnije od Aleksandar Petrović.' },
    { title: 'NEREŠENO!', scores: ['2860', '2860'], comment: 'Andrija Milinković i Aleksandar Petrović završili su izjednačeno.' },
    { title: 'POBEDA!', scores: ['2860', '2530'], names: ['Aleksandar Maksimović', 'Miroslav Petrović-Pavlović'], comment: 'Aleksandar Maksimović je za nijansu bio bolji od Miroslav Petrović-Pavlović u ovoj partiji.' }
];

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage({ deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const failures = [];
    let checked = 0;
    let minimumScoreContrast = Infinity;
    const typography = new Map();
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const theme of themes) for (const record of ['none', 'pwma', 'pending']) for (const outcome of outcomes) {
            await page.goto(`${preview}?theme=${theme}&record=${record}&tier=solo_masterful&column=Najava`, { waitUntil: 'load' });
            const result = await page.evaluate(({ outcome, safe }) => {
                const screen = document.getElementById('game-over-screen');
                screen.classList.add('is-hotseat-result');
                screen.classList.toggle('has-result-winner', outcome.title !== 'NEREŠENO!');
                if (safe) for (const [key, value] of Object.entries({ '--safe-top': '24px', '--safe-bottom': '28px', '--safe-left': '16px', '--safe-right': '16px' })) document.documentElement.style.setProperty(key, value);
                const title = document.getElementById('go-title');
                title.textContent = outcome.title;
                const tier = document.createElement('div');
                tier.className = 'game-over-tier-title';
                tier.textContent = 'MAJSTORSKA PARTIJA';
                title.after(tier);
                const scores = document.createElement('div');
                scores.className = 'hotseat-result-scores';
                const names = outcome.names || ['Andrija Milinković', 'Aleksandar Petrović'];
                scores.innerHTML = `<div class="hotseat-result-player is-winner"><span class="hotseat-result-role">NALOG</span><span class="hotseat-result-name">${names[0]}</span><strong class="hotseat-result-points">${outcome.scores[0]}</strong></div><div class="hotseat-result-player"><span class="hotseat-result-role">GOST</span><span class="hotseat-result-name">${names[1]}</span><strong class="hotseat-result-points">${outcome.scores[1]}</strong></div>`;
                document.querySelector('.game-over-score-card').prepend(scores);
                const comment = document.createElement('p');
                comment.id = 'hotseat-result-comment';
                comment.className = 'hotseat-result-comment';
                comment.textContent = outcome.comment;
                document.getElementById('solo-finish-stats').after(comment);
                const card = document.querySelector('#game-over-screen > .modal-box');
                const box = card.getBoundingClientRect();
                const claim = document.querySelector('.game-over-claim-button').getBoundingClientRect();
                const ad = document.getElementById('btn-ad-double').getBoundingClientRect();
                const scoreRows = [...scores.children].map(row => ({ height: row.getBoundingClientRect().height, scrollHeight: row.scrollHeight, clientHeight: row.clientHeight }));
                const luminance = color => {
                    const channels = (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(value => {
                        const unit = value / 255;
                        return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
                    });
                    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
                };
                const contrast = (foreground, background) => {
                    const values = [luminance(foreground), luminance(background)];
                    return (Math.max(...values) + .05) / (Math.min(...values) + .05);
                };
                const selectors = ['#go-title', '#go-msg', '.game-over-tier-title', '.hotseat-result-role', '.hotseat-result-name', '.hotseat-result-points', '#hotseat-result-comment', '.solo-record-panel-title', '#btn-ad-double', '.game-over-claim-button'];
                return {
                    box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
                    scrollHeight: card.scrollHeight, clientHeight: card.clientHeight,
                    claimBottom: claim.bottom, adBottom: ad.bottom, scoreRows,
                    typography: Object.fromEntries(selectors.map(selector => {
                        const style = getComputedStyle(document.querySelector(selector));
                        return [selector, `${style.fontSize}|${style.fontFamily}`];
                    })),
                    themeInk: getComputedStyle(scores.firstElementChild).color,
                    themeSurface: getComputedStyle(scores.firstElementChild).backgroundColor,
                    scoreContrast: contrast(getComputedStyle(scores.firstElementChild).color, getComputedStyle(scores.firstElementChild).backgroundColor),
                };
            }, { outcome, safe: viewport.width === 320 });
            checked++;
            minimumScoreContrast = Math.min(minimumScoreContrast, result.scoreContrast);
            const key = `${viewport.width}x${viewport.height}`;
            if (!typography.has(key)) typography.set(key, result.typography);
            else if (JSON.stringify(result.typography) !== JSON.stringify(typography.get(key))) failures.push({ viewport, theme, record, outcome: outcome.title, reason: 'typography differs from Green', expected: typography.get(key), result });
            const { box } = result;
            const minLeft = viewport.width === 320 ? 15 : 11;
            const minTop = viewport.width === 320 ? 23 : 11;
            const maxBottom = viewport.height - (viewport.width === 320 ? 27 : 11);
            if (box.left < minLeft || box.right > viewport.width - minLeft || box.top < minTop || box.bottom > maxBottom
                || result.scrollHeight > result.clientHeight + 1 || result.claimBottom > box.bottom - 1
                || result.adBottom > result.claimBottom || result.scoreRows.some(row => row.scrollHeight > row.clientHeight + 1)
                || result.scoreContrast < 4.5) {
                failures.push({ viewport, theme, record, outcome: outcome.title, reason: 'overflow or safe area', result });
            }
        }
    }
    await browser.close();
    if (failures.length) {
        console.error(`${failures.length}/${checked} Hotseat layouts failed: ${JSON.stringify({ byViewport: Object.fromEntries(viewports.map(viewport => [`${viewport.width}x${viewport.height}`, failures.filter(failure => failure.viewport.width === viewport.width).length])), examples: failures.slice(0, 2) }, null, 2)}`);
        process.exitCode = 1;
    } else console.log(`${checked} Hotseat layouts fit; type sizes match Green at each viewport; minimum score-card contrast ${minimumScoreContrast.toFixed(2)}:1.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
