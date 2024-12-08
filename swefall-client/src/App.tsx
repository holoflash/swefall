import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io();

const App: React.FC = () => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const createRoom = () => {
    socket.emit('create-room', (code: string) => {
      setRoomCode(code);
    });
  };

  const joinRoom = () => {
    if (!roomCode || !username) {
      setError('Please enter a room code and username.');
      return;
    }

    socket.emit('join-room', { roomCode, username }, (response: { error?: string }) => {
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        setGameStarted(false);
      }
    });
  };

  const startGame = () => {
    socket.emit('start-game', { roomCode });
  };

  const nextLocation = () => {
    socket.emit('next-location', { roomCode });
  };

  useEffect(() => {
    socket.on('update-players', (updatedPlayers: { username: string }[]) => {
      setPlayers(updatedPlayers.map((player) => player.username));
    });

    socket.on('game-started', ({ role }: { role: string }) => {
      setRole(role);
      setGameStarted(true);
    });

    socket.on('location-updated', ({ role }: { role: string }) => {
      setRole(role);
    });

    return () => {
      socket.off('update-players');
      socket.off('game-started');
      socket.off('location-updated');
    };
  }, []);

  return (
    <div className="container" style={{ textAlign: 'center', color: '#E0E0E0' }}>
      <h1>SWEFALL</h1>

      {!gameStarted ? (
        <div id="lobby">
          <button onClick={createRoom}>Skapa Rum</button>
          <input
            id="room-code"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <input
            id="username"
            placeholder="Your Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={joinRoom}>Joina Rummet</button>
          {error && <div id="error" style={{ color: 'red' }}>{error}</div>}
        </div>
      ) : null}

      <div id="game" style={{ display: gameStarted || players.length > 0 ? 'block' : 'none' }}>
        <h2>Rum: {roomCode}</h2>
        <h3>Spelare:</h3>
        <ul id="players">
          {players.map((player, index) => (
            <li key={index}>{player}</li>
          ))}
        </ul>
        {!gameStarted && players.length > 0 && (
          <button onClick={startGame}>Starta</button>
        )}
        {role && (
          <>
            <h3 id="role-display">{role}</h3>
            <button onClick={nextLocation}>Nästa Plats</button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
