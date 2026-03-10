// server.js - FIX: ISKLJUČENA SPEED HACK ZAŠTITA DA BI RADIJE UPIS + DODAT FILTER ZA CHAT I SISTEM BANOVANJA + DUEL SISTEM + POPRAVLJEN RESET LISTE + DODAT TURNIR SISTEM (ID BAZIRAN) + POPRAVLJEN BROJAČ IGRAČA + ZASTITA OD SLEPOG POKRETANJA + KVARTALNA LIGA + ONLINE IGRACI SA STATISTIKOM I STATUSOM (FIX ZA DUPLIRANJE IGRAČA) + DVORANA SLAVNIH (TURNIRI)

require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 

// Inicijalizacija aplikacije
const app = express();
const server = http.createServer(app);

// Socket.io konfiguracija
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    },
    pingInterval: 10000, // Server na svakih 10s proverava da li je igrač i dalje tu
    pingTimeout: 5000    // Ako telefon ne odgovori u roku od 5s, server odmah briše "duha"
});

// Middleware
app.use(cors());
app.use(express.json());

// ==================================================================
// 0. FILTER VULGARNOSTI ZA GLOBALNI CHAT (PAMETNI FILTER)
// ==================================================================
const zabranjeneReci = [
    // 1. Opšte uvrede (Balkan)
    "idiot", "budala", "kreten", "glupan", "majmun", "debil", "stoka",

    // 2. Vulgarne i polne reči (Balkan)
    "kurv", "jeb", "pizd", "kurac", "sranj", "govn", "pick", "pedere", "pederu",

    // 3. Verske, rasne i nacionalne uvrede (Balkan)
    "verskauvreda1", "nacionalnauvreda1", "rasnauvreda1", "balij", "ustas", "chetnik", "siptar", "cigan",

    // 4. Psovke, uvrede i vulgarne reči (Engleski)
    "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "slut", "whore", 
    "faggot", "nigger", "nigga", "bastard", "retard", "crap", "douche", "motherfucker"
];

// Mapa za prepoznavanje zamena karaktera (Leetspeak i naša slova)
const charMap = {
    'a': '[aA@4]',
    'b': '[bB8]',
    'c': '[cCčČćĆ]',
    'd': '[dDđĐ]',
    'e': '[eE3]',
    'g': '[gG6]',
    'i': '[iI1l!L]', 
    'l': '[lL1iI]', 
    'o': '[oO0]',
    's': '[sSšŠ5\\$]',
    't': '[tT7]',
    'z': '[zZžŽ]'
};

// Funkcija koja od obične reči pravi pametni Regex
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

// --- MONGODB KONEKCIJA ---
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected!'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });
} else {
    console.log('⚠️ UPOZORENJE: MONGO_URI nije podešen. Baza neće raditi.');
}

// --- MODELI PODATAKA ---

