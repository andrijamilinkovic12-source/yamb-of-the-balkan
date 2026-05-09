class TrophyManager {
    constructor(statsManager, soundManager) {
        this.statsMgr = statsManager;
        this.soundMgr = soundManager;
        this.trophies = SHOP_DATA.TROPHIES; // Učitava definicije iz config.js
    }

    getProjectedStats(score) {
        const stats = this.statsMgr && typeof this.statsMgr.getStats === 'function'
            ? this.statsMgr.getStats()
            : {};
        const playedGames = Math.max(Number(stats.games) || 0, Number(stats.totalGames) || 0);

        return {
            ...stats,
            games: playedGames + 1,
            totalGames: playedGames + 1,
            highscore: Math.max(Number(stats.highscore) || 0, Number(score) || 0)
        };
    }

    buildClaimProof(score, sheet, mode, flags = {}) {
        return {
            finalScore: Number(score) || 0,
            sheet,
            mode,
            flags: {
                ...flags,
                localHour: new Date().getHours()
            },
            stats: this.getProjectedStats(score)
        };
    }

    updateBalanceDisplay() {
        const balanceEl = document.getElementById('stat-balance');
        if (balanceEl && this.statsMgr && this.statsMgr.stats) {
            balanceEl.innerText = this.statsMgr.stats.balance;
        }
    }

    applyLocalReward(trophy) {
        const reward = Math.max(0, Number(trophy.reward) || 0);
        if (!this.statsMgr || !this.statsMgr.stats || reward <= 0) return;

        this.statsMgr.stats.balance = Math.max(0, (Number(this.statsMgr.stats.balance) || 0) + reward);
        this.statsMgr.saveStats();
        this.updateBalanceDisplay();
    }

    setServerBalance(balance) {
        if (!this.statsMgr || !this.statsMgr.stats || typeof balance !== 'number') return;

        this.statsMgr.stats.balance = Math.max(0, balance);
        this.statsMgr.saveStats();
        this.updateBalanceDisplay();
    }

    async claimServerReward(trophy, proof) {
        const app = window.app;
        const reward = Math.max(0, Number(trophy.reward) || 0);

        if (!app || !app.socket || !app.socket.connected) {
            return { ok: true, localFallback: true, trophyId: trophy.id, reward };
        }

        if (typeof app.authenticateSocketIdentity !== 'function') {
            return { ok: true, localFallback: true, trophyId: trophy.id, reward, reason: 'auth_helper_missing' };
        }

        const authResult = await app.authenticateSocketIdentity();
        if (!authResult || !authResult.ok) {
            return { ok: true, localFallback: true, trophyId: trophy.id, reward, reason: authResult?.reason || 'auth_failed' };
        }

        return new Promise(resolve => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'claim_timeout', trophyId: trophy.id });
            }, 8000);

            app.socket.emit('claim_trophy_reward', { trophyId: trophy.id, proof }, result => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'empty_claim_response', trophyId: trophy.id });
            });
        });
    }

    // Ovu funkciju poziva game.js na kraju partije (handleGameOver)
    checkEndGameTrophies(score, sheet, mode, flags = {}) {
        if (!this.statsMgr) return;
        
        const stats = this.getProjectedStats(score);
        const proof = this.buildClaimProof(score, sheet, mode, flags);
        const unlockedNow = [];

        // Prolazimo kroz sve trofeje definisane u config.js
        this.trophies.forEach(trophy => {
            // Ako je već otključan, preskoči
            if (stats.unlockedTrophies && stats.unlockedTrophies.includes(trophy.id)) return;

            let conditionMet = false;

            // --- LOGIKA ZA SVAKI TROFEJ ---
            switch (trophy.id) {
                // 1. OSNOVNI
                case 'first_play':
                    // Provera da li ima bar 1 odigranu partiju
                    if (stats.totalGames >= 1) conditionMet = true;
                    break;
                case 'apprentice':
                    if (stats.totalGames >= 10) conditionMet = true;
                    break;
                case 'veteran':
                    if (stats.totalGames >= 50) conditionMet = true;
                    break;
                case 'kafana':
                    if (mode === 'Hotseat') conditionMet = true;
                    break;

                // 2. REZULTATI
                case 'score_1000':
                    if (score >= 1000) conditionMet = true;
                    break;
                case 'grandmaster':
                    if (score >= 1250) conditionMet = true;
                    break;
                case 'legend':
                    if (score >= 2000) conditionMet = true;
                    break;
                case 'mythic':
                    if (score >= 2500) conditionMet = true;
                    break;
                case 'godlike':
                    if (score >= 3000) conditionMet = true;
                    break;

                // 3. SPECIFIČNE KOLONE I REDOVI
                case 'surgeon': 
                    conditionMet = this.checkColumnNoZero(sheet, 'Ručno');
                    break;
                case 'immortal':
                    conditionMet = this.checkFullSheetNoZero(sheet);
                    break;
                case 'minimal':
                    // Proverava da li je u bilo kojoj koloni Min < 7 i > 0
                    conditionMet = KOLONE.some(col => sheet[col]['Min'] !== null && sheet[col]['Min'] < 7 && sheet[col]['Min'] > 0);
                    break;
                case 'math':
                    conditionMet = this.checkSum1Exactly63(sheet);
                    break;
                case 'concrete':
                    conditionMet = KOLONE.every(col => sheet[col]['Kenta'] !== null && sheet[col]['Kenta'] > 0);
                    break;
                case 'perfectionist':
                    conditionMet = this.checkBonusEverywhere(sheet);
                    break;
                case 'miner':
                    conditionMet = this.checkMiner(sheet);
                    break;

                // 4. SPECIJALNI FLAG-ovi (dolaze iz game.js tokom igre)
                case 'prophet':
                    if (flags.hasProphet) conditionMet = true;
                    break;
                case 'sveti_ilija':
                    if (flags.hasSvetiIlija) conditionMet = true;
                    break;
                case 'sniper':
                    if (sheet['Najava']['Yamb'] !== null && sheet['Najava']['Yamb'] > 0) conditionMet = true;
                    break;
                case 'hazard':
                    if (sheet['Ručno']['Yamb'] !== null && sheet['Ručno']['Yamb'] > 0) conditionMet = true;
                    break;
                case 'firecracker':
                    conditionMet = KOLONE.every(col => sheet[col]['Yamb'] !== null && sheet[col]['Yamb'] > 0);
                    break;
                
                // 5. NESREĆE
                case 'potato':
                    conditionMet = KOLONE.some(col => sheet[col]['Yamb'] === 0);
                    break;
                case 'achilles':
                    // Yamb je 0 u bar 3 kolone a skor preko 800
                    const yambZeros = KOLONE.filter(c => sheet[c]['Yamb'] === 0).length;
                    if (yambZeros >= 3 && score > 800) conditionMet = true;
                    break;
                
                // --- 6. NEDOSTAJUĆI TROFEJI ---
                
                case 'night_owl':
                    // Provera da li je trenutno vreme između 03:00 i 05:59
                    const hour = new Date().getHours();
                    if (hour >= 3 && hour < 6) conditionMet = true;
                    break;

                case 'close_call':
                    if (mode !== 'Solo' && flags.scoreDiff !== undefined) {
                        const diff = Math.abs(flags.scoreDiff);
                        if (diff > 0 && diff < 5) conditionMet = true;
                    }
                    break;

                case 'spite':
                    if (mode !== 'Solo' && flags.scoreDiff !== undefined) {
                        if (flags.scoreDiff >= 200) conditionMet = true;
                    }
                    break;
            }

            if (conditionMet) {
                this.unlock(trophy, proof);
                unlockedNow.push(trophy);
            }
        });

        return unlockedNow;
    }

    // --- POMOĆNE PROVERE ---

    checkColumnNoZero(sheet, colName) {
        if (!sheet[colName]) return false;
        for (let row of REDOVI_IGRA) {
            const val = sheet[colName][row];
            if (val === 0 || val === null) return false;
        }
        return true;
    }

    checkFullSheetNoZero(sheet) {
        for (let col of KOLONE) {
            for (let row of REDOVI_IGRA) {
                if (sheet[col][row] === 0 || sheet[col][row] === null) return false;
            }
        }
        return true;
    }

    checkSum1Exactly63(sheet) {
        for (let col of KOLONE) {
            let s = 0;
            ['1','2','3','4','5','6'].forEach(r => s += (sheet[col][r] || 0));
            if (s === 63) return true;
        }
        return false;
    }

    checkBonusEverywhere(sheet) {
        for (let col of KOLONE) {
            let s = 0;
            ['1','2','3','4','5','6'].forEach(r => s += (sheet[col][r] || 0));
            if (s < 60) return false;
        }
        return true;
    }

    checkMiner(sheet) {
        for (let col of KOLONE) {
            const max = sheet[col]['Max'];
            const min = sheet[col]['Min'];
            const one = sheet[col]['1'];
            if (max !== null && min !== null && one !== null) {
                let calc = (max - min) * one;
                if (calc > 60) return true;
            }
        }
        return false;
    }

    unlock(trophy, proof = {}) {
        console.log(`🏆 OTKLJUČAN TROFEJ: ${trophy.id}`);
        
        // 1. Sačuvaj u stats
        if (!this.statsMgr.unlockTrophy(trophy.id)) return;

        const notify = (rewardAmount = Math.max(0, Number(trophy.reward) || 0)) => {
            if (this.soundMgr) this.soundMgr.trophy();
            this.showNotification(trophy, rewardAmount);
        };

        this.claimServerReward(trophy, proof)
            .then(result => {
                if (result && result.ok && result.localFallback) {
                    this.applyLocalReward(trophy);
                    notify(trophy.reward);
                    return;
                }

                if (result && result.ok) {
                    if (typeof result.balance === 'number') this.setServerBalance(result.balance);
                    notify(Math.max(0, Number(result.reward) || 0));
                    return;
                }

                console.warn(`Trofej ${trophy.id} nije isplaćen na serveru: ${result?.reason || 'unknown_error'}`);
                notify(0);
            })
            .catch(err => {
                console.warn("Greška pri server isplati trofeja, koristim lokalni fallback:", err);
                this.applyLocalReward(trophy);
                notify(trophy.reward);
            });
    }

    showNotification(trophy, rewardOverride = null) {
        const div = document.createElement('div');
        div.className = 'trophy-popup';
        
        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const title = trophy.title[lang] || trophy.title['sr'];
        const desc = trophy.desc[lang] || trophy.desc['sr'];
        const reward = rewardOverride !== null ? rewardOverride : trophy.reward;
        const rewardHtml = reward > 0 ? `<div class="tp-reward">+${reward} 💰</div>` : '';

        div.innerHTML = `
            <div class="tp-icon">${trophy.icon}</div>
            <div class="tp-content">
                <div class="tp-title">${title}</div>
                <div class="tp-desc">${desc}</div>
                ${rewardHtml}
            </div>
        `;

        document.body.appendChild(div);

        setTimeout(() => div.classList.add('active'), 100);

        setTimeout(() => {
            div.classList.remove('active');
            setTimeout(() => div.remove(), 500);
        }, 4000);
    }
}

// Globalna definicija klase da bi je game.js video
window.TrophyManager = TrophyManager;
