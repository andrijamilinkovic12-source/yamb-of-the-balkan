const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
(async () => {
    const png = fs.readFileSync(path.join(root, 'www/assets/effects/stage-v1/frost-corner.png'));
    assert.equal(png[25], 6);
    for (const size of [[320, 640], [390, 844], [768, 1024]]) {
        const h = makeHarness({ width: size[0], height: size[1] });
        const scene = new h.Stage(h.owner, 'ice_age');
        await scene.start(); h.step(0); h.step(500);
        const early = Number(scene.overlay.dataset.coverage);
        h.step(3200);
        assert.equal(scene.overlay.dataset.corners, '4');
        assert(Number(scene.overlay.dataset.coverage) > early);
        assert.equal(scene.overlay.dataset.coverage, '1.000');
        assert.equal(scene.board.width, h.board.width);
        assert.equal(scene.board.height, h.board.height);
        const images = scene.ctx.calls.filter(call => call[0] === 'drawImage');
        assert(images.length >= 8, 'four corner textures in successive frames');
        const clip = scene.ctx.calls.find(call => call[0] === 'rect');
        assert(Math.abs(clip[3] - h.board.width) < .01 && Math.abs(clip[4] - h.board.height) < .01, 'full board mask');
        scene.stop(); assert.equal(h.frames.size, 0); assert.equal(h.body.children.length, 0);
    }
    const reduced = makeHarness({ reduced: true });
    const scene = new reduced.Stage(reduced.owner, 'ice_age'); await scene.start();
    assert(scene.duration <= 2600); reduced.step(0); reduced.step(2601);
    assert.equal(reduced.body.children.length, 0);
    console.log('PASS Ice Age: universal RGBA corner PNG, four growing fronts, exact full board width/height at three phone/tablet sizes, fade and cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
