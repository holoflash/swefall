import React, { useEffect, useState, useCallback } from 'react';
import * as ServerActions from './serverActions';

const App: React.FC = () => {
  const [state, setState] = useState<ServerActions.ServerState>({
    roomCode: '',
    players: [],
    role: null,
    roleEn: null,
    gameStarted: false,
  });
  const [username, setUsername] = useState('');
  const [includeEnglish, setIncludeEnglish] = useState(false);
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

  useEffect(() => {
    const storedRoomCode = localStorage.getItem('roomCode');
    const storedUsername = localStorage.getItem('username');
    const storedIncludeEnglish = localStorage.getItem('includeEnglish') === 'true';
    if (storedRoomCode && storedUsername) {
      updateState({ roomCode: storedRoomCode });
      setUsername(storedUsername);
      setIncludeEnglish(storedIncludeEnglish);
      ServerActions.joinRoom(
        storedRoomCode,
        storedUsername,
        storedIncludeEnglish,
        updateState,
        setError
      );
    }
  }, [updateState]);

  const handleCreateRoom = () => {
    ServerActions.createRoom(updateState);
  };

  const handleJoinRoom = () => {
    ServerActions.joinRoom(state.roomCode, username, includeEnglish, updateState, setError);
    localStorage.setItem('roomCode', state.roomCode);
    localStorage.setItem('username', username);
    localStorage.setItem('includeEnglish', includeEnglish.toString());
  };

  const handleStartGame = () => ServerActions.startGame(state.roomCode);

  const handleNextLocation = () => {
    if (window.confirm('Gå till nästa plats?')) {
      ServerActions.nextLocation(state.roomCode);
    }
  };

  const handleClearLocalStorage = () => {
    if (window.confirm('Är du säker på att du vill lämna rummet?')) {
      localStorage.clear();
      updateState({ roomCode: '', players: [], role: null, gameStarted: false });
      setUsername('');
      setIncludeEnglish(false);
      setError('');
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
            <label id="english">
              <input
                type="checkbox"
                checked={includeEnglish}
                onChange={(e) => setIncludeEnglish(e.target.checked)}
              />
              English locations
            </label>
            <button onClick={handleJoinRoom}>Gå in i rummet</button>
            {error && <div id="error">{error}</div>}
          </div>
        ) : null}

        {(state.gameStarted || state.players.length > 0) && (
          <div id="game">
            <h2 id="room-display">Rum: {state.roomCode}</h2>
            <h3 id="player-label">Spelare:</h3>
            <ul id="players">
              {state.players.map((player, index) => (
                <li key={index}>{player}</li>
              ))}
            </ul>
            {state.role && (
              <>
                <div id="role-display">
                  {state.roleEn && includeEnglish ? (
                    <>
                      <div>{`Du är ${state.role}`}</div>
                      <div id="english">{`You are ${state.roleEn}`}</div>
                    </>
                  ) : (
                    `Du är ${state.role}`
                  )}
                </div>
                <button id="next-location" onClick={handleNextLocation}>
                  Nästa plats
                </button>
              </>
            )}
            {!state.gameStarted && (
              <button onClick={handleStartGame}>Starta</button>
            )}
            <button id="leave" onClick={handleClearLocalStorage}>
              Lämna rummet
            </button>
            {error && <div id="error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
