const assert = require('node:assert/strict');
const WebSocket = require('ws');

const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const tabs = ['trophy', 'skin', 'effect', 'theme'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        response.error ? waiter.reject(response.error) : waiter.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const answer = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!answer.exceptionDetails, JSON.stringify(answer.exceptionDetails));
        return answer.result.value;
    };
    try {
        await send('Runtime.enable');
        for (const theme of themes) {
            await evaluate(`localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true }); riznicaManager.showRiznica(); true`);
            let baseline;
            for (const tab of tabs) {
                await evaluate(`riznicaManager.switchTab(${JSON.stringify(tab)}); true`);
                await pause(400);
                const current = await evaluate(`(() => {
                    const ids = ['tab-trophies','tab-skins','tab-effects','tab-themes'];
                    return ids.map(id => {
                        const el = document.getElementById(id);
                        const rect = el.getBoundingClientRect();
                        const icon = el.querySelector('img');
                        return { id, active: el.classList.contains('active'), x: +rect.x.toFixed(2), y: +rect.y.toFixed(2),
                            width: +rect.width.toFixed(2), height: +rect.height.toFixed(2),
                            transform: getComputedStyle(el).transform, iconTransform: icon ? getComputedStyle(icon).transform : null };
                    });
                })()`);
                if (!baseline) baseline = current;
                for (let i = 0; i < current.length; i++) {
                    for (const key of ['x', 'y', 'width', 'height']) {
                        assert(Math.abs(current[i][key] - baseline[i][key]) <= 0.2,
                            `${theme}/${tab}/${current[i].id} ${key}: ${current[i][key]} vs ${baseline[i][key]}`);
                    }
                    assert.equal(current[i].transform, 'none', `${theme}/${tab}/${current[i].id} button transform`);
                    assert.equal(current[i].iconTransform, 'none', `${theme}/${tab}/${current[i].id} icon transform`);
                }
                if (tab === 'theme') {
                    console.log(`${theme}: positions fixed; active=${current.find(item => item.active)?.id}; button transforms=${[...new Set(current.map(item => item.transform))].join(', ')}; icon active transform=${current.find(item => item.active)?.iconTransform}`);
                }
            }
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
