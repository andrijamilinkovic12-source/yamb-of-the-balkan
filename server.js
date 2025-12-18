const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Dozvoli pristup sa svih adresa (bitno za Render)
        methods: ["GET", "POST"]
    }
});

// Serviraj statički HTML fajl
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let waitingPlayer = null; // Igrač koji čeka protivnika

io.on('connection', (socket) => {
    console.log('Igrač konektovan:', socket.id);

    // 1. TRAŽENJE PROTIVNIKA
    socket.on('find_game', (nickname) => {
        socket.nickname = nickname;

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // Imamo par!
            const opponent = waitingPlayer;
            waitingPlayer = null; // Resetuj čekaonicu

            const roomId = "room_" + opponent.id + "_" + socket.id;
            
            // Ubaci oba igrača u sobu
            socket.join(roomId);
            opponent.join(roomId);

            // Sačuvaj ID sobe kod oba igrača
            socket.roomId = roomId;
            opponent.roomId = roomId;

            // Pokreni igru: Opponent je Prvi (index 0), Socket je Drugi (index 1)
            io.to(opponent.id).emit('game_start', { 
                myIndex: 0, 
                opponent: socket.nickname, 
                roomId: roomId 
            });
            
            io.to(socket.id).emit('game_start', { 
                myIndex: 1, 
                opponent: opponent.nickname, 
                roomId: roomId 
            });

            console.log(`Start igre: ${opponent.nickname} vs ${socket.nickname} u sobi ${roomId}`);

        } else {
            // Nema nikog, ti čekaš
            waitingPlayer = socket;
            console.log(`${nickname} čeka u redu...`);
        }
    });

    // 2. SINHRONIZACIJA BACANJA KOCKICA
    socket.on('dice_roll', (data) => {
        // data: { roomId, values, bacanje }
        socket.to(data.roomId).emit('remote_roll', data);
    });

    // 3. SINHRONIZACIJA ZADRŽAVANJA (HOLD)
    socket.on('dice_hold', (data) => {
        // data: { roomId, index, status }
        socket.to(data.roomId).emit('remote_hold', data);
    });

    // 4. SINHRONIZACIJA NAJAVE
    socket.on('announce', (data) => {
        // data: { roomId, type } (start/cancel)
        socket.to(data.roomId).emit('remote_announce', data);
    });

    // 5. SINHRONIZACIJA POTEZA (UPIS)
    socket.on('player_move', (data) => {
        // data: { roomId, row, col, points }
        socket.to(data.roomId).emit('remote_move', data);
    });

    // 6. CHAT
    socket.on('chat_msg', (data) => {
        socket.to(data.roomId).emit('chat_msg', data);
    });

    // 7. DISKONEKCIJA
    socket.on('disconnect', () => {
        console.log('Diskonektovan:', socket.id);
        
        // Ako je izašao onaj koji čeka, isprazni čekaonicu
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }

        // Ako je bio u igri, javi protivniku
        if (socket.roomId) {
            socket.to(socket.roomId).emit('opponent_left');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});