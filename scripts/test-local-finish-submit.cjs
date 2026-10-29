// Exercise the real pre-render finish flow without a browser, account, queue or server.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../www/game.js'),'utf8');
const endBeforeRendering=new Error('fixture: stop after score acknowledgement');
const warnings=[];
const context={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null,removeItem(){}},t:k=>k,console:{log(){},warn:(...a)=>warnings.push(a.join(' '))},setTimeout,clearTimeout,clearInterval};
vm.runInNewContext(source.replace('window.app = new YambApp();','globalThis.TestYambApp = YambApp;'),context);
(async()=>{
 for(const count of [1,2])for(const accepted of [true,false,undefined]){
  const app=Object.create(context.TestYambApp.prototype),calls=[];
  Object.assign(app,{players:Array(count).fill('Same visible name'),playerName:'Same visible name',allScores:Array(count).fill({}),gameActive:true,onlineMode:false,aiMode:false,isSpectator:false,socket:null,rewardAdAttemptId:0,soundMgr:{stopMusic(){},win(){throw endBeforeRendering;}}});
  for(const name of ['pauseLocalGameClock','refreshLocalStats','updateStats','rememberPendingGameReward'])app[name]=()=>{};
  app.calculateTotalScore=i=>i===0?650:500;app.getCurrentPlayerUid=()=> 'fixture';
  app.queueCompletedLocalMatchResult=async()=>({clientResultId:'fixture-result',accepted});
  const preview={baseReward:715,adReward:1430};
  app.safeSubmitScore=async(...args)=>{calls.push(args);return accepted===true
      ? {ok:true,recordAchievements:['personal'],soloRewardPreview:preview}
      : {ok:false,reason:'score_pending'};};
  try{await app.handleGameOver();assert.fail('Expected controlled stop before rendering');}catch(error){assert.equal(error,endBeforeRendering);}
  assert.equal(calls.length,1,`${count} players / accepted=${accepted}: score acknowledgement was skipped`);
  assert.equal(calls[0][1],650,'Account score must be used even with identical player names');
  assert.equal(calls[0][4],'fixture-result');assert.equal(calls[0][5].serverVerified,accepted===true);
  assert.equal(app.soloRewardPreview,accepted===true?preview:null,'Unconfirmed scores must not invent a confirmed reward preview');
  assert.equal(app.lastLocalResultAccepted,accepted===true);
 }
 assert.deepEqual(warnings,[],'The real finish flow must not swallow a score-submission ReferenceError');
 const managers=fs.readFileSync(path.join(__dirname,'../www/managers.js'),'utf8');
 const classes=()=>{const set=new Set();return{add:v=>set.add(v),remove:v=>set.delete(v),contains:v=>set.has(v),toggle:(v,on)=>on?set.add(v):set.delete(v),[Symbol.iterator]:()=>set[Symbol.iterator]()};};
 const overlay={classList:classes()},screen={classList:classes()},waiting={classList:classes()},cancel={classList:classes()},doc={getElementById:id=>({'custom-modal-overlay':overlay,'game-over-screen':screen,'waiting-screen':waiting,'cm-cancel':cancel}[id]||null)};
 const Modal=vm.runInNewContext(managers.slice(managers.indexOf('class ModalManager {'),managers.indexOf('// --- 4. EFFECT MANAGER'))+';ModalManager',{document:doc,t:k=>k});
 const modal=new Modal();screen.classList.add('active');screen.classList.add('is-solo-result');modal.setup('Info','Test',false);
 assert(overlay.classList.contains('modal-context-solo'),'Reward/error notices must inherit the Solo palette/type context');
 screen.classList.add('is-hotseat-result');modal.setup('Info','Test',false);
 assert(!overlay.classList.contains('modal-context-solo'),'Solo-only notice styling must not leak into duel/Hotseat results');
 assert(overlay.classList.contains('modal-context-hotseat'),'Local Hotseat notices must use their own palette/type context');
 screen.classList.add('is-online-duel-result');modal.setup('Info','Test',false);
 assert(!overlay.classList.contains('modal-context-hotseat'),'Hotseat context must not leak into online results');
 assert(overlay.classList.contains('modal-context-online-duel'),'Online results need their own scoped notification palette');
 screen.classList.remove('is-online-duel-result');
 screen.classList.remove('is-hotseat-result');screen.classList.remove('active');modal.setup('Info','Test',false);
 assert(!overlay.classList.contains('modal-context-solo'),'Hidden Solo results must not recolor another room notice');
 waiting.classList.add('active');waiting.classList.add('is-friend-invite');modal.setup('Info','Test',false);
 assert(overlay.classList.contains('modal-context-invite-friend'),'Friend room errors/search notices need their own palette/type context');
 assert(!overlay.classList.contains('modal-context-online-duel'),'Inactive result must not override the friend room context');
 waiting.classList.remove('active');modal.setup('Info','Test',false);
 assert(!overlay.classList.contains('modal-context-invite-friend'),'Friend palette must not leak after leaving the room');
 console.log('PASS: Solo/Hotseat finish submits the account score for accepted/rejected/pending queue results; only a confirmed acknowledgement supplies the reward preview.');
 console.log('PASS: Solo/Hotseat finish notices inherit their scoped palette/type; hidden or online results do not leak those contexts.');
})().catch(e=>{console.error(e);process.exitCode=1;});
