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
const powerIndexCore = require('./www/powerIndexCore');

let firebaseAuth = null;
let firebaseMessaging = null;
let firebaseAdminProjectId = null;
let firebaseAdminCredentialSource = 'none';
let firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY || '';

function getFirebaseCredentialSource() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) return 'FIREBASE_SERVICE_ACCOUNT';
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) return 'FIREBASE_ADMIN_CREDENTIALS';
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) return 'FIREBASE_SERVICE_ACCOUNT_BASE64';
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return 'FIREBASE_SERVICE_ACCOUNT_PATH';
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return 'GOOGLE_APPLICATION_CREDENTIALS';
    if (process.env.FIREBASE_CONFIG) return 'FIREBASE_CONFIG';
    if (process.env.GOOGLE_CLOUD_PROJECT) return 'GOOGLE_CLOUD_PROJECT';
    if (process.env.GCLOUD_PROJECT) return 'GCLOUD_PROJECT';
    return 'none';
}

function getConfiguredFirebaseProjectId(serviceAccount = null) {
    return serviceAccount?.project_id ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        null;
}

function readAndroidGoogleServices() {
    try {
        const googleServicesPath = path.join(__dirname, 'android', 'app', 'google-services.json');
        return JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
    } catch (err) {
        return null;
    }
}

function getFirebaseWebApiKey() {
    if (firebaseWebApiKey) return firebaseWebApiKey;

    const googleServices = readAndroidGoogleServices();
    const key = googleServices?.client?.[0]?.api_key?.[0]?.current_key || '';
    if (key) firebaseWebApiKey = key;
    return firebaseWebApiKey;
}

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
    firebaseAdminCredentialSource = getFirebaseCredentialSource();
    firebaseAdminProjectId = getConfiguredFirebaseProjectId(serviceAccount);
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
        firebaseMessaging = admin.messaging();
        console.log(`✅ Firebase Admin Auth/Messaging spreman (${firebaseAdminProjectId || 'project_id nepoznat'}, ${firebaseAdminCredentialSource}).`);
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

const profanityCharFoldMap = {
    'а': 'a', 'А': 'a', 'б': 'b', 'Б': 'b', 'в': 'v', 'В': 'v',
    'г': 'g', 'Г': 'g', 'д': 'd', 'Д': 'd', 'ђ': 'dj', 'Ђ': 'dj',
    'е': 'e', 'Е': 'e', 'ж': 'z', 'Ж': 'z', 'з': 'z', 'З': 'z',
    'и': 'i', 'И': 'i', 'ј': 'j', 'Ј': 'j', 'к': 'k', 'К': 'k',
    'л': 'l', 'Л': 'l', 'љ': 'lj', 'Љ': 'lj', 'м': 'm', 'М': 'm',
    'н': 'n', 'Н': 'n', 'њ': 'nj', 'Њ': 'nj', 'о': 'o', 'О': 'o',
    'п': 'p', 'П': 'p', 'р': 'r', 'Р': 'r', 'с': 's', 'С': 's',
    'т': 't', 'Т': 't', 'ћ': 'c', 'Ћ': 'c', 'у': 'u', 'У': 'u',
    'ф': 'f', 'Ф': 'f', 'х': 'h', 'Х': 'h', 'ц': 'c', 'Ц': 'c',
    'ч': 'c', 'Ч': 'c', 'џ': 'dz', 'Џ': 'dz', 'ш': 's', 'Ш': 's'
};

function normalizeProfanityText(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x00-\x7F]/g, char => profanityCharFoldMap[char] || char)
        .toLowerCase();
}

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
    if (filtriranaPoruka === poruka && sadrziPsovku(normalizeProfanityText(poruka))) {
        return '***';
    }
    return filtriranaPoruka;
}

function sadrziPsovku(tekst) {
    const rawText = String(tekst || '');
    const normalizedText = normalizeProfanityText(rawText);
    return zabranjeniRegexi.some(regex => rawText.match(regex) !== null) ||
        (normalizedText !== rawText && zabranjeniRegexi.some(regex => normalizedText.match(regex) !== null));
}

// ==================================================================
// 1. RUTA ZA ANDROID APP LINKS (ASSETLINKS.JSON)
// ==================================================================
app.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'www', '.well-known', 'assetlinks.json'));
});

function readAndroidFirebaseProjectId() {
    const googleServices = readAndroidGoogleServices();
    return googleServices?.project_info?.project_id || null;
}

function httpsJsonRequest(urlString, options = {}) {
    return new Promise(resolve => {
        const url = new URL(urlString);
        const method = options.method || 'GET';
        const timeoutMs = options.timeoutMs || 7000;
        const body = options.body ? JSON.stringify(options.body) : null;

        const request = https.request({
            protocol: url.protocol,
            hostname: url.hostname,
            path: `${url.pathname}${url.search}`,
            method,
            timeout: timeoutMs,
            headers: {
                ...(body ? {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                } : {}),
                ...(options.headers || {})
            }
        }, response => {
            let raw = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
                raw += chunk;
                if (raw.length > 1024 * 1024) {
                    request.destroy(new Error('response_too_large'));
                }
            });
            response.on('end', () => {
                let parsed = null;
                try {
                    parsed = raw ? JSON.parse(raw) : null;
                } catch (err) {}
                resolve({
                    ok: response.statusCode >= 200 && response.statusCode < 300,
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: parsed,
                    rawLength: raw.length
                });
            });
        });

        request.on('timeout', () => request.destroy(new Error('request_timeout')));
        request.on('error', error => resolve({
            ok: false,
            reason: error.message || 'request_error',
            code: error.code || ''
        }));

        if (body) request.write(body);
        request.end();
    });
}

app.get('/api/firebase-auth-status', (req, res) => {
    res.json({
        firebaseAdminActive: !!firebaseAuth,
        firebaseAdminProjectId: firebaseAdminProjectId || null,
        firebaseAdminCredentialSource,
        androidFirebaseProjectId: readAndroidFirebaseProjectId(),
        firebaseWebApiKeyPresent: !!getFirebaseWebApiKey()
    });
});

app.get('/api/google-certs-status', async (req, res) => {
    const certs = await httpsJsonRequest('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {
        timeoutMs: 7000
    });

    res.json({
        ok: !!certs.ok,
        statusCode: certs.statusCode || null,
        reason: certs.reason || null,
        code: certs.code || null,
        cacheControl: certs.headers?.['cache-control'] || null,
        keyCount: certs.body && typeof certs.body === 'object' ? Object.keys(certs.body).length : 0,
        rawLength: certs.rawLength || 0
    });
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
    bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] },
    pushFlags: {}
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
            tournamentState.pushFlags = dbState.pushFlags || {};
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
    uid: String,
    playerName: String,
    score: Number,
    mode: String,
    photoUrl: { type: String, default: '' },
    date: { type: Date, default: Date.now }
});
ScoreSchema.index({ playerId: 1, score: -1 });
ScoreSchema.index({ uid: 1, score: -1 });
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
LeagueScoreSchema.index(
    { playerId: 1, year: 1, quarter: 1 },
    {
        unique: true,
        partialFilterExpression: {
            playerId: { $type: 'string' },
            year: { $type: 'number' },
            quarter: { $type: 'number' }
        }
    }
);
LeagueScoreSchema.index({ year: 1, quarter: 1, score: -1 });
const LeagueScore = mongoose.model('LeagueScore', LeagueScoreSchema);

const LeagueHallOfFameSchema = new mongoose.Schema({
    periodKey: { type: String, unique: true, required: true },
    year: Number,
    quarter: Number,
    topScores: { type: Array, default: [] },
    champion: { type: Object, default: null },
    championPushSentAt: { type: Date, default: null },
    championPushDateKey: { type: String, default: '' },
    archivedAt: { type: Date, default: Date.now }
});
const LeagueHallOfFame = mongoose.model('LeagueHallOfFame', LeagueHallOfFameSchema);

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
    bracket: { type: Object, default: { qf: [null, null, null, null], sf: [null, null], f: [null] } },
    pushFlags: { type: Object, default: {} }
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

const FriendNotificationSchema = new mongoose.Schema({
    type: { type: String, default: '' },
    fromUid: { type: String, default: '' },
    fromName: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    createdAt: { type: Number, default: Date.now }
}, { _id: false });

const UserProfileSchema = new mongoose.Schema({
    firebaseUid: { type: String, unique: true, required: true },
    playerName: String,
    photoUrl: { type: String, default: '' },
    friends: { type: [String], default: [] },
    friendRequests: { type: [String], default: [] },
    friendNotifications: { type: [FriendNotificationSchema], default: [] },
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
    lastShopInterstitialRewardAt: { type: Number, default: 0 },
    lastUndoRewardedRewardAt: { type: Number, default: 0 },
    lastUndoInterstitialRewardAt: { type: Number, default: 0 },
    soundEnabled: { type: Boolean, default: true },
    vibrationEnabled: { type: Boolean, default: true },
    musicEnabled: { type: Boolean, default: true },
    musicVolume: { type: Number, default: 0.4 },
    language: { type: String, default: 'sr' },
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

const UserProfileBackupSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, index: true },
    playerName: { type: String, default: '' },
    reason: { type: String, default: 'profile_sync' },
    profile: { type: Object, default: () => ({}) },
    createdAt: { type: Date, default: Date.now, index: true }
});
UserProfileBackupSchema.index({ firebaseUid: 1, createdAt: -1 });
const UserProfileBackup = mongoose.model('UserProfileBackup', UserProfileBackupSchema);
const PROFILE_BACKUP_KEEP_LIMIT = 25;

const PushTokenSchema = new mongoose.Schema({
    uid: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: 'unknown' },
    appId: { type: String, default: 'com.yamb.balkan' },
    categories: {
        tournament: { type: Boolean, default: true },
        records: { type: Boolean, default: true },
        league: { type: Boolean, default: true }
    },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Number, default: Date.now },
    lastSeenAt: { type: Number, default: Date.now }
});
PushTokenSchema.index({ uid: 1, enabled: 1, lastSeenAt: -1 });
const PushToken = mongoose.model('PushToken', PushTokenSchema);

const AdMobRewardVerificationSchema = new mongoose.Schema({
    transactionId: { type: String, unique: true, required: true },
    uid: { type: String, index: true },
    nonce: { type: String, index: true },
    context: { type: String, index: true },
    adUnit: String,
    adNetwork: String,
    rewardAmount: { type: Number, default: 0 },
    rewardItem: String,
    adTimestamp: { type: Number, default: 0 },
    receivedAt: { type: Date, default: Date.now },
    claimedAt: { type: Date, default: null },
    claimedBy: { type: String, default: '' },
    raw: { type: Object, default: {} }
});
const AdMobRewardVerification = mongoose.model('AdMobRewardVerification', AdMobRewardVerificationSchema);

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
const pendingChallenges = {};
const pendingRoomInvites = {};
const pendingTournamentDuelInvites = {};

const GLOBAL_CHAT_MIN_INTERVAL_MS = 1200;
const GLOBAL_CHAT_SPAM_STRIKE_LIMIT = 4;
const GLOBAL_CHAT_SPAM_MUTE_MS = 15000;
const GLOBAL_CHAT_PROFANITY_BAN_BASE_MS = 60 * 60 * 1000;
const GLOBAL_CHAT_RATE_LIMIT_TTL_MS = 60 * 60 * 1000;
const GLOBAL_CHAT_REPORT_COOLDOWN_MS = 30000;
const CHALLENGE_RESPONSE_WINDOW_MS = 60 * 1000;
const ROOM_INVITE_RESPONSE_WINDOW_MS = 60 * 1000;

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
const MAX_DAILY_BASE_REWARD = 864;
const MAX_AD_REWARD_PER_SYNC = 1500;
const MAX_REWARD_PER_GAME = 8000;
const MAX_TOURNEY_REWARD = 50000;
const TOP_SCORE_SUBMIT_GRACE_MS = 15000;
const GAME_REWARD_CLAIM_WINDOW_MS = 5 * 60 * 1000;
const TOURNEY_ENTRY_FEE = 5500;
const TOURNEY_WINNER_REWARD = 44000;
const TOURNEY_RUNNER_UP_REWARD = 5500;
const PUSH_TOKEN_STALE_DAYS = Number.isFinite(parseInt(process.env.PUSH_TOKEN_STALE_DAYS || '90', 10))
    ? parseInt(process.env.PUSH_TOKEN_STALE_DAYS || '90', 10)
    : 90;
const PUSH_TOKEN_STALE_MS = Math.max(
    30 * 24 * 60 * 60 * 1000,
    Math.min(365 * 24 * 60 * 60 * 1000, PUSH_TOKEN_STALE_DAYS * 24 * 60 * 60 * 1000)
);
const PUSH_NOTIFICATION_CHANNEL_ID = 'tournament_notifications';
const LEADERBOARD_RECORD_PERIODS = ['weekly', 'monthly', 'all_time'];
const LEAGUE_CHAMPION_PUSH_INTERVAL_MS = 30 * 60 * 1000;
const ADMOB_REWARD_KEYS_URL = process.env.ADMOB_REWARD_KEYS_URL || 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const ADMOB_REWARD_KEYS_CACHE_MS = 23 * 60 * 60 * 1000;
const ADMOB_SSV_WAIT_TIMEOUT_MS = Math.max(3000, Math.min(30000, parseInt(process.env.ADMOB_SSV_WAIT_TIMEOUT_MS || '20000', 10)));
const ADMOB_SSV_POLL_MS = 750;
const ADMOB_SSV_MAX_AGE_MS = Math.max(60000, Math.min(15 * 60 * 1000, parseInt(process.env.ADMOB_SSV_MAX_AGE_MS || '600000', 10)));
const REQUIRE_ADMOB_SSV = process.env.REQUIRE_ADMOB_SSV === 'true';
const ADMOB_REWARDED_AD_UNIT_ID = process.env.ADMOB_REWARDED_AD_UNIT_ID || 'ca-app-pub-4319963185096437/7896891915';
const ADMOB_REWARDED_AD_UNIT_NUMERIC_ID = ADMOB_REWARDED_AD_UNIT_ID.includes('/')
    ? ADMOB_REWARDED_AD_UNIT_ID.split('/').pop()
    : ADMOB_REWARDED_AD_UNIT_ID;
const ADMOB_ALLOWED_REWARDED_AD_UNITS = new Set(
    (process.env.ADMOB_ALLOWED_REWARDED_AD_UNITS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .concat([ADMOB_REWARDED_AD_UNIT_ID, ADMOB_REWARDED_AD_UNIT_NUMERIC_ID].filter(Boolean))
);

const gameCarriedDurations = {};

function sanitizePushToken(token) {
    if (typeof token !== 'string') return '';
    const trimmed = token.trim();
    if (trimmed.length < 20 || trimmed.length > 4096) return '';
    return trimmed;
}

function sanitizePushPlatform(platform) {
    const value = typeof platform === 'string' ? platform.trim().toLowerCase() : '';
    return ['android', 'ios', 'web'].includes(value) ? value : 'unknown';
}

function normalizePushCategories(categories = {}) {
    return {
        tournament: categories.tournament !== false,
        records: categories.records !== false,
        league: categories.league !== false
    };
}

function stringifyPushData(data = {}) {
    const result = {};
    Object.entries(data || {}).forEach(([key, value]) => {
        if (!key) return;
        if (value === null || value === undefined) return;
        result[String(key).substring(0, 64)] = String(value).substring(0, 512);
    });
    return result;
}

async function registerPushToken(uid, data = {}) {
    if (!MONGO_URI) return { ok: false, reason: 'mongo_unavailable' };

    const token = sanitizePushToken(data.token);
    if (!uid || !token) return { ok: false, reason: 'invalid_push_token' };

    try {
        await PushToken.findOneAndUpdate(
            { token },
            {
                $set: {
                    uid,
                    token,
                    platform: sanitizePushPlatform(data.platform),
                    appId: typeof data.appId === 'string' ? data.appId.substring(0, 80) : 'com.yamb.balkan',
                    categories: normalizePushCategories(data.categories),
                    enabled: true,
                    lastSeenAt: Date.now()
                },
                $setOnInsert: { createdAt: Date.now() }
            },
            { upsert: true, new: true }
        );
        return { ok: true };
    } catch (err) {
        console.error('Greška pri upisu push tokena:', err);
        return { ok: false, reason: 'err_server_conn' };
    }
}

async function unregisterPushToken(uid, data = {}) {
    if (!MONGO_URI) return { ok: false, reason: 'mongo_unavailable' };

    const token = sanitizePushToken(data.token);
    if (!uid || !token) return { ok: false, reason: 'invalid_push_token' };

    try {
        await PushToken.deleteOne({ uid, token });
        return { ok: true };
    } catch (err) {
        console.error('Greška pri brisanju push tokena:', err);
        return { ok: false, reason: 'err_server_conn' };
    }
}

function createPushReply(socket, ack, fallbackEvent) {
    return (payload) => {
        if (typeof ack === 'function') ack(payload);
        else socket.emit(fallbackEvent, payload);
    };
}

function rejectPushWithoutAuth(socket, reply) {
    const result = { ok: false, reason: 'firebase_token_required' };
    reply(result);
    socket.emit('auth_required', result);
}

async function getPushTokenDocsForUids(uids, category = 'tournament') {
    if (!MONGO_URI || !Array.isArray(uids) || uids.length === 0) return [];

    const uniqueUids = Array.from(new Set(uids.map(uid => String(uid || '').trim()).filter(Boolean)));
    if (uniqueUids.length === 0) return [];

    const query = {
        uid: { $in: uniqueUids },
        enabled: true,
        lastSeenAt: { $gte: Date.now() - PUSH_TOKEN_STALE_MS }
    };
    query[`categories.${category}`] = { $ne: false };

    return PushToken.find(query).select('uid token').lean();
}

async function removeInvalidPushTokens(tokens) {
    const invalidTokens = Array.from(new Set((tokens || []).map(sanitizePushToken).filter(Boolean)));
    if (!MONGO_URI || invalidTokens.length === 0) return;

    try {
        await PushToken.deleteMany({ token: { $in: invalidTokens } });
    } catch (err) {
        console.error('Greška pri čišćenju nevažećih push tokena:', err);
    }
}

function isInvalidFcmTokenError(error) {
    const code = error?.code || '';
    return code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token';
}

function buildPushMessage(baseMessage, tokens) {
    const notification = {
        title: String(baseMessage.title || 'Yamb of the Balkan').substring(0, 80),
        body: String(baseMessage.body || '').substring(0, 240)
    };

    return {
        tokens,
        notification,
        data: stringifyPushData({
            scope: baseMessage.scope || 'tournament',
            type: baseMessage.type || 'tournament_update',
            ...(baseMessage.data || {})
        }),
        android: {
            priority: 'high',
            notification: {
                channelId: PUSH_NOTIFICATION_CHANNEL_ID,
                sound: 'default',
                tag: String(baseMessage.tag || baseMessage.type || 'tournament_update').substring(0, 80)
            }
        }
    };
}

async function sendPushToUids(uids, baseMessage = {}) {
    if (!firebaseMessaging) return { ok: false, reason: 'firebase_messaging_unavailable' };

    try {
        const docs = await getPushTokenDocsForUids(uids, baseMessage.category || 'tournament');
        const tokens = Array.from(new Set(docs.map(doc => doc.token).filter(Boolean)));
        if (tokens.length === 0) return { ok: true, sent: 0 };

        let successCount = 0;
        const invalidTokens = [];

        for (let i = 0; i < tokens.length; i += 500) {
            const batch = tokens.slice(i, i + 500);
            const message = buildPushMessage(baseMessage, batch);

            if (typeof firebaseMessaging.sendEachForMulticast === 'function') {
                const response = await firebaseMessaging.sendEachForMulticast(message);
                successCount += response.successCount || 0;
                response.responses.forEach((item, index) => {
                    if (!item.success && isInvalidFcmTokenError(item.error)) invalidTokens.push(batch[index]);
                });
            } else {
                await Promise.all(batch.map(async token => {
                    try {
                        const { tokens: _tokens, ...singleMessage } = message;
                        await firebaseMessaging.send({ ...singleMessage, token });
                        successCount += 1;
                    } catch (error) {
                        if (isInvalidFcmTokenError(error)) invalidTokens.push(token);
                    }
                }));
            }
        }

        await removeInvalidPushTokens(invalidTokens);
        return { ok: true, sent: successCount, invalid: invalidTokens.length };
    } catch (err) {
        console.error('Greška pri slanju push notifikacije:', err);
        return { ok: false, reason: 'push_send_failed' };
    }
}

async function getPushEnabledUids(category = 'records') {
    if (!MONGO_URI) return [];

    const query = {
        enabled: true,
        lastSeenAt: { $gte: Date.now() - PUSH_TOKEN_STALE_MS }
    };
    query[`categories.${category}`] = { $ne: false };

    return PushToken.distinct('uid', query);
}

function getLeaderboardPeriodLabel(period) {
    if (period === 'weekly') return 'Nedeljni';
    if (period === 'monthly') return 'Mesečni';
    return 'Rekord svih vremena';
}

function getLeaderboardRecordTag(period) {
    if (period === 'weekly') return 'nedeljni rekord';
    if (period === 'monthly') return 'mesečni rekord';
    return 'rekord svih vremena';
}

const STABLE_LEADERBOARD_UID_REGEX = /^(?!.*guest).{20,}$/i;

function getLeaderboardUidCandidateExpression(fieldPath) {
    return {
        $trim: {
            input: {
                $convert: {
                    input: fieldPath,
                    to: "string",
                    onError: "",
                    onNull: ""
                }
            }
        }
    };
}

function getStableLeaderboardUidExpression() {
    return {
        $let: {
            vars: {
                uidCandidate: getLeaderboardUidCandidateExpression("$uid"),
                playerIdCandidate: getLeaderboardUidCandidateExpression("$playerId")
            },
            in: {
                $cond: [
                    { $regexMatch: { input: "$$uidCandidate", regex: STABLE_LEADERBOARD_UID_REGEX } },
                    "$$uidCandidate",
                    {
                        $cond: [
                            { $regexMatch: { input: "$$playerIdCandidate", regex: STABLE_LEADERBOARD_UID_REGEX } },
                            "$$playerIdCandidate",
                            null
                        ]
                    }
                ]
            }
        }
    };
}

function getLeaderboardScoreAddFields() {
    return {
        numScore: { $convert: { input: "$score", to: "double", onError: 0, onNull: 0 } },
        stableUid: getStableLeaderboardUidExpression()
    };
}

function getLeaderboardRecordMatchFilter(period) {
    const matchFilter = {
        $or: [
            { playerId: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } },
            { uid: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } }
        ]
    };

    const periodStart = getLeaderboardPeriodStart(period);
    if (periodStart) matchFilter.date = { $gte: periodStart };

    return matchFilter;
}

async function getLeaderboardRecordSnapshot(period) {
    if (!MONGO_URI) return null;

    const records = await Score.aggregate([
        { $match: getLeaderboardRecordMatchFilter(period) },
        { $addFields: getLeaderboardScoreAddFields() },
        { $match: { stableUid: { $ne: null } } },
        { $sort: { numScore: -1, date: 1 } },
        {
            $group: {
                _id: "$stableUid",
                bestEntry: { $first: "$$ROOT" }
            }
        },
        { $replaceRoot: { newRoot: "$bestEntry" } },
        { $sort: { numScore: -1, date: 1 } },
        { $limit: 1 }
    ]);

    const top = records[0];
    if (!top) return null;

    return {
        period,
        score: Math.max(0, toSafeInt(top.score, 0)),
        uid: String(top.stableUid || top.playerId || top.uid || ''),
        playerName: String(top.playerName || 'Nepoznat Igrač')
    };
}

async function captureLeaderboardRecordSnapshots() {
    const snapshots = {};
    await Promise.all(LEADERBOARD_RECORD_PERIODS.map(async period => {
        snapshots[period] = await getLeaderboardRecordSnapshot(period);
    }));
    return snapshots;
}

function formatRecordScore(score) {
    try {
        return Number(score || 0).toLocaleString('sr-RS');
    } catch (_err) {
        return String(score || 0);
    }
}

async function notifyBrokenLeaderboardRecords(previousRecords, newEntry) {
    if (!newEntry || !newEntry.uid) return { ok: false, reason: 'missing_entry' };

    const newScore = Math.max(0, toSafeInt(newEntry.score, 0));
    if (newScore <= 0) return { ok: false, reason: 'invalid_score' };

    const changedPeriods = LEADERBOARD_RECORD_PERIODS.filter(period => {
        const previous = previousRecords ? previousRecords[period] : null;
        return previous && newScore > Math.max(0, toSafeInt(previous.score, 0));
    });

    if (changedPeriods.length === 0) return { ok: true, sent: 0 };

    const uids = await getPushEnabledUids('records');
    if (uids.length === 0) return { ok: true, sent: 0 };

    const playerName = sanitizeTournamentName(newEntry.playerName || 'Igrač');
    const jobs = changedPeriods.map(period => {
        const title = `${getLeaderboardPeriodLabel(period)} rekord je oboren`;
        const body = `${playerName} sada drži ${getLeaderboardRecordTag(period)}: ${formatRecordScore(newScore)} poena.`;

        return sendPushToUids(uids, {
            category: 'records',
            scope: 'records',
            type: 'record_broken',
            tag: `record_broken_${period}`,
            title,
            body,
            data: {
                period,
                score: newScore,
                playerName,
                uid: newEntry.uid || ''
            }
        });
    });

    const results = await Promise.all(jobs);
    return {
        ok: true,
        periods: changedPeriods,
        sent: results.reduce((sum, item) => sum + Math.max(0, toSafeInt(item?.sent, 0)), 0)
    };
}

function queueRecordPush(promise, label) {
    Promise.resolve(promise).catch(err => {
        console.error(`Greška pri rekord push notifikaciji (${label}):`, err);
    });
}

function normalizeCarriedGameDuration(value) {
    const duration = toSafeInt(value, 0);
    return Math.max(0, Math.min(MAX_GAME_DURATION, duration));
}

function startScoreSession(socketId, carriedDurationMs = 0) {
    gameStartTimes[socketId] = Date.now();
    gameCarriedDurations[socketId] = normalizeCarriedGameDuration(carriedDurationMs);
}

function getScoreSessionDuration(socketId) {
    const startTime = gameStartTimes[socketId];
    if (!startTime) return null;
    return (Date.now() - startTime) + (gameCarriedDurations[socketId] || 0);
}

function clearScoreSession(socketId) {
    delete gameStartTimes[socketId];
    delete gameCarriedDurations[socketId];
}
const SHOP_AD_REWARD_AMOUNT = 500;
const SHOP_INTERSTITIAL_REWARD_AMOUNT = 200;
const UNDO_REWARDED_REWARD_AMOUNT = 3;
const UNDO_INTERSTITIAL_REWARD_AMOUNT = 1;
const SHOP_AD_REWARD_COOLDOWN_MS = 15000;
const SHOP_INTERSTITIAL_REWARD_COOLDOWN_MS = 15000;
const UNDO_REWARDED_REWARD_COOLDOWN_MS = 15000;
const UNDO_INTERSTITIAL_REWARD_COOLDOWN_MS = 15000;
const MAX_IMPORTED_UNDO_TOKENS_BASE = 20;
const MAX_PROFILE_GAMES = 250000;
const MAX_PROFILE_GAME_DELTA_PER_SYNC = 50;
const MAX_PROFILE_LEGACY_GAME_IMPORT = 5000;
const MAX_PROFILE_COMPETITIVE_BUFFER = 250;
const MAX_PROFILE_TOURNEY_DELTA_PER_SYNC = 3;
const MAX_PROFILE_LEGACY_TOURNEY_IMPORT = 100;
const MAX_PENALTY_POINTS = 100000;
const LEADERBOARD_TIME_ZONE = 'Europe/Belgrade';
const DAILY_CHALLENGE_TIME_ZONE = LEADERBOARD_TIME_ZONE;
const DAILY_CHALLENGE_SECRET = process.env.DAILY_CHALLENGE_SECRET ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'yamb-daily-challenge-v1';

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

function getDailyChallengeDayKey(now = new Date()) {
    const parts = getTimeZoneParts(now, DAILY_CHALLENGE_TIME_ZONE);
    return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
}

function getLegacyDailyDayKey(now = new Date()) {
    return now.toDateString();
}

function isDailyKeyToday(value, todayKey = getDailyChallengeDayKey(), legacyTodayKey = getLegacyDailyDayKey()) {
    return value === todayKey || value === legacyTodayKey;
}

function normalizeDailyKeyForSync(value, todayKey = getDailyChallengeDayKey(), legacyTodayKey = getLegacyDailyDayKey()) {
    if (!value) return "";
    return isDailyKeyToday(value, todayKey, legacyTodayKey) ? todayKey : value;
}

function getDailyChallengeDice(uid, dayKey) {
    const digest = crypto
        .createHmac('sha256', DAILY_CHALLENGE_SECRET)
        .update(`${uid}:${dayKey}:daily-challenge`)
        .digest();

    return Array.from({ length: 6 }, (_, index) => (digest[index] % 6) + 1);
}

function calculateDailyChallengeReward(dice = []) {
    if (!Array.isArray(dice) || dice.length < 6) return 0;
    const safeDice = dice.map(value => Math.max(1, Math.min(6, toSafeInt(value, 1))));
    const sumFirstFour = safeDice[0] + safeDice[1] + safeDice[2] + safeDice[3];
    return sumFirstFour * safeDice[4] * safeDice[5];
}

function getDailyChallengeForUid(uid, now = new Date()) {
    const dayKey = getDailyChallengeDayKey(now);
    const dice = getDailyChallengeDice(uid, dayKey);
    return {
        dayKey,
        timeZone: DAILY_CHALLENGE_TIME_ZONE,
        dice,
        reward: calculateDailyChallengeReward(dice)
    };
}

function getTimeZoneOffsetMs(date, timeZone) {
    const parts = getTimeZoneParts(date, timeZone);
    const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return zonedAsUtc - date.getTime();
}

function zonedLocalDateTimeToUtc(year, month, day, hour, minute, second, timeZone) {
    const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    let result = new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timeZone));
    result = new Date(localAsUtc - getTimeZoneOffsetMs(result, timeZone));
    return result;
}

function zonedLocalMidnightToUtc(year, month, day, timeZone) {
    return zonedLocalDateTimeToUtc(year, month, day, 0, 0, 0, timeZone);
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

const LEAGUE_CHAMPION_ANNOUNCEMENT_MONTHS = new Set([1, 4, 7, 10]);

function padDatePart(value) {
    return String(value).padStart(2, '0');
}

function getLeagueChampionAnnouncementTarget(now = new Date()) {
    const parts = getTimeZoneParts(now, LEADERBOARD_TIME_ZONE);
    if (parts.day !== 1 || !LEAGUE_CHAMPION_ANNOUNCEMENT_MONTHS.has(parts.month)) return null;

    const year = parts.month === 1 ? parts.year - 1 : parts.year;
    const quarter = parts.month === 1 ? 4 : (parts.month - 1) / 3;
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) return null;

    return {
        year,
        quarter,
        periodKey: getLeaguePeriodKey(year, quarter),
        dateKey: `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`
    };
}

function toRomanCycle(num) {
    const value = Math.max(0, toSafeInt(num, 0));
    if (value <= 0) return '';

    const lookup = [
        ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
        ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let remaining = value;
    let roman = '';

    for (const [symbol, amount] of lookup) {
        while (remaining >= amount) {
            roman += symbol;
            remaining -= amount;
        }
    }

    return roman;
}

async function getLeagueChampionCycleNumber(year, quarter) {
    if (!MONGO_URI) return null;

    const archivedQuarters = await LeagueHallOfFame.find()
        .sort({ year: 1, quarter: 1 })
        .select('year quarter topScores champion')
        .lean();

    let cycleCounter = 0;
    for (const quarterArchive of archivedQuarters) {
        const qScores = Array.isArray(quarterArchive.topScores) ? quarterArchive.topScores : [];
        const champion = quarterArchive.champion || qScores[0];
        if (!champion) continue;

        cycleCounter += 1;
        if (Number(quarterArchive.year) === year && Number(quarterArchive.quarter) === quarter) {
            return cycleCounter;
        }
    }

    return null;
}

function buildLeagueChampionPushPayload(champion, cycle) {
    const playerName = sanitizeTournamentName(champion?.playerName || 'Igrač');
    const score = Math.max(0, toSafeInt(champion?.score, 0));
    const romanCycle = toRomanCycle(cycle);
    const cycleText = romanCycle ? `${romanCycle} ciklusa` : 'prethodnog ciklusa';

    return {
        title: 'Pobednik Kvartalne lige',
        body: `Pobednik ${cycleText} Kvartalne lige je ${playerName} sa ${formatRecordScore(score)} poena.`,
        playerName,
        score,
        romanCycle
    };
}

async function notifyQuarterlyLeagueChampionIfDue(now = new Date()) {
    if (!MONGO_URI) return { ok: false, reason: 'mongo_unavailable' };

    const target = getLeagueChampionAnnouncementTarget(now);
    if (!target) return { ok: true, skipped: 'not_announcement_day' };

    const archivedQuarter = await archiveLeagueQuarter(target.year, target.quarter);
    const archivedScores = Array.isArray(archivedQuarter?.topScores) ? archivedQuarter.topScores : [];
    const champion = archivedQuarter?.champion || archivedScores[0];
    if (!champion) return { ok: true, skipped: 'no_champion', periodKey: target.periodKey };

    const claimedArchive = await LeagueHallOfFame.findOneAndUpdate(
        {
            periodKey: target.periodKey,
            championPushDateKey: { $ne: target.dateKey }
        },
        {
            $set: {
                championPushDateKey: target.dateKey,
                championPushSentAt: new Date()
            }
        },
        { new: true }
    ).lean();

    if (!claimedArchive) return { ok: true, skipped: 'already_sent', periodKey: target.periodKey };

    const claimedScores = Array.isArray(claimedArchive.topScores) ? claimedArchive.topScores : [];
    const claimedChampion = claimedArchive.champion || claimedScores[0] || champion;
    const cycle = await getLeagueChampionCycleNumber(target.year, target.quarter);
    const payload = buildLeagueChampionPushPayload(claimedChampion, cycle);
    const uids = await getPushEnabledUids('league');
    const result = uids.length > 0
        ? await sendPushToUids(uids, {
            category: 'league',
            scope: 'league',
            type: 'league_champion_announced',
            tag: `league_champion_${target.periodKey}`,
            title: payload.title,
            body: payload.body,
            data: {
                year: target.year,
                quarter: target.quarter,
                periodKey: target.periodKey,
                cycle: cycle || '',
                cycleRoman: payload.romanCycle,
                playerName: payload.playerName,
                score: payload.score
            }
        })
        : { ok: true, sent: 0 };

    if (!result?.ok) {
        await LeagueHallOfFame.updateOne(
            { periodKey: target.periodKey, championPushDateKey: target.dateKey },
            { $set: { championPushDateKey: '', championPushSentAt: null } }
        );
        return { ...result, periodKey: target.periodKey };
    }

    return {
        ok: true,
        periodKey: target.periodKey,
        sent: Math.max(0, toSafeInt(result.sent, 0)),
        playerName: payload.playerName,
        score: payload.score,
        cycle
    };
}

let leagueChampionPushCheckInProgress = false;
async function runLeagueChampionPushCheck() {
    if (leagueChampionPushCheckInProgress) return;
    leagueChampionPushCheckInProgress = true;

    try {
        const result = await notifyQuarterlyLeagueChampionIfDue();
        if (result?.sent > 0) {
            console.log(`✅ Kvartalna liga push poslat (${result.periodKey}): ${result.playerName}, ${result.sent} uređaja.`);
        }
    } catch (err) {
        console.error('Greška pri kvartalna liga push proveri:', err);
    } finally {
        leagueChampionPushCheckInProgress = false;
    }
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
    ufo_abduction: 35000,
    dragon_fire: 45000,
    royal_yamb: 60000,
    dark: 0,
    light: 0,
    medium: 0,
    winter: 0,
    neon: 15000,
    amethyst: 20000,
    easter: 10000,
    desert: 0,
    moon: 25000,
    severna: 45000
});

