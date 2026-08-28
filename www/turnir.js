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
            tournamentNumber: 1,
            players: [],
            bracket: { qf: [], sf: [], f: [] },
            finishedAt: null,
            resetAt: null
        };

        this.tourneyLeaderboard = [];
        this.tourneyLeaderboardLoaded = false;

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

    isTournamentSchedulingUnlocked() {
        return this.state.status === 'active' && Array.isArray(this.state.players) && this.state.players.length === 8;
    }

    showSchedulingLockedMessage() {
        if (this.app && this.app.modal) {
            this.app.modal.alert(
                tt('tourney_schedule_locked_until_full') || 'Termini za zakazivanje otključavaju se kada se prijavi svih 8 igrača.',
                tt('tourney_alert_warning') || 'UPOZORENJE'
            );
        }
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
            leaguePts = typeof window.powerIndexCore.calculateLeaguePowerPoints === 'function'
                ? window.powerIndexCore.calculateLeaguePowerPoints(ls)
                : ((parseInt(ls.baselineScore, 10) || 0) + (parseInt(ls.quarterlyScore, 10) || 0));
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
                    else if (oldStatus !== 'registration' && newState.status === 'registration') {
                        this.activeTab = 'info';
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
                    this.tourneyLeaderboard = Array.isArray(data) ? data : [];
                    this.tourneyLeaderboardLoaded = true;
                    this.renderEasterIntroChampions();
                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                const showTourneyDuelNotice = (message, title = tt('tourney_match_title') || 'TURNIRSKI MEČ') => {
                    if (typeof window.showNotification === 'function') {
                        window.showNotification(title, message);
                    } else if (this.app && this.app.modal) {
                        this.app.modal.alert(message, title);
                    }
                };

                this.app.socket.off('tourney_duel_ready');
                this.app.socket.off('tourney_duel_pending');
                this.app.socket.off('tourney_duel_declined');
                this.app.socket.off('tourney_duel_busy');
                this.app.socket.off('tourney_duel_expired');
                this.app.socket.off('tourney_join_allowed');

                this.app.socket.on('tourney_duel_ready', (data) => {
                    const myId = this.app.playerId;
                    if (data.targetId === myId) {
                        const sendResponse = (payload = {}) => {
                            if (!this.app.socket || !this.app.socket.connected) return;
                            this.app.socket.emit('tourney_duel_response', {
                                matchRoomId: data.matchRoomId,
                                ...payload
                            });
                        };

                        if (this.app.isDoNotDisturbActive && this.app.isDoNotDisturbActive()) {
                            sendResponse({ accepted: false, busy: true });
                            return;
                        }

                        const opponentName = this.escape(data.opponentName || 'Protivnik');
                        let msg = tt('tourney_opponent_ready');
                        if (msg !== 'tourney_opponent_ready') {
                            msg = msg.replace('{0}', opponentName);
                        } else {
                            msg = `${opponentName} je pokrenuo vaš turnirski meč. Da li ulazite?`;
                        }

                        this.app.modal.confirm(msg).then(acc => {
                            if (acc && data.expiresAt && Date.now() > data.expiresAt) {
                                showTourneyDuelNotice(tt('room_invite_expired_self') || 'Istekao je rok za odgovor na pozivnicu.');
                                sendResponse({ accepted: false });
                                return;
                            }
                            sendResponse({ accepted: !!acc });
                        });
                    }
                });

                this.app.socket.on('tourney_duel_pending', (data = {}) => {
                    const opponentName = this.escape(data.opponentName || tt('player_guest') || 'Igrač');
                    const msg = (tt('tourney_duel_pending_notice') || 'Poziv za turnirski meč je poslat igraču {0}. Čekamo odgovor...').replace('{0}', opponentName);
                    showTourneyDuelNotice(msg);
                });

                this.app.socket.on('tourney_duel_declined', (data = {}) => {
                    const opponentName = this.escape(data.opponentName || tt('player_guest') || 'Igrač');
                    const msg = (tt('tourney_duel_declined_notice') || '{0} je odbio turnirski meč. Dogovorite novi trenutak i pokušajte ponovo.').replace('{0}', opponentName);
                    showTourneyDuelNotice(msg);
                });

                this.app.socket.on('tourney_duel_busy', (data = {}) => {
                    const opponentName = this.escape(data.opponentName || tt('player_guest') || 'Igrač');
                    const msg = (tt('tourney_duel_busy_notice') || '{0} je trenutno zauzet. Pokušajte ponovo kasnije.').replace('{0}', opponentName);
                    showTourneyDuelNotice(msg);
                });

                this.app.socket.on('tourney_duel_expired', (data = {}) => {
                    if (data.silent) return;
                    const opponentName = this.escape(data.opponentName || tt('player_guest') || 'Igrač');
                    const msg = (tt('tourney_duel_expired_notice') || '{0} nije odgovorio na vreme. Meč nije pokrenut.').replace('{0}', opponentName);
                    showTourneyDuelNotice(msg);
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
        const isSoftClayIntro = overlay.classList.contains('theme-easter')
            || overlay.classList.contains('theme-desert')
            || overlay.classList.contains('theme-severna');

        if (isSoftClayIntro) {
            this.setEasterIntroTitle(title, this.tr('tourney_intro_title', 'TURNIR'));
            this.renderEasterIntroChampions();
            this.requestTournamentStats();
            setTimeout(() => {
                if (this.isIntroPlaying && !this.tourneyLeaderboardLoaded) {
                    this.requestTournamentStats();
                }
            }, 1200);
        } else {
            this.setIntroTitle(title);
        }
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

    setEasterIntroTitle(container, label) {
        if (!container) return;
        container.textContent = '';
        Array.from(String(label || '').toUpperCase()).forEach((character, index) => {
            const span = document.createElement('span');
            span.className = character === ' '
                ? 'easter-room-intro-wave-space'
                : 'easter-room-intro-wave-letter';
            span.style.setProperty('--wave-index', index);
            span.textContent = character === ' ' ? '\u00a0' : character;
            container.appendChild(span);
        });
    }

    requestTournamentStats() {
        if (this.app?.socket?.connected) {
            this.app.socket.emit('get_tourney_stats');
            return;
        }

        if (this.app && typeof this.app.initSocketConnection === 'function') {
            this.app.initSocketConnection();
            setTimeout(() => {
                if (this.app?.socket?.connected) {
                    this.app.socket.emit('get_tourney_stats');
                }
            }, 500);
        }
    }

    renderEasterIntroChampions() {
        const overlay = document.getElementById('tournament-intro');
        const container = overlay?.querySelector('.tournament-intro-champions');
        if (!container || (
            !overlay.classList.contains('theme-easter')
            && !overlay.classList.contains('theme-desert')
            && !overlay.classList.contains('theme-severna')
        )) return;

        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const isEnglish = lang === 'en' || lang === 'en-GB';
        const safeLabel = this.escape(isEnglish ? 'MOST TOURNAMENT WINS' : 'NAJVIŠE OSVOJENIH TURNIRA');

        if (!this.tourneyLeaderboardLoaded) {
            container.innerHTML = `
                <div class="tournament-intro-champions-label">${safeLabel}</div>
                <div class="tournament-intro-champions-state">${this.escape(isEnglish ? 'Loading results…' : 'Učitavanje rezultata…')}</div>
            `;
            return;
        }

        const champions = [...this.tourneyLeaderboard]
            .sort((a, b) => Number(b?.wins || 0) - Number(a?.wins || 0))
            .slice(0, 3);

        if (champions.length === 0) {
            container.innerHTML = `
                <div class="tournament-intro-champions-label">${safeLabel}</div>
                <div class="tournament-intro-champions-state">${this.escape(isEnglish ? 'No tournament winners yet.' : 'Još nema osvajača turnira.')}</div>
            `;
            return;
        }

        const winsLabel = isEnglish ? 'tournament wins' : 'osvojenih turnira';
        container.innerHTML = `
            <div class="tournament-intro-champions-label">${safeLabel}</div>
            <div class="tournament-intro-champions-list">
                ${champions.map((player, index) => {
                    const name = String(player?.playerName || player?.name || this.tr('player_guest', 'Igrač'));
                    const safeName = this.escape(name);
                    const photo = this.playerPhotoUrl({ ...player, name });
                    const wins = Number.isFinite(Number(player?.wins))
                        ? Math.max(0, Math.floor(Number(player.wins)))
                        : 0;
                    return `
                        <div class="tournament-intro-champion-row">
                            <span class="tournament-intro-champion-rank" aria-hidden="true">${index + 1}</span>
                            <img class="tournament-intro-champion-avatar" src="${photo}" alt="" aria-hidden="true" decoding="async">
                            <span class="tournament-intro-champion-name">${safeName}</span>
                            <span class="tournament-intro-champion-wins" aria-label="${this.escapeAttr(`${wins} ${winsLabel}`)}">
                                <img class="tournament-intro-wins-icon-default" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                                <img class="tournament-intro-wins-icon-easter" src="assets/easter-soft-clay/tournament-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                                <img class="tournament-intro-wins-icon-desert" src="assets/desert-soft-clay/tournament-pro.png?v=4" alt="" aria-hidden="true" decoding="async">
                                <img class="tournament-intro-wins-icon-nebula" src="assets/severna-soft-clay/tournament-pro-v7.png?v=1" alt="" aria-hidden="true" decoding="async">
                                <strong>${wins}</strong>
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
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
            <div class="tourney-tabs" role="tablist" aria-label="${tt('tourney_tabs_aria') || 'Sekcije turnira'}">
                <button class="tourney-tab-btn ${this.activeTab === 'info' ? 'active' : ''}" role="tab" aria-selected="${this.activeTab === 'info'}" aria-label="${tt('tourney_tab_info') || 'Info'}" title="${tt('tourney_tab_info') || 'Info'}" onclick="app.tournamentManager.switchTab('info')">
                    <img class="tourney-tab-icon tourney-tab-icon--info tourney-tab-icon-default" src="assets/tournament-info-icon.svg" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-soft-clay-icon" src="assets/easter-soft-clay/tournament/tab-info.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-desert-soft-clay-icon" src="assets/desert-soft-clay/tournament/tab-info.png?v=3" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-nebula-soft-clay-icon" src="assets/severna-soft-clay/tournament/tab-info-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                </button>
                <button class="tourney-tab-btn ${this.activeTab === 'bracket' ? 'active' : ''}" role="tab" aria-selected="${this.activeTab === 'bracket'}" aria-label="${tt('tourney_tab_bracket') || 'Kostur'}" title="${tt('tourney_tab_bracket') || 'Kostur'}" onclick="app.tournamentManager.switchTab('bracket')">
                    <img class="tourney-tab-icon tourney-tab-icon--tournament tourney-tab-icon-default" src="assets/tournament-icon.svg" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-soft-clay-icon" src="assets/easter-soft-clay/tournament/tab-bracket.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-desert-soft-clay-icon" src="assets/desert-soft-clay/tournament/tab-bracket.png?v=3" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-nebula-soft-clay-icon" src="assets/severna-soft-clay/tournament/tab-bracket-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                </button>
                <button class="tourney-tab-btn ${this.activeTab === 'leaderboard' ? 'active' : ''}" role="tab" aria-selected="${this.activeTab === 'leaderboard'}" aria-label="${tt('tourney_tab_fame') || 'Slavni'}" title="${tt('tourney_tab_fame') || 'Slavni'}" onclick="app.tournamentManager.switchTab('leaderboard')">
                    <img class="tourney-tab-icon tourney-tab-icon--fame tourney-tab-icon-default" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-soft-clay-icon" src="assets/easter-soft-clay/tournament/tab-hall-of-fame.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-desert-soft-clay-icon" src="assets/desert-soft-clay/tournament/tab-hall-of-fame.png?v=3" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-tab-nebula-soft-clay-icon" src="assets/severna-soft-clay/tournament/tab-hall-of-fame-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
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

    getLatestChampionship(player) {
        const championships = Array.isArray(player?.championships) ? player.championships : [];
        return this.getSavedChampionships(player)[0] || championships.find(item => item && typeof item === 'object') || null;
    }

    getSavedChampionships(player) {
        const championships = Array.isArray(player?.championships) ? player.championships : [];
        return championships.filter(item => item && typeof item === 'object' && item.bracket);
    }

    toRomanNumeral(value) {
        const num = Math.max(1, Math.min(3999, Math.floor(Number(value) || 1)));
        const table = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
            [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
        ];
        let remaining = num;
        let result = '';
        table.forEach(([arabic, roman]) => {
            while (remaining >= arabic) {
                result += roman;
                remaining -= arabic;
            }
        });
        return result;
    }

    getTournamentEditionLabel(player, idx) {
        const latest = this.getLatestChampionship(player);
        return this.getChampionshipEditionLabel(latest, idx + 1);
    }

    getChampionshipEditionLabel(championship, fallbackNumber = 1) {
        const number = Number.isFinite(Number(championship?.tournamentNumber))
            ? Math.max(1, Math.floor(Number(championship.tournamentNumber)))
            : Math.max(1, Math.floor(Number(fallbackNumber) || 1));
        return `${this.toRomanNumeral(number)} ${this.tr('tourney_edition_suffix', 'TURNIR')}`;
    }

    getChampionSharePayload(index) {
        const player = Array.isArray(this.tourneyLeaderboard) ? this.tourneyLeaderboard[index] : null;
        if (!player) return null;

        const championship = this.getLatestChampionship(player) || {};
        const name = String(championship.winnerName || player.playerName || tt('player_guest') || 'Igrač').trim();
        const wins = Number.isFinite(Number(player.wins)) ? Math.max(0, Math.floor(Number(player.wins))) : 0;
        const edition = this.getChampionshipEditionLabel(championship, index + 1);
        const finalScore = String(championship.scoreLabel || '-').trim();
        const runnerUpName = String(championship.runnerUpName || tt('tourney_finalist_title') || 'Finalista').trim();
        const wonAt = championship.wonAt ? this.formatDate(championship.wonAt) : '';
        const path = this.getChampionPathMatches(championship).map(step => {
            const opponent = this.getHistoryOpponent(step.match, championship.winnerId);
            return {
                round: this.getHistoryRoundLabel(step.round),
                opponent: opponent?.name || tt('player_guest') || 'Igrač',
                score: this.getMatchResultLabel(step.match) || '-',
                drawCount: Number(step.match?.drawCount || 0)
            };
        });

        return {
            name,
            wins,
            edition,
            finalScore,
            runnerUpName,
            wonAt,
            path
        };
    }

    async shareChampionCard(index) {
        const data = this.getChampionSharePayload(index);
        if (!data) return;

        const shareBtn = document.querySelector(`.tourney-champion-share-btn[data-champion-index="${index}"]`);
        const originalHtml = shareBtn ? shareBtn.innerHTML : '';
        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.innerHTML = `<span>${this.escape(tt('tourney_share_generating') || 'Priprema...')}</span>`;
        }

        try {
            const blob = await this.createChampionShareImage(data);
            const slug = this.slugifyShareName(data.name || 'champion');
            const filename = `yamb-turnir-${slug}.png`;
            const title = tt('tourney_share_title') || 'Yamb osvajač turnira';
            const text = (tt('tourney_share_text') || 'Moja Yamb kartica osvajača turnira: {0}.').replace('{0}', data.name || 'šampion');
            const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            const nativeShare = window.Capacitor?.Plugins?.H2HShare || window.Capacitor?.Plugins?.ShareImage;

            if (nativeShare && typeof nativeShare.shareImage === 'function') {
                const dataUrl = await this.blobToDataUrl(blob);
                await nativeShare.shareImage({
                    dataUrl,
                    filename,
                    title,
                    text,
                    dialogTitle: title
                });
                return;
            }

            if (isNativeApp) {
                await this.app.modal.alert(
                    tt('tourney_share_update_required') || 'Za deljenje slike potrebno je ažurirati aplikaciju na najnoviju verziju.',
                    title
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
                        console.log('Deljenje turnirske kartice nije uspelo:', err);
                    }
                }
            }

            this.downloadBlob(blob, filename);
            await this.app.modal.alert(
                tt('tourney_share_fallback') || 'Deljenje slike nije dostupno na ovom uređaju. PNG kartica je pripremljena za preuzimanje.',
                title
            );
        } catch (err) {
            console.warn('Nije moguće pripremiti turnirsku share karticu:', err);
            await this.app.modal.alert(
                tt('tourney_share_error') || 'Nije moguće pripremiti sliku za deljenje.',
                tt('err_title') || 'GREŠKA'
            );
        } finally {
            if (shareBtn) {
                shareBtn.disabled = false;
                shareBtn.innerHTML = originalHtml;
            }
        }
    }

    async createChampionShareImage(data) {
        const canvas = document.createElement('canvas');
        const width = 1080;
        const height = 1350;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas nije dostupan');

        const colors = {
            bgTop: '#16231D',
            bgMid: '#15100A',
            bgBottom: '#070A0E',
            card: 'rgba(18, 22, 28, 0.95)',
            line: 'rgba(224, 201, 149, 0.42)',
            text: '#F8EFD6',
            muted: '#B9AE92',
            gold: '#E0C995',
            green: '#4ADE80',
            dark: '#090D11'
        };
        const clean = (value) => String(value ?? '').replace(/<[^>]*>/g, '').trim();
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
        const fitText = (text, x, y, maxWidth, size, minSize, color, weight = 900, align = 'center') => {
            const cleanText = clean(text) || ' ';
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
            const parts = clean(name).split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
            return (parts[0] || '?').slice(0, 2).toUpperCase();
        };

        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, colors.bgTop);
        bg.addColorStop(0.52, colors.bgMid);
        bg.addColorStop(1, colors.bgBottom);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.arc(170, 150, 260, 0, Math.PI * 2);
        ctx.fillStyle = colors.gold;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(910, 1090, 330, 0, Math.PI * 2);
        ctx.fillStyle = colors.green;
        ctx.fill();
        ctx.globalAlpha = 1;

        fillRound(58, 58, width - 116, height - 116, 48, colors.card, colors.line, 3);
        fitText('YAMB OF THE BALKAN', width / 2, 145, 780, 34, 24, colors.gold, 900);
        fitText(clean(tt('tourney_hall_of_fame') || 'OSVAJAČI TURNIRA'), width / 2, 207, 820, 54, 34, colors.text, 900);

        fillRound(405, 255, 270, 270, 135, 'rgba(224,201,149,0.12)', colors.line, 5);
        fitText(initialsFor(data.name), width / 2, 415, 230, 82, 52, colors.gold, 900);
        fitText(data.edition, width / 2, 590, 520, 38, 24, colors.gold, 900);
        fitText(data.name, width / 2, 665, 780, 58, 34, colors.text, 900);

        fillRound(230, 725, 620, 108, 28, 'rgba(224,201,149,0.12)', 'rgba(224,201,149,0.24)', 2);
        fitText(clean(tt('tourney_champion_titles') || 'Osvojeni turniri'), 380, 770, 280, 28, 20, colors.muted, 800);
        fitText(`${data.wins || 0}`, 702, 790, 220, 72, 46, colors.gold, 900);

        const finalLabel = clean(this.getHistoryRoundLabel('f'));
        fitText(`${finalLabel}: ${data.finalScore || '-'}`, width / 2, 910, 760, 42, 28, colors.text, 900);
        fitText(`${clean(tt('tourney_finalist_title') || 'Finalista')}: ${data.runnerUpName || '-'}`, width / 2, 968, 760, 30, 22, colors.muted, 800);

        const rows = Array.isArray(data.path) && data.path.length ? data.path.slice(0, 3) : [];
        const startY = 1040;
        rows.forEach((step, index) => {
            const y = startY + (index * 78);
            fillRound(135, y, width - 270, 58, 18, index % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.075)', 1);
            fitText(step.round, 165, y + 38, 230, 24, 18, colors.gold, 900, 'left');
            fitText(step.opponent, width / 2, y + 38, 360, 24, 18, colors.text, 800);
            fitText(step.score, width - 165, y + 38, 160, 26, 18, colors.gold, 900, 'right');
        });

        if (data.wonAt) {
            fitText(data.wonAt, width / 2, 1300, 760, 26, 18, colors.muted, 800);
        }

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('PNG nije generisan'));
            }, 'image/png', 0.95);
        });
    }

    slugifyShareName(value) {
        return String(value || 'champion')
            .toLowerCase()
            .replace(/[^a-z0-9čćžšđ]+/gi, '-')
            .replace(/^-+|-+$/g, '') || 'champion';
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

    getLeaderboardHTML() {
        let leaderboardHtml = `
            <div class="tourney-champions-view">
                <img class="tourney-hof-trophy tourney-trophy-default" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                <img class="tourney-hof-trophy-easter" src="assets/easter-soft-clay/tournament-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="tourney-hof-trophy-desert" src="assets/desert-soft-clay/tournament-pro.png?v=4" alt="" aria-hidden="true" decoding="async">
                <img class="tourney-hof-trophy-nebula" src="assets/severna-soft-clay/tournament-pro-v7.png?v=1" alt="" aria-hidden="true" decoding="async">
                <h3 class="tourney-champions-title">
                    ${tt('tourney_hall_of_fame') || 'OSVAJAČI TURNIRA'}
                </h3>
                <div class="tourney-champions-list">
        `;

        if (!this.tourneyLeaderboard || this.tourneyLeaderboard.length === 0) {
            leaderboardHtml += `<div class="tourney-champions-empty">${tt('tourney_no_champs_yet') || 'Još uvek nema osvajača turnira.'}</div>`;
        } else {
            this.tourneyLeaderboard.forEach((player, idx) => {
                const photo = this.playerPhotoUrl({ ...player, name: player.playerName });
                const safePlayerName = this.escape(player.playerName || tt('player_guest') || 'Igrač');
                const safeWins = Number.isFinite(Number(player.wins)) ? Math.max(0, Math.floor(Number(player.wins))) : 0;
                const savedChampionships = this.getSavedChampionships(player);
                const hasJourney = savedChampionships.length > 0;
                const cardClass = `tourney-champion-card${idx === 0 ? ' is-top' : ''}${hasJourney ? ' is-openable' : ''}`;
                const clickAttr = hasJourney ? `onclick="app.tournamentManager.openChampionJourney(${idx})"` : '';
                const ariaLabel = this.escapeAttr(`${safePlayerName} - ${this.getTournamentEditionLabel(player, idx)}`);
                const journeyButton = hasJourney
                    ? `<button type="button" class="tourney-champion-action-btn" onclick="event.stopPropagation(); app.tournamentManager.openChampionJourney(${idx})">${this.escape(tt('tourney_champion_journey_btn') || 'Put do titule')}</button>`
                    : `<span class="tourney-champion-action-placeholder">${this.escape(tt('tourney_champion_no_path') || 'Put ovog turnira nije sačuvan.')}</span>`;
                const shareLabel = this.escape(tt('tourney_share_card') || 'Podeli karticu');
                const podiumType = idx === 0 ? 'gold' : (idx === 1 ? 'silver' : (idx === 2 ? 'bronze' : ''));
                const podiumHtml = podiumType
                    ? `<img class="tourney-podium-medal tourney-podium-medal-easter tourney-podium-medal--${podiumType}" src="assets/easter-soft-clay/tournament/podium-${podiumType}.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-podium-medal-desert tourney-podium-medal--${podiumType}" src="assets/desert-soft-clay/tournament/podium-${podiumType}.png?v=3" alt="" aria-hidden="true" decoding="async"><img class="tourney-podium-medal-nebula tourney-podium-medal--${podiumType}" src="assets/severna-soft-clay/tournament/podium-${podiumType}-v2.png?v=1" alt="" aria-hidden="true" decoding="async">`
                    : '';

                leaderboardHtml += `
                    <div class="${cardClass}" ${clickAttr} role="group" aria-label="${ariaLabel}">
                        ${podiumHtml}
                        <div class="tourney-champion-edition">${this.getTournamentEditionLabel(player, idx)}</div>
                        <img class="tourney-champion-avatar" src="${photo}" alt="" aria-hidden="true" decoding="async">
                        <div class="tourney-champion-name">${safePlayerName}</div>
                        <div class="tourney-champion-count" aria-label="${this.escapeAttr(tt('tourney_champion_titles') || 'Osvojeni turniri')} ${safeWins}">
                            <img class="tourney-wins-trophy-icon tourney-trophy-default" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                            <img class="tourney-wins-trophy-icon-easter" src="assets/easter-soft-clay/tournament-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                            <img class="tourney-wins-trophy-icon-desert" src="assets/desert-soft-clay/tournament-pro.png?v=4" alt="" aria-hidden="true" decoding="async">
                            <img class="tourney-wins-trophy-icon-nebula" src="assets/severna-soft-clay/tournament-pro-v7.png?v=1" alt="" aria-hidden="true" decoding="async">
                            <strong>${safeWins}</strong>
                        </div>
                        <div class="tourney-champion-actions">
                            ${journeyButton}
                            <button type="button" class="tourney-champion-action-btn tourney-champion-share-btn" data-champion-index="${idx}" aria-label="${this.escapeAttr(tt('tourney_share_aria') || 'Podeli karticu osvajača')}" onclick="event.stopPropagation(); app.tournamentManager.shareChampionCard(${idx})">
                                <span aria-hidden="true">↗</span>
                                <span>${shareLabel}</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        leaderboardHtml += `
                </div>
            </div>
            <style>
                .tourney-champions-view { width: 100%; max-width: 380px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; padding: 2px 10px max(28px, calc(env(safe-area-inset-bottom) + 18px)); color: var(--text-main); }
                .tourney-champions-title { color: var(--gold-main); text-align: center; margin: 0 0 14px; border-bottom: var(--glass-border); padding-bottom: 9px; text-transform: uppercase; font-size: 1.12rem; letter-spacing: 0; width: 100%; text-shadow: none; }
                .tourney-champions-list { display: grid; grid-template-columns: 1fr; gap: 10px; width: 100%; }
                .tourney-champions-empty { text-align: center; color: var(--text-muted); font-size: 1rem; padding: 40px 0; }
                .tourney-champion-card { --tourney-card-surface: rgba(127,127,127,0.10); --tourney-card-strong: var(--text-main); --tourney-card-soft: var(--text-muted); width: 100%; min-height: 178px; background: var(--glass-bg); border: var(--glass-border); border-radius: 8px; padding: 12px 14px; display: grid; grid-template-columns: 68px minmax(0, 1fr) auto; grid-template-rows: auto minmax(52px, auto) auto auto; column-gap: 12px; row-gap: 10px; align-items: center; color: var(--tourney-card-strong); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 18px rgba(0,0,0,0.18); transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease; }
                .tourney-champion-card.is-top { background: linear-gradient(135deg, rgba(255,255,255,0.09), rgba(127,127,127,0.08)), var(--glass-bg); border-color: var(--gold-main); box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.04), 0 10px 22px rgba(0,0,0,0.22); }
                .tourney-champion-card.is-openable { cursor: pointer; }
                .tourney-champion-card.is-openable:active { transform: scale(0.99); }
                .tourney-champion-edition { grid-column: 1 / -1; justify-self: start; color: var(--gold-main); font-size: 0.76rem; line-height: 1; font-weight: 1000; letter-spacing: 0; text-transform: uppercase; border: var(--glass-border); border-radius: 999px; padding: 6px 10px; background: var(--tourney-card-surface); text-shadow: none; }
                .tourney-champion-avatar { grid-row: 2 / 4; width: 58px; height: 58px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-main); background: rgba(0,0,0,0.24); box-shadow: 0 5px 14px rgba(0,0,0,0.35), 0 0 0 4px rgba(127,127,127,0.08); }
                .tourney-champion-name { min-width: 0; color: var(--tourney-card-strong); font-size: 1.03rem; line-height: 1.12; font-weight: 900; word-break: break-word; text-shadow: none; }
                .tourney-champion-card.is-top .tourney-champion-name { color: var(--gold-main); }
                .tourney-champion-count { justify-self: end; display: inline-flex; align-items: center; gap: 6px; min-width: 54px; justify-content: center; background: var(--tourney-card-surface); padding: 7px 10px; border-radius: 999px; border: var(--glass-border); color: var(--tourney-card-strong); }
                .tourney-champion-count strong { color: var(--tourney-card-strong); font-weight: 1000; font-size: 1.08rem; line-height: 1; }
                .tourney-champion-actions { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: 100%; }
                .tourney-champion-action-btn { min-width: 0; min-height: 40px; border: var(--glass-border); border-radius: 8px; background: var(--tourney-card-surface); color: var(--tourney-card-strong); font-family: 'Montserrat', sans-serif; font-size: 0.72rem; line-height: 1.05; font-weight: 1000; text-transform: uppercase; letter-spacing: 0; padding: 8px 9px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); overflow: hidden; text-overflow: ellipsis; }
                .tourney-champion-action-btn:hover, .tourney-champion-action-btn:focus-visible { outline: none; border-color: var(--gold-main); color: var(--gold-main); }
                .tourney-champion-action-btn:active { transform: scale(0.985); }
                .tourney-champion-action-btn:disabled { opacity: 0.68; cursor: wait; transform: none; }
                .tourney-champion-share-btn { background: linear-gradient(135deg, rgba(127,127,127,0.12), rgba(127,127,127,0.06)); }
                .tourney-champion-action-placeholder { min-height: 40px; border: var(--glass-border); border-radius: 8px; color: var(--tourney-card-soft); background: rgba(127,127,127,0.06); font-size: 0.68rem; line-height: 1.12; font-weight: 800; display: flex; align-items: center; justify-content: center; text-align: center; padding: 7px; }
                @media (max-width: 340px) {
                    .tourney-champion-card { grid-template-columns: 58px 1fr auto; column-gap: 9px; padding: 11px; }
                    .tourney-champion-avatar { width: 52px; height: 52px; }
                    .tourney-champion-name { font-size: 0.96rem; }
                    .tourney-champion-actions { grid-template-columns: 1fr; }
                }
            </style>
        `;
        return leaderboardHtml;
    }

    getHistoryRoundLabel(round) {
        if (round === 'qf') return tt('tourney_qf') || 'ČETVRTFINALE';
        if (round === 'sf') return tt('tourney_sf') || 'POLUFINALE';
        return (tt('tourney_f') || 'FINALE').replace(/🏆/g, '').trim() || 'FINALE';
    }

    getHistoryOpponent(match, championId) {
        if (!match) return null;
        if (match.p1 && match.p1.id === championId) return match.p2 || null;
        if (match.p2 && match.p2.id === championId) return match.p1 || null;
        return null;
    }

    getChampionPathMatches(championship) {
        const championId = championship?.winnerId;
        const bracket = championship?.bracket || {};
        if (!championId) return [];

        return ['qf', 'sf', 'f'].map(round => {
            const matches = Array.isArray(bracket[round]) ? bracket[round] : [];
            const match = matches.find(item => {
                return item && (
                    (item.p1 && item.p1.id === championId) ||
                    (item.p2 && item.p2.id === championId)
                );
            });
            return match ? { round, match } : null;
        }).filter(Boolean);
    }

    createChampionPathHTML(championship) {
        const path = this.getChampionPathMatches(championship);
        if (!path.length) {
            return `<div class="tourney-journey-empty">${tt('tourney_champion_no_path') || 'Put ovog turnira nije sačuvan.'}</div>`;
        }

        return path.map((step, index) => {
            const opponent = this.getHistoryOpponent(step.match, championship.winnerId);
            const opponentName = this.escape(opponent?.name || tt('player_guest') || 'Igrač');
            const resultLabel = this.getMatchResultLabel(step.match) || '-';
            const technicalReason = this.isTechnicalMatchResult(step.match)
                ? `<span class="tourney-journey-reason">${this.escape(this.getTechnicalReasonLabel(step.match.technicalWinReason))}</span>`
                : '';
            const drawCountLabel = this.getMatchDrawCountLabel(step.match);
            const drawCountHtml = drawCountLabel
                ? `<span class="tourney-journey-reason">${this.escape(drawCountLabel)}</span>`
                : '';

            return `
                <div class="tourney-journey-step">
                    <div class="tourney-journey-index">${index + 1}</div>
                    <div class="tourney-journey-main">
                        <span class="tourney-journey-round">${this.getHistoryRoundLabel(step.round)}</span>
                        <strong>${opponentName}</strong>
                    </div>
                    <div class="tourney-journey-score">
                        <span>${resultLabel}</span>
                        ${technicalReason}
                        ${drawCountHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    createHistoryBracketMatchHTML(match, championId) {
        if (!match || (!match.p1 && !match.p2)) {
            return `<div class="tourney-history-match is-empty">---</div>`;
        }

        const playerHtml = (player) => {
            if (!player) return `<span class="tourney-history-player is-empty">---</span>`;
            const isWinner = match.winnerId === player.id;
            const isChampion = championId === player.id;
            return `
                <span class="tourney-history-player${isWinner ? ' is-winner' : ''}${isChampion ? ' is-champion' : ''}">
                    ${this.escape(player.name || tt('player_guest') || 'Igrač')}
                </span>
            `;
        };

        const resultLabel = this.getMatchResultLabel(match);
        const drawCountLabel = this.getMatchDrawCountLabel(match);
        return `
            <div class="tourney-history-match">
                <div class="tourney-history-versus">
                    ${playerHtml(match.p1)}
                    <span>vs</span>
                    ${playerHtml(match.p2)}
                </div>
                ${resultLabel ? `<div class="tourney-history-scorebox"><strong class="tourney-history-score">${resultLabel}</strong>${drawCountLabel ? `<span class="tourney-history-score-note">${this.escape(drawCountLabel)}</span>` : ''}</div>` : ''}
            </div>
        `;
    }

    createHistoryBracketHTML(championship) {
        const bracket = championship?.bracket || {};
        return ['qf', 'sf', 'f'].map(round => {
            const matches = Array.isArray(bracket[round]) ? bracket[round] : [];
            return `
                <div class="tourney-history-round">
                    <h4>${this.getHistoryRoundLabel(round)}</h4>
                    <div class="tourney-history-round-matches">
                        ${matches.map(match => this.createHistoryBracketMatchHTML(match, championship.winnerId)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    openChampionJourney(index, championshipIndex = 0) {
        const player = Array.isArray(this.tourneyLeaderboard) ? this.tourneyLeaderboard[index] : null;
        const savedChampionships = this.getSavedChampionships(player);
        const selectedIndex = Math.max(0, Math.min(savedChampionships.length - 1, Math.floor(Number(championshipIndex) || 0)));
        const championship = savedChampionships[selectedIndex] || this.getLatestChampionship(player);
        if (!player || !championship || !championship.bracket) {
            this.app.modal.alert(
                tt('tourney_champion_no_path') || 'Put ovog turnira nije sačuvan.',
                tt('modal_title_info') || 'INFO'
            );
            return;
        }

        if (this.app.soundMgr) this.app.soundMgr.click();

        const safeName = this.escape(championship.winnerName || player.playerName || tt('player_guest') || 'Igrač');
        const photo = this.playerPhotoUrl({
            name: championship.winnerName || player.playerName,
            playerName: championship.winnerName || player.playerName,
            photoUrl: championship.winnerPhotoUrl || player.photoUrl
        });
        const editionLabel = this.getChampionshipEditionLabel(championship, selectedIndex + 1);
        const edition = this.escape(editionLabel);
        const finalScore = this.escape(championship.scoreLabel || '-');
        const wonAt = championship.wonAt ? this.escape(this.formatDate(championship.wonAt)) : '';
        const finalLabel = this.escape(this.getHistoryRoundLabel('f'));
        const selectorHtml = savedChampionships.length > 1
            ? `
                <div class="tourney-journey-picker" aria-label="${this.escapeAttr(tt('tourney_champion_pick_title') || 'Izaberi titulu')}">
                    <span class="tourney-journey-picker-label">${tt('tourney_champion_pick_title') || 'Izaberi titulu'}</span>
                    ${savedChampionships.map((item, itemIndex) => {
                        const itemLabel = this.escape(this.getChampionshipEditionLabel(item, itemIndex + 1));
                        const activeClass = itemIndex === selectedIndex ? ' is-active' : '';
                        return `<button type="button" class="tourney-journey-pick${activeClass}" onclick="app.tournamentManager.openChampionJourney(${index}, ${itemIndex})">${itemLabel}</button>`;
                    }).join('')}
                </div>
            `
            : '';

        this.app.modal.alert(`
            <div class="tourney-journey-modal">
                <div class="tourney-journey-hero">
                    <div class="tourney-journey-edition">${edition}</div>
                    <img class="tourney-journey-avatar" src="${photo}" alt="" aria-hidden="true" decoding="async">
                    <h3>${safeName}</h3>
                    <div class="tourney-journey-final">
                        <img src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                        <span>${finalLabel}: <strong>${finalScore}</strong></span>
                    </div>
                    ${wonAt ? `<div class="tourney-journey-date">${wonAt}</div>` : ''}
                </div>

                ${selectorHtml}

                <section class="tourney-journey-section">
                    <h4>${tt('tourney_champion_journey_title') || 'PUT DO TITULE'}</h4>
                    <div class="tourney-journey-path">
                        ${this.createChampionPathHTML(championship)}
                    </div>
                </section>

                <section class="tourney-journey-section">
                    <h4>${tt('tourney_champion_all_matches') || 'Bracket turnira'}</h4>
                    <div class="tourney-history-browser">
                        ${this.createHistoryBracketHTML(championship)}
                    </div>
                </section>
            </div>
            <style>
                .tourney-journey-modal { --journey-surface: var(--glass-bg, rgba(127,127,127,0.12)); --journey-lift: rgba(127,127,127,0.16); --journey-border: var(--glass-border, 1px solid rgba(127,127,127,0.28)); --journey-accent: var(--gold-main, #d4af37); --journey-text: var(--text-main, #f5f5f5); --journey-muted: var(--text-muted, rgba(245,245,245,0.72)); width: 100%; max-height: min(72dvh, 620px); overflow-y: auto; padding-right: 2px; text-align: center; color: var(--journey-text); font-family: 'Montserrat', sans-serif; letter-spacing: 0; }
                .tourney-journey-hero { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 4px 4px 12px; border-bottom: var(--journey-border); }
                .tourney-journey-edition { color: var(--journey-accent); border: var(--journey-border); border-radius: 999px; padding: 5px 10px; font-size: 0.74rem; line-height: 1; font-weight: 1000; text-transform: uppercase; background: var(--journey-surface); }
                .tourney-journey-avatar { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid var(--journey-accent); background: var(--journey-surface); box-shadow: 0 5px 14px rgba(0,0,0,0.24); }
                .tourney-journey-hero h3 { margin: 0; color: var(--journey-accent); font-size: 1.18rem; line-height: 1.12; word-break: break-word; text-shadow: none; }
                .tourney-journey-final { display: inline-flex; align-items: center; justify-content: center; gap: 7px; color: var(--journey-text); font-size: 0.92rem; line-height: 1.2; }
                .tourney-journey-final img { width: 22px; height: 22px; object-fit: contain; filter: drop-shadow(0 0 7px var(--gold-glow)); }
                .tourney-journey-date { color: var(--journey-muted); font-size: 0.78rem; line-height: 1.2; }
                .tourney-journey-picker { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; padding: 11px 0 2px; }
                .tourney-journey-picker-label { flex: 0 0 100%; color: var(--journey-muted); text-align: center; font-size: 0.72rem; line-height: 1; font-weight: 900; text-transform: uppercase; }
                .tourney-journey-pick { min-height: 32px; border: var(--journey-border); border-radius: 999px; background: var(--journey-surface); color: var(--journey-text); padding: 7px 11px; font-family: 'Montserrat', sans-serif; font-size: 0.75rem; line-height: 1; font-weight: 1000; letter-spacing: 0; cursor: pointer; }
                .tourney-journey-pick.is-active { background: var(--journey-lift); color: var(--journey-accent); border-color: var(--journey-accent); box-shadow: 0 0 10px var(--gold-glow, rgba(255,215,0,0.18)); }
                .tourney-journey-section { margin-top: 14px; text-align: left; }
                .tourney-journey-section h4 { margin: 0 0 8px; color: var(--journey-accent); font-size: 0.82rem; line-height: 1.1; text-transform: uppercase; letter-spacing: 0; text-align: center; }
                .tourney-journey-path { display: flex; flex-direction: column; gap: 8px; }
                .tourney-journey-step { display: grid; grid-template-columns: 28px 1fr auto; gap: 8px; align-items: center; background: var(--journey-surface); border: var(--journey-border); border-radius: 8px; padding: 9px; }
                .tourney-journey-index { width: 24px; height: 24px; border-radius: 50%; background: var(--journey-lift); border: var(--journey-border); color: var(--journey-accent); display: flex; align-items: center; justify-content: center; font-weight: 1000; font-size: 0.78rem; }
                .tourney-journey-main { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
                .tourney-journey-main strong { color: var(--journey-text); font-size: 0.92rem; line-height: 1.14; word-break: break-word; }
                .tourney-journey-round { color: var(--journey-muted); font-size: 0.68rem; line-height: 1; text-transform: uppercase; font-weight: 800; }
                .tourney-journey-score { justify-self: end; color: var(--journey-accent); font-size: 0.82rem; font-weight: 1000; text-align: right; line-height: 1.1; display: flex; flex-direction: column; gap: 2px; }
                .tourney-journey-reason { color: var(--journey-muted); font-size: 0.66rem; font-weight: 700; }
                .tourney-journey-empty { text-align: center; color: var(--journey-muted); padding: 16px; background: var(--journey-surface); border: var(--journey-border); border-radius: 8px; }
                .tourney-history-browser { display: grid; grid-template-columns: 1fr; gap: 9px; }
                .tourney-history-round { background: var(--journey-surface); border: var(--journey-border); border-radius: 8px; padding: 9px; }
                .tourney-history-round h4 { margin-bottom: 7px; font-size: 0.76rem; }
                .tourney-history-round-matches { display: flex; flex-direction: column; gap: 6px; }
                .tourney-history-match { min-height: 38px; background: var(--journey-surface); border: var(--journey-border); border-radius: 7px; padding: 7px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .tourney-history-match.is-empty { justify-content: center; color: var(--journey-muted); opacity: 0.7; }
                .tourney-history-versus { min-width: 0; display: flex; align-items: center; gap: 5px; color: var(--journey-muted); font-size: 0.7rem; }
                .tourney-history-player { color: var(--journey-text); font-size: 0.78rem; line-height: 1.1; font-weight: 700; word-break: break-word; }
                .tourney-history-player.is-winner { color: var(--success); font-weight: 1000; }
                .tourney-history-player.is-champion { color: var(--journey-accent); }
                .tourney-history-scorebox { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; text-align: right; }
                .tourney-history-score { color: var(--journey-accent); font-size: 0.78rem; line-height: 1; white-space: nowrap; }
                .tourney-history-score-note { color: var(--journey-muted); font-size: 0.62rem; line-height: 1; white-space: nowrap; }
            </style>
        `, `${tt('tourney_champion_journey_title') || 'PUT DO TITULE'} - ${edition}`);
    }

    renderRegistration(container) {
        const myId = this.app.playerId;
        const isRegistered = this.state.players.some(p => p.id === myId);
        const isRegistrationOpen = this.state.status === 'registration';
        const isFinished = this.state.status === 'finished';
        const spotsLeft = 8 - this.state.players.length;
        const currentEdition = this.getCurrentTournamentEditionLabel();
        const nextEdition = this.getNextTournamentEditionLabel();
        const resetCountdown = this.formatTournamentResetCountdown(this.state.resetAt);
        const registrationDesc = isFinished
            ? (tt('tourney_finished_desc') || 'Turnir je završen. Rezultati i put do titule ostaju sačuvani.')
            : (tt('tourney_desc') || 'Prijavite se za nedeljni turnir! 8 igrača se bori za prestiž i veliku nagradu.');

        let buttonHtml = '';
        if (!isRegistrationOpen) {
            const labelPrimary = isFinished
                ? (tt('tourney_finished_title') || 'Turnir je završen')
                : (isRegistered
                    ? (tt('tourney_reg_active_title') || 'Prijavljeni ste')
                    : (tt('tourney_reg_started') || 'Turnir je već počeo'));
            const labelSecondary = isFinished
                ? `${tt('tourney_next_registration_in') || 'Nove prijave'}: ${nextEdition}${resetCountdown ? ` (${resetCountdown})` : ''}`
                : (isRegistered ? (tt('tourney_reg_active_subtitle') || 'Turnir u toku') : '');
            buttonHtml = `
                <button class="btn-menu btn-secondary tourney-action-button tourney-action-button--locked" disabled>
                    <span class="tourney-action-icon tourney-action-icon-fallback" aria-hidden="true">🏁</span>
                    <img class="tourney-action-soft-clay-icon" src="assets/easter-soft-clay/tournament/${isFinished ? 'state-match-complete' : (isRegistered ? 'state-start' : 'state-registration-locked')}.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-action-desert-soft-clay-icon" src="assets/desert-soft-clay/tournament/${isFinished ? 'state-match-complete' : (isRegistered ? 'state-start' : 'state-registration-locked')}.png?v=3" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-action-nebula-soft-clay-icon" src="assets/severna-soft-clay/tournament/${isFinished ? 'state-match-complete' : (isRegistered ? 'state-start' : 'state-registration-locked')}-v3.png?v=1" alt="" aria-hidden="true" decoding="async">
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
                    <span class="tourney-action-icon tourney-action-icon-fallback" aria-hidden="true">${this.pendingUnregister ? '⏳' : '↩️'}</span>
                    <img class="tourney-action-soft-clay-icon${this.pendingUnregister ? ' is-pending' : ''}" src="assets/easter-soft-clay/tournament/state-unregister.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-action-desert-soft-clay-icon${this.pendingUnregister ? ' is-pending' : ''}" src="assets/desert-soft-clay/tournament/state-unregister.png?v=3" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-action-nebula-soft-clay-icon${this.pendingUnregister ? ' is-pending' : ''}" src="assets/severna-soft-clay/tournament/state-unregister-v3.png?v=1" alt="" aria-hidden="true" decoding="async">
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
                    <span class="tourney-action-icon tourney-action-icon-fallback" aria-hidden="true">${this.pendingRegistration ? '⏳' : '🎟️'}</span>
                    <img class="tourney-action-soft-clay-icon${this.pendingRegistration ? ' is-pending' : ''}" src="assets/easter-soft-clay/tournament/state-register.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-action-desert-soft-clay-icon${this.pendingRegistration ? ' is-pending' : ''}" src="assets/desert-soft-clay/tournament/state-register.png?v=3" alt="" aria-hidden="true" decoding="async">
                    <img class="tourney-action-nebula-soft-clay-icon${this.pendingRegistration ? ' is-pending' : ''}" src="assets/severna-soft-clay/tournament/state-register-v3.png?v=1" alt="" aria-hidden="true" decoding="async">
                    <span class="tourney-action-label">
                        <span class="tourney-action-primary">${labelPrimary}</span>
                        ${labelSecondary ? `<span class="tourney-action-secondary">${labelSecondary}</span>` : ''}
                    </span>
                </button>
            `;
        }

        container.innerHTML = `
            <div class="tourney-registration-panel">
                <div class="tourney-icon-large tourney-registration-icon"><span class="tourney-registration-icon-fallback" aria-hidden="true">🏆</span><img class="tourney-registration-soft-clay-icon" src="assets/easter-soft-clay/tournament-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-registration-desert-soft-clay-icon" src="assets/desert-soft-clay/tournament-pro.png?v=4" alt="" aria-hidden="true" decoding="async"><img class="tourney-registration-nebula-soft-clay-icon" src="assets/severna-soft-clay/tournament-pro-v7.png?v=1" alt="" aria-hidden="true" decoding="async"></div>
                <h3 class="tourney-registration-title">${currentEdition}</h3>
                <p class="tourney-registration-desc">${registrationDesc}</p>

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

    getSafeTournamentNumber(value = this.state.tournamentNumber) {
        const num = Number(value);
        if (!Number.isFinite(num)) return 1;
        return Math.max(1, Math.floor(num));
    }

    getTournamentEditionByNumber(value) {
        return `${this.toRomanNumeral(this.getSafeTournamentNumber(value))} ${this.tr('tourney_edition_suffix', 'TURNIR')}`;
    }

    getCurrentTournamentEditionLabel() {
        return this.getTournamentEditionByNumber(this.state.tournamentNumber);
    }

    getNextTournamentEditionLabel() {
        return this.getTournamentEditionByNumber(this.getSafeTournamentNumber(this.state.tournamentNumber) + 1);
    }

    formatTournamentResetCountdown(resetAt) {
        const target = resetAt ? new Date(resetAt).getTime() : 0;
        if (!Number.isFinite(target) || target <= 0) return '';
        const remainingMs = Math.max(0, target - Date.now());
        if (remainingMs <= 0) return this.tr('tourney_next_registration_soon', 'uskoro');

        const totalMinutes = Math.ceil(remainingMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours <= 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
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

    getMatchDrawReplayLabel(match) {
        if (!match || match.winnerId || !match.rematchRequired) return '';
        const label = this.escape(tt('tourney_draw_replay_short') || 'NEREŠENO - PONAVLJANJE');
        const score = match.lastDrawScoreLabel ? this.escape(match.lastDrawScoreLabel) : '';
        return score ? `${label}: ${score}` : label;
    }

    getMatchDrawCountLabel(match) {
        const drawCount = Number(match?.drawCount || 0);
        if (!Number.isFinite(drawCount) || drawCount <= 0) return '';
        const safeCount = Math.max(0, Math.floor(drawCount));
        return `${tt('tourney_draws_before_win') || 'Remija pre pobede'}: ${safeCount}`;
    }

    getMatchDrawReplayNoticeHTML(match) {
        if (!match || match.winnerId || !match.rematchRequired) return '';

        const title = this.escape(tt('tourney_draw_replay_short') || 'NEREŠENO - PONAVLJANJE');
        const text = this.escape(tt('tourney_draw_replay_modal') || 'Partija je završena nerešeno. Meč se ponavlja dok neko ne pobedi.');
        const score = match.lastDrawScoreLabel ? this.escape(match.lastDrawScoreLabel) : '';
        const scoreHtml = score
            ? `<p style="margin-top: 8px; color: var(--text-main); font-size: 0.88rem;">${this.escape(tt('tourney_draw_score') || 'Skor remija')}: <strong style="color: var(--gold-main);">${score}</strong></p>`
            : '';
        const countLabel = this.getMatchDrawCountLabel(match);
        const countHtml = countLabel
            ? `<p style="margin-top: 4px; color: var(--text-muted); font-size: 0.8rem;">${this.escape(countLabel)}</p>`
            : '';

        return `
            <div style="background: rgba(255, 152, 0, 0.12); padding: 13px; border-radius: 8px; margin-bottom: 15px; border: 1px solid rgba(255, 152, 0, 0.75); text-align: left;">
                <p style="color: #ffb74d; font-weight: 1000; margin-bottom: 6px; text-transform: uppercase; font-size: 0.86rem; line-height: 1.1;">${title}</p>
                <p style="color: var(--text-main); font-size: 0.88rem; line-height: 1.35; margin: 0;">${text}</p>
                ${scoreHtml}
                ${countHtml}
            </div>
        `;
    }

    getTechnicalReasonLabel(reason) {
        switch (String(reason || 'technical')) {
            case 'back_to_menu':
                return this.tr('tourney_technical_quit', 'napuštanje');
            case 'turn_timeout':
                return this.tr('tourney_technical_timeout', 'istek vremena');
            case 'disconnect_grace_expired':
                return this.tr('tourney_technical_disconnect', 'prekid veze');
            case 'opponent_disqualified':
                return this.tr('tourney_technical_opponent_dq', 'diskvalifikacija protivnika');
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
        const finalTitle = (tt('tourney_f') || 'FINALE').replace(/🏆/g, '').trim() || 'FINALE';

        container.innerHTML = `
            <div class="tourney-bracket-layout">
                <div class="tourney-carousel" id="tourney-carousel" onscroll="app.tournamentManager.updateTourneyPagination()">

                    <div class="tourney-page">
                        <div class="tourney-card">
                            <h3 class="tourney-round-title">
                                ${tt('tourney_qf') || '1/4 FINALA'}
                            </h3>
                            <div class="tourney-matches tourney-matches--qf">
                                ${qf.map((m, i) => this.createMatchHTML(m, 'qf', i)).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="tourney-page">
                        <div class="tourney-card">
                            <h3 class="tourney-round-title">
                                ${tt('tourney_sf') || 'POLUFINALE'}
                            </h3>
                            <div class="tourney-matches tourney-matches--sf">
                                ${sf.map((m, i) => this.createMatchHTML(m, 'sf', i)).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="tourney-page">
                        <div class="tourney-card">
                            <h3 class="tourney-round-title">
                                <span>${finalTitle}</span>
                                <img class="tourney-round-trophy tourney-trophy-default" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async">
                                <img class="tourney-round-trophy-easter" src="assets/easter-soft-clay/tournament-pro-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                                <img class="tourney-round-trophy-desert" src="assets/desert-soft-clay/tournament-pro.png?v=4" alt="" aria-hidden="true" decoding="async">
                                <img class="tourney-round-trophy-nebula" src="assets/severna-soft-clay/tournament-pro-v7.png?v=1" alt="" aria-hidden="true" decoding="async">
                            </h3>
                            <div class="tourney-matches tourney-matches--f">
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
                .tourney-bracket-layout { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
                .tourney-carousel { display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; width: 100%; flex: 1 1 auto; min-height: 0; scrollbar-width: none; -ms-overflow-style: none; }
                .tourney-carousel::-webkit-scrollbar { display: none; }
                .tourney-page { flex: 0 0 100%; width: 100%; min-height: 0; scroll-snap-align: center; padding: 0 10px; display: flex; flex-direction: column; }
                .tourney-card { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
                .tourney-round-title { color: var(--gold-main); text-align: center; margin: 0 0 10px; font-size: 1.05rem; line-height: 1.15; letter-spacing: 0; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 7px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
                .tourney-round-trophy { width: 22px; height: 22px; object-fit: contain; flex: 0 0 auto; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45)) drop-shadow(0 0 7px var(--gold-glow)); }
                .tourney-matches { width: 100%; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; align-items: stretch; }
                .tourney-matches--qf { justify-content: space-between; gap: 7px; }
                .tourney-matches--sf { justify-content: center; gap: 28px; }
                .tourney-matches--f { justify-content: center; }
                .tourney-match { width: 100%; min-height: var(--match-min-height, 62px); background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; display: flex; flex-direction: column; cursor: default; position: relative; overflow: hidden; transition: transform 0.1s, border-color 0.2s, box-shadow 0.2s; }
                .tourney-match--mine { border-color: var(--gold-main); box-shadow: 0 0 10px rgba(255,215,0,0.3); }
                .tourney-match--open { cursor: pointer; }
                .tourney-match--open:active { transform: scale(0.99); }
                .tourney-match--empty { justify-content: center; align-items: center; padding: 10px; box-sizing: border-box; background: rgba(0,0,0,0.4); border: 1px dashed rgba(255,215,0,0.3); }

                .tourney-pagination { display: flex; gap: 12px; justify-content: center; margin: 9px 0 2px; flex-shrink: 0; }
                .tourney-pagination .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--carousel-dot-idle); transition: all 0.3s ease; box-shadow: inset 0 0 3px rgba(0,0,0,0.5); }
                .tourney-pagination .dot.active { background: var(--carousel-dot-active); transform: scale(1.4); box-shadow: 0 0 10px var(--carousel-dot-glow); }
                @media (max-height: 700px) {
                    .tourney-card { padding: 10px; }
                    .tourney-round-title { margin-bottom: 8px; font-size: 1rem; padding-bottom: 6px; }
                    .tourney-matches--qf { gap: 5px; }
                    .tourney-matches--sf { gap: 18px; }
                    .tourney-pagination { margin-top: 7px; }
                }
            </style>
        `;
    }

    createMatchHTML(match, round, index) {
        if (!match || (!match.p1 && !match.p2)) {
            return `
                <div class="tourney-match tourney-match--empty" style="--match-min-height: 62px;">
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
            let safeName = this.escape(p.name || tt('player_guest') || 'Igrač');
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
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; ${isTop ? 'border-bottom: 1px solid rgba(255,215,0,0.1);' : ''} opacity: ${opacity}; filter: ${filter};">
                    <div style="display: flex; align-items: center; overflow: hidden; padding-right: 5px;">
                        <img src="${photo}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid ${isWinner ? 'var(--success)' : 'rgba(255,215,0,0.4)'}; margin-right: 8px; flex-shrink: 0; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
                        <span style="font-size: 0.78rem; font-weight: ${fontWeight}; color: ${nameColor}; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${safeName}</span>
                    </div>
                    <span style="font-size: 0.62rem; color: var(--gold-main); font-weight: 900; flex-shrink: 0; text-shadow: 0 0 5px rgba(255,215,0,0.3);">⚡ ${powerIndex}</span>
                </div>
            `;
        };

        let statusDot = '';
        if (match.rematchRequired && !match.winnerId) {
            statusDot = `<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: #ff9800; border-radius: 50%; box-shadow: 0 0 8px #ff9800;"></div>`;
        } else if (match.timeAccepted && match.time) {
            statusDot = `<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success);"></div>`;
        } else if (match.proposedTime) {
            statusDot = `<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: #ff9800; border-radius: 50%; box-shadow: 0 0 8px #ff9800;"></div>`;
        }

        const resultLabel = this.getMatchResultLabel(match);
        const drawReplayLabel = this.getMatchDrawReplayLabel(match);
        const resultHtml = resultLabel
            ? `<div class="tourney-completed-match-result" style="text-align: center; padding: 2px 8px; font-size: 0.7rem; line-height: 1.15; font-weight: 900; color: var(--gold-main); background: rgba(255,215,0,0.07); border-bottom: 1px solid rgba(255,215,0,0.12); text-shadow: 0 0 5px rgba(255,215,0,0.25);"><img class="tourney-inline-match-state" src="assets/easter-soft-clay/tournament/state-match-complete.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-inline-match-state-desert" src="assets/desert-soft-clay/tournament/state-match-complete.png?v=3" alt="" aria-hidden="true" decoding="async"><img class="tourney-inline-match-state-nebula" src="assets/severna-soft-clay/tournament/state-match-complete-v3.png?v=1" alt="" aria-hidden="true" decoding="async"><span>${resultLabel}</span></div>`
            : (drawReplayLabel ? `<div style="text-align: center; padding: 2px 8px; font-size: 0.66rem; line-height: 1.15; font-weight: 1000; color: #ffb74d; background: rgba(255,152,0,0.1); border-bottom: 1px solid rgba(255,152,0,0.18); text-shadow: 0 0 5px rgba(255,152,0,0.2);">${drawReplayLabel}</div>` : '');
        const cardMinHeight = (resultLabel || drawReplayLabel) ? '76px' : '62px';
        const canOpenMatch = Boolean(match.p1 && match.p2 && (this.state.status === 'finished' || this.isTournamentSchedulingUnlocked()));
        const matchClasses = [
            'tourney-match',
            isMyMatch ? 'tourney-match--mine' : '',
            canOpenMatch ? 'tourney-match--open' : ''
        ].filter(Boolean).join(' ');

        const clickAttr = canOpenMatch ? `onclick="app.tournamentManager.openMatchModal('${round}', ${index})"` : '';

        return `
            <div ${clickAttr} class="${matchClasses}" style="--match-min-height: ${cardMinHeight};">
                ${statusDot}
                ${getPlayerHtml(match.p1, true)}
                ${resultHtml}
                ${getPlayerHtml(match.p2, false)}
            </div>
        `;
    }

    openMatchModal(round, index) {
        if (this.state.status === 'registration' || (this.state.status === 'active' && !this.isTournamentSchedulingUnlocked())) {
            this.showSchedulingLockedMessage();
            return;
        }

        const match = this.state.bracket[round][index];
        if (!match || !match.p1 || !match.p2) return;

        const myId = this.app.playerId;
        const isMyMatch = match.p1.id === myId || match.p2.id === myId;
        const rematchNoticeHtml = this.getMatchDrawReplayNoticeHTML(match);
        let akcijeHtml = '';

        if (match.winnerId) {
            const winnerName = this.escape(match.winnerId === match.p1.id ? match.p1.name : match.p2.name);
            const finalistName = this.escape(match.winnerId === match.p1.id ? match.p2.name : match.p1.name);
            const resultLabel = this.getMatchResultLabel(match);
            const technicalReason = this.isTechnicalMatchResult(match)
                ? this.escape(this.getTechnicalReasonLabel(match.technicalWinReason))
                : '';
            const resultHtml = resultLabel
                ? `<div style="margin-top: 8px; color: var(--text-main); font-size: 0.95rem;">${this.tr('tourney_result', 'Rezultat')}: <strong style="color: var(--gold-main);">${resultLabel}</strong>${technicalReason ? ` <span style="color: var(--text-muted); font-size: 0.82rem;">(${technicalReason})</span>` : ''}</div>`
                : '';
            const drawCountLabel = this.getMatchDrawCountLabel(match);
            const drawCountHtml = drawCountLabel
                ? `<div style="margin-top: 5px; color: var(--text-muted); font-size: 0.82rem;">${this.escape(drawCountLabel)}</div>`
                : '';
            const resultIcon = round === 'f' ? 'tournament-pro.png' : 'tournament/state-match-complete.png';
            const severnaResultIcon = round === 'f' ? 'tournament-pro-v7.png?v=1' : 'tournament/state-match-complete-v3.png?v=1';
            const finalistHtml = round === 'f'
                ? `<div class="tourney-finalist-result"><img class="tourney-finalist-result-icon-easter" src="assets/easter-soft-clay/tournament/finalist-silver-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-finalist-result-icon-desert" src="assets/desert-soft-clay/tournament/finalist-silver-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-finalist-result-icon-nebula" src="assets/severna-soft-clay/tournament/finalist-silver-v3.png?v=1" alt="" aria-hidden="true" decoding="async"><span>${tt('tourney_finalist_title') || 'Finalista'}: <strong>${finalistName}</strong></span></div>`
                : '';
            akcijeHtml = `<div class="tourney-match-result" style="color: var(--success); font-size: 1.1rem; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">${tt('tourney_winner') || 'Pobednik:'} <strong style="text-transform: uppercase;">${winnerName}</strong> <img class="tourney-match-result-icon-default" src="assets/tournament-trophy-yotb.svg" alt="" aria-hidden="true" decoding="async"><img class="tourney-match-result-icon-easter" src="assets/easter-soft-clay/${resultIcon}?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-match-result-icon-desert" src="assets/desert-soft-clay/${resultIcon}?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-match-result-icon-nebula" src="assets/severna-soft-clay/${severnaResultIcon}" alt="" aria-hidden="true" decoding="async">${finalistHtml}${resultHtml}${drawCountHtml}</div>`;
        }
        else if (isMyMatch) {
            if (match.timeAccepted) {
                const replayScheduleHtml = match.rematchRequired ? `
                    <hr style="border: 0; border-top: 1px dashed rgba(255,255,255,0.1); margin: 15px 0;">
                    <div style="text-align: left; margin-bottom: 10px;">
                        <label style="font-size: 0.75rem; color: var(--text-muted);">${tt('tourney_want_to_change_time') || 'Želite da promenite termin?'}</label>
                        <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                    </div>
                    <button class="btn-menu btn-secondary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_schedule_new_time') || 'Zakaži novi termin'}</button>
                ` : '';
                akcijeHtml = `
                    ${rematchNoticeHtml}
                    <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--success);">
                        <p style="color: var(--success); font-weight: bold; margin-bottom: 5px;">${tt('tourney_time_agreed') || 'Vreme meča je dogovoreno!'}</p>
                        <p style="font-size: 1.1rem;">${this.formatDate(match.time)}</p>
                    </div>
                    <button class="btn-menu btn-primary tourney-start-match-button" style="width: 100%; font-size: 1.1rem; padding: 15px;" onclick="app.tournamentManager.startDuel('${round}', ${index})"><img class="tourney-inline-active-match-icon" src="assets/easter-soft-clay/tournament/state-match-active.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="tourney-inline-active-match-icon-desert" src="assets/desert-soft-clay/tournament/state-match-active.png?v=3" alt="" aria-hidden="true" decoding="async"><img class="tourney-inline-active-match-icon-nebula" src="assets/severna-soft-clay/tournament/state-match-active-v3.png?v=1" alt="" aria-hidden="true" decoding="async"><span>${match.rematchRequired ? (tt('tourney_replay_match') || 'POKRENI PONAVLJANJE') : `▶ ${tt('tourney_start_match') || 'POKRENI MEČ'}`}</span></button>
                    ${replayScheduleHtml}
                `;
            }
            else if (match.proposedTime) {
                if (match.proposedById === myId) {
                    akcijeHtml = `
                        ${rematchNoticeHtml}
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
                        ${rematchNoticeHtml}
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
                    ${rematchNoticeHtml}
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
            akcijeHtml = match.rematchRequired
                ? `${rematchNoticeHtml}<p style="color: var(--text-muted); font-size:0.85rem; padding: 14px 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">${tt('tourney_draw_waiting_replay') || 'Meč čeka ponavljanje.'}</p>`
                : `<p style="color: var(--text-muted); font-size:0.85rem; padding: 20px 0; background: rgba(0,0,0,0.2); border-radius: 8px;">${tt('tourney_not_your_match') || 'Ovo nije Vaš meč. Čekamo ishod ovog duela.'}</p>`;
        }

        const titleFallback = tt('tourney_match_title') || 'TURNIRSKI MEČ';
            const p1Name = this.escape(match.p1.name || tt('player_guest') || 'Igrač');
            const p2Name = this.escape(match.p2.name || tt('player_guest') || 'Igrač');

        this.app.modal.alert(`
            <div style="text-align:center;">
                <h3 style="color:var(--gold-main); margin-bottom: 5px; font-size: 1.4rem;">${p1Name} <span style="color:var(--text-muted); font-size:0.9rem;">VS</span> ${p2Name}</h3>
                <hr style="border: 0; border-top: 1px solid rgba(255,215,0,0.2); margin: 15px 0;">
                ${akcijeHtml}
            </div>
        `, titleFallback + ' ⚔️');
    }

    proposeTime(round, index) {
        if (!this.isTournamentSchedulingUnlocked()) {
            this.showSchedulingLockedMessage();
            return;
        }

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
        if (!this.isTournamentSchedulingUnlocked()) {
            this.showSchedulingLockedMessage();
            return;
        }

        this.app.soundMgr.click();

        if (this.app.socket) {
            this.app.socket.emit('tourney_accept_time', { round, index });
        }

        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }

    startDuel(round, index) {
        if (!this.isTournamentSchedulingUnlocked()) {
            this.showSchedulingLockedMessage();
            return;
        }

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
