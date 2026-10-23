// The invited guest uses the same waiting screen with a different state.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const definitions = require('../docs/theme-definitions.json');
const url = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']
    .filter(theme => !process.env.AUDIT_THEME || theme === 'dark' || theme === process.env.AUDIT_THEME);
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 360, height: 780 }, { width: 390, height: 844 }, { width: 430, height: 932 }];

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const issues = [];
    const baseline = new Map();
    let checked = 0;
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const theme of themes) for (const state of ['searching', 'found']) {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const result = await page.evaluate(({ theme, state }) => {
                document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
                document.body.style.setProperty('--safe-bottom', '48px');
                document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
                const screen = document.getElementById('waiting-screen');
                screen.classList.add('active', 'is-friend-invite');
                screen.classList.remove('is-hosting-invite', 'is-random-online');
                document.getElementById('waiting-title').textContent = 'POZOVI PRIJATELJA';
                document.getElementById('wait-msg').textContent = 'Povezivanje sa prijateljem...';
                document.getElementById('waiting-my-name').textContent = 'Andrija Milinković';
                document.getElementById('waiting-opp-name').textContent = 'Aleksandar Petrović-Pavlović';
                document.getElementById('friends-list-container').classList.add('hidden');
                document.getElementById('ws-hall-of-fame').classList.add('hidden');
                document.getElementById('waiting-opp-box').style.display = 'flex';
                document.getElementById('waiting-vs-badge').style.display = 'grid';
                document.getElementById('waiting-opp-searching').style.display = state === 'searching' ? 'flex' : 'none';
                document.getElementById('waiting-opp-found').style.display = state === 'found' ? 'flex' : 'none';
                const box = selector => { const element = document.querySelector(selector); const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom, width: rect.width, height: rect.height, font: style.fontSize, family: style.fontFamily, color: style.color }; };
                return { screen: box('#waiting-screen'), header: box('.waiting-header'), status: box('.waiting-status-panel'), my: box('.ws-vs-area-horizontal > .ws-glass-card'), opponent: box('#waiting-opp-box'), vs: box('#waiting-vs-badge'), title: box('#waiting-title'), message: box('#wait-msg'), name: box('.ws-glass-name'), label: box('.ws-g-stat .lbl'), value: box('.ws-g-stat .val'), scroll: screen.scrollHeight - screen.clientHeight };
            }, { theme, state });
            checked++;
            const key = `${viewport.width}x${viewport.height}/${state}`;
            if (!baseline.has(key)) baseline.set(key, result);
            else {
                const green = baseline.get(key);
                for (const part of ['header', 'status', 'my', 'opponent', 'vs']) for (const axis of ['width', 'height'])
                    if (Math.abs(result[part][axis] - green[part][axis]) > 2) issues.push(`${key}/${theme}: ${part} ${axis} ${result[part][axis]} vs ${green[part][axis]}`);
                for (const part of ['title', 'message', 'name'])
                    if (result[part].font !== green[part].font || result[part].family !== green[part].family) issues.push(`${key}/${theme}: ${part} font ${result[part].font} vs ${green[part].font}`);
            }
            if (result.my.x < 8 || result.opponent.right > viewport.width - 8 || result.opponent.bottom > viewport.height - 56 || result.scroll > 1)
                issues.push(`${key}/${theme}: safe zone ${JSON.stringify({ myX: result.my.x, opponentRight: result.opponent.right, opponentBottom: result.opponent.bottom, scroll: result.scroll })}`);
            if (theme !== 'dark') {
                const palette = definitions.themes.find(item => item.id === theme).paletteHex;
                const rgb = hex => `rgb(${[1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)).join(', ')})`;
                for (const [part, paletteKey] of [['title', 'primary'], ['message', 'text'], ['label', 'textMuted'], ['value', 'text']])
                    if (result[part].color !== rgb(palette[paletteKey])) issues.push(`${key}/${theme}: ${part} color ${result[part].color} vs ${palette[paletteKey]}`);
            }
        }
    }
    await browser.close();
    console.log(JSON.stringify({ checked, green: [...baseline.entries()].map(([key, value]) => ({ key, title: value.title.font, statusHeight: value.status.height })), issueCount: issues.length, issues: issues.slice(0, 50) }, null, 2));
    if (issues.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
