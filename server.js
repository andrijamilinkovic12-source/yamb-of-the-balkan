// server.js - FIX: KOMPLETAN CLOUD SAVE SISTEM + ISKLJUČENA SPEED HACK ZAŠTITA + FILTER + BANOVANJE + TURNIR + ZAŠTITA OD NULA (FRESH INSTALL) + KVARTALNA LIGA MAX FIX + ODVAJANJE GOSTIJU OD UID-a + ALL TIME LIGA + SHOP FIX + DUKATI SAFEGUARD + DNEVNI IZAZOV + SISTEM PRIJATELJA I SLIKA

require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const https = require('https'); // Dodato za Self-Ping mehanizam

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
// --- MONGODB KONEKCIJA (POBOLJŠANA) ---
// ==================================================================
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, 
        socketTimeoutMS: 45000,        
    })
    .then(() => console.log('✅ MongoDB connected & stable!'))
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

const UserProfileSchema = new mongoose.Schema({
    firebaseUid: { type: String, unique: true, required: true },
    playerName: String,
    photoUrl: { type: String, default: '' }, // NOVO: Slika sa Google naloga
    friends: { type: [String], default: [] }, // NOVO: Prijatelji
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

// --- REST API RUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// --- GLOBALNE PROMENLJIVE ZA IGRU ---
let waitingPlayer = null; 
let privateRooms = {};    
let playerRooms = {};     
let gameStartTimes = {}; 
const chatBans = {}; 
const onlinePlayers = {};     
const registeredSockets = {}; 

let tournamentState = {
    status: 'registration',
    players: [], 
    bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] }
};

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
    });

    socket.on('set_player_data', async (data) => {
        socket.photoUrl = data.photoUrl || ''; // Server pamti sliku igrača

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
        
        if (!data.uid) {
            // GOST IGRAČ
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
                user.photoUrl = data.photoUrl || user.photoUrl; // Ažuriranje slike
                
                if (s.activeSkin) user.activeSkin = s.activeSkin;
                if (s.activeEffect) user.activeEffect = s.activeEffect;
                if (s.activeTheme) user.activeTheme = s.activeTheme;
                
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

                    if (typeof s.currentWinStreak === 'number' && s.currentWinStreak > user.currentWinStreak) {
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
                    photoUrl: data.photoUrl || '', // Slika za novog igrača
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
                photoUrl: clientSocket.photoUrl, // Šaljemo sliku klijentu
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

    const MAX_SCORE = 3500;       
    const MAX_NAME_LENGTH = 24;   
    const MIN_GAME_DURATION = 120000; 

    socket.on('game_session_start', () => {
        gameStartTimes[socket.id] = Date.now();
        console.log(`⏱️ Igrač ${socket.id} započeo partiju u ${new Date().toLocaleTimeString()}`);
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

            const scores = await Score.find(filter).sort({ score: -1 }).limit(50);
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
            
            const { year, quarter } = reqData;
            
            const scores = await LeagueScore.find({ year: year, quarter: quarter })
                                            .sort({ score: -1 })
                                            .limit(50);
                                            
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
                    $set: { playerName: finalName, date: Date.now() },
                    $max: { score: data.score }
                }, 
                { upsert: true, new: true } 
            );
            
            console.log(`🏆 LIGA UPIS: ${finalName} (${uniqueId}) -> ${data.score} PTS (Q${data.quarter}/${data.year})`);
        } catch (err) {
            console.error("Greška pri upisu u kvartalnu ligu:", err);
        }
    });

    // --- SISTEM PRIJATELJA ---
    socket.on('send_friend_req', (data) => {
        const { targetId, challengerName } = data;
        socket.to(targetId).emit('incoming_friend_req', {
            challengerId: socket.id,
            challengerName: challengerName || "Gost"
        });
    });

    socket.on('friend_req_response', async (data) => {
        const { challengerId, accepted } = data;
        const challengerSocket = io.sockets.sockets.get(challengerId);

        if (accepted && MONGO_URI) {
            try {
                const me = await UserProfile.findOne({ firebaseUid: socket.playerId });
                if (me && challengerSocket && challengerSocket.playerId) {
                    const friend = await UserProfile.findOne({ firebaseUid: challengerSocket.playerId });
                    if (friend) {
                        if (!me.friends.includes(friend.firebaseUid)) me.friends.push(friend.firebaseUid);
                        if (!friend.friends.includes(me.firebaseUid)) friend.friends.push(me.firebaseUid);
                        await me.save();
                        await friend.save();

                        // Obavesti igrača koji je poslao zahtev
                        io.to(challengerId).emit('friend_req_accepted', { name: socket.playerName });
                        
                        // Obavesti i igrača koji je upravo PRIHVATIO zahtev
                        socket.emit('friend_req_accepted', { name: friend.playerName });
                    }
                }
            } catch(err) { console.error("Greška pri dodavanju prijatelja", err); }
        } else if (!accepted && challengerSocket) {
            io.to(challengerId).emit('error_msg', 'Igrač je odbio zahtev za prijateljstvo.');
        }
    });

    socket.on('get_friends_list', async () => {
        if (!MONGO_URI) return;
        try {
            const me = await UserProfile.findOne({ firebaseUid: socket.playerId });
            if (me && me.friends && me.friends.length > 0) {
                const friends = await UserProfile.find({ firebaseUid: { $in: me.friends } });
                const friendsData = friends.map(f => {
                    const isOnline = Object.keys(onlinePlayers).includes(f.firebaseUid);
                    let friendSocketId = isOnline ? onlinePlayers[f.firebaseUid] : null;

                    return { 
                        uid: f.firebaseUid, 
                        socketId: friendSocketId,
                        name: f.playerName, 
                        photoUrl: f.photoUrl, 
                        isOnline: isOnline,
                        stats: { wins: f.wins, losses: f.losses, games: f.games, highscore: f.highscore, totalScoreSum: f.totalScoreSum, tournamentWins: f.tournamentWins, currentWinStreak: f.currentWinStreak, maxWinStreak: f.maxWinStreak, unlockedTrophies: f.unlockedTrophies, leagueData: f.leagueData }
                    };
                });
                socket.emit('friends_list_data', friendsData);
            } else {
                socket.emit('friends_list_data', []);
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

        if (!roomId) { socket.emit('error_msg', "Nevažeći ID sobe."); return; }

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

            delete privateRooms[roomId]; 
        } else {
            socket.emit('room_full');
        }
    });

    const relayEvent = (eventName, data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            socket.to(roomId).emit(eventName, data);
        }
    };

    socket.on('dice_roll', (data) => relayEvent('remote_roll', data));
    socket.on('dice_hold', (data) => relayEvent('remote_hold', data));
    socket.on('player_move', (data) => relayEvent('remote_move', data));
    socket.on('announce', (data) => relayEvent('remote_announce', data));
    
    socket.on('chat_msg', (data) => relayEvent('chat_msg', data));

    socket.on('global_chat_msg', (data) => {
        if (!data || !data.msg) return;
        
        let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

        const now = Date.now();

        if (chatBans[clientIp] && chatBans[clientIp].banUntil > now) {
            const preostaloMinuta = Math.ceil((chatBans[clientIp].banUntil - now) / 60000);
            socket.emit('error_msg', `Zabranjeno pisanje! Vaš chat je suspendovan još ${preostaloMinuta} minuta zbog psovanja.`);
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
            socket.emit('error_msg', `Chat vam je blokiran na ${satiBana} sat(i) zbog korišćenja zabranjenih reči.`);
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
            socket.emit('error_msg', 'Igrač više nije na serveru.');
        }
    });

    socket.on('challenge_response', (data) => {
        const { challengerId, accepted } = data;
        const challengerSocket = io.sockets.sockets.get(challengerId);

        if (accepted) {
            if (!challengerSocket) {
                socket.emit('error_msg', 'Igrač koji vas je izazvao je napustio server.');
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
        } else {
            if (challengerSocket) {
                socket.to(challengerId).emit('challenge_declined', { message: "Igrač je nažalost odbio vaš izazov." });
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
            if(clients) {
                for (const clientId of clients) {
                    gameStartTimes[clientId] = Date.now();
                }
            }
            console.log(`🔄 Revanš pokrenut u sobi: ${roomId}`);
        }
    });

    // ==================================================================
    // TURNIR - SOCKET LOGIKA
    // ==================================================================
    
    socket.on('tourney_reset', () => {
        console.log("⚠️ TURNIR JE RESETOVAN OD STRANE KORISNIKA!");
        tournamentState = {
            status: 'registration',
            players: [],
            bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] }
        };
        io.emit('tourney_state_update', tournamentState);
    });

    socket.on('tourney_get_state', () => { socket.emit('tourney_state_update', tournamentState); });

    socket.on('get_tourney_stats', async () => {
        try {
            if (!MONGO_URI) {
                socket.emit('tourney_stats_data', [{ playerName: "Mock Šampion", wins: 5 }]);
                return;
            }
            const stats = await TourneyStats.find().sort({ wins: -1 }).limit(20);
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
                tournamentState.players.push({ id: playerData.id, name: playerData.name });
                if (tournamentState.players.length === 8) generateTournamentBracket();
                io.emit('tourney_state_update', tournamentState);
            }
        }
    });

    socket.on('tourney_unregister', (playerId) => {
        if (tournamentState.status === 'registration') {
            const index = tournamentState.players.findIndex(p => p.id === playerId);
            if (index !== -1) {
                tournamentState.players.splice(index, 1);
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
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_accept_time', (data) => {
        const { round, index } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match) {
            match.timeAccepted = true;
            match.time = match.proposedTime;
            io.emit('tourney_state_update', tournamentState);
        }
    });

    socket.on('tourney_start_duel', (data) => {
        const { matchRoomId, targetId, opponentName } = data;
        
        if (onlinePlayers[targetId]) {
            io.to(onlinePlayers[targetId]).emit('tourney_duel_ready', { matchRoomId, targetId: targetId, opponentName: opponentName });
            socket.emit('tourney_join_allowed', matchRoomId);
        } else {
            socket.emit('error_msg', `Igrač ${opponentName} trenutno nije u aplikaciji. Dogovorite termin kada je online.`);
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
                        const stats = await TourneyStats.find().sort({ wins: -1 }).limit(20);
                        io.emit('tourney_stats_data', stats);
                    }
                } catch (err) {
                    console.error("Greška pri upisu pobednika turnira u bazu:", err);
                }
            }
        }
    });
    
    // ==================================================================
    // 6. DISKONEKCIJA
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('❌ Klijent diskonektovan:', socket.id);
        
        activeConnections.delete(socket.id);

        const pid = registeredSockets[socket.id];
        if (pid) {
            delete onlinePlayers[pid];
        }
        delete registeredSockets[socket.id];

        if (gameStartTimes[socket.id]) {
            delete gameStartTimes[socket.id];
        }
        
        const activeRoomId = playerRooms[socket.id];
        
        if (activeRoomId) {
            console.log(`📢 Igrač izašao iz aktivne sobe ${activeRoomId}`);
            socket.to(activeRoomId).emit('opponent_left');
            delete playerRooms[socket.id];
            
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

        for (const [roomId, roomData] of Object.entries(privateRooms)) {
            if (roomData.p1 && roomData.p1.id === socket.id) {
                delete privateRooms[roomId];
            }
            if (roomData.p2 && roomData.p2.id === socket.id) {
                delete privateRooms[roomId].p2;
            }
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