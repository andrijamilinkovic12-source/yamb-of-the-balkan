// server.js - FIX: KOMPLETAN CLOUD SAVE SISTEM + ISKLJUČENA SPEED HACK ZAŠTITA + FILTER + BANOVANJE + TURNIR + ZAŠTITA OD NULA (FRESH INSTALL) + KVARTALNA LIGA MAX FIX + ODVAJANJE GOSTIJU OD UID-a + ALL TIME LIGA + SHOP FIX + DUKATI SAFEGUARD + DNEVNI IZAZOV SERVER-SIDE + SISTEM PRIJATELJA I SLIKA + ONLINE STATUS FIX + SINHRONIZOVANO ODBIJANJE PRIJATELJSTVA + FRIEND REQUEST QUEUE + THEME OVERWRITE FIX + GRACE PERIOD STABILITY + STATE SYNC + ANTI TROLL TIMER + VATRENI NIZ MAX FIX + SPECTATOR MODE + ISPLAYING & ISFRIEND FLAGS + QUARTERLY REWARDS + PREVIOUS QUARTER WINNER + HALL OF FAME + LEAN DATA FIX + MULTILANGUAGE ERROR KEYS + POWER INDEX (WITH PENALTY SYSTEM) + TOURNAMENT CLOUD SAVE + LIVE PI SYNC + SOUND & VIBRATION CLOUD SAVE + ADVANCED H2H STATS MERGE + GLOBAL AVATAR FIX + PERSISTENT GLOBAL CHAT + ANTI-LAG BLOKADA DUPLIH POTEZA + AUTORITATIVNI TAJMER + SERVERSKA KAZNA ZA RAGE QUIT (DINAMIČKA SA H2H) + AUTORITATIVNI STATE SYNC (SECURITY FIX) + SPECTATOR SOLO FIX + SECURE HIGHSCORE SUBMIT + AGGREGATE FIX ZA DUPLIKATE NA TOP LISTI + OFFLINE SYNC RACE CONDITION FIX + RAGE QUIT LOGIC FIX + LEAGUE SAFEGUARD FIX + H2H UNDEFINED FIX + BUSY PLAYER FIX + ONLINE UNDO TOKENS + INVENTORY DESYNC EXPLOIT FIX

require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const https = require('https'); 

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
        initTournamentFromDb(); // <-- Učitavanje turnira čim se baza spoji
        initChatFromDb();       // <-- Učitavanje global chata čim se baza spoji
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

const GlobalChatSchema = new mongoose.Schema({
    messages: { type: Array, default: [] }
});
mongoose.model('GlobalChat', GlobalChatSchema);

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
    undoTokens: { type: Number, default: 0 }, // DODATO: Čuvanje tokena
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
    soundEnabled: { type: Boolean, default: true },      
    vibrationEnabled: { type: Boolean, default: true },  
    penaltyPoints: { type: Number, default: 0 },         
    h2hStats: { type: Object, default: {} },             
    leagueData: {
        year: { type: Number, default: 0 },
        quarter: { type: Number, default: 0 },
        baselineScore: { type: Number, default: 0 },
        quarterlyScore: { type: Number, default: 0 } 
    },
    lastLogin: { type: Date, default: Date.now }
});
const UserProfile = mongoose.model('UserProfile', UserProfileSchema);

// --- GLOBALNE PROMENLJIVE ZA IGRU ---
let waitingPlayer = null; 
let privateRooms = {};    
let playerRooms = {};     
let gameStartTimes = {}; 
const chatBans = {}; 
const onlinePlayers = {};     
const registeredSockets = {}; 

// NOVE PROMENLJIVE ZA ČUVANJE CHATA
let globalChatHistory = [];
const MAX_CHAT_HISTORY = 50;

