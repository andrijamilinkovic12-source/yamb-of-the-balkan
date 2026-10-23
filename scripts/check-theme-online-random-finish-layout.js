// Browser audit of the shared Online Random result, including Rematch.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const preview = pathToFileURL(path.resolve(__dirname, '../docs/theme-solo-finish-screen-mobile.html')).href;
const onlineCss = path.resolve(__dirname, '../www/theme-online-random-finish.css');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }];

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const failures = [];
    const typography = new Map();
    let checked = 0;
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const theme of themes) for (const outcome of ['win', 'draw']) {
            await page.goto(`${preview}?theme=${theme}&record=pwma&tier=solo_masterful&column=Najava`, { waitUntil: 'load' });
            await page.addStyleTag({ path: onlineCss });
            const result = await page.evaluate(({ outcome, safe }) => {
                const screen = document.getElementById('game-over-screen');
                screen.classList.add('is-online-duel-result', 'is-hotseat-result');
                if (safe) for (const [key, value] of Object.entries({ '--safe-top': '24px', '--safe-bottom': '28px', '--safe-left': '16px', '--safe-right': '16px' }))
                    document.documentElement.style.setProperty(key, value);
                document.getElementById('go-title').textContent = outcome === 'win' ? 'POBEDA!' : 'NEREŠENO!';
                const scores = document.createElement('div');
                scores.className = 'hotseat-result-scores';
                scores.innerHTML = `<div class="hotseat-result-player"><span class="hotseat-result-role">TI</span><span class="hotseat-result-name">Andrija Milinković</span><strong class="hotseat-result-points">2860</strong></div><div class="hotseat-result-player"><span class="hotseat-result-role">PROTIVNIK</span><span class="hotseat-result-name">Aleksandar Petrović-Pavlović</span><strong class="hotseat-result-points">${outcome === 'win' ? 2530 : 2860}</strong></div>`;
                document.querySelector('.game-over-score-card').prepend(scores);
                const comment = document.createElement('p');
                comment.id = 'hotseat-result-comment';
                comment.className = 'hotseat-result-comment';
                comment.textContent = 'Andrija Milinković je odigrao odlučnije od Aleksandar Petrović-Pavlović.';
                document.getElementById('solo-finish-stats').after(comment);
                const button = document.createElement('button');
                button.id = 'btn-rematch';
                button.className = 'btn-menu';
                button.innerHTML = '<img id="go-rematch-icon" alt=""><span id="go-rematch-label">Revanš</span>';
                document.querySelector('.game-over-claim-button').after(button);
                const rect = selector => {
                    const el = document.querySelector(selector);
                    const box = el.getBoundingClientRect();
                    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height,
                        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
                };
                const font = selector => {
                    const style = getComputedStyle(document.querySelector(selector));
                    return `${style.fontSize}|${style.fontFamily}`;
                };
                return {
                    card: rect('#game-over-screen > .modal-box'), claim: rect('.game-over-claim-button'), rematch: rect('#btn-rematch'),
                    ad: rect('#btn-ad-double'), scoreRows: [...scores.children].map(el => ({ scroll: el.scrollHeight, client: el.clientHeight })),
                    typography: Object.fromEntries(['#go-title','#go-msg','.hotseat-result-name','.hotseat-result-points','#hotseat-result-comment','#btn-ad-double','.game-over-claim-button','#btn-rematch'].map(selector => [selector, font(selector)]))
                };
            }, { outcome, safe: viewport.width === 320 });
            checked++;
            const key = `${viewport.width}x${viewport.height}/${outcome}`;
            if (!typography.has(key)) typography.set(key, result.typography);
            else if (JSON.stringify(result.typography) !== JSON.stringify(typography.get(key))) failures.push({ viewport, theme, outcome, reason: 'typography differs from Green', reference: typography.get(key), actual: result.typography });
            const margin = viewport.width === 320 ? 15 : 11;
            if (result.card.left < margin || result.card.right > viewport.width - margin ||
                result.card.top < (viewport.width === 320 ? 23 : 10) ||
                result.card.bottom > viewport.height - (viewport.width === 320 ? 27 : 10) ||
                result.card.scrollHeight > result.card.clientHeight + 1 ||
                result.rematch.bottom > result.card.bottom - 1 || result.claim.bottom > result.card.bottom - 1 ||
                result.scoreRows.some(row => row.scroll > row.client + 1)) failures.push({ viewport, theme, outcome, reason: 'overflow', result });
        }
    }
    await browser.close();
    if (failures.length) {
        console.error(`${failures.length}/${checked} Online Random finish layouts failed: ${JSON.stringify(failures.slice(0, 3), null, 2)}`);
        process.exitCode = 1;
    } else console.log(`${checked} Online Random finish layouts fit with Rematch and match Green typography.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
