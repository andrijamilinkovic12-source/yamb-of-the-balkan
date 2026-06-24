// turnir.js - LOGIKA ZA ASINHRONE TURNIRE (POVEZANO SA SERVEROM) - ID BAZIRANA IDENTIFIKACIJA SA DVORANOM SLAVNIH

const tt = (key) => {
    if (typeof t === 'function') return t(key);
    return key;
};

const TOURNEY_ENTRY_FEE = 5500;

const tourneySecurityFallback = {
    escapeHtml: (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char])),
    escapeAttr(value) {
        return this.escapeHtml(value);
    },
    safeUrl(value, fallback = '') {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;
        try {
            const parsed = new URL(raw, window.location.origin);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
        } catch (err) {
            return fallback;
        }
    }
};

class TournamentManager {
    constructor(app) {
        this.app = app;

        this.state = {
            status: 'registration',
            players: [],
            bracket: { qf: [], sf: [], f: [] }
        };

        this.tourneyLeaderboard = [];

        this.activeTab = 'info';
        this.pendingRegistration = false;
        this.pendingUnregister = false;
        this.reminderInFlight = false;
        this.isIntroPlaying = false;

        if (this.app) {
            this.app.openTournament = () => this.open();
        }

        this.setupSocketListeners();
    }

    sec() {
        return window.YambSecurity || tourneySecurityFallback;
    }

    escape(value) {
        return this.sec().escapeHtml(value);
    }

    escapeAttr(value) {
        return this.sec().escapeAttr(value);
    }

