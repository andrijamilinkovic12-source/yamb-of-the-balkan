// server.js - FIX: ISKLJUČENA SPEED HACK ZAŠTITA DA BI RADIJE UPIS

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
    }
});

// Middleware
app.use(cors());
app.use(express.json());

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

// --- MODEL PODATAKA ---
const ScoreSchema = new mongoose.Schema({
    playerName: String,
    score: Number,
    mode: String, 
    date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', ScoreSchema);

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

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {
    console.log(`🔗 Novi klijent: ${socket.id}`);

    // Pošalji broj online korisnika
    io.emit('users_count', io.engine.clientsCount);

    // ==================================================================
    // 3. TOP LISTA & REZULTATI
    // ==================================================================
    
    // Konstante za validaciju
    const MAX_SCORE = 3500;       // Limit za skor
    const MAX_NAME_LENGTH = 18;   // Limit za dužinu imena
    const MIN_GAME_DURATION = 120000; // Minimum 2 minuta (120 sekundi)

    // --- Listener za početak sesije ---
    socket.on('game_session_start', () => {
        gameStartTimes[socket.id] = Date.now();
        console.log(`⏱️ Igrač ${socket.id} započeo partiju u ${new Date().toLocaleTimeString()}`);
    });

    socket.on('get_global_highscores', async (period) => {
        try {
            if (!MONGO_URI) return; 

            let filter = {};
            const now = new Date();
            
            if (period === 'weekly') {
                const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                filter.date = { $gte: lastWeek };
            } else if (period === 'monthly') {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                filter.date = { $gte: lastMonth };
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

            // 1. PROVERA TIPA PODATAKA
            if (typeof data.score !== 'number' || isNaN(data.score)) {
                return; 
            }

            // 2. PROVERA VREDNOSTI (MAX SCORE)
            if (data.score < 0 || data.score > MAX_SCORE) {
                console.log(`🚨 HACK POKUŠAJ (Value): ${socket.id} šalje nemoguć skor: ${data.score}`);
                return; // Ignorišemo upis
            }

            // 3. PROVERA VREMENA (SPEED HACK) - PRIVREMENO ISKLJUČENO !!!
            // ----------------------------------------------------------
            // OVO JE BIO DEO KOJI JE BLOKIRAO UPIS JER FRONTEND NE ŠALJE START TIME.
            // SADA SAMO LOGUJEMO UPOZORENJE, ALI NE RADIMO "return".
            
            const startTime = gameStartTimes[socket.id];
            
            if (data.score > 50 && (!startTime || (Date.now() - startTime < MIN_GAME_DURATION))) {
                const duration = startTime ? (Date.now() - startTime) : "N/A";
                // SAMO LOGUJEMO, NE BLOKIRAMO VIŠE:
                console.log(`⚠️ UPOZORENJE (Speed): Trajanje: ${duration}ms. Ipak upisujem skor: ${data.score}`);
                
                // return;  <--- OVO JE OBRISANO/ZAKOMENTARISANO DA BI UPIS RADIO
            }
            // ----------------------------------------------------------

            // 4. OBRADA IMENA (Limit 18 karaktera)
            let finalName = "Nepoznat Igrač";
            let rawName = data.name || data.playerName;

            if (rawName && typeof rawName === 'string') {
                finalName = rawName.trim().substring(0, MAX_NAME_LENGTH);
            }

            if (finalName.length === 0) {
                finalName = "Nepoznat Igrač";
            }
            
            // 5. UPIS U BAZU
            const newScore = new Score({
                playerName: finalName,
                score: data.score,
                mode: data.mode || 'Solo',
                date: data.date || Date.now()
            });
            
            await newScore.save();
            console.log(`✅ USPEŠAN UPIS: ${finalName} -> ${data.score}`);
            
            // Očisti vreme nakon uspešnog upisa
            delete gameStartTimes[socket.id];

        } catch (err) {
            console.error("❌ Greška pri upisu u MongoDB:", err);
        }
    });

    // ==================================================================
    // 4. MATCHMAKING
    // ==================================================================

    // --- RANDOM GAME ---
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

    // --- PRIVATE GAME ---
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
    // 5. GAMEPLAY RELEJI & REMATCH LOGIKA
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
    // 6. DISKONEKCIJA
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('❌ Klijent diskonektovan:', socket.id);
        
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
        
        io.emit('users_count', io.engine.clientsCount);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Yamb Server sluša na portu ${PORT}`);
});