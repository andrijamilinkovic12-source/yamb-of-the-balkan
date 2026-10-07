/** Capture local Android WebView login layouts for all themes through its debug port. */
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', process.env.QA_OUTPUT_DIR || 'theme-login-qa-2026-10-07');
const themes = (process.env.QA_THEMES || 'dark,light,medium,winter,neon,amethyst,easter,desert,moon,severna').split(',');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function debuggerUrl() {
    const response = await fetch('http://127.0.0.1:9222/json');
    if (!response.ok) throw new Error(`WebView debugger HTTP ${response.status}`);
    const pages = await response.json();
    const page = pages.find(item => item.url === 'https://localhost/');
    if (!page?.webSocketDebuggerUrl) throw new Error('Local QA WebView page is unavailable');
    return page.webSocketDebuggerUrl;
}

async function connect() {
    const socket = new WebSocket(await debuggerUrl());
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
    let nextId = 0;
    const pending = new Map();
    socket.on('message', bytes => {
        const message = JSON.parse(String(bytes));
        if (!message.id || !pending.has(message.id)) return;
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }), error => {
            if (error) {
                pending.delete(id);
                reject(error);
            }
        });
    });
    return { socket, send };
}

async function evaluate(send, expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'WebView evaluation failed');
    return result.result?.value;
}

const metricsExpression = `(() => {
    const find = selector => document.querySelector(selector);
    const box = selector => {
        const element = find(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
            x: Math.round(rect.x * 10) / 10,
            y: Math.round(rect.y * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            fontSize: style.fontSize,
            color: style.color,
            textShadow: style.textShadow,
            transform: style.transform,
            opacity: style.opacity,
            filter: style.filter,
            zoom: style.zoom,
            scale: style.scale,
            fontWeight: style.fontWeight,
            fontFamily: style.fontFamily,
            letterSpacing: style.letterSpacing,
            mixBlendMode: style.mixBlendMode,
            textFillColor: style.webkitTextFillColor,
            display: style.display,
            visibility: style.visibility
        };
    };
    const splash = find('#splash-screen');
    const logo = find('#theme-splash-clay-title');
    return {
        theme: document.documentElement.dataset.splashTheme,
        language: document.documentElement.lang,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        ready: !!(splash?.classList.contains('has-login') && logo?.complete && logo?.naturalWidth),
        logoLoaded: !!(logo?.complete && logo?.naturalWidth),
        scrollHeight: splash?.scrollHeight,
        clientHeight: splash?.clientHeight,
        scrollTop: splash?.scrollTop,
        overflowY: splash ? getComputedStyle(splash).overflowY : null,
        boxes: {
            logo: box('#theme-splash-clay-title'),
            flags: box('.splash-language-switcher'),
            srFlag: box('.splash-language-switcher img:first-child'),
            quote: box('.splash-copy-panel'),
            quoteText: box('.splash-quote-text'),
            quoteAuthor: box('.splash-quote-author'),
            welcome: box('.splash-welcome-copy'),
            welcomeText: box('.splash-welcome-copy span'),
            signIn: box('#dugmeGooglePrijava'),
            legal: box('.splash-legal-copy'),
            legalTerms: box('[data-lang="splash_terms_link"]'),
            legalPrivacy: box('[data-lang="splash_privacy_link"]')
        },
        legalText: find('.splash-legal-copy')?.innerText,
        logoSrc: logo?.getAttribute('src')
    };
})()`;

async function waitForLogin(send, theme) {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const metrics = await evaluate(send, metricsExpression);
            if (metrics?.ready && metrics.theme === theme) return metrics;
        } catch (_) {}
        await delay(800);
    }
    throw new Error(`Login did not settle for ${theme}`);
}

async function capture(send, filename) {
    const result = await send('Page.captureScreenshot', { format: 'jpeg', quality: 84, captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
}

async function main() {
    fs.mkdirSync(outputDir, { recursive: true });
    const { socket, send } = await connect();
    const report = [];
    try {
        await send('Page.enable');
        await send('Runtime.enable');
        for (const theme of themes) {
            await evaluate(send, `localStorage.setItem('yamb_last_theme', ${JSON.stringify(theme)}); localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); localStorage.setItem('yamb_lang', 'sr'); true`);
            await send('Page.navigate', { url: 'https://localhost/' });
            const sr = await waitForLogin(send, theme);
            await delay(1500);
            await capture(send, `${theme}-sr.jpg`);
            if (sr.boxes.legal && sr.boxes.legal.y + sr.boxes.legal.height > sr.viewport.height) {
                await evaluate(send, `document.getElementById('splash-screen').scrollTop = document.getElementById('splash-screen').scrollHeight; true`);
                await delay(250);
                await capture(send, `${theme}-sr-bottom.jpg`);
                await evaluate(send, `document.getElementById('splash-screen').scrollTop = 0; true`);
            }
            await evaluate(send, `localStorage.setItem('yamb_lang', 'en'); applyTranslations(); true`);
            await delay(200);
            const en = await evaluate(send, metricsExpression);
            await capture(send, `${theme}-en.jpg`);
            if (en.boxes.legal && en.boxes.legal.y + en.boxes.legal.height > en.viewport.height) {
                await evaluate(send, `document.getElementById('splash-screen').scrollTop = document.getElementById('splash-screen').scrollHeight; true`);
                await delay(250);
                await capture(send, `${theme}-en-bottom.jpg`);
            }
            report.push({ theme, sr, en });
            console.log(`${theme}: SR ${sr.ready}, EN ${en.ready}, legal ${sr.boxes.legal?.width}x${sr.boxes.legal?.height}`);
        }
        fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(report, null, 2) + '\n');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
