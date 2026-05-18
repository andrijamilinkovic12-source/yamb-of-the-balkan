// vracanjeupisa.js - LOGIKA ZA VRAĆANJE POTEZA I TOKENE

class UndoManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.currentMenuPage = 0;
    }

    // --- OTVARANJE I ZATVARANJE MENIJA ---
    openMenu() {
        const overlay = document.getElementById('undo-menu-overlay');
        this.updateMenuCounts();
        if (overlay) overlay.style.display = 'flex';
        setTimeout(() => {
            this.switchMenuTab(0);
        }, 0);
    }

    closeMenu() {
        const overlay = document.getElementById('undo-menu-overlay');
        if (overlay) overlay.style.display = 'none';
        this.syncEconomyBanner(1);
    }

    updateMenuCounts() {
        const dukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        const tokens = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;
        ['economy-dukati-count', 'economy-dukati-count-large', 'menu-dukati-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = dukati;
        });

        const tokenCount = document.getElementById('undo-token-count');
        if (tokenCount) tokenCount.innerText = tokens;
    }

    scrollMenuTo(index) {
        this.switchMenuTab(index);
    }

    updateMenuPagination(forcedIndex = null) {
        this.switchMenuTab(forcedIndex ?? this.currentMenuPage);
    }

    switchMenuTab(index = 0) {
        const normalizedIndex = Number(index) === 1 ? 1 : 0;
        const tabs = [
            document.getElementById('economy-tab-ducats'),
            document.getElementById('economy-tab-undo')
        ];
        const panels = [
            document.getElementById('economy-panel-ducats'),
            document.getElementById('economy-panel-undo')
        ];

        tabs.forEach((tab, tabIndex) => {
            if (tab) tab.classList.toggle('active', tabIndex === normalizedIndex);
        });
        panels.forEach((panel, panelIndex) => {
            if (panel) panel.classList.toggle('active', panelIndex === normalizedIndex);
        });

        const titleEl = document.getElementById('economy-menu-title');
        if (titleEl) {
            const key = normalizedIndex === 0 ? 'menu_ducats' : 'undo_title';
            titleEl.dataset.lang = key;
            titleEl.innerText = (typeof t === 'function') ? t(key) : (normalizedIndex === 0 ? 'DUKATI' : 'ISPRAVI ZADNJI UPIS');
        }

        const balancePill = document.querySelector('#undo-menu-overlay .economy-balance-pill');
        if (balancePill) {
            balancePill.hidden = normalizedIndex === 1;
        }

        if (normalizedIndex !== this.currentMenuPage) {
            this.currentMenuPage = normalizedIndex;
        }

        this.syncEconomyBanner(normalizedIndex);
        const adMob = window.adMobGlobal;
        if (adMob && typeof adMob.prepareReward === 'function') {
            const rewardOptions = normalizedIndex === 1
                ? { context: 'undo_tokens', amount: 3 }
                : { context: 'shop_ad_reward', amount: 500 };
            setTimeout(() => adMob.prepareReward(rewardOptions), 150);
        }
    }

    syncEconomyBanner(index) {
        const adMob = window.adMobGlobal;
        if (!adMob) return;

        const overlay = document.getElementById('undo-menu-overlay');
        const bannerSlotId = Number(index) === 1 ? 'economy-undo-banner-slot' : 'economy-banner-slot';
        const bannerSlot = document.getElementById(bannerSlotId);
        if (overlay?.style.display === 'flex' && bannerSlot) {
            setTimeout(() => adMob.showEconomyBanner && adMob.showEconomyBanner(bannerSlot), 120);
        } else if (adMob.hideEconomyBanner) {
            adMob.hideEconomyBanner();
        }
    }

    async claimCoinAdReward(type = 'rewarded') {
        const parsedType = String(type);
        const adMob = window.adMobGlobal;

        if (parsedType === 'interstitial') {
            if (!adMob || !adMob.showInterstitial) {
                this.app.modal.alert(gt('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna. Pokušajte za par sekundi.", gt('modal_title_info') || "INFO");
                return;
            }

            const success = await adMob.showInterstitial();
            if (!success) return;

            const result = await this.claimServerCoinReward('interstitial');
            if (!result.ok) {
                this.showRewardError(result);
                return;
            }

            this.applyCoinReward(result, 200);
            return;
        }

        const shop = window.shop || (window.riznicaManager && window.riznicaManager.shop);
        if (shop && typeof shop.watchAdForCoins === 'function') {
            await shop.watchAdForCoins();
            this.updateMenuCounts();
            return;
        }

        if (!adMob || !adMob.showRewardVideo) {
            this.app.modal.alert(gt('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna. Pokušajte za par sekundi.", gt('modal_title_info') || "INFO");
            return;
        }

        const coinRewardOptions = { context: 'shop_ad_reward', amount: 500 };
        const isCoinRewardReady = typeof adMob.isRewardVideoReadyFor === 'function'
            ? adMob.isRewardVideoReadyFor(coinRewardOptions)
            : adMob.ads?.rewarded?.isReady;
        if (!isCoinRewardReady) {
            if (typeof adMob.prepareReward === 'function') adMob.prepareReward(coinRewardOptions);
            this.app.modal.alert(gt('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna. Pokušajte za par sekundi.", gt('modal_title_info') || "INFO");
            return;
        }

        const success = await adMob.showRewardVideo(coinRewardOptions);
        if (!success) return;

        const ssvNonce = typeof adMob.consumeLastRewardSsvNonce === 'function'
            ? adMob.consumeLastRewardSsvNonce()
            : '';
        const result = typeof adMob.claimRewardWithSsvRetry === 'function'
            ? await adMob.claimRewardWithSsvRetry(
                () => this.claimServerCoinReward('rewarded', ssvNonce),
                { nonce: ssvNonce, context: 'shop_ad_reward' }
            )
            : await this.claimServerCoinReward('rewarded', ssvNonce);
        if (!result.ok) {
            this.showRewardError(result);
            return;
        }

        this.applyCoinReward(result, 500);
    }

    async claimServerCoinReward(type, ssvNonce = '') {
        if (!this.app || !this.app.socket || !this.app.socket.connected) {
            if (type === 'rewarded') return { ok: false, reason: 'err_server_conn' };
            return { ok: true, localFallback: true, reward: 200 };
        }

        if (typeof this.app.authenticateSocketIdentity === 'function') {
            const authResult = await this.app.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: 'auth_required' };
            }
        }

        return new Promise(resolve => {
            let settled = false;
            const claimTimeoutMs = type === 'rewarded' ? 45000 : 18000;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, claimTimeoutMs);

            const eventName = type === 'interstitial' ? 'claim_shop_interstitial_reward' : 'claim_shop_ad_reward';
            this.app.socket.emit(eventName, { ssvNonce }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    async claimServerUndoTokenReward(type, ssvNonce = '') {
        if (!this.app || !this.app.socket || !this.app.socket.connected) {
            return { ok: false, reason: 'err_server_conn' };
        }

        if (typeof this.app.authenticateSocketIdentity === 'function') {
            const authResult = await this.app.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: 'auth_required' };
            }
        }

        return new Promise(resolve => {
            let settled = false;
            const claimTimeoutMs = type === 'rewarded' ? 45000 : 18000;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, claimTimeoutMs);

            this.app.socket.emit('claim_undo_token_reward', { type, ssvNonce }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    applyCoinReward(result, fallbackAmount) {
        const rewardAmount = parseInt(result.reward) || fallbackAmount;

        if (result.localFallback) {
            let balance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
            balance += rewardAmount;
            localStorage.setItem('yamb_dukati', balance);
            if (window.statsManager) {
                window.statsManager.stats.balance = balance;
                window.statsManager.saveStats();
            }
            if (this.app && typeof this.app.emitPlayerData === 'function') {
                this.app.emitPlayerData();
            }
        } else if (result.balance !== undefined) {
            const balance = Math.max(0, parseInt(result.balance) || 0);
            localStorage.setItem('yamb_dukati', balance);
            if (window.statsManager) {
                window.statsManager.stats.balance = balance;
                window.statsManager.saveStats();
            }
        }

        this.updateMenuCounts();
        if (this.app.soundMgr) this.app.soundMgr.win();
        const rewardMessage = (gt('economy_reward_message') || "+{0} dukata").replace('{0}', rewardAmount);
        this.app.modal.alert(rewardMessage, gt('msg_reward_title') || "NAGRADA");
    }

    showRewardError(result = {}) {
        const cooldown = Math.ceil((result.retryAfterMs || 0) / 1000);
        let message = gt('err_server_conn') || "Greška pri konekciji sa serverom.";
        if (result.reason === 'ad_reward_cooldown') {
            message = (gt('economy_reward_cooldown') || "Nagrada je već obrađena. Pokušajte ponovo za {0}s.").replace('{0}', cooldown || 1);
        } else if (result.reason === 'auth_required') {
            message = gt('economy_auth_required') || "Morate se prijaviti da biste preuzeli nagradu.";
        } else if (result.reason === 'ad_verification_required' || result.reason === 'ad_verification_pending') {
            message = "Potvrda reklame još nije stigla. Pokušajte preuzimanje nagrade za par sekundi.";
        } else if (result.reason === 'undo_tokens_max') {
            message = gt('undo_tokens_max') || "Već imate maksimalan broj tokena.";
        }

        this.app.modal.alert(message, gt('modal_title_info') || "INFO");
    }

    // --- KUPOVINA TOKENA GLEDANJEM REKLAMA ---
    async buyTokens(type) {
        const parsedType = parseInt(type, 10);
        const adMob = window.adMobGlobal;
        
        console.log("Pokrenuta nabavka tokena, tip:", parsedType);

        if (parsedType === 1) {
            if (adMob && adMob.showInterstitial) {
                const success = await adMob.showInterstitial();
                if (success) {
                    const result = await this.claimServerUndoTokenReward('interstitial');
                    if (!result.ok) {
                        this.showRewardError(result);
                        return;
                    }
                    this.applyTokenReward(result, 1);
                }
            }
        } else if (parsedType === 3) {
            if (adMob && adMob.showRewardVideo) {
                const tokenRewardOptions = { context: 'undo_tokens', amount: 3 };
                const isTokenRewardReady = typeof adMob.isRewardVideoReadyFor === 'function'
                    ? adMob.isRewardVideoReadyFor(tokenRewardOptions)
                    : adMob.ads?.rewarded?.isReady;
                if (!isTokenRewardReady) {
                    if (typeof adMob.prepareReward === 'function') adMob.prepareReward(tokenRewardOptions);
                    this.app.modal.alert(gt('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna. Pokušajte za par sekundi.", gt('modal_title_info') || "INFO");
                    return;
                }

                const success = await adMob.showRewardVideo(tokenRewardOptions);
                if (success) {
                    const ssvNonce = typeof adMob.consumeLastRewardSsvNonce === 'function'
                        ? adMob.consumeLastRewardSsvNonce()
                        : '';
                    const result = typeof adMob.claimRewardWithSsvRetry === 'function'
                        ? await adMob.claimRewardWithSsvRetry(
                            () => this.claimServerUndoTokenReward('rewarded', ssvNonce),
                            { nonce: ssvNonce, context: 'undo_tokens' }
                        )
                        : await this.claimServerUndoTokenReward('rewarded', ssvNonce);
                    if (!result.ok) {
                        this.showRewardError(result);
                        return;
                    }
                    this.applyTokenReward(result, 3);
                }
            }
        }
    }

    applyTokenReward(result, fallbackAmount) {
        const rewardAmount = parseInt(result.reward) || fallbackAmount;

        if (result.localFallback) {
            this.addTokens(rewardAmount, false);
            return;
        }

        if (result.undoTokens !== undefined) {
            const tokens = Math.max(0, parseInt(result.undoTokens) || 0);
            localStorage.setItem('yamb_undo_tokens', tokens);
            if (window.statsManager) {
                window.statsManager.stats.undoTokens = tokens;
                window.statsManager.saveStats();
            }
        }

        this.updateMenuCounts();
        if (this.app.soundMgr) this.app.soundMgr.win();

        const successMsg = (gt('undo_earned_msg') || "Dobili ste {0} tokena!").replace('{0}', rewardAmount);
        this.app.modal.alert(successMsg, gt('undo_earned_title') || "TOKENI DODATI");
    }

    // --- DODAVANJE TOKENA I ČUVANJE U BAZI ---
    addTokens(amount, syncToServer = true) {
        let tokens = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;
        tokens += amount;
        localStorage.setItem('yamb_undo_tokens', tokens);
        
        const tokenCount = document.getElementById('undo-token-count');
        if (tokenCount) tokenCount.innerText = tokens;
        this.updateMenuCounts();

        if (this.app.soundMgr) this.app.soundMgr.win();
        
        // Prikaz poruke
        let successMsg = (gt('undo_earned_msg') || "Dobili ste {0} tokena!").replace('{0}', amount);
        this.app.modal.alert(successMsg, gt('undo_earned_title') || "TOKENI DODATI");

        // Sinhronizacija sa Cloud-om odmah po dobijanju (ISPRAVLJENO)
        if (syncToServer && this.app.socket && this.app.socket.connected) {
            let currentStats = this.app.getFullLocalStats() || {};
            currentStats.undoTokens = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;

            this.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid'),
                name: this.app.playerName,
                photoUrl: localStorage.getItem('yamb_player_photo') || '',
                stats: currentStats,
                playerId: this.app.playerId
            });
        }
    }

    // --- GLAVNA FUNKCIJA ZA VRAĆANJE POTEZA ---
    async executeUndo() {
        if (!this.app.lastMoveSnapshot) return;

        if (this.app.onlineMode) {
            // ONLINE MOD: Koristi tokene
            let tokens = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;
            if (tokens < 1) {
                await this.app.modal.alert(gt('undo_no_tokens') || "Nemate dovoljno tokena.", gt('undo_no_tokens_title') || "NEMA TOKENA");
                return;
            }
            
            let confirmMsg = (gt('undo_use_confirm') || "Potroši 1 token za vraćanje? Preostalo: {0}").replace('{0}', tokens);
            const confirmUndo = await this.app.modal.confirm(confirmMsg);
            if (!confirmUndo) return;

            // Skini token
            tokens -= 1;
            localStorage.setItem('yamb_undo_tokens', tokens);
            
            // Cloud Sync tokena (ISPRAVLJENO)
            if (this.app.socket && this.app.socket.connected) {
                let currentStats = this.app.getFullLocalStats() || {};
                currentStats.undoTokens = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;

                this.app.socket.emit('set_player_data', {
                    uid: localStorage.getItem('yamb_uid'),
                    name: this.app.playerName,
                    photoUrl: localStorage.getItem('yamb_player_photo') || '',
                    stats: currentStats,
                    playerId: this.app.playerId
                });
            }

        } else {
            // OFFLINE MOD: Solo i Dva Igrača (reklama)
            const confirmUndo = await this.app.modal.confirm(gt('undo_confirm') || "Želite li da ispravite zadnji upis gledanjem reklame?");
            if (!confirmUndo) return;

            if (window.adMobGlobal && window.Capacitor && window.Capacitor.isNativePlatform) {
                if (window.adMobGlobal.showInterstitial) {
                    const success = await window.adMobGlobal.showInterstitial();
                    if (!success) return; 
                }
            }
        }

        // --- RESTORE LOKALNOG STANJA ---
        const snap = this.app.lastMoveSnapshot;
        this.app.currentPlayerIdx = snap.pIdx;
        this.app.allScores[snap.pIdx][snap.col][snap.row] = null;
        this.app.kockiceVals = [...snap.diceVals];
        this.app.zadrzane = [...snap.held];
        this.app.brojBacanja = snap.rollCount;
        this.app.najavljenoPolje = snap.najavljenoPolje;
        
        this.app.najavaAktivna = snap.najavaAktivna;
        this.app.hasSvetiIlija = snap.hasSvetiIlija;
        this.app.consecutiveNajava = snap.consecutiveNajava;

        this.app.effectMgr.stop();
        this.app.loadEquippedEffect();
        this.app.highlightCurrentPlayer();
        this.app.updateTableVisuals();
        this.app.updateDiceVisuals();

        // Osvežavanje tastera za bacanje
        const btnBacaj = document.getElementById('btn-bacaj');
        if (btnBacaj) {
            if (this.app.brojBacanja < 3) {
                btnBacaj.disabled = false;
                btnBacaj.innerText = gt('game_roll') || "BACAJ";
            } else {
                btnBacaj.disabled = true;
                btnBacaj.innerText = gt('game_write') || "UPIŠI";
            }
        }

        // Osvežavanje tastera za najavu
        const btnN = document.getElementById('btn-najava');
        if (btnN) {
            if (this.app.najavaAktivna) {
                btnN.disabled = false;
                btnN.innerText = gt('game_announce_cancel') || "OTKAŽI";
                btnN.classList.add('btn-active-toggle');
                btnN.classList.remove('btn-highlight');
            } else if (this.app.najavljenoPolje) {
                btnN.disabled = true;
                btnN.innerText = `${gt('game_announce') || "NAJAVA"}: ${this.app.najavljenoPolje.row}`;
                btnN.classList.remove('btn-active-toggle');
                btnN.classList.remove('btn-highlight');
            } else if (this.app.brojBacanja === 1) {
                btnN.disabled = false;
                btnN.classList.add('btn-highlight');
            } else {
                btnN.disabled = true;
                btnN.classList.remove('btn-highlight');
            }
        }

        this.app.updateStatusLabel();

        // Resetovanje samog dugmeta za undo
        this.app.lastMoveSnapshot = null;
        const btnUndo = document.getElementById('btn-undo-move');
        if (btnUndo) {
            btnUndo.classList.add('gh-btn-inactive');
            btnUndo.classList.remove('gh-btn-active');
        }
        this.app.autoSaveGame();

        // ONLINE MOD: Forsiraj protivnika da preuzme tvoje resetovano stanje (Rollback)
        if (this.app.onlineMode && this.app.socket) {
            this.app.socket.emit('sync_state_response', {
                roomId: this.app.roomId,
                players: this.app.players,
                allScores: this.app.allScores,
                currentPlayerIdx: this.app.currentPlayerIdx,
                brojBacanja: this.app.brojBacanja,
                kockiceVals: this.app.kockiceVals,
                zadrzane: this.app.zadrzane,
                najavaAktivna: this.app.najavaAktivna,
                najavljenoPolje: this.app.najavljenoPolje
            });
        }
    }
}

// Inicijalizacija i povezivanje menadžera čim se skripta učita
window.addEventListener('load', () => {
    if (window.app) {
        window.undoManager = new UndoManager(window.app);
    } else {
        console.warn("YambApp instanca (window.app) nije učitana pre vracanjeupisa.js!");
    }
});
