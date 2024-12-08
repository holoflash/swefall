import React, { useEffect, useState, useCallback } from 'react';
import * as ServerActions from './serverActions';

const App: React.FC = () => {
  const [state, setState] = useState<ServerActions.ServerState>({
    roomCode: '',
    players: [],
    role: null,
    gameStarted: false,
  });
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const updateState = useCallback(
    (partialState: Partial<ServerActions.ServerState>) => {
      setState((prevState) => ({ ...prevState, ...partialState }));
    },
    []
  );

  useEffect(() => {
    const cleanup = ServerActions.initializeServerActions(updateState, setError);
    return () => cleanup();
  }, [updateState]);

  const handleCreateRoom = () => ServerActions.createRoom(updateState);

  const handleJoinRoom = () => {
    if (!state.roomCode || !username) {
      setError('Rumskod och/eller namn saknas');
      return;
    }
    ServerActions.joinRoom(state.roomCode, username, updateState, setError);
  };

  const handleStartGame = () => ServerActions.startGame(state.roomCode);

  const handleNextLocation = () => {
    if (window.confirm('Gå till nästa plats?')) {
      ServerActions.nextLocation(state.roomCode);
    }
  };

  return (
    <div className="game-view">
      <header>SWEFALL</header>
      <div className="container">
        {!state.gameStarted && state.players.length === 0 ? (
          <div id="lobby">
            <p>Skapa ett rum eller fyll i rumskod för att gå med i ett rum</p>
            <button onClick={handleCreateRoom}>Skapa Rum</button>
            <input
              id="room-code"
              placeholder="Rumskod"
              value={state.roomCode}
              onChange={(e) => updateState({ roomCode: e.target.value })}
            />
            <input
              id="username"
              placeholder="Namn (max 10 tecken)"
              value={username}
              onChange={(e) => {
                if (e.target.value.length <= 10) {
                  setUsername(e.target.value);
                }
              }}
              maxLength={20}
            />
            <button onClick={handleJoinRoom}>Gå in i rummet</button>
          </div>
        ) : null}

        {(state.gameStarted || state.players.length > 0) && (
          <div id="game">
            <h2>Rum: {state.roomCode}</h2>
            <h3 id="player-label">Spelare:</h3>
            <ul id="players">
              {state.players.map((player, index) => (
                <li key={index}>{player}</li>
              ))}
            </ul>
            {!state.gameStarted && state.players.length > 0 && (
              <button onClick={handleStartGame}>Starta</button>
            )}
            {state.role && (
              <>
                <div id="role-display">Du är {state.role}</div>
                <button id="next-location" onClick={handleNextLocation}>
                  Byta byta!
                </button>
              </>
            )}
            {error && <div id="error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
