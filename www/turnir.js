// turnir.js - LOGIKA ZA ASINHRONE TURNIRE (POVEZANO SA SERVEROM) - ID BAZIRANA IDENTIFIKACIJA SA DVORANOM SLAVNIH

const tt = (key) => {
    if (typeof t === 'function') return t(key);
    return key;
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
                this.app.socket.on('tourney_state_update', (newState) => {
                    const oldStatus = this.state.status;
                    this.state = newState;
                    
                    if (oldStatus === 'registration' && newState.status !== 'registration') {
                        this.activeTab = 'bracket';
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
                    const myId = this.app.playerId; // KORISTIMO GLAVNI ID IZ APP-A (Koji je sada UID ako si logovan)
                    if (data.targetId === myId) {
                        let msg = tt('tourney_opponent_ready');
                        if (msg !== 'tourney_opponent_ready') {
                            msg = msg.replace('{0}', data.opponentName);
                        } else {
                            msg = `${data.opponentName} je pokrenuo vaš turnirski meč. Da li ulazite?`; 
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

    open() {
        this.activeTab = this.state.status === 'registration' ? 'info' : 'bracket';
        
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

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; align-items: center; padding: 0 10px;">
                
                <div style="display: flex; justify-content: space-between; width: 100%; gap: 10px; margin-bottom: 10px;">
                    <button class="tab-btn ${this.activeTab === 'info' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('info')" style="flex: 1; padding: 12px 5px; font-size: 0.75rem; border-radius: 8px; margin: 0;">
                        ${tt('tourney_tab_info') || '📋 INFO'}
                    </button>
                    <button class="tab-btn ${this.activeTab === 'bracket' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('bracket')" ${this.state.status === 'registration' ? 'disabled style="opacity:0.5"' : ''} style="flex: 1; padding: 12px 5px; font-size: 0.75rem; border-radius: 8px; margin: 0;">
                        ${tt('tourney_tab_bracket') || '🏆 KOSTUR'}
                    </button>
                </div>
                
                <div style="display: flex; justify-content: center; width: 100%; margin-bottom: 20px;">
                    <button class="tab-btn ${this.activeTab === 'leaderboard' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('leaderboard')" style="width: 100%; padding: 12px 15px; font-size: 0.85rem; border-radius: 8px; margin: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                        ${tt('tourney_tab_fame') || '👑 SLAVNI'}
                    </button>
                </div>
                
                <div id="tourney-tab-content" style="width: 100%; display: flex; justify-content: center;"></div>

            </div>
        `;

        const tabContent = document.getElementById('tourney-tab-content');
        
        if (this.activeTab === 'info') {
            this.renderRegistration(tabContent);
        } else if (this.activeTab === 'bracket') {
            this.renderBracket(tabContent);
        } else if (this.activeTab === 'leaderboard') {
            tabContent.innerHTML = this.getLeaderboardHTML();
        }
    }

    getLeaderboardHTML() {
        let leaderboardHtml = `
            <div class="modal-box tourney-leaderboard" style="width: 100%; max-width: 600px;">
                <div class="tourney-icon-large" style="font-size: 3rem;">👑</div>
                <h3 style="color: var(--gold-main); text-align: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 10px; text-transform: uppercase;">
                    ${tt('tourney_hall_of_fame') || 'DVORANA SLAVNIH (OSVAJAČI)'}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `;
        
        if (!this.tourneyLeaderboard || this.tourneyLeaderboard.length === 0) {
            leaderboardHtml += `<div style="text-align:center; color:var(--text-muted); font-size:0.9rem;">Još uvek nema osvajača turnira.</div>`;
        } else {
            this.tourneyLeaderboard.forEach((player, idx) => {
                let rankTrophy = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx+1}.`));
                leaderboardHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
                        <span style="color: white; font-weight: bold;">${rankTrophy} ${player.playerName}</span>
                        <span style="color: var(--gold-main); font-weight: 900;">${player.wins} 🏆</span>
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
            buttonHtml = `<button class="btn-menu btn-secondary" disabled style="opacity: 0.7; width: 100%;">🚀 ${isRegistered ? (tt('tourney_reg_active_in_progress') || 'Prijavljeni ste (Turnir u toku)') : (tt('tourney_reg_started') || 'Turnir je već počeo')}</button>`;
        } else if (isRegistered) {
            buttonHtml = `
                <button class="btn-menu btn-secondary" style="width: 100%; font-size: 1rem; padding: 15px; background: rgba(244, 67, 54, 0.2); border: 2px solid var(--danger); color: #ffcccc;" onclick="app.tournamentManager.unregisterPlayer()">
                    ❌ ${tt('tourney_unregister') || 'ODJAVI SE'} (Povraćaj 2500 💰)
                </button>
            `;
        } else {
            buttonHtml = `<button class="btn-menu btn-primary" style="width: 100%; font-size: 1.1rem; padding: 15px;" onclick="app.tournamentManager.registerPlayer()">🎟️ ${tt('tourney_register_me') || 'PRIJAVI SE'} (2500 💰)</button>`;
        }

        let participantsHtml = '';
        for (let i = 0; i < 8; i++) {
            if (this.state.players[i]) {
                const p = this.state.players[i];
                participantsHtml += `<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">${i+1}. ${p.id === myId ? `<strong style="color:var(--gold-main);">${p.name} ${tt('tourney_you') || '(Vi)'}</strong>` : p.name}</div>`;
            } else {
                participantsHtml += `<div style="padding: 4px 0; color: var(--text-muted); font-style: italic; border-bottom: 1px solid rgba(255,255,255,0.05); opacity: 0.6;">${i+1}. ${tt('tourney_empty_slot') || 'Slobodno mesto'}</div>`;
            }
        }

        container.innerHTML = `
            <div class="modal-box tourney-wrapper" style="width: 100%;">
                <div class="tourney-icon-large">🏆</div>
                <h3 class="tourney-title">${tt('tourney_weekly') || 'Nedeljni Turnir'}</h3>
                <p class="tourney-desc">${tt('tourney_desc') || 'Prijavite se za nedeljni turnir! 8 igrača se bori za prestiž i veliku nagradu.'}</p>
                
                <div class="tourney-stats-box">
                    <span class="tourney-stats-label">${tt('tourney_registered') || 'Prijavljeno igrača'}</span>
                    <div class="tourney-stats-value" style="color: ${isRegistrationOpen && spotsLeft === 0 ? 'var(--danger)' : 'var(--success)'};">
                        ${this.state.players.length} / 8
                    </div>
                    
                    <div style="margin-top: 15px; font-size: 0.9rem; color: var(--text-main); text-align: left; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                        <span style="display:block; color:var(--text-muted); font-size:0.75rem; margin-bottom:8px; text-transform:uppercase;">${tt('tourney_participants_list') || 'Spisak učesnika:'}</span>
                        ${participantsHtml}
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    ${buttonHtml}
                </div>
            </div>
        `;
    }

    registerPlayer() {
        this.app.soundMgr.click();

        if (this.state.status !== 'registration' || this.state.players.length >= 8) {
            this.app.modal.alert(tt('msg_room_full') || "Turnir je popunjen ili je već počeo!");
            return;
        }

        const fee = 2500;
        let currentBalance = parseInt(localStorage.getItem('yamb_dukati')) || 0;

        if (currentBalance < fee) {
            if(this.app.soundMgr.error) this.app.soundMgr.error();
            this.app.modal.alert(
                tt('tourney_not_enough_money') || `Nemate dovoljno dukata za prijavu!\nCena prijave je ${fee} 💰.`, 
                tt('warning_title') || "UPOZORENJE"
            );
            return;
        }

        const confirmMsg = tt('tourney_confirm_fee') || `Prijava za turnir košta ${fee} 💰.\nDa li želite da se prijavite?`;
        
        this.app.modal.confirm(confirmMsg).then(potvrda => {
            if (potvrda) {
                currentBalance -= fee;
                localStorage.setItem('yamb_dukati', currentBalance);
                
                if (window.statsManager) {
                    window.statsManager.stats.balance = currentBalance;
                    window.statsManager.saveStats();
                }

                // --- DODATO ZA CLOUD SYNC ---
                if (this.app && this.app.socket && this.app.socket.connected) {
                    this.app.socket.emit('set_player_data', {
                        uid: localStorage.getItem('yamb_uid') || this.app.playerId,
                        name: this.app.playerName,
                        stats: this.app.getFullLocalStats(),
                        playerId: this.app.playerId
                    });
                }
                
                if (typeof updateMainMenuDashboard === 'function') {
                    updateMainMenuDashboard();
                }

                if(this.app.socket) {
                    const playerData = {
                        id: this.app.playerId, 
                        name: this.app.playerName
                    };
                    this.app.socket.emit('tourney_register', playerData);
                }
            }
        });
    }

    async unregisterPlayer() {
        this.app.soundMgr.click();

        if (this.state.status !== 'registration') {
            this.app.modal.alert(tt('tourney_cannot_unregister') || "Turnir je već počeo, odjava više nije moguća!");
            return;
        }

        const confirmMsg = tt('tourney_confirm_unregister') || "Da li ste sigurni da želite da se odjavite sa turnira?\nPrikazaće se reklama pre povraćaja dukata.";
        const potvrda = await this.app.modal.confirm(confirmMsg);
        
        if (potvrda) {
            if (window.adMobGlobal && window.adMobGlobal.showInterstitial) {
                await window.adMobGlobal.showInterstitial();
            }

            const refundAmount = 2500;
            let currentBalance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
            currentBalance += refundAmount;
            
            localStorage.setItem('yamb_dukati', currentBalance);
            
            if (window.statsManager) {
                window.statsManager.stats.balance = currentBalance;
                window.statsManager.saveStats();
            }

            // --- DODATO ZA CLOUD SYNC ---
            if (this.app && this.app.socket && this.app.socket.connected) {
                this.app.socket.emit('set_player_data', {
                    uid: localStorage.getItem('yamb_uid') || this.app.playerId,
                    name: this.app.playerName,
                    stats: this.app.getFullLocalStats(),
                    playerId: this.app.playerId
                });
            }
            
            if (typeof updateMainMenuDashboard === 'function') {
                updateMainMenuDashboard();
            }

            if (this.app.socket) {
                const playerId = this.app.playerId;
                this.app.socket.emit('tourney_unregister', playerId);
            }
            
            this.app.modal.alert(
                tt('tourney_unregistered_success') || "Uspešno ste se odjavili. Vraćeno Vam je 2500 💰.", 
                tt('modal_title_info') || "INFO"
            );
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

    renderBracket(container) {
        const qf = this.state.bracket.qf || [];
        const sf = this.state.bracket.sf || [];
        const f = this.state.bracket.f || [];

        container.innerHTML = `
            <div class="bracket-wrapper" style="width: 100%;">
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

        const myId = this.app.playerId;
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
            timeInfo = `<div class="match-time-badge pending">${tt('tourney_negotiating') || 'Dogovor u toku...'}</div>`;
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

    openMatchModal(round, index) {
        const match = this.state.bracket[round][index];
        if (!match || !match.p1 || !match.p2) return;

        const myId = this.app.playerId;
        const isMyMatch = match.p1.id === myId || match.p2.id === myId;
        let akcijeHtml = '';

        if (match.winnerId) {
            const winnerName = match.winnerId === match.p1.id ? match.p1.name : match.p2.name;
            akcijeHtml = `<p style="color: var(--success); font-size: 1.1rem; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">${tt('tourney_winner') || 'Pobednik:'} <strong style="text-transform: uppercase;">${winnerName}</strong> 🏆</p>`;
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
        
        this.app.modal.alert(`
            <div style="text-align:center;">
                <h3 style="color:var(--gold-main); margin-bottom: 5px; font-size: 1.4rem;">${match.p1.name} <span style="color:var(--text-muted); font-size:0.9rem;">VS</span> ${match.p2.name}</h3>
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
        
        const matchRoomId = `tourney_${round}_${index}_${Date.now()}`;
        
        this.app.soundMgr.click();
        
        if (this.app.socket) {
            this.app.socket.emit('tourney_start_duel', { matchRoomId, targetId: opponent.id, opponentName: opponent.name });
        }
        
        const overlay = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (overlay) overlay.style.display = 'none';
    }
}