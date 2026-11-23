const assert = require('node:assert/strict');
const { makeHarness } = require('./live-stage-test-harness.cjs');

(async () => {
    for (const mode of ['complete','stop','theme','lateFrame','reduced']) {
        const h = makeHarness({ reduced:mode === 'reduced' });
        const sounds = [];
        h.setSoundManager({ ufoAbduction(...at) { sounds.push(at); return () => sounds.push('stop'); } });
        const scene = new h.Stage(h.owner,'ufo_abduction');
        const start = scene.start();
        h.owner.getTargetTable = () => { throw Error('Looked up the next player after ship load'); };
        await start;
        assert.equal(sounds.length,0,'Wait for the animation clock before starting sound');
        h.step(0); h.step(1800);
        if (mode === 'reduced') {
            assert.deepEqual(sounds,[]); assert.equal(scene.mutedNodes.size,0);
            h.step(scene.duration);
        } else {
            assert.deepEqual(sounds,[[1.35,5]]);
            assert(scene.mutedNodes.size > 0 && scene.mutedNodes.size < h.scores.length);
            h.step(3900);
            assert.equal(scene.mutedNodes.size,h.scores.length);
            if (mode === 'theme') { h.setTheme('light'); h.step(4100); }
            else if (mode === 'stop') { scene.stop(); scene.stop(); }
            else {
                if (mode === 'complete') {
                    const changed = h.scores[0];
                    changed.textContent = '99';
                    h.step(4400);
                    assert(!changed.classList.contains('live-ufo-score-muted'),'A live score update is visible immediately');
                    h.step(5830);
                    assert(scene.mutedNodes.size > 0 && scene.mutedNodes.size < h.scores.length);
                    assert.equal(changed.textContent,'99','Never overwrite the latest value');
                }
                h.step(6350);
                assert.equal(scene.mutedNodes.size,0,'Return all numbers even if release frames were skipped');
                h.step(scene.duration);
            }
            assert.deepEqual(sounds,[[1.35,5],'stop'],'One audio sequence per scene and one cleanup');
        }
        assert(h.scores.every(node => !node.classList.contains('live-ufo-score-muted')));
        assert.equal(h.body.children.length,0);
        assert.equal(h.frames.size + h.timers.size,0);
    }
    console.log('UFO: scoring table pinned before load; pickup, return, late frames, changed scores, mute cleanup and reduced motion passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
