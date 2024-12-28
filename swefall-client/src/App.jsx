import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';
import uiText from '../locations-en.json'

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
const socket = io(URL, { autoConnect: false });

const App = () => {
  const initialUserData = {
    name: '',
    roomCode: '',
    playing: false,
    action: '',
    players: [],
    creator: false
  };

  const [userData, setUserData] = useState(initialUserData);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roundOver, setRoundOver] = useState(false);

  const getMessage = (key, replacements = {}) => {
    let message = uiText.uiMessages[key] || `Message for key '${key}' not found.`;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      message = message.replace(`{${placeholder}}`, value);
    });
    return message;
  };

  const generateRoomCode = () => {
    socket.emit('generate-room-code', (response) => {
      if (response.roomCode) {
        setUserData((prevData) => ({
          ...prevData,
          roomCode: response.roomCode,
        }));
        setMessage(getMessage('roomCodeGenerated'));
      } else {
        setMessage(getMessage('roomCodeGenerationFailed'));
      }
    });
  };

  const getNewAction = () => {
    const randomLocationNumber = Math.floor(Math.random() * Object.keys(uiText.locations).length) + 1;
    const randomLocation = uiText.locations[randomLocationNumber];
    socket.emit('new-action', userData.roomCode, randomLocation, (response) => {
      if (response.errorKey) {
        setMessage(getMessage(response.errorKey));
      }
    });
  };

  const leaveGame = () => {
    socket.emit('leave-room', { name: userData.name, roomCode: userData.roomCode },
      () => {
        setUserData(initialUserData);
        localStorage.removeItem('userData');
        setMessage(getMessage('leftGame'));
        socket.disconnect();
      }
    );
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleGuess = (guessedPlayerName) => {
    socket.emit('make-guess', { roomCode: userData.roomCode, guessedPlayerName },
      (response) => {
        if (response.errorKey) {
          setMessage(getMessage(response.errorKey));
        } else {
          setMessage(getMessage('guessRegistered'));
        }
      }
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { name, roomCode } = userData;

    if (!name || !roomCode) {
      setMessage(getMessage('nameAndRoomCodeRequired'));
      return;
    }

    socket.emit('join-game', { name, roomCode },
      (response) => {
        if (response.errorKey) {
          setMessage(getMessage(response.errorKey));
        } else {
          setUserData((prevData) => ({
            ...prevData,
            playing: true,
            action: response.action || '',
            players: response.players || [],
            creator: response.creator || false,
          }));
          setMessage(getMessage('joinedGame'));
        }
      }
    );
  };

  const resetGame = () => {
    socket.emit('new-game', userData.roomCode, (response) => {
      if (response.error) {
        setMessage(response.error);
      } else {
        setMessage(getMessage('gameReset'));
      }
    });
  };

  useEffect(() => {
    if (message !== '') {
      const timer = setTimeout(() => setMessage(), 1500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    if (savedUserData) {
      const parsedData = JSON.parse(savedUserData);
      setUserData((prevData) => ({
        ...prevData,
        name: parsedData.name,
        roomCode: parsedData.roomCode,
      }));

      socket.connect();
      socket.emit('rejoin-game', parsedData, (response) => {
        if (response.error) {
          setMessage(response.error);
        } else {
          setUserData((prevData) => ({
            ...prevData,
            playing: true,
            players: response.players,
            creator: response.creator,
            action: response.action,
          }));
          setRoundOver(response.roundOver);
          setMessage('Du har återanslutit till spelet!');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (userData && userData.name && userData.roomCode) {
      localStorage.setItem('userData', JSON.stringify(userData));
    }
  }, [userData]);

  useEffect(() => {
    socket.connect();
    socket.on('new-action', (data) => {
      setUserData((prevData) => ({
        ...prevData,
        players: data.players.map((player) => ({
          ...player,
          action: player.action,
          spy: player.spy || false,
        })),
      }));
    });

    socket.on('player-joined', (response) => {
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage(getMessage('playerJoined', { name: response.name }));
    });

    socket.on('player-left-room', (response) => {
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage(getMessage('playerLeft', { name: response.name }));
    });

    socket.on('round-started', () => {
      setMessage(getMessage('roundStarted'));
      setRoundOver(false);
    });

    socket.on('round-over', (response) => {
      setRoundOver(true);
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage(getMessage('roundOver'));
    });

    socket.on('update-guess', (data) => {
      setUserData((prevData) => ({
        ...prevData,
        players: data.players,
      }));
    });

    socket.on('game-reset', (data) => {
      setUserData((prevData) => ({
        ...prevData,
        players: data.players,
      }));
      setMessage('Spelet har återställts!');
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setMessage(getMessage('disconnected'));
    });

    return () => {
      socket.off('new-action');
      socket.off('player-joined');
      socket.off('player-left-room');
      socket.off('round-started');
      socket.off('round-over');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('update-guess');
      socket.off('game-reset');
    };
  }, [isConnected]);

  return (
    <div className='container'>
      {!userData.playing ? (
        <>
          <div className='title'>{uiText.ui.title}</div>
          <div className='description wrapper'>{uiText.ui.welcome}</div>
          <form onSubmit={handleSubmit} className='login-form wrapper' autoComplete='off'>
            <input
              type='text'
              name='name'
              maxLength={10}
              value={userData.name}
              onChange={handleInputChange}
              placeholder={uiText.ui.namePlaceholder}
              required
            />
            <input
              type='text'
              name='roomCode'
              value={userData.roomCode}
              onChange={handleInputChange}
              placeholder={uiText.ui.roomCodePlaceholder}
              required
            />
            <div className='game-buttons'>
              <button type='button' onClick={generateRoomCode}>
                {uiText.ui.generateCodeButton}
              </button>
              <button type='submit'>
                {uiText.ui.joinRoomButton}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className='game-view wrapper'>
          <button
            title={uiText.ui.copyRoomCode}
            className='room-code-button'
            onClick={() => {
              navigator.clipboard.writeText(userData.roomCode);
              setMessage(uiText.ui.roomCodeCopied);
            }}>
            {`RUMSKOD: ${userData.roomCode}`}
          </button>

          <div>
            {roundOver && userData.players.some(player => player.action) && (
              <div className="action-finished wrapper">
                <h3>
                  {userData.players.find(player => player.spy).name} {uiText.ui.spyWas}
                </h3>
                <div>{uiText.ui.locationWas}</div>
                <h3>
                  {userData.players.find(player => player.name === userData.name).action}
                </h3>
              </div>
            )}

            {!roundOver && userData.players.some(player => player.name === userData.name && player.spy) && (
              <div className='action wrapper'>
                {uiText.ui.isSpy}
              </div>
            )}

            {!roundOver && !userData.players.some(player => player.name === userData.name && player.spy) && (
              <div className='action-pending wrapper'>
                {userData.players.find(player => player.name === userData.name)?.action || uiText.ui.getReady}
              </div>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>{uiText.ui.nameHeader}</th>
                <th>{uiText.ui.pointsHeader}</th>
                <th>{uiText.ui.accuseHeader}</th>
              </tr>
            </thead>
            <tbody>
              {userData.players.map((player) => (
                <tr key={player.name}>
                  <td>{player.name}</td>
                  <td>{player.points}</td>
                  <td>
                    {player.name === userData.name && player.spy && (
                      uiText.ui.youAreSpy
                    )}

                    {player.name === userData.name && !player.spy && (
                      uiText.ui.you
                    )}

                    {!roundOver && userData.players.some(player => player.name !== userData.name && player.spy) && player.name !== userData.name && (
                      <button
                        className={`accuse-button ${userData.players.find(p => p.name === userData.name)?.guess === player.name ? 'accused' : ''}`}
                        onClick={() => handleGuess(player.name)}
                        disabled={roundOver}
                      >
                        {uiText.ui.accuseSpy}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='game-buttons'>
            {userData.creator && (
              <>
                <button className="boss" onClick={getNewAction}>
                  {uiText.ui.newRoundButton}
                </button>
                <button className="boss" onClick={resetGame}>
                  {uiText.ui.newGameButton}
                </button>
              </>
            )}
            <button onClick={leaveGame}>
              {uiText.ui.leaveGameButton}
            </button>
          </div>
        </div>
      )}
      {message && <div className='message'>{message}</div>}
    </div>
  );
};

export default App;