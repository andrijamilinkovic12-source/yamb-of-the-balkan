// server.js - FIX: KOMPLETAN CLOUD SAVE SISTEM + ORPHAN SOCKET SYNC FIX + GRACE PERIOD STABILITY + STATE DESYNC FIX

require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

let firebaseAuth = null;

function parseFirebaseServiceAccount() {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_ADMIN_CREDENTIALS || '';

    if (!raw && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    }

    if (!raw && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
}

try {
    const admin = require('firebase-admin');
    const serviceAccount = parseFirebaseServiceAccount();
    const hasDefaultCredentials = Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.FIREBASE_CONFIG ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT
    );
    const appOptions = serviceAccount
        ? { credential: admin.credential.cert(serviceAccount) }
        : undefined;

    if (serviceAccount || hasDefaultCredentials) {
        if (!admin.apps.length) {
            admin.initializeApp(appOptions);
        }

        firebaseAuth = admin.auth();
        console.log('✅ Firebase Admin Auth spreman.');
    } else {
        console.warn('⚠️ Firebase Admin Auth nije aktivan: nedostaju service account credentials.');
    }
} catch (err) {
    console.warn('⚠️ Firebase Admin Auth nije aktivan:', err.message);
}

// Inicijalizacija aplikacije
const app = express();
const server = http.createServer(app);

// Socket.io konfiguracija (POBOLJŠANA ZA MOBILNE MREŽE)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    },
    pingInterval: 25000, 
    pingTimeout: 20000   
});

// Middleware
app.use(cors());
app.use(express.json());

// ==================================================================
// 0. FILTER VULGARNOSTI ZA GLOBALNI CHAT I IMENA (PAMETNI FILTER)
// ==================================================================
const zabranjeneReci = [
    "idiot", "budala", "kreten", "glupan", "majmun", "debil", "stoka",
    "kurv", "jeb", "pizd", "kurac", "sranj", "govn", "pick", "pedere", "pederu", "pedercin",
    "gej", "gejc", "lezb", "drolj", "kuck", "drk", "pusikur", "supak", "cmar",
    "verskauvreda1", "nacionalnauvreda1", "rasnauvreda1", "balij", "ustas", "chetnik", "siptar", "cigan", "skart",
    "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "slut", "whore", 
    "faggot", "nigger", "nigga", "bastard", "retard", "crap", "douche", "motherfucker"
];

const charMap = {
    'a': '[aA@4]', 'b': '[bB8]', 'c': '[cCčČćĆ]', 'd': '[dDđĐ]', 'e': '[eE3]',
    'g': '[gG6]', 'i': '[iI1l!L]', 'j': '[jJyY]', 'l': '[lL1iI]', 'o': '[oO0]', 
    's': '[sSšŠ5\\$]', 't': '[tT7]', 'u': '[uUvV]', 'z': '[zZžŽ]'
};

function napraviPametniRegex(rec) {
    let regexStr = '';
    for (let i = 0; i < rec.length; i++) {
        let slovo = rec[i].toLowerCase();
        let pattern = charMap[slovo] || `[${slovo.toLowerCase()}${slovo.toUpperCase()}]`;
        regexStr += pattern + '+';
        if (i < rec.length - 1) {
            regexStr += '[\\W_]*';
        }
    }
    return new RegExp(regexStr, 'gi');
}

const zabranjeniRegexi = zabranjeneReci.map(rec => napraviPametniRegex(rec));

function cenzurisiPoruku(poruka) {
    let filtriranaPoruka = poruka;
    zabranjeniRegexi.forEach(regex => {
        filtriranaPoruka = filtriranaPoruka.replace(regex, '***');
    });
    return filtriranaPoruka;
}

function sadrziPsovku(tekst) {
    return zabranjeniRegexi.some(regex => {
        const match = tekst.match(regex);
        return match !== null;
    });
}

// ==================================================================
// 1. RUTA ZA ANDROID APP LINKS (ASSETLINKS.JSON)
// ==================================================================
app.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'www', '.well-known', 'assetlinks.json'));
});

// ==================================================================
// 2. SERVIRANJE STATIČKIH FAJLOVA (IGRA)
// ==================================================================
app.use(express.static(path.join(__dirname, 'www')));

// ==================================================================
// --- GLOBALNE PROMENLJIVE ZA TURNIR I FUNKCIJE ZA BAZU ---
// ==================================================================
let tournamentState = {
    status: 'registration',
    players: [], 
    bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] }
};

// Funkcija za učitavanje turnira iz baze na startu
async function initTournamentFromDb() {
    if (!process.env.MONGO_URI) return;
    try {
        const TournamentStateDb = mongoose.model('TournamentState');
        let dbState = await TournamentStateDb.findOne();
        if (dbState) {
            tournamentState.status = dbState.status;
            tournamentState.players = dbState.players || [];
            tournamentState.bracket = dbState.bracket || { qf: [null, null, null, null], sf: [null, null], f: [null] };
            console.log("🏆 Turnir uspešno učitan iz MongoDB baze.");
        } else {
            let newState = new TournamentStateDb(tournamentState);
            await newState.save();
            console.log("🏆 Kreiran novi čist turnir u MongoDB bazi.");
        }
    } catch (err) {
        console.error("Greška pri učitavanju turnira iz baze:", err);
    }
}

// Funkcija za čuvanje turnira u bazu nakon svake promene
async function saveTournamentToDb() {
    if (!process.env.MONGO_URI) return;
    try {
        const TournamentStateDb = mongoose.model('TournamentState');
        await TournamentStateDb.findOneAndUpdate({}, tournamentState, { upsert: true });
    } catch (err) {
        console.error("Greška pri čuvanju turnira u bazu:", err);
    }
}


// ==================================================================
// --- MONGODB KONEKCIJA (POBOLJŠANA) ---
// ==================================================================
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, 
        socketTimeoutMS: 45000,        
    })
    .then(() => {
        console.log('✅ MongoDB connected & stable!');
        initTournamentFromDb(); 
        initChatFromDb();       
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB diskonektovan! Pokušavam ponovno povezivanje...');
    });
} else {
    console.log('⚠️ UPOZORENJE: MONGO_URI nije podešen. Baza neće raditi.');
}

// --- MODELI PODATAKA ---
const ScoreSchema = new mongoose.Schema({
    playerId: String, 
    playerName: String,
    score: Number,
    mode: String, 
    photoUrl: { type: String, default: '' }, 
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', ScoreSchema);

const LeagueScoreSchema = new mongoose.Schema({
    playerId: String,
    playerName: String,
    photoUrl: { type: String, default: '' },
    score: Number,
    year: Number,
    quarter: Number,
    date: { type: Date, default: Date.now }
});
const LeagueScore = mongoose.model('LeagueScore', LeagueScoreSchema);

const TourneyStatsSchema = new mongoose.Schema({
    playerId: String,
    playerName: String,
    wins: { type: Number, default: 0 },
    lastWinDate: { type: Date, default: Date.now }
});
const TourneyStats = mongoose.model('TourneyStats', TourneyStatsSchema);

const TournamentStateSchema = new mongoose.Schema({
    status: { type: String, default: 'registration' },
    players: { type: Array, default: [] },
    bracket: { type: Object, default: { qf: [null, null, null, null], sf: [null, null], f: [null] } }
});
mongoose.model('TournamentState', TournamentStateSchema);

const GlobalChatMessageSchema = new mongoose.Schema({
    id: { type: String, required: true },
    sender: { type: String, default: 'Nepoznat' },
    senderId: { type: String, default: '' },
    senderUid: { type: String, default: '' },
    msg: { type: String, default: '' },
    createdAt: { type: Number, default: Date.now }
}, { _id: false });

const GlobalChatSchema = new mongoose.Schema({
    messages: { type: [GlobalChatMessageSchema], default: [] }
});
mongoose.model('GlobalChat', GlobalChatSchema);

const GlobalChatReportSchema = new mongoose.Schema({
    messageId: { type: String, required: true },
    reportedByUid: { type: String, required: true },
    reportedByName: { type: String, default: 'Nepoznat' },
    senderUid: { type: String, default: '' },
    senderName: { type: String, default: 'Nepoznat' },
    msg: { type: String, default: '' },
    messageCreatedAt: { type: Number, default: 0 },
    reportedAt: { type: Number, default: Date.now }
});
mongoose.model('GlobalChatReport', GlobalChatReportSchema);

const GlobalChatModerationLogSchema = new mongoose.Schema({
    action: { type: String, default: 'auto_profanity_ban' },
    uid: { type: String, default: '' },
    playerName: { type: String, default: 'Nepoznat' },
    socketId: { type: String, default: '' },
    ip: { type: String, default: '' },
    originalMsg: { type: String, default: '' },
    filteredMsg: { type: String, default: '' },
    previousStrikes: { type: Number, default: 0 },
    nextStrikes: { type: Number, default: 0 },
    banUntil: { type: Number, default: 0 },
    banDurationMs: { type: Number, default: 0 },
    createdAt: { type: Number, default: Date.now }
});
mongoose.model('GlobalChatModerationLog', GlobalChatModerationLogSchema);

const UserProfileSchema = new mongoose.Schema({
    firebaseUid: { type: String, unique: true, required: true },
    playerName: String,
    photoUrl: { type: String, default: '' },
    friends: { type: [String], default: [] },
    friendRequests: { type: [String], default: [] }, 
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    games: { type: Number, default: 0 },
    highscore: { type: Number, default: 0 },
    totalScoreSum: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    undoTokens: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    maxWinStreak: { type: Number, default: 0 },
    tournamentWins: { type: Number, default: 0 }, 
    unlockedTrophies: { type: [String], default: [] },
    unlockedSkins: { type: [String], default: [] },
    unlockedEffects: { type: [String], default: [] },
    yamb_unlocked: { type: [String], default: [] }, 
    claimedLeagueRewards: { type: [String], default: [] },
    activeSkin: { type: String, default: 'default' },
    activeEffect: { type: String, default: 'confetti' },
    activeTheme: { type: String, default: 'dark' },
    lastDaily: { type: String, default: "" },
    lastDailyRewardClaimed: { type: String, default: "" },
    lastShopAdRewardAt: { type: Number, default: 0 },
    soundEnabled: { type: Boolean, default: true },
    vibrationEnabled: { type: Boolean, default: true },  
    penaltyPoints: { type: Number, default: 0 },         
    h2hStats: { type: Object, default: {} },             
    chatBanUntil: { type: Number, default: 0 },
    chatBanStrikes: { type: Number, default: 0 },
    leagueData: {
        year: { type: Number, default: 0 },
        quarter: { type: Number, default: 0 },
        baselineScore: { type: Number, default: 0 },
        quarterlyScore: { type: Number, default: 0 } 
    },
    legacyMigrationApplied: { type: Boolean, default: false },
    legacyMigratedAt: { type: Date, default: null },
    economyMigrationApplied: { type: Boolean, default: false },
    economyMigratedAt: { type: Date, default: null },
    statsMigrationApplied: { type: Boolean, default: false },
    statsMigratedAt: { type: Date, default: null },
    lastLogin: { type: Date, default: Date.now }
});
const UserProfile = mongoose.model('UserProfile', UserProfileSchema);

// --- GLOBALNE PROMENLJIVE ZA IGRU ---
let waitingPlayer = null; 
let privateRooms = {};
let playerRooms = {};
let gameStartTimes = {};
const pendingGameRewards = {};
const pendingGameRewardsByUid = {};
const chatBans = {};
const globalChatRateLimits = {};
const globalChatReportLimits = {};
const onlinePlayers = {};
const registeredSockets = {};

const GLOBAL_CHAT_MIN_INTERVAL_MS = 1200;
const GLOBAL_CHAT_SPAM_STRIKE_LIMIT = 4;
const GLOBAL_CHAT_SPAM_MUTE_MS = 15000;
const GLOBAL_CHAT_PROFANITY_BAN_BASE_MS = 60 * 60 * 1000;
const GLOBAL_CHAT_RATE_LIMIT_TTL_MS = 60 * 60 * 1000;
const GLOBAL_CHAT_REPORT_COOLDOWN_MS = 30000;

const MAX_SCORE = 3500;
const MAX_NAME_LENGTH = 24;
const MIN_GAME_DURATION = 120000;
const MAX_GAME_DURATION = 6 * 60 * 60 * 1000;
const MAX_LEAGUE_SCORE = 1000000;
const MAX_LEAGUE_SCORE_DELTA = MAX_SCORE + 500;
const MIN_LEAGUE_SESSION_DURATION = 30000;
const MAX_BALANCE = 5000000;
const MAX_UNDO_TOKENS = 250;
const MAX_DAILY_REWARD = 2000;
const MAX_AD_REWARD_PER_SYNC = 1500;
const MAX_REWARD_PER_GAME = 8000;
const MAX_TOURNEY_REWARD = 50000;
const TOP_SCORE_SUBMIT_GRACE_MS = 15000;
const GAME_REWARD_CLAIM_WINDOW_MS = 5 * 60 * 1000;
const TOURNEY_ENTRY_FEE = 2500;
const TOURNEY_WINNER_REWARD = 20000;
const TOURNEY_RUNNER_UP_REWARD = 2500;
const SHOP_AD_REWARD_AMOUNT = 500;
const SHOP_AD_REWARD_COOLDOWN_MS = 15000;
const MAX_IMPORTED_UNDO_TOKENS_BASE = 20;
const MAX_PROFILE_GAMES = 250000;
const MAX_PROFILE_GAME_DELTA_PER_SYNC = 50;
const MAX_PROFILE_LEGACY_GAME_IMPORT = 5000;
const MAX_PROFILE_COMPETITIVE_BUFFER = 250;
const MAX_PROFILE_TOURNEY_DELTA_PER_SYNC = 3;
const MAX_PROFILE_LEGACY_TOURNEY_IMPORT = 100;
const MAX_PENALTY_POINTS = 100000;
const LEADERBOARD_TIME_ZONE = 'Europe/Belgrade';

function getTimeZoneParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);

    return Object.fromEntries(parts
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, Number(part.value)]));
}

function getTimeZoneOffsetMs(date, timeZone) {
    const parts = getTimeZoneParts(date, timeZone);
    const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return zonedAsUtc - date.getTime();
}

function zonedLocalMidnightToUtc(year, month, day, timeZone) {
    const localMidnightAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
    let result = new Date(localMidnightAsUtc - getTimeZoneOffsetMs(new Date(localMidnightAsUtc), timeZone));
    result = new Date(localMidnightAsUtc - getTimeZoneOffsetMs(result, timeZone));
    return result;
}

function getLeaderboardPeriodStart(period, now = new Date(), timeZone = LEADERBOARD_TIME_ZONE) {
    const parts = getTimeZoneParts(now, timeZone);

    if (period === 'monthly') {
        return zonedLocalMidnightToUtc(parts.year, parts.month, 1, timeZone);
    }

    if (period === 'weekly') {
        const utcCalendarDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
        const dayOfWeek = utcCalendarDay.getUTCDay() || 7;
        const monday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - dayOfWeek + 1));
        return zonedLocalMidnightToUtc(
            monday.getUTCFullYear(),
            monday.getUTCMonth() + 1,
            monday.getUTCDate(),
            timeZone
        );
    }

    return null;
}

const TROPHY_REWARDS = Object.freeze({
    first_play: 500,
    apprentice: 1000,
    kafana: 500,
    score_1000: 2500,
    grandmaster: 5000,
    legend: 7500,
    mythic: 15000,
    godlike: 30000,
    surgeon: 3000,
    prophet: 1500,
    sniper: 2500,
    math: 1000,
    sveti_ilija: 10000,
    hazard: 3000,
    firecracker: 4000,
    concrete: 2500,
    perfectionist: 3500,
    miner: 2000,
    immortal: 10000,
    potato: 500,
    minimal: 2000,
    achilles: 5000,
    close_call: 1000,
    night_owl: 1000,
    spite: 1000,
    veteran: 3000
});

const ALL_TROPHY_IDS = new Set(Object.keys(TROPHY_REWARDS));
const SPECIAL_TROPHY_IDS = new Set([
    'kafana',
    'surgeon',
    'prophet',
    'sniper',
    'math',
    'sveti_ilija',
    'hazard',
    'firecracker',
    'concrete',
    'perfectionist',
    'miner',
    'immortal',
    'potato',
    'minimal',
    'achilles',
    'close_call',
    'night_owl',
    'spite'
]);

const SHOP_ITEM_PRICES = Object.freeze({
    default: 0,
    classic_red: 1500,
    classic_blue: 1500,
    classic_black: 2000,
    bronze_antique: 2500,
    bronze_patina: 3000,
    bronze_steampunk: 3500,
    bronze_spartan: 4000,
    bronze_rose: 4500,
    bronze_forge: 5000,
    silver_classic: 5500,
    silver_brushed: 6000,
    silver_moonlight: 6500,
    silver_knight: 7000,
    silver_titanium: 7500,
    silver_chrome: 8000,
    gold_classic: 10000,
    gold_rose: 12000,
    gold_ancient: 14000,
    gold_midas: 16000,
    wood: 18000,
    marble: 20000,
    pearl: 22000,
    carbon: 25000,
    obsidian: 28000,
    leather: 30000,
    neon_blue: 35000,
    neon_pink: 35000,
    neon_green: 35000,
    stealth: 40000,
    glass_clear: 45000,
    glass_ruby: 50000,
    glass_emerald: 50000,
    glass_sapphire: 50000,
    magma: 75000,
    galaxy: 85000,
    retro: 100000,
    hologram: 150000,
    confetti: 0,
    gold_rain: 10000,
    fireflies: 5000,
    bubbles: 8000,
    ice_age: 12000,
    black_hole: 15000,
    supernova: 18000,
    neon_pulse: 15000,
    thunder: 20000,
    balkan: 25000,
    fireworks: 30000,
    drones: 25000,
    cosmic_dust: 40000,
    dragon_fire: 45000,
    dark: 0,
    light: 0,
    medium: 0,
    winter: 0,
    neon: 15000,
    amethyst: 20000,
    easter: 10000,
    desert: 0,
    moon: 25000
});

const FREE_UNLOCK_IDS = new Set(Object.entries(SHOP_ITEM_PRICES).filter(([, price]) => price === 0).map(([id]) => id));

// NOVE PROMENLJIVE ZA ČUVANJE CHATA
let globalChatHistory = [];
const MAX_CHAT_HISTORY = 50;

function createGlobalChatMessageId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeGlobalChatMessage(raw, index = 0) {
    if (!raw || typeof raw !== 'object') return null;

    const msg = String(raw.msg ?? '').replace(/\s+/g, ' ').trim().substring(0, 550).trim();
    if (!msg) return null;

    const createdAt = Math.max(0, toSafeInt(raw.createdAt, 0)) || Date.now();

    return {
        id: String(raw.id || `legacy_${createdAt}_${index}_${Math.random().toString(36).slice(2, 8)}`),
        sender: String(raw.sender || 'Nepoznat').substring(0, 20),
        senderId: String(raw.senderId || ''),
        senderUid: String(raw.senderUid || ''),
        msg,
        createdAt
    };
}

// Funkcije za manipulaciju chatom
async function initChatFromDb() {
    if (!process.env.MONGO_URI) return;
    try {
        const GlobalChatDb = mongoose.model('GlobalChat');
        let dbChat = await GlobalChatDb.findOne();
        if (dbChat) {
            const rawMessages = Array.isArray(dbChat.messages) ? dbChat.messages : [];
            globalChatHistory = rawMessages
                .map((message, index) => normalizeGlobalChatMessage(message, index))
                .filter(Boolean)
                .slice(-MAX_CHAT_HISTORY);
            if (globalChatHistory.length !== rawMessages.length || globalChatHistory.some((message, index) => message.id !== rawMessages[index]?.id)) {
                await saveChatToDb();
            }
            console.log("💬 Globalni chat uspešno učitan iz baze.");
        } else {
            let newChat = new GlobalChatDb({ messages: [] });
            await newChat.save();
            console.log("💬 Kreiran novi čist globalni chat u bazi.");
        }
    } catch (err) {
        console.error("Greška pri učitavanju chata iz baze:", err);
    }
}

async function saveChatToDb() {
    if (!process.env.MONGO_URI) return;
    try {
        const GlobalChatDb = mongoose.model('GlobalChat');
        const messages = globalChatHistory
            .map((message, index) => normalizeGlobalChatMessage(message, index))
            .filter(Boolean)
            .slice(-MAX_CHAT_HISTORY);
        globalChatHistory = messages;
        await GlobalChatDb.findOneAndUpdate({}, { messages }, { upsert: true });
    } catch (err) {
        console.error("Greška pri čuvanju chata u bazu:", err);
    }
}

// GRACE PERIOD PROMENLJIVE
const disconnectTimers = {};
const ghostSessions = {};

// ==================================================================
// --- SERVERSKA KAZNA ZA RAGE QUIT / GUBITAK KONEKCIJE (SA H2H) ---
// ==================================================================
function calculateTechnicalCoinAmount(user) {
    const games = Math.max(0, toSafeInt(user?.games, 0));
    const totalScoreSum = Math.max(0, toSafeInt(user?.totalScoreSum, 0));
    const average = games > 0 ? Math.round(totalScoreSum / games) : 500;
    return Math.max(0, Math.min(2000, Number.isFinite(average) ? average : 500));
}

async function getTechnicalCoinAmount(playerId) {
    if (!process.env.MONGO_URI || !playerId) return 500;
    const user = await UserProfile.findOne({ firebaseUid: playerId }).select('games totalScoreSum').lean();
    return calculateTechnicalCoinAmount(user);
}

