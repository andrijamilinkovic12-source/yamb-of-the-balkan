// Verify themed invite notices against the generic toast's inline styling.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const assert = require('node:assert/strict');
const definitions = require('../docs/theme-definitions.json');
const url = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
    const themes = definitions.themes.map(theme => theme.id);
    for (const theme of themes) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const result = await page.evaluate(theme => {
            document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
            const container = document.createElement('div');
            container.id = 'custom-notification-container';
            container.style.width = '90%';
            container.style.maxWidth = '350px';
            document.body.appendChild(container);
            const toast = document.createElement('div');
            toast.className = 'custom-toast invite-room-toast';
            toast.style.background = 'var(--glass-panel)';
            toast.style.color = 'var(--text-main)';
            toast.style.border = '2px solid var(--gold-main)';
            toast.innerHTML = '<img class="custom-toast-soft-clay-icon" alt=""><div><div class="toast-title" style="color: var(--gold-main)">POZIVNICA</div><div class="toast-msg">Igrač je prihvatio pozivnicu.</div></div>';
            container.appendChild(toast);
            const css = element => getComputedStyle(element);
            return {
                background: css(toast).backgroundColor,
                text: css(toast.querySelector('.toast-msg')).color,
                title: css(toast.querySelector('.toast-title')).color,
                iconWidth: toast.querySelector('img').getBoundingClientRect().width,
                width: toast.getBoundingClientRect().width
            };
        }, theme);
        if (theme !== 'dark') {
            const palette = definitions.themes.find(item => item.id === theme).paletteHex;
            const rgb = hex => `rgb(${[1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)).join(', ')})`;
            assert.equal(result.background, rgb(palette.surface), `${theme} notice surface`);
            assert.equal(result.text, rgb(palette.text), `${theme} notice text`);
            assert.equal(result.title, rgb(palette.primary), `${theme} notice heading`);
        }
        assert.ok(Math.abs(result.iconWidth - 40) <= 1, `${theme} notice PNG dimension: ${result.iconWidth}`);
        assert.ok(result.width <= 320, `${theme} notice safe width`);
    }
    await browser.close();
    console.log('Ten themed Invite Friend notices use their own surface, text, accent and 40px canonical PNG icon.');
})().catch(error => { console.error(error); process.exitCode = 1; });
