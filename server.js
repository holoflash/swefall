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

const rooms = {};

app.use(helmet());

app.use(express.static(path.join(__dirname, 'swefall-client', 'dist')));

const shuffleLocations = (locations) => {
    return locations.sort(() => 0.5 - Math.random());
};

const createRoom = () => {
    let code;
    do {
        code = nanoid(ROOM_CODE_LENGTH).toUpperCase();
    } while (rooms[code]);
    rooms[code] = { players: [], spy: null, locations: shuffleLocations(locations), locationIndex: 0 };
    return code;
};

const handleLocationUpdate = (roomCode, eventName) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.locationIndex >= room.locations.length) {
        return { error: 'No more locations left' };
    }

    const location = room.locations[room.locationIndex];
    room.locationIndex++;

    const spyPlayer = room.players[Math.floor(Math.random() * room.players.length)];

    room.players.forEach((player) => {
        const [swedish, english] = location.split('/');
        const isSpy = player.id === spyPlayer.id;
        const role = isSpy ? 'spion' : swedish;
        const roleEn = isSpy ? 'the spy' : english.trim();

        io.to(player.id).emit(eventName, {
            role,
            roleEn: player.includeEnglish ? roleEn : null,
        });
    });
};


io.on('connection', (socket) => {
    socket.on('create-room', (callback) => {
        const roomCode = createRoom();
        callback(roomCode);
    });

    socket.on('join-room', ({ roomCode, username, includeEnglish }, callback) => {
        const room = rooms[roomCode];
        if (!room) return callback({ error: 'Rummet finns inte' });

        const existingPlayer = room.players.find((player) => player.id === socket.id);
        const duplicateName = room.players.some(
            (player) => player.username.toLowerCase() === username.toLowerCase()
        );

        if (duplicateName && !existingPlayer) {
            return callback({ error: 'Namnet är redan taget' });
        }

        if (username == "") {
            return callback({ error: 'Var god ange ett namn' });
        }

        if (!existingPlayer) {
            room.players.push({ id: socket.id, username, includeEnglish });
            socket.join(roomCode);
        }

        io.to(roomCode).emit('update-players', room.players);
        callback({ success: true });
    });

    socket.on('start-game', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.players.length < 2) {
            return socket.emit('error', 'Det krävs minst 2 spelare för att starta');
        }

        handleLocationUpdate(roomCode, 'game-started');
    });

    socket.on('next-location', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.players.length < 2) {
            return socket.emit('error', 'Det krävs minst 2 spelare för att spela');
        }
        handleLocationUpdate(roomCode, 'location-updated');
    });

    socket.on('disconnect', () => {
        Object.keys(rooms).forEach((roomCode) => {
            const room = rooms[roomCode];
            if (room) {
                room.players = room.players.filter((player) => player.id !== socket.id);
                io.to(roomCode).emit('update-players', room.players);

                if (room.players.length === 0) {
                    delete rooms[roomCode];
                }
            }
        });
    });

    socket.on('leave-room', ({ roomCode }, callback) => {
        const room = rooms[roomCode];
        if (room) {
            room.players = room.players.filter((player) => player.id !== socket.id);
            socket.leave(roomCode);

            io.to(roomCode).emit('update-players', room.players);
            if (room.players.length === 0) {
                delete rooms[roomCode];
            }
        }
        callback({ success: true });
    });

    socket.on('error', (err) => {
        console.error(`Socket error from ${socket.id}:`, err);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
