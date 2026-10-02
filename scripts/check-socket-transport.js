const assert = require('node:assert/strict');
const http = require('node:http');
const { Server } = require('socket.io');
const { io } = require('../www/socket.io.min.js');

const TIMEOUT_MS = 5000;

function request(port, method, path, headers = {}, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1', port, method, path,
            headers: { Connection: 'close', ...headers },
            timeout: TIMEOUT_MS
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
        });
        req.on('timeout', () => req.destroy(new Error('Polling request timed out')));
        req.on('error', reject);
        req.end(body);
    });
}

function checkWebSocket(port) {
    return new Promise((resolve, reject) => {
        const client = io(`http://127.0.0.1:${port}`, {
            transports: ['websocket'], forceNew: true, reconnection: false,
            timeout: TIMEOUT_MS
        });
        const timer = setTimeout(() => finish(new Error('WebSocket exchange timed out')), TIMEOUT_MS);
        let settled = false;

        function finish(error) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            client.close();
            if (error) reject(error);
            else resolve();
        }

        client.on('connect_error', finish);
        client.on('connect', () => {
            client.emit('qa:echo', { bytes: Uint8Array.from([1, 2, 3]) }, reply => {
                try {
                    const bytes = reply.bytes instanceof ArrayBuffer
                        ? new Uint8Array(reply.bytes) : reply.bytes;
                    assert.deepEqual(Array.from(bytes), [1, 2, 3]);
                    finish();
                } catch (error) {
                    finish(error);
                }
            });
        });
    });
}

async function main() {
    const httpServer = http.createServer();
    const socketServer = new Server(httpServer, {
        transports: ['websocket', 'polling'], serveClient: false
    });
    socketServer.on('connection', socket => {
        socket.on('qa:echo', (payload, acknowledge) => acknowledge(payload));
    });

    try {
        await new Promise((resolve, reject) => {
            httpServer.once('error', reject);
            httpServer.listen(0, '127.0.0.1', resolve);
        });
        const port = httpServer.address().port;
        await checkWebSocket(port);

        const opened = await request(port, 'GET', '/socket.io/?EIO=4&transport=polling');
        assert.equal(opened.status, 200);
        assert.equal(opened.body[0], '0');
        const { sid } = JSON.parse(opened.body.slice(1));
        assert.ok(sid);

        const invalid = await request(port, 'POST', `/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}`, {
            'Content-Type': 'application/octet-stream'
        }, Buffer.from([0xff]));
        assert.ok(invalid.status >= 400, `Invalid polling POST returned ${invalid.status}`);

        console.log('Socket transport checks passed: WebSocket binary ack and invalid polling POST rejection.');
    } finally {
        for (const client of Object.values(socketServer.engine.clients)) {
            client.close(true);
        }
        socketServer.close();
        httpServer.closeAllConnections();
    }
}

main().then(
    // The deliberately invalid polling session can retain a heartbeat timer.
    // This standalone test has finished all assertions and closed its local server.
    () => process.exit(0),
    error => {
        console.error(error);
        process.exit(1);
    }
);
