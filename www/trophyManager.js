class TrophyManager {
    constructor(statsManager, soundManager) {
        this.statsMgr = statsManager;
        this.soundMgr = soundManager;
        this.trophies = SHOP_DATA.TROPHIES; // Učitava definicije iz config.js
    }

    // Ovu funkciju poziva game.js na kraju partije (handleGameOver)
    checkEndGameTrophies(score, sheet, mode, flags = {}) {
        if (!this.statsMgr) return;
        
        const stats = this.statsMgr.getStats();
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
                this.unlock(trophy);
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

    unlock(trophy) {
        console.log(`🏆 OTKLJUČAN TROFEJ: ${trophy.id}`);
        
        // 1. Sačuvaj u stats
        this.statsMgr.unlockTrophy(trophy.id);
        
        // 2. Dodaj nagradu
        if (this.statsMgr.stats) {
            this.statsMgr.stats.balance += trophy.reward;
            this.statsMgr.saveStats();
            
            // --- DODATO ZA CLOUD SYNC ---
            if (window.app && window.app.socket && window.app.socket.connected) {
                window.app.socket.emit('set_player_data', {
                    uid: localStorage.getItem('yamb_uid') || window.app.playerId,
                    name: window.app.playerName,
                    stats: window.app.getFullLocalStats(),
                    playerId: window.app.playerId
                });
            }

            // Ažuriraj prikaz stanja ako smo u game-over ekranu
            const balanceEl = document.getElementById('stat-balance'); 
            if (balanceEl) balanceEl.innerText = this.statsMgr.stats.balance;
        }

        // 3. Zvuk
        if (this.soundMgr) this.soundMgr.trophy();

        // 4. Vizuelna notifikacija
        this.showNotification(trophy);
    }

    showNotification(trophy) {
        const div = document.createElement('div');
        div.className = 'trophy-popup';
        
        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const title = trophy.title[lang] || trophy.title['sr'];
        const desc = trophy.desc[lang] || trophy.desc['sr'];

        div.innerHTML = `
            <div class="tp-icon">${trophy.icon}</div>
            <div class="tp-content">
                <div class="tp-title">${title}</div>
                <div class="tp-desc">${desc}</div>
                <div class="tp-reward">+${trophy.reward} 💰</div>
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