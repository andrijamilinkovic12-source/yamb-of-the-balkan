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

// --- 3. KONSTANTE ZA IGRU ---
const UNICODE_DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const KOLONE = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];
const REDOVI_IGRA = ["1", "2", "3", "4", "5", "6", "Max", "Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];
const REDOVI_PRIKAZ = ["1", "2", "3", "4", "5", "6", "ZBIR 1", "Max", "Min", "ZBIR 2", "Triling", "Kenta", "Ful", "Poker", "Yamb", "ZBIR 3"];

// --- 3.1. BEZBEDNO RENDEROVANJE KORISNICKOG SADRZAJA ---
const YambSecurity = (() => {
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, char => entityMap[char]);
    const escapeAttr = escapeHtml;
    const jsString = (value) => JSON.stringify(String(value ?? ''));

    const safeUrl = (value, fallback = '') => {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;

        try {
            const base = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'https://yamb.local';
            const parsed = new URL(raw, base);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
        } catch (err) {
            return fallback;
        }
    };

    return Object.freeze({ escapeHtml, escapeAttr, jsString, safeUrl });
})();

if (typeof window !== 'undefined') {
    window.YambSecurity = YambSecurity;
}

// --- 4. PODACI PRODAVNICE (SKINOVI, EFEKTI, TROFEJI, TEME) ---
const SHOP_DATA = {
    SKINS: [
        { id: 'default', name: { sr: 'Standard Bela', en: 'Standard White' }, price: 0, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_red', name: { sr: 'Kazino Red', en: 'Casino Red' }, price: 1500, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_blue', name: { sr: 'Deep Blue', en: 'Deep Blue' }, price: 1500, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        { id: 'classic_black', name: { sr: 'Crna Noć', en: 'Black Night' }, price: 2000, category: { sr: '🎩 KLASIKA & ELEGANCIJA', en: '🎩 CLASSIC & ELEGANCE' } },
        
        // --- 🥉 BRONZANA KOLEKCIJA ---
        { id: 'bronze_antique', name: { sr: 'Antička Bronza', en: 'Antique Bronze' }, price: 2500, category: { sr: '🥉 BRONZANA KOLEKCIJA', en: '🥉 BRONZE COLLECTION' } },
        { id: 'bronze_patina', name: { sr: 'Oksidirani Bakar', en: 'Oxidized Copper' }, price: 3000, category: { sr: '🥉 BRONZANA KOLEKCIJA', en: '🥉 BRONZE COLLECTION' } },
        { id: 'bronze_steampunk', name: { sr: 'Steampunk Zupčanik', en: 'Steampunk Gear' }, price: 3500, category: { sr: '🥉 BRONZANA KOLEKCIJA', en: '🥉 BRONZE COLLECTION' } },
        { id: 'bronze_spartan', name: { sr: 'Spartanski Štit', en: 'Spartan Shield' }, price: 4000, category: { sr: '🥉 BRONZANA KOLEKCIJA', en: '🥉 BRONZE COLLECTION' } },
        { id: 'bronze_rose', name: { sr: 'Ružičasta Bronza', en: 'Rose Bronze' }, price: 4500, category: { sr: '🥉 BRONZANA KOLEKCIJA', en: '🥉 BRONZE COLLECTION' } },
        { id: 'bronze_forge', name: { sr: 'Kovana Vatra', en: 'Forged Fire' }, price: 5000, category: { sr: '🥉 BRONZANA KOLEKCIJA', en: '🥉 BRONZE COLLECTION' } },

        // --- 🥈 SREBRNA KOLEKCIJA ---
        { id: 'silver_classic', name: { sr: 'Čisto Srebro', en: 'Pure Silver' }, price: 5500, category: { sr: '🥈 SREBRNA KOLEKCIJA', en: '🥈 SILVER COLLECTION' } },
        { id: 'silver_brushed', name: { sr: 'Brušeno Srebro', en: 'Brushed Silver' }, price: 6000, category: { sr: '🥈 SREBRNA KOLEKCIJA', en: '🥈 SILVER COLLECTION' } },
        { id: 'silver_moonlight', name: { sr: 'Mesečev Sjaj', en: 'Moonlight Silver' }, price: 6500, category: { sr: '🥈 SREBRNA KOLEKCIJA', en: '🥈 SILVER COLLECTION' } },
        { id: 'silver_knight', name: { sr: 'Viteški Oklop', en: 'Knight Armor' }, price: 7000, category: { sr: '🥈 SREBRNA KOLEKCIJA', en: '🥈 SILVER COLLECTION' } },
        { id: 'silver_titanium', name: { sr: 'Crni Titanijum', en: 'Dark Titanium' }, price: 7500, category: { sr: '🥈 SREBRNA KOLEKCIJA', en: '🥈 SILVER COLLECTION' } },
        { id: 'silver_chrome', name: { sr: 'Hrom Ogledalo', en: 'Chrome Mirror' }, price: 8000, category: { sr: '🥈 SREBRNA KOLEKCIJA', en: '🥈 SILVER COLLECTION' } },
        
        // --- 🥇 ZLATNA KOLEKCIJA ---
        { id: 'gold_classic', name: { sr: 'Čisto Zlato', en: 'Pure Gold' }, price: 10000, category: { sr: '🥇 ZLATNA KOLEKCIJA', en: '🥇 GOLD COLLECTION' } },
        { id: 'gold_rose', name: { sr: 'Roze Zlato', en: 'Rose Gold' }, price: 12000, category: { sr: '🥇 ZLATNA KOLEKCIJA', en: '🥇 GOLD COLLECTION' } },
        { id: 'gold_ancient', name: { sr: 'Zlato Inka', en: 'Inca Gold' }, price: 14000, category: { sr: '🥇 ZLATNA KOLEKCIJA', en: '🥇 GOLD COLLECTION' } },
        { id: 'gold_midas', name: { sr: 'Midasov Dodir', en: 'Midas Touch' }, price: 16000, category: { sr: '🥇 ZLATNA KOLEKCIJA', en: '🥇 GOLD COLLECTION' } },

        // --- 🪵 MATERIJALI & TEKSTURE ---
        { id: 'wood', name: { sr: 'Hrast', en: 'Oak' }, price: 18000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'marble', name: { sr: 'Carrara Mermer', en: 'Carrara Marble' }, price: 20000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'pearl', name: { sr: 'Biser', en: 'Pearl' }, price: 22000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'carbon', name: { sr: 'Karbon', en: 'Carbon' }, price: 25000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'obsidian', name: { sr: 'Opsidijan', en: 'Obsidian' }, price: 28000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        { id: 'leather', name: { sr: 'Luksuzna Koža', en: 'Luxury Leather' }, price: 30000, category: { sr: '🪵 MATERIJALI & TEKSTURE', en: '🪵 MATERIALS & TEXTURES' } },
        
        // --- FUTURIZAM I SPECIJALNI ---
        { id: 'neon_blue', name: { sr: 'Cyber Blue', en: 'Cyber Blue' }, price: 35000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'neon_pink', name: { sr: 'Synthwave', en: 'Synthwave' }, price: 35000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'neon_green', name: { sr: 'Matrix', en: 'Matrix' }, price: 35000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        { id: 'stealth', name: { sr: 'Stealth Mode', en: 'Stealth Mode' }, price: 40000, category: { sr: '👾 NEON & FUTURIZAM', en: '👾 NEON & FUTURISM' } },
        
        { id: 'glass_clear', name: { sr: 'Čisti Kristal', en: 'Pure Crystal' }, price: 45000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_ruby', name: { sr: 'Krvavi Rubin', en: 'Blood Ruby' }, price: 50000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_emerald', name: { sr: 'Smaragd', en: 'Emerald' }, price: 50000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'glass_sapphire', name: { sr: 'Safir', en: 'Sapphire' }, price: 50000, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'desert_glass', name: { sr: 'Pustinjsko Staklo', en: 'Desert Glass' }, price: 0, desc: { sr: 'Besplatan skin koji se dobija pri prvom izboru teme Pustinjsko staklo.', en: 'A free skin granted when Desert Glass is selected for the first time.' }, category: { sr: '💎 STAKLO & DRAGULJI', en: '💎 GLASS & GEMS' } },
        { id: 'easter_neumorphic', name: { sr: 'Vaskršnja Pastela', en: 'Easter Pastel' }, price: 0, desc: { sr: 'Besplatan skin koji se dobija pri prvom izboru Vaskršnje teme.', en: 'A free skin granted when the Easter theme is selected for the first time.' }, category: { sr: '🐣 VASKRŠNJI PACK', en: '🐣 EASTER PACK' } },
        
        { id: 'magma', name: { sr: 'Magma Core', en: 'Magma Core' }, price: 75000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'galaxy', name: { sr: 'Galaksija', en: 'Galaxy' }, price: 85000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'retro', name: { sr: 'Retro 8-Bit', en: 'Retro 8-Bit' }, price: 100000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'hologram', name: { sr: 'Hologram', en: 'Hologram' }, price: 150000, category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } }
    ],
    
    EFFECTS: [
        { id: 'confetti', name: { sr: 'Konfete', en: 'Confetti' }, price: 0, desc: { sr: 'Klasična proslava Yamba.', en: 'Classic Yamb celebration.' }, duration: '5s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-confetti', innerHtml: '' },
        { id: 'gold_rain', name: { sr: 'Zlatna Kiša', en: 'Gold Rain' }, price: 10000, desc: { sr: 'Kaskada dukata, svetlucavih iskri i zlatnih reflektora.', en: 'A cascade of coins, shimmering sparks, and golden spotlights.' }, duration: '6s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-gold_rain', innerHtml: '' },
        { id: 'fireflies', name: { sr: 'Magični Svici', en: 'Magic Fireflies' }, price: 5000, desc: { sr: 'Nežne svetleće kuglice.', en: 'Gentle glowing lights.' }, duration: '5s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-fireflies', innerHtml: '' },
        { id: 'bubbles', name: { sr: 'Magični Mehurići', en: 'Magic Bubbles' }, price: 8000, desc: { sr: 'Svetlucavi mehurići koji lete i pucaju.', en: 'Shimmering bubbles floating and popping.' }, duration: '5s', category: { sr: '🎉 STANDARDNE PROSLAVE', en: '🎉 STANDARD CELEBRATIONS' }, cssClass: 'prev-bubbles', innerHtml: '' },
        { id: 'ice_age', name: { sr: 'Ledeno Doba', en: 'Ice Age' }, price: 12000, desc: { sr: 'Ledeni talas, pukotine, kristali i magla progutaju tablu kada dobijete Yamb.', en: 'An ice wave, cracks, crystals, and mist swallow the board when you get Yamb.' }, duration: '8s', category: { sr: '💎 ATMOSFERA & STIL', en: '💎 ATMOSPHERE & STYLE' }, cssClass: 'prev-glass', innerHtml: '' },
        { id: 'black_hole', name: { sr: 'Crna Rupa', en: 'Black Hole' }, price: 15000, desc: { sr: 'Premium singularnost savija prostor, uvlači tablu i rasipa zlatno-cyan čestice.', en: 'A premium singularity bends space, pulls in the board, and scatters gold-cyan particles.' }, duration: '6.4s', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' }, cssClass: 'prev-black-hole', innerHtml: '<div class="bh-ring-prev"></div>' },
        { id: 'supernova', name: { sr: 'Supernova', en: 'Supernova' }, price: 18000, desc: { sr: 'Belo-zlatno jezgro eksplodira u cyan shockwave, violet maglinu i zvezdane iskre.', en: 'A white-gold core detonates into a cyan shockwave, violet nebula, and stellar sparks.' }, duration: '7.6s', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' }, cssClass: 'prev-supernova', innerHtml: '<div class="sn-ring-prev"></div>' },
        { id: 'neon_pulse', name: { sr: 'Neon Puls', en: 'Neon Pulse' }, price: 15000, desc: { sr: 'Svetleće cyberpunk linije preko cele table pri osvajanju Yamba.', en: 'Glowing cyberpunk lines across the board on Yamb.' }, duration: '5s', category: { sr: '💎 ATMOSFERA & STIL', en: '💎 ATMOSPHERE & STYLE' }, cssClass: 'prev-neon', innerHtml: '<div class="neon-line"></div>' },
        { id: 'thunder', name: { sr: 'Gromovnik', en: 'Thunderbringer' }, price: 20000, desc: { sr: 'Masivni udar groma uz produženi potres ekrana.', en: 'Massive thunder strike with extended screen shake.' }, duration: '4.5s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, req: 'sveti_ilija', reqName: { sr: 'Sveti Ilija', en: 'Saint Elijah' }, cssClass: 'prev-thunder', innerHtml: '' },
        { id: 'balkan', name: { sr: 'Svadba', en: 'Wedding' }, price: 25000, desc: { sr: 'Tekstilni kafanski stolnjak, 4 trube, svadbena kiša i brzo kolo u 2/4 taktu.', en: 'A woven kafana tablecloth, 4 trumpets, wedding rain, and a fast folk dance in 2/4.' }, duration: '8.6s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-balkan', innerHtml: '' },
        { id: 'fireworks', name: { sr: 'Grandiozni Vatromet', en: 'Grand Fireworks' }, price: 30000, desc: { sr: 'Eksplozija boja za pobednike (V.2 sa zvukom i blicem).', en: 'Explosion of colors for winners (V.2).' }, duration: '7s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-fireworks', innerHtml: '' },
        { id: 'drones', name: { sr: 'Svetleći Dronovi', en: 'Drone Show' }, price: 25000, desc: { sr: 'Aurora nebo, laserski reflektori i roj dronova ispisuju TVOJE IME kao premium 3D hologram.', en: 'Aurora sky, laser spotlights and a drone swarm spell YOUR NAME as a premium 3D hologram.' }, duration: '8s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-drones', innerHtml: '' },
        
        // --- NOVI PREMIUM EFEKTI ---
        { id: 'cosmic_dust', name: { sr: 'Svemirska Prašina', en: 'Cosmic Dust' }, price: 40000, desc: { sr: 'Magična zvezdana prašina i maglina polako obavijaju tablu.', en: 'Magical stardust and nebula slowly envelop the board.' }, duration: '6s', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' }, cssClass: 'prev-cosmic-dust', innerHtml: '<div class="stardust-layer layer-1"></div><div class="stardust-layer layer-2"></div><div class="stardust-layer layer-3"></div>' },
        { id: 'ufo_abduction', name: { sr: 'UFO Abdukcija', en: 'UFO Abduction' }, price: 35000, desc: { sr: 'Leteći tanjir i luckasti vanzemaljci zracima usisavaju upisane brojeve sa table.', en: 'A flying saucer and goofy aliens beam up the written scores from the board.' }, duration: '7.5s', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' }, cssClass: 'prev-ufo-abduction', innerHtml: '<div class="ufo-prev-ship"><div class="ufo-prev-alien"></div></div><div class="ufo-prev-beam"></div>' },
        { id: 'dragon_fire', name: { sr: 'Zmajeva Vatra', en: 'Dragon Fire' }, price: 45000, desc: { sr: 'Masivni vatreni plamenovi i usijani žar gutaju ekran odozdo.', en: 'Massive fire flames and glowing embers engulf the screen from below.' }, duration: '5.5s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-dragon-fire', innerHtml: '<div class="dragon-flames"></div><div class="dragon-embers"></div>' },
        { id: 'royal_yamb', name: { sr: 'Kraljevski Yamb', en: 'Royal Yamb' }, price: 60000, desc: { sr: 'Kraljevski grb, scenski reflektori, pun Yamb of the Balkan natpis i pljusak dukata.', en: 'A royal crest, stage spotlights, the full Yamb of the Balkan title, and a coin shower.' }, duration: '8s', category: { sr: '⚡ SPEKTAKL & ZABAVA', en: '⚡ SPECTACLE & FUN' }, cssClass: 'prev-royal-yamb', innerHtml: '<img class="royal-yamb-logo-preview" src="Logo_green.png" alt=""><div class="royal-yamb-title">YAMB OF THE BALKAN</div>' }
    ],

    THEMES: [
        { id: 'dark', name: { sr: 'Zelena', en: 'Green' }, price: 0, desc: { sr: 'Klasična Yamb tema.', en: 'Classic Yamb theme.' }, icon: '🎲', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'light', name: { sr: 'Svetlo Zlato', en: 'Light Gold' }, price: 0, desc: { sr: 'Svetla tema sa zlatnim detaljima.', en: 'Light theme with gold details.' }, icon: '🎨', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'medium', name: { sr: 'Trula Višnja', en: 'Dark Cherry' }, price: 0, desc: { sr: 'Luksuzna bordo tema.', en: 'Luxurious burgundy theme.' }, icon: '🍒', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'winter', name: { sr: 'Plavi Okean', en: 'Blue Ocean' }, price: 0, desc: { sr: 'Opuštajuća plava tema.', en: 'Relaxing blue theme.' }, icon: '🌊', category: { sr: '🎨 BOJE INTERFEJSA', en: '🎨 INTERFACE COLORS' } },
        { id: 'neon', name: { sr: 'Neon Cyber', en: 'Neon Cyber' }, price: 15000, desc: { sr: 'Futuristička cyberpunk tema.', en: 'Futuristic cyberpunk theme.' }, icon: '⚡', category: { sr: '💎 PREMIUM TEME', en: '💎 PREMIUM THEMES' } },
        { id: 'amethyst', name: { sr: 'Kraljevski Ametist', en: 'Royal Amethyst' }, price: 20000, desc: { sr: 'Luksuzna VIP ljubičasta tema.', en: 'Luxurious VIP purple theme.' }, icon: '🔮', category: { sr: '💎 PREMIUM TEME', en: '💎 PREMIUM THEMES' } },
        { id: 'easter', name: { sr: 'Vaskršnja', en: 'Joyful Easter' }, price: 10000, desc: { sr: 'Kompletna Vaskr neumorphic tema: prolećna pozadina, badges & pills ikonice, tabla, UI i mekani audio efekti.', en: 'Complete Easter neumorphic theme: spring background, badges & pills icons, board, UI, and soft audio cues.' }, icon: '🐇', category: { sr: '💎 PREMIUM TEME', en: '💎 PREMIUM THEMES' } },
        { id: 'desert', name: { sr: 'Pustinjsko Staklo', en: 'Desert Glass' }, price: 0, adUnlock: 3, desc: { sr: 'Kompletan Pustinjsko staklo Pack: reljefna pustinja, stakleni badges & pills, tabla, UI, motion i topli audio efekti.', en: 'Complete Desert Glass Theme Pack: sculpted desert, glass badges & pills, board, UI, motion and warm audio cues.' }, icon: '🏜️', category: { sr: '💎 PREMIUM TEME', en: '💎 PREMIUM THEMES' } },
        // --- DODATO: Mesečev Sjaj ---
        { id: 'moon', name: { sr: 'Mesečev Sjaj', en: 'Moonlight' }, price: 25000, desc: { sr: 'Profesionalna lunarna tema sa realističnim kraterima, zvezdanim nebom i srebrnim UI sjajem.', en: 'Professional lunar theme with realistic craters, starfield depth, and silver UI glow.' }, icon: '🌕', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } },
        { id: 'severna', name: { sr: 'Severna Maglina', en: 'Northern Nebula' }, price: 45000, desc: { sr: 'Premium neuphorism tema sa ledenom maglinom, soft clay reljefom, frost glass pozadinom i hladnim cyan-violet ikonama.', en: 'Premium neuphorism theme with icy nebula, soft clay relief, frosted glass background and cool cyan-violet icons.' }, icon: '🌌', category: { sr: '🌌 KOSMOS & MISTIKA', en: '🌌 COSMOS & MYSTIC' } }
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

// Export (ako je potrebno za module, mada u browseru radi globalno)
if (typeof window !== 'undefined') { Object.freeze(CONFIG); }
if (typeof module !== 'undefined' && module.exports) { module.exports = CONFIG; }
