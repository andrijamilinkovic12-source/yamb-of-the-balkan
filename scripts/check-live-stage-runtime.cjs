const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

(async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-live-stage-v1/manifest.json')));
    assert.equal(manifest.assets.length, 13);
    for (const asset of manifest.assets) {
        const png = fs.readFileSync(path.join(root, asset.productionPath));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png[25], 6, asset.id + ' alpha');
        assert.equal(crypto.createHash('sha256').update(png).digest('hex'), asset.sha256);
    }
    const ships = manifest.assets.filter(a => a.id.startsWith('ufo-'));
    assert.equal(new Set(ships.map(a => a.sha256)).size, 10, 'ten independent ship silhouettes');
    let scenes = 0;
    for (const theme of themes) {
        const h = makeHarness({ theme });
        for (const type of h.effectIds) {
            const scene = new h.Stage(h.owner, type); h.owner.stageScene = scene;
            await scene.start();
            assert.equal(h.body.children.length, 1, `${theme}/${type}: started`);
            const ctx = scene.ctx;
            for (const time of [0, 700, 1700, 3000, scene.duration - 200]) h.step(time);
            assert(ctx.calls.length > 20, `${theme}/${type}: animated drawing`);
            if (type === 'ice_age') {
                assert.equal(scene.overlay.dataset.corners, '4');
                assert.equal(scene.overlay.dataset.coverage, '1.000');
                assert.equal(scene.board.height, h.board.height, 'full physical board height');
            }
            if (type === 'drones') assert(scene.droneTargets.length > 100, 'name formed from separate drones');
            if (type === 'ufo_abduction') assert(h.scores.every((node, i) => node.textContent === String(20 + i)), 'game scores never changed');
            scene.stop();
            assert.equal(h.body.children.length, 0, `${theme}/${type}: cleanup`);
            assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
            assert(h.scores.every(node => !node.classList.contains('live-ufo-score-muted')));
            scenes++;
        }
    }
    for (const size of [[320, 640], [390, 844], [768, 1024]]) {
        const h = makeHarness({ width: size[0], height: size[1] });
        const scene = new h.Stage(h.owner, 'ice_age'); await scene.start(); h.step(0); h.step(3200);
        const rects = h.contexts[0].calls.filter(call => call[0] === 'rect');
        assert(rects.some(call => call[4] === h.board.height), `ice clips to complete board at ${size}`);
        h.setTheme('moon'); h.step(3400); assert.equal(h.body.children.length, 0, 'theme switch cleans scene');
    }
    const reduced = makeHarness({ reduced: true });
    for (const type of reduced.effectIds) {
        const scene = new reduced.Stage(reduced.owner, type); await scene.start();
        assert(scene.duration <= 2600); reduced.step(0); reduced.step(800); scene.stop();
    }
    const pending = makeHarness();
    const late = new pending.Stage(pending.owner, 'ufo_abduction');
    const start = late.start(); late.stop(); await start;
    assert.equal(pending.body.children.length, 0, 'stopped pending load never creates an overlay');
    const integrated = makeHarness();
    const manager = new integrated.Manager();
    for (const type of integrated.effectIds) {
        manager.trigger(type);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(manager.stageScene?.type, type, `real EffectManager routes ${type}`);
        integrated.step(0); integrated.step(900);
        manager.stop();
        assert.equal(integrated.body.children.length, 0, `real EffectManager stops ${type}`);
    }
    manager.celebrateWin(); await new Promise(resolve => setImmediate(resolve));
    let rain = 0; manager.spawnGoldRain = () => { rain++; };
    [...integrated.timers.values()].find(timer => timer.delay === 1000).callback();
    assert.equal(rain, 1); assert.equal(manager.stageScene?.type, 'fireworks', 'win coin rain does not cut the fireworks short');
    manager.stop();
    const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
    assert(html.indexOf('live-effects-stage.js?v=') < html.indexOf('managers.js?v='), 'scene runtime loads before manager');
    console.log(`PASS ${scenes} scenes: nine redesigned effects + four-corner Ice Age across ten themes; three viewport sizes; cleanup, theme switch, reduced motion and late loading.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
