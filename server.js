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

// --- LOGIKA IGRE ---

let waitingPlayer = null; // Za "Random" matchmaking

io.on('connection', (socket) => {
    console.log('Konektovan:', socket.id);

    // --- 1. NASUMIČNA IGRA (Random Matchmaking) ---
    socket.on('find_game', (nickname) => {
        socket.nickname = nickname;
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            startGame(waitingPlayer, socket);
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
        }
    });

    // --- 2. PRIVATNA IGRA (Pozovi Prijatelja) ---
    socket.on('join_private_game', (data) => {
        // data: { nickname, roomId }
        socket.nickname = data.nickname;
        const roomId = data.roomId;

        // Proveri koliko ljudi ima u toj sobi
        const room = io.sockets.adapter.rooms.get(roomId);
        const numClients = room ? room.size : 0;

        if (numClients === 0) {
            // Soba je prazna, ti si Domaćin (Čekaš)
            socket.join(roomId);
            socket.roomId = roomId;
            socket.emit('private_waiting', { roomId: roomId });
            console.log(`Kreirana privatna soba: ${roomId} od strane ${data.nickname}`);
        } 
        else if (numClients === 1) {
            // Soba ima jednog igrača, ti si Gost (Igra počinje)
            socket.join(roomId);
            socket.roomId = roomId;
            
            // Pronađi protivnika u toj sobi
            const [firstPlayerId] = room; 
            const opponentSocket = io.sockets.sockets.get(firstPlayerId);
            
            if (opponentSocket) {
                startGame(opponentSocket, socket, roomId);
            }
        } 
        else {
            // Soba je puna
            socket.emit('room_full');
        }
    });

    // --- ZAJEDNIČKA FUNKCIJA ZA START ---
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

        console.log(`Igra startovana: ${player1.nickname} vs ${player2.nickname} (Soba: ${roomId})`);
    }

    // --- PROSLEĐIVANJE POTEZA (Isto kao pre) ---
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