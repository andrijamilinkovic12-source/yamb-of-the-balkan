const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const qaWidth = Number(process.env.QA_WIDTH || 0);
const qaHeight = Number(process.env.QA_HEIGHT || 0);
const qaFontScale = Number(process.env.QA_FONT_SCALE || 1);
const selectors = {
    shell: '.global-chat-shell', header: '.global-chat-header', title: '.global-chat-room-title',
    titleText: '.global-chat-room-title [data-lang]', pill: '.global-chat-online-pill',
    pillText: '#global-chat-online-count', close: '.global-chat-close', body: '.global-chat-body',
    state: '.global-chat-state', stateText: '.global-chat-state span',
    footer: '.global-chat-footer', compose: '.global-chat-compose', input: '.global-chat-input',
    placeholder: '.global-chat-input::placeholder', send: '.global-chat-send',
    hint: '.global-chat-hint-row', count: '.global-chat-char-count',
    welcome: '.global-chat-welcome', incoming: '.msg-incoming', outgoing: '.msg-outgoing',
    incomingName: '.msg-incoming strong', outgoingName: '.msg-outgoing strong',
    meta: '.msg-incoming .global-chat-meta', metaText: '.msg-incoming .global-chat-meta span',
    outgoingMeta: '.msg-outgoing .global-chat-meta', report: '.global-chat-report-btn'
};
const lum = value => {
    const hex = value.match(/^#([0-9a-f]{6})$/i);
    const channels = hex
        ? [0, 2, 4].map(index => parseInt(hex[1].slice(index, index + 2), 16) / 255)
        : [...value.matchAll(/\d+(?:\.\d+)?/g)].slice(0, 3).map(match => Number(match[0]) / 255);
    if (channels.length !== 3) return null;
    return channels.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
};
const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return x == null || y == null ? null : +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2);
};

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const pending = new Map();
    let id = 0;
    socket.on('message', bytes => {
        const message = JSON.parse(String(bytes));
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const key = ++id;
        pending.set(key, { resolve, reject });
        socket.send(JSON.stringify({ id: key, method, params }));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result.value;
    };
    const report = [];
    const suffix = `${qaWidth ? `-${qaWidth}x${qaHeight}` : ''}${qaFontScale !== 1 ? `-font${Math.round(qaFontScale * 100)}` : ''}`;
    const screenshotDir = path.join(__dirname, '..', 'docs', `theme-global-chat-layout-qa${suffix}`);
    fs.mkdirSync(screenshotDir, { recursive: true });
    try {
        await send('Runtime.enable');
        await send('Page.enable');
        if (qaWidth) await send('Emulation.setDeviceMetricsOverride', {
            width: qaWidth, height: qaHeight, deviceScaleFactor: 1, mobile: true
        });
        if (qaFontScale !== 1) await evaluate(`document.documentElement.style.fontSize = '${16 * qaFontScale}px'; true`);
        for (const theme of themes) {
            const row = await evaluate(`(async () => {
                app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true });
                const overlay = document.getElementById('global-chat-overlay');
                overlay.style.display = 'flex';
                app.globalChat.renderHistoryState('empty');
                await new Promise(resolve => setTimeout(resolve, 1000));
                const stateCss = getComputedStyle(overlay.querySelector('.global-chat-state'));
                const stateTextCss = getComputedStyle(overlay.querySelector('.global-chat-state span'));
                const stateColors = { text: stateTextCss.color, bg: stateCss.backgroundColor };
                app.globalChat.renderWelcome();
                app.globalChat.appendMessage('Igrač', 'Duga poruka za proveru rasporeda, čitljivosti i preloma u svim temama. '.repeat(3), 'msg-incoming', null, true, null, new Date(), 'qa-${theme}');
                app.globalChat.appendMessage('Ja', 'Odgovor za proveru dimenzija kartice i prikaza vremena.', 'msg-outgoing', null, true, null, new Date());
                const selectors = ${JSON.stringify(selectors)};
                const data = {};
                for (const [key, selector] of Object.entries(selectors)) {
                    const el = overlay.querySelector(selector.replace('::placeholder',''));
                    if (!el) { data[key] = null; continue; }
                    const css = getComputedStyle(el, selector.endsWith('::placeholder') ? '::placeholder' : null);
                    const box = el.getBoundingClientRect();
                    data[key] = {
                        rect: [box.x,box.y,box.width,box.height].map(x=>+x.toFixed(2)),
                        color: css.color, bg: css.backgroundColor, font: css.fontFamily,
                        size: css.fontSize, weight: css.fontWeight, line: css.lineHeight,
                        tracking: css.letterSpacing, padding: css.padding, radius: css.borderRadius,
                        display: css.display, opacity: css.opacity,
                        overflowX: css.overflowX, overflowY: css.overflowY
                    };
                }
                const bounds = overlay.getBoundingClientRect();
                const body = overlay.querySelector('.global-chat-body');
                const result = {
                    theme: ${JSON.stringify(theme)}, viewport: [innerWidth,innerHeight],
                    overlay: [bounds.x,bounds.y,bounds.width,bounds.height],
                    bodyScroll: [body.scrollWidth,body.clientWidth,body.scrollHeight,body.clientHeight], stateColors,
                    data, vars: Object.fromEntries(['--gc-surface','--gc-raised','--gc-inset','--gc-ink','--gc-muted','--gc-heading','--gc-primary','--gc-on-primary','--gc-success','--gc-danger'].map(key => [key,getComputedStyle(overlay).getPropertyValue(key).trim()]))
                };
                return result;
            })()`);
            const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            fs.writeFileSync(path.join(screenshotDir, `${theme}-messages.png`), Buffer.from(screenshot.data, 'base64'));
            report.push(row);
            console.log(theme, 'title', row.data.titleText?.size, 'bubble', row.data.incoming?.rect.slice(2), 'footer', row.data.footer?.rect.slice(2));
        }
        const reference = report[0];
        for (const row of report.slice(1)) {
            row.differences = [];
            for (const key of ['shell','header','title','titleText','pill','close','body','footer','compose','input','send','hint','count','welcome','incoming','outgoing','meta','report']) {
                const current = row.data[key], green = reference.data[key];
                if (!current || !green) continue;
                for (const prop of ['size','weight','line','tracking','padding']) {
                    if (current[prop] !== green[prop]) row.differences.push(`${key}.${prop}: ${current[prop]} vs ${green[prop]}`);
                }
                if (['shell','header','title','pill','close','body','footer','compose','input','send','hint','count','report'].includes(key)) {
                    for (let i = 0; i < 4; i++) if (Math.abs(current.rect[i] - green.rect[i]) > .3)
                        row.differences.push(`${key}.rect[${i}]: ${current.rect[i]} vs ${green.rect[i]}`);
                }
                if (['welcome','incoming','outgoing'].includes(key)) {
                    for (let i = 2; i < 4; i++) if (Math.abs(current.rect[i] - green.rect[i]) > .3)
                        row.differences.push(`${key}.rect[${i}]: ${current.rect[i]} vs ${green.rect[i]}`);
                }
            }
            const d = row.data;
            row.contrast = {
                title: ratio(d.titleText.color, row.vars['--gc-raised']),
                pill: ratio(d.pillText.color, d.pill.bg),
                state: ratio(row.stateColors.text, row.stateColors.bg),
                welcome: ratio(d.welcome.color, d.welcome.bg),
                incoming: ratio(d.incoming.color, d.incoming.bg),
                outgoing: ratio(d.outgoing.color, d.outgoing.bg),
                input: ratio(d.input.color, d.input.bg),
                placeholder: ratio(d.placeholder.color, d.input.bg),
                count: ratio(d.count.color, row.vars['--gc-raised']),
                meta: ratio(d.meta.color, d.incoming.bg),
                outgoingMeta: ratio(d.outgoingMeta.color, d.outgoing.bg),
                report: ratio(d.report.color, d.report.bg)
            };
            console.log(row.theme, 'differences', row.differences.length, 'contrast', JSON.stringify(row.contrast));
            assert.deepEqual(row.differences, [], `${row.theme} differs from Green geometry or typography`);
            for (const [role, value] of Object.entries(row.contrast))
                assert(value >= 4.5, `${row.theme} ${role} contrast ${value} is below 4.5:1`);
            assert(row.bodyScroll[0] <= row.bodyScroll[1] + 1, `${row.theme} chat body overflows horizontally`);
            assert(row.data.pill.rect[0] + row.data.pill.rect[2] <= row.data.close.rect[0] - 2,
                `${row.theme} online pill overlaps the close button`);
            assert.equal(row.data.input.bg.toLowerCase(), `rgb(${[1, 3, 5].map(index => parseInt(row.vars['--gc-inset'].slice(index, index + 2), 16)).join(', ')})`,
                `${row.theme} input still shows another theme's background`);
        }
        fs.writeFileSync(path.join(__dirname, '..', 'docs', `qa-theme-global-chat-layout${suffix}.json`), JSON.stringify(report, null, 2) + '\n');
        await evaluate(`app.globalChat.renderHistoryState('empty'); true`);
    } finally {
        if (qaFontScale !== 1) await evaluate(`document.documentElement.style.removeProperty('font-size'); true`);
        if (qaWidth) await send('Emulation.clearDeviceMetricsOverride');
        socket.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
