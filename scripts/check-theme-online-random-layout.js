// Browser audit of the Online Random waiting room on portrait phones.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const pageUrl = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }];

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const failures = [];
    const typography = new Map();
    const geometry = new Map();
    let checked = 0;
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const theme of themes) for (const state of ['searching', 'found']) {
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
            const result = await page.evaluate(({ theme, state }) => {
                document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
                const screen = document.getElementById('waiting-screen');
                document.querySelectorAll('.screen').forEach(other => other.classList.remove('active'));
                screen.classList.add('active', 'is-random-online');
                const searching = document.getElementById('waiting-opp-searching');
                const found = document.getElementById('waiting-opp-found');
                searching.style.display = state === 'searching' ? 'flex' : 'none';
                found.style.display = state === 'found' ? 'flex' : 'none';
                document.getElementById('waiting-my-name').textContent = 'Andrija Milinković';
                document.getElementById('waiting-opp-name').textContent = 'Aleksandar Petrović-Pavlović';
                const hof = document.getElementById('ws-hall-of-fame');
                hof.classList.remove('hidden');
                document.getElementById('ws-hof-list').innerHTML = Array.from({ length: 3 }, (_, i) =>
                    `<div class="waiting-hof-entry"><div class="waiting-hof-person"><span class="waiting-podium-mark">${i + 1}</span><span class="waiting-hof-name">Aleksandar Petrović-Pavlović</span></div><span class="waiting-hof-score">2860</span></div>`).join('');
                const box = selector => {
                    const element = document.querySelector(selector);
                    const rect = element.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height,
                        scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
                };
                const font = selector => {
                    const style = getComputedStyle(document.querySelector(selector));
                    return `${style.fontSize}|${style.fontFamily}`;
                };
                return {
                    screen: box('#waiting-screen'), header: box('.waiting-header'), status: box('.waiting-status-panel'),
                    myCard: box('.ws-glass-card'), opponent: box('#waiting-opp-box'), vs: box('#waiting-vs-badge'),
                    hall: box('#ws-hall-of-fame'), lastEntry: box('.waiting-hof-entry:last-child'),
                    typography: Object.fromEntries(['#waiting-title','#wait-msg','.ws-glass-name','.ws-g-stat','.waiting-opp-searching-text','.waiting-hof-title','.waiting-hof-name'].map(selector => [selector, font(selector)])),
                    surfaces: ['.waiting-header','.waiting-status-panel','.ws-glass-card','#waiting-opp-box','.waiting-hof-entry'].map(selector => ({ selector, color: getComputedStyle(document.querySelector(selector)).color, background: getComputedStyle(document.querySelector(selector)).backgroundColor }))
                };
            }, { theme, state });
            checked++;
            const key = `${viewport.width}x${viewport.height}/${state}`;
            if (!typography.has(key)) typography.set(key, result.typography);
            else if (JSON.stringify(typography.get(key)) !== JSON.stringify(result.typography)) failures.push({ theme, viewport, state, reason: 'typography', reference: typography.get(key), actual: result.typography });
            const measures = Object.fromEntries(['header', 'status', 'myCard', 'opponent', 'vs', 'hall'].map(role => [role, { width: result[role].width, height: result[role].height }]));
            if (!geometry.has(key)) geometry.set(key, measures);
            else for (const role of Object.keys(measures)) for (const size of ['width', 'height'])
                if (Math.abs(measures[role][size] - geometry.get(key)[role][size]) > 2)
                    failures.push({ theme, viewport, state, reason: `${role} ${size} differs from Green`, reference: geometry.get(key)[role][size], actual: measures[role][size] });
            if (result.myCard.height !== result.opponent.height || Math.abs(result.myCard.width - result.opponent.width) > 1 ||
                result.header.left < 8 || result.header.right > viewport.width - 8 || result.hall.bottom > viewport.height - 10 ||
                result.screen.scrollHeight > result.screen.clientHeight + 1) {
                failures.push({ theme, viewport, state, reason: 'geometry', result });
            }
        }
    }
    await browser.close();
    if (failures.length) {
        console.error(`${failures.length}/${checked} layout failures: ${JSON.stringify(failures.slice(0, 4), null, 2)}`);
        process.exitCode = 1;
    } else console.log(`${checked} Online Random layouts fit and match Green typography.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
