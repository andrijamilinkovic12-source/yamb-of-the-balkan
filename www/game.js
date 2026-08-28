// game.js - MAIN GAME LOGIC (STRICT AUTHENTICATION + NO GUEST MODE + TOURNAMENT + ANTI-SPAM CHAT + LIVE CALENDAR + FULL CLOUD SAVE + ERROR HANDLING + POWER INDEX + VS MATCHMAKING SCREEN + FRIENDS SYSTEM + AVATAR SYNC + AUTO REFRESH ONLINE STATUS + REJECT FRIEND SYNC + FRIEND REQUEST CARDS + STATE SYNC + ANTI TROLL TIMER + RAGE QUIT PUNISHMENT + SPECTATOR MODE + LOCAL ROOM SYNC + MULTI-SAVE MODE PER ACCOUNT + QUARTERLY REWARDS + PREVIOUS QUARTER WINNER + H2H STATS SPLIT UI + H2H WIN STREAK FIX + CORRECT TIMEOUT REWARDS + EXPLOIT FIX FOR ECONOMY/LEADERBOARD + ONLINE UNDO TOKENS + NAJAVA CANCEL FIX + GRACE PERIOD + ANTI-DESYNC DEADLOCK FIX)

/* --- POMOĆNE FUNKCIJE --- */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const TOURNEY_FINAL_WINNER_REWARD = 44000;
const TOURNEY_FINAL_RUNNER_UP_REWARD = 5500;

// STRIKTNO PRAVILO: Samo Google nalozi (Nema generisanja usr_ ID-a)
function getPlayerId() {
    const uid = localStorage.getItem('yamb_uid') ||
        (window.yambAuthState && window.yambAuthState.uid) ||
        null;
    if (!uid || uid === 'undefined' || uid === 'null') return null;
    return uid;
}

const gt = (key) => {
    if (typeof t === 'function') return t(key);
    return key; 
};

