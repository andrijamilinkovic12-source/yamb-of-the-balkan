const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const luminance = color => {
    const rgb = [...color.matchAll(/\d+(?:\.\d+)?/g)].slice(0, 3).map(match => Number(match[0]) / 255);
    return rgb.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
};
const contrast = (foreground, background) => {
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
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
        const response = await send('Runtime.evaluate', {
            expression, awaitPromise: true, returnByValue: true
        });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result.value;
    };
    const captureDir = path.join(root, 'docs', 'theme-global-chat-qa');
    fs.mkdirSync(captureDir, { recursive: true });
    const report = [];
    try {
        await send('Runtime.enable');
        await send('Page.enable');
        for (const theme of themes) {
            const result = await evaluate(`(async () => {
                app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true });
                const overlay = document.getElementById('global-chat-overlay');
                overlay.style.display = 'flex';
                app.globalChat.renderHistoryState('empty');
                const images = [
                    overlay.querySelector('.global-chat-room-title > img'),
                    overlay.querySelector('.theme-chat-state-icon'),
                    overlay.querySelector('.theme-chat-send-icon')
                ];
                await Promise.all(images.map(img => new Promise((resolve, reject) => {
                    if (img.complete && img.naturalWidth) return resolve();
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', () => reject(new Error('Image did not load: ' + img.src)), { once: true });
                    setTimeout(() => reject(new Error('Image timeout: ' + img.src)), 5000);
                })));
                await new Promise(resolve => setTimeout(resolve, 700));
                const rect = selector => {
                    const box = overlay.querySelector(selector).getBoundingClientRect();
                    return [box.x, box.y, box.width, box.height].map(value => +value.toFixed(2));
                };
                const style = selector => {
                    const css = getComputedStyle(overlay.querySelector(selector));
                    return { color: css.color, background: css.backgroundColor, fontSize: css.fontSize,
                        borderRadius: css.borderRadius, display: css.display, visibility: css.visibility };
                };
                return {
                    theme: ${JSON.stringify(theme)}, bodyTheme: document.body.className,
                    shell: rect('.global-chat-shell'), header: rect('.global-chat-header'),
                    body: rect('.global-chat-body'), footer: rect('.global-chat-footer'),
                    title: rect('.global-chat-room-title'), state: rect('.global-chat-state'),
                    sendButton: rect('.global-chat-send'), input: rect('.global-chat-input'),
                    close: rect('.global-chat-close'),
                    images: images.map(img => ({ src: img.getAttribute('src'), width: img.getBoundingClientRect().width,
                        height: img.getBoundingClientRect().height, natural: [img.naturalWidth,img.naturalHeight],
                        display: getComputedStyle(img).display, visibility: getComputedStyle(img).visibility })),
                    styles: { shell: style('.global-chat-shell'), header: style('.global-chat-header'),
                        body: style('.global-chat-body'), state: style('.global-chat-state'),
                        text: style('.global-chat-state span'), input: style('.global-chat-input'),
                        send: style('.global-chat-send') }
                };
            })()`);
            const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            fs.writeFileSync(path.join(captureDir, `${theme}.png`), Buffer.from(screenshot.data, 'base64'));
            result.functional = await evaluate(`(async () => {
                const chat = app.globalChat;
                const body = document.getElementById('global-chat-body');
                chat.renderHistoryState('loading');
                const loading = body.querySelector('.global-chat-state.is-loading');
                const loadingImage = loading.querySelector('img');
                await new Promise(resolve => setTimeout(resolve, 50));
                const loadingState = {
                    present: !!loading,
                    source: loadingImage.getAttribute('src'),
                    animation: getComputedStyle(loadingImage).animationDuration
                };
                chat.appendMessage('QA', 'Proba prijema ${theme}', 'msg-incoming', null, true, null, null, 'qa-${theme}');
                chat.appendMessage('Ja', 'Proba slanja ${theme}', 'msg-outgoing', null, true);
                const messages = [...body.querySelectorAll('.msg-bubble')];
                const messageState = {
                    count: messages.length,
                    reportButtons: body.querySelectorAll('.global-chat-report-btn').length,
                    incomingBackground: getComputedStyle(messages[0]).backgroundColor,
                    outgoingBackground: getComputedStyle(messages[1]).backgroundColor,
                    inputLimit: document.getElementById('global-chat-input').maxLength,
                    sendLabel: document.getElementById('btn-global-send').getAttribute('aria-label'),
                    closeLabel: document.querySelector('#global-chat-overlay .global-chat-close').getAttribute('aria-label')
                };
                chat.renderHistoryState('empty');
                return { loading: loadingState, messages: messageState };
            })()`);
            report.push(result);
            console.log(`${theme}: ${result.images.map(img => `${img.width}x${img.height} ${img.natural.join('x')}`).join(' | ')}`);
        }
        const green = report[0];
        for (const row of report) {
            for (const key of ['shell', 'header', 'body', 'footer', 'title', 'state', 'sendButton', 'input', 'close']) {
                const indexes = key === 'title' ? [3] : key === 'state' ? [2, 3] : [0, 1, 2, 3];
                for (const i of indexes) assert(Math.abs(row[key][i] - green[key][i]) <= 0.25,
                    `${row.theme} ${key}[${i}] differs from Green: ${row[key][i]} vs ${green[key][i]}`);
            }
            for (const image of row.images) {
                assert(image.natural[0] > 0 && image.natural[1] > 0, `${row.theme} PNG did not decode`);
                assert.equal(image.visibility, 'visible', `${row.theme} PNG is hidden`);
            }
            assert(row.functional.loading.present, `${row.theme} loading state missing`);
            assert.equal(row.functional.loading.source, row.images[1].src, `${row.theme} loading PNG differs from empty PNG`);
            assert.equal(row.functional.messages.count, 2, `${row.theme} message rendering failed`);
            assert.equal(row.functional.messages.reportButtons, 1, `${row.theme} report action missing`);
            assert.equal(row.functional.messages.inputLimit, 550, `${row.theme} input limit changed`);
            assert(row.functional.messages.sendLabel && row.functional.messages.closeLabel, `${row.theme} accessible button label missing`);
            if (row.theme !== 'dark') {
                assert(row.images[0].src.includes(`/theme-packs/${row.theme}/`), `${row.theme} header icon mismatch`);
                assert(row.images[1].src.includes(`/theme-packs/${row.theme}/canonical/global-chat-internal/empty-state-v1.png`), `${row.theme} state icon mismatch`);
                assert(row.images[2].src.includes(`/theme-packs/${row.theme}/canonical/global-chat-internal/send-v1.png`), `${row.theme} send icon mismatch`);
                assert(contrast(row.styles.text.color, row.styles.state.background) >= 4.5, `${row.theme} empty-state text contrast too low`);
                assert(contrast(row.styles.input.color, row.styles.input.background) >= 4.5, `${row.theme} input text contrast too low`);
            }
        }
        fs.writeFileSync(path.join(root, 'docs', 'qa-theme-global-chat-emulator.json'), JSON.stringify(report, null, 2) + '\n');
        console.log('PASS: ten themed Global Chat rooms, PNG roles and Green geometry.');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
