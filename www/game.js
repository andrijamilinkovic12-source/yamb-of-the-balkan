// game.js - MAIN GAME LOGIC (UPDATED RESUME/NEW GAME LOGIC + TOURNAMENT + ANTI-SPAM CHAT + LIVE CALENDAR + FULL CLOUD SAVE + ERROR HANDLING)

/* --- POMOĆNE FUNKCIJE --- */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function getPlayerId() {
    let uid = localStorage.getItem('yamb_uid');
    if (uid) return uid;

    let id = localStorage.getItem('yamb_player_id');
    if (!id) {
        id = 'usr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('yamb_player_id', id);
    }
    return id;
}

const gt = (key) => {
    if (typeof t === 'function') return t(key);
    return key; 
};

/* --- FILTER VULGARNOSTI (KLIJENT STRANA) --- */
const zabranjeneReci = [
    "idiot", "budala", "kreten", "glupan", "majmun", "debil", "stoka",
    "kurv", "jeb", "pizd", "kurac", "sranj", "govn", "pick", "pedere", "pederu",
    "verskauvreda1", "nacionalnauvreda1", "rasnauvreda1", "balij", "ustas", "chetnik", "siptar", "cigan",
    "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "slut", "whore", 
    "faggot", "nigger", "nigga", "bastard", "retard", "crap", "douche", "motherfucker"
];

const charMap = {
    'a': '[aA@4]', 'b': '[bB8]', 'c': '[cCčČćĆ]', 'd': '[dDđĐ]', 'e': '[eE3]',
    'g': '[gG6]', 'i': '[iI1l!L]', 'l': '[lL1iI]', 'o': '[oO0]', 's': '[sSšŠ5\\$]',
    't': '[tT7]', 'z': '[zZžŽ]'
};

function napraviPametniRegex(rec) {
    let regexStr = '';
    for (let i = 0; i < rec.length; i++) {
        let slovo = rec[i].toLowerCase();
        let pattern = charMap[slovo] || `[${slovo.toLowerCase()}${slovo.toUpperCase()}]`;
        regexStr += pattern + '+';
        if (i < rec.length - 1) regexStr += '[\\W_]*';
    }
    return new RegExp(regexStr, 'gi');
}

const zabranjeniRegexi = zabranjeneReci.map(rec => napraviPametniRegex(rec));

function cenzurisiPoruku(poruka) {
    let filtriranaPoruka = poruka;
    zabranjeniRegexi.forEach(regex => {
        filtriranaPoruka = filtriranaPoruka.replace(regex, '***');
    });
    return filtriranaPoruka;
}

/* --- DAILY CHALLENGE MANAGER --- */
class DailyChallengeManager {
    constructor(app) {
        this.app = app;
        this.currentIndex = 0;
        this.interval = null;
        this.diceValues = [0,0,0,0,0,0];
        this.isActive = false;
        this.UNICODE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    }

    open() {
        const uid = localStorage.getItem('yamb_uid') || 'guest';
        const lastPlayed = localStorage.getItem('yamb_last_daily_' + uid) || localStorage.getItem('yamb_last_daily');
        const today = new Date().toDateString();

        if (lastPlayed === today) {
            this.app.modal.alert(gt('dc_done'), gt('info_title') || "INFO");
            return;
        }

        // Čuvamo za specifičnog korisnika
        localStorage.setItem('yamb_last_daily_' + uid, today);
        localStorage.setItem('yamb_last_daily', today); // Zbog kompatibilnosti

        this.app.navigateTo('daily-challenge-screen');
        this.resetGame();
        this.startRolling(0); 
    }

    resetGame() {
        this.currentIndex = 0;
        this.diceValues = [0,0,0,0,0,0];
        this.isActive = true;
        
        const sumEl = document.getElementById('dc-current-sum');
        if(sumEl) sumEl.innerText = "0";
        
        const stopBtn = document.getElementById('btn-daily-stop');
        if(stopBtn) {
            stopBtn.disabled = false;
            stopBtn.innerText = gt('dc_stop');
        }
        
        for(let i=0; i<6; i++) {
            const el = document.getElementById(`dc-die-${i}`);
            if(el) {
                this.app.features.applySkinToElement(el);
                el.classList.add('daily-dice');
                el.innerText = "?";
                el.classList.remove('active', 'locked'); 
            }
        }
    }

    startRolling(index) {
        if (index >= 6) {
            this.finishGame();
            return;
        }

        const dieEl = document.getElementById(`dc-die-${index}`);
        if(dieEl) dieEl.classList.add('active');
        
        this.interval = setInterval(() => {
            const rnd = Math.floor(Math.random() * 6) + 1;
            if(dieEl) {
                dieEl.innerText = this.UNICODE[rnd];
                dieEl.dataset.val = rnd; 
            }
        }, 50); 
    }

    stopDice() {
        if (!this.isActive) return;

        clearInterval(this.interval);
        this.app.soundMgr.click();

        const dieEl = document.getElementById(`dc-die-${this.currentIndex}`);
        let finalVal = 1;
        
        if(dieEl) {
             finalVal = parseInt(dieEl.dataset.val) || Math.floor(Math.random()*6)+1;
             this.diceValues[this.currentIndex] = finalVal;
             dieEl.innerText = this.UNICODE[finalVal];
             
             dieEl.classList.remove('active');
             dieEl.classList.add('locked');
        }

        const currentSum = this.diceValues.reduce((a,b)=>a+b, 0);
        const sumEl = document.getElementById('dc-current-sum');
        if(sumEl) sumEl.innerText = currentSum;

        this.currentIndex++;
        if (this.currentIndex < 6) {
            this.startRolling(this.currentIndex);
        } else {
            this.isActive = false; 
            const stopBtn = document.getElementById('btn-daily-stop');
            if(stopBtn) stopBtn.disabled = true; 
            
            setTimeout(() => {
                this.finishGame();
            }, 2500); 
        }
    }

    finishGame() {
        this.isActive = false;
        const stopBtn = document.getElementById('btn-daily-stop');
        if(stopBtn) stopBtn.disabled = true;
        
        const totalSum = this.diceValues.reduce((a,b) => a+b, 0);
        const reward = totalSum * 10; 
        
        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        currentDukati += reward;
        localStorage.setItem('yamb_dukati', currentDukati);
        
        if (window.statsManager) {
            window.statsManager.stats.balance = currentDukati;
            window.statsManager.saveStats();
        }

        if (this.app && this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid') || this.app.playerId,
                name: this.app.playerName,
                stats: this.app.getFullLocalStats(),
                playerId: this.app.playerId
            });
        }

        const uid = localStorage.getItem('yamb_uid') || 'guest';
        localStorage.setItem('yamb_last_daily_' + uid, new Date().toDateString());
        localStorage.setItem('yamb_last_daily', new Date().toDateString()); // Zbog kompatibilnosti
        
        this.app.soundMgr.win();
        this.showResultModal(reward);
    }

    showResultModal(amount) {
        const title = document.getElementById('go-title');
        const msg = document.getElementById('go-msg');
        const score = document.getElementById('go-score');
        
        if(title) title.innerText = gt('dc_title');
        if(msg) msg.innerText = `${gt('dc_sum')}: ${amount/10}`;
        if(score) score.innerText = amount;
        
        this.app.pendingScore = amount;
        this.app.lastGameType = 'daily'; 
        this.app.navigateTo('game-over-screen');
    }
}

/* --- GLAVNA APLIKACIJA (YAMB APP) --- */
class YambApp {
    constructor() {
        console.log("YambApp v8.8 - RACE CONDITION FIXED");

        this.soundMgr = new SoundManager(); 
        this.modal = new ModalManager(); 
        this.effectMgr = new EffectManager(); 
        this.topListManager = new TopListManager(this);
        
        if(window.TrophyManager) {
            window.trophyManager = new TrophyManager(window.statsManager, this.soundMgr);
        }
        
        this.features = new YambFeatures(this);
        this.dailyManager = new DailyChallengeManager(this);

        if (typeof TournamentManager !== 'undefined') {
            this.tournamentManager = new TournamentManager(this);
        }

        this.players = []; 
        this.allScores = []; 
        this.currentPlayerIdx = 0;
        this.gameActive = false; 

        this.kockiceVals = [0,0,0,0,0,0]; 
        this.zadrzane = [false,false,false,false,false,false];
        this.brojBacanja = 0; 
        this.najavaAktivna = false; 
        this.najavljenoPolje = null;
        this.modeTag = "Solo"; 
        this.chatOpen = false; 
        this.unreadMsgs = 0;
        this.lastGameType = 'normal';
        this.lastMoveSnapshot = null; 
        this.pendingNewGamePlayers = 1;
        this.lastGlobalMsg = null; 
        
        this.socket = null; 
        this.onlineMode = false; 
        this.myOnlineIndex = 0;
        this.onlineUsersCount = 1; 
        this.isAnimating = false; 

        this.aiMode = false;
        this.aiDifficulty = "medium";
        
        this.inviteDetected = false;

        // Ako nema imena, biće prazno dok se ne uloguje. Nema više gosta.
        this.playerName = localStorage.getItem('yamb_player_name') || "";
        this.playerId = getPlayerId();
        
        const savedSound = localStorage.getItem('yamb_sound');
        this.soundEnabled = savedSound !== 'false'; 
        if(this.soundMgr) this.soundMgr.enabled = this.soundEnabled;
        
        const savedStats = JSON.parse(localStorage.getItem('yamb_stats'));
        this.stats = savedStats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0 };
        
        this.diceBtns = []; 
        this.consecutiveNajava = 0; 
        this.hasSvetiIlija = false;
        this.hasProphet = false;

        this.adMob = window.adMobGlobal; 
        this.pendingScore = 0; 

        const dayEl = document.getElementById('live-day');
        const monthEl = document.getElementById('live-month');
        if (dayEl && monthEl) {
            const now = new Date();
            const meseci = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
            dayEl.innerText = String(now.getDate()).padStart(2, '0');
            monthEl.innerText = meseci[now.getMonth()];
        }

        const chatWin = document.getElementById("chat-window");
        if(chatWin) this.dragElement(chatWin);
        
