// config.js - PODACI I KONFIGURACIJA (COMPLETE & FIXED)

// --- 1. GLAVNA PODEŠAVANJA ---
const CONFIG = {
    INITIAL_BALANCE: 1000, 
    TOTAL_TROPHIES: 26, 
    // Imena fajlova za zvukove (SoundManager ih koristi ili koristi fallback synth)
    SOUNDS: {
        DICE_ROLL: 'dice-roll.mp3',
        WIN: 'win.mp3',
        LOSS: 'loss.mp3',
        TROPHY: 'trophy.mp3',
        ACHIEVEMENT: 'achievement.mp3',
        CLICK: 'click.mp3',
        ANNOUNCE: 'announce.mp3' 
    },
    GAME_STATUS: { IDLE: 'idle', ROLLING: 'rolling', FINISHED: 'finished' }
};

// --- 2. PAMETNI URL (ISPRAVKA ZA TELEFON) ---
// Default: Uvek gađaj pravi server na internetu
let serverUrl = 'https://yamb-of-the-balkan.onrender.com';

// Provera: Da li smo na lokalnom računaru?
const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Provera: Da li je ovo mobilna aplikacija? (Capacitor ubacuje ovaj objekat)
const isNativeApp = (window.Capacitor !== undefined);

// LOGIKA: Koristi localhost:3000 SAMO ako smo na kompjuteru (browser)
// Ako smo na telefonu (isNativeApp je true), MORAMO koristiti https link, iako telefon misli da je na localhostu.
if (isLocalhost && !isNativeApp) {
    serverUrl = 'http://localhost:3000';
    console.log("🖥️ PC Detect: Koristim Localhost server.");
} else {
    console.log("📱 Mobile/Web Detect: Koristim Render server.");
}

const SERVER_URL = serverUrl;

// --- 3. KONSTANTE ZA IGRU ---
const UNICODE_DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const KOLONE = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];
const REDOVI_IGRA = ["1", "2", "3", "4", "5", "6", "Max", "Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];
const REDOVI_PRIKAZ = ["1", "2", "3", "4", "5", "6", "ZBIR 1", "Max", "Min", "ZBIR 2", "Triling", "Kenta", "Ful", "Poker", "Yamb", "ZBIR 3"];

// --- 4. PODACI PRODAVNICE (SKINOVI, EFEKTI, TROFEJI) ---
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
        { id: 'ice_age', name: { sr: 'Ledeno Doba', en: 'Ice Age' }, price: 12000, desc: { sr: 'Tabla se zaledi kada dobijete Yamb.', en: 'Board freezes when you get Yamb.' }, duration: '8s', category: { sr: '💎 ATMOSFERA & STIL', en: '💎 ATMOSPHERE & STYLE' }, cssClass: 'prev-glass', innerHtml: '' },
        { id: 'black_hole', name: { sr: 'Crna Rupa', en: 'Black Hole' }, price: 15000, desc: { sr: 'Guta tablu unutar vatrene crne rupe.', en: 'Sucks the board into a fiery black hole.' }, duration: '6s', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' }, cssClass: 'prev-black-hole', innerHtml: '<div class="bh-ring-prev"></div>' },
        { id: 'supernova', name: { sr: 'Supernova', en: 'Supernova' }, price: 18000, desc: { sr: 'Kosmička eksplozija zvezde pri osvajanju Yamba.', en: 'Cosmic star explosion on Yamb.' }, duration: '7.5s', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' }, cssClass: 'prev-supernova', innerHtml: '<div class="sn-ring-prev"></div>' },
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
        { id: 'math', icon: '📐', title: { sr: 'Matematičar', en: 'Matematičar' }, desc: { sr: 'Tačno 63 u Zbiru 1.', en: 'Exactly 63 in Sum 1.' }, reward: 1000, category: { sr: 'VEŠTINA', en: 'SKILL' } },
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

// Export (ako je potrebno za module, mada u browseru radi globalno)
if (typeof window !== 'undefined') { Object.freeze(CONFIG); }
if (typeof module !== 'undefined' && module.exports) { module.exports = CONFIG; }