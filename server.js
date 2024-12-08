import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';
import { locations } from './locations.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const ROOM_CODE_LENGTH = 6;
const RATE_LIMIT_MS = 200;

const rooms = {};
const rateLimiter = new Map();

app.use(express.static(path.join(__dirname, 'swefall-client', 'dist')));

const createRoom = () => {
    let code;
    do {
        code = nanoid(ROOM_CODE_LENGTH).toUpperCase();
    } while (rooms[code]);
    rooms[code] = { players: [], spy: null, location: null };
    return code;
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

io.on('connection', (socket) => {
    const rateLimit = () => {
        const now = Date.now();
        if (rateLimiter.has(socket.id) && now - rateLimiter.get(socket.id) < RATE_LIMIT_MS) {
            socket.emit('error', 'Du går för fort! Sakta ner.');
            return false;
        }
        rateLimiter.set(socket.id, now);
        return true;
    };

    socket.on('create-room', (callback) => {
        if (!rateLimit()) return;
        const roomCode = createRoom();
        callback(roomCode);
    });

    socket.on('join-room', ({ roomCode, username }, callback) => {
        if (!rateLimit()) return;

        const room = rooms[roomCode];
        if (!room) return callback({ error: 'Rummet finns inte' });

        room.players.push({ id: socket.id, username });
        socket.join(roomCode);
        io.to(roomCode).emit('update-players', room.players);
        callback({ success: true });
    });

    socket.on('start-game', ({ roomCode }) => {
        if (!rateLimit()) return;

        const room = rooms[roomCode];
        if (!room || room.players.length < 3) {
            return socket.emit('error', 'Inte tillräckligt många spelare för att starta');
        }

        room.location = pickRandom(locations);
        const spyPlayer = pickRandom(room.players);
        room.spy = spyPlayer.id;

        room.players.forEach((player) => {
            const role = player.id === room.spy ? 'spion' : room.location;
            io.to(player.id).emit('game-started', { role });
        });
    });

    socket.on('next-location', ({ roomCode }) => {
        if (!rateLimit()) return;

        const room = rooms[roomCode];
        if (!room) return;

        room.location = pickRandom(locations);
        const spyPlayer = pickRandom(room.players);
        room.spy = spyPlayer.id;

        room.players.forEach((player) => {
            const role = player.id === room.spy ? 'spion' : room.location;
            io.to(player.id).emit('location-updated', { role });
        });
    });

    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            room.players = room.players.filter((player) => player.id !== socket.id);

            if (room.players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('update-players', room.players);
            }
        }

        rateLimiter.delete(socket.id);
    });

    socket.on('error', (err) => {
        console.error(`Socket error from ${socket.id}:`, err);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
