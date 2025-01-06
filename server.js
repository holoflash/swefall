import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 4000;

const rooms = {};

io.on('connection', (socket) => {

    socket.on('generate-room-code', (data, callback) => {
        const { roomCode } = data;

        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: [], roundOver: false };
            callback({ success: true });
        } else {
            callback({ errorKey: 'roomCodeExists' });
        }
    });

    socket.on('join-game', ({ roomCode, name }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ errorKey: 'roomDoesNotExist' });
        }

        const player = room.players.find((p) => p.name === name);
        if (player) {
            return callback({ errorKey: 'nameTaken' });
        }

        const newPlayer = { name, socketId: socket.id, creator: room.players.length === 0, points: 0, guess: null, spy: false };
        room.players.push(newPlayer);
        socket.join(roomCode);

        callback({
            success: true,
            players: room.players,
            roundOver: room.roundOver,
            randomLocationNumber: room.randomLocationNumber,
            creator: newPlayer.creator,
            id: socket.id,
        });

        io.to(roomCode).emit('player-joined', { name, players: room.players });
    });

    socket.on('rejoin-game', ({ name, roomCode }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ errorKey: 'roomDoesNotExist' });
        }

        const player = room.players.find((p) => p.name === name);
        if (!player) {
            return callback({ errorKey: 'playerNotFound' });
        }

        player.socketId = socket.id;
        socket.join(roomCode);

        callback({
            success: true,
            players: room.players,
            roundOver: room.roundOver,
            randomLocationNumber: room.randomLocationNumber,
            creator: player.creator,
            id: socket.id,
        });

        socket.to(roomCode).emit('player-rejoined', { name });
    });

    socket.on('new-action', (roomCode, randomLocationNumber, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ errorKey: 'roomDoesNotExist' });
        }

        if (room.players.length < 1) {
            return callback({ errorKey: 'notEnoughPlayers' });
        }

        room.players.forEach((player) => {
            player.action = null;
            player.spy = false;
        });

        const randomSpyIndex = Math.floor(Math.random() * room.players.length);
        const spyPlayer = room.players[randomSpyIndex];
        spyPlayer.spy = true;

        room.randomLocationNumber = randomLocationNumber;

        io.to(roomCode).emit('new-action', {
            randomLocationNumber,
            players: room.players,
        });

        io.to(roomCode).emit('round-started');
        room.roundOver = false;
        callback({ success: true });
    });

    socket.on('round-over', (roomCode, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ errorKey: 'roomDoesNotExist' });
        }

        room.roundOver = true;

        io.to(roomCode).emit('round-over', {
            randomLocationNumber: room.randomLocationNumber,
            players: room.players,
        });

        callback({ success: true });
    });

    socket.on('make-guess', ({ roomCode, guessedPlayerName }, callback) => {
        const room = rooms[roomCode];
        if (!room) {
            return callback({ errorKey: 'roomDoesNotExist' });
        }

        const player = room.players.find(player => player.socketId === socket.id);
        if (!player) {
            return callback({ errorKey: 'playerNotFound' });
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
            return callback({ errorKey: 'roomDoesNotExist' });
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