    playerPhotoUrl(player) {
        const name = String(player?.name || player?.playerName || 'Igrac');
        const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=333&color=E0C995`;
        return this.escapeAttr(this.sec().safeUrl(player?.photoUrl, fallback));
    }

    serverMessage(key, fallback) {
        if (!key) return fallback || tt('err_server_conn');
        const translated = tt(key);
        return translated && translated !== key ? translated : (fallback || key || tt('err_server_conn'));
    }

    tr(key, fallback) {
        const translated = tt(key);
        return translated && translated !== key ? translated : fallback;
    }

    // --- NOVA BULLETPROOF FUNKCIJA ZA INDEKS MOĆI (AŽURIRANA ZA CENTRALNU BAZU) ---
    calculateMyPI() {
        // Pokušaj 1: Direktno preko app funkcija ako su već učitane i spremne
        if (this.app && typeof this.app.calculatePowerIndex === 'function' && typeof this.app.getFullLocalStats === 'function') {
            const stats = this.app.getFullLocalStats();
            if (stats && Object.keys(stats).length > 0 && stats.games > 0) {
                return this.app.calculatePowerIndex(stats).toString();
            }
        }

        if (!window.powerIndexCore) return '0';

        // Pokušaj 2: Čupanje direktno iz baze (localStorage) - SADA IZ CENTRALNOG yamb_stats JSON-a
        let s = JSON.parse(localStorage.getItem('yamb_stats') || '{}');

        // Fallback na statsManager u slučaju da su se ključevi drugačije sačuvali u memoriji
        if (window.statsManager && window.statsManager.stats) {
            let sm = window.statsManager.stats;
            s = {
                ...sm,
                ...s,
                games: s.games || s.totalGames || sm.games || sm.totalGames
            };
        }

        s.h2hStats = JSON.parse(localStorage.getItem('yamb_h2h_stats') || '{}');

        // Kvartalna liga bodovi
        let leaguePts;
        if (window.kvartalnaLiga && typeof window.kvartalnaLiga.getScores === 'function') {
            let ls = window.kvartalnaLiga.getScores();
            leaguePts = parseInt(ls.quarterlyScore) || 0;
        }

        let unlocked = s.unlockedTrophies || [];
        if (!unlocked || unlocked.length === 0) {
            if (window.statsManager && window.statsManager.stats && window.statsManager.stats.unlockedTrophies) {
                unlocked = window.statsManager.stats.unlockedTrophies;
            }
        }
        s.unlockedTrophies = unlocked;

        return window.powerIndexCore.calculatePowerIndex(s, { leaguePts }).toString();
    }

    // --- NOVA FUNKCIJA: LOGIKA ZA PAMETNI BEDŽ TURNIRA ---
    updateTourneyBadge() {
        const badge = document.getElementById('tourney-status-badge');
        if (!badge) return;

        const hideBadge = () => {
            badge.style.display = 'none';
            badge.classList.remove('tourney-badge-pulse');
            badge.removeAttribute('title');
            badge.removeAttribute('aria-label');
        };

        const showBadge = (color, glow, pulse, label) => {
            badge.style.display = 'block';
            badge.style.background = color;
            badge.style.boxShadow = glow || 'none';
            badge.title = label;
            badge.setAttribute('aria-label', label);
            badge.classList.toggle('tourney-badge-pulse', Boolean(pulse));
        };

        if (!this.app || !this.app.playerId) {
            hideBadge();
            return;
        }

        const myId = this.app.playerId;
        const status = this.state.status;

        // 1. Faza prijave: Prikazujemo narandžasto (ako već nismo prijavljeni)
        if (status === 'registration') {
            const isRegistered = this.state.players.some(p => p.id === myId);
            if (!isRegistered) {
                showBadge('#ff9800', '0 0 5px #ff9800', false, this.tr('tourney_badge_open', 'Turnir prima prijave'));
            } else {
                // Ako je prijavljen, sakrijemo dok ne počne
                hideBadge();
            }
            return;
        }

        // 2. Faza aktivnog turnira: Proveravamo da li igrač ima neku akciju
        if (status === 'active' && this.state.bracket) {
            let hasActionNow = false;
            let stillInTournament = false;
            let eliminated = false;

            // Prolazimo kroz ceo kostur da vidimo stanje igrača
            ['qf', 'sf', 'f'].forEach(round => {
                if (this.state.bracket[round]) {
                    this.state.bracket[round].forEach(match => {
                        if (match && ((match.p1 && match.p1.id === myId) || (match.p2 && match.p2.id === myId))) {
                            if (match.winnerId) {
                                if (match.winnerId === myId) {
                                    stillInTournament = true;
                                } else {
                                    eliminated = true;
                                }
                                return;
                            }

                            stillInTournament = true;
                            if (!match.winnerId) {
                                if (match.p1 && match.p2 && (match.timeAccepted || !match.proposedTime || match.proposedById !== myId)) {
                                    hasActionNow = true;
                                }
                            }
                        }
                    });
                }
            });

            if (eliminated) {
                hideBadge();
            } else if (hasActionNow) {
                showBadge(
                    'var(--success)',
                    '0 0 8px var(--success)',
                    true,
                    this.tr('tourney_badge_action', 'Turnirski mec ceka vasu akciju')
                );
            } else if (stillInTournament) {
                showBadge('#aaaaaa', 'none', false, this.tr('tourney_badge_waiting', 'U turniru ste i cekate druge'));
            } else {
                // Ispao iz turnira
                hideBadge();
            }
            return;
        }

        // 3. Turnir završen ili nepoznat status
        hideBadge();
    }

    findMyActiveMatch(state = this.state) {
        if (!this.app || !this.app.playerId || !state || state.status !== 'active' || !state.bracket) return null;

        const myId = this.app.playerId;
        const rounds = ['qf', 'sf', 'f'];

        for (const round of rounds) {
            const matches = Array.isArray(state.bracket[round]) ? state.bracket[round] : [];
            for (let index = 0; index < matches.length; index++) {
                const match = matches[index];
                if (!match || !match.p1 || !match.p2 || match.winnerId) continue;

                const isP1 = match.p1.id === myId;
                const isP2 = match.p2.id === myId;
                if (!isP1 && !isP2) continue;

                const opponent = isP1 ? match.p2 : match.p1;
                if (!opponent || !opponent.id) continue;

                return { round, index, match, opponent };
            }
        }

        return null;
    }

    getTournamentReminderKey(info) {
        if (!info || !info.match) return '';
        const match = info.match;
        const proposedPart = match.proposedTime || 'no-time';
        const acceptedPart = match.timeAccepted ? 'accepted' : 'pending';
        return [
            this.app && this.app.playerId ? this.app.playerId : 'player',
            this.state.status,
            info.round,
            info.index,
            proposedPart,
            acceptedPart
        ].join('|');
    }

    maybeShowTournamentReminder(state = this.state) {
        if (!this.app || !this.app.modal || this.reminderInFlight) return;
        if (document.getElementById('tournament-screen')?.classList.contains('active')) return;
        if (document.getElementById('game-scene')?.classList.contains('active')) return;
        if (this.app.gameActive) return;

        const info = this.findMyActiveMatch(state);
        if (!info) return;

        const key = this.getTournamentReminderKey(info);
        if (!key) return;

        const reminderCooldownMs = 6 * 60 * 60 * 1000;
        let reminderState = null;
        try {
            reminderState = JSON.parse(localStorage.getItem('yamb_tourney_reminder_seen') || 'null');
        } catch (err) {
            reminderState = null;
        }

        if (
            reminderState &&
            reminderState.key === key &&
            Date.now() - Number(reminderState.time || 0) < reminderCooldownMs
        ) {
            return;
        }

        localStorage.setItem('yamb_tourney_reminder_seen', JSON.stringify({ key, time: Date.now() }));
        this.reminderInFlight = true;

        const opponentName = this.escape(info.opponent.name || 'Protivnik');
        let msg;

        if (info.match.timeAccepted) {
            msg = `${this.tr('tourney_reminder_ready', 'Vaš turnirski meč je dogovoren.')}<br><br><strong>${opponentName}</strong><br>${this.formatDate(info.match.time || info.match.proposedTime)}<br><br>${this.tr('tourney_reminder_open', 'Otvorite turnir da pokrenete meč.')}`;
        } else if (info.match.proposedTime && info.match.proposedById !== this.app.playerId) {
            msg = `${this.tr('tourney_reminder_pending_accept', 'Protivnik je predložio termin za turnirski meč.')}<br><br><strong>${opponentName}</strong><br>${this.formatDate(info.match.proposedTime)}<br><br>${this.tr('tourney_reminder_open_accept', 'Otvorite turnir da prihvatite ili predložite drugo vreme.')}`;
        } else if (info.match.proposedTime) {
            msg = `${this.tr('tourney_reminder_waiting', 'Prijavljeni ste za turnir i čekate odgovor protivnika.')}<br><br><strong>${opponentName}</strong><br>${this.formatDate(info.match.proposedTime)}<br><br>${this.tr('tourney_reminder_open_change', 'Možete otvoriti turnir i promeniti predlog termina.')}`;
        } else {
            msg = `${this.tr('tourney_reminder_schedule', 'Prijavljeni ste za turnir. Vaš meč čeka zakazivanje.')}<br><br><strong>${opponentName}</strong><br><br>${this.tr('tourney_reminder_open_schedule', 'Otvorite turnir i zakažite termin sa ovim igračem.')}`;
        }

        this.app.modal.confirm(msg).then(open => {
            this.reminderInFlight = false;
            if (!open) return;
            this.openMatchFromReminder(info.round, info.index);
        });
    }

    openMatchFromReminder(round, index) {
        this.activeTab = 'bracket';
        this.open({ skipIntro: true });

        setTimeout(() => {
            const freshInfo = this.findMyActiveMatch();
            const targetRound = freshInfo ? freshInfo.round : round;
            const targetIndex = freshInfo ? freshInfo.index : index;
            this.openMatchModal(targetRound, targetIndex);
        }, 250);
    }

    setupSocketListeners() {
        if(this.app && !this.app.socket) {
            this.app.initSocketConnection();
        }

        setTimeout(() => {
            if(this.app && this.app.socket) {

                // >>> DODATA LINIJA KODA <<<
                // Odmah po uspostavljanju konekcije tražimo stanje da bismo ažurirali bedž
                this.app.socket.emit('tourney_get_state');

                this.app.socket.on('tourney_state_update', (newState) => {
                    const oldStatus = this.state.status;
                    this.state = newState;

                    // --- POZIV NOVE FUNKCIJE ZA BEDŽ ---
                    this.updateTourneyBadge();

                    if (this.app && this.app.playerId) {
                        const myId = this.app.playerId;
                        const myPi = this.calculateMyPI(); // ⚡ Izračunaj trenutni PI

                        // --- NOVA LOGIKA ZA AUTO-SINHRONIZACIJU PI ---
                        let needsUpdate = false;

                        // Provera u listi za registraciju
                        let myServerPlayer = newState.players && newState.players.find(p => p.id === myId);
                        if (myServerPlayer && myServerPlayer.pi !== myPi) {
                            needsUpdate = true;
                        }

                        // Provera u kosturu (bracket)
                        if (newState.status !== 'registration' && newState.bracket) {
                            ['qf', 'sf', 'f'].forEach(round => {
                                if (newState.bracket[round]) {
                                    newState.bracket[round].forEach(match => {
                                        if (match) {
                                            if (match.p1 && match.p1.id === myId && match.p1.pi !== myPi) needsUpdate = true;
                                            if (match.p2 && match.p2.id === myId && match.p2.pi !== myPi) needsUpdate = true;
                                        }
                                    });
                                }
                            });
                        }

                        // Ako server ima staru vrednost, ispaljujemo update
                        if (needsUpdate) {
                            this.app.socket.emit('tourney_update_pi', { id: myId, pi: myPi });
                        }
                        // ---------------------------------------------

                        const isRegisteredServer = newState.players && newState.players.some(p => p.id === myId);

                        const storageKey = 'yamb_tourney_reg_' + myId;
                        const localRegTime = localStorage.getItem(storageKey);

                        if (newState.status === 'registration' && localRegTime && !isRegisteredServer) {
                            localStorage.removeItem(storageKey);
                        }

                        if (newState.status !== 'registration' && newState.bracket && newState.bracket.f && newState.bracket.f[0] && newState.bracket.f[0].winnerId) {
                            localStorage.removeItem(storageKey);
                        }
                    }

                    if (oldStatus === 'registration' && newState.status !== 'registration') {
                        this.activeTab = 'bracket';
                    }

                    this.maybeShowTournamentReminder(newState);

                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                this.app.socket.on('tourney_register_result', (result = {}) => {
                    this.pendingRegistration = false;

                    if (result.ok) {
                        if (this.app && this.app.playerId) {
                            localStorage.setItem('yamb_tourney_reg_' + this.app.playerId, Date.now().toString());
                        }
                    } else if (this.app && this.app.modal) {
                        this.app.modal.alert(
                            this.serverMessage(result.reason, tt('err_server_conn') || 'Greška pri konekciji sa serverom.'),
                            tt('warning_title') || 'UPOZORENJE'
                        );
                    }

                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                this.app.socket.on('tourney_unregister_result', (result = {}) => {
                    this.pendingUnregister = false;

                    if (result.ok) {
                        if (this.app && this.app.playerId) {
                            localStorage.removeItem('yamb_tourney_reg_' + this.app.playerId);
                        }

                        if (!result.alreadyUnregistered && this.app && this.app.modal) {
                            this.app.modal.alert(
                                tt('tourney_unregistered_success') || `Uspešno ste se odjavili. Vraćeno Vam je ${TOURNEY_ENTRY_FEE} ${dukatIconHtml()}.`,
                                tt('modal_title_info') || "INFO"
                            );
                        }
                    } else if (this.app && this.app.modal) {
                        this.app.modal.alert(
                            this.serverMessage(result.reason, tt('err_server_conn') || 'Greška pri konekciji sa serverom.'),
                            tt('warning_title') || 'UPOZORENJE'
                        );
                    }

                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                this.app.socket.on('tourney_stats_data', (data) => {
                    this.tourneyLeaderboard = data;
                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                this.app.socket.on('tourney_duel_ready', (data) => {
                    const myId = this.app.playerId;
                    if (data.targetId === myId) {
                        if (this.app.isDoNotDisturbActive && this.app.isDoNotDisturbActive()) return;

                        const opponentName = this.escape(data.opponentName || 'Protivnik');
                        let msg = tt('tourney_opponent_ready');
                        if (msg !== 'tourney_opponent_ready') {
                            msg = msg.replace('{0}', opponentName);
                        } else {
                            msg = `${opponentName} je pokrenuo vaš turnirski meč. Da li ulazite?`;
                        }

                        this.app.modal.confirm(msg).then(acc => {
                            if(acc) {
                                this.app.joinPrivateGame(this.app.playerName, data.matchRoomId);
                            }
                        });
                    }
                });

                this.app.socket.on('tourney_join_allowed', (matchRoomId) => {
                    this.app.joinPrivateGame(this.app.playerName, matchRoomId);
                });
            }
        }, 1000);
    }

    open(options = {}) {
        const skipIntro = Boolean(options.skipIntro);
        const tournamentScreen = document.getElementById('tournament-screen');
        const alreadyOpen = tournamentScreen?.classList.contains('active');

        if (!skipIntro && !alreadyOpen) {
            if (this.isIntroPlaying) return;
            this.playIntro(() => this.openScreen());
            return;
        }

        this.openScreen();
    }

    playIntro(onComplete) {
        const overlay = document.getElementById('tournament-intro');
        const title = overlay?.querySelector('.tournament-intro-title');

        if (!overlay) {
            onComplete();
            return;
        }

        this.isIntroPlaying = true;
        this.applyIntroTheme(overlay);
        this.setIntroTitle(title);
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');

        let completed = false;
        const openBehindOverlayAt = 3650;
        const introDuration = 4600;

        setTimeout(() => {
            if (completed) return;
            completed = true;
            onComplete();
        }, openBehindOverlayAt);

        setTimeout(() => {
            if (!completed) {
                completed = true;
                onComplete();
            }
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            this.isIntroPlaying = false;
        }, introDuration);
    }

    applyIntroTheme(overlay) {
        const knownThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const introTheme = knownThemes.includes(activeTheme) ? activeTheme : 'dark';

        knownThemes.forEach(theme => overlay.classList.remove(`theme-${theme}`));
        overlay.classList.add(`theme-${introTheme}`);
    }

    setIntroTitle(title) {
        if (!title) return;
        title.textContent = this.tr('tourney_intro_title', 'TURNIR');
    }

    openScreen() {
        if (this.state.status !== 'registration' && this.activeTab === 'info') {
            this.activeTab = 'bracket';
        }

        this.app.navigateTo('tournament-screen');
        if(this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('tourney_get_state');
            this.app.socket.emit('get_tourney_stats');
        } else {
            this.app.initSocketConnection();
            setTimeout(() => {
                if(this.app.socket) {
                    this.app.socket.emit('tourney_get_state');
                    this.app.socket.emit('get_tourney_stats');
                }
            }, 500);
        }
        this.render();
    }

    switchTab(tab) {
        this.app.soundMgr.click();
        this.activeTab = tab;
        this.render();
    }

    render() {
        const container = document.getElementById('tourney-content');
        if (!container) return;

        container.style.flex = "1";
        container.style.width = "100%";
        container.style.overflow = "hidden";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "stretch";

        container.style.height = "";
        container.style.paddingTop = "";
        container.style.paddingBottom = "";

        container.innerHTML = `
            <div class="tourney-tabs" role="tablist" aria-label="Turnir sekcije">
                <button class="tourney-tab-btn ${this.activeTab === 'info' ? 'active' : ''}" role="tab" aria-selected="${this.activeTab === 'info'}" aria-label="${tt('tourney_tab_info') || 'Info'}" title="${tt('tourney_tab_info') || 'Info'}" onclick="app.tournamentManager.switchTab('info')">
                    <img class="tourney-tab-icon tourney-tab-icon--info" src="assets/tournament-info-icon.svg" alt="" aria-hidden="true" decoding="async">
                </button>
                <button class="tourney-tab-btn ${this.activeTab === 'bracket' ? 'active' : ''}" role="tab" aria-selected="${this.activeTab === 'bracket'}" aria-label="${tt('tourney_tab_bracket') || 'Kostur'}" title="${tt('tourney_tab_bracket') || 'Kostur'}" onclick="app.tournamentManager.switchTab('bracket')">
                    <img class="tourney-tab-icon tourney-tab-icon--tournament" src="assets/tournament-icon.svg" alt="" aria-hidden="true" decoding="async">
                </button>
                <button class="tourney-tab-btn ${this.activeTab === 'leaderboard' ? 'active' : ''}" role="tab" aria-selected="${this.activeTab === 'leaderboard'}" aria-label="${tt('tourney_tab_fame') || 'Slavni'}" title="${tt('tourney_tab_fame') || 'Slavni'}" onclick="app.tournamentManager.switchTab('leaderboard')">
                    <img class="tourney-tab-icon tourney-tab-icon--fame" src="assets/tournament-hall-icon.svg" alt="" aria-hidden="true" decoding="async">
                </button>
            </div>

            <div id="tourney-tab-content" class="tourney-tab-content"></div>
        `;

        const tabContent = document.getElementById('tourney-tab-content');

        if (this.activeTab === 'bracket') {
            tabContent.style.overflowY = 'hidden';
            tabContent.style.overflowX = 'hidden';
            this.renderBracket(tabContent);
        } else if (this.activeTab === 'info') {
            tabContent.style.overflowY = 'auto';
            this.renderRegistration(tabContent);
        } else if (this.activeTab === 'leaderboard') {
            tabContent.style.overflowY = 'auto';
            tabContent.innerHTML = this.getLeaderboardHTML();
        }
    }

    getLeaderboardHTML() {
        let leaderboardHtml = `
            <div style="width: 100%; max-width: 350px; display: flex; flex-direction: column; align-items: center; padding-bottom: 20px;">
                <div class="tourney-icon-large" style="font-size: 3.5rem; margin-bottom: 15px; text-shadow: 0 0 15px var(--gold-main); text-align: center;">👑</div>
                <h3 style="color: var(--gold-main); text-align: center; margin-bottom: 20px; border-bottom: 2px solid rgba(255,215,0,0.3); padding-bottom: 10px; text-transform: uppercase; font-size: 1.2rem; letter-spacing: 2px; width: 100%;">
                    ${tt('tourney_hall_of_fame') || 'DVORANA SLAVNIH'}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
        `;

        if (!this.tourneyLeaderboard || this.tourneyLeaderboard.length === 0) {
            leaderboardHtml += `<div style="text-align:center; color:var(--text-muted); font-size:1rem; padding: 40px 0;">${tt('tourney_no_champs_yet') || 'Još uvek nema osvajača turnira.'}</div>`;
        } else {
            this.tourneyLeaderboard.forEach((player, idx) => {
                let rankTrophy = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `<span style="color: var(--text-muted); font-size: 1.1rem; font-weight: bold;">${idx+1}.</span>`));
                let photo = this.playerPhotoUrl({ ...player, name: player.playerName });
                let safePlayerName = this.escape(player.playerName || 'Igrač');
                let safeWins = Number.isFinite(Number(player.wins)) ? Math.max(0, Math.floor(Number(player.wins))) : 0;

                let bg = idx === 0 ? 'background: linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0.4) 100%); border: 1px solid var(--gold-main);' : 'background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);';
                let nameColor = idx === 0 ? 'var(--gold-main)' : 'white';
                let nameSize = idx === 0 ? '1.1rem' : '1rem';

                leaderboardHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; ${bg} padding: 10px 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 15px; overflow: hidden; flex: 1;">
                            <div style="font-size: 1.4rem; min-width: 30px; text-align: center; flex-shrink: 0;">${rankTrophy}</div>
                            <img src="${photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${idx === 0 ? 'var(--gold-main)' : 'rgba(255,255,255,0.3)'}; flex-shrink: 0; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
                            <span style="color: ${nameColor}; font-weight: 800; font-size: ${nameSize}; white-space: normal; word-break: break-word; line-height: 1.2;">${safePlayerName}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 20px; border: 1px solid rgba(255,215,0,0.3);">
                            <span style="color: var(--gold-main); font-weight: 900; font-size: 1.1rem; flex-shrink: 0;">${safeWins}</span>
                            <span style="font-size: 1rem;">🏆</span>
                        </div>
                    </div>
                `;
            });
        }
        leaderboardHtml += `</div></div>`;
        return leaderboardHtml;
    }

    renderRegistration(container) {
        const myId = this.app.playerId;
        const isRegistered = this.state.players.some(p => p.id === myId);
        const isRegistrationOpen = this.state.status === 'registration';
        const spotsLeft = 8 - this.state.players.length;

        let buttonHtml = '';
        if (!isRegistrationOpen) {
            const labelPrimary = isRegistered
                ? (tt('tourney_reg_active_title') || 'Prijavljeni ste')
                : (tt('tourney_reg_started') || 'Turnir je već počeo');
            const labelSecondary = isRegistered ? (tt('tourney_reg_active_subtitle') || 'Turnir u toku') : '';
            buttonHtml = `
                <button class="btn-menu btn-secondary tourney-action-button tourney-action-button--locked" disabled>
                    <span class="tourney-action-icon" aria-hidden="true">🏁</span>
                    <span class="tourney-action-label">
                        <span class="tourney-action-primary">${labelPrimary}</span>
                        ${labelSecondary ? `<span class="tourney-action-secondary">${labelSecondary}</span>` : ''}
                    </span>
                </button>
            `;
        } else if (isRegistered) {
            const disabledAttr = this.pendingUnregister ? 'disabled' : '';
            const labelPrimary = this.pendingUnregister
                ? (tt('tourney_unregistering') || 'Odjava u toku...')
                : (tt('tourney_unregister') || 'ODJAVI SE');
            const labelSecondary = this.pendingUnregister ? '' : (tt('tourney_refund') || 'Povraćaj');
            buttonHtml = `
                <button class="btn-menu btn-secondary tourney-action-button tourney-action-button--unregister" ${disabledAttr} onclick="app.tournamentManager.unregisterPlayer()">
                    <span class="tourney-action-icon" aria-hidden="true">${this.pendingUnregister ? '⏳' : '↩️'}</span>
                    <span class="tourney-action-label">
                        <span class="tourney-action-primary">${labelPrimary}</span>
                        ${labelSecondary ? `<span class="tourney-action-secondary">${labelSecondary}</span>` : ''}
                    </span>
                </button>
            `;
        } else {
            const disabledAttr = this.pendingRegistration ? 'disabled' : '';
            const labelPrimary = this.pendingRegistration
                ? (tt('tourney_registering') || 'Prijava u toku...')
                : (tt('tourney_register_me') || 'PRIJAVI SE');
            const labelSecondary = this.pendingRegistration ? '' : `${TOURNEY_ENTRY_FEE} ${dukatIconHtml()}`;
            buttonHtml = `
                <button class="btn-menu btn-primary tourney-action-button tourney-action-button--register" ${disabledAttr} onclick="app.tournamentManager.registerPlayer()">
                    <span class="tourney-action-icon" aria-hidden="true">${this.pendingRegistration ? '⏳' : '🎟️'}</span>
                    <span class="tourney-action-label">
                        <span class="tourney-action-primary">${labelPrimary}</span>
                        ${labelSecondary ? `<span class="tourney-action-secondary">${labelSecondary}</span>` : ''}
                    </span>
                </button>
            `;
        }

        container.innerHTML = `
            <div class="tourney-registration-panel">
                <div class="tourney-icon-large tourney-registration-icon">🏆</div>
                <h3 class="tourney-registration-title">${tt('tourney_weekly') || 'Nedeljni Turnir'}</h3>
                <p class="tourney-registration-desc">${tt('tourney_desc') || 'Prijavite se za nedeljni turnir! 8 igrača se bori za prestiž i veliku nagradu.'}</p>

                <div class="tourney-register-status">
                    <span class="tourney-register-label">${tt('tourney_registered') || 'Prijavljeno igrača'}</span>
                    <div class="tourney-register-count" style="color: ${isRegistrationOpen && spotsLeft === 0 ? 'var(--danger)' : 'var(--success)'};">
                        ${this.state.players.length}<span>/8</span>
                    </div>
                    <div class="tourney-register-dots" aria-hidden="true">
                        ${Array.from({ length: 8 }, (_, i) => `<span class="${i < this.state.players.length ? 'filled' : ''}"></span>`).join('')}
                    </div>
                </div>

                <div class="tourney-register-action">
                    ${buttonHtml}
                </div>
            </div>
        `;
    }

    registerPlayer() {
        this.app.soundMgr.click();
        if (this.pendingRegistration) return;

        if (this.state.status !== 'registration' || this.state.players.length >= 8) {
            this.app.modal.alert(tt('msg_room_full') || "Turnir je popunjen ili je već počeo!");
            return;
        }

        const fee = TOURNEY_ENTRY_FEE;
        let currentBalance = parseInt(localStorage.getItem('yamb_dukati')) || 0;

        if (currentBalance < fee) {
            if(this.app.soundMgr.error) this.app.soundMgr.error();
            this.app.modal.alert(
                tt('tourney_not_enough_money') || `Nemate dovoljno dukata za prijavu!\nCena prijave je ${fee} ${dukatIconHtml()}.`,
                tt('warning_title') || "UPOZORENJE"
            );
            return;
        }

        const confirmMsg = tt('tourney_confirm_fee') || `Prijava za turnir košta ${fee} ${dukatIconHtml()}.\nDa li želite da se prijavite?`;

        this.app.modal.confirm(confirmMsg).then(potvrda => {
            if (potvrda) {
                if (!this.app.socket || !this.app.socket.connected) {
                    this.app.modal.alert(tt('sys_no_conn') || "Niste povezani na server.", tt('err_title') || "GREŠKA");
                    return;
                }

                this.pendingRegistration = true;
                this.render();

                let myPi = this.calculateMyPI();
                const playerData = {
                    id: this.app.playerId,
                    name: this.app.playerName,
                    photoUrl: localStorage.getItem('yamb_player_photo') || '',
                    pi: myPi
                };
                this.app.socket.emit('tourney_register', playerData);
            }
        });
    }

    async unregisterPlayer() {
        this.app.soundMgr.click();
        if (this.pendingUnregister) return;

        if (this.state.status !== 'registration') {
            this.app.modal.alert(tt('tourney_cannot_unregister') || "Turnir je već počeo, odjava više nije moguća!");
            return;
        }

        const confirmMsg = tt('tourney_confirm_unregister') || "Da li ste sigurni da želite da se odjavite sa turnira?\nPrikazaće se reklama pre povraćaja dukata.";
        const potvrda = await this.app.modal.confirm(confirmMsg);

        if (potvrda) {
            if (!this.app.socket || !this.app.socket.connected) {
                this.app.modal.alert(tt('sys_no_conn') || "Niste povezani na server.", tt('err_title') || "GREŠKA");
                return;
            }

            if (window.adMobGlobal && window.adMobGlobal.showInterstitial) {
                await window.adMobGlobal.showInterstitial();
            }

            this.pendingUnregister = true;
            this.render();
            this.app.socket.emit('tourney_unregister');
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
        const atStr = lang === 'en' ? 'at' : 'u';
        return d.toLocaleDateString(locale) + ` ${atStr} ` + d.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'});
    }

    normalizeMatchScore(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return null;
        return Math.max(0, Math.floor(num));
    }

    isTechnicalMatchResult(match) {
        return Boolean(match && (match.resultType === 'technical' || match.technicalWinReason));
    }

    getMatchResultLabel(match) {
        if (!match || !match.winnerId) return '';
        if (match.scoreLabel) return this.escape(match.scoreLabel);

        const p1Score = this.normalizeMatchScore(match.p1Score);
        const p2Score = this.normalizeMatchScore(match.p2Score);
        if (p1Score !== null && p2Score !== null) {
            return this.escape(`${p1Score}-${p2Score}${this.isTechnicalMatchResult(match) ? ' TP' : ''}`);
        }

        if (this.isTechnicalMatchResult(match) && match.p1 && match.p2) {
            const winnerIsP1 = match.winnerId === match.p1.id;
            return winnerIsP1 ? '1-0 TP' : '0-1 TP';
        }

        return '';
    }

    getTechnicalReasonLabel(reason) {
        switch (String(reason || 'technical')) {
            case 'back_to_menu':
                return this.tr('tourney_technical_quit', 'napuštanje');
            case 'turn_timeout':
                return this.tr('tourney_technical_timeout', 'istek vremena');
            case 'disconnect_grace_expired':
                return this.tr('tourney_technical_disconnect', 'prekid veze');
            default:
                return this.tr('tourney_technical_default', 'tehnički');
        }
    }

    updateTourneyPagination() {
        const carousel = document.getElementById('tourney-carousel');
        if(!carousel) return;
        const scrollLeft = carousel.scrollLeft;
        const width = carousel.clientWidth;
        const activeIndex = Math.round(scrollLeft / width);

        for (let i = 0; i <= 2; i++) {
            const dot = document.getElementById('tdot-' + i);
            if (dot) {
                if (i === activeIndex) dot.classList.add('active');
                else dot.classList.remove('active');
            }
        }
    }

    renderBracket(container) {
        let qf = this.state.bracket.qf || [];
        let sf = this.state.bracket.sf || [];
        let f = this.state.bracket.f || [];

        if (this.state.status === 'registration') {
            const serverQf = Array.isArray(this.state.bracket && this.state.bracket.qf) ? this.state.bracket.qf : [];
            const hasServerBracketPreview = serverQf.some(match => match && (match.p1 || match.p2));

            qf = hasServerBracketPreview
                ? Array(4).fill(null).map((_, i) => {
                    const match = serverQf[i];
                    if (!match || (!match.p1 && !match.p2)) return null;
                    return { p1: match.p1 || null, p2: match.p2 || null };
                })
                : Array(4).fill(null).map((_, i) => {
                    const p1 = this.state.players[i*2] || null;
                    const p2 = this.state.players[i*2+1] || null;
                    if (!p1 && !p2) return null;
                    return { p1: p1 || null, p2: p2 || null };
                });
        }

        if (qf.length === 0) qf = Array(4).fill(null);
        if (sf.length === 0) sf = Array(2).fill(null);
        if (f.length === 0) f = Array(1).fill(null);

        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                <div class="tourney-carousel" id="tourney-carousel" onscroll="app.tournamentManager.updateTourneyPagination()">

                    <div class="tourney-page">
                        <div class="tourney-card">
                            <h3 style="color:var(--gold-main); text-align:center; margin-bottom: 15px; font-size: 1.1rem; letter-spacing: 1px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 8px;">
                                ${tt('tourney_qf') || '1/4 FINALA'}
                            </h3>
                            <div style="display: flex; flex-direction: column; justify-content: space-around; flex: 1; gap: 10px;">
                                ${qf.map((m, i) => this.createMatchHTML(m, 'qf', i)).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="tourney-page">
                        <div class="tourney-card">
                            <h3 style="color:var(--gold-main); text-align:center; margin-bottom: 15px; font-size: 1.1rem; letter-spacing: 1px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 8px;">
                                ${tt('tourney_sf') || 'POLUFINALE'}
                            </h3>
                            <div style="display: flex; flex-direction: column; justify-content: space-around; flex: 1; gap: 10px;">
                                ${sf.map((m, i) => this.createMatchHTML(m, 'sf', i)).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="tourney-page">
                        <div class="tourney-card">
                            <h3 style="color:var(--gold-main); text-align:center; margin-bottom: 15px; font-size: 1.1rem; letter-spacing: 1px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 8px;">
                                ${tt('tourney_f') || 'FINALE'}
                            </h3>
                            <div style="display: flex; flex-direction: column; justify-content: space-around; flex: 1; gap: 10px;">
                                ${f.map((m, i) => this.createMatchHTML(m, 'f', i)).join('')}
                            </div>
                        </div>
                    </div>

                </div>

                <div class="tourney-pagination">
                    <div class="dot active" id="tdot-0"></div>
                    <div class="dot" id="tdot-1"></div>
                    <div class="dot" id="tdot-2"></div>
                </div>
            </div>

            <style>
                .tourney-carousel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; width: 100%; flex: 1; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 5px; }
                .tourney-carousel::-webkit-scrollbar { display: none; }
                .tourney-page { flex: 0 0 100%; width: 100%; scroll-snap-align: center; padding: 0 15px; display: flex; flex-direction: column; }
                .tourney-card { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
                .tourney-card::-webkit-scrollbar { width: 4px; }
                .tourney-card::-webkit-scrollbar-thumb { background: var(--gold-main); border-radius: 10px; }

                .tourney-pagination { display: flex; gap: 12px; justify-content: center; margin-top: 15px; margin-bottom: 15px; flex-shrink: 0; }
                .tourney-pagination .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--carousel-dot-idle); transition: all 0.3s ease; box-shadow: inset 0 0 3px rgba(0,0,0,0.5); }
                .tourney-pagination .dot.active { background: var(--carousel-dot-active); transform: scale(1.4); box-shadow: 0 0 10px var(--carousel-dot-glow); }
            </style>
        `;
    }

    createMatchHTML(match, round, index) {
        if (!match || (!match.p1 && !match.p2)) {
            return `
                <div style="width: 100%; background: rgba(0,0,0,0.4); border: 1px dashed rgba(255,215,0,0.3); border-radius: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px; box-sizing: border-box; min-height: 65px;">
                    <span style="color: rgba(255,255,255,0.3); font-size: 0.8rem; font-weight: bold;">---</span>
                </div>`;
        }

        const myId = this.app.playerId;
        const isMyMatch = (match.p1 && match.p1.id === myId) || (match.p2 && match.p2.id === myId);

        const getPlayerHtml = (p, isTop) => {
            if (!p) {
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; ${isTop ? 'border-bottom: 1px solid rgba(255,215,0,0.1);' : ''}">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.1); margin-right: 8px; flex-shrink: 0;"></div>
                            <span style="color: rgba(255,255,255,0.3); font-size: 0.8rem;">---</span>
                        </div>
                    </div>`;
            }

            let photo = this.playerPhotoUrl(p);
            let safeName = this.escape(p.name || 'Igrač');
            let isWinner = match.winnerId === p.id;
            let isLoser = match.winnerId && match.winnerId !== p.id;

            let opacity = isLoser ? '0.4' : '1';
            let filter = isLoser ? 'grayscale(100%)' : 'none';
            let nameColor = isWinner ? 'var(--success)' : 'var(--text-main)';
            let fontWeight = isWinner ? '900' : '600';

            let powerIndex = p.pi || p.powerIndex;
            if (powerIndex === undefined || powerIndex === null || powerIndex === '') {
                powerIndex = '?';
            }
            powerIndex = this.escape(powerIndex);

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; ${isTop ? 'border-bottom: 1px solid rgba(255,215,0,0.1);' : ''} opacity: ${opacity}; filter: ${filter};">
                    <div style="display: flex; align-items: center; overflow: hidden; padding-right: 5px;">
                        <img src="${photo}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid ${isWinner ? 'var(--success)' : 'rgba(255,215,0,0.4)'}; margin-right: 8px; flex-shrink: 0; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
                        <span style="font-size: 0.8rem; font-weight: ${fontWeight}; color: ${nameColor}; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${safeName}</span>
                    </div>
                    <span style="font-size: 0.65rem; color: var(--gold-main); font-weight: 900; flex-shrink: 0; text-shadow: 0 0 5px rgba(255,215,0,0.3);">⚡ ${powerIndex}</span>
                </div>
            `;
        };

        let statusDot = '';
        if (match.timeAccepted && match.time) {
            statusDot = `<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success);"></div>`;
        } else if (match.proposedTime) {
            statusDot = `<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: #ff9800; border-radius: 50%; box-shadow: 0 0 8px #ff9800;"></div>`;
        }

        const resultLabel = this.getMatchResultLabel(match);
        const resultHtml = resultLabel
            ? `<div style="text-align: center; padding: 3px 8px; font-size: 0.72rem; font-weight: 900; color: var(--gold-main); background: rgba(255,215,0,0.07); border-bottom: 1px solid rgba(255,215,0,0.12); text-shadow: 0 0 5px rgba(255,215,0,0.25);">${resultLabel}</div>`
            : '';
        const cardMinHeight = resultLabel ? '82px' : '65px';

        return `
            <div onclick="app.tournamentManager.openMatchModal('${round}', ${index})" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid ${isMyMatch ? 'var(--gold-main)' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; display: flex; flex-direction: column; cursor: pointer; position: relative; box-shadow: ${isMyMatch ? '0 0 10px rgba(255,215,0,0.3)' : 'none'}; transition: transform 0.1s; transform: scale(0.98); min-height: ${cardMinHeight}; overflow: hidden;">
                ${statusDot}
                ${getPlayerHtml(match.p1, true)}
                ${resultHtml}
                ${getPlayerHtml(match.p2, false)}
            </div>
        `;
    }

    openMatchModal(round, index) {
        const match = this.state.bracket[round][index];
        if (!match || !match.p1 || !match.p2) return;

        const myId = this.app.playerId;
        const isMyMatch = match.p1.id === myId || match.p2.id === myId;
        let akcijeHtml = '';

        if (match.winnerId) {
            const winnerName = this.escape(match.winnerId === match.p1.id ? match.p1.name : match.p2.name);
            const resultLabel = this.getMatchResultLabel(match);
            const technicalReason = this.isTechnicalMatchResult(match)
                ? this.escape(this.getTechnicalReasonLabel(match.technicalWinReason))
                : '';
            const resultHtml = resultLabel
                ? `<div style="margin-top: 8px; color: var(--text-main); font-size: 0.95rem;">${this.tr('tourney_result', 'Rezultat')}: <strong style="color: var(--gold-main);">${resultLabel}</strong>${technicalReason ? ` <span style="color: var(--text-muted); font-size: 0.82rem;">(${technicalReason})</span>` : ''}</div>`
                : '';
            akcijeHtml = `<div style="color: var(--success); font-size: 1.1rem; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">${tt('tourney_winner') || 'Pobednik:'} <strong style="text-transform: uppercase;">${winnerName}</strong> 🏆${resultHtml}</div>`;
        }
        else if (isMyMatch) {
            if (match.timeAccepted) {
                akcijeHtml = `
                    <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--success);">
                        <p style="color: var(--success); font-weight: bold; margin-bottom: 5px;">${tt('tourney_time_agreed') || 'Vreme meča je dogovoreno!'}</p>
                        <p style="font-size: 1.1rem;">${this.formatDate(match.time)}</p>
                    </div>
                    <button class="btn-menu btn-primary" style="width: 100%; font-size: 1.1rem; padding: 15px;" onclick="app.tournamentManager.startDuel('${round}', ${index})">▶ ${tt('tourney_start_match') || 'POKRENI MEČ'}</button>
                `;
            }
            else if (match.proposedTime) {
                if (match.proposedById === myId) {
                    akcijeHtml = `
                        <div style="background: rgba(255, 152, 0, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #ff9800;">
                            <p style="color: #ff9800; font-weight: bold; margin-bottom: 5px;">${tt('tourney_waiting_opp_response') || 'Čeka se odgovor protivnika'}</p>
                            <p style="font-size: 0.9rem; color: var(--text-main);">${tt('tourney_you_proposed') || 'Predložili ste:'} <strong>${this.formatDate(match.proposedTime)}</strong></p>
                        </div>
                        <div style="text-align: left; margin-bottom: 10px;">
                            <label style="font-size: 0.75rem; color: var(--text-muted);">${tt('tourney_want_to_change_time') || 'Želite da promenite termin?'}</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                        <button class="btn-menu btn-secondary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_change_proposal') || 'Promeni predlog'}</button>
                    `;
                } else {
                    akcijeHtml = `
                        <div style="background: rgba(33, 150, 243, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2196F3;">
                            <p style="color: #2196F3; font-weight: bold; margin-bottom: 5px;">${tt('tourney_opp_proposes_time') || 'Protivnik predlaže vreme:'}</p>
                            <p style="font-size: 1.1rem; color: var(--text-main); font-weight: bold;">${this.formatDate(match.proposedTime)}</p>
                        </div>
                        <button class="btn-menu" style="width: 100%; background: var(--success); color: white; border: none; margin-bottom: 15px; padding: 15px; box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);" onclick="app.tournamentManager.acceptTime('${round}', ${index})">✅ ${tt('tourney_accept_time') || 'PRIHVATI TERMIN'}</button>

                        <hr style="border: 0; border-top: 1px dashed rgba(255,255,255,0.1); margin: 15px 0;">

                        <div style="text-align: left; margin-bottom: 10px;">
                            <label style="font-size: 0.75rem; color: var(--text-muted);">${tt('tourney_not_suit_q') || 'Ne odgovara Vam? Predložite drugo vreme:'}</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                        <button class="btn-menu btn-secondary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_propose_new_time') || 'Predloži novo vreme'}</button>
                    `;
                }
            }
            else {
                akcijeHtml = `
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--glass-border);">
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">${tt('tourney_time_not_scheduled') || 'Vreme odigravanja meča još uvek nije zakazano.'}</p>
                        <div style="text-align: left;">
                            <label style="font-size: 0.75rem; color: var(--gold-main); font-weight: bold; letter-spacing: 1px;">${tt('tourney_choose_time_match') || 'Izaberite termin za meč:'}</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                    </div>
                    <button class="btn-menu btn-primary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_schedule_match') || 'Zakaži meč'}</button>
                `;
            }
        }
        else {
            akcijeHtml = `<p style="color: var(--text-muted); font-size:0.85rem; padding: 20px 0; background: rgba(0,0,0,0.2); border-radius: 8px;">${tt('tourney_not_your_match') || 'Ovo nije Vaš meč. Čekamo ishod ovog duela.'}</p>`;
        }

        const titleFallback = tt('tourney_match_title') || 'TURNIRSKI MEČ';
        const p1Name = this.escape(match.p1.name || 'Igrač');
        const p2Name = this.escape(match.p2.name || 'Igrač');

        this.app.modal.alert(`
            <div style="text-align:center;">
                <h3 style="color:var(--gold-main); margin-bottom: 5px; font-size: 1.4rem;">${p1Name} <span style="color:var(--text-muted); font-size:0.9rem;">VS</span> ${p2Name}</h3>
                <hr style="border: 0; border-top: 1px solid rgba(255,215,0,0.2); margin: 15px 0;">
                ${akcijeHtml}
            </div>
        `, titleFallback + ' ⚔️');
    }

    proposeTime(round, index) {
        const input = document.getElementById('tourney-time-input');
        if (!input || !input.value) {
            this.app.modal.alert(tt('tourney_alert_select_time') || "Molimo Vas da prvo izaberete vreme u kalendaru!", tt('tourney_alert_warning') || "UPOZORENJE");
            return;
        }

        this.app.soundMgr.click();

        if (this.app.socket) {
            this.app.socket.emit('tourney_propose_time', {
                round: round,
                index: index,
                proposedTime: input.value,
                playerId: this.app.playerId
            });
        }

        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }

    acceptTime(round, index) {
        this.app.soundMgr.click();

        if (this.app.socket) {
            this.app.socket.emit('tourney_accept_time', { round, index });
        }

        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }

    startDuel(round, index) {
        const match = this.state.bracket[round][index];
        const myId = this.app.playerId;
        const opponent = match.p1.id === myId ? match.p2 : match.p1;

        this.app.soundMgr.click();

        if (this.app.socket) {
            this.app.socket.emit('tourney_start_duel', {
                round,
                index,
                targetId: opponent.id,
                opponentName: opponent.name
            });
        }

        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }
}