async function applyServerSidePenalty(playerId, penaltyAmount = 50, h2hKey = null, coinPenalty = 0) {
    if (!process.env.MONGO_URI || !playerId) return null;
    try {
        const UserProfile = mongoose.model('UserProfile');

        let updateInc = { penaltyPoints: penaltyAmount, losses: 1 };
        let updateSet = { currentWinStreak: 0 };

        if (h2hKey) {
            updateInc[`h2hStats.${h2hKey}.losses`] = 1;
            updateSet[`h2hStats.${h2hKey}.currentWinStreak`] = 0;
        }

        const user = await UserProfile.findOneAndUpdate(
            { firebaseUid: playerId },
            {
                $inc: updateInc,
                $set: updateSet
            },
            { new: true }
        );

        if (user && coinPenalty > 0) {
            user.balance = Math.max(0, Math.min(MAX_BALANCE, toSafeInt(user.balance, 0)) - coinPenalty);
            await user.save();
        }

        emitProfileSyncToUid(playerId, user);
        console.log(`⚖️ SERVER KAZNA: Dodato ${penaltyAmount} kaznenih poena i resetovan H2H igraču ${playerId} protiv ključa ${h2hKey || 'nepoznatog'}.`);
        return user;
    } catch (err) {
        console.error("Greška pri upisu server kazne:", err);
        return null;
    }
}

async function applyServerSideTechnicalResult(winnerId, loserId, penaltyAmount = 50, h2hKey = null) {
    const winnerReward = await getTechnicalCoinAmount(winnerId);
    const loserCoinPenalty = await getTechnicalCoinAmount(loserId);

    if (!process.env.MONGO_URI) {
        return { winnerReward, loserCoinPenalty, serverApplied: false };
    }

    if (winnerId) {
        const winner = await UserProfile.findOne({ firebaseUid: winnerId });
        if (winner) {
            winner.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(winner.balance, 0)) + winnerReward);
            winner.wins = Math.max(0, toSafeInt(winner.wins, 0)) + 1;
            winner.currentWinStreak = Math.max(0, toSafeInt(winner.currentWinStreak, 0)) + 1;
            winner.maxWinStreak = Math.max(
                Math.max(0, toSafeInt(winner.maxWinStreak, 0)),
                winner.currentWinStreak
            );
            await winner.save();
            emitProfileSyncToUid(winnerId, winner);
        }
    }

    await applyServerSidePenalty(loserId, penaltyAmount, h2hKey, loserCoinPenalty);
    return { winnerReward, loserCoinPenalty, serverApplied: true };
}

// --- POMOĆNA FUNKCIJA: DINAMIČKA KAZNA NA OSNOVU PROGRESA IGRE ---
function getDynamicPenalty(roomId) {
    const state = roomState[roomId];
    if (!state) return 50;

    const moves = state.moveCount || 0;
    const progress = (moves / 156) * 100;

    return progress < 80 ? 20 : 50;
}

// ==================================================================
// --- POMOĆNA FUNKCIJA ZA PRAZNU MATRICU (SECURITY FIX) ---
// ==================================================================
const KOLONE = ["Nadole", "Slobodna", "Sredina", "Nagore", "Ručno", "Najava"];
const REDOVI_IGRA = ["1", "2", "3", "4", "5", "6", "Max", "Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];

function createEmptyScores() {
    let scores = [];
    for (let i = 0; i < 2; i++) {
        let sheet = {};
        KOLONE.forEach(c => { 
            sheet[c] = {}; 
            REDOVI_IGRA.forEach(r => sheet[c][r] = null); 
        });
        scores.push(sheet);
    }
    return scores;
}

// ==================================================================
// --- SERVER-SIDE TURN TIMER I STATE LOGIC (AUTORITATIVNI TAJMER) ---
// ==================================================================
const TURN_TIME_LIMIT = 90000; 
const GRACE_PERIOD = 3000;     
const TOTAL_TIMEOUT = TURN_TIME_LIMIT + GRACE_PERIOD;

const roomTimers = {};
const roomState = {};

function startTurnTimer(roomId) {
    const state = roomState[roomId];
    if (!state) return;

    stopTurnTimer(roomId); 

    const currentPlayerSocketId = state.players[state.turnIndex];

    state.turnStartTime = Date.now(); 

    roomTimers[roomId] = setTimeout(() => {
        handleTechnicalTimeout(roomId, currentPlayerSocketId);
    }, TOTAL_TIMEOUT);
}

function stopTurnTimer(roomId) {
    if (roomTimers[roomId]) {
        clearTimeout(roomTimers[roomId]);
        delete roomTimers[roomId];
    }
}

async function handleTechnicalTimeout(roomId, inactivePlayerSocketId) {
    const state = roomState[roomId];
    if (!state) return;

    const winnerSocketId = state.players.find(id => id !== inactivePlayerSocketId);

    if (winnerSocketId) {
        const inactiveUid = registeredSockets[inactivePlayerSocketId];
        const winnerUid = registeredSockets[winnerSocketId];
        const penaltyAmount = getDynamicPenalty(roomId);

        const winnerSocket = io.sockets.sockets.get(winnerSocketId);

        let h2hKey = null;
        if (winnerSocket) {
            let safeOppName = winnerSocket.playerName ? winnerSocket.playerName.replace(/\./g, '_').replace(/\$/g, '_') : 'Nepoznat';
            h2hKey = winnerSocket.playerId ? winnerSocket.playerId : safeOppName;
        }

        const technicalResult = await applyServerSideTechnicalResult(winnerUid, inactiveUid, penaltyAmount, h2hKey);

        console.log(`⏱️ TIMEOUT: Isteklo vreme u sobi ${roomId}. Pobednik je ${winnerSocketId} (Tehnička pobeda)`);

        io.to(roomId).emit('game_over_timeout', {
            winnerId: winnerSocketId,
            loserId: inactivePlayerSocketId,
            winnerReward: technicalResult.winnerReward,
            coinPenalty: technicalResult.loserCoinPenalty,
            serverApplied: technicalResult.serverApplied,
            penalty: penaltyAmount,
            message: 'Protivniku je isteklo vreme! Tehnička pobeda.'
        });
    }

    stopTurnTimer(roomId);
    delete roomState[roomId];
}
// ==================================================================

function generateTournamentBracket() {
    tournamentState.status = 'active';
    const shuffled = [...tournamentState.players].sort(() => 0.5 - Math.random());
    const createMatch = (p1, p2) => ({
        p1: p1, p2: p2, winnerId: null, time: null, proposedTime: null, proposedById: null, timeAccepted: false
    });
    tournamentState.bracket.qf = [
        createMatch(shuffled[0], shuffled[1]), createMatch(shuffled[2], shuffled[3]),
        createMatch(shuffled[4], shuffled[5]), createMatch(shuffled[6], shuffled[7])
    ];
    saveTournamentToDb(); 
}

function advanceTournamentBracket(round, index, winnerObj) {
    if (round === 'qf') {
        const sfIndex = Math.floor(index / 2);
        if (!tournamentState.bracket.sf[sfIndex]) {
            tournamentState.bracket.sf[sfIndex] = { p1: null, p2: null, winnerId: null, time: null, proposedTime: null, proposedById: null, timeAccepted: false };
        }
        if (index % 2 === 0) tournamentState.bracket.sf[sfIndex].p1 = winnerObj;
        else tournamentState.bracket.sf[sfIndex].p2 = winnerObj;
    } 
    else if (round === 'sf') {
        if (!tournamentState.bracket.f[0]) {
            tournamentState.bracket.f[0] = { p1: null, p2: null, winnerId: null, time: null, proposedTime: null, proposedById: null, timeAccepted: false };
        }
        if (index % 2 === 0) tournamentState.bracket.f[0].p1 = winnerObj;
        else tournamentState.bracket.f[0].p2 = winnerObj;
    } 
    else if (round === 'f') {
        tournamentState.status = 'finished';
    }
    saveTournamentToDb();
}

// ==================================================================
// TURNIR: SERVER-SIDE VALIDACIJA I AUTORIZACIJA
// ==================================================================
const TOURNEY_ADMIN_UIDS = new Set(
    (process.env.TOURNEY_ADMIN_UIDS || process.env.TOURNEY_ADMIN_UID || '')
        .split(',')
        .map(uid => uid.trim())
        .filter(Boolean)
);

const TOURNEY_ROUNDS = new Set(['qf', 'sf', 'f']);

function getVerifiedUid(socket) {
    return (typeof socket.verifiedUid === 'string' && socket.verifiedUid.length >= 20)
        ? socket.verifiedUid
        : null;
}

function rejectTournamentAction(socket, reason = 'err_invalid_room') {
    socket.emit('error_msg', reason);
    return false;
}

function requireTournamentAuth(socket) {
    const uid = getVerifiedUid(socket);
    if (!uid) {
        socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
        rejectTournamentAction(socket, 'auth_required');
        return null;
    }
    return uid;
}

function isTournamentAdmin(socket) {
    const uid = getVerifiedUid(socket);
    return Boolean(uid && TOURNEY_ADMIN_UIDS.has(uid));
}

function sanitizeTournamentName(name) {
    let safeName = String(name || '').trim().substring(0, MAX_NAME_LENGTH);
    if (!safeName || sadrziPsovku(safeName)) {
        safeName = "Igrač_" + Math.floor(1000 + Math.random() * 9000);
    }
    return safeName;
}

function sanitizeTournamentPhotoUrl(value) {
    const raw = String(value || '').trim().substring(0, 500);
    if (!raw) return '';

    try {
        const parsed = new URL(raw);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (err) {
        return '';
    }
}

function sanitizeTournamentPi(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return String(Math.max(0, Math.min(999999, Math.round(num))));
}

function getTournamentMatch(round, index) {
    if (!TOURNEY_ROUNDS.has(round)) return null;

    const matchIndex = Number(index);
    if (!Number.isInteger(matchIndex) || matchIndex < 0) return null;

    const matches = tournamentState.bracket && tournamentState.bracket[round];
    if (!Array.isArray(matches) || matchIndex >= matches.length) return null;

    const match = matches[matchIndex];
    if (!match || !match.p1 || !match.p2) return null;

    return { match, index: matchIndex };
}

function isTournamentParticipant(match, uid) {
    return Boolean(match && uid && (
        (match.p1 && match.p1.id === uid) ||
        (match.p2 && match.p2.id === uid)
    ));
}

function getTournamentPlayer(match, uid) {
    if (!match || !uid) return null;
    if (match.p1 && match.p1.id === uid) return match.p1;
    if (match.p2 && match.p2.id === uid) return match.p2;
    return null;
}

function getTournamentOpponent(match, uid) {
    if (!match || !uid) return null;
    if (match.p1 && match.p1.id === uid) return match.p2;
    if (match.p2 && match.p2.id === uid) return match.p1;
    return null;
}

function normalizeTournamentTime(value) {
    const raw = String(value || '').trim().substring(0, 40);
    const parsedTime = Date.parse(raw);
    if (!raw || !Number.isFinite(parsedTime)) return null;

    const now = Date.now();
    const maxFuture = now + (90 * 24 * 60 * 60 * 1000);
    if (parsedTime < now - (60 * 60 * 1000) || parsedTime > maxFuture) return null;

    return raw;
}

function buildProfileSyncPayload(user) {
    return {
        wins: Math.max(0, toSafeInt(user.wins)),
        losses: Math.max(0, toSafeInt(user.losses)),
        games: Math.max(0, toSafeInt(user.games)),
        highscore: Math.max(0, toSafeInt(user.highscore)),
        totalScoreSum: Math.max(0, toSafeInt(user.totalScoreSum)),
        balance: Math.max(0, Math.min(MAX_BALANCE, toSafeInt(user.balance))),
        undoTokens: Math.max(0, Math.min(MAX_UNDO_TOKENS, toSafeInt(user.undoTokens))),
        currentWinStreak: Math.max(0, toSafeInt(user.currentWinStreak)),
        maxWinStreak: Math.max(0, toSafeInt(user.maxWinStreak)),
        tournamentWins: Math.max(0, toSafeInt(user.tournamentWins)),
        activeSkin: user.activeSkin,
        activeTheme: user.activeTheme,
        activeEffect: user.activeEffect,
        unlockedTrophies: Array.isArray(user.unlockedTrophies) ? user.unlockedTrophies : [],
        unlockedSkins: Array.isArray(user.unlockedSkins) ? user.unlockedSkins : [],
        unlockedEffects: Array.isArray(user.unlockedEffects) ? user.unlockedEffects : [],
        yamb_unlocked: Array.isArray(user.yamb_unlocked) ? user.yamb_unlocked : [],
        lastDaily: user.lastDaily,
        lastDailyRewardClaimed: user.lastDailyRewardClaimed,
        soundEnabled: user.soundEnabled,
        vibrationEnabled: user.vibrationEnabled,
        penaltyPoints: Math.max(0, toSafeInt(user.penaltyPoints)),
        h2hStats: user.h2hStats || {},
        leagueData: normalizeUserLeagueDataForCurrentPeriod(user)
    };
}

function buildH2HRecordSummary(h2hStats = {}) {
    const summary = { wins: 0, losses: 0, draws: 0, games: 0 };
    if (!h2hStats || typeof h2hStats !== 'object') return summary;

    Object.values(h2hStats).forEach(record => {
        if (!record || typeof record !== 'object') return;
        const name = String(record.name || '').trim();
        if (!name || name === 'undefined' || name === 'null' || name === 'Nepoznat') return;

        const wins = Math.max(0, toSafeInt(record.wins, 0));
        const losses = Math.max(0, toSafeInt(record.losses, 0));
        const draws = Math.max(0, toSafeInt(record.draws, 0));
        summary.wins += wins;
        summary.losses += losses;
        summary.draws += draws;
    });

    summary.games = summary.wins + summary.losses + summary.draws;
    return summary;
}

function emitProfileSync(socket, user, extra = {}) {
    if (!socket || !user) return;
    socket.emit('sync_local_stats', { ...buildProfileSyncPayload(user), ...extra });
}

function emitProfileSyncToUid(uid, user, extra = {}) {
    const socketId = uid ? onlinePlayers[uid] : null;
    if (!socketId || !user) return;
    io.to(socketId).emit('sync_local_stats', { ...buildProfileSyncPayload(user), ...extra });
}

function emitTournamentPrizeToUid(uid, payload) {
    const socketId = uid ? onlinePlayers[uid] : null;
    if (!socketId) return;
    io.to(socketId).emit('tourney_prize_awarded', payload);
}

async function debitTournamentEntryFee(uid) {
    if (!MONGO_URI) return { ok: true, user: null };

    const existingUser = await UserProfile.findOne({ firebaseUid: uid }).select('balance').lean();
    if (!existingUser) return { ok: false, reason: 'auth_required' };
    if (toSafeInt(existingUser.balance) < TOURNEY_ENTRY_FEE) {
        return { ok: false, reason: 'tourney_not_enough_money' };
    }

    const user = await UserProfile.findOneAndUpdate(
        { firebaseUid: uid, balance: { $gte: TOURNEY_ENTRY_FEE } },
        { $inc: { balance: -TOURNEY_ENTRY_FEE } },
        { new: true }
    );

    if (!user) return { ok: false, reason: 'tourney_not_enough_money' };
    return { ok: true, user };
}

async function refundTournamentEntryFee(uid) {
    if (!MONGO_URI) return null;

    const user = await UserProfile.findOne({ firebaseUid: uid });
    if (!user) return null;

    user.balance = Math.min(
        MAX_BALANCE,
        Math.max(0, toSafeInt(user.balance)) + TOURNEY_ENTRY_FEE
    );
    await user.save();
    return user;
}

async function applyTournamentPrize(uid, amount, role, incrementTournamentWins = false) {
    if (!uid) return { ok: false };

    if (!MONGO_URI) {
        emitTournamentPrizeToUid(uid, { role, reward: amount });
        return { ok: true, user: null };
    }

    const user = await UserProfile.findOne({ firebaseUid: uid });
    if (!user) return { ok: false };

    user.balance = Math.min(
        MAX_BALANCE,
        Math.max(0, toSafeInt(user.balance)) + amount
    );

    if (incrementTournamentWins) {
        user.tournamentWins = Math.max(0, toSafeInt(user.tournamentWins)) + 1;
    }

    await user.save();

    emitProfileSyncToUid(uid, user);
    emitTournamentPrizeToUid(uid, {
        role,
        reward: amount,
        balance: user.balance,
        tournamentWins: user.tournamentWins
    });

    return { ok: true, user };
}

async function awardTournamentFinalPrizes(match, winnerObj) {
    if (!match || !winnerObj || !winnerObj.id) return;

    const runnerUpObj = getTournamentOpponent(match, winnerObj.id);
    if (!match.prizeAwards || typeof match.prizeAwards !== 'object') {
        match.prizeAwards = {};
    }

    if (!match.prizeAwards[winnerObj.id]) {
        const prizeResult = await applyTournamentPrize(winnerObj.id, TOURNEY_WINNER_REWARD, 'winner', true);
        if (!prizeResult.ok) throw new Error('winner_prize_not_applied');
        match.prizeAwards[winnerObj.id] = true;
        saveTournamentToDb();
    }

    if (runnerUpObj && runnerUpObj.id && !match.prizeAwards[runnerUpObj.id]) {
        const prizeResult = await applyTournamentPrize(runnerUpObj.id, TOURNEY_RUNNER_UP_REWARD, 'runnerup', false);
        if (!prizeResult.ok) throw new Error('runnerup_prize_not_applied');
        match.prizeAwards[runnerUpObj.id] = true;
        saveTournamentToDb();
    }

    match.prizesAwarded = Boolean(
        match.prizeAwards[winnerObj.id] &&
        (!runnerUpObj || !runnerUpObj.id || match.prizeAwards[runnerUpObj.id])
    );
}

async function settleTournamentFinalPrizes(match, winnerObj) {
    if (!match || !winnerObj || match.prizesAwarded || match.prizeAwardInProgress) return;

    match.prizeAwardInProgress = true;
    try {
        await awardTournamentFinalPrizes(match, winnerObj);
    } finally {
        delete match.prizeAwardInProgress;
        saveTournamentToDb();
    }
}

async function recordTournamentChampion(match, winnerObj) {
    if (!match || !winnerObj || match.statsRecorded || match.statsRecordInProgress) return;

    if (!MONGO_URI) {
        match.statsRecorded = true;
        saveTournamentToDb();
        return;
    }

    match.statsRecordInProgress = true;

    try {
        await TourneyStats.findOneAndUpdate(
            { playerId: winnerObj.id },
            { $set: { playerName: winnerObj.name, lastWinDate: Date.now() }, $inc: { wins: 1 } },
            { upsert: true, new: true }
        );

        match.statsRecorded = true;

        const stats = await TourneyStats.find().sort({ wins: -1 }).limit(20).lean();
        io.emit('tourney_stats_data', stats);
    } finally {
        delete match.statsRecordInProgress;
        saveTournamentToDb();
    }
}

// ==================================================================
// LOGIKA ZA PRAVILNO BROJANJE ONLINE IGRAČA
// ==================================================================
const activeConnections = new Map();

function updateOnlineCount() {
    const uniqueKeys = new Set();

    io.sockets.sockets.forEach((clientSocket, id) => {
        if (!clientSocket.playerName) return;

        const ip = activeConnections.get(id) || "unknown_ip";
        let uniqueKey = clientSocket.playerId || registeredSockets[id] || ip;
        uniqueKeys.add(uniqueKey);
    });

    io.emit('users_count', uniqueKeys.size);
}

function bindVerifiedPlayerSocket(socket, playerId) {
    if (typeof playerId !== 'string' || playerId.length < 20) return false;

    const stariSocketId = onlinePlayers[playerId];

    if (stariSocketId && stariSocketId !== socket.id) {
        const aktivnaSoba = playerRooms[stariSocketId];

        if (aktivnaSoba) {
            console.log(`♻️ ORPHAN DETEKTOVAN: Prebacujem sobu ${aktivnaSoba} sa starog ${stariSocketId} na novi ${socket.id}`);

            socket.join(aktivnaSoba);
            playerRooms[socket.id] = aktivnaSoba;
            delete playerRooms[stariSocketId];

            if (roomState[aktivnaSoba]) {
                const players = roomState[aktivnaSoba].players;
                const idx = players.indexOf(stariSocketId);
                if (idx !== -1) {
                    players[idx] = socket.id;
                }
            }
            io.to(aktivnaSoba).emit('opponent_connection_restored');
        }

        const oldSocket = io.sockets.sockets.get(stariSocketId);
        if (oldSocket) {
            oldSocket.disconnect(true);
        }
    }

    if (disconnectTimers[playerId]) {
        clearTimeout(disconnectTimers[playerId]);
        delete disconnectTimers[playerId];

        const ghost = ghostSessions[playerId];
        if (ghost) {
            if (ghost.oldSocketId !== socket.id && playerRooms[socket.id] !== ghost.roomId) {
                socket.join(ghost.roomId);
                playerRooms[socket.id] = ghost.roomId;

                if (roomState[ghost.roomId]) {
                    const players = roomState[ghost.roomId].players;
                    const idx = players.indexOf(ghost.oldSocketId);
                    if (idx !== -1) {
                        players[idx] = socket.id;
                    }
                }
                io.to(ghost.roomId).emit('opponent_connection_restored');
                delete playerRooms[ghost.oldSocketId];
            }
            delete ghostSessions[playerId];
        }
    }

    socket.verifiedUid = playerId;
    socket.playerId = playerId;
    onlinePlayers[playerId] = socket.id;
    registeredSockets[socket.id] = playerId;
    return true;
}

async function verifyFirebaseSocketToken(socket, token) {
    if (!firebaseAuth) {
        return { ok: false, reason: 'firebase_admin_unavailable', permanent: false };
    }

    if (typeof token !== 'string' || token.length < 100) {
        return { ok: false, reason: 'missing_firebase_token', permanent: false };
    }

    try {
        const decoded = await firebaseAuth.verifyIdToken(token);
        if (!decoded || typeof decoded.uid !== 'string') {
            return { ok: false, reason: 'invalid_firebase_token' };
        }

        bindVerifiedPlayerSocket(socket, decoded.uid);
        return { ok: true, uid: decoded.uid };
    } catch (err) {
        console.warn('⚠️ Firebase token odbijen:', err.message);
        return { ok: false, reason: 'invalid_firebase_token' };
    }
}

function getServerQuarterInfo() {
    const now = new Date();
    return {
        year: now.getFullYear(),
        quarter: Math.floor(now.getMonth() / 3) + 1
    };
}

function normalizeLeagueMigrationData(rawLeagueData) {
    return normalizeLeagueData(rawLeagueData, { allowZero: false });
}

function normalizeLeagueData(rawLeagueData, options = {}) {
    if (!rawLeagueData || typeof rawLeagueData !== 'object') return null;

    const allowZero = options.allowZero !== false;
    const year = Number(rawLeagueData.year);
    const quarter = Number(rawLeagueData.quarter);
    const baselineScore = Number(rawLeagueData.baselineScore) || 0;
    const quarterlyScore = Number(rawLeagueData.quarterlyScore) || 0;

    if (!Number.isInteger(year) || !Number.isInteger(quarter)) return null;
    if (quarter < 1 || quarter > 4) return null;
    if (!Number.isFinite(quarterlyScore) || quarterlyScore < 0 || (!allowZero && quarterlyScore === 0) || quarterlyScore > MAX_LEAGUE_SCORE) return null;

    return {
        year,
        quarter,
        baselineScore: Math.max(0, Math.min(MAX_LEAGUE_SCORE, Math.floor(baselineScore))),
        quarterlyScore: Math.max(0, Math.floor(quarterlyScore))
    };
}

function getDefaultCurrentLeagueData() {
    const currentPeriod = getServerQuarterInfo();
    return {
        year: currentPeriod.year,
        quarter: currentPeriod.quarter,
        baselineScore: 0,
        quarterlyScore: 0
    };
}

function compareLeaguePeriod(a, b) {
    if (!a || !b) return 0;
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
}

function isCurrentLeaguePeriod(leagueData) {
    const currentPeriod = getServerQuarterInfo();
    return Boolean(
        leagueData &&
        leagueData.year === currentPeriod.year &&
        leagueData.quarter === currentPeriod.quarter
    );
}

function coerceLeagueDataToCurrentPeriod(rawLeagueData) {
    const currentLeague = getDefaultCurrentLeagueData();
    const normalized = normalizeLeagueData(rawLeagueData);
    if (!normalized) return currentLeague;

    if (isCurrentLeaguePeriod(normalized)) {
        return normalized;
    }

    const isPastPeriod = compareLeaguePeriod(normalized, currentLeague) < 0;
    const rolledBaseline = normalized.baselineScore + (isPastPeriod ? normalized.quarterlyScore : 0);
    return {
        ...currentLeague,
        baselineScore: Math.max(0, Math.min(MAX_LEAGUE_SCORE, Math.floor(rolledBaseline))),
        quarterlyScore: 0
    };
}

function mergeLeagueDataValues(currentRaw, incomingRaw) {
    const current = coerceLeagueDataToCurrentPeriod(currentRaw);
    const incoming = normalizeLeagueData(incomingRaw);
    const next = { ...current };

    if (!incoming) return next;

    if (isCurrentLeaguePeriod(incoming)) {
        next.baselineScore = Math.max(next.baselineScore, incoming.baselineScore);
        next.quarterlyScore = Math.max(next.quarterlyScore, incoming.quarterlyScore);
    } else {
        const incomingIsPastPeriod = compareLeaguePeriod(incoming, next) < 0;
        const incomingBaseline = incoming.baselineScore + (incomingIsPastPeriod ? incoming.quarterlyScore : 0);
        next.baselineScore = Math.max(next.baselineScore, incomingBaseline);
    }

    next.baselineScore = Math.max(0, Math.min(MAX_LEAGUE_SCORE, Math.floor(next.baselineScore)));
    next.quarterlyScore = Math.max(0, Math.min(MAX_LEAGUE_SCORE, Math.floor(next.quarterlyScore)));
    return next;
}

function buildInitialLeagueData(rawLeagueData) {
    return mergeLeagueDataValues(getDefaultCurrentLeagueData(), rawLeagueData);
}

function normalizeUserLeagueDataForCurrentPeriod(user) {
    return coerceLeagueDataToCurrentPeriod(user?.leagueData);
}

function mergeLeagueDataIntoUser(user, incomingRaw) {
    if (!user) return null;
    const mergedLeague = mergeLeagueDataValues(user.leagueData, incomingRaw);
    user.leagueData = mergedLeague;
    return mergedLeague;
}

async function maybeApplyLegacyLeagueMigration(user, submittedStats, playerName, photoUrl) {
    if (!user || !submittedStats || !submittedStats.legacyMigration || user.legacyMigrationApplied) return;

    const migratedLeague = normalizeLeagueMigrationData(submittedStats.leagueData);
    if (!migratedLeague) return;

    const currentPeriod = getServerQuarterInfo();
    const isCurrentPeriod = migratedLeague.year === currentPeriod.year && migratedLeague.quarter === currentPeriod.quarter;
    if (!isCurrentPeriod) {
        user.legacyMigrationApplied = true;
        user.legacyMigratedAt = Date.now();
        return;
    }

    const gamesPlayed = Math.max(Number(submittedStats.games) || 0, Number(user.games) || 0);
    const migrationCeiling = Math.min(MAX_LEAGUE_SCORE, Math.max(MAX_LEAGUE_SCORE_DELTA, gamesPlayed * MAX_LEAGUE_SCORE_DELTA));

    if (migratedLeague.quarterlyScore > migrationCeiling) {
        console.log(`🚨 LEGACY MIGRATION: Odbijen liga skor ${migratedLeague.quarterlyScore} za ${user.firebaseUid}, games=${gamesPlayed}`);
        user.legacyMigrationApplied = true;
        user.legacyMigratedAt = Date.now();
        return;
    }

    const mergedLeague = mergeLeagueDataIntoUser(user, migratedLeague);

    const existingLeagueScore = await LeagueScore.findOne({
        playerId: user.firebaseUid,
        year: migratedLeague.year,
        quarter: migratedLeague.quarter
    });

    const scoreForLeaderboard = Math.max(migratedLeague.quarterlyScore, mergedLeague?.quarterlyScore || 0);
    if (!existingLeagueScore || scoreForLeaderboard > (Number(existingLeagueScore.score) || 0)) {
        await LeagueScore.findOneAndUpdate(
            { playerId: user.firebaseUid, year: migratedLeague.year, quarter: migratedLeague.quarter },
            {
                $set: {
                    playerName,
                    photoUrl,
                    date: Date.now()
                },
                $max: { score: scoreForLeaderboard }
            },
            { upsert: true, new: true }
        );
    }

    user.legacyMigrationApplied = true;
    user.legacyMigratedAt = Date.now();
    console.log(`✅ LEGACY MIGRATION: Prebačeno ${migratedLeague.quarterlyScore} liga poena za ${user.firebaseUid}`);
}

function toSafeInt(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.floor(num);
}

function sanitizeIdArray(value, maxItems = 150) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();

    value.forEach(item => {
        if (typeof item !== 'string') return;
        const cleaned = item.trim().substring(0, 80);
        if (cleaned) seen.add(cleaned);
    });

    return Array.from(seen).slice(0, maxItems);
}

function sumTrophyRewards(trophyIds) {
    return sanitizeIdArray(trophyIds).reduce((sum, id) => sum + (TROPHY_REWARDS[id] || 0), 0);
}

function getNewTrophyRewards(clientTrophies, serverTrophies) {
    const serverSet = new Set(sanitizeIdArray(serverTrophies));
    return sanitizeIdArray(clientTrophies).reduce((sum, id) => {
        if (serverSet.has(id)) return sum;
        return sum + (TROPHY_REWARDS[id] || 0);
    }, 0);
}

function getRequestedUnlockSet(stats) {
    return new Set([
        ...sanitizeIdArray(stats?.unlockedSkins),
        ...sanitizeIdArray(stats?.unlockedEffects),
        ...sanitizeIdArray(stats?.yamb_unlocked),
        ...sanitizeIdArray(stats?.unlockedThemes)
    ]);
}

function getExistingUnlockSet(user) {
    return new Set([
        ...sanitizeIdArray(user?.unlockedSkins),
        ...sanitizeIdArray(user?.unlockedEffects),
        ...sanitizeIdArray(user?.yamb_unlocked),
        ...sanitizeIdArray(user?.unlockedTrophies)
    ]);
}

function getPaidUnlockCost(requestedUnlocks, existingUnlocks, requestedTrophies) {
    const trophySet = new Set(sanitizeIdArray(requestedTrophies));
    let total = 0;

    requestedUnlocks.forEach(id => {
        if (existingUnlocks.has(id) || FREE_UNLOCK_IDS.has(id) || trophySet.has(id)) return;
        const price = SHOP_ITEM_PRICES[id];
        if (typeof price !== 'number') {
            total += 50000;
            return;
        }
        total += Math.floor(price * 0.8);
    });

    return total;
}

function estimateEconomyCeiling(stats) {
    const games = Math.max(0, toSafeInt(stats?.games));
    const tournamentWins = Math.max(0, toSafeInt(stats?.tournamentWins));
    const trophyRewards = sumTrophyRewards(stats?.unlockedTrophies);

    return Math.min(
        MAX_BALANCE,
        1000 + (games * MAX_REWARD_PER_GAME) + trophyRewards + (tournamentWins * MAX_TOURNEY_REWARD) + 50000
    );
}

function calculateAllowedBalanceIncrease(user, stats, oldUserGames, oldTournamentWins, newTrophyRewards) {
    const newGames = Math.max(oldUserGames, toSafeInt(stats?.games));
    const gameDelta = Math.max(0, newGames - oldUserGames);
    const tournamentDelta = Math.max(0, toSafeInt(stats?.tournamentWins) - oldTournamentWins);
    const todayStr = new Date().toDateString();
    const requestedDailyReward = Math.max(0, Math.min(MAX_DAILY_REWARD, toSafeInt(stats?.dailyRewardAmount, 0)));
    const dailyStartedToday = user.lastDaily === todayStr || stats?.lastDaily === todayStr;
    const dailyClaimRequested = stats?.dailyRewardClaimed === todayStr && requestedDailyReward > 0;
    const dailyAllowance = dailyStartedToday && dailyClaimRequested && user.lastDailyRewardClaimed !== todayStr
        ? requestedDailyReward
        : 0;

    return MAX_AD_REWARD_PER_SYNC +
        (gameDelta * MAX_REWARD_PER_GAME) +
        (tournamentDelta * MAX_TOURNEY_REWARD) +
        newTrophyRewards +
        dailyAllowance;
}

function clearPendingGameRewardSession(uid, rewardSession) {
    if (!uid || !rewardSession) return;
    if (rewardSession.socketId) delete pendingGameRewards[rewardSession.socketId];
    if (pendingGameRewardsByUid[uid] === rewardSession) delete pendingGameRewardsByUid[uid];
}

function getPendingGameRewardIncrease(uid, requestedBalanceDelta) {
    const rewardSession = uid ? pendingGameRewardsByUid[uid] : null;
    if (!rewardSession || requestedBalanceDelta <= 0) {
        return { amount: 0, session: null };
    }

    if (Date.now() - rewardSession.createdAt > GAME_REWARD_CLAIM_WINDOW_MS) {
        clearPendingGameRewardSession(uid, rewardSession);
        return { amount: 0, session: null };
    }

    const baseReward = Math.max(0, Math.min(MAX_REWARD_PER_GAME, toSafeInt(rewardSession.score, 0)));
    const doubledReward = Math.max(baseReward, Math.min(MAX_REWARD_PER_GAME, baseReward * 2));
    let amount = 0;

    if (requestedBalanceDelta >= doubledReward) {
        amount = doubledReward;
    } else if (requestedBalanceDelta >= baseReward) {
        amount = baseReward;
    }

    return { amount, session: amount > 0 ? rewardSession : null };
}

function filterAllowedUnlocks(clientItems, serverItems, requestedTrophies, acceptPaidUnlocks) {
    const serverSet = new Set(sanitizeIdArray(serverItems));
    const trophySet = new Set(sanitizeIdArray(requestedTrophies));

    sanitizeIdArray(clientItems).forEach(id => {
        if (serverSet.has(id) || FREE_UNLOCK_IDS.has(id) || trophySet.has(id) || (acceptPaidUnlocks && SHOP_ITEM_PRICES[id] !== undefined)) {
            serverSet.add(id);
        }
    });

    return Array.from(serverSet);
}

function clampSafeInt(value, min, max, fallback = 0) {
    return Math.max(min, Math.min(max, toSafeInt(value, fallback)));
}

function normalizeProfileStats(stats) {
    const games = clampSafeInt(stats?.games, 0, MAX_PROFILE_GAMES);
    const penaltyPoints = clampSafeInt(stats?.penaltyPoints, 0, MAX_PENALTY_POINTS);
    const competitiveLimit = games + Math.min(penaltyPoints, MAX_PROFILE_COMPETITIVE_BUFFER);

    let wins = clampSafeInt(stats?.wins, 0, competitiveLimit);
    let losses = clampSafeInt(stats?.losses, 0, competitiveLimit);

    if (wins + losses > competitiveLimit) {
        losses = Math.max(0, competitiveLimit - wins);
    }

    const highscore = clampSafeInt(stats?.highscore, 0, MAX_SCORE);
    const totalScoreSum = clampSafeInt(stats?.totalScoreSum, 0, games * MAX_SCORE);
    const tournamentWins = clampSafeInt(stats?.tournamentWins, 0, games);
    const maxWinStreak = clampSafeInt(stats?.maxWinStreak, 0, wins);
    const currentWinStreak = clampSafeInt(stats?.currentWinStreak, 0, maxWinStreak);

    return {
        games,
        wins,
        losses,
        highscore,
        totalScoreSum,
        tournamentWins,
        maxWinStreak,
        currentWinStreak,
        penaltyPoints
    };
}

function hasProfileStatsPayload(stats, normalizedStats = normalizeProfileStats(stats)) {
    return normalizedStats.games > 0 ||
        normalizedStats.wins > 0 ||
        normalizedStats.losses > 0 ||
        normalizedStats.highscore > 0 ||
        normalizedStats.totalScoreSum > 0 ||
        normalizedStats.tournamentWins > 0 ||
        sanitizeIdArray(stats?.unlockedTrophies).length > 0;
}

function isProgressTrophyEarned(trophyId, stats) {
    switch (trophyId) {
        case 'first_play': return stats.games >= 1;
        case 'apprentice': return stats.games >= 10;
        case 'veteran': return stats.games >= 50;
        case 'score_1000': return stats.highscore >= 1000;
        case 'grandmaster': return stats.highscore >= 1250;
        case 'legend': return stats.highscore >= 2000;
        case 'mythic': return stats.highscore >= 2500;
        case 'godlike': return stats.highscore >= 3000;
        default: return false;
    }
}

function getTrophyCell(sheet, col, row) {
    const colData = sheet && typeof sheet === 'object' && sheet[col] && typeof sheet[col] === 'object'
        ? sheet[col]
        : null;
    if (!colData || !Object.prototype.hasOwnProperty.call(colData, row)) return null;

    const value = colData[row];
    if (value === null || value === undefined || value === '') return null;

    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.max(0, Math.min(MAX_SCORE, Math.floor(num)));
}

function sumTopRows(sheet, col) {
    return ['1', '2', '3', '4', '5', '6'].reduce((total, row) => total + (getTrophyCell(sheet, col, row) || 0), 0);
}

function hasOnlyYambZeros(sheet) {
    let hasYambZero = false;

    return KOLONE.every(col => REDOVI_IGRA.every(row => {
        const value = getTrophyCell(sheet, col, row);
        if (value === null) return false;
        if (value !== 0) return true;
        if (row !== 'Yamb') return false;
        hasYambZero = true;
        return true;
    })) && hasYambZero;
}

function isBelgradeNightOwlHour() {
    try {
        const hourString = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: 'Europe/Belgrade'
        }).format(new Date());
        const hour = Number(hourString);
        return hour >= 3 && hour <= 5;
    } catch (err) {
        const hour = new Date().getHours();
        return hour >= 3 && hour <= 5;
    }
}

