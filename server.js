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
// Sada čitamo tajnu adresu iz .env fajla da ne bi bila javna na GitHub-u
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

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {
    console.log(`🔗 Novi klijent: ${socket.id}`);

    // 1. Pošalji broj online korisnika svima
    io.emit('users_count', io.engine.clientsCount);

    // ==================================================================
    // 2. TOP LISTA & REZULTATI
    // ==================================================================

    // A) Slanje Top Liste klijentu
    socket.on('get_global_highscores', async (period) => {
        try {
            let filter = {};
            const now = new Date();
            
            // Logika filtriranja
            if (period === 'weekly') {
                const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                filter.date = { $gte: lastWeek };
            } else if (period === 'monthly') {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                filter.date = { $gte: lastMonth };
            }
            // 'all_time' vraća sve (prazan filter)

            // Dohvati top 50
            const scores = await Score.find(filter).sort({ score: -1 }).limit(50);
            
            // Pošalji nazad SAMO onom ko je tražio
            socket.emit('global_highscores_data', scores);
            
        } catch (err) {
            console.error("Greška pri čitanju top liste:", err);
            socket.emit('global_highscores_data', []); 
        }
    });

    // B) Upisivanje rezultata (POPRAVLJENO PROTIV UNDEFINED)
    socket.on('submit_score', async (data) => {
        try {
            console.log("📩 Primljen zahtev za upis:", data);

            // "Pametno" traženje imena: Ako nema 'name', probaj 'playerName', pa 'nickname'...
            const finalName = data.name || data.playerName || data.nickname || "Nepoznat Igrač";

            if (!data.score) {
                console.log("❌ Odbijen rezultat: Nema poena (score)");
                return;
            }
            
            const newScore = new Score({
                playerName: finalName, // Koristimo pronađeno ime
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
        // Ako već postoji neko ko čeka
        if (waitingPlayer) {
            const opponentId = waitingPlayer.id;
            const opponentName = waitingPlayer.nickname;
            const roomId = `room_${opponentId}_${socket.id}`;

            // Provera da li je protivnik još uvek tu
            const opponentSocket = io.sockets.sockets.get(opponentId);

            if (opponentSocket) {
                // Resetujemo čekača jer je našao par
                waitingPlayer = null;

                // Ubaci oba igrača u sobu
                socket.join(roomId);
                opponentSocket.join(roomId);

                console.log(`⚔️ MATCH START: ${nickname} vs ${opponentName} (Room: ${roomId})`);

                // Obavesti P1 (onaj koji je čekao) -> On je Index 0
                io.to(opponentId).emit('game_start', {
                    roomId: roomId,
                    opponent: nickname,
                    myIndex: 0
                });

                // Obavesti P2 (ovaj koji je upravo došao) -> On je Index 1
                socket.emit('game_start', {
                    roomId: roomId,
                    opponent: opponentName,
                    myIndex: 1
                });

            } else {
                // Ako je protivnik nestao dok je čekao, ovaj igrač postaje novi čekač
                waitingPlayer = { id: socket.id, nickname: nickname };
                socket.emit('waiting_for_opponent');
            }
        } else {
            // Nema nikog, stavi ovog na čekanje
            waitingPlayer = { id: socket.id, nickname: nickname };
            socket.emit('waiting_for_opponent');
            console.log(`⏳ ${nickname} čeka protivnika...`);
        }
    });

    // Private Game
    socket.on('join_private_game', ({ nickname, roomId }) => {
        // Kreiranje sobe ako ne postoji
        if (!privateRooms[roomId]) {
            privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
            socket.join(roomId);
            socket.emit('private_waiting', { roomId });
            console.log(`🏠 Private Room kreirana: ${roomId} od strane ${nickname}`);
        } 
        // Ulazak drugog igrača
        else if (!privateRooms[roomId].p2) {
            const p1 = privateRooms[roomId].p1;
            
            // Provera da li je p1 još tu
            const p1Socket = io.sockets.sockets.get(p1.id);
            if (!p1Socket) {
                // Ako je p1 otišao, resetuj sobu sa novim igračem
                privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
                socket.join(roomId);
                socket.emit('private_waiting', { roomId });
                return;
            }

            privateRooms[roomId].p2 = { id: socket.id, name: nickname };
            socket.join(roomId);

            console.log(`⚔️ Private Match Start: ${p1.name} vs ${nickname}`);

            // Start igre
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

            // Brišemo sobu iz liste čekanja jer je puna
            delete privateRooms[roomId];
        } else {
            socket.emit('room_full');
        }
    });

    // ==================================================================
    // 4. GAMEPLAY RELEJI (Samo prosleđuju podatke drugom igraču)
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

    // ==================================================================
    // 5. DISKONEKCIJA
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('❌ Klijent diskonektovan:', socket.id);
        
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