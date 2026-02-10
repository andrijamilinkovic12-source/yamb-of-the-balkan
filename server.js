require('dotenv').config(); // OVO JE OBAVEZNO NA PRVOJ LINIJI

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');

// Inicijalizacija aplikacije
const app = express();
const server = http.createServer(app);

// Socket.io konfiguracija
const io = new Server(server, {
    cors: {
        origin: "*", // Dozvoljava pristup sa svih domena
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// --- MONGODB KONEKCIJA ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
.then(() => console.log('✅ MongoDB connected to TEST database!'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('SAVET: Proveri da li postoji .env fajl i da li je unutra MONGO_URI');
});

// --- MODEL PODATAKA ---
const ScoreSchema = new mongoose.Schema({
    playerName: String,
    score: Number,
    mode: String, // 'Solo', 'Hotseat', 'Online'
    date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', ScoreSchema);

// --- REST API RUTE ---
app.get('/', (req, res) => {
    res.send("Yamb Server is Running!");
});

// --- GLOBALNE PROMENLJIVE ZA MATCHMAKING ---
let waitingPlayer = null; // Igrač koji čeka random partiju
let privateRooms = {};    // Sobe za privatne igre

// --- NOVO: Mapa igrača i soba (SocketID -> RoomID) ---
// Ovo nam treba da bismo znali koga da obavestimo kad neko izađe
let playerRooms = {}; 

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {
    console.log(`🔗 Novi klijent: ${socket.id}`);

    // 1. Pošalji broj online korisnika svima
    io.emit('users_count', io.engine.clientsCount);

    // ==================================================================
    // 2. TOP LISTA & REZULTATI
    // ==================================================================

    socket.on('get_global_highscores', async (period) => {
        try {
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
            console.error("Greška pri čitanju top liste:", err);
            socket.emit('global_highscores_data', []); 
        }
    });

    socket.on('submit_score', async (data) => {
        try {
            console.log("📩 Primljen zahtev za upis:", data);
            const finalName = data.name || data.playerName || data.nickname || "Nepoznat Igrač";

            if (!data.score) return;
            
            const newScore = new Score({
                playerName: finalName,
                score: data.score,
                mode: data.mode || 'Solo',
                date: data.date || Date.now()
            });
            
            await newScore.save();
            console.log(`💾 Rezultat uspešno sačuvan: ${finalName} - ${data.score}`);
            
        } catch (err) {
            console.error("Greška pri socket upisu:", err);
        }
    });

    // ==================================================================
    // 3. MATCHMAKING (RANDOM & PRIVATE)
    // ==================================================================

    // Random Game
    socket.on('find_game', (nickname) => {
        if (waitingPlayer) {
            const opponentId = waitingPlayer.id;
            const opponentName = waitingPlayer.nickname;
            const roomId = `room_${opponentId}_${socket.id}`;

            const opponentSocket = io.sockets.sockets.get(opponentId);

            if (opponentSocket) {
                waitingPlayer = null;

                socket.join(roomId);
                opponentSocket.join(roomId);

                // --- NOVO: Pamtimo da su ova dva igrača u ovoj sobi ---
                playerRooms[socket.id] = roomId;
                playerRooms[opponentId] = roomId;

                console.log(`⚔️ MATCH START: ${nickname} vs ${opponentName} (Room: ${roomId})`);

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
            console.log(`⏳ ${nickname} čeka protivnika...`);
        }
    });

    // Private Game
    socket.on('join_private_game', ({ nickname, roomId }) => {
        if (!privateRooms[roomId]) {
            privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
            socket.join(roomId);
            socket.emit('private_waiting', { roomId });
            console.log(`🏠 Private Room kreirana: ${roomId} od strane ${nickname}`);
        } 
        else if (!privateRooms[roomId].p2) {
            const p1 = privateRooms[roomId].p1;
            const p1Socket = io.sockets.sockets.get(p1.id);
            
            if (!p1Socket) {
                privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
                socket.join(roomId);
                socket.emit('private_waiting', { roomId });
                return;
            }

            privateRooms[roomId].p2 = { id: socket.id, name: nickname };
            socket.join(roomId);

            // --- NOVO: Pamtimo da su ova dva igrača u ovoj sobi ---
            playerRooms[socket.id] = roomId;
            playerRooms[p1.id] = roomId;

            console.log(`⚔️ Private Match Start: ${p1.name} vs ${nickname}`);

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

            delete privateRooms[roomId]; // Soba više ne čeka, sad je u igri
        } else {
            socket.emit('room_full');
        }
    });

    // ==================================================================
    // 4. GAMEPLAY RELEJI
    // ==================================================================

    socket.on('dice_roll', (data) => {
        socket.to(data.roomId).emit('remote_roll', data);
    });

    socket.on('dice_hold', (data) => {
        socket.to(data.roomId).emit('remote_hold', data);
    });

    socket.on('player_move', (data) => {
        socket.to(data.roomId).emit('remote_move', data);
    });

    socket.on('announce', (data) => {
        socket.to(data.roomId).emit('remote_announce', data);
    });

    socket.on('chat_msg', (data) => {
        socket.to(data.roomId).emit('chat_msg', data);
    });
    
    // --- NOVO: Dodajemo handler za kraj igre da očistimo sobe ---
    socket.on('game_over', () => {
        // Ako klijent pošalje signal da je igra gotova, brišemo ga iz mape
        if (playerRooms[socket.id]) {
            delete playerRooms[socket.id];
        }
    });

    // ==================================================================
    // 5. DISKONEKCIJA (AŽURIRANO)
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('❌ Klijent diskonektovan:', socket.id);
        
        // --- NOVO: Provera da li je igrač bio u aktivnoj sobi ---
        const activeRoomId = playerRooms[socket.id];
        
        if (activeRoomId) {
            console.log(`📢 Obaveštavam sobu ${activeRoomId} da je protivnik izašao.`);
            // Šaljemo poruku preostalima u sobi (protivniku)
            socket.to(activeRoomId).emit('opponent_left');
            
            // Brišemo zapis
            delete playerRooms[socket.id];
        }
        // --------------------------------------------------------

        // 1. Ako je bio u redu za čekanje, izbaci ga
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }

        // 2. Ako je bio host privatne sobe koja čeka, obriši sobu
        for (const [roomId, roomData] of Object.entries(privateRooms)) {
            if (roomData.p1 && roomData.p1.id === socket.id) {
                delete privateRooms[roomId];
            }
        }
        
        io.emit('users_count', io.engine.clientsCount);
    });
});

// Pokretanje servera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Yamb Server sluša na portu ${PORT}`);
});