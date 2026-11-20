/* Isolated presentation state for the local preview, never a game session. */
(() => {
    document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('[id*="splash"],[id*="loading-gate"],#rotate-lock-overlay').forEach(e => e.remove());
    document.getElementById('custom-modal-overlay').style.display = 'none';
    const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
    const app = window.app = Object.create(PreviewApp.prototype);
    const noop = () => {};
    Object.assign(app, { playerId:'preview',playerName:'Ti',players:['Ti','Protivnik'],roomId:'preview-random',
        onlineMode:true,gameActive:true,isSpectator:false,currentPlayerIdx:1,myOnlineIndex:0,brojBacanja:2,
        kockiceVals:[1,3,3,4,5,6],zadrzane:[false,true,true,false,false,false],rewardAdAttemptId:0,
        modal:new ModalManager(),soundMgr:{stopMusic:noop},effectMgr:{celebrateWin:noop},
        emitOnlinePresencePing:noop,updateQuickMenuIcons:noop,prepareThemeRoomAssets:noop,
        navigateTo(id){document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===id));},
        features:{applySkinToElement(element,held){element.className='dice'+(held?' held':'');}},
        socket:{connected:false,emit:noop}
    });
    window.themeOnlinePlayers = {asset(role){return `assets/theme-packs/${localStorage.getItem('yamb_theme')||'light'}/canonical/online-players-internal/${role}-v1.png?v=2`;}};
    const dice = document.getElementById('dice-container'); dice.replaceChildren();
    app.diceBtns = Array.from({length:6},()=>{const element=document.createElement('div');element.className='dice';dice.appendChild(element);return element;});
    // All controls in the game frame are display-only except closing its information dialog.
    document.addEventListener('click',event=>{if(!['cm-ok','cm-close'].includes(event.target.closest('button')?.id)){event.preventDefault();event.stopImmediatePropagation();}},true);
    function stopClocks(){clearInterval(app.turnTimerInterval);app.turnTimerInterval=null;app.clearOpponentReconnectGraceCountdown();}
    async function show(config){
        stopClocks();app.modal.close();
        const {state,language,mode,running}=config;
        const theme=themes.includes(config.theme)?config.theme:'light';
        localStorage.setItem('yamb_lang',language==='en'?'en':'sr');localStorage.setItem('yamb_theme',theme);
        document.documentElement.dataset.splashTheme=theme;document.body.className=theme==='dark'?'':theme+'-theme';
        app.gameActive=true;app.onlineMode=state!=='local';app.isSpectator=state==='spectator';app.onlineTurnTimerPaused=false;
        app.modeTag=state==='local'?'Solo':'Online';app.onlineDuelType=mode;app.roomId='preview-'+mode;
        app.players=state==='local'?['Ti']:['Ti','Protivnik'];app.currentPlayerIdx=['mine','recovered','local','timeout-loss'].includes(state)?0:1;
        if(app.isSpectator)app.currentPlayerIdx=1;
        const avatar=window.themeOnlinePlayers.asset('avatar');localStorage.setItem('yamb_player_photo',avatar);app.currentOpponentPhoto=avatar;
        app.initScores();app.allScores[0].Nadole['1']=3;app.allScores[0].Nadole['2']=6;
        app.createScoreTables();app.updateTableVisuals();app.updateDiceVisuals();app.highlightCurrentPlayer();app.updateSpectatorIcon(2);
        document.querySelectorAll('img[data-online-role]').forEach(image=>image.src=window.themeOnlinePlayers.asset(image.dataset.onlineRole));
        app.navigateTo('game-scene');
        const roll=document.getElementById('btn-bacaj'),announce=document.getElementById('btn-najava');
        roll.textContent=t('game_roll');roll.disabled=app.currentPlayerIdx!==0;announce.textContent=t('game_announce');announce.disabled=true;
        if(['disconnect','grace-ended'].includes(state)){
            app.showOpponentReconnectGraceCountdown({remainingMs:state==='grace-ended'?0:mode==='tournament'?300000:30000});
            roll.disabled=true;app.updateTableVisuals();
            if(!running){clearInterval(app.opponentReconnectGraceTimer);app.opponentReconnectGraceTimer=null;}
        }else if(['left','timeout-win','timeout-loss'].includes(state)){
            const loss=state==='timeout-loss';
            await app.showTechnicalGameOver({resultType:loss?'loss':'win',winnerName:loss?'Protivnik':'Ti',loserName:loss?'Ti':'Protivnik',rewardAmount:500,penaltyAmount:500,
                message:t(state==='left'?'msg_opponent_left':loss?'timeout_loss_msg':'timeout_technical_win_msg')});
        }else if(state==='mutual'){
            app.gameActive=false;app.updateStatusLabel();
            void app.modal.alert(t(mode==='tournament'?'tourney_network_replay_msg':'mutual_disconnect_msg'),t(mode==='tournament'?'tourney_network_replay_title':'mutual_disconnect_title'));
        }else{
            app.startClientTimer(state==='urgent'?10:state==='expired'?0:state==='mine'?62:state==='recovered'?18:42);
            if(!running){clearInterval(app.turnTimerInterval);app.turnTimerInterval=null;}
        }
        await window.themeGameHeader?.apply();
        parent.postMessage({type:'timer-preview-state',state},location.origin);
    }
    let queue=Promise.resolve();
    window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='timer-preview')return;queue=queue.then(()=>show(event.data)).catch(error=>{console.error(error);parent.postMessage({type:'timer-preview-error',message:error.message},location.origin);});});
    window.addEventListener('load',()=>parent.postMessage({type:'timer-preview-ready'},location.origin),{once:true});
})();