function normalizeTrophyProof(rawProof) {
    const proof = rawProof && typeof rawProof === 'object' ? rawProof : {};
    const flags = proof.flags && typeof proof.flags === 'object' ? proof.flags : {};
    const stats = proof.stats && typeof proof.stats === 'object' ? proof.stats : {};

    return {
        finalScore: clampSafeInt(proof.finalScore, 0, MAX_SCORE),
        sheet: proof.sheet && typeof proof.sheet === 'object' ? proof.sheet : {},
        mode: typeof proof.mode === 'string' ? proof.mode.substring(0, 30) : '',
        flags: {
            hasProphet: flags.hasProphet === true,
            hasSvetiIlija: flags.hasSvetiIlija === true,
            scoreDiff: clampSafeInt(flags.scoreDiff, -MAX_SCORE, MAX_SCORE)
        },
        stats: normalizeProfileStats({
            ...stats,
            highscore: Math.max(toSafeInt(stats.highscore), toSafeInt(proof.finalScore))
        })
    };
}

function getTrophyProgressStats(user, proof) {
    const serverStats = normalizeProfileStats({
        games: user?.games,
        wins: user?.wins,
        losses: user?.losses,
        highscore: user?.highscore,
        totalScoreSum: user?.totalScoreSum,
        tournamentWins: user?.tournamentWins,
        maxWinStreak: user?.maxWinStreak,
        currentWinStreak: user?.currentWinStreak,
        penaltyPoints: user?.penaltyPoints
    });

    return {
        games: Math.max(serverStats.games, proof.stats.games),
        wins: Math.max(serverStats.wins, proof.stats.wins),
        losses: Math.max(serverStats.losses, proof.stats.losses),
        highscore: Math.max(serverStats.highscore, proof.stats.highscore, proof.finalScore),
        totalScoreSum: Math.max(serverStats.totalScoreSum, proof.stats.totalScoreSum),
        tournamentWins: Math.max(serverStats.tournamentWins, proof.stats.tournamentWins),
        maxWinStreak: Math.max(serverStats.maxWinStreak, proof.stats.maxWinStreak),
        currentWinStreak: Math.max(serverStats.currentWinStreak, proof.stats.currentWinStreak),
        penaltyPoints: Math.max(serverStats.penaltyPoints, proof.stats.penaltyPoints)
    };
}

function isSpecialTrophyEarned(trophyId, proof) {
    const sheet = proof.sheet;

    switch (trophyId) {
        case 'kafana':
            return proof.mode === 'Hotseat';
        case 'surgeon':
            return REDOVI_IGRA.every(row => {
                const value = getTrophyCell(sheet, 'Ručno', row);
                return value !== null && value !== 0;
            });
        case 'immortal':
            return KOLONE.every(col => REDOVI_IGRA.every(row => {
                const value = getTrophyCell(sheet, col, row);
                return value !== null && value !== 0;
            }));
        case 'minimal':
            return KOLONE.some(col => {
                const value = getTrophyCell(sheet, col, 'Min');
                return value !== null && value > 0 && value < 7;
            });
        case 'math':
            return KOLONE.some(col => sumTopRows(sheet, col) === 63);
        case 'concrete':
            return KOLONE.every(col => {
                const value = getTrophyCell(sheet, col, 'Kenta');
                return value !== null && value > 0;
            });
        case 'perfectionist':
            return KOLONE.every(col => sumTopRows(sheet, col) >= 60);
        case 'miner':
            return KOLONE.some(col => {
                const max = getTrophyCell(sheet, col, 'Max');
                const min = getTrophyCell(sheet, col, 'Min');
                const one = getTrophyCell(sheet, col, '1');
                return max !== null && min !== null && one !== null && ((max - min) * one) > 60;
            });
        case 'prophet':
            return proof.flags.hasProphet;
        case 'sveti_ilija':
            return proof.flags.hasSvetiIlija;
        case 'sniper': {
            const value = getTrophyCell(sheet, 'Najava', 'Yamb');
            return value !== null && value > 0;
        }
        case 'hazard': {
            const value = getTrophyCell(sheet, 'Ručno', 'Yamb');
            return value !== null && value > 0;
        }
        case 'firecracker':
            return KOLONE.filter(col => {
                const value = getTrophyCell(sheet, col, 'Yamb');
                return value !== null && value > 0;
            }).length >= 5;
        case 'potato':
            return KOLONE.some(col => getTrophyCell(sheet, col, 'Yamb') === 0);
        case 'achilles':
            return hasOnlyYambZeros(sheet);
        case 'night_owl':
            return isBelgradeNightOwlHour();
        case 'close_call': {
            const diff = Math.abs(proof.flags.scoreDiff);
            return diff > 0 && diff < 5;
        }
        case 'spite':
            return proof.flags.scoreDiff >= 200;
        default:
            return false;
    }
}

