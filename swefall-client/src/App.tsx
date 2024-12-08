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
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  const createRoom = () => {
    socket.emit('create-room', (code: string) => {
      setRoomCode(code);
    });
  };

  const joinRoom = () => {
    if (!roomCode || !username) {
      setError('Rumskod och/eller namn saknas');
      return;
    }

    socket.emit('join-room', { roomCode, username }, (response: { error?: string }) => {
      if (response.error) {
        setError(response.error);
      } else {
        setError('');
        setHasJoinedRoom(true);
        setGameStarted(false);
      }
    });
  };

  const startGame = () => {
    socket.emit('start-game', { roomCode });
  };

  const nextLocation = () => {
    const confirmNextLocation = window.confirm('Gå till nästa plats?');
    if (confirmNextLocation) {
      socket.emit('next-location', { roomCode });
    }
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
    <div className='game-view'>
      <header>SWEFALL</header>
      <div className="container">
        {!gameStarted && !hasJoinedRoom ? (
          <div id="lobby">
            <p>Skapa ett rum eller fyll i rumskod för att gå med i ett rum</p>
            <button onClick={createRoom}>Skapa Rum</button>
            <input
              id="room-code"
              placeholder="Rumskod"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <input
              id="username"
              placeholder="Namn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button onClick={joinRoom}>Gå in i rummet</button>
            {error && <div id="error">{error}</div>}
          </div>
        ) : null}

        <div id="game" style={{ display: gameStarted || players.length > 0 ? 'block' : 'none' }}>
          <h2>Rum: {roomCode}</h2>
          <h3 id="player-label">Spelare:</h3>
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
              <div id="role-display">Du är {role}</div>
              <button id="next-location" onClick={nextLocation}>Byta byta!</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
