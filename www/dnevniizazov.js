// dnevniizazov.js - STANDALONE DAILY CHALLENGE (GLASSMORPHISM EDITION)

(function initYambDailyDateHelpers() {
    if (window.YambDailyDate) return;

    const TIME_ZONE = 'Europe/Belgrade';
    const pad = (value) => String(value).padStart(2, '0');
    const getDayKey = (date = new Date()) => {
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: TIME_ZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(date);
            const mapped = Object.fromEntries(parts
                .filter(part => part.type !== 'literal')
                .map(part => [part.type, part.value]));
            if (mapped.year && mapped.month && mapped.day) {
                return `${mapped.year}-${pad(mapped.month)}-${pad(mapped.day)}`;
            }
        } catch (err) {
            console.warn('Daily day key fallback:', err);
        }
        return date.toISOString().slice(0, 10);
    };

    const getLegacyDayKey = (date = new Date()) => date.toDateString();
    const isToday = (value, date = new Date()) => value === getDayKey(date) || value === getLegacyDayKey(date);
    const normalize = (value, date = new Date()) => value ? (isToday(value, date) ? getDayKey(date) : value) : "";

    window.YambDailyDate = {
        timeZone: TIME_ZONE,
        getDayKey,
        getLegacyDayKey,
        isToday,
        normalize
    };
})();

class DnevniIzazov {
    constructor(app) {
        this.app = app;
        this.currentIndex = 0;
        this.interval = null;
        this.diceValues = [0, 0, 0, 0, 0, 0];
        this.isActive = false;
        this.isIntroPlaying = false;
        this.calculatedReward = 0;
        this.claimInProgress = false;
        this.rewardClaimed = false;
        this.adInProgress = false;
        this.loadingChallenge = false;
        this.serverDiceValues = [];
        this.currentDayKey = "";
        this.currentBaseReward = 0;
        
        this.injectGlassCSS();
        this.buildUI();
    }

