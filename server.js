const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serviraj statički HTML fajl
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Logika za uparivanje igrača
let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('Novi igrač konektovan:', socket.id);

    socket.on('find_game', (nickname) => {
        socket.nickname = nickname;

        if (waitingPlayer) {
            const opponent = waitingPlayer;
            waitingPlayer = null;
            const roomId = opponent.id + '#' + socket.id;
            
            socket.join(roomId);
            opponent.join(roomId);

            io.to(opponent.id).emit('game_start', { myIndex: 0, opponent: socket.nickname, roomId: roomId });
            io.to(socket.id).emit('game_start', { myIndex: 1, opponent: opponent.nickname, roomId: roomId });

            socket.roomId = roomId;
            opponent.roomId = roomId;
            console.log(`Igra startovana: ${opponent.nickname} vs ${socket.nickname}`);
        } else {
            waitingPlayer = socket;
            console.log(`${nickname} čeka protivnika...`);
        }
    });

    // --- SINHRONIZACIJA POTEZA ---

    // 1. Upisivanje rezultata (Kraj poteza)
    socket.on('player_move', (data) => {
        socket.to(data.roomId).emit('remote_move', data);
    });

    // 2. Bacanje kockica (Da protivnik vidi animaciju i brojeve)
    socket.on('dice_roll', (data) => {
        // data sadrži: { values: [1,2,3...], bacanje: 1 }
        socket.to(data.roomId).emit('remote_roll', data);
    });

    // 3. Zadržavanje kockica (Da protivnik vidi šta si zadržao)
    socket.on('dice_hold', (data) => {
        // data sadrži: { index: 0, status: true/false }
        socket.to(data.roomId).emit('remote_hold', data);
    });

    // 4. Najava
    socket.on('announce', (data) => {
        socket.to(data.roomId).emit('remote_announce', data);
    });

    // Chat
    socket.on('chat_msg', (data) => {
        socket.to(data.roomId).emit('chat_msg', data);
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket) waitingPlayer = null;
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_left');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});