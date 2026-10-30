// Real socket handler, isolated from accounts/server/economy. The server broadcasts one message to both players.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../www/game.js'),'utf8');
const start=source.indexOf("this.socket.on('game_over_timeout', ");
const fnStart=source.indexOf('async (data) => {',start),next=source.indexOf("this.socket.on('spectate_started'",fnStart);
const fnEnd=source.lastIndexOf('});',next);
assert(start>=0&&fnStart>start&&fnEnd>fnStart);
const handlerSource=source.slice(fnStart,fnEnd+1);
const locales={sr:{win:'Protivniku je isteklo vreme. Tehnička pobeda.',loss:'Isteklo vam je vreme za potez! Izgubili ste partiju.'},en:{win:'Opponent ran out of time. Technical victory.',loss:'Your time to move has expired! You lost the game.'}};
(async()=>{
 let count=0;
 for(const locale of Object.keys(locales))for(const winner of [true,false])for(const serverApplied of [true,false])for(const coinPenalty of [0,1758]){
  const render=[],league=[],stats=[],values=new Map();
  const context={console:{log(){}},clearInterval(){},localStorage:{setItem:(k,v)=>values.set(k,v)},dukatIconHtml:()=>'<img src="canonical-ducat.png">',window:{kvartalnaLiga:{addPoints:n=>league.push(n)}},gt:k=>({'timeout_technical_win_msg':locales[locale].win,'timeout_loss_msg':locales[locale].loss,'penalty_msg':'Penalty {0}','league_pts_lost':'League -{0}'}[k]||'')};
  const createHandler=vm.runInNewContext('(function(){return '+handlerSource+';})',context);
  const app={gameActive:true,onlineMode:true,roomId:'room-fixture',socket:{id:winner?'winner':'loser'},playerName:'Fixture',stats:{games:1,totalScoreSum:100},inferOnlineDuelType:()=> 'random',clearOpponentReconnectGraceCountdown(){},soundMgr:{win(){},loss(){}},effectMgr:{celebrateWin(){}},updateStats:(...args)=>stats.push(args),showTechnicalGameOver:async v=>render.push(v)};
  const payload={roomId:'room-fixture',winnerId:'winner',loserId:'loser',winnerName:'Winner',loserName:'Loser',winnerReward:1775,coinPenalty,penalty:20,serverApplied,message:'Protivniku je isteklo vreme! Tehnička pobeda.'};
  const handler=createHandler.call(app);
  await handler.call(app,payload);
  assert.equal(render.length,1);assert.equal(render[0].resultType,winner?'win':'loss');
  assert(render[0].message.startsWith(locales[locale][winner?'win':'loss']),'Each role/language must use its own explanation');
  assert.equal(render[0].rewardAmount,1775);assert.equal(render[0].penaltyAmount,coinPenalty,'Ducat amount, including zero, must not become Power Index penalty points');
  assert.equal(stats.length,1);assert.equal(stats[0][3],true);assert.equal(stats[0][4].serverApplied,serverApplied);
  assert.deepEqual(league,serverApplied?[]:[winner?1775:-coinPenalty],'Confirmed server settlement must not be applied locally again');
  if(!winner){assert(render[0].message.includes('20'));assert(render[0].message.includes(String(coinPenalty)));}
  // Duplicate, late, foreign-room and offline notifications do not render another result.
  await handler.call(app,payload);assert.equal(render.length,1);
  app.gameActive=true;await handler.call(app,{...payload,roomId:'other-room'});assert.equal(render.length,1);
  app.onlineMode=false;await handler.call(app,payload);assert.equal(render.length,1);
  count++;
 }
 console.log(`PASS: ${count} real timeout-handler cases: winner/loser × Serbian/English × server/local settlement × zero/nonzero ducats; no wrong-role broadcast message, mixed units, duplicate or stale result.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