    injectGlassCSS() {
        if (document.getElementById('glass-daily-css')) return;
        const style = document.createElement('style');
        style.id = 'glass-daily-css';
        style.innerHTML = `
            .daily-glass-overlay,
            .daily-glass-overlay * {
                box-sizing: border-box;
            }

            .daily-glass-overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100dvh;
                padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
                background:
                    repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 56px),
                    repeating-linear-gradient(0deg, rgba(255,255,255,0.026) 0 1px, transparent 1px 56px),
                    linear-gradient(180deg, rgba(5, 10, 16, 0.76), rgba(0, 4, 8, 0.9));
                backdrop-filter: blur(22px) saturate(135%);
                -webkit-backdrop-filter: blur(22px) saturate(135%);
                z-index: 99999;
                display: none;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transform: none;
                transition: opacity 0.28s ease;
            }

            .daily-glass-overlay::before {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0.28;
                background:
                    radial-gradient(circle, rgba(255,255,255,0.36) 0 2px, transparent 3px) 14% 18% / 78px 78px,
                    radial-gradient(circle, rgba(224,201,149,0.30) 0 2px, transparent 3px) 86% 74% / 88px 88px;
                filter: blur(0.3px);
            }

            .daily-glass-overlay.active { display: flex; opacity: 1; }

            .daily-glass-overlay.daily-glass-overlay--blank .daily-glass-card {
                display: none;
                pointer-events: none;
            }

            .daily-glass-card {
                width: min(430px, calc(100vw - 32px));
                max-height: calc(100dvh - 34px);
                padding: 24px 18px 18px;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                overflow: hidden;
                overflow-y: auto;
                isolation: isolate;
                border-radius: 24px;
                border: 1px solid rgba(0, 0, 0, 0.22);
                border-top: 1px solid rgba(255, 255, 255, 0.18);
                border-left: 1px solid rgba(255, 255, 255, 0.11);
                background: rgba(255, 255, 255, 0.035);
                box-shadow:
                    0 24px 55px rgba(0, 0, 0, 0.46),
                    0 0 30px rgba(255, 255, 255, 0.035),
                    inset 0 1px 1px rgba(255,255,255,0.22);
                backdrop-filter: blur(30px) saturate(145%);
                -webkit-backdrop-filter: blur(30px) saturate(145%);
                transform: none;
            }

            .daily-glass-card::before {
                content: '';
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(90deg, transparent, rgba(224, 201, 149, 0.18), transparent) top / 100% 1px no-repeat,
                    linear-gradient(180deg, rgba(255,255,255,0.12), transparent 42%),
                    repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 18px);
                pointer-events: none;
                z-index: 0;
            }

            .daily-glass-card::after {
                content: '';
                position: absolute;
                inset: 12px;
                border-radius: 18px;
                border: 1px solid rgba(255,255,255,0.055);
                pointer-events: none;
                z-index: 0;
            }

            .daily-glass-header {
                z-index: 1;
                width: 100%;
                text-align: center;
                margin-bottom: 18px;
                padding: 0 10px;
            }

            .daily-glass-title {
                color: var(--gold-main);
                font-size: clamp(1.45rem, 7vw, 1.95rem);
                font-weight: 950;
                letter-spacing: 0;
                text-shadow: 0 2px 0 rgba(0,0,0,0.48), 0 0 18px rgba(224, 201, 149, 0.28);
                margin: 0;
                line-height: 1.08;
            }

            .daily-glass-subtitle {
                color: rgba(255,255,255,0.72);
                font-size: 0.78rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                line-height: 1.45;
                margin-top: 8px;
            }

            .daily-glass-dice-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
                z-index: 1;
                width: 100%;
                margin-bottom: 18px;
                padding: 12px;
                position: relative;
                border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.13);
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)),
                    rgba(0,0,0,0.18);
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.11),
                    inset 0 -18px 38px rgba(0,0,0,0.16),
                    0 12px 28px rgba(0,0,0,0.18);
                backdrop-filter: blur(18px) saturate(125%);
                -webkit-backdrop-filter: blur(18px) saturate(125%);
            }

            .daily-glass-dice-grid::before {
                content: '';
                position: absolute;
                inset: 8px;
                border-radius: 16px;
                border: 1px solid rgba(224,201,149,0.09);
                pointer-events: none;
            }

            .daily-glass-die {
                min-width: 0;
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.42);
                background: linear-gradient(145deg, rgba(255,255,255,0.48), rgba(255,255,255,0.13));
                color: rgba(255,255,255,0.94);
                font-size: 2.1rem;
                font-weight: 900;
                box-shadow:
                    0 14px 28px rgba(0,0,0,0.28),
                    inset 0 2px 0 rgba(255,255,255,0.34),
                    inset 0 -18px 28px rgba(0,0,0,0.12);
                text-shadow: 0 2px 8px rgba(0,0,0,0.55);
                transform: translateY(0);
                line-height: 1;
                backdrop-filter: blur(14px) saturate(145%);
                -webkit-backdrop-filter: blur(14px) saturate(145%);
                transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
            }

            .daily-glass-die::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, rgba(255,255,255,0.36), transparent 38%, rgba(255,255,255,0.06));
                pointer-events: none;
            }

            .daily-glass-die .dice-dots-wrapper {
                width: 68%;
                height: 68%;
                padding: 0;
                position: relative;
                z-index: 1;
            }

            .daily-glass-die .dice-dot {
                background: currentColor;
                box-shadow: 0 1px 0 rgba(255,255,255,0.28) inset, 0 1px 6px rgba(0,0,0,0.26);
            }

            .daily-glass-die.rolling {
                color: var(--gold-main);
                background: linear-gradient(145deg, rgba(255, 247, 210, 0.74), rgba(224, 201, 149, 0.30));
                border-color: rgba(224, 201, 149, 0.62);
                filter: saturate(1.12) brightness(1.05);
                animation: dailyDicePulse 0.32s ease-in-out infinite;
                box-shadow:
                    0 16px 30px rgba(0,0,0,0.28),
                    0 0 26px rgba(224, 201, 149, 0.44),
                    inset 0 2px 0 rgba(255,255,255,0.46);
            }

            .daily-glass-die.locked {
                transform: translateY(-2px);
                border-color: rgba(224, 201, 149, 0.62);
                box-shadow:
                    0 16px 28px rgba(0,0,0,0.32),
                    0 0 18px rgba(224, 201, 149, 0.24),
                    inset 0 2px 0 rgba(255,255,255,0.38);
            }

            .daily-glass-score-box {
                width: 100%;
                z-index: 1;
                margin-bottom: 18px;
                padding: 14px 18px;
                display: grid;
                grid-template-columns: 1fr auto;
                align-items: center;
                gap: 14px;
                border-radius: 16px;
                border: 1px solid rgba(224, 201, 149, 0.22);
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.095), rgba(255,255,255,0.035)),
                    rgba(0,0,0,0.12);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.11), 0 10px 22px rgba(0,0,0,0.16);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
            }

            .daily-glass-score-lbl {
                min-width: 0;
                color: rgba(255,255,255,0.66);
                font-size: 0.72rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-align: left;
            }

            .daily-glass-score-val {
                color: var(--gold-main);
                font-size: 2.25rem;
                font-weight: 950;
                line-height: 1;
                min-width: 72px;
                text-align: right;
                text-shadow: 0 2px 0 rgba(0,0,0,0.44), 0 0 16px rgba(224, 201, 149, 0.24);
            }

            .daily-glass-btn {
                width: 100%;
                min-height: 54px;
                z-index: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 15px 20px;
                border: 1px solid rgba(255,255,255,0.34);
                border-top-color: rgba(255,255,255,0.56);
                border-left-color: rgba(255,255,255,0.42);
                border-radius: 18px;
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.03)),
                    linear-gradient(135deg, #f8d970 0%, #d79a22 55%, #8f3727 100%);
                color: #161008;
                font-weight: 950;
                font-size: 1rem;
                letter-spacing: 0;
                text-transform: uppercase;
                cursor: pointer;
                box-shadow: 0 10px 24px rgba(0,0,0,0.34), 0 0 18px rgba(224,201,149,0.18), inset 0 2px 0 rgba(255,255,255,0.32);
                backdrop-filter: blur(18px) saturate(135%);
                -webkit-backdrop-filter: blur(18px) saturate(135%);
                transition: transform 0.1s ease, filter 0.2s ease, box-shadow 0.1s ease, border-color 0.2s ease;
            }

            .daily-glass-btn:active {
                transform: translateY(2px) scale(0.99);
                box-shadow: 0 7px 16px rgba(0,0,0,0.34), inset 0 3px 8px rgba(88,55,6,0.22);
            }

            .daily-glass-btn:disabled {
                filter: grayscale(85%);
                opacity: 0.62;
                cursor: not-allowed;
                transform: none;
            }

            .glass-daily-result {
                width: 100%;
                z-index: 2;
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 2px;
            }

            .daily-glass-btn-double {
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.04)),
                    linear-gradient(135deg, #ffe27a, #e4a72a);
            }

            .daily-glass-btn-claim {
                background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.055));
                color: #fff;
                border-color: rgba(255,255,255,0.2);
                box-shadow: 0 12px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.12);
            }

            .daily-glass-btn-claim:active {
                box-shadow: 0 8px 16px rgba(0,0,0,0.22), inset 0 3px 8px rgba(0,0,0,0.20);
            }

            @media (max-width: 380px) {
                .daily-glass-card { padding: 22px 14px 18px; border-radius: 20px; }
                .daily-glass-dice-grid { gap: 9px; padding: 9px; }
                .daily-glass-die { border-radius: 13px; font-size: 1.75rem; }
                .daily-glass-score-val { font-size: 2rem; min-width: 58px; }
                .daily-glass-btn { min-height: 50px; font-size: 0.92rem; }
            }

            @media (max-height: 620px) {
                .daily-glass-card { padding-top: 18px; padding-bottom: 14px; }
                .daily-glass-header { margin-bottom: 12px; }
                .daily-glass-dice-grid,
                .daily-glass-score-box { margin-bottom: 12px; }
            }

            @keyframes dailyDicePulse {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-2px) scale(1.035); }
            }
        `;
        document.head.appendChild(style);
    }