const FREE_UNLOCK_IDS = new Set(Object.entries(SHOP_ITEM_PRICES).filter(([, price]) => price === 0).map(([id]) => id));
const SKIN_UNLOCK_IDS = new Set([
    'default', 'classic_red', 'classic_blue', 'classic_black',
    'bronze_antique', 'bronze_patina', 'bronze_steampunk', 'bronze_spartan', 'bronze_rose', 'bronze_forge',
    'silver_classic', 'silver_brushed', 'silver_moonlight', 'silver_knight', 'silver_titanium', 'silver_chrome',
    'gold_classic', 'gold_rose', 'gold_ancient', 'gold_midas',
    'wood', 'marble', 'pearl', 'carbon', 'obsidian', 'leather',
    'neon_blue', 'neon_pink', 'neon_green', 'stealth',
    'glass_clear', 'glass_ruby', 'glass_emerald', 'glass_sapphire',
    'magma', 'galaxy', 'retro', 'hologram'
]);
const EFFECT_UNLOCK_IDS = new Set([
    'confetti', 'gold_rain', 'fireflies', 'bubbles', 'ice_age', 'black_hole',
    'supernova', 'neon_pulse', 'thunder', 'balkan', 'fireworks', 'drones',
    'cosmic_dust', 'ufo_abduction', 'dragon_fire', 'royal_yamb'
]);
const THEME_UNLOCK_IDS = new Set([
    'dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'
]);

// NOVE PROMENLJIVE ZA ČUVANJE CHATA
let globalChatHistory = [];
let globalChatSaveQueue = Promise.resolve();
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

async function appendGlobalChatMessageToDb(message) {
    if (!process.env.MONGO_URI) return;
    try {
        const normalizedMessage = normalizeGlobalChatMessage(message, globalChatHistory.length);
        if (!normalizedMessage) return;

        const GlobalChatDb = mongoose.model('GlobalChat');
        await GlobalChatDb.findOneAndUpdate(
            {},
            {
                $push: {
                    messages: {
                        $each: [normalizedMessage],
                        $slice: -MAX_CHAT_HISTORY
                    }
                }
            },
            { upsert: true }
        );
    } catch (err) {
        console.error("Greška pri dodavanju chat poruke u bazu:", err);
    }
}

function queueGlobalChatMessageSave(message) {
    if (!process.env.MONGO_URI) return;
    globalChatSaveQueue = globalChatSaveQueue
        .then(() => appendGlobalChatMessageToDb(message))
        .catch(err => {
            console.error("Greška u redu za čuvanje chat poruka:", err);
        });
}

// GRACE PERIOD PROMENLJIVE
const disconnectTimers = {};
const ghostSessions = {};
const DISCONNECT_GRACE_MS = 30 * 1000;
const TOURNAMENT_DISCONNECT_GRACE_MS = 5 * 60 * 1000;
const RECONNECT_RESUME_MIN_TURN_MS = 15 * 1000;
const TOURNAMENT_PRESENCE_STALE_MS = 4500;
const SERVER_TECHNICAL_SYNC_IGNORE_WINDOW_MS = 20000;
const recentServerTechnicalResults = new Map();

function isTournamentRoomId(roomId) {
    return !!parseTournamentRoomId(roomId);
}

function getDisconnectGraceMs(roomId) {
    return isTournamentRoomId(roomId) ? TOURNAMENT_DISCONNECT_GRACE_MS : DISCONNECT_GRACE_MS;
}

function hasActiveDisconnectGraceForRoom(roomId) {
    if (!roomId) return false;
    return Object.entries(ghostSessions).some(([uid, ghost]) => (
        ghost &&
        ghost.roomId === roomId &&
        !!disconnectTimers[uid]
    ));
}

function getRoomDisconnectGraceRemainingMs(roomId) {
    if (!roomId) return 0;

    const now = Date.now();
    return Object.entries(ghostSessions).reduce((remaining, [uid, ghost]) => {
        if (!ghost || ghost.roomId !== roomId || !disconnectTimers[uid]) return remaining;

        const graceMs = getDisconnectGraceMs(roomId);
        const startedAt = toSafeInt(ghost.startedAt, now);
        return Math.max(remaining, Math.max(0, graceMs - (now - startedAt)));
    }, 0);
}

function getRoomPresenceKeys(state, socketId) {
    const keys = [];
    if (socketId) keys.push(socketId);

    const participant = getRoomParticipantMeta(state, socketId);
    if (participant?.uid) keys.push(`uid:${participant.uid}`);
    return keys;
}

function rememberRoomPresence(roomId, socket) {
    const state = roomState[roomId];
    if (!state || state.gameFinished || !Array.isArray(state.players) || !state.players.includes(socket.id)) return false;

    if (!state.playerPresenceAt || typeof state.playerPresenceAt !== 'object') {
        state.playerPresenceAt = {};
    }

    const now = Date.now();
    const uid = getSocketUid(socket.id) || socket.verifiedUid || socket.playerId;
    state.playerPresenceAt[socket.id] = now;
    if (uid) state.playerPresenceAt[`uid:${uid}`] = now;
    return true;
}

function getLatestRoomPresenceAt(state, socketId) {
    if (!state || !state.playerPresenceAt || typeof state.playerPresenceAt !== 'object') return 0;
    return getRoomPresenceKeys(state, socketId).reduce((latest, key) => {
        return Math.max(latest, toSafeInt(state.playerPresenceAt[key], 0));
    }, 0);
}

function hasStaleTournamentPresence(roomId, socketId) {
    if (!isTournamentRoomId(roomId)) return false;

    const state = roomState[roomId];
    if (!state || state.gameFinished) return false;

    const lastPresenceAt = getLatestRoomPresenceAt(state, socketId);
    return !lastPresenceAt || Date.now() - lastPresenceAt > TOURNAMENT_PRESENCE_STALE_MS;
}

function pauseRoomForDisconnectGrace(roomId) {
    const state = roomState[roomId];
    if (!state || state.gameFinished) return false;
    if (state.disconnectGracePausedAt && state.pausedTurnRemainingMs) return false;

    const currentDuration = Math.max(1, toSafeInt(state.turnTimeoutMs, TOTAL_TIMEOUT));
    const elapsed = Math.max(0, Date.now() - Math.max(0, toSafeInt(state.turnStartTime, Date.now())));
    state.pausedTurnRemainingMs = Math.max(1, currentDuration - elapsed);
    state.disconnectGracePausedAt = Date.now();
    stopTurnTimer(roomId);
    return true;
}

function resumeRoomAfterDisconnectGrace(roomId) {
    const state = roomState[roomId];
    if (!state || state.gameFinished || hasActiveDisconnectGraceForRoom(roomId)) return false;

    const remainingMs = Math.max(
        RECONNECT_RESUME_MIN_TURN_MS + GRACE_PERIOD,
        Math.min(TOTAL_TIMEOUT, toSafeInt(state.pausedTurnRemainingMs, TOTAL_TIMEOUT))
    );
    delete state.disconnectGracePausedAt;
    delete state.pausedTurnRemainingMs;
    startTurnTimer(roomId, remainingMs);
    return true;
}

function clearDisconnectGraceForUid(uid, roomId = null) {
    if (!uid) return false;

    const ghost = ghostSessions[uid];
    if (roomId && ghost && ghost.roomId !== roomId) return false;
    const ghostRoomId = ghost && (!roomId || ghost.roomId === roomId) ? ghost.roomId : null;

    let cleared = false;
    if (disconnectTimers[uid]) {
        clearTimeout(disconnectTimers[uid]);
        delete disconnectTimers[uid];
        cleared = true;
    }

    if (ghost && (!roomId || ghost.roomId === roomId)) {
        delete ghostSessions[uid];
        cleared = true;
    }

    if (cleared) {
        console.log(`♻️ Grace period poništen za igrača ${uid}${roomId ? ` u sobi ${roomId}` : ''}.`);
        if (ghostRoomId) {
            resumeRoomAfterDisconnectGrace(ghostRoomId);
        }
    }

    return cleared;
}

function clearDisconnectGraceForRoom(roomId) {
    if (!roomId) return;

    Object.entries(ghostSessions).forEach(([uid, ghost]) => {
        if (!ghost || ghost.roomId !== roomId) return;
        if (disconnectTimers[uid]) {
            clearTimeout(disconnectTimers[uid]);
            delete disconnectTimers[uid];
        }
        delete ghostSessions[uid];
    });
}

function beginReconnectGraceForSocket(socket, activeRoomId, source = 'disconnect') {
    if (!socket || !activeRoomId) return false;

    const pid = getSocketUid(socket.id) || socket.verifiedUid || socket.playerId;
    const activeRoomState = roomState[activeRoomId];
    if (!pid || !activeRoomState || activeRoomState.gameFinished) return false;
    if (!Array.isArray(activeRoomState.players) || !activeRoomState.players.includes(socket.id)) return false;

    const existingGhost = ghostSessions[pid];
    if (existingGhost && existingGhost.roomId === activeRoomId) {
        return true;
    }

    if (disconnectTimers[pid]) {
        clearTimeout(disconnectTimers[pid]);
        delete disconnectTimers[pid];
    }

    const graceMs = getDisconnectGraceMs(activeRoomId);
    console.log(`⏳ Pokrećem reconnect grace od ${Math.round(graceMs / 1000)}s za igrača: ${pid} (${source})`);

    ghostSessions[pid] = {
        roomId: activeRoomId,
        oldSocketId: socket.id,
        source,
        startedAt: Date.now()
    };

    pauseRoomForDisconnectGrace(activeRoomId);
    io.to(activeRoomId).emit('opponent_connection_lost', { graceMs, remainingMs: graceMs, source });

    disconnectTimers[pid] = setTimeout(async () => {
        const ghost = ghostSessions[pid];
        if (!ghost || ghost.roomId !== activeRoomId || ghost.oldSocketId !== socket.id) {
            console.log(`ℹ️ Ignorišem zastareli reconnect timeout za ${pid}; sesija je već obnovljena ili promenjena.`);
            delete disconnectTimers[pid];
            return;
        }

        console.log(`❌ Reconnect grace istekao za ${pid}. Partija se trajno prekida.`);
        let technicalResult = { winnerReward: 500, loserCoinPenalty: 500 };
        const stateAfterGrace = roomState[activeRoomId];

        if (stateAfterGrace && stateAfterGrace.gameFinished) {
            console.log(`ℹ️ Reconnect timeout za ${pid} preskočen; soba ${activeRoomId} je već završena.`);
            delete ghostSessions[pid];
            delete disconnectTimers[pid];
            return;
        }

        if (stateAfterGrace) {
            if (!stateAfterGrace.players.includes(ghost.oldSocketId)) {
                console.log(`ℹ️ Ignorišem reconnect timeout za ${pid}; stari socket više nije igrač u sobi ${activeRoomId}.`);
                delete ghostSessions[pid];
                delete disconnectTimers[pid];
                resumeRoomAfterDisconnectGrace(activeRoomId);
                return;
            }

            const penaltyAmount = getDynamicPenalty(activeRoomId);
            const oppSocketId = stateAfterGrace.players.find(id => id !== ghost.oldSocketId);
            const winnerParticipant = getRoomParticipantMeta(stateAfterGrace, oppSocketId);
            const loserParticipant = getRoomParticipantMeta(stateAfterGrace, ghost.oldSocketId);
            const winnerUid = winnerParticipant.uid;
            const h2hKey = getH2HKeyForOpponent(winnerParticipant);

            technicalResult = await applyServerSideTechnicalResult(winnerUid, pid, penaltyAmount, h2hKey, {
                winnerOpponent: loserParticipant,
                loserOpponent: winnerParticipant
            });
            await applyTournamentTechnicalWinner(activeRoomId, winnerUid, 'disconnect_grace_expired');
        } else {
            console.log(`ℹ️ Igrač ${pid} je napustio završenu, solo ili lokalnu partiju. Bez kazne.`);
        }

        const technicalWinnerSocketId = Array.isArray(stateAfterGrace?.players)
            ? stateAfterGrace.players.find(id => id !== ghost.oldSocketId)
            : '';
        const technicalWinner = stateAfterGrace && technicalWinnerSocketId
            ? getRoomParticipantMeta(stateAfterGrace, technicalWinnerSocketId)
            : null;
        const technicalLoser = stateAfterGrace
            ? getRoomParticipantMeta(stateAfterGrace, ghost.oldSocketId)
            : null;

        io.to(activeRoomId).emit('opponent_left', {
            winnerId: technicalWinnerSocketId || '',
            loserId: ghost.oldSocketId,
            duelType: getOnlineDuelType(activeRoomId),
            winnerName: technicalWinner?.name || 'Igrac',
            loserName: technicalLoser?.name || 'Igrac',
            reward: technicalResult.winnerReward,
            coinPenalty: technicalResult.loserCoinPenalty,
            serverApplied: technicalResult.serverApplied
        });

        cleanupOnlineRoom(activeRoomId);

        delete ghostSessions[pid];
        delete disconnectTimers[pid];
    }, graceMs);

    if (disconnectTimers[pid] && typeof disconnectTimers[pid].unref === 'function') {
        disconnectTimers[pid].unref();
    }

    return true;
}

function rememberServerTechnicalResult(uid, resultType) {
    if (!uid || (resultType !== 'win' && resultType !== 'loss')) return;

    const marker = { resultType, at: Date.now() };
    recentServerTechnicalResults.set(uid, marker);

    const cleanupTimer = setTimeout(() => {
        const current = recentServerTechnicalResults.get(uid);
        if (current && current.at === marker.at) {
            recentServerTechnicalResults.delete(uid);
        }
    }, SERVER_TECHNICAL_SYNC_IGNORE_WINDOW_MS);
    if (cleanupTimer && typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}

function getRecentServerTechnicalResult(uid) {
    if (!uid) return null;

    const marker = recentServerTechnicalResults.get(uid);
    if (!marker) return null;

    if (Date.now() - marker.at > SERVER_TECHNICAL_SYNC_IGNORE_WINDOW_MS) {
        recentServerTechnicalResults.delete(uid);
        return null;
    }

    return marker;
}

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

async function applyServerSidePenalty(playerId, penaltyAmount = 50, h2hKey = null, coinPenalty = 0, opponentMeta = null, syncExtra = {}) {
    if (!process.env.MONGO_URI || !playerId) return null;
    try {
        const UserProfile = mongoose.model('UserProfile');

        if (opponentMeta) {
            const user = await UserProfile.findOne({ firebaseUid: playerId });
            if (!user) return null;

            user.penaltyPoints = Math.max(0, toSafeInt(user.penaltyPoints, 0)) + penaltyAmount;
            user.games = Math.max(0, toSafeInt(user.games, 0)) + 1;
            user.losses = Math.max(0, toSafeInt(user.losses, 0)) + 1;
            user.currentWinStreak = 0;
            applyTechnicalDuelH2H(user, opponentMeta, 'loss');

            if (coinPenalty > 0) {
                user.balance = Math.max(0, Math.min(MAX_BALANCE, toSafeInt(user.balance, 0)) - coinPenalty);
                await applyTechnicalLeagueDelta(user, -coinPenalty);
            }

            await user.save();
            rememberServerTechnicalResult(playerId, 'loss');
            emitProfileSyncToUid(playerId, user, syncExtra);
            console.log(`⚖️ SERVER KAZNA: Dodato ${penaltyAmount} kaznenih poena i resetovan H2H igraču ${playerId} protiv ${opponentMeta.uid || opponentMeta.name || h2hKey || 'nepoznatog'}.`);
            return user;
        }

        let updateInc = { penaltyPoints: penaltyAmount, games: 1, losses: 1 };
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

        if (user) rememberServerTechnicalResult(playerId, 'loss');
        emitProfileSyncToUid(playerId, user, syncExtra);
        console.log(`⚖️ SERVER KAZNA: Dodato ${penaltyAmount} kaznenih poena i resetovan H2H igraču ${playerId} protiv ključa ${h2hKey || 'nepoznatog'}.`);
        return user;
    } catch (err) {
        console.error("Greška pri upisu server kazne:", err);
        return null;
    }
}

async function applyServerSideTechnicalResult(winnerId, loserId, penaltyAmount = 50, h2hKey = null, h2hContext = {}) {
    const winnerReward = await getTechnicalCoinAmount(winnerId);
    const loserCoinPenalty = await getTechnicalCoinAmount(loserId);

    if (!process.env.MONGO_URI) {
        return { winnerReward, loserCoinPenalty, serverApplied: false };
    }

    if (winnerId) {
        const winner = await UserProfile.findOne({ firebaseUid: winnerId });
        if (winner) {
            winner.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(winner.balance, 0)) + winnerReward);
            winner.games = Math.max(0, toSafeInt(winner.games, 0)) + 1;
            winner.totalScoreSum = Math.max(0, toSafeInt(winner.totalScoreSum, 0)) + winnerReward;
            winner.wins = Math.max(0, toSafeInt(winner.wins, 0)) + 1;
            winner.currentWinStreak = Math.max(0, toSafeInt(winner.currentWinStreak, 0)) + 1;
            winner.maxWinStreak = Math.max(
                Math.max(0, toSafeInt(winner.maxWinStreak, 0)),
                winner.currentWinStreak
            );
            const winnerOpponent = h2hContext.winnerOpponent || (loserId ? { uid: loserId, name: 'Nepoznat' } : null);
            if (winnerOpponent) {
                applyTechnicalDuelH2H(winner, winnerOpponent, 'win');
            }
            await applyTechnicalLeagueDelta(winner, winnerReward);
            await winner.save();
            rememberServerTechnicalResult(winnerId, 'win');
            emitProfileSyncToUid(winnerId, winner, { serverTechnicalResult: 'win' });
        }
    }

    await applyServerSidePenalty(loserId, penaltyAmount, h2hKey, loserCoinPenalty, h2hContext.loserOpponent || null, { serverTechnicalResult: 'loss' });
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

