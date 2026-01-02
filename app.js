const SERVER_URL = 'https://yamb-of-the-balkan.onrender.com';

// --- EFFECT MANAGER ---
class EffectManager {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.animating = false;
            this.currentType = 'confetti';
        }
    }

    resize() { 
        if(this.canvas) {
            this.canvas.width = window.innerWidth; 
            this.canvas.height = window.innerHeight; 
        }
    }

    trigger(effectName) {
        if(!this.canvas) return;
        this.stop(); 
        this.currentType = effectName || 'confetti';
        
        if(['glass', 'shadow', 'neon_pulse', 'thunder'].includes(this.currentType)) {
            let cssClass = 'fx-' + this.currentType;
            let duration = 4000; 

            if(this.currentType === 'thunder') {
                cssClass = 'anim-thunder';
                duration = 600;
            } else if (this.currentType === 'neon_pulse') {
                duration = 2500;
            }

            document.body.classList.add(cssClass);
            setTimeout(() => document.body.classList.remove(cssClass), duration);
            return; 
        }

        this.particles = [];
        this.animating = true;
        
        let count = 150;
        if (this.currentType === 'fireworks') count = 300;
        if (this.currentType === 'balkan') count = 80;
        if (this.currentType === 'fireflies') count = 60;

        for(let i=0; i<count; i++) this.particles.push(this.createParticle(true));
        this.animate();
    }

    stop() {
        this.animating = false;
        if(this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        document.body.classList.remove('anim-thunder', 'fx-glass', 'fx-shadow', 'fx-neon_pulse');
    }

    createParticle(init = false) {
        let x = Math.random() * this.canvas.width;
        let y = Math.random() * this.canvas.height - this.canvas.height;
        let speedY = Math.random() * 5 + 2; 
        let speedX = Math.random() * 4 - 2;
        let rotation = Math.random() * 360;
        let rotSpeed = Math.random() * 5 - 2;
        let size = Math.random() * 8 + 4;
        let color = '#fff';
        let type = 'rect'; 

        if (this.currentType === 'gold_rain') {
            color = ['#FFD700', '#DAA520', '#B8860B', '#F0E68C'][Math.floor(Math.random()*4)];
            if(Math.random() < 0.1) type = 'money';
        } 
        else if (this.currentType === 'balkan') {
            if(Math.random() < 0.3) type = Math.random() > 0.5 ? 'trumpet' : 'money_fly';
            else color = ['#c31432', '#240b36', '#fff'][Math.floor(Math.random()*3)];
        } 
        else if (this.currentType === 'fireflies') {
            y = init ? Math.random() * this.canvas.height : this.canvas.height + 10;
            speedY = (Math.random() * 1.5 + 0.5) * -1; 
            speedX = Math.random() * 2 - 1; 
            color = ['#ccff00', '#ffff00', '#aaff00'][Math.floor(Math.random()*3)];
            type = 'circle';
            size = Math.random() * 4 + 2;
        }
        else if (this.currentType === 'fireworks') {
            if (init) {
                x = this.canvas.width / 2;
                y = this.canvas.height / 2;
            }
            speedY = (Math.random() - 0.5) * 15;
            speedX = (Math.random() - 0.5) * 15;
            color = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random()*6)];
            type = 'circle';
            size = Math.random() * 5 + 2;
        }
        else {
            color = ['#D4AF37', '#FFD700', '#FFFFFF', '#ef5350', '#4fc3f7'][Math.floor(Math.random()*5)];
        }

        return { x, y, speedY, speedX, rotation, rotSpeed, size, color, type, life: 1.0 };
    }

    animate() {
        if(!this.animating) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach((p, i) => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotSpeed;
            
            if (this.currentType === 'fireworks') {
                p.speedY += 0.1;
                p.speedX *= 0.96;
                p.size *= 0.96; 
                if (p.size < 0.5) this.particles[i] = this.createParticle(); 
            }
            else if (this.currentType === 'fireflies') {
                if (p.y < -50) this.particles[i] = this.createParticle();
            }
            else {
                if(p.y > this.canvas.height) this.particles[i] = this.createParticle();
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation * Math.PI/180);

            if(p.type === 'money') {
                this.ctx.font = "20px Arial"; this.ctx.fillText("💰", 0, 0);
            } else if (p.type === 'trumpet') {
                this.ctx.font = "24px Arial"; this.ctx.fillText("🎺", 0, 0);
            } else if (p.type === 'money_fly') {
                this.ctx.font = "20px Arial"; this.ctx.fillText("💶", 0, 0);
            } else if (p.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                if (this.currentType === 'fireflies') {
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = p.color;
                }
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            }
            this.ctx.restore();
        });
        requestAnimationFrame(() => this.animate());
    }
}

class ModalManager { constructor() { this.overlay = document.getElementById('custom-modal-overlay'); this.titleEl = document.getElementById('cm-title'); this.msgEl = document.getElementById('cm-msg'); this.inputEl = document.getElementById('cm-input'); this.btnOk = document.getElementById('cm-ok'); this.btnCancel = document.getElementById('cm-cancel'); this.resolvePromise = null; this.btnOk.onclick = () => this.handleOk(); this.btnCancel.onclick = () => this.handleCancel(); this.inputEl.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.handleOk(); }); } reset() { this.overlay.classList.remove('active'); this.inputEl.classList.add('hidden'); this.btnCancel.classList.add('hidden'); this.inputEl.value = ''; this.resolvePromise = null; } show(title, msg, type = 'alert') { return new Promise((resolve) => { this.resolvePromise = resolve; this.titleEl.innerText = title; this.msgEl.innerHTML = msg.replace(/\n/g, '<br>'); this.inputEl.classList.toggle('hidden', type !== 'prompt'); this.btnCancel.classList.toggle('hidden', type === 'alert'); this.overlay.classList.add('active'); if (type === 'prompt') this.inputEl.focus(); }); } alert(msg, title = "OBAVEŠTENJE") { return this.show(title, msg, 'alert'); } confirm(msg, title = "POTVRDA") { return this.show(title, msg, 'confirm'); } prompt(msg, title = "UNOS") { return this.show(title, msg, 'prompt'); } handleOk() { if (this.resolvePromise) { if (!this.inputEl.classList.contains('hidden')) { this.resolvePromise(this.inputEl.value); } else { this.resolvePromise(true); } } this.reset(); } handleCancel() { if (this.resolvePromise) this.resolvePromise(false); this.reset(); } }
const DICE_SYMBOLS = {0: "", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6"};
const UNICODE_DICE = {0: "", 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅"};
const REDOVI_IGRA = ["1", "2", "3", "4", "5", "6", "Max", "Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];
const REDOVI_PRIKAZ = ["1", "2", "3", "4", "5", "6", "ZBIR 1", "Max", "Min", "ZBIR 2", "Triling", "Kenta", "Ful", "Poker", "Yamb", "ZBIR 3"];
const KOLONE = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const sum = arr => arr.reduce((a, b) => a + b, 0);
class SoundManager { constructor() { this.ctx = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext(); } playTone(freq, type, duration, vol=0.1) { if (!app.soundEnabled) return; try { const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime); gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration); osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration); } catch(e) {} } click() { this.playTone(800, 'sine', 0.05, 0.05); } roll() { if (!app.soundEnabled) return; this.playTone(150, 'square', 0.1, 0.02); } score() { this.playTone(600, 'sine', 0.3, 0.1); setTimeout(()=>this.playTone(900, 'sine', 0.4, 0.1), 100); } error() { this.playTone(150, 'sawtooth', 0.3, 0.1); } win() { if(!app.soundEnabled) return; [0, 200, 400, 600].forEach((t, i) => setTimeout(() => this.playTone(400 + (i*100), 'square', 0.2, 0.1), t)); } chat() { this.playTone(1200, 'sine', 0.1, 0.05); } }

// --- DIVINE YAMB AI ENGINE v14.0 ---
class YambAI {
    constructor(appInstance, difficulty = 'medium') {
        this.app = appInstance;
        this.difficulty = difficulty;
        this.colPriority = { "Nadole": 55, "Nagore": 55, "Sredina": 45, "Ručno": 65, "Najava": 60, "Slobodna": 5 };
    }

    decideRoll(dice, turnNum, sheet) {
        const analysis = this.analyzeHand(dice);
        const emptyStats = this.getEmptyStats(sheet);
        if (turnNum === 1) {
            const forceNajava = (emptyStats.najava > 0 && (emptyStats.total < 15 || emptyStats.najava > emptyStats.others));
            const manualMove = this.checkManualOpprotunity(dice, analysis, sheet);
            if (manualMove && manualMove.points >= 40) return { type: 'write', row: manualMove.row, col: 'Ručno' };
            if (manualMove && !forceNajava) return { type: 'write', row: manualMove.row, col: 'Ručno' };
            if (!this.app.najavaAktivna) {
                const bestAnnounce = this.evaluateAnnouncement(dice, analysis, sheet, forceNajava);
                if (bestAnnounce) {
                    this.app.clickNajava();
                    this.app.najavljenoPolje = { row: bestAnnounce, col: 'Najava' };
                    this.app.najavaAktivna = false; 
                    const btnId = `btn-${this.app.currentPlayerIdx}-Najava-${bestAnnounce}`;
                    const btnEl = document.getElementById(btnId);
                    if(btnEl) btnEl.classList.add('highlight-najava');
                    const btnN = document.getElementById('btn-najava');
                    if(btnN) { btnN.innerText = `Najava: ${bestAnnounce}`; btnN.disabled = true; btnN.classList.remove('btn-active-toggle'); }

                    const holdMask = this.getHoldMaskForTarget(dice, bestAnnounce);
                    return { type: 'hold', hold: holdMask };
                }
            }
        }
        if (this.app.najavljenoPolje) {
                if (turnNum === 3) return { type: 'write', row: this.app.najavljenoPolje.row, col: 'Najava' };
                const holdMask = this.getHoldMaskForTarget(dice, this.app.najavljenoPolje.row);
                return { type: 'hold', hold: holdMask };
        }
        if (turnNum === 3) {
            const bestMove = this.findBestScore(dice, sheet);
            if (bestMove) return bestMove;
            return this.panicWrite(sheet);
        }
        const bestHold = this.calculateSmartHold(dice, sheet, turnNum);
        return { type: 'hold', hold: bestHold };
    }

