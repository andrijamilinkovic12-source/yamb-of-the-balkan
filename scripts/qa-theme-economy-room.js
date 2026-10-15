/** Inspect both economy tabs and their canonical assets in the Android WebView. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const themes = (process.env.QA_THEMES || 'dark,light,medium,winter,neon,amethyst,easter,desert,moon,severna').split(',');
const qaWidth = Number(process.env.QA_WIDTH || 0);
const qaHeight = Number(process.env.QA_HEIGHT || 0);
const qaFontScale = Number(process.env.QA_FONT_SCALE || 1);
const suffix = `${qaWidth ? `-${qaWidth}x${qaHeight}` : ''}${qaFontScale !== 1 ? `-font${Math.round(qaFontScale * 100)}` : ''}`;
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const page = (await (await fetch('http://127.0.0.1:9222/json')).json()).find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'Android QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let nextId = 0;
    const pending = new Map();
    socket.on('message', bytes => {
        const message = JSON.parse(String(bytes));
        const entry = pending.get(message.id);
        if (!entry) return;
        pending.delete(message.id);
        message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    const screenshots = path.join(root, 'docs', `theme-economy-room-qa${suffix}`);
    fs.mkdirSync(screenshots, { recursive: true });
    const report = [];
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        if (qaWidth) await send('Emulation.setDeviceMetricsOverride', { width:qaWidth, height:qaHeight, deviceScaleFactor:1, mobile:true });
        if (qaFontScale !== 1) await evaluate(`document.documentElement.style.fontSize='${16 * qaFontScale}px'; true`);
        for (const theme of themes) {
            await evaluate(`app.applyTheme(${JSON.stringify(theme)}, {initialLoad:true}); true`);
            let ready = false;
            for (let attempt = 0; attempt < 45; attempt++) {
                try { ready = await evaluate(`(${JSON.stringify(theme)}==='dark' ? ![...document.body.classList].some(x=>x.endsWith('-theme')) : document.body?.classList?.contains(${JSON.stringify(theme + '-theme')})) && !!window.undoManager && !!window.app`); }
                catch (_) { ready = false; }
                if (ready) break;
                await sleep(350);
            }
            assert(ready, `${theme}: app not ready`);
            await evaluate(`window.undoManager.openMenu(); true`);
            await sleep(750);
            for (const [tab, index] of [['ducats', 0], ['undo', 1]]) {
                await evaluate(`document.getElementById(${JSON.stringify(index ? 'economy-tab-undo' : 'economy-tab-ducats')}).click(); document.querySelector(${JSON.stringify('#economy-panel-' + tab + ' .economy-page-panel')}).scrollTop=0; true`);
                await sleep(450);
                const row = await evaluate(`(async () => {
                    const theme=${JSON.stringify(theme)}, tab=${JSON.stringify(tab)};
                    const overlay=document.getElementById('undo-menu-overlay');
                    const pane=document.getElementById('economy-panel-'+tab);
                    const visible=element => {
                        if (!element || !element.getClientRects().length) return false;
                        const s=getComputedStyle(element), r=element.getBoundingClientRect();
                        return s.display!=='none' && s.visibility==='visible' && Number(s.opacity)>0 && r.width>0 && r.height>0;
                    };
                    await Promise.all([...overlay.querySelectorAll('img')].filter(visible).map(img => new Promise(resolve => {
                        if (img.complete) return resolve();
                        img.addEventListener('load',resolve,{once:true});
                        img.addEventListener('error',resolve,{once:true});
                        setTimeout(resolve,3000);
                    })));
                    const card=pane.querySelector('.economy-reward-card');
                    const activeVideo=card.querySelector('.economy-reward-video-green-soft-clay-icon');
                    const unavailableVideo=card.querySelector('.economy-reward-unavailable-green-soft-clay-icon');
                    const rewardState={
                        disabled:card.classList.contains('disabled'),
                        activeSource:activeVideo.getAttribute('src'),
                        unavailableSource:unavailableVideo.getAttribute('src'),
                        unavailableVisible:visible(unavailableVideo)
                    };
                    const wasDisabled=card.classList.contains('disabled');
                    card.classList.remove('disabled');
                    rewardState.activeVisibleWhenReady=visible(activeVideo);
                    rewardState.unavailableVisibleWhenReady=visible(unavailableVideo);
                    if(wasDisabled) card.classList.add('disabled');
                    const banner=document.getElementById(tab==='ducats'?'economy-banner-slot':'economy-undo-banner-slot');
                    const bannerIcon=banner.querySelector('.economy-ad-unavailable-green-soft-clay-icon');
                    const bannerState={src:bannerIcon.getAttribute('src'),natural:[bannerIcon.naturalWidth,bannerIcon.naturalHeight]};
                    const box=selector=>{const r=overlay.querySelector(selector)?.getBoundingClientRect();return r&&[r.x,r.y,r.width,r.height].map(n=>+n.toFixed(2));};
                    const css=selector=>{const el=overlay.querySelector(selector);if(!el)return null;const s=getComputedStyle(el);return {color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,padding:s.padding,borderRadius:s.borderRadius,opacity:s.opacity,filter:s.filter};};
                    const selectors=['.economy-shell','.economy-card-header','.global-chat-title','.global-chat-close','.economy-tabs','.economy-tabs .tab-btn','#economy-tab-ducats','#economy-tab-undo','.economy-card-body','#economy-panel-'+tab,'.economy-page-panel',tab==='ducats'?'.economy-hero':'.economy-undo-panel p',tab==='ducats'?'.economy-hero strong':'.economy-token-box',tab==='ducats'?'.economy-kicker':'.economy-token-box > span','.economy-ad-grid','.economy-reward-card','.economy-reward-top','.economy-reward-top span','.economy-reward-card strong'];
                    const scopedSelectors=selectors.map(selector=>selector==='.economy-reward-card'||selector==='.economy-reward-top'||selector==='.economy-reward-top span'||selector==='.economy-reward-card strong'||selector==='.economy-page-panel'||selector==='.economy-ad-grid'||selector==='.economy-hero'||selector==='.economy-hero strong'||selector==='.economy-kicker'||selector==='.economy-undo-panel p'||selector==='.economy-token-box'||selector==='.economy-token-box > span'?'#economy-panel-'+tab+' '+selector:selector);
                    return {
                        theme,tab,title:document.getElementById('economy-menu-title').textContent.trim(),
                        viewport:[innerWidth,innerHeight],
                        box:Object.fromEntries(scopedSelectors.map((selector,i)=>[selectors[i],box(selector)])),
                        css:Object.fromEntries(scopedSelectors.map((selector,i)=>[selectors[i],css(selector)])),
                        scroll:[document.documentElement.scrollWidth,document.documentElement.clientWidth,pane.querySelector('.economy-page-panel').scrollWidth,pane.querySelector('.economy-page-panel').clientWidth],
                        verticalScroll:[pane.querySelector('.economy-page-panel').scrollHeight,pane.querySelector('.economy-page-panel').clientHeight],
                        selected:[document.getElementById('economy-tab-ducats').classList.contains('active'),document.getElementById('economy-tab-undo').classList.contains('active')],
                        panelVisible:visible(pane),rewardButton:visible(pane.querySelector('.economy-reward-card')),
                        rewardDisabled:pane.querySelector('.economy-reward-card')?.classList.contains('disabled'),
                        rewardOnclick:pane.querySelector('.economy-reward-card')?.getAttribute('onclick'),
                        rewardState,
                        bannerState,
                        counts:[document.getElementById('economy-dukati-count-large').textContent,document.getElementById('undo-token-count').textContent],
                        images:[...overlay.querySelectorAll('img')].filter(visible).map(img => ({
                            class:img.className,src:img.getAttribute('src'),natural:[img.naturalWidth,img.naturalHeight],
                            rect:[img.getBoundingClientRect().width,img.getBoundingClientRect().height].map(x=>+x.toFixed(1))
                        })),
                        svg:[...overlay.querySelectorAll('svg')].filter(visible).map(el=>el.className?.baseVal||''),
                        overflow:[pane.scrollWidth,pane.clientWidth]
                    };
                })()`);
                const shot = await send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
                fs.writeFileSync(path.join(screenshots, `${theme}-${tab}.png`), Buffer.from(shot.data,'base64'));
                if (qaWidth && qaWidth <= 360 && tab === 'undo') {
                    await evaluate(`document.querySelector('#economy-panel-undo .economy-page-panel').scrollTop=10000; true`);
                    await sleep(100);
                    const bottom = await evaluate(`(() => {
                        const page=document.querySelector('#economy-panel-undo .economy-page-panel');
                        const reward=page.querySelector('.economy-reward-card').getBoundingClientRect();
                        const frame=page.getBoundingClientRect();
                        return {scrollTop:page.scrollTop,scrollable:page.scrollHeight>page.clientHeight,rewardVisible:reward.top>=frame.top-1&&reward.bottom<=frame.bottom+1};
                    })()`);
                    assert(bottom.scrollable && bottom.scrollTop>0 && bottom.rewardVisible, `${theme}: undo reward unreachable on short phone`);
                    const bottomShot = await send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
                    fs.writeFileSync(path.join(screenshots, `${theme}-undo-bottom.png`), Buffer.from(bottomShot.data,'base64'));
                    row.bottom = bottom;
                }
                report.push(row);
                console.log(`${theme}/${tab}: ${row.images.length} canonical PNGs, ${row.svg.length} legacy SVGs, tabs responsive`);
                assert.equal(row.panelVisible, true, `${theme}/${tab}: inactive panel`);
                assert.equal(row.rewardButton, true, `${theme}/${tab}: reward card missing`);
                assert.equal(row.css['.economy-reward-card'].opacity, '1', `${theme}/${tab}: reward card dimmed`);
                assert.equal(row.css['.economy-reward-card'].filter, 'none', `${theme}/${tab}: reward card filtered`);
                assert.notEqual(row.css['.economy-reward-card strong'].color, 'rgba(0, 0, 0, 0)', `${theme}/${tab}: reward amount hidden`);
                assert.deepEqual(row.selected, index === 0 ? [true,false] : [false,true], `${theme}/${tab}: tab click failed`);
                assert.equal(row.images.length, 6, `${theme}/${tab}: missing or duplicate visible icons`);
                assert.deepEqual(row.svg, [], `${theme}/${tab}: legacy SVG visible`);
                assert.equal(row.overflow[0] <= row.overflow[1] + 1, true, `${theme}/${tab}: horizontal overflow`);
                assert.equal(row.rewardOnclick, index === 0 ? "app.claimCoinAdReward('rewarded')" : 'app.buyUndoTokens(1)');
                const prefix = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
                for (const image of row.images) {
                    assert(image.src?.startsWith(prefix), `${theme}/${tab}: wrong-theme icon ${image.src}`);
                    assert(image.natural[0] > 0 && image.natural[1] > 0, `${theme}/${tab}: undecoded icon ${image.src}`);
                }
                const expected = index === 0
                    ? ['ducat/ducat-front','ducat/ducat-inline','undo-token/undo-token-inline','ducat/ducat-front','rewarded-video/rewarded-video-unavailable','ducat/ducat-inline']
                    : ['undo-token/undo-token-front','ducat/ducat-inline','undo-token/undo-token-inline','undo-token/undo-token-inline','rewarded-video/rewarded-video-unavailable','undo-token/undo-token-inline'];
                const assetVersion = ['easter', 'desert', 'severna'].includes(theme) ? 2 : 1;
                expected.forEach((suffix, position) => assert(row.images[position].src.includes(`/canonical/${suffix}-v${assetVersion}.png`), `${theme}/${tab}: icon position ${position} is wrong`));
                assert(row.rewardState.activeSource?.startsWith(prefix), `${theme}/${tab}: active video from wrong theme`);
                assert(row.rewardState.unavailableSource?.startsWith(prefix), `${theme}/${tab}: unavailable video from wrong theme`);
                assert.equal(row.rewardState.activeVisibleWhenReady, true, `${theme}/${tab}: ready video icon hidden`);
                assert.equal(row.rewardState.unavailableVisibleWhenReady, false, `${theme}/${tab}: unavailable video icon shown when ready`);
                assert(row.bannerState.src?.startsWith(prefix), `${theme}/${tab}: failed-ad icon from wrong theme`);
                assert(row.bannerState.natural[0] > 0, `${theme}/${tab}: failed-ad icon not decoded`);
            }
        }
        fs.writeFileSync(path.join(root,'docs',`qa-theme-economy-room${suffix}.json`),JSON.stringify(report,null,2)+'\n');
        const reference = Object.fromEntries(report.filter(row => row.theme === 'dark').map(row => [row.tab,row]));
        for (const row of report) {
            if (row.theme === 'dark') continue;
            for (const key of ['.economy-shell','.economy-card-header','.economy-tabs','.economy-tabs .tab-btn','.economy-card-body','.economy-page-panel','.economy-hero','.economy-undo-panel p','.economy-token-box','.economy-ad-grid','.economy-reward-card']) {
                const actual = row.box[key], expected = reference[row.tab].box[key];
                if (!actual || !expected) continue;
                for (let i=0;i<4;i++) assert(Math.abs(actual[i]-expected[i])<=1, `${row.theme}/${row.tab}: ${key} geometry differs from Green (${actual} vs ${expected})`);
            }
            for (const key of ['.global-chat-title','.economy-kicker','.economy-undo-panel p','.economy-token-box > span','.economy-reward-top span','.economy-reward-card strong']) {
                const actual = row.css[key], expected = reference[row.tab].css[key];
                if (!actual || !expected) continue;
                assert.equal(actual.fontSize, expected.fontSize, `${row.theme}/${row.tab}: ${key} font size differs from Green`);
                assert.equal(actual.lineHeight, expected.lineHeight, `${row.theme}/${row.tab}: ${key} line height differs from Green`);
            }
        }
    } finally { socket.close(); }
}
main().catch(error=>{ console.error(error); process.exitCode=1; });
