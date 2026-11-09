const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
const native = process.env.YAMB_CANVAS_PATH ? require(process.env.YAMB_CANVAS_PATH) : undefined;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-drone-sprites-v1/manifest.json')));
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json')));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

(async () => {
    assert.equal(manifest.assets.length, 10);
    assert.equal(new Set(manifest.assets.map(asset => asset.sha256)).size, 10);
    for (const asset of manifest.assets) {
        const bytes = fs.readFileSync(path.join(root, asset.productionPath));
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes[25], 6, 'drone has RGBA transparency');
        assert.equal(bytes.readUInt32BE(16), 160);
        assert.equal(hash(bytes), asset.sha256);
        assert.equal(asset.direction, definitions.themes.find(theme => theme.id === asset.theme).direction);
        assert(asset.lightAnchor.every(value => value > 0 && value < 1));
        const h = makeHarness({ theme: asset.theme, native });
        assert.equal(h.Stage.sources('drones', asset.theme).drone, asset.productionPath.replace(/^www\//, ''));
        const scene = new h.Stage(h.owner, 'drones'); await scene.start();
        assert.equal(scene.overlay.dataset.name, undefined, 'The squadron does not use the player name');
        assert.equal(scene.droneTargets.length, 5);
        assert(scene.droneTargets.every(target => target.x > 10 && target.x < 380));
        h.step(0);
        assert.equal(scene.overlay.dataset.formation, 'assembling');
        h.step(2650);
        assert.equal(scene.overlay.dataset.formation, 'holding');
        assert.equal(scene.overlay.dataset.lit, '1');
        h.step(3260); assert.equal(scene.overlay.dataset.lit, '3');
        h.step(4200); assert.equal(scene.overlay.dataset.lit, '5');
        h.step(4760); assert.equal(scene.overlay.dataset.formation, 'pulse');
        h.step(5300); assert.equal(scene.overlay.dataset.lit, '5');
        if (!native) {
            assert(scene.ctx.calls.some(call => call[0] === 'drawImage' && call[1] === scene.images.drone),
                'each theme uses the actual drone PNG in the live squadron');
        }
        h.step(7500); assert.equal(scene.overlay.dataset.formation, 'departing');
        h.step(8200); assert.equal(h.body.children.length, 0);
        assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
    }
    const fits = (scene, width, height) => {
        const top = scene.droneTargets.filter(target => target.row === 0);
        const bottom = scene.droneTargets.filter(target => target.row === 1);
        assert.equal(top.length, 3);
        assert.equal(bottom.length, 2);
        assert(scene.droneTargets.every(({ x, y, size, ratio }) => size >= 72
            && x - size / 2 > 10 && x + size / 2 < width - 10
            && y - size * ratio / 2 > 40 && y + size * ratio / 2 < height - 40));
        assert(top[1].x - top[0].x > top[0].size, 'Top row has room between bodies');
        assert(bottom[0].y - top[0].y > top[0].size * top[0].ratio, 'Rows have room between bodies');
    };
    for (const [width, height] of [[320, 480], [390, 844], [1280, 800]]) {
        const h = makeHarness({ width, height, native });
        const scene = new h.Stage(h.owner, 'drones'); await scene.start();
        fits(scene, width, height);
        h.setViewport(360, 780); scene.resize();
        fits(scene, 360, 780);
        h.step(0); h.setTheme('moon'); h.step(900);
        assert.equal(h.body.children.length, 0, 'Theme changes cancel the old squadron');
    }
    const reduced = makeHarness({ reduced: true, native });
    const calm = new reduced.Stage(reduced.owner, 'drones'); await calm.start();
    reduced.step(0); reduced.step(800);
    assert.equal(calm.overlay.dataset.formation, 'holding');
    assert.equal(calm.overlay.dataset.lit, '5');
    reduced.step(2600); assert.equal(reduced.body.children.length, 0);
    const pending = makeHarness({ native });
    const late = new pending.Stage(pending.owner, 'drones'); const start = late.start(); late.stop(); await start;
    assert.equal(pending.body.children.length, 0);
    console.log(`PASS ten themed drone PNGs, five-ship formation, sequential lights, shared pulse, departure, responsive bounds and cleanup${native ? ' with real Canvas2D' : ''}.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