    buildUI() {
        const txtTitle = t('dc_title');
        const txtSub = t('dc_desc');
        const txtSum = t('dc_sum');
        const txtStop = t('dc_stop');

        const overlay = document.createElement('div');
        overlay.id = 'glass-daily-overlay';
        overlay.className = 'daily-glass-overlay';
        overlay.innerHTML = `
            <div class="daily-glass-card" id="glass-daily-card">
                <div class="daily-glass-header">
                    <h2 class="daily-glass-title">${txtTitle}</h2>
                    <div class="daily-glass-subtitle">${txtSub}</div>
                </div>
                
                <div class="daily-glass-dice-grid">
                    <div id="gd-0" class="daily-glass-die dice">?</div>
                    <div id="gd-1" class="daily-glass-die dice">?</div>
                    <div id="gd-2" class="daily-glass-die dice">?</div>
                    <div id="gd-3" class="daily-glass-die dice">?</div>
                    <div id="gd-4" class="daily-glass-die dice">?</div>
                    <div id="gd-5" class="daily-glass-die dice">?</div>
                </div>

                <div class="daily-glass-score-box">
                    <div class="daily-glass-score-lbl">${txtSum}</div>
                    <div class="daily-glass-score-val" id="glass-daily-sum">0</div>
                </div>

                <button id="glass-btn-action" class="daily-glass-btn daily-glass-btn-stop" onclick="dnevniIzazov.stopDice()">${txtStop}</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    getDiceDotsHTML(val) {
        if (this.app && typeof this.app.getDiceDotsHTML === 'function') {
            return this.app.getDiceDotsHTML(val);
        }

        if (!val || val < 1 || val > 6) return '';
        let dots = '';
        for (let i = 0; i < val; i++) {
            dots += '<div class="dice-dot"></div>';
        }
        return `<div class="dice-dots-wrapper val-${val}">${dots}</div>`;
    }

    getTodayKey(date = new Date()) {
        return window.YambDailyDate?.getDayKey
            ? window.YambDailyDate.getDayKey(date)
            : date.toISOString().slice(0, 10);
    }

    getLegacyTodayKey(date = new Date()) {
        return window.YambDailyDate?.getLegacyDayKey
            ? window.YambDailyDate.getLegacyDayKey(date)
            : date.toDateString();
    }

    isTodayKey(value, date = new Date()) {
        return window.YambDailyDate?.isToday
            ? window.YambDailyDate.isToday(value, date)
            : value === this.getTodayKey(date) || value === this.getLegacyTodayKey(date);
    }

    getCurrentUid() {
        return localStorage.getItem('yamb_uid') || this.app?.playerId || "";
    }

    normalizeDiceValues(values) {
        if (!Array.isArray(values) || values.length < 6) return [];
        const dice = values.slice(0, 6).map(value => parseInt(value, 10));
        return dice.every(value => value >= 1 && value <= 6) ? dice : [];
    }

    calculateRewardFromDice(dice = []) {
        const safeDice = this.normalizeDiceValues(dice);
        if (safeDice.length < 6) return 0;
        return (safeDice[0] + safeDice[1] + safeDice[2] + safeDice[3]) * safeDice[4] * safeDice[5];
    }

    isRewardClaimedForDay(uid, dayKey = this.getTodayKey()) {
        if (!uid) return false;
        const claimedKey = localStorage.getItem('yamb_daily_reward_claimed_' + uid);
        return claimedKey === dayKey || this.isTodayKey(claimedKey);
    }

    async ensureSocketReady(timeoutMs = 6000) {
        const socket = this.app?.socket;
        if (!socket) return false;

        if (!socket.connected) {
            if (socket.disconnected) socket.connect();
            const connected = await new Promise(resolve => {
                let settled = false;
                const finish = (ok) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    socket.off('connect', onConnect);
                    resolve(ok);
                };
                const onConnect = () => finish(true);
                const timer = setTimeout(() => finish(false), timeoutMs);
                socket.once('connect', onConnect);
            });
            if (!connected) return false;
        }

        if (typeof this.app.authenticateSocketIdentity === 'function') {
            const authResult = await this.app.authenticateSocketIdentity();
            return !!(authResult && authResult.ok);
        }

        return true;
    }

    async requestDailyChallengeFromServer() {
        const socket = this.app?.socket;
        if (!socket) return { ok: false, reason: 'err_server_conn' };

        const ready = await this.ensureSocketReady(7000);
        if (!ready) return { ok: false, reason: 'auth_required' };

        return new Promise(resolve => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, 10000);

            socket.emit('request_daily_challenge', {}, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    setChallengeState(challenge = {}) {
        const dice = this.normalizeDiceValues(challenge.dice);
        this.serverDiceValues = dice;
        this.currentDayKey = challenge.dayKey || this.getTodayKey();
        this.currentBaseReward = Math.max(0, parseInt(challenge.reward, 10) || this.calculateRewardFromDice(dice));
    }

    async open() {
        if (!this.app.requireLogin()) return;
        if (this.isIntroPlaying || this.isActive || this.loadingChallenge) return;

        const uid = this.getCurrentUid();
        const locallyClaimedToday = this.isRewardClaimedForDay(uid);
        this.loadingChallenge = true;

        let challenge;
        try {
            challenge = await this.requestDailyChallengeFromServer();
        } finally {
            this.loadingChallenge = false;
        }

        if (!challenge || !challenge.ok) {
            if (locallyClaimedToday) {
                this.showIntroBackdrop();
                this.playIntro(() => this.showAlreadyPlayedInfo(), { openBehindOverlayAt: null });
                return;
            }

            const message = challenge?.reason === 'auth_required'
                ? (t('auth_required') || t('economy_auth_required'))
                : (t('err_server_conn') || t('dc_ads_unavailable'));
            this.app.modal.alert(message, t('info_title'));
            return;
        }

        this.setChallengeState(challenge);
        const today = this.currentDayKey || this.getTodayKey();
        const alreadyPlayed = !!challenge.alreadyClaimed || this.isRewardClaimedForDay(uid, today);

        if (challenge.balance !== undefined) {
            const serverBalance = Math.max(0, parseInt(challenge.balance, 10) || 0);
            localStorage.setItem('yamb_dukati', serverBalance);
            if (window.statsManager) {
                window.statsManager.stats.balance = serverBalance;
                window.statsManager.saveStats();
            }
            if (typeof updateMainMenuDashboard === 'function') updateMainMenuDashboard();
        }

        if (alreadyPlayed) {
            localStorage.setItem('yamb_last_daily_' + uid, today);
            localStorage.setItem('yamb_daily_reward_claimed_' + uid, today);
            this.showIntroBackdrop();
        } else {
            this.markDailyAttempt(uid, today);
        }

        this.playIntro(() => {
            if (alreadyPlayed) {
                this.showAlreadyPlayedInfo();
                return;
            }
            this.startDailyChallenge();
        }, { openBehindOverlayAt: alreadyPlayed ? null : 3650 });
    }

    playIntro(onComplete, options = {}) {
        const overlay = document.getElementById('daily-intro');
        const leftWord = overlay?.querySelector('.daily-intro-word-left');
        const rightWord = overlay?.querySelector('.daily-intro-word-right');

        if (!overlay) {
            onComplete();
            return;
        }

        this.isIntroPlaying = true;
        this.applyIntroTheme(overlay);
        this.setIntroTitle(leftWord, rightWord);
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');

        let completed = false;
        const openBehindOverlayAt = options.openBehindOverlayAt === null
            ? null
            : (Number.isFinite(options.openBehindOverlayAt) ? options.openBehindOverlayAt : 3650);
        const introDuration = 4600;
        const completeOnce = () => {
            if (completed) return;
            completed = true;
            onComplete();
        };

        if (openBehindOverlayAt !== null && openBehindOverlayAt < introDuration) {
            setTimeout(completeOnce, Math.max(0, openBehindOverlayAt));
        }

        setTimeout(() => {
            completeOnce();
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            this.isIntroPlaying = false;
        }, introDuration);
    }

    showIntroBackdrop() {
        const overlay = document.getElementById('glass-daily-overlay');
        if (!overlay) return;

        const resUI = document.getElementById('glass-daily-result');
        if (resUI) resUI.remove();

        const btn = document.getElementById('glass-btn-action');
        if (btn) {
            btn.style.display = 'block';
            btn.disabled = false;
        }

        overlay.classList.add('daily-glass-overlay--blank');
        overlay.classList.add('active');
    }

    hideIntroBackdrop() {
        const overlay = document.getElementById('glass-daily-overlay');
        if (!overlay) return;

        overlay.classList.remove('active');
        overlay.classList.remove('daily-glass-overlay--blank');
    }

    showAlreadyPlayedInfo() {
        const alertPromise = this.app?.modal?.alert
            ? this.app.modal.alert(t('dc_done'), t('info_title'))
            : Promise.resolve(window.alert(t('dc_done')));

        Promise.resolve(alertPromise).finally(() => this.hideIntroBackdrop());
    }

    applyIntroTheme(overlay) {
        const knownThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const introTheme = knownThemes.includes(activeTheme) ? activeTheme : 'dark';

        knownThemes.forEach(theme => overlay.classList.remove(`theme-${theme}`));
        overlay.classList.add(`theme-${introTheme}`);
    }

    setIntroTitle(leftWord, rightWord) {
        if (!leftWord || !rightWord) return;

        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const label = gt('dc_title', 'DNEVNI IZAZOV').trim().split(/\s+/);

        leftWord.textContent = gt('dc_intro_left', label[0] || 'DNEVNI');
        rightWord.textContent = gt('dc_intro_right', label.slice(1).join(' ') || 'IZAZOV');
    }

    markDailyAttempt(uid, today) {
        localStorage.setItem('yamb_last_daily_' + uid, today);
        this.syncDailyProgress({ lastDaily: today });
    }

    syncDailyProgress(extraStats = {}) {
        const socket = this.app?.socket;
        if (!socket) return;

        const emitVerifiedProfile = () => {
            if (typeof this.app.emitPlayerData === 'function') {
                this.app.emitPlayerData(false).catch(err => {
                    console.warn('Daily sync nije potvrđen:', err);
                });
                return;
            }

            let currentStats = {};
            if (typeof getFullLocalStats === 'function') {
                currentStats = getFullLocalStats();
            } else if (typeof this.app.getFullLocalStats === 'function') {
                currentStats = this.app.getFullLocalStats();
            }

            this.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid') || this.app.playerId,
                name: this.app.playerName,
                stats: { ...currentStats, ...extraStats },
                playerId: this.app.playerId
            });
        };

        if (socket.connected) {
            emitVerifiedProfile();
            return;
        }

        socket.once('connect', emitVerifiedProfile);
        socket.connect();
    }

    startDailyChallenge() {
        const overlay = document.getElementById('glass-daily-overlay');
        if(overlay) overlay.classList.add('active');
        if (this.app && typeof this.app.setInviteBusyState === 'function') {
            this.app.setInviteBusyState(true, 'daily_challenge');
        }

        this.resetGame();
        this.startRolling(0);
    }

    close() {
        if (this.isActive) return; // Ne daj izlaz usred rolanja
        const overlay = document.getElementById('glass-daily-overlay');
        if(overlay) overlay.classList.remove('active');
    }

    resetGame() {
        this.currentIndex = 0;
        this.diceValues = [0, 0, 0, 0, 0, 0];
        this.isActive = true;
        this.calculatedReward = 0;
        this.claimInProgress = false;
        this.rewardClaimed = false;
        this.adInProgress = false;
        this.currentBaseReward = this.currentBaseReward || this.calculateRewardFromDice(this.serverDiceValues);
        
        document.getElementById('glass-daily-sum').innerText = "0";
        
        const btn = document.getElementById('glass-btn-action');
        btn.disabled = false;
        btn.style.display = 'block';
        
        // Reset kockica i primena skinova
        for(let i=0; i<6; i++) {
            const el = document.getElementById(`gd-${i}`);
            el.innerHTML = "?";
            el.className = 'daily-glass-die dice'; // Reset klasa
            if (this.app.features) this.app.features.applySkinToElement(el);
        }

        // Sakrij ako postoji Result UI od prošlog puta
        const resUI = document.getElementById('glass-daily-result');
        if (resUI) resUI.remove();
    }

    startRolling(index) {
        if (index >= 6) {
            this.finishGame();
            return;
        }

        const dieEl = document.getElementById(`gd-${index}`);
        dieEl.classList.add('rolling');
        
        this.interval = setInterval(() => {
            const rnd = Math.floor(Math.random() * 6) + 1;
            dieEl.innerHTML = this.getDiceDotsHTML(rnd);
            dieEl.dataset.val = rnd; 
        }, 50); 
    }

    stopDice() {
        if (!this.isActive) return;

        clearInterval(this.interval);
        if (this.app.soundMgr) this.app.soundMgr.click();
        if (this.app.vibrate) this.app.vibrate(20);

        const dieEl = document.getElementById(`gd-${this.currentIndex}`);
        const serverVal = parseInt(this.serverDiceValues[this.currentIndex], 10);
        let finalVal = (serverVal >= 1 && serverVal <= 6)
            ? serverVal
            : (parseInt(dieEl.dataset.val, 10) || Math.floor(Math.random() * 6) + 1);
        
        this.diceValues[this.currentIndex] = finalVal;
        dieEl.innerHTML = this.getDiceDotsHTML(finalVal);
        
        dieEl.classList.remove('rolling');
        dieEl.classList.add('locked');

        this.calculateTempScore();

        this.currentIndex++;
        if (this.currentIndex < 6) {
            this.startRolling(this.currentIndex);
        } else {
            this.isActive = false; 
            document.getElementById('glass-btn-action').disabled = true; 
            setTimeout(() => this.finishGame(), 600); 
        }
    }

    calculateTempScore() {
        let tempVal = 0;
        let d = this.diceValues;
        let sumPrvaCetiri = d[0] + d[1] + d[2] + d[3];

        if (this.currentIndex <= 3) {
            tempVal = d.slice(0, this.currentIndex + 1).reduce((a,b)=>a+b, 0);
        } else if (this.currentIndex === 4) {
            tempVal = sumPrvaCetiri * d[4];
        } else if (this.currentIndex === 5) {
            tempVal = sumPrvaCetiri * d[4] * d[5];
        }

        document.getElementById('glass-daily-sum').innerText = tempVal;
        this.calculatedReward = tempVal;
    }

    finishGame() {
        this.isActive = false;
        if (this.app && typeof this.app.setInviteBusyState === 'function') {
            this.app.setInviteBusyState(false);
        }

        // Više nema potrebe za upisom datuma ovde, jer smo to uradili na samom početku (open metoda)
        const expectedReward = this.currentBaseReward || this.calculateRewardFromDice(this.diceValues);
        if (expectedReward > 0) {
            this.calculatedReward = expectedReward;
            const scoreEl = document.getElementById('glass-daily-sum');
            if (scoreEl) scoreEl.innerText = expectedReward;
        }

        if (this.app.soundMgr) this.app.soundMgr.win();
        if (this.app.effectMgr) this.app.effectMgr.trigger('gold_rain');

        this.showResultModal();
    }

    showResultModal() {
        const card = document.getElementById('glass-daily-card');
        document.getElementById('glass-btn-action').style.display = 'none';
        
        const resDiv = document.createElement('div');
        resDiv.id = 'glass-daily-result';
        resDiv.className = 'glass-daily-result';

        resDiv.innerHTML = `
            <button class="daily-glass-btn daily-glass-btn-double" onclick="dnevniIzazov.watchAdToDouble()">
                🎥 ${t('btn_double_short')} ${dukatIconHtml()} (x2)
            </button>
            <button class="daily-glass-btn daily-glass-btn-claim" onclick="dnevniIzazov.claim(false)">
                ${t('btn_claim_short')}
            </button>
        `;
        
        card.appendChild(resDiv);

        if (window.adMobGlobal && typeof window.adMobGlobal.prepareReward === 'function') {
            window.adMobGlobal.prepareReward(this.getDoubleRewardOptions());
        }
    }

    getDoubleRewardOptions() {
        return {
            context: 'daily_double',
            amount: Math.max(0, (parseInt(this.calculatedReward) || 0) * 2)
        };
    }

    async watchAdToDouble() {
        if (this.rewardClaimed || this.claimInProgress || this.adInProgress) return;

        this.adInProgress = true;
        this.setResultButtonsDisabled(true);

        if (window.adMobGlobal) {
            try {
                const rewardOptions = this.getDoubleRewardOptions();
                const success = await window.adMobGlobal.showRewardVideo(rewardOptions);
                if (success) {
                    const ssvNonce = typeof window.adMobGlobal.consumeLastRewardSsvNonce === 'function'
                        ? window.adMobGlobal.consumeLastRewardSsvNonce()
                        : '';
                    await this.claim(true, ssvNonce);
                    return;
                }
            } finally {
                this.adInProgress = false;
                if (!this.rewardClaimed) this.setResultButtonsDisabled(false);
            }
        } else {
            this.app.modal.alert(t('dc_ads_unavailable'), t('info_title'));
            this.adInProgress = false;
            await this.claim(false);
        }
    }

    setResultButtonsDisabled(disabled) {
        document.querySelectorAll('#glass-daily-result .daily-glass-btn').forEach(btn => {
            btn.disabled = disabled;
        });
    }

    async claimDailyRewardOnServer(amount, doubled = false, ssvNonce = '') {
        const app = this.app;
        const socket = app?.socket;
        if (!socket) return { ok: false, reason: 'err_server_conn' };

        if (!socket.connected) {
            if (socket.disconnected) socket.connect();
            const connected = await new Promise(resolve => {
                let settled = false;
                const finish = (ok) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    socket.off('connect', onConnect);
                    resolve(ok);
                };
                const onConnect = () => finish(true);
                const timer = setTimeout(() => finish(false), 5000);
                socket.once('connect', onConnect);
            });

            if (!connected) return { ok: false, reason: 'err_server_conn' };
        }

        if (typeof app.authenticateSocketIdentity === 'function') {
            const authResult = await app.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: 'auth_required' };
            }
        }

        return new Promise(resolve => {
            let settled = false;
            const claimTimeoutMs = doubled ? 45000 : 18000;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, claimTimeoutMs);

            socket.emit('claim_daily_reward', { amount, doubled: !!doubled, ssvNonce }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    setLocalRewardState(uid, today, amount, balance) {
        localStorage.setItem('yamb_dukati', balance);
        localStorage.setItem('yamb_last_daily_' + uid, today);
        localStorage.setItem('yamb_daily_reward_claimed_' + uid, today);
        localStorage.setItem('yamb_daily_reward_amount_' + uid, String(amount));

        if (window.statsManager) {
            window.statsManager.stats.balance = balance;
            window.statsManager.saveStats();
        }

        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }
    }

    async claim(doubled, ssvNonce = '') {
        if (this.rewardClaimed || this.claimInProgress) return;

        this.claimInProgress = true;
        this.rewardClaimed = true;
        this.setResultButtonsDisabled(true);

        const baseAmount = Math.max(0, parseInt(this.calculatedReward, 10) || 0);
        let finalAmount = doubled ? baseAmount * 2 : baseAmount;
        const uid = this.getCurrentUid();
        const today = this.currentDayKey || this.getTodayKey();
        
        const rewardResult = doubled && window.adMobGlobal && typeof window.adMobGlobal.claimRewardWithSsvRetry === 'function'
            ? await window.adMobGlobal.claimRewardWithSsvRetry(
                () => this.claimDailyRewardOnServer(finalAmount, doubled, ssvNonce),
                { nonce: ssvNonce, context: 'daily_double' }
            )
            : await this.claimDailyRewardOnServer(finalAmount, doubled, ssvNonce);
        if (!rewardResult.ok) {
            if (rewardResult.reason === 'daily_already_claimed') {
                const serverBalance = Math.max(0, parseInt(rewardResult.balance) || parseInt(localStorage.getItem('yamb_dukati')) || 0);
                this.setLocalRewardState(uid, today, 0, serverBalance);
                this.close();
                this.app.modal.alert(t('dc_done'), t('info_title'));
                return;
            }

            this.claimInProgress = false;
            this.rewardClaimed = false;
            this.setResultButtonsDisabled(false);

            const message = rewardResult.reason === 'auth_required'
                ? (t('auth_required') || t('economy_auth_required'))
                : (rewardResult.reason === 'ad_verification_required' || rewardResult.reason === 'ad_verification_pending'
                    ? (t('ad_confirmation_retry') || 'Potvrda reklame još nije stigla. Pokušajte preuzimanje nagrade za par sekundi.')
                    : (t('err_server_conn') || t('dc_ads_unavailable')));
            this.app.modal.alert(message, t('info_title'));
            return;
        }

        const awardedAmount = parseInt(rewardResult.reward) || finalAmount;
        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        if (rewardResult.balance !== undefined) {
            currentDukati = Math.max(0, parseInt(rewardResult.balance) || 0);
        } else {
            currentDukati += awardedAmount;
        }

        this.setLocalRewardState(uid, today, awardedAmount, currentDukati);

        if (rewardResult.localFallback) {
            this.syncDailyProgress({
                lastDaily: today,
                dailyRewardClaimed: today,
                dailyRewardAmount: awardedAmount
            });
        }

        // 5. Zatvori izazov i prikaži poruku
        this.close();

        if (doubled) {
            if (this.app.effectMgr) this.app.effectMgr.trigger('confetti');
            this.app.modal.alert(t('dc_reward_doubled').replace('{0}', awardedAmount), t('dc_congrats'));
        } else {
            this.app.modal.alert(t('dc_reward_won').replace('{0}', awardedAmount), t('dc_success'));
        }
    }
}
