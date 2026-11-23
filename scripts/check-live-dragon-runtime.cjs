const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

(async () => {
    for (const name of ['visage', 'plume']) {
        const data = fs.readFileSync(path.join(root, 'www/assets/effects/dragon-projection-v2', name + '.webp'));
        assert.equal(data.toString('ascii', 8, 12), 'WEBP');
        assert(data.length < 200000);
    }
    for (const theme of themes) for (const [width, height] of [[320, 480], [390, 844], [1280, 800]]) {
        const h = makeHarness({ theme, width, height });
        const sound = [];
        h.setSoundManager({ dragonBreath(delay) { sound.push(delay); return () => sound.push('stop'); } });
        const scene = new h.Stage(h.owner, 'dragon_fire');
        const sources = h.Stage.sources('dragon_fire', theme);
        assert.equal(Object.keys(sources).length, 3);
        for (const file of Object.values(sources)) assert(fs.existsSync(path.join(root, 'www', file.split('?')[0])));
        await scene.start();
        assert.equal(sound.length, 0, 'Audio waits until the dragon starts to arrive');
        h.step(0); h.step(700);
        assert(Math.abs(sound[0] - 0.8) < 0.001, 'Fire sound begins with the 1.5-second exhale');
        h.step(1200);
        assert.equal(scene.overlay.dataset.dragonPhase, 'inhale');
        const inhale = scene.dragonPose(1.2);
        h.step(2600);
        const pose = scene.dragonPose(2.6);
        assert.equal(scene.overlay.dataset.dragonPhase, 'breath');
        assert(pose.gape > inhale.gape && pose.breath === 1);
        assert(pose.mouth.x > 0 && pose.mouth.x < width && pose.mouth.y > 40 && pose.mouth.y < height * 0.65);
        assert(pose.size <= scene.board.width * 0.52 && pose.size <= 206);
        assert.equal(pose.mouth.x, scene.dragonLayout.cx);
        assert(Math.abs(pose.mouth.y - (pose.top + pose.size * (0.55 + 0.10 * pose.gape))) < 0.001);
        const [far, mid, near] = [0, 0.5, 0.92].map(u => scene.dragonProjection(pose.mouth, u));
        assert.equal(far.x, pose.mouth.x); assert.equal(far.y, pose.mouth.y);
        assert(near.y - mid.y > mid.y - far.y && near.size > 3 * mid.size, 'Foreground accelerates and enlarges');
        assert(scene.ctx.calls.some(call => call[0] === 'drawImage' && call[1] === scene.images.head));
        assert(scene.ctx.calls.some(call => call[0] === 'drawImage' && call[1] === scene.images.plume));
        assert(scene.ctx.calls.some(call => call[0] === 'drawImage' && call[1] === scene.images.flame));
        const packets = scene.dragonPackets;
        const contexts = h.contexts.length;
        h.step(3400); h.step(4400);
        assert.equal(scene.overlay.dataset.dragonPhase, 'embers');
        assert.equal(scene.dragonPose(4.4).breath, 0);
        assert.equal(h.contexts.length, contexts, 'No per-frame canvas allocations');
        h.setViewport(360, 780); scene.resize();
        assert.equal(scene.dragonPackets, packets);
        h.step(5300);
        assert.equal(scene.overlay.dataset.dragonPhase, 'exit');
        assert(scene.dragonPose(5.3).leave > 0.98);
        h.step(5500);
        assert.equal(h.body.children.length, 0);
        assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
        assert.equal(sound.length, 2);
        assert.equal(sound[1], 'stop');
    }
    const reduced = makeHarness({ reduced: true });
    reduced.setSoundManager({ dragonBreath() { throw new Error('Reduced motion must stay quiet'); } });
    const calm = new reduced.Stage(reduced.owner, 'dragon_fire');
    await calm.start(); reduced.step(0); reduced.step(800);
    assert.equal(calm.overlay.dataset.dragonPhase, 'holding');
    assert.deepEqual(calm.dragonPose(0), calm.dragonPose(4));
    reduced.step(2600); assert.equal(reduced.body.children.length, 0);

    const interrupted = makeHarness();
    let stopped = 0;
    interrupted.setSoundManager({ dragonBreath() { return () => stopped++; } });
    const scene = new interrupted.Stage(interrupted.owner, 'dragon_fire');
    await scene.start(); interrupted.step(0); interrupted.step(700);
    interrupted.setTheme('moon'); interrupted.step(1000);
    scene.stop(); assert.equal(stopped, 1);
    const pending = makeHarness();
    const late = new pending.Stage(pending.owner, 'dragon_fire');
    const start = late.start(); late.stop(); await start;
    assert.equal(pending.body.children.length, 0);
    console.log('Dragon projection passed: board-relative head, moving throat anchor, perspective growth, ten themes, three sizes, reduced motion and cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
