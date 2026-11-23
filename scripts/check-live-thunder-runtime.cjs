const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

function watchFlash(scene) {
    const c = scene.ctx, paint = c.fillRect.bind(c), samples = [];
    c.fillRect = (...rect) => {
        if (c.fillStyle.startsWith('rgba(207, 224, 255,') && rect[2] === scene.width && rect[3] === scene.height)
            samples.push(Number(c.fillStyle.slice(c.fillStyle.lastIndexOf(',') + 1, -1)));
        paint(...rect);
    };
    return samples;
}

(async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/thunder-storm-v1/manifest.json')));
    const asset = manifest.assets[0], png = fs.readFileSync(path.join(root, asset.productionPath));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png[25], 6, 'Clouds preserve RGBA');
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'), asset.sha256);
    assert(png.length < 650000 && asset.width <= 1024, 'Bounded cloud texture');
    const references = new Map();
    for (const theme of themes) for (const [width, height] of [[320, 480], [390, 844], [1280, 800]]) {
        const h = makeHarness({ theme, width, height });
        const sounds = [];
        h.setSoundManager({ thunder(delay) { sounds.push(delay); return () => sounds.push('stop'); } });
        const scene = new h.Stage(h.owner, 'thunder'); h.owner.stageScene = scene;
        await scene.start();
        assert.deepEqual(sounds, [], 'Sound waits for the first visible frame');
        assert.equal(scene.thunderTrunk.length, 65);
        assert.equal(scene.thunderBranches.length, 12);
        assert(scene.thunderBranches.every((branch, i) =>
            (i % 2 ? scene.thunderBranches[i - 1] : scene.thunderTrunk).includes(branch[0])), 'Forks connect to the discharge');
        assert.equal(scene.thunderClouds.length, 3);
        assert(scene.thunderBolt.width <= 1280 && scene.thunderBolt.height <= 1280);
        const [x, y] = scene.thunderImpact;
        assert(x >= scene.board.x && x <= scene.board.right && y > scene.board.y && y < scene.board.bottom, 'Impact stays on the board');
        assert(scene.thunderTrunk.every(([px, py]) => px > 8 && px < width - 8 && py >= 0 && py < height));
        assert(scene.thunderBranches.flat().every(([px, py]) => px > 0 && px < width && py > 0 && py < height));
        const paint = JSON.stringify([scene.thunderTrunk, scene.thunderBranches, scene.thunderClouds]);
        const key = width + 'x' + height;
        if (references.has(key)) assert.equal(paint, references.get(key), 'Every theme has the same natural electrical palette and geometry');
        else references.set(key, paint);
        const contextCount = h.contexts.length, bolt = scene.thunderBolt, glow = scene.thunderGlow;
        const flashes = watchFlash(scene);
        h.step(0); h.step(700);
        assert.equal(scene.overlay.dataset.thunderPhase, 'gathering');
        assert.equal(flashes.length, 0, 'No screen flash during buildup');
        h.step(1400); h.step(1480); h.step(1520); h.step(1680);
        assert.equal(scene.overlay.dataset.thunderPhase, 'strike');
        assert.equal(flashes.length, 4);
        assert(flashes[0] < flashes[1] && flashes[1] <= 0.36 && flashes[1] > flashes[2] && flashes[2] > flashes[3],
            'One bounded flash peaks with the audible strike and decays');
        h.step(2600);
        assert.equal(scene.overlay.dataset.thunderPhase, 'afterglow');
        assert.equal(h.contexts.length, contextCount, 'Frames reuse the cached bolt and glow');
        assert.deepEqual(sounds, [1.48], 'One timeline is aligned to the fully developed bolt');
        h.setViewport(360, 780); scene.resize();
        assert.equal(scene.thunderBolt, bolt); assert.equal(scene.thunderGlow, glow);
        h.step(3800); assert.equal(scene.overlay.dataset.thunderPhase, 'clearing');
        h.step(4500); scene.stop();
        assert.deepEqual(sounds, [1.48, 'stop'], 'Completion cleans audio once');
        assert.equal(h.body.children.length, 0); assert.equal(h.owner.stageScene, null);
        assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
        assert(h.scores.every((node, i) => node.textContent === String(20 + i)), 'Scores never change');
    }
    for (const at of [500, 1600, 2800]) {
        const h = makeHarness(); let stops = 0;
        h.setSoundManager({ thunder() { return () => stops++; } });
        const scene = new h.Stage(h.owner, 'thunder'); await scene.start(); h.step(0); h.step(at);
        scene.stop(); scene.stop();
        assert.equal(stops, 1, 'Early exits cancel even the not-yet-played strike');
        assert.equal(h.body.children.length, 0); assert.equal(h.frames.size, 0);
    }
    const quiet = makeHarness({ reduced: true });
    quiet.setSoundManager({ thunder() { throw new Error('Reduced motion stays quiet'); } });
    const calm = new quiet.Stage(quiet.owner, 'thunder'); await calm.start();
    const calmFlashes = watchFlash(calm);
    quiet.step(0); quiet.step(800); quiet.step(1480); quiet.step(1650);
    assert.equal(calm.overlay.dataset.thunderPhase, 'holding');
    assert.equal(calmFlashes.length, 0, 'Reduced motion never flashes');
    assert(!calm.ctx.calls.some(call => call[0] === 'ellipse'), 'No animated shockwave in reduced motion');
    quiet.step(2600); assert.equal(quiet.body.children.length, 0);

    const changed = makeHarness(); let cancelled = 0;
    changed.setSoundManager({ thunder() { return () => cancelled++; } });
    const old = new changed.Stage(changed.owner, 'thunder'); await old.start(); changed.step(0);
    changed.setTheme('light'); changed.step(100); assert.equal(cancelled, 1); assert.equal(changed.body.children.length, 0);
    const pending = makeHarness(), late = new pending.Stage(pending.owner, 'thunder');
    const start = late.start(); late.stop(); await start; assert.equal(pending.body.children.length, 0);

    const routed = makeHarness(), manager = new routed.Manager();
    manager.trigger('thunder');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(manager.stageScene?.type, 'thunder', 'Explicit hand-Yamb thunder does not require owning or selecting it');
    manager.stop();
    console.log('Thunder passed: connected forks, single bounded flash, synced cancellable audio, all ten themes, three sizes and reduced motion.');
})().catch(error => { console.error(error); process.exitCode = 1; });
