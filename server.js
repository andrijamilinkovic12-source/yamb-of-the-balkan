const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- GLOBAL VARIABLES ---
let waitingPlayer = null; // Za Random Matchmaking
let globalHighscores = []; // Globalna Top Lista (u memoriji)

// Dummy podaci za početak (opciono)
// globalHighscores = [
//    { name: "YambMaster", score: 1100, mode: "Solo", date: "01.01.2025" }
// ];

io.on('connection', (socket) => {
    console.log('Konektovan:', socket.id);

    // --- A. TOP LISTA LOGIKA ---
    
    // 1. Slanje liste igraču kada zatraži
    socket.on('get_global_highscores', () => {
        socket.emit('global_highscores_data', globalHighscores);
    });

    // 2. Prijem novog rezultata
    socket.on('submit_score', (data) => {
        // data: { name, score, mode, date }
        if (!data.name || !data.score) return;

        // Dodaj novi skor
        globalHighscores.push(data);

        // Sortiraj (od najvećeg ka najmanjem)
        globalHighscores.sort((a, b) => b.score - a.score);

        // Zadrži samo top 50
        globalHighscores = globalHighscores.slice(0, 50);

        // (Opciono) Odmah javi svima da se lista promenila
        // io.emit('global_highscores_data', globalHighscores);
    });

    // --- B. MULTIPLAYER LOGIKA ---

    // 1. Random Matchmaking
    socket.on('find_game', (nickname) => {
        socket.nickname = nickname;
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            startGame(waitingPlayer, socket);
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
        }
    });

    // 2. Privatna Igra
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