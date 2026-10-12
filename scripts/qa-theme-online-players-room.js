const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const themes = (process.env.QA_THEMES || 'dark,light,medium,winter,neon,amethyst,easter,desert,moon,severna').split(',');
const qaWidth = Number(process.env.QA_WIDTH || 0);
const qaHeight = Number(process.env.QA_HEIGHT || 0);
const qaFontScale = Number(process.env.QA_FONT_SCALE || 1);
const suffix = `${qaWidth ? `-${qaWidth}x${qaHeight}` : ''}${qaFontScale !== 1 ? `-font${Math.round(qaFontScale * 100)}` : ''}`;

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'Android QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const pending = new Map();
    let nextId = 0;
    socket.on('message', bytes => {
        const message = JSON.parse(String(bytes));
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result.value;
    };
    const screenshotDir = path.join(__dirname, '..', 'docs', `theme-online-players-qa${suffix}`);
    fs.mkdirSync(screenshotDir, { recursive: true });
    const report = [];
    try {
        await send('Runtime.enable');
        await send('Page.enable');
        if (qaWidth) await send('Emulation.setDeviceMetricsOverride', {
            width: qaWidth, height: qaHeight, deviceScaleFactor: 1, mobile: true
        });
        if (qaFontScale !== 1) await evaluate(`document.documentElement.style.fontSize = '${16 * qaFontScale}px'; true`);
        await evaluate(`(() => {
            window.__onlineQaOriginal = { socket: app.socket, init: app.initSocketConnection };
            const listeners = new Map();
            const qaSocket = {
                id: 'qa-self', connected: true,
                on(event, fn) { const list = listeners.get(event) || []; list.push(fn); listeners.set(event, list); return this; },
                once(event, fn) { return this.on(event, fn); },
                off(event, fn) { if (!fn) listeners.delete(event); else listeners.set(event, (listeners.get(event) || []).filter(x => x !== fn)); return this; },
                emit(event, ...args) { if (event !== 'get_online_players_list') (listeners.get(event) || []).forEach(fn => fn(...args)); return this; }
            };
            app.socket = qaSocket;
            app.initSocketConnection = () => {};
            true;
        })()`);
        for (const theme of themes) {
            const row = await evaluate(`(async () => {
                app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true });
                window.openOnlinePlayersModal();
                await document.fonts.ready;
                app.socket.emit('online_players_list_data', []);
                await new Promise(resolve => setTimeout(resolve, 90));
                const emptyIcon = document.querySelector('#online-players-body img[data-online-role="state"]');
                if (emptyIcon) await new Promise(resolve => {
                    if (emptyIcon.complete && emptyIcon.naturalWidth) return resolve();
                    emptyIcon.addEventListener('load', resolve, { once:true });
                    emptyIcon.addEventListener('error', resolve, { once:true });
                    setTimeout(resolve, 5000);
                });
                const emptyState = emptyIcon && {
                    src:emptyIcon.getAttribute('src'),
                    natural:[emptyIcon.naturalWidth,emptyIcon.naturalHeight],
                    visible:getComputedStyle(emptyIcon).visibility
                };
                const players = [
                    { socketId:'qa-a',uid:'qa-a',name:'Milena test',status:'online',isFriend:false,isPlaying:false,isBusy:false },
                    { socketId:'qa-b',uid:'qa-b',name:'Drugi takmičar sa dugim imenom',status:'playing',isFriend:true,isPlaying:true,isBusy:true,canSpectate:true,roomId:'qa-match' }
                ];
                app.socket.emit('online_players_list_data', players);
                const overlay = document.getElementById('online-players-overlay');
                await Promise.all([...overlay.querySelectorAll('img[data-online-role]')].map(img => new Promise(resolve => {
                    if (img.complete && img.naturalWidth) return resolve();
                    img.addEventListener('load', resolve, { once:true });
                    img.addEventListener('error', resolve, { once:true });
                    setTimeout(resolve, 5000);
                })));
                await new Promise(resolve => setTimeout(resolve, 1100));
                const body = document.getElementById('online-players-body');
                const box = selector => { const x = overlay.querySelector(selector)?.getBoundingClientRect(); return x && [x.x,x.y,x.width,x.height].map(n=>+n.toFixed(2)); };
                const css = selector => { const s = getComputedStyle(overlay.querySelector(selector)); return { color:s.color, bg:s.backgroundColor, size:s.fontSize, weight:s.fontWeight, padding:s.padding, radius:s.borderRadius, display:s.display }; };
                const images = [...overlay.querySelectorAll('img')].filter(img => img.closest('.online-player-card') || img.closest('.online-players-search-wrap') || img.closest('.online-players-title'));
                const result = {
                    theme:${JSON.stringify(theme)}, active:window.themeOnlinePlayers.activeTheme(),
                    viewport:[innerWidth,innerHeight],
                    viewportState:[scrollX,scrollY,visualViewport?.offsetLeft,visualViewport?.width,document.documentElement.scrollWidth,document.body.scrollWidth],
                    overlayStyle:{ position:getComputedStyle(overlay).position, transform:getComputedStyle(overlay).transform, left:getComputedStyle(overlay).left, width:getComputedStyle(overlay).width, display:getComputedStyle(overlay).display },
                    shellStyle:{ position:getComputedStyle(overlay.querySelector('.online-players-shell')).position, transform:getComputedStyle(overlay.querySelector('.online-players-shell')).transform, left:getComputedStyle(overlay.querySelector('.online-players-shell')).left, margin:getComputedStyle(overlay.querySelector('.online-players-shell')).margin },
                    box: Object.fromEntries(['.online-players-shell','.online-players-header','.online-players-title','.online-players-search-wrap','.online-players-search','#online-players-body','.online-player-card','.online-player-identity','.theme-online-avatar','.online-player-name','.online-player-actions','.online-player-action','.theme-online-action-icon','.global-chat-close'].map(key=>[key,box(key)])),
                    css: Object.fromEntries(['.online-players-header','.online-players-title','.online-players-search-wrap','.online-players-search','#online-players-body','.online-player-card','.online-player-name','.online-player-action'].map(key=>[key,css(key)])),
                    images:images.map(img=>({role:img.dataset.onlineRole||'header',src:img.getAttribute('src'),natural:[img.naturalWidth,img.naturalHeight],visible:getComputedStyle(img).visibility})),
                    cards:body.querySelectorAll('.online-player-card').length,
                    emptyState,
                    search: {
                        placeholder:document.getElementById('online-players-search').placeholder,
                        aria:document.getElementById('online-players-search').getAttribute('aria-label'),
                        visibility:getComputedStyle(document.getElementById('online-players-search')).visibility,
                        placeholderColor:getComputedStyle(document.getElementById('online-players-search'),'::placeholder').color,
                    },
                    actions:[...body.querySelectorAll('.online-player-card')].map(card=>[...card.querySelectorAll('.online-player-action')].map(button=>({role:button.className,disabled:button.disabled,title:button.title}))),
                    scroll:[body.scrollWidth,body.clientWidth,body.scrollHeight,body.clientHeight]
                };
                document.getElementById('online-players-search').value = 'Drugi';
                document.getElementById('online-players-search').dispatchEvent(new Event('input',{bubbles:true}));
                await new Promise(resolve=>setTimeout(resolve,190));
                result.searchCount = body.querySelectorAll('.online-player-card').length;
                const input=document.getElementById('online-players-search'); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true}));
                await new Promise(resolve=>setTimeout(resolve,190));
                return result;
            })()`);
            const screenshot = await send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
            fs.writeFileSync(path.join(screenshotDir, `${theme}.png`), Buffer.from(screenshot.data, 'base64'));
            report.push(row);
            console.log(theme, row.active, 'cards', row.cards, 'search', row.searchCount,
                'card', row.box['.online-player-card']?.slice(2), 'images', row.images.map(x=>x.role));
            assert.equal(row.active, theme);
            assert.equal(row.cards, 2);
            assert.equal(row.searchCount, 1);
            assert.equal(row.search.placeholder, 'Pretraži igrača po imenu...');
            assert.equal(row.search.visibility, 'visible');
            assert(row.emptyState?.src.includes(`/theme-packs/${theme}/`) && row.emptyState.natural[0] === 256 && row.emptyState.natural[1] === 256, `${theme}: empty state PNG missing`);
            assert(row.scroll[0] <= row.scroll[1] + 1, `${theme}: horizontal overflow`);
            for (const image of row.images) {
                assert(image.natural[0] > 0 && image.natural[1] > 0, `${theme}: failed PNG ${image.src}`);
                if (image.role !== 'header') assert(image.src.includes(`/theme-packs/${theme}/`), `${theme}: wrong icon ${image.src}`);
                if (image.role !== 'header') assert.equal(image.visible, 'visible', `${theme}: hidden icon ${image.src}`);
            }
            assert.equal(row.actions[0][0].disabled, false);
            assert.equal(row.actions[0][1].disabled, true);
            assert.equal(row.actions[0][2].disabled, false);
            assert.equal(row.actions[1][0].disabled, true);
            assert.equal(row.actions[1][1].disabled, false);
            assert.equal(row.actions[1][2].disabled, true);
        }
        const reference = report[0];
        for (const row of report.slice(1)) {
            const mismatches = [];
            for (const key of ['.online-players-shell','.online-players-header','.online-players-title','.online-players-search-wrap','.online-players-search','#online-players-body','.online-player-card','.online-player-identity','.theme-online-avatar','.online-player-name','.online-player-actions','.online-player-action','.theme-online-action-icon','.global-chat-close']) {
                const a=row.box[key], b=reference.box[key];
                if (!a || !b) { mismatches.push(`${key}: missing`); continue; }
                for (let index=0;index<4;index++) if (Math.abs(a[index]-b[index])>.4) mismatches.push(`${key}[${index}]: ${a[index]} vs ${b[index]}`);
            }
            row.geometryMismatches=mismatches;
            console.log(row.theme, 'geometry differences', mismatches.length, mismatches.slice(0,8));
            assert.deepEqual(mismatches, [], `${row.theme}: geometry differs from Green`);
        }
        fs.writeFileSync(path.join(__dirname,'..','docs',`qa-theme-online-players-room${suffix}.json`), JSON.stringify(report,null,2)+'\n');
        await evaluate(`app.socket.emit('online_players_list_data', []); true`);
    } finally {
        try { await evaluate(`window.closeOnlinePlayersModal(); app.socket=window.__onlineQaOriginal.socket; app.initSocketConnection=window.__onlineQaOriginal.init; true`); } catch (_) {}
        if (qaFontScale !== 1) try { await evaluate(`document.documentElement.style.fontSize = ''; true`); } catch (_) {}
        if (qaWidth) try { await send('Emulation.clearDeviceMetricsOverride'); } catch (_) {}
        socket.close();
    }
}
main().catch(error=>{ console.error(error); process.exitCode=1; });
