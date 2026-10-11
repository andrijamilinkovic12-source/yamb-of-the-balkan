const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const root = path.join(__dirname, '..', 'www');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const effectRoles = ['confetti', 'gold-rain', 'wedding', 'thunder', 'fireworks', 'bubbles',
    'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'ice-age', 'black-hole',
    'supernova', 'neon-pulse', 'drones', 'ufo-abduction'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

for (const source of fs.readdirSync(path.join(root, 'assets', 'dice-skins-v1')).filter(name => name.endsWith('-face-v1.png'))) {
    assert(fs.existsSync(path.join(root, 'assets', 'treasury-skin-previews', source)), source);
}

for (const theme of themes) {
    assert(fs.existsSync(path.join(root, 'assets', 'treasury-theme-previews', `${theme}-v1.png`)));
    const pack = theme === 'dark'
        ? path.join(root, 'assets', 'green-soft-clay')
        : path.join(root, 'assets', 'theme-packs', theme);
    for (const role of effectRoles) {
        assert(fs.existsSync(path.join(pack, 'canonical', 'treasury-effect-thumbnails',
            `preview-${role}-v1.png`)), `${theme}/${role}`);
    }
}

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const pending = new Map();
    let id = 0;
    socket.on('message', data => {
        const answer = JSON.parse(String(data));
        const waiter = pending.get(answer.id);
        if (!waiter) return;
        pending.delete(answer.id);
        answer.error ? waiter.reject(answer.error) : waiter.resolve(answer.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const key = ++id;
        pending.set(key, { resolve, reject });
        socket.send(JSON.stringify({ id: key, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    try {
        await send('Runtime.enable');
        assert(await evaluate('Boolean(window.app && window.riznicaManager)'));
        for (const theme of themes.filter(value => !process.env.QA_THEME || process.env.QA_THEME === value)) {
            await evaluate(`localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true }); riznicaManager.showRiznica(); true`);
            const warmup = await evaluate(`(() => ({
                startup: app.getThemeStartupSources(${JSON.stringify(theme)}).length,
                treasury: app.getThemeRoomSources(${JSON.stringify(theme)}, 'treasury').length,
                rooms: Object.fromEntries(['dailyChallenge', 'leaderboard', 'statistics', 'settings', 'rules',
                    'globalChat', 'onlinePlayers', 'economy', 'quarterlyLeague', 'tournament',
                    'solo', 'hotseat', 'opponent', 'invite'].map(room =>
                    [room, app.getThemeRoomSources(${JSON.stringify(theme)}, room).length])),
                eagerPreviews: app.getThemeRoomSources(${JSON.stringify(theme)}, 'treasury')
                    .filter(src => src.includes('treasury-effect-previews/') || src.includes('treasury-effect-thumbnails/') || src.includes('treasury-skin-previews/')).length
            }))()`);
            assert.equal(warmup.eagerPreviews, 0, `${theme}: Treasury warms hidden card previews`);
            const gameDieSource = await evaluate(`(() => {
                const die = document.createElement('div');
                die.className = 'dice skin-default';
                document.body.appendChild(die);
                const background = getComputedStyle(die).backgroundImage;
                die.remove();
                return background;
            })()`);
            assert(gameDieSource.includes('assets/dice-skins-v1/default-face-v1.png'), `${theme}: gameplay die changed`);
            for (const [tab, expected] of [['skin', 42], ['effect', 16], ['theme', 10]]) {
                await evaluate(`riznicaManager.switchTab(${JSON.stringify(tab)}); true`);
                await pause(450);
                const state = await evaluate(`(() => {
                    const root = document.querySelector('#riznica-shop-container');
                    const images = [...root.querySelectorAll('.treasury-skin-image, .treasury-effect-image, .treasury-theme-preview img')];
                    const first = images[0];
                    const firstBox = root.querySelector('.dice-preview, .effect-preview-box');
                    return {
                        count: images.length,
                        readyCount: images.filter(img => img.complete && img.naturalWidth).length,
                        firstReady: Boolean(first?.complete && first?.naturalWidth),
                        broken: images.filter(img => img.complete && !img.naturalWidth).map(img => img.src),
                        lazy: images.every(img => img.loading === 'lazy'),
                        firstSrc: first?.getAttribute('src') || '',
                        cssBackground: firstBox ? getComputedStyle(firstBox).backgroundImage : '',
                        pseudoBackground: firstBox ? getComputedStyle(firstBox, '::before').backgroundImage : '',
                        loadedResourceCount: performance.getEntriesByType('resource').filter(item => item.name.includes('treasury-effect-thumbnails/') || item.name.includes('treasury-skin-previews/') || item.name.includes('treasury-theme-previews/')).length
                    };
                })()`);
                assert.equal(state.count, expected, `${theme}/${tab}: preview count`);
                assert(state.lazy && !state.broken.length, `${theme}/${tab}: lazy or broken image`);
                assert(state.firstReady, `${theme}/${tab}: first card image`);
                if (tab === 'skin') assert.equal(state.cssBackground, 'none', `${theme}: eager skin CSS background`);
                if (tab === 'effect') assert.equal(state.pseudoBackground, 'none', `${theme}: eager effect CSS background`);
                if (tab === 'theme') assert(state.firstSrc.includes('treasury-theme-previews/'), `${theme}: full background in card`);
                if (tab === 'skin') assert(state.firstSrc.includes('treasury-skin-previews/'), `${theme}: full dice art in card`);
                if (tab === 'effect') assert(state.firstSrc.includes('treasury-effect-thumbnails/'), `${theme}: full effect art in card`);
                if (process.env.QA_SCROLL_LAST) {
                    await evaluate(`(() => {
                        const images = document.querySelectorAll('#riznica-shop-container .treasury-skin-image, #riznica-shop-container .treasury-effect-image, #riznica-shop-container .treasury-theme-preview img');
                        images[images.length - 1].scrollIntoView({ block: 'center' });
                        return true;
                    })()`);
                    await pause(350);
                    const lastReady = await evaluate(`(() => {
                        const images = document.querySelectorAll('#riznica-shop-container .treasury-skin-image, #riznica-shop-container .treasury-effect-image, #riznica-shop-container .treasury-theme-preview img');
                        const last = images[images.length - 1];
                        return Boolean(last.complete && last.naturalWidth);
                    })()`);
                    assert(lastReady, `${theme}/${tab}: scrolling did not load the final preview`);
                }
                console.log(`${theme}/${tab}: ${state.readyCount}/${state.count} ready, lazy previews, resource entries ${state.loadedResourceCount}`);
            }
            if (process.env.QA_VIEW_TAB) {
                await evaluate(`riznicaManager.switchTab(${JSON.stringify(process.env.QA_VIEW_TAB)}); true`);
                await pause(300);
            }
            const heaviest = Object.entries(warmup.rooms).sort((a, b) => b[1] - a[1]).slice(0, 2);
            console.log(`${theme}: startup ${warmup.startup}, Treasury ${warmup.treasury}, hidden previews 0; largest room packs ${JSON.stringify(heaviest)}`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
