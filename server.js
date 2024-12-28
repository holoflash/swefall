import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { locations } from './locations-se.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'swefall-client', 'dist')));

const PORT = process.env.PORT || 4000;

const generateRandomString = (length) => {
    const characters = 'abcdefghijklmnopqrstuvxyz0123456789';
    const charactersLength = characters.length;
    return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * charactersLength))).join('');
};

const rooms = {};

io.on('connection', (socket) => {
    socket.on('generate-room-code', (callback) => {
        const roomCode = generateRandomString(6);
        rooms[roomCode] = { players: [], roundOver: false };
        callback({ roomCode });
    });

    socket.on('join-game', ({ roomCode, name }, callback) => {
        if (!rooms[roomCode]) {
            return callback({ error: "Rummet existerar inte" });
        }

        const room = rooms[roomCode];

        if (room.players.some((player) => player.name === name)) {
            return callback({ error: "Namnet är upptaget" });
        }

        const creator = room.players.length === 0;
        const newPlayer = {
            name,
            socketId: socket.id,
            creator,
            points: 0,
            guess: null,
            spy: false,
            action: null,
        };

        room.players.push(newPlayer);

        callback({
            players: room.players,
            creator,
            id: socket.id,
            roundOver: room.roundOver,
        });

        socket.join(roomCode);
        io.to(roomCode).emit('player-joined', { name, players: room.players });
    });

    socket.on('rejoin-game', ({ name, roomCode }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            callback({ error: 'Rummet existerar inte' });
            return;
        }

        const player = room.players.find((player) => player.name === name);
        if (!player) {
            callback({ error: 'Spelaren finns inte i rummet' });
            return;
        }

        player.socketId = socket.id;
        socket.join(roomCode);

        callback({
            players: room.players,
            creator: player.creator,
            id: socket.id,
            action: player.action || null,
            roundOver: room.roundOver,
        });

        socket.to(roomCode).emit('player-rejoined', { name });
    });

    socket.on('new-action', (roomCode, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: "Rummet existerar inte" });
        }

        if (room.players.length < 1) {
            return callback({ error: "Inte tillräcklig med spelare för att starta!" })
        }

        const randomAction = locations[Math.floor(Math.random() * locations.length)];

        room.players.forEach(player => {
            player.action = randomAction.trim();
            player.spy = false;
        });

        const randomSpyIndex = Math.floor(Math.random() * room.players.length);
        const spyPlayer = room.players[randomSpyIndex];
        spyPlayer.spy = true;

        io.to(roomCode).emit('new-action', {
            action: spyPlayer.action,
            players: room.players.map(player => ({
                ...player,
                action: player.action,
                spy: player.spy || false,
            })),
        });
        io.to(roomCode).emit('round-started');
        room.roundOver = false;

        callback({ success: true });
    });

    socket.on('make-guess', ({ roomCode, guessedPlayerName }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: "Rummet existerar inte" });
        }

        const player = room.players.find(player => player.socketId === socket.id);
        if (!player) {
            return callback({ error: "Spelaren hittades inte" });
        }

        player.guess = guessedPlayerName;

        io.to(roomCode).emit('update-guess', {
            players: room.players,
        });

        const allGuessed = room.players
            .filter(player => !player.spy)
            .every(player => player.guess !== null);

        if (allGuessed) {
            let incorrectGuesses = 0;
            const spy = room.players.find(p => p.spy);
            const spyName = spy?.name;

            room.players.forEach(player => {
                if (!player.spy && player.guess !== spyName) {
                    incorrectGuesses++;
                }
            });

            room.players.forEach(player => {
                if (player.spy && incorrectGuesses > 0) {
                    player.points += incorrectGuesses;
                }
            });

            room.players.forEach(player => {
                if (!player.spy && player.guess === spyName) {
                    player.points += 1;
                }
            });

            io.to(roomCode).emit('round-over', {
                players: room.players,
                action: room.action,
            });

            room.roundOver = true;
            room.players.forEach(player => {
                player.guess = null;
            });
        }
        callback({ success: true });
    });

    socket.on('new-game', (roomCode, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: "Rummet existerar inte" });
        }

        room.players.forEach(player => {
            player.points = 0;
            player.action = null;
            player.spy = false;
            player.guess = null;
        });

        room.roundOver = false;
        io.to(roomCode).emit('game-reset', { players: room.players });

        callback({ success: true });
    });

    socket.on('leave-room', ({ name, roomCode }, callback) => {
        const room = rooms[roomCode];
        if (room) {
            room.players = room.players.filter((player) => player.name !== name);
            io.to(roomCode).emit('player-left-room', { name, players: room.players });
            socket.leave(roomCode);
            if (room.players.length === 0) {
                delete rooms[roomCode];
            }
        }
        callback({ success: true });
    });

    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players.length === 0) {
                delete rooms[roomCode];
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
