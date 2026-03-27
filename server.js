// server.js - FIX: KOMPLETAN CLOUD SAVE SISTEM + ISKLJUČENA SPEED HACK ZAŠTITA + FILTER + BANOVANJE + TURNIR + ZAŠTITA OD NULA (FRESH INSTALL) + KVARTALNA LIGA MAX FIX + ODVAJANJE GOSTIJU OD UID-a + ALL TIME LIGA + SHOP FIX + DUKATI SAFEGUARD + DNEVNI IZAZOV + SISTEM PRIJATELJA I SLIKA + ONLINE STATUS FIX + SINHRONIZOVANO ODBIJANJE PRIJATELJSTVA + FRIEND REQUEST QUEUE + THEME OVERWRITE FIX + GRACE PERIOD STABILITY + STATE SYNC + ANTI TROLL TIMER + VATRENI NIZ MAX FIX + SPECTATOR MODE + ISPLAYING & ISFRIEND FLAGS + QUARTERLY REWARDS + PREVIOUS QUARTER WINNER + HALL OF FAME + LEAN DATA FIX + MULTILANGUAGE ERROR KEYS + POWER INDEX + TOURNAMENT CLOUD SAVE + LIVE PI SYNC

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
    playerName: String,
    score: Number,
    mode: String, 
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

// --- NOVO: MONGODB ŠEMA ZA AKTIVNI TURNIR ---
const TournamentStateSchema = new mongoose.Schema({
    status: { type: String, default: 'registration' },
    players: { type: Array, default: [] },
    bracket: { type: Object, default: { qf: [null, null, null, null], sf: [null, null], f: [null] } }
});
mongoose.model('TournamentState', TournamentStateSchema);

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

// GRACE PERIOD PROMENLJIVE
const disconnectTimers = {}; 
const ghostSessions = {}; 

// ANTI-TROLL TAJMER
const roomTimers = {};
const roomState = {};

