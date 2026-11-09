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
    let universalNeon;
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
            if (type === 'drones') assert.equal(scene.droneTargets.length, 5, 'Yamb Squadron uses five full-sized drones');
            if (type === 'ufo_abduction') assert(h.scores.every((node, i) => node.textContent === String(20 + i)), 'game scores never changed');
            if (type === 'neon_pulse') {
                const strokes = [];
                const stroke = ctx.stroke;
                ctx.stroke = () => { strokes.push(ctx.strokeStyle); stroke(); };
                h.step(4900);
                assert(ctx.calls.some(call => call[0] === 'clip'), 'scan is clipped to the board');
                assert(ctx.calls.some(call => call[0] === 'setLineDash'), 'neon pulses follow the rail');
                const paint = JSON.stringify([strokes, ctx.calls]);
                universalNeon ??= paint;
                assert.equal(paint, universalNeon, `${theme}: same neon painting as all other themes`);
                h.step(5000);
                assert.equal(h.body.children.length, 0, 'Neon Pulse ends at its normal duration');
            }
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
    const ice = makeHarness();
    const iceSounds = [];
    ice.setSoundManager({
        iceAge(seconds) { iceSounds.push(seconds); return () => iceSounds.push('stop'); },
        iceAgeCrack() { iceSounds.push('crack'); }
    });
    const frostScene = new ice.Stage(ice.owner, 'ice_age');
    await frostScene.start();
    assert.deepEqual(iceSounds, [], 'Frost sound waits for the first visible frame');
    ice.step(0); ice.step(1400);
    assert.equal(frostScene.overlay.dataset.coverage, '0.500');
    assert.deepEqual(iceSounds, [2.8], 'Only the growing frost sound plays before the center is reached');
    const textureCalls = frostScene.iceTexture.getContext('2d').calls;
    const images = textureCalls.filter(call => call[0] === 'drawImage');
    assert.equal(images.length, 4, 'Cache a fixed-size PNG in each corner once');
    assert(images.every(call => call[4] === Math.round(frostScene.board.width * 86) / 100
        && call[5] === Math.round(frostScene.board.height * 86) / 100));
    assert(frostScene.ctx.calls.some(call => call[0] === 'drawImage' && call[1] === frostScene.iceReveal),
        'During growth the board must show only the revealed texture');
    ice.step(2800); ice.step(3200);
    assert.equal(frostScene.overlay.dataset.coverage, '1.000');
    assert.deepEqual(iceSounds, [2.8, 'crack'], 'Play one crack at full freeze, never on subsequent frames');
    assert.equal(textureCalls.filter(call => call[0] === 'drawImage').length, 4, 'Frames do not resize the PNG');
    frostScene.stop();
    assert.deepEqual(iceSounds, [2.8, 'crack', 'stop']);

    iceSounds.length = 0;
    const cancelledIce = new ice.Stage(ice.owner, 'ice_age');
    await cancelledIce.start(); ice.step(0); ice.step(750); cancelledIce.stop();
    assert.deepEqual(iceSounds, [2.8, 'stop'], 'Early exit must stop the grow sound without playing the crack');
    assert.equal(ice.frames.size, 0);

    for (const [width, expectedCount] of [[390, 420], [1280, 720]]) {
        const h = makeHarness({ width, theme: 'light' });
        const dust = new h.Stage(h.owner, 'cosmic_dust');
        await dust.start();
        const paints = [];
        const fillRect = dust.ctx.fillRect;
        dust.ctx.fillRect = (...args) => { paints.push(dust.ctx.fillStyle); fillRect(...args); };
        h.step(0);
        paints.length = 0;
        h.step(1900);
        assert.equal(paints[0], 'rgba(4, 7, 13,0.6)', 'Cosmic Dust strongly darkens even a light theme');
        const particles = dust.dustParticles;
        assert.equal(particles.length, expectedCount);
        assert.equal(new Set(particles.map(particle => particle.shape)).size, 4, 'Grains, halos, stars and trails');
        assert(particles.every(({ angle, radius, speed }, i) => angle === dust.seed(i + 22) * Math.PI * 2
            && radius === 0.08 + dust.seed(i + 74) * 0.75 && speed === 0.1 + (i % 3) * 0.09),
        'The original orbit and speeds stay unchanged');
        assert(dust.ctx.calls.filter(call => call[0] === 'drawImage' && call[1] === dust.dustAtlas).length > expectedCount,
            'Particles use the cached atlas across multiple frames');
        h.step(dust.duration);
        assert.equal(h.body.children.length, 0, 'Cosmic Dust removes its dim layer on completion');
    }

    const reduced = makeHarness({ reduced: true });
    const quiet = [];
    reduced.setSoundManager({ iceAge() { quiet.push('grow'); }, iceAgeCrack() { quiet.push('crack'); } });
    for (const type of reduced.effectIds) {
        const scene = new reduced.Stage(reduced.owner, type); await scene.start();
        assert(scene.duration <= 2600); reduced.step(0); reduced.step(800);
        if (type === 'neon_pulse') {
            assert(scene.ctx.calls.some(call => call[0] === 'stroke'), 'reduced motion keeps the neon rail');
            assert(!scene.ctx.calls.some(call => ['setLineDash', 'clip'].includes(call[0])), 'reduced motion has no moving pulse or scan');
        }
        if (type === 'cosmic_dust') {
            assert.equal(scene.dustParticles.length, 45, 'Reduced motion keeps the sparse dust field');
            assert(scene.dustParticles.every(particle => particle.speed === 0));
        }
        scene.stop();
    }
    assert.deepEqual(quiet, [], 'Reduced motion keeps Ice Age quiet');
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