function isTrophyClaimEarned(trophyId, user, rawProof) {
    const proof = normalizeTrophyProof(rawProof);
    const progressStats = getTrophyProgressStats(user, proof);

    if (isProgressTrophyEarned(trophyId, progressStats)) return true;
    if (!SPECIAL_TROPHY_IDS.has(trophyId)) return false;

    return isSpecialTrophyEarned(trophyId, proof);
}

function filterAllowedTrophies(stats, clientTrophies, serverTrophies = [], allowLegacySpecial = false) {
    const accepted = new Set(
        sanitizeIdArray(serverTrophies).filter(id => ALL_TROPHY_IDS.has(id))
    );

    sanitizeIdArray(clientTrophies).forEach(id => {
        if (!ALL_TROPHY_IDS.has(id)) return;
        if (accepted.has(id) || isProgressTrophyEarned(id, stats)) {
            accepted.add(id);
            return;
        }
        if (allowLegacySpecial && stats.games > 0 && SPECIAL_TROPHY_IDS.has(id)) {
            accepted.add(id);
        }
    });

    return Array.from(accepted);
}

function buildInitialProfileState(stats) {
    const normalized = normalizeProfileStats(stats);
    const hasPayload = hasProfileStatsPayload(stats, normalized);
    const unlockedTrophies = filterAllowedTrophies(normalized, stats?.unlockedTrophies, [], hasPayload);

    return {
        stats: normalized,
        unlockedTrophies,
        hasPayload
    };
}

function applyProfileStatsGuard(user, stats) {
    const incoming = normalizeProfileStats(stats);
    const hasPayload = hasProfileStatsPayload(stats, incoming);
    const allowLegacyImport = !user.statsMigrationApplied && hasPayload;

    const oldStats = {
        games: Math.max(0, toSafeInt(user.games)),
        wins: Math.max(0, toSafeInt(user.wins)),
        losses: Math.max(0, toSafeInt(user.losses)),
        highscore: Math.max(0, toSafeInt(user.highscore)),
        totalScoreSum: Math.max(0, toSafeInt(user.totalScoreSum)),
        tournamentWins: Math.max(0, toSafeInt(user.tournamentWins)),
        maxWinStreak: Math.max(0, toSafeInt(user.maxWinStreak)),
        currentWinStreak: Math.max(0, toSafeInt(user.currentWinStreak)),
        penaltyPoints: Math.max(0, toSafeInt(user.penaltyPoints))
    };

    const maxGameDelta = allowLegacyImport ? MAX_PROFILE_LEGACY_GAME_IMPORT : MAX_PROFILE_GAME_DELTA_PER_SYNC;
    const requestedGameDelta = Math.max(0, incoming.games - oldStats.games);
    const acceptedGameDelta = Math.min(requestedGameDelta, maxGameDelta);

    if (requestedGameDelta > maxGameDelta) {
        console.log(`🚨 STATS GUARD: Ograničen skok partija sa ${oldStats.games} na ${incoming.games}. Prihvatam +${acceptedGameDelta}.`);
    }

    user.games = oldStats.games + acceptedGameDelta;

    const oldCompetitiveTotal = oldStats.wins + oldStats.losses;
    const requestedWinsDelta = Math.max(0, incoming.wins - oldStats.wins);
    const requestedLossesDelta = Math.max(0, incoming.losses - oldStats.losses);
    const legacyCompetitiveRoom = allowLegacyImport
        ? Math.max(0, user.games + Math.min(incoming.penaltyPoints, MAX_PROFILE_COMPETITIVE_BUFFER) - oldCompetitiveTotal)
        : 0;
    let remainingCompetitiveDelta = acceptedGameDelta + legacyCompetitiveRoom + 1;

    const acceptedWinsDelta = Math.min(requestedWinsDelta, remainingCompetitiveDelta);
    user.wins = oldStats.wins + acceptedWinsDelta;
    remainingCompetitiveDelta -= acceptedWinsDelta;

    const acceptedLossesDelta = Math.min(requestedLossesDelta, remainingCompetitiveDelta);
    user.losses = oldStats.losses + acceptedLossesDelta;

    if (requestedWinsDelta + requestedLossesDelta > acceptedWinsDelta + acceptedLossesDelta) {
        console.log(`🚨 STATS GUARD: Ograničen skok W/L statistike za ${user.playerName || user.firebaseUid}.`);
    }

    user.highscore = Math.max(oldStats.highscore, Math.min(incoming.highscore, MAX_SCORE));

    const maxTotalScoreSum = Math.min(
        user.games * MAX_SCORE,
        oldStats.totalScoreSum + (acceptedGameDelta * MAX_SCORE) + (allowLegacyImport ? MAX_SCORE : 0)
    );
    if (incoming.totalScoreSum > maxTotalScoreSum) {
        console.log(`🚨 STATS GUARD: Ograničen totalScoreSum sa ${incoming.totalScoreSum} na ${maxTotalScoreSum}.`);
    }
    user.totalScoreSum = Math.max(oldStats.totalScoreSum, Math.min(incoming.totalScoreSum, maxTotalScoreSum));

    const requestedTournamentDelta = Math.max(0, incoming.tournamentWins - oldStats.tournamentWins);
    const maxTournamentDelta = allowLegacyImport ? MAX_PROFILE_LEGACY_TOURNEY_IMPORT : MAX_PROFILE_TOURNEY_DELTA_PER_SYNC;
    const acceptedTournamentDelta = Math.min(requestedTournamentDelta, maxTournamentDelta, Math.max(acceptedGameDelta, allowLegacyImport ? user.games : 0));
    if (requestedTournamentDelta > acceptedTournamentDelta) {
        console.log(`🚨 STATS GUARD: Ograničen skok turnirskih pobeda sa ${oldStats.tournamentWins} na ${incoming.tournamentWins}.`);
    }
    user.tournamentWins = oldStats.tournamentWins + acceptedTournamentDelta;

    user.penaltyPoints = Math.max(oldStats.penaltyPoints, Math.min(incoming.penaltyPoints, MAX_PENALTY_POINTS));
    user.maxWinStreak = Math.max(oldStats.maxWinStreak, Math.min(incoming.maxWinStreak, user.wins));
    user.currentWinStreak = Math.min(incoming.currentWinStreak, user.maxWinStreak);

    const acceptedStats = {
        games: user.games,
        wins: user.wins,
        losses: user.losses,
        highscore: user.highscore,
        totalScoreSum: user.totalScoreSum,
        tournamentWins: user.tournamentWins,
        maxWinStreak: user.maxWinStreak,
        currentWinStreak: user.currentWinStreak,
        penaltyPoints: user.penaltyPoints
    };
    const acceptedTrophies = filterAllowedTrophies(acceptedStats, stats?.unlockedTrophies, user.unlockedTrophies, allowLegacyImport);

    if (allowLegacyImport) {
        user.statsMigrationApplied = true;
        user.statsMigratedAt = Date.now();
    }

    return {
        oldStats,
        incomingStats: incoming,
        acceptedStats,
        acceptedTrophies,
        acceptedGameDelta,
        acceptedTournamentDelta,
        allowLegacyImport
    };
}

function pickAllowedInventoryItem(requested, allowedItems, fallback, defaultId) {
    const allowedSet = new Set([...sanitizeIdArray(allowedItems), ...FREE_UNLOCK_IDS]);
    const requestedId = sanitizeIdArray([requested], 1)[0];
    const fallbackId = sanitizeIdArray([fallback], 1)[0];

    if (requestedId && allowedSet.has(requestedId)) return requestedId;
    if (fallbackId && allowedSet.has(fallbackId)) return fallbackId;
    return defaultId;
}

function normalizeActiveSelections(user, fallbackActive = {}) {
    const skinItems = [...sanitizeIdArray(user.unlockedSkins), ...sanitizeIdArray(user.yamb_unlocked)];
    const effectItems = [...sanitizeIdArray(user.unlockedEffects), ...sanitizeIdArray(user.yamb_unlocked)];
    const themeItems = [...sanitizeIdArray(user.yamb_unlocked), ...sanitizeIdArray(user.unlockedSkins)];

    user.activeSkin = pickAllowedInventoryItem(user.activeSkin, skinItems, fallbackActive.activeSkin, 'default');
    user.activeEffect = pickAllowedInventoryItem(user.activeEffect, effectItems, fallbackActive.activeEffect, 'confetti');
    user.activeTheme = pickAllowedInventoryItem(user.activeTheme, themeItems, fallbackActive.activeTheme, 'dark');
}

function buildInitialEconomyState(stats, acceptedTrophies = null) {
    const requestedTrophies = acceptedTrophies ? sanitizeIdArray(acceptedTrophies) : sanitizeIdArray(stats?.unlockedTrophies);
    const requestedUnlocks = getRequestedUnlockSet(stats);
    const requestedPaidUnlockCost = getPaidUnlockCost(requestedUnlocks, new Set(requestedTrophies), requestedTrophies);
    const economyCeiling = estimateEconomyCeiling(stats);
    const requestedBalance = Math.max(0, Math.min(MAX_BALANCE, toSafeInt(stats?.balance, 0)));
    const purchaseCoverage = Math.max(0, economyCeiling - requestedBalance);
    const acceptsPaidUnlocks = requestedPaidUnlockCost === 0 || purchaseCoverage >= requestedPaidUnlockCost;
    const acceptedBalance = acceptsPaidUnlocks ? requestedBalance : Math.min(requestedBalance, economyCeiling);
    const undoLimit = Math.min(
        MAX_UNDO_TOKENS,
        MAX_IMPORTED_UNDO_TOKENS_BASE + (Math.max(0, toSafeInt(stats?.games)) * 3)
    );
    const generalUnlocks = [
        ...sanitizeIdArray(stats?.yamb_unlocked),
        ...sanitizeIdArray(stats?.unlockedThemes)
    ];

    if (!acceptsPaidUnlocks && requestedPaidUnlockCost > 0) {
        console.log(`🚨 ECONOMY GUARD: Novi profil poslao unlock-e bez pokrića. Potrebno ${requestedPaidUnlockCost}, pokriće ${purchaseCoverage}.`);
    }

    return {
        balance: Math.max(0, Math.min(MAX_BALANCE, acceptedBalance)),
        undoTokens: Math.max(0, Math.min(MAX_UNDO_TOKENS, undoLimit, toSafeInt(stats?.undoTokens, 0))),
        unlockedTrophies: requestedTrophies,
        unlockedSkins: filterAllowedUnlocks(stats?.unlockedSkins, [], requestedTrophies, acceptsPaidUnlocks),
        unlockedEffects: filterAllowedUnlocks(stats?.unlockedEffects, [], requestedTrophies, acceptsPaidUnlocks),
        yamb_unlocked: filterAllowedUnlocks(generalUnlocks, [], requestedTrophies, acceptsPaidUnlocks)
    };
}