    getEmptyStats(sheet) {
        let total = 0; let najava = 0;
        for(let col in sheet) {
            for(let row in sheet[col]) {
                if(sheet[col][row] === null) {
                    total++;
                    if(col === "Najava") najava++;
                }
            }
        }
        return { total, najava, others: total - najava };
    }

    evaluateAnnouncement(dice, an, sheet, force = false) {
        let bestRow = null; 
        let maxScore = -9999;
        const potentialRows = REDOVI_IGRA.filter(r => this.isAvail(r, "Najava", sheet));
        if (potentialRows.length === 0) return null;
        potentialRows.forEach(row => {
            let score = 0;
            if (row === "Yamb") { if (an.maxCount >= 4) score = 150; else if (an.maxCount >= 3) score = 60; }
            else if (row === "Poker") { if (an.maxCount >= 4) score = 120; else if (an.maxCount >= 3) score = 70; else if (an.maxCount >= 2) score = 20; }
            else if (row === "Ful") { if (an.maxCount >= 3) score = 90; else if (Object.keys(an.counts).length <= 3) score = 50; }
            else if (row === "Triling") { if (an.maxCount >= 3) score = 80; else if (an.maxCount >= 2) score = 30; }
            else if (row === "Kenta") { if (an.nearKenta.length >= 4) score = 110; else if (an.nearKenta.length >= 3) score = 40; }
            else if (row === "Max") { const sum = dice.reduce((a,b)=>a+b, 0); const highCount = dice.filter(d => d >= 4).length; if (sum >= 22) score = 90; else if (highCount >= 3) score = 60; }
            else if (row === "Min") { const sum = dice.reduce((a,b)=>a+b, 0); const lowCount = dice.filter(d => d <= 3).length; if (sum <= 12) score = 90; else if (lowCount >= 3) score = 60; }
            else if (["1","2","3","4","5","6"].includes(row)) { const val = parseInt(row); const count = dice.filter(d => d === val).length; if (count >= 4) score = 100; else if (count === 3) score = 75; else if (count === 2) score = 40; else if (count === 1) score = 10; }
            if (score > maxScore) { maxScore = score; bestRow = row; }
        });
        if (force) { if (maxScore > 10) return bestRow; const fallback = potentialRows.find(r => ["1","2","3","4","5","6","Min","Max"].includes(r)); return fallback || potentialRows[0]; }
        if (maxScore >= 40) return bestRow;
        return null;
    }

    checkManualOpprotunity(dice, an, sheet) {
        let best = null; let maxW = 0;
        REDOVI_IGRA.forEach(row => {
            if (this.isAvail(row, "Ručno", sheet)) {
                const best5 = this.app.getBest5(row, dice); const pts = this.app.calcPoints(row, best5); let w = 0;
                if (row === "Yamb" && pts >= 50) w = 600; else if (row === "Kenta" && pts >= 56) w = 500;
                else if (row === "Poker" && pts >= 40) w = 400; else if (row === "Ful" && pts >= 30) w = 300;
                else if (["1","2","3","4","5","6"].includes(row)) { const count = dice.filter(d => d === parseInt(row)).length; if (count >= 5) w = 300; else if (count === 4) w = 200; }
                else if (row === "Min" && pts < 8 && pts > 0) w = 250; else if (row === "Max" && pts > 25) w = 250; 
                if (w > maxW) { maxW = w; best = { row, points: pts }; }
            }
        });
        return best;
    }

    findBestScore(dice, sheet) {
        let possibleMoves = []; 
        const cols = ["Nadole", "Nagore", "Sredina", "Ručno", "Najava", "Slobodna"];
        cols.forEach(col => {
            if (col === "Najava" && !this.app.najavaAktivna) return; 
            if (this.app.najavaAktivna && col !== "Najava") return;
            REDOVI_IGRA.forEach(row => {
                if (!this.isAvail(row, col, sheet)) return; 
                if (col === "Najava" && this.app.najavljenoPolje && this.app.najavljenoPolje.row !== row) return;
                let best5 = this.app.getBest5(row, dice); let pts = this.app.calcPoints(row, best5); 
                if (col === "Ručno" && this.app.brojBacanja > 1) pts = 0;
                let weight = pts; weight += this.colPriority[col];
                if (row === "Min") { if (pts > 0 && pts <= 10) weight += 150; else if (pts > 20) weight -= 500; else if (pts === 0) weight -= 1000; weight += (30 - pts) * 3; }
                else if (row === "Max") { if (pts >= 24) weight += 100; else if (pts < 15) weight -= 300; }
                else if (["1","2","3","4","5","6"].includes(row)) { const count = dice.filter(d => d === parseInt(row)).length; if (count >= 4) weight += 120; else if (count === 3) weight += 40; else if (count < 2) weight -= 200; }
                if (this.isNextInColumn(row, col, sheet) && pts > 0) weight += 200;
                possibleMoves.push({ type: 'write', row, col, points: pts, weight });
            });
        });
        possibleMoves.sort((a, b) => b.weight - a.weight);
        if (possibleMoves.length > 0) { if (possibleMoves[0].weight < -200) return null; return possibleMoves[0]; }
        return null;
    }

    isNextInColumn(row, col, sheet) {
        if (col === "Nadole") { const idx = REDOVI_IGRA.indexOf(row); if (idx === 0) return true; if (sheet[col][REDOVI_IGRA[idx-1]] !== null) return true; }
        if (col === "Nagore") { const idx = REDOVI_IGRA.indexOf(row); if (idx === REDOVI_IGRA.length - 1) return true; if (sheet[col][REDOVI_IGRA[idx+1]] !== null) return true; }
        if (col === "Sredina") {
            const up = ["Max", "6", "5", "4", "3", "2", "1"]; const down = ["Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];
            if (up.includes(row)) { const idx = up.indexOf(row); if (idx === 0) return true; if (sheet[col][up[idx-1]] !== null) return true; }
            if (down.includes(row)) { const idx = down.indexOf(row); if (idx === 0) return true; if (sheet[col][down[idx-1]] !== null) return true; }
            return false;
        }
        return true;
    }

    panicWrite(sheet) {
        const allCols = ["Ručno", "Slobodna", "Sredina", "Nadole", "Nagore"];
        for (let col of allCols) {
            if (col === "Najava") continue;
            const sacrificeOrder = ["1", "2", "3", "Triling", "4", "5", "6", "Max", "Min", "Kenta", "Ful", "Poker", "Yamb"];
            for (let row of sacrificeOrder) { if (this.isAvail(row, col, sheet)) return { type: 'write', row: row, col: 'Slobodna' }; }
        }
        return { type: 'write', row: '1', col: 'Slobodna' }; 
    }

    calculateSmartHold(dice, sheet, turnNum) {
        if (this.app.najavljenoPolje) return this.getHoldMaskForTarget(dice, this.app.najavljenoPolje.row);
        const an = this.analyzeHand(dice);
        if (an.maxCount >= 3) return this.getHoldMaskForTarget(dice, "Yamb");
        if (an.nearKenta.length >= 4) return dice.map(d => an.nearKenta.includes(d));
        if (Object.keys(an.counts).length <= 3) return this.getHoldMaskForTarget(dice, "Ful");
        const needMax = ["Nadole", "Nagore", "Slobodna"].some(c => this.isAvail("Max", c, sheet));
        if (needMax) { const highDice = dice.filter(d => d >= 4).length; if (highDice >= 3) return dice.map(d => d >= 4); }
        const needMin = ["Nadole", "Nagore", "Slobodna"].some(c => this.isAvail("Min", c, sheet));
        if (needMin) { const lowDice = dice.filter(d => d <= 3).length; if (lowDice >= 3) return dice.map(d => d <= 2); }
        return [false, false, false, false, false, false];
    }

    isAvail(row, col, sheet) { return sheet[col][row] === null && this.app.isValidColumnOrder(row, col, sheet); }

    getHoldMaskForTarget(dice, row) {
        if (["1","2","3","4","5","6"].includes(row)) return dice.map(d => d === parseInt(row));
        if (["Yamb", "Poker", "Triling"].includes(row)) { 
            const counts = {}; dice.forEach(x => counts[x] = (counts[x] || 0) + 1); 
            let maxVal = dice[0]; let maxC = 0; 
            for(let k in counts) { if(counts[k] > maxC || (counts[k]==maxC && parseInt(k)>maxVal)) { maxC = counts[k]; maxVal = parseInt(k); } } 
            return dice.map(d => d == maxVal); 
        }
        if (row === "Ful") {
            const counts = {}; dice.forEach(x => counts[x] = (counts[x] || 0) + 1);
            const triples = Object.keys(counts).filter(k => counts[k] >= 3).map(Number);
            const pairs = Object.keys(counts).filter(k => counts[k] >= 2).map(Number);
            if (triples.length > 0) {
                const target3 = Math.max(...triples); const remaining = dice.filter(d => d !== target3);
                const c2 = {}; remaining.forEach(x => c2[x] = (c2[x]||0)+1); const p2 = Object.keys(c2).filter(k => c2[k]>=2).map(Number);
                const target2 = p2.length > 0 ? Math.max(...p2) : null;
                return dice.map(d => d === target3 || d === target2);
            }
            if (pairs.length >= 2) return dice.map(d => pairs.includes(d));
            if (pairs.length === 1) return dice.map(d => d === pairs[0]);
            return this.getHoldMaskForTarget(dice, "Yamb");
        }
        if (row === "Kenta") { 
            const unique = [...new Set(dice)].sort((a,b)=>a-b);
            const seq4_low = [1,2,3,4].filter(x=>unique.includes(x)).length;
            const seq4_high = [3,4,5,6].filter(x=>unique.includes(x)).length;
            let targetSeq = [1,2,3,4,5]; if (seq4_high > seq4_low) targetSeq = [2,3,4,5,6];
            const used = new Set(); 
            return dice.map(d => { if(targetSeq.includes(d) && !used.has(d)) { used.add(d); return true; } return false; }); 
        }
        if (row === "Max") return dice.map(d => d >= 4);
        if (row === "Min") return dice.map(d => d <= 2);
        return [false,false,false,false,false,false];
    }

    analyzeHand(dice) {
        const counts = {}; dice.forEach(x => counts[x] = (counts[x] || 0) + 1);
        const maxCount = Math.max(...Object.values(counts));
        const valMaxCount = Number(Object.keys(counts).find(key => counts[key] === maxCount));
        const uniqueDice = [...new Set(dice)].sort((a,b)=>a-b);
        let bestStraight = [], maxStraightLen = 0; 
        [[1,2,3,4,5], [2,3,4,5,6]].forEach(seq => { const match = seq.filter(x => uniqueDice.includes(x)); if (match.length > maxStraightLen) { maxStraightLen = match.length; bestStraight = match; } });
        if (maxStraightLen < 4) { [[1,2,3,4], [2,3,4,5], [3,4,5,6]].forEach(seq => { const match = seq.filter(x => uniqueDice.includes(x)); if (match.length >= 4 && match.length > maxStraightLen) { maxStraightLen = match.length; bestStraight = match; } }); }
        return { counts, maxCount, valMaxCount, nearKenta: maxStraightLen >= 3 ? bestStraight : [], unique: uniqueDice };
    }
}

class AdMobController {
    constructor() {
        this.adLoaded = false;
        // Check if Capacitor exists before using it to prevent errors in browser
        this.isNative = typeof window.Capacitor !== 'undefined' && typeof AdMob !== 'undefined';
        this.testMode = true; 
    }

