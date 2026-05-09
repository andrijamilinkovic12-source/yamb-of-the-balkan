// onlinenumber.js - MODUL ZA UPRAVLJANJE MREŽNIM FUNKCIJAMA SA I18N PREVODIMA
// Sadrži: Online broj igrača, Custom Notifikacije, Prikaz Rankova, Trofeja, Highscore Listenere

/**
 * Prikazuje custom toast notifikaciju iznad svih elemenata.
 */
window.showNotification = function(title, message) {
    const sec = window.YambSecurity;
    const containerId = 'custom-notification-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '100000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.pointerEvents = 'none';
        container.style.width = '90%';
        container.style.maxWidth = '350px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `
        <div class="toast-title">${sec.escapeHtml(title)}</div>
        <div class="toast-msg">${sec.escapeHtml(message)}</div>
    `;
    
    toast.style.background = 'var(--glass-panel)';
    toast.style.border = '2px solid var(--gold-main)';
    toast.style.borderRadius = '12px';
    toast.style.padding = '12px 15px';
    toast.style.color = 'var(--text-main)';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5), inset 0 0 10px rgba(224, 201, 149, 0.1)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.WebkitBackdropFilter = 'blur(10px)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    const titleEl = toast.querySelector('.toast-title');
    titleEl.style.color = 'var(--gold-main)';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '0.9rem';
    titleEl.style.marginBottom = '5px';
    titleEl.style.textTransform = 'uppercase';
    
    const msgEl = toast.querySelector('.toast-msg');
    msgEl.style.fontSize = '0.85rem';
    msgEl.style.lineHeight = '1.3';

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- NOVA FUNKCIJA: OTVARANJE MODALA ZA ONLINE IGRAČE ---
window.openOnlinePlayersModal = function() {
    const sec = window.YambSecurity;
    const overlay = document.getElementById('online-players-overlay');
    
    if (overlay) {
        overlay.style.display = 'flex';
        
        // Dinamičko forsiranje CSS stilova
        const modalBox = overlay.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.width = '95%';
            modalBox.style.maxWidth = '500px';
            modalBox.style.height = '80vh';
            modalBox.style.maxHeight = '800px';
        }
        
        const header = overlay.querySelector('.chat-header');
        if (header) {
            header.style.padding = '15px 20px';
            const titleSpan = header.querySelector('span:first-child');
            if (titleSpan) {
                titleSpan.style.fontSize = '1.2rem';
                titleSpan.style.letterSpacing = '1px';
            }
            const closeSpan = header.querySelector('span:last-child');
            if (closeSpan) {
                closeSpan.style.fontSize = '1.5rem';
                closeSpan.style.lineHeight = '1';
            }
        }
    }

    const body = document.getElementById('online-players-body');
    if (body) {
        body.style.flex = '1';
        body.style.overflowY = 'auto';
        body.style.WebkitOverflowScrolling = 'touch';
        body.style.padding = '15px';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.gap = '12px';

        const loadingText = window.t ? window.t('online_loading') : 'Učitavam igrače... ⏳';
        body.innerHTML = `<div style="text-align: center; font-size: 0.9rem; color: var(--text-muted); padding-top: 20px;">${sec.escapeHtml(loadingText)}</div>`;
    }

    if (window.app && window.app.socket && window.app.socket.connected) {
        
        window.app.socket.off('online_players_list_data'); 
        window.app.socket.on('online_players_list_data', (players) => {
            if (!body) return;

            if (!players || players.length === 0) {
                const noPlayers = window.t ? window.t('online_no_players') : 'Trenutno nema igrača.';
                body.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding-top: 20px;">${sec.escapeHtml(noPlayers)}</div>`;
                return;
            }

            let html = '';
            players.forEach(p => {
                const isMe = p.socketId === window.app.socket.id;
                const youText = window.t ? window.t('online_you') : '(Vi)';
                const rawName = String(p.name || 'Igrac');
                const safeNameHtml = sec.escapeHtml(rawName);
                const socketIdArg = sec.jsString(p.socketId || '');
                const nameArg = sec.jsString(rawName);
                const uidArg = sec.jsString(p.uid || '');
                const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=333&color=E0C995`;
                const photoSrc = sec.escapeAttr(sec.safeUrl(p.photoUrl, fallbackPhoto));

                let actionButtons = '';
                if (!isMe) {
                    // Znamo sigurno sa servera da li su već prijatelji!
                    const isAlreadyFriend = p.isFriend;
                    const addFriendHandler = sec.escapeAttr(`if(window.app && window.app.sendFriendRequest) { window.app.sendFriendRequest(${socketIdArg}, ${nameArg}, ${uidArg}); this.disabled=true; this.style.opacity='0.4'; this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.cursor='not-allowed'; } else { showNotification('INFO', 'Funkcija nije dostupna.') }`);
                    const spectateHandler = sec.escapeAttr(`if(window.app && window.app.spectateGame) { window.app.spectateGame(${socketIdArg}) } else { showNotification('INFO', 'Greska') }`);
                    const challengeHandler = sec.escapeAttr(`window.app.challengePlayer(${socketIdArg}, ${nameArg})`);

                    // 1. Dugme za DODAVANJE (Zatamnjeno ako su već prijatelji)
                    let addFriendBtn = '';
                    if (isAlreadyFriend) {
                        addFriendBtn = `<button disabled title="Već ste prijatelji" style="width: 38px; height: 38px; border-radius: 8px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: gray; cursor: not-allowed; opacity: 0.4;">➕</button>`;
                    } else {
                        // Dodata logika da se dugme "ugasi" čim se klikne da bi se izbegao spam
                        addFriendBtn = `<button onclick="${addFriendHandler}" title="Dodaj prijatelja" style="width: 38px; height: 38px; border-radius: 8px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s; background: rgba(76, 175, 80, 0.2); border: 1px solid var(--success); color: white;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">➕</button>`;
                    }

                    // 2. Dugme za GLEDANJE (Zatamnjeno ako igrač ne igra)
                    let spectateBtn = '';
                    if (!p.isPlaying) {
                        spectateBtn = `<button disabled title="Igrač trenutno ne igra" style="width: 38px; height: 38px; border-radius: 8px; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: gray; cursor: not-allowed; opacity: 0.4;">👁️</button>`;
                    } else {
                        spectateBtn = `<button onclick="${spectateHandler}" title="Gledaj partiju" style="width: 38px; height: 38px; border-radius: 8px; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s; background: rgba(33, 150, 243, 0.2); border: 1px solid #2196F3; color: white;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">👁️</button>`;
                    }

                    // 3. Dugme za DUEL (Uvek aktivno)
                    const challengeBtn = `<button onclick="${challengeHandler}" title="Izazovi na duel" style="width: 38px; height: 38px; border-radius: 8px; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s; background: rgba(244, 67, 54, 0.2); border: 1px solid var(--danger); color: white;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">⚔️</button>`;

                    actionButtons = `
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        ${addFriendBtn}
                        ${spectateBtn}
                        ${challengeBtn}
                    </div>`;
                }

                html += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <img src="${photoSrc}" style="width:45px; height:45px; border-radius:50%; border: 2px solid ${p.isPlaying ? '#2196F3' : 'var(--success)'}; object-fit: cover; flex-shrink: 0;">
                        <span style="color: var(--text-main); font-weight: bold; font-size: 0.95rem; word-break: break-word; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${safeNameHtml} ${isMe ? `<span style="font-size:0.75rem; color:var(--text-muted); display: block; margin-top: 4px;">${sec.escapeHtml(youText)}</span>` : ''}
                        </span>
                    </div>
                    ${actionButtons}
                </div>`;
            });
            body.innerHTML = html;
        });

        window.app.socket.emit('get_online_players_list');

    } else {
        if (body) {
            const noConnText = window.t ? window.t('online_no_conn') : 'Niste povezani na server.';
            body.innerHTML = `<div style="text-align: center; color: var(--danger); font-weight: bold; padding-top: 20px;">${sec.escapeHtml(noConnText)}</div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- POMOĆNA FUNKCIJA ZA PREVODE ---
    const t = (key) => window.t ? window.t(key) : key;

    // --- 1. ONLINE BROJAČ ---
    let socket = null;
    let isConnected = false;

    const connectToSocket = (uid) => {
        if (isConnected || socket) return; 

        if (typeof io !== 'undefined') {
            const serverUrl = (typeof SERVER_URL !== 'undefined') ? SERVER_URL : 'https://yamb-of-the-balkan.onrender.com';
            
            socket = io(serverUrl, {
                query: { uid: uid },
                reconnection: true,
                reconnectionDelay: 2000,
                reconnectionAttempts: 10
            });

            socket.on('connect', () => {
                isConnected = true;
                socket.emit('request_online_count');
            });

            socket.on('disconnect', () => {
                isConnected = false;
            });

            socket.on('online_count', (data) => {
                const badge = document.getElementById('online-badge');
                if (badge && data && typeof data.count === 'number') {
                    badge.classList.remove('hidden');
                    const textZufix = t('online_players') || " Igrača Online";
                    document.getElementById('online-count').innerText = data.count + textZufix;
                }
            });
            
            socket.on('tournament_invite', (data) => {
                if (window.handleTournamentInvite) {
                    window.handleTournamentInvite(data);
                } else {
                    console.log("Primljena pozivnica za turnir, ali funkcija nije definisana.", data);
                }
            });
        }
    };

    const attemptConnection = () => {
        const uid = localStorage.getItem('yamb_uid');
        if (uid) {
            connectToSocket(uid);
        } else {
            setTimeout(attemptConnection, 2000); 
        }
    };

    attemptConnection();

    // --- 2. PRIKAZ DNEVNOG IZAZOVA I NAGRADA NA DASHBOARDU ---
    const rewardAlertContainer = document.getElementById('reward-alert-container');
    
    if (rewardAlertContainer) {
        rewardAlertContainer.innerHTML = ''; 
        rewardAlertContainer.style.display = 'block'; 
        rewardAlertContainer.style.width = '100%';
        rewardAlertContainer.style.maxWidth = '330px'; 
        rewardAlertContainer.style.margin = '0 auto 15px auto';

        const lastPlayed = localStorage.getItem('yamb_daily_last_played');
        const todayStr = new Date().toISOString().split('T')[0];
        const isPlayedToday = (lastPlayed === todayStr);

        let htmlContent = '';

        if (!isPlayedToday) {
            htmlContent = `
                <div class="alert-content">
                    <div class="alert-icon">🎲</div>
                    <div class="alert-text">
                        <div class="alert-title">${t('daily_challenge_title')}</div>
                        <div class="alert-desc">${t('daily_challenge_desc')}</div>
                    </div>
                    <div class="alert-reward">
                        <div class="reward-pill">
                            <span class="pill-icon">💰</span>
                            <span>1000</span>
                            <span>${t('coins_upper')}</span>
                        </div>
                    </div>
                    <button class="alert-btn" onclick="window.stateManager.navigateTo('daily-challenge')">${t('play_now')}</button>
                </div>
            `;
        } else {
            rewardAlertContainer.style.display = 'none'; 
            return; 
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'dashboard-alert active-alert';
        alertDiv.innerHTML = htmlContent;
        rewardAlertContainer.appendChild(alertDiv);
    }

    // --- 3. OSVEŽAVANJE STATISTIKE I RANKA NA DASHBOARDU ---
    window.addEventListener('updateDashboardStats', (e) => {
        const stats = e.detail || (window.statsManager ? window.statsManager.stats : null);
        if (!stats) return;

        const rankNames = {
            1: t('rank_1') || "Bronza III", 2: t('rank_2') || "Bronza II", 3: t('rank_3') || "Bronza I",
            4: t('rank_4') || "Srebro II", 5: t('rank_5') || "Srebro I",
            6: t('rank_6') || "Zlato II", 7: t('rank_7') || "Zlato I",
            8: t('rank_8') || "Platina II", 9: t('rank_9') || "Platina I",
            10: t('rank_10') || "Dijamant I", 11: t('rank_11') || "Šampion"
        };

        const totalGames = stats.totalGames || 0;
        const wins = stats.wins || 0;
        const hs = stats.highscore || 0;
        const setText = (ids, value) => {
            const idList = Array.isArray(ids) ? ids : [ids];
            const el = idList.map(id => document.getElementById(id)).find(Boolean);
            if (el) el.innerText = value;
        };

        setText(['stat-hs', 'stat-high'], hs);
        setText('stat-games', totalGames);
        setText('stat-wins', wins);

        let wlRatio = 0;
        if (totalGames > 0) wlRatio = Math.round((wins / totalGames) * 100);
        setText(['stat-wl', 'stat-rate'], wlRatio + "%");

        let currentRankName = rankNames[1];
        let currentRankLvl = 1;
        let points = (totalGames * 10) + (wins * 25) + Math.floor(hs / 10);

        if (totalGames < 5) {
            currentRankName = "-";
            setText('league-rank-name', currentRankName);
            setText('league-pts-text', points + " PTS");
            
            const btn = document.querySelector('.btn-league');
            if(btn) {
                btn.onclick = () => {
                    showNotification(t('info_title') || "INFO", t('play_more_req') || "Potrebno je da odigrate još partija.");
                };
            }
            return;
        }

        if (points < 500) currentRankLvl = 1;
        else if (points < 1000) currentRankLvl = 2;
        else if (points < 2000) currentRankLvl = 3;
        else if (points < 3500) currentRankLvl = 4;
        else if (points < 5000) currentRankLvl = 5;
        else if (points < 7500) currentRankLvl = 6;
        else if (points < 10000) currentRankLvl = 7;
        else if (points < 15000) currentRankLvl = 8;
        else if (points < 20000) currentRankLvl = 9;
        else if (points < 30000) currentRankLvl = 10;
        else currentRankLvl = 11;

        currentRankName = rankNames[currentRankLvl];
        
        setText('league-rank-name', currentRankName);
        setText('league-pts-text', points + " PTS");

        const btn = document.querySelector('.btn-league');
        if (btn) {
            btn.onclick = () => {
                const container = document.getElementById('custom-notification-container');
                if (container && container.innerHTML !== '') return;

                const div = document.createElement('div');
                div.className = 'league-progress-toast';
                div.innerHTML = `
                    <div class="league-progress-label">${t('league_progress') || "Napredak lige"}</div>
                    <div class="league-progress-bar-container">
                        <div class="league-progress-bar" style="width: ${Math.min((points / 30000) * 100, 100)}%;"></div>
                    </div>
                    <div class="league-progress-text">
                        <span>${currentRankName}</span>
                        <span>${points} PTS</span>
                    </div>
                `;
                
                div.style.position = 'fixed';
                div.style.top = '20px';
                div.style.left = '50%';
                div.style.transform = 'translateX(-50%)';
                div.style.zIndex = '100000';
                div.style.background = 'var(--glass-panel)';
                div.style.border = '2px solid var(--gold-main)';
                div.style.padding = '15px';
                div.style.borderRadius = '15px';
                div.style.width = '90%';
                div.style.maxWidth = '350px';
                div.style.boxShadow = '0 5px 20px rgba(0,0,0,0.8)';
                div.style.backdropFilter = 'blur(10px)';
                
                document.body.appendChild(div);
                
                setTimeout(() => {
                    div.style.opacity = '0';
                    div.style.transition = 'opacity 0.3s';
                    setTimeout(() => div.remove(), 300);
                }, 3000);
            };
        }
    });

    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('updateDashboardStats'));
    }, 1500);

    // --- 4. OSLUŠKIVANJE ZA OSVOJEN TROFEJ ---
    window.addEventListener('trophyUnlocked', (e) => {
        const trophyId = e.detail;
        
        const popup = document.createElement('div');
        popup.className = 'trophy-popup active';
        popup.innerHTML = `
            <div class="tp-icon">🏆</div>
            <div class="tp-content">
                <div class="tp-title">${t('new_trophy') || "Novi Trofej!"}</div>
                <div class="tp-desc">${trophyId}</div> 
            </div>
        `;
        document.body.appendChild(popup);

        if (window.app && window.app.soundMgr) window.app.soundMgr.trophy();

        setTimeout(() => {
            popup.classList.remove('active');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    });
});
