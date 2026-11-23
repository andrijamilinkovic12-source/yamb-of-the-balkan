const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GREEN_QA_BASE_URL || 'http://127.0.0.1:3130';
const output = 'tmp/ufo-return';

(async () => {
    fs.mkdirSync(output,{recursive:true});
    const browser = await chromium.launch({ channel:'msedge' });
    try {
        for (const [theme,width,height] of [['dark',390,844],['neon',320,480],['light',1280,800]]) {
            const page = await browser.newPage({viewport:{width,height}});
            const errors = [];
            page.on('pageerror',e=>errors.push(e.message));
            await page.addInitScript(() => localStorage.setItem('yamb_sound','false'));
            await page.goto(base+'/qa/theme-live-effects-review.html?theme='+theme+'&effect=ufo_abduction&sound=1');
            await page.waitForFunction(()=>window.qaFx?.fx.stageScene?.scores?.length);
            const result = await page.evaluate(() => {
                const s=qaFx.fx.stageScene, c=s.ctx;
                const board=document.querySelector('.qa-board-grid'), original=[...board.children].map(el=>el.textContent);
                cancelAnimationFrame(s.raf); clearTimeout(s.timer);
                const text=c.fillText.bind(c), glyphs=[];
                c.fillText=(v,x,y)=>{ glyphs.push({v,x,y}); text(v,x,y); };
                function draw(t) {
                    s.startedAt=0; s.lastFrame=-100; glyphs.length=0; s.frame(t); cancelAnimationFrame(s.raf);
                    return glyphs.length;
                }
                window.drawUfoQA=draw;
                draw(900); const before=s.mutedNodes.size;
                const lifted=draw(2900);
                const mutedStyle=getComputedStyle(s.scores[0].node);
                const color=mutedStyle.webkitTextFillColor, opacity=mutedStyle.opacity;
                const held=draw(4900), returning=draw(5530);
                window.ufoBoardQA=original;
                return {before,lifted,held,returning,color,opacity,ship:s.images.ship.naturalWidth};
            });
            assert(result.ship>100 && result.before===0 && result.lifted>0 && !result.held && result.returning>0);
            assert.equal(result.color,'rgba(0, 0, 0, 0)'); assert.equal(result.opacity,'1');
            await page.screenshot({path:output+'/'+theme+'-return.png'});
            assert(await page.evaluate(() => {
                drawUfoQA(6250);
                const cells=document.querySelector('.qa-board-grid').children;
                return !document.querySelector('.live-ufo-score-muted') && cells.length===ufoBoardQA.length
                    && [...cells].every((el,i)=>el.textContent===ufoBoardQA[i]);
            }));
            if (theme === 'dark') {
                const audio = await page.evaluate(async () => {
                    const render = async (muted, cut) => {
                        const sm=app.soundMgr, rate=24000;
                        const ctx=sm.ctx=new OfflineAudioContext(1,8*rate,rate);
                        sm.enabled=!muted;
                        const stop=sm.ufoAbduction();
                        const pending=cut && ctx.suspend(2.2).then(()=>{stop();stop();return ctx.resume();});
                        const pcm=(await ctx.startRendering()).getChannelData(0);
                        if (pending) await pending;
                        const rms=(a,b)=>{ const slice=pcm.subarray(a*rate,b*rate);
                            return Math.sqrt(slice.reduce((sum,v)=>sum+v*v,0)/slice.length); };
                        return [[.5,1],[2,2.15],[3,4],[5.1,5.45],[7.5,8]].map(([a,b])=>rms(a,b));
                    };
                    return [await render(false,false),await render(false,true),await render(true,false)];
                });
                assert(audio[0].slice(0,4).every(v=>v>.008 && v<.25) && audio[0][4]===0);
                assert(audio[1][1]>.008 && audio[1].slice(2).every(v=>v===0));
                assert(audio[2].every(v=>v===0));
            }
            await page.locator('[data-effect=stop]').click();
            assert.equal(await page.locator('.live-stage-effect').count(),0);
            assert.deepEqual(errors,[]); await page.close();
            console.log(theme,width+'x'+height,'visible return, unchanged table and cleanup passed');
        }
    } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