function sumDice(values = []) {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function normalizeDiceValues(values, allowZero = false) {
    if (!Array.isArray(values) || values.length !== 6) return null;
    const min = allowZero ? 0 : 1;
    const normalized = values.map(value => Number(value));
    if (normalized.some(value => !Number.isInteger(value) || value < min || value > 6)) return null;
    return normalized;
}

function normalizeHeldValues(values) {
    if (!Array.isArray(values) || values.length !== 6) return null;
    return values.map(Boolean);
}

function getBestDiceForRow(row, diceValues) {
    const dice = Array.isArray(diceValues) ? [...diceValues] : [];
    if (row === "Min") return dice.sort((a, b) => a - b).slice(0, 5);
    if (row === "Max") return dice.sort((a, b) => b - a).slice(0, 5);
    if (row === "Kenta") {
        const unique = [...new Set(dice)].sort((a, b) => a - b);
        if ([2, 3, 4, 5, 6].every(value => unique.includes(value))) return [2, 3, 4, 5, 6];
        if ([1, 2, 3, 4, 5].every(value => unique.includes(value))) return [1, 2, 3, 4, 5];
        return dice.sort((a, b) => b - a).slice(0, 5);
    }
    if (row === "Ful") {
        const counts = {};
        dice.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
        const keys = Object.keys(counts).map(Number);
        if (keys.some(value => counts[value] >= 5)) return Array(5).fill(keys.find(value => counts[value] >= 5));
        const threes = keys.filter(value => counts[value] >= 3);
        const pairs = keys.filter(value => counts[value] >= 2);
        const candidates = [];
        threes.forEach(three => {
            pairs.forEach(pair => {
                if (three !== pair) candidates.push([...Array(3).fill(three), ...Array(2).fill(pair)]);
            });
        });
        if (candidates.length > 0) return candidates.sort((a, b) => sumDice(b) - sumDice(a))[0];
    }
    if (["1", "2", "3", "4", "5", "6"].includes(row)) {
        const target = parseInt(row, 10);
        const match = dice.filter(value => value === target);
        const rest = dice.filter(value => value !== target).sort((a, b) => b - a);
        return [...match, ...rest].slice(0, 5);
    }
    const counts = {};
    dice.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
    dice.sort((a, b) => {
        if (counts[b] !== counts[a]) return counts[b] - counts[a];
        return b - a;
    });
    return dice.slice(0, 5);
}

function calculateMovePoints(row, diceValues, rollCount = 3) {
    const values = Array.isArray(diceValues) ? diceValues : [];
    const total = sumDice(values);
    if (["1", "2", "3", "4", "5", "6"].includes(row)) {
        const target = parseInt(row, 10);
        return values.filter(value => value === target).length * target;
    }
    if (row === "Max" || row === "Min") return total;
    if (row === "Triling") {
        const counts = {};
        values.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
        if (Object.values(counts).some(count => count >= 3)) {
            return (3 * Number(Object.keys(counts).find(key => counts[key] >= 3))) + 20;
        }
        return 0;
    }
    if (row === "Kenta") {
        const unique = [...new Set(values)].sort((a, b) => a - b);
        const kentaOne = [1, 2, 3, 4, 5].every(value => unique.includes(value));
        const kentaTwo = [2, 3, 4, 5, 6].every(value => unique.includes(value));
        if (kentaOne || kentaTwo) {
            if (rollCount === 1) return 66;
            if (rollCount === 2) return 56;
            return 46;
        }
        return 0;
    }
    if (row === "Ful") {
        const counts = {};
        values.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
        if (Object.values(counts).includes(5) || (Object.values(counts).includes(3) && Object.values(counts).includes(2))) {
            return total + 30;
        }
        return 0;
    }
    if (row === "Poker") {
        const counts = {};
        values.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
        if (Object.values(counts).some(count => count >= 4)) {
            return (Number(Object.keys(counts).find(key => counts[key] >= 4)) * 4) + 40;
        }
        return 0;
    }
    if (row === "Yamb") {
        const counts = {};
        values.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
        if (Object.values(counts).some(count => count >= 5)) {
            return (Number(Object.keys(counts).find(key => counts[key] >= 5)) * 5) + 50;
        }
        return 0;
    }
    return 0;
}

function calculateServerMovePoints(row, col, diceValues, rollCount) {
    if (col === "Ručno" && rollCount > 1) return 0;
    return calculateMovePoints(row, getBestDiceForRow(row, diceValues), rollCount);
}

function isValidColumnOrderForMove(row, col, sheet) {
    if (!sheet || !sheet[col]) return false;
    if (col === "Nadole") {
        const idx = REDOVI_IGRA.indexOf(row);
        if (idx > 0 && sheet["Nadole"][REDOVI_IGRA[idx - 1]] === null) return false;
    }
    if (col === "Nagore") {
        const idx = REDOVI_IGRA.indexOf(row);
        if (idx < REDOVI_IGRA.length - 1 && sheet["Nagore"][REDOVI_IGRA[idx + 1]] === null) return false;
    }
    if (col === "Sredina") {
        const up = ["Max", "6", "5", "4", "3", "2", "1"];
        const down = ["Min", "Triling", "Kenta", "Ful", "Poker", "Yamb"];
        if (up.includes(row)) {
            const idx = up.indexOf(row);
            if (idx === 0) return true;
            return sheet[col][up[idx - 1]] !== null;
        }
        if (down.includes(row)) {
            const idx = down.indexOf(row);
            if (idx === 0) return true;
            return sheet[col][down[idx - 1]] !== null;
        }
        return false;
    }
    return true;
}

function rollServerDice(previousValues, heldValues) {
    const previous = normalizeDiceValues(previousValues, true) || [0, 0, 0, 0, 0, 0];
    const held = normalizeHeldValues(heldValues) || [false, false, false, false, false, false];
    return previous.map((value, index) => {
        if (held[index] && value >= 1 && value <= 6) return value;
        return crypto.randomInt(1, 7);
    });
}

function getCompletedDuelCell(sheet, col, row) {
    const value = sheet && sheet[col] ? sheet[col][row] : null;
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.max(0, Math.min(MAX_SCORE, Math.floor(num)));
}

function isCompletedDuelSheet(sheet) {
    return KOLONE.every(col => sheet && sheet[col] && REDOVI_IGRA.every(row => {
        return getCompletedDuelCell(sheet, col, row) !== null;
    }));
}

function calculateCompletedDuelMiddleScore(sheet, col) {
    const max = getCompletedDuelCell(sheet, col, 'Max') || 0;
    const min = getCompletedDuelCell(sheet, col, 'Min') || 0;
    const ones = getCompletedDuelCell(sheet, col, '1') || 0;
    if (min <= 0) return 0;
    const score = Math.max(0, (max - min) * ones);
    return score >= 60 ? score + 40 : score;
}

function calculateCompletedDuelTotal(sheet) {
    if (!isCompletedDuelSheet(sheet)) return null;

    return KOLONE.reduce((grandTotal, col) => {
        let top = ['1', '2', '3', '4', '5', '6']
            .reduce((total, row) => total + (getCompletedDuelCell(sheet, col, row) || 0), 0);
        if (top >= 60) top += 30;

        const middle = calculateCompletedDuelMiddleScore(sheet, col);
        const bottom = ['Triling', 'Kenta', 'Ful', 'Poker', 'Yamb']
            .reduce((total, row) => total + (getCompletedDuelCell(sheet, col, row) || 0), 0);

        return grandTotal + top + middle + bottom;
    }, 0);
}

function getDuelParticipantMeta(socketId, fallbackName = 'Igrac', fallbackUid = '') {
    const participantSocket = io.sockets.sockets.get(socketId);
    const stableUid = String(fallbackUid || '').trim();
    return {
        socketId,
        uid: registeredSockets[socketId] || participantSocket?.verifiedUid || participantSocket?.playerId || stableUid,
        name: sanitizeTournamentName(participantSocket?.playerName || fallbackName || 'Igrac'),
        photoUrl: String(participantSocket?.photoUrl || '').substring(0, 500)
    };
}

function getRoomParticipantMeta(state, socketId) {
    if (!state || !socketId) return getDuelParticipantMeta(socketId);

    const playerIndex = Array.isArray(state.players) ? state.players.indexOf(socketId) : -1;
    const fallbackName = playerIndex >= 0 && Array.isArray(state.playerNames) ? state.playerNames[playerIndex] : undefined;
    const fallbackUid = playerIndex >= 0 && Array.isArray(state.playerUids) ? state.playerUids[playerIndex] : '';

    return getDuelParticipantMeta(socketId, fallbackName, fallbackUid);
}

function getOnlineDuelType(roomId = '') {
    const id = String(roomId || '');
    if (id.startsWith('tourney_')) return 'tournament';
    if (id.startsWith('duel_')) return 'challenge';
    if (id.startsWith('yamb-')) return 'friend_invite';
    if (id.startsWith('room_')) return 'random';
    return 'online';
}

function emitCompletedOnlineGame(roomId) {
    const state = roomState[roomId];
    if (!state || !Array.isArray(state.players) || state.players.length < 2) return false;
    if (state.completedGameFinishedEmitted) return false;
    if (!Array.isArray(state.allScores) || state.allScores.length < 2) return false;

    const totals = state.allScores.slice(0, 2).map(sheet => calculateCompletedDuelTotal(sheet));
    if (totals.some(score => score === null)) return false;
    state.completedGameFinishedEmitted = true;

    const stablePlayerUids = Array.isArray(state.playerUids) ? state.playerUids : [];
    const players = state.players.slice(0, 2).map((socketId, index) => {
        return getDuelParticipantMeta(socketId, state.playerNames?.[index], stablePlayerUids[index]).name;
    });
    const finalResults = players.map((name, index) => ({
        name,
        score: totals[index],
        uid: stablePlayerUids[index] || ''
    }));
    const winnerScore = Math.max(...totals);
    const winnerIndexes = totals
        .map((score, index) => ({ score, index }))
        .filter(item => item.score === winnerScore)
        .map(item => item.index);
    const isDraw = winnerIndexes.length !== 1;
    const winnerIndex = isDraw ? -1 : winnerIndexes[0];

    io.to(roomId).emit('online_game_finished', {
        roomId,
        duelType: getOnlineDuelType(roomId),
        players,
        finalResults,
        totals,
        isDraw,
        winnerIndex,
        winnerName: winnerIndex >= 0 ? players[winnerIndex] : '',
        winnerScore,
        allScores: state.allScores,
        currentPlayerIdx: state.turnIndex
    });
    return true;
}

function getH2HKeyForOpponent(opponent) {
    const uid = String(opponent?.uid || '').trim();
    if (uid && uid.length >= 20 && !uid.startsWith('guest_')) return uid;
    return sanitizeTournamentName(opponent?.name || 'Nepoznat').replace(/\./g, '_').replace(/\$/g, '_');
}

function isStableH2HUid(value, selfUid = '') {
    const uid = String(value || '').trim();
    return !!uid &&
        uid !== String(selfUid || '').trim() &&
        uid !== 'undefined' &&
        uid !== 'null' &&
        !uid.startsWith('guest_') &&
        uid.length >= 16 &&
        !/\s/.test(uid);
}

function normalizeH2HNameKey(value) {
    const raw = String(value || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null' || raw === 'Nepoznat') return '';
    return sanitizeTournamentName(raw)
        .toLowerCase()
        .replace(/\./g, '_')
        .replace(/\$/g, '_')
        .replace(/\s+/g, '_');
}

function isGuestH2HName(value) {
    const key = normalizeH2HNameKey(value);
    return key === 'gost' ||
        key.startsWith('gost_') ||
        key === 'guest' ||
        key.startsWith('guest_');
}

function mergeH2HRecord(base = {}, incoming = {}, identity = {}, options = {}) {
    const baseTotal = toSafeInt(base.wins) + toSafeInt(base.losses) + toSafeInt(base.draws);
    const incomingTotal = toSafeInt(incoming.wins) + toSafeInt(incoming.losses) + toSafeInt(incoming.draws);
    const baseContainsIncoming = toSafeInt(base.wins) >= toSafeInt(incoming.wins) &&
        toSafeInt(base.losses) >= toSafeInt(incoming.losses) &&
        toSafeInt(base.draws) >= toSafeInt(incoming.draws) &&
        toSafeInt(base.gamesWithScore) >= toSafeInt(incoming.gamesWithScore) &&
        toSafeInt(base.myTotalScore) >= toSafeInt(incoming.myTotalScore);
    const incomingContainsBase = toSafeInt(incoming.wins) >= toSafeInt(base.wins) &&
        toSafeInt(incoming.losses) >= toSafeInt(base.losses) &&
        toSafeInt(incoming.draws) >= toSafeInt(base.draws) &&
        toSafeInt(incoming.gamesWithScore) >= toSafeInt(base.gamesWithScore) &&
        toSafeInt(incoming.myTotalScore) >= toSafeInt(base.myTotalScore);
    const combineCounts = !!options.combineCounts &&
        baseTotal > 0 &&
        incomingTotal > 0 &&
        !baseContainsIncoming &&
        !incomingContainsBase;
    const currentWinStreak = incomingTotal > baseTotal
        ? toSafeInt(incoming.currentWinStreak)
        : (baseTotal > incomingTotal
            ? toSafeInt(base.currentWinStreak)
            : Math.max(toSafeInt(base.currentWinStreak), toSafeInt(incoming.currentWinStreak)));
    const maxWinStreak = Math.max(
        toSafeInt(base.maxWinStreak),
        toSafeInt(incoming.maxWinStreak),
        currentWinStreak
    );

    return {
        ...base,
        ...incoming,
        name: identity.name || sanitizeTournamentName(incoming.name || base.name || 'Nepoznat'),
        uid: identity.uid || incoming.uid || base.uid || '',
        photo: incoming.photo && incoming.photo.length > 5 ? incoming.photo : (base.photo || ''),
        wins: combineCounts ? toSafeInt(base.wins) + toSafeInt(incoming.wins) : Math.max(toSafeInt(base.wins), toSafeInt(incoming.wins)),
        losses: combineCounts ? toSafeInt(base.losses) + toSafeInt(incoming.losses) : Math.max(toSafeInt(base.losses), toSafeInt(incoming.losses)),
        draws: combineCounts ? toSafeInt(base.draws) + toSafeInt(incoming.draws) : Math.max(toSafeInt(base.draws), toSafeInt(incoming.draws)),
        myTotalScore: combineCounts ? toSafeInt(base.myTotalScore) + toSafeInt(incoming.myTotalScore) : Math.max(toSafeInt(base.myTotalScore), toSafeInt(incoming.myTotalScore)),
        gamesWithScore: combineCounts ? toSafeInt(base.gamesWithScore) + toSafeInt(incoming.gamesWithScore) : Math.max(toSafeInt(base.gamesWithScore), toSafeInt(incoming.gamesWithScore)),
        myHighScore: Math.max(toSafeInt(base.myHighScore), toSafeInt(incoming.myHighScore)),
        maxWinMargin: Math.max(toSafeInt(base.maxWinMargin), toSafeInt(incoming.maxWinMargin)),
        maxLossMargin: Math.max(toSafeInt(base.maxLossMargin), toSafeInt(incoming.maxLossMargin)),
        currentWinStreak,
        maxWinStreak
    };
}

function normalizeH2HStatsForUser(h2hStats = {}, selfUid = '', selfName = '') {
    const normalized = {};
    if (!h2hStats || typeof h2hStats !== 'object') return normalized;

    const selfNameKey = normalizeH2HNameKey(selfName);

    for (const [rawKey, rawRecord] of Object.entries(h2hStats)) {
        if (!rawRecord || typeof rawRecord !== 'object') continue;
        const rawUid = String(rawRecord.uid || rawKey || '').trim();
        if (selfUid && rawUid === String(selfUid || '').trim()) continue;
        if (rawUid.startsWith('guest_')) continue;
        const rawName = String(rawRecord.name || (isStableH2HUid(rawKey, selfUid) ? '' : rawKey) || '').trim();
        if (!rawName || rawName === 'undefined' || rawName === 'null' || rawName === 'Nepoznat') continue;
        if (isGuestH2HName(rawName)) continue;
        const name = sanitizeTournamentName(rawName);
        const nameKey = normalizeH2HNameKey(name);
        if (!nameKey || name === 'Nepoznat' || name === 'undefined' || name === 'null') continue;

        let uid = isStableH2HUid(rawRecord.uid, selfUid) ? String(rawRecord.uid).trim() : '';
        if (!uid && isStableH2HUid(rawKey, selfUid)) uid = String(rawKey).trim();
        if (!uid && selfNameKey && nameKey === selfNameKey) continue;

        const identity = { key: uid || `name_${nameKey}`, name, uid };
        let targetKey = identity.key;

        for (const [existingKey, existingRecord] of Object.entries(normalized)) {
            if (existingKey === targetKey || !existingRecord) continue;
            const sameName = normalizeH2HNameKey(existingRecord.name) === nameKey;
            if (!sameName) continue;

            const existingUid = isStableH2HUid(existingRecord.uid, selfUid)
                ? String(existingRecord.uid).trim()
                : (isStableH2HUid(existingKey, selfUid) ? existingKey : '');
            if (uid || existingUid) {
                identity.uid = uid || existingUid;
                targetKey = identity.uid;
            }

            normalized[targetKey] = mergeH2HRecord(normalized[targetKey], existingRecord, identity, { combineCounts: true });
            delete normalized[existingKey];
        }

        normalized[targetKey] = mergeH2HRecord(normalized[targetKey], rawRecord, identity, { combineCounts: true });
    }

    return normalized;
}

function applyCompletedDuelH2H(user, opponent, resultType, myScore, opponentScore) {
    if (!user || !opponent) return;

    const h2hKey = getH2HKeyForOpponent(opponent);
    if (!h2hKey) return;

    const h2h = user.h2hStats && typeof user.h2hStats === 'object' ? { ...user.h2hStats } : {};
    const existing = h2h[h2hKey] && typeof h2h[h2hKey] === 'object' ? h2h[h2hKey] : {};
    const record = {
        ...existing,
        name: sanitizeTournamentName(existing.name || opponent.name || 'Nepoznat'),
        uid: opponent.uid || existing.uid || '',
        photo: opponent.photoUrl || existing.photo || '',
        wins: Math.max(0, toSafeInt(existing.wins, 0)),
        losses: Math.max(0, toSafeInt(existing.losses, 0)),
        draws: Math.max(0, toSafeInt(existing.draws, 0)),
        myTotalScore: Math.max(0, toSafeInt(existing.myTotalScore, 0)),
        gamesWithScore: Math.max(0, toSafeInt(existing.gamesWithScore, 0)),
        myHighScore: Math.max(0, toSafeInt(existing.myHighScore, 0)),
        maxWinMargin: Math.max(0, toSafeInt(existing.maxWinMargin, 0)),
        maxLossMargin: Math.max(0, toSafeInt(existing.maxLossMargin, 0)),
        currentWinStreak: Math.max(0, toSafeInt(existing.currentWinStreak, 0)),
        maxWinStreak: Math.max(0, toSafeInt(existing.maxWinStreak, 0))
    };

    if (resultType === 'win') {
        record.wins += 1;
        record.currentWinStreak += 1;
        record.maxWinStreak = Math.max(record.maxWinStreak, record.currentWinStreak);
        record.maxWinMargin = Math.max(record.maxWinMargin, Math.max(0, myScore - opponentScore));
    } else if (resultType === 'loss') {
        record.losses += 1;
        record.currentWinStreak = 0;
        record.maxLossMargin = Math.max(record.maxLossMargin, Math.max(0, opponentScore - myScore));
    } else if (resultType === 'draw') {
        record.draws += 1;
        record.currentWinStreak = 0;
    }

    record.myTotalScore += myScore;
    record.gamesWithScore += 1;
    record.myHighScore = Math.max(record.myHighScore, myScore);

    h2h[h2hKey] = record;
    user.set('h2hStats', h2h);
    user.markModified('h2hStats');
}

function applyTechnicalDuelH2H(user, opponent, resultType) {
    if (!user || !opponent) return;

    const h2hKey = getH2HKeyForOpponent(opponent);
    if (!h2hKey) return;

    const h2h = user.h2hStats && typeof user.h2hStats === 'object' ? { ...user.h2hStats } : {};
    const existing = h2h[h2hKey] && typeof h2h[h2hKey] === 'object' ? h2h[h2hKey] : {};
    const record = {
        ...existing,
        name: sanitizeTournamentName(existing.name || opponent.name || 'Nepoznat'),
        uid: opponent.uid || existing.uid || '',
        photo: opponent.photoUrl || existing.photo || '',
        wins: Math.max(0, toSafeInt(existing.wins, 0)),
        losses: Math.max(0, toSafeInt(existing.losses, 0)),
        draws: Math.max(0, toSafeInt(existing.draws, 0)),
        myTotalScore: Math.max(0, toSafeInt(existing.myTotalScore, 0)),
        gamesWithScore: Math.max(0, toSafeInt(existing.gamesWithScore, 0)),
        myHighScore: Math.max(0, toSafeInt(existing.myHighScore, 0)),
        maxWinMargin: Math.max(0, toSafeInt(existing.maxWinMargin, 0)),
        maxLossMargin: Math.max(0, toSafeInt(existing.maxLossMargin, 0)),
        currentWinStreak: Math.max(0, toSafeInt(existing.currentWinStreak, 0)),
        maxWinStreak: Math.max(0, toSafeInt(existing.maxWinStreak, 0))
    };

    if (resultType === 'win') {
        record.wins += 1;
        record.currentWinStreak += 1;
        record.maxWinStreak = Math.max(record.maxWinStreak, record.currentWinStreak);
    } else if (resultType === 'loss') {
        record.losses += 1;
        record.currentWinStreak = 0;
    } else if (resultType === 'draw') {
        record.draws += 1;
        record.currentWinStreak = 0;
    }

    h2h[h2hKey] = record;
    user.set('h2hStats', h2h);
    user.markModified('h2hStats');
}

function applyCompletedDuelProfileStats(user, resultType, score) {
    const safeScore = Math.max(0, Math.min(MAX_SCORE, toSafeInt(score, 0)));

    user.games = Math.max(0, toSafeInt(user.games, 0)) + 1;
    user.totalScoreSum = Math.max(0, toSafeInt(user.totalScoreSum, 0)) + safeScore;
    user.highscore = Math.max(Math.max(0, toSafeInt(user.highscore, 0)), safeScore);

    if (resultType === 'win') {
        user.wins = Math.max(0, toSafeInt(user.wins, 0)) + 1;
        user.currentWinStreak = Math.max(0, toSafeInt(user.currentWinStreak, 0)) + 1;
        user.maxWinStreak = Math.max(
            Math.max(0, toSafeInt(user.maxWinStreak, 0)),
            user.currentWinStreak
        );
    } else if (resultType === 'loss') {
        user.losses = Math.max(0, toSafeInt(user.losses, 0)) + 1;
        user.currentWinStreak = 0;
    } else if (resultType === 'draw') {
        user.currentWinStreak = 0;
    }
}

async function applyServerSideCompletedDuel(roomId, finisherSocketId = null) {
    if (!MONGO_URI || !roomId || !roomState[roomId]) return false;

    const state = roomState[roomId];
    if (state.completedDuelStatsApplied) return false;
    if (!Array.isArray(state.players) || state.players.length !== 2) return false;
    if (finisherSocketId && !state.players.includes(finisherSocketId)) return false;
    if (!Array.isArray(state.allScores) || state.allScores.length < 2) return false;

    const totals = state.allScores.slice(0, 2).map(sheet => calculateCompletedDuelTotal(sheet));
    if (totals.some(score => score === null)) return false;

    const stablePlayerUids = Array.isArray(state.playerUids) ? state.playerUids : [];
    const participants = state.players.slice(0, 2).map((socketId, index) => ({
        ...getDuelParticipantMeta(socketId, state.playerNames?.[index], stablePlayerUids[index]),
        score: totals[index]
    }));

    if (participants.some(player => !player.uid || player.uid.startsWith('guest_'))) return false;

    state.completedDuelStatsApplied = true;

    try {
        const isDraw = participants[0].score === participants[1].score;

        for (let i = 0; i < participants.length; i++) {
            const player = participants[i];
            const opponent = participants[i === 0 ? 1 : 0];
            const resultType = isDraw ? 'draw' : (player.score > opponent.score ? 'win' : 'loss');
            const user = await UserProfile.findOne({ firebaseUid: player.uid });

            if (!user) continue;

            applyCompletedDuelProfileStats(user, resultType, player.score);
            applyCompletedDuelH2H(user, opponent, resultType, player.score, opponent.score);
            await user.save();
            emitProfileSyncToUid(player.uid, user, {
                duelResult: {
                    roomId,
                    resultType,
                    score: player.score,
                    opponentScore: opponent.score
                }
            });
        }

        console.log(`SERVER DUEL RESULT: Upisan regularan online rezultat za sobu ${roomId}: ${participants[0].score}-${participants[1].score}.`);
        return true;
    } catch (err) {
        state.completedDuelStatsApplied = false;
        console.error("Greska pri serverskom upisu regularnog online duela:", err);
        return false;
    }
}

// ==================================================================
// --- SERVER-SIDE TURN TIMER I STATE LOGIC (AUTORITATIVNI TAJMER) ---
// ==================================================================
const TURN_TIME_LIMIT = 90000;
const GRACE_PERIOD = 3000;
const TOTAL_TIMEOUT = TURN_TIME_LIMIT + GRACE_PERIOD;
const TURN_TIMEOUT_WATCHDOG_MS = 5000;
const FINISHED_ROOM_CLEANUP_MS = 5 * 60 * 1000;

const roomTimers = {};
const roomState = {};
const finishedRoomCleanupTimers = {};

function startTurnTimer(roomId, durationMs = TOTAL_TIMEOUT) {
    const state = roomState[roomId];
    if (!state) return;
    if (state.gameFinished) return;

    clearFinishedRoomCleanup(roomId);

    stopTurnTimer(roomId);

    const safeDurationMs = Math.max(1000, Math.min(TOTAL_TIMEOUT, toSafeInt(durationMs, TOTAL_TIMEOUT)));
    state.turnStartTime = Date.now();
    state.turnTimeoutMs = safeDurationMs;
    state.turnClientTimeLimitMs = Math.max(1000, safeDurationMs - GRACE_PERIOD);
    if (!state.playerPresenceAt || typeof state.playerPresenceAt !== 'object') {
        state.playerPresenceAt = {};
    }
    if (Array.isArray(state.players)) {
        state.players.forEach(socketId => {
            if (!state.playerPresenceAt[socketId]) {
                state.playerPresenceAt[socketId] = state.turnStartTime;
            }
            const participant = getRoomParticipantMeta(state, socketId);
            if (participant?.uid && !state.playerPresenceAt[`uid:${participant.uid}`]) {
                state.playerPresenceAt[`uid:${participant.uid}`] = state.turnStartTime;
            }
        });
    }
    state.turnTimerToken = (Math.max(0, toSafeInt(state.turnTimerToken, 0)) + 1);
    const timerToken = state.turnTimerToken;

    roomTimers[roomId] = setTimeout(() => {
        delete roomTimers[roomId];
        handleTechnicalTimeout(roomId, null, timerToken);
    }, safeDurationMs);
}

function stopTurnTimer(roomId) {
    if (roomTimers[roomId]) {
        clearTimeout(roomTimers[roomId]);
        delete roomTimers[roomId];
    }
}

function clearFinishedRoomCleanup(roomId) {
    if (finishedRoomCleanupTimers[roomId]) {
        clearTimeout(finishedRoomCleanupTimers[roomId]);
        delete finishedRoomCleanupTimers[roomId];
    }
}

function scheduleFinishedRoomCleanup(roomId) {
    clearFinishedRoomCleanup(roomId);
    finishedRoomCleanupTimers[roomId] = setTimeout(() => {
        const state = roomState[roomId];
        if (state && state.gameFinished) {
            cleanupOnlineRoom(roomId);
        }
    }, FINISHED_ROOM_CLEANUP_MS);
}

function markOnlineRoomGameFinished(roomId) {
    const state = roomState[roomId];
    if (!state) return false;

    state.gameFinished = true;
    state.finishedAt = Date.now();
    stopTurnTimer(roomId);
    clearDisconnectGraceForRoom(roomId);
    scheduleFinishedRoomCleanup(roomId);
    notifyOnlinePlayersStatusChanged();
    return true;
}

function cleanupOnlineRoom(roomId) {
    if (!roomId) return;

    clearFinishedRoomCleanup(roomId);
    clearDisconnectGraceForRoom(roomId);

    const state = roomState[roomId];
    if (state && Array.isArray(state.players)) {
        state.players.forEach(socketId => {
            if (playerRooms[socketId] === roomId) {
                delete playerRooms[socketId];
            }
        });
    }

    Object.keys(playerRooms).forEach(socketId => {
        if (playerRooms[socketId] === roomId) {
            delete playerRooms[socketId];
        }
    });

    stopTurnTimer(roomId);
    delete roomState[roomId];
    if (privateRooms[roomId]) delete privateRooms[roomId];
    notifyOnlinePlayersStatusChanged();

    const clients = io.sockets.adapter.rooms.get(roomId);
    if (clients) {
        Array.from(clients).forEach(socketId => {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (!clientSocket) return;

            if (clientSocket.spectatingRoom === roomId) {
                clientSocket.isSpectator = false;
                clientSocket.spectatingRoom = null;
            }

            clientSocket.leave(roomId);
        });
    }
}

async function handleTechnicalTimeout(roomId, inactivePlayerSocketId = null, expectedTimerToken = null) {
    const state = roomState[roomId];
    if (!state) return;
    if (state.gameFinished) return;
    if (hasActiveDisconnectGraceForRoom(roomId)) {
        console.log(`ℹ️ Ignorišem timeout u sobi ${roomId}; aktivan je reconnect grace.`);
        return;
    }

    if (expectedTimerToken !== null && state.turnTimerToken !== expectedTimerToken) {
        console.log(`ℹ️ Ignorišem zastareli timeout u sobi ${roomId}; token ${expectedTimerToken} više nije aktivan.`);
        return;
    }

    if (state.technicalTimeoutInProgress) return;

    const currentTurnSocketId = state.players[state.turnIndex];
    const timedOutSocketId = inactivePlayerSocketId || currentTurnSocketId;

    if (!timedOutSocketId || currentTurnSocketId !== timedOutSocketId) {
        console.log(`ℹ️ Ignorišem timeout u sobi ${roomId}; aktivni socket je ${currentTurnSocketId}, zahtev je za ${timedOutSocketId}.`);
        return;
    }

    if (hasStaleTournamentPresence(roomId, timedOutSocketId)) {
        const timedOutSocket = io.sockets.sockets.get(timedOutSocketId);
        if (timedOutSocket && beginReconnectGraceForSocket(timedOutSocket, roomId, 'presence_stale_timeout')) {
            console.log(`ℹ️ TURNIR: Timeout pretvoren u reconnect grace za ${timedOutSocketId}; foreground heartbeat je zastareo.`);
            return;
        }
    }

    state.technicalTimeoutInProgress = true;

    const winnerSocketId = state.players.find(id => id !== timedOutSocketId);

    if (winnerSocketId) {
        const winnerParticipant = getRoomParticipantMeta(state, winnerSocketId);
        const inactiveParticipant = getRoomParticipantMeta(state, timedOutSocketId);
        const inactiveUid = inactiveParticipant.uid;
        const winnerUid = winnerParticipant.uid;
        const penaltyAmount = getDynamicPenalty(roomId);

        const h2hKey = getH2HKeyForOpponent(winnerParticipant);
        const technicalResult = await applyServerSideTechnicalResult(winnerUid, inactiveUid, penaltyAmount, h2hKey, {
            winnerOpponent: inactiveParticipant,
            loserOpponent: winnerParticipant
        });
        await applyTournamentTechnicalWinner(roomId, winnerUid, 'turn_timeout');

        console.log(`⏱️ TIMEOUT: Isteklo vreme u sobi ${roomId}. Pobednik je ${winnerSocketId} (Tehnička pobeda)`);

        io.to(roomId).emit('game_over_timeout', {
            winnerId: winnerSocketId,
            loserId: timedOutSocketId,
            duelType: getOnlineDuelType(roomId),
            winnerName: winnerParticipant.name,
            loserName: inactiveParticipant.name,
            winnerReward: technicalResult.winnerReward,
            coinPenalty: technicalResult.loserCoinPenalty,
            serverApplied: technicalResult.serverApplied,
            penalty: penaltyAmount,
            message: 'Protivniku je isteklo vreme! Tehnička pobeda.'
        });
    }

    cleanupOnlineRoom(roomId);
}

function sweepTurnTimeouts() {
    const now = Date.now();

    for (const [roomId, state] of Object.entries(roomState)) {
        if (!state || state.gameFinished || state.technicalTimeoutInProgress) continue;
        if (hasActiveDisconnectGraceForRoom(roomId)) continue;
        if (!Array.isArray(state.players) || state.players.length < 2) continue;
        if (!state.turnStartTime) continue;

        const turnTimeoutMs = Math.max(1000, toSafeInt(state.turnTimeoutMs, TOTAL_TIMEOUT));
        const elapsed = now - state.turnStartTime;
        if (elapsed < turnTimeoutMs) continue;

        const currentTurnSocketId = state.players[state.turnIndex];
        const timerToken = state.turnTimerToken !== undefined ? state.turnTimerToken : null;
        console.log(`🛡️ WATCHDOG: Soba ${roomId} je prešla limit (${elapsed}ms/${turnTimeoutMs}ms). Pokrećem tehničku pobedu.`);
        handleTechnicalTimeout(roomId, currentTurnSocketId, timerToken);
    }
}

setInterval(sweepTurnTimeouts, TURN_TIMEOUT_WATCHDOG_MS);
// ==================================================================

function generateTournamentBracket() {
    if (!hasFullTournamentRoster()) {
        tournamentState.status = 'registration';
        ensureTournamentRegistrationBracket();
        saveTournamentToDb();
        return false;
    }

    tournamentState.status = 'active';
    ensureTournamentRegistrationBracket();

    const registrationSlots = tournamentState.bracket.qf
        .flatMap(match => match ? [match.p1, match.p2] : [null, null])
        .filter(Boolean);
    const slotIds = new Set(registrationSlots.map(player => player.id));
    const hasRandomRegistrationBracket = (
        registrationSlots.length === 8 &&
        slotIds.size === 8 &&
        tournamentState.players.length === 8 &&
        tournamentState.players.every(player => slotIds.has(player.id))
    );

    const qfPlayers = hasRandomRegistrationBracket
        ? registrationSlots
        : shuffleTournamentPlayers(tournamentState.players);

    tournamentState.bracket = {
        qf: [
            createTournamentMatch(qfPlayers[0], qfPlayers[1]),
            createTournamentMatch(qfPlayers[2], qfPlayers[3]),
            createTournamentMatch(qfPlayers[4], qfPlayers[5]),
            createTournamentMatch(qfPlayers[6], qfPlayers[7])
        ],
        sf: [null, null],
        f: [null]
    };
    saveTournamentToDb();
    return true;
}

function createTournamentMatch(p1 = null, p2 = null) {
    return {
        p1,
        p2,
        winnerId: null,
        resultType: null,
        p1Score: null,
        p2Score: null,
        scoreLabel: '',
        resultRecordedAt: null,
        time: null,
        proposedTime: null,
        proposedById: null,
        timeAccepted: false
    };
}

function createEmptyTournamentBracket() {
    return { qf: [null, null, null, null], sf: [null, null], f: [null] };
}

function ensureTournamentPushFlags() {
    if (!tournamentState.pushFlags || typeof tournamentState.pushFlags !== 'object') {
        tournamentState.pushFlags = {};
    }
    return tournamentState.pushFlags;
}

function markTournamentPushFlag(flagName) {
    const flags = ensureTournamentPushFlags();
    if (flags[flagName]) return false;
    flags[flagName] = Date.now();
    return true;
}

function getTournamentParticipantUids() {
    return (tournamentState.players || [])
        .map(player => String(player?.id || '').trim())
        .filter(Boolean);
}

function hasFullTournamentRoster() {
    return Array.isArray(tournamentState.players) && tournamentState.players.length === 8;
}

function isTournamentSchedulingUnlocked() {
    return tournamentState.status === 'active' && hasFullTournamentRoster();
}

function getTournamentMatchParticipantUids(match) {
    return [match?.p1?.id, match?.p2?.id]
        .map(uid => String(uid || '').trim())
        .filter(Boolean);
}

function getTournamentRoundLabel(round) {
    if (round === 'qf') return 'četvrtfinale';
    if (round === 'sf') return 'polufinale';
    if (round === 'f') return 'finale';
    return 'turnirski meč';
}

const TOURNAMENT_LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;

function parseTournamentTimeMs(value) {
    const raw = String(value || '').trim();
    if (!raw) return NaN;

    const localMatch = raw.match(TOURNAMENT_LOCAL_DATETIME_RE);
    if (localMatch) {
        const year = Number(localMatch[1]);
        const month = Number(localMatch[2]);
        const day = Number(localMatch[3]);
        const hour = Number(localMatch[4]);
        const minute = Number(localMatch[5]);
        const second = Number(localMatch[6] || 0);
        const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

        if (
            localDate.getUTCFullYear() !== year ||
            localDate.getUTCMonth() + 1 !== month ||
            localDate.getUTCDate() !== day ||
            localDate.getUTCHours() !== hour ||
            localDate.getUTCMinutes() !== minute ||
            localDate.getUTCSeconds() !== second
        ) {
            return NaN;
        }

        return zonedLocalDateTimeToUtc(year, month, day, hour, minute, second, LEADERBOARD_TIME_ZONE).getTime();
    }

    return Date.parse(raw);
}

function formatTournamentPushTime(value) {
    const timestamp = parseTournamentTimeMs(value);
    if (!Number.isFinite(timestamp)) return 'zakazano vreme';
    const date = new Date(timestamp);

    try {
        return date.toLocaleString('sr-RS', {
            timeZone: 'Europe/Belgrade',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (_err) {
        return date.toISOString();
    }
}

function queueTournamentPush(promise, label) {
    Promise.resolve(promise).catch(err => {
        console.error(`Greška pri turnirskoj push notifikaciji (${label}):`, err);
    });
}

async function sendPushToTournamentAudienceExcluding(excludedUids = [], baseMessage = {}) {
    if (!MONGO_URI || !firebaseMessaging) return { ok: false, reason: 'push_unavailable' };

    const excluded = Array.from(new Set(excludedUids.map(uid => String(uid || '').trim()).filter(Boolean)));
    const query = {
        enabled: true,
        lastSeenAt: { $gte: Date.now() - PUSH_TOKEN_STALE_MS },
        'categories.tournament': { $ne: false }
    };
    if (excluded.length > 0) query.uid = { $nin: excluded };

    const uids = await PushToken.distinct('uid', query);
    return sendPushToUids(uids, {
        category: 'tournament',
        scope: 'tournament',
        ...baseMessage
    });
}

async function notifyTournamentOneSpotLeft() {
    if (tournamentState.status !== 'registration') return { ok: false, reason: 'not_registration' };
    if ((tournamentState.players || []).length !== 7) return { ok: false, reason: 'not_one_spot_left' };
    if (!markTournamentPushFlag('oneSpotLeft')) return { ok: true, skipped: true };

    saveTournamentToDb();
    return sendPushToTournamentAudienceExcluding(getTournamentParticipantUids(), {
        type: 'tournament_one_spot_left',
        tag: 'tournament_one_spot_left',
        title: 'Turnir se puni',
        body: 'Ostalo je još jedno mesto za turnir. Uđi u igru i prijavi se.',
        data: { status: 'registration' }
    });
}

async function notifyTournamentStarted() {
    const participantUids = getTournamentParticipantUids();
    if (participantUids.length === 0) return { ok: false, reason: 'no_participants' };
    if (!markTournamentPushFlag('started')) return { ok: true, skipped: true };

    saveTournamentToDb();
    return sendPushToUids(participantUids, {
        category: 'tournament',
        scope: 'tournament',
        type: 'tournament_started',
        tag: 'tournament_started',
        title: 'Turnir počinje',
        body: 'Kostur je spreman. Pogledaj protivnika i zakaži svoj meč.',
        data: { status: 'active' }
    });
}

async function notifyTournamentTimeProposed(match, round, index, proposerUid) {
    const opponent = getTournamentOpponent(match, proposerUid);
    if (!opponent?.id) return { ok: false, reason: 'no_opponent' };

    const proposer = getTournamentPlayer(match, proposerUid);
    const timeText = formatTournamentPushTime(match.proposedTime);
    return sendPushToUids([opponent.id], {
        category: 'tournament',
        scope: 'tournament',
        type: 'tournament_time_proposed',
        tag: `tournament_time_${round}_${index}`,
        title: 'Predložen termin meča',
        body: `${sanitizeTournamentName(proposer?.name || 'Protivnik')} predlaže ${timeText}.`,
        data: { round, index, matchIndex: index, proposedTime: match.proposedTime || '' }
    });
}

async function notifyTournamentTimeAccepted(match, round, index) {
    const uids = getTournamentMatchParticipantUids(match);
    if (uids.length === 0) return { ok: false, reason: 'no_participants' };

    const timeText = formatTournamentPushTime(match.time || match.proposedTime);
    return sendPushToUids(uids, {
        category: 'tournament',
        scope: 'tournament',
        type: 'tournament_time_accepted',
        tag: `tournament_time_${round}_${index}`,
        title: 'Termin je potvrđen',
        body: `Turnirski meč je zakazan za ${timeText}.`,
        data: { round, index, matchIndex: index, time: match.time || '' }
    });
}

async function notifyTournamentDuelRequested(match, round, index, starterUid) {
    const opponent = getTournamentOpponent(match, starterUid);
    if (!opponent?.id) return { ok: false, reason: 'no_opponent' };

    const starter = getTournamentPlayer(match, starterUid);
    return sendPushToUids([opponent.id], {
        category: 'tournament',
        scope: 'tournament',
        type: 'tournament_duel_requested',
        tag: `tournament_duel_${round}_${index}`,
        title: 'Protivnik pokreće meč',
        body: `${sanitizeTournamentName(starter?.name || 'Protivnik')} je spreman za turnirski meč.`,
        data: { round, index, matchIndex: index }
    });
}

const TOURNAMENT_REMINDER_WINDOWS = [
    { key: 'reminder30', beforeMs: 30 * 60 * 1000, minDiffMs: 5 * 60 * 1000, label: '30 minuta' },
    { key: 'reminder5', beforeMs: 5 * 60 * 1000, minDiffMs: -2 * 60 * 1000, label: '5 minuta' }
];

async function checkTournamentMatchReminders() {
    if (tournamentState.status !== 'active' || !tournamentState.bracket) return;

    const now = Date.now();
    const jobs = [];

    ['qf', 'sf', 'f'].forEach(round => {
        const matches = tournamentState.bracket[round];
        if (!Array.isArray(matches)) return;

        matches.forEach((match, index) => {
            if (!match || match.winnerId || !match.timeAccepted || !match.time) return;

            const matchTime = parseTournamentTimeMs(match.time);
            if (!Number.isFinite(matchTime)) return;

            const diff = matchTime - now;
            if (diff < -2 * 60 * 1000) return;

            if (!match.pushRemindersSent || typeof match.pushRemindersSent !== 'object') {
                match.pushRemindersSent = {};
            }

            TOURNAMENT_REMINDER_WINDOWS.forEach(windowInfo => {
                if (match.pushRemindersSent[windowInfo.key]) return;
                if (diff > windowInfo.beforeMs) return;
                if (diff <= windowInfo.minDiffMs) return;

                jobs.push({
                    match,
                    round,
                    index,
                    windowInfo,
                    promise: sendPushToUids(getTournamentMatchParticipantUids(match), {
                        category: 'tournament',
                        scope: 'tournament',
                        type: 'tournament_match_reminder',
                        tag: `tournament_reminder_${round}_${index}_${windowInfo.key}`,
                        title: 'Podsetnik za turnirski meč',
                        body: `${getTournamentRoundLabel(round)} počinje za ${windowInfo.label}.`,
                        data: { round, index, matchIndex: index, time: match.time || '', reminder: windowInfo.key }
                    })
                });
            });
        });
    });

    if (jobs.length === 0) return;

    const results = await Promise.all(jobs.map(async job => {
        try {
            return { ...job, result: await job.promise };
        } catch (error) {
            return { ...job, result: { ok: false, reason: error?.message || 'push_send_failed' } };
        }
    }));

    let changed = false;
    results.forEach(({ match, round, index, windowInfo, result }) => {
        const sent = Math.max(0, toSafeInt(result?.sent, 0));
        if (result?.ok && sent > 0) {
            match.pushRemindersSent[windowInfo.key] = Date.now();
            changed = true;
            return;
        }

        console.warn(
            `⚠️ Turnirski podsetnik nije označen kao poslat (${round}/${index}/${windowInfo.key}): ${result?.reason || 'sent_0'}, sent=${sent}`
        );
    });

    if (changed) saveTournamentToDb();
}

const tournamentReminderInterval = setInterval(() => {
    checkTournamentMatchReminders().catch(err => {
        console.error('Greška pri proveri turnirskih podsetnika:', err);
    });
}, 60 * 1000);
if (tournamentReminderInterval && typeof tournamentReminderInterval.unref === 'function') {
    tournamentReminderInterval.unref();
}

function shuffleTournamentPlayers(players) {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function ensureTournamentRegistrationBracket() {
    if (!tournamentState.bracket || typeof tournamentState.bracket !== 'object') {
        tournamentState.bracket = createEmptyTournamentBracket();
    }

    if (!Array.isArray(tournamentState.bracket.qf)) {
        tournamentState.bracket.qf = [null, null, null, null];
    } else {
        tournamentState.bracket.qf = tournamentState.bracket.qf.slice(0, 4);
        while (tournamentState.bracket.qf.length < 4) tournamentState.bracket.qf.push(null);
    }

    if (!Array.isArray(tournamentState.bracket.sf)) tournamentState.bracket.sf = [null, null];
    if (!Array.isArray(tournamentState.bracket.f)) tournamentState.bracket.f = [null];
}

function assignPlayerToRandomTournamentSlot(player) {
    ensureTournamentRegistrationBracket();

    for (const match of tournamentState.bracket.qf) {
        if (!match) continue;
        if ((match.p1 && match.p1.id === player.id) || (match.p2 && match.p2.id === player.id)) {
            return true;
        }
    }

    const emptySlots = [];
    for (let matchIndex = 0; matchIndex < 4; matchIndex++) {
        const match = tournamentState.bracket.qf[matchIndex];
        if (!match) {
            emptySlots.push({ matchIndex, position: 'p1' }, { matchIndex, position: 'p2' });
            continue;
        }
        if (!match.p1) emptySlots.push({ matchIndex, position: 'p1' });
        if (!match.p2) emptySlots.push({ matchIndex, position: 'p2' });
    }

    if (emptySlots.length === 0) return false;

    const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    if (!tournamentState.bracket.qf[slot.matchIndex]) {
        tournamentState.bracket.qf[slot.matchIndex] = createTournamentMatch();
    }
    tournamentState.bracket.qf[slot.matchIndex][slot.position] = player;
    return true;
}

function removePlayerFromTournamentBracket(uid) {
    if (!uid || !tournamentState.bracket) return;

    ['qf', 'sf', 'f'].forEach(round => {
        const matches = tournamentState.bracket[round];
        if (!Array.isArray(matches)) return;

        matches.forEach((match, index) => {
            if (!match) return;
            if (match.p1 && match.p1.id === uid) match.p1 = null;
            if (match.p2 && match.p2.id === uid) match.p2 = null;
            if (!match.p1 && !match.p2 && round === 'qf') matches[index] = null;
        });
    });
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

async function calculateTournamentPi(uid, fallbackPi = 0) {
    if (!MONGO_URI || !uid) return sanitizeTournamentPi(fallbackPi);

    try {
        const user = await UserProfile.findOne({ firebaseUid: uid }).lean();
        if (!user) return sanitizeTournamentPi(fallbackPi);
        return sanitizeTournamentPi(powerIndexCore.calculatePowerIndex(user));
    } catch (err) {
        console.error("Greška pri server-side računanju turnirskog PI:", err);
        return sanitizeTournamentPi(fallbackPi);
    }
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

function parseTournamentRoomId(roomId) {
    const match = String(roomId || '').match(/^tourney_(qf|sf|f)_(\d+)_/);
    if (!match) return null;
    return { round: match[1], index: Number(match[2]) };
}

function sanitizeTournamentMatchScore(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.max(0, Math.min(MAX_SCORE, Math.floor(num)));
}

function setTournamentMatchResult(match, resultType, p1Score, p2Score, options = {}) {
    if (!match) return false;

    const safeP1Score = sanitizeTournamentMatchScore(p1Score);
    const safeP2Score = sanitizeTournamentMatchScore(p2Score);
    if (safeP1Score === null || safeP2Score === null) return false;

    const isTechnical = resultType === 'technical';
    match.resultType = isTechnical ? 'technical' : 'regular';
    match.p1Score = safeP1Score;
    match.p2Score = safeP2Score;
    match.scoreLabel = `${safeP1Score}-${safeP2Score}${isTechnical ? ' TP' : ''}`;
    match.resultRecordedAt = Date.now();

    if (isTechnical) {
        match.technicalWinReason = String(options.reason || 'technical').substring(0, 60);
        match.technicalWinAt = Date.now();
    } else {
        delete match.technicalWinReason;
        delete match.technicalWinAt;
    }

    return true;
}

function getTournamentRoomMatchScores(roomId, match) {
    const state = roomState[roomId];
    if (!state || !match || !match.p1 || !match.p2) return null;
    if (!Array.isArray(state.players) || state.players.length < 2) return null;
    if (!Array.isArray(state.allScores) || state.allScores.length < 2) return null;

    const totals = state.allScores.slice(0, 2).map(sheet => calculateCompletedDuelTotal(sheet));
    if (totals.some(score => score === null)) return null;

    const stablePlayerUids = Array.isArray(state.playerUids) ? state.playerUids : [];
    const scoreByUid = new Map();

    state.players.slice(0, 2).forEach((socketId, index) => {
        const participant = getDuelParticipantMeta(socketId, state.playerNames?.[index], stablePlayerUids[index]);
        const uid = String(participant.uid || stablePlayerUids[index] || '').trim();
        if (uid) scoreByUid.set(uid, totals[index]);
    });

    if (!scoreByUid.has(match.p1.id) || !scoreByUid.has(match.p2.id)) return null;

    return {
        p1Score: scoreByUid.get(match.p1.id),
        p2Score: scoreByUid.get(match.p2.id)
    };
}

async function applyTournamentTechnicalWinner(roomId, winnerUid, reason = 'technical') {
    const roomInfo = parseTournamentRoomId(roomId);
    if (!roomInfo || !winnerUid) return false;

    const matchInfo = getTournamentMatch(roomInfo.round, roomInfo.index);
    if (!matchInfo) return false;

    const { match, index } = matchInfo;
    if (!match || match.winnerId || !isTournamentParticipant(match, winnerUid)) return false;

    match.winnerId = winnerUid;
    const p1Score = match.p1.id === winnerUid ? 1 : 0;
    const p2Score = match.p2.id === winnerUid ? 1 : 0;
    setTournamentMatchResult(match, 'technical', p1Score, p2Score, { reason });

    const winnerObj = match.p1.id === winnerUid ? match.p1 : match.p2;
    advanceTournamentBracket(roomInfo.round, index, winnerObj);
    io.emit('tourney_state_update', tournamentState);

    if (roomInfo.round === 'f') {
        try {
            await settleTournamentFinalPrizes(match, winnerObj);
            if (match.prizesAwarded) {
                await recordTournamentChampion(match, winnerObj);
            }
        } catch (err) {
            console.error("Greška pri tehničkom upisu finala turnira:", err);
        }
    }

    return true;
}

async function applyTournamentCompletedDuelResult(roomId) {
    const roomInfo = parseTournamentRoomId(roomId);
    if (!roomInfo) return false;

    const matchInfo = getTournamentMatch(roomInfo.round, roomInfo.index);
    if (!matchInfo) return false;

    const { match, index } = matchInfo;
    if (!match || match.winnerId) return false;

    const regularScores = getTournamentRoomMatchScores(roomId, match);
    if (!regularScores) return false;
    if (regularScores.p1Score === regularScores.p2Score) return false;

    const winnerId = regularScores.p1Score > regularScores.p2Score ? match.p1.id : match.p2.id;
    if (!setTournamentMatchResult(match, 'regular', regularScores.p1Score, regularScores.p2Score)) {
        return false;
    }

    match.winnerId = winnerId;
    const winnerObj = match.p1.id === winnerId ? match.p1 : match.p2;
    advanceTournamentBracket(roomInfo.round, index, winnerObj);
    io.emit('tourney_state_update', tournamentState);

    if (roomInfo.round === 'f') {
        try {
            await settleTournamentFinalPrizes(match, winnerObj);
            if (match.prizesAwarded) {
                await recordTournamentChampion(match, winnerObj);
            }
        } catch (err) {
            console.error("Greška pri automatskom upisu finala turnira:", err);
        }
    }

    return true;
}

function normalizeTournamentTime(value) {
    const raw = String(value || '').trim().substring(0, 40);
    const parsedTime = parseTournamentTimeMs(raw);
    if (!raw || !Number.isFinite(parsedTime)) return null;

    const now = Date.now();
    const maxFuture = now + (90 * 24 * 60 * 60 * 1000);
    if (parsedTime < now - (60 * 60 * 1000) || parsedTime > maxFuture) return null;

    return new Date(parsedTime).toISOString();
}

function buildProfileSyncPayload(user) {
    const todayKey = getDailyChallengeDayKey();
    const legacyTodayKey = getLegacyDailyDayKey();
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
        unlockedThemes: filterIdsByCategory(user.yamb_unlocked, THEME_UNLOCK_IDS),
        lastDaily: normalizeDailyKeyForSync(user.lastDaily, todayKey, legacyTodayKey),
        lastDailyRewardClaimed: normalizeDailyKeyForSync(user.lastDailyRewardClaimed, todayKey, legacyTodayKey),
        soundEnabled: coerceBooleanSetting(user.soundEnabled) ?? true,
        vibrationEnabled: coerceBooleanSetting(user.vibrationEnabled) ?? true,
        musicEnabled: coerceBooleanSetting(user.musicEnabled) ?? true,
        musicVolume: normalizeMusicVolume(user.musicVolume, 0.4),
        language: normalizeLanguageSetting(user.language, 'sr'),
        penaltyPoints: Math.max(0, toSafeInt(user.penaltyPoints)),
        h2hStats: normalizeH2HStatsForUser(user.h2hStats || {}, user.firebaseUid, user.playerName),
        leagueData: normalizeUserLeagueDataForCurrentPeriod(user)
    };
}

function buildH2HRecordSummary(h2hStats = {}, selfUid = '', selfName = '') {
    const summary = { wins: 0, losses: 0, draws: 0, games: 0 };
    if (!h2hStats || typeof h2hStats !== 'object') return summary;
    const sourceH2H = (selfUid || selfName)
        ? normalizeH2HStatsForUser(h2hStats, selfUid, selfName)
        : h2hStats;

    Object.values(sourceH2H).forEach(record => {
        if (!record || typeof record !== 'object') return;
        const uid = String(record.uid || '').trim();
        if (uid.startsWith('guest_')) return;
        const name = String(record.name || '').trim();
        if (!name || name === 'undefined' || name === 'null' || name === 'Nepoznat') return;
        if (isGuestH2HName(name)) return;

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
    notifyOnlinePlayersStatusChanged();
}

function bindVerifiedPlayerSocket(socket, playerId) {
    if (typeof playerId !== 'string' || playerId.length < 20) return false;

    const stariSocketId = onlinePlayers[playerId];
    let restoredRoomId = null;

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
                    if (!Array.isArray(roomState[aktivnaSoba].playerUids)) roomState[aktivnaSoba].playerUids = [];
                    roomState[aktivnaSoba].playerUids[idx] = playerId;
                }
            }
            io.to(aktivnaSoba).emit('opponent_connection_restored', { roomId: aktivnaSoba, restoredUid: playerId });
            restoredRoomId = aktivnaSoba;
            rememberRoomPresence(aktivnaSoba, socket);
        }

        const oldSocket = io.sockets.sockets.get(stariSocketId);
        if (oldSocket) {
            oldSocket.disconnect(true);
        }
    }

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
                    if (!Array.isArray(roomState[ghost.roomId].playerUids)) roomState[ghost.roomId].playerUids = [];
                    roomState[ghost.roomId].playerUids[idx] = playerId;
                }
            }
            io.to(ghost.roomId).emit('opponent_connection_restored', { roomId: ghost.roomId, restoredUid: playerId });
            delete playerRooms[ghost.oldSocketId];
        }
        restoredRoomId = ghost.roomId;
        rememberRoomPresence(ghost.roomId, socket);
        clearDisconnectGraceForUid(playerId, ghost.roomId);
    } else if (disconnectTimers[playerId]) {
        clearDisconnectGraceForUid(playerId);
    }

    socket.verifiedUid = playerId;
    socket.playerId = playerId;
    onlinePlayers[playerId] = socket.id;
    registeredSockets[socket.id] = playerId;
    if (restoredRoomId && roomState[restoredRoomId] && !roomState[restoredRoomId].gameFinished) {
        socket.pendingOnlineRoomResume = restoredRoomId;
    }
    return true;
}

function getChallengeKey(challengerId, targetId) {
    if (!challengerId || !targetId) return null;
    return `${challengerId}:${targetId}`;
}

function clearPendingChallenge(key) {
    const challenge = key ? pendingChallenges[key] : null;
    if (!challenge) return null;
    if (challenge.timeoutId) clearTimeout(challenge.timeoutId);
    delete pendingChallenges[key];
    return challenge;
}

function findPendingChallenge(challengerId, targetId) {
    const directKey = getChallengeKey(challengerId, targetId);
    if (directKey && pendingChallenges[directKey]) {
        return { key: directKey, challenge: pendingChallenges[directKey] };
    }

    for (const key in pendingChallenges) {
        const challenge = pendingChallenges[key];
        if (challenge && challenge.challengerId === challengerId && challenge.targetId === targetId) {
            return { key, challenge };
        }
    }

    return null;
}

function findPendingChallengeById(challengeId) {
    if (!challengeId || !pendingChallenges[challengeId]) return null;
    return { key: challengeId, challenge: pendingChallenges[challengeId] };
}

function challengeMatchesResponder(challenge, challengerId, targetId, targetUid = '') {
    if (!challenge || challenge.challengerId !== challengerId) return false;
    if (challenge.targetId === targetId) return true;
    return !!(targetUid && challenge.targetUid && challenge.targetUid === targetUid);
}

function findPendingChallengeForResponse(challengerId, targetId, challengeId = '') {
    const targetUid = getSocketUid(targetId);
    const byId = findPendingChallengeById(challengeId);
    if (byId && challengeMatchesResponder(byId.challenge, challengerId, targetId, targetUid)) {
        return byId;
    }

    const direct = findPendingChallenge(challengerId, targetId);
    if (direct) return direct;
    if (!targetUid) return null;

    for (const key in pendingChallenges) {
        const challenge = pendingChallenges[key];
        if (challengeMatchesResponder(challenge, challengerId, targetId, targetUid)) {
            return { key, challenge };
        }
    }

    return null;
}

function getRoomInviteKey(hostId, targetId, roomId) {
    if (!hostId || !targetId || !roomId) return null;
    return `${hostId}:${targetId}:${roomId}`;
}

function clearPendingRoomInvite(key) {
    const invite = key ? pendingRoomInvites[key] : null;
    if (!invite) return null;
    if (invite.timeoutId) clearTimeout(invite.timeoutId);
    delete pendingRoomInvites[key];
    return invite;
}

function roomInviteMatchesResponder(invite, hostId, targetId, targetUid = '', roomId = '') {
    if (!invite) return false;
    if (hostId && invite.hostId !== hostId) return false;
    if (roomId && invite.roomId !== roomId) return false;
    if (invite.targetId === targetId) return true;
    return !!(targetUid && invite.targetUid && invite.targetUid === targetUid);
}

function findPendingRoomInviteForResponse(hostId, targetId, roomId = '', inviteId = '') {
    const targetUid = getSocketUid(targetId);
    const byId = inviteId && pendingRoomInvites[inviteId]
        ? { key: inviteId, invite: pendingRoomInvites[inviteId] }
        : null;
    if (byId && roomInviteMatchesResponder(byId.invite, hostId, targetId, targetUid, roomId)) {
        return byId;
    }

    const directKey = getRoomInviteKey(hostId, targetId, roomId);
    if (directKey && pendingRoomInvites[directKey]) {
        return { key: directKey, invite: pendingRoomInvites[directKey] };
    }

    for (const key of Object.keys(pendingRoomInvites)) {
        const invite = pendingRoomInvites[key];
        if (roomInviteMatchesResponder(invite, hostId, targetId, targetUid, roomId)) {
            return { key, invite };
        }
    }

    return null;
}

function clearPendingRoomInvitesForSocket(socketId) {
    for (const key of Object.keys(pendingRoomInvites)) {
        const invite = pendingRoomInvites[key];
        if (invite && (invite.hostId === socketId || invite.targetId === socketId)) {
            clearPendingRoomInvite(key);
        }
    }
}

function expirePendingRoomInvite(key) {
    const invite = clearPendingRoomInvite(key);
    if (!invite) return;

    io.to(invite.hostId).emit('room_invite_expired', {
        roomId: invite.roomId,
        targetName: invite.targetName || 'Igrač'
    });
}

function clearPendingTournamentDuelInvite(key) {
    const invite = key ? pendingTournamentDuelInvites[key] : null;
    if (!invite) return null;
    if (invite.timeoutId) clearTimeout(invite.timeoutId);
    delete pendingTournamentDuelInvites[key];
    return invite;
}

function findPendingTournamentDuelInvite(starterSocketId, targetSocketId, round, index) {
    for (const key of Object.keys(pendingTournamentDuelInvites)) {
        const invite = pendingTournamentDuelInvites[key];
        if (!invite) continue;
        if (invite.starterSocketId === starterSocketId &&
            invite.targetSocketId === targetSocketId &&
            invite.round === round &&
            invite.index === index) {
            return { key, invite };
        }
    }
    return null;
}

function expirePendingTournamentDuelInvite(key) {
    const invite = clearPendingTournamentDuelInvite(key);
    if (!invite) return;

    io.to(invite.starterSocketId).emit('tourney_duel_expired', {
        matchRoomId: invite.matchRoomId,
        opponentName: invite.targetName || 'Igrač'
    });
    io.to(invite.targetSocketId).emit('tourney_duel_expired', {
        matchRoomId: invite.matchRoomId,
        opponentName: invite.starterName || 'Igrač',
        silent: true
    });
}

function clearPendingTournamentDuelInvitesForSocket(socketId) {
    for (const key of Object.keys(pendingTournamentDuelInvites)) {
        const invite = pendingTournamentDuelInvites[key];
        if (!invite || (invite.starterSocketId !== socketId && invite.targetSocketId !== socketId)) continue;
        clearPendingTournamentDuelInvite(key);

        const otherSocketId = invite.starterSocketId === socketId ? invite.targetSocketId : invite.starterSocketId;
        io.to(otherSocketId).emit('tourney_duel_expired', {
            matchRoomId: invite.matchRoomId,
            opponentName: invite.starterSocketId === socketId ? invite.starterName : invite.targetName
        });
    }
}

function expirePendingChallenge(key, reason = 'timeout') {
    const challenge = clearPendingChallenge(key);
    if (!challenge) return;

    const payload = {
        reason,
        message: 'Istekao je rok za odgovor na duel izazov. Nema pobede ni kazne.'
    };

    io.to(challenge.targetId).emit('challenge_expired', payload);
    io.to(challenge.challengerId).emit('challenge_expired', payload);
}

function getActiveOnlineRoomForSocket(socketId) {
    if (!socketId) return null;

    const directRoom = playerRooms[socketId];
    if (directRoom && !String(directRoom).startsWith('local_')) {
        const state = roomState[directRoom];
        if (state) {
            if (!state.gameFinished && Array.isArray(state.players) && state.players.includes(socketId)) {
                return directRoom;
            }

            if (!state.gameFinished) delete playerRooms[socketId];
            if (state.gameFinished) return null;
        }

        if (privateRooms[directRoom]) {
            return directRoom;
        }

        delete playerRooms[socketId];
    }

    for (const [roomId, state] of Object.entries(roomState)) {
        if (state && !state.gameFinished && Array.isArray(state.players) && state.players.includes(socketId)) {
            return roomId;
        }
    }

    return null;
}

function getSocketUid(socketId) {
    if (!socketId) return '';
    const clientSocket = io.sockets.sockets.get(socketId);
    return registeredSockets[socketId] || clientSocket?.verifiedUid || clientSocket?.playerId || '';
}

function getActiveOnlineRoomForUid(uid) {
    if (!uid) return null;

    const currentSocketId = onlinePlayers[uid];
    const currentRoom = getActiveOnlineRoomForSocket(currentSocketId);
    if (currentRoom) return currentRoom;

    const ghost = ghostSessions[uid];
    if (ghost && ghost.roomId) {
        const ghostState = roomState[ghost.roomId];
        if (ghostState && !ghostState.gameFinished) return ghost.roomId;
    }

    for (const [roomId, state] of Object.entries(roomState)) {
        if (!state || state.gameFinished || !Array.isArray(state.players)) continue;

        if (Array.isArray(state.playerUids) && state.playerUids.includes(uid)) {
            return roomId;
        }

        if (state.players.some(playerSocketId => getSocketUid(playerSocketId) === uid)) {
            return roomId;
        }
    }

    for (const [roomId, room] of Object.entries(privateRooms)) {
        const participants = [room?.p1, room?.p2].filter(Boolean);
        if (participants.some(player => player.uid === uid || getSocketUid(player.id) === uid)) {
            return roomId;
        }
    }

    return null;
}

function getActiveOnlineRoomForPlayer(socketId, uid = '') {
    return getActiveOnlineRoomForSocket(socketId) || getActiveOnlineRoomForUid(uid);
}

function isLocalRoomId(roomId) {
    return !!roomId && String(roomId).startsWith('local_');
}

function isSpectatableLocalRoom(roomId, socketId = '', uid = '') {
    if (!isLocalRoomId(roomId)) return false;

    const roomClients = io.sockets.adapter.rooms.get(roomId);
    if (!roomClients) return false;

    for (const clientId of roomClients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (!clientSocket || clientSocket.isSpectator) continue;

        if (socketId && clientId === socketId) return true;
        if (uid && getSocketUid(clientId) === uid) return true;
        if (!socketId && !uid) return true;
    }

    return false;
}

function getLiveLocalRoomForSocket(socketId, uid = '') {
    const candidateSocketIds = new Set();
    if (socketId) candidateSocketIds.add(socketId);
    if (uid && onlinePlayers[uid]) candidateSocketIds.add(onlinePlayers[uid]);

    for (const candidateSocketId of candidateSocketIds) {
        const directRoom = playerRooms[candidateSocketId];
        if (isSpectatableLocalRoom(directRoom, candidateSocketId, uid)) return directRoom;

        const joinedRooms = io.sockets.adapter.sids.get(candidateSocketId);
        if (!joinedRooms) continue;

        for (const roomId of joinedRooms) {
            if (roomId === candidateSocketId) continue;
            if (isSpectatableLocalRoom(roomId, candidateSocketId, uid)) return roomId;
        }
    }

    return null;
}

function makeBusyState(reason, roomId = null) {
    return { busy: true, reason, roomId };
}

function getWaitingBusyState(socketId, uid = '', options = {}) {
    if (!waitingPlayer) return null;
    if (options.ignoreWaitingSocketId && waitingPlayer.id === options.ignoreWaitingSocketId) return null;
    if (options.ignoreWaitingUid && waitingPlayer.uid && waitingPlayer.uid === options.ignoreWaitingUid) return null;

    if (waitingPlayer.id === socketId) return makeBusyState('waiting_matchmaking');
    if (uid && waitingPlayer.uid && waitingPlayer.uid === uid) return makeBusyState('waiting_matchmaking');
    return null;
}

function isWaitingPrivateRoomParticipant(roomId, socketId = '', uid = '') {
    const room = roomId ? privateRooms[roomId] : null;
    if (!room || room.p2) return false;

    const host = room.p1;
    if (!host) return false;
    if (socketId && host.id === socketId) return true;
    return !!(uid && (host.uid === uid || getSocketUid(host.id) === uid));
}

function getClientBusyState(socketId) {
    if (!socketId) return null;
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket && clientSocket.clientBusyForInvites) {
        return makeBusyState(clientSocket.clientBusyReason || 'client_busy');
    }
    return null;
}

