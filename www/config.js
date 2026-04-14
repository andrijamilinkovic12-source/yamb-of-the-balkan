/* =========================================================
   CONFIG & STATE MANAGMENT (COMPLETE & FIXED)
   ========================================================= */

const CONFIG = {
    // ---------------------------------------------------------
    // OSNOVNA PODEŠAVANJA APLIKACIJE I GAMEPLAY-A
    // ---------------------------------------------------------
    APP_VERSION: "2.1.2",
    STORAGE_KEY: "yamb_master_data",
    THEME_STORAGE_KEY: "yamb_theme",
    LANG_STORAGE_KEY: "yamb_lang",
    AUTOSAVE_INTERVAL: 10000, 
    MAX_ROLLS: 3,             
    DICE_COUNT: 6,            
    MIN_DICE_VAL: 1,          
    MAX_DICE_VAL: 6,          
    ANIMATION_SPEED: 600,     
    
    // ---------------------------------------------------------
    // RIZNICA I SISTEM EKONOMIJE
    // ---------------------------------------------------------
    STARTING_COINS: 0,
    STARTING_GEMS: 0,
    
    REWARD_DAILY_LOGIN: 50,    
    REWARD_WIN_SOLO: 100,      
    REWARD_WIN_MULTIPLAYER: 150, 
    REWARD_HIGH_SCORE: 50,     
    
    AD_REWARD_COINS: 25,       
    AD_REWARD_GEMS: 5,         
    AD_COOLDOWN_MS: 300000,

    // ---------------------------------------------------------
    // DEFINICIJE KOLONA I REDOVA
    // ---------------------------------------------------------
    COLUMNS: ['Nadole', 'Slobodna', 'Sredina', 'Nagore', 'Ručno', 'Najava'],
    ROWS: {
        BROJEVI: ['1', '2', '3', '4', '5', '6'],
        MAXMIN: ['Max', 'Min'],
        FIGURE: ['Triling', 'Kenta', 'Ful', 'Poker', 'Yamb']
    },

    SCORING: {
        BONUS_BROJEVI: { THRESHOLD: 60, POINTS: 30 }, 
        BONUS_KENTA: { OSNOVNA: 50, MAX_ROLL: 66, MID_ROLL: 56, MIN_ROLL: 46 },
        BONUS_TRILING: 20, 
        BONUS_FUL: 30,     
        BONUS_KARE: 40,    
        BONUS_YAMB: 50     
    },

    // ---------------------------------------------------------
    // INICIJALNO STANJE KORISNIKA
    // ---------------------------------------------------------
    INITIAL_USER_STATE: {
        coins: 0,
        gems: 0,
        stats: {
            gamesPlayed: 0, gamesWon: 0, gamesLost: 0, highScore: 0, totalScore: 0, yambsRolled: 0, playTimeMinutes: 0
        },
        inventory: {
            diceSkin: 'default', themeSkin: 'spring', unlockedDice: ['default'], unlockedThemes: ['spring', 'light'],
            powerups: { extra_roll: 0, undo_move: 0, luck_charm: 0, golden_dice: 0 }
        },
        adProgress: {
             'cyberpunk': 0, 'dragon_scale': 0, 'amethyst': 0, 'toxic': 0, 'obsidian': 0, 'pearl': 0
        },
        lastLogin: null,
        loginStreak: 0,
        dailyChallengeComplete: false
    }
};

// --- PAMETNI URL SERVERA (CRITICAL FIX ZA ZALEĐIVANJE) ---
let serverUrl = 'https://yamb-of-the-balkan.onrender.com';
const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isNativeApp = (window.Capacitor !== undefined);

if (isLocalhost && !isNativeApp) {
    serverUrl = 'http://localhost:3000';
    console.log("🖥️ PC Detect: Koristim Localhost server.");
} else {
    console.log("📱 Mobile/Web Detect: Koristim Render server.");
}
const SERVER_URL = serverUrl;

