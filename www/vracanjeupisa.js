// vracanjeupisa.js - LOGIKA ZA VRAĆANJE POTEZA I TOKENE

class UndoManager {
    constructor(appInstance) {
        this.app = appInstance;
    }

    // --- OTVARANJE I ZATVARANJE MENIJA ---
    openMenu() {
        const overlay = document.getElementById('undo-menu-overlay');
        const tokenCount = document.getElementById('undo-token-count');
        if (tokenCount) {
            tokenCount.innerText = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;
        }
        if (overlay) overlay.style.display = 'flex';
    }

    closeMenu() {
        const overlay = document.getElementById('undo-menu-overlay');
        if (overlay) overlay.style.display = 'none';
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
                    this.addTokens(1);
                }
            }
        } else if (parsedType === 3) {
            if (adMob && adMob.showRewardVideo) {
                const success = await adMob.showRewardVideo();
                if (success) {
                    this.addTokens(3);
                }
            }
        }
    }

    // --- DODAVANJE TOKENA I ČUVANJE U BAZI ---
    addTokens(amount) {
        let tokens = parseInt(localStorage.getItem('yamb_undo_tokens')) || 0;
        tokens += amount;
        localStorage.setItem('yamb_undo_tokens', tokens);
        
        const tokenCount = document.getElementById('undo-token-count');
        if (tokenCount) tokenCount.innerText = tokens;

        if (this.app.soundMgr) this.app.soundMgr.win();
        
        // Prikaz poruke
        let successMsg = (gt('undo_earned_msg') || "Dobili ste {0} tokena!").replace('{0}', amount);
        this.app.modal.alert(successMsg, gt('undo_earned_title') || "TOKENI DODATI");

        // Sinhronizacija sa Cloud-om odmah po dobijanju (ISPRAVLJENO)
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