function getActiveGameStateForSocket(socketId, uid = '', options = {}) {
    if (!socketId) return null;

    const directRoom = playerRooms[socketId];
    if (directRoom) {
        if (isLocalRoomId(directRoom)) {
            return makeBusyState('local_game', directRoom);
        }

        const state = roomState[directRoom];
        if (state) {
            if (!state.gameFinished && Array.isArray(state.players) && state.players.includes(socketId)) {
                return makeBusyState('online_game', directRoom);
            }

            if (state.gameFinished) return null;
        }

        if (privateRooms[directRoom]) {
            if (options.ignoreWaitingPrivateRoom && isWaitingPrivateRoomParticipant(directRoom, socketId, uid)) {
                return null;
            }
            return makeBusyState('private_room', directRoom);
        }

        if (!state) delete playerRooms[socketId];
    }

    for (const [roomId, state] of Object.entries(roomState)) {
        if (state && !state.gameFinished && Array.isArray(state.players) && state.players.includes(socketId)) {
            return makeBusyState('online_game', roomId);
        }
    }

    for (const [roomId, room] of Object.entries(privateRooms)) {
        const participants = [room?.p1, room?.p2].filter(Boolean);
        if (participants.some(player => player.id === socketId)) {
            if (options.ignoreWaitingPrivateRoom && isWaitingPrivateRoomParticipant(roomId, socketId, uid)) {
                continue;
            }
            return makeBusyState('private_room', roomId);
        }
    }

    return getWaitingBusyState(socketId, uid, options) || getClientBusyState(socketId);
}

function getActiveGameStateForUid(uid = '', options = {}) {
    if (!uid) return null;

    const currentSocketId = onlinePlayers[uid];
    const currentSocketState = getActiveGameStateForSocket(currentSocketId, uid, options);
    if (currentSocketState) return currentSocketState;

    const ghost = ghostSessions[uid];
    if (ghost && ghost.roomId && !isLocalRoomId(ghost.roomId)) {
        const ghostState = roomState[ghost.roomId];
        if (ghostState && !ghostState.gameFinished) return makeBusyState('online_reconnect', ghost.roomId);
    }

    for (const [roomId, state] of Object.entries(roomState)) {
        if (!state || state.gameFinished || !Array.isArray(state.players)) continue;

        if (Array.isArray(state.playerUids) && state.playerUids.includes(uid)) {
            return makeBusyState('online_game', roomId);
        }

        if (state.players.some(playerSocketId => getSocketUid(playerSocketId) === uid)) {
            return makeBusyState('online_game', roomId);
        }
    }

    for (const [roomId, room] of Object.entries(privateRooms)) {
        const participants = [room?.p1, room?.p2].filter(Boolean);
        if (participants.some(player => player.uid === uid || getSocketUid(player.id) === uid)) {
            if (options.ignoreWaitingPrivateRoom && isWaitingPrivateRoomParticipant(roomId, '', uid)) {
                continue;
            }
            return makeBusyState('private_room', roomId);
        }
    }

    return getWaitingBusyState('', uid, options);
}

function getPlayerBusyState(socketId, uid = '', options = {}) {
    return getActiveGameStateForSocket(socketId, uid, options) || getActiveGameStateForUid(uid, options);
}

function isPlayerBusyForInvite(socketId, uid = '', options = {}) {
    return !!getPlayerBusyState(socketId, uid, options);
}

function emitPlayerBusy(socket, ack = null) {
    const payload = { ok: false, reason: 'err_player_busy' };
    if (typeof ack === 'function') ack(payload);
    else if (socket) socket.emit('error_msg', 'err_player_busy');
    return payload;
}

function reattachSocketToRoomByUid(socket, roomId) {
    if (!socket) return false;
    const state = roomState[roomId];
    const uid = getSocketUid(socket.id);
    if (!state || state.gameFinished || !uid || !Array.isArray(state.players)) return false;

    let playerIndex = Array.isArray(state.playerUids) ? state.playerUids.indexOf(uid) : -1;
    if (playerIndex === -1) {
        playerIndex = state.players.findIndex(playerSocketId => getSocketUid(playerSocketId) === uid);
    }
    if (playerIndex === -1) return false;

    const oldSocketId = state.players[playerIndex];
    state.players[playerIndex] = socket.id;
    if (!Array.isArray(state.playerUids)) state.playerUids = [];
    state.playerUids[playerIndex] = uid;

    socket.join(roomId);
    playerRooms[socket.id] = roomId;
    if (oldSocketId && oldSocketId !== socket.id && playerRooms[oldSocketId] === roomId) {
        delete playerRooms[oldSocketId];
    }
    if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) oldSocket.leave(roomId);
    }

    rememberRoomPresence(roomId, socket);
    clearDisconnectGraceForUid(uid, roomId);

    console.log(`♻️ SYNC REATTACH: Vratio sam ${socket.id} u sobu ${roomId} preko UID-a.`);
    io.to(roomId).emit('opponent_connection_restored', { roomId, restoredUid: uid });
    return true;
}

function getParticipantIndexForSocketOrUid(state, socketId, uid = '') {
    if (!state || !Array.isArray(state.players)) return -1;

    const directIndex = socketId ? state.players.indexOf(socketId) : -1;
    if (directIndex !== -1) return directIndex;

    if (uid && Array.isArray(state.playerUids)) {
        const uidIndex = state.playerUids.indexOf(uid);
        if (uidIndex !== -1) return uidIndex;
    }

    if (uid) {
        return state.players.findIndex(playerSocketId => getSocketUid(playerSocketId) === uid);
    }

    return -1;
}

function isActiveOnlineRoom(roomId) {
    if (!roomId || isLocalRoomId(roomId)) return false;
    const state = roomState[roomId];
    return !!(state && !state.gameFinished && Array.isArray(state.players));
}

function isSocketJoinedAsActivePlayer(socketId, roomId) {
    if (!socketId || !isActiveOnlineRoom(roomId)) return false;

    const roomClients = io.sockets.adapter.rooms.get(roomId);
    if (!roomClients || !roomClients.has(socketId)) return false;

    const clientSocket = io.sockets.sockets.get(socketId);
    return !!(clientSocket && !clientSocket.isSpectator);
}

function isPlayerInLiveOnlineRoom(roomId, socketId, uid = '') {
    if (!isActiveOnlineRoom(roomId)) return false;

    const state = roomState[roomId];
    if (getParticipantIndexForSocketOrUid(state, socketId, uid) !== -1) return true;

    return isSocketJoinedAsActivePlayer(socketId, roomId);
}

function getLiveOnlineRoomFromSocketMembership(socketId, uid = '') {
    if (!socketId) return null;

    const joinedRooms = io.sockets.adapter.sids.get(socketId);
    if (!joinedRooms) return null;

    for (const roomId of joinedRooms) {
        if (roomId === socketId) continue;
        if (isPlayerInLiveOnlineRoom(roomId, socketId, uid)) {
            return roomId;
        }
    }

    return null;
}

function refreshOnlineRoomMembership(socket, roomId) {
    if (!socket || !roomId || isLocalRoomId(roomId)) return false;

    const state = roomState[roomId];
    const uid = getSocketUid(socket.id);
    const playerIndex = getParticipantIndexForSocketOrUid(state, socket.id, uid);
    if (!state || state.gameFinished || playerIndex === -1) return false;

    const oldSocketId = state.players[playerIndex];
    state.players[playerIndex] = socket.id;

    if (!Array.isArray(state.playerUids)) state.playerUids = [];
    if (uid) state.playerUids[playerIndex] = uid;

    socket.join(roomId);
    playerRooms[socket.id] = roomId;

    if (oldSocketId && oldSocketId !== socket.id && playerRooms[oldSocketId] === roomId) {
        delete playerRooms[oldSocketId];
    }

    notifyOnlinePlayersStatusChanged();
    return true;
}

function getLiveOnlineRoomForSocket(socketId, uid = '') {
    if (!socketId && !uid) return null;

    const directRoom = socketId ? playerRooms[socketId] : null;
    if (isPlayerInLiveOnlineRoom(directRoom, socketId, uid)) return directRoom;

    const membershipRoom = getLiveOnlineRoomFromSocketMembership(socketId, uid);
    if (membershipRoom) return membershipRoom;

    for (const [roomId, state] of Object.entries(roomState)) {
        if (!state || state.gameFinished || isLocalRoomId(roomId)) continue;
        if (isPlayerInLiveOnlineRoom(roomId, socketId, uid)) {
            return roomId;
        }
    }

    return null;
}

function getPublicPlayerUid(clientSocket, socketId) {
    return clientSocket?.playerId || registeredSockets[socketId] || clientSocket?.verifiedUid || '';
}

function buildOnlinePlayerPresence(clientSocket, socketId, myFriends = []) {
    if (!clientSocket || !clientSocket.playerName) return null;

    const playerUid = getPublicPlayerUid(clientSocket, socketId);
    const busyState = getPlayerBusyState(socketId, playerUid);
    const liveRoomId = getLiveOnlineRoomForSocket(socketId, playerUid);
    const localRoomId = getLiveLocalRoomForSocket(socketId, playerUid);
    const fallbackRoomId = busyState?.roomId;
    const fallbackRoomState = fallbackRoomId ? roomState[fallbackRoomId] : null;
    const spectatableRoomId = liveRoomId || localRoomId || (
        fallbackRoomState && !fallbackRoomState.gameFinished && !isLocalRoomId(fallbackRoomId)
            ? fallbackRoomId
            : null
    );

    return {
        socketId,
        name: clientSocket.playerName,
        photoUrl: clientSocket.photoUrl || '',
        uid: playerUid,
        roomId: spectatableRoomId || fallbackRoomId || '',
        isPlaying: !!spectatableRoomId,
        canSpectate: !!spectatableRoomId,
        isBusy: !!busyState,
        isFriend: Array.isArray(myFriends) && myFriends.includes(playerUid),
        status: spectatableRoomId ? 'playing' : (busyState ? 'busy' : 'idle')
    };
}

function getOnlinePresenceRank(player) {
    if (!player) return -1;

    const stateRank = player.isPlaying ? 3 : (player.isBusy ? 2 : 1);
    const currentSocketRank = player.uid && onlinePlayers[player.uid] === player.socketId ? 1 : 0;
    return stateRank * 10 + currentSocketRank;
}

function shouldUseOnlinePresence(existing, candidate) {
    if (!candidate) return false;
    if (!existing) return true;

    const candidateRank = getOnlinePresenceRank(candidate);
    const existingRank = getOnlinePresenceRank(existing);
    if (candidateRank !== existingRank) return candidateRank > existingRank;

    if (!existing.photoUrl && candidate.photoUrl) return true;
    return false;
}

function notifyOnlinePlayersStatusChanged() {
    io.emit('online_players_status_changed');
}

function emitAuthoritativeRoomState(socket, roomId, myIndex = null) {
    const state = roomState[roomId];
    if (!socket || !state || state.gameFinished) return false;

    const playerNamesToSync = state.playerNames || state.players.map(id => {
        const pSocket = io.sockets.sockets.get(id);
        return pSocket && pSocket.playerName ? pSocket.playerName : "Igrač";
    });

    const syncNow = Date.now();
    socket.emit('sync_state_response', {
        roomId: roomId,
        myIndex: Number.isInteger(myIndex) ? myIndex : state.players.indexOf(socket.id),
        players: playerNamesToSync,
        allScores: state.allScores || createEmptyScores(),
        currentPlayerIdx: state.turnIndex,
        brojBacanja: state.brojBacanja || 0,
        kockiceVals: state.kockiceVals || [0,0,0,0,0,0],
        zadrzane: state.zadrzane || [false,false,false,false,false,false],
        najavaAktivna: state.najavaAktivna || false,
        najavljenoPolje: state.najavljenoPolje || null,
        turnStartTime: state.turnStartTime || syncNow,
        turnTimeLimitMs: state.turnClientTimeLimitMs || TURN_TIME_LIMIT,
        turnTimerPaused: hasActiveDisconnectGraceForRoom(roomId),
        disconnectGraceRemainingMs: getRoomDisconnectGraceRemainingMs(roomId),
        serverNow: syncNow
    });
    return true;
}

function flushPendingOnlineRoomResume(socket) {
    const roomId = socket?.pendingOnlineRoomResume;
    if (!roomId) return false;

    delete socket.pendingOnlineRoomResume;
    const state = roomState[roomId];
    if (!state || state.gameFinished) return false;

    socket.emit('online_room_resume_available', { roomId });
    return true;
}

function clearChallengesForSocket(socketId) {
    for (const key of Object.keys(pendingChallenges)) {
        const challenge = pendingChallenges[key];
        if (challenge && (challenge.challengerId === socketId || challenge.targetId === socketId)) {
            clearPendingChallenge(key);
        }
    }
}

function clearPendingChallengesBetweenSockets(socketA, socketB) {
    for (const key of Object.keys(pendingChallenges)) {
        const challenge = pendingChallenges[key];
        if (!challenge) continue;

        const samePair = (
            (challenge.challengerId === socketA && challenge.targetId === socketB) ||
            (challenge.challengerId === socketB && challenge.targetId === socketA)
        );

        if (samePair) clearPendingChallenge(key);
    }
}

function clearPendingChallengesBetweenPlayers(socketA, uidA, socketB, uidB) {
    for (const key of Object.keys(pendingChallenges)) {
        const challenge = pendingChallenges[key];
        if (!challenge) continue;

        const sameSocketPair = (
            (challenge.challengerId === socketA && challenge.targetId === socketB) ||
            (challenge.challengerId === socketB && challenge.targetId === socketA)
        );
        const sameUidPair = uidA && uidB && (
            (challenge.challengerUid === uidA && challenge.targetUid === uidB) ||
            (challenge.challengerUid === uidB && challenge.targetUid === uidA)
        );

        if (sameSocketPair || sameUidPair) clearPendingChallenge(key);
    }
}

function getActivePendingChallengeBetweenSockets(socketA, socketB) {
    const candidates = [
        findPendingChallenge(socketA, socketB),
        findPendingChallenge(socketB, socketA)
    ];

    for (const pending of candidates) {
        if (!pending || !pending.challenge) continue;

        if (Date.now() > pending.challenge.expiresAt) {
            clearPendingChallenge(pending.key);
            continue;
        }

        return pending;
    }

    return null;
}

function getActivePendingChallengeBetweenPlayers(socketA, uidA, socketB, uidB) {
    const socketPending = getActivePendingChallengeBetweenSockets(socketA, socketB);
    if (socketPending) return socketPending;
    if (!uidA || !uidB) return null;

    for (const key of Object.keys(pendingChallenges)) {
        const challenge = pendingChallenges[key];
        if (!challenge) continue;

        const sameUidPair = (
            (challenge.challengerUid === uidA && challenge.targetUid === uidB) ||
            (challenge.challengerUid === uidB && challenge.targetUid === uidA)
        );
        if (!sameUidPair) continue;

        if (Date.now() > challenge.expiresAt) {
            clearPendingChallenge(key);
            continue;
        }

        return { key, challenge };
    }

    return null;
}