        const btnSend = document.getElementById('btn-chat-send');
        if(btnSend) {
            btnSend.addEventListener('click', () => this.sendChat());
            btnSend.addEventListener('touchend', (e) => { e.preventDefault(); this.sendChat(); });
        }
        const chatInput = document.getElementById('chat-input-field');
        if(chatInput) {
            chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.sendChat(); });
        }

        const btnGlobalSend = document.getElementById('btn-global-send');
        if(btnGlobalSend) {
            btnGlobalSend.addEventListener('click', () => this.sendGlobalChat());
            btnGlobalSend.addEventListener('touchend', (e) => { e.preventDefault(); this.sendGlobalChat(); });
        }
        const inputGlobalChat = document.getElementById('global-chat-input');
        if(inputGlobalChat) {
            inputGlobalChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.sendGlobalChat(); });
        }
        
        const savedTheme = localStorage.getItem('yamb_theme') || 'dark';
        this.applyTheme(savedTheme);
        
        this.initSocketConnection();

        if (window.Capacitor) {
            window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
                try {
                    const url = new URL(data.url);
                    const roomId = url.searchParams.get('room');
                    if (roomId) {
                        this.inviteDetected = true;
                        if (this.splashTimeout) { clearTimeout(this.splashTimeout); this.splashTimeout = null; }
                        this.navigateTo('splash-screen');
                        setTimeout(() => { this.joinPrivateGame(this.playerName, roomId); }, 800);
                    }
                } catch (err) { console.error("Link error:", err); }
            });
        }

        document.addEventListener("resume", () => { setTimeout(() => { this.checkForInvite(); }, 500); }, false);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'visible') setTimeout(() => { this.checkForInvite(); }, 500); });
        
        // --- Uklonjeno automatsko prebacivanje na glavni meni, sada to radi auth.js ---

        setTimeout(() => { this.checkForInvite(); }, 500);

        this.handleRotationLock();
        window.addEventListener('resize', () => this.handleRotationLock());
        window.addEventListener('orientationchange', () => this.handleRotationLock());

        this.uiInit();
        this.syncBalance();
    }
    
    syncBalance() {
        const realBalance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        if(window.statsManager) {
            window.statsManager.stats.balance = realBalance;
            window.statsManager.saveStats();
        }
        if(this.stats) this.stats.balance = realBalance;
    }
    
    applyTheme(theme) {
        document.body.classList.remove('light-theme', 'medium-theme', 'winter-theme', 'neon-theme', 'amethyst-theme');
        if (theme === 'light') document.body.classList.add('light-theme'); 
        else if (theme === 'medium') document.body.classList.add('medium-theme');
        else if (theme === 'winter') document.body.classList.add('winter-theme');
        else if (theme === 'neon') document.body.classList.add('neon-theme');
        else if (theme === 'amethyst') document.body.classList.add('amethyst-theme');
    }

    getFullLocalStats() {
        const uid = localStorage.getItem('yamb_uid') || 'guest';
        return {
            games: this.stats.games || 0,
            wins: this.stats.wins || 0,
            losses: this.stats.losses || 0,
            highscore: this.stats.highscore || 0,
            totalScoreSum: this.stats.totalScoreSum || 0,
            balance: parseInt(localStorage.getItem('yamb_dukati')) || 0,
            currentWinStreak: window.statsManager ? window.statsManager.stats.currentWinStreak : 0,
            unlockedTrophies: window.statsManager ? window.statsManager.stats.unlockedTrophies : [],
            yamb_unlocked: JSON.parse(localStorage.getItem('yamb_unlocked') || '[]'),
            unlockedSkins: JSON.parse(localStorage.getItem('yamb_unlocked_skins') || '[]'),
            unlockedEffects: JSON.parse(localStorage.getItem('yamb_unlocked_effects') || '[]'),
            unlockedThemes: JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]'),
            leagueData: JSON.parse(localStorage.getItem('yamb_quarter_data')) || { year: 0, quarter: 0, baselineScore: 0 },
            activeSkin: localStorage.getItem('yamb_active_skin') || 'default',
            activeEffect: localStorage.getItem('yamb_active_effect') || 'confetti',
            activeTheme: localStorage.getItem('yamb_theme') || 'dark',
            lastDaily: localStorage.getItem('yamb_last_daily_' + uid) || localStorage.getItem('yamb_last_daily') || ""
        };
    }

    initSocketConnection() {
        if (this.socket) {
            if (this.socket.disconnected) { 
                console.log("♻️ Osvežavam prekinutu socket konekciju...");
                this.socket.connect();
            }
            return; 
        }

        try {
            if (typeof io !== 'undefined') {
                const connectionUrl = (typeof SERVER_URL !== 'undefined') ? SERVER_URL : window.location.origin;
                
                console.log("🔌 Povezujem se prvi put na:", connectionUrl);

                this.socket = io(connectionUrl, { 
                    transports: ['websocket'],
                    reconnection: true,             
                    reconnectionAttempts: 20,       
                    reconnectionDelay: 1000,        
                    timeout: 20000,                 
                    autoConnect: true
                });
                
                this.socket.on('connect', () => {
                    console.log("✅ Socket povezan! ID:", this.socket.id);
                    
                    this.socket.emit('set_my_id', this.playerId);
                    
                    let emitData = { 
                        name: this.playerName, 
                        stats: this.getFullLocalStats(),
                        playerId: this.playerId 
                    };

                    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) {
                        window.Capacitor.Plugins.FirebaseAuthentication.getCurrentUser().then(res => {
                            if (res.user && res.user.uid) {
                                emitData.uid = res.user.uid;
                                this.socket.emit('set_player_data', emitData);
                            } else {
                                this.socket.emit('set_player_data', emitData);
                            }
                        }).catch(() => {
                            this.socket.emit('set_player_data', emitData);
                        });
                    } else {
                         this.socket.emit('set_player_data', emitData);
                    }

                    if(document.getElementById('wait-msg')) document.getElementById('wait-msg').innerText = gt('hs_loading');
                    if (this.topListManager) this.topListManager.syncOfflineScores();
                    
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('room') && !this.gameActive) { this.checkForInvite(); }
                });

                this.socket.on('users_count', (count) => {
                    this.onlineUsersCount = count;
                    this.updateOnlineCounterUI();
                });

                this.socket.off('global_chat_msg');
                this.socket.on('global_chat_msg', (data) => {
                    const isMe = (this.socket && data.senderId === this.socket.id);
                    this.appendGlobalChatMessage(data.sender, data.msg, isMe ? "msg-outgoing" : "msg-incoming", data.senderId);
                });

                this.socket.on('incoming_challenge', async (data) => {
                    const { challengerId, challengerName } = data;
                    let text = gt('duel_incoming');
                    if(text === 'duel_incoming') text = `Igrač {0} vas izaziva na duel! Prihvatate?`;
                    
                    const accepted = await this.modal.confirm(text.replace('{0}', challengerName));
                    this.socket.emit('challenge_response', {
                        challengerId: challengerId,
                        accepted: accepted
                    });
                });

                this.socket.on('challenge_declined', (data) => {
                    let text = data.message || gt('duel_declined');
                    if (text === 'duel_declined') text = "Igrač je nažalost odbio vaš izazov.";
                    this.modal.alert(text, gt('modal_title_info') || "INFO");
                });

                this.socket.on('game_started', (data) => {
                    this.closeGlobalChat(); 
                    this.joinPrivateGame(this.playerName, data.room);
                });

                this.socket.on('global_highscores_data', (data) => { 
                    if(this.topListManager) this.topListManager.renderList(data, 'global-hs-list'); 
                });
                
                this.socket.on('error_msg', (msgKey) => {
                    let finalMsg = msgKey;
                    if (typeof t === 'function' && t(msgKey) !== msgKey) {
                        finalMsg = gt(msgKey);
                    }
                    if (this.modal) {
                        this.modal.alert(finalMsg, gt('err_title') || gt('modal_title_info') || "INFO");
                    }
                });

                this.socket.on('connect_error', (err) => {
                    console.warn("Socket connection error:", err);
                });
            }
        } catch (e) { console.error("Greška pri inicijalizaciji socketa:", e); }
    }

    updateOnlineCounterUI() {
        const el = document.getElementById('live-online-count');
        if (el) {
            el.style.opacity = 0;
            setTimeout(() => { el.innerText = this.onlineUsersCount; el.style.opacity = 1; }, 200);
        }
        
        const chatEl = document.getElementById('global-chat-online-count');
        if (chatEl) {
            chatEl.innerText = this.onlineUsersCount;
        }
    }

    handleRotationLock() {
        const overlay = document.getElementById('rotate-lock-overlay');
        if(!overlay) return;
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape && window.innerHeight < 600) {
            overlay.style.display = 'flex';
            overlay.style.zIndex = '999999';
        } else {
            overlay.style.display = 'none';
        }
    }

    checkForInvite() { 
        const params = new URLSearchParams(window.location.search); 
        const roomId = params.get('room'); 
        if (roomId) { 
            console.log("Invite detected: " + roomId);
            this.inviteDetected = true;
            if (this.splashTimeout) { clearTimeout(this.splashTimeout); this.splashTimeout = null; }
            this.navigateTo('splash-screen'); 
            setTimeout(() => { this.joinPrivateGame(this.playerName, roomId); }, 500); 
        } 
    }
    
    navigateTo(screenId) { 
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active')); 
        const target = document.getElementById(screenId); 
        if (target) target.classList.add('active'); 
        if(screenId === 'main-menu' && !this.inviteDetected) this.checkSavedGame(); 
        if (screenId === 'highscores-screen') { this.switchHsTab('local'); }
    }

    switchHsTab(tab) { this.topListManager.switchTab(tab); }

    uiInit() { 
        const diceCont = document.getElementById('dice-container'); 
        if(diceCont) { 
            diceCont.innerHTML = ""; 
            for (let i = 0; i < 6; i++) { 
                let btn = document.createElement('div'); 
                btn.className = 'dice'; 
                btn.onclick = () => this.toggleHold(i); 
                diceCont.appendChild(btn); 
                this.diceBtns.push(btn); 
            } 
        }
        this.makeButtonDraggable();
    }
    
    dragElement(elmnt) { 
        if(!elmnt) return; 
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; 
        var header = document.getElementById("chat-header"); 
        if (header) { header.onmousedown = dragMouseDown; header.ontouchstart = dragMouseDown; } 
        function dragMouseDown(e) { 
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            if(e.type === 'touchstart') { pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; } 
            else { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; } 
            document.onmouseup = closeDragElement; document.onmousemove = elementDrag; 
            document.ontouchend = closeDragElement; document.ontouchmove = elementDrag; 
        } 
        function elementDrag(e) { 
            let clientX, clientY; 
            if(e.type === 'touchmove') { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
            else { e.preventDefault(); clientX = e.clientX; clientY = e.clientY; } 
            pos1 = pos3 - clientX; pos2 = pos4 - clientY; pos3 = clientX; pos4 = clientY; 
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; 
        } 
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; document.ontouchend = null; document.ontouchmove = null; } 
    }

    makeButtonDraggable() {
        const btn = document.getElementById('chat-float-btn');
        if (!btn) return;
        let isDragging = false; let startX, startY, initialLeft, initialTop; let moved = false; 
        const onTouchStart = (e) => {
            if(e.touches.length > 1) return;
            const touch = e.touches[0]; startX = touch.clientX; startY = touch.clientY;
            const rect = btn.getBoundingClientRect(); initialLeft = rect.left; initialTop = rect.top;
            isDragging = true; moved = false; btn.style.transition = 'none';
        };
        const onTouchMove = (e) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const touch = e.touches[0]; const dx = touch.clientX - startX; const dy = touch.clientY - startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
            btn.style.left = `${initialLeft + dx}px`; btn.style.top = `${initialTop + dy}px`;
            btn.style.right = 'auto'; btn.style.bottom = 'auto'; 
        };
        const onTouchEnd = () => { isDragging = false; btn.style.transition = 'transform 0.2s'; };
        const onClick = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); return false; } };
        btn.addEventListener('touchstart', onTouchStart, {passive: false});
        btn.addEventListener('touchmove', onTouchMove, {passive: false});
        btn.addEventListener('touchmove', onTouchEnd);
        btn.addEventListener('click', onClick, true); 
    }

    toggleChat() { 
        this.chatOpen = !this.chatOpen; 
        const win = document.getElementById('chat-window'); 
        const badge = document.getElementById('chat-badge'); 
        if (this.chatOpen) { 
            win.classList.add('active'); badge.classList.remove('active'); 
            this.unreadMsgs = 0; 
            const body = document.getElementById('chat-body'); if(body) body.scrollTop = body.scrollHeight; 
        } else { win.classList.remove('active'); } 
    }
    
    appendChatMessage(sender, text, type) { 
        const body = document.getElementById('chat-body'); if(!body) return;
        const msgDiv = document.createElement('div'); msgDiv.className = `msg-bubble ${type}`; 
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`; body.appendChild(msgDiv); 
        body.scrollTop = body.scrollHeight; 
        if (!this.chatOpen) { 
            this.unreadMsgs++; const badge = document.getElementById('chat-badge');
            if(badge) badge.classList.add('active'); this.soundMgr.chat(); 
        } 
    }
    
    sendChat() { 
        const input = document.getElementById('chat-input-field'); 
        let text = input.value.trim(); 
        if (!text) return; 
        
        text = cenzurisiPoruku(text); 

        this.appendChatMessage(gt('chat_you'), text, "msg-outgoing"); 
        input.value = ""; 
        if (this.onlineMode && this.socket) { 
            this.socket.emit('chat_msg', { roomId: this.roomId, msg: text }); 
        } 
    }

    async openGlobalChat() {
        this.initSocketConnection();
        const accepted = localStorage.getItem('yamb_chat_rules_accepted');

        if (!accepted) {
            const isConfirmed = await this.modal.confirm(gt('chat_rules_msg'));
            
            if (isConfirmed) {
                localStorage.setItem('yamb_chat_rules_accepted', 'true');
                const overlay = document.getElementById('global-chat-overlay');
                if (overlay) overlay.style.display = 'flex';
            }
        } else {
            const overlay = document.getElementById('global-chat-overlay');
            if (overlay) overlay.style.display = 'flex';
        }
    }

    async closeGlobalChat() {
        const overlay = document.getElementById('global-chat-overlay');
        if (overlay) overlay.style.display = 'none';

        if (this.adMob && this.adMob.showInterstitial) {
            await this.adMob.showInterstitial();
        }
    }

    appendGlobalChatMessage(sender, text, type, senderId = null) { 
        const body = document.getElementById('global-chat-body'); 
        if(!body) return;
        
        const sada = Date.now();
        if (this.lastGlobalMsg && 
            this.lastGlobalMsg.text === text && 
            this.lastGlobalMsg.sender === sender && 
            (sada - this.lastGlobalMsg.time < 1000)) {
            return; 
        }
        this.lastGlobalMsg = { text, sender, time: sada };

        const infoMsg = body.querySelector('div[style*="text-align: center"]');
        if (infoMsg && body.children.length === 1) {
            infoMsg.style.display = 'none';
        }

        const msgDiv = document.createElement('div'); 
        msgDiv.className = `msg-bubble ${type}`; 
        
        let nameHtml = `<strong>${sender}:</strong>`;
        if (senderId && senderId !== (this.socket ? this.socket.id : null) && sender !== gt('sys_name') && type === "msg-incoming") {
            nameHtml = `<strong style="cursor:pointer; color:var(--gold-main); text-decoration:underline;" onclick="window.app.challengePlayer('${senderId}', '${sender}')" title="Izazovi na duel ⚔️">${sender}:</strong>`;
        }
        
        msgDiv.innerHTML = `${nameHtml} ${text}`; 
        body.appendChild(msgDiv); 
        body.scrollTop = body.scrollHeight; 
        
        if (type === "msg-incoming" && this.soundMgr) {
            this.soundMgr.chat(); 
        }
    }
    
    sendGlobalChat() { 
        const input = document.getElementById('global-chat-input'); 
        let text = input.value.trim(); 
        if (!text) return; 
        
        input.value = ""; 
        
        if (this.socket && this.socket.connected) { 
            this.socket.emit('global_chat_msg', { sender: this.playerName, msg: text }); 
        } else {
            this.initSocketConnection();
            setTimeout(() => {
                if (this.socket && this.socket.connected) {
                    this.socket.emit('global_chat_msg', { sender: this.playerName, msg: text }); 
                } else {
                    this.appendGlobalChatMessage(gt('sys_name') || "Sistem", gt('sys_no_conn') || "Niste povezani na server.", "msg-incoming");
                }
            }, 800);
        }
    }

    async challengePlayer(targetId, targetName) {
        this.initSocketConnection(); 
        if (!this.socket || !this.socket.connected) return;
        
        let askText = gt('duel_ask');
        if (askText === 'duel_ask') askText = `Želite li da izazovete igrača {0} na duel?`;

        const isConfirmed = await this.modal.confirm(askText.replace('{0}', targetName));
        if(isConfirmed) {
            this.socket.emit('send_challenge', { targetId, challengerName: this.playerName });
            
            let sentText = gt('duel_sent');
            if (sentText === 'duel_sent') sentText = `Izazov poslat igraču {0}. Čekamo odgovor...`;
            this.modal.alert(sentText.replace('{0}', targetName), gt('duel_title') || "IZAZOV");
        }
    }
    
    requestRematch() {
        if (!this.socket || !this.onlineMode) return;
        
        const btnRematch = document.getElementById('btn-rematch');
        if (btnRematch) {
            btnRematch.disabled = true;
            btnRematch.innerHTML = `<span>⏳ ${gt('hs_loading')}</span>`;
            btnRematch.style.background = 'linear-gradient(45deg, #FF9800, #F57C00)';
            btnRematch.style.boxShadow = 'none';
        }
        
        this.soundMgr.click();
        this.socket.emit('request_rematch');
    }

    showSettings() { 
        this.navigateTo('settings-screen'); 
        document.getElementById('setting-name').value = this.playerName; 
        document.getElementById('setting-sound').checked = this.soundEnabled; 
        
        const themeSelect = document.getElementById('setting-theme');
        let unlockedThemes = ['dark', 'light', 'medium', 'winter'];
        try {
            const boughtThemes = JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]');
            const generalThemes = JSON.parse(localStorage.getItem('yamb_unlocked') || '[]');
            let cloudSkins = [];
            if(window.statsManager && window.statsManager.stats.unlockedSkins) {
                cloudSkins = window.statsManager.stats.unlockedSkins;
            }
            unlockedThemes = [...unlockedThemes, ...boughtThemes, ...generalThemes, ...cloudSkins];
        } catch(e) {}

        const sveValidneTeme = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst'];
        unlockedThemes = unlockedThemes.filter(t => sveValidneTeme.includes(t));
        unlockedThemes = [...new Set(unlockedThemes)];

        Array.from(themeSelect.options).forEach(opt => {
            if (unlockedThemes.includes(opt.value)) {
                opt.disabled = false;
                opt.text = opt.text.replace(' 🔒', ''); 
            } else {
                opt.disabled = true;
                if (!opt.text.includes('🔒')) opt.text += ' 🔒'; 
            }
        });

        themeSelect.value = localStorage.getItem('yamb_theme') || 'dark'; 
    }
    
    saveSettings() { 
        const newName = document.getElementById('setting-name').value.trim(); 
        if(newName) {
            this.playerName = newName;
            if (this.gameActive && !this.onlineMode && this.players.length > 0) {
                 if(this.modeTag === 'Solo') {
                     this.players[0] = newName;
                     const nameEl = document.querySelector('#ptable-0 .player-name');
                     if(nameEl) nameEl.innerText = newName;
                 }
            }
        }
        
        this.soundEnabled = document.getElementById('setting-sound').checked; 
        if(this.soundMgr) this.soundMgr.enabled = this.soundEnabled;

        const selectedTheme = document.getElementById('setting-theme').value; 
        localStorage.setItem('yamb_theme', selectedTheme); 
        this.applyTheme(selectedTheme);
        
        localStorage.setItem('yamb_player_name', this.playerName); 
        localStorage.setItem('yamb_sound', this.soundEnabled); 
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('set_player_data', { 
                name: this.playerName, 
                stats: this.getFullLocalStats(),
                playerId: this.playerId
            });
        }

        this.showMainMenu(); 
    }

    showStats() { 
        this.navigateTo('stats-screen'); 
        document.getElementById('stat-games').innerText = this.stats.games; 
        document.getElementById('stat-high').innerText = this.stats.highscore; 
        document.getElementById('stat-wins').innerText = this.stats.wins; 
        document.getElementById('stat-losses').innerText = this.stats.losses; 
        
        const avg = this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 0; 
        document.getElementById('stat-avg').innerText = avg; 

        const totalCompetitive = this.stats.wins + this.stats.losses; 
        let rate = 0; let winWidth = 50; let lossWidth = 50;
        if (totalCompetitive > 0) { rate = Math.round((this.stats.wins / totalCompetitive) * 100); winWidth = rate; lossWidth = 100 - rate; } 
        else { winWidth = 0; lossWidth = 0; }

        document.getElementById('stat-rate').innerText = rate + "%"; 
        const winBar = document.getElementById('stat-bar-win'); const lossBar = document.getElementById('stat-bar-loss');
        if(winBar) winBar.style.width = winWidth + "%"; if(lossBar) lossBar.style.width = lossWidth + "%";

        let currentStreak = 0;
        const realBalance = localStorage.getItem('yamb_dukati') || 0;
        document.getElementById('stat-balance').innerText = realBalance;

        const sm = window.statsManager;
        let trophyList = [];
        if (sm && sm.stats) { trophyList = sm.stats.unlockedTrophies || []; }

        const ALL_TROPHY_IDS = ['first_play', 'apprentice', 'kafana', 'score_1000', 'grandmaster', 'legend', 'mythic', 'godlike', 'surgeon', 'prophet', 'sniper', 'math', 'sveti_ilija', 'hazard', 'firecracker', 'concrete', 'perfectionist', 'miner', 'immortal', 'potato', 'minimal', 'achilles', 'close_call', 'night_owl', 'spite', 'veteran'];
        let realTrophyCount = 0;
        trophyList.forEach(item => { if (ALL_TROPHY_IDS.includes(item)) realTrophyCount++; });
        document.getElementById('stat-trophies').innerText = `${realTrophyCount} / ${ALL_TROPHY_IDS.length}`;
        
        if (sm) { const stats = sm.getStats(); currentStreak = stats.currentWinStreak > 0 ? stats.currentWinStreak : 0; }
        document.getElementById('stat-streak').innerText = currentStreak;
        this.updateOnlineCounterUI();
    }

    showHighscoresScreen() { 
        this.navigateTo('highscores-screen'); 
        this.switchHsTab('local'); 
    }

    updateStats(score, resultType) { 
        this.stats = this.stats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0 };
        this.stats.games++; 
        this.stats.totalScoreSum += score; 
        if (score > this.stats.highscore) this.stats.highscore = score; 
        if (resultType === 'win') this.stats.wins++; 
        else if (resultType === 'loss') this.stats.losses++; 
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats)); 

        if (this.socket && this.socket.connected) {
            let emitData = { 
                name: this.playerName, 
                stats: this.getFullLocalStats(),
                playerId: this.playerId
            };

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) {
                window.Capacitor.Plugins.FirebaseAuthentication.getCurrentUser().then(res => {
                    if (res.user && res.user.uid) {
                        emitData.uid = res.user.uid;
                        this.socket.emit('set_player_data', emitData);
                    } else {
                        this.socket.emit('set_player_data', emitData);
                    }
                }).catch(() => {
                    this.socket.emit('set_player_data', emitData);
                });
            } else {
                 this.socket.emit('set_player_data', emitData);
            }
        }
    }

    toggleTheme() { 
        const current = localStorage.getItem('yamb_theme') || 'dark'; 
        
        let unlockedThemes = ['dark', 'light', 'medium', 'winter'];
        
        try {
            const boughtThemes = JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]');
            const generalThemes = JSON.parse(localStorage.getItem('yamb_unlocked') || '[]');
            let cloudSkins = [];
            if(window.statsManager && window.statsManager.stats.unlockedSkins) {
                cloudSkins = window.statsManager.stats.unlockedSkins;
            }
            unlockedThemes = [...unlockedThemes, ...boughtThemes, ...generalThemes, ...cloudSkins];
        } catch(e) {
            console.warn("Greška pri učitavanju kupljenih tema.");
        }

        // Očisti array tako da ostanu SAMO validne teme
        const sveValidneTeme = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst'];
        unlockedThemes = unlockedThemes.filter(t => sveValidneTeme.includes(t));
        unlockedThemes = [...new Set(unlockedThemes)];

        let currentIndex = unlockedThemes.indexOf(current);
        if (currentIndex === -1) currentIndex = 0; 
        
        let nextIndex = (currentIndex + 1) % unlockedThemes.length; 
        let next = unlockedThemes[nextIndex];
        
        localStorage.setItem('yamb_theme', next); 
        this.applyTheme(next);

        // Sinhronizuj i listu u podešavanjima
        const themeSelect = document.getElementById('setting-theme');
        if (themeSelect) themeSelect.value = next;
    }

    showMainMenu() { 
        this.navigateTo('main-menu'); 
        const floatBtn = document.getElementById('chat-float-btn');
        if(floatBtn) floatBtn.classList.add('hidden'); 
        document.getElementById('chat-window').classList.remove('active'); 
        this.chatOpen = false; 

        if (this.socket && this.socket.connected) {
            this.socket.emit('back_to_menu');
        }

        [1, 2].forEach(num => {
            const content = document.getElementById(`mode-content-${num}`);
            const resume = document.getElementById(`mode-resume-${num}`);
            if (content && resume) {
                content.style.display = 'flex';
                resume.style.display = 'none';
            }
        });
    }
    
    showRules() { this.navigateTo('rules-screen'); }
    
    async quitToMenu() { 
        if (await this.modal.confirm(gt('alert_quit_confirm'))) { 
            this.showMainMenu(); 
        } 
    }
    
    async startPrivateHosting() { 
        const nickname = this.playerName; 
        if (!nickname) return; 
        const roomId = "yamb-" + Math.random().toString(36).substring(2, 8); 
        
        let baseUrl = window.location.origin;
        if (typeof SERVER_URL !== 'undefined' && SERVER_URL.startsWith('http')) {
            baseUrl = SERVER_URL;
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        const shareUrl = baseUrl + "/?room=" + roomId; 
        
        this.navigateTo('waiting-screen'); 
        document.getElementById('wait-msg').innerText = gt('hs_loading'); 
        document.getElementById('share-area').classList.remove('hidden'); 
        document.getElementById('invite-link').value = shareUrl; 
        
        this.joinPrivateGame(nickname, roomId); 
    }

    async shareInvite() {
        const linkInput = document.getElementById('invite-link');
        if (!linkInput) return;
        
        const url = linkInput.value;
        const shareTitle = gt('invite_text') || 'Yamb of the Balkan';
        const shareText = gt('invite_share_msg') || 'Pridruži mi se u partiji Yamba! 🎲';

        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
            try {
                await window.Capacitor.Plugins.Share.share({
                    title: shareTitle,
                    text: shareText,
                    url: url,
                    dialogTitle: 'Podeli link sa prijateljem'
                });
                return; 
            } catch (e) {
                console.log("Capacitor dijeljenje nije uspjelo, prelazimo na browser metodu:", e);
            }
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: url
                });
                return; 
            } catch (err) {
                console.log("Web dijeljenje prekinuto ili nije uspjelo:", err);
            }
        } 
        
        try {
            await navigator.clipboard.writeText(shareText + " " + url);
            this.soundMgr.click();
            this.modal.alert(gt('alert_copied') || 'Link je kopiran! Pošaljite ga prijatelju.', gt('alert_copied_title') || 'KOPIRANO');
        } catch (err) {
            const tempInput = document.createElement("input");
            tempInput.value = shareText + " " + url;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
            
            this.soundMgr.click();
            this.modal.alert(gt('alert_copied') || 'Link je kopiran! Pošaljite ga prijatelju.', gt('alert_copied_title') || 'KOPIRANO');
        }
    }
    
    async joinPrivateGame(nickname, roomId) { 
        this.navigateTo('waiting-screen'); 
        this.initSocketConnection();
        
        this.setupSocketListeners(nickname); 

        if (this.socket && this.socket.connected) {
            this.socket.emit('join_private_game', { nickname, roomId });
        } else {
            console.log("Socket nije spreman, čekam konekciju...");
            this.socket.once('connect', () => {
                console.log("Socket povezan, šaljem zahtev za ulazak...");
                this.socket.emit('join_private_game', { nickname, roomId });
            });
        }
    }
    
    async setupOnline(mode = 'random') { 
        const nickname = this.playerName; 
        if (!nickname) return; 
        this.navigateTo('waiting-screen'); 
        document.getElementById('share-area').classList.add('hidden'); 
        this.initSocketConnection();
        
        this.setupSocketListeners(nickname); 
        
        if(this.socket) this.socket.emit('find_game', nickname); 
    }
    
    setupSocketListeners(nickname) { 
        if(!this.socket) return;
        
        this.socket.off('room_full');
        this.socket.off('private_waiting');
        this.socket.off('game_start');
        this.socket.off('remote_move');
        this.socket.off('remote_roll');
        this.socket.off('remote_hold');
        this.socket.off('remote_announce');
        this.socket.off('chat_msg');
        this.socket.off('opponent_left');
        this.socket.off('rematch_requested');
        this.socket.off('rematch_started');

        this.socket.on('room_full', async () => { await this.modal.alert(gt('msg_room_full')); this.cancelOnline(); }); 
        this.socket.on('private_waiting', (data) => { this.roomId = data.roomId; }); 
        
        this.socket.on('game_start', (data) => { 
            console.log("GAME START:", data);
            this.myOnlineIndex = Number(data.myIndex); 
            this.onlineMode = true; 
            this.modeTag = "Online"; 
            this.roomId = data.roomId; 
            this.players = this.myOnlineIndex === 0 ? [nickname, data.opponent] : [data.opponent, nickname]; 
            this.initScores(); 
            this.currentPlayerIdx = 0; 
            this.startGame(); 
        }); 

        this.socket.on('remote_move', (data) => { 
            try {
                const opponentIdx = this.myOnlineIndex === 0 ? 1 : 0; 
                this.currentPlayerIdx = opponentIdx; 

                if (this.allScores[opponentIdx] && this.allScores[opponentIdx][data.col]) {
                    this.allScores[opponentIdx][data.col][data.row] = data.points; 
                    this.updateTableVisuals(); 
                    this.najavaAktivna = false;
                    const btnNajava = document.getElementById('btn-najava');
                    if(btnNajava) {
                        btnNajava.classList.remove('btn-active-toggle');
                        btnNajava.innerText = gt('game_announce');
                    }
                    this.switchPlayer(); 
                } 
            } catch(e) { console.error("CRITICAL ERROR in remote_move:", e); }
        }); 

        this.socket.on('remote_roll', (data) => { 
            if (data.held && Array.isArray(data.held)) { this.zadrzane = data.held; }
            this.brojBacanja = data.bacanje; 
            const statusLbl = document.getElementById('lbl-status');
            if(statusLbl) statusLbl.innerText = `${gt('status_roll')}: ${data.bacanje} / 3 ${gt('lbl_opponent_parens')}`; 
            this.visualRoll(data.values); 
        }); 

        this.socket.on('remote_hold', (data) => { 
            this.zadrzane[data.index] = data.status; 
            this.updateDiceVisuals(); 
        }); 

        this.socket.on('remote_announce', (data) => { 
            const btn = document.getElementById('btn-najava');
            const type = data.type || 'start'; 
            if (type === 'start') {
                this.najavaAktivna = true; 
                if(btn) { btn.classList.add('btn-active-toggle'); btn.innerText = gt('game_opponent_choosing'); }
            } else if (type === 'cancel') {
                this.najavaAktivna = false;
                if(btn) { btn.classList.remove('btn-active-toggle'); btn.innerText = gt('game_announce'); }
            } else if (type === 'selected') {
                this.najavaAktivna = false;
                if(btn) { btn.classList.remove('btn-active-toggle'); btn.innerText = `${gt('game_announce')}: ${data.row}`; }
            }
        }); 

        this.socket.on('chat_msg', (data) => { if (data.msg) this.appendChatMessage(gt('chat_opponent'), data.msg, "msg-incoming"); }); 
        
        this.socket.on('rematch_requested', async () => {
            const accepted = await this.modal.confirm(gt('rematch_ask'));
            if (accepted) {
                this.socket.emit('accept_rematch');
            } else {
                this.socket.emit('chat_msg', { roomId: this.roomId, msg: gt('rematch_declined') });
            }
        });

        this.socket.on('rematch_started', () => {
            this.modal.alert(gt('rematch_accepted'), gt('rematch_title')).then(() => {
                this.initScores(); 
                this.currentPlayerIdx = 0; 
                this.startGame(); 
            });
        });

        this.socket.on('opponent_left', async () => { 
            const btnRematch = document.getElementById('btn-rematch');
            
            if (btnRematch && btnRematch.style.display !== 'none') {
                btnRematch.disabled = true;
                btnRematch.innerHTML = `<span>❌ ${gt('msg_opponent_left')}</span>`;
                btnRematch.style.background = 'gray';
                btnRematch.style.boxShadow = 'none';
            } else {
                await this.modal.alert(gt('msg_opponent_left'), gt('err_title') || gt('modal_title_info')); 
                this.cancelOnline(); 
            }
        }); 
    }
    
    cancelOnline() { 
        this.showMainMenu(); 
        window.history.pushState({}, document.title, window.location.pathname); 
    }

    async handleModeClick(numPlayers) {
        if(this.soundMgr) this.soundMgr.click();
        
        if (!window.localforage) {
            this.setupGame(numPlayers);
            return;
        }
        
        try {
            const saved = await localforage.getItem('yamb_saved_game');
            if (saved) {
                this.pendingNewGamePlayers = numPlayers;
                
                const content = document.getElementById(`mode-content-${numPlayers}`);
                const resume = document.getElementById(`mode-resume-${numPlayers}`);
                if (content && resume) {
                    content.style.display = 'none';
                    resume.style.display = 'flex';
                }

                const otherBtn = numPlayers === 1 ? 2 : 1;
                const otherContent = document.getElementById(`mode-content-${otherBtn}`);
                const otherResume = document.getElementById(`mode-resume-${otherBtn}`);
                if (otherContent && otherResume) {
                    otherContent.style.display = 'flex';
                    otherResume.style.display = 'none';
                }
            } else {
                this.setupGame(numPlayers);
            }
        } catch (e) {
            console.error("Greška pri učitavanju state-a igre:", e);
            this.setupGame(numPlayers);
        }
    }

    async confirmResumeInline(wantResume, numPlayers) {
        if(this.soundMgr) this.soundMgr.click();
        
        const content = document.getElementById(`mode-content-${numPlayers}`);
        const resume = document.getElementById(`mode-resume-${numPlayers}`);
        if (content && resume) {
            content.style.display = 'flex';
            resume.style.display = 'none';
        }

        if (wantResume) {
            this.loadSavedGame();
        } else {
            if (window.localforage) await localforage.removeItem('yamb_saved_game');
            this.setupGame(numPlayers);
        }
    }
    
    async setupGame(numPlayers, isAi = false, diff = 'medium') { 
        if (isAi) { console.log("AI is disabled."); return; }
        this.onlineMode = false; this.players = []; this.allScores = []; 
        const p1Name = this.playerName; 
        
        if (numPlayers === 1) { this.modeTag = "Solo"; this.players.push(p1Name); } 
        else { 
            this.modeTag = "Hotseat"; this.players.push(p1Name);
            for(let i=1; i<numPlayers; i++) { 
                let guestName = await this.modal.prompt(`${gt('prompt_player_name')} ${i+1}:`); 
                this.players.push(guestName || `${gt('player_guest')} ${i}`); 
            } 
        } 
        
        this.initScores(); this.currentPlayerIdx = 0; this.startGame(); 
    }
    
    initScores() { 
        this.allScores = []; 
        this.players.forEach(() => { 
            let sheet = {}; 
            KOLONE.forEach(c => { sheet[c] = {}; REDOVI_IGRA.forEach(r => sheet[c][r] = null); }); 
            this.allScores.push(sheet); 
        }); 
        this.consecutiveNajava = 0; this.hasSvetiIlija = false; this.hasProphet = false;
    }
    
    startGame() { 
        if (this.onlineMode && this.socket) {
            this.socket.emit('game_session_start');
        }

        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) btnUndo.style.display = 'none';

        this.navigateTo('game-scene'); 
        this.createScoreTables(); 
        this.resetTurnLogic(); 
        this.gameActive = true; 
        this.lastGameType = 'normal';
        document.getElementById('chat-body').innerHTML = ""; 
        const chatBtn = document.getElementById('chat-float-btn'); 
        if (this.modeTag === "Solo" || this.modeTag === "Hotseat") { chatBtn.classList.add('hidden'); } else { chatBtn.classList.remove('hidden'); } 
        this.effectMgr.stop(); this.loadEquippedEffect(); 
    }

    loadEquippedEffect() {
        const activeEffect = localStorage.getItem('yamb_active_effect') || 'none';
        if (activeEffect !== 'none') this.effectMgr.applyPermanent(activeEffect);
    }

    createScoreTables() { 
        const container = document.getElementById('tables-container'); 
        container.innerHTML = ''; 
        this.players.forEach((player, pIdx) => { 
            const tableDiv = document.createElement('div'); 
            tableDiv.className = 'player-table'; 
            tableDiv.id = `ptable-${pIdx}`; 
            
            const nameDiv = document.createElement('div'); 
            nameDiv.className = 'player-name'; 
            nameDiv.innerText = player; 
            tableDiv.appendChild(nameDiv); 
            
            const grid = document.createElement('div'); 
            grid.className = 'grid-container'; 
            
            const colLabels = {
                "Nadole": gt('col_down'),
                "Slobodna": gt('col_free'),
                "Sredina": gt('col_middle'),
                "Nagore": gt('col_up'),
                "Ručno": gt('col_manual'),
                "Najava": gt('col_announce')
            };
            const classes = ["c-nadole", "c-slobodna", "c-sredina", "c-nagore", "c-rucno", "c-najava"];

            let d0 = document.createElement('div');
            d0.className = 'grid-cell col-header';
            grid.appendChild(d0);

            KOLONE.forEach((colName, i) => { 
                let d = document.createElement('div'); 
                d.className = 'grid-cell col-header ' + (classes[i] || ""); 
                d.innerText = colLabels[colName] || colName; 
                grid.appendChild(d); 
            }); 
            
            REDOVI_PRIKAZ.forEach(row => { 
                let lbl = document.createElement('div'); 
                lbl.className = 'grid-cell row-header' + (row.includes("ZBIR") ? " sum" : ""); 
                
                let displayRow = row;
                if(row.includes("ZBIR")) { displayRow = row.replace("ZBIR", gt('row_sum') || "SUM"); } 
                else if(isNaN(parseInt(row))) {
                    let key = "row_" + row.toLowerCase();
                    if (row === "Ful") key = "row_full"; 
                    displayRow = gt(key) !== key ? gt(key) : row;
                }

                lbl.innerHTML = displayRow; 
                grid.appendChild(lbl); 
                
                KOLONE.forEach(col => { 
                    let cell = document.createElement('div'); 
                    cell.className = 'grid-cell'; 
                    if (row.includes("ZBIR")) { 
                        cell.innerText = "0"; cell.id = `sum-${pIdx}-${col}-${row}`; cell.classList.add('cell-sum'); 
                    } else { 
                        let btn = document.createElement('button'); 
                        btn.className = 'score-btn'; btn.id = `btn-${pIdx}-${col}-${row}`; 
                        btn.onclick = () => this.writeScore(row, col, pIdx); 
                        btn.disabled = true; cell.appendChild(btn); 
                    } 
                    grid.appendChild(cell); 
                }); 
            }); 
            tableDiv.appendChild(grid); 
            
            let totalDiv = document.createElement('div'); 
            totalDiv.className = 'total-score'; 
            totalDiv.id = `total-${pIdx}`; 
            totalDiv.innerText = "0"; 
            tableDiv.appendChild(totalDiv); 
            container.appendChild(tableDiv); 
        }); 
    }
    
    resetTurnLogic() { 
        this.kockiceVals = [0,0,0,0,0,0]; 
        this.zadrzane = [false,false,false,false,false,false]; 
        this.brojBacanja = 0; 
        this.najavaAktivna = false; 
        this.najavljenoPolje = null; 
        
        const statusLbl = document.getElementById('lbl-status');
        if(statusLbl) statusLbl.innerText = `${gt('status_roll')}: 0 / 3`; 
        
        const btnBacaj = document.getElementById('btn-bacaj'); 
        const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx == this.myOnlineIndex);
        const isLocalGame = !this.onlineMode;

        if(btnBacaj) { 
            if (isMyTurnOnline || isLocalGame) { btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll'); } 
            else { btnBacaj.disabled = true; btnBacaj.innerText = gt('game_opponent_turn'); }
        }
        
        const btnNajava = document.getElementById('btn-najava'); 
        if(btnNajava) { 
            btnNajava.disabled = true; 
            btnNajava.innerText = gt('game_announce'); 
            btnNajava.classList.remove('btn-active-toggle'); 
        }
        
        this.diceBtns.forEach(b => { b.innerText = ""; this.features.applySkinToElement(b); }); 
        this.highlightCurrentPlayer(); 
        this.updateTableVisuals(); 
    }

    highlightCurrentPlayer() { 
        document.querySelectorAll('.player-table').forEach(el => { el.style.border = "var(--glass-border)"; el.style.boxShadow="none"; el.style.opacity = "0.7"; }); 
        const activeTbl = document.getElementById(`ptable-${this.currentPlayerIdx}`); 
        if(activeTbl) { 
            activeTbl.style.border = "2px solid var(--gold-main)"; activeTbl.style.boxShadow = "0 0 15px rgba(224, 201, 149, 0.2)"; activeTbl.style.opacity = "1"; 
            if(this.players.length > 1) setTimeout(() => { activeTbl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }, 100); 
        } 
        const lblTurn = document.getElementById('lbl-turn');
        if(lblTurn) {
            const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx === this.myOnlineIndex);
            if(this.onlineMode) {
                if(isMyTurnOnline) {
                    lblTurn.innerText = gt('turn_yours') || "Vaš potez!";
                } else {
                    lblTurn.innerText = this.players[this.currentPlayerIdx] + " " + (gt('turn_opp') || "igra");
                }
            } else {
                lblTurn.innerText = this.players[this.currentPlayerIdx] + " " + gt('game_turn_msg'); 
            }
        }
    }
    
    toggleHold(i) { 
        if (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex) return; 
        if (this.brojBacanja === 0) return; 
        if (this.isAnimating) return;

        this.zadrzane[i] = !this.zadrzane[i]; 
        this.updateDiceVisuals(); 
        this.soundMgr.click(); 
        if(this.onlineMode) { this.socket.emit('dice_hold', { roomId: this.roomId, index: i, status: this.zadrzane[i] }); } 

        this.autoSaveGame();
    }
    
    updateDiceVisuals() { 
        this.diceBtns.forEach((b, i) => { 
            if (this.brojBacanja > 0) { 
                b.innerText = UNICODE_DICE[this.kockiceVals[i]]; 
                this.features.applySkinToElement(b, this.zadrzane[i]);
            } else { 
                b.innerText = ""; 
                this.features.applySkinToElement(b);
            } 
        }); 
    }

    async visualRoll(finalValues) { 
        if (this.isAnimating) return;
        this.isAnimating = true;

        this.diceBtns.forEach((b, i) => { if(!this.zadrzane[i]) b.classList.add('rolling'); }); 
        this.soundMgr.roll(); 
        
        for(let k=0; k<8; k++) { 
            this.diceBtns.forEach((b, i) => { if (!this.zadrzane[i]) b.innerText = UNICODE_DICE[Math.floor(Math.random()*6)+1]; }); 
            await sleep(40); 
        } 
        
        this.diceBtns.forEach(b => b.classList.remove('rolling')); 
        this.kockiceVals = finalValues; 
        this.updateDiceVisuals(); 
        
        this.isAnimating = false; 
    }
    
    async throwDice() { 
        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) btnUndo.style.display = 'none';

        const btnBacaj = document.getElementById('btn-bacaj'); 
        const isOnlineOpponent = (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex); 

        if (this.brojBacanja >= 3 || isOnlineOpponent) return; 
        if (this.najavaAktivna) { await this.modal.alert(gt('alert_announce_select'), gt('warning_title') || "UPOZORENJE"); return; }
        if (this.isAnimating) return; 

        if(btnBacaj) btnBacaj.disabled = true; 
        try {
            this.soundMgr.roll(); 
            this.isAnimating = true;

            let newValues = [...this.kockiceVals]; 
            for(let i=0; i<6; i++) { if (!this.zadrzane[i]) newValues[i] = Math.floor(Math.random()*6)+1; } 
            
            if (this.onlineMode) { 
                this.socket.emit('dice_roll', { 
                    roomId: this.roomId, 
                    values: newValues, 
                    bacanje: this.brojBacanja + 1,
                    held: this.zadrzane 
                }); 
            } 
            
            this.diceBtns.forEach((b, i) => { if(!this.zadrzane[i]) b.classList.add('rolling'); }); 
            for(let k=0; k<6; k++) { this.diceBtns.forEach((b, i) => { if (!this.zadrzane[i]) b.innerText = UNICODE_DICE[Math.floor(Math.random()*6)+1]; }); await sleep(50); } 
            
            this.diceBtns.forEach(b => b.classList.remove('rolling')); 
            this.kockiceVals = newValues; 
            this.brojBacanja++; 
            this.isAnimating = false;

            const statusLbl = document.getElementById('lbl-status');
            if(statusLbl) statusLbl.innerText = `${gt('status_roll')}: ${this.brojBacanja} / 3`; 
            this.updateDiceVisuals(); 

        } catch(e) { console.error("Greška pri bacanju:", e); this.isAnimating = false; } finally {
            try { this.updateTableVisuals(); } catch(err) { console.error("Greška pri osvežavanju tabele:", err); }
            
            if (this.brojBacanja < 3 && !isOnlineOpponent) { 
                if(btnBacaj) {btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll'); }
            } else { 
                if(btnBacaj) {btnBacaj.disabled = true; btnBacaj.innerText = gt('game_write'); }
            } 
            
            const btnN = document.getElementById('btn-najava');
            if (this.brojBacanja === 1 && btnN && !isOnlineOpponent) { 
                btnN.disabled = false; btnN.classList.add('btn-highlight'); 
            } else { 
                if(btnN) {btnN.disabled = true; btnN.classList.remove('btn-highlight'); }
            }

            this.autoSaveGame();
        }
    }

    clickNajava() { 
        if (this.brojBacanja !== 1) return; 
        
        const btn = document.getElementById('btn-najava'); 
        const btnBacaj = document.getElementById('btn-bacaj'); 
        
        if (!this.najavaAktivna) { 
            this.najavaAktivna = true; 
            
            try {
                if(this.soundMgr && this.soundMgr.announce) {
                     this.soundMgr.announce(); 
                } else if (this.soundMgr) {
                     this.soundMgr.click();
                }
            } catch(e) {}

            btn.innerText = gt('game_announce_cancel'); 
            btn.classList.add('btn-active-toggle'); 
            btn.classList.remove('btn-highlight'); 
            btnBacaj.disabled = true; 
            
            if(this.onlineMode) {
                try { this.socket.emit('announce', { roomId: this.roomId, type: 'start' }); } catch(e){}
            }
        } else { 
            this.najavaAktivna = false; 
            
            try { this.soundMgr.click(); } catch(e) {} 

            btn.innerText = gt('game_announce'); 
            btn.classList.remove('btn-active-toggle'); 
            btn.classList.add('btn-highlight'); 
            btnBacaj.disabled = false; 
            
            if(this.onlineMode) {
                try { this.socket.emit('announce', { roomId: this.roomId, type: 'cancel' }); } catch(e) {}
            } 
        } 

        this.autoSaveGame();
    }
    
    isValidColumnOrder(row, col, sheet) { 
        if (col === "Nadole") { const idx = REDOVI_IGRA.indexOf(row); if (idx > 0 && sheet["Nadole"][REDOVI_IGRA[idx-1]] === null) return false; } 
        if (col === "Nagore") { const idx = REDOVI_IGRA.indexOf(row); if (idx < REDOVI_IGRA.length-1 && sheet["Nagore"][REDOVI_IGRA[idx+1]] === null) return false; } 
        if (col === "Sredina") { 
            const up = ["Max", "6", "5", "4", "3", "2", "1"]; const down = ["Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"]; 
            if (up.includes(row)) { const idx = up.indexOf(row); if (idx === 0) return true; return sheet[col][up[idx-1]] !== null; } 
            else if (down.includes(row)) { const idx = down.indexOf(row); if (idx === 0) return true; return sheet[col][down[idx-1]] !== null; } 
            return false; 
        } 
        return true; 
    }
    
    async writeScore(row, col, pIdx) { 
        if (pIdx !== this.currentPlayerIdx) return false; 
        
        if (this.brojBacanja === 0) { 
            this.soundMgr.error(); await this.modal.alert(gt('alert_roll_first'), gt('warning_title') || "UPOZORENJE");
            return false; 
        } 
        
        const sheet = this.allScores[pIdx]; 
        if (sheet[col][row] !== null) { await this.modal.alert(gt('alert_filled'), gt('warning_title') || "UPOZORENJE"); return false; } 

        if (col === "Najava" && !this.najavljenoPolje && !this.najavaAktivna && this.brojBacanja > 1) {
            this.soundMgr.error(); await this.modal.alert(gt('alert_announce_col'), gt('warning_title') || "UPOZORENJE"); return false;
        }

        if (this.najavaAktivna) { 
            if (col !== "Najava") { this.soundMgr.error(); return await this.modal.alert(gt('alert_announce_select'), gt('warning_title') || "UPOZORENJE"); } 
            this.najavljenoPolje = {row, col}; this.najavaAktivna = false; 
            document.getElementById(`btn-${pIdx}-${col}-${row}`).classList.add('highlight-najava'); 
            const btnN = document.getElementById('btn-najava'); 
            btnN.innerText = `${gt('game_announce')}: ${row}`; 
            btnN.disabled = true; btnN.classList.remove('btn-active-toggle'); 
            const btnBacaj = document.getElementById('btn-bacaj'); btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll');
            if(this.onlineMode) this.socket.emit('announce', { roomId: this.roomId, type: 'selected', row: row }); 
            return true;
        } 
        
        if (this.najavljenoPolje) { 
            if (col !== "Najava" || row !== this.najavljenoPolje.row) { this.soundMgr.error(); await this.modal.alert(gt('alert_wrong_field'), gt('warning_title') || "UPOZORENJE"); return false; } 
        } 
        
        if (!this.isValidColumnOrder(row, col, sheet)) { this.soundMgr.error(); await this.modal.alert(gt('alert_wrong_order'), gt('warning_title') || "UPOZORENJE"); return false; } 
        
        const best5 = this.getBest5(row, this.kockiceVals); let pts = this.calcPoints(row, best5); 
        
        if (col === "Ručno" && this.brojBacanja > 1) { 
            const confirmZero = await this.modal.confirm(gt('alert_manual_lock')); 
            if (!confirmZero) return false; 
            pts = 0; 
        } 
        
        if (col === 'Najava') { if (pts > 0) { this.consecutiveNajava++; if (this.consecutiveNajava >= 3) this.hasProphet = true; } else { this.consecutiveNajava = 0; } }
        
        if (!this.onlineMode) {
            this.lastMoveSnapshot = {
                pIdx: pIdx,
                row: row,
                col: col,
                diceVals: [...this.kockiceVals],
                held: [...this.zadrzane],
                rollCount: this.brojBacanja,
                najavljenoPolje: this.najavljenoPolje ? { ...this.najavljenoPolje } : null,
                najavaAktivna: this.najavaAktivna,
                hasSvetiIlija: this.hasSvetiIlija,
                consecutiveNajava: this.consecutiveNajava
            };
            const btnUndo = document.getElementById('btn-undo-move');
            if (btnUndo) btnUndo.style.display = 'flex';
        }

        sheet[col][row] = pts; 
        
        try { this.soundMgr.score(); } catch(e) {}

        if (row === "Yamb" && pts > 0) {
            try {
                this.effectMgr.celebrateYamb();
                if (this.brojBacanja === 1) { this.hasSvetiIlija = true; this.effectMgr.trigger('thunder'); }
            } catch(e) {}
        }
        
        try {
            if (this.features && typeof this.features.checkMoveEffects === 'function') {
                this.features.checkMoveEffects(row, pts, true);
            }
        } catch(e) { console.error("Efekti poteza su preskočeni:", e); }

        if (this.onlineMode) { 
            try { this.socket.emit('player_move', { roomId: this.roomId, row, col, points: pts }); } catch(e) {} 
        } 
        
        this.updateTableVisuals(); 
        this.switchPlayer(); 
        return true; 
    }
    
    switchPlayer() { 
        let gameOver = true; 
        this.allScores.forEach(s => { KOLONE.forEach(c => { REDOVI_IGRA.forEach(r => { if (s[c][r] === null) gameOver = false; }); }); }); 
        if (gameOver) { this.handleGameOver(); return; } 
        
        this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length; 
        this.resetTurnLogic(); 
        this.autoSaveGame(); 
    }
    
    calculateTotalScore(pIdx) {
        const data = this.allScores[pIdx]; if (!data) return 0; 
        let grandTotal = 0;
        KOLONE.forEach(col => {
            const val = (r) => (data[col][r] === null) ? 0 : data[col][r];
            let sum1 = 0; ["1", "2", "3", "4", "5", "6"].forEach(r => sum1 += val(r)); if (sum1 >= 60) sum1 += 30;
            let sum2 = 0; const vMax = data[col]["Max"]; const vMin = data[col]["Min"]; const v1 = data[col]["1"]; 
            if (vMax !== null && vMin !== null && v1 !== null) { let calc = (vMax - vMin) * v1; if (calc < 0) calc = 0; sum2 = calc; if (sum2 >= 60) sum2 += 40; }
            let sum3 = 0; ["Triling", "Kenta", "Ful", "Poker", "Yamb"].forEach(r => sum3 += val(r));
            grandTotal += sum1 + sum2 + sum3;
        });
        return grandTotal;
    }

    async handleGameOver() { 
        console.log("--- GAME OVER ---");

        // --- FIX START ---
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        this.gameActive = false;
        // --- FIX END ---

        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) btnUndo.style.display = 'none';
        
        if(window.adMobGlobal) window.adMobGlobal.prepareReward(); 

        const finalResults = this.players.map((name, i) => { return { name: name, score: this.calculateTotalScore(i) }; }); 
        const winnerScore = finalResults.reduce((max, r) => r.score > max ? r.score : max, 0);

        if(window.localforage) await localforage.removeItem('yamb_saved_game'); 
        
        let detectedMode = "Solo";
        if (this.onlineMode) detectedMode = "Online"; else if (this.players.length > 1) detectedMode = "Hotseat";
        
        // 1. ODMAH NAĐI MOJ SKOR!
        let myScoreEntry = finalResults.find(r => r.name === this.playerName) || finalResults[0];

        // 2. ODMAH UPIŠI U KVARTALNU LIGU (Pre bilo kakvog čekanja servera!)
        try {
            if (window.kvartalnaLiga && myScoreEntry && myScoreEntry.score > 0) {
                window.kvartalnaLiga.addPoints(myScoreEntry.score);
            }
        } catch(err) {
            console.warn("Greška pri upisu u Kvartalnu Ligu:", err);
        }

        // 3. TEK SADA ŠALJI NA GLOBALNU TOP LISTU
        // (Čak i ako server ovde uspori ili zablokira, Kvartalna Liga je već sačuvana na uređaju)
        try {
            if (detectedMode === 'Solo') {
                await this.safeSubmitScore(this.playerName, myScoreEntry.score, 'Solo');
            } 
            else {
                const winner = [...finalResults].sort((a,b) => b.score - a.score)[0];
                let saveMode = this.onlineMode ? 'Online' : 'Hotseat';
                await this.safeSubmitScore(winner.name || gt('player_guest'), winner.score, saveMode);
            }
        } catch (err) {
            console.warn("Greška pri slanju na top listu, igra nastavlja dalje:", err);
        }

        if (window.statsManager && this.stats) {
            const currentTotalGames = (this.stats.games || 0) + 1;
            window.statsManager.stats.totalGames = currentTotalGames;
            window.statsManager.saveStats();
        }

        if (myScoreEntry) {
             const myIndex = this.players.findIndex(p => p === myScoreEntry.name);
             if (myIndex !== -1 && this.allScores[myIndex]) {
                 // BEZBEDNA PROVERA TROFEJA SA FALLBACK-om
                 try {
                     if (window.trophyManager && typeof window.trophyManager.checkEndGameTrophies === 'function') {
                         let detectedModeForTrophies = this.onlineMode ? "Online" : (this.players.length > 1 ? "Hotseat" : "Solo");
                         const scoreDiff = winnerScore - myScoreEntry.score; 
                         window.trophyManager.checkEndGameTrophies(
                             myScoreEntry.score, 
                             this.allScores[myIndex], 
                             detectedModeForTrophies,
                             { 
                                 hasSvetiIlija: this.hasSvetiIlija, 
                                 hasProphet: this.hasProphet,
                                 scoreDiff: scoreDiff 
                             }
                         );
                     } else if (this.features && typeof this.features.checkAchievements === 'function') {
                         this.features.checkAchievements(myScoreEntry.score, this.allScores[myIndex]);
                     }
                 } catch(err) {
                     console.warn("Greška pri dodeli trofeja, preskačem:", err);
                 }
             }
             
             this.pendingScore = myScoreEntry.score; 
             this.lastGameType = 'normal';
             let resultType = 'solo';
             if (this.players.length > 1) { 
                 const winner = [...finalResults].sort((a,b) => b.score - a.score)[0];
                 if (winner.name === myScoreEntry.name) resultType = 'win'; else resultType = 'loss'; 
             }
             
             // 2. Šaljemo Cloud-u celokupnu statistiku (koja sada sadrži ispravan i sabran skor lige)
             this.updateStats(myScoreEntry.score, resultType);
        }
        
        this.soundMgr.win(); 
        const winner = [...finalResults].sort((a,b) => b.score - a.score)[0];
        let title = gt('game_over'); let message = ""; 
        
        if (this.players.length === 1) { 
            if (myScoreEntry && myScoreEntry.score >= 1000) { this.effectMgr.celebrateWin(); title = gt('go_title_great'); } else { title = gt('go_title_good'); }
            message = `${gt('go_msg_solo')} ${myScoreEntry ? myScoreEntry.score : 0}`;
        } else {
            const isDraw = (finalResults.every(r => r.score === finalResults[0].score));
            const amIWinner = (myScoreEntry && winner.name === myScoreEntry.name);
            
            if (isDraw) {
                title = gt('go_draw') || "NEREŠENO!";
                message = `${gt('go_msg_solo')} ${winner.score}`;
            } else {
                title = amIWinner ? gt('go_win') : gt('go_loss'); 
                if (amIWinner) { this.effectMgr.celebrateWin(); }
                message = `${gt('go_msg_win')} ${winner.name} (${winner.score})`; 
            }
        }

        document.getElementById('go-title').innerText = title;
        document.getElementById('go-msg').innerText = message;
        document.getElementById('go-score').innerText = myScoreEntry ? myScoreEntry.score : winner.score; 
        
        const btnAd = document.getElementById('btn-ad-double');
        if ((myScoreEntry && myScoreEntry.score <= 0)) { if(btnAd) btnAd.style.display = 'none'; } else { if(btnAd) btnAd.style.display = 'flex'; }
        
        const btnClaim = document.querySelector('#game-over-screen .btn-secondary');
        if(btnClaim) btnClaim.innerText = gt('go_claim');
        const btnDouble = document.querySelector('#btn-ad-double span');
        if(btnDouble) btnDouble.innerText = gt('go_double');

        const btnRematch = document.getElementById('btn-rematch');
        if (this.onlineMode) {
            const isTournament = this.roomId && this.roomId.startsWith('tourney_');

            if (btnRematch) {
                btnRematch.style.display = isTournament ? 'none' : 'flex';
                btnRematch.disabled = false;
                btnRematch.innerHTML = `<span data-lang="go_rematch">${gt('go_rematch')}</span>`;
                btnRematch.style.background = 'linear-gradient(45deg, #4CAF50, #2E7D32)';
            }
            
            if (this.socket) {
                this.socket.emit('game_over');

                if (isTournament) {
                    const amIWinner = (myScoreEntry && winner.name === myScoreEntry.name);
                    const parts = this.roomId.split('_'); 
                    
                    if (parts.length >= 3) {
                        const round = parts[1];
                        const index = parseInt(parts[2]);
                        
                        if (amIWinner) {
                            this.socket.emit('tourney_submit_winner', { 
                                round: round, 
                                index: index, 
                                winnerId: this.playerId 
                            });
                        }

                        if (round === 'f') {
                            let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
                            
                            if (amIWinner) {
                                currentDukati += 20000; 
                                
                                if (window.statsManager) {
                                    window.statsManager.stats.tournamentWins = (window.statsManager.stats.tournamentWins || 0) + 1;
                                    window.statsManager.saveStats();
                                }

                                setTimeout(() => {
                                    this.modal.alert(gt('tourney_prize_winner') || "ČESTITAMO! Osvojili ste turnir i glavnu nagradu od 20.000 💰!", gt('tourney_champion_title') || "ŠAMPION TURNIRA 🏆");
                                    this.effectMgr.trigger('gold_rain'); 
                                }, 1500); 
                            } else {
                                currentDukati += 2500; 
                                setTimeout(() => {
                                    this.modal.alert(gt('tourney_prize_runnerup') || "Kao finalisti, vraćen Vam je ulog od 2500 💰. Više sreće sledeći put!", gt('tourney_finalist_title') || "FINALISTA 🥈");
                                }, 1500);
                            }
                            
                            localStorage.setItem('yamb_dukati', currentDukati);
                            if (window.statsManager) {
                                window.statsManager.stats.balance = currentDukati;
                                window.statsManager.saveStats();
                            }

                            // --- DODATO ZA CLOUD SYNC ---
                            if (this.socket && this.socket.connected) {
                                this.socket.emit('set_player_data', {
                                    uid: localStorage.getItem('yamb_uid') || this.playerId,
                                    name: this.playerName,
                                    stats: this.getFullLocalStats(),
                                    playerId: this.playerId
                                });
                            }

                            if (typeof updateMainMenuDashboard === 'function') {
                                updateMainMenuDashboard();
                            }
                        }
                    }
                }
            }
        } else {
            if (btnRematch) btnRematch.style.display = 'none';
        }

        this.navigateTo('game-over-screen');
    }

    async safeSubmitScore(name, score, mode) {
        try {
            let finalScore = parseInt(score); if (isNaN(finalScore)) finalScore = 0;
            if(this.topListManager) {
                await this.topListManager.submitScore(name, finalScore, mode);
            }
        } catch(e) {
            console.warn("Nije moguće poslati rezultat u ovom trenutku:", e);
        }
    }

    async watchAdForDouble() { 
        let success = false;
        
        if (this.adMob && this.adMob.showRewardVideo) {
            success = await this.adMob.showRewardVideo();
        }
        
        if (success) { 
            this.claimReward(true); 
        } 
    }
    
    async claimReward(doubled) {
        let finalAmount = this.pendingScore;
        
        if (doubled) { 
            this.soundMgr.win(); 
            this.effectMgr.trigger('gold_rain');
            
            if (this.lastGameType === 'daily') {
                let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
                currentDukati += finalAmount;
                localStorage.setItem('yamb_dukati', currentDukati);
                if (window.statsManager) { 
                    window.statsManager.stats.balance = currentDukati; 
                    window.statsManager.saveStats(); 
                }

                // --- DODATO ZA CLOUD SYNC ---
                if (this.socket && this.socket.connected) {
                    this.socket.emit('set_player_data', {
                        uid: localStorage.getItem('yamb_uid') || this.playerId,
                        name: this.playerName,
                        stats: this.getFullLocalStats(),
                        playerId: this.playerId
                    });
                }

                this.modal.alert(`${gt('msg_reward_doubled')} 💰 ${finalAmount * 2}`, gt('modal_title_reward')).then(() => { this.effectMgr.stop(); this.showMainMenu(); });
                return;
            } else {
                finalAmount *= 2; 
            }
        }
        
        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        currentDukati += finalAmount;
        localStorage.setItem('yamb_dukati', currentDukati);
        if (window.statsManager) { window.statsManager.stats.balance = currentDukati; window.statsManager.saveStats(); }
        
        // --- DODATO ZA CLOUD SYNC ---
        if (this.socket && this.socket.connected) {
            this.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid') || this.playerId,
                name: this.playerName,
                stats: this.getFullLocalStats(),
                playerId: this.playerId
            });
        }

        // --- DODATO ZA SYNC KVARTALNE LIGE POSLE GLEDANJA REKLAME ---
        if (window.kvartalnaLiga) {
            window.kvartalnaLiga.syncWithServer();
        }

        if (doubled) { 
            this.modal.alert(`${gt('msg_reward_doubled')} 💰 ${finalAmount}`, gt('modal_title_reward')).then(() => { 
                this.effectMgr.stop(); 
                this.showMainMenu(); 
            }); 
        } else { 
            this.showMainMenu(); 
        }
    }

    getBest5(row, dice) { const d = [...dice]; if (row === "Min") return d.sort((a,b)=>a-b).slice(0,5); if (row === "Max") return d.sort((a,b)=>b-a).slice(0,5); if (row === "Kenta") { const u = [...new Set(d)].sort((a,b)=>a-b); if ([2,3,4,5,6].every(v=>u.includes(v))) return [2,3,4,5,6]; if ([1,2,3,4,5].every(v=>u.includes(v))) return [1,2,3,4,5]; return d.sort((a,b)=>b-a).slice(0,5); } if (row === "Ful") { const c={}; d.forEach(x=>c[x]=(c[x]||0)+1); const k=Object.keys(c).map(Number); if(k.some(x=>c[x]>=5)) return Array(5).fill(k.find(x=>c[x]>=5)); const threes=k.filter(x=>c[x]>=3); const pairs=k.filter(x=>c[x]>=2); let cands=[]; threes.forEach(t=>{pairs.forEach(p=>{if(t!==p)cands.push([...Array(3).fill(t),...Array(2).fill(p)])})}); if(cands.length>0) return cands.sort((a,b)=>sum(b)-sum(a))[0]; } if (["1","2","3","4","5","6"].includes(row)) { const t=parseInt(row); const match=d.filter(x=>x===t); const rest=d.filter(x=>x!==t).sort((a,b)=>b-a); return [...match,...rest].slice(0,5); } const c={}; d.forEach(x=>c[x]=(c[x]||0)+1); d.sort((a,b)=>{if(c[b]!==c[a])return c[b]-c[a]; return b-a}); return d.slice(0,5); }
    calcPoints(row, v) { const s = sum(v); if (["1","2","3","4","5","6"].includes(row)) return v.filter(x=>x===parseInt(row)).length * parseInt(row); if (row === "Max" || row === "Min") return s; if (row === "Triling") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if(Object.values(c).some(cnt=>cnt>=3)) return (3*Number(Object.keys(c).find(k=>c[k]>=3)))+20; return 0; } if (row === "Kenta") { const u=[...new Set(v)].sort((a,b)=>a-b); const k1=[1,2,3,4,5].every(x=>u.includes(x)); const k2=[2,3,4,5,6].every(x=>u.includes(x)); if(k1||k2) { if(this.brojBacanja===1) return 66; if(this.brojBacanja===2) return 56; return 46; } return 0; } if (row === "Ful") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if (Object.values(c).includes(5)||(Object.values(c).includes(3)&&Object.values(c).includes(2))) return s+30; return 0; } if (row === "Poker") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if(Object.values(c).some(cnt=>cnt>=4)) return (Number(Object.keys(c).find(k=>c[k]>=4))*4)+40; return 0; } if (row === "Yamb") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if(Object.values(c).some(cnt=>cnt>=5)) return (Number(Object.keys(c).find(k=>c[k]>=5))*5)+50; return 0; } return 0; }
    
    updateTableVisuals() { 
        this.players.forEach((p, idx) => { 
            const data = this.allScores[idx]; let grandTotal = 0; 
            KOLONE.forEach(col => { 
                let sum1 = 0; ["1","2","3","4","5","6"].forEach(r => { if(data[col][r]!==null) sum1 += data[col][r]; }); 
                if(sum1 >= 60) sum1 += 30; 
                let s1El = document.getElementById(`sum-${idx}-${col}-ZBIR 1`);
                if(s1El && s1El.innerText != sum1) s1El.innerText = sum1; 

                let sum2 = 0; const vMax = data[col]["Max"]; const vMin = data[col]["Min"]; const v1 = data[col]["1"]; 
                if (vMax!==null && vMin!==null && v1!==null) { sum2 = (vMax - vMin) * v1; if (sum2 >= 60) sum2 += 40; } 
                let s2El = document.getElementById(`sum-${idx}-${col}-ZBIR 2`);
                if(s2El && s2El.innerText != sum2) s2El.innerText = sum2; 

                let sum3 = 0; ["Triling","Kenta","Ful","Poker","Yamb"].forEach(r => { if(data[col][r]!==null) sum3 += data[col][r]; }); 
                let s3El = document.getElementById(`sum-${idx}-${col}-ZBIR 3`);
                if(s3El && s3El.innerText != sum3) s3El.innerText = sum3; 
                
                grandTotal += sum1 + sum2 + sum3; 
                
                REDOVI_PRIKAZ.forEach(row => { 
                    const btn = document.getElementById(`btn-${idx}-${col}-${row}`); if (!btn) return; 
                    const val = data[col][row]; 
                    
                    if (btn.classList.contains('highlight-najava')) btn.classList.remove('highlight-najava'); 
                    
                    if (val !== null) { 
                        if (btn.innerText !== String(val)) btn.innerText = val; 
                        if (!btn.classList.contains('filled')) btn.classList.add('filled'); 
                        if (!btn.disabled) btn.disabled = true; 
                    } else { 
                        if (btn.innerText !== "") btn.innerText = ""; 
                        if (btn.classList.contains('filled')) btn.classList.remove('filled'); 
                        
                        const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx === this.myOnlineIndex); 
                        const isLocalTurn = (!this.onlineMode && idx === this.currentPlayerIdx); 
                        const shouldBeDisabled = !((isMyTurnOnline || isLocalTurn) && this.brojBacanja > 0);
                        
                        if (btn.disabled !== shouldBeDisabled) btn.disabled = shouldBeDisabled; 
                        
                        if (this.najavljenoPolje && this.najavljenoPolje.row === row && this.najavljenoPolje.col === col) { 
                            btn.classList.add('highlight-najava'); 
                        } 
                    } 
                }); 
            }); 
            let totEl = document.getElementById(`total-${idx}`);
            if(totEl && totEl.innerText != grandTotal) totEl.innerText = grandTotal; 
        }); 
    }
    
    async checkSavedGame() { 
    }
    
    async autoSaveGame() { 
        if(this.onlineMode) return; 

        // --- FIX START ---
        if(!this.gameActive) return;
        // --- FIX END ---

        if (this._saveTimeout) clearTimeout(this._saveTimeout);

        this._saveTimeout = setTimeout(async () => {
            // --- FIX START ---
            if(!this.gameActive) return;
            // --- FIX END ---

            const data = { 
                players: this.players, 
                scores: this.allScores, 
                current: this.currentPlayerIdx, 
                kockiceVals: this.kockiceVals,
                zadrzane: this.zadrzane,
                brojBacanja: this.brojBacanja,
                najavaAktivna: this.najavaAktivna,
                najavljenoPolje: this.najavljenoPolje,
                aiMode: false, 
                diff: this.aiDifficulty, 
                date: new Date().toISOString() 
            }; 
            try {
                if(window.localforage) await localforage.setItem('yamb_saved_game', data); 
            } catch(e) { console.warn("Greška pri čuvanju:", e); }
        }, 800);
    }
    
    async loadSavedGame() { 
        try { 
            const data = await localforage.getItem('yamb_saved_game'); 
            if (!data) { this.modal.alert(gt('msg_no_saved_game')); return; } 
            KOLONE.forEach(col => { this.players.forEach((_, idx) => { if (data.scores[idx] && !data.scores[idx][col]) { data.scores[idx][col] = {}; REDOVI_IGRA.forEach(r => data.scores[idx][col][r] = null); } }); });
            
            this.players = data.players; 
            this.allScores = data.scores; 
            this.currentPlayerIdx = data.current; 
            this.kockiceVals = data.kockiceVals || [0,0,0,0,0,0];
            this.zadrzane = data.zadrzane || [false,false,false,false,false,false];
            this.brojBacanja = data.brojBacanja || 0;
            this.najavaAktivna = data.najavaAktivna || false;
            this.najavljenoPolje = data.najavljenoPolje || null;
            
            this.aiMode = false; 
            if (this.players.length > 1) this.modeTag = "Hotseat"; else this.modeTag = "Solo";

            this.lastMoveSnapshot = null;
            const btnUndo = document.getElementById('btn-undo-move');
            if (btnUndo) btnUndo.style.display = 'none';

            this.navigateTo('game-scene'); 
            this.createScoreTables(); 
            this.gameActive = true; 
            this.lastGameType = 'normal';
            document.getElementById('chat-body').innerHTML = ""; 
            const chatBtn = document.getElementById('chat-float-btn'); 
            if (this.modeTag === "Solo" || this.modeTag === "Hotseat") { chatBtn.classList.add('hidden'); } else { chatBtn.classList.remove('hidden'); } 
            this.effectMgr.stop(); this.loadEquippedEffect(); 
            
            this.highlightCurrentPlayer(); 
            this.updateTableVisuals(); 
            
            const statusLbl = document.getElementById('lbl-status');
            if(statusLbl) statusLbl.innerText = `${gt('status_roll')}: ${this.brojBacanja} / 3`; 

            const btnBacaj = document.getElementById('btn-bacaj');
            if(btnBacaj) {
                if (this.brojBacanja < 3) { btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll'); }
                else { btnBacaj.disabled = true; btnBacaj.innerText = gt('game_write'); }
            }

            const btnN = document.getElementById('btn-najava');
            if(btnN) {
                if (this.najavaAktivna) {
                    btnN.disabled = false; btnN.innerText = gt('game_announce_cancel'); btnN.classList.add('btn-active-toggle');
                } else if (this.najavljenoPolje) {
                    btnN.disabled = true; btnN.innerText = `${gt('game_announce')}: ${this.najavljenoPolje.row}`;
                } else if (this.brojBacanja === 1) {
                    btnN.disabled = false; btnN.classList.add('btn-highlight');
                } else {
                    btnN.disabled = true; btnN.classList.remove('btn-highlight');
                }
            }

            this.updateDiceVisuals();
        } catch (e) { 
            console.error(e); 
            this.modal.alert(gt('msg_save_error'), gt('err_title') || "GREŠKA"); 
            localforage.removeItem('yamb_saved_game'); 
        } 
    }

    async undoLastMove() {
        if (!this.lastMoveSnapshot || this.onlineMode) return;

        const confirmUndo = await this.modal.confirm(gt('undo_confirm') || "Želite li da ispravite zadnji upis gledanjem reklame?");
        if (!confirmUndo) return;

        if (this.adMob && window.Capacitor && window.Capacitor.isNativePlatform) {
            if (this.adMob.showInterstitial) {
                const success = await this.adMob.showInterstitial();
                if (!success) return; 
            }
        }

        const snap = this.lastMoveSnapshot;
        this.currentPlayerIdx = snap.pIdx;
        this.allScores[snap.pIdx][snap.col][snap.row] = null;
        this.kockiceVals = [...snap.diceVals];
        this.zadrzane = [...snap.held];
        this.brojBacanja = snap.rollCount;
        this.najavljenoPolje = snap.najavljenoPolje;
        
        this.najavaAktivna = snap.najavaAktivna;
        this.hasSvetiIlija = snap.hasSvetiIlija;
        this.consecutiveNajava = snap.consecutiveNajava;

        this.effectMgr.stop();
        this.loadEquippedEffect();
        this.highlightCurrentPlayer();
        this.updateTableVisuals();
        this.updateDiceVisuals();

        const btnBacaj = document.getElementById('btn-bacaj');
        if (btnBacaj) {
            if (this.brojBacanja < 3) {
                btnBacaj.disabled = false;
                btnBacaj.innerText = gt('game_roll') || "BACAJ";
            } else {
                btnBacaj.disabled = true;
                btnBacaj.innerText = gt('game_write') || "UPIŠI";
            }
        }

        const btnN = document.getElementById('btn-najava');
        if (btnN) {
            if (this.najavaAktivna) {
                btnN.disabled = false;
                btnN.innerText = gt('game_announce_cancel') || "OTKAŽI";
                btnN.classList.add('btn-active-toggle');
                btnN.classList.remove('btn-highlight');
            } else if (this.najavljenoPolje) {
                btnN.disabled = true;
                btnN.innerText = `${gt('game_announce') || "NAJAVA"}: ${this.najavljenoPolje.row}`;
                btnN.classList.remove('btn-active-toggle');
                btnN.classList.remove('btn-highlight');
            } else if (this.brojBacanja === 1) {
                btnN.disabled = false;
                btnN.classList.add('btn-highlight');
            } else {
                btnN.disabled = true;
                btnN.classList.remove('btn-highlight');
            }
        }

        const statusLbl = document.getElementById('lbl-status');
        if (statusLbl) statusLbl.innerText = `${gt('status_roll') || "BACANJE"}: ${this.brojBacanja} / 3`;

        this.lastMoveSnapshot = null;
        document.getElementById('btn-undo-move').style.display = 'none';
        this.autoSaveGame();
    }
}

window.app = new YambApp();