function resetTurnTimer(roomId) {
    if (roomTimers[roomId]) clearTimeout(roomTimers[roomId]);
    
    roomTimers[roomId] = setTimeout(() => {
        const state = roomState[roomId];
        if (state) {
            const trollIdx = state.turnIndex;
            const winnerIdx = trollIdx === 0 ? 1 : 0;
            const winnerId = state.players[winnerIdx];
            
            console.log(`⏱️ TIMEOUT: Isteklo 60s u sobi ${roomId}. Pobednik je ${winnerId}`);
            io.to(roomId).emit('game_timeout', { winnerId: winnerId });
            
            delete roomState[roomId];
            delete roomTimers[roomId];
        }
    }, 60000); 
}

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
    saveTournamentToDb(); // <-- SAČUVAJ U BAZU
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
    saveTournamentToDb(); // <-- SAČUVAJ U BAZU
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

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {
    
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

    activeConnections.set(socket.id, clientIp);
    console.log(`🔗 Novi klijent: ${socket.id} (IP: ${clientIp})`);

    updateOnlineCount();

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
                
                const isFreshLogin = (s.games === 0);

                if (!isFreshLogin) {
                    const oldUserGames = user.games;

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

                    if (typeof s.balance === 'number') {
                        const razlika = s.balance - user.balance;
                        if (s.games >= oldUserGames) {
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

                    if (typeof s.currentWinStreak === 'number') {
                        user.currentWinStreak = s.currentWinStreak; 
                    }
                }
                
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

                if (s.lastDaily) user.lastDaily = s.lastDaily;

                if (s.leagueData) {
                    if (s.leagueData.year > user.leagueData.year || 
                       (s.leagueData.year === user.leagueData.year && s.leagueData.quarter > user.leagueData.quarter)) {
                        user.leagueData = s.leagueData;
                    } else if (s.leagueData.year === user.leagueData.year && s.leagueData.quarter === user.leagueData.quarter) {
                        if (s.leagueData.baselineScore > user.leagueData.baselineScore) {
                            user.leagueData.baselineScore = s.leagueData.baselineScore;
                        }
                        if (s.leagueData.quarterlyScore > (user.leagueData.quarterlyScore || 0)) {
                            user.leagueData.quarterlyScore = s.leagueData.quarterlyScore;
                        }
                    }
                }

                await user.save();
                
                socket.emit('sync_local_stats', { 
                    wins: user.wins, losses: user.losses, games: user.games,
                    highscore: user.highscore, totalScoreSum: user.totalScoreSum,
                    balance: user.balance, currentWinStreak: user.currentWinStreak,
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
                    leagueData: user.leagueData 
                });
            } else {
                user = new UserProfile({
                    firebaseUid: data.uid,
                    playerName: data.name,
                    photoUrl: data.photoUrl || '',
                    wins: s.wins || 0, losses: s.losses || 0, games: s.games || 0,
                    highscore: s.highscore || 0, totalScoreSum: s.totalScoreSum || 0,
                    balance: s.balance || 0, currentWinStreak: s.currentWinStreak || 0,
                    maxWinStreak: s.maxWinStreak || 0, 
                    tournamentWins: s.tournamentWins || 0, 
                    activeSkin: s.activeSkin || 'default', 
                    activeTheme: s.activeTheme || 'dark', 
                    activeEffect: s.activeEffect || 'confetti', 
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
                    balance: user.balance, currentWinStreak: user.currentWinStreak,
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
                leagueData: user.leagueData
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
            socket.to(activeRoomId).emit('opponent_left');
            delete playerRooms[socket.id];
            
            if (roomTimers[activeRoomId]) {
                clearTimeout(roomTimers[activeRoomId]);
                delete roomTimers[activeRoomId];
            }
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

            io.to(targetSocketId).emit('request_state_sync', { senderSocketId: socket.id });
            console.log(`👁️ Igrač ${socket.id} počeo da gleda sobu ${roomId}`);
        } else {
            socket.emit('error_msg', 'err_spectate_not_in_game');
        }
    });

    socket.on('stop_spectating', () => {
        if (socket.spectatingRoom) {
            socket.leave(socket.spectatingRoom);
            console.log(`👁️ Igrač ${socket.id} je prestao da gleda sobu ${socket.spectatingRoom}`);
            socket.isSpectator = false;
            socket.spectatingRoom = null;
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

    // --- PROVERA I DODELA NAGRADA ZA KVARTALNU LIGU ---
    socket.on('check_quarter_reward', async (data) => {
        try {
            if (!MONGO_URI) return;
            const { year, quarter, playerId } = data;
            
            if (!year || !quarter || !playerId) return;

            const rewardKey = `${year}-Q${quarter}`;

            const user = await UserProfile.findOne({ firebaseUid: playerId });
            if (!user) return;

            if (user.claimedLeagueRewards && user.claimedLeagueRewards.includes(rewardKey)) {
                console.log(`⚠️ Igrač ${user.playerName} je već preuzeo nagradu za ${rewardKey}.`);
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
                console.log(`🏆 NAGRADA: Igrač ${user.playerName} je osvojio ${rewardAmount} dukata za ${rank}. mesto u kvartalu ${rewardKey}!`);
            }

        } catch (err) {
            console.error("Greška pri proveri kvartalne nagrade:", err);
        }
    });

    // --- DOHVATANJE POBEDNIKA PROŠLOG KVARTALA ---
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

    // --- DVORANA SLAVNIH (HALL OF FAME) ---
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

    socket.on('get_global_highscores', async (period) => {
        try {
            if (!MONGO_URI) return; 

            let filter = {};
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (period === 'weekly') {
                const dayOfWeek = now.getDay() || 7; 
                const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
                filter.date = { $gte: startOfWeek };
            } else if (period === 'monthly') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                filter.date = { $gte: startOfMonth };
            }

            const scores = await Score.find(filter).sort({ score: -1 }).limit(50).lean();
            socket.emit('global_highscores_data', scores);
        } catch (err) {
            console.error("Greška pri dohvatanju skorova:", err);
            socket.emit('global_highscores_data', []); 
        }
    });

    socket.on('submit_score', async (data) => {
        try {
            if (!MONGO_URI) return;

            if (typeof data.score !== 'number' || isNaN(data.score)) return; 

            if (data.score < 0 || data.score > MAX_SCORE) {
                console.log(`🚨 HACK POKUŠAJ (Value): ${socket.id} šalje nemoguć skor: ${data.score}`);
                return; 
            }

            const startTime = gameStartTimes[socket.id];
            
            if (data.score > 50 && (!startTime || (Date.now() - startTime < MIN_GAME_DURATION))) {
                const duration = startTime ? (Date.now() - startTime) : "N/A";
                console.log(`⚠️ UPOZORENJE (Speed): Trajanje: ${duration}ms. Ipak upisujem skor: ${data.score}`);
            }

            let finalName = "Nepoznat Igrač";
            let rawName = data.name || data.playerName;

            if (rawName && typeof rawName === 'string') {
                let unesenoIme = rawName.trim().substring(0, MAX_NAME_LENGTH);
                if (sadrziPsovku(unesenoIme)) {
                    finalName = "Igrač_" + Math.floor(1000 + Math.random() * 9000);
                } else {
                    finalName = unesenoIme;
                }
            }

            if (finalName.length === 0) finalName = "Nepoznat Igrač";
            
            const newScore = new Score({
                playerName: finalName,
                score: data.score,
                mode: data.mode || 'Solo',
                date: data.date || Date.now()
            });
            
            await newScore.save();
            console.log(`✅ USPEŠAN UPIS: ${finalName} -> ${data.score}`);
            
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
                console.log(`⚠️ ZABRANJEN UPIS U LIGU: Gost igrač (${uniqueId}) ne može učestvovati.`);
                return;
            }

            let rawName = (data.playerName || "Nepoznat Igrač").trim().substring(0, 24);
            let finalName = sadrziPsovku(rawName) 
                ? "Igrač_" + Math.floor(1000 + Math.random() * 9000) 
                : rawName;

            if (finalName.length === 0) finalName = "Nepoznat Igrač";

            await LeagueScore.findOneAndUpdate(
                { playerId: uniqueId, year: data.year, quarter: data.quarter }, 
                { 
                    $set: { playerName: finalName, photoUrl: data.photoUrl || '', date: Date.now() },
                    $max: { score: data.score }
                }, 
                { upsert: true, new: true } 
            );
            
            console.log(`🏆 LIGA UPIS: ${finalName} (${uniqueId}) -> ${data.score} PTS (Q${data.quarter}/${data.year})`);
        } catch (err) {
            console.error("Greška pri upisu u kvartalnu ligu:", err);
        }
    });

    socket.on('get_streak_leaderboard', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('streak_leaderboard_data', []);
                return;
            }

            const topStreaks = await UserProfile.find({ maxWinStreak: { $gt: 0 } })
                .sort({ maxWinStreak: -1 })
                .limit(20)
                .select('firebaseUid playerName photoUrl maxWinStreak')
                .lean();

            const dataToSend = topStreaks.map(p => ({
                uid: p.firebaseUid,
                name: p.playerName,
                photoUrl: p.photoUrl || '',
                streak: p.maxWinStreak 
            }));

            socket.emit('streak_leaderboard_data', dataToSend);
        } catch (err) {
            console.error("Greška pri dohvatanju streak liste:", err);
            socket.emit('streak_leaderboard_data', []);
        }
    });

    // ==================================================================
    // RANG LISTA ZA INDEKS MOĆI (POWER INDEX)
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

                const power = Math.round(
                    (rate * 10) + (leaguePts * 0.02) + (tourneyWins * 300) + 
                    (avg * 0.5) + (hs * 0.2) + (maxStreak * 30) + (trophyCount * 50)
                );

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
                            stats: { wins: f.wins, losses: f.losses, games: f.games, highscore: f.highscore, totalScoreSum: f.totalScoreSum, tournamentWins: f.tournamentWins, currentWinStreak: f.currentWinStreak, maxWinStreak: f.maxWinStreak, unlockedTrophies: f.unlockedTrophies, leagueData: f.leagueData }
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
        socket.to(targetSocketId).emit('incoming_room_invite', { roomId, hostName });
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

                roomState[roomId] = { players: [opponentId, socket.id], turnIndex: 0 };
                resetTurnTimer(roomId);

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

            roomState[roomId] = { players: [p1.id, socket.id], turnIndex: 0 };
            resetTurnTimer(roomId);

            delete privateRooms[roomId]; 
        } else {
            socket.emit('room_full');
        }
    });

    const relayEvent = (eventName, data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            socket.to(roomId).emit(eventName, data);

            if (eventName === 'remote_move' && roomState[roomId]) {
                roomState[roomId].turnIndex = roomState[roomId].turnIndex === 0 ? 1 : 0;
                resetTurnTimer(roomId);
            }
        }
    };

    socket.on('dice_roll', (data) => relayEvent('remote_roll', data));
    socket.on('dice_hold', (data) => relayEvent('remote_hold', data));
    socket.on('player_move', (data) => relayEvent('remote_move', data));
    socket.on('announce', (data) => relayEvent('remote_announce', data));
    
    socket.on('request_state_sync', () => relayEvent('request_state_sync', { senderSocketId: socket.id }));
    socket.on('sync_state_response', (data) => relayEvent('sync_state_response', data));
    
    socket.on('chat_msg', (data) => relayEvent('chat_msg', data));

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

            console.log(`🔨 MUTE BAN: IP ${clientIp} je mutiran na ${satiBana}h. (Prekršaj br: ${chatBans[clientIp].strikes})`);
            socket.emit('error_msg', 'err_chat_banned');
            return; 
        }

        io.emit('global_chat_msg', {
            sender: safeSender,
            senderId: socket.id, 
            msg: safeMsg
        });
        
        console.log(`🌍 GLOBAL CHAT | ${safeSender}: ${safeMsg}`);
    });

    socket.on('send_challenge', (data) => {
        const { targetId, challengerName } = data;
        const targetSocket = io.sockets.sockets.get(targetId);
        
        if (targetSocket) {
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

            roomState[roomName] = { players: [challengerId, socket.id], turnIndex: 0 };
            resetTurnTimer(roomName);

        } else {
            if (challengerSocket) {
                socket.to(challengerId).emit('challenge_declined', {});
            }
        }
    });

    socket.on('game_over', () => {
        const roomId = playerRooms[socket.id];
        if (roomId) console.log(`🏁 Igra završena u sobi: ${roomId}`);
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
                roomState[roomId] = { players: playersArr, turnIndex: 0 };
                resetTurnTimer(roomId);
            }

            console.log(`🔄 Revanš pokrenut u sobi: ${roomId}`);
        }
    });

    // ==================================================================
    // --- SOCKET LOGIKA ZA TURNIR (SA DODATIM ČUVANJEM U BAZU) ---
    // ==================================================================
    
    socket.on('tourney_reset', () => {
        console.log("⚠️ TURNIR JE RESETOVAN OD STRANE KORISNIKA!");
        tournamentState = {
            status: 'registration',
            players: [],
            bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] }
        };
        saveTournamentToDb(); // <-- SAČUVAJ U BAZU
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
                // DODATO ZA INDEKS MOĆI (pi) I SLIKU
                tournamentState.players.push({ 
                    id: playerData.id, 
                    name: playerData.name, 
                    photoUrl: playerData.photoUrl || '',
                    pi: playerData.pi || '0'
                });
                
                if (tournamentState.players.length === 8) {
                    generateTournamentBracket(); // Ovo takođe snima u bazu
                } else {
                    saveTournamentToDb(); // <-- SAČUVAJ U BAZU DOK JOS TRAJU PRIJAVE
                }
                io.emit('tourney_state_update', tournamentState);
            }
        }
    });

    // --- NOVO: AUTO-SINHRONIZACIJA INDEKSA MOĆI (PI) UŽIVO ---
    socket.on('tourney_update_pi', (data) => {
        const { id, pi } = data;
        let updated = false;

        // 1. Ažuriraj u listi prijavljenih igrača (Faza registracije)
        const player = tournamentState.players.find(p => p.id === id);
        if (player && player.pi !== pi) {
            player.pi = pi;
            updated = true;
        }

        // 2. Ažuriraj svuda u kosturu ako je turnir aktivan
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

        // 3. Ako je bilo promena, snimi i obavesti sve
        if (updated) {
            saveTournamentToDb(); 
            io.emit('tourney_state_update', tournamentState); 
        }
    });
    // ---------------------------------------------------------

    socket.on('tourney_unregister', (playerId) => {
        if (tournamentState.status === 'registration') {
            const index = tournamentState.players.findIndex(p => p.id === playerId);
            if (index !== -1) {
                tournamentState.players.splice(index, 1);
                saveTournamentToDb(); // <-- SAČUVAJ U BAZU
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
            saveTournamentToDb(); // <-- SAČUVAJ U BAZU
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_accept_time', (data) => {
        const { round, index } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match) {
            match.timeAccepted = true;
            match.time = match.proposedTime;
            saveTournamentToDb(); // <-- SAČUVAJ U BAZU
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_start_duel', (data) => {
        const { matchRoomId, targetId, opponentName } = data;
        
        if (onlinePlayers[targetId]) {
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
            advanceTournamentBracket(round, index, winnerObj); // Ovo sada interno zove saveTournamentToDb()
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
    // 6. DISKONEKCIJA (SA GRACE PERIOD TOLERANCIJOM OD 30 SEKUNDI)
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('⚠️ Klijent izgubio vezu:', socket.id);
        
        activeConnections.delete(socket.id);
        const pid = registeredSockets[socket.id];
        const activeRoomId = playerRooms[socket.id];

        if (pid && activeRoomId) {
            console.log(`⏳ Pokrećem Grace Period od 30s za igrača: ${pid}`);
            
            ghostSessions[pid] = {
                roomId: activeRoomId,
                oldSocketId: socket.id
            };

            disconnectTimers[pid] = setTimeout(() => {
                console.log(`❌ Grace Period istekao za ${pid}. Partija se trajno prekida.`);
                
                io.to(activeRoomId).emit('opponent_left');
                
                delete playerRooms[ghostSessions[pid]?.oldSocketId];
                
                if (roomTimers[activeRoomId]) {
                    clearTimeout(roomTimers[activeRoomId]);
                    delete roomTimers[activeRoomId];
                }
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
                
                if (roomTimers[activeRoomId]) {
                    clearTimeout(roomTimers[activeRoomId]);
                    delete roomTimers[activeRoomId];
                }
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