import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { locations } from './locations.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'swefall-client', 'dist')));

const PORT = process.env.PORT || 4000;

const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * charactersLength))).join('');
};

const rooms = {};

io.on('connection', (socket) => {
    socket.on('generate-room-code', (callback) => {
        const roomCode = generateRandomString(6);
        rooms[roomCode] = { players: [] };
        callback({ roomCode });
    });

    socket.on('join-game', ({ roomCode, name, english }, callback) => {
        if (!rooms[roomCode]) {
            return callback({ error: "Room does not exist" });
        }

        const room = rooms[roomCode];

        if (room.players.some((player) => player.name === name)) {
            return callback({ error: "Player name already exists in the room" });
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
            english,
        };

        room.players.push(newPlayer);

        callback({
            players: room.players,
            creator,
            id: socket.id,
        });

        socket.join(roomCode);
        io.to(roomCode).emit('player-joined', { name, players: room.players });
    });

    socket.on('rejoin-game', ({ name, roomCode }, callback) => {
        console.log("Rejoined");
        const room = rooms[roomCode];
        if (!room) {
            callback({ error: 'Room does not exist' });
            return;
        }

        const player = room.players.find((player) => player.name === name);
        if (!player) {
            callback({ error: 'Player not found in the room' });
            return;
        }

        player.socketId = socket.id;
        socket.join(roomCode);

        callback({
            players: room.players,
            creator: player.creator,
            id: socket.id,
            action: player.action || null,
            roundOver: false,
        });

        socket.to(roomCode).emit('player-rejoined', { name });
    });

    socket.on('new-action', (roomCode, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: "Room does not exist" });
        }

        if (room.players.length < 2) {
            return callback({ error: "Not enough players to start the game!" })
        }

        const randomAction = locations[Math.floor(Math.random() * locations.length)];
        const [swedishAction, englishAction] = randomAction.split('/');

        room.players.forEach(player => {
            if (player.english) {
                player.action = englishAction.trim();
            } else {
                player.action = swedishAction.trim();
            }
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

        callback({ success: true });
    });

    socket.on('make-guess', ({ roomCode, guessedPlayerName }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: "Room does not exist" });
        }

        const player = room.players.find(player => player.socketId === socket.id);
        if (!player) {
            return callback({ error: "Player not found" });
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
            const spyName = room.players.find(p => p.spy)?.name;

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

            io.to(roomCode).emit('round-over', {
                players: room.players,
                action: room.action,
            });

            room.players.forEach(player => {
                player.guess = null;
            });
        }
        callback({ success: true });
    });

    socket.on('new-game', (roomCode, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ error: "Room does not exist" });
        }

        room.players.forEach(player => {
            player.points = 0;
            player.action = null;
            player.spy = false;
            player.guess = null;
        });

        io.to(roomCode).emit('game-reset', { players: room.players });

        callback({ success: true });
    });

    socket.on('leave-room', ({ name, roomCode }, callback) => {
        const room = rooms[roomCode];
        if (room) {
            room.players = room.players.filter((player) => player.name !== name);
            io.to(roomCode).emit('player-left-room', { name: name, players: room.players });
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
        console.log("Disconnected:", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});