function decodeJwtPayloadWithoutVerification(token) {
    try {
        if (typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    } catch (err) {
        return null;
    }
}

function sanitizeFirebaseErrorMessage(err) {
    const message = typeof err?.message === 'string' ? err.message : '';
    return message
        .replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
        .substring(0, 220);
}

function classifyInvalidFirebaseToken(token, err = null) {
    const payload = decodeJwtPayloadWithoutVerification(token);
    const tokenAudience = payload && typeof payload.aud === 'string' ? payload.aud : '';
    const tokenIssuer = payload && typeof payload.iss === 'string' ? payload.iss : '';
    const expectedProjectId = firebaseAdminProjectId || '';
    const firebaseErrorCode = typeof err?.code === 'string' ? err.code : '';
    const firebaseErrorMessage = sanitizeFirebaseErrorMessage(err);
    const lowerMessage = firebaseErrorMessage.toLowerCase();
    const errorDetails = {
        firebaseErrorCode,
        firebaseErrorMessage
    };

    if (!payload) {
        return {
            ok: false,
            reason: 'malformed_firebase_token',
            permanent: false,
            firebaseProjectId: expectedProjectId,
            ...errorDetails
        };
    }

    if (lowerMessage.includes('expired')) {
        return {
            ok: false,
            reason: 'firebase_token_expired',
            permanent: false,
            firebaseProjectId: expectedProjectId,
            tokenAudience,
            tokenIssuer,
            ...errorDetails
        };
    }

    if (lowerMessage.includes('invalid signature')) {
        return {
            ok: false,
            reason: 'firebase_token_invalid_signature',
            permanent: false,
            firebaseProjectId: expectedProjectId,
            tokenAudience,
            tokenIssuer,
            ...errorDetails
        };
    }

    if (lowerMessage.includes('no "kid"') || lowerMessage.includes("no 'kid'")) {
        return {
            ok: false,
            reason: 'firebase_token_missing_kid',
            permanent: false,
            firebaseProjectId: expectedProjectId,
            tokenAudience,
            tokenIssuer,
            ...errorDetails
        };
    }

    if (tokenIssuer && !tokenIssuer.startsWith('https://securetoken.google.com/')) {
        return {
            ok: false,
            reason: 'not_firebase_id_token',
            permanent: false,
            firebaseProjectId: expectedProjectId,
            tokenAudience,
            tokenIssuer,
            ...errorDetails
        };
    }

    if (expectedProjectId && tokenAudience && tokenAudience !== expectedProjectId) {
        return {
            ok: false,
            reason: 'firebase_project_mismatch',
            permanent: true,
            firebaseProjectId: expectedProjectId,
            tokenAudience,
            tokenIssuer,
            ...errorDetails
        };
    }

    return {
        ok: false,
        reason: 'invalid_firebase_token',
        permanent: false,
        firebaseProjectId: expectedProjectId,
        tokenAudience,
        tokenIssuer,
        ...errorDetails
    };
}

function shouldUseFirebaseRestTokenFallback(err) {
    const message = `${err?.message || ''} ${err?.code || ''}`.toLowerCase();
    return message.includes('public keys') ||
        message.includes('google certs') ||
        message.includes('certificate') ||
        message.includes('cert') ||
        message.includes('enotfound') ||
        message.includes('eai_again') ||
        message.includes('etimedout') ||
        message.includes('econnreset') ||
        message.includes('network');
}

async function verifyFirebaseTokenViaRest(token) {
    const apiKey = getFirebaseWebApiKey();
    if (!apiKey) {
        return { ok: false, reason: 'firebase_rest_api_key_missing' };
    }

    const result = await httpsJsonRequest(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        timeoutMs: 8000,
        body: { idToken: token }
    });

    if (!result.ok) {
        const errorMessage = result.body?.error?.message || result.reason || `http_${result.statusCode || 'unknown'}`;
        return {
            ok: false,
            reason: 'firebase_rest_verify_failed',
            firebaseRestStatusCode: result.statusCode || null,
            firebaseRestError: String(errorMessage).substring(0, 160)
        };
    }

    const user = Array.isArray(result.body?.users) ? result.body.users[0] : null;
    if (!user || typeof user.localId !== 'string' || !user.localId) {
        return { ok: false, reason: 'firebase_rest_user_missing' };
    }

    return {
        ok: true,
        uid: user.localId,
        fallback: 'identitytoolkit_accounts_lookup'
    };
}

async function verifyFirebaseSocketToken(socket, token) {
    if (typeof token !== 'string' || token.length < 100) {
        return { ok: false, reason: 'missing_firebase_token', permanent: false };
    }

    if (!firebaseAuth) {
        const fallbackResult = await verifyFirebaseTokenViaRest(token);
        if (fallbackResult.ok) {
            bindVerifiedPlayerSocket(socket, fallbackResult.uid);
            console.warn(`✅ Firebase token potvrđen preko REST fallback-a za uid=${fallbackResult.uid}`);
            return fallbackResult;
        }

        return {
            ok: false,
            reason: fallbackResult.reason || 'firebase_admin_unavailable',
            permanent: false,
            firebaseAdminUnavailable: true
        };
    }

    try {
        const decoded = await firebaseAuth.verifyIdToken(token);
        if (!decoded || typeof decoded.uid !== 'string') {
            return { ok: false, reason: 'invalid_firebase_token' };
        }

        bindVerifiedPlayerSocket(socket, decoded.uid);
        return { ok: true, uid: decoded.uid };
    } catch (err) {
        const classified = classifyInvalidFirebaseToken(token, err);
        console.warn(`⚠️ Firebase token odbijen (${classified.reason}, server=${classified.firebaseProjectId || 'unknown'}, tokenAud=${classified.tokenAudience || 'unknown'}):`, err.message);

        if (shouldUseFirebaseRestTokenFallback(err)) {
            const fallbackResult = await verifyFirebaseTokenViaRest(token);
            if (fallbackResult.ok) {
                bindVerifiedPlayerSocket(socket, fallbackResult.uid);
                console.warn(`✅ Firebase token potvrđen preko REST fallback-a za uid=${fallbackResult.uid}`);
                return fallbackResult;
            }

            return {
                ...classified,
                restFallback: fallbackResult
            };
        }

        return classified;
    }
}

function getServerQuarterInfo(now = new Date()) {
    const parts = getTimeZoneParts(now, LEADERBOARD_TIME_ZONE);
    return {
        year: parts.year,
        quarter: Math.floor((parts.month - 1) / 3) + 1
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

function getLeaguePeriodKey(year, quarter) {
    return `${year}-Q${quarter}`;
}

function isPastLeaguePeriod(year, quarter) {
    return compareLeaguePeriod({ year, quarter }, getServerQuarterInfo()) < 0;
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

const LEAGUE_RANK_BANDS = [
    { min: 0, max: 4999 },
    { min: 5000, max: 14999 },
    { min: 15000, max: 49999 },
    { min: 50000, max: 99999 },
    { min: 100000, max: MAX_LEAGUE_SCORE }
];

function leagueScoreIdentity(score) {
    return String(score?.playerId || score?._id || `${score?.playerName || 'unknown'}_${score?.year || ''}_${score?.quarter || ''}`);
}

async function fetchTopLeagueScoresForPeriod(year, quarter, limit = 50, scoreFilter = null) {
    const scoreMatch = { $type: 'number' };
    if (scoreFilter) Object.assign(scoreMatch, scoreFilter);
    const match = {
        year,
        quarter,
        playerId: { $type: 'string' },
        score: scoreMatch
    };

    return LeagueScore.aggregate([
        { $match: match },
        { $sort: { score: -1, date: -1 } },
        {
            $group: {
                _id: '$playerId',
                playerId: { $first: '$playerId' },
                playerName: { $first: '$playerName' },
                photoUrl: { $first: '$photoUrl' },
                score: { $max: '$score' },
                year: { $first: '$year' },
                quarter: { $first: '$quarter' },
                date: { $first: '$date' }
            }
        },
        { $sort: { score: -1 } },
        { $limit: Math.max(1, Math.min(250, toSafeInt(limit, 50))) }
    ]);
}

async function fetchLeagueHighscoresForRankBands(year, quarter) {
    const scoresByPlayer = new Map();

    for (const band of LEAGUE_RANK_BANDS) {
        const bandScores = await fetchTopLeagueScoresForPeriod(year, quarter, 50, { $gte: band.min, $lte: band.max });

        bandScores.forEach(score => {
            const key = leagueScoreIdentity(score);
            const current = scoresByPlayer.get(key);
            if (!current || (Number(score.score) || 0) > (Number(current.score) || 0)) {
                scoresByPlayer.set(key, score);
            }
        });
    }

    return Array.from(scoresByPlayer.values())
        .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
}

async function applyTechnicalLeagueDelta(user, delta) {
    if (!user || !user.firebaseUid || !Number.isFinite(Number(delta)) || Number(delta) === 0) {
        return normalizeUserLeagueDataForCurrentPeriod(user);
    }

    const leagueData = normalizeUserLeagueDataForCurrentPeriod(user);
    const nextScore = Math.max(
        0,
        Math.min(MAX_LEAGUE_SCORE, Math.floor((Number(leagueData.quarterlyScore) || 0) + Number(delta)))
    );

    const nextLeagueData = {
        ...leagueData,
        quarterlyScore: nextScore
    };

    user.leagueData = nextLeagueData;
    user.markModified('leagueData');

    if (MONGO_URI) {
        await LeagueScore.findOneAndUpdate(
            { playerId: user.firebaseUid, year: nextLeagueData.year, quarter: nextLeagueData.quarter },
            {
                $set: {
                    playerName: sanitizeTournamentName(user.playerName || 'Igrac'),
                    photoUrl: String(user.photoUrl || '').substring(0, 500),
                    score: nextScore,
                    date: Date.now()
                }
            },
            { upsert: true, new: true }
        );
    }

    return nextLeagueData;
}

async function archiveLeagueQuarter(year, quarter) {
    if (!Number.isInteger(year) || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) return null;
    if (!isPastLeaguePeriod(year, quarter)) return null;

    const periodKey = getLeaguePeriodKey(year, quarter);
    const existingArchive = await LeagueHallOfFame.findOne({ periodKey }).lean();
    if (existingArchive) return existingArchive;

    const topScores = await fetchTopLeagueScoresForPeriod(year, quarter, 3);

    if (!topScores.length) return null;

    const archivedScores = await Promise.all(topScores.map(async (score, index) => {
        const user = await UserProfile.findOne({ firebaseUid: score.playerId }).lean();
        return {
            rank: index + 1,
            playerId: score.playerId,
            playerName: score.playerName,
            photoUrl: score.photoUrl || user?.photoUrl || '',
            score: Math.max(0, toSafeInt(score.score, 0))
        };
    }));

    const champion = archivedScores[0] || null;
    return LeagueHallOfFame.findOneAndUpdate(
        { periodKey },
        {
            $set: {
                year,
                quarter,
                topScores: archivedScores,
                champion,
                archivedAt: Date.now()
            }
        },
        { upsert: true, new: true }
    ).lean();
}

async function archiveCompletedLeagueQuarters() {
    const periods = await LeagueScore.aggregate([
        { $group: { _id: { year: '$year', quarter: '$quarter' } } },
        { $sort: { '_id.year': 1, '_id.quarter': 1 } }
    ]);

    const archived = [];
    for (const period of periods) {
        const year = Number(period?._id?.year);
        const quarter = Number(period?._id?.quarter);
        if (!Number.isInteger(year) || !Number.isInteger(quarter) || !isPastLeaguePeriod(year, quarter)) continue;
        const archive = await archiveLeagueQuarter(year, quarter);
        if (archive) archived.push(archive);
    }

    return archived;
}

async function syncCurrentLeagueScoreFromUserProfile(user, playerName, photoUrl) {
    if (!user || !user.firebaseUid) return null;

    const leagueData = normalizeUserLeagueDataForCurrentPeriod(user);
    if (!isCurrentLeaguePeriod(leagueData)) return null;

    const score = Math.max(0, Math.min(MAX_LEAGUE_SCORE, toSafeInt(leagueData.quarterlyScore, 0)));
    if (score <= 0) return null;

    let safeName = String(playerName || user.playerName || 'Nepoznat Igrač').trim().substring(0, MAX_NAME_LENGTH);
    if (!safeName || sadrziPsovku(safeName)) {
        safeName = 'Igrač_' + Math.floor(1000 + Math.random() * 9000);
    }

    const safePhotoUrl = String(photoUrl || user.photoUrl || '').substring(0, 500);

    try {
        return await LeagueScore.findOneAndUpdate(
            { playerId: user.firebaseUid, year: leagueData.year, quarter: leagueData.quarter },
            {
                $set: {
                    playerName: safeName,
                    photoUrl: safePhotoUrl,
                    date: Date.now()
                },
                $max: { score }
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('Greška pri sinhronizaciji profila sa Kvartalnom Ligom:', err);
        return null;
    }
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

function coerceBooleanSetting(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
}

function normalizeMusicVolume(value, fallback = 0.4) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(1, num));
}

function normalizeLanguageSetting(value, fallback = 'sr') {
    const lang = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (lang === 'sr' || lang === 'en') return lang;
    return fallback;
}

function isStablePlayerUid(uid) {
    return typeof uid === 'string' &&
        uid.length >= 20 &&
        !uid.startsWith('guest_') &&
        uid !== 'undefined' &&
        uid !== 'null';
}

async function getBestSubmittedScoreForUid(uid) {
    if (!MONGO_URI || !isStablePlayerUid(uid)) return 0;

    const [bestEntry] = await Score.aggregate([
        { $match: { $or: [{ playerId: uid }, { uid }] } },
        { $addFields: { numScore: { $convert: { input: "$score", to: "double", onError: 0, onNull: 0 } } } },
        { $match: { numScore: { $gt: 0, $lte: MAX_SCORE } } },
        { $sort: { numScore: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, score: "$numScore" } }
    ]);

    return Math.max(0, Math.min(MAX_SCORE, toSafeInt(bestEntry?.score, 0)));
}

async function syncUserHighscoreFromScoreHistory(user, uid = user?.firebaseUid) {
    if (!user || !isStablePlayerUid(uid)) return Math.max(0, toSafeInt(user?.highscore, 0));

    const bestScore = await getBestSubmittedScoreForUid(uid);
    const currentHighscore = Math.max(0, toSafeInt(user.highscore, 0));
    if (bestScore > currentHighscore) {
        user.highscore = bestScore;
    }
    return Math.max(currentHighscore, bestScore);
}

let admobRewardKeyCache = {
    fetchedAt: 0,
    keys: new Map()
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeAdMobNonce(value) {
    const nonce = typeof value === 'string' ? value.trim() : '';
    return /^[A-Za-z0-9_-]{12,96}$/.test(nonce) ? nonce : '';
}

function sanitizeAdMobContext(value) {
    const context = typeof value === 'string' ? value.trim().substring(0, 48) : '';
    return /^[A-Za-z0-9_.:-]+$/.test(context) ? context : 'rewarded_ad';
}

function sanitizeAdMobUid(value) {
    const uid = typeof value === 'string' ? value.trim().substring(0, 128) : '';
    return uid && !uid.startsWith('guest_') ? uid : '';
}

function parseAdMobTimestamp(value) {
    const raw = Math.max(0, toSafeInt(value, 0));
    if (raw > 100000000000000) return Math.floor(raw / 1000);
    return raw;
}

function base64UrlToBuffer(value) {
    let normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    return Buffer.from(normalized, 'base64');
}

function httpsGetJson(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 8000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectCount < 3) {
                res.resume();
                resolve(httpsGetJson(new URL(res.headers.location, url).toString(), redirectCount + 1));
                return;
            }

            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`AdMob keys HTTP ${res.statusCode}`));
                return;
            }

            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('timeout', () => req.destroy(new Error('AdMob keys timeout')));
        req.on('error', reject);
    });
}

async function getAdMobRewardPublicKeys() {
    if (Date.now() - admobRewardKeyCache.fetchedAt < ADMOB_REWARD_KEYS_CACHE_MS && admobRewardKeyCache.keys.size > 0) {
        return admobRewardKeyCache.keys;
    }

    const payload = await httpsGetJson(ADMOB_REWARD_KEYS_URL);
    const keys = new Map();
    (payload.keys || []).forEach(key => {
        const keyId = key.keyId !== undefined ? String(key.keyId) : '';
        const pem = typeof key.pem === 'string' ? key.pem : '';
        if (keyId && pem) keys.set(keyId, pem);
    });

    if (keys.size === 0) throw new Error('AdMob keys response empty');
    admobRewardKeyCache = { fetchedAt: Date.now(), keys };
    return keys;
}

function getRawAdMobSsvQuery(req) {
    const originalUrl = req.originalUrl || req.url || '';
    const queryStart = originalUrl.indexOf('?');
    return queryStart >= 0 ? originalUrl.slice(queryStart + 1) : '';
}

function splitAdMobSsvSignedQuery(rawQuery) {
    const signatureMarker = '&signature=';
    const signatureIndex = rawQuery.indexOf(signatureMarker);
    if (signatureIndex < 0) return null;

    const signedPart = rawQuery.slice(0, signatureIndex);
    const signatureAndKey = rawQuery.slice(signatureIndex + signatureMarker.length);
    const keyMarker = '&key_id=';
    const keyIndex = signatureAndKey.indexOf(keyMarker);
    if (keyIndex < 0) return null;

    return {
        signedPart,
        signature: decodeURIComponent(signatureAndKey.slice(0, keyIndex)),
        keyId: decodeURIComponent(signatureAndKey.slice(keyIndex + keyMarker.length))
    };
}

function parseAdMobCustomData(rawCustomData) {
    if (typeof rawCustomData !== 'string' || !rawCustomData.trim()) return {};
    try {
        const parsed = JSON.parse(rawCustomData);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        console.warn('AdMob SSV custom_data nije JSON:', err.message);
        return {};
    }
}

function isAllowedAdMobRewardUnit(adUnit) {
    if (!ADMOB_ALLOWED_REWARDED_AD_UNITS.size) return true;
    const value = String(adUnit || '').trim();
    if (!value) return false;
    if (ADMOB_ALLOWED_REWARDED_AD_UNITS.has(value)) return true;
    if (value.includes('/')) return ADMOB_ALLOWED_REWARDED_AD_UNITS.has(value.split('/').pop());
    return ADMOB_ALLOWED_REWARDED_AD_UNITS.has(`ca-app-pub-4319963185096437/${value}`);
}

async function verifyAdMobRewardSsvRequest(req) {
    const rawQuery = getRawAdMobSsvQuery(req);
    const signed = splitAdMobSsvSignedQuery(rawQuery);
    if (!signed || !signed.signature || !signed.keyId) {
        return { ok: false, reason: 'missing_signature' };
    }

    const keys = await getAdMobRewardPublicKeys();
    const publicKey = keys.get(String(signed.keyId));
    if (!publicKey) {
        admobRewardKeyCache = { fetchedAt: 0, keys: new Map() };
        const refreshedKeys = await getAdMobRewardPublicKeys();
        const refreshedPublicKey = refreshedKeys.get(String(signed.keyId));
        if (!refreshedPublicKey) return { ok: false, reason: 'unknown_key_id' };
        return verifyAdMobRewardSignatureAndParams(req, signed, refreshedPublicKey);
    }

    return verifyAdMobRewardSignatureAndParams(req, signed, publicKey);
}

function verifyAdMobRewardSignatureAndParams(req, signed, publicKey) {
    const verifier = crypto.createVerify('sha256');
    verifier.update(signed.signedPart);
    verifier.end();

    const signature = base64UrlToBuffer(signed.signature);
    if (!verifier.verify(publicKey, signature)) {
        return { ok: false, reason: 'invalid_signature' };
    }

    const params = {};
    for (const [key, value] of new URLSearchParams(getRawAdMobSsvQuery(req))) {
        params[key] = value;
    }

    if (!isAllowedAdMobRewardUnit(params.ad_unit)) {
        return { ok: false, reason: 'invalid_ad_unit' };
    }

    return { ok: true, params };
}

async function recordVerifiedAdMobReward(params) {
    if (!MONGO_URI) return { ok: true, recorded: false, reason: 'mongo_unavailable' };

    const customData = parseAdMobCustomData(params.custom_data);
    const uid = sanitizeAdMobUid(params.user_id || customData.uid);
    const nonce = sanitizeAdMobNonce(customData.nonce);
    const transactionId = typeof params.transaction_id === 'string' ? params.transaction_id.trim().substring(0, 160) : '';

    if (!uid || !nonce || !transactionId) {
        return { ok: true, recorded: false, reason: 'missing_uid_nonce_or_transaction' };
    }

    const context = sanitizeAdMobContext(customData.context);
    const rewardAmount = Math.max(0, Math.min(MAX_BALANCE, toSafeInt(customData.amount || params.reward_amount, 0)));
    const adTimestamp = parseAdMobTimestamp(params.timestamp);
    const record = {
        transactionId,
        uid,
        nonce,
        context,
        adUnit: typeof params.ad_unit === 'string' ? params.ad_unit.substring(0, 120) : '',
        adNetwork: typeof params.ad_network === 'string' ? params.ad_network.substring(0, 120) : '',
        rewardAmount,
        rewardItem: typeof params.reward_item === 'string' ? params.reward_item.substring(0, 80) : '',
        adTimestamp,
        receivedAt: new Date(),
        raw: params
    };

    const result = await AdMobRewardVerification.findOneAndUpdate(
        { transactionId },
        { $setOnInsert: record },
        { upsert: true, new: true }
    );

    return { ok: true, recorded: true, reward: result };
}

async function waitForVerifiedAdMobReward(uid, nonce, contexts, options = {}) {
    if (!REQUIRE_ADMOB_SSV) {
        return { ok: true, bypassed: true };
    }

    const cleanUid = sanitizeAdMobUid(uid);
    const cleanNonce = sanitizeAdMobNonce(nonce);
    if (!cleanUid || !cleanNonce) {
        return { ok: false, reason: 'ad_verification_required', permanent: false };
    }

    const allowedContexts = Array.isArray(contexts) && contexts.length > 0
        ? [...new Set(contexts.map(sanitizeAdMobContext).filter(Boolean))]
        : [];
    const deadline = Date.now() + (options.timeoutMs || ADMOB_SSV_WAIT_TIMEOUT_MS);
    const minAdTimestamp = Math.max(
        0,
        Date.now() - ADMOB_SSV_MAX_AGE_MS,
        toSafeInt(options.minAdTimestamp, 0)
    );

    while (Date.now() <= deadline) {
        const query = {
            uid: cleanUid,
            nonce: cleanNonce,
            claimedAt: null
        };

        if (allowedContexts.length > 0) query.context = { $in: allowedContexts };
        if (minAdTimestamp > 0) query.adTimestamp = { $gte: minAdTimestamp };

        const reward = await AdMobRewardVerification.findOneAndUpdate(
            query,
            { $set: { claimedAt: new Date(), claimedBy: options.claimedBy || allowedContexts[0] || 'rewarded_ad' } },
            { new: true }
        );

        if (reward) return { ok: true, reward };
        await sleep(ADMOB_SSV_POLL_MS);
    }

    return { ok: false, reason: 'ad_verification_pending', permanent: false, retryAfterMs: 2000 };
}

