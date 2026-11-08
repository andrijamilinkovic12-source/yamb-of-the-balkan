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
        assert.equal(scene.overlay.dataset.name, 'ANDRIJA');
        assert(scene.droneTargets.length > 40 && scene.droneTargets.length <= (native ? 400 : 1000));
        assert(scene.droneTargets.every(target => target.x > 10 && target.x < 380));
        h.step(0); h.step(3500);
        assert.equal(scene.overlay.dataset.formation, 'holding');
        if (!native) {
            assert(scene.ctx.calls.some(call => call[0] === 'drawImage' && call[1] === scene.images.drone),
                'each theme uses an actual drone PNG in the live name formation');
        }
        h.step(7500); assert.equal(scene.overlay.dataset.formation, 'departing');
        h.step(8200); assert.equal(h.body.children.length, 0);
        assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
    }
    for (const [playerName, expected] of [['  Andrija Milinkovic ', 'ANDRIJA'], ['  ', 'YAMB'],
        ['Milo\u0161', 'MILO\u0160'], ['\u017deljko', '\u017dELJKO'], ['\u0402\u043e\u0440\u0452\u0435', '\u0402\u041e\u0420\u0402\u0415'],
        ['A', 'A'], ['AleksandrijaLongName', 'ALEKSANDRIJA'], ['WWWWWWWWWWWW', 'WWWWWWWWWWWW']]) {
        for (const width of [320, 390, 1280]) {
            const h = makeHarness({ width, height: 844, playerName, native });
            const scene = new h.Stage(h.owner, 'drones'); await scene.start();
            assert.equal(scene.overlay.dataset.name, expected);
            assert(scene.droneTargets.length > 0 && scene.droneTargets.length <= (native ? 480 : 1000), `${playerName}: bounded formation`);
            assert(scene.droneTargets.every(target => Number.isFinite(target.x) && target.x > 10 && target.x < width - 10
                && target.y > 50 && target.y < 800), `${playerName}/${width}: name fits the viewport`);
            h.setViewport(360, 780); scene.resize();
            assert.equal(scene.width, 360); assert.equal(scene.overlay.dataset.name, expected);
            assert(scene.droneTargets.every(target => target.x > 10 && target.x < 350), 'formation refits on resize');
            h.step(0); h.setTheme('moon'); h.step(900);
            assert.equal(h.body.children.length, 0, 'theme changes cancel the old themed drone swarm');
        }
    }
    const reduced = makeHarness({ reduced: true, native });
    const calm = new reduced.Stage(reduced.owner, 'drones'); await calm.start();
    reduced.step(0); reduced.step(800);
    assert.equal(calm.overlay.dataset.formation, 'holding');
    reduced.step(2600); assert.equal(reduced.body.children.length, 0);
    const pending = makeHarness({ native });
    const late = new pending.Stage(pending.owner, 'drones'); const start = late.start(); late.stop(); await start;
    assert.equal(pending.body.children.length, 0);
    const names = makeHarness({ native, playerName: 'Milos' });
    const scorer = new names.Stage(names.owner, 'drones');
    names.setPlayerName('Marko');
    await scorer.start();
    assert.equal(scorer.overlay.dataset.name, 'MILOS', 'the scorer is captured before asynchronous PNG loading');
    scorer.resize(); assert.equal(scorer.overlay.dataset.name, 'MILOS'); scorer.stop();
    console.log(`PASS themed drone PNGs, LED name formations, 24 name/viewport cases, cleanup, theme switch, reduced motion and pending load${native ? ' with real Canvas2D glyph sampling' : ''}.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
