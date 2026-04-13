/* =========================================================
   CONFIG & STATE MANAGMENT
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
    // Valute
    STARTING_COINS: 0,
    STARTING_GEMS: 0,
    
    // Nagrade
    REWARD_DAILY_LOGIN: 50,    
    REWARD_WIN_SOLO: 100,      
    REWARD_WIN_MULTIPLAYER: 150, 
    REWARD_HIGH_SCORE: 50,     
    
    // Reklame (Ad Rewards)
    AD_REWARD_COINS: 25,       
    AD_REWARD_GEMS: 5,         
    AD_COOLDOWN_MS: 300000,    // 5 minuta između reklama (u milisekundama)

    // ---------------------------------------------------------
    // KONFIGURACIJA PREDMETA (ITEMS) I SKINOVA (SKINS)
    // ---------------------------------------------------------
    // Skinovi kockica (Dice Skins)
    DICE_SKINS: [
        // --- Osnovni i Standardni Skinovi (Kupovina novčićima) ---
        { id: 'default',        price: 0,    premium: false, name: { sr: 'Osnovni', en: 'Default' }, type: 'dice' },
        { id: 'classic_red',    price: 100,  premium: false, name: { sr: 'Klasična Crvena', en: 'Classic Red' }, type: 'dice' },
        { id: 'classic_blue',   price: 100,  premium: false, name: { sr: 'Klasična Plava', en: 'Classic Blue' }, type: 'dice' },
        { id: 'classic_black',  price: 150,  premium: false, name: { sr: 'Klasična Crna', en: 'Classic Black' }, type: 'dice' },
        { id: 'retro',          price: 400,  premium: false, name: { sr: 'Retro 8-bit', en: 'Retro 8-bit' }, type: 'dice' },
        { id: 'wood',           price: 300,  premium: false, name: { sr: 'Drvena Tabla', en: 'Wooden Board' }, type: 'dice' },
        { id: 'marble',         price: 500,  premium: false, name: { sr: 'Beli Mermer', en: 'White Marble' }, type: 'dice' },
        { id: 'stealth',        price: 800,  premium: false, name: { sr: 'Nevidljivi Mat', en: 'Stealth Matte' }, type: 'dice' },
        { id: 'carbon',         price: 750,  premium: false, name: { sr: 'Karbon', en: 'Carbon Fiber' }, type: 'dice' },
        { id: 'glass_clear',    price: 600,  premium: false, name: { sr: 'Čisto Staklo', en: 'Clear Glass' }, type: 'dice' },

        // --- Premium Skinovi (Kupovina draguljima / skuplji dukati) ---
        { id: 'gold',           price: 1000, premium: true,  name: { sr: 'Čisto Zlato', en: 'Solid Gold' }, type: 'dice' },
        { id: 'glass_ruby',     price: 900,  premium: true,  name: { sr: 'Rubinsko Staklo', en: 'Ruby Glass' }, type: 'dice' },
        { id: 'glass_emerald',  price: 900,  premium: true,  name: { sr: 'Smaragdno Staklo', en: 'Emerald Glass' }, type: 'dice' },
        { id: 'glass_sapphire', price: 900,  premium: true,  name: { sr: 'Safirno Staklo', en: 'Sapphire Glass' }, type: 'dice' },
        { id: 'neon_blue',      price: 1200, premium: true,  name: { sr: 'Neon Sajber Plava', en: 'Neon Cyber Blue' }, type: 'dice' },
        { id: 'neon_pink',      price: 1200, premium: true,  name: { sr: 'Neon Sint Pink', en: 'Neon Synth Pink' }, type: 'dice' },
        { id: 'neon_green',     price: 1200, premium: true,  name: { sr: 'Neon Matriks', en: 'Neon Matrix' }, type: 'dice' },
        { id: 'magma',          price: 1500, premium: true,  name: { sr: 'Vulkanska Magma', en: 'Volcanic Magma' }, type: 'dice' },
        { id: 'galaxy',         price: 2000, premium: true,  name: { sr: 'Duboki Svemir', en: 'Deep Space Galaxy' }, type: 'dice' },
        { id: 'hologram',       price: 2500, premium: true,  name: { sr: 'Hologramska Projekcija', en: 'Holographic Projection' }, type: 'dice' },
        
        // --- NOVI PREMIUM SKINOVI (Otključavanje gledanjem reklama) ---
        { id: 'cyberpunk',      adsRequired: 5, premium: true, isReward: true, name: { sr: 'Sajberpank', en: 'Cyberpunk' }, type: 'dice' },
        { id: 'dragon_scale',   adsRequired: 5, premium: true, isReward: true, name: { sr: 'Zmajeva Krljušt', en: 'Dragon Scale' }, type: 'dice' },
        { id: 'amethyst',       adsRequired: 5, premium: true, isReward: true, name: { sr: 'Ametist', en: 'Amethyst' }, type: 'dice' },
        { id: 'toxic',          adsRequired: 5, premium: true, isReward: true, name: { sr: 'Toksično', en: 'Toxic' }, type: 'dice' },
        { id: 'obsidian',       adsRequired: 5, premium: true, isReward: true, name: { sr: 'Opsidijan', en: 'Obsidian' }, type: 'dice' },
        { id: 'pearl',          adsRequired: 5, premium: true, isReward: true, name: { sr: 'Biser', en: 'Pearl' }, type: 'dice' }
    ],

    // Skinovi Teme (Theme Skins)
    THEME_SKINS: [
        { id: 'spring',         price: 0,    premium: false, name: { sr: 'Prolećna Oaza', en: 'Spring Oasis' }, type: 'theme' },
        { id: 'light',          price: 0,    premium: false, name: { sr: 'Klasična Svetla', en: 'Classic Light' }, type: 'theme' },
        { id: 'medium',         price: 200,  premium: false, name: { sr: 'Trešnja Velvet', en: 'Cherry Velvet' }, type: 'theme' },
        { id: 'winter',         price: 300,  premium: false, name: { sr: 'Okeanska Zimska', en: 'Ocean Winter' }, type: 'theme' },
        { id: 'desert',         price: 400,  premium: false, name: { sr: 'Pustinjsko Staklo', en: 'Desert Glass' }, type: 'theme' },
        { id: 'neon',           price: 1500, premium: true,  name: { sr: 'Neon Sajberpank', en: 'Neon Cyberpunk' }, type: 'theme' },
        { id: 'amethyst',       price: 2000, premium: true,  name: { sr: 'Kraljevski Ametist', en: 'Royal Amethyst' }, type: 'theme' },
        { id: 'easter',         price: 1200, premium: true,  name: { sr: 'Uskršnji Pastel', en: 'Premium Pastel Easter' }, type: 'theme' }
    ],
    
    // Potrošni materijal (Power-ups)
    POWERUPS: [
        { 
            id: 'extra_roll',     
            price: 50,   
            premium: false, 
            name: { sr: 'Dodatno Bacanje (+1)', en: 'Extra Roll (+1)' }, 
            type: 'powerup', 
            desc: { sr: 'Dodaje jedno bacanje u trenutnom potezu.', en: 'Adds one extra roll to your current turn.' }
        },
        { 
            id: 'undo_move',      
            price: 150,  
            premium: false, 
            name: { sr: 'Poništi Potez', en: 'Undo Last Move' },  
            type: 'powerup', 
            desc: { sr: 'Poništava poslednji upis (ne važi za najave).', en: 'Undo your last filled score (cannot undo announcements).' }
        },
        { 
            id: 'luck_charm',     
            price: 500,  
            premium: true,  
            name: { sr: 'Amajlija', en: 'Lucky Charm' },     
            type: 'powerup', 
            desc: { sr: 'Povećava šansu za veće brojeve na 3 poteza.', en: 'Increases chances of rolling higher numbers for 3 turns.' }
        },
        { 
            id: 'golden_dice',    
            price: 1000, 
            premium: true,  
            name: { sr: 'Zlatni Set Kockica', en: 'Golden Dice Set' }, 
            type: 'powerup', 
            desc: { sr: 'Garantuje bar dve iste kockice u narednom bacanju.', en: 'Guarantees at least two matching dice on the next roll.' }
        }
    ],

    // ---------------------------------------------------------
    // DEFINICIJE KOLONA I REDOVA (Logika Igre)
    // ---------------------------------------------------------
    COLUMNS: ['nadole', 'slobodna', 'nagore', 'najava', 'rucno', 'sredina'],
    
    ROWS: {
        BROJEVI: ['1', '2', '3', '4', '5', '6'],
        MAXMIN: ['max', 'min'],
        FIGURE: ['kenta', 'triling', 'ful', 'kare', 'yamb']
    },

    // ---------------------------------------------------------
    // SISTEM BODOVANJA (Scoring System)
    // ---------------------------------------------------------
    SCORING: {
        BONUS_BROJEVI: { THRESHOLD: 60, POINTS: 30 }, 
        BONUS_KENTA: { 
            OSNOVNA: 50,  
            MAX_ROLL: 66, 
            MID_ROLL: 56, 
            MIN_ROLL: 46  
        },
        BONUS_TRILING: 20, 
        BONUS_FUL: 30,     
        BONUS_KARE: 40,    
        BONUS_YAMB: 50     
    },

    // ---------------------------------------------------------
    // INICIJALNO STANJE KORISNIKA (Default User State)
    // ---------------------------------------------------------
    INITIAL_USER_STATE: {
        coins: 0,
        gems: 0,
        stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            highScore: 0,
            totalScore: 0,
            yambsRolled: 0,
            playTimeMinutes: 0
        },
        inventory: {
            diceSkin: 'default',
            themeSkin: 'spring',
            unlockedDice: ['default'],
            unlockedThemes: ['spring', 'light'],
            powerups: {
                extra_roll: 0,
                undo_move: 0,
                luck_charm: 0,
                golden_dice: 0
            }
        },
        // PRATI ODGLEDANE REKLAME ZA SKINOVE
        adProgress: {
             'cyberpunk': 0,
             'dragon_scale': 0,
             'amethyst': 0,
             'toxic': 0,
             'obsidian': 0,
             'pearl': 0
        },
        lastLogin: null,
        loginStreak: 0,
        dailyChallengeComplete: false
    }
};

// Sprečavanje modifikacije osnovnog konfiguracionog objekta
Object.freeze(CONFIG);