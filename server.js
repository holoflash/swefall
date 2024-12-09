import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';
import { locations } from './locations.js';
import helmet from 'helmet';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const ROOM_CODE_LENGTH = 6;
const RATE_LIMIT_MS = 200;

const rooms = {};
const rateLimiter = new Map();

app.use(helmet());

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

const handleLocationUpdate = (roomCode, eventName) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.location = pickRandom(locations);
    const spyPlayer = pickRandom(room.players);
    room.spy = spyPlayer.id;

    room.players.forEach((player) => {
        const [swedish, english] = room.location.split('/');
        const role = player.id === room.spy ? 'spion' : swedish;
        const roleEn = player.id === room.spy ? 'the spy' : english.trim();

        io.to(player.id).emit(eventName, {
            role,
            roleEn: player.includeEnglish ? roleEn : null,
        });
    });
};

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

    socket.on('join-room', ({ roomCode, username, includeEnglish }, callback) => {
        if (!rateLimit()) return;

        const room = rooms[roomCode];
        if (!room) return callback({ error: 'Rummet finns inte' });

        room.players.push({ id: socket.id, username, includeEnglish });
        socket.join(roomCode);
        io.to(roomCode).emit('update-players', room.players);
        callback({ success: true });
    });

    socket.on('start-game', ({ roomCode }) => {
        if (!rateLimit()) return;

        const room = rooms[roomCode];
        if (!room || room.players.length < 2) {
            return socket.emit('error', 'Det krävs minst 2 spelare för att starta');
        }

        handleLocationUpdate(roomCode, 'game-started');
    });

    socket.on('next-location', ({ roomCode }) => {
        if (!rateLimit()) return;
        handleLocationUpdate(roomCode, 'location-updated');
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
