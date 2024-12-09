import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';
import { locations } from './locations.js';
import helmet from 'helmet'

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

const rateLimit = (socket) => {
    const now = Date.now();
    if (rateLimiter.has(socket.id) && now - rateLimiter.get(socket.id) < RATE_LIMIT_MS) {
        socket.emit('error', 'Too many requests. Please slow down.');
        return false;
    }
    rateLimiter.set(socket.id, now);
    return true;
};

io.on('connection', (socket) => {
    socket.on('create-room', (callback) => {
        if (!rateLimit(socket)) return;
        const roomCode = createRoom();
        callback(roomCode);
    });

    socket.on('join-room', ({ roomCode, username, includeEnglish }, callback) => {
        if (!rateLimit(socket)) return;

        if (!username) {
            return socket.emit('error', 'Ange ett giltigt namn');
        }

        if (!roomCode || !rooms[roomCode]) {
            return socket.emit('error', 'Ogiltigt rumskod');
        }

        const room = rooms[roomCode];
        room.players.push({ id: socket.id, username, includeEnglish });
        socket.join(roomCode);

        io.to(roomCode).emit('update-players', room.players);

        callback({ success: true });
    });


    socket.on('start-game', ({ roomCode }) => {
        if (!rateLimit(socket)) return;

        const room = rooms[roomCode];
        if (!room || room.players.length < 1) {
            return socket.emit('error', 'Minst 3 spelare krävs för att starta spelet');
        }

        const [swedish, english] = pickRandom(locations).split('/');
        const spyPlayer = pickRandom(room.players);
        room.spy = spyPlayer.id;

        room.players.forEach((player) => {
            const role = player.id === room.spy ? 'spionen' : swedish;
            const roleEn = player.id === room.spy ? 'the spy' : english.trim();
            io.to(player.id).emit('game-started', {
                role,
                roleEn: player.includeEnglish ? roleEn : null,
            });
        });
    });

    socket.on('next-location', ({ roomCode }) => {
        if (!rateLimit(socket)) return;

        const room = rooms[roomCode];
        if (!room) return;

        const [swedish, english] = pickRandom(locations).split('/');
        const spyPlayer = pickRandom(room.players);
        room.spy = spyPlayer.id;

        room.players.forEach((player) => {
            const role = player.id === room.spy ? 'spionen' : swedish;
            const roleEn = player.id === room.spy ? 'the spy' : english.trim();
            io.to(player.id).emit('location-updated', {
                role,
                roleEn: player.includeEnglish ? roleEn : null,
            });
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
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
