require('dotenv').config(); 

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Dodato za rad sa putanjama fajlova

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

// --- SERVIRANJE STATIČKIH FAJLOVA (KLJUČNO ZA RAD LINKA) ---
// Ovo omogućava da server šalje css, js i slike iz istog foldera
app.use(express.static(path.join(__dirname, '.')));

// --- MONGODB KONEKCIJA ---
const MONGO_URI = process.env.MONGO_URI;

// Provera da li postoji Mongo URI pre konekcije da ne puca server ako nije podešen
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected!'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });
} else {
    console.log('⚠️ UPOZORENJE: MONGO_URI nije podešen u .env fajlu. Baza neće raditi.');
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

// GLAVNA RUTA: Kada neko otvori link, šaljemo mu index.html (IGRU)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- GLOBALNE PROMENLJIVE ZA IGRU ---
let waitingPlayer = null; // Igrač koji čeka random partiju
let privateRooms = {};    // Sobe za privatne igre (waiting rooms)
let playerRooms = {};     // KLJUČNO: Mapa SocketID -> RoomID (Gde se ko trenutno igra)

// --- SOCKET.IO LOGIKA ---
io.on('connection', (socket) => {
    console.log(`🔗 Novi klijent: ${socket.id}`);

    // Pošalji broj online korisnika
    io.emit('users_count', io.engine.clientsCount);

    // ==================================================================
    // 1. TOP LISTA & REZULTATI
    // ==================================================================
    socket.on('get_global_highscores', async (period) => {
        try {
            if (!MONGO_URI) return; // Ako nema baze, ne radi ništa

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
            if (!MONGO_URI) return;

            const finalName = data.name || data.playerName || "Nepoznat Igrač";
            if (!data.score) return;
            
            const newScore = new Score({
                playerName: finalName,
                score: data.score,
                mode: data.mode || 'Solo',
                date: data.date || Date.now()
            });
            await newScore.save();
        } catch (err) {
            console.error("Greška pri upisu:", err);
        }
    });

    // ==================================================================
    // 2. MATCHMAKING
    // ==================================================================

    // --- RANDOM GAME ---
    socket.on('find_game', (nickname) => {
        // Ako već postoji neko ko čeka
        if (waitingPlayer) {
            const opponentId = waitingPlayer.id;
            const opponentName = waitingPlayer.nickname;
            
            // Provera da li je protivnik još uvek tu
            const opponentSocket = io.sockets.sockets.get(opponentId);

            if (opponentSocket) {
                // Kreiramo jedinstvenu sobu
                const roomId = `room_${opponentId}_${socket.id}`;
                waitingPlayer = null; // Brišemo onog ko je čekao

                // Spajamo oba igrača u sobu
                socket.join(roomId);
                opponentSocket.join(roomId);

                // Upisujemo u mapu gde se ko nalazi
                playerRooms[socket.id] = roomId;
                playerRooms[opponentId] = roomId;

                console.log(`⚔️ RANDOM MATCH: ${nickname} vs ${opponentName} (Room: ${roomId})`);

                // Obaveštavamo igrače da igra počinje
                io.to(opponentId).emit('game_start', {
                    roomId: roomId,
                    opponent: nickname,
                    myIndex: 0 // Prvi igrač (onaj koji je čekao)
                });

                socket.emit('game_start', {
                    roomId: roomId,
                    opponent: opponentName,
                    myIndex: 1 // Drugi igrač (onaj koji je upravo ušao)
                });

            } else {
                // Ako je onaj što čeka u međuvremenu izašao, ovaj postaje novi čekac
                waitingPlayer = { id: socket.id, nickname: nickname };
                socket.emit('waiting_for_opponent');
            }
        } else {
            // Niko ne čeka, ti si prvi
            waitingPlayer = { id: socket.id, nickname: nickname };
            socket.emit('waiting_for_opponent');
            console.log(`⏳ ${nickname} čeka random protivnika...`);
        }
    });

    // --- PRIVATE GAME (INVITE FRIEND) ---
    socket.on('join_private_game', ({ nickname, roomId }) => {
        console.log(`🏠 Zahtev za Private sobu: ${roomId} od ${nickname}`);

        if (!roomId) {
            socket.emit('error_msg', "Nevažeći ID sobe.");
            return;
        }

        // Scenarijo 1: Soba ne postoji (Kreiraj je i čekaj)
        if (!privateRooms[roomId]) {
            privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
            socket.join(roomId);
            
            // Obeležimo da je igrač u ovoj sobi (iako čeka)
            playerRooms[socket.id] = roomId;

            socket.emit('private_waiting', { roomId });
            console.log(`--> Soba ${roomId} kreirana. Čeka se P2.`);
        } 
        // Scenarijo 2: Soba postoji i čeka drugog igrača
        else if (!privateRooms[roomId].p2) {
            const p1 = privateRooms[roomId].p1;
            
            // Provera da li je P1 (Host) još uvek konektovan
            const p1Socket = io.sockets.sockets.get(p1.id);
            
            if (!p1Socket) {
                // Ako host više nije tu, resetuj sobu i postani novi host
                console.log("--> Host je nestao. Postajem novi host.");
                privateRooms[roomId] = { p1: { id: socket.id, name: nickname } };
                socket.join(roomId);
                playerRooms[socket.id] = roomId;
                socket.emit('private_waiting', { roomId });
                return;
            }

            // Provera da isti igrač ne pokušava da igra sam sa sobom (u istom browseru/tabu)
            if (p1.id === socket.id) {
                return; // Ignoriši dupli zahtev
            }

            // Ako je host tu, pridruži se kao P2
            privateRooms[roomId].p2 = { id: socket.id, name: nickname };
            socket.join(roomId);

            // Upisujemo u mapu soba
            playerRooms[socket.id] = roomId;
            // P1 je već upisan pri kreiranju, ali za svaki slučaj:
            playerRooms[p1.id] = roomId;

            console.log(`⚔️ PRIVATE MATCH: ${p1.name} vs ${nickname} u sobi ${roomId}`);

            // Start igre za P1 (Host)
            io.to(p1.id).emit('game_start', {
                roomId: roomId,
                opponent: nickname,
                myIndex: 0
            });
            
            // Start igre za P2 (Gost)
            socket.emit('game_start', {
                roomId: roomId,
                opponent: p1.name,
                myIndex: 1
            });

            // Brišemo iz liste čekanja jer je igra počela (više niko ne može da uđe)
            delete privateRooms[roomId]; 
        } else {
            // Scenarijo 3: Soba je puna
            socket.emit('room_full');
        }
    });

    // ==================================================================
    // 3. GAMEPLAY RELEJI (UNIVERZALNA SINHRONIZACIJA)
    // ==================================================================
    
    const relayEvent = (eventName, data) => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            // Prosledi svima u sobi OSIM pošiljaocu
            socket.to(roomId).emit(eventName, data);
        }
    };

    socket.on('dice_roll', (data) => relayEvent('remote_roll', data));
    socket.on('dice_hold', (data) => relayEvent('remote_hold', data));
    socket.on('player_move', (data) => relayEvent('remote_move', data));
    socket.on('announce', (data) => relayEvent('remote_announce', data));
    socket.on('chat_msg', (data) => relayEvent('chat_msg', data));
    
    // Kraj igre - čišćenje
    socket.on('game_over', () => {
        const roomId = playerRooms[socket.id];
        if (roomId) {
            // Ne brišemo odmah sobu da bi chat mogao da radi na kraju, 
            // ali možemo označiti kraj. Za sad ostavljamo ovako.
        }
    });

    // ==================================================================
    // 4. DISKONEKCIJA
    // ==================================================================
    socket.on('disconnect', () => {
        console.log('❌ Klijent diskonektovan:', socket.id);
        
        // 1. Provera aktivne igre (Bilo Random ili Private)
        const activeRoomId = playerRooms[socket.id];
        
        if (activeRoomId) {
            console.log(`📢 Igrač izašao iz aktivne sobe ${activeRoomId}`);
            socket.to(activeRoomId).emit('opponent_left');
            
            // Očisti reference
            delete playerRooms[socket.id];
            
            // Ako je soba bila u privateRooms (neko je čekao), obriši je
            if (privateRooms[activeRoomId]) {
                delete privateRooms[activeRoomId];
            }
        }

        // 2. Provera čekanja za Random igru
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }

        // 3. Dodatna čistačica za Private sobe (ako je host izašao pre nego što je igra počela)
        // Ovo je malo "teže" pretraživanje, ali sigurno čisti memoriju
        for (const [roomId, roomData] of Object.entries(privateRooms)) {
            if (roomData.p1 && roomData.p1.id === socket.id) {
                delete privateRooms[roomId];
                console.log(`🗑️ Private soba ${roomId} obrisana jer je host izašao.`);
            }
            if (roomData.p2 && roomData.p2.id === socket.id) {
                // Ako je P2 izašao dok se nešto dešavalo (retko, ali moguće)
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