// Open a packaged Easter QA state inside the local-only Android qaLocal build.
// Usage: node scripts/open-easter-apk-qa.js [state] [devtools-port]
'use strict';

const state = String(process.argv[2] || 'main').replace(/[^a-z0-9-]/gi, '');
const port = Number(process.argv[3] || 9223);
const qaUrl = `https://localhost/themes/easter/qa-preview.html?lang=sr#${state}`;

async function targets() {
    const response = await fetch(`http://127.0.0.1:${port}/json`);
    if (!response.ok) throw new Error(`DevTools HTTP ${response.status}`);
    return response.json();
}

async function send(url, method, params = {}) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => { socket.close(); reject(new Error('DevTools timeout')); }, 10000);
        socket.addEventListener('error', reject);
        socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method, params })));
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.id !== 1) return;
            clearTimeout(timer);
            socket.close();
            if (message.error) reject(new Error(message.error.message));
            else resolve(message.result);
        });
    });
}

async function main() {
    const list = await targets();
    const app = list.find(item => item.type === 'page'
        && (item.url?.startsWith('https://localhost/') || item.title?.includes('Yamb of the Balkan')));
    if (!app?.webSocketDebuggerUrl) throw new Error('Local QA WebView not found');
    await send(app.webSocketDebuggerUrl, 'Page.navigate', { url: qaUrl });
    await new Promise(resolve => setTimeout(resolve, 2200));
    const current = (await targets()).find(item => item.type === 'page' && item.url?.includes('/themes/easter/qa-preview.html'));
    if (!current?.webSocketDebuggerUrl) throw new Error('Packaged Easter QA page did not open');
    const result = await send(current.webSocketDebuggerUrl, 'Runtime.evaluate', {
        expression: `({ title: document.title, url: location.href,
            hasQaFrame: !!document.getElementById('qa-frame'),
            hasAppFrame: !!document.getElementById('qa-frame')?.contentDocument?.getElementById('main-menu'),
            podiumMedals: Array.from(document.getElementById('qa-frame')?.contentDocument?.querySelectorAll('#highscores-screen .hs-podium-medal') || []).slice(0, 3).map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, complete: img.complete, display: img.ownerDocument.defaultView.getComputedStyle(img).display })) })`,
        returnByValue: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    if (!result.result.value?.hasAppFrame) throw new Error('QA app frame did not initialize');
    console.log(JSON.stringify(result.result.value, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
