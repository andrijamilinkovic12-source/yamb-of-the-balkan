const assert = require('node:assert/strict');
const { makeHarness } = require('./live-stage-test-harness.cjs');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

(async () => {
    const references = new Map();
    for (const theme of themes) for (const [width, height] of [[320, 480], [390, 844], [1280, 800]]) {
        const h = makeHarness({ theme, width, height });
        const scene = new h.Stage(h.owner, 'fireworks');
        await scene.start();
        const shells = scene.fireworkShells;
        assert.equal(shells.length, 9);
        assert.equal(new Set(shells.map(shell => shell.kind)).size, 3);
        assert.equal(new Set(shells.flatMap(shell => shell.particles.map(particle => particle.color))).size, 5);
        assert.equal(shells.filter(shell => shell.finale).length, 3);
        assert(shells.every(shell => shell.launch + shell.rise + shell.duration <= 6.81), 'Every particle gets its full lifetime');
        assert(shells.every(shell => shell.particles.length <= (width <= 760 ? 129 : 203)), 'Bounded particle budget');
        assert(shells.every(shell => shell.x - shell.radius >= 10 && shell.x + shell.radius <= width - 10
            && shell.y - shell.radius >= 10), 'Burst centers and initial radial expansion fit');
        const serialized = JSON.stringify(shells);
        const key = width + 'x' + height;
        if (references.has(key)) assert.equal(serialized, references.get(key), 'All themes share the exact fireworks choreography');
        else references.set(key, serialized);
        const sphere = shells.find(shell => shell.kind === 'sphere');
        const ring = shells.find(shell => shell.kind === 'ring');
        const willow = shells.find(shell => shell.kind === 'willow');
        assert(willow.gravity > sphere.gravity && willow.particles[0].tail > ring.particles[0].tail, 'Willows have long, falling gold trails');
        const particle = sphere.particles.find(spark => spark.vx > 0.5);
        const dx = (from, to) => scene.fireworkPoint(sphere, particle, to)[0] - scene.fireworkPoint(sphere, particle, from)[0];
        assert(dx(0.2, 0.4) > dx(1, 1.2), 'Air resistance slows the expanding sparks');
        const atlas = scene.fireworkAtlas, contexts = h.contexts.length;
        h.step(0); h.step(900); h.step(1800); h.step(3500); h.step(4700);
        assert.equal(scene.overlay.dataset.fireworksPhase, 'finale');
        assert(Number(scene.overlay.dataset.activeBursts) >= 3);
        assert.equal(h.contexts.length, contexts, 'Animation frames reuse the spark atlas');
        h.setViewport(360, 780); scene.resize();
        assert.equal(scene.fireworkAtlas, atlas);
        h.step(6600); assert.equal(scene.overlay.dataset.fireworksPhase, 'embers');
        h.step(6900); assert.equal(scene.overlay.dataset.activeBursts, '0');
        h.step(7000);
        assert.equal(h.body.children.length, 0);
        assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
        assert(h.scores.every((score, i) => score.textContent === String(20 + i)), 'The game result is untouched');
    }
    const h = makeHarness();
    const calls = [], cleanups = [];
    const record = (method, ...args) => {
        const event = { method, args };
        calls.push(event);
        return () => cleanups.push(event);
    };
    h.setSoundManager({
        fireworkLaunch(...args) { return record('launch', ...args); },
        fireworkExplode(...args) { return record('burst', ...args); }
    });
    const scene = new h.Stage(h.owner, 'fireworks');
    await scene.start();
    for (let time = 0; time <= 6996; time += 33) { h.step(time); scene.ctx.calls.length = 0; }
    assert.equal(calls.filter(call => call.method === 'launch').length, 9, 'One whistle per rocket');
    assert.equal(calls.filter(call => call.method === 'burst').length, 9, 'One sound per visible explosion, including the finale');
    assert.equal(new Set(calls.filter(call => call.method === 'burst').map(call => call.args[0])).size, 3);
    h.step(7030);
    assert.equal(cleanups.length, 18);
    scene.stop(); assert.equal(cleanups.length, 18, 'Sound cleanup is idempotent');

    const reduced = makeHarness({ reduced: true });
    reduced.setSoundManager({
        fireworkLaunch() { throw new Error('Reduced motion must be quiet'); },
        fireworkExplode() { throw new Error('Reduced motion must be quiet'); }
    });
    const calm = new reduced.Stage(reduced.owner, 'fireworks');
    await calm.start(); reduced.step(0); reduced.step(800);
    assert.equal(calm.overlay.dataset.fireworksPhase, 'holding');
    assert.equal(calm.overlay.dataset.activeBursts, '3');
    reduced.step(2600); assert.equal(reduced.body.children.length, 0);

    const interrupted = makeHarness();
    let stopped = 0;
    interrupted.setSoundManager({ fireworkLaunch() { return () => stopped++; } });
    const stop = new interrupted.Stage(interrupted.owner, 'fireworks');
    await stop.start(); interrupted.step(0); interrupted.setTheme('moon'); interrupted.step(200);
    assert.equal(stopped, 1);
    assert.equal(interrupted.body.children.length, 0);
    const pending = makeHarness(), late = new pending.Stage(pending.owner, 'fireworks');
    const start = late.start(); late.stop(); await start;
    assert.equal(pending.body.children.length, 0);
    console.log('Fireworks passed: nine launches, three burst types, five colors, all themes, three viewports, complete finale, synced audio and cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