function getFallbackPlayerName() {
    const name = gt('player_guest');
    return name && name !== 'player_guest' ? name : 'Igrač';
}

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
        this.friendProfilesByUid = new Map();
        this.publicPlayerPowerCache = new Map();
        this.pendingPublicPlayerPower = new Set();
        this.localGameElapsedMs = 0;
        this.localGameActiveStartedAt = 0;
        this.localGameSessionToken = '';
        
        this.socket = null; 
        this.socketVerifiedUid = null;
        this.authRetryInProgress = false;
        this.onlineMode = false; 
        this.isSpectator = false; 
        this.roomId = null;
        this.myOnlineIndex = 0;
        this.onlineDuelType = null;
        this.lastOnlineGameResult = null;
        this.onlineGameOverDelayMs = 3000;
        this.onlineGameOverDelayActive = false;
        this.onlineGameOverDelayTimer = null;
        this.onlineGameOverCountdownTimer = null;
        this.onlineGameOverDelayDeadline = 0;
        this.onlineGameOverFinishInProgress = false;
        this.spectateSyncRetryTimer = null;
        this.spectateSyncRetryAttempts = 0;
        this.tournamentFinalCeremonyActive = false;
        this.tournamentFinalCeremonySeenAt = 0;
        this.tournamentFinalCeremonySeenRole = '';
        this.tournamentFinalCeremonyTimer = null;
        this.tournamentFinalCeremonyCountdownTimer = null;
        this.tournamentFinalWinnerSubmittedRooms = new Set();
        this.onlineRecoveryPromptOpen = false;
        this.localRecoveryPromptOpen = false;
        this.onlineUsersCount = 1; 
        this.isAnimating = false;
        this.easterRoomIntroPlaying = false;
        this.themeLoadingToken = 0;
        this.themeLoadingHideTimer = null;
        this.themeManualSwitchUntil = 0;
        this.skinManualSwitchUntil = 0;
        this.dualBoardLastFollowedPlayerIdx = null;
        this.onlineRollPending = false;
        this.onlineTurnTimerPaused = false;
        this.opponentReconnectGraceTimer = null;
        this.opponentReconnectGraceDeadline = 0;
        this.currentHostingRoomId = null;
        this.waitingHofPeriod = 'weekly';
        this.waitingHofInterval = null;
        this.settingsSyncTimer = null;
        this.matchResultSyncPromise = null;
        
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
        if(this.soundMgr) {
            this.soundMgr.enabled = this.soundEnabled;
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen && splashScreen.classList.contains('active')) {
                this.soundMgr.playIntro();
            }
        }

        // NOVO: Podrška za vibraciju
        const savedVib = localStorage.getItem('yamb_vibration');
        this.vibrationEnabled = savedVib !== 'false'; // Podrazumevano uključeno
        
        let freshStats = this.readLocalJson('yamb_stats', null);
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
        const rememberedSplashTheme = localStorage.getItem('yamb_last_theme') || savedTheme;
        const startupTheme = this.playerId
            ? (this.isThemeUnlocked(savedTheme) ? savedTheme : 'dark')
            : (this.getValidThemeIds().includes(rememberedSplashTheme) ? rememberedSplashTheme : 'dark');
        if (this.playerId && startupTheme !== savedTheme) localStorage.setItem('yamb_theme', startupTheme);
        this.applyTheme(startupTheme, { initialLoad: true });
        
        this.initSocketConnection();

        if (window.Capacitor) {
            window.Capacitor.Plugins.App.addListener('appUrlOpen', async (data) => {
                try {
                    const url = new URL(data.url);
                    const roomId = url.searchParams.get('room');
                    if (roomId) {
                        if (this.isDoNotDisturbActive()) return;
                        this.inviteDetected = true;
                        if (!this.requireLogin()) return; // Gosti ne mogu prihvatiti poziv
                        const rewardReady = await this.claimPendingRewardBeforeExternalNavigation();
                        if (!rewardReady) return;

                        if (this.splashTimeout) { clearTimeout(this.splashTimeout); this.splashTimeout = null; }
                        this.navigateTo('splash-screen');
                        setTimeout(() => { this.joinPrivateGame(this.playerName, roomId); }, 800);
                    }
                } catch (err) { console.error("Link error:", err); }
            });
        }

        document.addEventListener("pause", () => { this.handleAppPause(); }, false);
        document.addEventListener("resume", () => { setTimeout(() => { this.handleAppResume(); }, 500); }, false);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'hidden') {
                this.handleAppPause();
            } else if (document.visibilityState === 'visible') {
                setTimeout(() => { this.handleAppResume(); }, 500);
            }
        });
        window.addEventListener('pagehide', () => { this.handleAppPause(); });
        window.addEventListener('beforeunload', () => { this.handleAppPause(); });

        setTimeout(() => { this.handleAppResume(); }, 500);

        this.handleRotationLock();
        window.addEventListener('resize', () => this.handleRotationLock());
        window.addEventListener('orientationchange', () => this.handleRotationLock());

        this.uiInit();
        this.syncBalance();
    }

    initUndoManager() {
        if (typeof UndoManager !== 'undefined') {
            this.undoManager = new UndoManager(this);
            window.undoManager = this.undoManager;
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

    getDailyChallengeDayKey(date = new Date()) {
        return window.YambDailyDate?.getDayKey
            ? window.YambDailyDate.getDayKey(date)
            : date.toISOString().slice(0, 10);
    }

    getLegacyDailyChallengeDayKey(date = new Date()) {
        return window.YambDailyDate?.getLegacyDayKey
            ? window.YambDailyDate.getLegacyDayKey(date)
            : date.toDateString();
    }

    isDailyChallengeDay(value, date = new Date()) {
        return window.YambDailyDate?.isToday
            ? window.YambDailyDate.isToday(value, date)
            : value === this.getDailyChallengeDayKey(date) || value === this.getLegacyDailyChallengeDayKey(date);
    }

    normalizeDailyChallengeDay(value, date = new Date()) {
        if (!value) return "";
        return this.isDailyChallengeDay(value, date) ? this.getDailyChallengeDayKey(date) : value;
    }

    h2hMatchLabel(count) {
        const safeCount = Math.max(0, parseInt(count, 10) || 0);
        const lang = localStorage.getItem('yamb_lang') || 'sr';

        if (lang === 'en') {
            return safeCount === 1
                ? (gt('stat_match_one') || 'match')
                : (gt('stat_match_many') || gt('stat_matches') || 'matches');
        }

        const lastTwo = safeCount % 100;
        const lastOne = safeCount % 10;
        if (lastOne === 1 && lastTwo !== 11) return gt('stat_match_one') || 'meč';
        if (lastOne >= 2 && lastOne <= 4 && (lastTwo < 12 || lastTwo > 14)) return gt('stat_match_few') || 'meča';
        return gt('stat_match_many') || gt('stat_matches') || 'mečeva';
    }

    h2hMatchText(count) {
        const safeCount = Math.max(0, parseInt(count, 10) || 0);
        return `${safeCount} ${this.h2hMatchLabel(safeCount)}`;
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
        
        if(this.soundEnabled) {
            this.soundMgr.click();
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen && splashScreen.classList.contains('active') && this.soundMgr.playIntro) {
                this.soundMgr.playIntro();
            }
        } else if (this.soundMgr && this.soundMgr.stopIntro) {
            this.soundMgr.stopIntro();
        }
        
        const mainSetting = document.getElementById('setting-sound');
        if (mainSetting) mainSetting.checked = this.soundEnabled;
        this.syncProfileSettingsToCloud();
    }

    toggleQuickVib() {
        this.vibrationEnabled = !this.vibrationEnabled;
        localStorage.setItem('yamb_vibration', this.vibrationEnabled);
        
        const btn = document.getElementById('btn-gh-vib');
        if(btn) btn.innerText = this.vibrationEnabled ? '📳' : '📴';
        
        if(this.vibrationEnabled) this.vibrate(30);

        const mainSetting = document.getElementById('setting-vibration');
        if (mainSetting) mainSetting.checked = this.vibrationEnabled;
        this.syncProfileSettingsToCloud();
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
        this.syncProfileSettingsToCloud();
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
        this.syncProfileSettingsToCloud();
    }

    syncProfileSettingsToCloud(delayMs = 350) {
        if (!getPlayerId()) return;
        if (!this.socket || !this.socket.connected) return;

        if (this.settingsSyncTimer) clearTimeout(this.settingsSyncTimer);
        this.settingsSyncTimer = setTimeout(() => {
            this.settingsSyncTimer = null;
            this.emitPlayerData(false).catch(err => {
                console.warn("Podešavanja nisu odmah sinhronizovana:", err);
            });
        }, delayMs);
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
        const unlockedThemes = this.getUnlockedThemeIds();

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

    normalizeH2HDisplayName(value) {
        const name = String(value || '').trim();
        if (!name || name === 'undefined' || name === 'null' || name === 'Nepoznat' || name === 'Sistem') return '';
        return name;
    }

    normalizeH2HNameKey(value) {
        return this.normalizeH2HDisplayName(value)
            .toLowerCase()
            .replace(/\./g, '_')
            .replace(/\$/g, '_')
            .replace(/\s+/g, '_');
    }

    isGuestH2HName(value) {
        const key = this.normalizeH2HNameKey(value);
        return key === 'gost' ||
            key.startsWith('gost_') ||
            key === 'guest' ||
            key.startsWith('guest_');
    }

    getH2HRecordParts(record = {}, fallbackStats = null) {
        const count = (value) => Math.max(0, parseInt(value, 10) || 0);
        return {
            wins: record.wins !== undefined ? count(record.wins) : count(fallbackStats && fallbackStats.h2hWins),
            draws: record.draws !== undefined ? count(record.draws) : count(fallbackStats && fallbackStats.h2hDraws),
            losses: record.losses !== undefined ? count(record.losses) : count(fallbackStats && fallbackStats.h2hLosses)
        };
    }

    formatH2HRecordLine(record = {}, fallbackStats = null) {
        const { wins, draws, losses } = this.getH2HRecordParts(record, fallbackStats);
        return `${wins} / ${draws} / ${losses}`;
    }

    renderWaitingH2HRecord(player, record = {}, fallbackStats = null) {
        const { wins, draws, losses } = this.getH2HRecordParts(record, fallbackStats);
        const summary = document.getElementById(`waiting-${player}-wl`);
        const winsEl = document.getElementById(`waiting-${player}-wins`);
        const drawsEl = document.getElementById(`waiting-${player}-draws`);
        const lossesEl = document.getElementById(`waiting-${player}-losses`);

        if (summary) summary.textContent = `${wins} / ${draws} / ${losses}`;
        if (winsEl) winsEl.textContent = wins;
        if (drawsEl) drawsEl.textContent = draws;
        if (lossesEl) lossesEl.textContent = losses;
    }

    getCurrentPlayerUid() {
        return String(this.playerId || localStorage.getItem('yamb_uid') || '').trim();
    }

    isUsableH2HUid(value) {
        const uid = String(value || '').trim();
        const myUid = this.getCurrentPlayerUid();
        return !!uid &&
            uid !== myUid &&
            uid !== 'undefined' &&
            uid !== 'null' &&
            !uid.startsWith('guest_') &&
            uid.length >= 16 &&
            !/\s/.test(uid);
    }

    mergeH2HRecord(base = {}, incoming = {}, identity = {}, options = {}) {
        const count = (value) => Math.max(0, parseInt(value) || 0);
        const baseTotal = count(base.wins) + count(base.losses) + count(base.draws);
        const incomingTotal = count(incoming.wins) + count(incoming.losses) + count(incoming.draws);
        const baseContainsIncoming = count(base.wins) >= count(incoming.wins) &&
            count(base.losses) >= count(incoming.losses) &&
            count(base.draws) >= count(incoming.draws) &&
            count(base.gamesWithScore) >= count(incoming.gamesWithScore) &&
            count(base.myTotalScore) >= count(incoming.myTotalScore);
        const incomingContainsBase = count(incoming.wins) >= count(base.wins) &&
            count(incoming.losses) >= count(base.losses) &&
            count(incoming.draws) >= count(base.draws) &&
            count(incoming.gamesWithScore) >= count(base.gamesWithScore) &&
            count(incoming.myTotalScore) >= count(base.myTotalScore);
        const combineCounts = !!options.combineCounts &&
            baseTotal > 0 &&
            incomingTotal > 0 &&
            !baseContainsIncoming &&
            !incomingContainsBase;
        const currentWinStreak = options.preferIncomingCurrentWinStreak
            ? count(incoming.currentWinStreak)
            : (incomingTotal > baseTotal
                ? count(incoming.currentWinStreak)
                : (baseTotal > incomingTotal
                    ? count(base.currentWinStreak)
                    : Math.max(count(base.currentWinStreak), count(incoming.currentWinStreak))));
        const maxWinStreak = Math.max(
            count(base.maxWinStreak),
            count(incoming.maxWinStreak),
            currentWinStreak
        );
        const merged = {
            ...base,
            ...incoming,
            name: identity.name || this.normalizeH2HDisplayName(incoming.name || base.name),
            uid: identity.uid || incoming.uid || base.uid || '',
            photo: (incoming.photo && incoming.photo.length > 5) ? incoming.photo : (base.photo || ''),
            wins: combineCounts ? count(base.wins) + count(incoming.wins) : Math.max(count(base.wins), count(incoming.wins)),
            losses: combineCounts ? count(base.losses) + count(incoming.losses) : Math.max(count(base.losses), count(incoming.losses)),
            draws: combineCounts ? count(base.draws) + count(incoming.draws) : Math.max(count(base.draws), count(incoming.draws)),
            myTotalScore: combineCounts ? count(base.myTotalScore) + count(incoming.myTotalScore) : Math.max(count(base.myTotalScore), count(incoming.myTotalScore)),
            gamesWithScore: combineCounts ? count(base.gamesWithScore) + count(incoming.gamesWithScore) : Math.max(count(base.gamesWithScore), count(incoming.gamesWithScore)),
            myHighScore: Math.max(count(base.myHighScore), count(incoming.myHighScore)),
            maxWinMargin: Math.max(count(base.maxWinMargin), count(incoming.maxWinMargin)),
            maxLossMargin: Math.max(count(base.maxLossMargin), count(incoming.maxLossMargin)),
            currentWinStreak,
            maxWinStreak
        };
        return merged;
    }

    getH2HIdentity(oppName, oppUid = null, existingH2H = {}) {
        const name = this.normalizeH2HDisplayName(oppName);
        const rawUid = String(oppUid || '').trim();
        if (!name || this.isGuestH2HName(name) || rawUid.startsWith('guest_') || name.includes(gt('player_guest'))) return null;

        const myUid = this.getCurrentPlayerUid();
        if (rawUid && myUid && rawUid === myUid) return null;
        const myNameKey = this.normalizeH2HNameKey(this.playerName || localStorage.getItem('yamb_player_name') || '');
        if (!rawUid && myNameKey && this.normalizeH2HNameKey(name) === myNameKey) return null;

        let uid = this.isUsableH2HUid(oppUid) ? String(oppUid).trim() : '';
        const oppNameKey = this.normalizeH2HNameKey(name);

        if (!uid) {
            for (const [key, record] of Object.entries(existingH2H || {})) {
                if (!record || typeof record !== 'object') continue;
                const recordNameKey = this.normalizeH2HNameKey(record.name);
                const recordUid = this.isUsableH2HUid(record.uid) ? String(record.uid).trim() : (this.isUsableH2HUid(key) ? String(key).trim() : '');
                if (recordNameKey && recordNameKey === oppNameKey && recordUid) {
                    uid = recordUid;
                    break;
                }
            }
        }

        if (!uid && oppNameKey && myNameKey && oppNameKey === myNameKey) return null;

        return {
            key: uid || `name_${oppNameKey}`,
            name,
            uid
        };
    }

    normalizeH2HStats(h2hStats = {}) {
        const normalized = {};
        if (!h2hStats || typeof h2hStats !== 'object') return normalized;

        for (const [rawKey, rawRecord] of Object.entries(h2hStats)) {
            if (!rawRecord || typeof rawRecord !== 'object') continue;
            const rawKeyUid = this.isUsableH2HUid(rawKey) ? rawKey : '';
            const identity = this.getH2HIdentity(rawRecord.name || rawKey, rawRecord.uid || rawKeyUid, normalized);
            if (!identity) continue;

            let targetKey = identity.key;
            for (const [existingKey, existingRecord] of Object.entries(normalized)) {
                if (existingKey === targetKey || !existingRecord) continue;
                const sameName = this.normalizeH2HNameKey(existingRecord.name) === this.normalizeH2HNameKey(identity.name);
                if (!sameName) continue;

                const existingUid = this.isUsableH2HUid(existingRecord.uid) ? existingRecord.uid : (this.isUsableH2HUid(existingKey) ? existingKey : '');
                if (identity.uid && existingUid && identity.uid !== existingUid) continue;
                if (identity.uid || existingUid) {
                    targetKey = identity.uid || existingUid;
                    identity.uid = identity.uid || existingUid;
                }

                normalized[targetKey] = this.mergeH2HRecord(normalized[targetKey], existingRecord, identity, { combineCounts: true });
                delete normalized[existingKey];
            }

            const cleanRecord = {
                ...rawRecord,
                name: identity.name,
                uid: identity.uid || rawRecord.uid || ''
            };
            normalized[targetKey] = this.mergeH2HRecord(normalized[targetKey], cleanRecord, identity, { combineCounts: true });
        }

        return normalized;
    }

    updateH2HStats(oppName, oppPhoto, resultType, myScore = 0, oppScore = 0, oppUid = null) {
        if (this.isSpectator) return;

        const safeScore = (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
        };
        const safeMyScore = safeScore(myScore);
        const safeOppScore = safeScore(oppScore);

        let h2h = this.normalizeH2HStats(this.readLocalJson('yamb_h2h_stats', {}));
        const identity = this.getH2HIdentity(oppName, oppUid, h2h);
        if (!identity) return;
        const h2hKey = identity.key;

        if (!h2h[h2hKey]) {
            h2h[h2hKey] = {
                name: identity.name,
                uid: identity.uid || '',
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
            h2h[h2hKey].name = identity.name;
            if (identity.uid && !h2h[h2hKey].uid) h2h[h2hKey].uid = identity.uid;
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

        if (safeMyScore > 0 || safeOppScore > 0) {
            h2h[h2hKey].myTotalScore = (h2h[h2hKey].myTotalScore || 0) + safeMyScore;
            h2h[h2hKey].gamesWithScore = (h2h[h2hKey].gamesWithScore || 0) + 1;

            if (safeMyScore > (h2h[h2hKey].myHighScore || 0)) {
                h2h[h2hKey].myHighScore = safeMyScore;
            }

            let margin = safeMyScore - safeOppScore;
            if (resultType === 'win' && margin > (h2h[h2hKey].maxWinMargin || 0)) {
                h2h[h2hKey].maxWinMargin = margin;
            } else if (resultType === 'loss' && (safeOppScore - safeMyScore) > (h2h[h2hKey].maxLossMargin || 0)) {
                h2h[h2hKey].maxLossMargin = (safeOppScore - safeMyScore);
            }
        }

        localStorage.setItem('yamb_h2h_stats', JSON.stringify(this.normalizeH2HStats(h2h)));
    }

    renderH2HStats() {
        const container = document.getElementById('h2h-list-container');
        if (!container) return;

        const rawH2H = this.readLocalJson('yamb_h2h_stats', {});
        const h2h = this.normalizeH2HStats(rawH2H);
        if (JSON.stringify(rawH2H) !== JSON.stringify(h2h)) {
            localStorage.setItem('yamb_h2h_stats', JSON.stringify(h2h));
        }

        let rivals = Object.values(h2h).filter(r => (
            r &&
            r.name &&
            String(r.name) !== 'undefined' &&
            String(r.name) !== 'null'
        ));

        if (rivals.length === 0) {
            const activeStatsTheme = localStorage.getItem('yamb_theme') || 'dark';
            const statsTheme = activeStatsTheme === 'severna' ? 'severna' : (activeStatsTheme === 'desert' ? 'desert' : 'easter');
            const h2hEmptyIcon = statsTheme === 'severna'
                ? 'assets/severna-soft-clay/statistics/h2h-empty-v10.png?v=1'
                : `assets/${statsTheme}-soft-clay/statistics/h2h-empty.png?v=2`;
            container.innerHTML = `<div class="h2h-empty-state"><img class="h2h-empty-soft-clay-icon" src="${h2hEmptyIcon}" alt="" aria-hidden="true"><span>${this.escapeHtml(gt('stat_h2h_empty') || "Nema odigranih duela...")}</span></div>`;
            return;
        }

        const toSafeCount = (value) => Math.max(0, parseInt(value) || 0);
        const sec = window.YambSecurity;
        const safeAttr = (value) => sec && typeof sec.escapeAttr === 'function'
            ? sec.escapeAttr(value)
            : this.escapeHtml(value);
        const safeUrl = (value, fallback) => sec && typeof sec.safeUrl === 'function'
            ? sec.safeUrl(value, fallback)
            : (value || fallback);
        const avatarFallback = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Igrac')}&background=333&color=E0C995`;
        const avatarFor = (name, photo) => {
            const fallback = avatarFallback(name);
            const rawAvatar = photo && String(photo).length > 5 ? photo : fallback;
            return safeAttr(safeUrl(rawAvatar, fallback));
        };

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

        let html = '';
        rivals.forEach((r, index) => {
            const total = r.wins + r.losses + r.draws;
            const safeOppName = this.escapeHtml(r.name || 'Igrac');
            const oppAvatar = avatarFor(r.name, r.photo);
            const safeMatchText = this.escapeHtml(this.h2hMatchText(total));
            const safeWinShort = this.escapeHtml(gt('h2h_wins_short') || 'W');
            const safeLossShort = this.escapeHtml(gt('h2h_losses_short') || 'L');
            const safeDrawShort = this.escapeHtml(gt('h2h_draws_short') || 'D');
            const recordParts = [
                `<span class="w-color">${r.wins} ${safeWinShort}</span>`
            ];
            if (r.draws > 0) recordParts.push(`<span class="c-gold">${r.draws} ${safeDrawShort}</span>`);
            recordParts.push(`<span class="l-color">${r.losses} ${safeLossShort}</span>`);

            html += `
            <button type="button" class="h2h-rival-tile" data-h2h-index="${index}" aria-label="${safeOppName}">
                <span class="h2h-rival-avatar-wrap">
                    <img src="${oppAvatar}" class="h2h-rival-avatar" alt="${safeOppName}" loading="lazy">
                    <span class="h2h-rival-count">${total}</span>
                </span>
                <span class="h2h-rival-name">${safeOppName}</span>
                <span class="h2h-rival-record">${recordParts.join(' / ')}</span>
                <span class="h2h-rival-matches">${safeMatchText}</span>
            </button>`;
        });

        container.innerHTML = html;
        container.querySelectorAll('.h2h-rival-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                const index = parseInt(tile.dataset.h2hIndex, 10);
                this.openH2HDetail(rivals[index], tile);
            });
        });
    }

    ensureH2HDetailModal() {
        let modal = document.getElementById('h2h-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'h2h-detail-modal';
            modal.className = 'h2h-detail-modal';
            modal.setAttribute('aria-hidden', 'true');
            modal.innerHTML = `
                <button type="button" class="h2h-detail-backdrop" aria-label="${this.escapeHtml(gt('aria_close_h2h') || 'Zatvori H2H statistiku')}"></button>
                <div class="h2h-detail-card" role="dialog" aria-modal="true" aria-labelledby="h2h-detail-title">
                    <button type="button" class="h2h-detail-close" aria-label="${this.escapeHtml(gt('aria_close_h2h') || 'Zatvori H2H statistiku')}">×</button>
                    <div id="h2h-detail-content"></div>
                </div>`;
            document.body.appendChild(modal);
        }

        if (!modal.dataset.bound) {
            const backdrop = modal.querySelector('.h2h-detail-backdrop');
            const closeBtn = modal.querySelector('.h2h-detail-close');
            if (backdrop) backdrop.addEventListener('click', () => this.closeH2HDetail());
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeH2HDetail());
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && modal.classList.contains('active')) {
                    this.closeH2HDetail();
                }
            });
            modal.dataset.bound = 'true';
        }

        return modal;
    }

    openH2HDetail(record, triggerEl = null) {
        if (!record) return;

        const toSafeCount = (value) => Math.max(0, parseInt(value) || 0);
        const modal = this.ensureH2HDetailModal();
        const content = document.getElementById('h2h-detail-content');
        if (!content) return;

        const sec = window.YambSecurity;
        const safeAttr = (value) => sec && typeof sec.escapeAttr === 'function'
            ? sec.escapeAttr(value)
            : this.escapeHtml(value);
        const safeUrl = (value, fallback) => sec && typeof sec.safeUrl === 'function'
            ? sec.safeUrl(value, fallback)
            : (value || fallback);
        const avatarFallback = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Igrac')}&background=333&color=E0C995`;
        const avatarFor = (name, photo) => {
            const fallback = avatarFallback(name);
            const rawAvatar = photo && String(photo).length > 5 ? photo : fallback;
            return safeAttr(safeUrl(rawAvatar, fallback));
        };

        const r = {
            ...record,
            wins: toSafeCount(record.wins),
            losses: toSafeCount(record.losses),
            draws: toSafeCount(record.draws),
            myTotalScore: toSafeCount(record.myTotalScore),
            gamesWithScore: toSafeCount(record.gamesWithScore),
            myHighScore: toSafeCount(record.myHighScore),
            maxWinMargin: toSafeCount(record.maxWinMargin),
            maxLossMargin: toSafeCount(record.maxLossMargin),
            currentWinStreak: toSafeCount(record.currentWinStreak),
            maxWinStreak: toSafeCount(record.maxWinStreak)
        };

        const myName = this.playerName || gt('h2h_me') || 'Ja';
        const oppName = r.name || 'Igrac';
        const total = r.wins + r.losses + r.draws;
        const winPct = total > 0 ? Math.round((r.wins / total) * 100) : 0;
        const drawPct = total > 0 ? Math.round((r.draws / total) * 100) : 0;
        const lossPct = total > 0 ? Math.max(0, 100 - winPct - drawPct) : 0;
        const avg = r.gamesWithScore > 0 ? Math.round((r.myTotalScore || 0) / r.gamesWithScore) : 0;
        const myAvatar = avatarFor(myName, localStorage.getItem('yamb_player_photo') || '');
        const oppAvatar = avatarFor(oppName, r.photo);
        const safeMyName = this.escapeHtml(myName);
        const safeOppName = this.escapeHtml(oppName);
        const matchText = this.escapeHtml(this.h2hMatchText(total));
        const winShort = this.escapeHtml(gt('h2h_wins_short') || 'W');
        const lossShort = this.escapeHtml(gt('h2h_losses_short') || 'L');
        const maxShort = this.escapeHtml(gt('h2h_max_short') || 'Max');
        const shareLabel = this.escapeHtml(gt('h2h_share_btn') || 'Podeli karticu');
        const shareAria = this.escapeHtml(gt('h2h_share_aria') || gt('h2h_share_btn') || 'Podeli karticu');

        this.currentH2HShareData = {
            ...r,
            myName,
            oppName,
            total,
            matchText: this.h2hMatchText(total),
            winPct,
            drawPct,
            lossPct,
            avg
        };

        content.innerHTML = `
            <div class="h2h-detail-title" id="h2h-detail-title">${this.escapeHtml(gt('stat_h2h_title') || 'MEĐUSOBNI DUELI')}</div>
            <div class="h2h-detail-players">
                <div class="h2h-detail-player">
                    <img src="${myAvatar}" class="h2h-detail-avatar" alt="${safeMyName}">
                    <div class="h2h-detail-name">${safeMyName}</div>
                    <div class="h2h-detail-score w-color">${r.wins} ${winShort}</div>
                </div>
                <div class="h2h-detail-vs">VS</div>
                <div class="h2h-detail-player">
                    <img src="${oppAvatar}" class="h2h-detail-avatar h2h-detail-avatar-opp" alt="${safeOppName}">
                    <div class="h2h-detail-name">${safeOppName}</div>
                    <div class="h2h-detail-score l-color">${r.losses} ${lossShort}</div>
                </div>
            </div>
            <div class="h2h-detail-total">${matchText}</div>
            <div class="h2h-stats-area h2h-detail-stats">
                <div class="h2h-stat-row">
                    <span class="lbl">${this.escapeHtml(gt('h2h_highest_score') || 'Najviše poena:')}</span>
                    <span class="val">${r.myHighScore || 0}</span>
                </div>
                <div class="h2h-stat-row">
                    <span class="lbl">${this.escapeHtml(gt('h2h_max_diff') || 'Najveća razlika:')}</span>
                    <span class="val c-success">+${r.maxWinMargin || 0}</span>
                </div>
                <div class="h2h-stat-row">
                    <span class="lbl">${this.escapeHtml(gt('h2h_worst_loss') || 'Najteži poraz:')}</span>
                    <span class="val c-danger">-${r.maxLossMargin || 0}</span>
                </div>
                <div class="h2h-stat-row">
                    <span class="lbl">${this.escapeHtml(gt('h2h_win_streak') || 'Vatreni niz:')}</span>
                    <span class="val h2h-streak-val">${r.currentWinStreak || 0} <span>(${maxShort}: ${r.maxWinStreak || 0})</span></span>
                </div>
                <div class="h2h-stat-row">
                    <span class="lbl">${this.escapeHtml(gt('h2h_draws') || 'Nerešeno:')}</span>
                    <span class="val">${r.draws || 0}</span>
                </div>
                <div class="h2h-stat-row">
                    <span class="lbl">${this.escapeHtml(gt('h2h_avg_pts') || 'Tvoj prosek poena:')}</span>
                    <span class="val">${avg}</span>
                </div>
            </div>
            <div class="h2h-bar-wrapper h2h-detail-bar">
                <div class="h2h-bar-bg">
                    <div class="h2h-bar-win" style="width: ${winPct}%"></div>
                    <div class="h2h-bar-draw" style="width: ${drawPct}%"></div>
                </div>
                <div class="h2h-bar-text">${winPct}% ${this.escapeHtml(gt('h2h_win_pct') || 'POBEDA')}</div>
            </div>
            <button type="button" class="h2h-share-btn" aria-label="${shareAria}">
                <span aria-hidden="true">↗</span>
                <span>${shareLabel}</span>
            </button>`;

        const shareBtn = content.querySelector('.h2h-share-btn');
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareH2HDetail());

        this.lastH2HTrigger = triggerEl || document.activeElement;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('h2h-modal-open');

        const closeBtn = modal.querySelector('.h2h-detail-close');
        if (closeBtn) closeBtn.focus({ preventScroll: true });
    }

    closeH2HDetail() {
        const modal = document.getElementById('h2h-detail-modal');
        if (!modal) return;

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('h2h-modal-open');
        this.currentH2HShareData = null;

        if (this.lastH2HTrigger && typeof this.lastH2HTrigger.focus === 'function') {
            this.lastH2HTrigger.focus({ preventScroll: true });
        }
    }

    async shareH2HDetail() {
        const data = this.currentH2HShareData;
        if (!data) return;

        const shareBtn = document.querySelector('.h2h-share-btn');
        const originalHtml = shareBtn ? shareBtn.innerHTML : '';
        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.innerHTML = `<span>${this.escapeHtml(gt('h2h_share_generating') || 'Priprema...')}</span>`;
        }

        try {
            const blob = await this.createH2HShareImage(data);
            const slug = String(data.oppName || 'rival')
                .toLowerCase()
                .replace(/[^a-z0-9čćžšđ]+/gi, '-')
                .replace(/^-+|-+$/g, '') || 'rival';
            const filename = `yamb-h2h-${slug}.png`;
            const title = gt('h2h_share_title') || 'Yamb H2H statistika';
            const text = (gt('h2h_share_text') || 'Moja Yamb H2H kartica protiv {0}.').replace('{0}', data.oppName || 'rival');
            const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            const nativeH2HShare = window.Capacitor?.Plugins?.H2HShare;

            if (nativeH2HShare && typeof nativeH2HShare.shareImage === 'function') {
                const dataUrl = await this.blobToDataUrl(blob);
                await nativeH2HShare.shareImage({
                    dataUrl,
                    filename,
                    title,
                    text,
                    dialogTitle: title
                });
                return;
            }

            if (isNativeApp) {
                await this.modal.alert(
                    gt('h2h_share_update_required') || 'Za deljenje slike potrebno je ažurirati aplikaciju na najnoviju verziju.',
                    gt('h2h_share_title') || 'Yamb H2H statistika'
                );
                return;
            }

            if (navigator.share && typeof File !== 'undefined') {
                const file = new File([blob], filename, { type: 'image/png' });
                const payload = { title, text, files: [file] };
                const canShareFile = !navigator.canShare || navigator.canShare(payload);

                if (canShareFile) {
                    try {
                        await navigator.share(payload);
                        return;
                    } catch (err) {
                        if (err && err.name === 'AbortError') return;
                        console.log('H2H deljenje slike nije uspelo:', err);
                    }
                }
            }

            this.downloadBlob(blob, filename);
            await this.modal.alert(
                gt('h2h_share_fallback') || 'Deljenje slike nije dostupno na ovom uređaju. PNG kartica je pripremljena za preuzimanje.',
                gt('h2h_share_title') || 'Yamb H2H statistika'
            );
        } catch (err) {
            console.warn('Nije moguće pripremiti H2H share karticu:', err);
            await this.modal.alert(
                gt('h2h_share_error') || 'Nije moguće pripremiti sliku za deljenje.',
                gt('err_title') || 'GREŠKA'
            );
        } finally {
            if (shareBtn) {
                shareBtn.disabled = false;
                shareBtn.innerHTML = originalHtml;
            }
        }
    }

    async createH2HShareImage(data) {
        const canvas = document.createElement('canvas');
        const width = 1080;
        const height = 1350;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas nije dostupan');

        const colors = {
            bgTop: '#132727',
            bgBottom: '#080B10',
            card: 'rgba(18, 22, 28, 0.94)',
            cardLine: 'rgba(224, 201, 149, 0.38)',
            text: '#F7ECD0',
            muted: '#B7AA8B',
            gold: '#E0C995',
            success: '#4CAF50',
            danger: '#F44336',
            orange: '#FF8A50'
        };

        const textValue = (value) => String(value ?? '').replace(/<[^>]*>/g, '').trim();
        const label = (key, fallback) => textValue(gt(key) || fallback).replace(/:$/, '');
        const maxShort = textValue(gt('h2h_max_short') || 'Max');
        const winPctLabel = textValue(gt('h2h_win_pct') || 'POBEDA');

        const roundedRect = (x, y, w, h, r) => {
            const radius = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + w - radius, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            ctx.lineTo(x + w, y + h - radius);
            ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            ctx.lineTo(x + radius, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        };

        const fillRound = (x, y, w, h, r, fill, stroke = null, lineWidth = 1) => {
            roundedRect(x, y, w, h, r);
            ctx.fillStyle = fill;
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }
        };

        const fitText = (text, x, y, maxWidth, size, minSize, color, weight = 800, align = 'center') => {
            const cleanText = textValue(text) || ' ';
            let fontSize = size;
            ctx.textAlign = align;
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = color;
            do {
                ctx.font = `${weight} ${fontSize}px Montserrat, Arial, sans-serif`;
                if (ctx.measureText(cleanText).width <= maxWidth || fontSize <= minSize) break;
                fontSize -= 2;
            } while (fontSize > minSize);

            let output = cleanText;
            if (ctx.measureText(output).width > maxWidth) {
                while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
                    output = output.slice(0, -1);
                }
                output = `${output}...`;
            }
            ctx.fillText(output, x, y);
        };

        const initialsFor = (name) => {
            const parts = textValue(name).split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
            const compact = (parts[0] || '?').slice(0, 2);
            return compact.toUpperCase();
        };

        const drawAvatar = (x, y, radius, name, borderColor) => {
            const grad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
            grad.addColorStop(0, '#2D3E3E');
            grad.addColorStop(1, '#11161D');
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.lineWidth = 8;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
            ctx.restore();

            fitText(initialsFor(name), x, y + 21, radius * 1.35, 58, 40, colors.gold, 900);
        };

        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, colors.bgTop);
        background.addColorStop(0.52, '#15100A');
        background.addColorStop(1, colors.bgBottom);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(170, 170, 260, 0, Math.PI * 2);
        ctx.fillStyle = colors.gold;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(930, 1080, 330, 0, Math.PI * 2);
        ctx.fillStyle = colors.success;
        ctx.fill();
        ctx.globalAlpha = 1;

        fillRound(58, 58, width - 116, height - 116, 48, colors.card, colors.cardLine, 3);

        fitText('YAMB OF THE BALKAN', width / 2, 145, 760, 34, 24, colors.gold, 900);
        fitText(textValue(gt('stat_h2h_title') || 'MEĐUSOBNI DUELI'), width / 2, 205, 820, 48, 32, colors.text, 900);

        drawAvatar(280, 380, 92, data.myName, colors.gold);
        drawAvatar(800, 380, 92, data.oppName, colors.danger);

        fitText(data.myName, 280, 520, 360, 38, 25, colors.text, 900);
        fitText(data.oppName, 800, 520, 360, 38, 25, colors.text, 900);
        fitText(`${data.wins || 0} ${textValue(gt('h2h_wins_short') || 'W')}`, 280, 580, 300, 50, 32, colors.success, 900);
        fitText(`${data.losses || 0} ${textValue(gt('h2h_losses_short') || 'L')}`, 800, 580, 300, 50, 32, colors.danger, 900);

        fillRound(484, 354, 112, 72, 36, 'rgba(0,0,0,0.36)', 'rgba(224,201,149,0.54)', 3);
        fitText('VS', width / 2, 402, 90, 28, 22, colors.gold, 900);

        fillRound(350, 635, 380, 62, 31, 'rgba(224, 201, 149, 0.13)', 'rgba(224,201,149,0.24)', 2);
        fitText(data.matchText || this.h2hMatchText(data.total), width / 2, 677, 330, 28, 20, colors.gold, 900);

        const rows = [
            { label: label('h2h_highest_score', 'Najviše poena'), value: data.myHighScore || 0, color: colors.text },
            { label: label('h2h_max_diff', 'Najveća razlika'), value: `+${data.maxWinMargin || 0}`, color: colors.success },
            { label: label('h2h_worst_loss', 'Najteži poraz'), value: `-${data.maxLossMargin || 0}`, color: colors.danger },
            { label: label('h2h_win_streak', 'Vatreni niz'), value: `${data.currentWinStreak || 0} (${maxShort}: ${data.maxWinStreak || 0})`, color: colors.orange },
            { label: label('h2h_draws', 'Nerešeno'), value: data.draws || 0, color: colors.text },
            { label: label('h2h_avg_pts', 'Tvoj prosek poena'), value: data.avg || 0, color: colors.text }
        ];

        const rowX = 135;
        const rowY = 750;
        const rowW = width - 270;
        const rowH = 72;
        rows.forEach((row, index) => {
            const y = rowY + (index * 82);
            fillRound(rowX, y, rowW, rowH, 18, index % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.075)', 1);
            fitText(row.label, rowX + 28, y + 47, rowW - 260, 27, 20, colors.muted, 700, 'left');
            fitText(row.value, rowX + rowW - 28, y + 47, 220, 32, 22, row.color, 900, 'right');
        });

        const barX = 145;
        const barY = 1250;
        const barW = width - 290;
        const barH = 24;
        const safeWinPct = Math.max(0, Math.min(100, Number(data.winPct) || 0));
        const safeDrawPct = Math.max(0, Math.min(100 - safeWinPct, Number(data.drawPct) || 0));
        const winW = Math.max(0, Math.min(barW, barW * (safeWinPct / 100)));
        const drawW = Math.max(0, Math.min(barW - winW, barW * (safeDrawPct / 100)));
        ctx.save();
        roundedRect(barX, barY, barW, barH, 12);
        ctx.clip();
        ctx.fillStyle = colors.danger;
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = colors.success;
        ctx.fillRect(barX, barY, winW, barH);
        ctx.fillStyle = colors.gold;
        ctx.fillRect(barX + winW, barY, drawW, barH);
        ctx.restore();
        fitText(`${data.winPct || 0}% ${winPctLabel}`, width / 2, 1320, 560, 28, 20, colors.muted, 900);

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('PNG nije generisan'));
            }, 'image/png', 0.95);
        });
    }

    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Nije moguće pročitati sliku.'));
            reader.readAsDataURL(blob);
        });
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
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
        const splashLogin = document.getElementById('splash-login-container');
        const splashScreen = document.getElementById('splash-screen');
        const isOnSplash = !!(splashScreen && splashScreen.classList.contains('active'));

        if (window.yambAuthState && window.yambAuthState.restoreFailed) {
            this.navigateTo('splash-screen');
            if (splashLogin) splashLogin.style.display = 'flex';
            return false;
        }

        const uid = getPlayerId() || this.playerId;
        if (uid && uid !== 'undefined' && uid !== 'null') {
            localStorage.setItem('yamb_uid', uid);
            this.playerId = uid;
            return true;
        }

        if (window.yambAuthState && (window.yambAuthState.loginInProgress || window.yambAuthState.checkingLogin)) {
            if (splashLogin) splashLogin.style.display = 'flex';
            return false;
        }

        if (isOnSplash) {
            if (splashLogin) splashLogin.style.display = 'flex';
            return false;
        }

        const now = Date.now();
        if (!this.lastAuthRequiredAlertAt || now - this.lastAuthRequiredAlertAt > 1500) {
            this.lastAuthRequiredAlertAt = now;
            this.modal.alert(gt('auth_required') || "Morate se prijaviti preko Google-a da biste igrali ovu igru.", gt('auth_required_title') || "PRIJAVA OBAVEZNA");
        }
        this.navigateTo('splash-screen');
        if (splashLogin) splashLogin.style.display = 'flex';
        return false;
    }

    syncBalance() {
        const realBalance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        if(window.statsManager) {
            window.statsManager.stats.balance = realBalance;
            window.statsManager.saveStats();
        }
        if(this.stats) this.stats.balance = realBalance;
    }
    
    getThemeDiceDefaultMarkerKey(themeId) {
        const safeThemeId = String(themeId || 'theme')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_');
        const uid = String(this.playerId || localStorage.getItem('yamb_uid') || 'guest')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_');
        return `yamb_${safeThemeId || 'theme'}_default_skin_initialized_${uid || 'guest'}`;
    }

    ensureThemeDiceSkin(themeId, skinId, { activateAsDefault = false, refreshActiveSkin = false } = {}) {
        const safeSkinId = String(skinId || '').trim();
        if (!safeSkinId) return;

        const markerKey = this.getThemeDiceDefaultMarkerKey(themeId);
        const isFirstThemeSelection = localStorage.getItem(markerKey) !== 'true';
        const addSkinToStorage = (storageKey) => {
            const storedSkins = this.readLocalJson(storageKey, []);
            const skins = Array.isArray(storedSkins) ? storedSkins : [];
            if (!skins.includes(safeSkinId)) {
                skins.push(safeSkinId);
                localStorage.setItem(storageKey, JSON.stringify(skins));
            }
        };

        // Stari opšti niz služi kompatibilnosti, a typed niz se čuva uz nalog.
        addSkinToStorage('yamb_unlocked');
        addSkinToStorage('yamb_unlocked_skins');

        const inventories = [this.stats, window.statsManager && window.statsManager.stats]
            .filter((inventory, index, list) => inventory && list.indexOf(inventory) === index);
        inventories.forEach(inventory => {
            if (!Array.isArray(inventory.unlockedSkins)) inventory.unlockedSkins = [];
            if (!inventory.unlockedSkins.includes(safeSkinId)) inventory.unlockedSkins.push(safeSkinId);
        });
        if (window.statsManager && typeof window.statsManager.saveStats === 'function') {
            window.statsManager.saveStats();
        }

        if (activateAsDefault && (isFirstThemeSelection || refreshActiveSkin)) {
            localStorage.setItem(markerKey, 'true');
            localStorage.setItem('yamb_active_skin', safeSkinId);
            localStorage.removeItem('yamb_manual_active_skin');
            localStorage.removeItem('yamb_manual_active_skin_at');
            if (typeof this.updateDiceVisuals === 'function' && this.features) this.updateDiceVisuals();
            document.querySelectorAll('.daily-glass-die.dice').forEach(element => {
                this.features?.applySkinToElement(element, element.classList.contains('held'));
            });
        }
    }

    getThemeLoadingPack(theme) {
        const lang = (localStorage.getItem('yamb_lang') || 'sr').startsWith('en') ? 'en' : 'sr';
        const text = lang === 'en'
            ? {
                kicker: 'Preparing theme environment',
                copy: 'Aligning background, icons and interface details',
                status: 'Theme is ready',
                pills: ['background', 'icons', 'UI pack']
            }
            : {
                kicker: 'Pripremamo tematsko okruženje',
                copy: 'Usklađujemo pozadinu, ikonice i detalje interfejsa',
                status: 'Tema je spremna',
                pills: ['pozadina', 'ikonice', 'UI paket']
            };

        const packs = {
            easter: {
                title: lang === 'en' ? 'Easter Theme' : 'Vaskrs tema',
                background: 'assets/easter-neumorphic-bg-v1.png',
                icons: [
                    'assets/easter-soft-clay/mode-solo-pro.png?v=1',
                    'assets/easter-soft-clay/mode-opponent-pro.png?v=1',
                    'assets/easter-soft-clay/treasury-pro.png',
                    'assets/easter-soft-clay/tournament-pro.png',
                    'assets/easter-soft-clay/leaderboard-pro.png'
                ],
                assets: [
                    'assets/easter-soft-clay/global-chat-pro-v4.png',
                    'assets/easter-soft-clay/online-players-pro-v2.png?v=1',
                    'assets/easter-soft-clay/quarterly-league-yotb-ql-pro.png?v=1',
                    'assets/easter-soft-clay/ducats-undo-pro-v2.png?v=1',
                    'assets/easter-soft-clay/mode-hotseat-pro.png?v=1',
                    'assets/easter-soft-clay/mode-invite-pro.png?v=1',
                    'assets/easter-soft-clay/daily-challenge-pro.png?v=3',
                    'assets/easter-soft-clay/statistics-pro.png',
                    'assets/easter-soft-clay/settings-pro.png',
                    'assets/easter-soft-clay/rules-pro.png',
                    'assets/easter-soft-clay/statistics/power-index-bolt-v2.png?v=1',
                    'assets/easter-soft-clay/daily/reward-video-v2.png?v=1',
                    'assets/easter-soft-clay/leaderboard/medal-gold-v2.png?v=1',
                    'assets/easter-soft-clay/leaderboard/medal-silver-v2.png?v=1',
                    'assets/easter-soft-clay/leaderboard/medal-bronze-v2.png?v=1',
                    'assets/easter-soft-clay/opponent/vs-v2.png?v=1',
                    'assets/easter-soft-clay/ql/medal-gold-v2.png?v=1',
                    'assets/easter-soft-clay/ql/medal-silver-v2.png?v=1',
                    'assets/easter-soft-clay/ql/medal-bronze-v2.png?v=1',
                    'assets/easter-soft-clay/tournament/finalist-silver-v2.png?v=1'
                ]
            },
            desert: {
                title: lang === 'en' ? 'Desert Glass' : 'Pustinjsko staklo',
                background: 'assets/desert-neumorphic-bg-v1.png',
                icons: [
                    'assets/desert-soft-clay/mode-solo-pro.png?v=1',
                    'assets/desert-soft-clay/mode-opponent-pro.png?v=1',
                    'assets/desert-soft-clay/treasury-pro.png?v=4',
                    'assets/desert-soft-clay/tournament-pro.png?v=4',
                    'assets/desert-soft-clay/leaderboard-pro.png?v=1'
                ],
                assets: [
                    'assets/desert-soft-clay/global-chat-pro.png?v=2',
                    'assets/desert-soft-clay/online-players-pro.png?v=3',
                    'assets/desert-soft-clay/quarterly-league-yotb-ql-pro.png?v=2',
                    'assets/desert-soft-clay/ducats-undo-pro.png?v=2',
                    'assets/desert-soft-clay/mode-hotseat-pro.png?v=1',
                    'assets/desert-soft-clay/mode-invite-pro.png?v=1',
                    'assets/desert-soft-clay/daily-challenge-pro.png?v=1',
                    'assets/desert-soft-clay/statistics-pro.png?v=1',
                    'assets/desert-soft-clay/settings-pro.png?v=1',
                    'assets/desert-soft-clay/rules-pro.png?v=1',
                    'assets/desert-soft-clay/daily/reward-video-v2.png?v=1',
                    'assets/desert-soft-clay/leaderboard/medal-gold-v2.png?v=1',
                    'assets/desert-soft-clay/leaderboard/medal-silver-v2.png?v=1',
                    'assets/desert-soft-clay/leaderboard/medal-bronze-v2.png?v=1',
                    'assets/desert-soft-clay/opponent/vs-v2.png?v=1',
                    'assets/desert-soft-clay/online-players-state-pro-v2.png?v=1',
                    'assets/desert-soft-clay/online-duel-pro-v2.png?v=1',
                    'assets/desert-soft-clay/statistics/power-index-bolt-v2.png?v=1',
                    'assets/desert-soft-clay/tournament/finalist-silver-v2.png?v=1'
                ]
            },
            severna: {
                title: lang === 'en' ? 'Northern Nebula' : 'Severna maglina',
                background: 'assets/severna-maglina-bg-v3-neuphoric.png',
                icons: [
                    'assets/severna-soft-clay/mode-solo-pro-v6.png?v=1',
                    'assets/severna-soft-clay/mode-opponent-pro-v6.png?v=1',
                    'assets/severna-soft-clay/treasury-pro-v7.png?v=1',
                    'assets/severna-soft-clay/tournament-pro-v7.png?v=1',
                    'assets/severna-soft-clay/leaderboard-pro-v8.png?v=1'
                ],
                assets: [
                    'assets/severna-soft-clay/global-chat-pro-v6.png?v=1',
                    'assets/severna-soft-clay/online-players-pro-v5.png?v=1',
                    'assets/severna-soft-clay/global-chat-send-pro-v2.png?v=1',
                    'assets/severna-soft-clay/global-chat-empty-pro-v2.png?v=1',
                    'assets/severna-soft-clay/online-add-friend-pro-v2.png?v=1',
                    'assets/severna-soft-clay/online-spectate-pro-v2.png?v=1',
                    'assets/severna-soft-clay/online-duel-pro-v2.png?v=1',
                    'assets/severna-soft-clay/online-players-state-pro-v2.png?v=1',
                    'assets/severna-soft-clay/opponent/scanning-v3.png?v=1',
                    'assets/severna-soft-clay/opponent/found-v3.png?v=1',
                    'assets/severna-soft-clay/opponent/vs-v3.png?v=1',
                    'assets/severna-soft-clay/opponent/disconnected-v3.png?v=1',
                    'assets/severna-soft-clay/opponent/reconnected-v3.png?v=1',
                    'assets/severna-soft-clay/invite/send-v2.png?v=1',
                    'assets/severna-soft-clay/invite/empty-v2.png?v=1',
                    'assets/severna-soft-clay/invite/sent-v2.png?v=1',
                    'assets/severna-soft-clay/invite/accepted-v2.png?v=1',
                    'assets/severna-soft-clay/quarterly-league-yotb-ql-pro-v6.png?v=1',
                    'assets/severna-soft-clay/ql/tab-league-v4.png?v=1',
                    'assets/severna-soft-clay/ql/tab-hall-of-fame-v4.png?v=1',
                    'assets/severna-soft-clay/ql/tab-medals-v4.png?v=1',
                    'assets/severna-soft-clay/ql/tab-champions-v4.png?v=1',
                    'assets/severna-soft-clay/ql/rank-amater-v5.png?v=1',
                    'assets/severna-soft-clay/ql/rank-profi-v5.png?v=1',
                    'assets/severna-soft-clay/ql/rank-majstor-v5.png?v=1',
                    'assets/severna-soft-clay/ql/rank-legenda-v5.png?v=1',
                    'assets/severna-soft-clay/ql/rank-titan-v5.png?v=1',
                    'assets/severna-soft-clay/ql/rank-alltime-v5.png?v=1',
                    'assets/severna-soft-clay/ql/medal-gold-v3.png?v=1',
                    'assets/severna-soft-clay/ql/medal-silver-v3.png?v=1',
                    'assets/severna-soft-clay/ql/medal-bronze-v3.png?v=1',
                    'assets/severna-soft-clay/ducats-undo-pro-v6.png?v=1',
                    'assets/severna-soft-clay/mode-hotseat-pro-v6.png?v=1',
                    'assets/severna-soft-clay/solo/personal-best-v2.png?v=1',
                    'assets/severna-soft-clay/hotseat/winner-v2.png?v=1',
                    'assets/severna-soft-clay/mode-invite-pro-v6.png?v=1',
                    'assets/severna-soft-clay/daily-challenge-pro-v9.png?v=1',
                    'assets/severna-soft-clay/statistics-pro-v9.png?v=1',
                    'assets/severna-soft-clay/settings-pro-v9.png?v=1',
                    'assets/severna-soft-clay/rules-pro-v10.png?v=1',
                    'assets/severna-soft-clay/rules/pages/rules-scoring-v2.png?v=1',
                    'assets/severna-soft-clay/rules/pages/stats-leaderboards-v2.png?v=1',
                    'assets/severna-soft-clay/rules/pages/multiplayer-competitions-v2.png?v=1',
                    'assets/severna-soft-clay/rules/pages/communication-v2.png?v=1',
                    'assets/severna-soft-clay/rules/pages/economy-treasury-v2.png?v=1',
                    'assets/severna-soft-clay/rules/pages/account-server-v2.png?v=1',
                    'assets/severna-soft-clay/treasury/tab-trophies-v2.png?v=1',
                    'assets/severna-soft-clay/treasury/tab-skins-v2.png?v=1',
                    'assets/severna-soft-clay/treasury/tab-effects-v2.png?v=1',
                    'assets/severna-soft-clay/treasury/tab-themes-v2.png?v=1',
                    'assets/severna-soft-clay/economy/ducat-v3.png?v=1',
                    'assets/severna-soft-clay/economy/undo-token-v3.png?v=1',
                    'assets/severna-soft-clay/economy/rewarded-video-v3.png?v=1',
                    'assets/severna-soft-clay/economy/ad-unavailable-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/tab-info-v2.png?v=1',
                    'assets/severna-soft-clay/tournament/tab-bracket-v2.png?v=1',
                    'assets/severna-soft-clay/tournament/tab-hall-of-fame-v2.png?v=1',
                    'assets/severna-soft-clay/tournament/state-register-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/state-unregister-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/state-registration-locked-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/state-start-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/state-match-active-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/state-match-complete-v3.png?v=1',
                    'assets/severna-soft-clay/tournament/podium-gold-v2.png?v=1',
                    'assets/severna-soft-clay/tournament/podium-silver-v2.png?v=1',
                    'assets/severna-soft-clay/tournament/podium-bronze-v2.png?v=1',
                    'assets/severna-soft-clay/tournament/finalist-silver-v3.png?v=1'
                ]
            }
        };

        const pack = packs[theme];
        if (!pack) return null;
        return {
            ...text,
            ...pack,
            assets: [...new Set([pack.background, ...pack.icons, ...pack.assets])]
        };
    }

    preloadThemeImage(src, timeoutMs = 2200) {
        if (!src) return Promise.resolve(false);

        return new Promise(resolve => {
            let settled = false;
            const img = new Image();
            const finish = success => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(success);
            };
            const timer = setTimeout(() => finish(false), timeoutMs);

            img.decoding = 'async';
            img.onload = async () => {
                try {
                    if (typeof img.decode === 'function') await img.decode();
                } catch (_) {
                    // Učitana slika je dovoljna; decode greška ne sme blokirati temu.
                }
                finish(true);
            };
            img.onerror = () => finish(false);
            img.src = src;

            if (img.complete && img.naturalWidth > 0) finish(true);
        });
    }

    hideThemeLoadingGate({ immediate = false } = {}) {
        const gate = document.getElementById('theme-loading-gate');
        if (!gate) return;

        clearTimeout(this.themeLoadingHideTimer);
        if (immediate) {
            this.themeLoadingToken += 1;
            gate.className = 'theme-loading-gate';
            gate.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('theme-loading-active');
            return;
        }

        gate.classList.add('is-hiding');
        setTimeout(() => {
            if (!gate.classList.contains('is-hiding')) return;
            gate.className = 'theme-loading-gate';
            gate.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('theme-loading-active');
        }, 300);
    }

    prepareThemeLoadingGate(theme, { initialLoad = false, manualSwitch = false } = {}) {
        const gate = document.getElementById('theme-loading-gate');
        if (!gate) return Promise.resolve(false);

        const pack = this.getThemeLoadingPack(theme);
        if (!pack) {
            this.hideThemeLoadingGate({ immediate: true });
            return Promise.resolve(false);
        }

        const token = ++this.themeLoadingToken;
        clearTimeout(this.themeLoadingHideTimer);

        const titleEl = document.getElementById('theme-loading-title');
        const kickerEl = document.getElementById('theme-loading-kicker');
        const copyEl = document.getElementById('theme-loading-copy');
        const statusEl = document.getElementById('theme-loading-status');
        const progressEl = document.getElementById('theme-loading-progress');
        const iconsEl = document.getElementById('theme-loading-icons');
        const pillsEl = document.getElementById('theme-loading-pills');

        if (titleEl) titleEl.textContent = pack.title;
        if (kickerEl) kickerEl.textContent = pack.kicker;
        if (copyEl) copyEl.textContent = pack.copy;
        if (statusEl) statusEl.textContent = '';
        if (progressEl) progressEl.style.width = '12%';

        if (iconsEl) {
            iconsEl.replaceChildren();
            pack.icons.forEach(src => {
                const icon = document.createElement('img');
                icon.src = src;
                icon.alt = '';
                icon.setAttribute('aria-hidden', 'true');
                icon.decoding = 'async';
                iconsEl.appendChild(icon);
            });
        }

        if (pillsEl) {
            pillsEl.replaceChildren();
            pack.pills.forEach(label => {
                const pill = document.createElement('span');
                pill.textContent = label;
                pillsEl.appendChild(pill);
            });
        }

        gate.className = `theme-loading-gate theme-${theme} is-active`;
        gate.setAttribute('aria-hidden', 'false');
        document.body.classList.add('theme-loading-active');

        requestAnimationFrame(() => {
            if (token === this.themeLoadingToken && progressEl) progressEl.style.width = '78%';
        });

        const startedAt = Date.now();
        const minimumVisibleMs = manualSwitch ? 1900 : (initialLoad ? 820 : 640);
        const preloadPromise = Promise.allSettled(pack.assets.map(src => this.preloadThemeImage(src)));

        preloadPromise.then(() => {
            if (token !== this.themeLoadingToken) return;

            const remaining = Math.max(0, minimumVisibleMs - (Date.now() - startedAt));
            this.themeLoadingHideTimer = setTimeout(() => {
                if (token !== this.themeLoadingToken) return;
                if (progressEl) progressEl.style.width = '100%';
                if (statusEl) statusEl.textContent = pack.status;

                setTimeout(() => {
                    if (token === this.themeLoadingToken) this.hideThemeLoadingGate();
                }, 210);
            }, remaining);
        });

        return preloadPromise;
    }

    applyTheme(theme, { initialLoad = false, skipThemeDiceDefault = false, manualSwitch = false, loadingDelayMs = 0 } = {}) {
        const validThemes = this.getValidThemeIds();
        const safeTheme = validThemes.includes(theme) ? theme : 'dark';
        const themeClasses = validThemes
            .filter(themeId => themeId !== 'dark')
            .map(themeId => `${themeId}-theme`);

        document.body.classList.remove(...themeClasses);
        if (safeTheme !== 'dark') document.body.classList.add(`${safeTheme}-theme`);

        // Splash/login ekran pamti poslednju vizuelnu temu čak i kada se nalog odjavi.
        localStorage.setItem('yamb_last_theme', safeTheme);

        const themeDefaultSkins = {
            desert: 'desert_glass',
            easter: 'easter_neumorphic',
            severna: 'severna_nebula'
        };
        const defaultSkin = themeDefaultSkins[safeTheme];
        if (defaultSkin && !skipThemeDiceDefault) {
            const themeDefaultSkinIds = Object.values(themeDefaultSkins);
            const activeSkin = localStorage.getItem('yamb_active_skin') || 'default';
            const manualSkinChoice = localStorage.getItem('yamb_manual_active_skin');
            const hasManualSkinChoice = !!manualSkinChoice && manualSkinChoice === activeSkin;
            const hasRecentManualSkinSwitch = Date.now() < this.skinManualSwitchUntil;
            const shouldRefreshThemeDefaultSkin = !hasManualSkinChoice
                && !hasRecentManualSkinSwitch
                && (activeSkin === 'default' || themeDefaultSkinIds.includes(activeSkin));
            // Pri pravom prvom izboru teme skin postaje aktivan. Pri učitavanju postojećeg
            // naloga samo ga obezbeđujemo, bez menjanja već odabranog skina igrača.
            this.ensureThemeDiceSkin(safeTheme, defaultSkin, {
                activateAsDefault: !initialLoad || shouldRefreshThemeDefaultSkin,
                refreshActiveSkin: shouldRefreshThemeDefaultSkin
            });
        }

        const showLoadingGate = () => this.prepareThemeLoadingGate(safeTheme, { initialLoad, manualSwitch });
        if (loadingDelayMs > 0) {
            setTimeout(showLoadingGate, loadingDelayMs);
        } else {
            showLoadingGate();
        }
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
        const statSources = [
            this.normalizeLocalStats(this.stats || {}),
            this.normalizeLocalStats(managerStats),
            this.normalizeLocalStats(storedStats)
        ];
        const mergedStats = { ...statSources[0], ...statSources[1], ...statSources[2] };
        [
            'games',
            'totalGames',
            'wins',
            'losses',
            'highscore',
            'totalScoreSum',
            'maxWinStreak',
            'tournamentWins',
            'penaltyPoints'
        ].forEach(field => {
            mergedStats[field] = Math.max(...statSources.map(stats => Number(stats[field]) || 0));
        });
        mergedStats.games = Math.max(mergedStats.games || 0, mergedStats.totalGames || 0);
        mergedStats.totalGames = mergedStats.games;

        this.stats = { ...(this.stats || {}), ...mergedStats };

        if (window.statsManager) {
            window.statsManager.stats = { ...window.statsManager.stats, ...this.stats };
        }

        localStorage.setItem('yamb_stats', JSON.stringify(this.stats));
        return this.stats;
    }

    recordSubmittedScoreAsHighscore(score) {
        const safeScore = Number(score);
        if (!Number.isFinite(safeScore) || safeScore <= 0) return false;

        this.refreshLocalStats();
        const finalScore = Math.floor(safeScore);
        const currentHighscore = Math.max(0, Number(this.stats.highscore) || 0);
        if (finalScore <= currentHighscore) return false;

        this.stats = { ...(this.stats || {}), highscore: finalScore };
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats));

        if (window.statsManager) {
            window.statsManager.stats = {
                ...window.statsManager.stats,
                ...this.stats,
                highscore: finalScore
            };
            window.statsManager.saveStats();
        }

        return true;
    }

    async reconcileStatsHighscoreFromStoredScores() {
        const storageKey = (this.topListManager && this.topListManager.storageKey) || 'yamb_ultimate_scores';
        let scores = [];

        try {
            if (window.localforage) {
                scores = (await localforage.getItem(storageKey)) || [];
            }
        } catch (err) {
            console.warn("Nije moguće pročitati lokalnu top listu iz IndexedDB-a:", err);
        }

        if (!Array.isArray(scores) || scores.length === 0) {
            try {
                const storedScores = localStorage.getItem(storageKey);
                if (storedScores) scores = JSON.parse(storedScores);
            } catch (err) {
                console.warn("Nije moguće pročitati lokalnu top listu iz localStorage-a:", err);
            }
        }

        if (!Array.isArray(scores) || scores.length === 0) return false;

        const uid = String(localStorage.getItem('yamb_uid') || this.playerId || '').trim();
        const playerName = String(this.playerName || localStorage.getItem('yamb_player_name') || '').trim();
        let bestScore = 0;

        scores.forEach(entry => {
            if (!entry || typeof entry !== 'object') return;
            const entryUid = String(entry.uid || entry.playerId || '').trim();
            const entryName = String(entry.playerName || entry.name || '').trim();

            if (uid) {
                if (entryUid && entryUid !== uid) return;
                if (!entryUid && !playerName) return;
                if (!entryUid && entryName && playerName && entryName !== playerName) return;
            } else if (playerName && entryName && entryName !== playerName) {
                return;
            }

            const score = Number(entry.score);
            if (Number.isFinite(score) && score > bestScore) {
                bestScore = Math.floor(score);
            }
        });

        return this.recordSubmittedScoreAsHighscore(bestScore);
    }

    getFullLocalStats() {
        this.refreshLocalStats();
        const uid = localStorage.getItem('yamb_uid');
        if (!uid) return {};

        if (typeof window.migrateLegacyLocalProgressToUid === 'function') {
            window.migrateLegacyLocalProgressToUid(uid);
        }

        let lsData = this.readLocalJson('yamb_quarter_data_' + uid, { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 }) || { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 };
        if (window.kvartalnaLiga) {
            window.kvartalnaLiga.init();
            lsData = window.kvartalnaLiga.getScores();
        }

        const h2hStats = this.normalizeH2HStats(this.readLocalJson('yamb_h2h_stats', {}));
        localStorage.setItem('yamb_h2h_stats', JSON.stringify(h2hStats));

        const soundSetting = localStorage.getItem('yamb_sound');
        const vibrationSetting = localStorage.getItem('yamb_vibration');
        const musicSetting = localStorage.getItem('yamb_music');
        const musicVolumeSetting = localStorage.getItem('yamb_music_volume');
        const languageSetting = localStorage.getItem('yamb_lang');
        const lastDaily = this.normalizeDailyChallengeDay(localStorage.getItem('yamb_last_daily_' + uid) || "");
        const dailyRewardClaimed = this.normalizeDailyChallengeDay(localStorage.getItem('yamb_daily_reward_claimed_' + uid) || "");

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
            yamb_unlocked: this.readLocalJson('yamb_unlocked', []),
            unlockedSkins: this.readLocalJson('yamb_unlocked_skins', []),
            unlockedEffects: this.readLocalJson('yamb_unlocked_effects', []),
            unlockedThemes: this.readLocalJson('yamb_unlocked_themes', []),
            leagueData: lsData,
            legacyMigration: localStorage.getItem('yamb_legacy_migration_pending_' + uid) === 'true',
            activeSkin: localStorage.getItem('yamb_active_skin') || null,
            activeEffect: localStorage.getItem('yamb_active_effect') || null,
            activeTheme: localStorage.getItem('yamb_theme') || null,
            lastDaily,
            dailyRewardClaimed,
            dailyRewardAmount: parseInt(localStorage.getItem('yamb_daily_reward_amount_' + uid)) || 0,
            soundEnabled: soundSetting === null ? null : this.soundEnabled,
            vibrationEnabled: vibrationSetting === null ? null : this.vibrationEnabled,
            musicEnabled: musicSetting === null ? null : (this.soundMgr ? this.soundMgr.musicEnabled : musicSetting !== 'false'),
            musicVolume: musicVolumeSetting === null ? null : (this.soundMgr ? this.soundMgr.musicVolume : parseFloat(musicVolumeSetting)),
            language: languageSetting || null,
            penaltyPoints: this.stats.penaltyPoints || 0,
            h2hStats
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

    getValidThemeIds() {
        return ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    }

    getSoftClayThemeAsset(relativePath) {
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const assetRoot = activeTheme === 'severna'
            ? 'assets/severna-soft-clay'
            : (activeTheme === 'desert' ? 'assets/desert-soft-clay' : 'assets/easter-soft-clay');
        return `${assetRoot}/${String(relativePath || '').replace(/^\/+/, '')}`;
    }

    getFreeThemeIds() {
        return ['dark', 'light', 'medium', 'winter'];
    }

    getUnlockedThemeIds(extraSources = []) {
        const validThemeIds = this.getValidThemeIds();
        const themeSources = [
            this.getFreeThemeIds(),
            this.readLocalJson('yamb_unlocked_themes', []),
            this.readLocalJson('yamb_unlocked', []),
            ...extraSources
        ];

        if (window.statsManager && window.statsManager.stats) {
            themeSources.push(window.statsManager.stats.unlockedThemes || []);
            // Legacy fallback: older builds could leak bought themes into unlockedSkins.
            themeSources.push(window.statsManager.stats.unlockedSkins || []);
        }

        return [...new Set(themeSources.flat())]
            .filter(theme => validThemeIds.includes(theme));
    }

    isThemeUnlocked(themeId, extraSources = []) {
        return this.getUnlockedThemeIds(extraSources).includes(themeId);
    }

    syncThemeSelectOptions(themeSelect) {
        if (!themeSelect) return;

        const unlockedThemes = this.getUnlockedThemeIds();
        Array.from(themeSelect.options).forEach(opt => {
            if (unlockedThemes.includes(opt.value)) {
                opt.disabled = false;
                opt.text = opt.text.replace(' 🔒', '');
            } else {
                opt.disabled = true;
                if (!opt.text.includes('🔒')) opt.text += ' 🔒';
            }
        });

        const selectedTheme = localStorage.getItem('yamb_theme') || 'dark';
        const safeSelectedTheme = unlockedThemes.includes(selectedTheme) ? selectedTheme : 'dark';
        if (safeSelectedTheme !== selectedTheme) localStorage.setItem('yamb_theme', safeSelectedTheme);
        themeSelect.value = safeSelectedTheme;
    }

    mergeCloudLeagueData(uid, leagueData, options = {}) {
        if (!uid || !leagueData) return;

        const preferIncoming = !!options.preferIncoming;
        const localLeagueKey = 'yamb_quarter_data_' + uid;
        if (window.kvartalnaLiga && typeof window.kvartalnaLiga.init === 'function') {
            window.kvartalnaLiga.init();
        }
        let currentLocalLeague = this.readLocalJson(localLeagueKey, { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 });
        let leagueUpdated = false;

        if (leagueData.year > currentLocalLeague.year ||
           (leagueData.year === currentLocalLeague.year && leagueData.quarter > currentLocalLeague.quarter)) {
            currentLocalLeague = leagueData;
            leagueUpdated = true;
        } else if (leagueData.year === currentLocalLeague.year && leagueData.quarter === currentLocalLeague.quarter) {
            if (preferIncoming) {
                const incomingScore = Math.max(0, Math.floor(Number(leagueData.quarterlyScore) || 0));
                currentLocalLeague = {
                    ...currentLocalLeague,
                    ...leagueData,
                    baselineScore: Math.max(0, Math.floor(Number(leagueData.baselineScore) || 0)),
                    quarterlyScore: incomingScore
                };
                leagueUpdated = true;
            } else if ((leagueData.quarterlyScore || 0) > (currentLocalLeague.quarterlyScore || 0) ||
                (leagueData.baselineScore || 0) > (currentLocalLeague.baselineScore || 0)) {
                currentLocalLeague.quarterlyScore = Math.max(
                    Number(currentLocalLeague.quarterlyScore) || 0,
                    Number(leagueData.quarterlyScore) || 0
                );
                currentLocalLeague.baselineScore = Math.max(
                    Number(currentLocalLeague.baselineScore) || 0,
                    Number(leagueData.baselineScore) || 0
                );
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

        // Autentifikovani online dueli se upisuju na serveru. Cloud kopija zato
        // mora da zameni lokalnu, inače stari ili duplirani brojači ponovo ožive.
        const cloudH2H = this.normalizeH2HStats(h2hStats);
        localStorage.setItem('yamb_h2h_stats', JSON.stringify(cloudH2H));
    }

    getLocalH2HRecordSummary() {
        const h2h = this.normalizeH2HStats(this.readLocalJson('yamb_h2h_stats', {}));
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

    getTopH2HRival() {
        const rawH2H = this.readLocalJson('yamb_h2h_stats', {});
        const h2h = this.normalizeH2HStats(rawH2H);
        if (JSON.stringify(rawH2H) !== JSON.stringify(h2h)) {
            localStorage.setItem('yamb_h2h_stats', JSON.stringify(h2h));
        }

        const count = (value) => Math.max(0, parseInt(value, 10) || 0);
        const rivals = Object.values(h2h)
            .filter(record => {
                if (!record || typeof record !== 'object') return false;
                const name = String(record.name || '').trim();
                return !!name && name !== 'undefined' && name !== 'null' && name !== 'Nepoznat' && !this.isGuestH2HName(name);
            })
            .map(record => {
                const wins = count(record.wins);
                const draws = count(record.draws);
                const losses = count(record.losses);
                return { ...record, wins, draws, losses, games: wins + draws + losses };
            })
            .filter(record => record.games > 0)
            .sort((a, b) => b.games - a.games || b.wins - a.wins || String(a.name).localeCompare(String(b.name)));

        return rivals[0] || null;
    }

    renderInviteOwnerRival() {
        const card = document.getElementById('easter-invite-top-rival');
        const image = document.getElementById('easter-invite-rival-img');
        const name = document.getElementById('easter-invite-rival-name');
        const record = document.getElementById('easter-invite-rival-record');
        const power = document.getElementById('easter-invite-rival-power');
        const wins = document.getElementById('easter-invite-rival-wins');
        const draws = document.getElementById('easter-invite-rival-draws');
        const losses = document.getElementById('easter-invite-rival-losses');
        if (!card || !image || !name || !record || !power || !wins || !draws || !losses) return;

        const topRival = this.getTopH2HRival();
        if (!topRival) {
            card.classList.add('is-empty');
            const activeInviteTheme = localStorage.getItem('yamb_theme') || 'dark';
            const inviteStatsTheme = activeInviteTheme === 'severna' ? 'severna' : (activeInviteTheme === 'desert' ? 'desert' : 'easter');
            image.src = inviteStatsTheme === 'severna'
                ? 'assets/severna-soft-clay/statistics/h2h-empty-v10.png?v=1'
                : `assets/${inviteStatsTheme}-soft-clay/statistics/h2h-empty.png?v=2`;
            name.setAttribute('data-lang', 'stat_h2h_empty');
            name.textContent = gt('stat_h2h_empty') || 'Nema odigranih duela...';
            name.removeAttribute('title');
            power.textContent = '—';
            wins.textContent = '0';
            draws.textContent = '0';
            losses.textContent = '0';
            return;
        }

        card.classList.remove('is-empty');
        name.removeAttribute('data-lang');
        const rivalName = String(topRival.name || getFallbackPlayerName()).trim();
        const fallbackAvatar = this.friendAvatarUrl(rivalName, '');
        const rawAvatar = this.friendAvatarUrl(rivalName, topRival.photo);
        const security = window.YambSecurity;
        image.src = security && typeof security.safeUrl === 'function'
            ? security.safeUrl(rawAvatar, fallbackAvatar)
            : rawAvatar;
        name.textContent = rivalName;
        name.title = rivalName;
        wins.textContent = String(topRival.wins);
        draws.textContent = String(topRival.draws);
        losses.textContent = String(topRival.losses);

        const storedRivalUid = String(topRival.uid || '').trim();
        const rivalNameKey = this.normalizeH2HNameKey(rivalName);
        const friendProfile = (storedRivalUid ? this.friendProfilesByUid.get(storedRivalUid) : null) ||
            Array.from(this.friendProfilesByUid.values()).find(friend => (
                this.normalizeH2HNameKey(friend?.name) === rivalNameKey
            )) || null;
        const rivalUid = storedRivalUid || String(friendProfile?.uid || '').trim();
        const powerCacheKey = rivalUid ? `uid:${rivalUid}` : (rivalNameKey ? `name:${rivalNameKey}` : '');
        const cachedEntry = powerCacheKey ? this.publicPlayerPowerCache.get(powerCacheKey) : undefined;
        const cachedPower = cachedEntry && typeof cachedEntry === 'object'
            ? cachedEntry.value
            : cachedEntry;
        const leaderboardPlayer = window.powerIndexLeaderboard && Array.isArray(window.powerIndexLeaderboard.data)
            ? window.powerIndexLeaderboard.data.find(player => (
                (rivalUid && String(player.uid || '').trim() === rivalUid) ||
                (!rivalUid && this.normalizeH2HNameKey(player.name) === rivalNameKey)
            ))
            : null;
        const powerValue = friendProfile && friendProfile.pi !== undefined && friendProfile.pi !== null
            ? friendProfile.pi
            : (cachedPower !== undefined ? cachedPower : leaderboardPlayer?.powerIndex);
        const numericPower = Number(powerValue);
        power.textContent = Number.isFinite(numericPower) ? String(Math.max(0, Math.floor(numericPower))) : '—';

        if (rivalUid || rivalNameKey) {
            this.requestPublicPlayerPower(rivalUid, rivalName);
        }
    }

    requestPublicPlayerPower(uid, playerName = '') {
        const targetUid = String(uid || '').trim();
        const targetName = String(playerName || '').trim();
        const targetNameKey = this.normalizeH2HNameKey(targetName);
        const cacheKey = targetUid ? `uid:${targetUid}` : (targetNameKey ? `name:${targetNameKey}` : '');
        if (!cacheKey || this.pendingPublicPlayerPower.has(cacheKey)) return;
        if (!this.socket || !this.socket.connected) return;

        const cachedEntry = this.publicPlayerPowerCache.get(cacheKey);
        const fetchedAt = cachedEntry && typeof cachedEntry === 'object'
            ? Number(cachedEntry.fetchedAt) || 0
            : 0;
        if (fetchedAt && Date.now() - fetchedAt < 4500) return;

        this.pendingPublicPlayerPower.add(cacheKey);
        const releaseTimer = setTimeout(() => this.pendingPublicPlayerPower.delete(cacheKey), 8000);
        this.socket.emit('get_public_player_summary', { uid: targetUid, name: targetName }, (payload = {}) => {
            clearTimeout(releaseTimer);
            this.pendingPublicPlayerPower.delete(cacheKey);
            if (!payload || payload.ok !== true) return;
            const resolvedUid = String(payload.uid || '').trim();
            if (targetUid && resolvedUid !== targetUid) return;

            const numericPower = Number(payload.powerIndex);
            if (!Number.isFinite(numericPower)) return;
            const cacheEntry = {
                value: Math.max(0, Math.floor(numericPower)),
                fetchedAt: Date.now()
            };
            this.publicPlayerPowerCache.set(cacheKey, cacheEntry);
            if (resolvedUid) this.publicPlayerPowerCache.set(`uid:${resolvedUid}`, cacheEntry);
            if (targetNameKey) this.publicPlayerPowerCache.set(`name:${targetNameKey}`, cacheEntry);

            const waitingScreen = document.getElementById('waiting-screen');
            if (waitingScreen?.classList.contains('active') && waitingScreen.classList.contains('is-hosting-invite')) {
                this.renderInviteOwnerRival();
            }
        });
    }

    applyCloudProfileSync(data = {}) {
        const uid = localStorage.getItem('yamb_uid');

        if (!uid) {
            console.log("🛑 Prijavljivanje obavezno: Ignorišem Cloud Sync jer korisnik nije ulogovan.");
            return false;
        }

        localStorage.removeItem('yamb_force_cloud_restore_next_login');

        const toNumber = (value, fallback = 0) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.floor(num) : fallback;
        };

        const localStats = this.readLocalJson('yamb_stats', {}) || {};
        const nextStats = { ...localStats };
        const statsAuthoritative = data.statsAuthoritative === true;
        const serverTechnicalResult = ['win', 'loss', 'draw'].includes(data.serverTechnicalResult)
            ? data.serverTechnicalResult
            : '';
        const trustServerTechnicalStats = !!serverTechnicalResult;
        const monotonicNumericFields = [
            'games',
            'wins',
            'losses',
            'highscore',
            'totalScoreSum',
            'maxWinStreak',
            'tournamentWins',
            'penaltyPoints'
        ];
        const localGames = Math.max(0, toNumber(localStats.games || localStats.totalGames, 0));
        const incomingGames = data.games !== undefined
            ? Math.max(0, toNumber(data.games, localGames))
            : null;
        const cloudStatsAreStale = !statsAuthoritative && !trustServerTechnicalStats && incomingGames !== null && incomingGames < localGames;

        monotonicNumericFields.forEach(field => {
            if (data[field] !== undefined) {
                const localValue = Math.max(0, toNumber(nextStats[field], 0));
                const cloudValue = Math.max(0, toNumber(data[field], localValue));
                nextStats[field] = statsAuthoritative ? cloudValue : Math.max(localValue, cloudValue);
            }
        });

        if (data.games !== undefined) {
            nextStats.games = statsAuthoritative ? (incomingGames || 0) : Math.max(localGames, incomingGames || 0);
            nextStats.totalGames = statsAuthoritative
                ? nextStats.games
                : Math.max(nextStats.games, Math.max(0, toNumber(nextStats.totalGames, 0)));
        }

        if (data.currentWinStreak !== undefined) {
            const localStreak = Math.max(0, toNumber(nextStats.currentWinStreak, 0));
            const cloudStreak = Math.max(0, toNumber(data.currentWinStreak, localStreak));
            nextStats.currentWinStreak = (statsAuthoritative || trustServerTechnicalStats)
                ? cloudStreak
                : (cloudStatsAreStale ? localStreak : cloudStreak);
        }

        if (data.balance !== undefined) {
            const balance = Math.max(0, toNumber(data.balance, nextStats.balance || 0));
            nextStats.balance = balance;
            localStorage.setItem('yamb_dukati', balance);
        }

        if (data.undoTokens !== undefined) {
            const undoTokens = Math.max(0, toNumber(data.undoTokens, 0));
            nextStats.undoTokens = undoTokens;
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
        if (window.undoManager && typeof window.undoManager.updateMenuCounts === 'function') {
            window.undoManager.updateMenuCounts();
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

        const validThemeIds = this.getValidThemeIds();
        const localThemes = statsAuthoritative ? [] : this.readLocalJson('yamb_unlocked_themes', []);
        const cloudThemes = Array.isArray(data.unlockedThemes) ? data.unlockedThemes : [];
        const skinThemeLeak = (Array.isArray(data.unlockedSkins) ? data.unlockedSkins : []).filter(theme => validThemeIds.includes(theme));
        const generalThemes = serverGeneralUnlocks.filter(theme => validThemeIds.includes(theme));
        const mergedThemes = [...new Set([...localThemes, ...cloudThemes, ...skinThemeLeak, ...generalThemes])]
            .filter(theme => validThemeIds.includes(theme));
        localStorage.setItem('yamb_unlocked_themes', JSON.stringify(mergedThemes));

        if (data.shopAdUnlocks && typeof data.shopAdUnlocks === 'object') {
            Object.entries(data.shopAdUnlocks).forEach(([id, entry]) => {
                const itemId = String(id || '').trim();
                if (!itemId) return;
                const progress = Math.max(0, toNumber(entry?.progress, 0));
                const target = Math.max(1, toNumber(entry?.target, 1));
                if (progress > 0 && progress < target && !mergedUnlocked.includes(itemId)) {
                    localStorage.setItem(`yamb_adprogress_${itemId}`, progress);
                } else {
                    localStorage.removeItem(`yamb_adprogress_${itemId}`);
                }
            });
        }

        if (data.activeSkin) {
            const localSkin = localStorage.getItem('yamb_active_skin');
            const hasRecentManualSkinSwitch = Date.now() < this.skinManualSwitchUntil;
            if (!hasRecentManualSkinSwitch || data.activeSkin === localSkin) {
                localStorage.setItem('yamb_active_skin', data.activeSkin);
            }
            if (typeof this.updateDiceVisuals === 'function' && this.features) {
                this.updateDiceVisuals();
            }
            document.querySelectorAll('.daily-glass-die.dice').forEach(element => {
                this.features?.applySkinToElement(element, element.classList.contains('held'));
            });
        }
        if (data.activeEffect) localStorage.setItem('yamb_active_effect', data.activeEffect);
        if (data.activeTheme) {
            const localTheme = localStorage.getItem('yamb_theme');
            const hasRecentManualThemeSwitch = Date.now() < this.themeManualSwitchUntil;
            if (!hasRecentManualThemeSwitch || data.activeTheme === localTheme) {
                localStorage.setItem('yamb_theme', data.activeTheme);
                this.applyTheme(data.activeTheme, { initialLoad: true });
            }
            const themeSelect = document.getElementById('setting-theme');
            if (themeSelect) themeSelect.value = localStorage.getItem('yamb_theme') || data.activeTheme;
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

        if (data.musicEnabled !== undefined) {
            const musicEnabled = data.musicEnabled !== false;
            localStorage.setItem('yamb_music', musicEnabled);
            if (this.soundMgr) this.soundMgr.setMusicEnabled(musicEnabled);
        }

        if (data.musicVolume !== undefined) {
            const volume = Math.max(0, Math.min(1, Number(data.musicVolume)));
            if (Number.isFinite(volume)) {
                localStorage.setItem('yamb_music_volume', volume);
                if (this.soundMgr) this.soundMgr.setMusicVolume(volume);
            }
        }

        if (data.language === 'sr' || data.language === 'en') {
            const currentLanguage = localStorage.getItem('yamb_lang');
            const pendingLanguageSync = localStorage.getItem('yamb_lang_pending_sync');
            const languageChangedAt = parseInt(localStorage.getItem('yamb_lang_changed_at'), 10) || 0;
            const hasRecentLocalLanguageChange = currentLanguage &&
                currentLanguage !== data.language &&
                Date.now() - languageChangedAt < 15000;
            const hasPendingLocalLanguageSync = pendingLanguageSync &&
                pendingLanguageSync === currentLanguage &&
                currentLanguage !== data.language;

            if (!hasRecentLocalLanguageChange && !hasPendingLocalLanguageSync) {
                localStorage.setItem('yamb_lang', data.language);
                if (pendingLanguageSync === data.language) localStorage.removeItem('yamb_lang_pending_sync');
                document.documentElement.lang = data.language;
                if (typeof applyTranslations === 'function') applyTranslations();
            } else if (currentLanguage === data.language) {
                localStorage.removeItem('yamb_lang_pending_sync');
            }
        }

        this.updateQuickMenuIcons();

        const today = this.getDailyChallengeDayKey();
        const localDailyKey = 'yamb_last_daily_' + uid;
        const localDailyRaw = localStorage.getItem(localDailyKey);
        const localDaily = this.normalizeDailyChallengeDay(localDailyRaw);
        const localDailyIsToday = this.isDailyChallengeDay(localDailyRaw);
        if (localDailyRaw && localDailyRaw !== localDaily && localDailyIsToday) {
            localStorage.setItem(localDailyKey, localDaily);
        }
        if (data.lastDaily) {
            const incomingLastDaily = this.normalizeDailyChallengeDay(data.lastDaily);
            if (!localDailyIsToday || incomingLastDaily === today) {
                localStorage.setItem(localDailyKey, incomingLastDaily);
            }
        } else if (data.lastDaily !== undefined && !localDailyIsToday) {
            localStorage.removeItem(localDailyKey);
        }

        const localClaimKey = 'yamb_daily_reward_claimed_' + uid;
        const localClaimRaw = localStorage.getItem(localClaimKey);
        const localClaim = this.normalizeDailyChallengeDay(localClaimRaw);
        const localClaimIsToday = this.isDailyChallengeDay(localClaimRaw);
        if (localClaimRaw && localClaimRaw !== localClaim && localClaimIsToday) {
            localStorage.setItem(localClaimKey, localClaim);
        }
        if (data.lastDailyRewardClaimed) {
            const incomingClaim = this.normalizeDailyChallengeDay(data.lastDailyRewardClaimed);
            if (!localClaimIsToday || incomingClaim === today) {
                localStorage.setItem(localClaimKey, incomingClaim);
            }
        } else if (data.lastDailyRewardClaimed !== undefined && !localClaimIsToday) {
            localStorage.removeItem(localClaimKey);
        }

        if (data.h2hAuthoritative === true) {
            this.mergeCloudH2HStats(data.h2hStats);
            const waitingScreen = document.getElementById('waiting-screen');
            if (waitingScreen?.classList.contains('active') && waitingScreen.classList.contains('is-hosting-invite')) {
                this.renderInviteOwnerRival();
            }
        }
        this.mergeCloudLeagueData(uid, data.leagueData, { preferIncoming: true });

        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }

        return true;
    }

    calculatePowerIndex(statsObj, isLocal = false) {
        if (!statsObj || !window.powerIndexCore) return 0;
        let leaguePts;
        if (isLocal && window.kvartalnaLiga) {
            const leagueData = window.kvartalnaLiga.getScores();
            leaguePts = typeof window.powerIndexCore.calculateLeaguePowerPoints === 'function'
                ? window.powerIndexCore.calculateLeaguePowerPoints(leagueData)
                : ((parseInt(leagueData.baselineScore, 10) || 0) + (parseInt(leagueData.quarterlyScore, 10) || 0));
        }

        return window.powerIndexCore.calculatePowerIndex(statsObj, { leaguePts });
    }

    // --- SISTEM PRIJATELJA ---
    waitForSocketConnection(timeoutMs = 8000) {
        if (!this.socket) return Promise.resolve({ ok: false, reason: 'sys_no_conn' });
        if (this.socket.connected) return Promise.resolve({ ok: true });

        return new Promise(resolve => {
            let settled = false;
            const finish = (payload) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.socket.off('connect', onConnect);
                this.socket.off('connect_error', onError);
                resolve(payload);
            };
            const onConnect = () => finish({ ok: true });
            const onError = () => finish({ ok: false, reason: 'err_server_conn' });
            const timer = setTimeout(() => finish({ ok: false, reason: 'err_friend_timeout' }), timeoutMs);

            this.socket.once('connect', onConnect);
            this.socket.once('connect_error', onError);
            if (this.socket.disconnected) this.socket.connect();
        });
    }

    async ensureSocketReadyForOnline(timeoutMs = 8000) {
        this.initSocketConnection();

        const ready = await this.waitForSocketConnection(timeoutMs);
        if (!ready.ok) return ready;

        const profileResult = await this.emitPlayerData(false, { timeoutMs: Math.min(timeoutMs, 5000) });
        if (!profileResult || !profileResult.ok) {
            return profileResult || { ok: false, reason: 'auth_failed' };
        }

        return { ok: true, uid: profileResult.uid || this.playerId };
    }

    emitSocketAck(eventName, payload = {}, timeoutMs = 8000) {
        return new Promise(resolve => {
            if (!this.socket || !this.socket.connected) {
                resolve({ ok: false, reason: 'sys_no_conn' });
                return;
            }

            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            };
            const timer = setTimeout(() => finish({ ok: false, reason: 'err_friend_timeout' }), timeoutMs);
            this.socket.emit(eventName, payload, finish);
        });
    }

    async emitFriendAck(eventName, payload = {}, timeoutMs = 8000) {
        if (!this.requireLogin()) return { ok: false, reason: 'auth_required' };
        this.initSocketConnection();

        const ready = await this.waitForSocketConnection(timeoutMs);
        if (!ready.ok) return ready;

        let result = await this.emitSocketAck(eventName, payload, timeoutMs);
        const authReasons = new Set([
            'err_friend_auth_required',
            'auth_required',
            'firebase_token_required',
            'missing_firebase_token',
            'invalid_firebase_token'
        ]);

        if (result && result.ok === false && authReasons.has(result.reason)) {
            const authResult = await this.authenticateSocketIdentity(true);
            if (authResult && authResult.ok) {
                result = await this.emitSocketAck(eventName, payload, timeoutMs);
            }
        }

        return result || { ok: false, reason: 'err_server_conn' };
    }

    escapeJsString(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    }

    friendAvatarUrl(name, photoUrl) {
        const rawPhoto = String(photoUrl || '');
        if (rawPhoto.length > 5) return rawPhoto;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Igrac')}&background=333&color=E0C995`;
    }

    requestFriendsList() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('get_friends_list');
        }
    }

    async searchAndAddFriend() {
        if (!this.requireLogin()) return;
        const searchName = await this.modal.prompt(gt('prompt_search_friend') || "Unesi tačno ime igrača (Google ime) za pretragu:", gt('alert_search_title') || "PRETRAGA");
        if (searchName && searchName.trim().length > 0) {
            const result = await this.emitFriendAck('search_player', searchName.trim());
            if (!result.ok) {
                this.showServerNotice(result.reason || 'err_server_conn', 'err_title');
                return;
            }
            await this.handleFriendSearchResults(result.results || []);
        }
    }

    async sendFriendRequest(targetId, targetName, targetUid = null) {
        const result = await this.emitFriendAck('send_friend_req', { targetId, targetUid, challengerName: this.playerName });
        if (!result.ok) {
            this.showServerNotice(result.reason || 'err_server_conn', 'err_title');
            if (result.reason === 'err_friend_request_waiting_on_you') this.requestFriendsList();
            return false;
        }

        const safeTargetName = this.escapeHtml(targetName || getFallbackPlayerName());
        const msgKey = result.status === 'already_pending'
            ? 'friend_req_already_pending'
            : (result.targetOnline ? 'alert_friend_req_sent' : 'friend_req_success');
        const fallbackMsg = result.status === 'already_pending'
            ? "Zahtev za prijateljstvo je već poslat igraču {0}."
            : (result.targetOnline
                ? "Zahtev za prijateljstvo poslat igraču {0}."
                : "Zahtev je poslat! Igrač {0} će ga dobiti sledeći put kada bude na mreži.");
        const msg = (gt(msgKey) || fallbackMsg).replace('{0}', safeTargetName);
        await this.modal.alert(msg, gt('alert_sent_title') || "POSLATO");
        this.requestFriendsList();
        return true;
    }

    renderFriendsList(friends, requests = []) {
        const list = document.getElementById('friends-list');
        if (!list) return;

        const safeFriends = Array.isArray(friends) ? friends : [];
        this.friendProfilesByUid = new Map(
            safeFriends
                .filter(friend => friend && friend.uid)
                .map(friend => [String(friend.uid).trim(), friend])
        );
        
        list.className = 'ws-friends-list';

        let html = `
            <div class="friend-card add-new" onclick="app.searchAndAddFriend()">
                <img class="easter-invite-add-icon" src="assets/easter-soft-clay/online-add-friend-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="desert-invite-add-icon" src="assets/desert-soft-clay/online-add-friend-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="severna-invite-add-icon" src="assets/severna-soft-clay/online-add-friend-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                <div class="friend-card-add-fallback" style="font-size: 2.5rem; color: var(--gold-main); line-height: 1; margin-bottom: 5px; font-weight: 300;">+</div>
                <span style="color:var(--text-main); font-weight:800; font-size:0.75rem; text-align:center; line-height: 1.2;">${gt('btn_add_friend') || 'DODAJ<br>PRIJATELJA'}</span>
            </div>
        `;

        if (requests && requests.length > 0) {
            requests.forEach(r => {
                const requestName = String(r.name || getFallbackPlayerName());
                const safeName = this.escapeHtml(requestName);
                const safeAvatar = this.escapeHtml(this.friendAvatarUrl(requestName, r.photoUrl));
                const safeUid = this.escapeHtml(this.escapeJsString(r.uid || ''));
                const safeRequestNameJs = this.escapeHtml(this.escapeJsString(requestName));
                const acceptTitle = this.escapeHtml(gt('btn_accept') || 'Prihvati');
                const declineTitle = this.escapeHtml(gt('btn_decline') || 'Odbij');
                html += `
                    <div class="friend-card" style="border: 1px dashed var(--gold-main); background: rgba(224, 201, 149, 0.1);">
                        <img src="${safeAvatar}" class="friend-card-img" style="border: 2px solid #aaa;">
                        <span class="friend-card-name">${safeName}</span>
                        <span style="font-size: 0.7rem; color: #aaa; text-align: center; margin-bottom: 5px; font-weight: bold;">${gt('friend_req_new') || 'Novi zahtev'}</span>
                        <div style="display:flex; gap:10px; width: 100%; justify-content: center;">
                            <button onclick="app.resolveFriendRequest('${safeUid}', true, '${safeRequestNameJs}')" style="background:var(--success); color:#fff; border:none; padding:5px 15px; border-radius:15px; cursor:pointer; font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.5);" title="${acceptTitle}">✅</button>
                            <button onclick="app.resolveFriendRequest('${safeUid}', false, '${safeRequestNameJs}')" style="background:var(--danger); color:#fff; border:none; padding:5px 15px; border-radius:15px; cursor:pointer; font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.5);" title="${declineTitle}">❌</button>
                        </div>
                    </div>
                `;
            });
        }

        if (friends && friends.length > 0) {
            friends.forEach(f => {
                const pi = (f.pi !== undefined && f.pi !== null && f.pi !== '')
                    ? f.pi
                    : this.calculatePowerIndex(f.stats, false);
                const h2hRecord = f.h2hRecord || {};
                const h2hLine = this.formatH2HRecordLine(h2hRecord, f.stats);
                const h2hParts = this.getH2HRecordParts(h2hRecord, f.stats);
                const isOnline = f.isOnline;

                const statusColor = isOnline ? 'var(--success)' : 'var(--danger)';
                const btnDisabled = (!isOnline || !f.socketId) ? 'disabled' : '';
                const btnStyle = isOnline ? 'background:var(--gold-main); color:#000; cursor:pointer;' : 'background:gray; color:#ddd; cursor:not-allowed;';

                const btnText = isOnline ? (gt('btn_invite_friend') || 'POZOVI') : (gt('btn_offline') || 'OFFLINE');
                const friendName = String(f.name || getFallbackPlayerName());
                const safeName = this.escapeHtml(friendName);
                const safeAvatar = this.escapeHtml(this.friendAvatarUrl(friendName, f.photoUrl));
                const safeSocketId = this.escapeHtml(this.escapeJsString(f.socketId || ''));
                const safeUid = this.escapeHtml(this.escapeJsString(f.uid || ''));
                const safeFriendNameJs = this.escapeHtml(this.escapeJsString(friendName));
                const safePi = this.escapeHtml(pi);
                const safeH2HLine = this.escapeHtml(h2hLine);
                const safeWlLabel = this.escapeHtml(gt('ws_wl') || 'W/D/L');
                const safePowerLabel = this.escapeHtml(gt('ws_power') || 'Moć');
                const safeWins = this.escapeHtml(h2hParts.wins);
                const safeDraws = this.escapeHtml(h2hParts.draws);
                const safeLosses = this.escapeHtml(h2hParts.losses);

                html += `
                    <div class="friend-card friend-player-card">
                        <div style="position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; box-shadow: 0 0 8px ${statusColor};"></div>
                        <img src="${safeAvatar}" class="friend-card-img" style="border: 2px solid ${statusColor};">
                        <span class="friend-card-name">${safeName}</span>
                        <div class="friend-card-stats">
                            <span class="friend-card-power" style="font-size: 0.8rem; color: #FFD700; font-weight: 900; margin-bottom: 2px; text-shadow: 0 0 5px rgba(255,215,0,0.3);">⚡ ${safePi}</span>
                            <span class="friend-card-wl">${safeWlLabel}: ${safeH2HLine}</span>
                            <div class="easter-friend-records" aria-label="${safeWlLabel}">
                                <div class="easter-friend-record-row easter-friend-power"><span>${safePowerLabel}</span><strong>${safePi}</strong></div>
                                <div class="easter-friend-record-row easter-friend-win"><span>POB</span><strong>${safeWins}</strong></div>
                                <div class="easter-friend-record-row easter-friend-draw"><span>NER</span><strong>${safeDraws}</strong></div>
                                <div class="easter-friend-record-row easter-friend-loss"><span>POR</span><strong>${safeLosses}</strong></div>
                            </div>
                        </div>
                        <button class="friend-card-btn" ${btnDisabled} onclick="app.inviteFriendToRoom('${safeSocketId}', '${safeUid}', '${safeFriendNameJs}')" style="${btnStyle}"><img class="easter-invite-send-icon" src="assets/easter-soft-clay/invite/send.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="desert-invite-send-icon" src="assets/desert-soft-clay/invite/send.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="severna-invite-send-icon" src="assets/severna-soft-clay/invite/send-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><span>${this.escapeHtml(btnText)}</span></button>
                    </div>
                `;
            });
        }
        if ((!friends || friends.length === 0) && (!requests || requests.length === 0)) {
            html += `
                <div class="easter-invite-empty-state" role="status">
                    <img class="easter-invite-empty-icon" src="assets/easter-soft-clay/invite/empty.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="desert-invite-empty-icon" src="assets/desert-soft-clay/invite/empty.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="severna-invite-empty-icon" src="assets/severna-soft-clay/invite/empty-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <span>${gt('friends_empty') || 'Još nema prijatelja.'}</span>
                </div>
            `;
        }
        list.innerHTML = html;

        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen?.classList.contains('active') && waitingScreen.classList.contains('is-hosting-invite')) {
            this.renderInviteOwnerRival();
        }
    }

    async resolveFriendRequest(uid, accepted, friendName = '') {
        const result = await this.emitFriendAck('resolve_friend_req', { challengerUid: uid, accepted: accepted });
        if (!result.ok) {
            this.showServerNotice(result.reason || 'err_server_conn', 'err_title');
            this.requestFriendsList();
            return false;
        }

        const resolvedFriendName = (result.friend && result.friend.name) || friendName || getFallbackPlayerName();
        const safeFriendName = this.escapeHtml(resolvedFriendName);
        const msgKey = accepted ? 'friend_req_accept_success' : 'friend_req_decline_success';
        const fallbackMsg = accepted
            ? "Igrač {0} je sada vaš prijatelj."
            : "Zahtev igrača {0} je odbijen.";
        const msg = (gt(msgKey) || fallbackMsg).replace('{0}', safeFriendName);
        await this.modal.alert(msg, accepted ? (gt('alert_new_friend') || "NOVI PRIJATELJ") : (gt('alert_info') || "OBAVEŠTENJE"));

        this.requestFriendsList();
        return true;
    }

    async handleFriendSearchResults(payload) {
        const results = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.results) ? payload.results : []);
        if (payload && payload.ok === false) {
            this.showServerNotice(payload.reason || 'err_server_conn', 'err_title');
            return;
        }

        if (results.length === 0) {
            this.modal.alert(gt('alert_search_not_found') || "Nije pronađen nijedan igrač sa tim imenom. Pokušajte ponovo.", gt('alert_search_title') || "PRETRAGA");
            return;
        }

        const p = results[0];
        if (this.friendsListUids.includes(p.uid)) {
            this.modal.alert(gt('friend_already_added'), gt('modal_title_info') || "INFO");
            return;
        }

        const safeSearchName = this.escapeHtml(p.name || getFallbackPlayerName());
        const msg = (gt('alert_search_found') || "Pronađen je igrač: {0}. Da li želiš da mu pošalješ zahtev za prijateljstvo?").replace('{0}', safeSearchName);
        const send = await this.modal.confirm(msg);
        if (send) {
            await this.sendFriendRequest(p.socketId, p.name, p.uid);
        }
    }

    async showFriendResolutionNotice(type, name) {
        const safeName = this.escapeHtml(name || getFallbackPlayerName());
        const accepted = type === 'accepted';
        const msg = (gt(accepted ? 'alert_friend_added' : 'alert_friend_declined') || (accepted
            ? "Igrač {0} je sada vaš prijatelj! Možete ga pozvati na partiju iz menija 'Prijatelj'."
            : "Igrač {0} je nažalost odbio vaš zahtev za prijateljstvo.")).replace('{0}', safeName);
        await this.modal.alert(msg, accepted ? (gt('alert_new_friend') || "NOVI PRIJATELJ") : (gt('alert_info') || "OBAVEŠTENJE"));
    }

    async showQueuedFriendNotifications(notifications = []) {
        if (!Array.isArray(notifications) || notifications.length === 0) return;

        for (const note of notifications) {
            await this.showFriendResolutionNotice(note.type, note.fromName || note.name || getFallbackPlayerName());
        }
    }

    inviteFriendToRoom(friendSocketId, friendUid = '', friendName = '') {
        if (!this.currentHostingRoomId) return;

        const payloadHostName = this.playerName + "|||" + this.socket.id;

        this.socket.emit('send_room_invite', {
            targetSocketId: friendSocketId,
            targetUid: friendUid,
            targetName: friendName,
            roomId: this.currentHostingRoomId,
            hostName: payloadHostName
        }, (result = {}) => {
            if (!result.ok) {
                this.showServerNotice(result.reason || 'err_server_conn', 'err_title');
                return;
            }

            let sentText = gt('alert_invite_sent') || "Pozivnica za partiju je poslata prijatelju!";
            let titleText = gt('alert_invite_title') || "POZIVNICA";

            if (typeof window.showNotification === 'function') {
                window.showNotification(titleText, sentText, {
                    icon: (localStorage.getItem('yamb_theme') || 'dark') === 'severna'
                        ? 'assets/severna-soft-clay/invite/sent-v2.png?v=1'
                        : this.getSoftClayThemeAsset('invite/sent.png?v=1'),
                    className: 'invite-sent-toast'
                });
            } else {
                this.modal.alert(sentText, titleText);
            }
        });
    }

    loadHallOfFame() {
        const listEl = document.getElementById('ws-hof-list');
        if (listEl) {
            listEl.innerHTML = `
                <div class="waiting-hof-loading-state">
                    <img class="waiting-hof-state-soft-clay-icon" src="assets/easter-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="waiting-hof-state-soft-clay-icon-desert" src="assets/desert-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="waiting-hof-state-soft-clay-icon-nebula" src="assets/severna-soft-clay/leaderboard/empty-loading-v9.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <div class="loader" style="width: 25px; height: 25px; margin: 10px auto;"></div>
                </div>
            `;
        }
        this.waitingHofPeriod = 'weekly';
        this.updateWaitingHofTitle();
        this.stopWaitingHofRotation();
        this.startWaitingHofRotation();
        this.requestWaitingTop3(this.waitingHofPeriod);
    }

    startWaitingHofRotation() {
        this.stopWaitingHofRotation();
        this.waitingHofInterval = setInterval(() => {
            const waitingScreen = document.getElementById('waiting-screen');
            const hofContainer = document.getElementById('ws-hall-of-fame');
            if (!waitingScreen || !waitingScreen.classList.contains('active') || !hofContainer || hofContainer.classList.contains('hidden')) {
                this.stopWaitingHofRotation();
                return;
            }

            const periods = ['weekly', 'monthly', 'all_time'];
            const currentIndex = periods.indexOf(this.waitingHofPeriod);
            this.waitingHofPeriod = periods[(currentIndex + 1) % periods.length];
            this.requestWaitingTop3(this.waitingHofPeriod, true);
        }, 6500);
    }

    stopWaitingHofRotation() {
        if (this.waitingHofInterval) {
            clearInterval(this.waitingHofInterval);
            this.waitingHofInterval = null;
        }
    }

    updateWaitingHofTitle(period = this.waitingHofPeriod) {
        const titleEl = document.getElementById('ws-hof-title');
        if (!titleEl) return;

        const titles = {
            weekly: gt('ws_hof_top3_weekly') || '🏆 Top 3 This Week',
            monthly: gt('ws_hof_top3_monthly') || '🏆 Top 3 This Month',
            all_time: gt('ws_hof_top3_all_time') || '🏆 Top 3 All Time'
        };
        titleEl.innerText = titles[period] || titles.weekly;
    }

    refreshWaitingOpponentSearchText() {
        const searchingTextEl = document.querySelector('.waiting-opp-searching-text');
        if (searchingTextEl) searchingTextEl.innerHTML = gt('ws_searching_opp') || 'Finding<br>opponent...';
    }

    requestWaitingTop3(period = 'weekly', animate = false) {
        const listEl = document.getElementById('ws-hof-list');
        const titleEl = document.querySelector('.waiting-hof-title');
        if (animate) {
            if (listEl) listEl.classList.add('is-switching');
            if (titleEl) titleEl.classList.add('is-switching');
        } else {
            this.updateWaitingHofTitle(period);
        }

        this.initSocketConnection();
        const emitRequest = () => {
            this.updateWaitingHofTitle(period);
            if (this.socket && this.socket.connected) {
                this.socket.emit('get_waiting_top3', period);
            }
        };

        if (animate) setTimeout(emitRequest, 320);
        else if (this.socket && this.socket.connected) emitRequest();
        else setTimeout(emitRequest, 500);
    }

    renderHallOfFame(data) {
        const listEl = document.getElementById('ws-hof-list');
        if (!listEl) return;
        const titleEl = document.querySelector('.waiting-hof-title');

        const revealHallOfFame = () => {
            requestAnimationFrame(() => {
                listEl.classList.remove('is-switching');
                if (titleEl) titleEl.classList.remove('is-switching');
            });
        };

        if (!data || data.length === 0) {
            listEl.innerHTML = `
                <div class="waiting-hof-empty-state" style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">
                    <img class="waiting-hof-state-soft-clay-icon" src="assets/easter-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="waiting-hof-state-soft-clay-icon-desert" src="assets/desert-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="waiting-hof-state-soft-clay-icon-nebula" src="assets/severna-soft-clay/leaderboard/empty-loading-v9.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <span>${gt('ws_hof_no_results') || 'Još uvek nema rezultata za ovaj period.'}</span>
                </div>
            `;
            revealHallOfFame();
            return;
        }

        let html = '';
        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        const sec = window.YambSecurity;

        data.sort((a, b) => b.score - a.score).slice(0, 3).forEach((p, index) => {
            const medal = medals[index] || '';
            const medalAsset = ['gold', 'silver', 'bronze'][index] || '';
            const color = colors[index] || '#fff';
            const displayName = String(p.name || p.playerName || getFallbackPlayerName());
            const avatar = p.photoUrl && p.photoUrl.length > 5 
                ? p.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;
            const safeAvatar = sec ? sec.escapeAttr(sec.safeUrl(avatar, fallbackAvatar)) : avatar;
            const safeName = sec ? sec.escapeHtml(displayName) : displayName;
            const safeScore = Number(p.score || 0).toLocaleString(localStorage.getItem('yamb_lang') === 'en' ? 'en-US' : 'sr-RS');
            const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
            const podiumSrc = activeTheme === 'easter'
                ? `assets/easter-soft-clay/leaderboard/medal-${medalAsset}-v2.png?v=1`
                : activeTheme === 'desert'
                    ? `assets/desert-soft-clay/leaderboard/medal-${medalAsset}-v2.png?v=1`
                    : activeTheme === 'severna'
                        ? `assets/severna-soft-clay/leaderboard/medal-${medalAsset}-v9.png?v=1`
                        : `assets/yotb-podium/leaderboard/${medalAsset}.png?v=1`;

            html += `
                <div class="waiting-hof-entry" style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="waiting-podium-mark" style="font-size: 1.2rem; font-weight: 900; width: 25px; text-align: center;">
                            <span class="waiting-podium-legacy">${medal}</span>
                            <img class="waiting-podium-medal" src="${podiumSrc}" alt="" aria-hidden="true" decoding="async">
                            <span class="waiting-podium-rank-number">${index + 1}</span>
                        </span>
                        <img src="${safeAvatar}" style="width: 30px; height: 30px; border-radius: 50%; border: 1px solid ${color}; object-fit: cover;">
                        <span style="color: var(--text-main); font-weight: 800; font-size: 0.85rem; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeName}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: ${color}; font-weight: 900; font-size: 0.95rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${safeScore}</span>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
        revealHallOfFame();
    }

    // --- SPECTATE FUNKCIJA ---
    isCurrentRoomPayload(data) {
        const payloadRoomId = data && data.roomId !== undefined ? String(data.roomId || '') : '';
        return !payloadRoomId || !this.roomId || payloadRoomId === String(this.roomId);
    }

    hasSpectateScoreboard() {
        const tableCount = document.querySelectorAll('#tables-container .player-table').length;
        return Array.isArray(this.players) &&
            this.players.length > 0 &&
            Array.isArray(this.allScores) &&
            this.allScores.length >= this.players.length &&
            tableCount >= this.players.length;
    }

    requestSpectateStateSync(options = {}) {
        if (!this.socket || !this.roomId || !this.isSpectator) return;

        const attempts = Math.max(1, Number(options.attempts) || 1);
        const delayMs = Math.max(250, Number(options.delayMs) || 800);

        if (this.spectateSyncRetryTimer) {
            clearTimeout(this.spectateSyncRetryTimer);
            this.spectateSyncRetryTimer = null;
        }

        this.spectateSyncRetryAttempts = 0;

        const sendRequest = () => {
            if (!this.socket || !this.roomId || !this.isSpectator || this.hasSpectateScoreboard()) {
                this.spectateSyncRetryTimer = null;
                return;
            }

            this.socket.emit('request_state_sync', {
                roomId: this.roomId,
                spectator: true
            });

            this.spectateSyncRetryAttempts++;
            if (this.spectateSyncRetryAttempts < attempts) {
                this.spectateSyncRetryTimer = setTimeout(sendRequest, delayMs);
            } else {
                this.spectateSyncRetryTimer = null;
            }
        };

        sendRequest();
    }

    async spectateGame(target) {
        if (!this.requireLogin()) return;

        if (this.gameActive && this.onlineMode && !this.isSpectator) {
            this.showServerNotice('err_spectate_already_in_game');
            return;
        }

        if (typeof window.closeOnlinePlayersModal === 'function') {
            window.closeOnlinePlayersModal();
        } else {
            const overlay = document.getElementById('online-players-overlay');
            if (overlay) overlay.style.display = 'none';
        }

        let reopenOnlinePlayersListScheduled = false;
        const reopenOnlinePlayersList = () => {
            if (reopenOnlinePlayersListScheduled) return;
            reopenOnlinePlayersListScheduled = true;
            if (typeof window.openOnlinePlayersModal === 'function') {
                setTimeout(() => window.openOnlinePlayersModal(), 250);
            }
        };

        this.initSocketConnection();
        this.setupSocketListeners(this.playerName);

        const doSpectate = () => {
            let settled = false;
            let spectateErrorHandled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.socket.off('spectate_started', finish);
                this.socket.off('online_room_resume_available', finish);
                this.socket.off('error_msg', finishOnSpectateError);
            };
            const finishOnSpectateError = (msgKey) => {
                if (String(msgKey || '').includes('spectate')) {
                    spectateErrorHandled = true;
                    finish();
                    reopenOnlinePlayersList();
                }
            };
            const timer = setTimeout(() => {
                if (settled) return;
                finish();
                this.showServerNotice('err_spectate_open_failed');
                reopenOnlinePlayersList();
            }, 8000);

            this.socket.once('spectate_started', finish);
            this.socket.once('online_room_resume_available', finish);
            this.socket.on('error_msg', finishOnSpectateError);
            this.socket.emit('request_spectate', target, (result = {}) => {
                if (result && result.ok === false) {
                    finish();
                    if (!spectateErrorHandled) {
                        this.showServerNotice(result.reason || 'err_spectate_not_in_game', 'err_title');
                    }
                    reopenOnlinePlayersList();
                    console.warn(`Gledanje partije odbijeno: ${result.reason || 'unknown_error'}`);
                } else if (result && result.ok) {
                    finish();
                }
            });
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
    async openGlobalChat(options = {}) {
        if (!this.requireLogin()) return;

        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('globalChat')) {
            this.playEasterRoomIntro('globalChat', () => this.openGlobalChat({ skipRoomIntro: true }));
            return;
        }

        if (this.globalChat) await this.globalChat.open();
    }

    openOnlinePlayers(options = {}) {
        if (!this.requireLogin()) return;

        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('onlinePlayers')) {
            this.playEasterRoomIntro('onlinePlayers', () => this.openOnlinePlayers({ skipRoomIntro: true }));
            return;
        }

        if (typeof window.openOnlinePlayersModal === 'function') {
            window.openOnlinePlayersModal();
        }
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
                    const pendingMatchSync = await this.syncPendingMatchResults();
                    
                    const now = new Date();
                    const leaguePeriod = window.kvartalnaLiga && typeof window.kvartalnaLiga.getCurrentQuarterInfo === 'function'
                        ? window.kvartalnaLiga.getCurrentQuarterInfo()
                        : { currentYear: now.getFullYear(), currentQuarter: Math.floor(now.getMonth() / 3) + 1 };
                    let currentQuarter = leaguePeriod.currentQuarter;
                    let prevQuarter = currentQuarter - 1;
                    let prevYear = leaguePeriod.currentYear;
                    
                    if (prevQuarter === 0) {
                        prevQuarter = 4;
                        prevYear -= 1;
                    }

                    // FIX: Prikazujemo samo u prva 3 dana prvog meseca u kvartalu (Januar, April, Jul, Oktobar)
                    let belgradeMonth = now.getMonth();
                    let belgradeDay = now.getDate();
                    try {
                        const periodParts = new Intl.DateTimeFormat('en-US', {
                            timeZone: 'Europe/Belgrade',
                            month: 'numeric',
                            day: 'numeric'
                        }).formatToParts(now);
                        belgradeMonth = (Number(periodParts.find(part => part.type === 'month')?.value) || (belgradeMonth + 1)) - 1;
                        belgradeDay = Number(periodParts.find(part => part.type === 'day')?.value) || belgradeDay;
                    } catch (_err) {}
                    const isFirstMonthOfQuarter = (belgradeMonth % 3 === 0);
                    const isWithinFirstThreeDays = (belgradeDay <= 3);

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
                            }, (result = {}) => {
                                if (result.ok) {
                                    localStorage.removeItem('yamb_pending_quarter_check');
                                } else if (result.permanent) {
                                    console.warn("Kvartalna nagrada trajno odbijena:", result.reason || 'unknown');
                                    localStorage.removeItem('yamb_pending_quarter_check');
                                } else {
                                    console.warn("Kvartalna nagrada nije potvrđena, pokušaću ponovo pri sledećoj konekciji:", result.reason || 'unknown');
                                    if (result.reason === 'quarter_settling' && Number(result.retryAfterMs) > 0) {
                                        clearTimeout(this.quarterRewardRetryTimer);
                                        this.quarterRewardRetryTimer = setTimeout(() => {
                                            if (this.socket && this.socket.connected) {
                                                this.socket.emit('check_quarter_reward', {
                                                    year: parsedReward.year,
                                                    quarter: parsedReward.quarter,
                                                    playerId: this.playerId
                                                });
                                            }
                                        }, Math.min(Number(result.retryAfterMs) + 1000, 24 * 60 * 60 * 1000));
                                    }
                                }
                            });
                        } catch(e) { console.error("Greška pri čitanju pending nagrade:", e); }
                    }

                    const automaticRewardKey = `yamb_quarter_reward_checked_${this.playerId}_${prevYear}_Q${prevQuarter}`;
                    if (!localStorage.getItem(automaticRewardKey)) {
                        const checkPreviousQuarterReward = () => {
                            if (!this.socket || !this.socket.connected) return;
                            this.socket.emit('check_quarter_reward', {
                                year: prevYear,
                                quarter: prevQuarter,
                                playerId: this.playerId
                            }, (result = {}) => {
                                if (result.ok || result.permanent) {
                                    localStorage.setItem(automaticRewardKey, 'true');
                                    return;
                                }
                                if (result.reason === 'quarter_settling' && Number(result.retryAfterMs) > 0) {
                                    clearTimeout(this.automaticQuarterRewardRetryTimer);
                                    this.automaticQuarterRewardRetryTimer = setTimeout(
                                        checkPreviousQuarterReward,
                                        Math.min(Number(result.retryAfterMs) + 1000, 24 * 60 * 60 * 1000)
                                    );
                                }
                            });
                        };
                        checkPreviousQuarterReward();
                    }

                    if (this.gameActive && this.onlineMode && !this.isSpectator) {
                        console.log("🔄 Rekonekcija detektovana, tražim stanje table od protivnika...");
                        this.socket.emit('request_state_sync', { roomId: this.roomId });
                    } else if (this.gameActive && !this.onlineMode) {
                        this.emitLocalGameSessionStart();
                    }
                    
                    const authResult = await this.emitPlayerData();

                    if (authResult && authResult.ok && pendingMatchSync && pendingMatchSync.remaining > 0) {
                        await this.syncPendingMatchResults({
                            profileMayIncludeResult: pendingMatchSync.profileNotFound === true
                        });
                    }

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
                    this.onlineRollPending = false;
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
                    const { challengerId, challengerName, challengeId, expiresAt } = data;
                    const socketAtPrompt = this.socket;
                    const socketIdAtPrompt = socketAtPrompt ? socketAtPrompt.id : '';

                    if (this.isDoNotDisturbActive()) {
                        this.socket.emit('challenge_response', {
                            challengerId: challengerId,
                            challengeId: challengeId,
                            accepted: false,
                            busy: true
                        });
                        return;
                    }

                    const safeChallengerName = this.escapeHtml(challengerName || getFallbackPlayerName());
                    let text = gt('duel_incoming');
                    if(text === 'duel_incoming') text = `Igrač {0} vas izaziva na duel! Prihvatate?`;

                    const accepted = await this.modal.confirm(text.replace('{0}', safeChallengerName), {
                        title: gt('duel_title') || "IZAZOV",
                        okText: gt('btn_accept') || "Prihvati",
                        cancelText: gt('btn_decline') || "Odbij"
                    });
                    if (!socketAtPrompt || socketAtPrompt !== this.socket || !socketAtPrompt.connected || socketAtPrompt.id !== socketIdAtPrompt) {
                        if (accepted) {
                            this.modal.alert(gt('duel_expired') || 'Istekao je rok za odgovor na duel izazov. Nema pobede ni kazne.', gt('modal_title_info') || "INFO");
                        }
                        return;
                    }

                    if (accepted && expiresAt && Date.now() > expiresAt) {
                        this.setInviteBusyState(false);
                        this.modal.alert(gt('duel_expired') || 'Istekao je rok za odgovor na duel izazov. Nema pobede ni kazne.', gt('modal_title_info') || "INFO");
                        return;
                    }

                    if (accepted) {
                        this.setupSocketListeners(this.playerName || getFallbackPlayerName());
                    }

                    this.socket.emit('challenge_response', {
                        challengerId: challengerId,
                        challengeId: challengeId,
                        accepted: accepted
                    });
                    if (!accepted) {
                        this.setInviteBusyState(false);
                    }
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

                this.socket.on('challenge_expired', (data = {}) => {
                    const customModal = document.getElementById('custom-modal-overlay');
                    if (customModal) customModal.style.display = 'none';

                    setTimeout(() => {
                        const text = data.message || gt('duel_expired') || 'Istekao je rok za odgovor na duel izazov. Nema pobede ni kazne.';
                        this.modal.alert(text, gt('modal_title_info') || "INFO");
                    }, 50);
                });

                this.socket.on('online_room_resume_available', async (data = {}) => {
                    const roomId = data.roomId;
                    if (!roomId) return;

                    if (this.gameActive && this.onlineMode && !this.isSpectator) {
                        localStorage.setItem('yamb_active_online_room', roomId);
                        if (this.roomId === roomId) {
                            this.requestOnlineStateSync(roomId);
                        }
                        return;
                    }

                    const rewardReady = await this.claimPendingRewardBeforeExternalNavigation();
                    if (!rewardReady) return;

                    localStorage.setItem('yamb_active_online_room', roomId);

                    if (typeof window.closeOnlinePlayersModal === 'function') {
                        window.closeOnlinePlayersModal();
                    }

                    const customModal = document.getElementById('custom-modal-overlay');
                    if (customModal) customModal.style.display = 'none';

                    this.resumeOnlineGame(roomId, { directDuel: !!data.directDuel });
                });

                this.socket.on('global_highscores_data', (data) => {
                    if (this.topListManager) this.topListManager.handleGlobalPage(data);
                });
                
                this.socket.on('error_msg', (msgKey) => {
                    if (this.globalChat && this.globalChat.handleError && this.globalChat.handleError(msgKey)) {
                        return;
                    }

                    let finalMsg = msgKey;
                    if (typeof t === 'function' && t(msgKey) !== msgKey) {
                        finalMsg = gt(msgKey);
                    }
                    const waitingScreen = document.getElementById('waiting-screen');
                    const shouldExitRandomWaiting = waitingScreen
                        && waitingScreen.classList.contains('active')
                        && waitingScreen.classList.contains('is-random-online')
                        && ['err_matchmaking_busy', 'err_player_busy'].includes(String(msgKey || ''));
                    const finishErrorNotice = () => {
                        if (finalMsg.includes('Već ste preuzeli') || finalMsg.includes('dnevnu nagradu')) {
                            const uid = localStorage.getItem('yamb_uid');
                            localStorage.setItem('yamb_last_daily_' + uid, this.getDailyChallengeDayKey());
                            this.showMainMenu();
                            return;
                        }
                        if (shouldExitRandomWaiting) this.cancelOnline();
                    };
                    if (this.modal) {
                        this.modal.alert(finalMsg, gt('err_title') || gt('modal_title_info') || "INFO").then(finishErrorNotice);
                    } else {
                        finishErrorNotice();
                    }
                });

                this.socket.on('sync_local_stats', (data) => {
                    this.applyCloudProfileSync(data);
                });

                this.socket.on('tourney_prize_awarded', (data = {}) => {
                    if (!data.role) return;

                    if (this.shouldSuppressTournamentPrizeModal(data)) {
                        if (typeof updateMainMenuDashboard === 'function') {
                            updateMainMenuDashboard();
                        }
                        return;
                    }

                    if (data.role === 'winner') {
                        if (this.soundMgr && this.soundMgr.win) this.soundMgr.win();
                        if (this.effectMgr) this.effectMgr.trigger('gold_rain');
                        this.modal.alert(
                            `<img class="tourney-prize-result-icon tourney-prize-result-icon-easter" src="assets/easter-soft-clay/tournament-pro.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-prize-result-icon-desert" src="assets/desert-soft-clay/tournament-pro.png?v=4" alt="" aria-hidden="true" decoding="async"><img class="tourney-prize-result-icon-nebula" src="assets/severna-soft-clay/tournament-pro-v7.png?v=1" alt="" aria-hidden="true" decoding="async">${gt('tourney_prize_winner') || `ČESTITAMO! Osvojili ste turnir i glavnu nagradu od 44.000 ${dukatIconHtml()}!`}`,
                            gt('tourney_champion_title') || "ŠAMPION TURNIRA 🏆",
                            { contextClass: 'tourney-winner' }
                        );
                    } else if (data.role === 'runnerup') {
                        this.modal.alert(
                            `<img class="tourney-prize-result-icon tourney-prize-result-icon-easter" src="assets/easter-soft-clay/tournament/finalist-silver-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-prize-result-icon-desert" src="assets/desert-soft-clay/tournament/finalist-silver-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-prize-result-icon-nebula" src="assets/severna-soft-clay/tournament/finalist-silver-v3.png?v=1" alt="" aria-hidden="true" decoding="async">${gt('tourney_prize_runnerup') || `Kao finalisti, vraćen Vam je ulog od 5500 ${dukatIconHtml()}. Više sreće sledeći put!`}`,
                            gt('tourney_finalist_title') || "FINALISTA 🥈",
                            { contextClass: 'tourney-finalist' }
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
        const uid = getPlayerId() || this.playerId;
        if (!uid) return { ok: false, reason: 'not_logged_in' };
        localStorage.setItem('yamb_uid', uid);
        this.playerId = uid;
        if (this.socketVerifiedUid === uid && !forceRefresh) {
            return { ok: true, uid: this.socketVerifiedUid };
        }

        const tokenProvider = window.getYambFirebaseIdToken;
        if (typeof tokenProvider !== 'function') return { ok: false, reason: 'token_provider_missing' };

        const token = await tokenProvider(forceRefresh, {
            attempts: forceRefresh ? 8 : 4,
            delayMs: 400
        });
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

    async requestOnlineStateSync(roomId = this.roomId) {
        const targetRoomId = roomId || this.roomId;
        if (!targetRoomId || !this.socket) return { ok: false, reason: 'missing_room' };

        const sendSync = async () => {
            if (!this.socket || !this.socket.connected) return { ok: false, reason: 'socket_disconnected' };

            const authResult = await this.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                console.warn(`Ne tražim sync online sobe dok identitet nije potvrđen: ${authResult?.reason || 'unknown_error'}`);
                return authResult || { ok: false, reason: 'auth_failed' };
            }

            this.socket.emit('request_state_sync', { roomId: targetRoomId });
            return { ok: true };
        };

        if (this.socket.connected) return sendSync();

        return new Promise(resolve => {
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.socket.off('connect', onConnect);
                this.socket.off('connect_error', onError);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            };
            const onConnect = () => {
                sendSync()
                    .then(finish)
                    .catch(err => {
                        console.warn("Greška pri sync-u online sobe posle rekonekcije:", err);
                        finish({ ok: false, reason: 'err_server_conn' });
                    });
            };
            const onError = () => finish({ ok: false, reason: 'err_server_conn' });
            const timer = setTimeout(() => finish({ ok: false, reason: 'sync_timeout' }), 8000);

            this.socket.once('connect', onConnect);
            this.socket.once('connect_error', onError);
            if (this.socket.disconnected) this.socket.connect();
        });
    }

    async handleAuthRequired(result = {}) {
        if (!this.socket || !this.socket.connected) return;
        if (!getPlayerId()) return;
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

    hasMeaningfulLocalProfile() {
        const stats = this.readLocalJson('yamb_stats', {}) || {};
        const numericFields = [
            'games',
            'totalGames',
            'wins',
            'losses',
            'highscore',
            'totalScoreSum',
            'maxWinStreak',
            'tournamentWins',
            'penaltyPoints',
            'balance'
        ];
        const hasStats = numericFields.some(field => Math.max(0, Number(stats[field]) || 0) > 0);
        const hasBalance = (parseInt(localStorage.getItem('yamb_dukati'), 10) || 0) > 0;
        const hasUndoTokens = (parseInt(localStorage.getItem('yamb_undo_tokens'), 10) || 0) > 0;
        const h2hStats = this.readLocalJson('yamb_h2h_stats', {}) || {};
        const hasH2H = Object.keys(h2hStats).length > 0;

        const uid = localStorage.getItem('yamb_uid') || this.playerId || '';
        const leagueData = uid ? (this.readLocalJson('yamb_quarter_data_' + uid, {}) || {}) : {};
        const hasLeague = Math.max(0, Number(leagueData.baselineScore) || 0) > 0 ||
            Math.max(0, Number(leagueData.quarterlyScore) || 0) > 0;

        const freeUnlocks = new Set(['default', 'confetti', 'dark', 'light', 'medium', 'winter']);
        const unlockSources = [
            this.readLocalJson('yamb_unlocked', []) || [],
            this.readLocalJson('yamb_unlocked_skins', []) || [],
            this.readLocalJson('yamb_unlocked_effects', []) || [],
            this.readLocalJson('yamb_unlocked_themes', []) || [],
            Array.isArray(stats.unlockedTrophies) ? stats.unlockedTrophies : [],
            Array.isArray(stats.unlockedSkins) ? stats.unlockedSkins : [],
            Array.isArray(stats.unlockedEffects) ? stats.unlockedEffects : []
        ];
        const hasEarnedUnlock = unlockSources.some(items =>
            Array.isArray(items) && items.some(item => item && !freeUnlocks.has(item))
        );

        return hasStats || hasBalance || hasUndoTokens || hasH2H || hasLeague || hasEarnedUnlock;
    }

    shouldRestoreCloudBeforeProfilePush() {
        if (!getPlayerId() && !this.playerId) return false;
        if (this.gameActive) return false;
        return localStorage.getItem('yamb_force_cloud_restore_next_login') === 'true' ||
            !this.hasMeaningfulLocalProfile();
    }

    async pullCloudProfile(options = {}) {
        if (!this.socket || !this.socket.connected) return { ok: false, reason: 'socket_disconnected' };

        const authResult = await this.authenticateSocketIdentity(!!options.forceRefresh);
        if (!authResult || !authResult.ok) {
            return { ok: false, reason: authResult?.reason || 'auth_failed' };
        }

        return new Promise(resolve => {
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.socket.off('sync_local_stats', onSync);
                resolve(result || { ok: false, reason: 'profile_sync_timeout' });
            };
            const onSync = (payload) => {
                if (payload) {
                    this.applyCloudProfileSync(payload);
                    localStorage.removeItem('yamb_force_cloud_restore_next_login');
                    finish({ ok: true, cloudStats: payload });
                } else {
                    finish({ ok: false, reason: 'empty_profile_payload' });
                }
            };
            const timer = setTimeout(() => finish({ ok: false, reason: 'profile_sync_timeout' }), options.timeoutMs || 4000);

            this.socket.once('sync_local_stats', onSync);
            this.socket.emit('request_profile_sync', {}, (result = {}) => {
                if (!result.ok) finish(result);
            });
        });
    }

    async emitPlayerData(forceRefreshAuth = false, options = {}) {
        if (!this.socket || !this.socket.connected) return { ok: false, reason: 'socket_disconnected' };

        const shouldRestore = options.preferCloudRestore || this.shouldRestoreCloudBeforeProfilePush();
        let restoreResult = null;
        if (shouldRestore) {
            restoreResult = await this.pullCloudProfile({
                forceRefresh: forceRefreshAuth,
                timeoutMs: options.timeoutMs || 4000
            });

            if ((!restoreResult || !restoreResult.ok) &&
                restoreResult?.reason !== 'profile_not_found' &&
                !this.hasMeaningfulLocalProfile()) {
                console.warn(`Cloud restore nije potvrđen (${restoreResult?.reason || 'no_restore_result'}). Blokiram slanje praznog lokalnog profila.`);
                return {
                    ok: false,
                    reason: restoreResult?.reason || 'cloud_restore_required',
                    blockedEmptyProfilePush: true
                };
            }
        }

        const authResult = await this.authenticateSocketIdentity(forceRefreshAuth);
        if (!authResult || !authResult.ok) {
            console.warn(`Ne šaljem profil serveru dok Firebase identitet nije potvrđen: ${authResult?.reason || 'unknown_error'}`);
            return authResult || { ok: false, reason: 'auth_failed' };
        }

        if (window.trophyManager && typeof window.trophyManager.retryPendingClaims === 'function') {
            try {
                const pendingResult = await window.trophyManager.retryPendingClaims();
                if (pendingResult && pendingResult.remaining > 0) {
                    console.warn(`Odlažem profile sync dok se ne potvrdi ${pendingResult.remaining} pending trofej(a).`);
                    return {
                        ok: false,
                        reason: 'pending_trophy_claims',
                        pendingTrophies: pendingResult.remaining
                    };
                }
            } catch (err) {
                console.warn('Pending trofeji nisu potvrđeni pre profile sync-a:', err);
                return { ok: false, reason: 'pending_trophy_claim_error' };
            }
        }

        const uid = authResult.uid;
        const syncWait = options.waitForSync ? this.waitForProfileSync(options.timeoutMs || 4000) : null;

        this.socket.emit('set_player_data', {
            uid: uid,
            name: this.playerName,
            photoUrl: localStorage.getItem('yamb_player_photo') || '',
            stats: this.getFullLocalStats(),
            playerId: this.playerId
        });

        if (authResult && authResult.ok && window.yambPushNotifications && typeof window.yambPushNotifications.ensureRegistered === 'function') {
            window.yambPushNotifications.ensureRegistered(this)
                .catch(err => console.warn("Push registracija nije uspela:", err));
        }

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

    async refreshProfileAfterOnlineRoomClosed() {
        if (!getPlayerId()) return null;
        if (!this.socket || !this.socket.connected) return null;

        try {
            return await this.emitPlayerData(false, { waitForSync: true, timeoutMs: 5000 });
        } catch (err) {
            console.warn("Nije uspelo osvežavanje profila posle zatvorene online sobe:", err);
            return null;
        }
    }

    getPendingMatchResultsKey() {
        const uid = getPlayerId() || this.playerId;
        return uid ? `yamb_pending_match_results_${uid}` : '';
    }

    createClientMatchResultId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID().replace(/-/g, '_');
        }
        return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
    }

    readPendingMatchResults() {
        const key = this.getPendingMatchResultsKey();
        if (!key) return [];
        const pending = this.readLocalJson(key, []);
        return Array.isArray(pending) ? pending : [];
    }

    writePendingMatchResults(results) {
        const key = this.getPendingMatchResultsKey();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(Array.isArray(results) ? results : []));
    }

    submitPendingMatchResult(result, options = {}) {
        return new Promise(resolve => {
            if (!this.socket || !this.socket.connected) {
                resolve({ ok: false, reason: 'socket_disconnected', permanent: false });
                return;
            }

            let settled = false;
            const finish = (response) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(response || { ok: false, reason: 'no_response', permanent: false });
            };
            const timer = setTimeout(() => {
                finish({ ok: false, reason: 'match_result_timeout', permanent: false });
            }, 8000);

            this.socket.emit('submit_match_result', {
                ...result,
                profileMayIncludeResult: options.profileMayIncludeResult === true
            }, finish);
        });
    }

    async syncPendingMatchResults(options = {}) {
        if (this.matchResultSyncPromise) return this.matchResultSyncPromise;

        this.matchResultSyncPromise = (async () => {
            if (!this.socket || !this.socket.connected || !(getPlayerId() || this.playerId)) {
                return { ok: false, remaining: this.readPendingMatchResults().length };
            }

            const authResult = await this.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: authResult?.reason || 'auth_failed', remaining: this.readPendingMatchResults().length };
            }

            let pending = this.readPendingMatchResults();
            let profileNotFound = false;

            for (const item of [...pending]) {
                if (!item || item.syncRejected) continue;
                const response = await this.submitPendingMatchResult(item, options);

                if (response && response.ok) {
                    pending = pending.filter(candidate => candidate.clientResultId !== item.clientResultId);
                    this.writePendingMatchResults(pending);
                    continue;
                }

                if (response?.reason === 'profile_not_found') profileNotFound = true;
                if (response && response.permanent) {
                    pending = pending.map(candidate => candidate.clientResultId === item.clientResultId
                        ? { ...candidate, syncRejected: response.reason || 'server_rejected' }
                        : candidate);
                    this.writePendingMatchResults(pending);
                } else {
                    break;
                }
            }

            return {
                ok: pending.length === 0,
                remaining: pending.filter(item => item && !item.syncRejected).length,
                profileNotFound
            };
        })();

        try {
            return await this.matchResultSyncPromise;
        } finally {
            this.matchResultSyncPromise = null;
        }
    }

    async queueCompletedLocalMatchResult({ mode, participants, playerIndex }) {
        const uid = getPlayerId() || this.playerId;
        if (!uid || !Array.isArray(participants) || participants.length === 0) return null;

        const entry = {
            clientResultId: this.createClientMatchResultId(),
            gameSessionToken: this.localGameSessionToken || '',
            mode: String(mode || 'Solo').toLowerCase(),
            participants: participants.map(participant => ({
                name: String(participant?.name || getFallbackPlayerName()).substring(0, 24),
                score: Math.max(0, Math.floor(Number(participant?.score) || 0))
            })),
            scoreSheets: Array.isArray(this.allScores) ? this.allScores : [],
            playerIndex: Math.max(0, Math.min(participants.length - 1, Number(playerIndex) || 0)),
            profileGamesAfter: Math.max(0, Math.floor(Number(this.stats?.games) || 0)),
            profileTotalScoreAfter: Math.max(0, Math.floor(Number(this.stats?.totalScoreSum) || 0)),
            profileHighscoreAfter: Math.max(0, Math.floor(Number(this.stats?.highscore) || 0)),
            finishedAt: Date.now()
        };

        const pending = this.readPendingMatchResults();
        pending.push(entry);
        this.writePendingMatchResults(pending);
        await this.syncPendingMatchResults();
        return entry.clientResultId;
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

    isDoNotDisturbActive() {
        const dailyActive = window.dnevniIzazov && (window.dnevniIzazov.isActive || window.dnevniIzazov.isIntroPlaying);
        return !!((this.gameActive && !this.isSpectator) || dailyActive);
    }

    setInviteBusyState(isBusy, reason = 'client_busy') {
        this.clientInviteBusy = !!isBusy;
        this.clientInviteBusyReason = this.clientInviteBusy ? reason : '';

        const emitBusy = () => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('set_player_busy', {
                    busy: this.clientInviteBusy,
                    reason: this.clientInviteBusyReason
                });
            }
        };

        if (this.socket && this.socket.connected) {
            emitBusy();
        } else if (this.socket && this.clientInviteBusy) {
            this.socket.once('connect', emitBusy);
            if (this.socket.disconnected) this.socket.connect();
        }
    }

    showServerNotice(msgKey, titleKey = 'modal_title_info') {
        let finalMsg = msgKey;
        if (typeof t === 'function' && t(msgKey) !== msgKey) {
            finalMsg = gt(msgKey);
        }

        const title = gt(titleKey) || gt('modal_title_info') || "INFO";
        if (this.modal) {
            this.modal.alert(finalMsg, title);
        } else if (typeof window.showNotification === 'function') {
            window.showNotification(title, finalMsg);
        } else {
            alert(finalMsg);
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
            if (this.isDoNotDisturbActive()) return;
            console.log("Invite detected: " + roomId);
            this.inviteDetected = true;

            if (!this.requireLogin()) return; // ZABRANA ZA GOSTE

            if (this.splashTimeout) { clearTimeout(this.splashTimeout); this.splashTimeout = null; }
            this.navigateTo('splash-screen'); 
            setTimeout(() => { this.joinPrivateGame(this.playerName, roomId); }, 500); 
        }
    }

    clampLocalGameElapsed(value) {
        const elapsed = parseInt(value, 10);
        if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
        return Math.min(elapsed, 6 * 60 * 60 * 1000);
    }

    startLocalGameClock(carriedElapsedMs = 0) {
        this.localGameElapsedMs = this.clampLocalGameElapsed(carriedElapsedMs);
        this.localGameActiveStartedAt = Date.now();
    }

    getLocalGameElapsedMs() {
        let elapsed = this.clampLocalGameElapsed(this.localGameElapsedMs);
        if (this.gameActive && !this.onlineMode && this.localGameActiveStartedAt) {
            elapsed += Date.now() - this.localGameActiveStartedAt;
        }
        return this.clampLocalGameElapsed(elapsed);
    }

    pauseLocalGameClock() {
        this.localGameElapsedMs = this.getLocalGameElapsedMs();
        this.localGameActiveStartedAt = 0;
    }

    resumeLocalGameClock() {
        if (!this.gameActive || this.onlineMode || this.localGameActiveStartedAt) return;
        this.localGameActiveStartedAt = Date.now();
    }

    buildLocalGameSessionPayload(roomId = this.roomId) {
        return {
            roomId,
            gameSessionToken: this.localGameSessionToken || ''
        };
    }

    emitLocalGameSessionStart() {
        if (!this.socket || !this.roomId || this.onlineMode || this.isSpectator) return;
        const emitStart = () => {
            if (this.socket && this.socket.connected && this.roomId) {
                this.socket.emit('start_local_game', this.buildLocalGameSessionPayload(), (result = {}) => {
                    if (!result.ok || !result.gameSessionToken) return;
                    this.localGameSessionToken = result.gameSessionToken;
                });
            }
        };

        if (this.socket.connected) {
            emitStart();
        } else {
            this.socket.once('connect', emitStart);
            if (this.socket.disconnected) this.socket.connect();
        }
    }

    handleAppPause() {
        if (this.gameActive && this.onlineMode && !this.isSpectator && this.socket && this.roomId && this.isTournamentOnlineDuel(this.roomId, { duelType: this.onlineDuelType })) {
            localStorage.setItem('yamb_active_online_room', this.roomId);
            if (this.socket.connected) {
                this.socket.emit('online_app_backgrounded', { roomId: this.roomId });
            }
        }

        if (this.gameActive && !this.onlineMode) {
            this.pauseLocalGameClock();
            localStorage.setItem('yamb_local_recovery_pending', 'true');
            this.autoSaveGame(true);
        }
    }

    handleAppResume() {
        this.checkForInvite();

        if (this.gameActive && !this.onlineMode) {
            this.resumeLocalGameClock();
            this.initSocketConnection();
            this.emitLocalGameSessionStart();
            this.autoSaveGame(true);
            return;
        }

        if (this.tournamentManager && this.socket) {
            const requestTournamentState = () => {
                this.socket.emit('tourney_get_state');
            };

            if (this.socket.connected) {
                requestTournamentState();
            } else {
                this.socket.once('connect', requestTournamentState);
                if (this.socket.disconnected) this.socket.connect();
            }
        }

        if (this.gameActive && this.onlineMode && !this.isSpectator && this.socket) {
            const requestSync = () => {
                const roomId = this.roomId;
                if (!roomId) return;

                if (this.isTournamentOnlineDuel(roomId, { duelType: this.onlineDuelType })) {
                    this.socket.emit('online_app_resumed', { roomId });
                    this.emitOnlinePresencePing(true);
                }

                this.requestOnlineStateSync(roomId);
            };

            if (this.socket.connected) {
                requestSync();
            } else {
                this.socket.once('connect', requestSync);
                if (this.socket.disconnected) this.socket.connect();
            }
            return;
        }

        this.checkSavedGame();
    }
    
    navigateTo(screenId) {
        if (screenId !== 'game-scene') this.clearOnlineGameOverDelay();
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
        if (this.soundMgr) {
            if (screenId === 'splash-screen' && this.soundMgr.playIntro) {
                this.soundMgr.playIntro();
            } else if (this.soundMgr.stopIntro) {
                this.soundMgr.stopIntro();
            }
        }
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

        const ready = await this.ensureSocketReadyForOnline(8000);
        if (!ready.ok) {
            const reason = ready.reason === 'err_friend_timeout' ? 'err_duel_timeout' : ready.reason;
            this.showServerNotice(reason || 'sys_no_conn', 'err_title');
            return;
        }
        const socketAtPrompt = this.socket;
        this.setupSocketListeners(this.playerName || getFallbackPlayerName());
        if (!this.isDoNotDisturbActive() && this.clientInviteBusy) {
            this.setInviteBusyState(false);
        }

        let askText = gt('duel_ask');
        if (askText === 'duel_ask') askText = `Želite li da izazovete igrača {0} na duel?`;

        const safeTargetName = this.escapeHtml(targetName || getFallbackPlayerName());
        const isConfirmed = await this.modal.confirm(askText.replace('{0}', safeTargetName), {
            title: gt('duel_title') || "IZAZOV",
            okText: gt('online_challenge_btn') || "IZAZOVI",
            cancelText: gt('modal_btn_cancel') || "OTKAŽI"
        });
        if(isConfirmed) {
            if (!socketAtPrompt || socketAtPrompt !== this.socket || !socketAtPrompt.connected) {
                this.modal.alert(gt('sys_no_conn') || "Niste povezani na server.", gt('err_title') || "GREŠKA");
                return;
            }

            const result = await this.emitSocketAck('send_challenge', { targetId, targetUid, challengerName: this.playerName }, 8000);
            if (!result.ok) {
                const reason = result.reason === 'err_friend_timeout' ? 'err_duel_timeout' : result.reason;
                this.showServerNotice(reason || 'err_server_conn', 'err_title');
                return;
            }

            let sentText = gt('duel_sent');
            if (sentText === 'duel_sent') sentText = `Izazov poslat igraču {0}. Čekamo odgovor...`;

            if (typeof window.showNotification === 'function') {
                window.showNotification(gt('duel_title') || "IZAZOV", sentText.replace('{0}', targetName || getFallbackPlayerName()));
            } else {
                this.modal.alert(sentText.replace('{0}', safeTargetName), gt('duel_title') || "IZAZOV");
            }
        }
    }
    
    async requestRematch() {
        if (!this.socket || this.isSpectator || !this.onlineMode) return;

        const btnRematch = document.getElementById('btn-rematch');
        if (btnRematch) {
            btnRematch.disabled = true;
            btnRematch.innerHTML = `<span>⏳ ${gt('hs_loading')}</span>`;
            btnRematch.style.background = 'linear-gradient(45deg, #FF9800, #F57C00)';
            btnRematch.style.boxShadow = 'none';
        }

        this.soundMgr.click();
        const rewardReady = await this.claimPendingBaseRewardBeforeRematch();
        if (!rewardReady) {
            if (btnRematch) {
                btnRematch.disabled = false;
                btnRematch.innerHTML = `<span data-lang="go_rematch">${gt('go_rematch')}</span>`;
                btnRematch.style.background = 'linear-gradient(45deg, #4CAF50, #2E7D32)';
            }
            this.modal.alert(gt('reward_claim_retry') || "Nagrada još nije potvrđena. Pokušajte ponovo za par sekundi.", gt('modal_title_info') || "INFO");
            return;
        }
        this.socket.emit('request_rematch');
    }

    showSettings(options = {}) {
        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('settings')) {
            this.playEasterRoomIntro('settings', () => this.showSettings({ skipRoomIntro: true }));
            return;
        }

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
            this.syncThemeSelectOptions(themeSelect);
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
            const nextTheme = this.isThemeUnlocked(value) ? value : 'dark';
            this.themeManualSwitchUntil = Date.now() + 2500;
            localStorage.setItem('yamb_theme', nextTheme);
            const themeSelect = document.getElementById('setting-theme');
            if (themeSelect) themeSelect.blur();
            this.applyTheme(nextTheme, { manualSwitch: true, loadingDelayMs: 260 });
            if (themeSelect) themeSelect.value = nextTheme;
        }
        else if (type === 'language') {
            const nextLanguage = value === 'en' ? 'en' : (value === 'sr' ? 'sr' : null);
            if (!nextLanguage) return;
            localStorage.setItem('yamb_lang', nextLanguage);
            localStorage.setItem('yamb_lang_changed_at', String(Date.now()));
            localStorage.setItem('yamb_lang_pending_sync', nextLanguage);
            document.documentElement.lang = nextLanguage;
            if (typeof applyTranslations === 'function') applyTranslations();
        }

        if (this.socket && this.socket.connected) {
            this.emitPlayerData();
        }
    }

    updateStats(score, resultType, oppScore = 0, isTechnical = false, options = {}) {
        let freshStats = this.readLocalJson('yamb_stats', null);
        this.stats = freshStats || this.stats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0, penaltyPoints: 0, currentWinStreak: 0, maxWinStreak: 0 };
        const serverAppliedResult = !!options.serverApplied;
        const safeStatNumber = (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
        };
        const safeScore = safeStatNumber(score);
        const safeOppScore = safeStatNumber(oppScore);
        this.stats.games = Math.max(safeStatNumber(this.stats.games), safeStatNumber(this.stats.totalGames));
        this.stats.totalGames = this.stats.games;
        this.stats.totalScoreSum = safeStatNumber(this.stats.totalScoreSum);
        this.stats.highscore = safeStatNumber(this.stats.highscore || this.stats.highScore);
        this.stats.wins = safeStatNumber(this.stats.wins);
        this.stats.losses = safeStatNumber(this.stats.losses);
        this.stats.currentWinStreak = safeStatNumber(this.stats.currentWinStreak);
        this.stats.maxWinStreak = safeStatNumber(this.stats.maxWinStreak);

        if (!serverAppliedResult && !isTechnical) {
            this.stats.games++;
            this.stats.totalGames = this.stats.games;
            this.stats.totalScoreSum += safeScore;
            if (safeScore > this.stats.highscore) this.stats.highscore = safeScore;
        } else if (!serverAppliedResult && isTechnical) {
            this.stats.games++;
            this.stats.totalGames = this.stats.games;
            this.stats.totalScoreSum += safeScore;
        }

        if (this.onlineMode && !this.isSpectator && !serverAppliedResult) {
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

            if (this.players.length === 2 && !options.skipH2H) {
                const oppIndex = Number.isInteger(this.myOnlineIndex) && this.myOnlineIndex >= 0
                    ? (this.myOnlineIndex === 0 ? 1 : 0)
                    : this.players.findIndex(p => p !== this.playerName);
                const oppName = this.players[oppIndex];
                if (oppIndex >= 0 && oppName) {
                    let passMyScore = isTechnical ? 0 : safeScore;
                    let passOppScore = isTechnical ? 0 : safeOppScore;
                    this.updateH2HStats(oppName, this.currentOpponentPhoto || '', resultType, passMyScore, passOppScore, this.currentOpponentUid);
                }
            }
        }
        
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats)); 

        if (window.statsManager) {
            window.statsManager.stats = this.stats;
        }

        if (!serverAppliedResult && !options.deferServerSync && this.socket && this.socket.connected) {
            this.emitPlayerData();
        }
    }

    showStats(options = {}) {
        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('statistics')) {
            this.playEasterRoomIntro('statistics', () => this.showStats({ skipRoomIntro: true }));
            return;
        }

        this.refreshLocalStats();
        this.navigateTo('stats-screen'); 
        const h2hRecord = this.getLocalH2HRecordSummary();
        document.getElementById('stat-games').innerText = this.stats.games; 
        document.getElementById('stat-high').innerText = this.stats.highscore; 
        this.reconcileStatsHighscoreFromStoredScores().then(updated => {
            if (!updated) return;
            const highEl = document.getElementById('stat-high');
            if (highEl) highEl.innerText = this.stats.highscore;
        }).catch(err => console.warn("Nije moguće uskladiti rekord iz top liste:", err));
        document.getElementById('stat-wins').innerText = h2hRecord.wins; 
        const drawsEl = document.getElementById('stat-draws');
        if (drawsEl) drawsEl.innerText = h2hRecord.draws;
        document.getElementById('stat-losses').innerText = h2hRecord.losses; 
        const avg = this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 0;
        document.getElementById('stat-avg').innerText = avg;

        const totalCompetitive = h2hRecord.wins + h2hRecord.losses + h2hRecord.draws; 
        let rate = 0; let winWidth = 0; let drawWidth = 0; let lossWidth = 0;
        if (totalCompetitive > 0) {
            rate = Math.round((h2hRecord.wins / totalCompetitive) * 100);
            winWidth = rate;
            drawWidth = Math.round((h2hRecord.draws / totalCompetitive) * 100);
            lossWidth = Math.max(0, 100 - winWidth - drawWidth);
        }

        document.getElementById('stat-rate').innerText = rate + "%";
        const winBar = document.getElementById('stat-bar-win'); const drawBar = document.getElementById('stat-bar-draw'); const lossBar = document.getElementById('stat-bar-loss');
        if(winBar) winBar.style.width = winWidth + "%"; if(drawBar) drawBar.style.width = drawWidth + "%"; if(lossBar) lossBar.style.width = lossWidth + "%";

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
        const trophyIds = window.powerIndexCore ? window.powerIndexCore.TROPHY_IDS : [];
        const realTrophyCount = window.powerIndexCore ? window.powerIndexCore.countPowerIndexTrophies(trophyList) : 0;
        document.getElementById('stat-trophies').innerText = `${realTrophyCount} / ${trophyIds.length}`;
        
        let currentStreak = this.stats.currentWinStreak || 0;
        if (sm) { const stats = sm.getStats(); currentStreak = stats.currentWinStreak > 0 ? stats.currentWinStreak : currentStreak; }
        document.getElementById('stat-streak').innerText = currentStreak;

        const allTimePts = this.stats.totalScoreSum || 0;
        const allTimeEl = document.getElementById('stat-alltime');
        if (allTimeEl) allTimeEl.innerText = allTimePts;

        let h2h = this.normalizeH2HStats(this.readLocalJson('yamb_h2h_stats', {}));
        localStorage.setItem('yamb_h2h_stats', JSON.stringify(h2h));
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
            if (favGamesEl) favGamesEl.innerText = this.h2hMatchText(totalGames);
            
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
            if (favGamesEl) favGamesEl.innerText = this.h2hMatchText(0);
            if (favImgEl) favImgEl.style.display = 'none';
        }

        this.renderH2HStats();
        
        this.updateOnlineCounterUI();
    }

    async showHighscoresScreen() {
        const rewardReady = await this.claimPendingRewardBeforeExternalNavigation();
        if (!rewardReady) return;

        if (this.shouldPlayThemedRoomIntro('leaderboard')) {
            this.playEasterRoomIntro('leaderboard', () => {
                this.navigateTo('highscores-screen');
                this.switchHsTab('global');
            });
            return;
        }

        this.navigateTo('highscores-screen');
        this.switchHsTab('global');
    }

    shouldPlayEasterRoomIntro() {
        return (localStorage.getItem('yamb_theme') || 'dark') === 'easter';
    }

    shouldPlayDesertRoomIntro(roomId) {
        return (localStorage.getItem('yamb_theme') || 'dark') === 'desert'
            && ['leaderboard', 'statistics', 'settings', 'rules', 'globalChat', 'onlinePlayers', 'economy', 'hotseat', 'opponent', 'invite'].includes(roomId);
    }

    shouldPlaySevernaRoomIntro(roomId) {
        return (localStorage.getItem('yamb_theme') || 'dark') === 'severna'
            && ['leaderboard', 'statistics', 'settings', 'rules', 'globalChat', 'onlinePlayers', 'economy', 'hotseat', 'opponent', 'invite', 'solo'].includes(roomId);
    }

    shouldPlayThemedRoomIntro(roomId) {
        return this.shouldPlayEasterRoomIntro()
            || this.shouldPlayDesertRoomIntro(roomId)
            || this.shouldPlaySevernaRoomIntro(roomId);
    }

    playEasterRoomIntro(roomId, onComplete) {
        if (this.easterRoomIntroPlaying) return;

        const rooms = {
            leaderboard: {
                icon: 'assets/easter-soft-clay/leaderboard-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/leaderboard-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/leaderboard-pro-v8.png?v=1',
                scale: 1.16,
                label: () => gt('hs_title') || 'TOP LISTA'
            },
            statistics: {
                icon: 'assets/easter-soft-clay/statistics-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/statistics-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/statistics-pro-v9.png?v=1',
                scale: 1.06,
                label: () => gt('menu_stats') || 'STATISTIKA'
            },
            settings: {
                icon: 'assets/easter-soft-clay/settings-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/settings-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/settings-pro-v9.png?v=1',
                scale: 1,
                label: () => gt('menu_settings') || 'PODEŠAVANJA'
            },
            rules: {
                icon: 'assets/easter-soft-clay/rules-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/rules-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/rules-pro-v10.png?v=1',
                scale: 1.16,
                label: () => gt('menu_rules') || 'PRAVILA'
            },
            solo: {
                icon: 'assets/easter-soft-clay/mode-solo-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/mode-solo-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/mode-solo-pro-v6.png?v=1',
                scale: 1,
                label: () => gt('menu_solo') || ((localStorage.getItem('yamb_lang') || 'sr').startsWith('en') ? 'SOLO GAME' : 'SOLO IGRA')
            },
            hotseat: {
                icon: 'assets/easter-soft-clay/mode-hotseat-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/mode-hotseat-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/mode-hotseat-pro-v6.png?v=1',
                scale: 1,
                label: () => (localStorage.getItem('yamb_lang') || 'sr').startsWith('en')
                    ? 'TWO PLAYERS HOTSEAT'
                    : 'DVA IGRAČA HOTSEAT'
            },
            opponent: {
                icon: 'assets/easter-soft-clay/mode-opponent-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/mode-opponent-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/mode-opponent-pro-v6.png?v=1',
                scale: 1.2,
                label: () => (localStorage.getItem('yamb_lang') || 'sr').startsWith('en')
                    ? 'FIND OPPONENT'
                    : 'NAĐI PROTIVNIKA'
            },
            invite: {
                icon: 'assets/easter-soft-clay/mode-invite-pro.png?v=1',
                desertIcon: 'assets/desert-soft-clay/mode-invite-pro.png?v=1',
                severnaIcon: 'assets/severna-soft-clay/mode-invite-pro-v6.png?v=1',
                scale: 1.05,
                label: () => (localStorage.getItem('yamb_lang') || 'sr').startsWith('en')
                    ? 'INVITE FRIEND'
                    : 'POZOVI PRIJATELJA'
            },
            globalChat: {
                icon: 'assets/easter-soft-clay/global-chat-pro-v4.png',
                desertIcon: 'assets/desert-soft-clay/global-chat-pro.png?v=2',
                severnaIcon: 'assets/severna-soft-clay/global-chat-pro-v6.png?v=1',
                scale: 1,
                label: () => 'GLOBAL CHAT'
            },
            onlinePlayers: {
                icon: 'assets/easter-soft-clay/online-players-pro-v2.png?v=1',
                desertIcon: 'assets/desert-soft-clay/online-players-pro.png?v=3',
                severnaIcon: 'assets/severna-soft-clay/online-players-pro-v5.png?v=1',
                scale: 1,
                label: () => (localStorage.getItem('yamb_lang') || 'sr').startsWith('en')
                    ? 'ONLINE PLAYERS'
                    : 'ONLINE IGRAČI'
            },
            economy: {
                icon: 'assets/easter-soft-clay/ducats-undo-pro-v2.png?v=1',
                desertIcon: 'assets/desert-soft-clay/ducats-undo-pro.png?v=2',
                severnaIcon: 'assets/severna-soft-clay/ducats-undo-pro-v6.png?v=1',
                scale: 1,
                lines: () => [
                    gt('menu_ducats') || 'DUKATI',
                    gt('undo_title') || 'ISPRAVI ZADNJI UPIS'
                ]
            }
        };
        const room = rooms[roomId];
        const overlay = document.getElementById('easter-room-intro');
        const iconElement = overlay?.querySelector('.easter-room-intro-mark');
        const titleElement = overlay?.querySelector('.easter-room-intro-title');
        if (!overlay || !titleElement) {
            onComplete();
            return;
        }

        if (!room) {
            onComplete();
            return;
        }

        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const introTheme = activeTheme === 'severna' && room.severnaIcon
            ? 'severna'
            : (activeTheme === 'desert' && room.desertIcon ? 'desert' : 'easter');

        if (iconElement) {
            iconElement.src = introTheme === 'severna'
                ? room.severnaIcon
                : (introTheme === 'desert' ? room.desertIcon : room.icon);
            iconElement.style.setProperty('--easter-room-icon-scale', room.scale || 1);
        }
        const titleLines = (room.lines ? room.lines() : [room.label()])
            .map(line => String(line).replace(/^[^\p{L}\p{N}]+/u, '').trim().toUpperCase())
            .filter(Boolean);
        let waveIndex = 0;
        const createWaveLetters = (line) => Array.from(line).map(character => {
            const letter = document.createElement('span');
            letter.className = character === ' '
                ? 'easter-room-intro-wave-space'
                : 'easter-room-intro-wave-letter';
            letter.textContent = character === ' ' ? '\u00A0' : character;
            letter.style.setProperty('--wave-index', waveIndex++);
            return letter;
        });

        titleElement.classList.toggle('easter-room-intro-title--stacked', titleLines.length > 1);
        if (titleLines.length > 1) {
            titleElement.replaceChildren(...titleLines.map((line, lineIndex) => {
                const lineElement = document.createElement('span');
                lineElement.className = `easter-room-intro-title-line easter-room-intro-title-line--${lineIndex + 1}`;
                lineElement.append(...createWaveLetters(line));
                return lineElement;
            }));
        } else {
            const title = titleLines[0] || '';
            titleElement.replaceChildren(...createWaveLetters(title));
        }
        titleElement.setAttribute('aria-label', titleLines.join(' – '));

        this.easterRoomIntroPlaying = true;
        overlay.classList.remove('theme-easter', 'theme-desert', 'theme-severna');
        overlay.classList.add(`theme-${introTheme}`);
        overlay.classList.add('hidden');
        void overlay.offsetWidth;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');

        setTimeout(() => {
            onComplete();
        }, 3650);

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            this.easterRoomIntroPlaying = false;
        }, 4600);
    }

    async showMainMenu(options = {}) {
        const rewardReady = await this.claimPendingRewardBeforeExternalNavigation();
        if (!rewardReady) return;

        this.clearOnlineGameOverDelay();
        this.onlineGameOverFinishInProgress = false;
        const wasSpectator = this.isSpectator;
        const hadLiveGameContext = !wasSpectator && (this.gameActive || this.onlineMode || !!this.roomId);
        const wasLocalLiveGame = hadLiveGameContext && this.gameActive && !this.onlineMode;

        await this.autoSaveGame(true);
        if (wasLocalLiveGame) this.pauseLocalGameClock();
        localStorage.removeItem('yamb_local_recovery_pending');
        this.setInviteBusyState(false);
        this.onlineRollPending = false;
        this.onlineTurnTimerPaused = false;

        if (wasSpectator) {
            if (this.spectateSyncRetryTimer) {
                clearTimeout(this.spectateSyncRetryTimer);
                this.spectateSyncRetryTimer = null;
            }
            this.spectateSyncRetryAttempts = 0;
            this.isSpectator = false;
            if (this.socket) this.socket.emit('stop_spectating');
            this.onlineMode = false;
            this.gameActive = false;
            this.roomId = null;
            this.onlineDuelType = null;
            this.lastOnlineGameResult = null;

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

        if (!wasSpectator && !options.skipBackToMenu && this.socket && this.socket.connected) {
            this.socket.emit('back_to_menu');
        }

        if (hadLiveGameContext) {
            if (this.onlineMode) localStorage.removeItem('yamb_active_online_room');
            this.gameActive = false;
            this.onlineMode = false;
            this.isSpectator = false;
            this.roomId = null;
            this.myOnlineIndex = 0;
            this.onlineDuelType = null;
            this.lastOnlineGameResult = null;
            this.currentOpponentPhoto = '';
            this.currentOpponentUid = null;
            this.timeLeft = 90;
        }

        this.navigateTo('main-menu');
        const floatBtn = document.getElementById('chat-float-btn');
        if(floatBtn) floatBtn.classList.add('hidden');
        document.getElementById('chat-window').classList.remove('active');
        this.chatOpen = false;

        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);

        const timerDisplay = document.getElementById('turn-timer-display');
        if (timerDisplay && !this.isSpectator) timerDisplay.style.display = 'none';

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
    
    showRules(options = {}) {
        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('rules')) {
            this.playEasterRoomIntro('rules', () => this.showRules({ skipRoomIntro: true }));
            return;
        }

        if (typeof window.showGameRules === 'function') window.showGameRules();
    }
    
    async quitToMenu() { 
        if (this.onlineGameOverDelayActive) {
            return;
        }

        const confirmKey = this.isSpectator ? 'alert_spectate_quit_confirm' : 'alert_quit_confirm';
        if (await this.modal.confirm(gt(confirmKey))) { 
            let backToMenuSent = false;
            if (this.gameActive && this.players.length > 1 && !this.isSpectator && this.onlineMode) {
                // Server jedini obračunava tehnički poraz, H2H, kaznene poene,
                // ligu i dukate. Šaljemo odmah, pre eventualnog interstitial oglasa.
                if (this.socket && this.socket.connected) {
                    this.socket.emit('back_to_menu');
                    backToMenuSent = true;
                }
            }

            if (!this.isSpectator && this.adMob && this.adMob.showInterstitial) {
                await this.adMob.showInterstitial();
            }

            this.showMainMenu({ skipBackToMenu: backToMenuSent });
        }
    }

    normalizeWaitingPlayerName(name) {
        const normalizedName = String(name || '').replace(/\s+/g, ' ').trim();
        return normalizedName || getFallbackPlayerName();
    }

    getCurrentOnlinePlayerName(candidateName = '') {
        const authUser = window.yambAuthState?.user || null;
        const normalizeName = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const fallbackName = normalizeName(getFallbackPlayerName());
        const fallbackKey = fallbackName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const isPlaceholderName = (value) => {
            const key = normalizeName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            return !key || key === fallbackKey || key === 'igrac' || key === 'player';
        };

        const names = [
            authUser?.displayName,
            authUser?.name,
            candidateName,
            this.playerName,
            localStorage.getItem('yamb_player_name')
        ].map(normalizeName).filter(Boolean);

        const displayName = names.find(name => !isPlaceholderName(name)) || names[0] || fallbackName;

        this.playerName = displayName;
        localStorage.setItem('yamb_player_name', displayName);
        return displayName;
    }

    renderWaitingPlayerName(elementId, name) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const displayName = this.normalizeWaitingPlayerName(name);
        // Nakon prijave ovo je stvarno ime, a ne prevodiva generička oznaka.
        // Uklanjanje data-lang sprečava da promena jezika vrati tekst "Igrač".
        element.removeAttribute('data-lang');
        element.textContent = displayName;
        element.title = displayName;
        element.style.removeProperty('font-size');

        const fitNameToCard = () => {
            if (!element.isConnected) return;

            const maxHeight = element.clientHeight;
            const maxWidth = element.clientWidth;
            if (!maxHeight || !maxWidth) return;

            let fontSize = parseFloat(window.getComputedStyle(element).fontSize) || 14;
            const minimumFontSize = 9.5;

            while (
                fontSize > minimumFontSize &&
                (element.scrollHeight > maxHeight + 1 || element.scrollWidth > maxWidth + 1)
            ) {
                fontSize -= 0.5;
                element.style.fontSize = `${fontSize}px`;
            }
        };

        window.requestAnimationFrame(fitNameToCard);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(fitNameToCard).catch(() => {});
        }
    }

    async startPrivateHosting(options = {}) {
        if (!this.requireLogin()) return;

        const nickname = this.getCurrentOnlinePlayerName();
        if (!nickname) return;

        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('invite')) {
            this.playEasterRoomIntro('invite', () => this.startPrivateHosting({ skipRoomIntro: true }));
            return;
        }

        const roomId = "yamb-" + Math.random().toString(36).substring(2, 8);
        this.currentHostingRoomId = roomId; 
        
        let baseUrl = window.location.origin;
        if (typeof SERVER_URL !== 'undefined' && SERVER_URL.startsWith('http')) baseUrl = SERVER_URL;
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const shareUrl = baseUrl + "/?room=" + roomId;

        this.navigateTo('waiting-screen');
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            waitingScreen.classList.add('is-hosting-invite');
            waitingScreen.classList.remove('is-random-online');
        }

        const titleEl = document.getElementById('waiting-title');
        if (titleEl) {
            titleEl.setAttribute('data-lang', 'ws_title_invite');
            titleEl.innerText = gt('ws_title_invite') || "POZOVI PRIJATELJA";
        }

        const msgEl = document.getElementById('wait-msg');
        if (msgEl) {
            msgEl.setAttribute('data-lang', 'ws_msg_invite');
            msgEl.innerText = gt('ws_msg_invite') || "Pošaljite link, odaberite prijatelja iz liste ili dodajte novog!";
        }
        
        const myImg = document.getElementById('waiting-my-img');
        const authImg = document.getElementById('auth-user-photo');
        if (myImg && authImg && authImg.src && authImg.src.includes('http')) myImg.src = authImg.src;
        else if (myImg) myImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=333&color=E0C995`;
        
        this.renderWaitingPlayerName('waiting-my-name', nickname);
        
        const myStats = this.getFullLocalStats();
        const myH2HRecord = this.getLocalH2HRecordSummary();
        const myPowerEl = document.getElementById('waiting-my-power');
        if (myPowerEl) myPowerEl.innerText = this.calculatePowerIndex(myStats, true);
        
        this.renderWaitingH2HRecord('my', myH2HRecord);
        this.renderInviteOwnerRival();

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
        this.stopWaitingHofRotation();

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

        const resolvedNickname = this.getCurrentOnlinePlayerName(nickname);

        this.navigateTo('waiting-screen');
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            waitingScreen.classList.toggle('is-hosting-invite', Boolean(isHost));
            waitingScreen.classList.remove('is-random-online');
        }

        const myImg = document.getElementById('waiting-my-img');
        const authImg = document.getElementById('auth-user-photo');
        if (myImg && authImg && authImg.src && authImg.src.includes('http')) {
            myImg.src = authImg.src;
        } else if (myImg) {
            myImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedNickname)}&background=333&color=E0C995`;
        }

        this.renderWaitingPlayerName('waiting-my-name', resolvedNickname);
        
        const myStats = this.getFullLocalStats();
        const myH2HRecord = this.getLocalH2HRecordSummary();
        const myPowerEl = document.getElementById('waiting-my-power');
        if (myPowerEl) myPowerEl.innerText = this.calculatePowerIndex(myStats, true);
        
        this.renderWaitingH2HRecord('my', myH2HRecord);
        if (isHost) this.renderInviteOwnerRival();

        const oppBox = document.getElementById('waiting-opp-box');
        const vsBadge = document.getElementById('waiting-vs-badge');
        if (oppBox) {
            if (isHost) {
                oppBox.style.display = 'none'; 
            } else {
                oppBox.style.display = 'flex'; 
                const searchingUI = document.getElementById('waiting-opp-searching');
                const foundUI = document.getElementById('waiting-opp-found');
                if (searchingUI) searchingUI.style.display = 'flex';
                if (foundUI) foundUI.style.display = 'none';
                oppBox.classList.add('is-searching');
                oppBox.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                oppBox.style.boxShadow = 'var(--glass-shadow)';
            }
        }
        if (vsBadge) vsBadge.style.display = isHost ? 'none' : 'grid';

        const friendsContainer = document.getElementById('friends-list-container');
        if (friendsContainer && !isHost) friendsContainer.classList.add('hidden');

        const hofContainer = document.getElementById('ws-hall-of-fame');
        if (hofContainer) hofContainer.classList.add('hidden');
        this.stopWaitingHofRotation();

        this.initSocketConnection();
        this.setupSocketListeners(resolvedNickname);

        const photoUrl = (authImg && authImg.src && authImg.src.includes('http')) ? authImg.src : '';

        const ready = await this.ensureSocketReadyForOnline(8000);
        if (!ready.ok) {
            this.showServerNotice(ready.reason || 'sys_no_conn', 'err_title');
            this.cancelOnline();
            return;
        }

        this.socket.emit('join_private_game', { nickname: resolvedNickname, roomId, photoUrl });
    }
    
    async setupOnline(mode = 'random', options = {}) {
        if (!this.requireLogin()) return;

        const nickname = this.getCurrentOnlinePlayerName();
        if (!nickname) return;

        if (mode === 'random' && !options.skipRoomIntro && this.shouldPlayThemedRoomIntro('opponent')) {
            this.playEasterRoomIntro('opponent', () => this.setupOnline('random', { skipRoomIntro: true }));
            return;
        }

        this.navigateTo('waiting-screen');
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            waitingScreen.classList.remove('is-hosting-invite');
            waitingScreen.classList.add('is-random-online');
        }

        const titleEl = document.getElementById('waiting-title');
        if (titleEl) {
            titleEl.setAttribute('data-lang', 'ws_searching');
            titleEl.innerText = gt('ws_searching') || "TRAŽENJE PROTIVNIKA...";
        }

        const msgEl = document.getElementById('wait-msg');
        if (msgEl) {
            msgEl.setAttribute('data-lang', 'ws_wait_msg');
            msgEl.innerText = gt('ws_wait_msg') || "Molimo sačekajte, spajamo vas sa prvim slobodnim igračem.";
        }

        const myImg = document.getElementById('waiting-my-img');
        const authImg = document.getElementById('auth-user-photo');
        if (myImg && authImg && authImg.src && authImg.src.includes('http')) myImg.src = authImg.src;
        else if (myImg) myImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=333&color=E0C995`;
        
        this.renderWaitingPlayerName('waiting-my-name', nickname);
        
        const myStats = this.getFullLocalStats();
        const myH2HRecord = this.getLocalH2HRecordSummary();
        const myPowerEl = document.getElementById('waiting-my-power');
        if (myPowerEl) myPowerEl.innerText = this.calculatePowerIndex(myStats, true);
        
        this.renderWaitingH2HRecord('my', myH2HRecord);

        const oppBox = document.getElementById('waiting-opp-box');
        const vsBadge = document.getElementById('waiting-vs-badge');
        
        if (oppBox) {
            oppBox.style.display = 'flex';
            const searchingUI = document.getElementById('waiting-opp-searching');
            const foundUI = document.getElementById('waiting-opp-found');
            if (searchingUI) searchingUI.style.display = 'flex';
            if (foundUI) foundUI.style.display = 'none';
            oppBox.classList.add('is-searching');
            this.refreshWaitingOpponentSearchText();
        }
        if (vsBadge) vsBadge.style.display = 'grid';

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

        const ready = await this.ensureSocketReadyForOnline(8000);
        if (!ready.ok) {
            this.showServerNotice(ready.reason || 'sys_no_conn', 'err_title');
            this.cancelOnline();
            return;
        }

        // Random soba nije poziv prijatelju: stari status zauzetosti za
        // pozivnice ne sme da blokira ulazak u red za prvog slobodnog igrača.
        if (this.clientInviteBusy) this.setInviteBusyState(false);
        const photoUrl = (authImg && authImg.src && authImg.src.includes('http')) ? authImg.src : '';
        this.socket.emit('find_game', { nickname: nickname, photoUrl: photoUrl });
    }

    inferOnlineDuelType(roomId = this.roomId, payload = {}) {
        if (payload && payload.duelType) return payload.duelType;
        const id = String(roomId || '');
        if (id.startsWith('tourney_')) return 'tournament';
        if (id.startsWith('duel_')) return 'challenge';
        if (id.startsWith('yamb-')) return 'friend_invite';
        if (id.startsWith('room_')) return 'random';
        return this.onlineDuelType || 'online';
    }

    isTournamentOnlineDuel(roomId = this.roomId, payload = {}) {
        return this.inferOnlineDuelType(roomId, payload) === 'tournament';
    }

    emitOnlinePresencePing(force = false) {
        if (!this.gameActive || !this.onlineMode || this.isSpectator) return;
        if (!this.socket || !this.socket.connected || !this.roomId) return;
        if (!this.isTournamentOnlineDuel(this.roomId, { duelType: this.onlineDuelType })) return;

        const now = Date.now();
        if (!force && this.lastOnlinePresencePingAt && now - this.lastOnlinePresencePingAt < 2000) return;

        this.lastOnlinePresencePingAt = now;
        this.socket.emit('online_presence_ping', { roomId: this.roomId });
    }

    formatReconnectGraceTime(ms) {
        const totalSeconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    clearOpponentReconnectGraceCountdown() {
        if (this.opponentReconnectGraceTimer) {
            clearInterval(this.opponentReconnectGraceTimer);
            this.opponentReconnectGraceTimer = null;
        }
        this.opponentReconnectGraceDeadline = 0;
        const gameScene = document.getElementById('game-scene');
        if (gameScene) gameScene.classList.remove('opponent-reconnecting');
    }

    showOpponentReconnectGraceCountdown(data = {}) {
        const remainingMs = Number(data.remainingMs ?? data.disconnectGraceRemainingMs ?? data.graceMs);
        const safeRemainingMs = Number.isFinite(remainingMs) && remainingMs > 0 ? remainingMs : 0;

        this.clearOpponentReconnectGraceCountdown();
        if (safeRemainingMs > 0) {
            this.opponentReconnectGraceDeadline = Date.now() + safeRemainingMs;
        }
        const gameScene = document.getElementById('game-scene');
        const isRandomOpponentRoom = this.inferOnlineDuelType(this.roomId, { duelType: this.onlineDuelType }) === 'random';
        if (gameScene) gameScene.classList.toggle('opponent-reconnecting', isRandomOpponentRoom);

        const render = () => {
            const timerDisplay = document.getElementById('turn-timer-display');
            if (!timerDisplay) return;

            const msLeft = this.opponentReconnectGraceDeadline
                ? Math.max(0, this.opponentReconnectGraceDeadline - Date.now())
                : 0;
            const template = gt('opp_network_issue_countdown') || '⚠️ Protivnik nije u igri. Čekamo povratak još {0}.';
            const fallbackText = gt('opp_network_issue') || '⚠️ Protivnik ima problema sa mrežom...';
            const text = this.opponentReconnectGraceDeadline
                ? template.replace('{0}', this.formatReconnectGraceTime(msLeft))
                : fallbackText;

            timerDisplay.style.display = 'flex';
            timerDisplay.innerHTML = `<img class="easter-opponent-connection-icon" src="assets/easter-soft-clay/opponent/disconnected.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="desert-opponent-connection-icon" src="assets/desert-soft-clay/opponent/disconnected.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="severna-opponent-connection-icon" src="assets/severna-soft-clay/opponent/disconnected-v3.png?v=1" alt="" aria-hidden="true" decoding="async"><span style="color:#ffcc00; font-size: 0.8rem;">${text}</span>`;
            timerDisplay.style.animation = 'pulse 1s infinite';

            if (this.opponentReconnectGraceDeadline && msLeft <= 0) {
                this.clearOpponentReconnectGraceCountdown();
            }
        };

        render();
        if (this.opponentReconnectGraceDeadline) {
            this.opponentReconnectGraceTimer = setInterval(render, 1000);
        }
    }

    startClientTimer(initialTimeLeft = 90) {
        if (!this.onlineMode || this.isSpectator) return;
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        this.clearOpponentReconnectGraceCountdown();
        this.onlineTurnTimerPaused = false;

        const parsedInitialTimeLeft = Number(initialTimeLeft);
        this.timeLeft = Number.isFinite(parsedInitialTimeLeft)
            ? Math.max(-3, Math.min(90, Math.ceil(parsedInitialTimeLeft)))
            : 90;
        this.lastTimeoutCheckAt = 0;
        this.updateStatusLabel();
        this.emitOnlinePresencePing(true);

        this.turnTimerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateStatusLabel();
            this.emitOnlinePresencePing();

            const isMyTurn = (this.currentPlayerIdx === this.myOnlineIndex) && !this.isSpectator;
            
            // ---> FIX: ANTI-DESYNC POLLING (Popravlja Deadlock pri gubitku paketa) <---
            if (!isMyTurn && this.socket && this.roomId) {
                // Ako čekamo protivnika, tiho pitamo server za pravo stanje svakih 10 sekundi
                if (this.timeLeft % 10 === 0) {
                    console.log("🔄 ANTI-DESYNC: Tiha provera stanja sa serverom da sprečimo zaglavljivanje...");
                    this.socket.emit('request_state_sync', { roomId: this.roomId });
                }
            }

            if (this.timeLeft <= -3) {
                if (!isMyTurn && this.socket && this.roomId) {
                    const now = Date.now();
                    if (this.lastTimeoutCheckAt && now - this.lastTimeoutCheckAt < 3000) return;
                    this.lastTimeoutCheckAt = now;
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
                timerDisplay.classList.remove('timer-turn--opponent', 'timer-turn--urgent');
                timerDisplay.style.display = 'flex';
                timerDisplay.innerHTML = `<span class="spectator-live-pill" style="color:#fff; background:var(--danger); padding:4px 10px; border-radius:12px; font-weight:900; font-size:0.8rem; letter-spacing:1px; box-shadow:0 0 10px rgba(244,67,54,0.6);"><span class="spectator-live-fallback" aria-hidden="true">👁️</span><img class="easter-spectating-live-icon" src="assets/easter-soft-clay/online-spectate-pro.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="desert-spectating-live-icon" src="assets/desert-soft-clay/online-spectate-pro.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="severna-spectating-live-icon" src="assets/severna-soft-clay/online-spectate-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async"> ${gt('live_badge') || 'UŽIVO'}</span>`;
                timerDisplay.style.animation = 'pulse 2s infinite';
            } else if (this.onlineMode && this.gameActive) {
                timerDisplay.style.display = 'flex';
                const isMyTurn = (this.currentPlayerIdx === this.myOnlineIndex) && !this.isSpectator;

                const isUrgent = this.timeLeft <= 10;
                timerDisplay.classList.toggle('timer-turn--opponent', !isMyTurn && !isUrgent);
                timerDisplay.classList.toggle('timer-turn--urgent', isUrgent);

                // Opponent's timer needs a universal high-contrast color: some themes use a light background.
                const color = isUrgent ? '#ff4c4c' : (isMyTurn ? 'var(--gold-main)' : '#ffffff');
                
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
                timerDisplay.classList.remove('timer-turn--opponent', 'timer-turn--urgent');
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
        this.socket.off('room_invite_accepted');
        this.socket.off('room_invite_declined');
        this.socket.off('room_invite_busy');
        this.socket.off('room_invite_expired');
        
        this.socket.off('request_state_sync');
        this.socket.off('sync_state_response');
        this.socket.off('spectate_started');

        this.socket.off('global_highscores_data');
        this.socket.on('global_highscores_data', (data) => {
            if (this.topListManager) this.topListManager.handleGlobalPage(data);
        });

        this.socket.off('weekly_top3_data');
        this.socket.on('weekly_top3_data', (data) => {
            this.renderHallOfFame(data);
        });
        this.socket.off('waiting_top3_data');
        this.socket.on('waiting_top3_data', (payload) => {
            if (payload && payload.period && payload.period !== this.waitingHofPeriod) return;
            this.renderHallOfFame(payload && Array.isArray(payload.data) ? payload.data : payload);
        });

        this.socket.off('opponent_connection_lost');
        this.socket.on('opponent_connection_lost', (data = {}) => {
            if (this.isSpectator) return;

            this.onlineTurnTimerPaused = true;
            if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
            this.showOpponentReconnectGraceCountdown(data);

            const btnBacaj = document.getElementById('btn-bacaj');
            if (btnBacaj) btnBacaj.disabled = true;

            const btnNajava = document.getElementById('btn-najava');
            if (btnNajava) btnNajava.disabled = true;

            this.updateTableVisuals();
        });

        this.socket.off('opponent_connection_restored');
        this.socket.on('opponent_connection_restored', (data = {}) => {
            if (this.isSpectator) return;
            this.clearOpponentReconnectGraceCountdown();

            const restoredUid = String(data.restoredUid || '');
            const myUid = String(this.playerId || localStorage.getItem('yamb_uid') || '');
            const restoredOpponent = !restoredUid || !myUid || restoredUid !== myUid;
            const isRandomOpponentRoom = this.inferOnlineDuelType(this.roomId, { duelType: this.onlineDuelType }) === 'random';
            const gameScene = document.getElementById('game-scene');
            if (gameScene) gameScene.classList.remove('opponent-reconnecting');

            if (restoredOpponent && typeof window.showNotification === 'function') {
                window.showNotification(
                    gt('info_title') || "INFO",
                    gt('opp_reconnected') || "Protivnik se vratio u igru!",
                    isRandomOpponentRoom
                        ? {
                            icon: (localStorage.getItem('yamb_theme') || 'dark') === 'severna'
                                ? 'assets/severna-soft-clay/opponent/reconnected-v3.png?v=1'
                                : this.getSoftClayThemeAsset('opponent/reconnected.png?v=2'),
                            className: 'opponent-reconnected-toast'
                        }
                        : {}
                );
            }

            this.requestOnlineStateSync(this.roomId);
        });

        this.socket.off('room_spectators_count');
        this.socket.on('room_spectators_count', (count) => {
            this.updateSpectatorIcon(count);
        });

        this.socket.off('previous_quarter_winner_data');
        this.socket.on('previous_quarter_winner_data', (data) => {
            if (data?.settling) {
                clearTimeout(this.quarterWinnerRetryTimer);
                this.quarterWinnerRetryTimer = setTimeout(() => {
                    if (this.socket && this.socket.connected) {
                        this.socket.emit('get_previous_quarter_winner', { year: data.year, quarter: data.quarter });
                    }
                }, Math.min(Math.max(1000, Number(data.retryAfterMs) + 1000), 24 * 60 * 60 * 1000));
                return;
            }

            if (!data) {
                const now = new Date();
                const leaguePeriod = window.kvartalnaLiga && typeof window.kvartalnaLiga.getCurrentQuarterInfo === 'function'
                    ? window.kvartalnaLiga.getCurrentQuarterInfo()
                    : { currentYear: now.getFullYear(), currentQuarter: Math.floor(now.getMonth() / 3) + 1 };
                let prevQ = leaguePeriod.currentQuarter - 1;
                let prevY = leaguePeriod.currentYear;
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

        this.socket.off('quarter_reward_check_result');
        this.socket.on('quarter_reward_check_result', (result = {}) => {
            if (result.ok || result.permanent) {
                localStorage.removeItem('yamb_pending_quarter_check');
            }
        });

        this.socket.off('quarter_reward');
        this.socket.on('quarter_reward', (data) => {
            const { rank, reward } = data;

            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }
            
            this.soundMgr.win();
            this.effectMgr.trigger('gold_rain');
            
            const medalType = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
            const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
            const activeQlRewardTheme = localStorage.getItem('yamb_theme') || 'dark';
            const qlAssetRoot = activeQlRewardTheme === 'severna'
                ? 'assets/severna-soft-clay/ql'
                : (activeQlRewardTheme === 'desert' ? 'assets/desert-soft-clay/ql' : 'assets/easter-soft-clay/ql');
            const qlMedalFile = activeQlRewardTheme === 'severna'
                ? `medal-${medalType}-v3.png?v=1`
                : `medal-${medalType}.png?v=2`;
            let medalja = `<span class="ql-quarter-reward-medal"><img class="ql-placement-medal ql-placement-medal--reward" src="${qlAssetRoot}/${qlMedalFile}" alt="" aria-hidden="true" decoding="async"><span class="ql-medal-fallback" aria-hidden="true">${medalEmoji}</span></span>`;
            let msg = (gt('quarter_reward_msg') || `Čestitamo! Osvojili ste {0}. mesto {1} u Kvartalnoj ligi i nagradu od {2} ${dukatIconHtml()}!`)
                        .replace('{0}', rank).replace('{1}', medalja).replace('{2}', reward);
            
            this.modal.alert(msg, gt('quarter_reward_title') || "KRAJ KVARTALA 🏆");
        });

        this.socket.off('game_over_timeout');
        this.socket.on('game_over_timeout', async (data) => {
            this.onlineDuelType = this.inferOnlineDuelType(this.roomId, data);
            if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
            this.clearOpponentReconnectGraceCountdown();
            this.onlineTurnTimerPaused = false;
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

                if (window.kvartalnaLiga && !data.serverApplied) {
                    window.kvartalnaLiga.addPoints(winnerReward);
                }

                this.updateStats(winnerReward, 'win', 0, true, { skipH2H: !!data.serverApplied, serverApplied: !!data.serverApplied });

                await this.showTechnicalGameOver({
                    resultType: 'win',
                    winnerName: data.winnerName || this.playerName,
                    loserName: data.loserName || data.opponent || 'Protivnik',
                    rewardAmount: winnerReward,
                    penaltyAmount: coinPenalty,
                    message: data.message || (gt('timeout_technical_win_msg') || 'Protivniku je isteklo vreme. Tehnička pobeda.')
                });
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

                if (window.kvartalnaLiga && !data.serverApplied) {
                    window.kvartalnaLiga.addPoints(-coinPenalty);
                }

                if (window.kvartalnaLiga) {
                    let ptsLostStr = (gt('league_pts_lost') || `-{0} poena u Ligi<br>-{0} ${dukatIconHtml()} Dukata`).replace(/\{0\}/g, coinPenalty);
                    msgDodatak += `<br><span style="color:var(--danger); font-weight:bold;">${ptsLostStr}</span>`;
                }

                this.updateStats(0, 'loss', 0, true, { skipH2H: !!data.serverApplied, serverApplied: !!data.serverApplied });

                await this.showTechnicalGameOver({
                    resultType: 'loss',
                    winnerName: data.winnerName || 'Protivnik',
                    loserName: data.loserName || this.playerName,
                    rewardAmount: winnerReward,
                    penaltyAmount: coinPenalty || penalty,
                    message: (data.message || gt('timeout_loss_msg') || "Isteklo vam je vreme!") + msgDodatak
                });
            }
        });

        this.socket.on('spectate_started', (data) => {
            this.onlineMode = true;
            this.isSpectator = true;
            // Tematski spectator prikaz prati aktivnog igrača samo pri promeni poteza,
            // kako ručno pomeranje između dve pune table ne bi bilo vraćano unazad.
            this.dualBoardLastFollowedPlayerIdx = null;
            this.gameActive = true;
            this.roomId = data.roomId;
            this.modeTag = "Spectator";
            this.players = [];
            this.allScores = [];
            this.currentPlayerIdx = 0;
            this.myOnlineIndex = -1;
            this.brojBacanja = 0;
            this.kockiceVals = [0,0,0,0,0,0];
            this.zadrzane = [false,false,false,false,false,false];
            this.najavaAktivna = false;
            this.najavljenoPolje = null;

            this.navigateTo('game-scene');

            const tablesContainer = document.getElementById('tables-container');
            if (tablesContainer) tablesContainer.innerHTML = '';

            const btnBacaj = document.getElementById('btn-bacaj');
            const btnNajava = document.getElementById('btn-najava');
            if(btnBacaj) btnBacaj.style.display = 'none';
            if(btnNajava) btnNajava.style.display = 'none';

            this.updateDiceVisuals();
            this.updateStatusLabel();
            this.requestSpectateStateSync({ attempts: 5, delayMs: 900 });
        });

        this.socket.on('request_state_sync', (request = {}) => {
            if (this.gameActive && !this.isSpectator) {
                console.log("📤 Šaljem osveženo stanje table (uključujući igrače)...");
                this.socket.emit('sync_state_response', {
                    roomId: this.roomId,
                    targetSocketId: request.senderSocketId || request.targetSocketId || '',
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
            if (!this.isCurrentRoomPayload(data)) return;
            if (this.isSpectator && !this.gameActive) return;

            this.onlineRollPending = false;

            if ((this.gameActive || this.isSpectator) && this.onlineMode) {
                console.log("📥 Stiglo osveženo stanje. Primenjujem...");
                const previousTurnIdx = this.currentPlayerIdx;
                const previousTimeLeft = this.timeLeft;
                
                if (data.players || (this.isSpectator && Array.isArray(data.allScores) && data.allScores.length > 0)) {
                    const incomingPlayers = data.players || data.allScores.map((_, index) => `${getFallbackPlayerName()} ${index + 1}`);
                    this.players = incomingPlayers.map(p => {
                        if (typeof p === 'object' && p !== null) {
                            return p.name ? decodeURIComponent(p.name) : getFallbackPlayerName();
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

                if (Array.isArray(data.allScores)) this.allScores = data.allScores;
                if (data.currentPlayerIdx !== undefined) this.currentPlayerIdx = data.currentPlayerIdx;
                if (data.brojBacanja !== undefined) this.brojBacanja = data.brojBacanja;
                if (Array.isArray(data.kockiceVals)) this.kockiceVals = data.kockiceVals;
                if (Array.isArray(data.zadrzane)) this.zadrzane = data.zadrzane;
                this.najavaAktivna = data.najavaAktivna;
                this.najavljenoPolje = data.najavljenoPolje;

                const turnTimerPaused = data.turnTimerPaused === true;
                this.onlineTurnTimerPaused = turnTimerPaused;
                this.updateTableVisuals();
                this.updateDiceVisuals();
                this.highlightCurrentPlayer();
                this.updateStatusLabel();

                if (this.isSpectator && this.hasSpectateScoreboard() && this.spectateSyncRetryTimer) {
                    clearTimeout(this.spectateSyncRetryTimer);
                    this.spectateSyncRetryTimer = null;
                }

                const turnStartTime = Number(data.turnStartTime);
                const serverNow = Number(data.serverNow);
                const turnTimeLimitMs = Number(data.turnTimeLimitMs) || 90000;
                const syncedTimeLeft = Number.isFinite(turnStartTime) && Number.isFinite(serverNow)
                    ? Math.ceil((turnTimeLimitMs - Math.max(0, serverNow - turnStartTime)) / 1000)
                    : undefined;
                const fallbackTimeLeft = this.currentPlayerIdx === previousTurnIdx ? previousTimeLeft : 90;
                if (turnTimerPaused) {
                    if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
                    this.showOpponentReconnectGraceCountdown(data);
                } else {
                    this.clearOpponentReconnectGraceCountdown();
                    this.startClientTimer(syncedTimeLeft !== undefined ? syncedTimeLeft : fallbackTimeLeft);
                }

                if (!this.isSpectator) {
                    const btnBacaj = document.getElementById('btn-bacaj');
                    const isMyTurn = (this.currentPlayerIdx === this.myOnlineIndex);
                    if (btnBacaj) {
                        if (turnTimerPaused) {
                            btnBacaj.disabled = true; btnBacaj.innerText = gt('game_opponent_turn') || "PROTIVNIK IGRA...";
                        } else if (isMyTurn && this.brojBacanja < 3) {
                            btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll') || "BACAJ";
                        } else if (isMyTurn) {
                            btnBacaj.disabled = true; btnBacaj.innerText = gt('game_write') || "UPIŠI";
                        } else {
                            btnBacaj.disabled = true; btnBacaj.innerText = gt('game_opponent_turn') || "PROTIVNIK IGRA...";
                        }
                    }

                    const btnNajava = document.getElementById('btn-najava');
                    if (btnNajava) {
                        if (turnTimerPaused) {
                            btnNajava.disabled = true;
                        } else if (this.najavaAktivna) {
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

            if (typeof window.closeOnlinePlayersModal === 'function') {
                window.closeOnlinePlayersModal();
            }

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
            this.gameActive = true;
            this.modeTag = "Online";
            this.isSpectator = false;
            this.roomId = data.roomId;
            this.onlineDuelType = this.inferOnlineDuelType(data.roomId, data);
            this.lastOnlineGameResult = null;
            this.dualBoardLastFollowedPlayerIdx = null;
            const opponentName = this.normalizeWaitingPlayerName(data.opponent);
            this.players = this.myOnlineIndex === 0 ? [nickname, opponentName] : [opponentName, nickname];
            this.initScores();
            this.currentPlayerIdx = 0;
            const btnBacajActive = document.getElementById('btn-bacaj');
            const btnNajavaActive = document.getElementById('btn-najava');
            if (btnBacajActive) btnBacajActive.style.display = '';
            if (btnNajavaActive) btnNajavaActive.style.display = '';
            
            const searchingUI = document.getElementById('waiting-opp-searching');
            const foundUI = document.getElementById('waiting-opp-found');
            const oppBox = document.getElementById('waiting-opp-box');
            const waitingScreen = document.getElementById('waiting-screen');
            const canShowWaitingTransition = !data.directDuel && waitingScreen && waitingScreen.classList.contains('active') && searchingUI && foundUI && oppBox;

            if (canShowWaitingTransition) {
                oppBox.style.display = 'flex'; 
                searchingUI.style.display = 'none';
                foundUI.style.display = 'flex';
                oppBox.classList.remove('is-searching');

                oppBox.style.borderColor = 'var(--danger)';
                oppBox.style.boxShadow = '0 5px 15px rgba(244, 67, 54, 0.2)';
                
                const oppImg = document.getElementById('waiting-opp-img');
                if (data.oppPhoto && data.oppPhoto.length > 5) {
                    oppImg.src = data.oppPhoto;
                } else {
                    oppImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.opponent)}&background=333&color=E0C995`;
                }
                
                const oppNameEl = document.getElementById('waiting-opp-name');
                if (oppNameEl) this.renderWaitingPlayerName('waiting-opp-name', opponentName);
                
                let oppPI = 0;
                let oppH2HRecord = {};
                if (data.oppStats) {
                    oppPI = this.calculatePowerIndex(data.oppStats, false);
                    oppH2HRecord = data.oppStats.h2hRecord || {};
                }

                document.getElementById('waiting-opp-power').innerText = oppPI;
                this.renderWaitingH2HRecord('opp', oppH2HRecord, data.oppStats || null);

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

        this.socket.off('online_game_finished');
        this.socket.on('online_game_finished', async (data = {}) => {
            if (!this.isCurrentRoomPayload(data)) return;
            this.clearOpponentReconnectGraceCountdown();
            this.onlineTurnTimerPaused = false;

            if (this.isSpectator) {
                if (!this.onlineMode || !this.gameActive) return;

                if (Array.isArray(data.players) && data.players.length > 0) {
                    this.players = data.players.map(p => {
                        if (typeof p === 'object' && p !== null) return p.name || getFallbackPlayerName();
                        return p || getFallbackPlayerName();
                    });
                    this.createScoreTables();
                }
                this.onlineDuelType = this.inferOnlineDuelType(data.roomId || this.roomId, data);
                this.lastOnlineGameResult = data;
                if (Array.isArray(data.allScores)) this.allScores = data.allScores;
                if (data.currentPlayerIdx !== undefined) this.currentPlayerIdx = data.currentPlayerIdx;

                this.updateTableVisuals();
                this.updateDiceVisuals();
                this.highlightCurrentPlayer();
                this.updateStatusLabel();
                await this.handleGameOver({ force: true });
                return;
            }

            if (!this.onlineMode || (!this.gameActive && !this.onlineGameOverDelayActive)) return;
            if (data.roomId && this.roomId && data.roomId !== this.roomId) return;

            if (Array.isArray(data.players) && data.players.length > 0) {
                this.players = data.players.map(p => {
                    if (typeof p === 'object' && p !== null) return p.name || getFallbackPlayerName();
                    return p || getFallbackPlayerName();
                });
            }
            this.onlineDuelType = this.inferOnlineDuelType(data.roomId || this.roomId, data);
            this.lastOnlineGameResult = data;
            if (Array.isArray(data.allScores)) this.allScores = data.allScores;
            if (data.currentPlayerIdx !== undefined) this.currentPlayerIdx = data.currentPlayerIdx;

            const pendingTournamentFinalCeremony = this.getTournamentFinalCeremonyData(data);
            if (pendingTournamentFinalCeremony) {
                this.rememberTournamentFinalCeremony(pendingTournamentFinalCeremony.role, false);
            }

            this.beginOnlineFinalBoardDelay(data);
        });

        this.socket.on('remote_move', (data) => { 
            if (!this.isCurrentRoomPayload(data)) return;
            if (this.isSpectator && !this.gameActive) return;

            try {
                const playerIdx = data.pIdx !== undefined ? data.pIdx : (this.myOnlineIndex === 0 ? 1 : 0);
                this.currentPlayerIdx = playerIdx;

                if (!this.allScores[playerIdx] || !this.allScores[playerIdx][data.col]) {
                    if (this.isSpectator) {
                        this.requestSpectateStateSync({ attempts: 3, delayMs: 800 });
                    }
                    return;
                }

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
                            btnBacaj.innerText = gt('game_wait') || "SAČEKAJ..."; // ⏳ Grace period
                            
                            setTimeout(() => {
                                // Provera da li je i dalje moj potez (da se u međuvremenu nije desio Undo)
                                if (this.gameActive && !this.onlineTurnTimerPaused && this.currentPlayerIdx === this.myOnlineIndex && this.brojBacanja < 3) {
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

        this.socket.on('remote_roll', async (data) => {
            if (!this.isCurrentRoomPayload(data)) return;
            if (this.isSpectator && !this.gameActive) return;

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
            this.onlineRollPending = false;
            await this.visualRoll(data.values);
            this.updateTableVisuals();

            if (!this.isSpectator) {
                const btnBacaj = document.getElementById('btn-bacaj');
                const btnNajava = document.getElementById('btn-najava');
                const isMyTurn = this.onlineMode && this.currentPlayerIdx === this.myOnlineIndex;
                const isOnlineTurnPaused = this.onlineMode && this.onlineTurnTimerPaused;

                if (btnBacaj) {
                    if (isOnlineTurnPaused) {
                        btnBacaj.disabled = true;
                        btnBacaj.innerText = gt('game_opponent_turn') || "PROTIVNIK IGRA...";
                    } else if (isMyTurn && this.brojBacanja < 3) {
                        btnBacaj.disabled = false;
                        btnBacaj.innerText = gt('game_roll') || "BACAJ";
                    } else if (isMyTurn) {
                        btnBacaj.disabled = true;
                        btnBacaj.innerText = gt('game_write') || "UPIŠI";
                    } else {
                        btnBacaj.disabled = true;
                        btnBacaj.innerText = gt('game_opponent_turn') || "PROTIVNIK IGRA...";
                    }
                }

                if (btnNajava) {
                    if (!isOnlineTurnPaused && isMyTurn && this.brojBacanja === 1 && !this.najavljenoPolje && !this.najavaAktivna) {
                        btnNajava.disabled = false;
                        btnNajava.classList.add('btn-highlight');
                    } else {
                        btnNajava.disabled = true;
                        btnNajava.classList.remove('btn-highlight');
                    }
                }
            }
        }); 

        this.socket.on('remote_hold', (data) => { 
            if (!this.isCurrentRoomPayload(data)) return;
            if (this.isSpectator && !this.gameActive) return;

            this.zadrzane[data.index] = data.status; 
            this.updateDiceVisuals(); 
        }); 

        this.socket.on('remote_announce', (data) => { 
            if (!this.isCurrentRoomPayload(data)) return;
            if (this.isSpectator && !this.gameActive) return;

            const btn = document.getElementById('btn-najava');
            const type = data.type || 'start'; 
            if (type === 'start') {
                this.najavaAktivna = true; 
                this.najavljenoPolje = null;
                if(!this.isSpectator && btn) { btn.classList.add('btn-active-toggle'); btn.innerText = gt('game_opponent_choosing'); }
            } else if (type === 'cancel') {
                this.najavaAktivna = false;
                this.najavljenoPolje = null;
                if(!this.isSpectator && btn) { btn.classList.remove('btn-active-toggle'); btn.innerText = gt('game_announce'); }
            } else if (type === 'selected') {
                this.najavaAktivna = false;
                this.najavljenoPolje = { row: data.row, col: 'Najava' };
                if(!this.isSpectator && btn) { btn.classList.remove('btn-active-toggle'); btn.innerText = `${gt('game_announce')}: ${data.row}`; }
            }

            this.updateTableVisuals();
            this.updateStatusLabel();
        }); 

        this.socket.on('chat_msg', (data) => { if (data.msg) this.appendChatMessage(gt('chat_opponent'), data.msg, "msg-incoming"); }); 
        
        this.socket.on('rematch_requested', async () => {
            if(this.isSpectator) return;
            const accepted = await this.modal.confirm(gt('rematch_ask'));
            if (accepted) {
                const rewardReady = await this.claimPendingBaseRewardBeforeRematch();
                if (rewardReady) {
                    this.socket.emit('accept_rematch');
                } else {
                    this.modal.alert(gt('reward_claim_retry') || "Nagrada još nije potvrđena. Pokušajte ponovo za par sekundi.", gt('modal_title_info') || "INFO");
                    this.socket.emit('chat_msg', { roomId: this.roomId, msg: gt('rematch_declined') });
                }
            } else {
                this.socket.emit('chat_msg', { roomId: this.roomId, msg: gt('rematch_declined') });
            }
        });

        this.socket.on('rematch_started', async () => {
            if(this.isSpectator) {
                this.initScores();
                this.currentPlayerIdx = 0;
                this.updateTableVisuals();
                this.updateDiceVisuals();
                return;
            }
            const rewardReady = await this.claimPendingBaseRewardBeforeRematch();
            if (!rewardReady) {
                this.modal.alert(gt('reward_claim_retry') || "Nagrada još nije potvrđena. Pokušajte ponovo za par sekundi.", gt('modal_title_info') || "INFO");
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
            this.onlineDuelType = this.inferOnlineDuelType(this.roomId, data);
            this.clearOpponentReconnectGraceCountdown();
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
            this.soundMgr.win();
            this.effectMgr.celebrateWin();

            let myAvg = this.stats && this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 500;
            if (isNaN(myAvg) || myAvg < 0) myAvg = 500;
            if (myAvg > 2000) myAvg = 2000;
            const rewardAmount = Number.isFinite(Number(data.reward)) ? Math.max(0, Math.floor(Number(data.reward))) : myAvg;

            if (window.kvartalnaLiga && !data.serverApplied) {
                window.kvartalnaLiga.addPoints(rewardAmount);
            }

            this.updateStats(rewardAmount, 'win', 0, true, { skipH2H: !!data.serverApplied, serverApplied: !!data.serverApplied });

            await this.showTechnicalGameOver({
                resultType: 'win',
                winnerName: data.winnerName || this.playerName,
                loserName: data.loserName || 'Protivnik',
                rewardAmount,
                penaltyAmount: Number.isFinite(Number(data.coinPenalty)) ? Math.max(0, Math.floor(Number(data.coinPenalty))) : rewardAmount,
                message: gt('msg_opponent_left') || "Protivnik je izašao!"
            });
        });

        this.socket.on('incoming_friend_req', async (data = {}) => {
            this.requestFriendsList();

            const challengerUid = data.challengerUid || data.uid || '';
            const challengerName = data.challengerName || getFallbackPlayerName();
            const safeName = this.escapeHtml(challengerName);

            if (!challengerUid) {
                const msg = (gt('alert_friend_req_pending') || "Novi zahtev za prijateljstvo od igrača {0}! Možete ga videti u sekciji 'Prijatelj'.").replace('{0}', safeName);
                await this.modal.alert(msg, gt('alert_info') || "NOVI ZAHTEV");
                return;
            }

            const msg = (gt('alert_friend_req') || "Igrač {0} želi da vas doda u prijatelje. Prihvatate?").replace('{0}', safeName);
            const accepted = await this.modal.confirm(msg, {
                title: gt('alert_info') || "NOVI ZAHTEV",
                okText: gt('btn_accept') || "Prihvati",
                cancelText: gt('btn_decline') || "Odbij"
            });

            await this.resolveFriendRequest(challengerUid, accepted, challengerName);
        });

        this.socket.on('friend_req_accepted', async (data = {}) => {
            await this.showFriendResolutionNotice('accepted', data.name || getFallbackPlayerName());
            this.requestFriendsList();
        });

        this.socket.on('friend_req_declined', async (data = {}) => {
            await this.showFriendResolutionNotice('declined', data.name || getFallbackPlayerName());
            this.requestFriendsList();
        });

        this.socket.on('friends_list_data', async (data = {}) => {
            if (data && data.ok === false) {
                this.renderFriendsList([], []);
                this.friendsListUids = [];
                const now = Date.now();
                if (this.lastFriendsListErrorReason !== data.reason || !this.lastFriendsListErrorAt || now - this.lastFriendsListErrorAt > 15000) {
                    this.lastFriendsListErrorReason = data.reason;
                    this.lastFriendsListErrorAt = now;
                    this.showServerNotice(data.reason || 'err_server_conn', 'err_title');
                }
                return;
            }

            let friends = Array.isArray(data) ? data : (data.friends || []);
            let requests = data.requests || [];

            this.lastFriendsListErrorReason = '';
            this.lastFriendsListErrorAt = 0;
            this.friendsListUids = friends.map(f => f.uid);
            this.renderFriendsList(friends, requests);
            await this.showQueuedFriendNotifications(data.notifications || []);
        });

        this.socket.on('search_results', async (results) => {
            await this.handleFriendSearchResults(results);
        });

        const showRoomInviteStatus = (key, fallback, data = {}, options = {}) => {
            const safeName = this.escapeHtml(data.targetName || data.name || getFallbackPlayerName());
            const text = (gt(key) || fallback).replace('{0}', safeName);
            const title = gt('alert_invite_title') || "POZIVNICA";
            if (typeof window.showNotification === 'function') {
                window.showNotification(title, text, options);
            } else {
                this.modal.alert(text, title);
            }
        };

        this.socket.on('room_invite_accepted', (data = {}) => {
            showRoomInviteStatus('room_invite_accepted', 'Igrač {0} je prihvatio pozivnicu.', data, {
                icon: (localStorage.getItem('yamb_theme') || 'dark') === 'severna'
                    ? 'assets/severna-soft-clay/invite/accepted-v2.png?v=1'
                    : this.getSoftClayThemeAsset('invite/accepted.png?v=1'),
                className: 'invite-accepted-toast'
            });
        });

        this.socket.on('room_invite_declined', (data = {}) => {
            showRoomInviteStatus('room_invite_declined', 'Igrač {0} je odbio pozivnicu.', data);
        });

        this.socket.on('room_invite_busy', (data = {}) => {
            showRoomInviteStatus('room_invite_busy', 'Igrač {0} je trenutno zauzet.', data);
        });

        this.socket.on('room_invite_expired', (data = {}) => {
            showRoomInviteStatus('room_invite_expired', 'Igrač {0} nije odgovorio na pozivnicu.', data);
        });

        this.socket.on('incoming_room_invite', async (data) => {
            let realHostName = data.hostName;
            let hostSocketId = data.hostSocketId || null;
            const inviteId = data.inviteId || '';
            const expiresAt = data.expiresAt || 0;
            const sendRoomInviteResponse = (payload = {}) => {
                if (!this.socket || !this.socket.connected) return;
                this.socket.emit('room_invite_response', {
                    hostSocketId,
                    roomId: data.roomId,
                    inviteId,
                    ...payload
                });
            };
            
            if (data.hostName && data.hostName.includes('|||')) {
                const parts = data.hostName.split('|||');
                realHostName = parts[0];
                hostSocketId = hostSocketId || parts[1];
            }

            if (this.isDoNotDisturbActive()) {
                sendRoomInviteResponse({ accepted: false, busy: true });
                return;
            }

            const msg = (gt('alert_room_invite') || "Vaš prijatelj {0} vas poziva u privatnu sobu. Želite li da igrate?").replace('{0}', this.escapeHtml(realHostName || getFallbackPlayerName()));
            const accepted = await this.modal.confirm(msg);

            if (accepted && expiresAt && Date.now() > expiresAt) {
                this.modal.alert(gt('room_invite_expired_self') || 'Istekao je rok za odgovor na pozivnicu.', gt('modal_title_info') || "INFO");
                return;
            }
            
            if (accepted) {
                sendRoomInviteResponse({ accepted: true });
                this.inviteDetected = true;
                this.currentHostingRoomId = null;
                this.navigateTo('splash-screen');
                setTimeout(() => { this.joinPrivateGame(this.playerName, data.roomId); }, 800);
            } else {
                sendRoomInviteResponse({ accepted: false });
                this.setInviteBusyState(false);
            }
        });

        this.setupOnlineRecoveryListeners();
    }

    setupOnlineRecoveryListeners() {
        if (!this.socket) return;

        // DODATO: Osluškivač odgovora servera o stanju prekinute partije
        this.socket.off('room_status_result');
        this.socket.on('room_status_result', async (data) => {
            const responseRoomId = data && data.roomId;
            const savedRoomId = localStorage.getItem('yamb_active_online_room');

            if (!responseRoomId) return;

            if (this.gameActive && this.onlineMode) {
                if (this.roomId !== responseRoomId) {
                    console.log("ℹ️ Ignorišem zakašneli status stare online sobe:", responseRoomId);
                    return;
                }

                if (!data.active) {
                    console.log("ℹ️ Ignorišem neaktivan room_status za duel koji je već aktivan na klijentu:", responseRoomId);
                    return;
                }
            }

            if (savedRoomId && savedRoomId !== responseRoomId) {
                console.log("ℹ️ Ignorišem room_status za sobu koja više nije zapamćena:", responseRoomId);
                return;
            }

            if (data.active) {
                if (this.gameActive && this.onlineMode) return;
                if (this.onlineRecoveryPromptOpen) return;

                const isTournamentRecovery = data.tournament === true || this.isTournamentOnlineDuel(responseRoomId, data);
                if (isTournamentRecovery) {
                    localStorage.setItem('yamb_active_online_room', responseRoomId);
                    this.resumeOnlineGame(responseRoomId, { autoTournamentRecovery: true });
                    return;
                }

                this.onlineRecoveryPromptOpen = true;
                try {
                    const zeliNastavak = await this.modal.confirm(gt('online_recovery_prompt') || "Imate prekinut online duel! Da li želite da se vratite u igru?");
                    if (zeliNastavak) {
                        this.resumeOnlineGame(data.roomId);
                    } else {
                        localStorage.removeItem('yamb_active_online_room');
                        if (this.socket && this.socket.connected) {
                            this.socket.emit('back_to_menu');
                        }
                    }
                } finally {
                    this.onlineRecoveryPromptOpen = false;
                }
            } else {
                // Soba više ne postoji (istekao grace period), obavesti ga direktno
                localStorage.removeItem('yamb_active_online_room');
                await this.refreshProfileAfterOnlineRoomClosed();
                this.modal.alert(
                    gt('online_recovery_expired_msg') || "Kraj partije zato što ste napustili igru i niste se vratili na vreme.",
                    gt('online_recovery_expired_title') || "KRAJ PARTIJE"
                );
            }
        });

        // DODATO: Zaštita u slučaju da je igrač prekasno ušao (istekao Grace Period)
        this.socket.off('force_cancel_online');
        this.socket.on('force_cancel_online', async (data = {}) => {
            const responseRoomId = data && data.roomId;

            if (this.gameActive && this.onlineMode) {
                if (!responseRoomId || responseRoomId !== this.roomId) {
                    console.log("ℹ️ Ignorišem force_cancel_online za staru/nepoznatu sobu:", responseRoomId);
                    return;
                }
            }

            console.log("Server je odbio rekonekciju: Soba je zatvorena.");
            localStorage.removeItem('yamb_active_online_room');
            await this.refreshProfileAfterOnlineRoomClosed();
            if (this.modal) {
                this.modal.alert(
                    gt('online_recovery_expired_msg') || "Kraj partije zato što ste napustili igru i niste se vratili na vreme.",
                    gt('online_recovery_expired_title') || "KRAJ PARTIJE"
                );
            } else {
                alert(gt('online_recovery_expired_msg') || "Kraj partije zato što ste napustili igru i niste se vratili na vreme.");
            }
            this.cancelOnline(); 
        });
    }
    
    cancelOnline() { 
        localStorage.removeItem('yamb_active_online_room'); 
        this.stopWaitingHofRotation();
        this.showMainMenu(); 
        window.history.pushState({}, document.title, window.location.pathname); 
    }

    async handleModeClick(numPlayers, options = {}) {
        if (!this.requireLogin()) return;

        if(this.soundMgr) this.soundMgr.click();

        const openMode = () => {
            const roomIntroId = numPlayers === 1 ? 'solo' : 'hotseat';
            const shouldPlayModeIntro = numPlayers === 1
                ? this.shouldPlaySevernaRoomIntro('solo')
                : this.shouldPlayThemedRoomIntro('hotseat');
            if (!options.skipRoomIntro && shouldPlayModeIntro) {
                this.playEasterRoomIntro(roomIntroId, () => this.setupGame(numPlayers));
                return;
            }
            this.setupGame(numPlayers);
        };

        if (!window.localforage) {
            openMode();
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
                openMode();
            }
        } catch (e) {
            console.error("Greška pri učitavanju state-a igre:", e);
            openMode();
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
            const roomIntroId = numPlayers === 1 ? 'solo' : 'hotseat';
            const shouldPlayModeIntro = numPlayers === 1
                ? this.shouldPlaySevernaRoomIntro('solo')
                : this.shouldPlayThemedRoomIntro('hotseat');
            if (shouldPlayModeIntro) {
                this.playEasterRoomIntro(roomIntroId, () => this.loadSavedGame(numPlayers));
            } else {
                this.loadSavedGame(numPlayers);
            }
        } else {
            const uid = localStorage.getItem('yamb_uid') || 'guest';
            if (window.localforage) await localforage.removeItem(`yamb_saved_game_${uid}_${numPlayers}`);
            const roomIntroId = numPlayers === 1 ? 'solo' : 'hotseat';
            const shouldPlayModeIntro = numPlayers === 1
                ? this.shouldPlaySevernaRoomIntro('solo')
                : this.shouldPlayThemedRoomIntro('hotseat');
            if (shouldPlayModeIntro) {
                this.playEasterRoomIntro(roomIntroId, () => this.setupGame(numPlayers));
            } else {
                this.setupGame(numPlayers);
            }
        }
    }
    
    async setupGame(numPlayers, isAi = false, diff = 'medium') {
        if (isAi) { console.log("AI is disabled."); return; }
        localStorage.removeItem('yamb_active_online_room');
        localStorage.removeItem('yamb_local_recovery_pending');
        const wasSpectator = this.isSpectator;
        if (wasSpectator && this.socket) this.socket.emit('stop_spectating');

        this.onlineMode = false;
        this.isSpectator = false;
        this.myOnlineIndex = 0;
        this.onlineTurnTimerPaused = false;
        this.players = [];
        this.allScores = [];
        this.dualBoardLastFollowedPlayerIdx = null;
        const gameScene = document.getElementById('game-scene');
        if (gameScene) gameScene.classList.remove('theme-dual-board-view', 'theme-spectator-view', 'easter-spectator-view', 'online-duel-room', 'random-online-duel-room', 'opponent-reconnecting');
        const p1Name = this.playerName; 
        
        if (numPlayers === 1) { this.modeTag = "Solo"; this.players.push(p1Name); } 
        else {
            this.modeTag = "Hotseat"; this.players.push(p1Name);
            for(let i=1; i<numPlayers; i++) {
                let guestName = await this.modal.prompt(`${gt('prompt_player_name')} ${i+1}:`, { cancellable: true });
                if (guestName === null) {
                    this.players = [];
                    this.modeTag = "Solo";
                    return;
                }
                this.players.push(guestName || `${gt('player_guest')} ${i}`);
            }
        }
        
        this.initScores(); this.currentPlayerIdx = 0; 
        
        this.roomId = "local_" + Math.random().toString(36).substring(2, 10);
        this.localGameSessionToken = '';
        this.startLocalGameClock(0);

        this.initSocketConnection();
        this.setupSocketListeners(p1Name);

        this.emitLocalGameSessionStart();
        
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
    
    startGame(options = {}) {
        this.clearOnlineGameOverDelay();
        this.onlineGameOverFinishInProgress = false;
        this.onlineRollPending = false;
        this.dualBoardLastFollowedPlayerIdx = null;

        if (this.onlineMode && this.socket && this.socket.connected && !this.isSpectator && this.playerId) {
            this.socket.emit('game_session_start', {
                roomId: this.roomId,
                onlineMode: this.onlineMode
            });
        }

        this.updateQuickMenuIcons();
        this.updateSpectatorIcon(0);

        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }

        const skipQuote = !!(options && options.skipQuote);

        if (skipQuote) {
            this.navigateTo('game-scene');
        } else {
            this.showQuoteAndProceed();
        }
        this.createScoreTables();
        this.resetTurnLogic();
        this.gameActive = true;
        this.lastGameType = 'normal';
        document.getElementById('chat-body').innerHTML = "";
        const chatBtn = document.getElementById('chat-float-btn');
        if (chatBtn) {
            chatBtn.classList.add('hidden');
            if (skipQuote && this.modeTag !== "Solo" && this.modeTag !== "Hotseat") {
                chatBtn.classList.remove('hidden');
            }
        }
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
        const isOnlineTurnPaused = this.onlineMode && this.onlineTurnTimerPaused;

        if(btnBacaj && !this.isSpectator) {
            if ((isMyTurnOnline && !isOnlineTurnPaused) || isLocalGame) { btnBacaj.disabled = false; btnBacaj.innerText = gt('game_roll'); }
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
        const playerTables = document.querySelectorAll('.player-table');
        playerTables.forEach(el => { el.style.border = "var(--glass-border)"; el.style.boxShadow="none"; el.style.opacity = "0.7"; });
        const activeTbl = document.getElementById(`ptable-${this.currentPlayerIdx}`);
        const gameScene = document.getElementById('game-scene');
        const isEasterTwoPlayerGame = document.body.classList.contains('easter-theme') && this.players.length === 2;
        const isSevernaTwoPlayerGame = document.body.classList.contains('severna-theme') && this.players.length === 2;
        const usesTwoPlayerThemePager = isEasterTwoPlayerGame || isSevernaTwoPlayerGame;
        const isThemeOnlineDuel = usesTwoPlayerThemePager && this.onlineMode;
        const isThemeRandomDuel = isThemeOnlineDuel
            && this.inferOnlineDuelType(this.roomId, { duelType: this.onlineDuelType }) === 'random';
        const isDesertSpectatorDuel = document.body.classList.contains('desert-theme') && this.isSpectator && this.players.length === 2;
        // Neuphorism teme koriste isti slobodan vertikalni pager za svaki režim sa dva igrača.
        if (gameScene) {
            gameScene.classList.toggle('theme-dual-board-view', usesTwoPlayerThemePager);
            gameScene.classList.toggle('online-duel-room', isThemeOnlineDuel);
            gameScene.classList.toggle('random-online-duel-room', isThemeRandomDuel);
            gameScene.classList.toggle('theme-spectator-view', isDesertSpectatorDuel);
        }
        playerTables.forEach(el => el.classList.remove('theme-spectator-active'));

        if(activeTbl) {
            activeTbl.style.border = "2px solid var(--gold-main)";
            activeTbl.style.boxShadow = "var(--theme-active-table-shadow, 0 0 15px rgba(224, 201, 149, 0.2))";
            activeTbl.style.opacity = "1";
            const usesThemedDualPager = usesTwoPlayerThemePager || isDesertSpectatorDuel;
            const shouldFollowActiveTable = this.players.length > 1 &&
                (!usesThemedDualPager || this.dualBoardLastFollowedPlayerIdx !== this.currentPlayerIdx);
            if (shouldFollowActiveTable) {
                if (usesThemedDualPager) this.dualBoardLastFollowedPlayerIdx = this.currentPlayerIdx;
                setTimeout(() => {
                    // Ne vraćaj ručno pomeren prikaz ako je u međuvremenu počeo novi potez.
                    if (document.getElementById(`ptable-${this.currentPlayerIdx}`) !== activeTbl) return;
                    const tablesWrapper = document.getElementById('tables-container');
                    if (usesThemedDualPager && tablesWrapper) {
                        const wrapperRect = tablesWrapper.getBoundingClientRect();
                        const tableRect = activeTbl.getBoundingClientRect();
                        const targetTop = Math.max(0, tablesWrapper.scrollTop + tableRect.top - wrapperRect.top - 4);
                        tablesWrapper.scrollTo({ top: targetTop, behavior: 'smooth' });
                    } else {
                        activeTbl.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
                    }
                }, 100);
            }
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
        if (this.onlineMode && this.onlineTurnTimerPaused) return;
        if (this.brojBacanja === 0) return;
        if (this.onlineRollPending) return;
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
        if (this.onlineMode && this.onlineTurnTimerPaused) return;
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
        if (this.onlineRollPending) return;
        if (this.isAnimating) return;

        if (this.onlineMode) {
            if (!this.socket || !this.socket.connected || !this.roomId) {
                this.showServerNotice('sys_no_conn', 'err_title');
                return;
            }
            if (btnBacaj) {
                const waitText = gt('game_wait');
                btnBacaj.disabled = true;
                btnBacaj.innerText = waitText === 'game_wait' ? "SAČEKAJ..." : (waitText || "SAČEKAJ...");
            }
            try {
                this.onlineRollPending = true;
                this.socket.emit('dice_roll', {
                    roomId: this.roomId,
                    held: this.zadrzane
                });
            } catch (e) {
                this.onlineRollPending = false;
                console.error("Greška pri slanju online bacanja:", e);
                if (btnBacaj) {
                    btnBacaj.disabled = false;
                    btnBacaj.innerText = gt('game_roll') || "BACAJ";
                }
            }
            return;
        }

        if(btnBacaj) btnBacaj.disabled = true;
        try {
            this.soundMgr.roll();
            
            this.vibrate(30);

            this.isAnimating = true;

            let newValues = [...this.kockiceVals]; 
            for(let i=0; i<6; i++) { if (!this.zadrzane[i]) newValues[i] = Math.floor(Math.random()*6)+1; } 
            
            if (this.roomId) {
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
        if (this.onlineMode && this.onlineTurnTimerPaused) return;
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
        if (this.onlineMode && this.onlineTurnTimerPaused) return false;
        if (this.onlineRollPending) return false;
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
        
        const profilePlayerIndex = this.onlineMode && Number.isInteger(this.myOnlineIndex) && this.myOnlineIndex >= 0
            ? this.myOnlineIndex
            : this.players.findIndex(player => player === this.playerName);
        const isProfileMove = pIdx === (profilePlayerIndex >= 0 ? profilePlayerIndex : 0);
        const previousConsecutiveNajava = this.consecutiveNajava;
        const previousHasProphet = this.hasProphet;

        if (isProfileMove && col === 'Najava') {
            if (pts > 0) {
                this.consecutiveNajava++;
                if (this.consecutiveNajava >= 3) this.hasProphet = true;
            } else {
                this.consecutiveNajava = 0;
            }
        }
        
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
            hasProphet: previousHasProphet,
            consecutiveNajava: previousConsecutiveNajava
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
                const isFirstRollYamb = this.brojBacanja === 1;
                if (isFirstRollYamb) {
                    if (isProfileMove) this.hasSvetiIlija = true;
                    this.effectMgr.trigger('thunder');
                } else {
                    this.effectMgr.celebrateYamb();
                }

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
        if (gameOver) {
            if (!this.isSpectator) {
                this.beginOnlineFinalBoardDelay();
                return;
            }
            this.handleGameOver();
            return;
        }

        this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
        this.resetTurnLogic();
        this.autoSaveGame();
        this.startClientTimer();
    }
    
    calculateMiddleSectionScore(data, col) {
        const vMax = data[col]["Max"];
        const vMin = data[col]["Min"];
        const v1 = data[col]["1"];
        if (vMax === null || vMin === null || v1 === null) return 0;
        if (vMin <= 0) return 0;

        let score = (vMax - vMin) * v1;
        if (score < 0) score = 0;
        if (score >= 60) score += 40;
        return score;
    }

    calculateTotalScore(pIdx) {
        const data = this.allScores[pIdx]; if (!data) return 0; 
        let grandTotal = 0;
        KOLONE.forEach(col => {
            const val = (r) => (data[col][r] === null) ? 0 : data[col][r];
            let sum1 = 0; ["1", "2", "3", "4", "5", "6"].forEach(r => sum1 += val(r)); if (sum1 >= 60) sum1 += 30;
            let sum2 = this.calculateMiddleSectionScore(data, col);
            let sum3 = 0; ["Triling", "Kenta", "Ful", "Poker", "Yamb"].forEach(r => sum3 += val(r));
            grandTotal += sum1 + sum2 + sum3;
        });
        return grandTotal;
    }

    showTrophyUnlockShowcase(trophies = []) {
        const earnedTrophies = Array.isArray(trophies)
            ? trophies.filter(trophy => trophy && trophy.id)
            : [];

        if (earnedTrophies.length === 0) return Promise.resolve(false);

        return new Promise(resolve => {
            const lang = localStorage.getItem('yamb_lang') || 'sr';
            const textFor = (value) => {
                if (value && typeof value === 'object') {
                    return value[lang] || value.sr || value.en || '';
                }
                return value || '';
            };
            const coinIcon = (typeof dukatIconHtml === 'function') ? dukatIconHtml() : 'dukata';
            const totalReward = earnedTrophies.reduce((sum, trophy) => sum + Math.max(0, Number(trophy.reward) || 0), 0);
            const title = lang === 'en'
                ? (earnedTrophies.length === 1 ? 'TROPHY UNLOCKED' : 'TROPHIES UNLOCKED')
                : (earnedTrophies.length === 1 ? 'OSVOJEN TROFEJ' : 'OSVOJENI TROFEJI');
            const subtitle = lang === 'en'
                ? `${earnedTrophies.length} new ${earnedTrophies.length === 1 ? 'honor' : 'honors'}`
                : `${earnedTrophies.length} ${earnedTrophies.length === 1 ? 'novo priznanje' : 'novih priznanja'}`;
            const totalLabel = lang === 'en' ? 'Total reward' : 'Ukupna nagrada';

            document.querySelectorAll('.trophy-showcase').forEach(el => el.remove());

            const overlay = document.createElement('div');
            overlay.className = 'trophy-showcase';
            overlay.setAttribute('role', 'status');
            overlay.setAttribute('aria-live', 'polite');

            const cardsHtml = earnedTrophies.map((trophy, index) => {
                const trophyTitle = this.escapeHtml(textFor(trophy.title) || trophy.id);
                const reward = Math.max(0, Number(trophy.reward) || 0);
                const icon = trophy.icon || '🏆';

                return `
                    <div class="trophy-showcase-card" style="--i:${index};">
                        <div class="trophy-showcase-icon">${icon}</div>
                        <div class="trophy-showcase-name">${trophyTitle}</div>
                        <div class="trophy-showcase-reward">+${reward} ${coinIcon}</div>
                    </div>
                `;
            }).join('');

            overlay.innerHTML = `
                <div class="trophy-showcase-panel">
                    <div class="trophy-showcase-kicker">${this.escapeHtml(title)}</div>
                    <div class="trophy-showcase-subtitle">${this.escapeHtml(subtitle)}</div>
                    <div class="trophy-showcase-grid">${cardsHtml}</div>
                    <div class="trophy-showcase-total">
                        <span>${this.escapeHtml(totalLabel)}</span>
                        <strong>+${totalReward} ${coinIcon}</strong>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            if (this.soundMgr && typeof this.soundMgr.trophy === 'function') {
                this.soundMgr.trophy();
            }

            requestAnimationFrame(() => overlay.classList.add('active'));

            setTimeout(() => overlay.classList.add('closing'), 7300);
            setTimeout(() => {
                overlay.remove();
                resolve(true);
            }, 8000);
        });
    }

    async confirmTrophyShowcaseEntries(trophies = [], timeoutMs = 9000) {
        const entries = Array.isArray(trophies)
            ? trophies.filter(trophy => trophy && trophy.id)
            : [];
        if (entries.length === 0) return [];

        const permanentReasons = new Set(['invalid_trophy', 'trophy_not_earned']);
        const timeoutResult = { pending: true };
        const settled = await Promise.all(entries.map(async trophy => {
            if (!trophy.claimPromise || typeof trophy.claimPromise.then !== 'function') return trophy;

            const result = await Promise.race([
                trophy.claimPromise.catch(err => ({ ok: false, reason: err?.message || 'claim_error' })),
                new Promise(resolve => setTimeout(() => resolve(timeoutResult), timeoutMs))
            ]);

            if (result === timeoutResult) return null;
            if (result && result.ok && !result.alreadyClaimed) return trophy;
            if (result && permanentReasons.has(result.reason)) return null;
            return null;
        }));

        return settled.filter(Boolean).map(trophy => {
            const { claimPromise, ...displayTrophy } = trophy;
            return displayTrophy;
        });
    }

    formatTourneyDukatAmount(amount) {
        const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
        return String(safeAmount).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    getTournamentRoomInfo(roomId = this.roomId) {
        const match = String(roomId || '').match(/^tourney_(qf|sf|f)_(\d+)_/);
        if (!match) return null;
        return {
            round: match[1],
            index: Math.max(0, parseInt(match[2], 10) || 0)
        };
    }

    getOnlineFinalResultSnapshot(onlineResult = null) {
        const players = Array.isArray(onlineResult?.players) && onlineResult.players.length > 0
            ? onlineResult.players.map(p => {
                if (typeof p === 'object' && p !== null) return p.name || getFallbackPlayerName();
                return p || getFallbackPlayerName();
            })
            : this.players;

        const serverFinalResults = onlineResult && Array.isArray(onlineResult.finalResults) && onlineResult.finalResults.length > 0
            ? onlineResult.finalResults.map((entry, index) => ({
                name: entry && entry.name ? entry.name : (players[index] || getFallbackPlayerName()),
                score: Math.max(0, parseInt(entry && entry.score, 10) || 0)
            }))
            : null;

        const finalResults = serverFinalResults || players.map((name, index) => ({
            name,
            score: this.allScores && this.allScores[index] ? this.calculateTotalScore(index) : 0
        }));

        if (!finalResults.length) return null;

        const winnerScore = finalResults.reduce((max, result) => result.score > max ? result.score : max, 0);
        const winnerIndexes = finalResults
            .map((result, index) => ({ score: result.score, index }))
            .filter(result => result.score === winnerScore)
            .map(result => result.index);
        const hasServerWinnerIndex = onlineResult
            && onlineResult.winnerIndex !== undefined
            && onlineResult.winnerIndex !== null
            && Number.isInteger(Number(onlineResult.winnerIndex));
        const serverWinnerIndex = hasServerWinnerIndex ? Number(onlineResult.winnerIndex) : -1;
        const isDraw = players.length > 1
            ? (onlineResult && typeof onlineResult.isDraw === 'boolean'
                ? onlineResult.isDraw
                : winnerIndexes.length !== 1)
            : false;
        const winnerIndex = isDraw ? -1 : (serverWinnerIndex >= 0 ? serverWinnerIndex : winnerIndexes[0]);
        const myIndex = this.onlineMode && Number.isInteger(this.myOnlineIndex) && this.myOnlineIndex >= 0
            ? this.myOnlineIndex
            : finalResults.findIndex(result => result.name === this.playerName);

        return {
            finalResults,
            winnerIndex,
            winner: winnerIndex >= 0 ? finalResults[winnerIndex] : null,
            isDraw,
            myIndex,
            myScoreEntry: myIndex >= 0 ? finalResults[myIndex] : finalResults[0]
        };
    }

    getTournamentFinalCeremonyData(onlineResult = null) {
        const roomId = String(onlineResult?.roomId || this.roomId || '');
        const roomInfo = this.getTournamentRoomInfo(roomId);
        if (!roomInfo || roomInfo.round !== 'f') return null;
        if (!this.isTournamentOnlineDuel(roomId, { duelType: onlineResult?.duelType || this.onlineDuelType })) return null;

        const result = this.getOnlineFinalResultSnapshot(onlineResult);
        if (!result || result.isDraw || result.winnerIndex < 0 || result.myIndex < 0) return null;

        const amIWinner = result.winnerIndex === result.myIndex;
        const role = amIWinner ? 'winner' : 'runnerup';
        const reward = amIWinner ? TOURNEY_FINAL_WINNER_REWARD : TOURNEY_FINAL_RUNNER_UP_REWARD;

        return {
            roomId,
            round: roomInfo.round,
            index: roomInfo.index,
            role,
            reward,
            amIWinner,
            winnerName: result.winner?.name || getFallbackPlayerName(),
            myScore: result.myScoreEntry?.score || 0
        };
    }

    rememberTournamentFinalCeremony(role, active = false) {
        this.tournamentFinalCeremonySeenRole = String(role || '');
        this.tournamentFinalCeremonySeenAt = Date.now();
        this.tournamentFinalCeremonyActive = !!active;
    }

    shouldSuppressTournamentPrizeModal(data = {}) {
        const role = String(data.role || '');
        if (!role || role !== this.tournamentFinalCeremonySeenRole) return false;
        const suppressionWindowMs = 10 * 60 * 1000;
        return this.tournamentFinalCeremonyActive || (Date.now() - this.tournamentFinalCeremonySeenAt < suppressionWindowMs);
    }

    submitTournamentFinalWinnerIfNeeded(ceremonyData) {
        if (!ceremonyData || !ceremonyData.amIWinner || !this.socket || !this.playerId) return;
        if (ceremonyData.round !== 'f') return;

        const roomKey = ceremonyData.roomId || `f_${ceremonyData.index}`;
        if (this.tournamentFinalWinnerSubmittedRooms.has(roomKey)) return;
        this.tournamentFinalWinnerSubmittedRooms.add(roomKey);

        this.socket.emit('tourney_submit_winner', {
            round: ceremonyData.round,
            index: ceremonyData.index,
            winnerId: this.playerId
        });
    }

    clearTournamentFinalCeremony() {
        if (this.tournamentFinalCeremonyTimer) {
            clearTimeout(this.tournamentFinalCeremonyTimer);
            this.tournamentFinalCeremonyTimer = null;
        }
        if (this.tournamentFinalCeremonyCountdownTimer) {
            clearInterval(this.tournamentFinalCeremonyCountdownTimer);
            this.tournamentFinalCeremonyCountdownTimer = null;
        }

        const overlay = document.getElementById('tournament-final-ceremony');
        if (overlay) overlay.remove();
        this.tournamentFinalCeremonyActive = false;
    }

    showTournamentFinalCeremony(ceremonyData) {
        if (!ceremonyData) return Promise.resolve(false);

        return new Promise(resolve => {
            this.clearTournamentFinalCeremony();
            this.rememberTournamentFinalCeremony(ceremonyData.role, true);

            const isWinner = ceremonyData.role === 'winner';
            const rewardLabel = this.formatTourneyDukatAmount(ceremonyData.reward);
            const coinIcon = (typeof dukatIconHtml === 'function') ? dukatIconHtml() : 'dukata';
            const title = isWinner
                ? (gt('tourney_final_ceremony_winner_title') || 'ŠAMPION TURNIRA')
                : (gt('tourney_final_ceremony_runnerup_title') || 'FINALISTA TURNIRA');
            const message = isWinner
                ? (gt('tourney_final_ceremony_winner_msg') || 'Čestitamo! Osvojili ste turnir.')
                : (gt('tourney_final_ceremony_runnerup_msg') || 'Čestitamo na učešću u finalu.');
            const kicker = isWinner
                ? (gt('tourney_final_ceremony_winner_kicker') || 'Velika nagrada')
                : (gt('tourney_final_ceremony_runnerup_kicker') || 'Utešna nagrada');
            const scoreLabel = (gt('tourney_final_ceremony_score') || 'Tvoj rezultat');

            const overlay = document.createElement('div');
            overlay.id = 'tournament-final-ceremony';
            overlay.className = `tournament-final-ceremony ${isWinner ? 'is-winner' : 'is-runnerup'}`;
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML = `
                <div class="tournament-final-ceremony-panel">
                    <div class="tournament-final-ceremony-rays" aria-hidden="true"></div>
                    <div class="tournament-final-ceremony-trophy-wrap">
                        <img class="tournament-final-ceremony-trophy" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                    </div>
                    <div class="tournament-final-ceremony-kicker">${this.escapeHtml(kicker)}</div>
                    <h2 class="tournament-final-ceremony-title">${this.escapeHtml(title)}</h2>
                    <p class="tournament-final-ceremony-message">${this.escapeHtml(message)}</p>
                    <div class="tournament-final-ceremony-reward" aria-label="${this.escapeHtml(kicker)} ${this.escapeHtml(rewardLabel)}">
                        <span>+${this.escapeHtml(rewardLabel)}</span>
                        ${coinIcon}
                    </div>
                    <div class="tournament-final-ceremony-meta">
                        <span>${this.escapeHtml(scoreLabel)}</span>
                        <strong>${this.escapeHtml(ceremonyData.myScore)}</strong>
                    </div>
                    <button type="button" class="tournament-final-ceremony-next" disabled>
                        ${this.escapeHtml(gt('online_final_hold_next') || 'Dalje')}
                    </button>
                </div>
            `;

            const nextBtn = overlay.querySelector('.tournament-final-ceremony-next');
            let resolved = false;
            const durationMs = 6000;
            const startedAt = Date.now();

            const finish = () => {
                if (resolved || !nextBtn || nextBtn.disabled) return;
                resolved = true;
                this.clearTournamentFinalCeremonyTimersOnly();
                overlay.classList.add('closing');
                setTimeout(() => {
                    overlay.remove();
                    this.tournamentFinalCeremonyActive = false;
                    resolve(true);
                }, 260);
            };

            if (nextBtn) {
                nextBtn.addEventListener('click', finish);
            }

            const updateButton = () => {
                if (!nextBtn) return;
                const remainingMs = Math.max(0, durationMs - (Date.now() - startedAt));
                const secondsLeft = Math.ceil(remainingMs / 1000);
                if (secondsLeft > 0) {
                    const template = gt('online_final_hold_countdown') || 'Dalje za {0}...';
                    nextBtn.disabled = true;
                    nextBtn.textContent = template.replace('{0}', String(secondsLeft));
                } else {
                    nextBtn.disabled = false;
                    nextBtn.textContent = gt('online_final_hold_next') || 'Dalje';
                    nextBtn.classList.add('is-ready');
                    this.clearTournamentFinalCeremonyTimersOnly();
                }
            };

            document.body.appendChild(overlay);
            if (this.soundMgr) {
                if (isWinner && typeof this.soundMgr.win === 'function') this.soundMgr.win();
                else if (typeof this.soundMgr.trophy === 'function') this.soundMgr.trophy();
            }

            requestAnimationFrame(() => overlay.classList.add('active'));
            updateButton();
            this.tournamentFinalCeremonyCountdownTimer = setInterval(updateButton, 250);
            this.tournamentFinalCeremonyTimer = setTimeout(updateButton, durationMs);
        });
    }

    clearTournamentFinalCeremonyTimersOnly() {
        if (this.tournamentFinalCeremonyTimer) {
            clearTimeout(this.tournamentFinalCeremonyTimer);
            this.tournamentFinalCeremonyTimer = null;
        }
        if (this.tournamentFinalCeremonyCountdownTimer) {
            clearInterval(this.tournamentFinalCeremonyCountdownTimer);
            this.tournamentFinalCeremonyCountdownTimer = null;
        }
    }

    clearOnlineGameOverDelay() {
        if (this.onlineGameOverDelayTimer) {
            clearTimeout(this.onlineGameOverDelayTimer);
            this.onlineGameOverDelayTimer = null;
        }
        if (this.onlineGameOverCountdownTimer) {
            clearInterval(this.onlineGameOverCountdownTimer);
            this.onlineGameOverCountdownTimer = null;
        }

        const overlay = document.getElementById('online-final-hold-overlay');
        if (overlay) overlay.remove();

        this.onlineGameOverDelayActive = false;
        this.onlineGameOverDelayDeadline = 0;
    }

    updateOnlineGameOverDelayOverlay(secondsLeft) {
        const overlay = document.getElementById('online-final-hold-overlay');
        if (!overlay) return;

        const remaining = Math.max(0, secondsLeft);
        const countdownEl = overlay.querySelector('[data-role="online-final-countdown"]');
        const nextBtn = overlay.querySelector('.online-final-hold-next');

        if (countdownEl) {
            if (remaining > 0) {
                const template = gt('online_final_hold_countdown') || 'Dalje za {0}...';
                countdownEl.innerText = template.replace('{0}', String(remaining));
            } else {
                countdownEl.innerText = gt('online_final_hold_ready') || 'Pritisni Dalje kada završiš pregled.';
            }
        }

        if (nextBtn) {
            nextBtn.disabled = remaining > 0;
            nextBtn.classList.toggle('is-ready', remaining <= 0);
        }
    }

    beginOnlineFinalBoardDelay(onlineResult = null) {
        if (this.isSpectator || this.onlineGameOverFinishInProgress) return;

        if (onlineResult && typeof onlineResult === 'object') {
            this.onlineDuelType = this.inferOnlineDuelType(onlineResult.roomId || this.roomId, onlineResult);
            this.lastOnlineGameResult = onlineResult;
            if (Array.isArray(onlineResult.players) && onlineResult.players.length > 0) {
                this.players = onlineResult.players.map(p => {
                    if (typeof p === 'object' && p !== null) return p.name || getFallbackPlayerName();
                    return p || getFallbackPlayerName();
                });
            }
            if (Array.isArray(onlineResult.allScores)) this.allScores = onlineResult.allScores;
            if (onlineResult.currentPlayerIdx !== undefined) this.currentPlayerIdx = onlineResult.currentPlayerIdx;
        }

        this.updateTableVisuals();
        localStorage.removeItem('yamb_active_online_room');

        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }

        const timerDisplay = document.getElementById('turn-timer-display');
        if (timerDisplay) {
            timerDisplay.style.display = 'none';
            timerDisplay.style.animation = 'none';
        }

        const btnBacaj = document.getElementById('btn-bacaj');
        const btnNajava = document.getElementById('btn-najava');
        if (btnBacaj) {
            btnBacaj.disabled = true;
            btnBacaj.innerText = gt('game_over') || 'KRAJ IGRE';
        }
        if (btnNajava) btnNajava.disabled = true;

        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }

        const turnLabel = document.getElementById('lbl-turn');
        if (turnLabel) turnLabel.innerText = gt('online_final_hold_title') || 'Kraj partije';

        this.lastMoveSnapshot = null;
        this.gameActive = false;

        if (this.onlineGameOverDelayActive) {
            const secondsLeft = Math.ceil(Math.max(0, this.onlineGameOverDelayDeadline - Date.now()) / 1000);
            this.updateOnlineGameOverDelayOverlay(secondsLeft);
            return;
        }

        const delayMs = Math.max(2000, parseInt(this.onlineGameOverDelayMs, 10) || 3000);
        this.onlineGameOverDelayActive = true;
        this.onlineGameOverDelayDeadline = Date.now() + delayMs;

        const overlay = document.createElement('div');
        overlay.id = 'online-final-hold-overlay';
        overlay.className = 'online-final-hold-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.innerHTML = `
            <div class="online-final-hold-text">
                <strong>${this.escapeHtml(gt('online_final_hold_title') || 'Kraj partije')}</strong>
                <span data-role="online-final-countdown"></span>
            </div>
            <button type="button" class="online-final-hold-next" disabled>${this.escapeHtml(gt('online_final_hold_next') || 'Dalje')}</button>
        `;

        const nextBtn = overlay.querySelector('.online-final-hold-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (nextBtn.disabled) return;
                this.finishOnlineFinalBoardDelay();
            });
        }

        document.body.appendChild(overlay);

        const tick = () => {
            const secondsLeft = Math.ceil(Math.max(0, this.onlineGameOverDelayDeadline - Date.now()) / 1000);
            this.updateOnlineGameOverDelayOverlay(secondsLeft);
            if (secondsLeft <= 0 && this.onlineGameOverCountdownTimer) {
                clearInterval(this.onlineGameOverCountdownTimer);
                this.onlineGameOverCountdownTimer = null;
            }
        };
        tick();

        this.onlineGameOverCountdownTimer = setInterval(tick, 250);
        this.onlineGameOverDelayTimer = setTimeout(() => {
            this.onlineGameOverDelayDeadline = Date.now();
            tick();
        }, delayMs);
    }

    async finishOnlineFinalBoardDelay() {
        if (this.onlineGameOverFinishInProgress) return;

        this.onlineGameOverFinishInProgress = true;
        const onlineResult = this.onlineMode ? this.lastOnlineGameResult : null;
        this.clearOnlineGameOverDelay();

        try {
            const tournamentFinalCeremony = this.getTournamentFinalCeremonyData(onlineResult);
            if (tournamentFinalCeremony) {
                this.rememberTournamentFinalCeremony(tournamentFinalCeremony.role, true);
                this.submitTournamentFinalWinnerIfNeeded(tournamentFinalCeremony);
                await this.showTournamentFinalCeremony(tournamentFinalCeremony);
            }

            await this.handleGameOver({ onlineResult, force: true });
        } finally {
            this.onlineGameOverFinishInProgress = false;
        }
    }

    async showTechnicalGameOver(data = {}) {
        localStorage.removeItem('yamb_active_online_room');
        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }
        if(this.soundMgr) this.soundMgr.stopMusic();

        const resultType = data.resultType === 'loss' ? 'loss' : 'win';
        const iAmWinner = resultType === 'win';
        const rewardAmount = Math.max(0, Math.floor(Number(data.rewardAmount) || 0));
        const penaltyAmount = Math.max(0, Math.floor(Number(data.penaltyAmount) || 0));
        const winnerName = data.winnerName || (iAmWinner ? this.playerName : 'Protivnik');
        const loserName = data.loserName || (iAmWinner ? 'Protivnik' : this.playerName);

        this.gameActive = false;
        this.pendingScore = 0;
        this.rewardClaimed = false;
        this.rewardClaimInProgress = false;
        this.lastGameType = 'technical';

        const title = iAmWinner ? (gt('go_win') || 'POBEDA!') : (gt('go_loss') || 'PORAZ');
        const fallbackMsg = iAmWinner
            ? (gt('technical_win_fled') || `Tehnička pobeda. {0} je napustio partiju.`).replace('{0}', loserName)
            : (gt('technical_loss_winner') || `Tehnički poraz. Pobednik je {0}.`).replace('{0}', winnerName);
        const message = data.message || fallbackMsg;

        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.classList.remove('is-solo-result', 'is-hotseat-result', 'has-result-winner');
        const personalBestBadge = document.getElementById('solo-personal-best-badge');
        if (personalBestBadge) personalBestBadge.hidden = true;

        const titleEl = document.getElementById('go-title');
        const msgEl = document.getElementById('go-msg');
        const scoreEl = document.getElementById('go-score');
        const labelEl = document.querySelector('#game-over-screen [data-lang="go_msg_solo"]');
        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerHTML = message;
        if (scoreEl) scoreEl.innerText = iAmWinner ? rewardAmount : penaltyAmount;
        if (labelEl) labelEl.innerText = iAmWinner ? 'NAGRADA' : 'KAZNA';

        const btnAd = document.getElementById('btn-ad-double');
        if (btnAd) btnAd.style.display = 'none';

        const btnRematch = document.getElementById('btn-rematch');
        if (btnRematch) btnRematch.style.display = 'none';

        const btnClaim = document.querySelector('#game-over-screen .btn-secondary');
        if(btnClaim) btnClaim.innerText = gt('go_claim') || 'Preuzmi i Izađi';

        if (iAmWinner && this.effectMgr) this.effectMgr.celebrateWin();
        this.navigateTo('game-over-screen');
    }

    async handleGameOver(options = {}) {
        localStorage.removeItem('yamb_active_online_room'); // Obrisano jer je igra gotova
        // ---> DODATO: Blokada duplog Game Over-a (Fiks 1) <---
        if (!this.gameActive && !this.isSpectator && !options.force) {
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

        const onlineResult = this.onlineMode ? (options.onlineResult || this.lastOnlineGameResult || null) : null;
        if (onlineResult) {
            this.onlineDuelType = this.inferOnlineDuelType(onlineResult.roomId || this.roomId, onlineResult);
            if (Array.isArray(onlineResult.players) && onlineResult.players.length > 0) {
                this.players = onlineResult.players.map(p => {
                    if (typeof p === 'object' && p !== null) return p.name || getFallbackPlayerName();
                    return p || getFallbackPlayerName();
                });
            }
            if (Array.isArray(onlineResult.allScores)) this.allScores = onlineResult.allScores;
            if (onlineResult.currentPlayerIdx !== undefined) this.currentPlayerIdx = onlineResult.currentPlayerIdx;
        }

        this.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }
        const serverFinalResults = onlineResult && Array.isArray(onlineResult.finalResults) && onlineResult.finalResults.length > 0
            ? onlineResult.finalResults.map((entry, index) => ({
                name: entry && entry.name ? entry.name : (this.players[index] || getFallbackPlayerName()),
                score: Math.max(0, parseInt(entry && entry.score) || 0)
            }))
            : null;
        const finalResults = serverFinalResults || this.players.map((name, i) => { return { name: name, score: this.calculateTotalScore(i) }; });
        const winnerScore = finalResults.reduce((max, r) => r.score > max ? r.score : max, 0);
        const fallbackWinner = [...finalResults].sort((a,b) => b.score - a.score)[0] || { name: getFallbackPlayerName(), score: 0 };
        const hasServerWinnerIndex = onlineResult
            && onlineResult.winnerIndex !== undefined
            && onlineResult.winnerIndex !== null
            && Number.isInteger(Number(onlineResult.winnerIndex));
        const serverWinnerIndex = hasServerWinnerIndex ? Number(onlineResult.winnerIndex) : -1;
        const winner = serverWinnerIndex >= 0 && finalResults[serverWinnerIndex] ? finalResults[serverWinnerIndex] : fallbackWinner;
        const isDraw = this.players.length > 1
            ? (onlineResult && typeof onlineResult.isDraw === 'boolean'
                ? onlineResult.isDraw
                : finalResults.every(r => r.score === finalResults[0].score))
            : false;

        if(window.localforage) {
            const uid = localStorage.getItem('yamb_uid') || 'guest';
            await localforage.removeItem(`yamb_saved_game_${uid}_${this.players.length}`); 
            await localforage.removeItem('yamb_saved_game'); 
            await localforage.removeItem('yamb_saved_game_' + this.players.length); 
        }
        
        let detectedMode = this.aiMode ? "AI" : "Solo";
        if (this.onlineMode) detectedMode = "Online"; else if (!this.aiMode && this.players.length > 1) detectedMode = "Hotseat";

        let myScoreEntry = finalResults.find(r => r.name === this.playerName)
            || (this.onlineMode && finalResults[this.myOnlineIndex])
            || finalResults[0];
        let unlockedTrophiesNow = [];
        let saveMode = detectedMode;
        let matchResultRef = this.onlineMode ? String(onlineResult?.matchId || '') : '';
        this.refreshLocalStats();
        const soloHighscoreBeforeGame = Math.max(0, Number(this.stats && this.stats.highscore) || 0);
        let isNewSoloPersonalBest = false;

        if (this.onlineMode) {
            const duelType = this.inferOnlineDuelType(this.roomId, { duelType: this.onlineDuelType });
            if (duelType === 'tournament') saveMode = 'Turnir';
            else if (duelType === 'friend_invite') saveMode = 'Prijatelj';
            else if (duelType === 'challenge') saveMode = 'Duel';
            else saveMode = 'Online';
        }

        if (myScoreEntry) {
             const myIndex = this.onlineMode && Number.isInteger(this.myOnlineIndex) && this.myOnlineIndex >= 0
                 ? this.myOnlineIndex
                 : this.players.findIndex(p => p === myScoreEntry.name);
             if (myIndex !== -1 && this.allScores[myIndex]) {
                 try {
                     if (window.trophyManager && typeof window.trophyManager.checkEndGameTrophies === 'function') {
                         let detectedModeForTrophies = this.onlineMode ? "Online" : (this.aiMode ? "AI" : (this.players.length > 1 ? "Hotseat" : "Solo"));
                         const bestOpponentScore = finalResults.reduce((best, result, resultIndex) => {
                             if (resultIndex === myIndex) return best;
                             return best === null || result.score > best ? result.score : best;
                         }, null);
                         const scoreDiff = bestOpponentScore === null ? 0 : bestOpponentScore - myScoreEntry.score;
                         unlockedTrophiesNow = window.trophyManager.checkEndGameTrophies(
                             myScoreEntry.score,
                             this.allScores[myIndex],
                             detectedModeForTrophies,
                             {
                                 hasSvetiIlija: this.hasSvetiIlija,
                                 hasProphet: this.hasProphet,
                                 scoreDiff: scoreDiff
                             },
                             { silent: true }
                         ) || [];
                     } else if (this.features && typeof this.features.checkAchievements === 'function') {
                         this.features.checkAchievements(myScoreEntry.score, this.allScores[myIndex]);
                     }
                 } catch(err) {
                     console.warn("Greška pri dodeli trofeja, preskačem:", err);
                 }
             }
             
              this.pendingScore = myScoreEntry.score;
              if (window.adMobGlobal && myScoreEntry.score > 0) {
                  window.adMobGlobal.prepareReward({ context: 'game_double', amount: myScoreEntry.score * 2 });
              }
              this.rewardClaimed = false;
             this.rewardClaimInProgress = false;
             this.lastGameType = 'normal';
             let resultType = 'solo';
             if (this.players.length > 1) {
                 // FIX: Rešavanje nerešenog rezultata kako se ne bi upisivao lažni poraz
                 if (isDraw) {
                     resultType = 'draw';
                 } else if (this.onlineMode && serverWinnerIndex >= 0) {
                     resultType = serverWinnerIndex === this.myOnlineIndex ? 'win' : 'loss';
                 } else if (winner.name === myScoreEntry.name) {
                     resultType = 'win';
                 } else {
                     resultType = 'loss';
                 }
             }
             
             let finalOppScore = 0;
             if (this.players.length === 2) {
                 const oppIndex = this.onlineMode && Number.isInteger(this.myOnlineIndex) && this.myOnlineIndex >= 0
                     ? (this.myOnlineIndex === 0 ? 1 : 0)
                     : this.players.findIndex(p => p !== myScoreEntry.name);
                 if (oppIndex !== -1) {
                     let oppScoreEntry = finalResults[oppIndex] || finalResults.find(r => r.name !== myScoreEntry.name);
                     finalOppScore = oppScoreEntry ? oppScoreEntry.score : 0;
                 }
             }

             const myUid = this.getCurrentPlayerUid();
             const serverStatsApplied = !!(
                 this.onlineMode &&
                 onlineResult &&
                 Array.isArray(onlineResult.serverStatsAppliedUids) &&
                 onlineResult.serverStatsAppliedUids.includes(myUid)
             );
             isNewSoloPersonalBest = this.players.length === 1
                 && Number(myScoreEntry.score) > soloHighscoreBeforeGame;
             this.updateStats(myScoreEntry.score, resultType, finalOppScore, false, {
                 serverApplied: serverStatsApplied,
                 skipH2H: serverStatsApplied,
                 deferServerSync: this.onlineMode ? serverStatsApplied : true
             });
             if (!this.onlineMode) {
                 matchResultRef = await this.queueCompletedLocalMatchResult({
                     mode: detectedMode,
                     participants: finalResults,
                     playerIndex: myIndex >= 0 ? myIndex : 0
                 });
                 if (this.socket && this.socket.connected) {
                     this.emitPlayerData(false).catch(err => {
                         console.warn("Nije moguće odmah sinhronizovati završenu lokalnu partiju:", err);
                     });
                 }
             }
        }

        try {
            if (myScoreEntry && myScoreEntry.score > 0) {
                const myPhoto = localStorage.getItem('yamb_player_photo') || '';
                await this.safeSubmitScore(this.playerName, myScoreEntry.score, saveMode, myPhoto, matchResultRef);
            }
        } catch (err) {
            console.warn("Greška pri slanju na top listu, igra nastavlja dalje:", err);
        }

        this.soundMgr.win();
        let title = gt('game_over'); let message = "";
        let scoreLabel = gt('go_msg_solo') || "OSVOJENI POENI";

        if (this.players.length === 1) {
            const myScore = myScoreEntry ? myScoreEntry.score : 0;
            if (myScore >= 1000) {
                this.effectMgr.celebrateWin();
                title = gt('go_title_great');
                message = (gt('go_msg_solo_great') || "Sjajna partija! Osvojio si {0} poena.").replace('{0}', myScore);
            } else {
                title = gt('go_title_good');
                message = (gt('go_msg_solo_good') || "Završio si partiju sa {0} poena. Sledeća može bolje.").replace('{0}', myScore);
            }
        } else {
            const amIWinner = !!myScoreEntry && (this.onlineMode && serverWinnerIndex >= 0
                ? serverWinnerIndex === this.myOnlineIndex
                : winner.name === myScoreEntry.name);
            scoreLabel = gt('go_label_your_score') || "TVOJ REZULTAT";

            if (isDraw) {
                title = gt('go_draw') || "NEREŠENO!";
                message = (gt('go_msg_online_draw') || "Partija je završena bez pobednika. Oboje imate {0} poena.").replace('{0}', winner.score);
                if (this.isTournamentOnlineDuel(this.roomId, { duelType: this.onlineDuelType })) {
                    message += ` ${gt('tourney_draw_replay') || 'Turnirski meč se ponavlja dok neko ne pobedi.'}`;
                }
            } else {
                title = amIWinner ? gt('go_win') : gt('go_loss');
                if (amIWinner) { this.effectMgr.celebrateWin(); }
                if (amIWinner) {
                    message = (gt('go_msg_online_win') || "Pobedio si sa {0} poena.").replace('{0}', winner.score);
                } else {
                    message = (gt('go_msg_online_loss') || "Pobednik je {0} sa {1} poena.")
                        .replace('{0}', winner.name)
                        .replace('{1}', winner.score);
                }
            }
        }

        document.getElementById('go-title').innerText = title;
        document.getElementById('go-msg').innerText = message;
        document.getElementById('go-score').innerText = myScoreEntry ? myScoreEntry.score : winner.score;
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            const isHotseatResult = detectedMode === 'Hotseat';
            gameOverScreen.classList.toggle('is-solo-result', this.players.length === 1);
            gameOverScreen.classList.toggle('is-hotseat-result', isHotseatResult);
            gameOverScreen.classList.toggle('has-result-winner', isHotseatResult && !isDraw);
        }
        const personalBestBadge = document.getElementById('solo-personal-best-badge');
        if (personalBestBadge) personalBestBadge.hidden = !isNewSoloPersonalBest;
        const goScoreLabel = document.querySelector('#game-over-screen [data-lang="go_msg_solo"]');
        if (goScoreLabel) goScoreLabel.innerText = scoreLabel;
        
        const btnAd = document.getElementById('btn-ad-double');
        if ((myScoreEntry && myScoreEntry.score <= 0)) { if(btnAd) btnAd.style.display = 'none'; } else { if(btnAd) btnAd.style.display = 'flex'; }
        
        const btnClaim = document.querySelector('#game-over-screen .btn-secondary');
        if(btnClaim) btnClaim.innerText = gt('go_claim');
        const btnDouble = document.querySelector('#btn-ad-double span');
        if(btnDouble) btnDouble.innerHTML = gt('go_double');

        const btnRematch = document.getElementById('btn-rematch');
        if (this.onlineMode) {
            const isTournament = this.isTournamentOnlineDuel(this.roomId, { duelType: this.onlineDuelType });

            if (btnRematch) {
                btnRematch.style.display = isTournament ? 'none' : 'flex';
                btnRematch.disabled = false;
                btnRematch.innerHTML = `<span data-lang="go_rematch">${gt('go_rematch')}</span>`;
                btnRematch.style.background = 'linear-gradient(45deg, #4CAF50, #2E7D32)';
            }
            
            if (this.socket) {
                this.socket.emit('game_over');

                if (isTournament) {
                    const amIWinner = !!myScoreEntry && (serverWinnerIndex >= 0
                        ? serverWinnerIndex === this.myOnlineIndex
                        : winner.name === myScoreEntry.name);
                    const parts = this.roomId.split('_');
                    
                    if (parts.length >= 3) {
                        const round = parts[1];
                        const index = parseInt(parts[2]);
                        
                        if (!isDraw && amIWinner) {
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
            if (this.socket) this.socket.emit('game_over');
            if (btnRematch) btnRematch.style.display = 'none';
        }

        unlockedTrophiesNow = await this.confirmTrophyShowcaseEntries(unlockedTrophiesNow);
        await this.showTrophyUnlockShowcase(unlockedTrophiesNow);
        this.navigateTo('game-over-screen');
    }

    async safeSubmitScore(name, score, mode, photoUrl = undefined, matchId = '') {
        try {
            let finalScore = parseInt(score); if (isNaN(finalScore)) finalScore = 0;
            this.recordSubmittedScoreAsHighscore(finalScore);
            if(this.topListManager) {
                await this.topListManager.submitScore(name, finalScore, mode, photoUrl, matchId);
            }
        } catch(e) {
            console.warn("Nije moguće poslati rezultat u ovom trenutku:", e);
        }
    }

    claimServerGameReward(score, doubled, ssvNonce = '') {
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
            const claimTimeoutMs = doubled ? 45000 : 18000;
            const timer = setTimeout(() => finish({ ok: false, reason: 'game_reward_timeout', permanent: false }), claimTimeoutMs);

            this.socket.emit('claim_game_reward', {
                score: Math.max(0, parseInt(score) || 0),
                doubled: !!doubled,
                ssvNonce,
                clientRewarded: !!doubled,
                stats: this.getFullLocalStats()
            }, finish);
        });
    }

    async claimPendingBaseRewardBeforeRematch() {
        const baseScore = Math.max(0, parseInt(this.pendingScore, 10) || 0);
        if (this.lastGameType !== 'normal' || this.rewardClaimed || baseScore <= 0) return true;
        if (this.pendingBaseRewardClaimPromise) return this.pendingBaseRewardClaimPromise;
        if (this.rewardClaimInProgress) return false;

        this.rewardClaimInProgress = true;

        this.pendingBaseRewardClaimPromise = (async () => {
            const applyBalance = (balance) => {
                const safeBalance = Math.max(0, parseInt(balance, 10) || 0);
                localStorage.setItem('yamb_dukati', safeBalance);
                if (window.statsManager) {
                    window.statsManager.stats.balance = safeBalance;
                    window.statsManager.saveStats();
                }
            };

            const finishClaim = () => {
                this.rewardClaimed = true;
                this.rewardClaimInProgress = false;
                this.pendingScore = 0;
                this.pendingBaseRewardClaimPromise = null;
            };

            try {
                const result = await this.claimServerGameReward(baseScore, false);

                if (result && result.ok && typeof result.balance === 'number') {
                    applyBalance(result.balance);
                    finishClaim();
                    return true;
                }

                if (result && result.localFallback) {
                    const currentBalance = Math.max(0, parseInt(localStorage.getItem('yamb_dukati'), 10) || 0);
                    applyBalance(currentBalance + baseScore);
                    finishClaim();
                    return true;
                }

                console.warn(`Nagrada pre revanša nije potvrđena: ${result?.reason || 'unknown_error'}`);
                this.rewardClaimInProgress = false;
                this.pendingBaseRewardClaimPromise = null;
                return false;
            } catch (err) {
                console.warn("Greška pri preuzimanju nagrade pre revanša:", err);
                this.rewardClaimInProgress = false;
                this.pendingBaseRewardClaimPromise = null;
                return false;
            }
        })();

        return this.pendingBaseRewardClaimPromise;
    }

    async claimPendingRewardBeforeExternalNavigation() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const gameOverActive = !!gameOverScreen && gameOverScreen.classList.contains('active');
        const baseScore = Math.max(0, parseInt(this.pendingScore, 10) || 0);
        const hasPendingNormalReward = this.lastGameType === 'normal' && !this.rewardClaimed && baseScore > 0;
        if (!gameOverActive && !hasPendingNormalReward) return true;

        const rewardReady = await this.claimPendingBaseRewardBeforeRematch();
        if (!rewardReady && this.modal && typeof this.modal.alert === 'function') {
            this.modal.alert(
                gt('reward_claim_retry') || "Nagrada još nije potvrđena. Pokušajte ponovo za par sekundi.",
                gt('modal_title_info') || "INFO"
            );
        }
        return rewardReady;
    }

    async watchAdForDouble() {
        let success = false;
        
        if (this.adMob && this.adMob.showRewardVideo) {
            success = await this.adMob.showRewardVideo({
                context: 'game_double',
                amount: (parseInt(this.pendingScore) || 0) * 2
            });
        }
        
        if (success) { 
            this.pendingRewardSsvNonce = typeof this.adMob.consumeLastRewardSsvNonce === 'function'
                ? this.adMob.consumeLastRewardSsvNonce()
                : '';
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
        if (this.lastGameType === 'technical') {
            finishRewardClaim();
            this.showMainMenu();
            return;
        }
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
            const ssvNonce = wasDoubled ? (this.pendingRewardSsvNonce || '') : '';
            const result = wasDoubled && window.adMobGlobal && typeof window.adMobGlobal.claimRewardWithSsvRetry === 'function'
                ? await window.adMobGlobal.claimRewardWithSsvRetry(
                    () => this.claimServerGameReward(baseScore, wasDoubled, ssvNonce),
                    { nonce: ssvNonce, context: 'game_double' }
                )
                : await this.claimServerGameReward(baseScore, wasDoubled, ssvNonce);
            if (result && result.ok && typeof result.balance === 'number') {
                applyServerBalance(result.balance);
                this.pendingRewardSsvNonce = '';
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
                const today = this.getDailyChallengeDayKey();
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
                this.modal.alert(`${gt('msg_reward_doubled')} ${dukatIconHtml()} ${finalAmount * 2}`, gt('modal_title_reward')).then(() => { this.effectMgr.stop(); this.showMainMenu(); });
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
        
        if (doubled) {
            const confirmed = await claimNormalGameReward(this.pendingScore, true);
            if (!confirmed) {
                this.rewardClaimInProgress = false;
                this.modal.alert(gt('ad_confirmation_retry') || "Potvrda reklame još nije stigla. Pokušajte preuzimanje nagrade za par sekundi.", gt('modal_title_info') || "INFO");
                return;
            }
        } else {
            let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
            currentDukati += finalAmount;
            localStorage.setItem('yamb_dukati', currentDukati);
            if (window.statsManager) { window.statsManager.stats.balance = currentDukati; window.statsManager.saveStats(); }

            await claimNormalGameReward(this.pendingScore, false);
        }

        if (window.kvartalnaLiga) {
            window.kvartalnaLiga.syncWithServer();
        }

        finishRewardClaim();
        if (doubled) {
            this.modal.alert(`${gt('msg_reward_doubled')} ${dukatIconHtml()} ${finalAmount}`, gt('modal_title_reward')).then(() => {
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

                let sum2 = this.calculateMiddleSectionScore(data, col);
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
                        const isOnlineTurnPaused = this.onlineMode && this.onlineTurnTimerPaused;
                        const shouldBeDisabled = isOnlineTurnPaused || !((isMyTurnOnline || isLocalTurn) && this.brojBacanja > 0);
                        
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
        if (this.gameActive && this.onlineMode && !this.isSpectator) return;
        if (this.gameActive && !this.onlineMode) return;

        const activeOnlineRoom = localStorage.getItem('yamb_active_online_room');
        
        if (activeOnlineRoom) {
            this.initSocketConnection();
            this.setupOnlineRecoveryListeners();

            const checkRoom = () => {
                this.socket.emit('check_room_status', { roomId: activeOnlineRoom });
            };

            if (this.socket && this.socket.connected) {
                checkRoom();
            } else {
                this.socket.once('connect', checkRoom);
            }
            return;
        }

        await this.checkSavedLocalGame();
    }

    async findLatestSavedLocalGame() {
        if (!window.localforage) return null;

        const uid = localStorage.getItem('yamb_uid') || 'guest';
        const saves = [];

        for (const numPlayers of [1, 2]) {
            const saveKey = `yamb_saved_game_${uid}_${numPlayers}`;
            try {
                const data = await localforage.getItem(saveKey);
                if (data && Array.isArray(data.players) && data.players.length === numPlayers) {
                    saves.push({
                        numPlayers,
                        date: data.date ? new Date(data.date).getTime() : 0
                    });
                }
            } catch (e) {
                console.warn("Greška pri proveri snimljene lokalne partije:", e);
            }
        }

        saves.sort((a, b) => b.date - a.date);
        return saves[0] || null;
    }

    async checkSavedLocalGame() {
        if (this.localRecoveryPromptOpen || this.gameActive || this.inviteDetected) return;
        if (!document.getElementById('main-menu')?.classList.contains('active')) return;
        if (localStorage.getItem('yamb_local_recovery_pending') !== 'true') return;

        const latestSave = await this.findLatestSavedLocalGame();
        if (!latestSave) {
            localStorage.removeItem('yamb_local_recovery_pending');
            return;
        }
        if (this.localRecoveryPromptOpen || this.gameActive) return;

        this.localRecoveryPromptOpen = true;
        try {
            const recoveryKey = latestSave.numPlayers === 1 ? 'local_recovery_solo' : 'local_recovery_dual';
            const shouldResume = await this.modal.confirm(gt(recoveryKey));
            localStorage.removeItem('yamb_local_recovery_pending');
            if (shouldResume) {
                await this.loadSavedGame(latestSave.numPlayers);
            }
        } finally {
            this.localRecoveryPromptOpen = false;
        }
    }

    resumeOnlineGame(roomId, options = {}) {
        this.onlineMode = true;
        this.gameActive = true;
        this.roomId = roomId;
        this.modeTag = "Online";
        this.isSpectator = false;
        this.dualBoardLastFollowedPlayerIdx = null;
        this.onlineDuelType = this.inferOnlineDuelType(roomId, options);
        const btnBacaj = document.getElementById('btn-bacaj');
        const btnNajava = document.getElementById('btn-najava');
        if (btnBacaj) btnBacaj.style.display = '';
        if (btnNajava) btnNajava.style.display = '';

        // Privremena imena dok ne stignu prava sa servera
        this.players = [this.playerName, gt('player_opponent') || "Protivnik"];
        this.initScores();
        
        // ---> FIX: Iscrtavanje table unapred kako ne bi bila prazna <---
        this.createScoreTables();
        this.updateTableVisuals();
        this.highlightCurrentPlayer();
        
        if (options && options.directDuel) {
            this.showQuoteAndProceed();
        } else {
            this.navigateTo('game-scene');
        }
        
        const lblTurn = document.getElementById('lbl-turn');
        if (lblTurn) lblTurn.innerText = gt('game_returning') || "Vraćanje u igru...";
        
        this.initSocketConnection();

        // 1. DODATO: Palimo "uši" klijenta da bi mogao da čuje odgovor servera!
        this.setupSocketListeners(this.playerName || getFallbackPlayerName());
        
        // 2. DODATO: Šaljemo serveru koji je roomId za slučaj da postoji mikro-delay
        const doSync = () => {
            this.requestOnlineStateSync(this.roomId);
        };
        
        if (this.socket && this.socket.connected) {
            doSync();
        } else {
            this.socket.once('connect', doSync);
        }
    }
    
    async autoSaveGame(immediate = false) { 
        if(this.onlineMode) return; 

        if(!this.gameActive) return;

        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }

        const saveNow = async () => {
            if(!this.gameActive) return;

            const uid = localStorage.getItem('yamb_uid') || 'guest';
            const saveKey = `yamb_saved_game_${uid}_${this.players.length}`;

            if (!this.hasLocalGameProgress()) {
                if (immediate && window.localforage) await localforage.removeItem(saveKey);
                return;
            }

            const data = { 
                players: this.players, 
                scores: this.allScores, 
                current: this.currentPlayerIdx, 
                kockiceVals: this.kockiceVals,
                zadrzane: this.zadrzane,
                brojBacanja: this.brojBacanja,
                najavaAktivna: this.najavaAktivna,
                najavljenoPolje: this.najavljenoPolje,
                consecutiveNajava: this.consecutiveNajava,
                hasSvetiIlija: this.hasSvetiIlija,
                hasProphet: this.hasProphet,
                localGameElapsedMs: this.getLocalGameElapsedMs(),
                localGameSessionToken: this.localGameSessionToken || '',
                aiMode: false, 
                diff: this.aiDifficulty, 
                date: new Date().toISOString() 
            }; 
            try {
                if(window.localforage) await localforage.setItem(saveKey, data); 
            } catch(e) { console.warn("Greška pri čuvanju:", e); }
        };

        if (immediate) {
            await saveNow();
            return;
        }

        this._saveTimeout = setTimeout(saveNow, 800);
    }

    hasLocalGameProgress() {
        if (this.brojBacanja > 0 || this.najavaAktivna || this.najavljenoPolje) return true;
        if (!Array.isArray(this.allScores)) return false;

        return this.allScores.some(sheet => {
            if (!sheet) return false;
            return KOLONE.some(col => {
                const column = sheet[col];
                return column && REDOVI_IGRA.some(row => column[row] !== null && column[row] !== undefined);
            });
        });
    }
    
    async loadSavedGame(numPlayers = this.pendingNewGamePlayers) { 
        const uid = localStorage.getItem('yamb_uid') || 'guest';
        const saveKey = `yamb_saved_game_${uid}_${numPlayers}`;

        try { 
            const data = await localforage.getItem(saveKey); 
            if (!data) { this.modal.alert(gt('msg_no_saved_game')); return; } 
            KOLONE.forEach(col => { data.players.forEach((_, idx) => { if (data.scores[idx] && !data.scores[idx][col]) { data.scores[idx][col] = {}; REDOVI_IGRA.forEach(r => data.scores[idx][col][r] = null); } }); });
            
            this.players = data.players; 
            this.allScores = data.scores; 
            this.currentPlayerIdx = data.current; 
            this.kockiceVals = data.kockiceVals || [0,0,0,0,0,0];
            this.zadrzane = data.zadrzane || [false,false,false,false,false,false];
            this.brojBacanja = data.brojBacanja || 0;
            this.najavaAktivna = data.najavaAktivna || false;
            this.najavljenoPolje = data.najavljenoPolje || null;
            this.consecutiveNajava = Math.max(0, parseInt(data.consecutiveNajava, 10) || 0);
            this.hasSvetiIlija = data.hasSvetiIlija === true;
            this.hasProphet = data.hasProphet === true;
            
            this.aiMode = false; 
            if (this.players.length > 1) this.modeTag = "Hotseat"; else this.modeTag = "Solo";

            this.roomId = "local_" + Math.random().toString(36).substring(2, 10);
            this.localGameSessionToken = String(data.localGameSessionToken || '');
            this.startLocalGameClock(data.localGameElapsedMs || 0);

            this.initSocketConnection();
            this.setupSocketListeners(this.playerName);

            this.emitLocalGameSessionStart();

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
    
    openUndoMenu(options = {}) {
        if (!options.skipRoomIntro && this.shouldPlayThemedRoomIntro('economy')) {
            this.playEasterRoomIntro('economy', () => this.openUndoMenu({ skipRoomIntro: true }));
            return;
        }

        if (this.undoManager) this.undoManager.openMenu();
    }

    closeUndoMenu() {
        if (this.undoManager) this.undoManager.closeMenu();
    }

    async buyUndoTokens(type) {
        if (this.undoManager) await this.undoManager.buyTokens(type);
    }

    async claimCoinAdReward(type) {
        if (this.undoManager) await this.undoManager.claimCoinAdReward(type);
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
        const activeQlWinnerTheme = localStorage.getItem('yamb_theme') || 'dark';
        const qlAssetRoot = activeQlWinnerTheme === 'severna'
            ? 'assets/severna-soft-clay/ql'
            : (activeQlWinnerTheme === 'desert' ? 'assets/desert-soft-clay/ql' : 'assets/easter-soft-clay/ql');
        const qlChampionMedalFile = activeQlWinnerTheme === 'severna'
            ? 'medal-gold-v3.png?v=1'
            : (activeQlWinnerTheme === 'easter' ? 'medal-gold-v2.png?v=1' : 'medal-gold.png?v=2');
        
        let title = gt('league_champion_title') || "ŠAMPION KVARTALNE LIGE";
        let subText = (gt('league_winner_q') || "Pobednik za Q{0} / {1}.").replace('{0}', data.quarter).replace('{1}', data.year);
        let congratsText = gt('league_congrats') || "Čestitamo na osvajanju Kvartalne lige!<br>Nova sezona je počela, srećno svima!";
        let btnText = gt('btn_continue') || "NASTAVI";
        
        if(this.soundMgr) this.soundMgr.win(); 
        if(this.effectMgr) this.effectMgr.trigger('confetti');

        let modalHtml = `
        <div id="winner-modal-overlay" class="modal-overlay" style="z-index: 9999999; display: flex;">
            <div class="modal-box" style="text-align: center; padding: 30px 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.15); border-left: 1px solid rgba(255, 255, 255, 0.08); max-width: 400px; width: 90%; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width: 96px; height: 96px; margin: 0 auto 12px auto; border-radius: 24px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 42%, rgba(255,214,76,0.18), rgba(0,0,0,0.12) 70%); box-shadow: 0 0 22px rgba(255,214,76,0.24); animation: popIn 0.58s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <img class="quarter-winner-logo quarter-winner-logo-default" src="assets/quarterly-league-icon.svg" alt="" aria-hidden="true" decoding="async" style="width: 86px; height: 86px; object-fit: contain; filter: var(--league-logo-watermark-filter);">
                    <img class="quarter-winner-logo quarter-winner-logo-easter" src="assets/easter-soft-clay/quarterly-league-yotb-ql-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="quarter-winner-logo quarter-winner-logo-desert" src="assets/desert-soft-clay/quarterly-league-yotb-ql-pro.png?v=2" alt="" aria-hidden="true" decoding="async">
                    <img class="quarter-winner-logo quarter-winner-logo-nebula" src="assets/severna-soft-clay/quarterly-league-yotb-ql-pro-v6.png?v=1" alt="" aria-hidden="true" decoding="async">
                </div>
                <h2 style="color: var(--gold-main); font-size: clamp(1.25rem, 6vw, 1.72rem); line-height: 1.08; margin-top: 0; margin-bottom: 7px; text-transform: uppercase;">${title}</h2>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 20px; text-transform: uppercase;">${subText}</p>
                <img class="ql-quarter-champion-medal" src="${qlAssetRoot}/${qlChampionMedalFile}" alt="" aria-hidden="true" decoding="async">

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
