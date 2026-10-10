const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']
    .filter(theme => !process.env.QA_TREASURY_THEME || process.env.QA_TREASURY_THEME === theme);
const tabs = ['trophy', 'skin', 'effect', 'theme'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const pending = new Map();
    let nextId = 0;
    socket.on('message', bytes => {
        const response = JSON.parse(String(bytes));
        const waiter = pending.get(response.id);
        if (!waiter) return;
        pending.delete(response.id);
        response.error ? waiter.reject(new Error(JSON.stringify(response.error))) : waiter.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }), error => error && reject(error));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result?.value;
    };
    const report = { date: '2026-10-10', build: 'qaLocal from current www', themes: [] };
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        for (let attempt = 0; attempt < 30; attempt++) {
            if (await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'")) break;
            await sleep(500);
        }
        assert(await evaluate("typeof window.app === 'object' && typeof riznicaManager === 'object'"));
        report.viewport = await evaluate('[innerWidth, innerHeight, devicePixelRatio]');
        for (const theme of themes) {
            await evaluate(`localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); window.app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true }); riznicaManager.showRiznica(); true`);
            await sleep(250);
            const entry = { theme, tabs: {} };
            for (const tab of tabs) {
                await evaluate(`riznicaManager.switchTab(${JSON.stringify(tab)}); true`);
                // Easter cards have a 460 ms entry animation that also animates opacity.
                await sleep(600);
                const state = await evaluate(`(async () => {
                    const screen = document.querySelector('#riznica-screen');
                    const cards = [...screen.querySelectorAll('.category-grid > .card')];
                    const categories = [...screen.querySelectorAll('.category-header')];
                    const markers = [...screen.querySelectorAll('.category-header img')];
                    const visibleImages = [...screen.querySelectorAll('#riznica-shop-container img')].filter(img => {
                        const rect = img.getBoundingClientRect();
                        return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0;
                    });
                    await Promise.all(visibleImages.map(img => img.decode().catch(() => null)));
                    const first = cards[0];
                    const firstStyle = first && getComputedStyle(first);
                    const locked = screen.querySelector('.card.locked');
                    const lockedStyle = locked && getComputedStyle(locked);
                    const preview = screen.querySelector('.treasury-theme-preview');
                    const previewImage = preview?.querySelector('img');
                    if (previewImage) await previewImage.decode().catch(() => null);
                    const balance = screen.querySelector('#riznica-balance');
                    const balancePill = screen.querySelector('.riznica-balance-pill');
                    const greenBalanceIcon = screen.querySelector('.riznica-balance-ducat-icon-green');
                    const greenAdIcon = screen.querySelector('.riznica-ad-ducat-icon-green');
                    const header = screen.querySelector('.riznica-header');
                    const tabBar = screen.querySelector('.riznica-tabs');
                    return {
                        cardCount: cards.length,
                        categoryCount: categories.length,
                        categoryPngCount: markers.length,
                        categoryEmojiCount: categories.filter(el => /[🎨💎🌌🎉⚡🥇🥈🥉]/u.test(el.textContent)).length,
                        categoryPathsCorrect: markers.every(img => img.src.includes(${JSON.stringify(theme === 'dark' ? 'green-soft-clay' : 'theme-packs/' + theme)})),
                        cardMinHeight: firstStyle?.minHeight,
                        cardPadding: firstStyle?.padding,
                        cardRadius: firstStyle?.borderRadius,
                        lockedOpacity: lockedStyle?.opacity || null,
                        lockedFilter: lockedStyle?.filter || null,
                        visibleImages: visibleImages.length,
                        visibleBrokenImages: visibleImages.filter(img => !img.naturalWidth).map(img => img.getAttribute('src')),
                        previewSize: preview ? [getComputedStyle(preview).width, getComputedStyle(preview).height] : null,
                        previewLoaded: previewImage ? previewImage.naturalWidth > 0 : null,
                        balance: {
                            text: balance?.textContent,
                            title: balance?.title,
                            width: balance?.getBoundingClientRect().width,
                            scrollWidth: balance?.scrollWidth,
                            pillWidth: balancePill?.getBoundingClientRect().width
                        },
                        greenDucatIcons: [greenBalanceIcon, greenAdIcon].map(img => ({
                            src: img?.getAttribute('src') || null,
                            naturalWidth: img?.naturalWidth || 0,
                            display: img ? getComputedStyle(img).display : null
                        })),
                        layout: {
                            header: [header?.getBoundingClientRect().width, header?.getBoundingClientRect().height],
                            tabs: [tabBar?.getBoundingClientRect().width, tabBar?.getBoundingClientRect().height],
                            contentTop: screen.querySelector('.content-area')?.getBoundingClientRect().top
                        },
                        activeTab: screen.dataset.riznicaTab
                    };
                })()`);
                assert.equal(state.activeTab, tab, `${theme}/${tab}: wrong tab`);
                assert(state.cardCount > 0, `${theme}/${tab}: empty tab`);
                assert.equal(state.categoryPngCount, state.categoryCount, `${theme}/${tab}: category PNG missing`);
                assert.equal(state.categoryEmojiCount, 0, `${theme}/${tab}: emoji category remains`);
                assert(state.categoryPathsCorrect, `${theme}/${tab}: category PNG from another theme`);
                assert.equal(state.cardMinHeight, '180px', `${theme}/${tab}: card height`);
                assert.equal(state.cardPadding, '12px', `${theme}/${tab}: card padding`);
                assert.equal(state.cardRadius, '20px', `${theme}/${tab}: card radius`);
                assert.deepEqual(state.visibleBrokenImages, [], `${theme}/${tab}: visible broken image`);
                if (theme === 'dark') {
                    assert(state.greenDucatIcons.every(icon => icon.naturalWidth > 0), `${theme}/${tab}: Green ducat PNG missing`);
                }
                if (tab === 'trophy') {
                    assert.equal(state.lockedOpacity, '1', `${theme}: locked trophy faded`);
                    assert(!state.lockedFilter.includes('grayscale'), `${theme}: locked trophy grayscale`);
                }
                if (tab === 'theme') {
                    assert.deepEqual(state.previewSize, ['72px', '96px'], `${theme}: theme preview size`);
                    assert(state.previewLoaded, `${theme}: first theme preview unavailable`);
                }
                entry.tabs[tab] = state;
            }
            const captureVersion = process.env.QA_TREASURY_THEME ? 'v3' : 'final';
            const file = `docs/qa-treasury-themes-${theme}-2026-10-10-${captureVersion}.png`;
            if (!fs.existsSync(path.join(root, file))) {
                const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                fs.writeFileSync(path.join(root, file), Buffer.from(shot.data, 'base64'));
            }
            entry.screenshot = file;
            report.themes.push(entry);
            console.log(`${theme}: ${tabs.map(tab => `${tab}=${entry.tabs[tab].cardCount}`).join(' ')}; PNG categories and layout OK`);
        }
        const reportFile = process.env.QA_TREASURY_THEME
            ? `docs/qa-treasury-room-${process.env.QA_TREASURY_THEME}-emulator-2026-10-10.json`
            : 'docs/qa-treasury-room-all-themes-final-emulator-2026-10-10.json';
        fs.writeFileSync(path.join(root, reportFile), JSON.stringify(report, null, 2) + '\n');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
