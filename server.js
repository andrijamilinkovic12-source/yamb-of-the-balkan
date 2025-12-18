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
            // Ako neko već čeka, upari ih
            const opponent = waitingPlayer;
            waitingPlayer = null;

            const roomId = opponent.id + '#' + socket.id;
            
            // Ubaci oba igrača u "sobu"
            socket.join(roomId);
            opponent.join(roomId);

            // Javi prvom (Opponent, on je waiting) da je Player 1 (index 0)
            io.to(opponent.id).emit('game_start', { 
                myIndex: 0, 
                opponent: socket.nickname,
                roomId: roomId 
            });

            // Javi drugom (Socket, onaj koji je upravo ušao) da je Player 2 (index 1)
            io.to(socket.id).emit('game_start', { 
                myIndex: 1, 
                opponent: opponent.nickname,
                roomId: roomId 
            });

            // Sačuvaj ID sobe u socket objektu
            socket.roomId = roomId;
            opponent.roomId = roomId;

            console.log(`Igra startovana: ${opponent.nickname} vs ${socket.nickname}`);

        } else {
            // Ako niko ne čeka, postavi ovog igrača na čekanje
            waitingPlayer = socket;
            console.log(`${nickname} čeka protivnika...`);
        }
    });

    // Prosleđivanje poteza
    socket.on('player_move', (data) => {
        // data sadrži: { roomId, row, col, points }
        // Šaljemo ovo onom drugom u sobi (broadcast to room excluding sender)
        socket.to(data.roomId).emit('remote_move', data);
    });

    // Chat poruke
    socket.on('chat_msg', (data) => {
        socket.to(data.roomId).emit('chat_msg', data);
    });

    socket.on('disconnect', () => {
        console.log('Igrač diskonektovan:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        // Javi protivniku da je ovaj izašao
        if (socket.roomId) {
            socket.to(socket.roomId).emit('opponent_left');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});