// Glavna Top Lista
const ScoreSchema = new mongoose.Schema({
    playerName: String,
    score: Number,
    mode: String, 
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', ScoreSchema);

// Kvartalna Liga Lista
const LeagueScoreSchema = new mongoose.Schema({
    playerName: String,
    score: Number,
    year: Number,
    quarter: Number,
    date: { type: Date, default: Date.now }
});
const LeagueScore = mongoose.model('LeagueScore', LeagueScoreSchema);

// Statistika Turnira (Osvajači)
const TourneyStatsSchema = new mongoose.Schema({
    playerId: String,
    playerName: String,
    wins: { type: Number, default: 0 },
    lastWinDate: { type: Date, default: Date.now }
});
const TourneyStats = mongoose.model('TourneyStats', TourneyStatsSchema);

// --- REST API RUTE ---

// GLAVNA RUTA: Fallback na index.html za sve ostalo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// --- GLOBALNE PROMENLJIVE ZA IGRU ---
let waitingPlayer = null; 
let privateRooms = {};    
let playerRooms = {};     

// --- ANTI-CHEAT START TIME MAPA ---
let gameStartTimes = {}; 

// --- SISTEM BANOVANJA (MUTE) ---
const chatBans = {}; // Format: { "ip_adresa": { strikes: broj, banUntil: timestamp } }

// --- MAPE ZA PRAĆENJE KO JE ONLINE PO ID-ju ---
const onlinePlayers = {};     // Format: { "usr_123": "socket_id_456" }
const registeredSockets = {}; // Format: { "socket_id_456": "usr_123" }

// ==================================================================
// GLOBALNO STANJE TURNIRA (Ažurirano za ID identifikaciju)
// ==================================================================
let tournamentState = {
    status: 'registration', // 'registration', 'active', 'finished'
    players: [], // Format: [{ id: "usr_...", name: "Ime" }, ...]
    bracket: {
        qf: [null, null, null, null],
        sf: [null, null],
        f: [null]
    }
};

// Funkcija koja meša igrače i generiše žreb
function generateTournamentBracket() {
    tournamentState.status = 'active';
    const shuffled = [...tournamentState.players].sort(() => 0.5 - Math.random());
    
    // Sada meč sadrži p1 i p2 objekte i pobednika/predlagača prati preko ID-ja
    const createMatch = (p1, p2) => ({
        p1: p1, 
        p2: p2, 
        winnerId: null, 
        time: null, 
        proposedTime: null, 
        proposedById: null, 
        timeAccepted: false
    });

    tournamentState.bracket.qf = [
        createMatch(shuffled[0], shuffled[1]),
        createMatch(shuffled[2], shuffled[3]),
        createMatch(shuffled[4], shuffled[5]),
        createMatch(shuffled[6], shuffled[7])
    ];
}

// Funkcija za automatsko unapređivanje pobednika (kao ceo objekat) u sledeću rundu
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
const activeConnections = new Map(); // Mapa koja čuva socket.id -> IP adresa

function updateOnlineCount() {
    const uniqueKeys = new Set();
    
    // Prolazimo kroz sve aktivne sokete i sakupljamo njihove ID-jeve
    io.sockets.sockets.forEach((clientSocket, id) => {
        const ip = activeConnections.get(id) || "unknown_ip";
        // Koristimo isti sistem identifikacije kao i u listi
        let uniqueKey = registeredSockets[id] || ip;
        uniqueKeys.add(uniqueKey);
    });

    // Šaljemo tačan broj jedinstvenih profila/uređaja
    io.emit('users_count', uniqueKeys.size);
}

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {
    
    // Ekstrakcija IP adrese korisnika
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

    activeConnections.set(socket.id, clientIp);
    console.log(`🔗 Novi klijent: ${socket.id} (IP: ${clientIp})`);

    // Pošalji broj online korisnika (samo jedinstvene IP adrese)
    updateOnlineCount();

    // Povezivanje trajnog ID-ja sa trenutnim socketom
    socket.on('set_my_id', (playerId) => {
        onlinePlayers[playerId] = socket.id;
        registeredSockets[socket.id] = playerId;
    });

    // ==================================================================
    // UPRAVLJANJE IMENIMA I LISTOM ONLINE IGRAČA (SA STATISTIKOM)
    // ==================================================================
    
    // Čuvamo ime igrača i statistiku (Pobede/Porazi) u njegovom socketu
    socket.on('set_player_data', (data) => {
        socket.playerName = data.name;
        socket.playerStats = data.stats;
    });

    // Vraćanje liste svih trenutno prijavljenih soketa (igrača) klijentu - SPREČENO DUPLIRANJE GOSTIJU
    socket.on('get_online_players', () => {
        const playersMap = new Map(); 
        
        io.sockets.sockets.forEach((clientSocket, id) => {
            const isPlaying = !!playerRooms[id];
            
            const ip = activeConnections.get(id) || "unknown_ip";
            // Ključ je trajni ID igrača, a ako ga (još) nema, koristimo IP adresu za grupisanje
            let uniqueKey = registeredSockets[id] || ip;

            const playerData = {
                id: id, // Čuvamo aktuelni socket.id zbog slanja poziva za duel
                name: clientSocket.playerName || "Gost",
                stats: clientSocket.playerStats || { wins: 0, losses: 0 },
                status: isPlaying ? 'playing' : 'idle'
            };

            // Ako već postoji konekcija sa istim ključem (istim ID-jem ili IP adresom)
            if (playersMap.has(uniqueKey)) {
                const existing = playersMap.get(uniqueKey);
                // Dajemo prioritet konekciji koja ima pravo ime (NIJE "Gost") 
                // ili onoj koja je trenutno u statusu igre
                if ((existing.name === "Gost" && playerData.name !== "Gost") || 
                    (existing.status !== 'playing' && playerData.status === 'playing')) {
                    playersMap.set(uniqueKey, playerData);
                }
            } else {
                playersMap.set(uniqueKey, playerData);
            }
        });

        // Pretvaramo Mapu nazad u niz i šaljemo klijentu (bez duplikata i duhova!)
        socket.emit('online_players_list', Array.from(playersMap.values()));
    });

    // Slušamo kada se igrač vrati u glavni meni da mu sklonimo "Igra u toku" status
    socket.on('back_to_menu', () => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            // Neka logička obrada napuštanja sobe ako želimo, ali primarno brišemo iz playerRooms
            delete playerRooms[socket.id];
        }
    });

    // ==================================================================
    // 3. TOP LISTA & REZULTATI
    // ==================================================================
    
    // Konstante za validaciju
    const MAX_SCORE = 3500;       
    const MAX_NAME_LENGTH = 24;   // <-- POVEĆAN LIMIT NA 24 KARAKTERA
    const MIN_GAME_DURATION = 120000; 

    // --- Listener za početak sesije ---
    socket.on('game_session_start', () => {
        gameStartTimes[socket.id] = Date.now();
        console.log(`⏱️ Igrač ${socket.id} započeo partiju u ${new Date().toLocaleTimeString()}`);
    });

    // GLAVNA TOP LISTA (SVA VREMENA / NEDELJA / MESEC)
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
            if (!MONGO_URI) {
                console.log("❌ GREŠKA: Pokušaj upisa bez konekcije na bazu!");
                return;
            }

            if (typeof data.score !== 'number' || isNaN(data.score)) {
                return; 
            }

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
                finalName = rawName.trim().substring(0, MAX_NAME_LENGTH);
            }

            if (finalName.length === 0) {
                finalName = "Nepoznat Igrač";
            }
            
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

    // ==================================================================
    // KVARTALNA LIGA - SOCKET LOGIKA
    // ==================================================================
    
    // GET: Slanje tabele za Kvartalnu Ligu
    socket.on('get_league_highscores', async (reqData) => {
        try {
            if (!MONGO_URI) {
                // FALLBACK: Ako baza ne radi, šalje MOCK podatke (za test)
                socket.emit('league_highscores_data', [
                    { playerName: "Mock Šampion", score: 105400 },
                    { playerName: "Mock Igrač", score: 85200 },
                ]);
                return;
            }
            
            const { year, quarter } = reqData;
            
            // Pronađi top 50 igrača za taj specifični kvartal i godinu
            const scores = await LeagueScore.find({ year: year, quarter: quarter })
                                            .sort({ score: -1 })
                                            .limit(50);
                                            
            socket.emit('league_highscores_data', scores);
        } catch (err) {
            console.error("Greška pri dohvatanju kvartalne lige:", err);
            socket.emit('league_highscores_data', []);
        }
    });

    // POST: Primanje novog kvartalnog rekorda od igrača
    socket.on('submit_league_score', async (data) => {
        try {
            if (!MONGO_URI) return;
            if (typeof data.score !== 'number' || isNaN(data.score)) return;

            // <-- POVEĆAN LIMIT I ZA KVARTALNU LIGU NA 24 -->
            let finalName = (data.playerName || "Nepoznat Igrač").trim().substring(0, 24);
            if (finalName.length === 0) finalName = "Nepoznat Igrač";

            // Za ligu ne dodajemo nove redove za svaku partiju, već AŽURIRAMO postojeći 
            // (upsert: true - ako ne postoji, kreiraće ga. Ako postoji, ažuriraće ga).
            await LeagueScore.findOneAndUpdate(
                { playerName: finalName, year: data.year, quarter: data.quarter }, // Kriterijum
                { $set: { score: data.score, date: Date.now() } }, // Šta se menja
                { upsert: true, new: true } // Opcije
            );
            
            console.log(`🏆 LIGA UPIS: ${finalName} -> ${data.score} PTS (Q${data.quarter}/${data.year})`);
        } catch (err) {
            console.error("Greška pri upisu u kvartalnu ligu:", err);
        }
    });

    // ==================================================================
    // 4. MATCHMAKING
    // ==================================================================

    socket.on('find_game', (nickname) => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            return; 
        }

        if (waitingPlayer) {
            const opponentId = waitingPlayer.id;
            const opponentName = waitingPlayer.nickname;
            
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
                    roomId: roomId,
                    opponent: nickname,
                    myIndex: 0 
                });

                socket.emit('game_start', {
                    roomId: roomId,
                    opponent: opponentName,
                    myIndex: 1 
                });

            } else {
                waitingPlayer = { id: socket.id, nickname: nickname };
                socket.emit('waiting_for_opponent');
            }
        } else {
            waitingPlayer = { id: socket.id, nickname: nickname };
            socket.emit('waiting_for_opponent');
            console.log(`⏳ ${nickname} čeka random protivnika...`);
        }
    });

    socket.on('join_private_game', ({ nickname, roomId }) => {
        console.log(`🏠 Zahtev za Private sobu: ${roomId} od ${nickname}`);

        if (!roomId) {
            socket.emit('error_msg', "Nevažeći ID sobe.");
            return;
        }

        if (!privateRooms[roomId]) {
            privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
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
                privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
                socket.join(roomId);
                playerRooms[socket.id] = roomId;
                socket.emit('private_waiting', { roomId });
                return;
            }

            if (p1.id === socket.id) return; 

            privateRooms[roomId].p2 = { id: socket.id, name: nickname };
            socket.join(roomId);

            playerRooms[socket.id] = roomId;
            playerRooms[p1.id] = roomId;

            gameStartTimes[socket.id] = Date.now();
            gameStartTimes[p1.id] = Date.now();

            console.log(`⚔️ PRIVATE MATCH: ${p1.name} vs ${nickname} u sobi ${roomId}`);

            io.to(p1.id).emit('game_start', {
                roomId: roomId,
                opponent: nickname,
                myIndex: 0
            });
            
            socket.emit('game_start', {
                roomId: roomId,
                opponent: p1.name,
                myIndex: 1
            });

            delete privateRooms[roomId]; 
        } else {
            socket.emit('room_full');
        }
    });

    // ==================================================================
    // 5. GAMEPLAY RELEJI, CHAT & REMATCH LOGIKA
    // ==================================================================
    
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

    // --- GLOBALNI CHAT LOGIKA SA FILTEROM I BANOVANJEM ---
    socket.on('global_chat_msg', (data) => {
        if (!data || !data.msg) return;
        
        let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        if (typeof clientIp === 'string') clientIp = clientIp.split(',')[0].trim();

        const now = Date.now();

        // 1. Provera da li je korisnik trenutno pod banom
        if (chatBans[clientIp] && chatBans[clientIp].banUntil > now) {
            const preostaloMinuta = Math.ceil((chatBans[clientIp].banUntil - now) / 60000);
            socket.emit('error_msg', `Zabranjeno pisanje! Vaš chat je suspendovan još ${preostaloMinuta} minuta zbog psovanja.`);
            return; 
        }

        const safeSender = (data.sender || 'Nepoznat').toString().substring(0, 20);
        const originalMsg = data.msg.toString().substring(0, 200); 

        // PRIMENA PAMETNOG FILTERA NA PORUKU
        const safeMsg = cenzurisiPoruku(originalMsg);

        // 2. Ako se poruka promenila (sadrži ***), znači da je psovao
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

    // ==================================================================
    // DUEL SISTEM (IZAZOVI IZ CHATA / ONLINE LISTE)
    // ==================================================================
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

            // Upisujemo sobe u globalnu mapu da bi releji radili
            playerRooms[socket.id] = roomName;
            playerRooms[challengerId] = roomName;
            gameStartTimes[socket.id] = Date.now();
            gameStartTimes[challengerId] = Date.now();

            // Emitujemo game_started za oba igrača
            io.to(roomName).emit('game_started', {
                room: roomName,
                player1: challengerId,
                player2: socket.id
            });
            console.log(`⚔️ DUEL POČINJE: ${challengerId} vs ${socket.id} u sobi ${roomName}`);
        } else {
            if (challengerSocket) {
                socket.to(challengerId).emit('challenge_declined', {
                    message: "Igrač je nažalost odbio vaš izazov."
                });
            }
        }
    });

    // --- REVANŠ SISTEM ---
    socket.on('game_over', () => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            console.log(`🏁 Igra završena u sobi: ${roomId}`);
        }
    });

    socket.on('request_rematch', () => {
        relayEvent('rematch_requested', {}); 
    });

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
    // TURNIR - SOCKET LOGIKA (Ažurirano za ID identifikaciju)
    // ==================================================================
    
    // 0. RESET TURNIRA (Dev opcija)
    socket.on('tourney_reset', () => {
        console.log("⚠️ TURNIR JE RESETOVAN OD STRANE KORISNIKA!");
        tournamentState = {
            status: 'registration',
            players: [],
            bracket: {
                qf: [null, null, null, null],
                sf: [null, null],
                f: [null]
            }
        };
        io.emit('tourney_state_update', tournamentState);
    });

    // 1. Slanje trenutnog stanja klijentu kad otvori turnir
    socket.on('tourney_get_state', () => {
        socket.emit('tourney_state_update', tournamentState);
    });

    // Slanje statistike turnira (Rang lista)
    socket.on('get_tourney_stats', async () => {
        try {
            if (!MONGO_URI) {
                // Mock podaci za test ako baza ne radi
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

    // 2. Prijava igrača (primi se objekat {id, name})
    socket.on('tourney_register', (playerData) => {
        if (tournamentState.status === 'registration' && tournamentState.players.length < 8) {
            
            // Provera po ID-ju umesto po imenu
            const alreadyRegistered = tournamentState.players.find(p => p.id === playerData.id);
            
            if (!alreadyRegistered) {
                tournamentState.players.push({
                    id: playerData.id,
                    name: playerData.name
                });
                
                // Ako je 8. igrač ušao, generiši žreb automatski
                if (tournamentState.players.length === 8) {
                    generateTournamentBracket();
                }
                
                io.emit('tourney_state_update', tournamentState);
            }
        }
    });

    // 2.5 Odjava sa turnira (Povraćaj)
    socket.on('tourney_unregister', (playerId) => {
        // Dozvoli odjavu samo ako turnir još uvek prima prijave
        if (tournamentState.status === 'registration') {
            const index = tournamentState.players.findIndex(p => p.id === playerId);
            if (index !== -1) {
                // Obriši igrača iz niza
                tournamentState.players.splice(index, 1);
                
                // Obavesti sve klijente o novom stanju
                io.emit('tourney_state_update', tournamentState);
                console.log(`↩️ Poništena prijava za turnir: ${playerId}`);
            }
        }
    });

    // 3. Dodavanje botova (za testiranje)
    socket.on('tourney_fill_bots', () => {
        if (tournamentState.status === 'registration') {
            while (tournamentState.players.length < 8) {
                tournamentState.players.push({
                    id: 'bot_' + Math.random().toString(36).substr(2, 9),
                    name: `Bot ${Math.floor(Math.random() * 1000)}`
                });
            }
            generateTournamentBracket();
            io.emit('tourney_state_update', tournamentState);
        }
    });

    // 4. Predlaganje termina (praćenje predlagača po ID-ju)
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

    // 5. Prihvatanje termina
    socket.on('tourney_accept_time', (data) => {
        const { round, index } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match) {
            match.timeAccepted = true;
            match.time = match.proposedTime;
            io.emit('tourney_state_update', tournamentState);
        }
    });

    // 6. Pokretanje duela iz turnira (SA PROVEROM DA LI JE PROTIVNIK TU)
    socket.on('tourney_start_duel', (data) => {
        const { matchRoomId, targetId, opponentName } = data;
        
        // Proveravamo da li se protivnikov ID nalazi u mapi aktivnih igrača
        if (onlinePlayers[targetId]) {
            // Protivnik je tu! Šaljemo mu poziv direktno na njegov telefon.
            io.to(onlinePlayers[targetId]).emit('tourney_duel_ready', { 
                matchRoomId, 
                targetId: targetId, 
                opponentName: opponentName 
            });
            // Šaljemo VAMA (pošiljaocu) odobrenje da uđete u sobu
            socket.emit('tourney_join_allowed', matchRoomId);
        } else {
            // Protivnik nije u aplikaciji
            socket.emit('error_msg', `Igrač ${opponentName} trenutno nije u aplikaciji. Dogovorite termin kada je online.`);
        }
    });

    // 7. Upis pobednika meča (primi se winnerId)
    socket.on('tourney_submit_winner', async (data) => {
        const { round, index, winnerId } = data;
        const match = tournamentState.bracket[round][index];
        
        if (match && match.winnerId === null) {
            match.winnerId = winnerId;
            
            // Nađemo ceo objekat igrača koji je pobedio da bismo ga prosledili dalje
            const winnerObj = match.p1.id === winnerId ? match.p1 : match.p2;
            
            advanceTournamentBracket(round, index, winnerObj);
            io.emit('tourney_state_update', tournamentState);

            // AKO JE OVO BILO FINALE - UPIŠI POBEDU U BAZU
            if (round === 'f') {
                try {
                    if (MONGO_URI) {
                        await TourneyStats.findOneAndUpdate(
                            { playerId: winnerObj.id },
                            { $set: { playerName: winnerObj.name, lastWinDate: Date.now() }, $inc: { wins: 1 } },
                            { upsert: true, new: true }
                        );
                        // Emituj osveženu listu svima nakon upisa
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
        
        // --- Brisanje IP adrese iz liste aktivnih konekcija ---
        activeConnections.delete(socket.id);

        // Uklanjanje igrača iz mape online prisutnosti
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
                delete privateRooms[activeRoomId];
            }
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
        
        // --- Ažuriraj online korisnike (broji unikatne IP-ove) nakon izlaska ---
        updateOnlineCount();
    });
});

// ==================================================================
// 7. GARBAGE COLLECTOR ZA BANOVE (Čisti memoriju)
// ==================================================================
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Yamb Server sluša na portu ${PORT}`);
});