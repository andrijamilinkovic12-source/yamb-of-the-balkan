// features.js - Logika trofeja, skinova i efekata (VERSION WITH AUTO-REWARD & LOCALIZATION FIX)

if (typeof window.YambFeatures === 'undefined') {

    window.YambFeatures = class {
        constructor(app) {
            this.app = app;
        }

        /**
         * Primenjuje CSS klase na kockice na osnovu odabranog skina.
         */
        applySkinToElement(element, isHeld = false) {
            const activeSkin = localStorage.getItem('yamb_active_skin') || 'default';
            
            element.className = 'dice';
            if (isHeld) element.classList.add('held');
            
            element.classList.add(`skin-${activeSkin}`);
        }

        /**
         * Vizuelni efekti tokom poteza
         */
        checkMoveEffects(row, pts, isHuman) {
            if (!isHuman) return;

            if (this.app.hasSvetiIlija) {
                const activeEffect = localStorage.getItem('yamb_active_effect');
                if (activeEffect === 'thunder') {
                    const gameScene = document.getElementById('game-scene');
                    if (gameScene) {
                        gameScene.classList.add('anim-thunder');
                        if(this.app.soundMgr && this.app.soundMgr.playTone) {
                            this.app.soundMgr.playTone(100, 'sawtooth', 0.5); 
                        }
                        setTimeout(() => gameScene.classList.remove('anim-thunder'), 600);
                    }
                }
            }

            if (pts >= 60) {
                if(window.confetti) {
                    window.confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
                }
            }
        }

        /**
         * GLAVNA FUNKCIJA: Proverava sve uslove za trofeje na kraju igre.
         */
        checkAchievements(finalScore, sheet) {
            if (!window.trophyManager || !window.statsManager) return;

            const stats = this.app.stats; 
            const isOnline = this.app.onlineMode;
            const is2Player = this.app.players.length > 1;
            const isVsAi = this.app.aiMode;

            // POMOĆNA FUNKCIJA ZA OTKLJUČAVANJE I ISPLATU
            const unlock = (id) => {
                // Poziv StatsManageru da proveri da li je već otključan
                if (window.statsManager.unlockTrophy(id)) {
                     console.log(`🏆 OSVOJEN TROFEJ: ${id}`);
                     
                     // 1. Pronađi podatke o trofeju u SHOP_DATA (iz config.js)
                     const trophyData = SHOP_DATA.TROPHIES.find(t => t.id === id);
                     const rewardAmount = trophyData ? trophyData.reward : 0;
                     
                     // FIX: Koristimo resolveText (iz managers.js) da dobijemo preveden naziv trofeja
                     const title = trophyData ? resolveText(trophyData.title) : "TROPHY";

                     // 2. ISPLATA NAGRADE (Dodavanje dukata na balans)
                     if (rewardAmount > 0) {
                         // addBalance je definisana u ShopManageru unutar managers.js
                         // shop instanca je dostupna u riznica/kockice, ali ovde koristimo globalni stats
                         let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
                         currentDukati += rewardAmount;
                         localStorage.setItem('yamb_dukati', currentDukati);
                         
                         // Sinhronizacija sa StatsManagerom
                         window.statsManager.stats.balance = currentDukati;
                         window.statsManager.saveStats();
                         console.log(`💰 Isplaćena nagrada: ${rewardAmount} dukata.`);
                     }
                     
                     // 3. Obaveštenje i zvuk
                     if(this.app.soundMgr) this.app.soundMgr.trophy();
                     
                     // FIX: Lokalizovana poruka
                     // Formatiramo poruku: "Čestitamo! Osvojili ste trofej "{0}" i nagradu od {1}..."
                     let msg = t('msg_trophy_won')
                        .replace('{0}', title)
                        .replace('{1}', rewardAmount);

                     const modal = this.app.modal || new ModalManager();
                     modal.alert(msg, t('title_trophy_won'));
                }
            };

            // --- PROVERE USLOVA ---
            if (stats.games >= 1) unlock('first_play');
            if (stats.games >= 10) unlock('apprentice');
            if (stats.games >= 50) unlock('veteran');
            if (is2Player && !isVsAi && !isOnline) unlock('kafana');

            if (finalScore >= 1000) unlock('score_1000');
            if (finalScore >= 1250) unlock('grandmaster');
            if (finalScore >= 2000) unlock('legend');
            if (finalScore >= 2500) unlock('mythic');
            if (finalScore >= 3000) unlock('godlike');

            const cols = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];
            let allYambs = 0, allKentas = 0, sum1Bonuses = 0, minColumnSum = 9999;
            let hasZero = false, yambIsZero = false, maxMinDiffOver60 = false;

            cols.forEach(col => {
                const data = sheet[col];
                if (data['Yamb'] > 0) allYambs++;
                if (data['Yamb'] === 0) yambIsZero = true;
                if (data['Kenta'] > 0) allKentas++;

                Object.values(data).forEach(val => { if (val === 0) hasZero = true; });
                if (data['Min'] !== null && data['Min'] < minColumnSum) minColumnSum = data['Min'];

                let sum1 = 0;
                ["1", "2", "3", "4", "5", "6"].forEach(r => sum1 += (data[r] || 0));
                if (sum1 >= 60) sum1Bonuses++;
                if (sum1 === 63) unlock('math'); 

                const vMax = data["Max"], vMin = data["Min"], v1 = data["1"];
                if (vMax !== null && vMin !== null && v1 !== null) {
                    if ((vMax - vMin) * v1 > 60) maxMinDiffOver60 = true;
                }
            });

            if (sheet['Ručno']) {
                let rucnoZero = false;
                Object.values(sheet['Ručno']).forEach(val => { if(val === 0) rucnoZero = true; });
                if (!rucnoZero) unlock('surgeon'); 
                if (sheet['Ručno']['Yamb'] > 0) unlock('hazard');
            }

            if (this.app.hasProphet) unlock('prophet');
            if (sheet['Najava'] && sheet['Najava']['Yamb'] > 0) unlock('sniper');
            if (this.app.hasSvetiIlija) unlock('sveti_ilija');
            if (allYambs >= 5) unlock('firecracker');
            if (allKentas >= 6) unlock('concrete');
            if (sum1Bonuses >= 6) unlock('perfectionist');
            if (maxMinDiffOver60) unlock('miner');
            if (!hasZero) unlock('immortal');
            if (yambIsZero) unlock('potato');
            if (minColumnSum < 7) unlock('minimal');

            if (hasZero) {
                let zerosCount = 0, yambZeros = 0;
                cols.forEach(c => {
                    Object.entries(sheet[c]).forEach(([key, val]) => {
                        if (val === 0) { zerosCount++; if (key === 'Yamb') yambZeros++; }
                    });
                });
                if (zerosCount > 0 && zerosCount === yambZeros) unlock('achilles');
            }

            if (is2Player) {
                const scores = this.app.players.map((_, i) => this.app.calculateTotalScore(i));
                const diff = Math.abs(scores[0] - scores[1]);
                if (diff < 5 && diff > 0) unlock('close_call');
            }

            if (is2Player || isVsAi) {
                const myName = this.app.playerName;
                const myIdx = this.app.players.findIndex(p => p === myName);
                if (myIdx !== -1) {
                    const oppIdx = (myIdx === 0) ? 1 : 0;
                    const myTotal = this.app.calculateTotalScore(myIdx);
                    const oppTotal = this.app.calculateTotalScore(oppIdx);
                    if ((oppTotal - myTotal) >= 200) unlock('spite');
                }
            }

            const hour = new Date().getHours();
            if (hour >= 3 && hour <= 5) unlock('night_owl');
        }
    };
}