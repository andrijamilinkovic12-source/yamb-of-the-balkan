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
                    
                    if (this.app && this.app.playerId) {
                        const myId = this.app.playerId;
                        const isRegisteredServer = newState.players && newState.players.some(p => p.id === myId);
                        
                        const storageKey = 'yamb_tourney_reg_' + myId;
                        const localRegTime = localStorage.getItem(storageKey);

                        if (newState.status === 'registration' && localRegTime && !isRegisteredServer) {
                            const now = Date.now();
                            const regTime = parseInt(localRegTime, 10);
                            
                            if (now - regTime < 518400000) {
                                const playerData = {
                                    id: this.app.playerId, 
                                    name: this.app.playerName,
                                    photoUrl: localStorage.getItem('yamb_player_photo') || ''
                                };
                                this.app.socket.emit('tourney_register', playerData);
                            } else {
                                localStorage.removeItem(storageKey);
                            }
                        }

                        if (newState.status !== 'registration' && newState.bracket && newState.bracket.f && newState.bracket.f[0] && newState.bracket.f[0].winnerId) {
                            localStorage.removeItem(storageKey);
                        }
                    }

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
                    const myId = this.app.playerId;
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
        container.style.alignItems = "center";
        
        container.style.height = "";
        container.style.paddingTop = "";
        container.style.paddingBottom = "";

        container.innerHTML = `
            <div class="modal-box" style="width: 95%; max-width: 500px; flex: 1; min-height: 0; max-height: 85vh; padding: 0 !important; overflow: hidden; display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.95) 100%); border: 2px solid var(--gold-main); box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-radius: 15px; margin-bottom: 10px;">
                
                <div style="display: flex; width: 100%; background: rgba(0,0,0,0.6); border-bottom: 2px solid rgba(255,215,0,0.3); flex-shrink: 0;">
                    <button style="flex: 1; padding: 15px 5px; font-size: 0.8rem; border: none; background: transparent; border-bottom: ${this.activeTab === 'info' ? '3px solid var(--gold-main)' : '3px solid transparent'}; color: ${this.activeTab === 'info' ? 'var(--gold-main)' : 'var(--text-muted)'}; font-weight: 800; transition: all 0.2s; border-radius: 0; outline: none; cursor: pointer;" onclick="app.tournamentManager.switchTab('info')">
                        ${tt('tourney_tab_info') || '📋 INFO'}
                    </button>
                    <button style="flex: 1; padding: 15px 5px; font-size: 0.8rem; border: none; background: transparent; border-bottom: ${this.activeTab === 'bracket' ? '3px solid var(--gold-main)' : '3px solid transparent'}; color: ${this.activeTab === 'bracket' ? 'var(--gold-main)' : 'var(--text-muted)'}; font-weight: 800; transition: all 0.2s; border-radius: 0; outline: none; cursor: pointer;" onclick="app.tournamentManager.switchTab('bracket')">
                        ${tt('tourney_tab_bracket') || '🏆 KOSTUR'}
                    </button>
                    <button style="flex: 1; padding: 15px 5px; font-size: 0.8rem; border: none; background: transparent; border-bottom: ${this.activeTab === 'leaderboard' ? '3px solid var(--gold-main)' : '3px solid transparent'}; color: ${this.activeTab === 'leaderboard' ? 'var(--gold-main)' : 'var(--text-muted)'}; font-weight: 800; transition: all 0.2s; border-radius: 0; outline: none; cursor: pointer;" onclick="app.tournamentManager.switchTab('leaderboard')">
                        ${tt('tourney_tab_fame') || '👑 SLAVNI'}
                    </button>
                </div>
                
                <div id="tourney-tab-content" style="width: 100%; flex: 1; display: flex; flex-direction: column; align-items: center; box-sizing: border-box;"></div>

            </div>
        `;

        const tabContent = document.getElementById('tourney-tab-content');
        
        // Podešavanje Padinga i Overflowa na osnovu taba (Kostur ne sme da skroluje)
        if (this.activeTab === 'bracket') {
            tabContent.style.padding = '10px 5px';
            tabContent.style.overflowY = 'hidden';
            tabContent.style.overflowX = 'hidden';
            this.renderBracket(tabContent);
        } else if (this.activeTab === 'info') {
            tabContent.style.padding = '20px 10px';
            tabContent.style.overflowY = 'auto';
            this.renderRegistration(tabContent);
        } else if (this.activeTab === 'leaderboard') {
            tabContent.style.padding = '20px 10px';
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
            leaderboardHtml += `<div style="text-align:center; color:var(--text-muted); font-size:1rem; padding: 40px 0;">Još uvek nema osvajača turnira.</div>`;
        } else {
            this.tourneyLeaderboard.forEach((player, idx) => {
                let rankTrophy = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `<span style="color: var(--text-muted); font-size: 1.1rem; font-weight: bold;">${idx+1}.</span>`));
                let photo = player.photoUrl && player.photoUrl.length > 5 ? player.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=333&color=E0C995`;
                
                let bg = idx === 0 ? 'background: linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0.4) 100%); border: 1px solid var(--gold-main);' : 'background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);';
                let nameColor = idx === 0 ? 'var(--gold-main)' : 'white';
                let nameSize = idx === 0 ? '1.1rem' : '1rem';
                
                leaderboardHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; ${bg} padding: 10px 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 15px; overflow: hidden; flex: 1;">
                            <div style="font-size: 1.4rem; min-width: 30px; text-align: center; flex-shrink: 0;">${rankTrophy}</div>
                            <img src="${photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${idx === 0 ? 'var(--gold-main)' : 'rgba(255,255,255,0.3)'}; flex-shrink: 0; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
                            <span style="color: ${nameColor}; font-weight: 800; font-size: ${nameSize}; white-space: normal; word-break: break-word; line-height: 1.2;">${player.playerName}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 20px; border: 1px solid rgba(255,215,0,0.3);">
                            <span style="color: var(--gold-main); font-weight: 900; font-size: 1.1rem; flex-shrink: 0;">${player.wins}</span>
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
            buttonHtml = `<button class="btn-menu btn-secondary" disabled style="opacity: 0.7; width: 100%; margin-top: auto;">🚀 ${isRegistered ? (tt('tourney_reg_active_in_progress') || 'Prijavljeni ste (Turnir u toku)') : (tt('tourney_reg_started') || 'Turnir je već počeo')}</button>`;
        } else if (isRegistered) {
            buttonHtml = `
                <button class="btn-menu btn-secondary" style="width: 100%; font-size: 0.95rem; padding: 15px; background: rgba(244, 67, 54, 0.2); border: 2px solid var(--danger); color: #ffcccc; margin-top: auto;" onclick="app.tournamentManager.unregisterPlayer()">
                    ❌ ${tt('tourney_unregister') || 'ODJAVI SE'} (Povraćaj)
                </button>
            `;
        } else {
            buttonHtml = `<button class="btn-menu btn-primary" style="width: 100%; font-size: 1rem; padding: 15px; box-shadow: 0 0 15px var(--gold-glow); margin-top: auto;" onclick="app.tournamentManager.registerPlayer()">🎟️ ${tt('tourney_register_me') || 'PRIJAVI SE'} (2500 💰)</button>`;
        }

        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; max-width: 350px;">
                <div class="tourney-icon-large" style="font-size: 4.5rem; margin-bottom: 10px; text-shadow: 0 0 15px var(--gold-main); text-align: center;">🏆</div>
                <h3 style="font-size: 1.4rem; margin-bottom: 5px; text-align: center; color: var(--gold-main); text-transform: uppercase; letter-spacing: 1px;">${tt('tourney_weekly') || 'Nedeljni Turnir'}</h3>
                <p style="font-size: 0.85rem; margin-bottom: 25px; text-align: center; color: var(--text-muted); line-height: 1.4;">${tt('tourney_desc') || 'Prijavite se za nedeljni turnir! 8 igrača se bori za prestiž i veliku nagradu.'}</p>
                
                <div style="font-size: 1.1rem; font-weight: 800; text-align: center; color: ${isRegistrationOpen && spotsLeft === 0 ? 'var(--danger)' : 'var(--text-main)'}; margin-bottom: auto; background: rgba(0,0,0,0.4); padding: 15px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); width: 100%; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                    <span style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">${tt('tourney_registered') || 'Prijavljeno igrača'}</span><br>
                    <div style="font-size: 2.2rem; color: ${isRegistrationOpen && spotsLeft === 0 ? 'var(--danger)' : 'var(--success)'}; margin-top: 5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${this.state.players.length} <span style="font-size: 1.2rem; color: var(--text-muted);">/ 8</span></div>
                </div>

                <div style="width: 100%; display: flex; flex-direction: column; margin-top: 25px;">
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
                
                localStorage.setItem('yamb_tourney_reg_' + this.app.playerId, Date.now().toString());
                
                if (window.statsManager) {
                    window.statsManager.stats.balance = currentBalance;
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
                
                if (typeof updateMainMenuDashboard === 'function') {
                    updateMainMenuDashboard();
                }

                if(this.app.socket) {
                    const playerData = {
                        id: this.app.playerId, 
                        name: this.app.playerName,
                        photoUrl: localStorage.getItem('yamb_player_photo') || ''
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

            localStorage.removeItem('yamb_tourney_reg_' + this.app.playerId);

            const refundAmount = 2500;
            let currentBalance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
            currentBalance += refundAmount;
            
            localStorage.setItem('yamb_dukati', currentBalance);
            
            if (window.statsManager) {
                window.statsManager.stats.balance = currentBalance;
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
        let qf = this.state.bracket.qf || [];
        let sf = this.state.bracket.sf || [];
        let f = this.state.bracket.f || [];

        if (this.state.status === 'registration') {
            qf = Array(4).fill(null).map((_, i) => {
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
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                
                <div style="display: flex; flex-direction: row; width: 100%; padding-bottom: 8px; border-bottom: 1px solid rgba(255,215,0,0.2); margin-bottom: 5px; flex-shrink: 0;">
                    <div style="flex: 1; text-align: center; font-size: 0.75rem; color: var(--gold-main); font-weight: 900; letter-spacing: 1px;">1/4</div>
                    <div style="flex: 1; text-align: center; font-size: 0.75rem; color: var(--gold-main); font-weight: 900; letter-spacing: 1px;">1/2</div>
                    <div style="flex: 1; text-align: center; font-size: 0.75rem; color: var(--gold-main); font-weight: 900; letter-spacing: 1px;">FINALE</div>
                </div>

                <div style="display: flex; flex-direction: row; width: 100%; flex: 1; gap: 6px; position: relative;">
                    
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; position: relative;">
                        ${qf.map((m, i) => this.createMatchHTML(m, 'qf', i)).join('')}
                    </div>

                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; position: relative;">
                        ${sf.map((m, i) => this.createMatchHTML(m, 'sf', i)).join('')}
                    </div>

                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; position: relative;">
                        ${f.map((m, i) => this.createMatchHTML(m, 'f', i)).join('')}
                    </div>

                </div>
            </div>
        `;
    }

    createMatchHTML(match, round, index) {
        if (!match || (!match.p1 && !match.p2)) {
            return `
                <div style="width: 100%; background: rgba(0,0,0,0.4); border: 1px dashed rgba(255,215,0,0.3); border-radius: 6px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 4px; box-sizing: border-box; min-height: 45px;">
                    <span style="color: rgba(255,255,255,0.3); font-size: 0.6rem; font-weight: bold;">---</span>
                </div>`;
        }

        const myId = this.app.playerId;
        const isMyMatch = (match.p1 && match.p1.id === myId) || (match.p2 && match.p2.id === myId);
        
        const getPlayerHtml = (p, isTop) => {
            if (!p) {
                return `
                    <div style="display: flex; align-items: center; padding: 3px 4px; ${isTop ? 'border-bottom: 1px solid rgba(255,215,0,0.1);' : ''}">
                        <div style="width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.1); margin-right: 4px; flex-shrink: 0;"></div>
                        <span style="color: rgba(255,255,255,0.3); font-size: 0.6rem;">---</span>
                    </div>`;
            }
            
            let photo = p.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=333&color=E0C995`;
            let isWinner = match.winnerId === p.id;
            let isLoser = match.winnerId && match.winnerId !== p.id;
            
            let opacity = isLoser ? '0.4' : '1';
            let filter = isLoser ? 'grayscale(100%)' : 'none';
            let nameColor = isWinner ? 'var(--success)' : 'var(--text-main)';
            let fontWeight = isWinner ? '900' : '600';
            
            return `
                <div style="display: flex; align-items: center; padding: 3px 4px; ${isTop ? 'border-bottom: 1px solid rgba(255,215,0,0.1);' : ''} opacity: ${opacity}; filter: ${filter};">
                    <img src="${photo}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid ${isWinner ? 'var(--success)' : 'rgba(255,215,0,0.4)'}; margin-right: 4px; flex-shrink: 0;">
                    <span style="font-size: 0.6rem; font-weight: ${fontWeight}; color: ${nameColor}; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${p.name}</span>
                </div>
            `;
        };

        let statusDot = '';
        if (match.timeAccepted && match.time) {
            statusDot = `<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 4px var(--success);"></div>`;
        } else if (match.proposedTime) {
            statusDot = `<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: #ff9800; border-radius: 50%; box-shadow: 0 0 4px #ff9800;"></div>`;
        }

        return `
            <div onclick="app.tournamentManager.openMatchModal('${round}', ${index})" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid ${isMyMatch ? 'var(--gold-main)' : 'rgba(255,255,255,0.1)'}; border-radius: 6px; display: flex; flex-direction: column; cursor: pointer; position: relative; box-shadow: ${isMyMatch ? '0 0 8px rgba(255,215,0,0.3)' : 'none'}; transition: transform 0.1s; transform: scale(0.98);">
                ${statusDot}
                ${getPlayerHtml(match.p1, true)}
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