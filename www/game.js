// game.js - MAIN GAME LOGIC (STRICT AUTHENTICATION + NO GUEST MODE + TOURNAMENT + ANTI-SPAM CHAT + LIVE CALENDAR + FULL CLOUD SAVE + ERROR HANDLING + POWER INDEX + VS MATCHMAKING SCREEN + FRIENDS SYSTEM + AVATAR SYNC + AUTO REFRESH ONLINE STATUS + REJECT FRIEND SYNC + FRIEND REQUEST CARDS + STATE SYNC + ANTI TROLL TIMER + RAGE QUIT PUNISHMENT + SPECTATOR MODE + LOCAL ROOM SYNC + MULTI-SAVE MODE PER ACCOUNT + QUARTERLY REWARDS + PREVIOUS QUARTER WINNER + H2H STATS SPLIT UI + H2H WIN STREAK FIX + CORRECT TIMEOUT REWARDS + EXPLOIT FIX FOR ECONOMY/LEADERBOARD + ONLINE UNDO TOKENS + NAJAVA CANCEL FIX + GRACE PERIOD + ANTI-DESYNC DEADLOCK FIX)

/* --- POMOĆNE FUNKCIJE --- */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// STRIKTNO PRAVILO: Samo Google nalozi (Nema generisanja usr_ ID-a)
function getPlayerId() {
    return localStorage.getItem('yamb_uid') || null; 
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


/* --- GLAVNA APLIKACIJA (YAMB APP) --- */
class YambApp {
    constructor() {
        console.log("YambApp v17.6 - GLOBAL CHAT MANAGER INTEGRATION");

        this.soundMgr = new SoundManager(); 
        this.modal = new ModalManager(); 
        this.effectMgr = new EffectManager(); 
        this.topListManager = new TopListManager(this);
        
        if(window.TrophyManager) {
            window.trophyManager = new TrophyManager(window.statsManager, this.soundMgr);
        }
        
        this.features = new YambFeatures(this);
        
        if (typeof TournamentManager !== 'undefined') {
            this.tournamentManager = new TournamentManager(this);
        }

        // --- DODATO: Inicijalizacija Undo menadžera ---
        this.initUndoManager();

        // --- DODATO: Inicijalizacija Globalnog Chata ---
        if (typeof GlobalChatManager !== 'undefined') {
            this.globalChat = new GlobalChatManager(this);
            console.log("✅ GlobalChatManager uspešno povezan.");
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
        this.friendsListUids = []; 
        
        this.socket = null; 
        this.socketVerifiedUid = null;
        this.authRetryInProgress = false;
        this.onlineMode = false; 
        this.isSpectator = false; 
        this.roomId = null; 
        this.myOnlineIndex = 0;
        this.onlineUsersCount = 1; 
        this.isAnimating = false; 
        this.currentHostingRoomId = null;
        
        this.currentOpponentPhoto = '';
        this.currentOpponentUid = null;

        // Klijentski tajmer za Anti-Troll zaštitu
        this.timeLeft = 90; 
        this.turnTimerInterval = null;

        this.aiMode = false;
        this.aiDifficulty = "medium";
        
        this.inviteDetected = false;

        this.playerName = localStorage.getItem('yamb_player_name') || "";
        this.playerId = getPlayerId();
        
        // ZABRANA ZA GOSTE NA NIVOU CELOG UI-A PRI POKRETANJU
        if (!this.playerId) {
            this.navigateTo('splash-screen');
        }

        const savedSound = localStorage.getItem('yamb_sound');
        this.soundEnabled = savedSound !== 'false'; 
        if(this.soundMgr) this.soundMgr.enabled = this.soundEnabled;

        // NOVO: Podrška za vibraciju
        const savedVib = localStorage.getItem('yamb_vibration');
        this.vibrationEnabled = savedVib !== 'false'; // Podrazumevano uključeno
        
        let freshStats = JSON.parse(localStorage.getItem('yamb_stats'));
        this.stats = freshStats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0, penaltyPoints: 0 };
        
        this.diceBtns = []; 
        this.consecutiveNajava = 0; 
        this.hasSvetiIlija = false;
        this.hasProphet = false;

        this.adMob = window.adMobGlobal;
        this.pendingScore = 0;
        this.rewardClaimed = false;
        this.rewardClaimInProgress = false;

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
                        if (!this.requireLogin()) return; // Gosti ne mogu prihvatiti poziv

                        if (this.splashTimeout) { clearTimeout(this.splashTimeout); this.splashTimeout = null; }
                        this.navigateTo('splash-screen');
                        setTimeout(() => { this.joinPrivateGame(this.playerName, roomId); }, 800);
                    }
                } catch (err) { console.error("Link error:", err); }
            });
        }

        document.addEventListener("resume", () => { setTimeout(() => { this.checkForInvite(); }, 500); }, false);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === 'visible') setTimeout(() => { this.checkForInvite(); }, 500); });

        setTimeout(() => { this.checkForInvite(); }, 500);

        this.handleRotationLock();
        window.addEventListener('resize', () => this.handleRotationLock());
        window.addEventListener('orientationchange', () => this.handleRotationLock());

        this.uiInit();
        this.syncBalance();
    }

    initUndoManager() {
        if (typeof UndoManager !== 'undefined') {
            this.undoManager = new UndoManager(this);
            console.log("✅ UndoManager uspešno povezan.");
        } else {
            console.warn("⚠️ UndoManager skripta nije učitana!");
        }
    }

    escapeHtml(value) {
        if (window.YambSecurity && typeof window.YambSecurity.escapeHtml === 'function') {
            return window.YambSecurity.escapeHtml(value);
        }
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    // --- NOVO: HEADER LOGIKA (MENI, ZVUK, VIB, OKO, AVATAR, MUZIKA) ---

    toggleGameMenu() {
        const menu = document.getElementById('game-dropdown-menu');
        if(menu) {
            menu.classList.toggle('active');
            this.soundMgr.click();
        }
    }

    toggleQuickSound() {
        this.soundEnabled = !this.soundEnabled;
        if (this.soundMgr) this.soundMgr.enabled = this.soundEnabled;
        localStorage.setItem('yamb_sound', this.soundEnabled);
        
        const btn = document.getElementById('btn-gh-sound');
        if(btn) btn.innerText = this.soundEnabled ? '🔊' : '🔇';
        
        if(this.soundEnabled) this.soundMgr.click();
        
        const mainSetting = document.getElementById('setting-sound');
        if (mainSetting) mainSetting.checked = this.soundEnabled;
    }

    toggleQuickVib() {
        this.vibrationEnabled = !this.vibrationEnabled;
        localStorage.setItem('yamb_vibration', this.vibrationEnabled);
        
        const btn = document.getElementById('btn-gh-vib');
        if(btn) btn.innerText = this.vibrationEnabled ? '📳' : '📴';
        
        if(this.vibrationEnabled) this.vibrate(30);

        const mainSetting = document.getElementById('setting-vibration');
        if (mainSetting) mainSetting.checked = this.vibrationEnabled;
    }

    toggleQuickMusic() {
        if (!this.soundMgr) return;
        
        const isEnabled = !this.soundMgr.musicEnabled;
        this.soundMgr.setMusicEnabled(isEnabled);
        localStorage.setItem('yamb_music', isEnabled);
        
        const btn = document.getElementById('btn-gh-music');
        if (btn) btn.innerText = isEnabled ? '🎧' : '🔇';
        
        const mainSetting = document.getElementById('setting-music');
        if (mainSetting) mainSetting.checked = isEnabled;
    }

    changeMusicVolume(val) {
        if (!this.soundMgr) return;
        
        this.soundMgr.setMusicVolume(val);
        
        const btn = document.getElementById('btn-gh-music');
        const mainSetting = document.getElementById('setting-music');
        
        // Ako korisnik svuče slajder na 0, tretiraj kao 'Muted'
        if (parseFloat(val) === 0) {
            if (btn) btn.innerText = '🔇';
            this.soundMgr.setMusicEnabled(false);
            localStorage.setItem('yamb_music', 'false');
            if (mainSetting) mainSetting.checked = false;
        } else {
            // Ako korisnik pojača sa 0, automatski upali muziku
            if (btn) btn.innerText = '🎧';
            if (!this.soundMgr.musicEnabled) {
                this.soundMgr.setMusicEnabled(true);
                localStorage.setItem('yamb_music', 'true');
                if (mainSetting) mainSetting.checked = true;
            }
        }
    }

    updateQuickMenuIcons() {
        const btnSound = document.getElementById('btn-gh-sound');
        if(btnSound) btnSound.innerText = this.soundEnabled ? '🔊' : '🔇';
        
        const btnVib = document.getElementById('btn-gh-vib');
        if(btnVib) btnVib.innerText = this.vibrationEnabled ? '📳' : '📴';

        // --- DODATO ZA MUZIKU ---
        const btnMusic = document.getElementById('btn-gh-music');
        if(btnMusic) btnMusic.innerText = (this.soundMgr && this.soundMgr.musicEnabled) ? '🎧' : '🔇';
        
        const sliderMusic = document.getElementById('music-volume-slider');
        if(sliderMusic && this.soundMgr) {
            sliderMusic.value = this.soundMgr.musicVolume;
        }
    }

    // Generiše HTML za tačkice umesto Unicode fonta
    getDiceDotsHTML(val) {
        if (!val || val < 1 || val > 6) return '';
        let dots = '';
        for (let i = 0; i < val; i++) {
            dots += '<div class="dice-dot"></div>';
        }
        return `<div class="dice-dots-wrapper val-${val}">${dots}</div>`;
    }

    toggleTheme() {
        // 1. Prikupi sve otključane teme (osnovne + kupljene + cloud)
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

        // Filtriraj samo validne teme i ukloni duplikate
        const sveValidneTeme = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon'];
        unlockedThemes = unlockedThemes.filter(t => sveValidneTeme.includes(t));
        unlockedThemes = [...new Set(unlockedThemes)];

        // 2. Pronađi trenutnu temu i odredi sledeću
        const currentTheme = localStorage.getItem('yamb_theme') || 'dark';
        let currentIndex = unlockedThemes.indexOf(currentTheme);
        
        if (currentIndex === -1) currentIndex = 0; 
        
        const nextIndex = (currentIndex + 1) % unlockedThemes.length;
        const nextTheme = unlockedThemes[nextIndex];

        // 3. Primeni novu temu i sačuvaj je (ova funkcija već radi sve što treba)
        this.saveSettingAuto('theme', nextTheme);
        
        // Zvuk klika
        if (this.soundEnabled && this.soundMgr) {
            this.soundMgr.click();
        }
    }

    updateHeaderAvatar() {
        const avatarEl = document.getElementById('gh-current-avatar');
        if (!avatarEl) return;
        
        const currPlayerName = this.players[this.currentPlayerIdx];
        if (!currPlayerName) return;

        let src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currPlayerName)}&background=333&color=E0C995`;
        
        if (currPlayerName === this.playerName) {
            const myPhoto = localStorage.getItem('yamb_player_photo');
            if (myPhoto && myPhoto.length > 5) src = myPhoto;
        } else if (this.onlineMode && this.currentOpponentPhoto && this.currentOpponentPhoto.length > 5) {
            src = this.currentOpponentPhoto;
        }
        
        avatarEl.src = src;
        avatarEl.style.display = 'block';
    }

    updateSpectatorIcon(count) {
        const eye = document.getElementById('gh-spectator-icon');
        if(!eye) return;
        if (count > 0) {
            eye.classList.remove('gh-btn-inactive');
            eye.classList.add('gh-btn-active');
            eye.style.filter = 'drop-shadow(0 0 8px var(--gold-glow))';
            eye.title = (gt('spectator_count') || '{0} gledalaca').replace('{0}', count);
        } else {
            eye.classList.add('gh-btn-inactive');
            eye.classList.remove('gh-btn-active');
            eye.style.filter = '';
            eye.title = gt('spectator_empty') || 'Nema gledalaca';
        }
    }
    
    // --- FUNKCIJE ZA H2H DETALJNU STATISTIKU ---

    updateH2HStats(oppName, oppPhoto, resultType, myScore = 0, oppScore = 0, oppUid = null) {
        if (!oppName || String(oppName) === 'undefined' || String(oppName) === 'null' || oppName.includes(gt('player_guest')) || oppName === "Sistem") return;
        if (this.isSpectator) return;

        const safeOppName = oppName.replace(/\./g, '_').replace(/\$/g, '_');
        const h2hKey = oppUid ? oppUid : safeOppName;

        let h2h = JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}');
        
        if (!h2h[h2hKey]) {
            h2h[h2hKey] = { 
                name: oppName,
                uid: oppUid || '',
                photo: oppPhoto || '', 
                wins: 0, 
                losses: 0,
                draws: 0,
                myTotalScore: 0, 
                gamesWithScore: 0, 
                myHighScore: 0, 
                maxWinMargin: 0, 
                maxLossMargin: 0,
                currentWinStreak: 0,
                maxWinStreak: 0
            };
        } else {
            h2h[h2hKey].wins = Math.max(0, parseInt(h2h[h2hKey].wins) || 0);
            h2h[h2hKey].losses = Math.max(0, parseInt(h2h[h2hKey].losses) || 0);
            h2h[h2hKey].draws = Math.max(0, parseInt(h2h[h2hKey].draws) || 0);
            if (oppPhoto && oppPhoto.length > 5) h2h[h2hKey].photo = oppPhoto;
            if (oppUid && !h2h[h2hKey].uid) h2h[h2hKey].uid = oppUid;
        }

        if (resultType === 'win') {
            h2h[h2hKey].wins++;
            h2h[h2hKey].currentWinStreak = (h2h[h2hKey].currentWinStreak || 0) + 1;
            if (h2h[h2hKey].currentWinStreak > (h2h[h2hKey].maxWinStreak || 0)) {
                h2h[h2hKey].maxWinStreak = h2h[h2hKey].currentWinStreak;
            }
        } else if (resultType === 'loss') {
            h2h[h2hKey].losses++;
            h2h[h2hKey].currentWinStreak = 0;
        } else if (resultType === 'draw') {
            h2h[h2hKey].draws++;
            h2h[h2hKey].currentWinStreak = 0;
        }

        if (myScore > 0 || oppScore > 0) {
            h2h[h2hKey].myTotalScore = (h2h[h2hKey].myTotalScore || 0) + myScore;
            h2h[h2hKey].gamesWithScore = (h2h[h2hKey].gamesWithScore || 0) + 1;

            if (myScore > (h2h[h2hKey].myHighScore || 0)) {
                h2h[h2hKey].myHighScore = myScore;
            }

            let margin = myScore - oppScore;
            if (resultType === 'win' && margin > (h2h[h2hKey].maxWinMargin || 0)) {
                h2h[h2hKey].maxWinMargin = margin;
            } else if (resultType === 'loss' && (oppScore - myScore) > (h2h[h2hKey].maxLossMargin || 0)) {
                h2h[h2hKey].maxLossMargin = (oppScore - myScore);
            }
        }

        localStorage.setItem('yamb_h2h_stats', JSON.stringify(h2h));
    }

    renderH2HStats() {
        const container = document.getElementById('h2h-list-container');
        if (!container) return;

        let h2h = JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}');
        let needsCleanup = false;
        
        // 🧹 AUTO-CLEANUP: Brišemo sve "undefined" i oštećene protivnike iz memorije
        for (const key in h2h) {
            if (!h2h[key].name || String(h2h[key].name) === 'undefined' || String(h2h[key].name) === 'null' || h2h[key].name.trim() === '') {
                delete h2h[key];
                needsCleanup = true;
            }
        }
        if (needsCleanup) {
            localStorage.setItem('yamb_h2h_stats', JSON.stringify(h2h));
        }

        let rivals = Object.values(h2h);

        if (rivals.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">${gt('stat_h2h_empty') || "Nema odigranih duela..."}</div>`;
            return;
        }

        const toSafeCount = (value) => Math.max(0, parseInt(value) || 0);
        const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));

        rivals = rivals.map(r => ({
            ...r,
            wins: toSafeCount(r.wins),
            losses: toSafeCount(r.losses),
            draws: toSafeCount(r.draws),
            myTotalScore: toSafeCount(r.myTotalScore),
            gamesWithScore: toSafeCount(r.gamesWithScore),
            myHighScore: toSafeCount(r.myHighScore),
            maxWinMargin: toSafeCount(r.maxWinMargin),
            maxLossMargin: toSafeCount(r.maxLossMargin),
            currentWinStreak: toSafeCount(r.currentWinStreak),
            maxWinStreak: toSafeCount(r.maxWinStreak)
        }));

        rivals.sort((a, b) => ((b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws)));

        const myName = this.playerName || gt('h2h_me') || "Ja";
        const myPhoto = localStorage.getItem('yamb_player_photo') || `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=333&color=E0C995`;
        const safeMyName = escapeHtml(myName);

        const getFontSize = (name) => {
            if (!name) return '0.9rem';
            if (name.length > 20) return '0.65rem';
            if (name.length >= 14) return '0.75rem';
            return '0.9rem';
        };

        const myFontSize = getFontSize(myName);

        let html = '';
        rivals.forEach(r => {
            const total = r.wins + r.losses + r.draws;
            let winPct = total > 0 ? Math.round((r.wins / total) * 100) : 0;
            let oppAvatar = r.photo && r.photo.length > 5 ? r.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=333&color=E0C995`;
            let oppFontSize = getFontSize(r.name);
            const safeOppName = escapeHtml(r.name);

            let avg = r.gamesWithScore > 0 ? Math.round((r.myTotalScore || 0) / r.gamesWithScore) : 0;

            html += `
            <div class="h2h-card-new">
                <div class="h2h-players-area">
                    <div class="h2h-player me">
                        <img src="${myPhoto}" class="h2h-avatar">
                        <div class="h2h-name" style="font-size: ${myFontSize};">${safeMyName}</div>
                        <div class="h2h-wl w-color">${r.wins} ${gt('h2h_wins_short') || 'W'}</div>
                    </div>
                    
                    <div class="h2h-vs-divider">
                        <div class="vs-circle">VS</div>
                        <div class="vs-line"></div>
                    </div>

                    <div class="h2h-player opp">
                        <img src="${oppAvatar}" class="h2h-avatar">
                        <div class="h2h-name" style="font-size: ${oppFontSize};">${safeOppName}</div>
                        <div class="h2h-wl l-color">${r.losses} ${gt('h2h_losses_short') || 'L'}</div>
                    </div>
                </div>

                <div class="h2h-stats-area">
                    <div class="h2h-stat-row">
                        <span class="lbl">${gt('h2h_highest_score') || '🏆 Najviše poena:'}</span>
                        <span class="val">${r.myHighScore || 0}</span>
                    </div>
                    <div class="h2h-stat-row">
                        <span class="lbl">${gt('h2h_max_diff') || '📈 Najveća razlika:'}</span>
                        <span class="val c-success">+${r.maxWinMargin || 0}</span>
                    </div>
                    <div class="h2h-stat-row">
                        <span class="lbl">${gt('h2h_worst_loss') || '📉 Najteži poraz:'}</span>
                        <span class="val c-danger">-${r.maxLossMargin || 0}</span>
                    </div>
                    <div class="h2h-stat-row">
                        <span class="lbl">${gt('h2h_win_streak') || '🔥 Vatreni niz:'}</span>
                        <span class="val" style="color: #FF5722;">${r.currentWinStreak || 0} <span style="font-size:0.65rem; color:#aaa; margin-left: 4px;">(${gt('h2h_max_short') || 'Max'}: ${r.maxWinStreak || 0})</span></span>
                    </div>
                    <div class="h2h-stat-row">
                        <span class="lbl">${gt('h2h_draws') || '🤝 Nerešeno:'}</span>
                        <span class="val">${r.draws || 0}</span>
                    </div>
                    <div class="h2h-stat-row">
                        <span class="lbl">${gt('h2h_avg_pts') || '🎯 Tvoj prosek poena:'}</span>
                        <span class="val">${avg}</span>
                    </div>
                </div>

                <div class="h2h-bar-wrapper">
                    <div class="h2h-bar-bg">
                        <div class="h2h-bar-win" style="width: ${winPct}%"></div>
                    </div>
                    <div class="h2h-bar-text">${winPct}% ${gt('h2h_win_pct') || 'POBEDA'}</div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }

    // --- UNIVERZALNA KONTROLA VIBRACIJE (Capacitor + Web) ---
    vibrate(pattern) {
        if (!this.vibrationEnabled) return;
        
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
            try {
                if (Array.isArray(pattern)) {
                    window.Capacitor.Plugins.Haptics.vibrate({ duration: pattern[0] });
                } else if (pattern <= 20) {
                    window.Capacitor.Plugins.Haptics.impact({ style: 'Light' });
                } else if (pattern <= 40) {
                    window.Capacitor.Plugins.Haptics.impact({ style: 'Medium' });
                } else {
                    window.Capacitor.Plugins.Haptics.vibrate({ duration: pattern });
                }
                return; 
            } catch (e) {
                console.warn("Haptics greška:", e);
            }
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.warn("Web vibracija nije podržana:", e);
            }
        }
    }

    requireLogin() {
        if (!localStorage.getItem('yamb_uid')) {
            this.modal.alert(gt('auth_required') || "Morate se prijaviti preko Google-a da biste igrali ovu igru.", gt('auth_required_title') || "PRIJAVA OBAVEZNA");
            this.navigateTo('splash-screen');
            const splashLogin = document.getElementById('splash-login-container');
            if (splashLogin) splashLogin.style.display = 'flex';
            return false;
        }
        return true;
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
        document.body.classList.remove('light-theme', 'medium-theme', 'winter-theme', 'neon-theme', 'amethyst-theme', 'easter-theme', 'desert-theme', 'moon-theme');
        if (theme === 'light') document.body.classList.add('light-theme'); 
        else if (theme === 'medium') document.body.classList.add('medium-theme');
        else if (theme === 'winter') document.body.classList.add('winter-theme');
        else if (theme === 'neon') document.body.classList.add('neon-theme');
        else if (theme === 'amethyst') document.body.classList.add('amethyst-theme');
        else if (theme === 'easter') document.body.classList.add('easter-theme');
        else if (theme === 'desert') document.body.classList.add('desert-theme');
        else if (theme === 'moon') document.body.classList.add('moon-theme');
    }

    normalizeLocalStats(stats = {}) {
        const safeNumber = (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
        };

        return {
            games: safeNumber(stats.games || stats.totalGames),
            totalGames: safeNumber(stats.games || stats.totalGames),
            wins: safeNumber(stats.wins),
            losses: safeNumber(stats.losses),
            highscore: safeNumber(stats.highscore || stats.highScore),
            totalScoreSum: safeNumber(stats.totalScoreSum),
            currentWinStreak: safeNumber(stats.currentWinStreak),
            maxWinStreak: safeNumber(stats.maxWinStreak),
            tournamentWins: safeNumber(stats.tournamentWins),
            penaltyPoints: safeNumber(stats.penaltyPoints),
            balance: safeNumber(stats.balance),
            unlockedTrophies: Array.isArray(stats.unlockedTrophies) ? stats.unlockedTrophies : [],
            unlockedSkins: Array.isArray(stats.unlockedSkins) ? stats.unlockedSkins : [],
            unlockedEffects: Array.isArray(stats.unlockedEffects) ? stats.unlockedEffects : []
        };
    }

    refreshLocalStats() {
        const storedStats = this.readLocalJson('yamb_stats', {});
        const managerStats = (window.statsManager && window.statsManager.stats) ? window.statsManager.stats : {};
        const mergedStats = {
            ...this.normalizeLocalStats(this.stats || {}),
            ...this.normalizeLocalStats(managerStats),
            ...this.normalizeLocalStats(storedStats)
        };

        this.stats = { ...(this.stats || {}), ...mergedStats };

        if (window.statsManager) {
            window.statsManager.stats = { ...window.statsManager.stats, ...this.stats };
        }

        localStorage.setItem('yamb_stats', JSON.stringify(this.stats));
        return this.stats;
    }

    getFullLocalStats() {
        this.refreshLocalStats();
        const uid = localStorage.getItem('yamb_uid');
        if (!uid) return {};

        if (typeof window.migrateLegacyLocalProgressToUid === 'function') {
            window.migrateLegacyLocalProgressToUid(uid);
        }

        let lsData = JSON.parse(localStorage.getItem('yamb_quarter_data_' + uid)) || { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 };
        if (window.kvartalnaLiga) {
            lsData = window.kvartalnaLiga.getScores();
        }

        return {
            games: this.stats.games || 0,
            wins: this.stats.wins || 0,
            losses: this.stats.losses || 0,
            highscore: this.stats.highscore || 0,
            totalScoreSum: this.stats.totalScoreSum || 0,
            maxWinStreak: this.stats.maxWinStreak || 0,
            balance: parseInt(localStorage.getItem('yamb_dukati')) || 0,
            undoTokens: parseInt(localStorage.getItem('yamb_undo_tokens')) || 0,
            currentWinStreak: this.stats.currentWinStreak || 0,
            tournamentWins: this.stats.tournamentWins || 0,
            unlockedTrophies: this.stats.unlockedTrophies || [],
            yamb_unlocked: JSON.parse(localStorage.getItem('yamb_unlocked') || '[]'),
            unlockedSkins: JSON.parse(localStorage.getItem('yamb_unlocked_skins') || '[]'),
            unlockedEffects: JSON.parse(localStorage.getItem('yamb_unlocked_effects') || '[]'),
            unlockedThemes: JSON.parse(localStorage.getItem('yamb_unlocked_themes') || '[]'),
            leagueData: lsData,
            legacyMigration: localStorage.getItem('yamb_legacy_migration_pending_' + uid) === 'true',
            activeSkin: localStorage.getItem('yamb_active_skin') || null,
            activeEffect: localStorage.getItem('yamb_active_effect') || null,
            activeTheme: localStorage.getItem('yamb_theme') || null,
            lastDaily: localStorage.getItem('yamb_last_daily_' + uid) || "",
            dailyRewardClaimed: localStorage.getItem('yamb_daily_reward_claimed_' + uid) || "",
            dailyRewardAmount: parseInt(localStorage.getItem('yamb_daily_reward_amount_' + uid)) || 0,
            soundEnabled: this.soundEnabled,
            vibrationEnabled: this.vibrationEnabled,
            penaltyPoints: this.stats.penaltyPoints || 0, 
            h2hStats: JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}')
        };
    }

    readLocalJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            console.warn(`Neispravan lokalni JSON zapis: ${key}`, err);
            return fallback;
        }
    }

    mergeCloudLeagueData(uid, leagueData) {
        if (!uid || !leagueData) return;

        const localLeagueKey = 'yamb_quarter_data_' + uid;
        let currentLocalLeague = this.readLocalJson(localLeagueKey, { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 });
        let leagueUpdated = false;

        if (leagueData.year > currentLocalLeague.year ||
           (leagueData.year === currentLocalLeague.year && leagueData.quarter > currentLocalLeague.quarter)) {
            currentLocalLeague = leagueData;
            leagueUpdated = true;
        } else if (leagueData.year === currentLocalLeague.year && leagueData.quarter === currentLocalLeague.quarter) {
            if ((leagueData.quarterlyScore || 0) > (currentLocalLeague.quarterlyScore || 0)) {
                currentLocalLeague.quarterlyScore = leagueData.quarterlyScore;
                if ((leagueData.baselineScore || 0) > (currentLocalLeague.baselineScore || 0)) {
                    currentLocalLeague.baselineScore = leagueData.baselineScore;
                }
                leagueUpdated = true;
            }
        }

        if (leagueUpdated) {
            localStorage.setItem(localLeagueKey, JSON.stringify(currentLocalLeague));
            if (window.kvartalnaLiga) {
                window.kvartalnaLiga.init();
            }
        }

        if (leagueData.year === currentLocalLeague.year &&
            leagueData.quarter === currentLocalLeague.quarter &&
            (leagueData.quarterlyScore || 0) >= (currentLocalLeague.quarterlyScore || 0)) {
            localStorage.removeItem('yamb_legacy_migration_pending_' + uid);
        }
    }

    mergeCloudH2HStats(h2hStats) {
        if (!h2hStats || typeof h2hStats !== 'object') return;

        const localH2H = this.readLocalJson('yamb_h2h_stats', {});
        let h2hUpdated = false;

        for (const [oppKey, cloudData] of Object.entries(h2hStats)) {
            if (!cloudData || typeof cloudData !== 'object') continue;
            const oppName = cloudData.name;
            if (!oppName || String(oppName) === 'undefined' || String(oppName) === 'null' || oppName === 'Nepoznat') continue;

            const localData = localH2H[oppKey] || {};
            const merged = {
                ...localData,
                ...cloudData,
                wins: Math.max(localData.wins || 0, cloudData.wins || 0),
                losses: Math.max(localData.losses || 0, cloudData.losses || 0),
                draws: Math.max(localData.draws || 0, cloudData.draws || 0),
                myTotalScore: Math.max(localData.myTotalScore || 0, cloudData.myTotalScore || 0),
                gamesWithScore: Math.max(localData.gamesWithScore || 0, cloudData.gamesWithScore || 0),
                myHighScore: Math.max(localData.myHighScore || 0, cloudData.myHighScore || 0),
                maxWinMargin: Math.max(localData.maxWinMargin || 0, cloudData.maxWinMargin || 0),
                maxLossMargin: Math.max(localData.maxLossMargin || 0, cloudData.maxLossMargin || 0),
                maxWinStreak: Math.max(localData.maxWinStreak || 0, cloudData.maxWinStreak || 0),
                currentWinStreak: cloudData.currentWinStreak === 0
                    ? 0
                    : Math.max(localData.currentWinStreak || 0, cloudData.currentWinStreak || 0)
            };

            if (JSON.stringify(localData) !== JSON.stringify(merged)) {
                localH2H[oppKey] = merged;
                h2hUpdated = true;
            }
        }

        if (h2hUpdated) {
            localStorage.setItem('yamb_h2h_stats', JSON.stringify(localH2H));
        }
    }

    getLocalH2HRecordSummary() {
        const h2h = this.readLocalJson('yamb_h2h_stats', {});
        const summary = { wins: 0, losses: 0, draws: 0, games: 0 };
        if (!h2h || typeof h2h !== 'object') return summary;

        Object.values(h2h).forEach(record => {
            if (!record || typeof record !== 'object') return;
            const name = String(record.name || '').trim();
            if (!name || name === 'undefined' || name === 'null' || name === 'Nepoznat') return;

            summary.wins += Math.max(0, parseInt(record.wins) || 0);
            summary.losses += Math.max(0, parseInt(record.losses) || 0);
            summary.draws += Math.max(0, parseInt(record.draws) || 0);
        });

        summary.games = summary.wins + summary.losses + summary.draws;
        return summary;
    }

    applyCloudProfileSync(data = {}) {
        const uid = localStorage.getItem('yamb_uid');

        if (!uid) {
            console.log("🛑 Prijavljivanje obavezno: Ignorišem Cloud Sync jer korisnik nije ulogovan.");
            return false;
        }

        const toNumber = (value, fallback = 0) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.floor(num) : fallback;
        };

        const localStats = this.readLocalJson('yamb_stats', {}) || {};
        const nextStats = { ...localStats };
        const numericFields = [
            'games',
            'wins',
            'losses',
            'highscore',
            'totalScoreSum',
            'currentWinStreak',
            'maxWinStreak',
            'tournamentWins',
            'penaltyPoints'
        ];

        numericFields.forEach(field => {
            if (data[field] !== undefined) {
                nextStats[field] = Math.max(0, toNumber(data[field], nextStats[field] || 0));
            }
        });

        if (data.games !== undefined) {
            nextStats.totalGames = nextStats.games || 0;
        }

        if (data.balance !== undefined) {
            const balance = Math.max(0, toNumber(data.balance, nextStats.balance || 0));
            nextStats.balance = balance;
            localStorage.setItem('yamb_dukati', balance);
        }

        if (data.undoTokens !== undefined) {
            const undoTokens = Math.max(0, toNumber(data.undoTokens, 0));
            localStorage.setItem('yamb_undo_tokens', undoTokens);
            const tokenCount = document.getElementById('undo-token-count');
            if (tokenCount) tokenCount.innerText = undoTokens;
        }

        if (Array.isArray(data.unlockedTrophies)) nextStats.unlockedTrophies = data.unlockedTrophies;
        if (Array.isArray(data.unlockedSkins)) nextStats.unlockedSkins = data.unlockedSkins;
        if (Array.isArray(data.unlockedEffects)) nextStats.unlockedEffects = data.unlockedEffects;

        this.stats = { ...this.stats, ...nextStats };
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats));

        if (window.statsManager) {
            window.statsManager.stats = { ...window.statsManager.stats, ...this.stats };
            window.statsManager.saveStats();
        }

        const serverGeneralUnlocks = Array.isArray(data.yamb_unlocked) ? data.yamb_unlocked : [];
        const mergedUnlocked = [
            ...new Set([
                ...serverGeneralUnlocks,
                ...(Array.isArray(data.unlockedTrophies) ? data.unlockedTrophies : []),
                ...(Array.isArray(data.unlockedSkins) ? data.unlockedSkins : []),
                ...(Array.isArray(data.unlockedEffects) ? data.unlockedEffects : [])
            ])
        ];

        const freeDefaults = ['default', 'confetti', 'dark', 'light', 'medium', 'winter'];
        freeDefaults.forEach(item => {
            if (!mergedUnlocked.includes(item)) mergedUnlocked.push(item);
        });

        localStorage.setItem('yamb_unlocked', JSON.stringify(mergedUnlocked));
        if (Array.isArray(data.unlockedSkins)) localStorage.setItem('yamb_unlocked_skins', JSON.stringify(data.unlockedSkins));
        if (Array.isArray(data.unlockedEffects)) localStorage.setItem('yamb_unlocked_effects', JSON.stringify(data.unlockedEffects));

        const validThemeIds = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon'];
        const localThemes = this.readLocalJson('yamb_unlocked_themes', []);
        const cloudThemes = Array.isArray(data.unlockedThemes) ? data.unlockedThemes : [];
        const skinThemeLeak = (Array.isArray(data.unlockedSkins) ? data.unlockedSkins : []).filter(theme => validThemeIds.includes(theme));
        const generalThemes = serverGeneralUnlocks.filter(theme => validThemeIds.includes(theme));
        const mergedThemes = [...new Set([...localThemes, ...cloudThemes, ...skinThemeLeak, ...generalThemes])]
            .filter(theme => validThemeIds.includes(theme));
        localStorage.setItem('yamb_unlocked_themes', JSON.stringify(mergedThemes));

        if (data.activeSkin) localStorage.setItem('yamb_active_skin', data.activeSkin);
        if (data.activeEffect) localStorage.setItem('yamb_active_effect', data.activeEffect);
        if (data.activeTheme) {
            localStorage.setItem('yamb_theme', data.activeTheme);
            this.applyTheme(data.activeTheme);
            const themeSelect = document.getElementById('setting-theme');
            if (themeSelect) themeSelect.value = data.activeTheme;
        }

        if (data.soundEnabled !== undefined) {
            localStorage.setItem('yamb_sound', data.soundEnabled);
            if (this.soundMgr) this.soundMgr.enabled = data.soundEnabled;
            this.soundEnabled = data.soundEnabled;
        }

        if (data.vibrationEnabled !== undefined) {
            localStorage.setItem('yamb_vibration', data.vibrationEnabled);
            this.vibrationEnabled = data.vibrationEnabled;
        }

        const today = new Date().toDateString();
        const localDailyKey = 'yamb_last_daily_' + uid;
        const localDaily = localStorage.getItem(localDailyKey);
        if (data.lastDaily) {
            if (localDaily !== today) localStorage.setItem(localDailyKey, data.lastDaily);
        } else if (data.lastDaily !== undefined && localDaily !== today) {
            localStorage.removeItem(localDailyKey);
        }

        if (data.lastDailyRewardClaimed) {
            localStorage.setItem('yamb_daily_reward_claimed_' + uid, data.lastDailyRewardClaimed);
        }

        this.mergeCloudH2HStats(data.h2hStats);
        this.mergeCloudLeagueData(uid, data.leagueData);

        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }

        return true;
    }

    calculatePowerIndex(statsObj, isLocal = false) {
        if (!statsObj) return 0;
        let totalCompetitive = (statsObj.wins || 0) + (statsObj.losses || 0);
        let rate = totalCompetitive > 0 ? ((statsObj.wins || 0) / totalCompetitive) * 100 : 0;
        let avg = (statsObj.games || 0) > 0 ? (statsObj.totalScoreSum || 0) / statsObj.games : 0;
        let hs = statsObj.highscore || 0;
        let maxStreak = statsObj.maxWinStreak || 0;
        let tourneyWins = statsObj.tournamentWins || 0;
        
        let leaguePts = 0;
        if (isLocal && window.kvartalnaLiga) {
            leaguePts = parseInt(window.kvartalnaLiga.getScores().quarterlyScore) || 0;
        } else if (statsObj.leagueData && statsObj.leagueData.quarterlyScore) {
            leaguePts = statsObj.leagueData.quarterlyScore;
        }

        let trophyCount = 0;
        if (statsObj.unlockedTrophies) {
            const ALL_TROPHY_IDS = ['first_play', 'apprentice', 'kafana', 'score_1000', 'grandmaster', 'legend', 'mythic', 'godlike', 'surgeon', 'prophet', 'sniper', 'math', 'sveti_ilija', 'hazard', 'firecracker', 'concrete', 'perfectionist', 'miner', 'immortal', 'potato', 'minimal', 'achilles', 'close_call', 'night_owl', 'spite', 'veteran'];
            statsObj.unlockedTrophies.forEach(t => { if(ALL_TROPHY_IDS.includes(t)) trophyCount++; });
        }

        let basePI = Math.round(
            (rate * 10) + (leaguePts * 0.02) + (tourneyWins * 300) + 
            (avg * 0.5) + (hs * 0.2) + (maxStreak * 30) + (trophyCount * 50)
        );

        let penalty = statsObj.penaltyPoints || 0;
        return Math.max(0, basePI - penalty); 
    }

    // --- SISTEM PRIJATELJA ---
    async searchAndAddFriend() {
        if (!this.requireLogin()) return;
        const searchName = await this.modal.prompt(gt('prompt_search_friend') || "Unesi tačno ime igrača (Google ime) za pretragu:", gt('alert_search_title') || "PRETRAGA");
        if (searchName && searchName.trim().length > 0) {
            this.initSocketConnection();
            this.socket.emit('search_player', searchName.trim());
        }
    }

    sendFriendRequest(targetId, targetName, targetUid = null) {
        if (!this.requireLogin()) return;
        this.initSocketConnection();
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('send_friend_req', { targetId, targetUid, challengerName: this.playerName });

        let msg = (gt('alert_friend_req_sent') || "Zahtev za prijateljstvo poslat igraču {0}.").replace('{0}', this.escapeHtml(targetName || 'Igrač'));
        this.modal.alert(msg, gt('alert_sent_title') || "POSLATO");
    }

    renderFriendsList(friends, requests = []) {
        const list = document.getElementById('friends-list');
        if (!list) return;
        
        list.className = 'ws-friends-list';

        let html = `
            <div class="friend-card add-new" onclick="app.searchAndAddFriend()">
                <div style="font-size: 2.5rem; color: var(--gold-main); line-height: 1; margin-bottom: 5px; font-weight: 300;">+</div>
                <span style="color:var(--text-main); font-weight:800; font-size:0.75rem; text-align:center; line-height: 1.2;">${gt('btn_add_friend') || 'DODAJ<br>PRIJATELJA'}</span>
            </div>
        `;

        if (requests && requests.length > 0) {
            requests.forEach(r => {
                html += `
                    <div class="friend-card" style="border: 1px dashed var(--gold-main); background: rgba(224, 201, 149, 0.1);">
                        <img src="${r.photoUrl && r.photoUrl.length > 5 ? r.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=333&color=E0C995`}" class="friend-card-img" style="border: 2px solid #aaa;">
                        <span class="friend-card-name">${r.name}</span>
                        <span style="font-size: 0.7rem; color: #aaa; text-align: center; margin-bottom: 5px; font-weight: bold;">${gt('friend_req_new') || 'Novi zahtev'}</span>
                        <div style="display:flex; gap:10px; width: 100%; justify-content: center;">
                            <button onclick="app.resolveFriendRequest('${r.uid}', true)" style="background:var(--success); color:#fff; border:none; padding:5px 15px; border-radius:15px; cursor:pointer; font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.5);" title="${gt('btn_accept') || 'Prihvati'}">✅</button>
                            <button onclick="app.resolveFriendRequest('${r.uid}', false)" style="background:var(--danger); color:#fff; border:none; padding:5px 15px; border-radius:15px; cursor:pointer; font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.5);" title="${gt('btn_decline') || 'Odbij'}">❌</button>
                        </div>
                    </div>
                `;
            });
        }

        if (friends && friends.length > 0) {
            friends.forEach(f => {
                const pi = this.calculatePowerIndex(f.stats, false);
                const h2hRecord = f.h2hRecord || {};
                const w = h2hRecord.wins !== undefined ? h2hRecord.wins : (f.stats ? (f.stats.h2hWins || 0) : 0);
                const l = h2hRecord.losses !== undefined ? h2hRecord.losses : (f.stats ? (f.stats.h2hLosses || 0) : 0);
                const isOnline = f.isOnline;
                
                const statusColor = isOnline ? 'var(--success)' : 'var(--danger)';
                const btnDisabled = !isOnline ? 'disabled' : '';
                const btnStyle = isOnline ? 'background:var(--gold-main); color:#000; cursor:pointer;' : 'background:gray; color:#ddd; cursor:not-allowed;';
                
                const btnText = isOnline ? (gt('btn_invite_friend') || 'POZOVI') : (gt('btn_offline') || 'OFFLINE');

                html += `
                    <div class="friend-card">
                        <div style="position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; box-shadow: 0 0 8px ${statusColor};"></div>
                        <img src="${f.photoUrl && f.photoUrl.length > 5 ? f.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=333&color=E0C995`}" class="friend-card-img" style="border: 2px solid ${statusColor};">
                        <span class="friend-card-name">${f.name}</span>
                        <span style="font-size: 0.8rem; color: #FFD700; font-weight: 900; margin-bottom: 2px; text-shadow: 0 0 5px rgba(255,215,0,0.3);">⚡ ${pi}</span>
                        <span class="friend-card-wl">W/L: ${w} / ${l}</span>
                        <button class="friend-card-btn" ${btnDisabled} onclick="app.inviteFriendToRoom('${f.socketId}')" style="${btnStyle}">${btnText}</button>
                    </div>
                `;
            });
        }
        list.innerHTML = html;
    }

    resolveFriendRequest(uid, accepted) {
        if (!this.requireLogin()) return;
        this.initSocketConnection();
        if (!this.socket || !this.socket.connected) return;
        
        this.socket.emit('resolve_friend_req', { challengerUid: uid, accepted: accepted });
        
        setTimeout(() => {
            if (this.socket && this.socket.connected) this.socket.emit('get_friends_list');
        }, 300);
    }

    inviteFriendToRoom(friendSocketId) {
        if (!this.currentHostingRoomId) return;
        
        const payloadHostName = this.playerName + "|||" + this.socket.id;
        
        this.socket.emit('send_room_invite', { targetSocketId: friendSocketId, roomId: this.currentHostingRoomId, hostName: payloadHostName });
        
        let sentText = gt('alert_invite_sent') || "Pozivnica za partiju je poslata prijatelju!";
        let titleText = gt('alert_invite_title') || "POZIVNICA";
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(titleText, sentText);
        } else {
            this.modal.alert(sentText, titleText);
        }
    }

    loadHallOfFame() {
        const listEl = document.getElementById('ws-hof-list');
        if (listEl) {
            listEl.innerHTML = `<div class="loader" style="width: 25px; height: 25px; margin: 10px auto;"></div>`;
        }
        
        this.initSocketConnection();
        if (this.socket && this.socket.connected) {
            this.socket.emit('get_weekly_top3');
        } else {
            setTimeout(() => {
                if (this.socket && this.socket.connected) {
                    this.socket.emit('get_weekly_top3');
                }
            }, 500);
        }
    }

    renderHallOfFame(data) {
        const listEl = document.getElementById('ws-hof-list');
        if (!listEl) return;

        if (!data || data.length === 0) {
            listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">Još uvek nema rezultata za ovu nedelju.</div>`;
            return;
        }

        let html = '';
        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];

        data.sort((a, b) => b.score - a.score).slice(0, 3).forEach((p, index) => {
            const medal = medals[index] || '';
            const color = colors[index] || '#fff';
            const avatar = p.photoUrl && p.photoUrl.length > 5 
                ? p.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=333&color=E0C995`;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2rem; font-weight: 900; width: 25px; text-align: center;">${medal}</span>
                        <img src="${avatar}" style="width: 30px; height: 30px; border-radius: 50%; border: 1px solid ${color}; object-fit: cover;">
                        <span style="color: var(--text-main); font-weight: 800; font-size: 0.85rem; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: ${color}; font-weight: 900; font-size: 0.95rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${p.score}</span>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    // --- SPECTATE FUNKCIJA ---
    async spectateGame(targetSocketId) {
        if (!this.requireLogin()) return;

        const overlay = document.getElementById('online-players-overlay');
        if (overlay) overlay.style.display = 'none';

        this.initSocketConnection();
        this.setupSocketListeners(this.playerName);

        const doSpectate = () => {
            this.socket.emit('request_spectate', targetSocketId);
        };

        if (this.socket && this.socket.connected) {
            doSpectate();
        } else if (this.socket) {
            this.socket.once('connect', doSpectate);
            if (this.socket.disconnected) {
                this.socket.connect();
            }
        } else {
            this.modal.alert(gt('sys_no_conn') || "Niste povezani na server.", gt('err_title') || "GREŠKA");
        }
    }

    // --- PROXY ZA GLOBAL CHAT ---
    async openGlobalChat() {
        if (this.globalChat) await this.globalChat.open();
    }

    async closeGlobalChat(skipAd = false) {
        if (this.globalChat) await this.globalChat.close(skipAd);
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
                
                this.socket.on('connect', async () => {
                    console.log("✅ Socket povezan! ID:", this.socket.id);
                    this.socketVerifiedUid = null;
                    
                    if (!this.playerId) return;

                    await this.authenticateSocketIdentity();
                    
                    const now = new Date();
                    let currentQuarter = Math.floor(now.getMonth() / 3) + 1;
                    let prevQuarter = currentQuarter - 1;
                    let prevYear = now.getFullYear();
                    
                    if (prevQuarter === 0) {
                        prevQuarter = 4;
                        prevYear -= 1;
                    }

                    // FIX: Prikazujemo samo u prva 3 dana prvog meseca u kvartalu (Januar, April, Jul, Oktobar)
                    const isFirstMonthOfQuarter = (now.getMonth() % 3 === 0);
                    const isWithinFirstThreeDays = (now.getDate() <= 3);

                    const shownWinnerKey = `yamb_winner_shown_${prevYear}_Q${prevQuarter}`;
                    
                    if (isFirstMonthOfQuarter && isWithinFirstThreeDays) {
                        if (!localStorage.getItem(shownWinnerKey)) {
                            this.socket.emit('get_previous_quarter_winner', { year: prevYear, quarter: prevQuarter });
                        }
                    } else {
                        // Prošla su 3 dana, upisujemo u lokalnu memoriju da je "prikazano" 
                        // kako ne bismo slali nepotrebne zahteve serveru do kraja kvartala
                        localStorage.setItem(shownWinnerKey, 'true');
                    }
                    
                    const pendingReward = localStorage.getItem('yamb_pending_quarter_check');
                    if (pendingReward) {
                        try {
                            const parsedReward = JSON.parse(pendingReward);
                            this.socket.emit('check_quarter_reward', {
                                year: parsedReward.year,
                                quarter: parsedReward.quarter,
                                playerId: this.playerId
                            });
                            localStorage.removeItem('yamb_pending_quarter_check'); 
                        } catch(e) { console.error("Greška pri čitanju pending nagrade:", e); }
                    }
                    
                    if (this.gameActive && this.onlineMode && !this.isSpectator) {
                        console.log("🔄 Rekonekcija detektovana, tražim stanje table od protivnika...");
                        this.socket.emit('request_state_sync');
                    }
                    
                    const authResult = await this.emitPlayerData();

                    if(document.getElementById('wait-msg')) document.getElementById('wait-msg').innerText = gt('hs_loading');
                    if (authResult && authResult.ok && this.topListManager) this.topListManager.syncOfflineScores();
                    
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('room') && !this.gameActive) { this.checkForInvite(); }
                });

                this.socket.on('users_count', (count) => {
                    this.onlineUsersCount = count;
                    this.updateOnlineCounterUI();
                });

                this.socket.on('disconnect', () => {
                    this.socketVerifiedUid = null;
                    this.authRetryInProgress = false;
                });

                this.socket.on('auth_required', (result = {}) => {
                    this.handleAuthRequired(result);
                });

                this.socket.on('sync_unavailable', (result = {}) => {
                    console.warn(`Cloud sync nije dostupan: ${result.reason || 'unknown_error'}`);
                });

                if (this.globalChat) {
                    this.globalChat.bindSocket(this.socket);
                }

                this.socket.on('incoming_challenge', async (data) => {
                    const { challengerId, challengerName } = data;
                    const safeChallengerName = this.escapeHtml(challengerName || 'Igrač');
                    let text = gt('duel_incoming');
                    if(text === 'duel_incoming') text = `Igrač {0} vas izaziva na duel! Prihvatate?`;

                    const accepted = await this.modal.confirm(text.replace('{0}', safeChallengerName));
                    this.socket.emit('challenge_response', {
                        challengerId: challengerId,
                        accepted: accepted
                    });
                });

                this.socket.on('challenge_declined', (data) => {
                    const customModal = document.getElementById('custom-modal-overlay');
                    if (customModal) customModal.style.display = 'none';

                    setTimeout(() => {
                        let text = data.message || gt('duel_declined');
                        if (text === 'duel_declined') text = "Igrač je nažalost odbio vaš izazov.";
                        this.modal.alert(text, gt('modal_title_info') || "INFO");
                    }, 50);
                });

                this.socket.on('game_started', (data) => {
                    this.closeGlobalChat(true); 
                    
                    // NOVO: Zapamti da je korisnik u online meču
                    localStorage.setItem('yamb_active_online_room', data.roomId);
                    
                    const customModal = document.getElementById('custom-modal-overlay');
                    if (customModal) customModal.style.display = 'none';
                    
                    const onlineModal = document.getElementById('online-players-overlay');
                    if (onlineModal) onlineModal.style.display = 'none';

                    this.joinPrivateGame(this.playerName, data.room);
                });

                this.socket.on('global_highscores_data', (data) => { 
                    if(this.topListManager) this.topListManager.renderList(data, 'global-hs-list'); 
                });
                
                this.socket.on('error_msg', (msgKey) => {
                    if (this.globalChat && this.globalChat.handleError && this.globalChat.handleError(msgKey)) {
                        return;
                    }

                    let finalMsg = msgKey;
                    if (typeof t === 'function' && t(msgKey) !== msgKey) {
                        finalMsg = gt(msgKey);
                    }
                    if (this.modal) {
                        this.modal.alert(finalMsg, gt('err_title') || gt('modal_title_info') || "INFO").then(() => {
                            if (finalMsg.includes('Već ste preuzeli') || finalMsg.includes('dnevnu nagradu')) {
                                const uid = localStorage.getItem('yamb_uid');
                                localStorage.setItem('yamb_last_daily_' + uid, new Date().toDateString());
                                this.navigateTo('main-menu');
                            }
                        });
                    }
                });

                this.socket.on('sync_local_stats', (data) => {
                    this.applyCloudProfileSync(data);
                });

                this.socket.on('tourney_prize_awarded', (data = {}) => {
                    if (!data.role) return;

                    if (data.role === 'winner') {
                        if (this.soundMgr && this.soundMgr.win) this.soundMgr.win();
                        if (this.effectMgr) this.effectMgr.trigger('gold_rain');
                        this.modal.alert(
                            gt('tourney_prize_winner') || "ČESTITAMO! Osvojili ste turnir i glavnu nagradu od 20.000 💰!",
                            gt('tourney_champion_title') || "ŠAMPION TURNIRA 🏆"
                        );
                    } else if (data.role === 'runnerup') {
                        this.modal.alert(
                            gt('tourney_prize_runnerup') || "Kao finalisti, vraćen Vam je ulog od 2500 💰. Više sreće sledeći put!",
                            gt('tourney_finalist_title') || "FINALISTA 🥈"
                        );
                    }

                    if (typeof updateMainMenuDashboard === 'function') {
                        updateMainMenuDashboard();
                    }
                });

                this.socket.on('connect_error', (err) => {
                    console.warn("Socket connection error:", err);
                });
            }
        } catch (e) { console.error("Greška pri inicijalizaciji socketa:", e); }
    }

    async authenticateSocketIdentity(forceRefresh = false) {
        if (!this.socket || !this.socket.connected) return { ok: false, reason: 'socket_disconnected' };
        if (!localStorage.getItem('yamb_uid')) return { ok: false, reason: 'not_logged_in' };
        if (this.socketVerifiedUid === localStorage.getItem('yamb_uid') && !forceRefresh) {
            return { ok: true, uid: this.socketVerifiedUid };
        }

        const tokenProvider = window.getYambFirebaseIdToken;
        if (typeof tokenProvider !== 'function') return { ok: false, reason: 'token_provider_missing' };

        const token = await tokenProvider(forceRefresh);
        if (!token) return { ok: false, reason: 'missing_firebase_token' };

        return new Promise((resolve) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'auth_timeout' });
            }, 8000);

            this.socket.emit('auth_firebase_token', { token }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (result && result.ok) {
                    this.socketVerifiedUid = result.uid;
                    this.playerId = result.uid;
                    localStorage.setItem('yamb_uid', result.uid);
                } else {
                    console.warn(`Server nije verifikovao Firebase identitet: ${result?.reason || 'unknown_error'}`);
                }
                resolve(result || { ok: false, reason: 'empty_auth_response' });
            });
        });
    }

    async handleAuthRequired(result = {}) {
        if (!this.socket || !this.socket.connected) return;
        if (!localStorage.getItem('yamb_uid')) return;
        if (this.authRetryInProgress) return;

        const retryableReasons = new Set([
            'auth_required',
            'firebase_token_required',
            'missing_firebase_token',
            'invalid_firebase_token'
        ]);
        const reason = result.reason || 'auth_required';
        if (!retryableReasons.has(reason)) return;

        this.authRetryInProgress = true;
        this.socketVerifiedUid = null;

        try {
            const authResult = await this.authenticateSocketIdentity(true);
            if (authResult && authResult.ok) {
                await this.emitPlayerData(false);
            } else {
                console.warn(`Ponovna Firebase verifikacija nije uspela: ${authResult?.reason || 'unknown_error'}`);
            }
        } finally {
            this.authRetryInProgress = false;
        }
    }

    waitForProfileSync(timeoutMs = 4000) {
        return new Promise(resolve => {
            if (!this.socket || !this.socket.connected) {
                resolve(null);
                return;
            }

            let settled = false;
            const finish = (payload) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.socket.off('sync_local_stats', onSync);
                resolve(payload || null);
            };
            const onSync = (payload) => finish(payload);
            const timer = setTimeout(() => finish(null), timeoutMs);

            this.socket.once('sync_local_stats', onSync);
        });
    }

    async emitPlayerData(forceRefreshAuth = false, options = {}) {
        if (!this.socket || !this.socket.connected) return { ok: false, reason: 'socket_disconnected' };

        const authResult = await this.authenticateSocketIdentity(forceRefreshAuth);
        const uid = authResult && authResult.ok ? authResult.uid : localStorage.getItem('yamb_uid');
        const syncWait = options.waitForSync ? this.waitForProfileSync(options.timeoutMs || 4000) : null;

        this.socket.emit('set_player_data', {
            uid: uid,
            name: this.playerName,
            photoUrl: localStorage.getItem('yamb_player_photo') || '',
            stats: this.getFullLocalStats(),
            playerId: this.playerId
        });

        if (syncWait) {
            const cloudStats = await syncWait;
            return {
                ...(authResult || {}),
                ok: !!(authResult && authResult.ok),
                synced: !!cloudStats,
                cloudStats
            };
        }

        return authResult;
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

        const waitCount = document.getElementById('waiting-online-count');
        if (waitCount) waitCount.innerText = this.onlineUsersCount;
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

            if (!this.requireLogin()) return; // ZABRANA ZA GOSTE

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
        if (screenId === 'highscores-screen') { this.switchHsTab('global'); }
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
        if (header) { 
            header.addEventListener('mousedown', dragMouseDown); 
            header.addEventListener('touchstart', dragMouseDown, {passive: false}); 
        } 
        function dragMouseDown(e) { 
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            if(e.type === 'touchstart') { pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; } 
            else { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; } 
            document.addEventListener('mouseup', closeDragElement); 
            document.addEventListener('mousemove', elementDrag); 
            document.addEventListener('touchend', closeDragElement); 
            document.addEventListener('touchmove', elementDrag, {passive: false}); 
        } 
        function elementDrag(e) { 
            let clientX, clientY; 
            if(e.type === 'touchmove') { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
            else { e.preventDefault(); clientX = e.clientX; clientY = e.clientY; } 
            pos1 = pos3 - clientX; pos2 = pos4 - clientY; pos3 = clientX; pos4 = clientY; 
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; 
        } 
        function closeDragElement() { 
            document.removeEventListener('mouseup', closeDragElement); 
            document.removeEventListener('mousemove', elementDrag); 
            document.removeEventListener('touchend', closeDragElement); 
            document.removeEventListener('touchmove', elementDrag); 
        } 
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

    async challengePlayer(targetId, targetName, targetUid = null) {
        if (!this.requireLogin()) return;
        this.initSocketConnection(); 
        if (!this.socket || !this.socket.connected) return;
        
        let askText = gt('duel_ask');
        if (askText === 'duel_ask') askText = `Želite li da izazovete igrača {0} na duel?`;

        const safeTargetName = this.escapeHtml(targetName || 'Igrač');
        const isConfirmed = await this.modal.confirm(askText.replace('{0}', safeTargetName));
        if(isConfirmed) {
            this.socket.emit('send_challenge', { targetId, targetUid, challengerName: this.playerName });
            
            let sentText = gt('duel_sent');
            if (sentText === 'duel_sent') sentText = `Izazov poslat igraču {0}. Čekamo odgovor...`;
            
            if (typeof window.showNotification === 'function') {
                window.showNotification(gt('duel_title') || "IZAZOV", sentText.replace('{0}', targetName || 'Igrač'));
            } else {
                this.modal.alert(sentText.replace('{0}', safeTargetName), gt('duel_title') || "IZAZOV");
            }
        }
    }
    
    requestRematch() {
        if (!this.socket || this.isSpectator || !this.onlineMode) return;
        
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
        const nameEl = document.getElementById('setting-name');
        if (nameEl) nameEl.value = this.playerName; 
        
        const soundEl = document.getElementById('setting-sound');
        if (soundEl) soundEl.checked = this.soundEnabled; 

        // DODATO UČITAVANJE MUZIKE
        const musicEl = document.getElementById('setting-music');
        if (musicEl) musicEl.checked = this.soundMgr ? this.soundMgr.musicEnabled : (localStorage.getItem('yamb_music') !== 'false');
        
        const vibEl = document.getElementById('setting-vibration');
        if (vibEl) vibEl.checked = this.vibrationEnabled;
        
        const themeSelect = document.getElementById('setting-theme');
        if (themeSelect) {
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

            const sveValidneTeme = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon'];
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
    }
    
    saveSettingAuto(type, value) {
        if (type === 'name') {
            if (value.trim() === '') return;
            this.playerName = value.trim();
            localStorage.setItem('yamb_player_name', this.playerName);
            
            if (this.gameActive && !this.onlineMode && this.players.length > 0 && this.modeTag === 'Solo') {
                this.players[0] = this.playerName;
                const nameEl = document.querySelector('#ptable-0 .player-name');
                if(nameEl) nameEl.innerText = this.playerName;
            }
        } 
        else if (type === 'sound') {
            this.soundEnabled = value;
            if (this.soundMgr) this.soundMgr.enabled = value;
            localStorage.setItem('yamb_sound', value);
            if (value && this.soundMgr) this.soundMgr.click(); 
        } 
        // DODATA LOGIKA ZA MUZIKU
        else if (type === 'music') {
            if (this.soundMgr) this.soundMgr.setMusicEnabled(value);
            localStorage.setItem('yamb_music', value);
        }
        else if (type === 'vibration') {
            this.vibrationEnabled = value;
            localStorage.setItem('yamb_vibration', value);
            if (value) this.vibrate(50); 
        } 
        else if (type === 'theme') {
            localStorage.setItem('yamb_theme', value);
            this.applyTheme(value);
        }

        if (this.socket && this.socket.connected) {
            this.emitPlayerData();
        }
    }

    applyAbandonPenalty() {
        if (!this.allScores || !this.allScores[this.myOnlineIndex]) return 0;

        let filledBoxes = 0;
        let totalBoxes = 0;

        const mySheet = this.allScores[this.myOnlineIndex];
        if (!mySheet || Object.keys(mySheet).length === 0) return 0;
        
        Object.keys(mySheet).forEach(col => {
            Object.keys(mySheet).forEach(row => {
                totalBoxes++;
                if (mySheet[col][row] !== null) filledBoxes++;
            });
        });

        let progress = totalBoxes > 0 ? (filledBoxes / totalBoxes) * 100 : 0;
        let penalty = 0;

        if (progress < 80) {
            penalty = 20; 
        } 
        else if (progress >= 80 && progress < 100) {
            penalty = 50; 
        }

        if (penalty > 0) {
            console.log(`⚠️ OČEKIVANA KAZNA: Server će dodeliti ${penalty} kaznenih poena zbog napuštanja. Progres: ${Math.round(progress)}%`);
        }

        return penalty;
    }

    updateStats(score, resultType, oppScore = 0, isTechnical = false, options = {}) {
        let freshStats = JSON.parse(localStorage.getItem('yamb_stats'));
        this.stats = freshStats || this.stats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0, penaltyPoints: 0, currentWinStreak: 0, maxWinStreak: 0 };
        
        if (!isTechnical) {
            this.stats.games++; 
            this.stats.totalScoreSum += score; 
            if (score > this.stats.highscore) this.stats.highscore = score; 
        }

        if (this.onlineMode && !this.isSpectator) {
            if (resultType === 'win') {
                this.stats.wins++; 
                this.stats.currentWinStreak = (this.stats.currentWinStreak || 0) + 1;
                if (this.stats.currentWinStreak > (this.stats.maxWinStreak || 0)) {
                    this.stats.maxWinStreak = this.stats.currentWinStreak;
                }
            } else if (resultType === 'loss') {
                this.stats.losses++; 
                this.stats.currentWinStreak = 0; 
            } else if (resultType === 'draw') {
                this.stats.currentWinStreak = 0; 
            }

            if (this.players.length === 2) {
                const oppName = this.players.find(p => p !== this.playerName);
                if (oppName) {
                    let passMyScore = isTechnical ? 0 : score;
                    let passOppScore = isTechnical ? 0 : oppScore;
                    this.updateH2HStats(oppName, this.currentOpponentPhoto || '', resultType, passMyScore, passOppScore, this.currentOpponentUid);
                }
            }
        }
        
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats)); 

        if (window.statsManager) {
            window.statsManager.stats = this.stats;
        }

        if (!options.deferServerSync && this.socket && this.socket.connected) {
            this.emitPlayerData();
        }
    }

    showStats() { 
        this.refreshLocalStats();
        this.navigateTo('stats-screen'); 
        const h2hRecord = this.getLocalH2HRecordSummary();
        document.getElementById('stat-games').innerText = this.stats.games; 
        document.getElementById('stat-high').innerText = this.stats.highscore; 
        document.getElementById('stat-wins').innerText = h2hRecord.wins; 
        document.getElementById('stat-losses').innerText = h2hRecord.losses; 
        
        const avg = this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 0; 
        document.getElementById('stat-avg').innerText = avg; 

        const totalCompetitive = h2hRecord.wins + h2hRecord.losses + h2hRecord.draws; 
        let rate = 0; let winWidth = 50; let lossWidth = 50;
        if (totalCompetitive > 0) { rate = Math.round((h2hRecord.wins / totalCompetitive) * 100); winWidth = rate; lossWidth = 100 - rate; } 
        else { winWidth = 0; lossWidth = 0; }

        document.getElementById('stat-rate').innerText = rate + "%"; 
        const winBar = document.getElementById('stat-bar-win'); const lossBar = document.getElementById('stat-bar-loss');
        if(winBar) winBar.style.width = winWidth + "%"; if(lossBar) lossBar.style.width = lossWidth + "%";

        let powerIndex = this.calculatePowerIndex(this.getFullLocalStats(), true);
        
        const powerEl = document.getElementById('stat-power-index');
        if (powerEl) {
            let startVal = 0;
            const duration = 1000; 
            const steps = 30;
            const increment = powerIndex / steps;
            let currentStep = 0;
            const timer = setInterval(() => {
                currentStep++;
                startVal += increment;
                powerEl.innerText = Math.round(startVal);
                if(currentStep >= steps) {
                    powerEl.innerText = powerIndex;
                    clearInterval(timer);
                }
            }, Math.floor(duration/steps));
        }

        const realBalance = localStorage.getItem('yamb_dukati') || 0;
        document.getElementById('stat-balance').innerText = realBalance;

        const sm = window.statsManager;
        let trophyList = [];
        if (sm && sm.stats) { trophyList = sm.stats.unlockedTrophies || []; }
        const ALL_TROPHY_IDS = ['first_play', 'apprentice', 'kafana', 'score_1000', 'grandmaster', 'legend', 'mythic', 'godlike', 'surgeon', 'prophet', 'sniper', 'math', 'sveti_ilija', 'hazard', 'firecracker', 'concrete', 'perfectionist', 'miner', 'immortal', 'potato', 'minimal', 'achilles', 'close_call', 'night_owl', 'spite', 'veteran'];
        let realTrophyCount = 0;
        trophyList.forEach(item => { if (ALL_TROPHY_IDS.includes(item)) realTrophyCount++; });
        document.getElementById('stat-trophies').innerText = `${realTrophyCount} / ${ALL_TROPHY_IDS.length}`;
        
        let currentStreak = this.stats.currentWinStreak || 0;
        if (sm) { const stats = sm.getStats(); currentStreak = stats.currentWinStreak > 0 ? stats.currentWinStreak : currentStreak; }
        document.getElementById('stat-streak').innerText = currentStreak;

        const allTimePts = this.stats.totalScoreSum || 0;
        const allTimeEl = document.getElementById('stat-alltime');
        if (allTimeEl) allTimeEl.innerText = allTimePts;

        let h2h = JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}');
        // Filtriramo samo ispravne rivale
        let rivals = Object.values(h2h).filter(r => r.name && String(r.name) !== 'undefined' && String(r.name) !== 'null');
        
        const favNameEl = document.getElementById('stat-fav-opp-name');
        const favGamesEl = document.getElementById('stat-fav-opp-games');
        const favImgEl = document.getElementById('stat-fav-opp-img');

        if (rivals.length > 0) {
            rivals.sort((a, b) => ((b.wins || 0) + (b.losses || 0) + (b.draws || 0)) - ((a.wins || 0) + (a.losses || 0) + (a.draws || 0)));
            let topRival = rivals[0];
            let totalGames = (topRival.wins || 0) + (topRival.losses || 0) + (topRival.draws || 0);

            if (favNameEl) favNameEl.innerText = topRival.name;
            if (favGamesEl) favGamesEl.innerText = `${totalGames} ${gt('stat_matches')}`;
            
            if (favImgEl) {
                if (topRival.photo && topRival.photo.length > 5) {
                    favImgEl.src = topRival.photo;
                } else {
                    favImgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(topRival.name)}&background=333&color=E0C995`;
                }
                favImgEl.style.display = 'block';
            }
        } else {
            if (favNameEl) favNameEl.innerText = gt('stat_none') || "Nema";
            if (favGamesEl) favGamesEl.innerText = `0 ${gt('stat_matches')}`;
            if (favImgEl) favImgEl.style.display = 'none';
        }

        this.renderH2HStats();
        
        this.updateOnlineCounterUI();
    }

    showHighscoresScreen() { 
        this.navigateTo('highscores-screen'); 
        this.switchHsTab('global'); 
    }

    async showMainMenu() { 
        if (this.isSpectator) {
            this.isSpectator = false;
            if (this.socket) this.socket.emit('stop_spectating');

            const btnBacaj = document.getElementById('btn-bacaj');
            const btnNajava = document.getElementById('btn-najava');
            if(btnBacaj) btnBacaj.style.display = 'flex';
            if(btnNajava) btnNajava.style.display = 'flex';

            const timerDisplay = document.getElementById('turn-timer-display');
            if (timerDisplay) {
                timerDisplay.style.display = 'none';
                timerDisplay.style.animation = 'none';
            }

            if (this.adMob && this.adMob.showInterstitial) {
                await this.adMob.showInterstitial();
            }
        }

        const menu = document.getElementById('game-dropdown-menu');
        if(menu) menu.classList.remove('active');

        // ---> DODATO OVDJE: Zaustavljanje muzike kada se pređe u glavni meni <---
        if(this.soundMgr) this.soundMgr.stopMusic();

        this.navigateTo('main-menu'); 
        const floatBtn = document.getElementById('chat-float-btn');
        if(floatBtn) floatBtn.classList.add('hidden'); 
        document.getElementById('chat-window').classList.remove('active'); 
        this.chatOpen = false; 
        
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        
        const timerDisplay = document.getElementById('turn-timer-display');
        if (timerDisplay && !this.isSpectator) timerDisplay.style.display = 'none';

        if (this.socket && this.socket.connected) {
            this.socket.emit('back_to_menu');
        }

        if (this.friendsInterval) {
            clearInterval(this.friendsInterval);
            this.friendsInterval = null;
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
    
    showRules() { 
        if (typeof window.showGameRules === 'function') {
            window.showGameRules(); 
        } 
    }
    
    async quitToMenu() { 
        if (await this.modal.confirm(gt('alert_quit_confirm'))) { 
            if (this.gameActive && this.players.length > 1 && !this.isSpectator && this.onlineMode) {
                this.applyAbandonPenalty();
                
                const myAvg = this.stats && this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 500;
                
                let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
                currentDukati = Math.max(0, currentDukati - myAvg); 
                localStorage.setItem('yamb_dukati', currentDukati);
                if (window.statsManager) {
                    window.statsManager.stats.balance = currentDukati;
                    window.statsManager.saveStats();
                }

                if (window.kvartalnaLiga) {
                    window.kvartalnaLiga.addPoints(-myAvg);
                }
                
                this.updateStats(0, 'loss', 0, true); 
            }

            if (!this.isSpectator && this.adMob && this.adMob.showInterstitial) {
                await this.adMob.showInterstitial();
            }

            this.showMainMenu(); 
        } 
    }
    
    async startPrivateHosting() { 
        if (!this.requireLogin()) return; 
        
        const nickname = this.playerName; 
        if (!nickname) return; 
        const roomId = "yamb-" + Math.random().toString(36).substring(2, 8); 
        this.currentHostingRoomId = roomId; 
        
        let baseUrl = window.location.origin;
        if (typeof SERVER_URL !== 'undefined' && SERVER_URL.startsWith('http')) baseUrl = SERVER_URL;
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const shareUrl = baseUrl + "/?room=" + roomId; 
        
        this.navigateTo('waiting-screen'); 
        
        const titleEl = document.getElementById('waiting-title');
        if (titleEl) titleEl.innerText = gt('ws_title_invite') || "POZOVI PRIJATELJA";
        
        const msgEl = document.getElementById('wait-msg');
        if (msgEl) msgEl.innerText = gt('ws_msg_invite') || "Pošaljite link, odaberite prijatelja iz list ili dodajte novog!";
        
        const myImg = document.getElementById('waiting-my-img');
        const authImg = document.getElementById('auth-user-photo');
        if (myImg && authImg && authImg.src && authImg.src.includes('http')) myImg.src = authImg.src;
        else if (myImg) myImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=333&color=E0C995`;
        
        const myNameEl = document.getElementById('waiting-my-name');
        if (myNameEl) {
            myNameEl.innerText = nickname;
            myNameEl.style.fontSize = nickname.length > 14 ? 'clamp(0.65rem, 2.5vw, 0.85rem)' : '';
        }
        
        const myStats = this.getFullLocalStats();
        const myH2HRecord = this.getLocalH2HRecordSummary();
        const myPowerEl = document.getElementById('waiting-my-power');
        if (myPowerEl) myPowerEl.innerText = this.calculatePowerIndex(myStats, true);
        
        const myWlEl = document.getElementById('waiting-my-wl');
        if (myWlEl) myWlEl.innerText = `${myH2HRecord.wins || 0} / ${myH2HRecord.losses || 0}`;

        const oppBox = document.getElementById('waiting-opp-box');
        const vsBadge = document.getElementById('waiting-vs-badge');
        if (oppBox) oppBox.style.display = 'none'; 
        if (vsBadge) vsBadge.style.display = 'none';

        const shareArea = document.getElementById('share-area');
        if (shareArea) shareArea.classList.remove('hidden'); 
        
        const linkInput = document.getElementById('invite-link');
        if (linkInput) linkInput.value = shareUrl; 
        
        const friendsContainer = document.getElementById('friends-list-container');
        if (friendsContainer) {
            friendsContainer.classList.remove('hidden');
            document.getElementById('friends-list').innerHTML = `<div class="loader" style="width: 25px; height: 25px; margin: 20px auto;"></div>`;
            this.initSocketConnection();
            setTimeout(() => { if(this.socket && this.socket.connected) this.socket.emit('get_friends_list'); }, 500);
            
            if (this.friendsInterval) clearInterval(this.friendsInterval);
            this.friendsInterval = setInterval(() => {
                const ws = document.getElementById('waiting-screen');
                if (ws && ws.classList.contains('active') && this.currentHostingRoomId) {
                    if (this.socket && this.socket.connected) this.socket.emit('get_friends_list');
                } else {
                    clearInterval(this.friendsInterval); 
                }
            }, 5000);
        }

        const hofContainer = document.getElementById('ws-hall-of-fame');
        if (hofContainer) hofContainer.classList.add('hidden');
        
        this.joinPrivateGame(nickname, roomId, true); 
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
                    dialogTitle: gt('share_dialog_title') || 'Podeli link sa prijateljem'
                });
                return; 
            } catch (e) {
                console.log("Capacitor dijeljenje nije uspjelo:", e);
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
    
    async joinPrivateGame(nickname, roomId, isHost = false) { 
        if (!this.requireLogin()) return; 
        
        this.navigateTo('waiting-screen'); 
        
        const myImg = document.getElementById('waiting-my-img');
        const authImg = document.getElementById('auth-user-photo');
        if (myImg && authImg && authImg.src && authImg.src.includes('http')) {
            myImg.src = authImg.src;
        } else if (myImg) {
            myImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=333&color=E0C995`;
        }
        
        const myNameEl = document.getElementById('waiting-my-name');
        if (myNameEl) {
            myNameEl.innerText = nickname;
            myNameEl.style.fontSize = nickname.length > 14 ? 'clamp(0.65rem, 2.5vw, 0.85rem)' : '';
        }
        
        const myStats = this.getFullLocalStats();
        const myH2HRecord = this.getLocalH2HRecordSummary();
        const myPowerEl = document.getElementById('waiting-my-power');
        if (myPowerEl) myPowerEl.innerText = this.calculatePowerIndex(myStats, true);
        
        const myWlEl = document.getElementById('waiting-my-wl');
        if (myWlEl) myWlEl.innerText = `${myH2HRecord.wins || 0} / ${myH2HRecord.losses || 0}`;

        const oppBox = document.getElementById('waiting-opp-box');
        if (oppBox) {
            if (isHost) {
                oppBox.style.display = 'none'; 
            } else {
                oppBox.style.display = 'flex'; 
                const searchingUI = document.getElementById('waiting-opp-searching');
                const foundUI = document.getElementById('waiting-opp-found');
                if (searchingUI) searchingUI.style.display = 'flex';
                if (foundUI) foundUI.style.display = 'none';
                oppBox.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                oppBox.style.boxShadow = 'var(--glass-shadow)';
            }
        }

        const friendsContainer = document.getElementById('friends-list-container');
        if (friendsContainer && !isHost) friendsContainer.classList.add('hidden');

        const hofContainer = document.getElementById('ws-hall-of-fame');
        if (hofContainer) hofContainer.classList.add('hidden');

        this.initSocketConnection();
        this.setupSocketListeners(nickname); 

        const photoUrl = (authImg && authImg.src && authImg.src.includes('http')) ? authImg.src : '';

        if (this.socket && this.socket.connected) {
            this.socket.emit('join_private_game', { nickname, roomId, photoUrl });
        } else {
            this.socket.once('connect', () => {
                this.socket.emit('join_private_game', { nickname, roomId, photoUrl });
            });
        }
    }
    
    async setupOnline(mode = 'random') { 
        if (!this.requireLogin()) return; 
        
        const nickname = this.playerName; 
        if (!nickname) return; 
        this.navigateTo('waiting-screen'); 
        
        const titleEl = document.getElementById('waiting-title');
        if (titleEl) titleEl.innerText = gt('ws_searching') || "TRAŽENJE PROTIVNIKA...";
        
        const msgEl = document.getElementById('wait-msg');
        if (msgEl) msgEl.innerText = gt('ws_wait_msg') || "Molimo sačekajte, spajamo vas sa prvim slobodnim igračem.";

        const myImg = document.getElementById('waiting-my-img');
        const authImg = document.getElementById('auth-user-photo');
        if (myImg && authImg && authImg.src && authImg.src.includes('http')) myImg.src = authImg.src;
        else if (myImg) myImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=333&color=E0C995`;
        
        const myNameEl = document.getElementById('waiting-my-name');
        if (myNameEl) {
            myNameEl.innerText = nickname;
            myNameEl.style.fontSize = nickname.length > 14 ? 'clamp(0.65rem, 2.5vw, 0.85rem)' : '';
        }
        
        const myStats = this.getFullLocalStats();
        const myH2HRecord = this.getLocalH2HRecordSummary();
        const myPowerEl = document.getElementById('waiting-my-power');
        if (myPowerEl) myPowerEl.innerText = this.calculatePowerIndex(myStats, true);
        
        const myWlEl = document.getElementById('waiting-my-wl');
        if (myWlEl) myWlEl.innerText = `${myH2HRecord.wins || 0} / ${myH2HRecord.losses || 0}`;

        const oppBox = document.getElementById('waiting-opp-box');
        const vsBadge = document.getElementById('waiting-vs-badge');
        
        if (oppBox) {
            oppBox.style.display = 'flex';
            const searchingUI = document.getElementById('waiting-opp-searching');
            const foundUI = document.getElementById('waiting-opp-found');
            if (searchingUI) searchingUI.style.display = 'flex';
            if (foundUI) foundUI.style.display = 'none';
        }
        if (vsBadge) vsBadge.style.display = 'block';

        const friendsContainer = document.getElementById('friends-list-container');
        if (friendsContainer) friendsContainer.classList.add('hidden');
        
        const shareArea = document.getElementById('share-area');
        if (shareArea) shareArea.classList.add('hidden'); 

        const hofContainer = document.getElementById('ws-hall-of-fame');
        if (hofContainer) {
            hofContainer.classList.remove('hidden');
            this.loadHallOfFame();
        }
        
        this.initSocketConnection();
        this.setupSocketListeners(nickname); 
        
        if(this.socket) {
            const photoUrl = (authImg && authImg.src && authImg.src.includes('http')) ? authImg.src : '';
            this.socket.emit('find_game', { nickname: nickname, photoUrl: photoUrl }); 
        }
    }
    
    startClientTimer() {
        if (!this.onlineMode || this.isSpectator) return;
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        
        this.timeLeft = 90; 
        this.updateStatusLabel();

        this.turnTimerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateStatusLabel();
            
            const isMyTurn = (this.currentPlayerIdx === this.myOnlineIndex) && !this.isSpectator;
            
            // ---> FIX: ANTI-DESYNC POLLING (Popravlja Deadlock pri gubitku paketa) <---
            if (!isMyTurn && this.socket && this.roomId) {
                // Ako čekamo protivnika, tiho pitamo server za pravo stanje svakih 10 sekundi
                if (this.timeLeft % 10 === 0) {
                    console.log("🔄 ANTI-DESYNC: Tiha provera stanja sa serverom da sprečimo zaglavljivanje...");
                    this.socket.emit('request_state_sync');
                }
            }

            if (this.timeLeft <= -3) {
                clearInterval(this.turnTimerInterval);
                
                if (!isMyTurn && this.socket && this.roomId) {
                    console.log("🛡️ SAFETY NET: Tajmer na nuli! Tražim tehničku pobedu od servera...");
                    this.socket.emit('check_timeout', { roomId: this.roomId });
                }
            }
        }, 1000);
    }
    
    updateStatusLabel() {
        const statusLbl = document.getElementById('lbl-status');
        if (statusLbl) {
            statusLbl.innerHTML = `${gt('status_roll') || "BACANJE"}: ${this.brojBacanja} / 3`;
        }

        const timerDisplay = document.getElementById('turn-timer-display');
        if (timerDisplay) {
            if (this.isSpectator) {
                timerDisplay.style.display = 'flex';
                timerDisplay.innerHTML = `<span style="color:#fff; background:var(--danger); padding:4px 10px; border-radius:12px; font-weight:900; font-size:0.8rem; letter-spacing:1px; box-shadow:0 0 10px rgba(244,67,54,0.6);">👁️ ${gt('live_badge') || 'UŽIVO'}</span>`;
                timerDisplay.style.animation = 'pulse 2s infinite';
            } else if (this.onlineMode && this.gameActive) {
                timerDisplay.style.display = 'flex';
                const isMyTurn = (this.currentPlayerIdx === this.myOnlineIndex) && !this.isSpectator;
                
                const color = this.timeLeft <= 10 ? '#ff4c4c' : (isMyTurn ? 'var(--gold-main)' : '#aaaaaa');
                
                if (this.timeLeft <= 0) {
                    timerDisplay.innerHTML = `<span style="color:#ffcc00; font-size: 0.8rem;">⏳ ${gt('timeout_grace') || 'Ističe...'}</span>`;
                    timerDisplay.style.animation = 'pulse 0.5s infinite';
                } else {
                    timerDisplay.innerHTML = `<span style="color:${color};">⏱️ ${this.timeLeft}s</span>`;
                    if (this.timeLeft <= 10 && isMyTurn) {
                        timerDisplay.style.animation = 'pulse 1s infinite';
                    } else {
                        timerDisplay.style.animation = 'none';
                    }
                }
                
            } else {
                timerDisplay.style.display = 'none';
                timerDisplay.style.animation = 'none';
            }
        }
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
        this.socket.off('incoming_friend_req');
        this.socket.off('friend_req_accepted');
        this.socket.off('friend_req_declined'); 
        this.socket.off('friends_list_data');
        this.socket.off('search_results');
        this.socket.off('incoming_room_invite');
        
        this.socket.off('request_state_sync');
        this.socket.off('sync_state_response');
        this.socket.off('spectate_started');

        this.socket.off('global_highscores_data');
        this.socket.on('global_highscores_data', (data) => {
            if(this.topListManager) this.topListManager.renderList(data, 'global-hs-list');
        });

        this.socket.off('weekly_top3_data');
        this.socket.on('weekly_top3_data', (data) => {
            this.renderHallOfFame(data);
        });

        this.socket.off('opponent_connection_lost');
        this.socket.on('opponent_connection_lost', () => {
            if (this.isSpectator) return;
            
            if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
            
            const timerDisplay = document.getElementById('turn-timer-display');
            if (timerDisplay) {
                timerDisplay.style.display = 'flex';
                timerDisplay.innerHTML = `<span style="color:#ffcc00; font-size: 0.8rem;">${gt('opp_network_issue') || '⚠️ Protivnik ima problema sa mrežom...'}</span>`;
                timerDisplay.style.animation = 'pulse 1s infinite';
            }
            
            const btnBacaj = document.getElementById('btn-bacaj');
            if (btnBacaj) btnBacaj.disabled = true;
        });

        this.socket.off('opponent_connection_restored');
        this.socket.on('opponent_connection_restored', () => {
            if (this.isSpectator) return;
            
            if (typeof window.showNotification === 'function') {
                window.showNotification(gt('info_title') || "INFO", gt('opp_reconnected') || "Protivnik se vratio u igru!");
            }
            
            if (this.socket) {
                this.socket.emit('request_state_sync');
            }
        });

        this.socket.off('room_spectators_count');
        this.socket.on('room_spectators_count', (count) => {
            this.updateSpectatorIcon(count);
        });

        this.socket.off('previous_quarter_winner_data');
        this.socket.on('previous_quarter_winner_data', (data) => {
            if (!data) {
                const now = new Date();
                let prevQ = Math.floor(now.getMonth() / 3);
                let prevY = now.getFullYear();
                if(prevQ === 0) { prevQ = 4; prevY -= 1; }
                localStorage.setItem(`yamb_winner_shown_${prevY}_Q${prevQ}`, 'true');
                return;
            }

            const shownKey = `yamb_winner_shown_${data.year}_Q${data.quarter}`;
            if (localStorage.getItem(shownKey)) return;

            const mainMenu = document.getElementById('main-menu');
            if (this.gameActive || (mainMenu && !mainMenu.classList.contains('active'))) {
                return; 
            }

            this.showQuarterWinnerModal(data);
            localStorage.setItem(shownKey, 'true');
        });

        this.socket.off('quarter_reward');
        this.socket.on('quarter_reward', (data) => {
            const { rank, reward } = data;

            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
            
            this.soundMgr.win();
            this.effectMgr.trigger('gold_rain');
            
            let medalja = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
            let msg = (gt('quarter_reward_msg') || "Čestitamo! Osvojili ste {0}. mesto {1} u Kvartalnoj ligi i nagradu od {2} 💰!")
                        .replace('{0}', rank).replace('{1}', medalja).replace('{2}', reward);
            
            this.modal.alert(msg, gt('quarter_reward_title') || "KRAJ KVARTALA 🏆");
        });

        this.socket.off('game_over_timeout');
        this.socket.on('game_over_timeout', async (data) => {
            if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
            this.gameActive = false;
            
            if (this.isSpectator) {
                this.modal.alert(gt('timeout_spectator') || "Igraču je isteklo vreme.", gt('timeout_title') || "KRAJ PARTIJE");
                this.cancelOnline();
                return;
            }

            const iAmWinner = (this.socket.id === data.winnerId);

            let myAvg = this.stats && this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 500;
            if (isNaN(myAvg) || myAvg < 0) myAvg = 500;
            if (myAvg > 2000) myAvg = 2000;
            const winnerReward = Number.isFinite(Number(data.winnerReward)) ? Math.max(0, Math.floor(Number(data.winnerReward))) : myAvg;
            const coinPenalty = Number.isFinite(Number(data.coinPenalty)) ? Math.max(0, Math.floor(Number(data.coinPenalty))) : myAvg;

            if (iAmWinner) {
                this.soundMgr.win();
                this.effectMgr.celebrateWin();

                if (window.kvartalnaLiga) {
                    window.kvartalnaLiga.addPoints(winnerReward);
                }

                this.updateStats(winnerReward, 'win', 0, true);

                // UKLONJEN MODAL ZA POBEDNIKA, IGRA TIHO DODELJUJE NAGRADE
            } else {
                this.soundMgr.loss();
                
                let penalty = data.penalty !== undefined ? data.penalty : 50; 
                
                if (penalty > 0 && !data.serverApplied) {
                    this.stats = this.stats || {};
                    this.stats.penaltyPoints = (this.stats.penaltyPoints || 0) + penalty;
                    localStorage.setItem('yamb_stats', JSON.stringify(this.stats));
                }

                let penStr = (gt('penalty_msg') || "Kazna zbog odugovlačenja: -{0} Power Index poena.").replace('{0}', penalty);
                let msgDodatak = penalty > 0 ? `<br><br><span style="color:var(--danger); font-weight:bold;">${penStr}</span>` : '';

                if (window.kvartalnaLiga) {
                    window.kvartalnaLiga.addPoints(-coinPenalty);
                    let ptsLostStr = (gt('league_pts_lost') || "-{0} poena u Ligi<br>-{0} 💰 Dukata").replace(/\{0\}/g, coinPenalty);
                    msgDodatak += `<br><span style="color:var(--danger); font-weight:bold;">${ptsLostStr}</span>`;
                }

                this.updateStats(0, 'loss', 0, true);

                const msg = (data.message || gt('timeout_loss_msg') || "Isteklo vam je vreme!") + msgDodatak;
                await this.modal.alert(msg, gt('timeout_loss_title') || "PORAZ");
            }
            
            this.cancelOnline();
        });

        this.socket.on('spectate_started', (data) => {
            this.onlineMode = true;
            this.isSpectator = true;
            this.gameActive = true;
            this.roomId = data.roomId;
            this.modeTag = "Spectator";

            this.navigateTo('game-scene');

            const btnBacaj = document.getElementById('btn-bacaj');
            const btnNajava = document.getElementById('btn-najava');
            if(btnBacaj) btnBacaj.style.display = 'none';
            if(btnNajava) btnNajava.style.display = 'none';

            this.updateStatusLabel();
        });

        this.socket.on('request_state_sync', () => {
            if (this.gameActive && !this.isSpectator) {
                console.log("📤 Šaljem osveženo stanje table (uključujući igrače)...");
                this.socket.emit('sync_state_response', {
                    roomId: this.roomId,
                    players: this.players, 
                    allScores: this.allScores,
                    currentPlayerIdx: this.currentPlayerIdx,
                    brojBacanja: this.brojBacanja,
                    kockiceVals: this.kockiceVals,
                    zadrzane: this.zadrzane,
                    najavaAktivna: this.najavaAktivna,
                    najavljenoPolje: this.najavljenoPolje
                });
            }
        });

        this.socket.on('sync_state_response', (data) => {
            if ((this.gameActive || this.isSpectator) && this.onlineMode) {
                console.log("📥 Stiglo osveženo stanje. Primenjujem...");
                
                if (data.players) { 
                    this.players = data.players.map(p => {
                        if (typeof p === 'object' && p !== null) {
                            return p.name ? decodeURIComponent(p.name) : "Igrač";
                        }
                        try {
                            let decoded = decodeURIComponent(p);
                            if (decoded.includes('%')) decoded = decodeURIComponent(decoded);
                            return decoded;
                        } catch(e) {
                            return p; 
                        }
                    });

                    // FIX: Oslanjamo se striktno na autoritativni serverski indeks igrača
                    if (data.myIndex !== undefined) {
                        this.myOnlineIndex = data.myIndex;
                    } else {
                        // Fallback ako server iz nekog razloga ne pošalje indeks
                        this.myOnlineIndex = this.players.indexOf(this.playerName);
                        if (this.myOnlineIndex === -1) this.myOnlineIndex = 0; 
                    }

                    this.createScoreTables();
                }

                this.allScores = data.allScores;
                this.currentPlayerIdx = data.currentPlayerIdx;
                this.brojBacanja = data.brojBacanja;
                this.kockiceVals = data.kockiceVals;
                this.zadrzane = data.zadrzane;
                this.najavaAktivna = data.najavaAktivna;
                this.najavljenoPolje = data.najavljenoPolje;

                this.updateTableVisuals();
                this.updateDiceVisuals();
                this.highlightCurrentPlayer();
                this.updateStatusLabel();
                this.startClientTimer(); 

                if (!this.isSpectator) {
                    const btnBacaj = document.getElementById('btn-bacaj');
                    const isMyTurn = (this.currentPlayerIdx === this.myOnlineIndex);
                    if (btnBacaj) {
                        if (isMyTurn && this.brojBacanja < 3) {
                            btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll') || "BACAJ";
                        } else if (isMyTurn) {
                            btnBacaj.disabled = true; btnBacaj.innerText = gt('game_write') || "UPIŠI";
                        } else {
                            btnBacaj.disabled = true; btnBacaj.innerText = gt('game_opponent_turn') || "PROTIVNIK IGRA...";
                        }
                    }

                    const btnNajava = document.getElementById('btn-najava');
                    if (btnNajava) {
                        if (this.najavaAktivna) {
                            btnNajava.innerText = isMyTurn ? (gt('game_announce_cancel') || "OTKAŽI") : (gt('game_opponent_choosing') || "PROTIVNIK BIRA...");
                            btnNajava.classList.add('btn-active-toggle');
                            btnNajava.disabled = !isMyTurn; // <-- EKSPLICITNO OTKLJUČAVANJE/ZAKLJUČAVANJE
                        } else if (this.najavljenoPolje) {
                            btnNajava.innerText = `${gt('game_announce') || "NAJAVA"}: ${this.najavljenoPolje.row}`;
                            btnNajava.classList.remove('btn-active-toggle');
                            btnNajava.disabled = true; // <-- Nema najave ponovo na isto polje
                        } else {
                            btnNajava.innerText = gt('game_announce') || "NAJAVA";
                            btnNajava.classList.remove('btn-active-toggle');
                            btnNajava.disabled = !(isMyTurn && this.brojBacanja === 1); // <-- Samo ako je moj red i prvo bacanje
                        }
                    }
                }
            }
        });

        this.socket.on('room_full', async () => { await this.modal.alert(gt('msg_room_full')); this.cancelOnline(); }); 
        this.socket.on('private_waiting', (data) => { this.roomId = data.roomId; }); 
        
        this.socket.on('game_start', (data) => { 
            console.log("GAME START:", data);
            
            // NOVO: Zapamti da je korisnik u online meču
            localStorage.setItem('yamb_active_online_room', data.roomId);
            
            this.currentOpponentPhoto = data.oppPhoto || '';
            this.currentOpponentUid = data.oppUid || null; 
            
            const customModal = document.getElementById('custom-modal-overlay');
            if (customModal) customModal.style.display = 'none';

            if (data.myIndex !== undefined) {
                this.myOnlineIndex = Number(data.myIndex);
            } else if (data.uids) {
                const savedUid = localStorage.getItem('yamb_uid');
                this.myOnlineIndex = data.uids.indexOf(savedUid);
            } else {
                this.myOnlineIndex = 0; 
            }

            console.log(`[SYNC] Moj igrački indeks je striktno: ${this.myOnlineIndex}`);

            this.onlineMode = true; 
            this.modeTag = "Online"; 
            this.roomId = data.roomId; 
            this.players = this.myOnlineIndex === 0 ? [nickname, data.opponent] : [data.opponent, nickname]; 
            this.initScores(); 
            this.currentPlayerIdx = 0; 
            
            const searchingUI = document.getElementById('waiting-opp-searching');
            const foundUI = document.getElementById('waiting-opp-found');
            const oppBox = document.getElementById('waiting-opp-box');
            
            if (searchingUI && foundUI && oppBox) {
                oppBox.style.display = 'flex'; 
                searchingUI.style.display = 'none';
                foundUI.style.display = 'flex';
                
                oppBox.style.borderColor = 'var(--danger)';
                oppBox.style.boxShadow = '0 5px 15px rgba(244, 67, 54, 0.2)';
                
                const oppImg = document.getElementById('waiting-opp-img');
                if (data.oppPhoto && data.oppPhoto.length > 5) {
                    oppImg.src = data.oppPhoto;
                } else {
                    oppImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.opponent)}&background=333&color=E0C995`;
                }
                
                const oppNameEl = document.getElementById('waiting-opp-name');
                if (oppNameEl) {
                    oppNameEl.innerText = data.opponent;
                    oppNameEl.style.fontSize = data.opponent.length > 14 ? 'clamp(0.65rem, 2.5vw, 0.85rem)' : '';
                }
                
                let oppPI = 0;
                let oppW = 0, oppL = 0;
                if (data.oppStats) {
                    oppPI = this.calculatePowerIndex(data.oppStats, false);
                    const oppH2HRecord = data.oppStats.h2hRecord || {};
                    oppW = oppH2HRecord.wins !== undefined ? oppH2HRecord.wins : (data.oppStats.h2hWins || 0);
                    oppL = oppH2HRecord.losses !== undefined ? oppH2HRecord.losses : (data.oppStats.h2hLosses || 0);
                }
                
                document.getElementById('waiting-opp-power').innerText = oppPI;
                document.getElementById('waiting-opp-wl').innerText = `${oppW} / ${oppL}`;

                this.soundMgr.win(); 

                setTimeout(() => {
                    // ---> DODATO: Puštanje muzike na početku partije <---
                    if(this.soundMgr) this.soundMgr.playMusic();
                    this.startGame(); 
                }, 2500);
            } else {
                // ---> DODATO: Puštanje muzike na početku partije <---
                if(this.soundMgr) this.soundMgr.playMusic();
                this.startGame();
            }
        }); 

        this.socket.on('remote_move', (data) => { 
            try {
                const playerIdx = data.pIdx !== undefined ? data.pIdx : (this.myOnlineIndex === 0 ? 1 : 0); 
                this.currentPlayerIdx = playerIdx; 

                if (this.allScores[playerIdx] && this.allScores[playerIdx][data.col]) {
                    this.allScores[playerIdx][data.col][data.row] = data.points; 
                    this.updateTableVisuals(); 
                    this.najavaAktivna = false;
                    
                    if (!this.isSpectator) {
                        const btnNajava = document.getElementById('btn-najava');
                        if(btnNajava) {
                            btnNajava.classList.remove('btn-active-toggle');
                            btnNajava.innerText = gt('game_announce') || "NAJAVA";
                        }
                    }
                    this.switchPlayer(); 

                    // --- DODATAK: GRACE PERIOD ZA PROTIVNIKA (BLOKADA BACANJA) ---
                    if (!this.isSpectator && this.currentPlayerIdx === this.myOnlineIndex) {
                        const btnBacaj = document.getElementById('btn-bacaj');
                        if (btnBacaj) {
                            btnBacaj.disabled = true;
                            btnBacaj.innerText = "SAČEKAJ..."; // ⏳ Grace period
                            
                            setTimeout(() => {
                                // Provera da li je i dalje moj potez (da se u međuvremenu nije desio Undo)
                                if (this.gameActive && this.currentPlayerIdx === this.myOnlineIndex && this.brojBacanja < 3) {
                                    btnBacaj.disabled = false;
                                    btnBacaj.innerText = gt('game_roll') || "BACAJ";
                                }
                            }, 2500); // 2.5 sekundi hlađenja
                        }
                    }
                    // -------------------------------------------------------------
                } 
            } catch(e) { console.error("CRITICAL ERROR in remote_move:", e); }
        }); 

        this.socket.on('remote_roll', (data) => { 
            // Čim protivnik baci kockicu, više ne možemo da vratimo naš potez!
            this.lastMoveSnapshot = null; 
            const btnUndo = document.getElementById('btn-undo-move');
            if (btnUndo) {
                btnUndo.classList.add('gh-btn-inactive');
                btnUndo.classList.remove('gh-btn-active');
            }

            if (data.held && Array.isArray(data.held)) { this.zadrzane = data.held; }
            this.brojBacanja = data.bacanje; 
            this.updateStatusLabel();
            this.visualRoll(data.values); 
        }); 

        this.socket.on('remote_hold', (data) => { 
            this.zadrzane[data.index] = data.status; 
            this.updateDiceVisuals(); 
        }); 

        this.socket.on('remote_announce', (data) => { 
            if(this.isSpectator) return;
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
            if(this.isSpectator) return;
            const accepted = await this.modal.confirm(gt('rematch_ask'));
            if (accepted) {
                this.socket.emit('accept_rematch');
            } else {
                this.socket.emit('chat_msg', { roomId: this.roomId, msg: gt('rematch_declined') });
            }
        });

        this.socket.on('rematch_started', () => {
            if(this.isSpectator) {
                this.initScores();
                this.currentPlayerIdx = 0;
                this.updateTableVisuals();
                this.updateDiceVisuals();
                return;
            }
            this.modal.alert(gt('rematch_accepted'), gt('rematch_title')).then(() => {
                this.initScores(); 
                this.currentPlayerIdx = 0; 
                this.startGame(); 
            });
        });

        this.socket.off('opponent_left');
        this.socket.on('opponent_left', async (data = {}) => {
            localStorage.removeItem('yamb_active_online_room');
            if(this.isSpectator) {
                this.modal.alert(gt('spectator_opp_left') || "Igrač je napustio sobu.", gt('modal_title_info') || "INFO").then(() => {
                    this.showMainMenu();
                });
                return;
            }

            // ---> DODATO: Zaštita od duplih bodova ako je igra već gotova (Fiks 2) <---
            if (!this.gameActive) {
                console.log("ℹ️ Protivnik je napustio sobu nakon završene partije.");
                const btnRematch = document.getElementById('btn-rematch');
                if (btnRematch) {
                    btnRematch.disabled = true;
                    btnRematch.innerHTML = `<span>❌ ${gt('msg_opponent_left') || "Protivnik otišao"}</span>`;
                    btnRematch.style.background = 'gray';
                    btnRematch.style.boxShadow = 'none';
                }
                return;
            }

            // Ako je igra ZAPRAVO u toku, dodeljujemo tehničku pobedu
            this.gameActive = false;

            this.soundMgr.win();
            this.effectMgr.celebrateWin();

            let myAvg = this.stats && this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 500;
            if (isNaN(myAvg) || myAvg < 0) myAvg = 500;
            if (myAvg > 2000) myAvg = 2000;
            const rewardAmount = Number.isFinite(Number(data.reward)) ? Math.max(0, Math.floor(Number(data.reward))) : myAvg;

            if (window.kvartalnaLiga) {
                window.kvartalnaLiga.addPoints(rewardAmount);
            }

            this.updateStats(rewardAmount, 'win', 0, true);

            // UKLONJEN MODAL ZA POBEDNIKA PO ZAHTEVU, PARTIJA SE TIHO ZAVRŠAVA
            this.cancelOnline();
        });

        this.socket.on('incoming_friend_req', async (data) => {
            if (this.currentHostingRoomId) {
                this.socket.emit('get_friends_list');
            } else {
                const msg = (gt('alert_friend_req_pending') || "Novi zahtev za prijateljstvo od igrača {0}! Možete ga videti u sekciji 'Prijatelj'.").replace('{0}', this.escapeHtml(data.challengerName || 'Igrač'));
                this.modal.alert(msg, gt('alert_info') || "NOVI ZAHTEV");
            }
        });

        this.socket.on('friend_req_accepted', (data) => {
            const msg = (gt('alert_friend_added') || "Igrač {0} je sada vaš prijatelj! Možete ga pozvati na partiju iz menija 'Prijatelj'.").replace('{0}', this.escapeHtml(data.name || 'Igrač'));
            this.modal.alert(msg, gt('alert_new_friend') || "NOVI PRIJATELJ");
            if (this.currentHostingRoomId) {
                this.socket.emit('get_friends_list');
            }
        });

        this.socket.on('friend_req_declined', (data) => {
            const msg = (gt('alert_friend_declined') || "Igrač {0} je nažalost odbio vaš zahtev za prijateljstvo.").replace('{0}', this.escapeHtml(data.name || 'Igrač'));
            this.modal.alert(msg, gt('alert_info') || "OBAVEŠTENJE");
        });

        this.socket.on('friends_list_data', (data) => {
            let friends = Array.isArray(data) ? data : (data.friends || []);
            let requests = data.requests || [];
            
            this.friendsListUids = friends.map(f => f.uid);
            this.renderFriendsList(friends, requests);
        });

        this.socket.on('search_results', async (results) => {
            if (results.length === 0) {
                this.modal.alert(gt('alert_search_not_found') || "Nije pronađen nijedan igrač sa tim imenom. Pokušajte ponovo.", gt('alert_search_title') || "PRETRAGA");
            } else {
                const p = results[0]; 
                
                if (this.friendsListUids.includes(p.uid)) {
                     this.modal.alert(gt('friend_already_added'), gt('modal_title_info') || "INFO");
                     return;
                }

                const safeSearchName = this.escapeHtml(p.name || 'Igrač');
                const msg = (gt('alert_search_found') || "Pronađen je igrač: {0}. Da li želiš da mu pošalješ zahtev za prijateljstvo?").replace('{0}', safeSearchName);
                const send = await this.modal.confirm(msg);
                if (send) {
                    this.sendFriendRequest(p.socketId, p.name, p.uid);
                    let successMsg = (gt('friend_req_success') || "Zahtev je poslat! Igrač {0} će ga dobiti sledeći put kada bude na mreži.").replace('{0}', safeSearchName);
                    this.modal.alert(successMsg, gt('title_success') || "USPEŠNO");
                }
            }
        });

        this.socket.on('incoming_room_invite', async (data) => {
            let realHostName = data.hostName;
            let hostSocketId = null;
            
            if (data.hostName && data.hostName.includes('|||')) {
                const parts = data.hostName.split('|||');
                realHostName = parts[0];
                hostSocketId = parts[1];
            }

            const msg = (gt('alert_room_invite') || "Vaš prijatelj {0} vas poziva u privatnu sobu. Želite li da igrate?").replace('{0}', this.escapeHtml(realHostName || 'Igrač'));
            const accepted = await this.modal.confirm(msg);
            
            if (accepted) {
                this.inviteDetected = true;
                this.navigateTo('splash-screen');
                setTimeout(() => { this.joinPrivateGame(this.playerName, data.roomId); }, 800);
            } else {
                if (hostSocketId) {
                    this.socket.emit('challenge_response', {
                        challengerId: hostSocketId,
                        accepted: false
                    });
                }
            }
        });

        // DODATO: Osluškivač odgovora servera o stanju prekinute partije
        this.socket.off('room_status_result');
        this.socket.on('room_status_result', async (data) => {
            if (data.active) {
                const zeliNastavak = await this.modal.confirm("Imate prekinut online duel! Da li želite da se vratite u igru?");
                if (zeliNastavak) {
                    this.resumeOnlineGame(data.roomId);
                } else {
                    localStorage.removeItem('yamb_active_online_room');
                    if (this.socket && this.socket.connected) {
                        this.socket.emit('back_to_menu');
                    }
                }
            } else {
                // Soba više ne postoji (istekao grace period), obavesti ga direktno
                localStorage.removeItem('yamb_active_online_room');
                this.modal.alert("Kraj partije zato što ste napustili igru i niste se vratili na vreme.", "KRAJ PARTIJE");
            }
        });

        // DODATO: Zaštita u slučaju da je igrač prekasno ušao (istekao Grace Period)
        this.socket.off('force_cancel_online');
        this.socket.on('force_cancel_online', () => {
            console.log("Server je odbio rekonekciju: Soba je zatvorena.");
            localStorage.removeItem('yamb_active_online_room');
            if (this.modal) {
                this.modal.alert("Kraj partije zato što ste napustili igru i niste se vratili na vreme.", "KRAJ PARTIJE");
            } else {
                alert("Kraj partije zato što ste napustili igru i niste se vratili na vreme.");
            }
            this.cancelOnline(); 
        });
    }
    
    cancelOnline() { 
        localStorage.removeItem('yamb_active_online_room'); 
        this.showMainMenu(); 
        window.history.pushState({}, document.title, window.location.pathname); 
    }

    async handleModeClick(numPlayers) {
        if (!this.requireLogin()) return; 
        
        if(this.soundMgr) this.soundMgr.click();
        
        if (!window.localforage) {
            this.setupGame(numPlayers);
            return;
        }
        
        try {
            const uid = localStorage.getItem('yamb_uid') || 'guest';
            const saveKey = `yamb_saved_game_${uid}_${numPlayers}`;
            
            const saved = await localforage.getItem(saveKey);
            
            if (saved && saved.players && saved.players.length === numPlayers) {
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
            this.loadSavedGame(numPlayers);
        } else {
            const uid = localStorage.getItem('yamb_uid') || 'guest';
            if (window.localforage) await localforage.removeItem(`yamb_saved_game_${uid}_${numPlayers}`);
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
        
        this.initScores(); this.currentPlayerIdx = 0; 
        
        this.roomId = "local_" + Math.random().toString(36).substring(2, 10);

        this.initSocketConnection();
        this.setupSocketListeners(p1Name);

        if (this.socket && this.socket.connected) {
            this.socket.emit('start_local_game', this.roomId);
        } else if (this.socket) {
            this.socket.once('connect', () => {
                this.socket.emit('start_local_game', this.roomId);
            });
        }
        
        // ---> DODATO: Puštanje muzike kada partija krene <---
        if(this.soundMgr) this.soundMgr.playMusic();

        this.startGame(); 
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
        if (this.socket && this.socket.connected && !this.isSpectator && this.playerId) {
            this.socket.emit('game_session_start');
        }

        this.updateQuickMenuIcons();
        this.updateSpectatorIcon(0);

        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }

        this.showQuoteAndProceed(); 
        
        this.createScoreTables(); 
        this.resetTurnLogic(); 
        this.gameActive = true; 
        this.lastGameType = 'normal';
        document.getElementById('chat-body').innerHTML = ""; 
        const chatBtn = document.getElementById('chat-float-btn'); 
        if (chatBtn) chatBtn.classList.add('hidden'); 
        this.effectMgr.stop(); this.loadEquippedEffect(); 
        
        this.startClientTimer();

        // ---> DODATO: Puštanje muzike na startu za sve modove (fallback) <---
        if(this.soundMgr) this.soundMgr.playMusic();
    }

    showQuoteAndProceed() {
        const lang = localStorage.getItem('yamb_lang') || 'sr';
        let quoteData = { text: gt('fallback_quote_text') || "Sreća prati hrabre.", author: gt('fallback_quote_author') || "Aleksandar Veliki" }; 
        
        if (typeof quotesDb !== 'undefined' && quotesDb.length > 0) {
            const randomQuote = quotesDb[Math.floor(Math.random() * quotesDb.length)];
            quoteData = randomQuote[lang] || randomQuote['sr'];
        }

        const quoteTextEl = document.getElementById('quote-text');
        const quoteAuthorEl = document.getElementById('quote-author');
        
        if (quoteTextEl) quoteTextEl.innerText = `"${quoteData.text}"`;
        if (quoteAuthorEl) quoteAuthorEl.innerText = `– ${quoteData.author}`;

        const container = document.getElementById('quote-anim-container');
        if (container) {
            container.style.animation = 'none';
            void container.offsetWidth; 
            container.style.animation = 'quoteFadeInOut 6s forwards'; 
        }

        this.navigateTo('quote-screen');

        setTimeout(() => {
            if (document.getElementById('quote-screen').classList.contains('active')) {
                this.navigateTo('game-scene');
                
                const chatBtn = document.getElementById('chat-float-btn');
                if (chatBtn && this.modeTag !== "Solo" && this.modeTag !== "Hotseat") {
                    chatBtn.classList.remove('hidden');
                }
            }
        }, 6000); 
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
        
        this.updateStatusLabel();
        
        const btnBacaj = document.getElementById('btn-bacaj'); 
        const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx == this.myOnlineIndex);
        const isLocalGame = !this.onlineMode;

        if(btnBacaj && !this.isSpectator) { 
            if (isMyTurnOnline || isLocalGame) { btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll'); } 
            else { btnBacaj.disabled = true; btnBacaj.innerText = gt('game_opponent_turn'); }
        }
        
        const btnNajava = document.getElementById('btn-najava'); 
        if(btnNajava && !this.isSpectator) { 
            btnNajava.disabled = true; 
            btnNajava.innerText = gt('game_announce'); 
            btnNajava.classList.remove('btn-active-toggle'); 
        }
        
        this.diceBtns.forEach(b => { b.innerHTML = ""; this.features.applySkinToElement(b); }); 
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
            const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx === this.myOnlineIndex) && !this.isSpectator;
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
        this.updateHeaderAvatar();
    }
    
    toggleHold(i) { 
        if (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex) return; 
        if (this.isSpectator) return;
        if (this.brojBacanja === 0) return; 
        if (this.isAnimating) return;

        this.zadrzane[i] = !this.zadrzane[i]; 
        this.updateDiceVisuals(); 
        this.soundMgr.click(); 
        
        this.vibrate(15);
        
        if(this.onlineMode || this.roomId) { 
            this.socket.emit('dice_hold', { roomId: this.roomId, index: i, status: this.zadrzane[i] }); 
        } 

        this.autoSaveGame();
    }
    
    updateDiceVisuals() { 
        this.diceBtns.forEach((b, i) => { 
            if (this.brojBacanja > 0) { 
                b.innerHTML = this.getDiceDotsHTML(this.kockiceVals[i]); 
                this.features.applySkinToElement(b, this.zadrzane[i]);
            } else { 
                b.innerHTML = ""; 
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
            this.diceBtns.forEach((b, i) => { if (!this.zadrzane[i]) b.innerHTML = this.getDiceDotsHTML(Math.floor(Math.random()*6)+1); }); 
            await sleep(40); 
        } 
        
        this.diceBtns.forEach(b => b.classList.remove('rolling')); 
        this.kockiceVals = finalValues; 
        this.updateDiceVisuals(); 
        
        this.isAnimating = false; 
    }
    
    async throwDice() { 
        if (this.isSpectator) return;
        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }

        const btnBacaj = document.getElementById('btn-bacaj'); 
        const isOnlineOpponent = (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex); 

        if (this.brojBacanja >= 3 || isOnlineOpponent) return; 
        if (this.najavaAktivna) { await this.modal.alert(gt('alert_announce_select'), gt('warning_title') || "UPOZORENJE"); return; }
        if (this.isAnimating) return; 

        if(btnBacaj) btnBacaj.disabled = true; 
        try {
            this.soundMgr.roll(); 
            
            this.vibrate(30);

            this.isAnimating = true;

            let newValues = [...this.kockiceVals]; 
            for(let i=0; i<6; i++) { if (!this.zadrzane[i]) newValues[i] = Math.floor(Math.random()*6)+1; } 
            
            if (this.onlineMode || this.roomId) { 
                this.socket.emit('dice_roll', { 
                    roomId: this.roomId, 
                    values: newValues, 
                    bacanje: this.brojBacanja + 1,
                    held: this.zadrzane 
                }); 
            } 
            
            this.diceBtns.forEach((b, i) => { if(!this.zadrzane[i]) b.classList.add('rolling'); }); 
            for(let k=0; k<6; k++) { this.diceBtns.forEach((b, i) => { if (!this.zadrzane[i]) b.innerHTML = this.getDiceDotsHTML(Math.floor(Math.random()*6)+1); }); await sleep(50); } 
            
            this.diceBtns.forEach(b => b.classList.remove('rolling')); 
            this.kockiceVals = newValues; 
            this.brojBacanja++; 
            this.isAnimating = false;

            this.updateStatusLabel();
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
        if (this.isSpectator) return;
        if (this.brojBacanja !== 1) return; 
        
        const btn = document.getElementById('btn-najava'); 
        const btnBacaj = document.getElementById('btn-bacaj'); 

        // --- NOVO: LOGIKA ZA OTKAZIVANJE NAJAVE ---
        if (this.najavljenoPolje) {
            const oldRow = this.najavljenoPolje.row;
            const oldCol = this.najavljenoPolje.col;
            const btnField = document.getElementById(`btn-${this.currentPlayerIdx}-${oldCol}-${oldRow}`);
            if (btnField) btnField.classList.remove('highlight-najava');

            this.najavljenoPolje = null;
            this.najavaAktivna = false;

            btn.innerText = gt('game_announce');
            btn.classList.add('btn-highlight');
            btn.classList.remove('btn-active-toggle');

            if(this.onlineMode || this.roomId) {
                try { this.socket.emit('announce', { roomId: this.roomId, type: 'cancel' }); } catch(e) {}
            }
            
            try { this.soundMgr.click(); } catch(e) {}
            this.vibrate(15);
            this.autoSaveGame();
            return;
        }
        // ------------------------------------------
        
        if (!this.najavaAktivna) { 
            this.najavaAktivna = true; 
            
            try {
                if(this.soundMgr && this.soundMgr.announce) {
                     this.soundMgr.announce(); 
                } else if (this.soundMgr) {
                     this.soundMgr.click();
                }
            } catch(e) {}

            this.vibrate(30);

            btn.innerText = gt('game_announce_cancel'); 
            btn.classList.add('btn-active-toggle'); 
            btn.classList.remove('btn-highlight'); 
            btnBacaj.disabled = true; 
            
            if(this.onlineMode || this.roomId) {
                try { this.socket.emit('announce', { roomId: this.roomId, type: 'start' }); } catch(e){}
            }
        } else { 
            this.najavaAktivna = false; 
            
            try { this.soundMgr.click(); } catch(e) {} 
            
            this.vibrate(15);

            btn.innerText = gt('game_announce'); 
            btn.classList.remove('btn-active-toggle'); 
            btn.classList.add('btn-highlight'); 
            btnBacaj.disabled = false; 
            
            if(this.onlineMode || this.roomId) {
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
        if (this.isSpectator) return false;
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
            btnN.disabled = false; btnN.classList.remove('btn-active-toggle'); // FIX: false
            const btnBacaj = document.getElementById('btn-bacaj'); btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll');
            
            if(this.onlineMode || this.roomId) this.socket.emit('announce', { roomId: this.roomId, type: 'selected', row: row }); 
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
        
        // Uklonjen uslov !this.onlineMode kako bi radilo i za online tokene
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
        if (btnUndo) {
            btnUndo.classList.remove('gh-btn-inactive');
            btnUndo.classList.add('gh-btn-active');
        }

        sheet[col][row] = pts; 
        
        try { this.soundMgr.score(); } catch(e) {}

        if (row === "Yamb" && pts > 0) {
            try {
                this.effectMgr.celebrateYamb();
                if (this.brojBacanja === 1) { this.hasSvetiIlija = true; this.effectMgr.trigger('thunder'); }
                
                this.vibrate([50, 100, 50, 100, 50]);
            } catch(e) {}
        }
        
        try {
            if (this.features && typeof this.features.checkMoveEffects === 'function') {
                this.features.checkMoveEffects(row, pts, true);
            }
        } catch(e) { console.error("Efekti poteza su preskočeni:", e); }

        if (this.onlineMode || this.roomId) { 
            try { this.socket.emit('player_move', { roomId: this.roomId, row, col, points: pts, pIdx: pIdx }); } catch(e) {} 
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
        this.startClientTimer();
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
        localStorage.removeItem('yamb_active_online_room'); // Obrisano jer je igra gotova
        // ---> DODATO: Blokada duplog Game Over-a (Fiks 1) <---
        if (!this.gameActive && !this.isSpectator) {
            console.log("⚠️ Blokirano duplo pokretanje Game Over-a!");
            return;
        }

        console.log("--- GAME OVER ---");

        // ---> DODATO OVDJE: Zaustavljanje muzike na kraju partije <---
        if(this.soundMgr) this.soundMgr.stopMusic();

        if (this.isSpectator) {
            this.gameActive = false;
            if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
            
            this.modal.alert(gt('spectate_ended_msg') || "Partija koju ste gledali je završena.", gt('spectate_ended_title') || "KRAJ PARTIJE").then(() => {
                this.showMainMenu();
            });
            return;
        }

        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }
        this.gameActive = false;

        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }
        
        if(window.adMobGlobal) window.adMobGlobal.prepareReward(); 

        const finalResults = this.players.map((name, i) => { return { name: name, score: this.calculateTotalScore(i) }; }); 
        const winnerScore = finalResults.reduce((max, r) => r.score > max ? r.score : max, 0);

        if(window.localforage) {
            const uid = localStorage.getItem('yamb_uid') || 'guest';
            await localforage.removeItem(`yamb_saved_game_${uid}_${this.players.length}`); 
            await localforage.removeItem('yamb_saved_game'); 
            await localforage.removeItem('yamb_saved_game_' + this.players.length); 
        }
        
        let detectedMode = "Solo";
        if (this.onlineMode) detectedMode = "Online"; else if (this.players.length > 1) detectedMode = "Hotseat";
        
        let myScoreEntry = finalResults.find(r => r.name === this.playerName) || finalResults[0];

        try {
            if (window.kvartalnaLiga && myScoreEntry && myScoreEntry.score > 0) {
                window.kvartalnaLiga.addPoints(myScoreEntry.score);
            }
        } catch(err) {
            console.warn("Greška pri upisu u Kvartalnu Ligu:", err);
        }

        try {
            let saveMode = detectedMode; 
            
            if (this.onlineMode) {
                if (this.roomId && this.roomId.startsWith('tourney_')) {
                    saveMode = 'Turnir';
                } else if (this.roomId && this.roomId.startsWith('yamb-')) {
                    saveMode = 'Prijatelj';
                } else if (this.roomId && this.roomId.startsWith('duel_')) { 
                    saveMode = 'Duel';
                } else {
                    saveMode = 'Online';
                }
            }

            if (myScoreEntry && myScoreEntry.score > 0) {
                const myPhoto = localStorage.getItem('yamb_player_photo') || '';
                await this.safeSubmitScore(this.playerName, myScoreEntry.score, saveMode, myPhoto);
            }

        } catch (err) {
            console.warn("Greška pri slanju na top listu, igra nastavlja dalje:", err);
        }

        if (myScoreEntry) {
             const myIndex = this.players.findIndex(p => p === myScoreEntry.name);
             if (myIndex !== -1 && this.allScores[myIndex]) {
                 try {
                     if (window.trophyManager && typeof window.trophyManager.checkEndGameTrophies === 'function') {
                         let detectedModeForTrophies = this.onlineMode ? "Online" : (this.aiMode ? "AI" : (this.players.length > 1 ? "Hotseat" : "Solo"));
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
             this.rewardClaimed = false;
             this.rewardClaimInProgress = false;
             this.lastGameType = 'normal';
             let resultType = 'solo';
             if (this.players.length > 1) { 
                 const isDraw = (finalResults.every(r => r.score === finalResults[0].score));
                 const winner = [...finalResults].sort((a,b) => b.score - a.score)[0];
                 
                 // FIX: Rešavanje nerešenog rezultata kako se ne bi upisivao lažni poraz
                 if (isDraw) {
                     resultType = 'draw';
                 } else if (winner.name === myScoreEntry.name) {
                     resultType = 'win';
                 } else {
                     resultType = 'loss';
                 }
             }
             
             let finalOppScore = 0;
             if (this.players.length === 2) {
                 const oppIndex = this.players.findIndex(p => p !== myScoreEntry.name);
                 if (oppIndex !== -1) {
                     const oppName = this.players[oppIndex];
                     let oppScoreEntry = finalResults.find(r => r.name === oppName);
                     finalOppScore = oppScoreEntry ? oppScoreEntry.score : 0;
                 }
             }

             this.updateStats(myScoreEntry.score, resultType, finalOppScore, false, { deferServerSync: true });
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
                    }
                }
            }
        } else {
            if (btnRematch) btnRematch.style.display = 'none';
        }

        this.navigateTo('game-over-screen');
    }

    async safeSubmitScore(name, score, mode, photoUrl = undefined) {
        try {
            let finalScore = parseInt(score); if (isNaN(finalScore)) finalScore = 0;
            if(this.topListManager) {
                await this.topListManager.submitScore(name, finalScore, mode, photoUrl);
            }
        } catch(e) {
            console.warn("Nije moguće poslati rezultat u ovom trenutku:", e);
        }
    }

    claimServerGameReward(score, doubled) {
        return new Promise(resolve => {
            if (!this.socket || !this.socket.connected) {
                resolve({ ok: false, reason: 'socket_disconnected', localFallback: true });
                return;
            }

            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'empty_reward_response', permanent: false });
            };
            const timer = setTimeout(() => finish({ ok: false, reason: 'game_reward_timeout', permanent: false }), 7000);

            this.socket.emit('claim_game_reward', {
                score: Math.max(0, parseInt(score) || 0),
                doubled: !!doubled,
                stats: this.getFullLocalStats()
            }, finish);
        });
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
        if (this.rewardClaimed || this.rewardClaimInProgress) return;
        this.rewardClaimInProgress = true;
        const finishRewardClaim = () => {
            this.rewardClaimed = true;
            this.rewardClaimInProgress = false;
            this.pendingScore = 0;
        };
        const syncRewardBalance = async () => {
            if (!this.socket || !this.socket.connected) return;
            try {
                const result = await this.emitPlayerData(false, { waitForSync: true, timeoutMs: 5000 });
                if (result && result.cloudStats && typeof this.applyCloudProfileSync === 'function') {
                    this.applyCloudProfileSync(result.cloudStats);
                }
                if (!result || !result.synced) {
                    console.warn("Dukati su sačuvani lokalno, ali cloud potvrda još nije stigla.");
                }
            } catch (err) {
                console.warn("Cloud potvrda dukata nije uspela:", err);
            }
        };
        const applyServerBalance = (balance) => {
            const safeBalance = Math.max(0, parseInt(balance) || 0);
            localStorage.setItem('yamb_dukati', safeBalance);
            if (window.statsManager) {
                window.statsManager.stats.balance = safeBalance;
                window.statsManager.saveStats();
            }
        };
        const claimNormalGameReward = async (baseScore, wasDoubled) => {
            const result = await this.claimServerGameReward(baseScore, wasDoubled);
            if (result && result.ok && typeof result.balance === 'number') {
                applyServerBalance(result.balance);
                return true;
            }

            if (result && (result.localFallback || !result.permanent)) {
                await syncRewardBalance();
            } else {
                console.warn(`Server nije potvrdio nagradu partije: ${result?.reason || 'unknown_error'}`);
            }
            return false;
        };

        let finalAmount = this.pendingScore;
        
        if (doubled) { 
            this.soundMgr.win(); 
            this.effectMgr.trigger('gold_rain');
            
            if (this.lastGameType === 'daily') {
                const uid = localStorage.getItem('yamb_uid') || this.playerId;
                const today = new Date().toDateString();
                let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
                currentDukati += finalAmount;
                localStorage.setItem('yamb_dukati', currentDukati);
                localStorage.setItem('yamb_daily_reward_claimed_' + uid, today);
                localStorage.setItem('yamb_daily_reward_amount_' + uid, String(finalAmount));

                if (window.statsManager) {
                    window.statsManager.stats.balance = currentDukati;
                    window.statsManager.saveStats();
                }

                await syncRewardBalance();

                finishRewardClaim();
                this.modal.alert(`${gt('msg_reward_doubled')} 💰 ${finalAmount * 2}`, gt('modal_title_reward')).then(() => { this.effectMgr.stop(); this.showMainMenu(); });
                return;
            } else {
                finalAmount *= 2;
            }
        } else {
            if (this.lastGameType === 'daily') {
                finishRewardClaim();
                this.showMainMenu();
                return;
            }
        }
        
        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        currentDukati += finalAmount;
        localStorage.setItem('yamb_dukati', currentDukati);
        if (window.statsManager) { window.statsManager.stats.balance = currentDukati; window.statsManager.saveStats(); }

        await claimNormalGameReward(this.pendingScore, doubled);

        if (window.kvartalnaLiga) {
            window.kvartalnaLiga.syncWithServer();
        }

        finishRewardClaim();
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
                        
                        const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx === this.myOnlineIndex) && !this.isSpectator; 
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
        // Provera za prekinut online duel
        const activeOnlineRoom = localStorage.getItem('yamb_active_online_room');
        
        if (activeOnlineRoom) {
            this.initSocketConnection();

            const checkRoom = () => {
                this.socket.emit('check_room_status', { roomId: activeOnlineRoom });
            };

            if (this.socket && this.socket.connected) {
                checkRoom();
            } else {
                this.socket.once('connect', checkRoom);
            }
        }
    }

    resumeOnlineGame(roomId) {
        this.onlineMode = true;
        this.gameActive = true;
        this.roomId = roomId;
        this.modeTag = "Online";
        this.isSpectator = false;
        
        // Privremena imena dok ne stignu prava sa servera
        this.players = [this.playerName, "Protivnik"]; 
        this.initScores();
        
        // ---> FIX: Iscrtavanje table unapred kako ne bi bila prazna <---
        this.createScoreTables();
        this.updateTableVisuals();
        this.highlightCurrentPlayer();
        
        this.navigateTo('game-scene');
        
        const lblTurn = document.getElementById('lbl-turn');
        if (lblTurn) lblTurn.innerText = "Vraćanje u igru...";
        
        this.initSocketConnection();

        // 1. DODATO: Palimo "uši" klijenta da bi mogao da čuje odgovor servera!
        this.setupSocketListeners(this.playerName || "Igrač");
        
        // 2. DODATO: Šaljemo serveru koji je roomId za slučaj da postoji mikro-delay
        const doSync = () => {
            this.socket.emit('request_state_sync', { roomId: this.roomId });
        };
        
        if (this.socket && this.socket.connected) {
            doSync();
        } else {
            this.socket.once('connect', doSync);
        }
    }
    
    async autoSaveGame() { 
        if(this.onlineMode) return; 

        if(!this.gameActive) return;

        if (this._saveTimeout) clearTimeout(this._saveTimeout);

        this._saveTimeout = setTimeout(async () => {
            if(!this.gameActive) return;

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
                const uid = localStorage.getItem('yamb_uid') || 'guest';
                if(window.localforage) await localforage.setItem(`yamb_saved_game_${uid}_${this.players.length}`, data); 
            } catch(e) { console.warn("Greška pri čuvanju:", e); }
        }, 800);
    }
    
    async loadSavedGame(numPlayers = this.pendingNewGamePlayers) { 
        const uid = localStorage.getItem('yamb_uid') || 'guest';
        const saveKey = `yamb_saved_game_${uid}_${numPlayers}`;

        try { 
            const data = await localforage.getItem(saveKey); 
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

            this.roomId = "local_" + Math.random().toString(36).substring(2, 10);

            this.initSocketConnection();
            this.setupSocketListeners(this.playerName);

            if (this.socket && this.socket.connected) {
                this.socket.emit('start_local_game', this.roomId);
            } else if (this.socket) {
                this.socket.once('connect', () => {
                    this.socket.emit('start_local_game', this.roomId);
                });
            }

            this.lastMoveSnapshot = null;
            const btnUndo = document.getElementById('btn-undo-move');
            if (btnUndo) {
                btnUndo.classList.add('gh-btn-inactive');
                btnUndo.classList.remove('gh-btn-active');
            }

            this.showQuoteAndProceed(); 
            
            this.createScoreTables(); 
            this.gameActive = true; 
            this.lastGameType = 'normal';
            document.getElementById('chat-body').innerHTML = ""; 
            const chatBtn = document.getElementById('chat-float-btn'); 
            if (chatBtn) chatBtn.classList.add('hidden'); 
            this.effectMgr.stop(); this.loadEquippedEffect(); 
            
            this.highlightCurrentPlayer(); 
            this.updateTableVisuals(); 
            
            this.updateStatusLabel();

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
            if (window.localforage) localforage.removeItem(saveKey); 
        } 
    }

    // --- UNDO MENU & TOKENS (Delegati za vracanjeupisa.js) ---
    
    openUndoMenu() {
        if (this.undoManager) this.undoManager.openMenu();
    }

    closeUndoMenu() {
        if (this.undoManager) this.undoManager.closeMenu();
    }

    async buyUndoTokens(type) {
        if (this.undoManager) await this.undoManager.buyTokens(type);
    }

    addUndoTokens(amount) {
        if (this.undoManager) this.undoManager.addTokens(amount);
    }

    async undoLastMove() {
        if (this.undoManager) await this.undoManager.executeUndo();
    }

    showQuarterWinnerModal(data) {
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.playerName)}&background=333&color=FFD700`;
        const photo = data.photoUrl && data.photoUrl.length > 5 ? data.photoUrl : defaultAvatar;
        
        let title = gt('league_champion_title') || "🏆 ŠAMPION LIGE 🏆";
        let subText = (gt('league_winner_q') || "Pobednik za Q{0} / {1}.").replace('{0}', data.quarter).replace('{1}', data.year);
        let congratsText = gt('league_congrats') || "Čestitamo na osvajanju Kvartalne lige!<br>Nova sezona je počela, srećno svima!";
        let btnText = gt('btn_continue') || "NASTAVI";
        
        if(this.soundMgr) this.soundMgr.win(); 
        if(this.effectMgr) this.effectMgr.trigger('confetti');

        let modalHtml = `
        <div id="winner-modal-overlay" class="modal-overlay" style="z-index: 9999999; display: flex;">
            <div class="modal-box" style="text-align: center; padding: 30px 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.15); border-left: 1px solid rgba(255, 255, 255, 0.08); max-width: 400px; width: 90%; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <h2 style="color: var(--gold-main); font-size: 1.8rem; margin-top: 0; margin-bottom: 5px; text-transform: uppercase;">${title}</h2>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 20px; text-transform: uppercase;">${subText}</p>
                
                <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 15px auto;">
                    <img src="${photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 3px solid var(--gold-main); box-shadow: 0 0 15px var(--gold-main);">
                    <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: var(--gold-main); color: #000; padding: 2px 10px; border-radius: 10px; font-weight: 900; font-size: 0.8rem; letter-spacing: 1px;">MVP</div>
                </div>
                
                <h3 style="color: #fff; font-size: 1.5rem; margin-bottom: 5px;">${data.playerName}</h3>
                <p style="color: var(--gold-main); font-size: 1.2rem; font-weight: bold; margin-bottom: 25px;">${data.score} PTS</p>
                
                <p style="color: #ddd; font-size: 0.95rem; margin-bottom: 25px; line-height: 1.4;">
                    ${congratsText}
                </p>
                
                <button class="btn-menu btn-primary" onclick="document.getElementById('winner-modal-overlay').remove(); app.effectMgr.stop();" style="width: 100%;">${btnText}</button>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
}

window.app = new YambApp();
if (typeof DnevniIzazov !== 'undefined') {
    window.dnevniIzazov = new DnevniIzazov(window.app);
}
