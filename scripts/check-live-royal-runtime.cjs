const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');

const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

(async () => {
    for (const theme of themes) for (const [width, height] of [[320, 480], [390, 844], [1280, 800]]) {
        const h = makeHarness({ theme, width, height });
        const sound = [];
        h.setSoundManager({
            royalFanfare(delay) { sound.push(delay); return () => sound.push('stop'); },
            trophy() { throw new Error('Royal Yamb must not play the generic trophy sound'); }
        });
        const scene = new h.Stage(h.owner, 'royal_yamb');
        for (const src of Object.values(h.Stage.sources('royal_yamb', theme))) {
            assert(fs.existsSync(path.join(root, 'www', src.split('?')[0])), 'Missing royal component ' + src);
        }
        await scene.start();
        assert.equal(sound.length, 0, 'Wait for the visual entry before playing the fanfare');
        h.step(0); h.step(700);
        assert.equal(sound.length, 1);
        assert(Math.abs(sound[0] - 2.5) < 0.001, 'Final chord must coincide with the 3.2-second visual crest');
        assert.equal(scene.overlay.dataset.ceremony, 'arrival');
        const cachedLogo = scene.royalLogo;
        const cachedBeam = scene.royalBeam;
        const contextCount = h.contexts.length;
        const rect = scene.royalLayout;
        assert(rect.width <= width * 0.88 && rect.height <= height * 0.38);
        assert(rect.x - rect.width / 2 >= 10 && rect.y - rect.height / 2 >= 30);
        assert.equal(new Set(scene.royalCoins.map(coin => coin.pose)).size, 3);
        assert.equal(new Set(scene.royalCoins.map(coin => coin.side)).size, 2);
        assert(scene.royalCoins.length <= (width <= 760 ? 84 : 124));

        const coinImages = [scene.images.coin, scene.images.coinLeft, scene.images.coinRight];
        const usedPoses = new Set();
        const sprite = scene.sprite.bind(scene);
        scene.sprite = (image, x, y, size, rotation, alpha, ...args) => {
            if (coinImages.includes(image)) {
                usedPoses.add(image);
                assert(Math.abs(x - rect.x) > rect.width / 2 + size / 2 + 10
                    || Math.abs(y - rect.y) > rect.height / 2 + size / 2 + 10,
                'Flying ducats must leave the full logo readable');
            }
            sprite(image, x, y, size, rotation, alpha, ...args);
        };
        h.step(1700); h.step(3200);
        assert.equal(scene.overlay.dataset.ceremony, 'crest');
        h.step(3500); h.step(5100);
        assert.equal(scene.overlay.dataset.ceremony, 'holding');
        assert.equal(usedPoses.size, 3, 'Both fountains use all three PNG poses');
        assert.equal(sound.length, 1, 'The fanfare plays only once');
        assert.equal(h.contexts.length, contextCount, 'Animation frames reuse their canvases');
        h.setViewport(360, 780); scene.resize();
        assert.equal(scene.royalLogo, cachedLogo);
        assert.equal(scene.royalBeam, cachedBeam);
        h.step(8000);
        assert.equal(h.body.children.length, 0);
        assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
        assert.deepEqual(sound.slice(1), ['stop'], 'Exit cancels any unfinished audio');
    }

    const reduced = makeHarness({ reduced: true });
    reduced.setSoundManager({ royalFanfare() { throw new Error('Reduced motion must stay quiet'); } });
    const calm = new reduced.Stage(reduced.owner, 'royal_yamb');
    await calm.start(); reduced.step(0); reduced.step(800);
    assert.equal(calm.overlay.dataset.ceremony, 'holding');
    reduced.step(2600); assert.equal(reduced.body.children.length, 0);

    const interrupted = makeHarness();
    let cancelled = 0;
    interrupted.setSoundManager({ royalFanfare() { return () => cancelled++; } });
    const scene = new interrupted.Stage(interrupted.owner, 'royal_yamb');
    await scene.start(); interrupted.step(0); interrupted.step(700);
    interrupted.setTheme('moon'); interrupted.step(1000);
    assert.equal(cancelled, 1, 'Changing theme cancels the fanfare');
    scene.stop(); assert.equal(cancelled, 1, 'Cleanup is idempotent');
    assert.equal(interrupted.body.children.length, 0);

    const pending = makeHarness();
    const late = new pending.Stage(pending.owner, 'royal_yamb');
    const start = late.start(); late.stop(); await start;
    assert.equal(pending.body.children.length, 0);
    console.log('Royal Yamb passed: ten themes, three viewports, full logo, four lights, mixed side fountains, synced cue, cleanup and reduced motion.');
})().catch(error => { console.error(error); process.exitCode = 1; });