// Funkcije za manipulaciju chatom
async function initChatFromDb() {
    if (!process.env.MONGO_URI) return;
    try {
        const GlobalChatDb = mongoose.model('GlobalChat');
        let dbChat = await GlobalChatDb.findOne();
        if (dbChat) {
            globalChatHistory = dbChat.messages || [];
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
        await GlobalChatDb.findOneAndUpdate({}, { messages: globalChatHistory }, { upsert: true });
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
async function applyServerSidePenalty(playerId, penaltyAmount = 50, h2hKey = null) {
    if (!process.env.MONGO_URI || !playerId) return;
    try {
        const UserProfile = mongoose.model('UserProfile');

        let updateInc = { penaltyPoints: penaltyAmount, losses: 1 };
        let updateSet = { currentWinStreak: 0 };

        if (h2hKey) {
            updateInc[`h2hStats.${h2hKey}.losses`] = 1;
            updateSet[`h2hStats.${h2hKey}.currentWinStreak`] = 0;
        }

        await UserProfile.findOneAndUpdate(
            { firebaseUid: playerId },
            { 
                $inc: updateInc, 
                $set: updateSet 
            }
        );
        console.log(`⚖️ SERVER KAZNA: Dodato ${penaltyAmount} kaznenih poena i resetovan H2H igraču ${playerId} protiv ključa ${h2hKey || 'nepoznatog'}.`);
    } catch (err) {
        console.error("Greška pri upisu server kazne:", err);
    }
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

function handleTechnicalTimeout(roomId, inactivePlayerSocketId) {
    const state = roomState[roomId];
    if (!state) return;

    const winnerSocketId = state.players.find(id => id !== inactivePlayerSocketId);
    
    if (winnerSocketId) {
        const inactiveUid = registeredSockets[inactivePlayerSocketId];
        const penaltyAmount = getDynamicPenalty(roomId); 
        
        const winnerSocket = io.sockets.sockets.get(winnerSocketId);
        
        let h2hKey = null;
        if (winnerSocket) {
            let safeOppName = winnerSocket.playerName ? winnerSocket.playerName.replace(/\./g, '_').replace(/\$/g, '_') : 'Nepoznat';
            h2hKey = winnerSocket.playerId ? winnerSocket.playerId : safeOppName;
        }

        if (inactiveUid) {
            applyServerSidePenalty(inactiveUid, penaltyAmount, h2hKey); 
        }
        
        console.log(`⏱️ TIMEOUT: Isteklo vreme u sobi ${roomId}. Pobednik je ${winnerSocketId} (Tehnička pobeda)`);
        
        io.to(roomId).emit('game_over_timeout', {
            winnerId: winnerSocketId,
            loserId: inactivePlayerSocketId,
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

    socket.on('set_my_id', (playerId) => {
        onlinePlayers[playerId] = socket.id;
        registeredSockets[socket.id] = playerId;
        socket.playerId = playerId; 

        if (disconnectTimers[playerId]) {
            clearTimeout(disconnectTimers[playerId]);
            delete disconnectTimers[playerId];
            console.log(`✅ GRACE PERIOD: Igrač ${playerId} se uspešno rekonektovao!`);
            
            const ghost = ghostSessions[playerId];
            if (ghost) {
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
                delete ghostSessions[playerId];
            }
        }
    });

    socket.on('set_player_data', async (data) => {
        const stariPlayerId = socket.playerId; 
        
        socket.photoUrl = data.photoUrl || ''; 

        let bezbednoIme = "Nepoznat Igrač";
        
        if (data.name) {
            let unesenoIme = data.name.trim().substring(0, 24);
            if (sadrziPsovku(unesenoIme)) {
                bezbednoIme = "Igrač_" + Math.floor(1000 + Math.random() * 9000);
            } else {
                bezbednoIme = unesenoIme;
            }
        }
        
        socket.playerName = bezbednoIme;
        socket.playerId = data.playerId || data.uid; 
        data.name = bezbednoIme; 
        
        if (stariPlayerId && stariPlayerId !== socket.playerId) {
            delete onlinePlayers[stariPlayerId];
        }

        if (socket.playerId) {
            onlinePlayers[socket.playerId] = socket.id;
            registeredSockets[socket.id] = socket.playerId;
        }

        if (!data.uid) {
            socket.playerStats = data.stats || { wins: 0, losses: 0 };
            updateOnlineCount(); 
            return;
        }

        try {
            if (!MONGO_URI) {
                updateOnlineCount(); 
                return;
            }

            let user = await UserProfile.findOne({ firebaseUid: data.uid });
            const s = data.stats || {}; 

            if (user) {
                user.playerName = data.name;
                user.lastLogin = Date.now();
                user.photoUrl = data.photoUrl || user.photoUrl; 
                
                if (s.activeSkin !== undefined && s.activeSkin !== null) user.activeSkin = s.activeSkin;
                if (s.activeEffect !== undefined && s.activeEffect !== null) user.activeEffect = s.activeEffect;
                if (s.activeTheme !== undefined && s.activeTheme !== null) user.activeTheme = s.activeTheme;
                if (s.soundEnabled !== undefined) user.soundEnabled = s.soundEnabled;
                if (s.vibrationEnabled !== undefined) user.vibrationEnabled = s.vibrationEnabled;

                if (s.penaltyPoints !== undefined && s.penaltyPoints > (user.penaltyPoints || 0)) {
                    user.penaltyPoints = s.penaltyPoints; 
                }
                
                // 🛡️ NOVO: Popravljena logika (INVENTORY DESYNC FIX)
                const isFreshLogin = (s.games === 0);
                const oldUserGames = user.games || 0;

                if (!isFreshLogin) {
                    if (s.games > user.games) user.games = s.games;
                    if (s.wins > user.wins) user.wins = s.wins;
                    if (s.losses > user.losses) user.losses = s.losses;
                    if (s.highscore > user.highscore) user.highscore = s.highscore;
                    if (s.totalScoreSum > user.totalScoreSum) user.totalScoreSum = s.totalScoreSum;
                    
                    if (typeof s.tournamentWins === 'number' && s.tournamentWins > user.tournamentWins) {
                        user.tournamentWins = s.tournamentWins;
                    }
                    if (typeof s.maxWinStreak === 'number' && s.maxWinStreak > (user.maxWinStreak || 0)) {
                        user.maxWinStreak = s.maxWinStreak;
                    }

                    if (typeof s.undoTokens === 'number') {
                        user.undoTokens = s.undoTokens;
                    }

                    if (typeof s.currentWinStreak === 'number') {
                        user.currentWinStreak = s.currentWinStreak; 
                    }
                }
                
                // 🛡️ SECURITY FIX: Da li je klijentova verzija statistike sinhronizovana
                const isClientSynced = (s.games >= oldUserGames);

                // ⚖️ FIX BALANSA: Izmešteno iz isFreshLogin
                if (typeof s.balance === 'number') {
                    const razlika = s.balance - user.balance;
                    if (isClientSynced) {
                        if (razlika > 80000) { 
                            console.log(`🚨 HACK POKUŠAJ: Igrač ${user.playerName} sumnjiv skok dukata!`);
                        } else {
                            user.balance = s.balance; 
                        }
                    } else {
                        if (s.balance > user.balance && razlika <= 80000) {
                            user.balance = s.balance;
                        }
                    }
                }
                
                // 🛡️ SECURITY FIX INVENTARA: Dodajemo u bazu SAMO ako je klijent sinhronizovan
                if (isClientSynced) {
                    if (s.unlockedTrophies && s.unlockedTrophies.length > 0) {
                        const mergedTrophies = new Set([...user.unlockedTrophies, ...s.unlockedTrophies]);
                        user.unlockedTrophies = Array.from(mergedTrophies);
                    }
                    if (s.unlockedSkins && s.unlockedSkins.length > 0) {
                        const mergedSkins = new Set([...user.unlockedSkins, ...s.unlockedSkins]);
                        user.unlockedSkins = Array.from(mergedSkins);
                    }
                    if (s.unlockedEffects && s.unlockedEffects.length > 0) {
                        const mergedEffects = new Set([...user.unlockedEffects, ...s.unlockedEffects]);
                        user.unlockedEffects = Array.from(mergedEffects);
                    }
                    if (s.yamb_unlocked && s.yamb_unlocked.length > 0) {
                        const mergedAll = new Set([...(user.yamb_unlocked || []), ...s.yamb_unlocked]);
                        user.yamb_unlocked = Array.from(mergedAll);
                    }
                }

                const todayStr = new Date().toDateString();
                
                if (user.lastDaily === todayStr) {
                    if (s.lastDaily !== todayStr) {
                        s.lastDaily = todayStr;
                    }
                } else {
                    if (s.lastDaily) {
                        user.lastDaily = s.lastDaily;
                    }
                }

                if (s.leagueData) {
                    if (s.leagueData.year > user.leagueData.year || 
                       (s.leagueData.year === user.leagueData.year && s.leagueData.quarter > user.leagueData.quarter)) {
                        user.leagueData = s.leagueData;
                    } else if (s.leagueData.year === user.leagueData.year && s.leagueData.quarter === user.leagueData.quarter) {
                        if (s.leagueData.baselineScore > user.leagueData.baselineScore) {
                            user.leagueData.baselineScore = s.leagueData.baselineScore;
                        }

                        // LEAGUE SAFEGUARD: Sprečavamo drastične padove zbog obrisanog LocalStorage-a
                        const cloudScore = user.leagueData.quarterlyScore || 0;
                        const localScore = s.leagueData.quarterlyScore || 0;
                        const dropDiff = cloudScore - localScore;

                        if (dropDiff > 4000) {
                            console.log(`🚨 LEAGUE SAFEGUARD: Odbijen pad sa ${cloudScore} na ${localScore} za igrača ${user.playerName}. Zadržavam Cloud verziju!`);
                            // Namerno NE preuzimamo localScore
                        } else {
                            if (!isFreshLogin || localScore > cloudScore) {
                                user.leagueData.quarterlyScore = localScore;
                            }
                        }
                    }
                }

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
                            
                            const localTotal = (localData.wins || 0) + (localData.losses || 0);
                            const cloudTotal = (cloudData.wins || 0) + (cloudData.losses || 0);
                            
                            if (localTotal > cloudTotal) {
                                cloudData.wins = localData.wins;
                                cloudData.losses = localData.losses;
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

                await user.save();
                
                socket.emit('sync_local_stats', { 
                    wins: user.wins, losses: user.losses, games: user.games,
                    highscore: user.highscore, totalScoreSum: user.totalScoreSum,
                    balance: user.balance, undoTokens: user.undoTokens, currentWinStreak: user.currentWinStreak,
                    maxWinStreak: user.maxWinStreak, 
                    tournamentWins: user.tournamentWins, 
                    activeSkin: user.activeSkin, 
                    activeTheme: user.activeTheme, 
                    activeEffect: user.activeEffect, 
                    unlockedTrophies: user.unlockedTrophies,
                    unlockedSkins: user.unlockedSkins,
                    unlockedEffects: user.unlockedEffects,
                    yamb_unlocked: user.yamb_unlocked, 
                    lastDaily: user.lastDaily, 
                    soundEnabled: user.soundEnabled,        
                    vibrationEnabled: user.vibrationEnabled,
                    penaltyPoints: user.penaltyPoints || 0, 
                    h2hStats: user.h2hStats, 
                    leagueData: user.leagueData 
                });
            } else {
                user = new UserProfile({
                    firebaseUid: data.uid,
                    playerName: data.name,
                    photoUrl: data.photoUrl || '',
                    wins: s.wins || 0, losses: s.losses || 0, games: s.games || 0,
                    highscore: s.highscore || 0, totalScoreSum: s.totalScoreSum || 0,
                    balance: s.balance || 0, undoTokens: s.undoTokens || 0, currentWinStreak: s.currentWinStreak || 0,
                    maxWinStreak: s.maxWinStreak || 0, 
                    tournamentWins: s.tournamentWins || 0, 
                    activeSkin: s.activeSkin || 'default', 
                    activeTheme: s.activeTheme || 'dark', 
                    activeEffect: s.activeEffect || 'confetti', 
                    soundEnabled: s.soundEnabled !== undefined ? s.soundEnabled : true,       
                    vibrationEnabled: s.vibrationEnabled !== undefined ? s.vibrationEnabled : true, 
                    penaltyPoints: s.penaltyPoints || 0,
                    h2hStats: s.h2hStats || {}, 
                    unlockedTrophies: s.unlockedTrophies || [],
                    unlockedSkins: s.unlockedSkins || [],
                    unlockedEffects: s.unlockedEffects || [],
                    yamb_unlocked: s.yamb_unlocked || [], 
                    lastDaily: s.lastDaily || "", 
                    leagueData: s.leagueData || { year: 0, quarter: 0, baselineScore: 0, quarterlyScore: 0 } 
                });
                await user.save();
                
                socket.emit('sync_local_stats', { 
                    wins: user.wins, losses: user.losses, games: user.games,
                    highscore: user.highscore, totalScoreSum: user.totalScoreSum,
                    balance: user.balance, undoTokens: user.undoTokens, currentWinStreak: user.currentWinStreak,
                    maxWinStreak: user.maxWinStreak, 
                    tournamentWins: user.tournamentWins, 
                    activeSkin: user.activeSkin, 
                    activeTheme: user.activeTheme, 
                    activeEffect: user.activeEffect, 
                    unlockedTrophies: user.unlockedTrophies,
                    unlockedSkins: user.unlockedSkins,
                    unlockedEffects: user.unlockedEffects,
                    yamb_unlocked: user.yamb_unlocked, 
                    lastDaily: user.lastDaily, 
                    soundEnabled: user.soundEnabled,        
                    vibrationEnabled: user.vibrationEnabled,
                    penaltyPoints: user.penaltyPoints || 0, 
                    h2hStats: user.h2hStats, 
                    leagueData: user.leagueData 
                });
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
                penaltyPoints: user.penaltyPoints || 0
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

    socket.on('back_to_menu', () => {
        const activeRoomId = playerRooms[socket.id];
        
        if (activeRoomId) {
            console.log(`📢 Igrač ${socket.id} se vratio u meni, napušta sobu ${activeRoomId}`);
            
            if (roomState[activeRoomId]) {
                const pid = registeredSockets[socket.id];
                if (pid) {
                    const penaltyAmount = getDynamicPenalty(activeRoomId);

                    let h2hKey = null;
                    const oppSocketId = roomState[activeRoomId].players.find(id => id !== socket.id);
                    const oppSocket = io.sockets.sockets.get(oppSocketId);
                    if (oppSocket) {
                        let safeOppName = oppSocket.playerName ? oppSocket.playerName.replace(/\./g, '_').replace(/\$/g, '_') : 'Nepoznat';
                        h2hKey = oppSocket.playerId ? oppSocket.playerId : safeOppName;
                    }

                    applyServerSidePenalty(pid, penaltyAmount, h2hKey);
                }
            }

            socket.to(activeRoomId).emit('opponent_left');
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

    const MAX_SCORE = 3500;       
    const MAX_NAME_LENGTH = 24;   
    const MIN_GAME_DURATION = 120000; 

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
            const { year, quarter, playerId } = data;
            
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
                await user.save();

                socket.emit('quarter_reward', { rank: rank, reward: rewardAmount });
            }

        } catch (err) {
            console.error("Greška pri proveri kvartalne nagrade:", err);
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
            
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const dayOfWeek = now.getDay() || 7; 
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);

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
            
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (period === 'weekly') {
                const dayOfWeek = now.getDay() || 7; 
                const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
                matchFilter.date = { $gte: startOfWeek };
            } else if (period === 'monthly') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                matchFilter.date = { $gte: startOfMonth };
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

    socket.on('submit_score', async (data) => {
        try {
            if (!MONGO_URI) return;

            if (typeof data.score !== 'number' || isNaN(data.score)) return; 

            const finalUid = socket.playerId || data.uid || data.playerId;

            if (!finalUid || finalUid.startsWith('guest_') || finalUid.length < 20) return;

            if (data.score < 0 || data.score > MAX_SCORE) {
                console.log(`🚨 HACK POKUŠAJ (Value): ${socket.id} šalje nemoguć skor: ${data.score}`);
                return; 
            }

            const startTime = gameStartTimes[socket.id];
            
            if (data.score > 50 && (!startTime || (Date.now() - startTime < MIN_GAME_DURATION))) {
                const duration = startTime ? (Date.now() - startTime) : "N/A";
                console.log(`⚠️ UPOZORENJE (Speed): Trajanje: ${duration}ms. Ipak upisujem skor: ${data.score}`);
            }

            let finalName = socket.playerName || data.playerName || "Nepoznat Igrač";
            let finalPhoto = socket.photoUrl || data.photoUrl || '';
            
            const newScore = new Score({
                playerId: finalUid, 
                playerName: finalName,
                score: data.score,
                mode: data.mode || 'Solo',
                photoUrl: finalPhoto, 
                date: data.date || Date.now()
            });
            
            await newScore.save();
            console.log(`✅ USPEŠAN UPIS: ${finalName} (UID: ${finalUid}) -> ${data.score} (${newScore.mode})`);
            
            delete gameStartTimes[socket.id];

        } catch (err) {
            console.error("❌ Greška pri upisu u MongoDB:", err);
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

    socket.on('submit_league_score', async (data) => {
        try {
            if (!MONGO_URI) return;
            if (typeof data.score !== 'number' || isNaN(data.score)) return;

            let uniqueId = data.uid || data.playerId || socket.playerId || socket.id;
            
            if (uniqueId && uniqueId.startsWith('guest_')) {
                return;
            }

            let rawName = (data.playerName || "Nepoznat Igrač").trim().substring(0, 24);
            let finalName = sadrziPsovku(rawName) 
                ? "Igrač_" + Math.floor(1000 + Math.random() * 9000) 
                : rawName;

            if (finalName.length === 0) finalName = "Nepoznat Igrač";

            const currentDoc = await LeagueScore.findOne({ playerId: uniqueId, year: data.year, quarter: data.quarter });
            if (currentDoc) {
                const diff = currentDoc.score - data.score;
                if (diff > 4000) {
                    console.log(`🚨 LEADERBOARD SAFEGUARD: Blokiran overwrite tabele sa ${currentDoc.score} na ${data.score}`);
                    return; 
                }
            }

            await LeagueScore.findOneAndUpdate(
                { playerId: uniqueId, year: data.year, quarter: data.quarter }, 
                { 
                    $set: { 
                        playerName: finalName, 
                        photoUrl: data.photoUrl || '', 
                        date: Date.now(),
                        score: data.score 
                    }
                }, 
                { upsert: true, new: true } 
            );
            
        } catch (err) {
            console.error("Greška pri upisu u kvartalnu ligu:", err);
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
                                penaltyPoints: f.penaltyPoints || 0
                            }
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
        const { targetSocketId, roomId, hostName } = data;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
            // FIX: Zabrana poziva u privatnu sobu ako je igrač već u online partiji
            const targetRoom = playerRooms[targetSocketId];
            if (targetRoom && !targetRoom.startsWith('local_')) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

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
    
    socket.on('request_state_sync', () => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            if (roomState[roomId]) {
                const state = roomState[roomId];
                console.log(`🛡️ SERVER SYNC: Šaljem bezbedno autoritativno stanje sobe ${roomId} igraču ${socket.id}`);
                
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
            } else {
                socket.to(roomId).emit('request_state_sync', { senderSocketId: socket.id });
            }
        }
    });

    socket.on('sync_state_response', (data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            // FIX ZA UNDO TOKENE: Ako server ima autoritativno stanje, ažuriraj ga (Rollback)
            if (roomState[roomId]) {
                roomState[roomId].allScores = data.allScores || roomState[roomId].allScores;
                roomState[roomId].turnIndex = data.currentPlayerIdx !== undefined ? data.currentPlayerIdx : roomState[roomId].turnIndex;
                roomState[roomId].brojBacanja = data.brojBacanja || 0;
                roomState[roomId].kockiceVals = data.kockiceVals || [0,0,0,0,0,0];
                roomState[roomId].zadrzane = data.zadrzane || [false,false,false,false,false,false];
                roomState[roomId].najavaAktivna = data.najavaAktivna || false;
                roomState[roomId].najavljenoPolje = data.najavljenoPolje || null;
                
                // DODATO: Oduzmi potez za statistiku ako je vraćen unazad
                if (data.brojBacanja === 0) {
                    roomState[roomId].moveCount = Math.max(0, (roomState[roomId].moveCount || 0) - 1);
                }

                // Pošto je potez vraćen unazad, resetujemo i autoritativni tajmer
                startTurnTimer(roomId);
            }
            
            // Prosledi protivniku kako bi mu se tabla vizuelno vratila unazad
            socket.to(roomId).emit('sync_state_response', data);
        }
    });

    socket.on('chat_msg', (data) => relayEvent('chat_msg', data));

    socket.on('request_global_chat_history', () => {
        socket.emit('global_chat_history', globalChatHistory);
    });

    socket.on('global_chat_msg', (data) => {
        if (!data || !data.msg) return;
        
        let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

        const now = Date.now();

        if (chatBans[clientIp] && chatBans[clientIp].banUntil > now) {
            socket.emit('error_msg', 'err_chat_suspended');
            return; 
        }

        const safeSender = (data.sender || 'Nepoznat').toString().substring(0, 20);
        const originalMsg = data.msg.toString().substring(0, 200); 

        const safeMsg = cenzurisiPoruku(originalMsg);

        if (safeMsg !== originalMsg) {
            if (!chatBans[clientIp]) {
                chatBans[clientIp] = { strikes: 0, banUntil: 0 };
            }
            chatBans[clientIp].strikes += 1; 
            
            const satiBana = Math.pow(2, chatBans[clientIp].strikes - 1);
            const banTrajanjeMs = satiBana * 60 * 60 * 1000;
            chatBans[clientIp].banUntil = now + banTrajanjeMs;

            socket.emit('error_msg', 'err_chat_banned');
            return; 
        }

        const chatObj = {
            sender: safeSender,
            senderId: socket.id, 
            msg: safeMsg
        };

        globalChatHistory.push(chatObj);
        if (globalChatHistory.length > MAX_CHAT_HISTORY) {
            globalChatHistory.shift();
        }

        saveChatToDb();
        io.emit('global_chat_msg', chatObj);
    });

    socket.on('send_challenge', (data) => {
        const { targetId, challengerName } = data;
        const targetSocket = io.sockets.sockets.get(targetId);
        
        if (targetSocket) {
            // FIX: Zabrana izazova ako je igrač u sred online partije
            const targetRoom = playerRooms[targetId];
            if (targetRoom && !targetRoom.startsWith('local_')) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

            socket.to(targetId).emit('incoming_challenge', {
                challengerId: socket.id,
                challengerName: challengerName || "Gost"
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

    // FIX 1: OČISTI SOBU NA KRAJU I UGASNI STATE
    socket.on('game_over', () => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            console.log(`🏁 Igra završena u sobi: ${roomId}`);
            // FIX: Brišemo igrača iz sobe i gasimo state sobe kako ne bi dobio rage quit kaznu pri izlasku!
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
                roomState[roomId] = { 
                    players: playersArr, 
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

    socket.on('tourney_register', (playerData) => {
        if (tournamentState.status === 'registration' && tournamentState.players.length < 8) {
            const alreadyRegistered = tournamentState.players.find(p => p.id === playerData.id);
            if (!alreadyRegistered) {
                tournamentState.players.push({ 
                    id: playerData.id, 
                    name: playerData.name, 
                    photoUrl: playerData.photoUrl || '',
                    pi: playerData.pi || '0'
                });
                
                if (tournamentState.players.length === 8) {
                    generateTournamentBracket(); 
                } else {
                    saveTournamentToDb(); 
                }
                io.emit('tourney_state_update', tournamentState);
            }
        }
    });

    socket.on('tourney_update_pi', (data) => {
        const { id, pi } = data;
        let updated = false;

        const player = tournamentState.players.find(p => p.id === id);
        if (player && player.pi !== pi) {
            player.pi = pi;
            updated = true;
        }

        if (tournamentState.bracket) {
            ['qf', 'sf', 'f'].forEach(round => {
                if (tournamentState.bracket[round]) {
                    tournamentState.bracket[round].forEach(match => {
                        if (match) {
                            if (match.p1 && match.p1.id === id && match.p1.pi !== pi) {
                                match.p1.pi = pi;
                                updated = true;
                            }
                            if (match.p2 && match.p2.id === id && match.p2.pi !== pi) {
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

    socket.on('tourney_unregister', (playerId) => {
        if (tournamentState.status === 'registration') {
            const index = tournamentState.players.findIndex(p => p.id === playerId);
            if (index !== -1) {
                tournamentState.players.splice(index, 1);
                saveTournamentToDb(); 
                io.emit('tourney_state_update', tournamentState);
                console.log(`↩️ Poništena prijava za turnir: ${playerId}`);
            }
        }
    });

    socket.on('tourney_propose_time', (data) => {
        const { round, index, proposedTime, playerId } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match && (match.p1.id === playerId || match.p2.id === playerId)) {
            match.proposedTime = proposedTime;
            match.proposedById = playerId;
            match.timeAccepted = false;
            match.time = null;
            saveTournamentToDb(); 
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_accept_time', (data) => {
        const { round, index } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match) {
            match.timeAccepted = true;
            match.time = match.proposedTime;
            saveTournamentToDb(); 
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_start_duel', (data) => {
        const { matchRoomId, targetId, opponentName } = data;
        
        if (onlinePlayers[targetId]) {
            // FIX: Zabrana i za turnire
            const targetRoom = playerRooms[onlinePlayers[targetId]];
            if (targetRoom && !targetRoom.startsWith('local_')) {
                socket.emit('error_msg', 'err_player_busy');
                return;
            }

            io.to(onlinePlayers[targetId]).emit('tourney_duel_ready', { matchRoomId, targetId: targetId, opponentName: opponentName });
            socket.emit('tourney_join_allowed', matchRoomId);
        } else {
            socket.emit('error_msg', 'err_tourney_opp_offline');
        }
    });

    socket.on('tourney_submit_winner', async (data) => {
        const { round, index, winnerId } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match && match.winnerId === null) {
            match.winnerId = winnerId;
            const winnerObj = match.p1.id === winnerId ? match.p1 : match.p2;
            advanceTournamentBracket(round, index, winnerObj); 
            io.emit('tourney_state_update', tournamentState);

            if (round === 'f') {
                try {
                    if (MONGO_URI) {
                        await TourneyStats.findOneAndUpdate(
                            { playerId: winnerObj.id },
                            { $set: { playerName: winnerObj.name, lastWinDate: Date.now() }, $inc: { wins: 1 } },
                            { upsert: true, new: true }
                        );
                        const stats = await TourneyStats.find().sort({ wins: -1 }).limit(20).lean();
                        io.emit('tourney_stats_data', stats);
                    }
                } catch (err) {
                    console.error("Greška pri upisu pobednika turnira u bazu:", err);
                }
            }
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

            // FIX 2: PROVERA DA LI JE IGRA ONLINE PRE NEGO ŠTO KAZNIMO IGRAČA
            disconnectTimers[pid] = setTimeout(() => {
                console.log(`❌ Grace Period istekao za ${pid}. Partija se trajno prekida.`);
                
                // FIX: Provera da li je igra uopšte ONLINE (ima state) pre nego što lupimo kaznu
                if (roomState[activeRoomId]) {
                    const penaltyAmount = getDynamicPenalty(activeRoomId);

                    let h2hKey = null;
                    const oppSocketId = roomState[activeRoomId].players.find(id => id !== ghostSessions[pid]?.oldSocketId);
                    const oppSocket = io.sockets.sockets.get(oppSocketId);
                    if (oppSocket) {
                        let safeOppName = oppSocket.playerName ? oppSocket.playerName.replace(/\./g, '_').replace(/\$/g, '_') : 'Nepoznat';
                        h2hKey = oppSocket.playerId ? oppSocket.playerId : safeOppName;
                    }

                    applyServerSidePenalty(pid, penaltyAmount, h2hKey); 
                } else {
                    console.log(`ℹ️ Igrač ${pid} je napustio završenu, solo ili lokalnu partiju. Bez kazne.`);
                }

                io.to(activeRoomId).emit('opponent_left');
                
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