app.get('/api/admob/reward-ssv', async (req, res) => {
    try {
        const verified = await verifyAdMobRewardSsvRequest(req);
        if (!verified.ok) {
            console.warn(`⚠️ AdMob SSV odbijen: ${verified.reason}`);
            res.status(400).send(verified.reason || 'invalid');
            return;
        }

        const recordResult = await recordVerifiedAdMobReward(verified.params);
        if (recordResult.recorded) {
            const uid = recordResult.reward?.uid;
            const socketId = uid ? onlinePlayers[uid] : null;
            if (socketId) {
                io.to(socketId).emit('admob_reward_verified', {
                    nonce: recordResult.reward.nonce,
                    context: recordResult.reward.context
                });
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('❌ AdMob SSV callback greška:', err);
        res.status(500).send('server_error');
    }
});

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

function filterIdsByCategory(items, allowedIds) {
    return sanitizeIdArray(items).filter(id => allowedIds.has(id));
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
    const todayStr = getDailyChallengeDayKey();
    const legacyTodayStr = getLegacyDailyDayKey();
    const requestedDailyReward = Math.max(0, Math.min(MAX_DAILY_REWARD, toSafeInt(stats?.dailyRewardAmount, 0)));
    const expectedDailyReward = user?.firebaseUid ? getDailyChallengeForUid(user.firebaseUid).reward : 0;
    const dailyRewardMatchesChallenge = requestedDailyReward === expectedDailyReward ||
        requestedDailyReward === expectedDailyReward * 2;
    const dailyStartedToday = isDailyKeyToday(user.lastDaily, todayStr, legacyTodayStr) ||
        isDailyKeyToday(stats?.lastDaily, todayStr, legacyTodayStr);
    const dailyClaimRequested = isDailyKeyToday(stats?.dailyRewardClaimed, todayStr, legacyTodayStr) &&
        requestedDailyReward > 0 &&
        dailyRewardMatchesChallenge;
    const dailyAllowance = !REQUIRE_ADMOB_SSV &&
        dailyStartedToday &&
        dailyClaimRequested &&
        !isDailyKeyToday(user.lastDailyRewardClaimed, todayStr, legacyTodayStr)
        ? requestedDailyReward
        : 0;

    const adSyncAllowance = REQUIRE_ADMOB_SSV ? 0 : MAX_AD_REWARD_PER_SYNC;

    return adSyncAllowance +
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
    const recentTechnicalResult = getRecentServerTechnicalResult(user.firebaseUid);
    const isServerTechnicalEcho = !allowLegacyImport &&
        acceptedGameDelta === 0 &&
        recentTechnicalResult &&
        (
            (recentTechnicalResult.resultType === 'win' && requestedWinsDelta === 1 && requestedLossesDelta === 0) ||
            (recentTechnicalResult.resultType === 'loss' && requestedLossesDelta === 1 && requestedWinsDelta === 0)
        );
    let remainingCompetitiveDelta = isServerTechnicalEcho ? 0 : acceptedGameDelta + legacyCompetitiveRoom + 1;

    const acceptedWinsDelta = Math.min(requestedWinsDelta, remainingCompetitiveDelta);
    user.wins = oldStats.wins + acceptedWinsDelta;
    remainingCompetitiveDelta -= acceptedWinsDelta;

    const acceptedLossesDelta = Math.min(requestedLossesDelta, remainingCompetitiveDelta);
    user.losses = oldStats.losses + acceptedLossesDelta;

    if (isServerTechnicalEcho) {
        console.log(`🛡️ STATS GUARD: Ignorišem eho serverske tehničke ${recentTechnicalResult.resultType === 'win' ? 'pobede' : 'kazne'} za ${user.playerName || user.firebaseUid}.`);
    } else if (requestedWinsDelta + requestedLossesDelta > acceptedWinsDelta + acceptedLossesDelta) {
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

    const nextMaxWinStreak = Math.max(oldStats.maxWinStreak, Math.min(incoming.maxWinStreak, user.wins));
    let nextCurrentWinStreak = Math.min(oldStats.currentWinStreak, nextMaxWinStreak);

    if (allowLegacyImport) {
        nextCurrentWinStreak = Math.min(
            Math.max(nextCurrentWinStreak, incoming.currentWinStreak),
            nextMaxWinStreak
        );
    } else if (acceptedLossesDelta > 0 && incoming.currentWinStreak === 0) {
        nextCurrentWinStreak = 0;
    } else if (acceptedWinsDelta > 0) {
        nextCurrentWinStreak = Math.min(
            Math.max(oldStats.currentWinStreak + acceptedWinsDelta, incoming.currentWinStreak),
            nextMaxWinStreak
        );
    }

    user.maxWinStreak = nextMaxWinStreak;
    user.currentWinStreak = nextCurrentWinStreak;

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
    const allowedSet = new Set(sanitizeIdArray(allowedItems));
    const requestedId = sanitizeIdArray([requested], 1)[0];
    const fallbackId = sanitizeIdArray([fallback], 1)[0];

    if (requestedId && allowedSet.has(requestedId)) return requestedId;
    if (fallbackId && allowedSet.has(fallbackId)) return fallbackId;
    return defaultId;
}

function normalizeActiveSelections(user, fallbackActive = {}) {
    const skinItems = filterIdsByCategory([
        ...sanitizeIdArray(user.unlockedSkins),
        ...sanitizeIdArray(user.yamb_unlocked),
        ...Array.from(FREE_UNLOCK_IDS)
    ], SKIN_UNLOCK_IDS);
    const effectItems = filterIdsByCategory([
        ...sanitizeIdArray(user.unlockedEffects),
        ...sanitizeIdArray(user.yamb_unlocked),
        ...Array.from(FREE_UNLOCK_IDS)
    ], EFFECT_UNLOCK_IDS);
    const themeItems = filterIdsByCategory([
        ...sanitizeIdArray(user.yamb_unlocked),
        ...Array.from(FREE_UNLOCK_IDS)
    ], THEME_UNLOCK_IDS);

    user.activeSkin = pickAllowedInventoryItem(user.activeSkin, skinItems, fallbackActive.activeSkin, 'default');
    user.activeEffect = pickAllowedInventoryItem(user.activeEffect, effectItems, fallbackActive.activeEffect, 'confetti');
    user.activeTheme = pickAllowedInventoryItem(user.activeTheme, themeItems, fallbackActive.activeTheme, 'dark');
}

function hasMeaningfulStoredProfile(user) {
    if (!user) return false;

    const numericFields = [
        'games',
        'wins',
        'losses',
        'highscore',
        'totalScoreSum',
        'balance',
        'undoTokens',
        'currentWinStreak',
        'maxWinStreak',
        'tournamentWins',
        'penaltyPoints'
    ];
    if (numericFields.some(field => Math.max(0, toSafeInt(user[field], 0)) > 0)) return true;

    const unlockFields = ['unlockedTrophies', 'unlockedSkins', 'unlockedEffects', 'yamb_unlocked'];
    if (unlockFields.some(field => sanitizeIdArray(user[field]).some(id => !FREE_UNLOCK_IDS.has(id)))) return true;

    const leagueData = user.leagueData || {};
    if (Math.max(0, toSafeInt(leagueData.baselineScore, 0)) > 0 ||
        Math.max(0, toSafeInt(leagueData.quarterlyScore, 0)) > 0) {
        return true;
    }

    return user.h2hStats && typeof user.h2hStats === 'object' && Object.keys(user.h2hStats).length > 0;
}

async function backupMeaningfulProfile(user, reason = 'profile_sync') {
    if (!MONGO_URI || !hasMeaningfulStoredProfile(user)) return;

    try {
        const rawProfile = typeof user.toObject === 'function'
            ? user.toObject({ depopulate: true, versionKey: false })
            : { ...user };
        delete rawProfile._id;

        await UserProfileBackup.create({
            firebaseUid: user.firebaseUid,
            playerName: user.playerName || '',
            reason,
            profile: rawProfile
        });

        const oldBackups = await UserProfileBackup.find({ firebaseUid: user.firebaseUid })
            .sort({ createdAt: -1 })
            .skip(PROFILE_BACKUP_KEEP_LIMIT)
            .select('_id')
            .lean();

        if (oldBackups.length > 0) {
            await UserProfileBackup.deleteMany({ _id: { $in: oldBackups.map(item => item._id) } });
        }
    } catch (err) {
        console.warn(`⚠️ PROFILE BACKUP: Nije uspelo čuvanje snapshot-a za ${user.playerName || user.firebaseUid}:`, err.message);
    }
}

function isEmptyClientProfileSnapshot(stats = {}) {
    const normalized = normalizeProfileStats(stats);
    if (hasProfileStatsPayload(stats, normalized)) return false;
    if (Math.max(0, toSafeInt(stats.balance, 0)) > 0) return false;
    if (Math.max(0, toSafeInt(stats.undoTokens, 0)) > 0) return false;

    const unlockFields = ['unlockedSkins', 'unlockedEffects', 'yamb_unlocked', 'unlockedThemes'];
    if (unlockFields.some(field => sanitizeIdArray(stats[field]).some(id => !FREE_UNLOCK_IDS.has(id)))) return false;

    const leagueData = stats.leagueData || {};
    if (Math.max(0, toSafeInt(leagueData.baselineScore, 0)) > 0 ||
        Math.max(0, toSafeInt(leagueData.quarterlyScore, 0)) > 0) {
        return false;
    }

    return !(stats.h2hStats && typeof stats.h2hStats === 'object' && Object.keys(stats.h2hStats).length > 0);
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

function clearSpectatingRoom(socket, options = {}) {
    if (!socket || !socket.spectatingRoom) return null;

    const previousRoomId = socket.spectatingRoom;
    socket.leave(previousRoomId);
    socket.isSpectator = false;
    socket.spectatingRoom = null;

    if (!options.skipSpectatorCount) {
        updateRoomSpectators(previousRoomId);
    }

    return previousRoomId;
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

        if (!state) {
            socket.emit('force_cancel_online', { roomId: roomId || null });
            return;
        }

        if (state.gameFinished) return;

        const currentTurnPlayer = state.players[state.turnIndex];
        if (socket.id === currentTurnPlayer) return;
        if (hasActiveDisconnectGraceForRoom(roomId)) return;

        const elapsed = Date.now() - (state.turnStartTime || 0);
        const turnTimeoutMs = Math.max(1000, toSafeInt(state.turnTimeoutMs, TOTAL_TIMEOUT));

        if (elapsed >= turnTimeoutMs) {
            console.log(`🛡️ SAFETY NET: Vreme zaista isteklo (${elapsed}ms/${turnTimeoutMs}ms). Prekidam!`);
            const timerToken = state.turnTimerToken !== undefined ? state.turnTimerToken : null;
            handleTechnicalTimeout(roomId, currentTurnPlayer, timerToken);
            return;
        }

        if (!roomTimers[roomId]) {
            const remaining = Math.max(1, turnTimeoutMs - elapsed);
            const timerToken = state.turnTimerToken;
            roomTimers[roomId] = setTimeout(() => {
                delete roomTimers[roomId];
                handleTechnicalTimeout(roomId, null, timerToken);
            }, remaining);
        }

        console.log(`⏳ SAFETY NET: Klijent žuri. Još uvek teče Grace Period. Preostalo: ${turnTimeoutMs - elapsed}ms`);
    });

    // DODATO: Provera da li je soba još uvek živa kada se klijent vrati u igru
    socket.on('check_room_status', (data) => {
        const roomId = String(data?.roomId || '');
        const state = roomState[roomId];
        const isActive = !!(state && !state.gameFinished);
        socket.emit('room_status_result', {
            active: isActive,
            roomId,
            duelType: getOnlineDuelType(roomId),
            tournament: isTournamentRoomId(roomId),
            turnTimerPaused: isActive ? hasActiveDisconnectGraceForRoom(roomId) : false,
            disconnectGraceRemainingMs: isActive ? getRoomDisconnectGraceRemainingMs(roomId) : 0
        });
    });

    socket.on('online_app_backgrounded', (data = {}) => {
        const roomId = playerRooms[socket.id] || String(data.roomId || '');
        if (!roomId || !isTournamentRoomId(roomId)) return;

        const state = roomState[roomId];
        if (!state || state.gameFinished || !Array.isArray(state.players) || !state.players.includes(socket.id)) return;

        beginReconnectGraceForSocket(socket, roomId, 'app_backgrounded');
    });

    socket.on('online_presence_ping', (data = {}) => {
        const roomId = playerRooms[socket.id] || String(data.roomId || '');
        if (!roomId || !isTournamentRoomId(roomId)) return;
        rememberRoomPresence(roomId, socket);
    });

    socket.on('online_app_resumed', (data = {}) => {
        const roomId = playerRooms[socket.id] || String(data.roomId || '');
        const uid = getSocketUid(socket.id) || socket.verifiedUid || socket.playerId;
        if (!uid || !roomId) return;

        rememberRoomPresence(roomId, socket);
        const restored = clearDisconnectGraceForUid(uid, roomId);
        if (restored) {
            io.to(roomId).emit('opponent_connection_restored', { roomId, restoredUid: uid });
        }

        const state = roomState[roomId];
        if (state && !state.gameFinished && playerRooms[socket.id] === roomId) {
            emitAuthoritativeRoomState(socket, roomId);
        }
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

    socket.on('push_register_token', async (data = {}, ack) => {
        const reply = createPushReply(socket, ack, 'push_register_token_result');
        const uid = socket.verifiedUid;
        if (!uid) return rejectPushWithoutAuth(socket, reply);

        const result = await registerPushToken(uid, data);
        reply(result);
    });

    socket.on('push_unregister_token', async (data = {}, ack) => {
        const reply = createPushReply(socket, ack, 'push_unregister_token_result');
        const uid = socket.verifiedUid;
        if (!uid) return rejectPushWithoutAuth(socket, reply);

        const result = await unregisterPushToken(uid, data);
        reply(result);
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

    socket.on('request_profile_sync', async (data = {}, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        const verifiedUid = socket.verifiedUid;

        if (!verifiedUid) {
            const result = { ok: false, reason: 'firebase_token_required' };
            reply(result);
            socket.emit('auth_required', result);
            return;
        }

        if (!MONGO_URI) {
            const result = { ok: false, reason: 'mongo_unavailable' };
            reply(result);
            socket.emit('sync_unavailable', result);
            return;
        }

        try {
            const user = await UserProfile.findOne({ firebaseUid: verifiedUid });
            if (!user) {
                reply({ ok: false, reason: 'profile_not_found' });
                return;
            }

            emitProfileSync(socket, user);
            reply({ ok: true });
        } catch (err) {
            console.error("Greška pri povlačenju profila:", err);
            reply({ ok: false, reason: 'server_error' });
        }
    });

    socket.on('request_daily_challenge', async (data = {}, ack) => {
        const replyDailyChallenge = (payload) => {
            if (typeof ack === 'function') ack(payload);
            socket.emit('daily_challenge_data', payload);
            return payload;
        };

        try {
            const uid = getVerifiedUid(socket);
            if (!uid) {
                const result = { ok: false, reason: 'auth_required' };
                socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
                return replyDailyChallenge(result);
            }

            const challenge = getDailyChallengeForUid(uid);
            const legacyTodayStr = getLegacyDailyDayKey();

            if (!MONGO_URI) {
                return replyDailyChallenge({
                    ok: true,
                    ...challenge,
                    alreadyClaimed: false,
                    localFallback: true
                });
            }

            const user = await UserProfile.findOne({ firebaseUid: uid });
            if (!user) {
                return replyDailyChallenge({ ok: false, reason: 'auth_required' });
            }

            const alreadyStarted = isDailyKeyToday(user.lastDaily, challenge.dayKey, legacyTodayStr);
            const alreadyClaimed = isDailyKeyToday(user.lastDailyRewardClaimed, challenge.dayKey, legacyTodayStr);
            let changed = false;

            if (!alreadyStarted || user.lastDaily !== challenge.dayKey) {
                user.lastDaily = challenge.dayKey;
                changed = true;
            }

            if (alreadyClaimed && user.lastDailyRewardClaimed !== challenge.dayKey) {
                user.lastDailyRewardClaimed = challenge.dayKey;
                changed = true;
            }

            if (changed) await user.save();

            return replyDailyChallenge({
                ok: true,
                ...challenge,
                alreadyClaimed,
                balance: Math.max(0, toSafeInt(user.balance, 0))
            });
        } catch (err) {
            console.error('❌ request_daily_challenge greška:', err);
            return replyDailyChallenge({ ok: false, reason: 'server_error' });
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
                socket.emit('sync_unavailable', { ok: false, reason: 'mongo_unavailable' });
                updateOnlineCount(); 
                flushPendingOnlineRoomResume(socket);
                return;
            }

            let user = await UserProfile.findOne({ firebaseUid: verifiedUid });
            const s = data.stats || {}; 

            if (user) {
                const emptyClientSnapshot = isEmptyClientProfileSnapshot(s);
                const storedProfileHasProgress = hasMeaningfulStoredProfile(user);
                if (emptyClientSnapshot && storedProfileHasProgress) {
                    await backupMeaningfulProfile(user, 'before_empty_client_profile_sync');
                }

                user.playerName = data.name;
                user.lastLogin = Date.now();
                user.photoUrl = socket.photoUrl || user.photoUrl;
                const previousActive = {
                    activeSkin: user.activeSkin,
                    activeEffect: user.activeEffect,
                    activeTheme: user.activeTheme
                };
                const ignoreEmptyClientSnapshot = emptyClientSnapshot && storedProfileHasProgress;
                if (ignoreEmptyClientSnapshot) {
                    console.log(`🛡️ PROFILE SYNC: Ignorišem prazan lokalni snapshot za ${user.playerName || verifiedUid}; vraćam postojeći cloud profil.`);
                }

                if (!ignoreEmptyClientSnapshot && s.activeSkin !== undefined && s.activeSkin !== null) user.activeSkin = s.activeSkin;
                if (!ignoreEmptyClientSnapshot && s.activeEffect !== undefined && s.activeEffect !== null) user.activeEffect = s.activeEffect;
                if (!ignoreEmptyClientSnapshot && s.activeTheme !== undefined && s.activeTheme !== null) user.activeTheme = s.activeTheme;
                const requestedSoundEnabled = coerceBooleanSetting(s.soundEnabled);
                const requestedVibrationEnabled = coerceBooleanSetting(s.vibrationEnabled);
                const requestedMusicEnabled = coerceBooleanSetting(s.musicEnabled);
                const requestedLanguage = normalizeLanguageSetting(s.language, null);

                if (requestedSoundEnabled !== null) user.soundEnabled = requestedSoundEnabled;
                if (requestedVibrationEnabled !== null) user.vibrationEnabled = requestedVibrationEnabled;
                if (requestedMusicEnabled !== null) user.musicEnabled = requestedMusicEnabled;
                if (s.musicVolume !== undefined && s.musicVolume !== null) {
                    user.musicVolume = normalizeMusicVolume(s.musicVolume, user.musicVolume ?? 0.4);
                }
                if (requestedLanguage) user.language = requestedLanguage;

                if (s.penaltyPoints !== undefined && s.penaltyPoints > (user.penaltyPoints || 0)) {
                    user.penaltyPoints = s.penaltyPoints;
                }

                const todayStr = getDailyChallengeDayKey();
                const legacyTodayStr = getLegacyDailyDayKey();
                const clientLastDailyToday = isDailyKeyToday(s.lastDaily, todayStr, legacyTodayStr);
                const clientDailyClaimedToday = isDailyKeyToday(s.dailyRewardClaimed, todayStr, legacyTodayStr);
                if (isDailyKeyToday(user.lastDaily, todayStr, legacyTodayStr) && user.lastDaily !== todayStr) {
                    user.lastDaily = todayStr;
                }
                if (isDailyKeyToday(user.lastDailyRewardClaimed, todayStr, legacyTodayStr) && user.lastDailyRewardClaimed !== todayStr) {
                    user.lastDailyRewardClaimed = todayStr;
                }
                const requestedDailyReward = Math.max(0, Math.min(MAX_DAILY_REWARD, toSafeInt(s.dailyRewardAmount, 0)));
                const expectedDailyReward = getDailyChallengeForUid(verifiedUid).reward;
                const dailyRewardMatchesChallenge = requestedDailyReward === expectedDailyReward ||
                    requestedDailyReward === expectedDailyReward * 2;
                const hasDailyClaimPayload = clientDailyClaimedToday || s.dailyRewardAmount !== undefined;
                const dailyStartedToday = isDailyKeyToday(user.lastDaily, todayStr, legacyTodayStr) || clientLastDailyToday;
                const shouldMarkDailyRewardClaimed = !REQUIRE_ADMOB_SSV &&
                    dailyStartedToday &&
                    clientDailyClaimedToday &&
                    requestedDailyReward > 0 &&
                    dailyRewardMatchesChallenge &&
                    !isDailyKeyToday(user.lastDailyRewardClaimed, todayStr, legacyTodayStr);

                // 🛡️ NOVO: Popravljena logika (INVENTORY DESYNC FIX)
                const isFreshLogin = (toSafeInt(s.games, 0) === 0);
                const statsGuard = applyProfileStatsGuard(user, s);
                const scoreHistoryHighscore = await syncUserHighscoreFromScoreHistory(user, verifiedUid);
                if (scoreHistoryHighscore > statsGuard.acceptedStats.highscore) {
                    statsGuard.acceptedStats.highscore = scoreHistoryHighscore;
                }
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
                const isClientSynced = !ignoreEmptyClientSnapshot && (s.games >= oldUserGames);

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
                const isDailyBalanceOverage = hasDailyClaimPayload && requestedDailyReward > 0 && requestedBalanceDelta > 0 && (
                    (shouldMarkDailyRewardClaimed && requestedBalanceDelta > earnedBalanceIncrease) ||
                    (!shouldMarkDailyRewardClaimed && isDailyKeyToday(user.lastDailyRewardClaimed, todayStr, legacyTodayStr) && requestedBalanceDelta === requestedDailyReward)
                );
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
                    } else if (isDailyBalanceOverage) {
                        console.log(`🛡️ DAILY GUARD: Odbijen dodatni dnevni skok dukata za ${user.playerName}. Dozvoljeno daily +earned ${earnedBalanceIncrease}, traženo +${requestedBalanceDelta}.`);
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
                    const allowedUndoIncrease = legacyUndoAllowance;

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

                if (isDailyKeyToday(user.lastDaily, todayStr, legacyTodayStr)) {
                    user.lastDaily = todayStr;
                    if (s.lastDaily !== todayStr) {
                        s.lastDaily = todayStr;
                    }
                } else {
                    if (s.lastDaily) {
                        user.lastDaily = clientLastDailyToday ? todayStr : s.lastDaily;
                    }
                }

                if (s.h2hStats) {
                    const oldCloudH2H = user.h2hStats || {};
                    let cloudH2H = normalizeH2HStatsForUser(oldCloudH2H, user.firebaseUid, user.playerName);
                    const localH2H = normalizeH2HStatsForUser(s.h2hStats, user.firebaseUid, user.playerName);
                    let isModified = JSON.stringify(oldCloudH2H) !== JSON.stringify(cloudH2H);

                    for (const [oppName, localData] of Object.entries(localH2H)) {

                        // 🛡️ SERVER H2H FILTER: Blokiramo undefined i null stringove
                        if (!oppName || String(oppName) === 'undefined' || String(oppName) === 'null' || oppName === 'Nepoznat') continue;
                        
                        if (!cloudH2H[oppName]) {
                            cloudH2H[oppName] = localData;
                            isModified = true;
                        } else {
                            let cloudData = cloudH2H[oppName];
                            const stableUid = isStableH2HUid(localData.uid || cloudData.uid || oppName, user.firebaseUid)
                                ? String(localData.uid || cloudData.uid || oppName).trim()
                                : '';
                            const identity = {
                                key: oppName,
                                name: sanitizeTournamentName(localData.name || cloudData.name || oppName),
                                uid: stableUid
                            };
                            const mergedH2H = mergeH2HRecord(cloudData, localData, identity, { combineCounts: true });

                            if (JSON.stringify(cloudData) !== JSON.stringify(mergedH2H)) {
                                cloudData = mergedH2H;
                                isModified = true;
                            }

                            cloudH2H[oppName] = cloudData;
                        }
                    }

                    cloudH2H = normalizeH2HStatsForUser(cloudH2H, user.firebaseUid, user.playerName);
                    if (isModified || Object.keys(cloudH2H).length > 0) {
                        user.set('h2hStats', cloudH2H);
                        user.markModified('h2hStats');
                    }
                }

                await maybeApplyLegacyLeagueMigration(user, s, data.name, socket.photoUrl || '');
                await user.save();
                await syncCurrentLeagueScoreFromUserProfile(user, data.name, socket.photoUrl || '');

                emitProfileSync(socket, user);
            } else {
                const initialEconomy = buildInitialEconomyState(s);
                const initialGames = Math.max(0, toSafeInt(s.games, 0));
                const initialWins = Math.max(0, Math.min(initialGames, toSafeInt(s.wins, 0)));
                const initialLosses = Math.max(0, Math.min(initialGames, toSafeInt(s.losses, 0)));
                const scoreHistoryHighscore = await getBestSubmittedScoreForUid(verifiedUid);
                const initialHighscore = Math.max(scoreHistoryHighscore, Math.max(0, Math.min(MAX_SCORE, toSafeInt(s.highscore, 0))));
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
                    soundEnabled: coerceBooleanSetting(s.soundEnabled) ?? true,
                    vibrationEnabled: coerceBooleanSetting(s.vibrationEnabled) ?? true,
                    musicEnabled: coerceBooleanSetting(s.musicEnabled) ?? true,
                    musicVolume: normalizeMusicVolume(s.musicVolume, 0.4),
                    language: normalizeLanguageSetting(s.language, 'sr'),
                    penaltyPoints: Math.max(0, toSafeInt(s.penaltyPoints, 0)),
                    h2hStats: normalizeH2HStatsForUser(s.h2hStats || {}, verifiedUid, data.name),
                    unlockedTrophies: initialEconomy.unlockedTrophies,
                    unlockedSkins: initialEconomy.unlockedSkins,
                    unlockedEffects: initialEconomy.unlockedEffects,
                    yamb_unlocked: initialEconomy.yamb_unlocked,
                    lastDaily: normalizeDailyKeyForSync(s.lastDaily),
                    leagueData: getDefaultCurrentLeagueData(),
                    economyMigrationApplied: true,
                    economyMigratedAt: Date.now()
                });
                normalizeActiveSelections(user);
                await maybeApplyLegacyLeagueMigration(user, s, data.name, socket.photoUrl || '');
                await user.save();
                await syncCurrentLeagueScoreFromUserProfile(user, data.name, socket.photoUrl || '');

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
                h2hRecord: buildH2HRecordSummary(user.h2hStats, user.firebaseUid, user.playerName)
            };

            updateOnlineCount();
            flushPendingOnlineRoomResume(socket);
        } catch (err) {
            console.error("Greška pri sinhronizaciji korisnika:", err);
            socket.playerStats = data.stats || { wins: 0, losses: 0 };
            updateOnlineCount();
            flushPendingOnlineRoomResume(socket);
        }
    });

    socket.on('claim_daily_reward', async (data = {}, ack) => {
        const replyDailyReward = (payload) => {
            if (typeof ack === 'function') ack(payload);
            socket.emit('daily_reward_result', payload);
            return payload;
        };

        try {
            const rawReward = toSafeInt(data?.amount, 0);
            const reward = Math.max(0, rawReward);

            if (reward <= 0 || reward > MAX_DAILY_REWARD) {
                return replyDailyReward({ ok: false, reason: 'invalid_reward', permanent: true });
            }

            const uid = getVerifiedUid(socket);
            if (!uid) {
                socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
                return replyDailyReward({ ok: false, reason: 'auth_required' });
            }

            const challenge = getDailyChallengeForUid(uid);
            const todayStr = challenge.dayKey;
            const legacyTodayStr = getLegacyDailyDayKey();
            const expectedReward = data?.doubled ? challenge.reward * 2 : challenge.reward;
            if (reward !== expectedReward || expectedReward <= 0 || expectedReward > MAX_DAILY_REWARD) {
                return replyDailyReward({ ok: false, reason: 'invalid_reward', permanent: true });
            }

            if (!MONGO_URI) {
                return replyDailyReward({ ok: true, reward, localFallback: true });
            }

            const user = await UserProfile.findOne({ firebaseUid: uid });
            if (!user) {
                return replyDailyReward({ ok: false, reason: 'auth_required' });
            }

            if (isDailyKeyToday(user.lastDailyRewardClaimed, todayStr, legacyTodayStr)) {
                if (user.lastDailyRewardClaimed !== todayStr) {
                    user.lastDailyRewardClaimed = todayStr;
                    await user.save();
                }
                emitProfileSync(socket, user);
                return replyDailyReward({
                    ok: false,
                    reason: 'daily_already_claimed',
                    balance: Math.max(0, toSafeInt(user.balance, 0)),
                    permanent: true
                });
            }

            if (data?.doubled || reward > MAX_DAILY_BASE_REWARD) {
                const adVerification = await waitForVerifiedAdMobReward(
                    uid,
                    data?.ssvNonce,
                    ['daily_double', 'generic_reward'],
                    { claimedBy: 'daily_double' }
                );
                if (!adVerification.ok) {
                    return replyDailyReward(adVerification);
                }
            }

            user.lastDaily = todayStr;
            user.lastDailyRewardClaimed = todayStr;
            user.balance = Math.min(MAX_BALANCE, Math.max(0, toSafeInt(user.balance, 0)) + reward);
            await user.save();

            emitProfileSync(socket, user, {
                dailyReward: {
                    reward,
                    balance: user.balance
                }
            });

            return replyDailyReward({
                ok: true,
                reward,
                balance: user.balance
            });
        } catch (err) {
            console.error('❌ claim_daily_reward greška:', err);
            return replyDailyReward({ ok: false, reason: 'server_error', permanent: false });
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

        const onlinePlayersByUid = new Map();
        
        io.sockets.sockets.forEach((clientSocket, id) => {
            const player = buildOnlinePlayerPresence(clientSocket, id, myFriends);
            if (!player) return;

            const playerKey = player.uid || id;
            const existing = onlinePlayersByUid.get(playerKey);
            if (shouldUseOnlinePresence(existing, player)) {
                onlinePlayersByUid.set(playerKey, player);
            }
        });

        socket.emit('online_players_list_data', Array.from(onlinePlayersByUid.values()));
    });

    socket.on('get_online_players', () => {
        const playersMap = new Map(); 
        
        io.sockets.sockets.forEach((clientSocket, id) => {
            const presence = buildOnlinePlayerPresence(clientSocket, id);
            if (!presence) return;
            
            let uniqueKey = presence.uid || activeConnections.get(id) || id;

            const playerData = {
                id,
                socketId: id,
                playerId: presence.uid,
                name: presence.name,
                photoUrl: presence.photoUrl,
                stats: clientSocket.playerStats || { wins: 0, losses: 0 },
                status: presence.status,
                isPlaying: presence.isPlaying,
                isBusy: presence.isBusy,
                canSpectate: presence.canSpectate
            };

            if (playersMap.has(uniqueKey)) {
                const existing = playersMap.get(uniqueKey);
                if (shouldUseOnlinePresence(existing, playerData)) {
                    playersMap.set(uniqueKey, playerData);
                }
            } else {
                playersMap.set(uniqueKey, playerData);
            }
        });

        socket.emit('online_players_list', Array.from(playersMap.values()));
    });

    socket.on('back_to_menu', async () => {
        socket.clientBusyForInvites = false;
        socket.clientBusyReason = '';
        clearPendingRoomInvitesForSocket(socket.id);
        clearPendingTournamentDuelInvitesForSocket(socket.id);
        const activeRoomId = playerRooms[socket.id];

        if (socket.isSpectator && socket.spectatingRoom) {
            const roomId = socket.spectatingRoom;
            socket.leave(roomId);
            socket.isSpectator = false;
            socket.spectatingRoom = null;
            updateRoomSpectators(roomId);
            return;
        }

        if (activeRoomId) {
            const state = roomState[activeRoomId];
            const isActivePlayer = !state || state.players.includes(socket.id);

            if (!isActivePlayer) {
                console.log(`ℹ️ Ignorišem back_to_menu za socket koji nije igrač u sobi ${activeRoomId}: ${socket.id}`);
                socket.leave(activeRoomId);
                delete playerRooms[socket.id];
                updateRoomSpectators(activeRoomId);
                return;
            }

            if (state && state.gameFinished) {
                console.log(`📢 Igrač ${socket.id} napušta završenu sobu ${activeRoomId}`);
                socket.to(activeRoomId).emit('opponent_left', { gameFinished: true });
                cleanupOnlineRoom(activeRoomId);
                updateOnlineCount();
                return;
            }

            console.log(`📢 Igrač ${socket.id} se vratio u meni, napušta sobu ${activeRoomId}`);
            let technicalResult = { winnerReward: 500, loserCoinPenalty: 500 };
            let technicalWinner = null;
            let technicalLoser = null;

            if (state) {
                const quitterParticipant = getRoomParticipantMeta(state, socket.id);
                const pid = quitterParticipant.uid;
                technicalLoser = quitterParticipant;
                if (pid) {
                    const penaltyAmount = getDynamicPenalty(activeRoomId);
                    const oppSocketId = state.players.find(id => id !== socket.id);
                    const winnerParticipant = getRoomParticipantMeta(state, oppSocketId);
                    const winnerUid = winnerParticipant.uid;
                    const h2hKey = getH2HKeyForOpponent(winnerParticipant);
                    technicalWinner = winnerParticipant;

                    technicalResult = await applyServerSideTechnicalResult(winnerUid, pid, penaltyAmount, h2hKey, {
                        winnerOpponent: quitterParticipant,
                        loserOpponent: winnerParticipant
                    });
                    await applyTournamentTechnicalWinner(activeRoomId, winnerUid, 'back_to_menu');
                }
            }

            socket.to(activeRoomId).emit('opponent_left', {
                winnerId: technicalWinner?.socketId || '',
                loserId: technicalLoser?.socketId || socket.id,
                duelType: getOnlineDuelType(activeRoomId),
                winnerName: technicalWinner?.name || 'Igrac',
                loserName: technicalLoser?.name || 'Igrac',
                reward: technicalResult.winnerReward,
                coinPenalty: technicalResult.loserCoinPenalty,
                serverApplied: technicalResult.serverApplied
            });

            cleanupOnlineRoom(activeRoomId);
            socket.leave(activeRoomId);
        }

        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        
        updateOnlineCount();
    });

    socket.on('request_spectate', (target, ack) => {
        const replySpectate = (payload) => {
            if (typeof ack === 'function') ack(payload);
            return payload;
        };
        const targetSocketId = typeof target === 'string' ? target : target?.socketId;
        const requestedRoomId = typeof target === 'object' && target ? String(target.roomId || '') : '';
        const requestedTargetUid = typeof target === 'object' && target
            ? String(target.uid || target.playerId || '')
            : '';
        const targetUid = getSocketUid(targetSocketId) || requestedTargetUid;
        const requestedLocalRoom = requestedRoomId && isSpectatableLocalRoom(requestedRoomId, targetSocketId, targetUid);
        const roomId = (
            requestedLocalRoom ||
            (requestedRoomId &&
            isActiveOnlineRoom(requestedRoomId) &&
            (
                (!targetSocketId && !targetUid) ||
                isPlayerInLiveOnlineRoom(requestedRoomId, targetSocketId, targetUid)
            ))
        )
            ? requestedRoomId
            : (getLiveOnlineRoomForSocket(targetSocketId, targetUid) || getLiveLocalRoomForSocket(targetSocketId, targetUid));
        const state = roomId ? roomState[roomId] : null;

        if (!roomId || (!isLocalRoomId(roomId) && (!state || state.gameFinished))) {
            socket.emit('error_msg', 'err_spectate_not_in_game');
            return replySpectate({ ok: false, reason: 'err_spectate_not_in_game' });
        }

        if (isLocalRoomId(roomId)) {
            if (socket.spectatingRoom && socket.spectatingRoom !== roomId) {
                clearSpectatingRoom(socket);
            }

            socket.join(roomId);
            socket.isSpectator = true;
            socket.spectatingRoom = roomId;

            socket.emit('spectate_started', { roomId: roomId });
            socket.to(roomId).emit('request_state_sync', { senderSocketId: socket.id });
            console.log(`👁️ Igrač ${socket.id} počeo da gleda lokalnu sobu ${roomId} (Client Sync)`);
            updateRoomSpectators(roomId);
            return replySpectate({ ok: true, roomId, spectating: true, local: true });
        }

        const requesterUid = getSocketUid(socket.id);
        if (getParticipantIndexForSocketOrUid(state, socket.id, requesterUid) !== -1) {
            socket.emit('error_msg', 'err_spectate_participant');
            return replySpectate({ ok: false, reason: 'err_spectate_participant' });
        }

        if (socket.spectatingRoom && socket.spectatingRoom !== roomId) {
            clearSpectatingRoom(socket);
        }

        socket.join(roomId);
        socket.isSpectator = true;
        socket.spectatingRoom = roomId;

        socket.emit('spectate_started', { roomId: roomId });
        emitAuthoritativeRoomState(socket, roomId, -1);
        console.log(`👁️ Igrač ${socket.id} počeo da gleda sobu ${roomId} (Server Sync)`);
        updateRoomSpectators(roomId);
        return replySpectate({ ok: true, roomId, spectating: true });
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

    socket.on('start_local_game', (payload) => {
        const roomId = typeof payload === 'string' ? payload : payload?.roomId;
        const carriedDurationMs = typeof payload === 'object' ? payload?.carriedDurationMs : 0;
        if (!roomId) return;
        const previousRoomId = playerRooms[socket.id];
        if (previousRoomId && previousRoomId !== roomId && isLocalRoomId(previousRoomId)) {
            socket.leave(previousRoomId);
        }
        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        startScoreSession(socket.id, carriedDurationMs);
        console.log(`🏠 Igrač ${socket.id} započeo lokalnu partiju u sobi: ${roomId}`);
    });

    socket.on('set_player_busy', (data = {}) => {
        socket.clientBusyForInvites = !!data.busy;
        socket.clientBusyReason = socket.clientBusyForInvites
            ? String(data.reason || 'client_busy').slice(0, 40)
            : '';
        notifyOnlinePlayersStatusChanged();
    });

    socket.on('game_session_start', (data = {}) => {
        const roomId = typeof data === 'string' ? data : data?.roomId;
        if (roomId) refreshOnlineRoomMembership(socket, roomId);
        startScoreSession(socket.id);
        console.log(`⏱️ Igrač ${socket.id} započeo partiju u ${new Date().toLocaleTimeString()}`);
    });

    socket.on('check_quarter_reward', async (data, ack) => {
        const replyQuarterReward = (payload) => {
            socket.emit('quarter_reward_check_result', payload);
            if (typeof ack === 'function') ack(payload);
        };

        try {
            if (!MONGO_URI) return replyQuarterReward({ ok: false, reason: 'db_unavailable', permanent: false });
            const { year, quarter } = data || {};
            const playerId = socket.verifiedUid;

            if (!year || !quarter) {
                return replyQuarterReward({ ok: false, reason: 'invalid_request', permanent: true });
            }
            if (!playerId) {
                return replyQuarterReward({ ok: false, reason: 'auth_required', permanent: false });
            }

            const rewardKey = getLeaguePeriodKey(year, quarter);

            const user = await UserProfile.findOne({ firebaseUid: playerId });
            if (!user) return replyQuarterReward({ ok: false, reason: 'auth_required', permanent: true });

            if (user.claimedLeagueRewards && user.claimedLeagueRewards.includes(rewardKey)) {
                return replyQuarterReward({ ok: true, status: 'already_claimed', periodKey: rewardKey });
            }

            const archivedQuarter = isPastLeaguePeriod(Number(year), Number(quarter))
                ? await archiveLeagueQuarter(Number(year), Number(quarter))
                : null;
            const topScores = archivedQuarter?.topScores || await fetchTopLeagueScoresForPeriod(Number(year), Number(quarter), 3);
            
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
                return replyQuarterReward({ ok: true, status: 'reward_claimed', periodKey: rewardKey, rank, reward: rewardAmount });
            }

            return replyQuarterReward({ ok: true, status: 'not_qualified', periodKey: rewardKey });
        } catch (err) {
            console.error("Greška pri proveri kvartalne nagrade:", err);
            return replyQuarterReward({ ok: false, reason: 'server_error', permanent: false });
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

            const adVerification = await waitForVerifiedAdMobReward(
                uid,
                data?.ssvNonce,
                ['shop_ad_reward', 'generic_reward'],
                { claimedBy: 'shop_ad_reward', minAdTimestamp: lastRewardAt }
            );
            if (!adVerification.ok) {
                reply(adVerification);
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

    socket.on('claim_shop_interstitial_reward', async (data = {}, ack) => {
        const reply = (payload) => {
            socket.emit('shop_interstitial_reward_result', payload);
            if (typeof ack === 'function') ack(payload);
        };

        try {
            if (!MONGO_URI) {
                reply({ ok: true, reward: SHOP_INTERSTITIAL_REWARD_AMOUNT, localFallback: true });
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
            const lastRewardAt = Math.max(0, toSafeInt(user.lastShopInterstitialRewardAt, 0));
            const elapsed = now - lastRewardAt;

            if (lastRewardAt > 0 && elapsed < SHOP_INTERSTITIAL_REWARD_COOLDOWN_MS) {
                reply({
                    ok: false,
                    reason: 'ad_reward_cooldown',
                    retryAfterMs: SHOP_INTERSTITIAL_REWARD_COOLDOWN_MS - elapsed
                });
                return;
            }

            user.lastShopInterstitialRewardAt = now;
            user.balance = Math.min(
                MAX_BALANCE,
                Math.max(0, toSafeInt(user.balance, 0)) + SHOP_INTERSTITIAL_REWARD_AMOUNT
            );
            await user.save();

            emitProfileSync(socket, user);
            reply({ ok: true, reward: SHOP_INTERSTITIAL_REWARD_AMOUNT, balance: user.balance });
        } catch (err) {
            console.error("Greška pri shop interstitial nagradi:", err);
            reply({ ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('claim_undo_token_reward', async (data = {}, ack) => {
        const reply = (payload) => {
            socket.emit('undo_token_reward_result', payload);
            if (typeof ack === 'function') ack(payload);
        };

        try {
            const rewardType = String(data?.type || 'rewarded') === 'interstitial' ? 'interstitial' : 'rewarded';
            const rewardAmount = rewardType === 'interstitial'
                ? UNDO_INTERSTITIAL_REWARD_AMOUNT
                : UNDO_REWARDED_REWARD_AMOUNT;

            if (!MONGO_URI) {
                reply({ ok: true, reward: rewardAmount, localFallback: true, type: rewardType });
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

            const currentTokens = Math.max(0, Math.min(MAX_UNDO_TOKENS, toSafeInt(user.undoTokens, 0)));
            if (currentTokens >= MAX_UNDO_TOKENS) {
                emitProfileSync(socket, user);
                reply({ ok: false, reason: 'undo_tokens_max', undoTokens: currentTokens, permanent: true });
                return;
            }

            const now = Date.now();
            const lastRewardField = rewardType === 'interstitial'
                ? 'lastUndoInterstitialRewardAt'
                : 'lastUndoRewardedRewardAt';
            const cooldownMs = rewardType === 'interstitial'
                ? UNDO_INTERSTITIAL_REWARD_COOLDOWN_MS
                : UNDO_REWARDED_REWARD_COOLDOWN_MS;
            const lastRewardAt = Math.max(0, toSafeInt(user[lastRewardField], 0));
            const elapsed = now - lastRewardAt;

            if (lastRewardAt > 0 && elapsed < cooldownMs) {
                reply({
                    ok: false,
                    reason: 'ad_reward_cooldown',
                    retryAfterMs: cooldownMs - elapsed
                });
                return;
            }

            if (rewardType === 'rewarded') {
                const adVerification = await waitForVerifiedAdMobReward(
                    uid,
                    data?.ssvNonce,
                    ['undo_tokens', 'generic_reward'],
                    { claimedBy: 'undo_tokens', minAdTimestamp: lastRewardAt }
                );
                if (!adVerification.ok) {
                    reply(adVerification);
                    return;
                }
            }

            const grantedTokens = Math.min(rewardAmount, MAX_UNDO_TOKENS - currentTokens);
            user[lastRewardField] = now;
            user.undoTokens = currentTokens + grantedTokens;
            await user.save();

            emitProfileSync(socket, user);
            reply({
                ok: true,
                reward: grantedTokens,
                undoTokens: user.undoTokens,
                type: rewardType
            });
        } catch (err) {
            console.error("Greška pri undo token ad nagradi:", err);
            reply({ ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('get_previous_quarter_winner', async (data) => {
        try {
            if (!MONGO_URI) return;
            const { year, quarter } = data;
            const archivedQuarter = await archiveLeagueQuarter(Number(year), Number(quarter));
            const fallbackScores = archivedQuarter?.champion
                ? []
                : await fetchTopLeagueScoresForPeriod(Number(year), Number(quarter), 1);
            const topScore = archivedQuarter?.champion || fallbackScores[0];
            
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

            await archiveCompletedLeagueQuarters();
            const archivedQuarters = await LeagueHallOfFame.find()
                .sort({ year: 1, quarter: 1 })
                .lean();

            let champions = [];
            let medalsCount = {};
            let cycleCounter = 1;

            archivedQuarters.forEach(quarterArchive => {
                const qScores = Array.isArray(quarterArchive.topScores) ? quarterArchive.topScores : [];

                qScores.slice(0, 3).forEach((p, index) => {
                    const playerKey = p.playerId || `${p.playerName}_${index}`;
                    if (!medalsCount[playerKey]) {
                        medalsCount[playerKey] = {
                            playerId: p.playerId,
                            playerName: p.playerName,
                            photoUrl: p.photoUrl || '',
                            gold: 0, silver: 0, bronze: 0, total: 0
                        };
                    }
                    if (index === 0) medalsCount[playerKey].gold++;
                    if (index === 1) medalsCount[playerKey].silver++;
                    if (index === 2) medalsCount[playerKey].bronze++;
                    medalsCount[playerKey].total++;
                });

                const champion = quarterArchive.champion || qScores[0];
                if (champion) {
                    champions.push({
                        cycle: cycleCounter++,
                        year: quarterArchive.year,
                        quarter: quarterArchive.quarter,
                        playerName: champion.playerName,
                        photoUrl: champion.photoUrl || '',
                        score: champion.score
                    });
                }
            });
            
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
                { $addFields: getLeaderboardScoreAddFields() },
                { $match: { stableUid: { $ne: null } } },
                { $sort: { numScore: -1, date: 1 } },
                {
                    $group: {
                        _id: "$stableUid",
                        bestEntry: { $first: "$$ROOT" } 
                    }
                },
                { $replaceRoot: { newRoot: "$bestEntry" } }, 
                { $sort: { numScore: -1, date: 1 } },
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

    socket.on('get_waiting_top3', async (period = 'weekly') => {
        try {
            if (!MONGO_URI) return;

            const safePeriod = ['weekly', 'monthly', 'all_time'].includes(period) ? period : 'weekly';
            const matchFilter = {
                $or: [
                    { playerId: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } },
                    { uid: { $type: 'string', $not: /guest/i, $regex: /.{20,}/ } }
                ]
            };
            const periodStart = getLeaderboardPeriodStart(safePeriod);
            if (periodStart) matchFilter.date = { $gte: periodStart };

            const topScores = await Score.aggregate([
                { $match: matchFilter },
                { $addFields: getLeaderboardScoreAddFields() },
                { $match: { stableUid: { $ne: null } } },
                { $sort: { numScore: -1, date: 1 } },
                {
                    $group: {
                        _id: "$stableUid",
                        bestEntry: { $first: "$$ROOT" }
                    }
                },
                { $replaceRoot: { newRoot: "$bestEntry" } },
                { $sort: { numScore: -1, date: 1 } },
                { $limit: 3 }
            ]);

            const formattedTop3 = topScores.map(s => ({
                name: s.playerName,
                score: s.score,
                photoUrl: s.photoUrl || ''
            }));

            socket.emit('waiting_top3_data', { period: safePeriod, data: formattedTop3 });
        } catch (err) {
            console.error("Greška pri dohvatanju Waiting Top 3:", err);
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
                { $addFields: getLeaderboardScoreAddFields() },
                { $match: { stableUid: { $ne: null } } },
                { $sort: { numScore: -1, date: 1 } }, 
                {
                    $group: {
                        _id: "$stableUid", 
                        bestEntry: { $first: "$$ROOT" } 
                    }
                },
                { $replaceRoot: { newRoot: "$bestEntry" } },
                { $sort: { numScore: -1, date: 1 } }, 
                { $limit: 100 }
            ]);
            
            const formattedScores = scores.map(s => ({
                ...s,
                uid: s.stableUid || s.playerId || s.uid 
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

            const duration = getScoreSessionDuration(socket.id);

            if (duration === null) {
                console.log(`🚨 HACK POKUSAJ (No Session): ${socket.id} pokusava upis skora ${submittedScore} bez aktivne server sesije.`);
                return replyScoreSubmit(false, 'missing_game_session');
            }

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

            const leaderboardRecordSnapshots = await captureLeaderboardRecordSnapshots();

            const newScore = new Score({
                playerId: finalUid,
                uid: finalUid,
                playerName: finalName,
                score: submittedScore,
                mode: finalMode,
                photoUrl: finalPhoto,
                date: Date.now()
            });

            await newScore.save();
            console.log(`✅ USPESAN UPIS: ${finalName} (UID: ${finalUid}) -> ${submittedScore} (${newScore.mode})`);
            queueRecordPush(
                notifyBrokenLeaderboardRecords(leaderboardRecordSnapshots, {
                    uid: finalUid,
                    playerName: finalName,
                    score: submittedScore
                }),
                'leaderboard_record'
            );

            const profileForRecord = await UserProfile.findOne({ firebaseUid: finalUid });
            if (profileForRecord) {
                profileForRecord.playerName = finalName;
                if (finalPhoto) profileForRecord.photoUrl = finalPhoto;
                if (submittedScore > Math.max(0, toSafeInt(profileForRecord.highscore, 0))) {
                    profileForRecord.highscore = submittedScore;
                    await profileForRecord.save();
                    emitProfileSync(socket, profileForRecord);
                } else if (profileForRecord.isModified()) {
                    await profileForRecord.save();
                }
            }

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

            clearScoreSession(socket.id);
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

            if (multiplier === 2) {
                const adVerification = await waitForVerifiedAdMobReward(
                    finalUid,
                    data?.ssvNonce,
                    ['game_double', 'generic_reward'],
                    { claimedBy: 'game_double', minAdTimestamp: rewardSession.createdAt - 5000 }
                );
                if (!adVerification.ok) {
                    return replyGameReward(adVerification);
                }
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
            
            const requestedYear = Number(reqData?.year);
            const requestedQuarter = Number(reqData?.quarter);
            const currentPeriod = getServerQuarterInfo();
            const year = Number.isInteger(requestedYear) ? requestedYear : currentPeriod.year;
            const quarter = Number.isInteger(requestedQuarter) && requestedQuarter >= 1 && requestedQuarter <= 4
                ? requestedQuarter
                : currentPeriod.quarter;
            
            const scores = await fetchLeagueHighscoresForRankBands(year, quarter);

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
                    $match: {
                        playerId: { $type: 'string' },
                        year: { $type: 'number' },
                        quarter: { $type: 'number' },
                        score: { $type: 'number' }
                    }
                },
                { $sort: { score: -1, date: -1 } },
                {
                    $group: {
                        _id: { playerId: "$playerId", year: "$year", quarter: "$quarter" },
                        playerName: { $first: "$playerName" },
                        photoUrl: { $first: "$photoUrl" },
                        score: { $max: "$score" }
                    }
                },
                {
                    $group: {
                        _id: "$_id.playerId",
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
                LeagueScore.findOne({ playerId: uniqueId, year: submittedYear, quarter: submittedQuarter }).sort({ score: -1 }),
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
                const duration = getScoreSessionDuration(socket.id);
                if (duration === null || duration < MIN_LEAGUE_SESSION_DURATION || duration > MAX_GAME_DURATION) {
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
    const buildStreakLeaderboardPayload = async (options = {}) => {
        const offset = Math.max(0, toSafeInt(options.offset, 0));
        const limit = Math.max(10, Math.min(100, toSafeInt(options.limit, 50)));
        const requesterUid = String(options.requesterUid || '').trim();

        // Prvo dohvatamo sve koji imaju bilo kakav niz
        const users = await UserProfile.find({
            $or: [
                { maxWinStreak: { $gt: 0 } },
                { currentWinStreak: { $gt: 0 } }
            ]
        }).select('firebaseUid playerName photoUrl maxWinStreak currentWinStreak').lean();

        const rankedPlayers = users.map(p => {
            const currentWinStreak = Math.max(0, toSafeInt(p.currentWinStreak, 0));
            const maxWinStreak = Math.max(
                Math.max(0, toSafeInt(p.maxWinStreak, 0)),
                currentWinStreak
            );

            return {
                uid: p.firebaseUid,
                name: p.playerName,
                photoUrl: sanitizeTournamentPhotoUrl(p.photoUrl || ''),
                maxWinStreak,
                currentWinStreak
            };
        });

        // Sortiramo ih po najvećem ikada ostvarenom nizu, pa po trenutnom nizu kao tie-breaker.
        rankedPlayers.sort((a, b) => {
            if (b.maxWinStreak !== a.maxWinStreak) return b.maxWinStreak - a.maxWinStreak;
            if (b.currentWinStreak !== a.currentWinStreak) return b.currentWinStreak - a.currentWinStreak;
            return String(a.name || '').localeCompare(String(b.name || ''), 'sr');
        });

        const rankedWithPositions = rankedPlayers.map((player, idx) => ({
            ...player,
            rank: idx + 1,
            isMe: !!requesterUid && player.uid === requesterUid
        }));
        const pagePlayers = rankedWithPositions.slice(offset, offset + limit);
        const myPlayer = requesterUid
            ? rankedWithPositions.find(player => player.uid === requesterUid) || null
            : null;

        return {
            ok: true,
            players: pagePlayers,
            offset,
            limit,
            total: rankedWithPositions.length,
            hasMore: offset + limit < rankedWithPositions.length,
            myRank: myPlayer ? myPlayer.rank : null,
            myPlayer
        };
    };

    socket.on('get_streak_leaderboard', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('streak_leaderboard_data', []);
                return;
            }

            const requesterUid = getSocketUid(socket.id) || socket.verifiedUid || socket.playerId || '';
            const payload = await buildStreakLeaderboardPayload({ offset: 0, limit: 50, requesterUid });
            socket.emit('streak_leaderboard_data', payload.players);
        } catch (err) {
            console.error("Greška pri dohvatanju streak liste:", err);
            socket.emit('streak_leaderboard_data', []);
        }
    });

    socket.on('get_streak_leaderboard_page', async (options = {}) => {
        try {
            if (!MONGO_URI) {
                socket.emit('streak_leaderboard_page_data', {
                    ok: false,
                    players: [],
                    offset: 0,
                    limit: 50,
                    total: 0,
                    hasMore: false,
                    myRank: null,
                    myPlayer: null
                });
                return;
            }

            const requesterUid = getSocketUid(socket.id) ||
                socket.verifiedUid ||
                socket.playerId ||
                String(options.uid || '').trim();
            const payload = await buildStreakLeaderboardPayload({
                offset: options.offset,
                limit: options.limit,
                requesterUid
            });

            socket.emit('streak_leaderboard_page_data', payload);
        } catch (err) {
            console.error("Greška pri dohvatanju paginirane streak liste:", err);
            socket.emit('streak_leaderboard_page_data', {
                ok: false,
                players: [],
                offset: 0,
                limit: 50,
                total: 0,
                hasMore: false,
                myRank: null,
                myPlayer: null
            });
        }
    });
    // ==================================================================

    const buildPowerIndexLeaderboardPayload = async (options = {}) => {
        const offset = Math.max(0, toSafeInt(options.offset, 0));
        const limit = Math.max(10, Math.min(100, toSafeInt(options.limit, 50)));
        const requesterUid = String(options.requesterUid || '').trim();

        const users = await UserProfile.find({ games: { $gt: 0 } }).lean();
        const rankedPlayers = users.map(user => {
            const power = Number(sanitizeTournamentPi(powerIndexCore.calculatePowerIndex(user))) || 0;

            return {
                uid: user.firebaseUid,
                playerName: user.playerName,
                photoUrl: sanitizeTournamentPhotoUrl(user.photoUrl || ''),
                powerIndex: power
            };
        });

        rankedPlayers.sort((a, b) => {
            if (b.powerIndex !== a.powerIndex) return b.powerIndex - a.powerIndex;
            return String(a.playerName || '').localeCompare(String(b.playerName || ''), 'sr');
        });

        const rankedWithPositions = rankedPlayers.map((player, idx) => ({
            ...player,
            rank: idx + 1,
            isMe: !!requesterUid && player.uid === requesterUid
        }));
        const pagePlayers = rankedWithPositions.slice(offset, offset + limit);
        const myPlayer = requesterUid
            ? rankedWithPositions.find(player => player.uid === requesterUid) || null
            : null;

        return {
            ok: true,
            players: pagePlayers,
            offset,
            limit,
            total: rankedWithPositions.length,
            hasMore: offset + limit < rankedWithPositions.length,
            myRank: myPlayer ? myPlayer.rank : null,
            myPlayer
        };
    };

    socket.on('get_power_index_leaderboard', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('power_index_data', []);
                return;
            }

            const requesterUid = getSocketUid(socket.id) || socket.verifiedUid || socket.playerId || '';
            const payload = await buildPowerIndexLeaderboardPayload({ offset: 0, limit: 50, requesterUid });
            const top50 = payload.players;

            socket.emit('power_index_data', top50);
        } catch (err) {
            console.error("Greška pri dohvatanju Power Index liste:", err);
            socket.emit('power_index_data', []);
        }
    });

    socket.on('get_power_index_leaderboard_page', async (options = {}) => {
        try {
            if (!MONGO_URI) {
                socket.emit('power_index_page_data', {
                    ok: false,
                    players: [],
                    offset: 0,
                    limit: 50,
                    total: 0,
                    hasMore: false,
                    myRank: null,
                    myPlayer: null
                });
                return;
            }

            const requesterUid = getSocketUid(socket.id) ||
                socket.verifiedUid ||
                socket.playerId ||
                String(options.uid || '').trim();
            const payload = await buildPowerIndexLeaderboardPayload({
                offset: options.offset,
                limit: options.limit,
                requesterUid
            });

            socket.emit('power_index_page_data', payload);
        } catch (err) {
            console.error("Greška pri dohvatanju paginirane Power Index liste:", err);
            socket.emit('power_index_page_data', {
                ok: false,
                players: [],
                offset: 0,
                limit: 50,
                total: 0,
                hasMore: false,
                myRank: null,
                myPlayer: null
            });
        }
    });

    const getConnectedFriendSocketId = (uid) => {
        const socketId = uid ? onlinePlayers[uid] : null;
        if (!socketId) return null;

        const liveSocket = io.sockets.sockets.get(socketId);
        if (liveSocket && liveSocket.connected) return socketId;

        delete onlinePlayers[uid];
        return null;
    };

    const buildFriendsListPayload = async (profile) => {
        let friendsData = [];
        let requestsData = [];
        const notificationsData = Array.isArray(profile.friendNotifications)
            ? profile.friendNotifications.map(n => ({
                type: n.type || '',
                fromUid: n.fromUid || '',
                fromName: n.fromName || 'Igrač',
                photoUrl: n.photoUrl || '',
                createdAt: n.createdAt || Date.now()
            }))
            : [];

        if (profile.friends && profile.friends.length > 0) {
            const friends = await UserProfile.find({ firebaseUid: { $in: profile.friends } });
            friendsData = friends.map(f => {
                const friendSocketId = getConnectedFriendSocketId(f.firebaseUid);
                const isOnline = !!friendSocketId;

                const h2hRecord = buildH2HRecordSummary(f.h2hStats, f.firebaseUid, f.playerName);
                const pi = sanitizeTournamentPi(powerIndexCore.calculatePowerIndex(f));

                return {
                    uid: f.firebaseUid,
                    socketId: friendSocketId,
                    name: f.playerName,
                    photoUrl: f.photoUrl,
                    isOnline: isOnline,
                    pi,
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

        if (profile.friendRequests && profile.friendRequests.length > 0) {
            const requests = await UserProfile.find({ firebaseUid: { $in: profile.friendRequests } });
            requestsData = requests.map(r => ({
                uid: r.firebaseUid,
                name: r.playerName,
                photoUrl: r.photoUrl
            }));
        }

        return { ok: true, friends: friendsData, requests: requestsData, notifications: notificationsData };
    };

    socket.on('search_player', async (query, ack) => {
        const replySearch = (payload) => {
            if (typeof ack === 'function') ack(payload);
            else socket.emit('search_results', payload.ok === false ? payload : (Array.isArray(payload.results) ? payload.results : []));
        };

        if (!MONGO_URI) {
            replySearch({ ok: false, reason: 'err_friends_unavailable', results: [] });
            return;
        }

        try {
            const safeQuery = String(query || '').trim();
            if (!safeQuery) {
                replySearch({ ok: true, results: [] });
                return;
            }

            const escapedQuery = safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('^' + escapedQuery + '$', 'i');
            const users = await UserProfile.find({ playerName: regex }).limit(5);

            const results = users.map(u => {
                const friendSocketId = getConnectedFriendSocketId(u.firebaseUid);

                return {
                    uid: u.firebaseUid,
                    name: u.playerName,
                    photoUrl: u.photoUrl,
                    socketId: friendSocketId,
                    isOnline: !!friendSocketId
                };
            });
            replySearch({ ok: true, results });
        } catch(err) {
            console.error(err);
            replySearch({ ok: false, reason: 'err_server_conn', results: [] });
        }
    });

    socket.on('send_friend_req', async (data = {}, ack) => {
        const { targetId, targetUid } = data || {};
        const replyRequest = (payload) => {
            if (typeof ack === 'function') ack(payload);
            else if (!payload.ok) socket.emit('error_msg', payload.reason || 'err_server_conn');
        };

        if (!MONGO_URI) {
            replyRequest({ ok: false, reason: 'err_friends_unavailable' });
            return;
        }

        try {
            const targetSocket = targetId ? io.sockets.sockets.get(targetId) : null;
            const requesterUid = getSocketUid(socket.id) || socket.playerId;
            const resolvedTargetUid = targetUid || (targetSocket && getSocketUid(targetSocket.id)) || (targetSocket && targetSocket.playerId);

            if (!requesterUid) {
                replyRequest({ ok: false, reason: 'err_friend_auth_required' });
                return;
            }
            if (!resolvedTargetUid) {
                replyRequest({ ok: false, reason: 'err_friend_target_missing' });
                return;
            }
            if (resolvedTargetUid === requesterUid) {
                replyRequest({ ok: false, reason: 'err_friend_self' });
                return;
            }

            const [me, targetProfile] = await Promise.all([
                UserProfile.findOne({ firebaseUid: requesterUid }),
                UserProfile.findOne({ firebaseUid: resolvedTargetUid })
            ]);

            if (!me) {
                replyRequest({ ok: false, reason: 'err_friend_profile_missing' });
                return;
            }
            if (!targetProfile) {
                replyRequest({ ok: false, reason: 'err_friend_target_missing' });
                return;
            }

            const targetFriends = Array.isArray(targetProfile.friends) ? targetProfile.friends : [];
            const targetRequests = Array.isArray(targetProfile.friendRequests) ? targetProfile.friendRequests : [];
            const myRequests = Array.isArray(me.friendRequests) ? me.friendRequests : [];

            if (targetFriends.includes(me.firebaseUid)) {
                replyRequest({ ok: false, reason: 'err_friend_already_added' });
                return;
            }
            if (myRequests.includes(targetProfile.firebaseUid)) {
                replyRequest({ ok: false, reason: 'err_friend_request_waiting_on_you' });
                return;
            }
            if (targetRequests.includes(me.firebaseUid)) {
                replyRequest({ ok: true, status: 'already_pending' });
                return;
            }

            targetProfile.friendRequests = targetRequests;
            targetProfile.friendRequests.push(me.firebaseUid);
            await targetProfile.save();

            const targetSocketId = getConnectedFriendSocketId(resolvedTargetUid);
            if (targetSocketId) {
                io.to(targetSocketId).emit('incoming_friend_req', {
                    challengerUid: me.firebaseUid,
                    challengerName: me.playerName,
                    photoUrl: me.photoUrl || ''
                });
            }

            replyRequest({ ok: true, status: 'sent', targetOnline: !!targetSocketId });
        } catch(e) {
            console.error(e);
            replyRequest({ ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('resolve_friend_req', async (data = {}, ack) => {
        const { challengerUid, accepted } = data || {};
        const shouldAccept = accepted === true;
        const replyResolve = (payload) => {
            if (typeof ack === 'function') ack(payload);
            else if (!payload.ok) socket.emit('error_msg', payload.reason || 'err_server_conn');
        };

        if (!MONGO_URI) {
            replyResolve({ ok: false, reason: 'err_friends_unavailable' });
            return;
        }

        try {
            const responderUid = getSocketUid(socket.id) || socket.playerId;
            if (!responderUid) {
                replyResolve({ ok: false, reason: 'err_friend_auth_required' });
                return;
            }
            if (!challengerUid) {
                replyResolve({ ok: false, reason: 'err_friend_request_missing' });
                return;
            }

            const me = await UserProfile.findOne({ firebaseUid: responderUid });
            const friend = await UserProfile.findOne({ firebaseUid: challengerUid });

            if (!me || !friend) {
                replyResolve({ ok: false, reason: 'err_friend_request_missing' });
                return;
            }

            const meRequests = Array.isArray(me.friendRequests) ? me.friendRequests : [];
            const hadRequest = meRequests.includes(challengerUid);
            const alreadyFriends = Array.isArray(me.friends) && me.friends.includes(friend.firebaseUid);

            if (!hadRequest && !alreadyFriends) {
                replyResolve({ ok: false, reason: 'err_friend_request_missing' });
                return;
            }

            me.friendRequests = meRequests.filter(uid => uid !== challengerUid);

            if (shouldAccept) {
                if (!Array.isArray(me.friends)) me.friends = [];
                if (!Array.isArray(friend.friends)) friend.friends = [];
                if (!me.friends.includes(friend.firebaseUid)) me.friends.push(friend.firebaseUid);
                if (!friend.friends.includes(me.firebaseUid)) friend.friends.push(me.firebaseUid);
            }

            const challengerSocketId = getConnectedFriendSocketId(challengerUid);
            const notificationPayload = {
                name: me.playerName,
                uid: me.firebaseUid,
                photoUrl: me.photoUrl || ''
            };

            if (challengerSocketId) {
                io.to(challengerSocketId).emit(shouldAccept ? 'friend_req_accepted' : 'friend_req_declined', notificationPayload);
            } else {
                if (!Array.isArray(friend.friendNotifications)) friend.friendNotifications = [];
                friend.friendNotifications.push({
                    type: shouldAccept ? 'accepted' : 'declined',
                    fromUid: me.firebaseUid,
                    fromName: me.playerName,
                    photoUrl: me.photoUrl || '',
                    createdAt: Date.now()
                });
            }

            await me.save();
            await friend.save();

            replyResolve({
                ok: true,
                accepted: shouldAccept,
                challengerOnline: !!challengerSocketId,
                friend: {
                    uid: friend.firebaseUid,
                    name: friend.playerName,
                    photoUrl: friend.photoUrl || ''
                }
            });
        } catch(err) {
            console.error(err);
            replyResolve({ ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('get_friends_list', async (ack) => {
        const replyList = (payload) => {
            if (typeof ack === 'function') ack(payload);
            socket.emit('friends_list_data', payload);
        };

        if (!MONGO_URI) {
            replyList({ ok: false, reason: 'err_friends_unavailable', friends: [], requests: [], notifications: [] });
            return;
        }

        try {
            const requesterUid = getSocketUid(socket.id) || socket.playerId;
            if (!requesterUid) {
                replyList({ ok: false, reason: 'err_friend_auth_required', friends: [], requests: [], notifications: [] });
                return;
            }

            const me = await UserProfile.findOne({ firebaseUid: requesterUid });
            if (me) {
                const payload = await buildFriendsListPayload(me);
                if (payload.notifications.length > 0) {
                    me.friendNotifications = [];
                    await me.save();
                }
                replyList(payload);
            } else {
                replyList({ ok: false, reason: 'err_friend_profile_missing', friends: [], requests: [], notifications: [] });
            }
        } catch(err) {
            console.error(err);
            replyList({ ok: false, reason: 'err_server_conn', friends: [], requests: [], notifications: [] });
        }
    });

    socket.on('send_room_invite', (data, ack) => {
        const { targetSocketId, targetUid, roomId } = data || {};
        let resolvedTargetId = targetSocketId;
        let targetSocket = resolvedTargetId ? io.sockets.sockets.get(resolvedTargetId) : null;
        const requestedTargetUid = typeof targetUid === 'string' ? targetUid : '';
        const replyInvite = (payload) => {
            if (typeof ack === 'function') ack(payload);
            else if (!payload.ok) socket.emit('error_msg', payload.reason || 'err_server_conn');
        };

        if (!roomId) {
            replyInvite({ ok: false, reason: 'err_invalid_room' });
            return;
        }

        if (requestedTargetUid && onlinePlayers[requestedTargetUid] && onlinePlayers[requestedTargetUid] !== socket.id) {
            const currentTargetSocket = io.sockets.sockets.get(onlinePlayers[requestedTargetUid]);
            if (currentTargetSocket) {
                resolvedTargetId = currentTargetSocket.id;
                targetSocket = currentTargetSocket;
            }
        }

        if (targetSocket) {
            const resolvedTargetUid = getSocketUid(resolvedTargetId) || requestedTargetUid || '';
            if (isPlayerBusyForInvite(resolvedTargetId, resolvedTargetUid, { ignoreWaitingPrivateRoom: true })) {
                emitPlayerBusy(socket, ack);
                return;
            }

            const existingInvite = findPendingRoomInviteForResponse(socket.id, resolvedTargetId, roomId);
            if (existingInvite && existingInvite.invite && Date.now() <= existingInvite.invite.expiresAt) {
                replyInvite({ ok: false, reason: 'room_invite_pending' });
                return;
            }
            if (existingInvite) clearPendingRoomInvite(existingInvite.key);

            const inviteKey = getRoomInviteKey(socket.id, resolvedTargetId, roomId);
            const createdAt = Date.now();
            const expiresAt = createdAt + ROOM_INVITE_RESPONSE_WINDOW_MS;
            pendingRoomInvites[inviteKey] = {
                hostId: socket.id,
                targetId: resolvedTargetId,
                hostUid: getSocketUid(socket.id),
                targetUid: resolvedTargetUid,
                roomId,
                hostName: sanitizeTournamentName(socket.playerName || 'Igrač'),
                targetName: sanitizeTournamentName(targetSocket.playerName || 'Igrač'),
                createdAt,
                expiresAt,
                timeoutId: setTimeout(() => {
                    expirePendingRoomInvite(inviteKey);
                }, ROOM_INVITE_RESPONSE_WINDOW_MS)
            };

            const hostName = `${sanitizeTournamentName(socket.playerName || 'Igrač')}|||${socket.id}`;
            socket.to(resolvedTargetId).emit('incoming_room_invite', {
                roomId,
                hostName,
                hostSocketId: socket.id,
                inviteId: inviteKey,
                expiresAt
            });
            replyInvite({ ok: true });
        } else {
            replyInvite({ ok: false, reason: 'err_player_not_on_server' });
        }
    });

    socket.on('room_invite_response', (data = {}) => {
        const hostSocketId = data.hostSocketId || data.hostId || '';
        const roomId = data.roomId || '';
        const inviteId = data.inviteId || '';
        const accepted = data.accepted === true;
        const isBusy = data.busy === true;
        const pending = findPendingRoomInviteForResponse(hostSocketId, socket.id, roomId, inviteId);
        const invite = pending ? clearPendingRoomInvite(pending.key) : null;
        if (!invite) return;

        const hostSocket = io.sockets.sockets.get(invite.hostId);
        const targetName = invite?.targetName || sanitizeTournamentName(socket.playerName || 'Igrač');

        if (!hostSocket) return;

        if (isBusy) {
            hostSocket.emit('room_invite_busy', { roomId, targetName });
            return;
        }

        hostSocket.emit(accepted ? 'room_invite_accepted' : 'room_invite_declined', {
            roomId,
            targetName
        });
    });

    socket.on('find_game', (data) => {
        let nickname = typeof data === 'string' ? data : data.nickname;
        let photoUrl = typeof data === 'string' ? '' : data.photoUrl;
        const requesterUid = getSocketUid(socket.id);

        if (waitingPlayer && waitingPlayer.id === socket.id) return;

        if (isPlayerBusyForInvite(socket.id, requesterUid)) {
            socket.emit('error_msg', 'err_player_busy');
            return;
        }

        if (waitingPlayer) {
            const opponentId = waitingPlayer.id;
            const opponentName = waitingPlayer.nickname;
            const opponentStats = waitingPlayer.stats;
            const opponentPhoto = waitingPlayer.photoUrl;
            
            const opponentSocket = io.sockets.sockets.get(opponentId);

            if (opponentSocket) {
                const opponentUid = getSocketUid(opponentId);
                if (isPlayerBusyForInvite(opponentId, opponentUid, { ignoreWaitingSocketId: opponentId, ignoreWaitingUid: opponentUid })) {
                    waitingPlayer = { id: socket.id, uid: requesterUid, nickname: nickname, stats: socket.playerStats, photoUrl: photoUrl };
                    socket.emit('waiting_for_opponent');
                    return;
                }

                const roomId = `room_${opponentId}_${socket.id}`;
                waitingPlayer = null;

                socket.join(roomId);
                opponentSocket.join(roomId);

                playerRooms[socket.id] = roomId;
                playerRooms[opponentId] = roomId;
                
                startScoreSession(socket.id);
                startScoreSession(opponentId);

                console.log(`⚔️ RANDOM MATCH: ${nickname} vs ${opponentName} (Room: ${roomId})`);

                roomState[roomId] = {
                    players: [opponentId, socket.id],
                    playerUids: [
                        opponentSocket.playerId || registeredSockets[opponentId] || '',
                        socket.playerId || registeredSockets[socket.id] || ''
                    ],
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
                notifyOnlinePlayersStatusChanged();

                io.to(opponentId).emit('game_start', {
                    roomId: roomId, opponent: nickname, oppStats: socket.playerStats, oppPhoto: photoUrl, oppUid: socket.playerId || registeredSockets[socket.id] || '', myIndex: 0, duelType: getOnlineDuelType(roomId)
                });
                socket.emit('game_start', {
                    roomId: roomId, opponent: opponentName, oppStats: opponentStats, oppPhoto: opponentPhoto, oppUid: opponentSocket.playerId || registeredSockets[opponentId] || '', myIndex: 1, duelType: getOnlineDuelType(roomId)
                });

            } else {
                waitingPlayer = { id: socket.id, uid: requesterUid, nickname: nickname, stats: socket.playerStats, photoUrl: photoUrl };
                socket.emit('waiting_for_opponent');
            }
        } else {
            waitingPlayer = { id: socket.id, uid: requesterUid, nickname: nickname, stats: socket.playerStats, photoUrl: photoUrl };
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

        const requesterUid = getSocketUid(socket.id);
        const busyState = getPlayerBusyState(socket.id, requesterUid);
        if (busyState && busyState.roomId !== roomId) {
            if (busyState.reason === 'private_room' && isWaitingPrivateRoomParticipant(busyState.roomId, socket.id, requesterUid)) {
                cleanupOnlineRoom(busyState.roomId);
            } else {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }
        }

        if (!privateRooms[roomId]) {
            privateRooms[roomId] = { p1: { id: socket.id, uid: socket.playerId || registeredSockets[socket.id] || '', name: nickname, stats: socket.playerStats, photoUrl: photoUrl } };
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
                privateRooms[roomId] = { p1: { id: socket.id, uid: socket.playerId || registeredSockets[socket.id] || '', name: nickname, stats: socket.playerStats, photoUrl: photoUrl } };
                socket.join(roomId); playerRooms[socket.id] = roomId;
                socket.emit('private_waiting', { roomId });
                return;
            }

            if (p1.id === socket.id) return; 

            privateRooms[roomId].p2 = { id: socket.id, uid: socket.playerId || registeredSockets[socket.id] || '', name: nickname };
            socket.join(roomId);
            playerRooms[socket.id] = roomId; playerRooms[p1.id] = roomId;
            startScoreSession(socket.id); startScoreSession(p1.id);

            console.log(`⚔️ PRIVATE MATCH: ${p1.name} vs ${nickname} u sobi ${roomId}`);

            roomState[roomId] = {
                players: [p1.id, socket.id],
                playerUids: [
                    p1.uid || registeredSockets[p1.id] || '',
                    socket.playerId || registeredSockets[socket.id] || ''
                ],
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
            notifyOnlinePlayersStatusChanged();
            clearPendingRoomInvitesForSocket(socket.id);
            clearPendingRoomInvitesForSocket(p1.id);

            io.to(p1.id).emit('game_start', { roomId: roomId, opponent: nickname, oppStats: socket.playerStats, oppPhoto: photoUrl, oppUid: socket.playerId || registeredSockets[socket.id] || '', myIndex: 0, duelType: getOnlineDuelType(roomId) });
            socket.emit('game_start', { roomId: roomId, opponent: p1.name, oppStats: p1.stats, oppPhoto: p1.photoUrl, oppUid: p1.uid || registeredSockets[p1.id] || '', myIndex: 1, duelType: getOnlineDuelType(roomId) });

            delete privateRooms[roomId]; 
        } else {
            socket.emit('room_full');
        }
    });

    const relayEvent = (eventName, data = {}) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            const state = roomState[roomId];
            const isGameplayEvent = ['remote_move', 'remote_roll', 'remote_hold', 'remote_announce'].includes(eventName);
            let relayData = { ...(data || {}), roomId };
            let emitToWholeRoom = false;
            let syncSenderAfterRelay = false;
            let playerIndex = -1;

            if (!state && isGameplayEvent && !isLocalRoomId(roomId)) {
                console.warn(`🚨 BLOKIRAN GAMEPLAY DOGAĐAJ BEZ ROOM STATE: event=${eventName}, socket=${socket.id}, room=${roomId}`);
                socket.emit('error_msg', 'err_invalid_room');
                return;
            }

            if (state && isGameplayEvent) {
                if (state.gameFinished) return;

                playerIndex = state.players.indexOf(socket.id);

                if (hasActiveDisconnectGraceForRoom(roomId)) {
                    console.warn(`🚨 BLOKIRAN GAMEPLAY DOGAĐAJ TOKOM RECONNECT GRACE: event=${eventName}, socket=${socket.id}, room=${roomId}`);
                    emitAuthoritativeRoomState(socket, roomId, playerIndex);
                    return;
                }

                if (playerIndex === -1 || state.turnIndex !== playerIndex) {
                    console.warn(`🚨 BLOKIRAN LAG/POTEZ (${eventName}) - Igrač: ${socket.id}, Na potezu je: ${state.turnIndex}`);
                    
                    // ---> FIX: SERVER POPRAVLJA DESINHRONIZACIJU <---
                    const playerNamesToSync = state.playerNames || state.players.map(id => {
                        const pSocket = io.sockets.sockets.get(id);
                        return pSocket && pSocket.playerName ? pSocket.playerName : "Igrač";
                    });

                    const syncNow = Date.now();
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
                        najavljenoPolje: state.najavljenoPolje || null,
                        turnStartTime: state.turnStartTime || syncNow,
                        turnTimeLimitMs: state.turnClientTimeLimitMs || TURN_TIME_LIMIT,
                        turnTimerPaused: hasActiveDisconnectGraceForRoom(roomId),
                        disconnectGraceRemainingMs: getRoomDisconnectGraceRemainingMs(roomId),
                        serverNow: syncNow
                    });
                    
                    return; 
                }

                if (eventName === 'remote_move') {
                    if (toSafeInt(data?.pIdx, -1) !== playerIndex) {
                        console.warn(`🚨 BLOKIRAN POTEZ ZA TUĐU TABELU: socket=${socket.id}, playerIndex=${playerIndex}, pIdx=${data?.pIdx}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    const moveCol = typeof data?.col === 'string' ? data.col : '';
                    const moveRow = typeof data?.row === 'string' ? data.row : '';
                    const movePoints = Number(data?.points);
                    if (!KOLONE.includes(moveCol) || !REDOVI_IGRA.includes(moveRow) || !Number.isFinite(movePoints) || movePoints < 0 || movePoints > MAX_SCORE) {
                        console.warn(`🚨 BLOKIRAN NEVALIDAN POTEZ: socket=${socket.id}, col=${moveCol}, row=${moveRow}, points=${data?.points}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    if (!state.allScores) state.allScores = createEmptyScores();
                    const playerSheet = state.allScores[playerIndex];
                    const diceValues = normalizeDiceValues(state.kockiceVals);
                    if (!playerSheet || !playerSheet[moveCol] || !diceValues || state.brojBacanja <= 0) {
                        console.warn(`🚨 BLOKIRAN POTEZ BEZ VAŽEĆEG BACANJA: socket=${socket.id}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    if (playerSheet[moveCol][moveRow] !== null) {
                        console.warn(`🚨 BLOKIRAN POTEZ U POPUNJENO POLJE: socket=${socket.id}, col=${moveCol}, row=${moveRow}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    if (state.najavaAktivna) {
                        console.warn(`🚨 BLOKIRAN POTEZ DOK JE NAJAVA AKTIVNA: socket=${socket.id}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    if (state.najavljenoPolje) {
                        if (moveCol !== "Najava" || moveRow !== state.najavljenoPolje.row) {
                            console.warn(`🚨 BLOKIRAN POTEZ U POGREŠNO NAJAVLJENO POLJE: socket=${socket.id}, room=${roomId}`);
                            emitAuthoritativeRoomState(socket, roomId, playerIndex);
                            return;
                        }
                    } else if (moveCol === "Najava" && state.brojBacanja > 1) {
                        console.warn(`🚨 BLOKIRAN POTEZ U NAJAVU BEZ NAJAVE: socket=${socket.id}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    if (!isValidColumnOrderForMove(moveRow, moveCol, playerSheet)) {
                        console.warn(`🚨 BLOKIRAN POTEZ ZBOG REDOSLEDA KOLONE: socket=${socket.id}, col=${moveCol}, row=${moveRow}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    const serverPoints = calculateServerMovePoints(moveRow, moveCol, diceValues, state.brojBacanja);
                    if (Math.floor(movePoints) !== serverPoints) {
                        console.warn(`🚨 KORIGOVAN POTEZ: socket=${socket.id}, client=${movePoints}, server=${serverPoints}, room=${roomId}`);
                        syncSenderAfterRelay = true;
                    }

                    state.lastUndoMove = {
                        socketId: socket.id,
                        playerIndex,
                        col: moveCol,
                        row: moveRow,
                        previousValue: playerSheet[moveCol][moveRow],
                        diceValues: Array.isArray(diceValues) ? [...diceValues] : [0, 0, 0, 0, 0, 0],
                        held: Array.isArray(state.zadrzane) ? [...state.zadrzane] : [false, false, false, false, false, false],
                        rollCount: Math.max(0, toSafeInt(state.brojBacanja, 0)),
                        najavaAktivna: !!state.najavaAktivna,
                        najavljenoPolje: state.najavljenoPolje ? { ...state.najavljenoPolje } : null,
                        turnIndex: state.turnIndex,
                        moveCount: Math.max(0, toSafeInt(state.moveCount, 0)),
                        createdAt: Date.now()
                    };

                    playerSheet[moveCol][moveRow] = serverPoints;
                    state.brojBacanja = 0;
                    state.zadrzane = [false,false,false,false,false,false];
                    state.najavaAktivna = false;
                    state.najavljenoPolje = null;
                    relayData = { roomId, row: moveRow, col: moveCol, points: serverPoints, pIdx: playerIndex };
                }
                else if (eventName === 'remote_roll') {
                    if (state.lastUndoMove && state.lastUndoMove.playerIndex !== playerIndex) {
                        state.lastUndoMove = null;
                    }

                    if (state.najavaAktivna || state.brojBacanja >= 3) {
                        console.warn(`🚨 BLOKIRANO BACANJE: socket=${socket.id}, bacanje=${state.brojBacanja}, najava=${state.najavaAktivna}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    const held = normalizeHeldValues(state.zadrzane) || [false,false,false,false,false,false];
                    const nextValues = rollServerDice(state.kockiceVals, held);
                    const nextRollCount = state.brojBacanja + 1;
                    state.kockiceVals = nextValues;
                    state.brojBacanja = nextRollCount;
                    state.zadrzane = held;
                    relayData = {
                        roomId,
                        values: nextValues,
                        bacanje: nextRollCount,
                        held,
                        pIdx: playerIndex
                    };
                    emitToWholeRoom = true;
                }
                else if (eventName === 'remote_hold') {
                    if (state.lastUndoMove && state.lastUndoMove.playerIndex !== playerIndex) {
                        state.lastUndoMove = null;
                    }

                    const holdIndex = toSafeInt(data?.index, -1);
                    if (holdIndex < 0 || holdIndex >= 6 || state.brojBacanja <= 0 || state.brojBacanja >= 3) {
                        console.warn(`🚨 BLOKIRANO DRŽANJE KOCKICE: socket=${socket.id}, index=${data?.index}, bacanje=${state.brojBacanja}, room=${roomId}`);
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }

                    if (!state.zadrzane) state.zadrzane = [false,false,false,false,false,false];
                    state.zadrzane[holdIndex] = data?.status === true;
                    relayData = { roomId, index: holdIndex, status: state.zadrzane[holdIndex], pIdx: playerIndex };
                }
                else if (eventName === 'remote_announce') {
                    if (state.lastUndoMove && state.lastUndoMove.playerIndex !== playerIndex) {
                        state.lastUndoMove = null;
                    }

                    const announceType = data?.type || 'start';
                    if (announceType === 'start') {
                        if (state.brojBacanja !== 1 || state.najavljenoPolje) {
                            console.warn(`🚨 BLOKIRAN START NAJAVE: socket=${socket.id}, bacanje=${state.brojBacanja}, room=${roomId}`);
                            emitAuthoritativeRoomState(socket, roomId, playerIndex);
                            return;
                        }
                        state.najavaAktivna = true;
                        state.najavljenoPolje = null;
                        relayData = { roomId, type: 'start', pIdx: playerIndex };
                    }
                    else if (announceType === 'cancel') {
                        state.najavaAktivna = false;
                        state.najavljenoPolje = null;
                        relayData = { roomId, type: 'cancel', pIdx: playerIndex };
                    }
                    else if (announceType === 'selected') {
                        const announceRow = typeof data?.row === 'string' ? data.row : '';
                        if (!state.najavaAktivna || !REDOVI_IGRA.includes(announceRow)) {
                            console.warn(`🚨 BLOKIRAN IZBOR NAJAVE: socket=${socket.id}, row=${announceRow}, room=${roomId}`);
                            emitAuthoritativeRoomState(socket, roomId, playerIndex);
                            return;
                        }
                        state.najavaAktivna = false;
                        state.najavljenoPolje = { row: announceRow, col: 'Najava' };
                        relayData = { roomId, type: 'selected', row: announceRow, pIdx: playerIndex };
                    } else {
                        emitAuthoritativeRoomState(socket, roomId, playerIndex);
                        return;
                    }
                }
            }

            if (emitToWholeRoom) {
                io.to(roomId).emit(eventName, relayData);
            } else {
                socket.to(roomId).emit(eventName, relayData);
            }

            if (eventName === 'remote_move' && roomState[roomId]) {
                roomState[roomId].moveCount = (roomState[roomId].moveCount || 0) + 1;
                roomState[roomId].turnIndex = roomState[roomId].turnIndex === 0 ? 1 : 0;
                startTurnTimer(roomId);
                if (syncSenderAfterRelay) emitAuthoritativeRoomState(socket, roomId, playerIndex);
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
        const requestedRoomId = data && data.roomId;

        if (requestedRoomId && playerRooms[socket.id] && requestedRoomId !== playerRooms[socket.id]) {
            console.log(`ℹ️ Ignorišem sync zahtev za staru sobu ${requestedRoomId}; aktivna soba je ${playerRooms[socket.id]}.`);
            return;
        }

        if (requestedRoomId && !playerRooms[socket.id]) {
            reattachSocketToRoomByUid(socket, requestedRoomId);
        }

        const roomId = playerRooms[socket.id] || requestedRoomId;
        const requestedState = roomId ? roomState[roomId] : null;
        const socketUid = getSocketUid(socket.id);
        const roomClients = roomId ? io.sockets.adapter.rooms.get(roomId) : null;
        const socketIsRoomMember = !!(roomClients && roomClients.has(socket.id));

        if (roomId && requestedState && !socketIsRoomMember && !socketUid) {
            socket.pendingOnlineRoomResume = roomId;
            socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
            console.log(`ℹ️ Odlažem sync za sobu ${roomId}; socket ${socket.id} još nema potvrđen UID.`);
            return;
        }

        if (roomId && requestedState && socketIsRoomMember) {
            const state = requestedState;
            console.log(`🛡️ SERVER SYNC: Šaljem bezbedno autoritativno stanje sobe ${roomId} igraču ${socket.id}`);
            
            const playerNamesToSync = state.playerNames || state.players.map(id => {
                const pSocket = io.sockets.sockets.get(id);
                return pSocket && pSocket.playerName ? pSocket.playerName : "Igrač";
            });

            const syncNow = Date.now();
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
                najavljenoPolje: state.najavljenoPolje || null,
                turnStartTime: state.turnStartTime || syncNow,
                turnTimeLimitMs: state.turnClientTimeLimitMs || TURN_TIME_LIMIT,
                turnTimerPaused: hasActiveDisconnectGraceForRoom(roomId),
                disconnectGraceRemainingMs: getRoomDisconnectGraceRemainingMs(roomId),
                serverNow: syncNow
            });
        } else if (roomId && socketIsRoomMember) {
             // Pitaj protivnika za state ako je na serveru izgubljen, ALI SAMO AKO JE PROTIVNIK TU
             const clients = roomClients;
             if (clients && clients.size > 0 && Array.from(clients).some(c => c !== socket.id)) {
                 socket.to(roomId).emit('request_state_sync', { senderSocketId: socket.id });
             } else {
                 // Protivnik nije tu, partija je zvanično mrtva!
                 socket.emit('force_cancel_online', { roomId });
             }
        } else {
            // Ako soba više ne postoji (istekao grace period)
            socket.emit('force_cancel_online', { roomId: roomId || requestedRoomId || null }); // Izbacujemo ga nazad u meni
        }
    });

    socket.on('undo_last_move', async (data = {}, ack) => {
        const reply = (payload) => {
            if (typeof ack === 'function') ack(payload);
            socket.emit('undo_move_result', payload);
        };

        try {
            const roomId = playerRooms[socket.id];
            const requestedRoomId = typeof data?.roomId === 'string' ? data.roomId : '';

            if (!roomId || (requestedRoomId && requestedRoomId !== roomId) || isLocalRoomId(roomId)) {
                reply({ ok: false, reason: 'undo_unavailable', permanent: true });
                return;
            }

            const state = roomState[roomId];
            if (!state || state.gameFinished) {
                reply({ ok: false, reason: 'undo_unavailable', permanent: true });
                return;
            }

            const undoMove = state.lastUndoMove;
            const playerIndex = state.players.indexOf(socket.id);
            if (!undoMove || undoMove.socketId !== socket.id || undoMove.playerIndex !== playerIndex) {
                reply({ ok: false, reason: 'undo_unavailable', permanent: true });
                return;
            }

            const expectedNextTurn = playerIndex === 0 ? 1 : 0;
            if (state.turnIndex !== expectedNextTurn || Math.max(0, toSafeInt(state.brojBacanja, 0)) !== 0) {
                state.lastUndoMove = null;
                reply({ ok: false, reason: 'undo_expired', permanent: true });
                return;
            }

            const sheet = state.allScores?.[playerIndex];
            if (!sheet || !sheet[undoMove.col] || !REDOVI_IGRA.includes(undoMove.row)) {
                state.lastUndoMove = null;
                reply({ ok: false, reason: 'undo_unavailable', permanent: true });
                return;
            }

            let updatedUser = null;
            if (MONGO_URI) {
                const uid = getVerifiedUid(socket);
                if (!uid) {
                    socket.emit('auth_required', { ok: false, reason: 'firebase_token_required' });
                    reply({ ok: false, reason: 'auth_required' });
                    return;
                }

                updatedUser = await UserProfile.findOneAndUpdate(
                    { firebaseUid: uid, undoTokens: { $gte: 1 } },
                    { $inc: { undoTokens: -1 } },
                    { new: true }
                );

                if (!updatedUser) {
                    const currentUser = await UserProfile.findOne({ firebaseUid: uid });
                    if (currentUser) emitProfileSync(socket, currentUser);
                    reply({
                        ok: false,
                        reason: 'undo_no_tokens',
                        undoTokens: currentUser ? Math.max(0, toSafeInt(currentUser.undoTokens, 0)) : 0,
                        permanent: true
                    });
                    return;
                }
            }

            sheet[undoMove.col][undoMove.row] = undoMove.previousValue ?? null;
            state.kockiceVals = Array.isArray(undoMove.diceValues) ? [...undoMove.diceValues] : [0, 0, 0, 0, 0, 0];
            state.zadrzane = Array.isArray(undoMove.held) ? [...undoMove.held] : [false, false, false, false, false, false];
            state.brojBacanja = Math.max(0, toSafeInt(undoMove.rollCount, 0));
            state.najavaAktivna = !!undoMove.najavaAktivna;
            state.najavljenoPolje = undoMove.najavljenoPolje ? { ...undoMove.najavljenoPolje } : null;
            state.turnIndex = undoMove.turnIndex;
            state.moveCount = Math.max(0, toSafeInt(undoMove.moveCount, 0));
            state.lastUndoMove = null;

            startTurnTimer(roomId);

            state.players.forEach((playerSocketId, index) => {
                const clientSocket = io.sockets.sockets.get(playerSocketId);
                if (clientSocket) emitAuthoritativeRoomState(clientSocket, roomId, index);
            });

            if (updatedUser) emitProfileSync(socket, updatedUser);

            reply({
                ok: true,
                undoTokens: updatedUser ? Math.max(0, toSafeInt(updatedUser.undoTokens, 0)) : undefined,
                localFallback: !MONGO_URI
            });
        } catch (err) {
            console.error('Greška pri online undo rollback-u:', err);
            reply({ ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('sync_state_response', (data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            if (data && data.roomId && data.roomId !== roomId) {
                console.log(`ℹ️ Ignorišem sync_state_response za staru sobu ${data.roomId}; aktivna soba je ${roomId}.`);
                return;
            }

            if (isLocalRoomId(roomId)) {
                const roomClients = io.sockets.adapter.rooms.get(roomId);
                if (!roomClients || !roomClients.has(socket.id) || socket.isSpectator) return;

                const targetSocketId = typeof data?.targetSocketId === 'string' ? data.targetSocketId : '';
                const spectatorPayload = {
                    ...data,
                    roomId,
                    myIndex: -1
                };
                delete spectatorPayload.targetSocketId;

                const emitToSpectator = (clientId) => {
                    const clientSocket = io.sockets.sockets.get(clientId);
                    if (!clientSocket || !clientSocket.isSpectator) return;
                    if (clientSocket.spectatingRoom !== roomId || !roomClients.has(clientId)) return;
                    clientSocket.emit('sync_state_response', spectatorPayload);
                };

                if (targetSocketId) {
                    emitToSpectator(targetSocketId);
                } else {
                    for (const clientId of roomClients) emitToSpectator(clientId);
                }
                return;
            }

            const state = roomState[roomId];
            if (!state || state.gameFinished) return;

            const playerIndex = state.players.indexOf(socket.id);
            if (playerIndex === -1) {
                console.log(`ℹ️ Ignorišem sync_state_response od socket-a koji nije igrač u sobi ${roomId}: ${socket.id}`);
                return;
            }

            console.log(`ℹ️ Ignorišem klijentski sync_state_response za sobu ${roomId}; server šalje autoritativno stanje.`);
            state.players.forEach((playerSocketId, index) => {
                const clientSocket = io.sockets.sockets.get(playerSocketId);
                if (clientSocket) emitAuthoritativeRoomState(clientSocket, roomId, index);
            });
        }
    });

    socket.on('chat_msg', (data) => relayEvent('chat_msg', data));

    socket.on('request_global_chat_history', () => {
        if (!socket.playerName || !socket.verifiedUid) {
            socket.emit('error_msg', 'err_chat_auth_required');
            return;
        }
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

        queueGlobalChatMessageSave(chatObj);
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

    socket.on('send_challenge', (data, ack) => {
        const { targetId, targetUid } = data || {};
        let resolvedTargetId = targetId;
        let targetSocket = resolvedTargetId ? io.sockets.sockets.get(resolvedTargetId) : null;
        const challengerUid = getSocketUid(socket.id);
        const requestedTargetUid = typeof targetUid === 'string' ? targetUid : '';
        const replyChallenge = (payload) => {
            if (typeof ack === 'function') ack(payload);
            else if (!payload.ok) socket.emit('error_msg', payload.reason || 'err_server_conn');
        };

        if (requestedTargetUid && onlinePlayers[requestedTargetUid] && onlinePlayers[requestedTargetUid] !== socket.id) {
            const currentTargetSocket = io.sockets.sockets.get(onlinePlayers[requestedTargetUid]);
            if (currentTargetSocket) {
                resolvedTargetId = currentTargetSocket.id;
                targetSocket = currentTargetSocket;
            }
        }

        if ((!targetSocket || targetSocket.id === socket.id) && requestedTargetUid && onlinePlayers[requestedTargetUid]) {
            resolvedTargetId = onlinePlayers[requestedTargetUid];
            targetSocket = io.sockets.sockets.get(resolvedTargetId);
        }
        
        if (targetSocket && targetSocket.id !== socket.id) {
            const resolvedTargetUid = getSocketUid(resolvedTargetId) || requestedTargetUid || '';
            if (isPlayerBusyForInvite(socket.id, challengerUid)) {
                emitPlayerBusy(socket, ack);
                return;
            }

            if (isPlayerBusyForInvite(resolvedTargetId, resolvedTargetUid)) {
                emitPlayerBusy(socket, ack);
                return;
            }

            if (getActivePendingChallengeBetweenPlayers(socket.id, challengerUid, resolvedTargetId, resolvedTargetUid)) {
                replyChallenge({ ok: false, reason: 'duel_pending' });
                return;
            }

            const challengeKey = getChallengeKey(socket.id, resolvedTargetId);
            clearPendingChallenge(challengeKey);

            const createdAt = Date.now();
            const expiresAt = createdAt + CHALLENGE_RESPONSE_WINDOW_MS;
            pendingChallenges[challengeKey] = {
                challengerId: socket.id,
                targetId: resolvedTargetId,
                challengerUid,
                targetUid: resolvedTargetUid,
                createdAt,
                expiresAt,
                timeoutId: setTimeout(() => {
                    expirePendingChallenge(challengeKey, 'timeout');
                }, CHALLENGE_RESPONSE_WINDOW_MS)
            };

            socket.to(resolvedTargetId).emit('incoming_challenge', {
                challengerId: socket.id,
                challengerName: sanitizeTournamentName(socket.playerName || "Igrač"),
                challengeId: challengeKey,
                expiresAt
            });
            replyChallenge({ ok: true });
        } else {
            replyChallenge({ ok: false, reason: 'err_player_not_on_server' });
        }
    });

    socket.on('challenge_response', (data) => {
        const { challengerId, accepted, challengeId } = data;
        const challengerSocket = io.sockets.sockets.get(challengerId);
        const pending = findPendingChallengeForResponse(challengerId, socket.id, challengeId);

        if (accepted) {
            if (pending && challengeId && pending.key !== challengeId) {
                socket.emit('challenge_expired', {
                    reason: 'late_response',
                    message: 'Istekao je rok za odgovor na duel izazov. Nema pobede ni kazne.'
                });
                return;
            }

            if (!pending || !pending.challenge || Date.now() > pending.challenge.expiresAt) {
                if (pending) expirePendingChallenge(pending.key, 'late_response');
                else socket.emit('challenge_expired', {
                    reason: 'late_response',
                    message: 'Istekao je rok za odgovor na duel izazov. Nema pobede ni kazne.'
                });
                return;
            }

            if (!challengerSocket) {
                clearPendingChallenge(pending.key);
                socket.emit('error_msg', 'err_challenger_left');
                return;
            }

            const challengerUid = pending.challenge.challengerUid || getSocketUid(challengerId);
            const responderUid = pending.challenge.targetUid || getSocketUid(socket.id);
            socket.clientBusyForInvites = false;
            socket.clientBusyReason = '';
            if (isPlayerBusyForInvite(challengerId, challengerUid) || isPlayerBusyForInvite(socket.id, responderUid)) {
                clearPendingChallengesBetweenPlayers(challengerId, challengerUid, socket.id, responderUid);
                socket.emit('error_msg', 'err_player_busy');
                if (challengerSocket) challengerSocket.emit('error_msg', 'err_player_busy');
                return;
            }

            clearPendingChallengesBetweenPlayers(challengerId, challengerUid, socket.id, responderUid);
            const roomName = `duel_${challengerId}_${socket.id}`;
            
            socket.join(roomName);
            challengerSocket.join(roomName);

            playerRooms[socket.id] = roomName;
            playerRooms[challengerId] = roomName;
            startScoreSession(socket.id);
            startScoreSession(challengerId);

            console.log(`⚔️ DUEL POČINJE: ${challengerId} vs ${socket.id} u sobi ${roomName}`);

            roomState[roomName] = {
                players: [challengerId, socket.id],
                playerUids: [challengerUid, responderUid],
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
            notifyOnlinePlayersStatusChanged();

            challengerSocket.emit('game_start', {
                roomId: roomName,
                opponent: socket.playerName || "Igrač 2",
                oppStats: socket.playerStats,
                oppPhoto: socket.photoUrl || '',
                oppUid: socket.playerId || registeredSockets[socket.id] || '',
                myIndex: 0,
                duelType: getOnlineDuelType(roomName),
                directDuel: true
            });
            socket.emit('game_start', {
                roomId: roomName,
                opponent: challengerSocket.playerName || "Igrač 1",
                oppStats: challengerSocket.playerStats,
                oppPhoto: challengerSocket.photoUrl || '',
                oppUid: challengerSocket.playerId || registeredSockets[challengerId] || '',
                myIndex: 1,
                duelType: getOnlineDuelType(roomName),
                directDuel: true
            });

            setTimeout(() => {
                if (!roomState[roomName] || roomState[roomName].gameFinished) return;
                challengerSocket.emit('online_room_resume_available', { roomId: roomName, directDuel: true });
                socket.emit('online_room_resume_available', { roomId: roomName, directDuel: true });
            }, 1200);

        } else {
            if (!pending) return;
            if (pending && challengeId && pending.key !== challengeId) return;
            if (pending) clearPendingChallenge(pending.key);
            if (!data || !data.busy) {
                socket.clientBusyForInvites = false;
                socket.clientBusyReason = '';
                notifyOnlinePlayersStatusChanged();
            }
            if (challengerSocket) {
                if (data && data.busy) {
                    socket.to(challengerId).emit('error_msg', 'err_player_busy');
                } else {
                    socket.to(challengerId).emit('challenge_declined', {});
                }
            }
        }
    });

    socket.on('game_over', async () => {
        const roomId = playerRooms[socket.id];
        const scoreSessionStartedAt = gameStartTimes[socket.id];
        const carriedDurationAtGameOver = gameCarriedDurations[socket.id];

        if (scoreSessionStartedAt) {
            setTimeout(() => {
                if (gameStartTimes[socket.id] === scoreSessionStartedAt && gameCarriedDurations[socket.id] === carriedDurationAtGameOver) {
                    clearScoreSession(socket.id);
                }
            }, TOP_SCORE_SUBMIT_GRACE_MS);
        }

        if (roomId) {
            if (isLocalRoomId(roomId)) {
                if (playerRooms[socket.id] === roomId) delete playerRooms[socket.id];
                socket.leave(roomId);
                return;
            }

            console.log(`🏁 Igra završena u sobi: ${roomId}`);
            const state = roomState[roomId];
            if (!state || state.gameFinished) return;

            const completedScores = Array.isArray(state.players) &&
                state.players.length >= 2 &&
                Array.isArray(state.allScores) &&
                state.allScores.length >= 2 &&
                state.allScores.slice(0, 2).every(sheet => calculateCompletedDuelTotal(sheet) !== null);

            if (!completedScores) {
                console.warn(`🚨 BLOKIRAN PRERANI GAME OVER: socket=${socket.id}, room=${roomId}`);
                emitAuthoritativeRoomState(socket, roomId, Array.isArray(state.players) ? state.players.indexOf(socket.id) : -1);
                return;
            }

            await applyServerSideCompletedDuel(roomId, socket.id);
            emitCompletedOnlineGame(roomId);
            await applyTournamentCompletedDuelResult(roomId);
            markOnlineRoomGameFinished(roomId);
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
                    playerUids: playersArr.map(playerSocketId => getSocketUid(playerSocketId)),
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
                notifyOnlinePlayersStatusChanged();
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
            bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] },
            pushFlags: {}
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

            const serverPi = await calculateTournamentPi(uid, playerData.pi);

            const tournamentPlayer = {
                id: uid,
                name: sanitizeTournamentName(socket.playerName || playerData.name),
                photoUrl: sanitizeTournamentPhotoUrl(socket.photoUrl || playerData.photoUrl),
                pi: serverPi
            };

            tournamentState.players.push(tournamentPlayer);
            if (!assignPlayerToRandomTournamentSlot(tournamentPlayer)) {
                tournamentState.players = tournamentState.players.filter(player => player.id !== uid);
                throw new Error('No free tournament bracket slot.');
            }

            const tournamentStartedByRegistration = hasFullTournamentRoster()
                ? generateTournamentBracket()
                : false;
            if (!tournamentStartedByRegistration) {
                saveTournamentToDb();
            }

            emitProfileSync(socket, debitResult.user);
            socket.emit('tourney_register_result', {
                ok: true,
                balance: debitResult.user ? debitResult.user.balance : undefined
            });
            io.emit('tourney_state_update', tournamentState);
            if (tournamentStartedByRegistration) {
                queueTournamentPush(notifyTournamentStarted(), 'started');
            } else if (tournamentState.players.length === 7) {
                queueTournamentPush(notifyTournamentOneSpotLeft(), 'one_spot_left');
            }
        } catch (err) {
            console.error("Greška pri turnirskoj prijavi:", err);
            if (debitResult && debitResult.user) {
                const refundedUser = await refundTournamentEntryFee(uid);
                emitProfileSync(socket, refundedUser);
            }
            socket.emit('tourney_register_result', { ok: false, reason: 'err_server_conn' });
        }
    });

    socket.on('tourney_update_pi', async (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const pi = await calculateTournamentPi(uid, data.pi);
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
            removePlayerFromTournamentBracket(uid);
            if (tournamentState.players.length < 7) {
                delete ensureTournamentPushFlags().oneSpotLeft;
            }
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

        if (!isTournamentSchedulingUnlocked()) {
            return rejectTournamentAction(socket, 'tourney_schedule_locked_until_full');
        }

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match, index } = matchInfo;
        if (!isTournamentParticipant(match, uid)) return rejectTournamentAction(socket, 'err_invalid_room');

        const proposedTime = normalizeTournamentTime(data.proposedTime);
        if (!proposedTime) return rejectTournamentAction(socket, 'err_invalid_room');

        match.proposedTime = proposedTime;
        match.proposedById = uid;
        match.timeAccepted = false;
        match.time = null;
        saveTournamentToDb();
        io.emit('tourney_state_update', tournamentState);
        queueTournamentPush(notifyTournamentTimeProposed(match, data.round, index, uid), 'time_proposed');
    });

    socket.on('tourney_accept_time', (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        if (!isTournamentSchedulingUnlocked()) {
            return rejectTournamentAction(socket, 'tourney_schedule_locked_until_full');
        }

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match, index } = matchInfo;
        if (!isTournamentParticipant(match, uid)) return rejectTournamentAction(socket, 'err_invalid_room');
        if (!match.proposedTime) return rejectTournamentAction(socket, 'err_invalid_room');
        if (match.proposedById && match.proposedById === uid) return rejectTournamentAction(socket, 'err_invalid_room');

        match.timeAccepted = true;
        match.time = match.proposedTime;
        match.pushRemindersSent = {};
        saveTournamentToDb();
        io.emit('tourney_state_update', tournamentState);
        queueTournamentPush(notifyTournamentTimeAccepted(match, data.round, index), 'time_accepted');
    });

    socket.on('tourney_start_duel', (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        if (!isTournamentSchedulingUnlocked()) {
            return rejectTournamentAction(socket, 'tourney_schedule_locked_until_full');
        }

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match, index } = matchInfo;
        if (!isTournamentParticipant(match, uid)) return rejectTournamentAction(socket, 'err_invalid_room');
        if (match.winnerId || !match.timeAccepted) return rejectTournamentAction(socket, 'err_invalid_room');

        const opponent = getTournamentOpponent(match, uid);
        const starter = getTournamentPlayer(match, uid);
        if (!opponent) return rejectTournamentAction(socket, 'err_invalid_room');

        if (isPlayerBusyForInvite(socket.id, uid)) {
            socket.emit('error_msg', 'err_player_busy');
            return;
        }

        if (onlinePlayers[opponent.id]) {
            const opponentSocketId = onlinePlayers[opponent.id];
            if (isPlayerBusyForInvite(opponentSocketId, opponent.id)) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

            const existingInvite = findPendingTournamentDuelInvite(socket.id, opponentSocketId, String(data.round || ''), index);
            if (existingInvite) {
                socket.emit('tourney_duel_pending', {
                    opponentName: sanitizeTournamentName(opponent.name || 'Igrač'),
                    expiresAt: existingInvite.invite.expiresAt
                });
                return;
            }

            const matchRoomId = `tourney_${data.round}_${index}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const createdAt = Date.now();
            const expiresAt = createdAt + ROOM_INVITE_RESPONSE_WINDOW_MS;
            pendingTournamentDuelInvites[matchRoomId] = {
                matchRoomId,
                starterSocketId: socket.id,
                targetSocketId: opponentSocketId,
                starterUid: uid,
                targetUid: opponent.id,
                starterName: sanitizeTournamentName(starter?.name || socket.playerName || 'Igrač'),
                targetName: sanitizeTournamentName(opponent.name || 'Igrač'),
                round: String(data.round || ''),
                index,
                createdAt,
                expiresAt,
                timeoutId: setTimeout(() => {
                    expirePendingTournamentDuelInvite(matchRoomId);
                }, ROOM_INVITE_RESPONSE_WINDOW_MS)
            };

            io.to(opponentSocketId).emit('tourney_duel_ready', {
                matchRoomId,
                targetId: opponent.id,
                opponentName: sanitizeTournamentName(starter?.name || socket.playerName),
                expiresAt
            });
            socket.emit('tourney_duel_pending', {
                opponentName: sanitizeTournamentName(opponent.name || 'Igrač'),
                expiresAt
            });
        } else {
            queueTournamentPush(notifyTournamentDuelRequested(match, data.round, index, uid), 'duel_requested');
            socket.emit('error_msg', 'err_tourney_opp_offline');
        }
    });

    socket.on('tourney_duel_response', (data = {}) => {
        const matchRoomId = String(data.matchRoomId || '');
        const invite = pendingTournamentDuelInvites[matchRoomId] || null;
        if (!invite) {
            socket.emit('tourney_duel_expired', {
                matchRoomId,
                opponentName: 'Igrač'
            });
            return;
        }

        const responderUid = getSocketUid(socket.id);
        if (invite.targetSocketId !== socket.id && (!responderUid || responderUid !== invite.targetUid)) {
            return;
        }

        clearPendingTournamentDuelInvite(matchRoomId);

        const starterSocket = io.sockets.sockets.get(invite.starterSocketId);
        if (!starterSocket) {
            socket.emit('tourney_duel_expired', {
                matchRoomId,
                opponentName: invite.starterName || 'Igrač'
            });
            return;
        }

        if (data.busy === true) {
            starterSocket.emit('tourney_duel_busy', {
                matchRoomId,
                opponentName: invite.targetName || 'Igrač'
            });
            return;
        }

        if (data.accepted !== true) {
            starterSocket.emit('tourney_duel_declined', {
                matchRoomId,
                opponentName: invite.targetName || 'Igrač'
            });
            return;
        }

        if (Date.now() > invite.expiresAt) {
            socket.emit('tourney_duel_expired', {
                matchRoomId,
                opponentName: invite.starterName || 'Igrač'
            });
            starterSocket.emit('tourney_duel_expired', {
                matchRoomId,
                opponentName: invite.targetName || 'Igrač'
            });
            return;
        }

        if (isPlayerBusyForInvite(invite.starterSocketId, invite.starterUid) ||
            isPlayerBusyForInvite(socket.id, invite.targetUid)) {
            starterSocket.emit('tourney_duel_busy', {
                matchRoomId,
                opponentName: invite.targetName || 'Igrač'
            });
            socket.emit('error_msg', 'err_player_busy');
            return;
        }

        starterSocket.emit('tourney_join_allowed', matchRoomId);
        socket.emit('tourney_join_allowed', matchRoomId);
    });

    socket.on('tourney_submit_winner', async (data = {}) => {
        const uid = requireTournamentAuth(socket);
        if (!uid) return;

        const matchInfo = getTournamentMatch(data.round, data.index);
        if (!matchInfo) return rejectTournamentAction(socket, 'err_invalid_room');

        const { match, index } = matchInfo;
        const round = String(data.round || '');
        const winnerId = String(data.winnerId || '');
        if (!isTournamentParticipant(match, uid) || winnerId !== uid) return rejectTournamentAction(socket, 'err_invalid_room');

        if (match && (match.winnerId === null || match.winnerId === undefined)) {
            const activeRoomId = playerRooms[socket.id];
            const activeRoomInfo = parseTournamentRoomId(activeRoomId);
            const roomMatchesSubmittedMatch = activeRoomInfo
                && activeRoomInfo.round === round
                && activeRoomInfo.index === index;
            const regularScores = roomMatchesSubmittedMatch
                ? getTournamentRoomMatchScores(activeRoomId, match)
                : null;

            if (regularScores) {
                if (regularScores.p1Score === regularScores.p2Score) {
                    return rejectTournamentAction(socket, 'err_invalid_room');
                }

                const scoreWinnerId = regularScores.p1Score > regularScores.p2Score ? match.p1.id : match.p2.id;
                if (scoreWinnerId !== winnerId) {
                    return rejectTournamentAction(socket, 'err_invalid_room');
                }

                setTournamentMatchResult(match, 'regular', regularScores.p1Score, regularScores.p2Score);
            } else {
                console.warn(`⚠️ TURNIR: Nije moguće izvući regularan skor za ${round}/${index} iz sobe ${activeRoomId || 'n/a'}.`);
                return rejectTournamentAction(socket, 'err_invalid_room');
            }

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
    // 6. DISKONEKCIJA (SA RECONNECT GRACE TOLERANCIJOM I H2H KAZNOM)
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
        const activeRoomState = activeRoomId ? roomState[activeRoomId] : null;
        clearChallengesForSocket(socket.id);
        clearPendingRoomInvitesForSocket(socket.id);
        clearPendingTournamentDuelInvitesForSocket(socket.id);

        if (pid && activeRoomId && !(activeRoomState && activeRoomState.gameFinished)) {
            beginReconnectGraceForSocket(socket, activeRoomId, 'disconnect');
        } else {
            if (activeRoomId) {
                const stateOnDisconnect = roomState[activeRoomId];
                const winnerSocketId = Array.isArray(stateOnDisconnect?.players)
                    ? stateOnDisconnect.players.find(id => id !== socket.id)
                    : '';
                const winnerParticipant = stateOnDisconnect && winnerSocketId
                    ? getRoomParticipantMeta(stateOnDisconnect, winnerSocketId)
                    : null;
                const loserParticipant = stateOnDisconnect
                    ? getRoomParticipantMeta(stateOnDisconnect, socket.id)
                    : null;
                socket.to(activeRoomId).emit('opponent_left', {
                    winnerId: winnerSocketId || '',
                    loserId: socket.id,
                    duelType: getOnlineDuelType(activeRoomId),
                    winnerName: winnerParticipant?.name || 'Igrac',
                    loserName: loserParticipant?.name || 'Igrac'
                });
                cleanupOnlineRoom(activeRoomId);
            }
        }

        if (pid && onlinePlayers[pid] === socket.id) {
            delete onlinePlayers[pid]; 
        }
        delete registeredSockets[socket.id];

        clearScoreSession(socket.id);
        delete pendingGameRewards[socket.id];

        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }

        updateOnlineCount();
    });
});

setTimeout(() => {
    runLeagueChampionPushCheck();
}, 15000);

setInterval(() => {
    runLeagueChampionPushCheck();
}, LEAGUE_CHAMPION_PUSH_INTERVAL_MS);

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
