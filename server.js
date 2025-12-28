const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const mongoose = require('mongoose'); // <--- 1. Uvozimo Mongoose

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- 2. KONEKCIJA NA BAZU ---
// Zameni donji string svojim "Connection String-om" sa MongoDB Atlasa!
// Najbolje je da ovo stoji u .env fajlu, ali za test može i ovako.
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://TVOJE_IME:TVOJA_SIFRA@cluster0.mongodb.net/yamb?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('Povezan na MongoDB!'))
    .catch(err => console.error('Greška pri konekciji na Mongo:', err));

// --- 3. DEFINISANJE IZGLEDA PODATAKA (SCHEMA) ---
const ScoreSchema = new mongoose.Schema({
    name: String,
    score: Number,
    mode: String,
    date: String
});

const Score = mongoose.model('Score', ScoreSchema);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- GLOBALNE PROMENLJIVE ---
let waitingPlayer = null; 
// globalHighscores više ne čuvamo ovde kao niz!

io.on('connection', (socket) => {
    console.log('Konektovan:', socket.id);

    // --- A. TOP LISTA LOGIKA (SADA SA BAZOM) ---
    
    // 1. Slanje liste igraču kada zatraži
    socket.on('get_global_highscores', async () => {
        try {
            // Povuci top 50 rezultata iz baze, sortirano opadajuće (-1)
            const topScores = await Score.find().sort({ score: -1 }).limit(50);
            socket.emit('global_highscores_data', topScores);
        } catch (err) {
            console.error(err);
        }
    });

    // 2. Prijem novog rezultata
    socket.on('submit_score', async (data) => {
        // data: { name, score, mode, date }
        if (!data.name || !data.score) return;

        try {
            // Sačuvaj u bazu
            const newScore = new Score({
                name: data.name,
                score: data.score,
                mode: data.mode,
                date: data.date
            });
            await newScore.save();

            // Opciono: Odmah povuci novu listu i javi svima (Live update)
            const updatedList = await Score.find().sort({ score: -1 }).limit(50);
            io.emit('global_highscores_data', updatedList);
            
        } catch (err) {
            console.error("Greška pri čuvanju skora:", err);
        }
    });

    // --- B. MULTIPLAYER LOGIKA (Ostaje isto) ---
    socket.on('find_game', (nickname) => {
        socket.nickname = nickname;
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            startGame(waitingPlayer, socket);
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
        }
    });

    socket.on('join_private_game', (data) => {
        socket.nickname = data.nickname;
        const roomId = data.roomId;
        const room = io.sockets.adapter.rooms.get(roomId);
        const numClients = room ? room.size : 0;

        if (numClients === 0) {
            socket.join(roomId);
            socket.roomId = roomId;
            socket.emit('private_waiting', { roomId: roomId });
        } else if (numClients === 1) {
            socket.join(roomId);
            socket.roomId = roomId;
            const [firstPlayerId] = room; 
            const opponentSocket = io.sockets.sockets.get(firstPlayerId);
            if (opponentSocket) startGame(opponentSocket, socket, roomId);
        } else {
            socket.emit('room_full');
        }
    });

    function startGame(player1, player2, specificRoomId = null) {
        const roomId = specificRoomId || ("room_" + player1.id + "_" + player2.id);
        if (!specificRoomId) {
            player1.join(roomId);
            player2.join(roomId);
        }
        player1.roomId = roomId;
        player2.roomId = roomId;

        io.to(player1.id).emit('game_start', { myIndex: 0, opponent: player2.nickname, roomId: roomId });
        io.to(player2.id).emit('game_start', { myIndex: 1, opponent: player1.nickname, roomId: roomId });
    }

    // --- C. IGRA I CHAT ---
    socket.on('dice_roll', (data) => socket.to(data.roomId).emit('remote_roll', data));
    socket.on('dice_hold', (data) => socket.to(data.roomId).emit('remote_hold', data));
    socket.on('announce', (data) => socket.to(data.roomId).emit('remote_announce', data));
    socket.on('player_move', (data) => socket.to(data.roomId).emit('remote_move', data));
    socket.on('chat_msg', (data) => socket.to(data.roomId).emit('chat_msg', data));

    socket.on('disconnect', () => {
        if (waitingPlayer === socket) waitingPlayer = null;
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_left');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});