// ==================================================================
// --- POMOĆNA FUNKCIJA ZA BROJANJE GLEDALACA ---
// ==================================================================
function updateRoomSpectators(roomId) {
    if (!roomId) return;
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (!clients) {
        io.to(roomId).emit('room_spectators_count', 0);
        return;
    }

    let spectatorCount = 0;
    for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket && clientSocket.isSpectator) {
            spectatorCount++;
        }
    }
    io.to(roomId).emit('room_spectators_count', spectatorCount);
}

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {

    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

    activeConnections.set(socket.id, clientIp);
    console.log(`🔗 Novi klijent: ${socket.id} (IP: ${clientIp})`);

    updateOnlineCount();

    // ==================================================================
    // POPRAVLJENO: SAFETY NET KLIJENTSKA PROVERA TAJMERA SA GRACE PERIODOM
    // ==================================================================
    socket.on('check_timeout', (data) => {
        const roomId = data.roomId;
        const state = roomState[roomId];
        
        if (state && roomTimers[roomId]) {
            const currentTurnPlayer = state.players[state.turnIndex];
            
            if (socket.id !== currentTurnPlayer) {
                const elapsed = Date.now() - (state.turnStartTime || 0);
                
                if (elapsed >= TOTAL_TIMEOUT) {
                    console.log(`🛡️ SAFETY NET: Vreme zaista isteklo (${elapsed}ms). Prekidam!`);
                    handleTechnicalTimeout(roomId, currentTurnPlayer);
                } else {
                    console.log(`⏳ SAFETY NET: Klijent žuri. Još uvek teče Grace Period. Preostalo: ${TOTAL_TIMEOUT - elapsed}ms`);
                }
            }
        }
    });

    // DODATO: Provera da li je soba još uvek živa kada se klijent vrati u igru
    socket.on('check_room_status', (data) => {
        const isActive = roomState[data.roomId] ? true : false;
        socket.emit('room_status_result', { active: isActive, roomId: data.roomId });
    });

    socket.on('auth_firebase_token', async (data, ack) => {
        const token = typeof data === 'string' ? data : data?.token;
        const result = await verifyFirebaseSocketToken(socket, token);
        if (typeof ack === 'function') ack(result);
        if (!result.ok) socket.emit('auth_required', result);
    });

    socket.on('set_my_id', (playerId, ack) => {
        if (socket.verifiedUid && playerId === socket.verifiedUid) {
            bindVerifiedPlayerSocket(socket, socket.verifiedUid);
            if (typeof ack === 'function') ack({ ok: true, uid: socket.verifiedUid });
            return;
        }

        const result = { ok: false, reason: 'firebase_token_required' };
        if (typeof ack === 'function') ack(result);
        socket.emit('auth_required', result);
    });

    socket.on('claim_trophy_reward', async (data, ack) => {
        data = data || {};

        const reply = (payload) => {
            if (typeof ack === 'function') ack(payload);
            socket.emit('trophy_reward_result', payload);
        };

        const trophyId = typeof data.trophyId === 'string' ? data.trophyId.trim().substring(0, 80) : '';
        if (!ALL_TROPHY_IDS.has(trophyId)) {
            reply({ ok: false, reason: 'invalid_trophy' });
            return;
        }

        const reward = TROPHY_REWARDS[trophyId] || 0;

        if (!MONGO_URI) {
            reply({ ok: true, localFallback: true, trophyId, reward });
            return;
        }

        const verifiedUid = socket.verifiedUid;
        if (!verifiedUid) {
            const result = { ok: false, reason: 'firebase_token_required' };
            reply(result);
            socket.emit('auth_required', result);
            return;
        }

        try {
            const user = await UserProfile.findOne({ firebaseUid: verifiedUid });
            if (!user) {
                reply({ ok: false, reason: 'profile_not_found' });
                return;
            }

            const unlocked = new Set(sanitizeIdArray(user.unlockedTrophies));
            if (unlocked.has(trophyId)) {
                emitProfileSync(socket, user, {
                    trophyReward: {
                        trophyId,
                        reward: 0,
                        alreadyClaimed: true
                    }
                });
                reply({
                    ok: true,
                    trophyId,
                    reward: 0,
                    alreadyClaimed: true,
                    balance: Math.max(0, toSafeInt(user.balance)),
                    unlockedTrophies: Array.from(unlocked)
                });
                return;
            }

            if (!isTrophyClaimEarned(trophyId, user, data.proof)) {
                reply({ ok: false, reason: 'trophy_not_earned', trophyId });
                return;
            }

            const updatedUser = await UserProfile.findOneAndUpdate(
                {
                    firebaseUid: verifiedUid,
                    unlockedTrophies: { $ne: trophyId }
                },
                {
                    $addToSet: { unlockedTrophies: trophyId },
                    $inc: { balance: reward }
                },
                { new: true }
            );

            if (!updatedUser) {
                const freshUser = await UserProfile.findOne({ firebaseUid: verifiedUid });
                if (freshUser) emitProfileSync(socket, freshUser);
                reply({
                    ok: true,
                    trophyId,
                    reward: 0,
                    alreadyClaimed: true,
                    balance: freshUser ? Math.max(0, toSafeInt(freshUser.balance)) : Math.max(0, toSafeInt(user.balance)),
                    unlockedTrophies: freshUser ? freshUser.unlockedTrophies : Array.from(unlocked)
                });
                return;
            }

            if (toSafeInt(updatedUser.balance) > MAX_BALANCE) {
                updatedUser.balance = MAX_BALANCE;
                await updatedUser.save();
            }

            emitProfileSync(socket, updatedUser, {
                trophyReward: {
                    trophyId,
                    reward,
                    balance: updatedUser.balance
                }
            });
            reply({
                ok: true,
                trophyId,
                reward,
                balance: updatedUser.balance,
                unlockedTrophies: updatedUser.unlockedTrophies
            });
        } catch (err) {
            console.error('❌ claim_trophy_reward greška:', err);
            reply({ ok: false, reason: 'server_error' });
        }
    });

    socket.on('set_player_data', async (data) => {
        data = data || {};
        const verifiedUid = socket.verifiedUid;
        const stariPlayerId = socket.playerId;

        socket.photoUrl = typeof data.photoUrl === 'string' ? data.photoUrl.substring(0, 500) : '';

        let bezbednoIme = "Nepoznat Igrač";
        
        if (typeof data.name === 'string') {
            let unesenoIme = data.name.trim().substring(0, 24);
            if (sadrziPsovku(unesenoIme)) {
                bezbednoIme = "Igrač_" + Math.floor(1000 + Math.random() * 9000);
            } else {
                bezbednoIme = unesenoIme;
            }
        }
        
        socket.playerName = bezbednoIme;
        if (verifiedUid) {
            socket.playerId = verifiedUid;
        }
        data.name = bezbednoIme;

        if (stariPlayerId && stariPlayerId !== socket.playerId) {
            delete onlinePlayers[stariPlayerId];
        }

        if (socket.playerId) {
            onlinePlayers[socket.playerId] = socket.id;
            registeredSockets[socket.id] = socket.playerId;
        }

        if (!verifiedUid) {
            socket.playerStats = data.stats || { wins: 0, losses: 0 };
            updateOnlineCount();
            if (data.uid || data.playerId) {
                socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
            }
            return;
        }

        try {
            if (!MONGO_URI) {
                updateOnlineCount(); 
                return;
            }

            let user = await UserProfile.findOne({ firebaseUid: verifiedUid });
            const s = data.stats || {}; 

            if (user) {
                user.playerName = data.name;
                user.lastLogin = Date.now();
                user.photoUrl = socket.photoUrl || user.photoUrl;
                const previousActive = {
                    activeSkin: user.activeSkin,
                    activeEffect: user.activeEffect,
                    activeTheme: user.activeTheme
                };

                if (s.activeSkin !== undefined && s.activeSkin !== null) user.activeSkin = s.activeSkin;
                if (s.activeEffect !== undefined && s.activeEffect !== null) user.activeEffect = s.activeEffect;
                if (s.activeTheme !== undefined && s.activeTheme !== null) user.activeTheme = s.activeTheme;
                if (s.soundEnabled !== undefined) user.soundEnabled = s.soundEnabled;
                if (s.vibrationEnabled !== undefined) user.vibrationEnabled = s.vibrationEnabled;

                if (s.penaltyPoints !== undefined && s.penaltyPoints > (user.penaltyPoints || 0)) {
                    user.penaltyPoints = s.penaltyPoints;
                }

                const todayStr = new Date().toDateString();
                const requestedDailyReward = Math.max(0, Math.min(MAX_DAILY_REWARD, toSafeInt(s.dailyRewardAmount, 0)));
                const shouldMarkDailyRewardClaimed = s.dailyRewardClaimed === todayStr &&
                    requestedDailyReward > 0 &&
                    user.lastDailyRewardClaimed !== todayStr;

                // 🛡️ NOVO: Popravljena logika (INVENTORY DESYNC FIX)
                const isFreshLogin = (toSafeInt(s.games, 0) === 0);
                const statsGuard = applyProfileStatsGuard(user, s);
                const oldUserGames = statsGuard.oldStats.games;
                const oldTournamentWins = statsGuard.oldStats.tournamentWins;
                const oldBalance = Math.max(0, toSafeInt(user.balance));
                const oldUndoTokens = Math.max(0, toSafeInt(user.undoTokens));
                const requestedTrophies = statsGuard.acceptedTrophies;
                const newTrophyRewards = getNewTrophyRewards(requestedTrophies, user.unlockedTrophies);
                const existingUnlocksBefore = getExistingUnlockSet(user);
                const requestedUnlocks = getRequestedUnlockSet(s);
                const requestedPaidUnlockCost = getPaidUnlockCost(requestedUnlocks, existingUnlocksBefore, requestedTrophies);

                const statsForEconomy = { ...s, ...statsGuard.acceptedStats, unlockedTrophies: requestedTrophies };
                
                // 🛡️ SECURITY FIX: Da li je klijentova verzija statistike sinhronizovana
                const isClientSynced = (s.games >= oldUserGames);

                // 🛡️ SHOP EXPLOIT FIX (ANTI-RESTORE BACKUP)
                let isUsingOldBackup = false;
                const checkMissing = (clientArr, serverArr) => {
                    if (!serverArr || serverArr.length === 0) return false;
                    const clientSet = new Set(clientArr || []);
                    return serverArr.some(item => !clientSet.has(item));
                };

                if (checkMissing(s.unlockedSkins, user.unlockedSkins) ||
                    checkMissing(s.unlockedEffects, user.unlockedEffects) ||
                    checkMissing(s.yamb_unlocked, user.yamb_unlocked)) {
                    isUsingOldBackup = true;
                }

                let acceptedBalance = oldBalance;
                const requestedBalance = Math.max(0, Math.min(MAX_BALANCE, toSafeInt(s.balance, oldBalance)));
                const requestedBalanceDelta = requestedBalance - oldBalance;
                const pendingGameReward = getPendingGameRewardIncrease(verifiedUid, requestedBalanceDelta);
                const legacyEconomyAllowance = !user.economyMigrationApplied
                    ? Math.max(0, estimateEconomyCeiling(s) - oldBalance)
                    : 0;
                const allowedBalanceIncrease = calculateAllowedBalanceIncrease(user, s, oldUserGames, oldTournamentWins, newTrophyRewards) +
                    pendingGameReward.amount +
                    legacyEconomyAllowance;
                const earnedBalanceIncrease = (Math.max(0, statsGuard.acceptedGameDelta) * MAX_REWARD_PER_GAME) +
                    (Math.max(0, statsGuard.acceptedTournamentDelta) * MAX_TOURNEY_REWARD) +
                    newTrophyRewards +
                    (shouldMarkDailyRewardClaimed ? requestedDailyReward : 0) +
                    pendingGameReward.amount +
                    legacyEconomyAllowance;
                const hasEarnedBalanceIncrease = requestedBalanceDelta > 0 && requestedBalanceDelta <= earnedBalanceIncrease;
                const purchaseCoverage = Math.max(0, oldBalance + allowedBalanceIncrease - requestedBalance);
                const acceptsPaidUnlocks = requestedPaidUnlockCost === 0 || purchaseCoverage >= requestedPaidUnlockCost;

                const hasAcceptedPaidPurchase = requestedPaidUnlockCost > 0 && acceptsPaidUnlocks;

                if (typeof s.balance === 'number' && (isClientSynced || pendingGameReward.amount > 0)) {
                    if (isUsingOldBackup && requestedBalance > oldBalance && !hasEarnedBalanceIncrease) {
                        console.log(`🚨 HACK POKUŠAJ (Inventory Desync): Igrač ${user.playerName} odbijen skok dukata sa ${oldBalance} na ${requestedBalance}!`);
                    } else if (requestedBalanceDelta === 0) {
                        acceptedBalance = requestedBalance;
                    } else if (requestedBalanceDelta < 0) {
                        if (hasAcceptedPaidPurchase) {
                            acceptedBalance = requestedBalance;
                        } else {
                            console.log(`🛡️ ECONOMY GUARD: Ignorišem zastareli pad dukata sa ${oldBalance} na ${requestedBalance} bez nove kupovine.`);
                        }
                    } else if (requestedBalanceDelta <= allowedBalanceIncrease) {
                        acceptedBalance = requestedBalance;
                        if (shouldMarkDailyRewardClaimed) {
                            user.lastDailyRewardClaimed = todayStr;
                        }
                    } else {
                        console.log(`🚨 ECONOMY GUARD: Odbijen skok dukata sa ${oldBalance} na ${requestedBalance}. Dozvoljeno +${allowedBalanceIncrease}, traženo +${requestedBalanceDelta}.`);
                    }

                    user.balance = acceptedBalance;
                    if (pendingGameReward.session && acceptedBalance >= oldBalance + pendingGameReward.amount) {
                        clearPendingGameRewardSession(verifiedUid, pendingGameReward.session);
                    }
                }

                if (typeof s.undoTokens === 'number' && isClientSynced) {
                    const requestedUndoTokens = Math.max(0, Math.min(MAX_UNDO_TOKENS, toSafeInt(s.undoTokens, oldUndoTokens)));
                    const undoDelta = requestedUndoTokens - oldUndoTokens;
                    const legacyUndoAllowance = !user.economyMigrationApplied
                        ? Math.max(0, Math.min(MAX_UNDO_TOKENS, (Math.max(0, toSafeInt(s.games)) * 3) + 20) - oldUndoTokens)
                        : 0;
                    const allowedUndoIncrease = 3 + Math.max(0, toSafeInt(s.games) - oldUserGames) + legacyUndoAllowance;

                    if (undoDelta <= 0 || undoDelta <= allowedUndoIncrease) {
                        user.undoTokens = requestedUndoTokens;
                    } else {
                        console.log(`🚨 ECONOMY GUARD: Odbijen skok undo tokena sa ${oldUndoTokens} na ${requestedUndoTokens}.`);
                    }
                }

                // 🛡️ SECURITY FIX INVENTARA: Dodajemo u bazu SAMO ako je klijent sinhronizovan
                if (isClientSynced) {
                    if (requestedTrophies.length > 0) {
                        const mergedTrophies = new Set([...user.unlockedTrophies, ...requestedTrophies]);
                        user.unlockedTrophies = Array.from(mergedTrophies);
                    }
                    if (s.unlockedSkins && s.unlockedSkins.length > 0) {
                        user.unlockedSkins = filterAllowedUnlocks(s.unlockedSkins, user.unlockedSkins, requestedTrophies, acceptsPaidUnlocks);
                    }
                    if (s.unlockedEffects && s.unlockedEffects.length > 0) {
                        user.unlockedEffects = filterAllowedUnlocks(s.unlockedEffects, user.unlockedEffects, requestedTrophies, acceptsPaidUnlocks);
                    }
                    const generalUnlocks = [
                        ...sanitizeIdArray(s.yamb_unlocked),
                        ...sanitizeIdArray(s.unlockedThemes)
                    ];
                    if (generalUnlocks.length > 0) {
                        user.yamb_unlocked = filterAllowedUnlocks(generalUnlocks, user.yamb_unlocked, requestedTrophies, acceptsPaidUnlocks);
                    }

                    if (!acceptsPaidUnlocks && requestedPaidUnlockCost > 0) {
                        console.log(`🚨 ECONOMY GUARD: Odbijeni novi unlock-i bez pokrića kupovine. Potrebno ${requestedPaidUnlockCost}, pokriće ${purchaseCoverage}.`);
                    }
                }

                normalizeActiveSelections(user, previousActive);

                if (!user.economyMigrationApplied) {
                    user.economyMigrationApplied = true;
                    user.economyMigratedAt = Date.now();
                }

                if (user.lastDaily === todayStr) {
                    if (s.lastDaily !== todayStr) {
                        s.lastDaily = todayStr;
                    }
                } else {
                    if (s.lastDaily) {
                        user.lastDaily = s.lastDaily;
                    }
                }

                mergeLeagueDataIntoUser(user, s.leagueData);

                if (s.h2hStats) {
                    let cloudH2H = user.h2hStats || {};
                    let isModified = false;

                    for (const [oppName, localData] of Object.entries(s.h2hStats)) {
                        
                        // 🛡️ SERVER H2H FILTER: Blokiramo undefined i null stringove
                        if (!oppName || String(oppName) === 'undefined' || String(oppName) === 'null' || oppName === 'Nepoznat') continue;
                        
                        if (!cloudH2H[oppName]) {
                            cloudH2H[oppName] = localData;
                            isModified = true;
                        } else {
                            let cloudData = cloudH2H[oppName];
                            
                            const localTotal = (localData.wins || 0) + (localData.losses || 0) + (localData.draws || 0);
                            const cloudTotal = (cloudData.wins || 0) + (cloudData.losses || 0) + (cloudData.draws || 0);
                            
                            if (localTotal > cloudTotal) {
                                cloudData.wins = localData.wins;
                                cloudData.losses = localData.losses;
                                cloudData.draws = localData.draws || 0;
                                cloudData.currentWinStreak = localData.currentWinStreak || 0; 
                                isModified = true;
                            }

                            if ((localData.gamesWithScore || 0) > (cloudData.gamesWithScore || 0)) {
                                cloudData.gamesWithScore = localData.gamesWithScore;
                                cloudData.myTotalScore = localData.myTotalScore;
                                cloudData.currentWinStreak = localData.currentWinStreak || 0;
                                isModified = true;
                            }

                            if ((localData.maxWinStreak || 0) > (cloudData.maxWinStreak || 0)) {
                                cloudData.maxWinStreak = localData.maxWinStreak;
                                isModified = true;
                            }

                            if ((localData.myHighScore || 0) > (cloudData.myHighScore || 0)) {
                                cloudData.myHighScore = localData.myHighScore;
                                isModified = true;
                            }

                            if ((localData.maxWinMargin || 0) > (cloudData.maxWinMargin || 0)) {
                                cloudData.maxWinMargin = localData.maxWinMargin;
                                isModified = true;
                            }

                            if ((localData.maxLossMargin || 0) > (cloudData.maxLossMargin || 0)) {
                                cloudData.maxLossMargin = localData.maxLossMargin;
                                isModified = true;
                            }

                            if (localData.photo && localData.photo.length > 5 && localData.photo !== cloudData.photo) {
                                cloudData.photo = localData.photo; 
                                isModified = true;
                            }
                            
                            cloudH2H[oppName] = cloudData;
                        }
                    }

                    if (isModified || Object.keys(cloudH2H).length > 0) {
                        user.set('h2hStats', cloudH2H);
                        user.markModified('h2hStats');
                    }
                }

                await maybeApplyLegacyLeagueMigration(user, s, data.name, socket.photoUrl || '');
                await user.save();

                emitProfileSync(socket, user);
            } else {
                const initialEconomy = buildInitialEconomyState(s);
                const initialGames = Math.max(0, toSafeInt(s.games, 0));
                const initialWins = Math.max(0, Math.min(initialGames, toSafeInt(s.wins, 0)));
                const initialLosses = Math.max(0, Math.min(initialGames, toSafeInt(s.losses, 0)));
                const initialHighscore = Math.max(0, Math.min(MAX_SCORE, toSafeInt(s.highscore, 0)));
                const initialTotalScoreSum = Math.max(0, Math.min(toSafeInt(s.totalScoreSum, 0), initialGames * MAX_SCORE));

                user = new UserProfile({
                    firebaseUid: verifiedUid,
                    playerName: data.name,
                    photoUrl: socket.photoUrl || '',
                    wins: initialWins, losses: initialLosses, games: initialGames,
                    highscore: initialHighscore, totalScoreSum: initialTotalScoreSum,
                    balance: initialEconomy.balance, undoTokens: initialEconomy.undoTokens, currentWinStreak: Math.max(0, toSafeInt(s.currentWinStreak, 0)),
                    maxWinStreak: Math.max(0, toSafeInt(s.maxWinStreak, 0)),
                    tournamentWins: Math.max(0, toSafeInt(s.tournamentWins, 0)),
                    activeSkin: s.activeSkin || 'default',
                    activeTheme: s.activeTheme || 'dark',
                    activeEffect: s.activeEffect || 'confetti',
                    soundEnabled: s.soundEnabled !== undefined ? s.soundEnabled : true,
                    vibrationEnabled: s.vibrationEnabled !== undefined ? s.vibrationEnabled : true,
                    penaltyPoints: Math.max(0, toSafeInt(s.penaltyPoints, 0)),
                    h2hStats: s.h2hStats || {},
                    unlockedTrophies: initialEconomy.unlockedTrophies,
                    unlockedSkins: initialEconomy.unlockedSkins,
                    unlockedEffects: initialEconomy.unlockedEffects,
                    yamb_unlocked: initialEconomy.yamb_unlocked,
                    lastDaily: s.lastDaily || "",
                    leagueData: buildInitialLeagueData(s.leagueData),
                    economyMigrationApplied: true,
                    economyMigratedAt: Date.now()
                });
                normalizeActiveSelections(user);
                await maybeApplyLegacyLeagueMigration(user, s, data.name, socket.photoUrl || '');
                await user.save();

                emitProfileSync(socket, user);
            }
            
            socket.playerStats = {
                wins: user.wins,
                losses: user.losses,
                games: user.games,
                highscore: user.highscore,
                totalScoreSum: user.totalScoreSum,
                currentWinStreak: user.currentWinStreak,
                maxWinStreak: user.maxWinStreak,
                tournamentWins: user.tournamentWins,
                unlockedTrophies: user.unlockedTrophies,
                leagueData: user.leagueData,
                penaltyPoints: user.penaltyPoints || 0,
                h2hRecord: buildH2HRecordSummary(user.h2hStats)
            };

            updateOnlineCount(); 
        } catch (err) {
            console.error("Greška pri sinhronizaciji korisnika:", err);
            socket.playerStats = data.stats || { wins: 0, losses: 0 };
            updateOnlineCount(); 
        }
    });

    socket.on('get_online_players_list', async () => {
        let myFriends = [];
        if (MONGO_URI && socket.playerId) {
            try {
                const me = await UserProfile.findOne({ firebaseUid: socket.playerId });
                if (me && me.friends) {
                    myFriends = me.friends;
                }
            } catch (e) {
                console.error("Greška pri dohvatanju prijatelja na serveru:", e);
            }
        }

        let onlinePlayersList = [];
        
        io.sockets.sockets.forEach((clientSocket) => {
            if (clientSocket.playerName) {
                onlinePlayersList.push({
                    socketId: clientSocket.id,
                    name: clientSocket.playerName,
                    photoUrl: clientSocket.photoUrl || '',
                    uid: clientSocket.playerId || '',
                    isPlaying: !!playerRooms[clientSocket.id], 
                    isFriend: myFriends.includes(clientSocket.playerId) 
                });
            }
        });

        socket.emit('online_players_list_data', onlinePlayersList);
    });

    socket.on('get_online_players', () => {
        const playersMap = new Map(); 
        
        io.sockets.sockets.forEach((clientSocket, id) => {
            if (!clientSocket.playerName) return;

            const isPlaying = !!playerRooms[id];
            const ip = activeConnections.get(id) || "unknown_ip";
            
            let uniqueKey = clientSocket.playerId || registeredSockets[id] || ip;

            const playerData = {
                id: id, 
                playerId: clientSocket.playerId,
                name: clientSocket.playerName, 
                photoUrl: clientSocket.photoUrl, 
                stats: clientSocket.playerStats || { wins: 0, losses: 0 },
                status: isPlaying ? 'playing' : 'idle'
            };

            if (playersMap.has(uniqueKey)) {
                const existing = playersMap.get(uniqueKey);
                if (existing.status !== 'playing' && playerData.status === 'playing') {
                    playersMap.set(uniqueKey, playerData);
                }
            } else {
                playersMap.set(uniqueKey, playerData);
            }
        });

        socket.emit('online_players_list', Array.from(playersMap.values()));
    });

    socket.on('back_to_menu', async () => {
        const activeRoomId = playerRooms[socket.id];

        if (activeRoomId) {
            console.log(`📢 Igrač ${socket.id} se vratio u meni, napušta sobu ${activeRoomId}`);
            let technicalResult = { winnerReward: 500, loserCoinPenalty: 500 };

            if (roomState[activeRoomId]) {
                const pid = registeredSockets[socket.id];
                if (pid) {
                    const penaltyAmount = getDynamicPenalty(activeRoomId);
                    let h2hKey = null;
                    const oppSocketId = roomState[activeRoomId].players.find(id => id !== socket.id);
                    const oppSocket = io.sockets.sockets.get(oppSocketId);
                    const winnerUid = registeredSockets[oppSocketId];
                    if (oppSocket) {
                        let safeOppName = oppSocket.playerName ? oppSocket.playerName.replace(/\./g, '_').replace(/\$/g, '_') : 'Nepoznat';
                        h2hKey = oppSocket.playerId ? oppSocket.playerId : safeOppName;
                    }

                    technicalResult = await applyServerSideTechnicalResult(winnerUid, pid, penaltyAmount, h2hKey);
                }
            }

            socket.to(activeRoomId).emit('opponent_left', {
                reward: technicalResult.winnerReward,
                coinPenalty: technicalResult.loserCoinPenalty
            });
            delete playerRooms[socket.id];
            
            stopTurnTimer(activeRoomId);
            if (roomState[activeRoomId]) delete roomState[activeRoomId];

            if (privateRooms[activeRoomId]) {
                if (privateRooms[activeRoomId].p1 && privateRooms[activeRoomId].p1.id === socket.id) {
                    delete privateRooms[activeRoomId];
                } else if (privateRooms[activeRoomId].p2 && privateRooms[activeRoomId].p2.id === socket.id) {
                    delete privateRooms[activeRoomId].p2;
                }
            }
            socket.leave(activeRoomId);
        }

        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        
        updateOnlineCount();
    });

    socket.on('request_spectate', (targetSocketId) => {
        const roomId = playerRooms[targetSocketId];
        if (roomId) {
            socket.join(roomId);
            socket.isSpectator = true;
            socket.spectatingRoom = roomId;

            socket.emit('spectate_started', { roomId: roomId });

            if (roomState[roomId]) {
                const state = roomState[roomId];
                
                socket.emit('sync_state_response', {
                    roomId: roomId,
                    players: state.players.map(id => {
                        const pSocket = io.sockets.sockets.get(id);
                        return pSocket && pSocket.playerName ? pSocket.playerName : "Igrač";
                    }),
                    allScores: state.allScores || createEmptyScores(),
                    currentPlayerIdx: state.turnIndex,
                    brojBacanja: state.brojBacanja || 0,
                    kockiceVals: state.kockiceVals || [0,0,0,0,0,0],
                    zadrzane: state.zadrzane || [false,false,false,false,false,false],
                    najavaAktivna: state.najavaAktivna || false,
                    najavljenoPolje: state.najavljenoPolje || null
                });
                
                console.log(`👁️ Igrač ${socket.id} počeo da gleda sobu ${roomId} (Server Sync)`);
            } else {
                io.to(targetSocketId).emit('request_state_sync', { senderSocketId: socket.id });
                console.log(`👁️ Igrač ${socket.id} počeo da gleda sobu ${roomId} (Client Sync Fallback)`);
            }
            
            updateRoomSpectators(roomId);
        } else {
            socket.emit('error_msg', 'err_spectate_not_in_game');
        }
    });

    socket.on('stop_spectating', () => {
        if (socket.spectatingRoom) {
            const roomId = socket.spectatingRoom;
            socket.leave(roomId);
            console.log(`👁️ Igrač ${socket.id} je prestao da gleda sobu ${roomId}`);
            socket.isSpectator = false;
            socket.spectatingRoom = null;
            
            updateRoomSpectators(roomId);
        }
    });

    socket.on('start_local_game', (roomId) => {
        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        gameStartTimes[socket.id] = Date.now();
        console.log(`🏠 Igrač ${socket.id} započeo lokalnu partiju u sobi: ${roomId}`);
    });

    socket.on('game_session_start', () => {
        gameStartTimes[socket.id] = Date.now();
        console.log(`⏱️ Igrač ${socket.id} započeo partiju u ${new Date().toLocaleTimeString()}`);
    });

    socket.on('check_quarter_reward', async (data) => {
        try {
            if (!MONGO_URI) return;
            const { year, quarter } = data || {};
            const playerId = socket.verifiedUid;

            if (!year || !quarter || !playerId) return;

            const rewardKey = `${year}-Q${quarter}`;

            const user = await UserProfile.findOne({ firebaseUid: playerId });
            if (!user) return;

            if (user.claimedLeagueRewards && user.claimedLeagueRewards.includes(rewardKey)) {
                return; 
            }

            const topScores = await LeagueScore.find({ year: year, quarter: quarter })
                                               .sort({ score: -1 })
                                               .limit(3)
                                               .lean();
            
            let rank = -1;
            for (let i = 0; i < topScores.length; i++) {
                if (topScores[i].playerId === playerId) {
                    rank = i + 1; 
                    break;
                }
            }

            if (rank > 0) {
                let rewardAmount = 0;
                if (rank === 1) rewardAmount = 10000;
                else if (rank === 2) rewardAmount = 5000;
                else if (rank === 3) rewardAmount = 2500;

                if (!user.claimedLeagueRewards) user.claimedLeagueRewards = [];
                user.claimedLeagueRewards.push(rewardKey);
                user.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(user.balance, 0)) + rewardAmount);
                await user.save();

                emitProfileSync(socket, user);
                socket.emit('quarter_reward', { rank: rank, reward: rewardAmount });
            }

        } catch (err) {
            console.error("Greška pri proveri kvartalne nagrade:", err);
        }
    });

    socket.on('claim_shop_ad_reward', async (data = {}, ack) => {
        const reply = (payload) => {
            socket.emit('shop_ad_reward_result', payload);
            if (typeof ack === 'function') ack(payload);
        };

        try {
            if (!MONGO_URI) {
                reply({ ok: true, reward: SHOP_AD_REWARD_AMOUNT, localFallback: true });
                return;
            }

            const uid = getVerifiedUid(socket);
            if (!uid) {
                socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
                reply({ ok: false, reason: 'auth_required' });
                return;
            }

            const user = await UserProfile.findOne({ firebaseUid: uid });
            if (!user) {
                reply({ ok: false, reason: 'auth_required' });
                return;
            }

            const now = Date.now();
            const lastRewardAt = Math.max(0, toSafeInt(user.lastShopAdRewardAt, 0));
            const elapsed = now - lastRewardAt;

            if (lastRewardAt > 0 && elapsed < SHOP_AD_REWARD_COOLDOWN_MS) {
                reply({
                    ok: false,
                    reason: 'ad_reward_cooldown',
                    retryAfterMs: SHOP_AD_REWARD_COOLDOWN_MS - elapsed
                });
                return;
            }

            user.lastShopAdRewardAt = now;
            user.balance = Math.min(
                MAX_BALANCE,
                Math.max(0, toSafeInt(user.balance, 0)) + SHOP_AD_REWARD_AMOUNT
            );
            await user.save();

            emitProfileSync(socket, user);
            reply({ ok: true, reward: SHOP_AD_REWARD_AMOUNT, balance: user.balance });
        } catch (err) {
            console.error("Greška pri shop ad nagradi:", err);
            reply({ ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('get_previous_quarter_winner', async (data) => {
        try {
            if (!MONGO_URI) return;
            const { year, quarter } = data;
            
            const topScore = await LeagueScore.findOne({ year: year, quarter: quarter })
                                              .sort({ score: -1 })
                                              .lean();
            
            if (topScore) {
                const user = await UserProfile.findOne({ firebaseUid: topScore.playerId }).lean();
                const photoUrl = user && user.photoUrl ? user.photoUrl : '';
                
                socket.emit('previous_quarter_winner_data', {
                    year: year,
                    quarter: quarter,
                    playerName: topScore.playerName,
                    score: topScore.score,
                    photoUrl: photoUrl
                });
            } else {
                socket.emit('previous_quarter_winner_data', null);
            }
        } catch (err) {
            console.error("Greška pri dohvatanju pobednika kvartala:", err);
        }
    });

    socket.on('get_hall_of_fame', async () => {
        try {
            if (!MONGO_URI) return;
            
            const allScores = await LeagueScore.find().sort({ year: 1, quarter: 1, score: -1 }).lean();
            
            let quartersMap = {};
            
            allScores.forEach(s => {
                let key = `${s.year}-Q${s.quarter}`;
                if (!quartersMap[key]) quartersMap[key] = [];
                quartersMap[key].push(s);
            });
            
            let champions = [];
            let medalsCount = {};
            let cycleCounter = 1;
            
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
            
            for (let key in quartersMap) {
                let [yStr, qStr] = key.split('-Q');
                let y = parseInt(yStr);
                let q = parseInt(qStr);
                
                if (y === currentYear && q === currentQuarter) continue;
                
                let qScores = quartersMap[key];
                
                for (let i = 0; i < Math.min(3, qScores.length); i++) {
                    let p = qScores[i];
                    if (!medalsCount[p.playerId]) {
                        const user = await UserProfile.findOne({ firebaseUid: p.playerId }).lean();
                        medalsCount[p.playerId] = {
                            playerId: p.playerId,
                            playerName: p.playerName,
                            photoUrl: user ? user.photoUrl : '',
                            gold: 0, silver: 0, bronze: 0, total: 0
                        };
                    }
                    if (i === 0) medalsCount[p.playerId].gold++;
                    if (i === 1) medalsCount[p.playerId].silver++;
                    if (i === 2) medalsCount[p.playerId].bronze++;
                    medalsCount[p.playerId].total++;
                    
                    if (i === 0) {
                        champions.push({
                            cycle: cycleCounter++,
                            year: y,
                            quarter: q,
                            playerName: p.playerName,
                            photoUrl: medalsCount[p.playerId].photoUrl,
                            score: p.score
                        });
                    }
                }
            }
            
            let medalsList = Object.values(medalsCount);
            medalsList.sort((a, b) => {
                if (b.gold !== a.gold) return b.gold - a.gold;
                if (b.silver !== a.silver) return b.silver - a.silver;
                return b.bronze - a.bronze;
            });
            
            champions.sort((a, b) => b.cycle - a.cycle);
            
            socket.emit('hall_of_fame_data', {
                medals: medalsList,
                champions: champions
            });
            
        } catch (err) {
            console.error("Greška kod Dvorane Slavnih:", err);
        }
    });

    // ==================================================================
    // TOP 3 ZA OVU NEDELJU (AGGREGATE FIX)
    // ==================================================================
    socket.on('get_weekly_top3', async () => {
        try {
            if (!MONGO_URI) return;

            const startOfWeek = getLeaderboardPeriodStart('weekly');

            const topScores = await Score.aggregate([
                { 
                    $match: { 
                        date: { $gte: startOfWeek },
                        $or: [
                            { playerId: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } },
                            { uid: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } }
                        ]
                    } 
                },
                { $addFields: { numScore: { $convert: { input: "$score", to: "double", onError: 0, onNull: 0 } } } },
                { $sort: { numScore: -1 } },
                {
                    $group: {
                        _id: { $ifNull: ["$playerId", "$uid"] },
                        bestEntry: { $first: "$$ROOT" } 
                    }
                },
                { $replaceRoot: { newRoot: "$bestEntry" } }, 
                { $sort: { numScore: -1 } },
                { $limit: 3 }
            ]);

            const formattedTop3 = topScores.map(s => ({
                name: s.playerName,
                score: s.score,
                photoUrl: s.photoUrl || ''
            }));

            socket.emit('weekly_top3_data', formattedTop3);
        } catch (err) {
            console.error("Greška pri dohvatanju Weekly Top 3:", err);
        }
    });
    // ==================================================================

    // ==================================================================
    // GLOBALNA TOP LISTA (AGGREGATE FIX)
    // ==================================================================
    socket.on('get_global_highscores', async (period) => {
        try {
            if (!MONGO_URI) return; 

            let matchFilter = {
                $or: [
                    { playerId: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } },
                    { uid: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } }
                ]
            };
            
            if (period === 'weekly') {
                matchFilter.date = { $gte: getLeaderboardPeriodStart('weekly') };
            } else if (period === 'monthly') {
                matchFilter.date = { $gte: getLeaderboardPeriodStart('monthly') };
            }

            const scores = await Score.aggregate([
                { $match: matchFilter },
                { $addFields: { numScore: { $convert: { input: "$score", to: "double", onError: 0, onNull: 0 } } } },
                { $sort: { numScore: -1 } }, 
                {
                    $group: {
                        _id: { $ifNull: ["$playerId", "$uid"] }, 
                        bestEntry: { $first: "$$ROOT" } 
                    }
                },
                { $replaceRoot: { newRoot: "$bestEntry" } },
                { $sort: { numScore: -1 } }, 
                { $limit: 100 }
            ]);
            
            const formattedScores = scores.map(s => ({
                ...s,
                uid: s.playerId || s.uid 
            }));

            socket.emit('global_highscores_data', formattedScores);
        } catch (err) {
            console.error("Greška pri dohvatanju skorova:", err);
            socket.emit('global_highscores_data', []); 
        }
    });

    socket.on('submit_score', async (data, ack) => {
        const replyScoreSubmit = (ok, reason = null, permanent = !ok) => {
            const result = { ok, reason, permanent };
            if (typeof ack === 'function') ack(result);
            if (!ok) socket.emit('score_submit_rejected', result);
            return result;
        };

        try {
            if (!MONGO_URI) return replyScoreSubmit(false, 'db_unavailable', false);

            const submittedScore = Number(data?.score);
            if (!Number.isInteger(submittedScore)) return replyScoreSubmit(false, 'invalid_score_type');

            const finalUid = socket.verifiedUid || socket.playerId;

            if (typeof finalUid !== 'string' || finalUid.length === 0 || finalUid.startsWith('guest_') || finalUid.length < 20) {
                return replyScoreSubmit(false, 'invalid_player');
            }

            if (submittedScore <= 0 || submittedScore > MAX_SCORE) {
                console.log(`🚨 HACK POKUSAJ (Value): ${socket.id} salje nemoguc skor: ${submittedScore}`);
                return replyScoreSubmit(false, 'score_out_of_range');
            }

            const startTime = gameStartTimes[socket.id];

            if (!startTime) {
                console.log(`🚨 HACK POKUSAJ (No Session): ${socket.id} pokusava upis skora ${submittedScore} bez aktivne server sesije.`);
                return replyScoreSubmit(false, 'missing_game_session');
            }

            const duration = Date.now() - startTime;
            if (duration < MIN_GAME_DURATION) {
                console.log(`🚨 HACK POKUSAJ (Speed): Trajanje ${duration}ms. Blokiram skor: ${submittedScore}`);
                return replyScoreSubmit(false, 'game_too_short');
            }

            if (duration > MAX_GAME_DURATION) {
                console.log(`🚨 HACK POKUSAJ (Stale Session): Trajanje ${duration}ms. Blokiram skor: ${submittedScore}`);
                return replyScoreSubmit(false, 'stale_game_session');
            }

            let finalName = (socket.playerName || data?.playerName || "Nepoznat Igrač").toString().trim().substring(0, MAX_NAME_LENGTH);
            if (!finalName) finalName = "Nepoznat Igrač";
            let finalPhoto = (socket.photoUrl || data?.photoUrl || '').toString().substring(0, 500);
            let finalMode = (data?.mode || 'Solo').toString().trim().substring(0, 24) || 'Solo';

            const newScore = new Score({
                playerId: finalUid,
                playerName: finalName,
                score: submittedScore,
                mode: finalMode,
                photoUrl: finalPhoto,
                date: Date.now()
            });

            await newScore.save();
            console.log(`✅ USPESAN UPIS: ${finalName} (UID: ${finalUid}) -> ${submittedScore} (${newScore.mode})`);

            const rewardSession = {
                uid: finalUid,
                socketId: socket.id,
                score: submittedScore,
                mode: finalMode,
                createdAt: Date.now()
            };
            const previousRewardSession = pendingGameRewardsByUid[finalUid];
            if (previousRewardSession && previousRewardSession.socketId) {
                delete pendingGameRewards[previousRewardSession.socketId];
            }
            pendingGameRewards[socket.id] = rewardSession;
            pendingGameRewardsByUid[finalUid] = rewardSession;
            setTimeout(() => {
                if (pendingGameRewards[socket.id] === rewardSession) {
                    delete pendingGameRewards[socket.id];
                }
                if (pendingGameRewardsByUid[finalUid] === rewardSession) {
                    delete pendingGameRewardsByUid[finalUid];
                }
            }, GAME_REWARD_CLAIM_WINDOW_MS);

            delete gameStartTimes[socket.id];
            return replyScoreSubmit(true);

        } catch (err) {
            console.error("❌ Greška pri upisu u MongoDB:", err);
            return replyScoreSubmit(false, 'server_error', false);
        }
    });

    socket.on('claim_game_reward', async (data = {}, ack) => {
        const replyGameReward = (payload) => {
            if (typeof ack === 'function') ack(payload);
            socket.emit('game_reward_result', payload);
            return payload;
        };

        try {
            const finalUid = socket.verifiedUid || socket.playerId;
            if (typeof finalUid !== 'string' || finalUid.length === 0 || finalUid.startsWith('guest_') || finalUid.length < 20) {
                return replyGameReward({ ok: false, reason: 'invalid_player', permanent: true });
            }

            if (!MONGO_URI) {
                const localScore = Math.max(0, Math.min(MAX_SCORE, toSafeInt(data?.score, 0)));
                const localReward = Math.min(MAX_REWARD_PER_GAME, localScore * (data?.doubled ? 2 : 1));
                return replyGameReward({ ok: true, localFallback: true, reward: localReward });
            }

            const rewardSession = pendingGameRewards[socket.id] || pendingGameRewardsByUid[finalUid];
            if (!rewardSession || rewardSession.uid !== finalUid) {
                return replyGameReward({ ok: false, reason: 'missing_reward_session', permanent: false });
            }

            if (Date.now() - rewardSession.createdAt > GAME_REWARD_CLAIM_WINDOW_MS) {
                delete pendingGameRewards[socket.id];
                clearPendingGameRewardSession(finalUid, rewardSession);
                return replyGameReward({ ok: false, reason: 'reward_session_expired', permanent: true });
            }

            const submittedScore = Number(data?.score);
            if (Number.isFinite(submittedScore) && Math.floor(submittedScore) !== rewardSession.score) {
                return replyGameReward({ ok: false, reason: 'score_mismatch', permanent: true });
            }

            const multiplier = data?.doubled ? 2 : 1;
            const reward = Math.max(0, Math.min(MAX_REWARD_PER_GAME, rewardSession.score * multiplier));
            const user = await UserProfile.findOne({ firebaseUid: finalUid });
            if (!user) {
                return replyGameReward({ ok: false, reason: 'profile_not_found', permanent: false });
            }

            if (data?.stats && typeof data.stats === 'object') {
                const statsGuard = applyProfileStatsGuard(user, data.stats);
                user.unlockedTrophies = statsGuard.acceptedTrophies;
            }

            user.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(user.balance, 0)) + reward);
            await user.save();
            delete pendingGameRewards[socket.id];
            clearPendingGameRewardSession(finalUid, rewardSession);

            emitProfileSync(socket, user, {
                gameReward: {
                    reward,
                    balance: user.balance,
                    doubled: multiplier === 2
                }
            });

            return replyGameReward({
                ok: true,
                reward,
                balance: user.balance,
                doubled: multiplier === 2
            });
        } catch (err) {
            console.error("❌ claim_game_reward greška:", err);
            return replyGameReward({ ok: false, reason: 'server_error', permanent: false });
        }
    });

    socket.on('get_league_highscores', async (reqData) => {
        try {
            if (!MONGO_URI) {
                socket.emit('league_highscores_data', [
                    { playerName: "Mock Šampion", score: 105400 },
                    { playerName: "Mock Igrač", score: 85200 },
                ]);
                return;
            }
            
            const year = reqData?.year || new Date().getFullYear();
            const quarter = reqData?.quarter || (Math.floor(new Date().getMonth() / 3) + 1);
            
            const scores = await LeagueScore.find({ year: year, quarter: quarter })
                                            .sort({ score: -1 })
                                            .limit(50)
                                            .lean();
                                            
            socket.emit('league_highscores_data', scores);
        } catch (err) {
            console.error("Greška pri dohvatanju kvartalne lige:", err);
            socket.emit('league_highscores_data', []);
        }
    });

    socket.on('get_league_alltime_highscores', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('league_alltime_data', [
                    { playerName: "Mock Legenda", score: 250000 },
                    { playerName: "Mock Majstor", score: 145000 },
                ]);
                return;
            }
            
            const allTimeScores = await LeagueScore.aggregate([
                {
                    $group: {
                        _id: "$playerId",
                        playerName: { $last: "$playerName" },
                        photoUrl: { $last: "$photoUrl" }, 
                        score: { $sum: "$score" }
                    }
                },
                { $sort: { score: -1 } },
                { $limit: 50 }
            ]);
            
            socket.emit('league_alltime_data', allTimeScores);
        } catch (err) {
            console.error("Greška pri dohvatanju All-Time lige:", err);
            socket.emit('league_alltime_data', []);
        }
    });

    socket.on('submit_league_score', async (data, ack) => {
        const replyLeagueSubmit = (ok, reason = null, permanent = !ok, extra = {}) => {
            const result = { ok, reason, permanent, ...extra };
            if (typeof ack === 'function') ack(result);
            if (!ok) socket.emit('league_score_rejected', result);
            return result;
        };

        try {
            if (!MONGO_URI) return replyLeagueSubmit(false, 'db_unavailable', false);

            const submittedScore = Number(data?.score);
            const submittedYear = Number(data?.year);
            const submittedQuarter = Number(data?.quarter);
            const uniqueId = socket.verifiedUid || socket.playerId || registeredSockets[socket.id];

            if (typeof uniqueId !== 'string' || uniqueId.length === 0 || uniqueId.startsWith('guest_') || uniqueId.startsWith('usr_') || uniqueId.length < 20) {
                return replyLeagueSubmit(false, 'invalid_player');
            }

            if (!Number.isInteger(submittedScore) || submittedScore < 0 || submittedScore > MAX_LEAGUE_SCORE) {
                return replyLeagueSubmit(false, 'score_out_of_range');
            }

            if (!Number.isInteger(submittedYear) || !Number.isInteger(submittedQuarter) || submittedQuarter < 1 || submittedQuarter > 4) {
                return replyLeagueSubmit(false, 'invalid_period');
            }

            const currentPeriod = getServerQuarterInfo();
            if (submittedYear !== currentPeriod.year || submittedQuarter !== currentPeriod.quarter) {
                return replyLeagueSubmit(false, 'stale_period');
            }

            let rawName = (socket.playerName || data?.playerName || "Nepoznat Igrač").toString().trim().substring(0, MAX_NAME_LENGTH);
            let finalName = sadrziPsovku(rawName)
                ? "Igrač_" + Math.floor(1000 + Math.random() * 9000)
                : rawName;

            if (finalName.length === 0) finalName = "Nepoznat Igrač";

            const [currentDoc, profileUser] = await Promise.all([
                LeagueScore.findOne({ playerId: uniqueId, year: submittedYear, quarter: submittedQuarter }),
                UserProfile.findOne({ firebaseUid: uniqueId })
            ]);
            const currentScore = currentDoc ? Number(currentDoc.score) || 0 : 0;
            const profileLeague = profileUser ? normalizeUserLeagueDataForCurrentPeriod(profileUser) : null;
            const profileScore = profileLeague && isCurrentLeaguePeriod(profileLeague)
                ? Number(profileLeague.quarterlyScore) || 0
                : 0;
            const trustedScore = Math.max(currentScore, profileScore);
            const delta = submittedScore - trustedScore;

            if (delta > MAX_LEAGUE_SCORE_DELTA) {
                console.log(`🚨 LEADERBOARD SAFEGUARD: Blokiran skok lige sa ${trustedScore} na ${submittedScore}`);
                return replyLeagueSubmit(false, 'league_jump_too_large');
            }

            if (delta > 0) {
                const startTime = gameStartTimes[socket.id];
                const duration = startTime ? Date.now() - startTime : 0;
                if (!startTime || duration < MIN_LEAGUE_SESSION_DURATION || duration > MAX_GAME_DURATION) {
                    return replyLeagueSubmit(false, 'invalid_game_session');
                }
            }

            const acceptedScore = Math.max(trustedScore, submittedScore);
            const photoUrl = (socket.photoUrl || data?.photoUrl || '').toString().substring(0, 500);
            const savedLeagueScore = await LeagueScore.findOneAndUpdate(
                { playerId: uniqueId, year: submittedYear, quarter: submittedQuarter },
                {
                    $set: {
                        playerName: finalName,
                        photoUrl,
                        date: Date.now()
                    },
                    $max: { score: acceptedScore }
                },
                { upsert: true, new: true }
            );
            const savedScore = Math.max(Number(savedLeagueScore?.score) || 0, acceptedScore);
            let syncedLeagueData = {
                year: submittedYear,
                quarter: submittedQuarter,
                baselineScore: profileLeague?.baselineScore || 0,
                quarterlyScore: savedScore
            };

            if (profileUser) {
                syncedLeagueData = mergeLeagueDataIntoUser(profileUser, syncedLeagueData);
                profileUser.playerName = finalName;
                profileUser.photoUrl = photoUrl;
                await profileUser.save();
                emitProfileSync(socket, profileUser, {
                    leagueSubmit: {
                        score: savedScore,
                        keptExisting: submittedScore < savedScore
                    }
                });
            }

            return replyLeagueSubmit(true, null, false, {
                score: savedScore,
                leagueData: syncedLeagueData,
                keptExisting: submittedScore < savedScore
            });
        } catch (err) {
            console.error("Greška pri upisu u kvartalnu ligu:", err);
            return replyLeagueSubmit(false, 'server_error', false);
        }
    });

    // ==================================================================
    // TOP LISTA VATRENOG NIZA (MAX FIX + TRENUTNI NIZ)
    // ==================================================================
    socket.on('get_streak_leaderboard', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('streak_leaderboard_data', []);
                return;
            }

            // Prvo dohvatamo sve koji imaju bilo kakav niz
            const users = await UserProfile.find({
                $or: [
                    { maxWinStreak: { $gt: 0 } },
                    { currentWinStreak: { $gt: 0 } }
                ]
            }).select('firebaseUid playerName photoUrl maxWinStreak currentWinStreak').lean();

            // Sortiramo ih po najvećem ikada ostvarenom nizu (max od maxWinStreak i currentWinStreak)
            const sortedStreaks = users
                .sort((a, b) => {
                    let maxA = Math.max((a.maxWinStreak || 0), (a.currentWinStreak || 0));
                    let maxB = Math.max((b.maxWinStreak || 0), (b.currentWinStreak || 0));
                    return maxB - maxA;
                })
                .slice(0, 50); // Uzimamo TOP 50

            const dataToSend = sortedStreaks.map(p => {
                let maxStreak = Math.max((p.maxWinStreak || 0), (p.currentWinStreak || 0));
                return {
                    uid: p.firebaseUid,
                    name: p.playerName,
                    photoUrl: p.photoUrl || '',
                    maxWinStreak: maxStreak,
                    currentWinStreak: p.currentWinStreak || 0
                };
            });

            socket.emit('streak_leaderboard_data', dataToSend);
        } catch (err) {
            console.error("Greška pri dohvatanju streak liste:", err);
            socket.emit('streak_leaderboard_data', []);
        }
    });
    // ==================================================================

    socket.on('get_power_index_leaderboard', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('power_index_data', []);
                return;
            }

            const users = await UserProfile.find({ games: { $gt: 0 } }).lean();

            const rankedPlayers = users.map(user => {
                let totalCompetitive = (user.wins || 0) + (user.losses || 0);
                let rate = totalCompetitive > 0 ? ((user.wins || 0) / totalCompetitive) * 100 : 0;
                let avg = (user.games || 0) > 0 ? (user.totalScoreSum || 0) / user.games : 0;
                let hs = user.highscore || 0;
                let maxStreak = user.maxWinStreak || 0;
                let tourneyWins = user.tournamentWins || 0;
                
                let leaguePts = 0;
                if (user.leagueData && user.leagueData.quarterlyScore) {
                    leaguePts = user.leagueData.quarterlyScore;
                }

                let trophyCount = 0;
                if (user.unlockedTrophies) {
                    const ALL_TROPHY_IDS = ['first_play', 'apprentice', 'kafana', 'score_1000', 'grandmaster', 'legend', 'mythic', 'godlike', 'surgeon', 'prophet', 'sniper', 'math', 'sveti_ilija', 'hazard', 'firecracker', 'concrete', 'perfectionist', 'miner', 'immortal', 'potato', 'minimal', 'achilles', 'close_call', 'night_owl', 'spite', 'veteran'];
                    user.unlockedTrophies.forEach(t => { if(ALL_TROPHY_IDS.includes(t)) trophyCount++; });
                }

                const basePI = Math.round(
                    (rate * 10) + (leaguePts * 0.02) + (tourneyWins * 300) + 
                    (avg * 0.5) + (hs * 0.2) + (maxStreak * 30) + (trophyCount * 50)
                );

                const penalty = user.penaltyPoints || 0;
                const power = Math.max(0, basePI - penalty); 

                return {
                    playerName: user.playerName,
                    photoUrl: user.photoUrl || '',
                    powerIndex: power
                };
            });

            rankedPlayers.sort((a, b) => b.powerIndex - a.powerIndex);
            const top50 = rankedPlayers.slice(0, 50);

            socket.emit('power_index_data', top50);
        } catch (err) {
            console.error("Greška pri dohvatanju Power Index liste:", err);
            socket.emit('power_index_data', []);
        }
    });

    socket.on('search_player', async (query) => {
        if (!MONGO_URI) return;
        try {
            const regex = new RegExp('^' + query + '$', 'i'); 
            const users = await UserProfile.find({ playerName: regex }).limit(5);

            const results = users.map(u => {
                let friendSocketId = onlinePlayers[u.firebaseUid];
                let isOnline = false;

                if (friendSocketId) {
                    const actualSocket = io.sockets.sockets.get(friendSocketId);
                    if (actualSocket && actualSocket.connected) {
                        isOnline = true;
                    } else {
                        delete onlinePlayers[u.firebaseUid];
                        friendSocketId = null;
                    }
                }

                return {
                    uid: u.firebaseUid,
                    name: u.playerName,
                    photoUrl: u.photoUrl,
                    socketId: friendSocketId
                };
            });
            socket.emit('search_results', results);
        } catch(err) {
            console.error(err);
        }
    });

    socket.on('send_friend_req', async (data) => {
        const { targetId, targetUid, challengerName } = data;
        if (!MONGO_URI) return;

        try {
            const me = await UserProfile.findOne({ firebaseUid: socket.playerId });
            const targetProfile = await UserProfile.findOne({ firebaseUid: targetUid });
            
            if (me && targetProfile) {
                if (!targetProfile.friends.includes(me.firebaseUid) && !targetProfile.friendRequests.includes(me.firebaseUid)) {
                    targetProfile.friendRequests.push(me.firebaseUid);
                    await targetProfile.save();
                }
                
                const targetSocketId = onlinePlayers[targetUid];
                if (targetSocketId) {
                    io.to(targetSocketId).emit('incoming_friend_req', {
                        challengerName: me.playerName
                    });
                }
            }
        } catch(e) { console.error(e); }
    });

    socket.on('resolve_friend_req', async (data) => {
        const { challengerUid, accepted } = data;
        if (!MONGO_URI) return;

        try {
            const me = await UserProfile.findOne({ firebaseUid: socket.playerId });
            const friend = await UserProfile.findOne({ firebaseUid: challengerUid });

            if (me && friend) {
                me.friendRequests = me.friendRequests.filter(uid => uid !== challengerUid);
                
                if (accepted) {
                    if (!me.friends.includes(friend.firebaseUid)) me.friends.push(friend.firebaseUid);
                    if (!friend.friends.includes(me.firebaseUid)) friend.friends.push(me.firebaseUid);
                }
                await me.save();
                await friend.save();

                const challengerSocketId = onlinePlayers[challengerUid];
                if (accepted) {
                    if (challengerSocketId) io.to(challengerSocketId).emit('friend_req_accepted', { name: me.playerName });
                } else {
                    if (challengerSocketId) io.to(challengerSocketId).emit('friend_req_declined', { name: me.playerName });
                }
            }
        } catch(err) { console.error(err); }
    });

    socket.on('get_friends_list', async () => {
        if (!MONGO_URI) return;
        try {
            const me = await UserProfile.findOne({ firebaseUid: socket.playerId });
            if (me) {
                let friendsData = [];
                let requestsData = [];

                if (me.friends && me.friends.length > 0) {
                    const friends = await UserProfile.find({ firebaseUid: { $in: me.friends } });
                    friendsData = friends.map(f => {
                        let friendSocketId = onlinePlayers[f.firebaseUid];
                        let isOnline = false;

                        if (friendSocketId) {
                            const actualSocket = io.sockets.sockets.get(friendSocketId);
                            if (actualSocket && actualSocket.connected) {
                                isOnline = true;
                            } else {
                                delete onlinePlayers[f.firebaseUid];
                                friendSocketId = null;
                            }
                        }

                        const h2hRecord = buildH2HRecordSummary(f.h2hStats);

                        return { 
                            uid: f.firebaseUid, 
                            socketId: friendSocketId,
                            name: f.playerName, 
                            photoUrl: f.photoUrl, 
                            isOnline: isOnline,
                            stats: { 
                                wins: f.wins, 
                                losses: f.losses, 
                                games: f.games,
                                highscore: f.highscore,
                                totalScoreSum: f.totalScoreSum, 
                                tournamentWins: f.tournamentWins, 
                                currentWinStreak: f.currentWinStreak, 
                                maxWinStreak: f.maxWinStreak, 
                                unlockedTrophies: f.unlockedTrophies, 
                                leagueData: f.leagueData,
                                penaltyPoints: f.penaltyPoints || 0,
                                h2hWins: h2hRecord.wins,
                                h2hLosses: h2hRecord.losses,
                                h2hDraws: h2hRecord.draws,
                                h2hGames: h2hRecord.games
                            },
                            h2hRecord
                        };
                    });
                }
                
                if (me.friendRequests && me.friendRequests.length > 0) {
                    const requests = await UserProfile.find({ firebaseUid: { $in: me.friendRequests } });
                    requestsData = requests.map(r => ({
                        uid: r.firebaseUid,
                        name: r.playerName,
                        photoUrl: r.photoUrl
                    }));
                }

                socket.emit('friends_list_data', { friends: friendsData, requests: requestsData });
            } else {
                socket.emit('friends_list_data', { friends: [], requests: [] });
            }
        } catch(err) { console.error(err); }
    });

    socket.on('send_room_invite', (data) => {
        const { targetSocketId, roomId } = data;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
            // FIX: Zabrana poziva u privatnu sobu ako je igrač već u online partiji
            const targetRoom = playerRooms[targetSocketId];
            if (targetRoom && !targetRoom.startsWith('local_')) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

            const hostName = `${sanitizeTournamentName(socket.playerName || 'Igrač')}|||${socket.id}`;
            socket.to(targetSocketId).emit('incoming_room_invite', { roomId, hostName });
        } else {
            socket.emit('error_msg', 'err_player_not_on_server');
        }
    });

    socket.on('find_game', (data) => {
        let nickname = typeof data === 'string' ? data : data.nickname;
        let photoUrl = typeof data === 'string' ? '' : data.photoUrl;

        if (waitingPlayer && waitingPlayer.id === socket.id) return; 

        if (waitingPlayer) {
            const opponentId = waitingPlayer.id;
            const opponentName = waitingPlayer.nickname;
            const opponentStats = waitingPlayer.stats;
            const opponentPhoto = waitingPlayer.photoUrl;
            
            const opponentSocket = io.sockets.sockets.get(opponentId);

            if (opponentSocket) {
                const roomId = `room_${opponentId}_${socket.id}`;
                waitingPlayer = null; 

                socket.join(roomId);
                opponentSocket.join(roomId);

                playerRooms[socket.id] = roomId;
                playerRooms[opponentId] = roomId;
                
                gameStartTimes[socket.id] = Date.now();
                gameStartTimes[opponentId] = Date.now();

                console.log(`⚔️ RANDOM MATCH: ${nickname} vs ${opponentName} (Room: ${roomId})`);

                io.to(opponentId).emit('game_start', { 
                    roomId: roomId, opponent: nickname, oppStats: socket.playerStats, oppPhoto: photoUrl, myIndex: 0 
                });
                socket.emit('game_start', { 
                    roomId: roomId, opponent: opponentName, oppStats: opponentStats, oppPhoto: opponentPhoto, myIndex: 1 
                });

                roomState[roomId] = { 
                    players: [opponentId, socket.id], 
                    playerNames: [opponentName, nickname], 
                    turnIndex: 0,
                    moveCount: 0,
                    allScores: createEmptyScores(),
                    kockiceVals: [0,0,0,0,0,0],
                    zadrzane: [false,false,false,false,false,false],
                    brojBacanja: 0,
                    najavaAktivna: false,
                    najavljenoPolje: null
                };
                startTurnTimer(roomId); 

            } else {
                waitingPlayer = { id: socket.id, nickname: nickname, stats: socket.playerStats, photoUrl: photoUrl };
                socket.emit('waiting_for_opponent');
            }
        } else {
            waitingPlayer = { id: socket.id, nickname: nickname, stats: socket.playerStats, photoUrl: photoUrl };
            socket.emit('waiting_for_opponent');
            console.log(`⏳ ${nickname} čeka random protivnika...`);
        }
    });

    socket.on('join_private_game', (data) => {
        let nickname = data.nickname || data;
        let roomId = data.roomId;
        let photoUrl = data.photoUrl || '';
        console.log(`🏠 Zahtev za Private sobu: ${roomId} od ${nickname}`);

        if (!roomId) { socket.emit('error_msg', 'err_invalid_room'); return; }

        if (!privateRooms[roomId]) {
            privateRooms[roomId] = { p1: { id: socket.id, name: nickname, stats: socket.playerStats, photoUrl: photoUrl } };
            socket.join(roomId);
            playerRooms[socket.id] = roomId;
            socket.emit('private_waiting', { roomId });
            console.log(`--> Soba ${roomId} kreirana. Čeka se P2.`);
        } 
        else if (!privateRooms[roomId].p2) {
            const p1 = privateRooms[roomId].p1;
            const p1Socket = io.sockets.sockets.get(p1.id);
            
            if (!p1Socket) {
                console.log("--> Host je nestao. Postajem novi host.");
                privateRooms[roomId] = { p1: { id: socket.id, name: nickname, stats: socket.playerStats, photoUrl: photoUrl } };
                socket.join(roomId); playerRooms[socket.id] = roomId;
                socket.emit('private_waiting', { roomId });
                return;
            }

            if (p1.id === socket.id) return; 

            privateRooms[roomId].p2 = { id: socket.id, name: nickname };
            socket.join(roomId);
            playerRooms[socket.id] = roomId; playerRooms[p1.id] = roomId;
            gameStartTimes[socket.id] = Date.now(); gameStartTimes[p1.id] = Date.now();

            console.log(`⚔️ PRIVATE MATCH: ${p1.name} vs ${nickname} u sobi ${roomId}`);

            io.to(p1.id).emit('game_start', { roomId: roomId, opponent: nickname, oppStats: socket.playerStats, oppPhoto: photoUrl, myIndex: 0 });
            socket.emit('game_start', { roomId: roomId, opponent: p1.name, oppStats: p1.stats, oppPhoto: p1.photoUrl, myIndex: 1 });

            roomState[roomId] = { 
                players: [p1.id, socket.id], 
                playerNames: [p1.name, nickname], 
                turnIndex: 0,
                moveCount: 0,
                allScores: createEmptyScores(),
                kockiceVals: [0,0,0,0,0,0],
                zadrzane: [false,false,false,false,false,false],
                brojBacanja: 0,
                najavaAktivna: false,
                najavljenoPolje: null
            };
            startTurnTimer(roomId); 

            delete privateRooms[roomId]; 
        } else {
            socket.emit('room_full');
        }
    });

    const relayEvent = (eventName, data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            const state = roomState[roomId];
            
            if (state && ['remote_move', 'remote_roll', 'remote_hold', 'remote_announce'].includes(eventName)) {
                const playerIndex = state.players.indexOf(socket.id);
                
                if (playerIndex === -1 || state.turnIndex !== playerIndex) {
                    console.warn(`🚨 BLOKIRAN LAG/POTEZ (${eventName}) - Igrač: ${socket.id}, Na potezu je: ${state.turnIndex}`);
                    
                    // ---> FIX: SERVER POPRAVLJA DESINHRONIZACIJU <---
                    const playerNamesToSync = state.playerNames || state.players.map(id => {
                        const pSocket = io.sockets.sockets.get(id);
                        return pSocket && pSocket.playerName ? pSocket.playerName : "Igrač";
                    });

                    socket.emit('sync_state_response', {
                        roomId: roomId,
                        myIndex: playerIndex !== -1 ? playerIndex : 0, 
                        players: playerNamesToSync, 
                        allScores: state.allScores || createEmptyScores(),
                        currentPlayerIdx: state.turnIndex,
                        brojBacanja: state.brojBacanja || 0,
                        kockiceVals: state.kockiceVals || [0,0,0,0,0,0],
                        zadrzane: state.zadrzane || [false,false,false,false,false,false],
                        najavaAktivna: state.najavaAktivna || false,
                        najavljenoPolje: state.najavljenoPolje || null
                    });
                    
                    return; 
                }

                if (eventName === 'remote_move') {
                    if (!state.allScores) state.allScores = createEmptyScores();
                    if (state.allScores[data.pIdx] && state.allScores[data.pIdx][data.col]) {
                        state.allScores[data.pIdx][data.col][data.row] = data.points;
                    }
                    state.brojBacanja = 0;
                    state.zadrzane = [false,false,false,false,false,false];
                    state.najavaAktivna = false;
                    state.najavljenoPolje = null;
                }
                else if (eventName === 'remote_roll') {
                    state.kockiceVals = data.values;
                    state.brojBacanja = data.bacanje;
                    if (data.held) state.zadrzane = data.held;
                }
                else if (eventName === 'remote_hold') {
                    if (!state.zadrzane) state.zadrzane = [false,false,false,false,false,false];
                    state.zadrzane[data.index] = data.status;
                }
                else if (eventName === 'remote_announce') {
                    if (data.type === 'start') state.najavaAktivna = true;
                    else if (data.type === 'cancel') state.najavaAktivna = false;
                    else if (data.type === 'selected') {
                        state.najavaAktivna = false;
                        state.najavljenoPolje = { row: data.row, col: 'Najava' };
                    }
                }
            }

            socket.to(roomId).emit(eventName, data);

            if (eventName === 'remote_move' && roomState[roomId]) {
                roomState[roomId].moveCount = (roomState[roomId].moveCount || 0) + 1; 
                roomState[roomId].turnIndex = roomState[roomId].turnIndex === 0 ? 1 : 0;
                startTurnTimer(roomId); 
            }
        }
    };

    socket.on('dice_roll', (data) => relayEvent('remote_roll', data));
    socket.on('dice_hold', (data) => relayEvent('remote_hold', data));
    socket.on('player_move', (data) => relayEvent('remote_move', data));
    socket.on('announce', (data) => relayEvent('remote_announce', data));
    
    // --- OVO JE ISPRAVLJENO U KORAKU 2 (Bezbedan State Sync + Prevencija lažne pobede) ---
    socket.on('request_state_sync', (data) => {
        // Ako socket još nije ubačen u sobu (mikro-delay kod rekonekcije), probaj iz payload-a
        const roomId = playerRooms[socket.id] || (data && data.roomId);

        if (roomId && roomState[roomId]) {
            const state = roomState[roomId];
            console.log(`🛡️ SERVER SYNC: Šaljem bezbedno autoritativno stanje sobe ${roomId} igraču ${socket.id}`);
            
            const playerNamesToSync = state.playerNames || state.players.map(id => {
                const pSocket = io.sockets.sockets.get(id);
                return pSocket && pSocket.playerName ? pSocket.playerName : "Igrač";
            });

            socket.emit('sync_state_response', {
                roomId: roomId,
                myIndex: state.players.indexOf(socket.id), 
                players: playerNamesToSync, 
                allScores: state.allScores || createEmptyScores(),
                currentPlayerIdx: state.turnIndex,
                brojBacanja: state.brojBacanja || 0,
                kockiceVals: state.kockiceVals || [0,0,0,0,0,0],
                zadrzane: state.zadrzane || [false,false,false,false,false,false],
                najavaAktivna: state.najavaAktivna || false,
                najavljenoPolje: state.najavljenoPolje || null
            });
        } else if (roomId) {
             // Pitaj protivnika za state ako je na serveru izgubljen, ALI SAMO AKO JE PROTIVNIK TU
             const clients = io.sockets.adapter.rooms.get(roomId);
             if (clients && clients.size > 0 && Array.from(clients).some(c => c !== socket.id)) {
                 socket.to(roomId).emit('request_state_sync', { senderSocketId: socket.id });
             } else {
                 // Protivnik nije tu, partija je zvanično mrtva!
                 socket.emit('force_cancel_online');
             }
        } else {
            // Ako soba više ne postoji (istekao grace period)
            socket.emit('force_cancel_online'); // Izbacujemo ga nazad u meni
        }
    });

    socket.on('sync_state_response', (data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            if (roomState[roomId]) {
                const state = roomState[roomId];
                
                state.allScores = data.allScores || state.allScores;
                state.turnIndex = data.currentPlayerIdx !== undefined ? data.currentPlayerIdx : state.turnIndex;
                state.brojBacanja = data.brojBacanja || 0;
                state.kockiceVals = data.kockiceVals || [0,0,0,0,0,0];
                state.zadrzane = data.zadrzane || [false,false,false,false,false,false];
                state.najavaAktivna = data.najavaAktivna || false;
                state.najavljenoPolje = data.najavljenoPolje || null;
                
                if (data.brojBacanja === 0) {
                    state.moveCount = Math.max(0, (state.moveCount || 0) - 1);
                }

                startTurnTimer(roomId);
            }
            
            socket.to(roomId).emit('sync_state_response', data);
        }
    });

    socket.on('chat_msg', (data) => relayEvent('chat_msg', data));

    socket.on('request_global_chat_history', () => {
        socket.emit('global_chat_history', globalChatHistory);
    });

    socket.on('global_chat_msg', async (data) => {
        if (!data || !data.msg) return;

        if (!socket.playerName || !socket.verifiedUid) {
            socket.emit('error_msg', 'err_chat_auth_required');
            return;
        }
        
        let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

        const now = Date.now();
        let chatProfile = null;

        if (MONGO_URI) {
            try {
                chatProfile = await UserProfile.findOne({ firebaseUid: socket.verifiedUid })
                    .select('chatBanUntil chatBanStrikes')
                    .lean();

                if (chatProfile && toSafeInt(chatProfile.chatBanUntil, 0) > now) {
                    socket.emit('error_msg', 'err_chat_suspended');
                    return;
                }
            } catch (err) {
                console.error('Greška pri proveri chat bana:', err);
            }
        }

        if (!MONGO_URI && chatBans[clientIp] && chatBans[clientIp].banUntil > now) {
            socket.emit('error_msg', 'err_chat_suspended');
            return; 
        }

        const originalMsg = data.msg.toString().replace(/\s+/g, ' ').trim().substring(0, 550).trim();
        if (!originalMsg) return;

        const rateKey = socket.verifiedUid;
        const rateState = globalChatRateLimits[rateKey] || { lastAt: 0, spamStrikes: 0, mutedUntil: 0 };

        if (rateState.mutedUntil && rateState.mutedUntil > now) {
            socket.emit('error_msg', 'err_chat_slow_down');
            return;
        }

        const lastGlobalChatAt = rateState.lastAt || 0;
        if (now - lastGlobalChatAt < GLOBAL_CHAT_MIN_INTERVAL_MS) {
            rateState.spamStrikes = (rateState.spamStrikes || 0) + 1;
            rateState.lastSeenAt = now;
            if (rateState.spamStrikes >= GLOBAL_CHAT_SPAM_STRIKE_LIMIT) {
                rateState.mutedUntil = now + GLOBAL_CHAT_SPAM_MUTE_MS;
                rateState.spamStrikes = 0;
            }
            globalChatRateLimits[rateKey] = rateState;
            socket.emit('error_msg', 'err_chat_slow_down');
            return;
        }

        rateState.lastAt = now;
        rateState.lastSeenAt = now;
        rateState.spamStrikes = 0;
        globalChatRateLimits[rateKey] = rateState;

        const safeSender = socket.playerName.toString().substring(0, 20);

        const safeMsg = cenzurisiPoruku(originalMsg);

        if (safeMsg !== originalMsg) {
            if (MONGO_URI) {
                const currentStrikes = Math.max(0, toSafeInt(chatProfile?.chatBanStrikes, 0));
                const nextStrikes = currentStrikes + 1;
                const banDurationMs = Math.pow(2, nextStrikes - 1) * GLOBAL_CHAT_PROFANITY_BAN_BASE_MS;
                const banUntil = now + banDurationMs;

                try {
                    await UserProfile.findOneAndUpdate(
                        { firebaseUid: socket.verifiedUid },
                        { $set: { chatBanUntil: banUntil }, $inc: { chatBanStrikes: 1 } },
                        { upsert: false }
                    );

                    const GlobalChatModerationLog = mongoose.model('GlobalChatModerationLog');
                    await GlobalChatModerationLog.create({
                        uid: socket.verifiedUid,
                        playerName: safeSender,
                        socketId: socket.id,
                        ip: clientIp || '',
                        originalMsg,
                        filteredMsg: safeMsg,
                        previousStrikes: currentStrikes,
                        nextStrikes,
                        banUntil,
                        banDurationMs,
                        createdAt: now
                    });
                } catch (err) {
                    console.error('Greška pri upisu chat bana ili moderation loga:', err);
                }
            } else {
                if (!chatBans[clientIp]) {
                    chatBans[clientIp] = { strikes: 0, banUntil: 0 };
                }
                chatBans[clientIp].strikes += 1;

                const satiBana = Math.pow(2, chatBans[clientIp].strikes - 1);
                chatBans[clientIp].banUntil = now + (satiBana * GLOBAL_CHAT_PROFANITY_BAN_BASE_MS);
            }

            socket.emit('error_msg', 'err_chat_banned');
            return; 
        }

        const chatObj = {
            id: createGlobalChatMessageId(),
            sender: safeSender,
            senderId: socket.id,
            senderUid: socket.verifiedUid,
            msg: safeMsg,
            createdAt: now
        };

        globalChatHistory.push(chatObj);
        if (globalChatHistory.length > MAX_CHAT_HISTORY) {
            globalChatHistory.shift();
        }

        saveChatToDb();
        io.emit('global_chat_msg', chatObj);
    });

    socket.on('report_global_chat_msg', async (data = {}) => {
        if (!socket.playerName || !socket.verifiedUid) {
            socket.emit('global_chat_report_result', { ok: false, reason: 'err_chat_auth_required' });
            return;
        }

        if (!MONGO_URI) {
            socket.emit('global_chat_report_result', { ok: false, reason: 'err_server_conn' });
            return;
        }

        const now = Date.now();
        const lastReportAt = globalChatReportLimits[socket.verifiedUid] || 0;
        if (now - lastReportAt < GLOBAL_CHAT_REPORT_COOLDOWN_MS) {
            socket.emit('global_chat_report_result', { ok: false, reason: 'err_chat_report_slow_down' });
            return;
        }

        const messageId = String(data.messageId || '');
        const reportedMessage = globalChatHistory.find(message => message.id === messageId);
        if (!reportedMessage) {
            socket.emit('global_chat_report_result', { ok: false, reason: 'err_chat_report_missing' });
            return;
        }

        if (reportedMessage.senderUid && reportedMessage.senderUid === socket.verifiedUid) {
            socket.emit('global_chat_report_result', { ok: false, reason: 'err_chat_report_self' });
            return;
        }

        try {
            const GlobalChatReport = mongoose.model('GlobalChatReport');
            await GlobalChatReport.create({
                messageId: reportedMessage.id,
                reportedByUid: socket.verifiedUid,
                reportedByName: socket.playerName,
                senderUid: reportedMessage.senderUid || '',
                senderName: reportedMessage.sender || 'Nepoznat',
                msg: reportedMessage.msg || '',
                messageCreatedAt: reportedMessage.createdAt || 0,
                reportedAt: now
            });
            globalChatReportLimits[socket.verifiedUid] = now;
            socket.emit('global_chat_report_result', { ok: true, reason: 'chat_report_sent' });
        } catch (err) {
            console.error('Greška pri čuvanju prijave chat poruke:', err);
            socket.emit('global_chat_report_result', { ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('send_challenge', (data) => {
        const { targetId, targetUid } = data || {};
        let resolvedTargetId = targetId;
        let targetSocket = resolvedTargetId ? io.sockets.sockets.get(resolvedTargetId) : null;

        if ((!targetSocket || targetSocket.id === socket.id) && targetUid && onlinePlayers[targetUid]) {
            resolvedTargetId = onlinePlayers[targetUid];
            targetSocket = io.sockets.sockets.get(resolvedTargetId);
        }
        
        if (targetSocket && targetSocket.id !== socket.id) {
            const targetRoom = playerRooms[resolvedTargetId];
            if (targetRoom && !targetRoom.startsWith('local_')) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

            socket.to(resolvedTargetId).emit('incoming_challenge', {
                challengerId: socket.id,
                challengerName: sanitizeTournamentName(socket.playerName || "Igrač")
            });
        } else {
            socket.emit('error_msg', 'err_player_not_on_server');
        }
    });

    socket.on('challenge_response', (data) => {
        const { challengerId, accepted } = data;
        const challengerSocket = io.sockets.sockets.get(challengerId);

        if (accepted) {
            if (!challengerSocket) {
                socket.emit('error_msg', 'err_challenger_left');
                return;
            }

            const roomName = `duel_${challengerId}_${socket.id}`;
            
            socket.join(roomName);
            challengerSocket.join(roomName);

            playerRooms[socket.id] = roomName;
            playerRooms[challengerId] = roomName;
            gameStartTimes[socket.id] = Date.now();
            gameStartTimes[challengerId] = Date.now();

            io.to(roomName).emit('game_started', { room: roomName, player1: challengerId, player2: socket.id });
            console.log(`⚔️ DUEL POČINJE: ${challengerId} vs ${socket.id} u sobi ${roomName}`);

            roomState[roomName] = { 
                players: [challengerId, socket.id], 
                playerNames: [challengerSocket.playerName || "Igrač 1", socket.playerName || "Igrač 2"], 
                turnIndex: 0,
                moveCount: 0,
                allScores: createEmptyScores(),
                kockiceVals: [0,0,0,0,0,0],
                zadrzane: [false,false,false,false,false,false],
                brojBacanja: 0,
                najavaAktivna: false,
                najavljenoPolje: null
            };
            startTurnTimer(roomName); 

        } else {
            if (challengerSocket) {
                socket.to(challengerId).emit('challenge_declined', {});
            }
        }
    });

    socket.on('game_over', () => {
        const roomId = playerRooms[socket.id];
        const scoreSessionStartedAt = gameStartTimes[socket.id];

        if (scoreSessionStartedAt) {
            setTimeout(() => {
                if (gameStartTimes[socket.id] === scoreSessionStartedAt) {
                    delete gameStartTimes[socket.id];
                }
            }, TOP_SCORE_SUBMIT_GRACE_MS);
        }

        if (roomId) {
            console.log(`🏁 Igra završena u sobi: ${roomId}`);
            delete playerRooms[socket.id];
            stopTurnTimer(roomId);
            if (roomState[roomId]) delete roomState[roomId];
        }
    });

    socket.on('request_rematch', () => { relayEvent('rematch_requested', {}); });

    socket.on('accept_rematch', () => {
        const roomId = playerRooms[socket.id];
        if(roomId) {
            io.in(roomId).emit('rematch_started'); 
            const clients = io.sockets.adapter.rooms.get(roomId);
            let playersArr = [];
            if(clients) {
                for (const clientId of clients) {
                    gameStartTimes[clientId] = Date.now();
                    playersArr.push(clientId);
                }
            }
            
            if (playersArr.length === 2) {
                const p1 = io.sockets.sockets.get(playersArr[0]);
                const p2 = io.sockets.sockets.get(playersArr[1]);
                
                roomState[roomId] = { 
                    players: playersArr, 
                    playerNames: [p1 ? p1.playerName : "Igrač 1", p2 ? p2.playerName : "Igrač 2"], 
                    turnIndex: 0,
                    moveCount: 0,
                    allScores: createEmptyScores(),
                    kockiceVals: [0,0,0,0,0,0],
                    zadrzane: [false,false,false,false,false,false],
                    brojBacanja: 0,
                    najavaAktivna: false,
                    najavljenoPolje: null
                };
                startTurnTimer(roomId); 
            }

            console.log(`🔄 Revanš pokrenut u sobi: ${roomId}`);
        }
    });

    socket.on('tourney_reset', () => {
        if (!requireTournamentAuth(socket)) return;
        if (!isTournamentAdmin(socket)) {
            console.warn(`⚠️ Odbijen pokušaj resetovanja turnira od ${socket.verifiedUid}.`);
            rejectTournamentAction(socket, 'err_invalid_room');
            return;
        }

        console.log("⚠️ TURNIR JE RESETOVAN OD STRANE KORISNIKA!");
        tournamentState = {
            status: 'registration',
            players: [],
            bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] }
        };
        saveTournamentToDb(); 
        io.emit('tourney_state_update', tournamentState);
    });

    socket.on('tourney_get_state', () => { socket.emit('tourney_state_update', tournamentState); });

    socket.on('get_tourney_stats', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('tourney_stats_data', [{ playerName: "Mock Šampion", wins: 5 }]);
                return;
            }
            const stats = await TourneyStats.find().sort({ wins: -1 }).limit(20).lean();
            socket.emit('tourney_stats_data', stats);
        } catch (err) {
            console.error("Greška pri dohvatanju turnirske statistike:", err);
            socket.emit('tourney_stats_data', []);
        }
    });

    socket.on('tourney_register', async (playerData = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) {
            socket.emit('tourney_register_result', { ok: false, reason: 'auth_required' });
            return;
        }

        if (tournamentState.status !== 'registration' || tournamentState.players.length >= 8) {
            socket.emit('tourney_register_result', { ok: false, reason: 'msg_room_full' });
            return;
        }

        if (tournamentState.players.find(p => p.id === uid)) {
            socket.emit('tourney_register_result', { ok: true, alreadyRegistered: true });
            return;
        }

        let debitResult = null;

        try {
            debitResult = await debitTournamentEntryFee(uid);
            if (!debitResult.ok) {
                socket.emit('tourney_register_result', { ok: false, reason: debitResult.reason || 'err_server_conn' });
                return;
            }

            const registeredAfterDebit = tournamentState.players.find(p => p.id === uid);
            if (registeredAfterDebit) {
                const refundedUser = await refundTournamentEntryFee(uid);
                emitProfileSync(socket, refundedUser);
                socket.emit('tourney_register_result', { ok: true, alreadyRegistered: true });
                return;
            }

            if (tournamentState.status !== 'registration' || tournamentState.players.length >= 8) {
                const refundedUser = await refundTournamentEntryFee(uid);
                emitProfileSync(socket, refundedUser);
                socket.emit('tourney_register_result', { ok: false, reason: 'msg_room_full' });
                return;
            }

            tournamentState.players.push({
                id: uid,
                name: sanitizeTournamentName(socket.playerName || playerData.name),
                photoUrl: sanitizeTournamentPhotoUrl(socket.photoUrl || playerData.photoUrl),
                pi: sanitizeTournamentPi(playerData.pi)
            });

            if (tournamentState.players.length === 8) {
                generateTournamentBracket();
            } else {
                saveTournamentToDb();
            }

            emitProfileSync(socket, debitResult.user);
            socket.emit('tourney_register_result', {
                ok: true,
                balance: debitResult.user ? debitResult.user.balance : undefined
            });
            io.emit('tourney_state_update', tournamentState);
        } catch (err) {
            console.error("Greška pri turnirskoj prijavi:", err);
            if (debitResult && debitResult.user) {
                const refundedUser = await refundTournamentEntryFee(uid);
                emitProfileSync(socket, refundedUser);
            }
            socket.emit('tourney_register_result', { ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('tourney_update_pi', (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const pi = sanitizeTournamentPi(data.pi);
        let updated = false;

        const player = tournamentState.players.find(p => p.id === uid);
        if (player && player.pi !== pi) {
            player.pi = pi;
            updated = true;
        }

        if (tournamentState.bracket) {
            ['qf', 'sf', 'f'].forEach(round => {
                if (tournamentState.bracket[round]) {
                    tournamentState.bracket[round].forEach(match => {
                        if (match) {
                            if (match.p1 && match.p1.id === uid && match.p1.pi !== pi) {
                                match.p1.pi = pi;
                                updated = true;
                            }
                            if (match.p2 && match.p2.id === uid && match.p2.pi !== pi) {
                                match.p2.pi = pi;
                                updated = true;
                            }
                        }
                    });
                }
            });
        }

        if (updated) {
            saveTournamentToDb();
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_unregister', async () => {
        const uid = requireTournamentAuth(socket);
        if (!uid) {
            socket.emit('tourney_unregister_result', { ok: false, reason: 'auth_required' });
            return;
        }

        if (tournamentState.status !== 'registration') {
            socket.emit('tourney_unregister_result', { ok: false, reason: 'tourney_cannot_unregister' });
            return;
        }

        const index = tournamentState.players.findIndex(p => p.id === uid);
        if (index === -1) {
            socket.emit('tourney_unregister_result', { ok: true, alreadyUnregistered: true });
            return;
        }

        try {
            const refundedUser = await refundTournamentEntryFee(uid);

            tournamentState.players.splice(index, 1);
            saveTournamentToDb();
            io.emit('tourney_state_update', tournamentState);

            emitProfileSync(socket, refundedUser);
            socket.emit('tourney_unregister_result', {
                ok: true,
                balance: refundedUser ? refundedUser.balance : undefined
            });
            console.log(`↩️ Poništena prijava za turnir: ${uid}`);
        } catch (err) {
            console.error("Greška pri turnirskoj odjavi:", err);
            socket.emit('tourney_unregister_result', { ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('tourney_propose_time', (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match } = matchInfo;
        if (!isTournamentParticipant(match, uid)) return rejectTournamentAction(socket, 'err_invalid_room');

        const proposedTime = normalizeTournamentTime(data.proposedTime);
        if (!proposedTime) return rejectTournamentAction(socket, 'err_invalid_room');

        match.proposedTime = proposedTime;
        match.proposedById = uid;
        match.timeAccepted = false;
        match.time = null;
        saveTournamentToDb();
        io.emit('tourney_state_update', tournamentState);
    });

    socket.on('tourney_accept_time', (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match } = matchInfo;
        if (!isTournamentParticipant(match, uid)) return rejectTournamentAction(socket, 'err_invalid_room');
        if (!match.proposedTime) return rejectTournamentAction(socket, 'err_invalid_room');
        if (match.proposedById && match.proposedById === uid) return rejectTournamentAction(socket, 'err_invalid_room');

        match.timeAccepted = true;
        match.time = match.proposedTime;
        saveTournamentToDb();
        io.emit('tourney_state_update', tournamentState);
    });

    socket.on('tourney_start_duel', (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match, index } = matchInfo;
        if (!isTournamentParticipant(match, uid)) return rejectTournamentAction(socket, 'err_invalid_room');
        if (match.winnerId || !match.timeAccepted) return rejectTournamentAction(socket, 'err_invalid_room');

        const opponent = getTournamentOpponent(match, uid);
        const starter = getTournamentPlayer(match, uid);
        if (!opponent) return rejectTournamentAction(socket, 'err_invalid_room');

        if (onlinePlayers[opponent.id]) {
            const targetRoom = playerRooms[onlinePlayers[opponent.id]];
            if (targetRoom && !targetRoom.startsWith('local_')) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

            const matchRoomId = `tourney_${data.round}_${index}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            io.to(onlinePlayers[opponent.id]).emit('tourney_duel_ready', {
                matchRoomId,
                targetId: opponent.id,
                opponentName: sanitizeTournamentName(starter?.name || socket.playerName)
            });
            socket.emit('tourney_join_allowed', matchRoomId);
        } else {
            socket.emit('error_msg', 'err_tourney_opp_offline');
        }
    });

    socket.on('tourney_submit_winner', async (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match, index } = matchInfo;
        const round = data.round;
        const winnerId = String(data.winnerId || '');
        if (!isTournamentParticipant(match, uid) || winnerId !== uid) return rejectTournamentAction(socket, 'err_invalid_room');

        if (match && (match.winnerId === null || match.winnerId === undefined)) {
            match.winnerId = winnerId;
            const winnerObj = match.p1.id === winnerId ? match.p1 : match.p2;
            advanceTournamentBracket(round, index, winnerObj);
            io.emit('tourney_state_update', tournamentState);

            if (round === 'f') {
                try {
                    await settleTournamentFinalPrizes(match, winnerObj);
                    if (match.prizesAwarded) {
                        await recordTournamentChampion(match, winnerObj);
                    }
                } catch (err) {
                    console.error("Greška pri upisu pobednika turnira u bazu:", err);
                }
            }
        } else if (round === 'f' && match.winnerId === winnerId && !match.prizesAwarded) {
            const winnerObj = match.p1.id === winnerId ? match.p1 : match.p2;
            try {
                await settleTournamentFinalPrizes(match, winnerObj);
            } catch (err) {
                console.error("Greška pri ponovnom upisu finala turnira:", err);
            }
        } else if (match && match.winnerId !== winnerId) {
            return rejectTournamentAction(socket, 'err_invalid_room');
        }
    });
    
    // ==================================================================
    // 6. DISKONEKCIJA (SA GRACE PERIOD TOLERANCIJOM OD 30 SEKUNDI I H2H KAZNOM)
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('⚠️ Klijent izgubio vezu:', socket.id);
        
        if (socket.isSpectator && socket.spectatingRoom) {
            const roomId = socket.spectatingRoom;
            socket.isSpectator = false;
            socket.spectatingRoom = null;
            updateRoomSpectators(roomId);
        }

        activeConnections.delete(socket.id);
        const pid = registeredSockets[socket.id];
        const activeRoomId = playerRooms[socket.id];

        if (pid && activeRoomId) {
            console.log(`⏳ Pokrećem Grace Period od 30s za igrača: ${pid}`);
            
            ghostSessions[pid] = {
                roomId: activeRoomId,
                oldSocketId: socket.id
            };

            io.to(activeRoomId).emit('opponent_connection_lost');

            disconnectTimers[pid] = setTimeout(async () => {
                console.log(`❌ Grace Period istekao za ${pid}. Partija se trajno prekida.`);
                let technicalResult = { winnerReward: 500, loserCoinPenalty: 500 };

                if (roomState[activeRoomId]) {
                    const penaltyAmount = getDynamicPenalty(activeRoomId);

                    let h2hKey = null;
                    const oppSocketId = roomState[activeRoomId].players.find(id => id !== ghostSessions[pid]?.oldSocketId);
                    const oppSocket = io.sockets.sockets.get(oppSocketId);
                    const winnerUid = registeredSockets[oppSocketId];
                    if (oppSocket) {
                        let safeOppName = oppSocket.playerName ? oppSocket.playerName.replace(/\./g, '_').replace(/\$/g, '_') : 'Nepoznat';
                        h2hKey = oppSocket.playerId ? oppSocket.playerId : safeOppName;
                    }

                    technicalResult = await applyServerSideTechnicalResult(winnerUid, pid, penaltyAmount, h2hKey);
                } else {
                    console.log(`ℹ️ Igrač ${pid} je napustio završenu, solo ili lokalnu partiju. Bez kazne.`);
                }

                io.to(activeRoomId).emit('opponent_left', {
                    reward: technicalResult.winnerReward,
                    coinPenalty: technicalResult.loserCoinPenalty
                });
                
                delete playerRooms[ghostSessions[pid]?.oldSocketId];
                
                stopTurnTimer(activeRoomId); 
                if (roomState[activeRoomId]) delete roomState[activeRoomId];

                if (privateRooms[activeRoomId]) {
                    if (privateRooms[activeRoomId].p1 && privateRooms[activeRoomId].p1.id === ghostSessions[pid]?.oldSocketId) {
                        delete privateRooms[activeRoomId];
                    } else if (privateRooms[activeRoomId].p2 && privateRooms[activeRoomId].p2.id === ghostSessions[pid]?.oldSocketId) {
                        delete privateRooms[activeRoomId].p2;
                    }
                }
                
                delete ghostSessions[pid];
                delete disconnectTimers[pid];
            }, 30000); 

        } else {
            if (activeRoomId) {
                socket.to(activeRoomId).emit('opponent_left');
                delete playerRooms[socket.id];
                
                stopTurnTimer(activeRoomId); 
                if (roomState[activeRoomId]) delete roomState[activeRoomId];
            }
        }

        if (pid) {
            delete onlinePlayers[pid]; 
        }
        delete registeredSockets[socket.id];

        if (gameStartTimes[socket.id]) {
            delete gameStartTimes[socket.id];
        }
        delete pendingGameRewards[socket.id];

        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }

        updateOnlineCount();
    });
});

setInterval(() => {
    const now = Date.now();
    let obrisano = 0;
    for (const ip in chatBans) {
        if (now > chatBans[ip].banUntil + (24 * 60 * 60 * 1000)) { 
            delete chatBans[ip];
            obrisano++;
        }
    }
    for (const uid in globalChatRateLimits) {
        const state = globalChatRateLimits[uid];
        if (!state || now - (state.lastSeenAt || state.lastAt || 0) > GLOBAL_CHAT_RATE_LIMIT_TTL_MS) {
            delete globalChatRateLimits[uid];
        }
    }
    for (const uid in globalChatReportLimits) {
        if (now - globalChatReportLimits[uid] > GLOBAL_CHAT_REPORT_COOLDOWN_MS) {
            delete globalChatReportLimits[uid];
        }
    }
    if (obrisano > 0) {
        console.log(`🧹 Očišćeno ${obrisano} isteklih banova iz memorije.`);
    }
}, 60 * 60 * 1000); 

// ==================================================================
// ANTI-SLEEP (SELF-PING) MEHANIZAM
// ==================================================================
const SERVER_URL = 'https://yamb-of-the-balkan.onrender.com'; 

setInterval(() => {
    https.get(SERVER_URL, (res) => {
        if (res.statusCode === 200) {
            console.log('☕ Self-ping uspešan: Server je budan.');
        }
    }).on('error', (err) => {
        console.log('❌ Self-ping greška: ' + err.message);
    });
}, 10 * 60 * 1000); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Yamb Server sluša na portu ${PORT}`);
});
