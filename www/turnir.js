// turnir.js - LOGIKA ZA ASINHRONE TURNIRE (POVEZANO SA SERVEROM)

const tt = (key) => {
    if (typeof t === 'function') return t(key);
    return key;
};

class TournamentManager {
    constructor(app) {
        this.app = app;
        
        // Prazno početno stanje dok se ne učita sa servera
        this.state = {
            status: 'registration', 
            players: [], 
            bracket: { qf: [], sf: [], f: [] }
        };
        
        if (this.app) {
            this.app.openTournament = () => this.open();
        }

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Obavezno konektuj socket ako već nije
        if(this.app && !this.app.socket) {
            this.app.initSocketConnection();
        }

        setTimeout(() => {
            if(this.app && this.app.socket) {
                // 1. Kada server pošalje novo stanje, osveži UI
                this.app.socket.on('tourney_state_update', (newState) => {
                    this.state = newState;
                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                // 2. Slušač za pokretanje meča od strane protivnika
                this.app.socket.on('tourney_duel_ready', (data) => {
                    if (data.targetName === this.app.playerName) {
                        this.app.modal.confirm(tt('tourney_opponent_ready') || `Vaš turnirski protivnik je pokrenuo meč. Da li ulazite?`).then(acc => {
                            if(acc) {
                                this.app.joinPrivateGame(this.app.playerName, data.matchRoomId);
                            }
                        });
                    }
                });
            }
        }, 1000);
    }

    open() {
        this.app.navigateTo('tournament-screen');
        // Zatraži sveže stanje od servera
        if(this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('tourney_get_state');
        } else {
            this.app.initSocketConnection();
            setTimeout(() => { if(this.app.socket) this.app.socket.emit('tourney_get_state'); }, 500);
        }
        this.render();
    }

    render() {
        const container = document.getElementById('tourney-content');
        if (!container) return;

        if (this.state.status === 'registration') {
            this.renderRegistration(container);
        } else {
            this.renderBracket(container);
        }
    }

    // --- FAZA PRIJAVE ---
    renderRegistration(container) {
        const isRegistered = this.state.players.includes(this.app.playerName);
        const spotsLeft = 8 - this.state.players.length;

        container.innerHTML = `
            <div class="tourney-reg-box">
                <div class="tourney-icon-large">🏆</div>
                <h3 style="color: var(--gold-main); margin-bottom: 10px;">${tt('tourney_weekly')}</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px;">
                    ${tt('tourney_desc')}
                </p>
                
                <div class="tourney-spots">
                    ${tt('tourney_registered')} <strong style="color: var(--success);">${this.state.players.length} / 8</strong>
                </div>

                <div style="margin-top: 20px;">
                    ${isRegistered ? 
                        `<button class="btn-menu btn-secondary" disabled>${tt('tourney_already_registered')}</button>` : 
                        `<button class="btn-menu btn-primary" onclick="app.tournamentManager.registerPlayer()">📝 ${tt('tourney_register_me')}</button>`
                    }
                </div>
                
                ${!isRegistered && spotsLeft > 0 ? `<button class="btn-discount" style="margin-top: 20px; border-radius: 10px;" onclick="app.tournamentManager.fillWithBots()">${tt('tourney_dev_fill')}</button>` : ''}
            </div>
        `;
    }

    registerPlayer() {
        this.app.soundMgr.click();
        if(this.app.socket) {
            this.app.socket.emit('tourney_register', this.app.playerName);
        }
    }

    fillWithBots() {
        if(this.app.socket) {
            this.app.socket.emit('tourney_fill_bots');
        }
    }

    // --- FAZA IGRANJA (BRACKET) ---
    formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
        const atStr = lang === 'en' ? 'at' : 'u';
        return d.toLocaleDateString(locale) + ` ${atStr} ` + d.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'});
    }

    renderBracket(container) {
        // Obezbeđujemo da ne puca ako nizovi nisu stigli
        const qf = this.state.bracket.qf || [];
        const sf = this.state.bracket.sf || [];
        const f = this.state.bracket.f || [];

        container.innerHTML = `
            <div class="bracket-container">
                <div class="bracket-round">
                    <div class="round-title">${tt('tourney_qf')}</div>
                    ${qf.map((m, i) => this.createMatchHTML(m, 'qf', i)).join('')}
                </div>
                
                <div class="bracket-round">
                    <div class="round-title">${tt('tourney_sf')}</div>
                    ${sf.map((m, i) => this.createMatchHTML(m, 'sf', i)).join('')}
                </div>
                
                <div class="bracket-round">
                    <div class="round-title" style="color: var(--gold-main);">${tt('tourney_f')}</div>
                    ${f.map((m, i) => this.createMatchHTML(m, 'f', i)).join('')}
                </div>
            </div>
        `;
    }

    createMatchHTML(match, round, index) {
        if (!match || !match.p1 || !match.p2) {
            return `<div class="match-box empty-match"><span>${tt('tourney_tbd')}</span><hr><span>${tt('tourney_tbd')}</span></div>`;
        }

        const isMyMatch = match.p1 === this.app.playerName || match.p2 === this.app.playerName;
        const boxClass = isMyMatch ? 'match-box my-match' : 'match-box';
        
        const p1Class = match.winner === match.p1 ? 'winner' : (match.winner ? 'loser' : '');
        const p2Class = match.winner === match.p2 ? 'winner' : (match.winner ? 'loser' : '');

        let timeInfo = '';
        if (match.timeAccepted && match.time) {
            timeInfo = `<div class="match-time" style="background: rgba(76, 175, 80, 0.3); color: var(--success);">✅ ${this.formatDate(match.time)}</div>`;
        } else if (match.proposedTime) {
            timeInfo = `<div class="match-time" style="background: rgba(255, 152, 0, 0.3); color: #ff9800;">${tt('tourney_in_progress')}</div>`;
        }

        return `
            <div class="${boxClass}" onclick="app.tournamentManager.openMatchModal('${round}', ${index})">
                <div class="match-player ${p1Class}">${match.p1}</div>
                <hr class="match-divider">
                <div class="match-player ${p2Class}">${match.p2}</div>
                ${timeInfo}
            </div>
        `;
    }

    // --- MODAL ZA DOGOVOR / POKRETANJE MEČA ---
    openMatchModal(round, index) {
        const match = this.state.bracket[round][index];
        if (!match || !match.p1 || !match.p2) return;

        const isMyMatch = match.p1 === this.app.playerName || match.p2 === this.app.playerName;
        let akcijeHtml = '';

        if (match.winner) {
            akcijeHtml = `<p style="color: var(--success); font-size: 1.1rem; padding: 10px;">${tt('tourney_winner')} <strong style="text-transform: uppercase;">${match.winner}</strong></p>`;
        } 
        else if (isMyMatch) {
            if (match.timeAccepted) {
                akcijeHtml = `
                    <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--success);">
                        <p style="color: var(--success); font-weight: bold; margin-bottom: 5px;">${tt('tourney_time_agreed')}</p>
                        <p style="font-size: 1.1rem;">${this.formatDate(match.time)}</p>
                    </div>
                    <button class="btn-menu btn-primary" onclick="app.tournamentManager.startDuel('${round}', ${index})">${tt('tourney_start_match')}</button>
                    <button class="btn-menu btn-secondary" onclick="app.tournamentManager.mockWin('${round}', ${index})">${tt('tourney_dev_win')}</button>
                `;
            } 
            else if (match.proposedTime) {
                if (match.proposedBy === this.app.playerName) {
                    akcijeHtml = `
                        <div style="background: rgba(255, 152, 0, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #ff9800;">
                            <p style="color: #ff9800; font-weight: bold; margin-bottom: 5px;">${tt('tourney_waiting_response')}</p>
                            <p style="font-size: 0.9rem; color: var(--text-main);">${tt('tourney_your_proposal')} <strong>${this.formatDate(match.proposedTime)}</strong></p>
                        </div>
                        <div style="text-align: left; margin-bottom: 10px;">
                            <label style="font-size: 0.7rem; color: var(--text-muted);">${tt('tourney_change_proposal_q')}</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                        <button class="btn-menu btn-secondary" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_change_time')}</button>
                    `;
                } else {
                    akcijeHtml = `
                        <div style="background: rgba(33, 150, 243, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2196F3;">
                            <p style="color: #2196F3; font-weight: bold; margin-bottom: 5px;">${tt('tourney_opp_proposal')}</p>
                            <p style="font-size: 1.1rem; color: var(--text-main); font-weight: bold;">${this.formatDate(match.proposedTime)}</p>
                        </div>
                        <button class="btn-menu" style="background: var(--success); color: white; border: none; margin-bottom: 10px; box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);" onclick="app.tournamentManager.acceptTime('${round}', ${index})">${tt('tourney_accept_time')}</button>
                        
                        <hr class="match-divider" style="margin: 15px 0;">
                        
                        <div style="text-align: left; margin-bottom: 10px;">
                            <label style="font-size: 0.7rem; color: var(--text-muted);">${tt('tourney_not_suit_q')}</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                        <button class="btn-menu btn-secondary" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_propose_other')}</button>
                    `;
                }
            } 
            else {
                akcijeHtml = `
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">${tt('tourney_no_time_yet')}</p>
                        <div style="text-align: left;">
                            <label style="font-size: 0.75rem; color: var(--gold-main); font-weight: bold; letter-spacing: 1px;">${tt('tourney_choose_datetime')}</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                    </div>
                    <button class="btn-menu btn-primary" onclick="app.tournamentManager.proposeTime('${round}', ${index})">${tt('tourney_schedule_match')}</button>
                `;
            }
        } 
        else {
            akcijeHtml = `<p style="color: var(--text-muted); font-size:0.8rem; padding: 20px 0;">${tt('tourney_not_your_match')}</p>`;
        }

        this.app.modal.alert(`
            <div style="text-align:center;">
                <h3 style="color:var(--gold-main); margin-bottom: 5px; font-size: 1.3rem;">${match.p1} <span style="color:var(--text-muted); font-size:0.8rem;">VS</span> ${match.p2}</h3>
                <hr class="match-divider" style="margin-bottom: 15px;">
                ${akcijeHtml}
            </div>
        `, tt('tourney_match_title'));
    }

    proposeTime(round, index) {
        const input = document.getElementById('tourney-time-input');
        if (!input || !input.value) {
            this.app.modal.alert(tt('tourney_alert_select_time') || "Izaberite vreme!", tt('tourney_alert_warning') || "Upozorenje");
            return;
        }

        this.app.soundMgr.click();
        
        if (this.app.socket) {
            this.app.socket.emit('tourney_propose_time', {
                round: round,
                index: index,
                proposedTime: input.value,
                playerName: this.app.playerName
            });
        }
        
        // Zatvori modal
        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none'; 
    }

    acceptTime(round, index) {
        this.app.soundMgr.click();
        
        if (this.app.socket) {
            this.app.socket.emit('tourney_accept_time', { round, index });
        }
        
        // Zatvori modal
        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }

    startDuel(round, index) {
        const match = this.state.bracket[round][index];
        const opponent = match.p1 === this.app.playerName ? match.p2 : match.p1;
        
        // Generišemo jedinstven roomId za ovaj turnirski meč
        const matchRoomId = `tourney_${round}_${index}_${Date.now()}`;
        
        this.app.soundMgr.click();
        
        if (this.app.socket) {
            // Šalje signal protivniku da je partija kreirana
            this.app.socket.emit('tourney_start_duel', { matchRoomId, opponentName: opponent });
        }
        
        // Zatvara modal i ubacuje igrača (hosta meča) u sobu
        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
        
        this.app.joinPrivateGame(this.app.playerName, matchRoomId);
    }

    mockWin(round, index) {
        this.app.soundMgr.click();
        
        if (this.app.socket) {
            this.app.socket.emit('tourney_submit_winner', { round, index, winner: this.app.playerName });
        }
        
        // Ako je ovo finale, pusti vatromet za sebe
        if (round === 'f') {
            setTimeout(() => this.app.effectMgr.trigger('fireworks'), 500);
        }

        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }
}