    async initialize() {
        if (!this.isNative) return;
        try {
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                initializeForTesting: true,
            });
        } catch (e) { console.error("AdMob init error:", e); }
    }

    async showRewardVideo() {
        return new Promise(async (resolve, reject) => {
            if (!this.isNative) {
                console.log("Simulacija reklame (Browser Mode)...");
                const btn = document.getElementById('btn-ad-double');
                if(btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = "Gledanje reklame...";
                    btn.disabled = true;
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        resolve(true); 
                    }, 2000);
                } else {
                    resolve(true);
                }
                return;
            }

            try {
                const adId = 'ca-app-pub-3940256099942544/5224354917'; 
                await AdMob.prepareRewardVideoAd({ adId: adId });
                const onReward = AdMob.addListener('onRewardVideoReward', (info) => {
                    resolve(true);
                    onReward.remove(); 
                });
                await AdMob.showRewardVideoAd();
            } catch (e) {
                console.error("Greška pri prikazu reklame:", e);
                alert("Trenutno nije moguće učitati reklamu. Proverite internet.");
                resolve(false);
            }
        });
    }
}

class YambApp {
    constructor() {
        this.players = []; this.allScores = []; this.currentPlayerIdx = 0;
        this.gameActive = false; this.aiMode = false; this.aiDifficulty = "medium"; this.ai = null;
        this.kockiceVals = [0,0,0,0,0,0]; this.zadrzane = [false,false,false,false,false,false];
        this.brojBacanja = 0; this.najavaAktivna = false; this.najavljenoPolje = null;
        this.modeTag = "Solo"; this.chatOpen = false; this.unreadMsgs = 0;
        this.aiPhrases = { start: ["Srećno!"], goodMove: ["Bravo!"], badMove: ["Moglo je bolje."], aiGood: ["To!"], thinking: ["Hmm..."], win: ["Pobedio sam!"], lose: ["Čestitam!"] };
        
        // --- HIGHSCORE INIT ---
        try { 
            const hsData = localStorage.getItem('yamb_highscores_v2'); 
            this.highscores = hsData ? JSON.parse(hsData) : []; 
            if(!Array.isArray(this.highscores)) this.highscores = [];
        } catch(e) { this.highscores = []; }

        this.socket = null; this.onlineMode = false; this.myOnlineIndex = 0;
        this.playerName = localStorage.getItem('yamb_player_name') || "Igrač";
        this.soundEnabled = localStorage.getItem('yamb_sound') === 'true';
        const savedStats = JSON.parse(localStorage.getItem('yamb_stats'));
        this.stats = savedStats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0 };
        
        const savedAiStats = JSON.parse(localStorage.getItem('yamb_ai_stats'));
        this.aiStats = savedAiStats || { games: 0, wins: 0, highscore: 0, totalScoreSum: 0 };

        this.diceBtns = []; 
        this.soundMgr = new SoundManager(); 
        this.modal = new ModalManager(); 
        this.effectMgr = new EffectManager(); 
        
        // --- ACHIEVEMENT TRACKING ---
        this.consecutiveNajava = 0; 
        this.hasSvetiIlija = false;
        this.hasProphet = false;

        // ADMOB INIT
        this.adMob = new AdMobController();
        this.pendingScore = 0; 
        setTimeout(() => this.adMob.initialize(), 2000);