// --- KONSTANTE IGRE ---
const KOLONE = CONFIG.COLUMNS;
const REDOVI_IGRA = [...CONFIG.ROWS.BROJEVI, ...CONFIG.ROWS.MAXMIN, ...CONFIG.ROWS.FIGURE];
const REDOVI_PRIKAZ = [...CONFIG.ROWS.BROJEVI, "ZBIR 1", ...CONFIG.ROWS.MAXMIN, "ZBIR 2", ...CONFIG.ROWS.FIGURE, "ZBIR 3"];
const UNICODE_DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]; // FIX: Vraćeno u niz kako ga JS očekuje pri iteraciji

// --- PODACI PRODAVNICE (SHOP_DATA - CRITICAL FIX ZA MANAGERS.JS) ---
const SHOP_DATA = {
    SKINS: [
        { id: 'default', price: 0, premium: false, name: { sr: 'Osnovni', en: 'Default' }, type: 'dice', category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_red', price: 100, premium: false, name: { sr: 'Klasična Crvena', en: 'Classic Red' }, type: 'dice', category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_blue', price: 100, premium: false, name: { sr: 'Klasična Plava', en: 'Classic Blue' }, type: 'dice', category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_black', price: 150, premium: false, name: { sr: 'Klasična Crna', en: 'Classic Black' }, type: 'dice', category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'retro', price: 400, premium: false, name: { sr: 'Retro 8-bit', en: 'Retro 8-bit' }, type: 'dice', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'wood', price: 300, premium: false, name: { sr: 'Drvena Tabla', en: 'Wooden Board' }, type: 'dice', category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'marble', price: 500, premium: false, name: { sr: 'Beli Mermer', en: 'White Marble' }, type: 'dice', category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'stealth', price: 800, premium: false, name: { sr: 'Nevidljivi Mat', en: 'Stealth Matte' }, type: 'dice', category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'carbon', price: 750, premium: false, name: { sr: 'Karbon', en: 'Carbon Fiber' }, type: 'dice', category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'glass_clear', price: 600, premium: false, name: { sr: 'Čisto Staklo', en: 'Clear Glass' }, type: 'dice', category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'gold', price: 1000, premium: true, name: { sr: 'Čisto Zlato', en: 'Solid Gold' }, type: 'dice', category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'glass_ruby', price: 900, premium: true, name: { sr: 'Rubinsko Staklo', en: 'Ruby Glass' }, type: 'dice', category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_emerald', price: 900, premium: true, name: { sr: 'Smaragdno Staklo', en: 'Emerald Glass' }, type: 'dice', category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_sapphire', price: 900, premium: true, name: { sr: 'Safirno Staklo', en: 'Sapphire Glass' }, type: 'dice', category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'neon_blue', price: 1200, premium: true, name: { sr: 'Neon Sajber Plava', en: 'Neon Cyber Blue' }, type: 'dice', category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'neon_pink', price: 1200, premium: true, name: { sr: 'Neon Sint Pink', en: 'Neon Synth Pink' }, type: 'dice', category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'neon_green', price: 1200, premium: true, name: { sr: 'Neon Matriks', en: 'Neon Matrix' }, type: 'dice', category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'magma', price: 1500, premium: true, name: { sr: 'Vulkanska Magma', en: 'Volcanic Magma' }, type: 'dice', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'galaxy', price: 2000, premium: true, name: { sr: 'Duboki Svemir', en: 'Deep Space Galaxy' }, type: 'dice', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'hologram', price: 2500, premium: true, name: { sr: 'Hologramska Projekcija', en: 'Holographic Projection' }, type: 'dice', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'cyberpunk', adsRequired: 5, premium: true, isReward: true, name: { sr: 'Sajberpank', en: 'Cyberpunk' }, type: 'dice', category: { sr: '🎁 REWARD SKINOVI', en: '🎁 REWARD SKINS' } },
        { id: 'dragon_scale', adsRequired: 5, premium: true, isReward: true, name: { sr: 'Zmajeva Krljušt', en: 'Dragon Scale' }, type: 'dice', category: { sr: '🎁 REWARD SKINOVI', en: '🎁 REWARD SKINS' } },
        { id: 'amethyst', adsRequired: 5, premium: true, isReward: true, name: { sr: 'Ametist', en: 'Amethyst' }, type: 'dice', category: { sr: '🎁 REWARD SKINOVI', en: '🎁 REWARD SKINS' } },
        { id: 'toxic', adsRequired: 5, premium: true, isReward: true, name: { sr: 'Toksično', en: 'Toxic' }, type: 'dice', category: { sr: '🎁 REWARD SKINOVI', en: '🎁 REWARD SKINS' } },
        { id: 'obsidian', adsRequired: 5, premium: true, isReward: true, name: { sr: 'Opsidijan', en: 'Obsidian' }, type: 'dice', category: { sr: '🎁 REWARD SKINOVI', en: '🎁 REWARD SKINS' } },
        { id: 'pearl', adsRequired: 5, premium: true, isReward: true, name: { sr: 'Biser', en: 'Pearl' }, type: 'dice', category: { sr: '🎁 REWARD SKINOVI', en: '🎁 REWARD SKINS' } }
    ],
    THEMES: [
        { id: 'spring', price: 0, premium: false, name: { sr: 'Prolećna Oaza', en: 'Spring Oasis' }, icon: '🎲', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'light', price: 0, premium: false, name: { sr: 'Klasična Svetla', en: 'Classic Light' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'medium', price: 200, premium: false, name: { sr: 'Trešnja Velvet', en: 'Cherry Velvet' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'winter', price: 300, premium: false, name: { sr: 'Okeanska Zimska', en: 'Ocean Winter' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'desert', price: 400, premium: false, name: { sr: 'Pustinjsko Staklo', en: 'Desert Glass' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'neon', price: 1500, premium: true, name: { sr: 'Neon Sajberpank', en: 'Neon Cyberpunk' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'amethyst', price: 2000, premium: true, name: { sr: 'Kraljevski Ametist', en: 'Royal Amethyst' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'easter', price: 1200, premium: true, name: { sr: 'Uskršnji Pastel', en: 'Premium Pastel Easter' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } }
    ],
    POWERUPS: [
        { id: 'extra_roll', price: 50, premium: false, name: { sr: 'Dodatno Bacanje (+1)', en: 'Extra Roll (+1)' }, desc: { sr: 'Dodaje jedno bacanje u trenutnom potezu.', en: 'Adds one extra roll to your current turn.' } },
        { id: 'undo_move', price: 150, premium: false, name: { sr: 'Poništi Potez', en: 'Undo Last Move' }, desc: { sr: 'Poništava poslednji upis.', en: 'Undo your last filled score.' } },
        { id: 'luck_charm', price: 500, premium: true, name: { sr: 'Amajlija', en: 'Lucky Charm' }, desc: { sr: 'Povećava šansu za veće brojeve.', en: 'Increases chances of rolling higher numbers.' } },
        { id: 'golden_dice', price: 1000, premium: true, name: { sr: 'Zlatni Set Kockica', en: 'Golden Dice Set' }, desc: { sr: 'Garantuje bar dve iste kockice.', en: 'Guarantees at least two matching dice.' } }
    ],
    EFFECTS: [
        { id: 'confetti', name: { sr: 'Konfete', en: 'Confetti' }, price: 0, category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' } },
        { id: 'gold_rain', name: { sr: 'Zlatna Kiša', en: 'Gold Rain' }, price: 10000, category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' } },
        { id: 'fireflies', name: { sr: 'Magični Svici', en: 'Magic Fireflies' }, price: 5000, category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' } },
        { id: 'bubbles', name: { sr: 'Magični Mehurići', en: 'Magic Bubbles' }, price: 8000, category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' } },
        { id: 'ice_age', name: { sr: 'Ledeno Doba', en: 'Ice Age' }, price: 15000, category: { sr: '❄️ ZIMSKI EFEKTI', en: '❄️ WINTER EFFECTS' } },
        { id: 'black_hole', name: { sr: 'Crna Rupa', en: 'Black Hole' }, price: 20000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'supernova', name: { sr: 'Supernova', en: 'Supernova' }, price: 18000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'neon_pulse', name: { sr: 'Neon Puls', en: 'Neon Pulse' }, price: 15000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'thunder', name: { sr: 'Gromovnik', en: 'Thunderbringer' }, price: 12000, category: { sr: '⚡ VREMENSKE NEPOGODE', en: '⚡ WEATHER' } },
        { id: 'balkan', name: { sr: 'Balkanska Svadba', en: 'Balkan Wedding' }, price: 25000, category: { sr: '🎺 SPECIJALNI', en: '🎺 SPECIAL' } },
        { id: 'drones', name: { sr: 'Dronovi', en: 'Drone Show' }, price: 30000, category: { sr: '🚀 FUTURIZAM', en: '🚀 FUTURISM' } },
        { id: 'fireworks', name: { sr: 'Vatromet', en: 'Fireworks' }, price: 22000, category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' } }
    ]
};

// --- TROFEJI (Vraćeno radi stabilnosti i sprečavanja grešaka) ---
const TROPHIES = [
    { id: 'first_play', icon: '🎲', title: { sr: 'Prvo Bacanje', en: 'First Roll' }, desc: { sr: 'Završi prvu partiju.', en: 'Finish your first game.' }, reward: 500, category: { sr: 'POČETAK', en: 'START' } },
    { id: 'apprentice', icon: '🔨', title: { sr: 'Šegrt', en: 'Apprentice' }, desc: { sr: 'Odigraj 10 partija.', en: 'Play 10 games.' }, reward: 1000, category: { sr: 'NAPREDAK', en: 'PROGRESS' } },
    { id: 'kafana', icon: '🍻', title: { sr: 'Kafanski Sto', en: 'Pub Table' }, desc: { sr: 'Odigraj partiju u "2 Igrača" modu.', en: 'Play a "2 Player" game.' }, reward: 500, category: { sr: 'DRUŠTVO', en: 'SOCIETY' } },
    { id: 'score_1000', icon: '🔥', title: { sr: 'Zagrevanje', en: 'Warming Up' }, desc: { sr: 'Osvoji preko 1000 poena u partiji.', en: 'Score over 1000 points in a game.' }, reward: 1500, category: { sr: 'REZULTATI', en: 'SCORES' } },
    { id: 'grandmaster', icon: '👑', title: { sr: 'Velemajstor', en: 'Grandmaster' }, desc: { sr: 'Osvoji preko 2500 poena u partiji.', en: 'Score over 2500 points in a game.' }, reward: 5000, category: { sr: 'REZULTATI', en: 'SCORES' } },
    { id: 'math', icon: '📐', title: { sr: 'Matematičar', en: 'Mathematician' }, desc: { sr: 'Tačno 63 u Zbiru 1.', en: 'Exactly 63 in Sum 1.' }, reward: 1000, category: { sr: 'VEŠTINA', en: 'SKILL' } },
    { id: 'achilles', icon: '🛡️', title: { sr: 'Ahilova Peta', en: 'Achilles Heel' }, desc: { sr: 'Ceo list pun, samo Yamb nula.', en: 'Full sheet, only Yamb is zero.' }, reward: 5000, category: { sr: 'TRAGEDIJA', en: 'TRAGEDY' } },
    { id: 'veteran', icon: '🎖️', title: { sr: 'Veteran', en: 'Veteran' }, desc: { sr: 'Odigraj 50 partija.', en: 'Play 50 games.' }, reward: 2000, category: { sr: 'NAPREDAK', en: 'PROGRESS' } }
];

Object.freeze(CONFIG);