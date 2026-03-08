// turnir.js - LOGIKA ZA ASINHRONE TURNIRE (POVEZANO SA SERVEROM) - ID BAZIRANA IDENTIFIKACIJA

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
            players: [], // Sada sadrži objekte: { id: "usr_...", name: "Ime" }
            bracket: { qf: [], sf: [], f: [] }
        };

        this.activeTab = 'info'; // 'info' ili 'bracket'
        
        if (this.app) {
            this.app.openTournament = () => this.open();
        }

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if(this.app && !this.app.socket) {
            this.app.initSocketConnection();
        }

        setTimeout(() => {
            if(this.app && this.app.socket) {
                // 1. Kada server pošalje novo stanje, osveži UI
                this.app.socket.on('tourney_state_update', (newState) => {
                    const oldStatus = this.state.status;
                    this.state = newState;
                    
                    // Ako se turnir upravo napunio i prešao iz prijave u kostur, automatski prebaci tab
                    if (oldStatus === 'registration' && newState.status !== 'registration') {
                        this.activeTab = 'bracket';
                    }

                    if(document.getElementById('tournament-screen').classList.contains('active')) {
                        this.render();
                    }
                });

                // 2. Slušač za pokretanje meča od strane protivnika (PROVERA PREKO ID-ja)
                this.app.socket.on('tourney_duel_ready', (data) => {
                    const myId = localStorage.getItem('yamb_player_id');
                    if (data.targetId === myId) {
                        this.app.modal.confirm(tt('tourney_opponent_ready') || `${data.opponentName} je pokrenuo vaš turnirski meč. Da li ulazite?`).then(acc => {
                            if(acc) {
                                this.app.joinPrivateGame(this.app.playerName, data.matchRoomId);
                            }
                        });
                    }
                });

                // 3. Dozvola servera da je protivnik online i da možete ući u sobu (KORAK 3)
                this.app.socket.on('tourney_join_allowed', (matchRoomId) => {
                    this.app.joinPrivateGame(this.app.playerName, matchRoomId);
                });
            }
        }, 1000);
    }

    open() {
        // Pametno biranje početnog taba pri otvaranju ekrana
        this.activeTab = this.state.status === 'registration' ? 'info' : 'bracket';
        
        this.app.navigateTo('tournament-screen');
        if(this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('tourney_get_state');
        } else {
            this.app.initSocketConnection();
            setTimeout(() => { if(this.app.socket) this.app.socket.emit('tourney_get_state'); }, 500);
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

        // Glavni kontejner sa Tab navigacijom
        container.innerHTML = `
            <div class="nav-tabs" style="justify-content: center; margin-bottom: 20px;">
                <button class="tab-btn ${this.activeTab === 'info' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('info')">📋 INFO PRIJAVE</button>
                <button class="tab-btn ${this.activeTab === 'bracket' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('bracket')" ${this.state.status === 'registration' ? 'disabled style="opacity:0.5"' : ''}>🏆 KOSTUR MEČEVA</button>
            </div>
            <div id="tourney-tab-content"></div>
        `;

        const tabContent = document.getElementById('tourney-tab-content');
        
        if (this.activeTab === 'info') {
            this.renderRegistration(tabContent);
        } else {
            this.renderBracket(tabContent);
        }
    }

    // --- FAZA PRIJAVE / INFO KARTICA ---
    renderRegistration(container) {
        const myId = localStorage.getItem('yamb_player_id');
        const isRegistered = this.state.players.some(p => p.id === myId);
        const isRegistrationOpen = this.state.status === 'registration';
        const spotsLeft = 8 - this.state.players.length;

        let buttonHtml = '';
        if (!isRegistrationOpen) {
            buttonHtml = `<button class="btn-menu btn-secondary" disabled style="opacity: 0.7; width: 100%;">🚀 ${isRegistered ? 'Prijavljeni ste (Turnir u toku)' : 'Turnir je već počeo'}</button>`;
        } else if (isRegistered) {
            buttonHtml = `<button class="btn-menu btn-secondary" disabled style="opacity: 0.7; width: 100%;">✅ ${tt('tourney_already_registered') || 'Već ste prijavljeni'}</button>`;
        } else {
            buttonHtml = `<button class="btn-menu btn-primary" style="width: 100%; font-size: 1.1rem; padding: 15px;" onclick="app.tournamentManager.registerPlayer()">📝 ${tt('tourney_register_me') || 'PRIJAVI SE'}</button>`;
        }

        container.innerHTML = `
            <div class="modal-box tourney-wrapper">
                <div class="tourney-icon-large">🏆</div>
                <h3 class="tourney-title">${tt('tourney_weekly') || 'Nedeljni Turnir'}</h3>
                <p class="tourney-desc">${tt('tourney_desc') || 'Prijavite se za nedeljni turnir! 8 igrača se bori za prestiž i veliku nagradu.'}</p>
                
                <div class="tourney-stats-box">
                    <span class="tourney-stats-label">${tt('tourney_registered') || 'Prijavljeno igrača'}</span>
                    <div class="tourney-stats-value" style="color: ${isRegistrationOpen && spotsLeft === 0 ? 'var(--danger)' : 'var(--success)'};">
                        ${this.state.players.length} / 8
                    </div>
                    
                    <div style="margin-top: 15px; font-size: 0.8rem; color: var(--text-main); max-height: 120px; overflow-y: auto; text-align: left; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                        <span style="display:block; color:var(--text-muted); font-size:0.7rem; margin-bottom:5px;">Spisak učesnika:</span>
                        ${this.state.players.length > 0 ? 
                            this.state.players.map(p => `<div style="padding: 2px 0;">${p.id === myId ? `<strong style="color:var(--gold-main);">${p.name} (Vi)</strong>` : p.name}</div>`).join('') 
                            : '<div style="color:var(--text-muted); font-style:italic;">Još uvek nema prijavljenih igrača.</div>'}
                    </div>
                </div>

                <div>
                    ${buttonHtml}
                </div>
                
                <div class="dev-tools-box">
                    <p class="dev-tools-label">🧪 TEST OPCIJE (Samo za razvoj):</p>
                    
                    ${isRegistrationOpen && spotsLeft > 0 ? `
                    <button class="btn-menu btn-secondary" style="font-size: 0.8rem; padding: 10px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 5px;" onclick="app.tournamentManager.fillWithBots()">
                        🤖 ${tt('tourney_dev_fill') || 'Popuni botovima (Simulacija)'}
                    </button>
                    ` : ''}

                    <button class="btn-menu" style="font-size: 0.8rem; padding: 10px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255, 82, 82, 0.2); border: 1px solid var(--danger); color: var(--danger);" onclick="app.tournamentManager.resetTournament()">
                        🗑️ Resetuj Turnir (Obriši sve)
                    </button>
                </div>
            </div>
        `;
    }

    registerPlayer() {
        this.app.soundMgr.click();
        if(this.app.socket) {
            const playerData = {
                id: localStorage.getItem('yamb_player_id'),
                name: this.app.playerName
            };
            this.app.socket.emit('tourney_register', playerData);
        }
    }

    fillWithBots() {
        if(this.app.socket) {
            this.app.socket.emit('tourney_fill_bots');
        }
    }

    resetTournament() {
        this.app.soundMgr.click();
        if(this.app.socket) {
            this.app.socket.emit('tourney_reset');
            this.app.modal.alert("Poslat zahtev za resetovanje turnira na server.", "DEV OPCIJA");
        }
    }

    // --- FAZA IGRANJA (BRACKET KOSTUR KARTICA) ---
    formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const locale = lang === 'en' ? 'en-GB' : 'sr-RS';
        const atStr = lang === 'en' ? 'at' : 'u';
        return d.toLocaleDateString(locale) + ` ${atStr} ` + d.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'});
    }

    renderBracket(container) {
        const qf = this.state.bracket.qf || [];
        const sf = this.state.bracket.sf || [];
        const f = this.state.bracket.f || [];

        container.innerHTML = `
            <div class="bracket-wrapper">
                <div class="bracket-col qf">
                    <div class="bracket-header">${tt('tourney_qf') || 'ČETVRTFINALE'}</div>
                    ${qf.map((m, i) => this.createMatchHTML(m, 'qf', i)).join('')}
                </div>
                
                <div class="bracket-col sf">
                    <div class="bracket-header">${tt('tourney_sf') || 'POLUFINALE'}</div>
                    ${sf.map((m, i) => this.createMatchHTML(m, 'sf', i)).join('')}
                </div>
                
                <div class="bracket-col f">
                    <div class="bracket-header final">${tt('tourney_f') || 'FINALE'}</div>
                    ${f.map((m, i) => this.createMatchHTML(m, 'f', i)).join('')}
                </div>
            </div>
        `;
    }

    createMatchHTML(match, round, index) {
        if (!match || !match.p1 || !match.p2) {
            return `
                <div class="match-card empty">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${tt('tourney_tbd') || 'Čeka se...'}</span>
                    <hr class="match-divider">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${tt('tourney_tbd') || 'Čeka se...'}</span>
                </div>`;
        }

        const myId = localStorage.getItem('yamb_player_id');
        const isMyMatch = match.p1.id === myId || match.p2.id === myId;
        const activeClass = isMyMatch ? 'my-match' : '';
        
        const getPlayerClass = (playerId) => {
            if (match.winnerId === playerId) return `winner`;
            if (match.winnerId) return `loser`;
            return ``;
        };

        let timeInfo = '';
        if (match.timeAccepted && match.time) {
            timeInfo = `<div class="match-time-badge">✅ ${this.formatDate(match.time)}</div>`;
        } else if (match.proposedTime) {
            timeInfo = `<div class="match-time-badge pending">Dogovor u toku...</div>`;
        }

        return `
            <div class="match-card ${activeClass}" onclick="app.tournamentManager.openMatchModal('${round}', ${index})">
                <div class="match-player ${getPlayerClass(match.p1.id)}">${match.p1.name}</div>
                <hr class="match-divider">
                <div class="match-player ${getPlayerClass(match.p2.id)}">${match.p2.name}</div>
                ${timeInfo}
            </div>
        `;
    }

    // --- MODAL ZA DOGOVOR / POKRETANJE MEČA ---
    openMatchModal(round, index) {
        const match = this.state.bracket[round][index];
        if (!match || !match.p1 || !match.p2) return;

        const myId = localStorage.getItem('yamb_player_id');
        const isMyMatch = match.p1.id === myId || match.p2.id === myId;
        let akcijeHtml = '';

        if (match.winnerId) {
            const winnerName = match.winnerId === match.p1.id ? match.p1.name : match.p2.name;
            akcijeHtml = `<p style="color: var(--success); font-size: 1.1rem; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">Pobednik: <strong style="text-transform: uppercase;">${winnerName}</strong> 🏆</p>`;
        } 
        else if (isMyMatch) {
            let devActionHtml = `
                <div style="margin-top: 25px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px;">
                    <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 10px;">🧪 TEST OPCIJA (Preskoči meč):</p>
                    <button class="btn-menu btn-secondary" style="font-size: 0.8rem; padding: 8px; width: 100%; border: 1px solid rgba(255,255,255,0.2);" onclick="app.tournamentManager.mockWin('${round}', ${index})">
                        👑 Simuliraj moju pobedu
                    </button>
                </div>
            `;

            if (match.timeAccepted) {
                akcijeHtml = `
                    <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--success);">
                        <p style="color: var(--success); font-weight: bold; margin-bottom: 5px;">${tt('tourney_time_agreed') || 'Vreme meča je dogovoreno!'}</p>
                        <p style="font-size: 1.1rem;">${this.formatDate(match.time)}</p>
                    </div>
                    <button class="btn-menu btn-primary" style="width: 100%; font-size: 1.1rem; padding: 15px;" onclick="app.tournamentManager.startDuel('${round}', ${index})">▶ ${tt('tourney_start_match') || 'POKRENI MEČ'}</button>
                    ${devActionHtml}
                `;
            } 
            else if (match.proposedTime) {
                if (match.proposedById === myId) {
                    akcijeHtml = `
                        <div style="background: rgba(255, 152, 0, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #ff9800;">
                            <p style="color: #ff9800; font-weight: bold; margin-bottom: 5px;">Čeka se odgovor protivnika</p>
                            <p style="font-size: 0.9rem; color: var(--text-main);">Predložili ste: <strong>${this.formatDate(match.proposedTime)}</strong></p>
                        </div>
                        <div style="text-align: left; margin-bottom: 10px;">
                            <label style="font-size: 0.75rem; color: var(--text-muted);">Želite da promenite termin?</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                        <button class="btn-menu btn-secondary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">Promeni predlog</button>
                        ${devActionHtml}
                    `;
                } else {
                    akcijeHtml = `
                        <div style="background: rgba(33, 150, 243, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2196F3;">
                            <p style="color: #2196F3; font-weight: bold; margin-bottom: 5px;">Protivnik predlaže vreme:</p>
                            <p style="font-size: 1.1rem; color: var(--text-main); font-weight: bold;">${this.formatDate(match.proposedTime)}</p>
                        </div>
                        <button class="btn-menu" style="width: 100%; background: var(--success); color: white; border: none; margin-bottom: 15px; padding: 15px; box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);" onclick="app.tournamentManager.acceptTime('${round}', ${index})">✅ PRIHVATI TERMIN</button>
                        
                        <hr style="border: 0; border-top: 1px dashed rgba(255,255,255,0.1); margin: 15px 0;">
                        
                        <div style="text-align: left; margin-bottom: 10px;">
                            <label style="font-size: 0.75rem; color: var(--text-muted);">Ne odgovara Vam? Predložite drugo vreme:</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                        <button class="btn-menu btn-secondary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">Predloži novo vreme</button>
                        ${devActionHtml}
                    `;
                }
            } 
            else {
                akcijeHtml = `
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--glass-border);">
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">Vreme odigravanja meča još uvek nije zakazano.</p>
                        <div style="text-align: left;">
                            <label style="font-size: 0.75rem; color: var(--gold-main); font-weight: bold; letter-spacing: 1px;">Izaberite termin za meč:</label>
                            <input type="datetime-local" id="tourney-time-input" class="modal-input" style="margin-top: 5px; font-size: 1rem;">
                        </div>
                    </div>
                    <button class="btn-menu btn-primary" style="width: 100%;" onclick="app.tournamentManager.proposeTime('${round}', ${index})">Zakaži meč</button>
                    ${devActionHtml}
                `;
            }
        } 
        else {
            akcijeHtml = `<p style="color: var(--text-muted); font-size:0.85rem; padding: 20px 0; background: rgba(0,0,0,0.2); border-radius: 8px;">Ovo nije Vaš meč. Čekamo ishod ovog duela.</p>`;
        }

        this.app.modal.alert(`
            <div style="text-align:center;">
                <h3 style="color:var(--gold-main); margin-bottom: 5px; font-size: 1.4rem;">${match.p1.name} <span style="color:var(--text-muted); font-size:0.9rem;">VS</span> ${match.p2.name}</h3>
                <hr style="border: 0; border-top: 1px solid rgba(255,215,0,0.2); margin: 15px 0;">
                ${akcijeHtml}
            </div>
        `, 'TURNIRSKI MEČ ⚔️');
    }

    proposeTime(round, index) {
        const input = document.getElementById('tourney-time-input');
        if (!input || !input.value) {
            this.app.modal.alert("Molimo Vas da prvo izaberete vreme u kalendaru!", "UPOZORENJE");
            return;
        }

        this.app.soundMgr.click();
        
        if (this.app.socket) {
            this.app.socket.emit('tourney_propose_time', {
                round: round,
                index: index,
                proposedTime: input.value,
                playerId: localStorage.getItem('yamb_player_id')
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
        const myId = localStorage.getItem('yamb_player_id');
        const opponent = match.p1.id === myId ? match.p2 : match.p1;
        
        const matchRoomId = `tourney_${round}_${index}_${Date.now()}`;
        
        this.app.soundMgr.click();
        
        if (this.app.socket) {
            // Šaljemo Target ID kako bi server bio 100% precizan koga zove
            this.app.socket.emit('tourney_start_duel', { matchRoomId, targetId: opponent.id, opponentName: opponent.name });
        }
        
        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
        
        // UKLONJENO OTVARANJE SOBE OVDJE - Sada čekamo odobrenje servera (tourney_join_allowed event)
    }

    mockWin(round, index) {
        this.app.soundMgr.click();
        const myId = localStorage.getItem('yamb_player_id');
        
        if (this.app.socket) {
            this.app.socket.emit('tourney_submit_winner', { round, index, winnerId: myId });
        }
        
        if (round === 'f') {
            setTimeout(() => this.app.effectMgr.trigger('fireworks'), 500);
        }

        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }
}