        this.dragElement(document.getElementById("chat-window"));
        const btnSend = document.getElementById('btn-chat-send');
        if(btnSend) {
            btnSend.addEventListener('click', () => this.sendChat());
            btnSend.addEventListener('touchend', (e) => { e.preventDefault(); this.sendChat(); });
        }
        const chatInput = document.getElementById('chat-input-field');
        if(chatInput) {
            chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.sendChat(); });
        }
        
        const savedTheme = localStorage.getItem('yamb_theme');
        if (savedTheme === 'light') document.body.classList.add('light-theme'); 
        else if (savedTheme === 'medium') document.body.classList.add('medium-theme');
        else if (savedTheme === 'winter') document.body.classList.add('winter-theme');
        
        if (screen.orientation && screen.orientation.lock) { try { screen.orientation.lock('portrait').catch(e => { }); } catch(e){} }
        setTimeout(() => { this.checkForInvite(); }, 1000);
        setTimeout(() => { this.navigateTo('main-menu'); }, 4500);

        this.handleRotationLock();
        window.addEventListener('resize', () => this.handleRotationLock());
        window.addEventListener('orientationchange', () => this.handleRotationLock());

        this.uiInit();
    }

    handleRotationLock() {
        const overlay = document.getElementById('rotate-lock-overlay');
        if(!overlay) return;
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isLandscape = window.innerWidth > window.innerHeight;
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isAndroid && isTouchDevice && isLandscape && !isIOS) {
            overlay.style.display = 'flex';
            overlay.style.zIndex = '999999';
        } else {
            const cssTriggered = (window.innerHeight <= 600 && isLandscape);
            if (!cssTriggered) {
                overlay.style.display = 'none';
            }
        }
    }

    checkForInvite() { const params = new URLSearchParams(window.location.search); const roomId = params.get('room'); if (roomId) { this.navigateTo('splash-screen'); setTimeout(() => { const nickname = this.playerName; this.joinPrivateGame(nickname, roomId); }, 500); } }
    navigateTo(screenId) { 
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active')); 
        const target = document.getElementById(screenId); 
        if (target) target.classList.add('active'); 
        if(screenId === 'main-menu') this.checkSavedGame(); 
        
        // Force refresh highscores if entering that screen
        if (screenId === 'highscores-screen') {
            this.switchHsTab('local');
        }
    }

    uiInit() { const diceCont = document.getElementById('dice-container'); if(diceCont) { diceCont.innerHTML = ""; for (let i = 0; i < 6; i++) { let btn = document.createElement('div'); btn.className = 'dice'; btn.innerText = ''; btn.onclick = () => this.toggleHold(i); diceCont.appendChild(btn); this.diceBtns.push(btn); } } }
    dragElement(elmnt) { if(!elmnt) return; var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; var header = document.getElementById("chat-header"); if (header) { header.onmousedown = dragMouseDown; header.ontouchstart = dragMouseDown; } function dragMouseDown(e) { e = e || window.event; if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') { if(e.type === 'touchstart') { pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; } else { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; } document.onmouseup = closeDragElement; document.onmousemove = elementDrag; document.ontouchend = closeDragElement; document.ontouchmove = elementDrag; } } function elementDrag(e) { e = e || window.event; let clientX, clientY; if(e.type === 'touchmove') { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } else { e.preventDefault(); clientX = e.clientX; clientY = e.clientY; } pos1 = pos3 - clientX; pos2 = pos4 - clientY; pos3 = clientX; pos4 = clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; elmnt.style.bottom = "auto"; elmnt.style.right = "auto"; } function closeDragElement() { document.onmouseup = null; document.onmousemove = null; document.ontouchend = null; document.ontouchmove = null; } }
    toggleChat() { this.chatOpen = !this.chatOpen; const win = document.getElementById('chat-window'); const badge = document.getElementById('chat-badge'); if (this.chatOpen) { win.classList.add('active'); badge.classList.remove('active'); this.unreadMsgs = 0; const body = document.getElementById('chat-body'); body.scrollTop = body.scrollHeight; } else { win.classList.remove('active'); } }
    appendChatMessage(sender, text, type) { const body = document.getElementById('chat-body'); const msgDiv = document.createElement('div'); msgDiv.className = `msg-bubble ${type}`; msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`; body.appendChild(msgDiv); body.scrollTop = body.scrollHeight; if (!this.chatOpen) { this.unreadMsgs++; document.getElementById('chat-badge').classList.add('active'); this.soundMgr.chat(); } }
    sendChat() { const input = document.getElementById('chat-input-field'); const text = input.value.trim(); if (!text) return; this.appendChatMessage("Ti", text, "msg-outgoing"); input.value = ""; if (this.onlineMode && this.socket) { this.socket.emit('chat_msg', { roomId: this.roomId, msg: text }); } }
    triggerAiChat(category) { if (!this.aiMode) return; const phrases = this.aiPhrases[category]; if (phrases && phrases.length > 0) { const text = phrases[Math.floor(Math.random() * phrases.length)]; setTimeout(() => { this.appendChatMessage("AI", text, "msg-incoming"); }, 1000 + Math.random() * 2000); } }
    showSettings() { this.navigateTo('settings-screen'); document.getElementById('setting-name').value = this.playerName; document.getElementById('setting-sound').checked = this.soundEnabled; document.getElementById('setting-theme').value = localStorage.getItem('yamb_theme') || 'dark'; }
    
    saveSettings() { 
        const newName = document.getElementById('setting-name').value.trim(); 
        if(newName) this.playerName = newName; 
        this.soundEnabled = document.getElementById('setting-sound').checked; 
        const selectedTheme = document.getElementById('setting-theme').value; 
        localStorage.setItem('yamb_theme', selectedTheme); 
        
        document.body.classList.remove('light-theme', 'medium-theme', 'winter-theme'); 
        if (selectedTheme === 'light') document.body.classList.add('light-theme'); 
        else if (selectedTheme === 'medium') document.body.classList.add('medium-theme'); 
        else if (selectedTheme === 'winter') document.body.classList.add('winter-theme');
        
        localStorage.setItem('yamb_player_name', this.playerName); 
        localStorage.setItem('yamb_sound', this.soundEnabled); 
        this.showMainMenu(); 
    }

    showStats() { 
        this.navigateTo('stats-screen'); 
        
        document.getElementById('stat-games').innerText = this.stats.games; 
        document.getElementById('stat-high').innerText = this.stats.highscore; 
        document.getElementById('stat-wins').innerText = this.stats.wins; 
        document.getElementById('stat-losses').innerText = this.stats.losses; 
        
        const avg = this.stats.games > 0 ? Math.round(this.stats.totalScoreSum / this.stats.games) : 0; 
        document.getElementById('stat-avg').innerText = avg; 
        
        const totalCompetitive = this.stats.wins + this.stats.losses; 
        let rate = 0; if (totalCompetitive > 0) rate = Math.round((this.stats.wins / totalCompetitive) * 100); 
        document.getElementById('stat-rate').innerText = rate + "%"; 

        document.getElementById('ai-games').innerText = this.aiStats.games;
        document.getElementById('ai-high').innerText = this.aiStats.highscore;
        document.getElementById('ai-wins').innerText = this.aiStats.wins;
        const aiAvg = this.aiStats.games > 0 ? Math.round(this.aiStats.totalScoreSum / this.aiStats.games) : 0;
        document.getElementById('ai-avg').innerText = aiAvg;
    }

    async resetAiStats() {
        if(await this.modal.confirm("Da li želite da obrišete statistiku AI-a?\nOvo radite kada ubacite novu verziju pameti.")) {
            this.aiStats = { games: 0, wins: 0, highscore: 0, totalScoreSum: 0 };
            localStorage.setItem('yamb_ai_stats', JSON.stringify(this.aiStats));
            this.showStats();
        }
    }
    
    showHighscoresScreen() { 
        this.navigateTo('highscores-screen'); 
        this.switchHsTab('local'); 
    }

    switchHsTab(tab) {
        const btnLocal = document.getElementById('tab-local'); const btnGlobal = document.getElementById('tab-global');
        const listLocal = document.getElementById('local-hs-list'); const listGlobal = document.getElementById('global-hs-list');
        if (tab === 'local') { 
            btnLocal.classList.add('active'); 
            btnGlobal.classList.remove('active'); 
            listLocal.classList.remove('hidden'); 
            listGlobal.classList.add('hidden'); 
            this.updateHighscoresUI(); // Force update
        } 
        else { 
            btnLocal.classList.remove('active'); 
            btnGlobal.classList.add('active'); 
            listLocal.classList.add('hidden'); 
            listGlobal.classList.remove('hidden'); 
            this.fetchGlobalHighscores(); 
        }
    }
    fetchGlobalHighscores() {
        const list = document.getElementById('global-hs-list'); list.innerHTML = '<div class="loading-text">Povezujem se sa serverom...</div>';
        if (typeof io === 'undefined') {
             list.innerHTML = '<div style="text-align:center; padding:20px; color:#ef5350;">Nema internet konekcije.</div>';
             return;
        }
        if (!this.socket || !this.socket.connected) { try { this.socket = io(SERVER_URL, { transports: ['websocket'] }); this.setupGlobalSocketListeners(); } catch(e) { list.innerHTML = '<div style="text-align:center; padding:20px; color:#ef5350;">Greška pri konekciji.</div>'; return; } } 
        else { if(!this.socket.hasListeners('global_highscores_data')) { this.setupGlobalSocketListeners(); } }
        this.socket.emit('get_global_highscores');
    }
    setupGlobalSocketListeners() {
        this.socket.on('global_highscores_data', (data) => { this.renderHighscoreList(data, 'global-hs-list'); });
        this.socket.on('connect_error', () => { const list = document.getElementById('global-hs-list'); if(list) list.innerHTML = '<div style="text-align:center; padding:20px; color:#ef5350;">Server nije dostupan.</div>'; });
    }
    
    // --- UPDATED SAVE FUNCTION (NO DUPLICATE CHECK, TIMESTAMP) ---
    saveHighscoreEntry(name, score, mode) { 
        try {
            if(!name) name = "Igrač";
            
            // Ensure score is a number
            let finalScore = Number(score);
            if(isNaN(finalScore)) return;

            // Load existing highscores (Force Read)
            const hsData = localStorage.getItem('yamb_highscores_v2'); 
            let currentHighscores = [];
            
            try { 
                currentHighscores = hsData ? JSON.parse(hsData) : []; 
            } catch(e) { 
                console.warn("Highscore data corrupted, resetting.");
                currentHighscores = []; 
            }
            
            if (!Array.isArray(currentHighscores)) currentHighscores = [];
            
            // Simplify date string to avoid locale crashes
            const now = new Date();
            // Create a simple string format: DD.MM.YYYY HH:MM
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const fullDate = `${day}.${month}.${year} ${hours}:${minutes}`;

            // Add new entry
            currentHighscores.push({ 
                name: name, 
                score: finalScore, 
                mode: mode || 'Solo', 
                date: fullDate 
            }); 

            // Sort by score descending
            currentHighscores.sort((a,b) => b.score - a.score); 
            
            // Limit to top 50
            currentHighscores = currentHighscores.slice(0, 50); 
            
            // Save back
            localStorage.setItem('yamb_highscores_v2', JSON.stringify(currentHighscores)); 
            
            // Update local variable immediately
            this.highscores = currentHighscores;
            console.log(`✅ Saved score: ${name} - ${finalScore} on ${fullDate}`);

        } catch(e) {
            console.error("❌ Error saving highscore:", e);
        }
    }

    updateHighscoresUI() { 
        try {
            // FORCE READ FROM STORAGE EVERY TIME
            const hsData = localStorage.getItem('yamb_highscores_v2'); 
            this.highscores = hsData ? JSON.parse(hsData) : [];
        } catch(e) { this.highscores = []; }
        this.renderHighscoreList(this.highscores, 'local-hs-list'); 
    }
    
    renderHighscoreList(data, elementId) {
        const list = document.getElementById(elementId); 
        if(!list) return;
        list.innerHTML = "";
        
        if (!data || !Array.isArray(data) || data.length === 0) { 
            list.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Još nema rezultata.</div>"; 
            return; 
        }

        data.forEach((entry, i) => {
            let li = document.createElement('li'); 
            li.className = 'highscore-item';
            let rankClass = i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : 'rank-other'));
            let isMeStyle = "";
            // Highlight player if score matches current session best
            if (elementId === 'global-hs-list' && entry.name === this.playerName && this.stats && entry.score == this.stats.highscore) {
                 isMeStyle = "background: rgba(224, 201, 149, 0.1); border-left: 3px solid var(--gold-main); border-radius: 4px;";
            }
            if(isMeStyle) li.style.cssText = isMeStyle;
            li.innerHTML = `
                <div class="rank-badge ${rankClass}">${i+1}</div>
                <div class="hs-name-container">
                    <span class="hs-player-name">${entry.name}</span>
                    <div class="hs-meta-info">
                        <span class="hl-mode">${entry.mode || 'Solo'}</span>
                        <span>${entry.date || '-'}</span>
                    </div>
                </div>
                <div class="hs-score">${entry.score}</div>
            `;
            list.appendChild(li);
        });
    }

    updateStats(score, resultType) { 
        this.stats = this.stats || { games: 0, wins: 0, losses: 0, highscore: 0, totalScoreSum: 0 };
        this.stats.games++; 
        this.stats.totalScoreSum += score; 
        if (score > this.stats.highscore) this.stats.highscore = score; 
        if (resultType === 'win') this.stats.wins++; 
        else if (resultType === 'loss') this.stats.losses++; 
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats)); 
    }
    toggleTheme() { 
        const current = localStorage.getItem('yamb_theme') || 'dark'; let next = 'dark'; document.body.classList.remove('light-theme', 'medium-theme', 'winter-theme'); 
        if (current === 'dark') { next = 'light'; document.body.classList.add('light-theme'); } else if (current === 'light') { next = 'medium'; document.body.classList.add('medium-theme'); } else if (current === 'medium') { next = 'winter'; document.body.classList.add('winter-theme'); } else { next = 'dark'; } 
        localStorage.setItem('yamb_theme', next); 
    }
    showMainMenu() { this.navigateTo('main-menu'); document.getElementById('chat-float-btn').classList.add('hidden'); document.getElementById('chat-window').classList.remove('active'); this.chatOpen = false; }
    showRules() { this.navigateTo('rules-screen'); }
    async quitToMenu() { if (await this.modal.confirm("Da li ste sigurni da želite prekinuti igru?")) { if(this.socket) this.socket.disconnect(); this.showMainMenu(); } }
    async startPrivateHosting() { const nickname = this.playerName; if (!nickname) return; const roomId = "yamb-" + Math.random().toString(36).substring(2, 8); const shareUrl = SERVER_URL + "/?room=" + roomId; this.navigateTo('waiting-screen'); document.getElementById('wait-msg').innerText = "Čekam prijatelja..."; document.getElementById('share-area').classList.remove('hidden'); document.getElementById('invite-link').value = shareUrl; this.joinPrivateGame(nickname, roomId); }
    async joinPrivateGame(nickname, roomId) { this.navigateTo('waiting-screen'); try { this.socket = io(SERVER_URL, { transports: ['websocket'] }); } catch(e) { await this.modal.alert("Server nije dostupan."); this.showMainMenu(); return; } this.socket.on('connect', () => { this.socket.emit('join_private_game', { nickname, roomId }); }); this.setupSocketListeners(nickname); }
    async setupOnline(mode = 'random') { const nickname = this.playerName; if (!nickname) return; this.navigateTo('waiting-screen'); document.getElementById('share-area').classList.add('hidden'); try { this.socket = io(SERVER_URL, { transports: ['websocket'] }); } catch(e) { await this.modal.alert("Server nije dostupan."); this.showMainMenu(); return; } this.socket.on('connect', () => { document.getElementById('wait-msg').innerText = "Tražim protivnika..."; this.socket.emit('find_game', nickname); }); this.setupSocketListeners(nickname); }
    setupSocketListeners(nickname) { this.socket.on('room_full', async () => { await this.modal.alert("Ova soba je puna ili igra već traje!"); this.cancelOnline(); }); this.socket.on('private_waiting', (data) => { this.roomId = data.roomId; }); this.socket.on('game_start', (data) => { this.myOnlineIndex = data.myIndex; this.onlineMode = true; this.modeTag = "Online"; this.roomId = data.roomId; this.players = this.myOnlineIndex === 0 ? [nickname, data.opponent] : [data.opponent, nickname]; this.initScores(); this.currentPlayerIdx = 0; this.startGame(); }); this.socket.on('remote_move', (data) => { const opponentIdx = this.myOnlineIndex === 0 ? 1 : 0; this.allScores[opponentIdx][data.col][data.row] = data.points; this.updateTableVisuals(); this.switchPlayer(); }); this.socket.on('remote_roll', (data) => { this.visualRoll(data.values); this.brojBacanja = data.bacanje; document.getElementById('lbl-status').innerText = `Bacanje: ${data.bacanje} / 3 (Protivnik)`; }); this.socket.on('remote_hold', (data) => { this.zadrzane[data.index] = data.status; this.updateDiceVisuals(); }); this.socket.on('remote_announce', (data) => { this.najavaAktivna = true; }); this.socket.on('chat_msg', (data) => { if (data.msg) this.appendChatMessage("Protivnik", data.msg, "msg-incoming"); }); this.socket.on('opponent_left', async () => { await this.modal.alert("Protivnik je izašao!"); this.cancelOnline(); }); }
    async shareInvite() { const link = document.getElementById('invite-link').value; if (navigator.share) { try { await navigator.share({ title: 'Yamb of the Balkan', text: 'Ajde na partiju Yamba!', url: link }); } catch (err) { console.log('Share canceled'); } } else { const input = document.getElementById('invite-link'); input.select(); document.execCommand('copy'); await this.modal.alert("Link je kopiran! Pošalji ga prijatelju."); } }
    cancelOnline() { if(this.socket) this.socket.disconnect(); this.showMainMenu(); window.history.pushState({}, document.title, window.location.pathname); }
    async setupGame(numPlayers, aiMode=false, diff='medium') { this.onlineMode = false; this.players = []; this.allScores = []; this.aiMode = aiMode; this.aiDifficulty = diff; const p1Name = this.playerName; if (aiMode) { this.modeTag = "vs AI"; this.players.push(p1Name); this.players.push(`🤖 AI (Ultimate)`); this.ai = new YambAI(this); } else { this.modeTag = "Solo"; this.players.push(p1Name); if (numPlayers === 1) { this.modeTag = "Solo"; } else { this.modeTag = "1 na 1"; for(let i=1; i<numPlayers; i++) { let guestName = await this.modal.prompt(`Ime igrača ${i+1}:`); this.players.push(guestName || `Gost ${i}`); } } } this.initScores(); this.currentPlayerIdx = 0; this.startGame(); }
    
    initScores() { 
        this.allScores = []; 
        this.players.forEach(() => { let sheet = {}; KOLONE.forEach(c => { sheet[c] = {}; REDOVI_IGRA.forEach(r => sheet[c][r] = null); }); this.allScores.push(sheet); }); 
        this.consecutiveNajava = 0; 
        this.hasSvetiIlija = false;
        this.hasProphet = false;
    }
    
    startGame() { 
        this.navigateTo('game-scene'); 
        this.createScoreTables(); 
        this.resetTurnLogic(); 
        this.gameActive = true; 
        
        // Force UI update on start to avoid staleness
        this.updateHighscoresUI(); 
        
        document.getElementById('chat-body').innerHTML = ""; 
        const chatBtn = document.getElementById('chat-float-btn'); 
        if (this.modeTag === "Solo" || this.modeTag === "1 na 1") { chatBtn.classList.add('hidden'); } 
        else { chatBtn.classList.remove('hidden'); if(this.aiMode) this.triggerAiChat('start'); } 
        
        const activeEffect = localStorage.getItem('yamb_active_effect') || 'confetti';
        document.body.classList.remove('fx-glass', 'fx-shadow', 'fx-neon_pulse'); // Reset
        if (['glass', 'shadow', 'neon_pulse'].includes(activeEffect)) {
            document.body.classList.add('fx-' + activeEffect);
        }
    }

    createScoreTables() { const container = document.getElementById('tables-container'); container.innerHTML = ''; this.players.forEach((player, pIdx) => { const tableDiv = document.createElement('div'); tableDiv.className = 'player-table'; tableDiv.id = `ptable-${pIdx}`; const nameDiv = document.createElement('div'); nameDiv.className = 'player-name'; nameDiv.innerText = player; tableDiv.appendChild(nameDiv); const grid = document.createElement('div'); grid.className = 'grid-container'; ["", "↓", "S", "⇅", "↑", "R", "📢"].forEach((s, i) => { let d = document.createElement('div'); d.className = 'grid-cell col-header ' + ["", "c-nadole", "c-slobodna", "c-sredina", "c-nagore", "c-rucno", "c-najava"][i]; d.innerText = s; grid.appendChild(d); }); REDOVI_PRIKAZ.forEach(row => { let lbl = document.createElement('div'); lbl.className = 'grid-cell row-header' + (row.includes("ZBIR") ? " sum" : ""); lbl.innerText = row; grid.appendChild(lbl); KOLONE.forEach(col => { let cell = document.createElement('div'); cell.className = 'grid-cell'; if (row.includes("ZBIR")) { cell.style.fontWeight = 'bold'; cell.innerText = "0"; cell.id = `sum-${pIdx}-${col}-${row}`; cell.style.color = "var(--gold-main)"; } else { let btn = document.createElement('button'); btn.className = 'score-btn'; btn.id = `btn-${pIdx}-${col}-${row}`; btn.onclick = () => this.writeScore(row, col, pIdx); btn.disabled = true; cell.appendChild(btn); } grid.appendChild(cell); }); }); tableDiv.appendChild(grid); let totalDiv = document.createElement('div'); totalDiv.className = 'total-score'; totalDiv.id = `total-${pIdx}`; totalDiv.innerText = "0"; tableDiv.appendChild(totalDiv); container.appendChild(tableDiv); }); }
    
    resetTurnLogic() { 
        this.kockiceVals = [0,0,0,0,0,0]; 
        this.zadrzane = [false,false,false,false,false,false]; 
        this.brojBacanja = 0; 
        this.najavaAktivna = false; 
        this.najavljenoPolje = null; 
        document.getElementById('lbl-status').innerText = "Bacanje: 0 / 3"; 
        const isAi = this.players[this.currentPlayerIdx].includes("AI"); 
        const isOnlineOpponent = (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex); 
        const canInteract = !isAi && !isOnlineOpponent; 
        const btnBacaj = document.getElementById('btn-bacaj'); 
        btnBacaj.disabled = !canInteract;
        btnBacaj.innerText = "BACAJ"; 
        const btnNajava = document.getElementById('btn-najava'); 
        btnNajava.disabled = true; 
        btnNajava.innerText = "Najava"; 
        btnNajava.classList.remove('btn-active-toggle'); 
        
        this.diceBtns.forEach(b => { 
            b.innerText = ""; 
            b.className = 'dice'; // Prvo reset
            const activeSkin = localStorage.getItem('yamb_active_skin') || 'default';
            if(activeSkin !== 'default') b.classList.add(`preview-${activeSkin}`);
        }); 
        
        this.highlightCurrentPlayer(); 
        this.updateTableVisuals(); 
        if (isAi) { setTimeout(() => this.runAiTurn(), 1000); } 
    }

    highlightCurrentPlayer() { 
        document.querySelectorAll('.player-table').forEach(el => { el.style.border = "var(--glass-border)"; el.style.boxShadow="none"; el.style.opacity = "0.7"; }); 
        const activeTbl = document.getElementById(`ptable-${this.currentPlayerIdx}`); 
        if(activeTbl) { 
            activeTbl.style.border = "2px solid var(--gold-main)"; 
            activeTbl.style.boxShadow = "0 0 15px rgba(224, 201, 149, 0.2)";
            activeTbl.style.opacity = "1"; 
            if(this.players.length > 1) { setTimeout(() => { activeTbl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }, 100); }
        } 
        document.getElementById('lbl-turn').innerText = this.players[this.currentPlayerIdx] + " je na potezu"; 
    }
    
    toggleHold(i) { if (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex) return; if (this.brojBacanja === 0) return; this.zadrzane[i] = !this.zadrzane[i]; this.updateDiceVisuals(); this.soundMgr.click(); if(this.onlineMode) { this.socket.emit('dice_hold', { roomId: this.roomId, index: i, status: this.zadrzane[i] }); } }
    
    updateDiceVisuals() { 
        const activeSkin = localStorage.getItem('yamb_active_skin') || 'default';
        this.diceBtns.forEach((b, i) => { 
            let baseClass = 'dice';
            if (activeSkin !== 'default') baseClass += ` preview-${activeSkin}`;
            
            if (this.brojBacanja > 0) { 
                b.innerText = UNICODE_DICE[this.kockiceVals[i]]; 
                b.className = this.zadrzane[i] ? baseClass + ' held' : baseClass + ' active'; 
            } else { 
                b.innerText = ""; 
                b.className = baseClass; 
            } 
        }); 
    }

    async visualRoll(finalValues) { this.diceBtns.forEach((b, i) => { if(!this.zadrzane[i]) b.classList.add('rolling'); }); this.soundMgr.roll(); for(let k=0; k<8; k++) { this.diceBtns.forEach((b, i) => { if (!this.zadrzane[i]) b.innerText = UNICODE_DICE[Math.floor(Math.random()*6)+1]; }); await sleep(40); } this.diceBtns.forEach(b => b.classList.remove('rolling')); this.kockiceVals = finalValues; this.updateDiceVisuals(); }
    
    async throwDice() { 
        const btnBacaj = document.getElementById('btn-bacaj');
        const btnNajava = document.getElementById('btn-najava');
        const isOnlineOpponent = (this.onlineMode && this.currentPlayerIdx !== this.myOnlineIndex); 
        if (this.brojBacanja >= 3 || isOnlineOpponent) return; 
        if (this.najavaAktivna) { await this.modal.alert("Morate prvo odabrati polje za najavu!"); return; }
        btnBacaj.disabled = true; 
        try {
            this.soundMgr.roll(); 
            let newValues = [...this.kockiceVals]; 
            for(let i=0; i<6; i++) { if (!this.zadrzane[i]) newValues[i] = Math.floor(Math.random()*6)+1; } 
            if (this.onlineMode) { this.socket.emit('dice_roll', { roomId: this.roomId, values: newValues, bacanje: this.brojBacanja + 1 }); } 
            this.diceBtns.forEach((b, i) => { if(!this.zadrzane[i]) b.classList.add('rolling'); }); 
            for(let k=0; k<6; k++) { this.diceBtns.forEach((b, i) => { if (!this.zadrzane[i]) b.innerText = UNICODE_DICE[Math.floor(Math.random()*6)+1]; }); await sleep(50); } 
            this.diceBtns.forEach(b => b.classList.remove('rolling')); 
            this.kockiceVals = newValues; 
            this.brojBacanja++; 
            document.getElementById('lbl-status').innerText = `Bacanje: ${this.brojBacanja} / 3`; 
            this.updateDiceVisuals(); 
        } catch(e) { console.error("Greška pri bacanju:", e); } finally {
            try { this.updateTableVisuals(); } catch(err) { console.error("Greška pri osvežavanju tabele:", err); }
            const isAi = this.players[this.currentPlayerIdx].includes("AI");
            if (this.brojBacanja < 3 && !isAi && !isOnlineOpponent) { btnBacaj.disabled = false; btnBacaj.innerText = "BACAJ"; } else { btnBacaj.disabled = true; btnBacaj.innerText = "UPIŠI"; } 
            if (this.brojBacanja === 1 && !isAi) { btnNajava.disabled = false; btnNajava.classList.add('btn-highlight'); } else { btnNajava.disabled = true; btnNajava.classList.remove('btn-highlight'); }
        }
    }

    clickNajava() { if (this.brojBacanja !== 1) return; const btn = document.getElementById('btn-najava'); const btnBacaj = document.getElementById('btn-bacaj'); if (!this.najavaAktivna) { this.najavaAktivna = true; btn.innerText = "OPOZOVI"; btn.classList.add('btn-active-toggle'); btn.classList.remove('btn-highlight'); btnBacaj.disabled = true; if(this.onlineMode) this.socket.emit('announce', { roomId: this.roomId, type: 'start' }); } else { this.najavaAktivna = false; btn.innerText = "Najava"; btn.classList.remove('btn-active-toggle'); btn.classList.add('btn-highlight'); btnBacaj.disabled = false; if(this.onlineMode) this.socket.emit('announce', { roomId: this.roomId, type: 'cancel' }); } }
    isValidColumnOrder(row, col, sheet) { 
        if (col === "Nadole") { const idx = REDOVI_IGRA.indexOf(row); if (idx > 0 && sheet["Nadole"][REDOVI_IGRA[idx-1]] === null) return false; } 
        if (col === "Nagore") { const idx = REDOVI_IGRA.indexOf(row); if (idx < REDOVI_IGRA.length-1 && sheet["Nagore"][REDOVI_IGRA[idx+1]] === null) return false; } 
        if (col === "Sredina") { 
            const up = ["Max", "6", "5", "4", "3", "2", "1"]; const down = ["Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"]; 
            if (up.includes(row)) { const idx = up.indexOf(row); if (idx === 0) return true; return sheet[col][up[idx-1]] !== null; } 
            else if (down.includes(row)) { const idx = down.indexOf(row); if (idx === 0) return true; return sheet[col][down[idx-1]] !== null; } 
            return false; 
        } 
        return true; 
    }
    
    async writeScore(row, col, pIdx) { 
        if (pIdx !== this.currentPlayerIdx) return; 
        if (this.brojBacanja === 0) { this.soundMgr.error(); return await this.modal.alert("Prvo baci kockice!"); } 
        const sheet = this.allScores[pIdx]; 
        if (sheet[col][row] !== null) return await this.modal.alert("Popunjeno!"); 
        const isHuman = !this.players[pIdx].includes("AI"); 

        if (col === "Najava" && !this.najavljenoPolje && !this.najavaAktivna && this.brojBacanja > 1) {
            this.soundMgr.error();
            return await this.modal.alert("Ovu kolonu morate najaviti!\nNajava se vrši isključivo nakon prvog bacanja pritiskom na dugme 'Najava'.");
        }

        if (isHuman && this.najavaAktivna) { 
            if (col !== "Najava") { this.soundMgr.error(); return await this.modal.alert("Uključili ste najavu!\nMorate odabrati polje u koloni NAJAVA koje gađate."); } 
            this.najavljenoPolje = {row, col}; this.najavaAktivna = false; 
            
            document.getElementById(`btn-${pIdx}-${col}-${row}`).classList.add('highlight-najava'); 
            
            const btnN = document.getElementById('btn-najava'); btnN.innerText = `Najava: ${row}`; btnN.disabled = true; btnN.classList.remove('btn-active-toggle'); 
            const btnBacaj = document.getElementById('btn-bacaj'); btnBacaj.disabled = false; btnBacaj.innerText = "BACAJ";
            
            if(this.onlineMode) this.socket.emit('announce', { roomId: this.roomId, type: 'selected', row: row }); 
            
            return; 
        } 
        
        if (this.najavljenoPolje) { 
            if (col !== "Najava" || row !== this.najavljenoPolje.row) { this.soundMgr.error(); return await this.modal.alert(`Najavili ste ${this.najavljenoPolje.row}!\nMorate popuniti to polje (ili upisati 0 u njega).`); } 
        } 
        
        if (!this.isValidColumnOrder(row, col, sheet)) { this.soundMgr.error(); return await this.modal.alert("Pogrešan redosled popunjavanja kolone!"); } 
        
        const best5 = this.getBest5(row, this.kockiceVals); let pts = this.calcPoints(row, best5); 
        
        if (col === "Ručno" && this.brojBacanja > 1) { 
            if(isHuman) { const confirmZero = await this.modal.confirm("Ručno kolona se popunjava samo posle 1. bacanja.\nOvo će biti upisano kao 0 (precrtavanje).\nDa li želite da nastavite?"); if (!confirmZero) return; } 
            pts = 0; 
        } 
        
        // --- LOGIC FOR TROPHIES: SVETI ILIJA & PROPHET ---
        if (row === 'Yamb' && pts >= 50 && this.brojBacanja === 1) {
             this.hasSvetiIlija = true;
             if (!this.players[pIdx].includes("AI")) this.effectMgr.trigger('thunder');
        }

        if (col === 'Najava') {
            if (pts > 0) {
                this.consecutiveNajava++;
                if (this.consecutiveNajava >= 3) this.hasProphet = true;
            } else {
                this.consecutiveNajava = 0;
            }
        }
        
        sheet[col][row] = pts; this.soundMgr.score(); 
        if (this.onlineMode && isHuman) { this.socket.emit('player_move', { roomId: this.roomId, row, col, points: pts }); } 
        if (this.aiMode && isHuman) { if (pts >= 40) this.triggerAiChat('goodMove'); else if (pts <= 5) this.triggerAiChat('badMove'); } 
        
        if (pts >= 50 && row === "Yamb") {
            const activeEffect = localStorage.getItem('yamb_active_effect') || 'confetti';
            this.effectMgr.trigger(activeEffect);
        } 
        
        if(pts >= 50 && row === "Yamb") {
                setTimeout(() => this.effectMgr.stop(), 4000); 
        }

        this.updateTableVisuals(); 
        this.switchPlayer(); 
    }
    
    switchPlayer() { let gameOver = true; this.allScores.forEach(s => { KOLONE.forEach(c => { REDOVI_IGRA.forEach(r => { if (s[c][r] === null) gameOver = false; }); }); }); if (gameOver) { this.handleGameOver(); return; } this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length; this.resetTurnLogic(); this.autoSaveGame(); }
    
    // --- CHECK ACHIEVEMENTS ---
    checkAchievements(score, sheet) {
        let unlocked = JSON.parse(localStorage.getItem('yamb_unlocked')) || ['first_play', 'default', 'confetti'];
        let newUnlocks = [];
        const gamesPlayed = this.stats.games + 1;

        const isColumnNoZero = (col) => REDOVI_IGRA.every(r => sheet[col][r] !== null && sheet[col][r] > 0);
        const getVal = (col, row) => sheet[col][row] || 0;

        // 1. Broj partija
        if (!unlocked.includes('first_play')) newUnlocks.push('first_play');
        if (gamesPlayed >= 10 && !unlocked.includes('apprentice')) newUnlocks.push('apprentice');
        if (gamesPlayed >= 50 && !unlocked.includes('veteran')) newUnlocks.push('veteran');

        // 2. Mod igre
        if (this.players.length === 2 && !this.aiMode && !unlocked.includes('kafana')) newUnlocks.push('kafana');
        if (this.aiMode && this.allScores.length > 1) {
            const aiScore = document.getElementById('total-1') ? parseInt(document.getElementById('total-1').innerText) : 0;
            if (score > aiScore && !unlocked.includes('ai_killer')) newUnlocks.push('ai_killer');
        }

        // 3. Rezultat
        if (score >= 1000 && !unlocked.includes('score_1000')) newUnlocks.push('score_1000');
        if (score >= 1250 && !unlocked.includes('grandmaster')) newUnlocks.push('grandmaster');
        if (score >= 2000 && !unlocked.includes('legend')) newUnlocks.push('legend');
        if (score >= 2500 && !unlocked.includes('mythic')) newUnlocks.push('mythic');
        if (score >= 3000 && !unlocked.includes('godlike')) newUnlocks.push('godlike');

        // 4. Kolone i Polja
        if (isColumnNoZero('Ručno') && !unlocked.includes('surgeon')) newUnlocks.push('surgeon');
        if (getVal('Ručno', 'Yamb') >= 55 && !unlocked.includes('hazard')) newUnlocks.push('hazard');

        const cols = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];
        let hasMath = false;
        let hasPerfect = true;
        let allYambs = true;
        let allKenta = true;
        let minerFound = false;
        let hasZero = false;
        let minUnder7 = false;
        let fullSheet = true;

        let hasPotato = false;
        let totalZeros = 0;
        let yambZeros = 0;

        cols.forEach(col => {
            let sum1 = 0;
            ["1","2","3","4","5","6"].forEach(r => sum1 += (sheet[col][r] || 0));
            if (sum1 === 63) hasMath = true;
            if (sum1 < 60) hasPerfect = false; 

            // Yamb checks
            let yambVal = sheet[col]['Yamb'];
            if (yambVal === 0) {
                allYambs = false;
                hasPotato = true; 
                yambZeros++;      
            }

            if (getVal(col, 'Kenta') === 0) allKenta = false;

            let vMax = getVal(col, 'Max');
            let vMin = getVal(col, 'Min');
            if (vMax - vMin > 60) minerFound = true;

            if (sheet[col]['Min'] !== null && sheet[col]['Min'] > 0 && sheet[col]['Min'] < 7) minUnder7 = true;

            REDOVI_IGRA.forEach(row => {
                if (sheet[col][row] === 0) {
                    hasZero = true;
                    totalZeros++; 
                }
                if (sheet[col][row] === null) fullSheet = false;
            });
        });

        if (hasMath && !unlocked.includes('math')) newUnlocks.push('math');
        if (allYambs && !unlocked.includes('firecracker')) newUnlocks.push('firecracker');
        if (allKenta && !unlocked.includes('concrete')) newUnlocks.push('concrete');
        if (hasPerfect && !unlocked.includes('perfectionist')) newUnlocks.push('perfectionist');
        if (minerFound && !unlocked.includes('miner')) newUnlocks.push('miner');
        if (minUnder7 && !unlocked.includes('minimal')) newUnlocks.push('minimal');

        // 5. Globalna stanja
        if (!hasZero && fullSheet && !unlocked.includes('immortal')) newUnlocks.push('immortal');
        
        const currentHour = new Date().getHours();
        if (currentHour >= 3 && currentHour <= 5 && !unlocked.includes('night_owl')) newUnlocks.push('night_owl');
        
        if (sheet['Najava']['Yamb'] !== null && sheet['Najava']['Yamb'] > 0 && !unlocked.includes('sniper')) {
            newUnlocks.push('sniper');
        }
        
        if (hasPotato && !unlocked.includes('potato')) {
            newUnlocks.push('potato');
        }

        if (fullSheet && totalZeros > 0 && totalZeros === yambZeros && !unlocked.includes('achilles')) {
            newUnlocks.push('achilles');
        }

        if (this.hasSvetiIlija && !unlocked.includes('sveti_ilija')) {
            newUnlocks.push('sveti_ilija');
        }

        if (this.hasProphet && !unlocked.includes('prophet')) {
            newUnlocks.push('prophet');
        }

        if (this.players.length > 1) {
             const opponentScore = this.allScores.length > 1 ? (document.getElementById('total-1') ? parseInt(document.getElementById('total-1').innerText) : 0) : 0;
             const diff = Math.abs(score - opponentScore);
             if (diff < 5 && !unlocked.includes('close_call')) newUnlocks.push('close_call');
             if (opponentScore - score > 200 && !unlocked.includes('spite')) newUnlocks.push('spite');
        }

        if (newUnlocks.length > 0) {
            const finalUnlocked = [...unlocked, ...newUnlocks];
            localStorage.setItem('yamb_unlocked', JSON.stringify(finalUnlocked));
            
            let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
            const bonus = newUnlocks.length * 500; 
            localStorage.setItem('yamb_dukati', currentDukati + bonus);
            
            setTimeout(() => {
                this.modal.alert(`Otključali ste ${newUnlocks.length} novih trofeja!\nZaradili ste ${bonus} dukata!`, "🏆 NOVI TROFEJI");
                this.effectMgr.trigger('gold_rain'); 
            }, 1500);
        }
    }

    // --- SCORE CALC ---
    calculateTotalScore(pIdx) {
        const data = this.allScores[pIdx];
        if (!data) return 0; 
        
        let grandTotal = 0;
    
        KOLONE.forEach(col => {
            // Helper to treat null as 0
            const val = (r) => (data[col][r] === null) ? 0 : data[col][r];

            // 1. SUM (1-6) + BONUS
            let sum1 = 0;
            ["1", "2", "3", "4", "5", "6"].forEach(r => sum1 += val(r));
            if (sum1 >= 60) sum1 += 30;
    
            // 2. SUM (Max-Min) * 1 + BONUS
            let sum2 = 0;
            const vMax = data[col]["Max"];
            const vMin = data[col]["Min"];
            const v1 = data[col]["1"];
            
            if (vMax !== null && vMin !== null && v1 !== null) {
                let calc = (vMax - vMin) * v1;
                if (calc < 0) calc = 0; // Prevent negatives
                sum2 = calc;
                if (sum2 >= 60) sum2 += 40;
            }
    
            // 3. SUM (Figures)
            let sum3 = 0;
            ["Triling", "Kenta", "Ful", "Poker", "Yamb"].forEach(r => sum3 += val(r));
    
            grandTotal += sum1 + sum2 + sum3;
        });
    
        return grandTotal;
    }

    async handleGameOver() { 
        localStorage.removeItem('yamb_saved_game'); 
        this.gameActive = false; 
        
        // Calculate scores
        const results = []; 
        try {
            this.players.forEach((name, i) => { 
                let total = this.calculateTotalScore(i);
                results.push({name, score: total}); 
            }); 
            
            // --- 1. LOCAL SAVE ---
            for (const playerResult of results) {
                if (playerResult.name.includes("AI") || playerResult.name.includes("🤖")) continue;
                this.saveHighscoreEntry(playerResult.name, playerResult.score, this.modeTag || "Solo");
            }

            // --- 2. GLOBAL SUBMIT ---
            if (typeof io !== 'undefined') {
                const submitScore = () => {
                     results.forEach(res => {
                         if (!res.name.includes("AI") && !res.name.includes("🤖")) {
                            this.socket.emit('submit_score', {
                                name: res.name,
                                score: res.score,
                                mode: this.onlineMode ? 'Online' : (this.players.length > 1 ? 'Hotseat' : 'Solo'),
                                date: new Date().toLocaleDateString('sr-RS')
                            });
                         }
                     });
                };

                if (!this.socket || !this.socket.connected) {
                    this.socket = io(SERVER_URL, { transports: ['websocket'] });
                    this.socket.on('connect', submitScore);
                } else {
                    submitScore();
                }
            }
        } catch(e) { console.error("Game Over Error:", e); }

        // Check trophies
        const myName = this.playerName;
        const myScoreEntry = results.find(r => r.name === myName);
        
        if (myScoreEntry) {
             const myIndex = this.players.indexOf(myName);
             if (myIndex !== -1) { 
                 this.checkAchievements(myScoreEntry.score, this.allScores[myIndex]);
             }
             this.pendingScore = myScoreEntry.score;
             
             let resultType = 'solo';
             if (this.players.length > 1) {
                 const sortedRes = [...results].sort((a,b) => b.score - a.score);
                 if (sortedRes[0].name === myName) resultType = 'win';
                 else resultType = 'loss';
             }
             this.updateStats(myScoreEntry.score, resultType);
        } else {
            this.pendingScore = Math.max(...results.map(r => r.score));
        }
        
        // AI Stats
        if (this.aiMode) {
            const aiResult = results.find(r => r.name.includes("AI"));
            if (aiResult) {
                this.aiStats.games++;
                this.aiStats.totalScoreSum += aiResult.score;
                if (aiResult.score > this.aiStats.highscore) this.aiStats.highscore = aiResult.score;
                const winner = [...results].sort((a,b) => b.score - a.score)[0];
                if (winner.name.includes("AI")) { this.aiStats.wins++; }
                localStorage.setItem('yamb_ai_stats', JSON.stringify(this.aiStats));
            }
        }

        this.soundMgr.win(); 

        const winner = [...results].sort((a,b) => b.score - a.score)[0];
        let title = "KRAJ IGRE"; 
        let message = ""; 
        
        if (this.players.length === 1) { 
            const oldHighscore = this.stats.highscore; 
            if (myScoreEntry && myScoreEntry.score >= oldHighscore && myScoreEntry.score > 0) { 
                this.effectMgr.trigger(localStorage.getItem('yamb_active_effect') || 'confetti');
                title = "🎉 NOVI REKORD!"; 
                message = `Svaka čast! Tvoj novi najbolji rezultat.`; 
            } else { 
                title = "DOBRA PARTIJA"; 
                message = `Više sreće drugi put!`; 
            } 
        } else { 
            title = winner.name === myName ? "🏆 POBEDA!" : "PORAZ";
            message = `Pobednik je ${winner.name} sa ${winner.score} poena.`;
        }

        document.getElementById('go-title').innerText = title;
        document.getElementById('go-msg').innerText = message;
        document.getElementById('go-score').innerText = myScoreEntry ? myScoreEntry.score : winner.score; 
        
        const btnAd = document.getElementById('btn-ad-double');
        if ((myScoreEntry && myScoreEntry.score <= 0) || (!myScoreEntry && winner.name.includes("AI"))) {
            btnAd.style.display = 'none';
        } else {
            btnAd.style.display = 'flex';
        }

        this.navigateTo('game-over-screen');
        
        // --- ADDED DEBUG ALERT CONFIRMATION ---
        setTimeout(() => {
             this.modal.alert("Vaš rezultat je uspešno sačuvan u Top Listu!", "POTVRDA UPISA");
        }, 500);
    }

    async watchAdForDouble() {
        const success = await this.adMob.showRewardVideo();
        if (success) {
            this.claimReward(true);
        }
    }

    claimReward(doubled) {
        let finalAmount = this.pendingScore;
        if (doubled) {
            finalAmount *= 2;
            this.soundMgr.win(); 
            this.effectMgr.trigger('gold_rain');
        }

        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        currentDukati += finalAmount;
        localStorage.setItem('yamb_dukati', currentDukati);

        if (doubled) {
            this.modal.alert(`Uspešno ste duplirali nagradu!\nUkupno osvojeno: 💰 ${finalAmount}`, "NAGRADA PREUZETA").then(() => {
                this.effectMgr.stop();
                this.showMainMenu();
            });
        } else {
            this.showMainMenu();
        }
    }

    async runAiTurn() { const aiIdx = this.currentPlayerIdx; const sheet = this.allScores[aiIdx]; if (this.brojBacanja === 0) { await this.throwDice(); setTimeout(() => this.runAiTurn(), 800); return; } const decision = this.ai.decideRoll(this.kockiceVals, this.brojBacanja, sheet); if (decision.type === 'write') { const best5 = this.getBest5(decision.row, this.kockiceVals); const pts = this.calcPoints(decision.row, best5); if (pts > 50) this.triggerAiChat('aiGood'); this.writeScore(decision.row, decision.col, aiIdx); } else if (decision.type === 'hold') { this.zadrzane = decision.hold; this.updateDiceVisuals(); await this.throwDice(); setTimeout(() => this.runAiTurn(), 800); } }
    getBest5(row, dice) { const d = [...dice]; if (row === "Min") return d.sort((a,b)=>a-b).slice(0,5); if (row === "Max") return d.sort((a,b)=>b-a).slice(0,5); if (row === "Kenta") { const u = [...new Set(d)].sort((a,b)=>a-b); if ([2,3,4,5,6].every(v=>u.includes(v))) return [2,3,4,5,6]; if ([1,2,3,4,5].every(v=>u.includes(v))) return [1,2,3,4,5]; return d.sort((a,b)=>b-a).slice(0,5); } if (row === "Ful") { const c={}; d.forEach(x=>c[x]=(c[x]||0)+1); const k=Object.keys(c).map(Number); if(k.some(x=>c[x]>=5)) return Array(5).fill(k.find(x=>c[x]>=5)); const threes=k.filter(x=>c[x]>=3); const pairs=k.filter(x=>c[x]>=2); let cands=[]; threes.forEach(t=>{pairs.forEach(p=>{if(t!==p)cands.push([...Array(3).fill(t),...Array(2).fill(p)])})}); if(cands.length>0) return cands.sort((a,b)=>sum(b)-sum(a))[0]; } if (["1","2","3","4","5","6"].includes(row)) { const t=parseInt(row); const match=d.filter(x=>x===t); const rest=d.filter(x=>x!==t).sort((a,b)=>b-a); return [...match,...rest].slice(0,5); } const c={}; d.forEach(x=>c[x]=(c[x]||0)+1); d.sort((a,b)=>{if(c[b]!==c[a])return c[b]-c[a]; return b-a}); return d.slice(0,5); }
    calcPoints(row, v) { const s = sum(v); if (["1","2","3","4","5","6"].includes(row)) return v.filter(x=>x===parseInt(row)).length * parseInt(row); if (row === "Max" || row === "Min") return s; if (row === "Triling") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if(Object.values(c).some(cnt=>cnt>=3)) return (3*Number(Object.keys(c).find(k=>c[k]>=3)))+20; return 0; } if (row === "Kenta") { const u=[...new Set(v)].sort((a,b)=>a-b); const k1=[1,2,3,4,5].every(x=>u.includes(x)); const k2=[2,3,4,5,6].every(x=>u.includes(x)); if(k1||k2) { if(this.brojBacanja===1) return 66; if(this.brojBacanja===2) return 56; return 46; } return 0; } if (row === "Ful") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if (Object.values(c).includes(5)||(Object.values(c).includes(3)&&Object.values(c).includes(2))) return s+30; return 0; } if (row === "Poker") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if(Object.values(c).some(cnt=>cnt>=4)) return (Number(Object.keys(c).find(k=>c[k]>=4))*4)+40; return 0; } if (row === "Yamb") { const c={}; v.forEach(x=>c[x]=(c[x]||0)+1); if(Object.values(c).some(cnt=>cnt>=5)) return (Number(Object.keys(c).find(k=>c[k]>=5))*5)+50; return 0; } return 0; }
    updateTableVisuals() { 
        this.players.forEach((p, idx) => { 
            const data = this.allScores[idx]; let grandTotal = 0; 
            KOLONE.forEach(col => { 
                let sum1 = 0; ["1","2","3","4","5","6"].forEach(r => { if(data[col][r]!==null) sum1 += data[col][r]; }); 
                if(sum1 >= 60) sum1 += 30; document.getElementById(`sum-${idx}-${col}-ZBIR 1`).innerText = sum1; 
                let sum2 = 0; const vMax = data[col]["Max"]; const vMin = data[col]["Min"]; const v1 = data[col]["1"]; 
                if (vMax!==null && vMin!==null && v1!==null) { sum2 = (vMax - vMin) * v1; if (sum2 >= 60) sum2 += 40; } document.getElementById(`sum-${idx}-${col}-ZBIR 2`).innerText = sum2; 
                let sum3 = 0; ["Triling","Kenta","Ful","Poker","Yamb"].forEach(r => { if(data[col][r]!==null) sum3 += data[col][r]; }); document.getElementById(`sum-${idx}-${col}-ZBIR 3`).innerText = sum3; 
                grandTotal += sum1 + sum2 + sum3; 
                REDOVI_PRIKAZ.forEach(row => { 
                    const btn = document.getElementById(`btn-${idx}-${col}-${row}`); if (!btn) return; 
                    const val = data[col][row]; btn.classList.remove('highlight-najava'); 
                    if (val !== null) { btn.innerText = val; btn.classList.add('filled'); btn.disabled = true; } else { 
                        btn.innerText = ""; btn.classList.remove('filled'); 
                        const isMyTurnOnline = (this.onlineMode && this.currentPlayerIdx === this.myOnlineIndex && idx === this.myOnlineIndex); 
                        const isLocalTurn = (!this.onlineMode && idx === this.currentPlayerIdx && !this.players[idx].includes("AI")); 
                        if ((isMyTurnOnline || isLocalTurn) && this.brojBacanja > 0) { btn.disabled = false; } else { btn.disabled = true; } 
                        if (this.najavljenoPolje && this.najavljenoPolje.row === row && this.najavljenoPolje.col === col) { btn.classList.add('highlight-najava'); } 
                    } 
                }); 
            }); 
            document.getElementById(`total-${idx}`).innerText = grandTotal; 
        }); 
    }
    checkSavedGame() { const saved = localStorage.getItem('yamb_saved_game'); const btnResume = document.getElementById('btn-resume-game'); if (saved) { btnResume.classList.remove('hidden'); } else { btnResume.classList.add('hidden'); } }
    autoSaveGame() { if(this.onlineMode) return; const data = { players: this.players, scores: this.allScores, current: this.currentPlayerIdx, aiMode: this.aiMode, diff: this.aiDifficulty, date: new Date().toISOString() }; localStorage.setItem('yamb_saved_game', JSON.stringify(data)); }
    async loadSavedGame() { 
        try { 
            const saved = localStorage.getItem('yamb_saved_game'); if (!saved) { this.modal.alert("Nema sačuvane igre."); return; } const data = JSON.parse(saved); 
            KOLONE.forEach(col => { this.players.forEach((_, idx) => { if (data.scores[idx] && !data.scores[idx][col]) { data.scores[idx][col] = {}; REDOVI_IGRA.forEach(r => data.scores[idx][col][r] = null); } }); });
            this.players = data.players; this.allScores = data.scores; this.currentPlayerIdx = data.current; this.aiMode = data.aiMode; this.aiDifficulty = data.diff || "medium"; 
            
            // FIX: Restore modeTag based on loaded data
            if (this.aiMode) this.modeTag = "vs AI";
            else if (this.players.length > 1) this.modeTag = "Hotseat";
            else this.modeTag = "Solo";

            if (this.aiMode) this.ai = new YambAI(this, this.aiDifficulty); this.startGame(); this.highlightCurrentPlayer(); this.updateTableVisuals(); this.modal.alert("Igra nastavljena!"); 
        } catch (e) { console.error(e); this.modal.alert("Greška pri učitavanju igre.\nFormat podataka je zastareo."); localStorage.removeItem('yamb_saved_game'); } 
    }
}

const app = new YambApp();