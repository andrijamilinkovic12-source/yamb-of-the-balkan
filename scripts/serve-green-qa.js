// Local-only visual fixture. It does not start the game server or execute game scripts.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const wwwRoot = fs.realpathSync(path.join(projectRoot, 'www'));
const fixture = path.join(projectRoot, 'qa', 'green-runtime.html');
const host = '127.0.0.1';
const port = Number(process.env.GREEN_QA_PORT || 3130);
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('GREEN_QA_PORT mora biti broj između 1024 i 65535.');
}

http.createServer(async (request, response) => {
    const fail = (status, message) => {
        response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(message);
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Method not allowed');

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
    } catch (_) {
        return fail(400, 'Invalid path');
    }

    let target;
    if (pathname === '/' || pathname === '/__green_qa__/green-runtime.html') {
        target = fixture;
    } else {
        // Reject traversal and Windows separators before resolving an app asset.
        if (!/^\/[A-Za-z0-9_./-]+$/.test(pathname) || pathname.split('/').includes('..')) {
            return fail(404, 'Not found');
        }
        target = path.join(wwwRoot, pathname.slice(1));
    }

    const contentType = contentTypes[path.extname(target).toLowerCase()];
    if (!contentType) return fail(404, 'Not found');
    try {
        const realTarget = await fs.promises.realpath(target);
        if (target !== fixture) {
            const relative = path.relative(wwwRoot, realTarget);
            if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return fail(404, 'Not found');
        }
        const stat = await fs.promises.stat(realTarget);
        if (!stat.isFile()) return fail(404, 'Not found');
        response.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stat.size,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        if (request.method === 'HEAD') return response.end();
        fs.createReadStream(realTarget).pipe(response);
    } catch (_) {
        fail(404, 'Not found');
    }
}).listen(port, host, () => {
    console.log(`Green QA: http://${host}:${port}/__green_qa__/green-runtime.html#waiting-search`);
});
