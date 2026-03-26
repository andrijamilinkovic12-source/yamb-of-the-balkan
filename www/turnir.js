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
                    
                    // --- AUTO-RESTORE PRIJAVE (SPREČAVA GUBITAK DUKATA I PRIJAVE) ---
                    if (this.app && this.app.playerId) {
                        const myId = this.app.playerId;
                        const isRegisteredServer = newState.players && newState.players.some(p => p.id === myId);
                        
                        // OBAVEZNO VEZUJEMO ZA UID KORISNIKA
                        const storageKey = 'yamb_tourney_reg_' + myId;
                        const localRegTime = localStorage.getItem(storageKey);

                        // Ako imamo sačuvanu prijavu lokalno, a server nas je zaboravio (npr. prekid konekcije)
                        if (newState.status === 'registration' && localRegTime && !isRegisteredServer) {
                            const now = Date.now();
                            const regTime = parseInt(localRegTime, 10);
                            
                            // Validnost prijave je 6 dana (518400000 ms)
                            if (now - regTime < 518400000) {
                                // Vraćamo prijavu na server automatski
                                const playerData = {
                                    id: this.app.playerId, 
                                    name: this.app.playerName,
                                    photoUrl: localStorage.getItem('yamb_player_photo') || ''
                                };
                                this.app.socket.emit('tourney_register', playerData);
                            } else {
                                // Prijava je previše stara
                                localStorage.removeItem(storageKey);
                            }
                        }

                        // Ako je turnir završen, čistimo staru prijavu
                        if (newState.status !== 'registration' && newState.bracket && newState.bracket.f && newState.bracket.f[0] && newState.bracket.f[0].winnerId) {
                            localStorage.removeItem(storageKey);
                        }
                    }
                    // -------------------------------------------------------------

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

        // Obezbeđujemo "safe-area" margine za moderne telefone (gornja traka i donji dugmići)
        container.style.height = "100%"; 
        container.style.flex = "1";
        container.style.overflow = "hidden";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.boxSizing = "border-box"; // Sprečava da padding probije visinu ekrana
        
        // Povećan padding za vrh i dno uz korišćenje sistemskih promenljivih
        container.style.paddingTop = "max(45px, env(safe-area-inset-top))"; 
        container.style.paddingBottom = "max(40px, env(safe-area-inset-bottom))"; 

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; align-items: center; padding: 0 5px; box-sizing: border-box;">
                
                <div style="display: flex; justify-content: space-between; width: 100%; max-width: 400px; gap: 10px; margin-bottom: 15px; flex-shrink: 0;">
                    <button class="tab-btn ${this.activeTab === 'info' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('info')" style="flex: 1; padding: 12px 5px; font-size: 0.75rem; border-radius: 8px; margin: 0;">
                        ${tt('tourney_tab_info') || '📋 INFO'}
                    </button>
                    <button class="tab-btn ${this.activeTab === 'bracket' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('bracket')" style="flex: 1; padding: 12px 5px; font-size: 0.75rem; border-radius: 8px; margin: 0;">
                        ${tt('tourney_tab_bracket') || '🏆 KOSTUR'}
                    </button>
                    <button class="tab-btn ${this.activeTab === 'leaderboard' ? 'active' : ''}" onclick="app.tournamentManager.switchTab('leaderboard')" style="flex: 1; padding: 12px 5px; font-size: 0.75rem; border-radius: 8px; margin: 0;">
                        ${tt('tourney_tab_fame') || '👑 SLAVNI'}
                    </button>
                </div>
                
                <div id="tourney-tab-content" style="width: 100%; flex: 1; display: flex; justify-content: center; overflow: hidden; max-width: 450px;"></div>

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
            <div class="modal-box tourney-leaderboard" style="width: 100%; height: 100%; max-height: 100%; max-width: 400px; padding: 25px 20px; overflow-y: auto; justify-content: flex-start; background: linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.95) 100%); border: 2px solid var(--gold-main); box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-radius: 15px;">
                <div class="tourney-icon-large" style="font-size: 3.5rem; margin-bottom: 10px; text-shadow: 0 0 15px var(--gold-main); text-align: center;">👑</div>
                <h3 style="color: var(--gold-main); text-align: center; margin-bottom: 20px; border-bottom: 2px solid rgba(255,215,0,0.3); padding-bottom: 15px; text-transform: uppercase; font-size: 1.4rem; letter-spacing: 2px; flex-shrink: 0;">
                    ${tt('tourney_hall_of_fame') || 'DVORANA SLAVNIH'}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
        `;
        
        if (!this.tourneyLeaderboard || this.tourneyLeaderboard.length === 0) {
            leaderboardHtml += `<div style="text-align:center; color:var(--text-muted); font-size:1.1rem; padding: 30px 0;">Još uvek nema osvajača turnira.</div>`;
        } else {
            this.tourneyLeaderboard.forEach((player, idx) => {
                let rankTrophy = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `<span style="color: var(--text-muted); font-size: 1.2rem; font-weight: bold;">${idx+1}.</span>`));
                let photo = player.photoUrl && player.photoUrl.length > 5 ? player.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=333&color=E0C995`;
                
                let bg = idx === 0 ? 'background: linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0.4) 100%); border: 1px solid var(--gold-main);' : 'background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);';
                let nameColor = idx === 0 ? 'var(--gold-main)' : 'white';
                let nameSize = idx === 0 ? '1.2rem' : '1.1rem';
                
                leaderboardHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; ${bg} padding: 12px 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 15px; overflow: hidden; flex: 1;">
                            <div style="font-size: 1.5rem; min-width: 35px; text-align: center; flex-shrink: 0;">${rankTrophy}</div>
                            <img src="${photo}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid ${idx === 0 ? 'var(--gold-main)' : 'rgba(255,255,255,0.3)'}; flex-shrink: 0; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
                            <span style="color: ${nameColor}; font-weight: 800; font-size: ${nameSize}; white-space: normal; word-break: break-word; line-height: 1.2; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${player.playerName}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.5); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255,215,0,0.3);">
                            <span style="color: var(--gold-main); font-weight: 900; font-size: 1.2rem; flex-shrink: 0;">${player.wins}</span>
                            <span style="font-size: 1.1rem;">🏆</span>
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
            <div class="modal-box tourney-wrapper" style="width: 100%; height: 100%; max-height: 100%; max-width: 400px; padding: 25px 20px; overflow-y: auto; justify-content: flex-start; background: linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.95) 100%); border: 2px solid var(--gold-main); box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-radius: 15px;">
                <div class="tourney-icon-large" style="font-size: 4rem; margin-bottom: 10px; text-align: center;">🏆</div>
                <h3 class="tourney-title" style="font-size: 1.3rem; margin-bottom: 5px; text-align: center; color: var(--gold-main);">${tt('tourney_weekly') || 'Nedeljni Turnir'}</h3>
                <p class="tourney-desc" style="font-size: 0.85rem; margin-bottom: 20px; text-align: center; color: var(--text-muted);">${tt('tourney_desc') || 'Prijavite se za nedeljni turnir! 8 igrača se bori za prestiž i veliku nagradu.'}</p>
                
                <div style="font-size: 1.2rem; font-weight: 900; text-align: center; color: ${isRegistrationOpen && spotsLeft === 0 ? 'var(--danger)' : 'var(--success)'}; margin-bottom: 20px; background: rgba(0,0,0,0.3); padding: 10px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); width: 100%;">
                    ${tt('tourney_registered') || 'Prijavljeno igrača'}<br><br>${this.state.players.length} / 8
                </div>

                <div style="width: 100%; display: flex; flex-direction: column; flex-grow: 1;">
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
            <style>
                .tourney-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.2); transition: all 0.3s ease; cursor: pointer; }
                .tourney-dot.active { background: var(--gold-main); transform: scale(1.3); box-shadow: 0 0 5px var(--gold-main); }
                
                /* Sakrivanje scrollbara u kosturu za čistiji izgled */
                .bracket-scroll-container::-webkit-scrollbar { display: none; }
                .bracket-scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
                
                /* Sitni scrollbar za unutrašnje kolone mečeva */
                .bracket-col-inner::-webkit-scrollbar { width: 4px; }
                .bracket-col-inner::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.5); border-radius: 2px; }
            </style>
            
            <div class="modal-box tourney-wrapper" style="width: 100%; height: 100%; max-height: 100%; max-width: 400px; padding: 15px 10px; overflow: hidden; display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.95) 100%); border: 2px solid var(--gold-main); box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-radius: 15px;">
                
                <div id="bracket-scroller" class="bracket-scroll-container" style="display: flex; flex-direction: row; width: 100%; flex: 1; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-behavior: smooth; gap: 0;" onscroll="
                    let scrollLeft = this.scrollLeft;
                    let width = this.clientWidth;
                    let index = Math.round(scrollLeft / width);
                    document.querySelectorAll('.tourney-dot').forEach((dot, i) => {
                        dot.classList.toggle('active', i === index);
                    });
                ">
                    
                    <div class="bracket-col" style="flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; padding: 0 5px; overflow: hidden;">
                        <h4 style="color: var(--gold-main); text-transform: uppercase; margin: 0 0 10px 0; font-size: 1.1rem; border-bottom: 2px solid rgba(255,215,0,0.3); padding-bottom: 5px; width: 95%; text-align: center; flex-shrink: 0; letter-spacing: 1px;">Četvrtfinale</h4>
                        <div class="bracket-col-inner" style="width: 100%; flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 12px; padding-bottom: 10px;">
                            ${qf.map((m, i) => this.createMatchHTML(m, 'qf', i)).join('')}
                        </div>
                    </div>

                    <div class="bracket-col" style="flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; padding: 0 5px; overflow: hidden;">
                        <h4 style="color: var(--gold-main); text-transform: uppercase; margin: 0 0 10px 0; font-size: 1.1rem; border-bottom: 2px solid rgba(255,215,0,0.3); padding-bottom: 5px; width: 95%; text-align: center; flex-shrink: 0; letter-spacing: 1px;">Polufinale</h4>
                        <div class="bracket-col-inner" style="width: 100%; flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 20px; padding-bottom: 10px; padding-top: 10px;">
                            ${sf.map((m, i) => this.createMatchHTML(m, 'sf', i)).join('')}
                        </div>
                    </div>

                    <div class="bracket-col" style="flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; padding: 0 5px; overflow: hidden;">
                        <h4 style="color: var(--gold-main); text-transform: uppercase; margin: 0 0 10px 0; font-size: 1.2rem; border-bottom: 2px solid rgba(255,215,0,0.3); padding-bottom: 5px; width: 95%; text-align: center; flex-shrink: 0; letter-spacing: 2px;">Finale 🏆</h4>
                        <div class="bracket-col-inner" style="width: 100%; flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; padding-bottom: 10px;">
                            ${f.map((m, i) => this.createMatchHTML(m, 'f', i)).join('')}
                        </div>
                    </div>

                </div>

                <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 10px; padding-bottom: 5px; flex-shrink: 0;">
                    <div class="tourney-dot active" onclick="document.getElementById('bracket-scroller').scrollTo({left: 0, behavior: 'smooth'})"></div>
                    <div class="tourney-dot" onclick="document.getElementById('bracket-scroller').scrollTo({left: document.getElementById('bracket-scroller').clientWidth, behavior: 'smooth'})"></div>
                    <div class="tourney-dot" onclick="document.getElementById('bracket-scroller').scrollTo({left: document.getElementById('bracket-scroller').clientWidth * 2, behavior: 'smooth'})"></div>
                </div>

            </div>
        `;
    }

    createMatchHTML(match, round, index) {
        if (!match || (!match.p1 && !match.p2)) {
            return `
                <div class="match-card empty" style="padding: 12px 10px; width: 100%; max-width: 320px; font-size: 0.8rem; background: rgba(0,0,0,0.4); border: 1px dashed rgba(255,215,0,0.4); border-radius: 12px; text-align: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                    <span style="color: var(--text-muted); font-weight: 600;">${tt('tourney_tbd') || 'Čeka se...'}</span>
                </div>`;
        }

        const myId = this.app.playerId;
        const isMyMatch = (match.p1 && match.p1.id === myId) || (match.p2 && match.p2.id === myId);
        const activeClass = isMyMatch ? 'my-match' : '';
        
        const getPlayerHtml = (p) => {
            if (!p) return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.75rem;">Čeka se...</div>`;
            
            let photo = p.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=333&color=E0C995`;
            let isWinner = match.winnerId === p.id;
            let isLoser = match.winnerId && match.winnerId !== p.id;
            
            let opacity = isLoser ? '0.4' : '1';
            let border = isWinner ? '2px solid var(--success)' : '1px solid rgba(255,215,0,0.4)';
            let filter = isLoser ? 'grayscale(100%)' : 'none';
            let nameColor = isWinner ? 'var(--success)' : 'var(--text-main)';
            
            return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: ${opacity}; filter: ${filter};">
                    <img src="${photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: ${border}; margin-bottom: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    <span style="font-size: 0.75rem; font-weight: bold; text-align: center; word-break: break-word; line-height: 1.1; max-width: 100px; color: ${nameColor};">${p.name}</span>
                </div>
            `;
        };

        let timeInfo = '';
        if (match.timeAccepted && match.time) {
            timeInfo = `<div style="text-align:center; font-size: 0.65rem; color: var(--success); margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">✅ ${this.formatDate(match.time)}</div>`;
        } else if (match.proposedTime) {
            timeInfo = `<div style="text-align:center; font-size: 0.65rem; color: #ff9800; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">⏳ Dogovor...</div>`;
        } else if (match.p1 && match.p2) {
            timeInfo = `<div style="text-align:center; font-size: 0.65rem; color: var(--text-muted); margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">Nije zakazano</div>`;
        }

        return `
            <div class="match-card ${activeClass}" onclick="app.tournamentManager.openMatchModal('${round}', ${index})" style="padding: 12px 10px; width: 100%; max-width: 320px; background: rgba(0,0,0,0.4); border: 1px solid ${isMyMatch ? 'var(--gold-main)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.1s; flex-shrink: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    ${getPlayerHtml(match.p1)}
                    <div style="font-size: 0.85rem; font-weight: 900; color: var(--gold-main); margin: 0 10px; text-shadow: 0 0 5px rgba(255,215,0,0.5);">VS</div>
                    ${getPlayerHtml(match.p2)}
                </div>
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