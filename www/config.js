// config.js - Podešavanja, Podaci prodavnice i Sistemske definicije (CENTRALIZED DATA)

// --- 1. GLAVNA PODEŠAVANJA I ZVUKOVI ---
const CONFIG = {
    INITIAL_BALANCE: 1000, 
    TOTAL_TROPHIES: 26, 
    SOUNDS: {
        DICE_ROLL: 'dice-roll.mp3',
        WIN: 'win.mp3',
        LOSS: 'loss.mp3',
        TROPHY: 'trophy.mp3',
        ACHIEVEMENT: 'achievement.mp3',
        CLICK: 'click.mp3'
    },
    GAME_STATUS: { IDLE: 'idle', ROLLING: 'rolling', FINISHED: 'finished' }
};

// --- 2. KONSTANTE ZA IGRU ---
const SERVER_URL = "https://yamb-of-the-balkan.onrender.com"; 

const UNICODE_DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const KOLONE = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];
const REDOVI_IGRA = ["1", "2", "3", "4", "5", "6", "Max", "Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];
const REDOVI_PRIKAZ = ["1", "2", "3", "4", "5", "6", "ZBIR 1", "Max", "Min", "ZBIR 2", "Triling", "Kenta", "Ful", "Poker", "Yamb", "ZBIR 3"];

// --- 3. CENTRALIZOVANI PODACI PRODAVNICE (UKLJUČUJUĆI TROFEJE) ---
const SHOP_DATA = {
    SKINS: [
        { id: 'default', name: { sr: 'Standard Bela', en: 'Standard White' }, price: 0, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_red', name: { sr: 'Kazino Crvena', en: 'Casino Red' }, price: 1500, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_blue', name: { sr: 'Deep Blue', en: 'Deep Blue' }, price: 1500, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_black', name: { sr: 'Crna Noć', en: 'Black Night' }, price: 2000, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'wood', name: { sr: 'Hrast', en: 'Oak' }, price: 3000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'marble', name: { sr: 'Carrara Mermer', en: 'Carrara Marble' }, price: 3500, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'carbon', name: { sr: 'Karbon', en: 'Carbon' }, price: 4000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'gold', name: { sr: 'Carsko Zlato', en: 'Imperial Gold' }, price: 5000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'neon_blue', name: { sr: 'Cyber Blue', en: 'Cyber Blue' }, price: 6000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'neon_pink', name: { sr: 'Synthwave', en: 'Synthwave' }, price: 6000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'neon_green', name: { sr: 'Matrix', en: 'Matrix' }, price: 6000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'stealth', name: { sr: 'Stealth Mode', en: 'Stealth Mode' }, price: 8000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'glass_clear', name: { sr: 'Čisti Kristal', en: 'Pure Crystal' }, price: 10000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_ruby', name: { sr: 'Krvavi Rubin', en: 'Blood Ruby' }, price: 12000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_emerald', name: { sr: 'Smaragd', en: 'Emerald' }, price: 12000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_sapphire', name: { sr: 'Safir', en: 'Sapphire' }, price: 12000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'magma', name: { sr: 'Magma Core', en: 'Magma Core' }, price: 15000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'galaxy', name: { sr: 'Galaksija', en: 'Galaxy' }, price: 18000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'retro', name: { sr: 'Retro 8-Bit', en: 'Retro 8-Bit' }, price: 20000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'hologram', name: { sr: 'Hologram', en: 'Hologram' }, price: 25000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } }
    ],
    
    EFFECTS: [
        { id: 'confetti', name: { sr: 'Konfete', en: 'Confetti' }, price: 0, desc: { sr: 'Klasična proslava Yamba.', en: 'Classic Yamb celebration.' }, duration: '3s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-confetti', innerHtml: '' },
        { id: 'gold_rain', name: { sr: 'Zlatna Kiša', en: 'Gold Rain' }, price: 10000, desc: { sr: 'Padaju dukati sa vrha ekrana.', en: 'Coins falling from the top.' }, duration: '4s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-gold_rain', innerHtml: '' },
        { id: 'fireflies', name: { sr: 'Magični Svici', en: 'Magic Fireflies' }, price: 5000, desc: { sr: 'Nežne svetleće kuglice.', en: 'Gentle glowing lights.' }, duration: '4s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-fireflies', innerHtml: '' },
        { id: 'glass', name: { sr: 'Staklena Prizma', en: 'Glass Prism' }, price: 12000, desc: { sr: 'Pretvara ekran u zamućeno staklo.', en: 'Turns screen into blurred glass.' }, duration: { sr: 'Trajno', en: 'Permanent' }, category: { sr: '💎 ATMOSFERA & STIL', en: '💎 ATMOSPHERE & STYLE' }, cssClass: 'prev-glass', innerHtml: '<div class="glass-overlay"></div>' },
        { id: 'shadow', name: { sr: 'Fokus Senka', en: 'Focus Shadow' }, price: 8000, desc: { sr: 'Zatamnjuje sve osim aktivne kolone.', en: 'Dims everything except active column.' }, duration: { sr: 'Trajno', en: 'Permanent' }, category: { sr: '💎 ATMOSFERA & STIL', en: '💎 ATMOSPHERE & STYLE' }, cssClass: 'prev-shadow', innerHtml: '<div class="shadow-overlay"></div>' },
        { id: 'neon_pulse', name: { sr: 'Neon Puls', en: 'Neon Pulse' }, price: 15000, desc: { sr: 'Cyberpunk linije skeniraju ekran.', en: 'Cyberpunk lines scanning screen.' }, duration: '2s', category: { sr: '💎 ATMOSFERA & STIL', en: '💎 ATMOSPHERE & STYLE' }, cssClass: 'prev-neon', innerHtml: '<div class="neon-line"></div>' },
        { id: 'thunder', name: { sr: 'Gromovnik', en: 'Thunderbringer' }, price: 20000, desc: { sr: 'Ekran se trese uz udar groma.', en: 'Screen shakes with thunder strike.' }, duration: '1s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, req: 'sveti_ilija', reqName: { sr: 'Sveti Ilija', en: 'Saint Elijah' }, cssClass: 'prev-thunder', innerHtml: '' },
        { id: 'balkan', name: { sr: 'Svadba', en: 'Wedding' }, price: 25000, desc: { sr: 'Trubači, pare i opštenarodno veselje.', en: 'Trumpets, money and folk celebration.' }, duration: '5s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-balkan', innerHtml: '' },
        { id: 'fireworks', name: { sr: 'Grandiozni Vatromet', en: 'Grand Fireworks' }, price: 30000, desc: { sr: 'Eksplozija boja za pobednike.', en: 'Explosion of colors for winners.' }, duration: '5s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-fireworks', innerHtml: '' }
    ],

    TROPHIES: [
        { id: 'first_play', icon: '🐣', title: { sr: 'Prvo Bacanje', en: 'First Roll' }, desc: { sr: 'Završi prvu partiju.', en: 'Finish your first game.' }, reward: 500, category: { sr: 'POČETAK', en: 'START' } },
        { id: 'apprentice', icon: '🔨', title: { sr: 'Šegrt', en: 'Apprentice' }, desc: { sr: 'Odigraj 10 partija.', en: 'Play 10 games.' }, reward: 1000, category: { sr: 'NAPREDAK', en: 'PROGRESS' } },
        { id: 'kafana', icon: '🍻', title: { sr: 'Kafanski Sto', en: 'Pub Table' }, desc: { sr: 'Odigraj partiju u "2 Igrača" modu.', en: 'Play a "2 Player" game.' }, reward: 500, category: { sr: 'DRUŠTVO', en: 'SOCIAL' } },
        { id: 'score_1000', icon: '👑', title: { sr: 'Vojvoda', en: 'Duke' }, desc: { sr: 'Ostvari rezultat preko 1000.', en: 'Score over 1000.' }, reward: 2500, category: { sr: 'REZULTATI', en: 'RESULTS' } },
        { id: 'grandmaster', icon: '🎩', title: { sr: 'Velemajstor', en: 'Grandmaster' }, desc: { sr: 'Ostvari rezultat preko 1250.', en: 'Score over 1250.' }, reward: 5000, category: { sr: 'REZULTATI', en: 'RESULTS' } },
        { id: 'legend', icon: '🌟', title: { sr: 'Legenda', en: 'Legend' }, desc: { sr: 'Ostvari rezultat preko 2000.', en: 'Score over 2000.' }, reward: 7500, category: { sr: 'REZULTATI', en: 'RESULTS' } },
        { id: 'mythic', icon: '🐉', title: { sr: 'Mitski Igrač', en: 'Mythic Player' }, desc: { sr: 'Ostvari rezultat preko 2500.', en: 'Score over 2500.' }, reward: 15000, category: { sr: 'REZULTATI', en: 'RESULTS' } },
        { id: 'godlike', icon: '⚡', title: { sr: 'Božanstvo', en: 'Godlike' }, desc: { sr: 'Ostvari neverovatnih 3000+ poena!', en: 'Score incredible 3000+ points!' }, reward: 30000, category: { sr: 'REZULTATI', en: 'RESULTS' } },
        { id: 'surgeon', icon: '😷', title: { sr: 'Hirurg', en: 'Surgeon' }, desc: { sr: 'Popuni celu Ručno kolonu bez nule.', en: 'Fill Manual column without zeros.' }, reward: 3000, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'prophet', icon: '🔮', title: { sr: 'Prorok', en: 'Prophet' }, desc: { sr: 'Pogodi 3 Najave zaredom.', en: 'Hit 3 Announcements in a row.' }, reward: 1500, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'sniper', icon: '🎯', title: { sr: 'Snajper', en: 'Sniper' }, desc: { sr: 'Pogodi Yamb u Najavi.', en: 'Hit Yamb in Announcement.' }, reward: 2500, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'math', icon: '📐', title: { sr: 'Matematičar', en: 'Mathematician' }, desc: { sr: 'Tačno 63 u Zbiru 1.', en: 'Exactly 63 in Sum 1.' }, reward: 1000, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'sveti_ilija', icon: '⚡', title: { sr: 'Sveti Ilija', en: 'Saint Elijah' }, desc: { sr: 'Yamb iz prvog bacanja!', en: 'Yamb on the first roll!' }, reward: 10000, category: { sr: 'SREĆA', en: 'LUCK' } },
        { id: 'hazard', icon: '⚠️', title: { sr: 'Hazarder', en: 'Daredevil' }, desc: { sr: 'Upiši Yamb u kolonu Ručno.', en: 'Write Yamb in Manual column.' }, reward: 3000, category: { sr: 'SREĆA', en: 'LUCK' } },
        { id: 'firecracker', icon: '🧨', title: { sr: 'Petarda', en: 'Firecracker' }, desc: { sr: 'Upiši svih 5 Yambova (bez nule).', en: 'Write all 5 Yambs (no zero).' }, reward: 4000, category: { sr: 'SREĆA', en: 'LUCK' } },
        { id: 'concrete', icon: '🧱', title: { sr: 'Armirani Beton', en: 'Reinforced Concrete' }, desc: { sr: 'Popuni sve Kente.', en: 'Fill all Kentas.' }, reward: 2500, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'perfectionist', icon: '✨', title: { sr: 'Perfekcionista', en: 'Perfectionist' }, desc: { sr: 'Bonus (Zbir 1) u svim kolonama.', en: 'Bonus (Sum 1) in all columns.' }, reward: 3500, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'miner', icon: '⛏️', title: { sr: 'Rudar', en: 'Miner' }, desc: { sr: 'Zbir 2 (Max-Min) veći od 60.', en: 'Sum 2 (Max-Min) greater than 60.' }, reward: 2000, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'immortal', icon: '🛡️', title: { sr: 'Neuništiv', en: 'Immortal' }, desc: { sr: 'Završi partiju bez ijedne nule.', en: 'Finish game without a single zero.' }, reward: 10000, category: { sr: 'MAJSTORSTVO', en: 'MASTERY' } },
        { id: 'potato', icon: '🥔', title: { sr: 'Krompiruša', en: 'Potato' }, desc: { sr: 'Precrtao si Yamb (0).', en: 'Crossed out Yamb (0).' }, reward: 500, category: { sr: 'UTEŠNA', en: 'CONSOLATION' } },
        { id: 'minimal', icon: '📉', title: { sr: 'Minimalac', en: 'Minimalist' }, desc: { sr: 'Min kolona < 7.', en: 'Min column < 7.' }, reward: 2000, category: { sr: 'VEŠTINA', en: 'SKILL' } },
        { id: 'achilles', icon: '🛡️', title: { sr: 'Ahilova Peta', en: 'Achilles Heel' }, desc: { sr: 'Ceo list pun, samo Yamb nula.', en: 'Full sheet, only Yamb is zero.' }, reward: 5000, category: { sr: 'TRAGEDIJA', en: 'TRAGEDY' } },
        { id: 'close_call', icon: '🤏', title: { sr: 'Za Dlaku', en: 'Close Call' }, desc: { sr: 'Završi sa razlikom manjom od 5 poena.', en: 'Finish with less than 5 points difference.' }, reward: 1000, category: { sr: 'IZAZOV', en: 'CHALLENGE' } },
        { id: 'night_owl', icon: '🦉', title: { sr: 'Noćna Ptica', en: 'Night Owl' }, desc: { sr: 'Završi partiju između 03-05h.', en: 'Finish game between 03-05h.' }, reward: 1000, category: { sr: 'STIL ŽIVOTA', en: 'LIFESTYLE' } },
        { id: 'spite', icon: '😤', title: { sr: 'Inat', en: 'Spite' }, desc: { sr: 'Završi partiju iako gubiš 200+ razlike.', en: 'Finish game even if losing by 200+.' }, reward: 1000, category: { sr: 'STAV', en: 'ATTITUDE' } },
        { id: 'veteran', icon: '🎖️', title: { sr: 'Veteran', en: 'Veteran' }, desc: { sr: 'Odigraj 50 partija.', en: 'Play 50 games.' }, reward: 3000, category: { sr: 'NAPREDAK', en: 'PROGRESS' } }
    ]
};

// --- 4. SISTEMSKE KLASE ---

class ModalManager {
    constructor() {
        this.overlay = document.getElementById('custom-modal-overlay');
        this.title = document.getElementById('cm-title');
        this.msg = document.getElementById('cm-msg');
        this.input = document.getElementById('cm-input');
        this.btnCancel = document.getElementById('cm-cancel');
        this.btnOk = document.getElementById('cm-ok');
    }
    alert(text, title) {
        const safeTitle = title || (typeof t !== 'undefined' ? t('modal_title_info') : "OBAVEŠTENJE");
        return new Promise(resolve => {
            if(!this.overlay) { alert(text); resolve(true); return; } 
            this.setup(safeTitle, text, false);
            this.btnOk.onclick = () => { this.close(); resolve(true); };
            this.open();
        });
    }
    confirm(text) {
        const safeTitle = typeof t !== 'undefined' ? t('modal_title_confirm') : "POTVRDA";
        return new Promise(resolve => {
            if(!this.overlay) { resolve(confirm(text)); return; }
            this.setup(safeTitle, text, false);
            this.btnCancel.classList.remove('hidden');
            this.btnOk.onclick = () => { this.close(); resolve(true); };
            this.btnCancel.onclick = () => { this.close(); resolve(false); };
            this.open();
        });
    }
    prompt(text) {
        const safeTitle = typeof t !== 'undefined' ? t('modal_title_input') : "UNOS";
        return new Promise(resolve => {
            if(!this.overlay) { resolve(prompt(text)); return; }
            this.setup(safeTitle, text, true);
            this.btnOk.onclick = () => { 
                const val = this.input.value; 
                this.close(); 
                resolve(val); 
            };
            this.open();
        });
    }
    setup(title, msg, hasInput) {
        if(this.title) this.title.innerText = title;
        if(this.msg) this.msg.innerText = msg;
        if(this.btnCancel) this.btnCancel.classList.add('hidden');
        if(hasInput && this.input) { this.input.classList.remove('hidden'); this.input.value = ""; this.input.focus(); } 
        else if (this.input) { this.input.classList.add('hidden'); }
        if(this.btnOk) { const newOk = this.btnOk.cloneNode(true); this.btnOk.parentNode.replaceChild(newOk, this.btnOk); this.btnOk = newOk; }
        if(this.btnCancel) { const newCancel = this.btnCancel.cloneNode(true); this.btnCancel.parentNode.replaceChild(newCancel, this.btnCancel); this.btnCancel = newCancel; }
        if(typeof t !== 'undefined') {
            if(this.btnOk) this.btnOk.innerText = t('modal_btn_ok') || "U REDU";
            if(this.btnCancel) this.btnCancel.innerText = t('modal_btn_cancel') || "OTKAŽI";
        }
    }
    open() { if(this.overlay) this.overlay.style.display = 'flex'; }
    close() { if(this.overlay) this.overlay.style.display = 'none'; }
}

class EffectManager {
    constructor() {
        this.activeEffects = [];
    }
    applyPermanent(type) {
        this.stop(); 
        if (!type || type === 'none') return;
        if (type === 'glass') document.body.classList.add('fx-glass');
        if (type === 'shadow') document.body.classList.add('fx-shadow');
        if (type === 'neon_pulse') document.body.classList.add('fx-neon_pulse');
    }
    trigger(type) {
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnEmojiRain(['💰', '🪙', '💎', '👑'], 50);
        if (type === 'fireflies') this.spawnFloatingEmoji(['✨', '🌟', '💫', '🧚'], 40);
        if (type === 'thunder') {
            const flash = document.createElement('div');
            flash.className = 'anim-thunder';
            flash.style.position = 'fixed';
            flash.style.top = '0'; flash.style.left = '0';
            flash.style.width = '100%'; flash.style.height = '100%';
            flash.style.background = '#fff';
            flash.style.zIndex = '99999';
            flash.style.mixBlendMode = 'overlay';
            flash.style.pointerEvents = 'none';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 600);
            document.body.classList.add('fx-balkan'); 
            setTimeout(() => document.body.classList.remove('fx-balkan'), 500);
        }
        if (type === 'balkan') {
            document.body.classList.add('fx-balkan');
            const t1 = document.createElement('div'); t1.innerText = '🎺'; t1.className = 'trumpet-icon'; t1.style.left = '10px'; t1.style.bottom = '10px';
            const t2 = document.createElement('div'); t2.innerText = '🎺'; t2.className = 'trumpet-icon'; t2.style.right = '10px'; t2.style.bottom = '10px'; t2.style.transform = 'scaleX(-1)';
            document.body.appendChild(t1);
            document.body.appendChild(t2);
            this.spawnEmojiRain(['💶', '💵', '🥂', '🍾', '🍖'], 40);
            setTimeout(() => {
                document.body.classList.remove('fx-balkan');
                if(t1.parentNode) t1.remove(); 
                if(t2.parentNode) t2.remove();
            }, 4000);
        }
        if (type === 'fireworks') {
             for(let i=0; i<8; i++) {
                 setTimeout(() => this.spawnExplosion(), i * 400);
             }
        }
    }
    spawnEmojiRain(emojis, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
                el.className = 'falling-coin';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 3000);
            }, Math.random() * 2000);
        }
    }
    spawnFloatingEmoji(emojis, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
                el.className = 'firefly';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.setProperty('--rnd-x', (Math.random() * 200 - 100) + 'px');
                el.style.animationDuration = (Math.random() * 2 + 2) + 's';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 4000);
            }, Math.random() * 2000);
        }
    }
    spawnExplosion() {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * (window.innerHeight / 2); 
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 20; i++) {
            const el = document.createElement('div');
            el.innerText = '●'; 
            el.className = 'firework-particle';
            el.style.color = color;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 150 + 50;
            el.style.setProperty('--dx', Math.cos(angle) * velocity + 'px');
            el.style.setProperty('--dy', Math.sin(angle) * velocity + 'px');
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }
    }
    spawnConfetti() {
        if (window.confetti) {
            window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        } else {
            this.spawnEmojiRain(['🎉', '🎊', '🎈'], 30);
        }
    }
    celebrateYamb() {
        const active = localStorage.getItem('yamb_active_effect') || 'confetti';
        this.trigger(active); 
        document.body.classList.add('fx-neon_pulse');
        setTimeout(() => document.body.classList.remove('fx-neon_pulse'), 2000);
    }
    celebrateWin() {
        this.trigger('fireworks');
        setTimeout(() => this.trigger('gold_rain'), 1000);
    }
    stop() {
        document.body.classList.remove('fx-glass', 'fx-shadow', 'fx-neon_pulse', 'fx-balkan');
        document.querySelectorAll('.falling-coin, .firefly, .trumpet-icon, .firework-particle').forEach(e => e.remove());
    }
}

// Export
if (typeof window !== 'undefined') { Object.freeze(CONFIG); }
if (typeof module !== 'undefined' && module.exports) { module.exports = CONFIG; }