// features.js - Logika trofeja, skinova i efekata (OPTIMIZED)

if (typeof window.YambFeatures === 'undefined') {

    window.YambFeatures = class {
        constructor(app) {
            this.app = app;
        }

        /**
         * Primenjuje CSS klase na kockice na osnovu odabranog skina.
         */
        applySkinToElement(element, isHeld = false) {
            if (!element) return;

            const configuredSkins = (typeof SHOP_DATA !== 'undefined' && Array.isArray(SHOP_DATA.SKINS))
                ? SHOP_DATA.SKINS.map(item => item.id)
                : [];
            const savedSkin = localStorage.getItem('yamb_active_skin') || 'default';
            const activeSkin = configuredSkins.length === 0 || configuredSkins.includes(savedSkin)
                ? savedSkin
                : 'default';

            element.classList.add('dice');
            Array.from(element.classList).forEach(className => {
                if (className.startsWith('skin-')) element.classList.remove(className);
            });
            element.classList.toggle('held', !!isHeld);
            element.classList.add(`skin-${activeSkin}`);
        }

        /**
         * Vizuelni efekti tokom poteza
         */
        checkMoveEffects(row, pts, isHuman) {
            if (!isHuman) return;

            // --- NAPOMENA: UKLONJEN EKSPLICITNI POZIV ZA THUNDER I ICE AGE ---
            // Razlog: game.js već poziva celebrateYamb() i specifične efekte 
            // kroz novi kod u managers.js. Ovde bi to bio duplikat.

            // 2. KONFETE (Za skor >= 60, kao dodatna nagrada za dobre poteze)
            // Yamb se slavi isključivo kroz game.js: aktivni efekat ili grom za prvo bacanje.
            if (row !== 'Yamb' && pts >= 60) {
                if(window.confetti) {
                    window.confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
                }
            }
        }

        /**
         * GLAVNA FUNKCIJA: Proverava sve uslove za trofeje na kraju igre.
         */
        checkAchievements(finalScore, sheet) {
            if (!window.statsManager) return;

            const stats = this.app.stats; 
            const isOnline = this.app.onlineMode;
            const is2Player = this.app.players.length > 1;
            const isVsAi = this.app.aiMode;
            const getBelgradeHour = () => {
                try {
                    const hourString = new Intl.DateTimeFormat('en-US', {
                        hour: 'numeric',
                        hour12: false,
                        timeZone: 'Europe/Belgrade'
                    }).format(new Date());
                    return Number(hourString);
                } catch (err) {
                    return new Date().getHours();
                }
            };
            const getProfilePlayerIndex = () => {
                if (isOnline && Number.isInteger(this.app.myOnlineIndex) && this.app.myOnlineIndex >= 0) {
                    return this.app.myOnlineIndex;
                }
                return this.app.players.findIndex(p => p === this.app.playerName);
            };
            const getScoreDiff = () => {
                if ((!is2Player && !isVsAi) || !this.app.players || this.app.players.length < 2) return 0;

                const myIdx = getProfilePlayerIndex();
                if (myIdx < 0 || typeof this.app.calculateTotalScore !== 'function') return 0;

                const myTotal = this.app.calculateTotalScore(myIdx);
                let bestOpponentScore = null;
                this.app.players.forEach((_, index) => {
                    if (index === myIdx) return;
                    const opponentScore = this.app.calculateTotalScore(index);
                    if (bestOpponentScore === null || opponentScore > bestOpponentScore) {
                        bestOpponentScore = opponentScore;
                    }
                });

                return bestOpponentScore === null ? 0 : bestOpponentScore - myTotal;
            };

            // POMOĆNA FUNKCIJA ZA BEZBEDAN PREVOD
            const _safeT = (key) => (typeof t !== 'undefined' ? t(key) : key);

            const getTrophyData = (id) => {
                if(typeof SHOP_DATA !== 'undefined' && SHOP_DATA.TROPHIES) {
                    return SHOP_DATA.TROPHIES.find(t => t.id === id);
                }
                if (typeof CONFIG !== 'undefined' && CONFIG.TROPHIES) {
                    return CONFIG.TROPHIES.find(t => t.id === id);
                }
                return null;
            };

            const buildProof = () => {
                const statsSnapshot = window.statsManager.getStats ? window.statsManager.getStats() : (window.statsManager.stats || {});
                const playedGames = Math.max(Number(statsSnapshot.games) || 0, Number(statsSnapshot.totalGames) || 0);

                return {
                    finalScore,
                    sheet,
                    mode: isOnline ? 'Online' : (is2Player && !isVsAi ? 'Hotseat' : (isVsAi ? 'AI' : 'Solo')),
                    flags: {
                        hasProphet: !!this.app.hasProphet,
                        hasSvetiIlija: !!this.app.hasSvetiIlija,
                        scoreDiff: getScoreDiff(),
                        localHour: getBelgradeHour()
                    },
                    stats: {
                        ...statsSnapshot,
                        games: playedGames + 1,
                        totalGames: playedGames + 1,
                        highscore: Math.max(Number(statsSnapshot.highscore) || 0, Number(finalScore) || 0)
                    }
                };
            };

            // POMOĆNA FUNKCIJA ZA OTKLJUČAVANJE I ISPLATU
            const unlock = (id) => {
                const trophyData = getTrophyData(id);

                if (trophyData && window.trophyManager && typeof window.trophyManager.unlock === 'function') {
                    window.trophyManager.unlock(trophyData, buildProof());
                    return;
                }

                if (window.statsManager.unlockTrophy(id)) {
                     console.log(`🏆 OSVOJEN TROFEJ: ${id}`);
                     
                     const rewardAmount = trophyData ? trophyData.reward : 0;
                     const lang = localStorage.getItem('yamb_lang') || 'sr';
                     const title = trophyData ? (trophyData.title[lang] || trophyData.title['sr']) : "TROPHY";

                     if (rewardAmount > 0) {
                         let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
                         currentDukati += rewardAmount;
                         localStorage.setItem('yamb_dukati', currentDukati);
                         
                         window.statsManager.stats.balance = currentDukati;
                         window.statsManager.saveStats();
                     }
                     
                     if(this.app.soundMgr) this.app.soundMgr.trophy();
                     
                     const modal = this.app.modal || window.modalManager;
                     
                     // Prevod i popunjavanje poruke o osvojenom trofeju
                     let msg = _safeT('msg_trophy_won');
                     if (msg === 'msg_trophy_won') {
                         msg = `Čestitamo! Osvojili ste trofej "${title}" i nagradu od ${rewardAmount} dukata!`;
                     } else {
                         msg = msg.replace('{0}', title).replace('{1}', rewardAmount);
                     }

                     modal.alert(msg, _safeT('title_trophy_won') || "🏆 NOVI TROFEJ!");
                }
            };

            // --- PROVERE USLOVA (Logika ostaje ista) ---
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
                if (vMax !== null && vMin !== null && v1 !== null && vMin > 0) {
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
                const diff = Math.abs(getScoreDiff());
                if (diff < 5 && diff > 0) unlock('close_call');
            }

            if (is2Player || isVsAi) {
                if (getScoreDiff() >= 200) unlock('spite');
            }

            const hour = getBelgradeHour();
            if (hour >= 3 && hour < 6) unlock('night_owl');
        }
    };
}
