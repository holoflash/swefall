import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';
import { locations } from './locations.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'swefall-client', 'dist')));

const rooms = {};

const createRoom = () => {
    let code;
    do {
        code = nanoid(6).toUpperCase();
    } while (rooms[code]);
    rooms[code] = { players: [], spy: null, location: null };
    return code;
};

io.on('connection', (socket) => {
    socket.on('create-room', (callback) => {
        const roomCode = createRoom();
        callback(roomCode);
    });

    socket.on('join-room', ({ roomCode, username }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: 'Room not found' });
        }
        if (room.players.some((player) => player.id === socket.id)) {
            return callback({ error: 'You are already in the room' });
        }
        room.players.push({ id: socket.id, username });
        socket.join(roomCode);
        io.to(roomCode).emit('update-players', room.players);
        callback({ success: true });
    });

    socket.on('start-game', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.players.length < 1) {
            return io.to(socket.id).emit('error', 'Not enough players to start the game');
        }

        room.location = locations[Math.floor(Math.random() * locations.length)];
        const spyIndex = Math.floor(Math.random() * room.players.length);
        room.spy = room.players[spyIndex].id;

        room.players.forEach((player) => {
            const role = player.id === room.spy ? 'spion' : room.location;
            io.to(player.id).emit('game-started', { role });
        });
    });

    socket.on('next-location', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room) return;

        room.location = locations[Math.floor(Math.random() * locations.length)];

        const spyIndex = Math.floor(Math.random() * room.players.length);
        const spyPlayer = room.players[spyIndex];

        room.players.forEach((player) => {
            const role = player === spyPlayer ? 'spion' : room.location;
            io.to(player.id).emit('location-updated', { role });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            room.players = room.players.filter((player) => player.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('update-players', room.players);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
