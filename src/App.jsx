import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';
import { generateRandomString } from './utils/generateRandomString';
import languages from './data/languages.json'

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
const socket = io(URL, { autoConnect: false });

const App = () => {
  const initialUserData = {
    name: '',
    roomCode: '',
    inGame: false,
    roundOver: true,
    gameInProgress: false,
    players: [],
    creator: false,
  };

  const [userData, setUserData] = useState(initialUserData);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);

  const defaultLanguage = 'english';
  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem('language');
    return storedLanguage || defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const { flag, uiText, locations, uiMessages } = languages[language] || languages[defaultLanguage];

  const toggleLanguage = () => {
    setLanguage((prevLanguage) => {
      const availableLanguages = Object.keys(languages);
      const nextLanguageIndex = (availableLanguages.indexOf(prevLanguage) + 1) % availableLanguages.length;
      return availableLanguages[nextLanguageIndex];
    });
  };

  useEffect(() => {
    updateUserData({
      randomLocationNumber: userData.randomLocationNumber,
      players: userData.players.map((player) => ({
        ...player,
        action: player.spy
          ? uiText.isSpy
          : locations[userData.randomLocationNumber],
        spy: player.spy || false,
      })),
    });
  }, [language, locations]);

  const getMessage = (setMessages, key, replacements = {}) => {
    let newMessage = uiMessages[key] || `Message for key '${key}' not found.`;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      newMessage = newMessage.replace(`{${placeholder}}`, value);
    });

    const messageObject = { id: `${Date.now()}-${Math.random()}`, text: newMessage };

    setMessages((prevMessages) => [...prevMessages, messageObject]);

    setTimeout(() => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageObject.id)
      );
    }, 1500);
  };

  const updateUserData = (updates) => {
    setUserData((prevData) => ({
      ...prevData,
      ...updates,
    }));
  };

  useEffect(() => {
    console.log("roundOver:", userData.roundOver, "gameinprogres", userData.gameInProgress);
  }, [userData.roundOver]);

  const generateRoomCode = () => {
    const roomCode = generateRandomString(6);

    socket.emit('generate-room-code', { roomCode }, (response) => {
      if (response.success) {
        updateUserData({ roomCode });
        getMessage(setMessages, 'roomCodeGenerated');
      } else {
        getMessage(setMessages, response.errorKey);
      }
    });
  };


  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'roomCode') {
      updateUserData({ [name]: value.toUpperCase() });
    } else {
      updateUserData({ [name]: value });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { name, roomCode } = userData;

    if (!name || !roomCode) {
      getMessage(setMessages, 'nameAndRoomCodeRequired');
      return;
    }

    socket.emit('join-game', { name, roomCode }, (response) => {
      if (response.errorKey) {
        getMessage(setMessages, response.errorKey);
      } else {
        updateUserData({
          inGame: true,
          players: response.players || [],
          creator: response.creator || false,
        });
        getMessage(setMessages, 'joinedGame');
      }
    });
  };

  const getNewAction = () => {
    const randomLocationNumber = Math.floor(Math.random() * Object.keys(locations).length) + 1;

    socket.emit('new-action', userData.roomCode, randomLocationNumber, (response) => {
      if (response.errorKey) {
        getMessage(setMessages, response.errorKey);
      }
    });
  };

  const leaveGame = () => {
    socket.emit('leave-room', { name: userData.name, roomCode: userData.roomCode },
      () => {
        setUserData(initialUserData);
        localStorage.removeItem('userData');
        getMessage(setMessages, 'leftGame');
        socket.disconnect();
      }
    );
  };

  const handleGuess = (guessedPlayerName) => {
    socket.emit('make-guess', { roomCode: userData.roomCode, guessedPlayerName },
      (response) => {
        if (response.errorKey) {
          getMessage(setMessages, response.errorKey);
        } else {
          getMessage(setMessages, 'guessRegistered');
        }
      }
    );
  };

  const resetGame = () => {
    socket.emit('new-game', userData.roomCode, (response) => {
      if (response.errorKey) {
        getMessage(setMessages, response.errorKey);
      }
    });
  };

  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    if (savedUserData) {
      const parsedData = JSON.parse(savedUserData);
      updateUserData({
        name: parsedData.name,
        roomCode: parsedData.roomCode,
        roundOver: parsedData.roundOver,
        gameInProgress: parsedData.gameInProgress,
      });

      socket.connect();
      socket.emit('rejoin-game', parsedData, (response) => {
        if (response.errorKey) {
          getMessage(setMessages, response.errorKey);
        } else {
          updateUserData({
            inGame: true,
            players: response.players,
            creator: response.creator,
            randomLocationNumber: response.randomLocationNumber
          });
          getMessage(setMessages, 'reconnected');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (userData.name && userData.roomCode) {
      localStorage.setItem('userData', JSON.stringify(userData));
    }
  }, [userData]);

  useEffect(() => {
    socket.connect();

    socket.on('new-action', (response) => {
      updateUserData({
        gameInProgress: true,
        roundOver: false,
        randomLocationNumber: response.randomLocationNumber,
        players: response.players.map((player) => ({
          ...player,
          action: player.spy
            ? uiText.isSpy
            : locations[response.randomLocationNumber],
          spy: player.spy || false,
        })),
      });
    });

    socket.on('player-joined', (response) => {
      updateUserData({
        gameInProgress: false,
        roundOver: true,
        players: response.players,
      });
      if (userData.name !== response.name) {
        getMessage(setMessages, 'playerJoined', { name: response.name })
      };
    });

    socket.on('player-left-room', (response) => {
      updateUserData({
        gameInProgress: false,
        roundOver: true,
        players: response.players,
      });
      getMessage(setMessages, 'playerLeft', { name: response.name });
    });

    socket.on('round-started', () => {
      getMessage(setMessages, 'roundStarted');
    });

    socket.on('round-over', (response) => {
      updateUserData({
        roundOver: true,
        players: response.players
      });
      getMessage(setMessages, 'roundOver');
    });

    socket.on('update-guess', (response) => {
      updateUserData({ players: response.players });
    });

    socket.on('game-reset', (response) => {
      updateUserData({
        roundOver: true,
        gameInProgress: false,
        players: response.players
      });
      getMessage(setMessages, 'gameReset');
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      getMessage(setMessages, 'disconnected');
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
  }, [isConnected, language]);

  return (
    <div className='container'>
      <button onClick={toggleLanguage} className='language'>
        {flag}
      </button>
      {!userData.inGame ? (
        <>
          <div className='title'>{uiText.title}</div>
          <div className='description wrapper'>{uiText.welcome}</div>
          <form onSubmit={handleSubmit} className='login-form wrapper' autoComplete='off'>
            <input
              type='text'
              name='name'
              maxLength={10}
              value={userData.name}
              onChange={handleInputChange}
              placeholder={uiText.namePlaceholder}
              required
            />
            <input
              type='text'
              name='roomCode'
              value={userData.roomCode}
              onChange={handleInputChange}
              placeholder={uiText.roomCodePlaceholder}
              required
            />
            <div className='game-buttons'>
              <button type='button' onClick={generateRoomCode}>
                {uiText.generateCodeButton}
              </button>
              <button type='submit'>
                {uiText.joinRoomButton}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className='game-view wrapper'>
          <button
            title={uiText.copyRoomCode}
            className='room-code-button'
            onClick={() => {
              navigator.clipboard.writeText(userData.roomCode);
              getMessage(setMessages, 'roomCodeCopied');
            }}>
            {`${uiText.roomCode}: ${userData.roomCode}`}
          </button>

          <div>
            {userData.roundOver && userData.gameInProgress && (
              <div className="action-finished wrapper">
                <h3>
                  {userData.players.find((player) => player.spy).name} {uiText.spyWas}
                </h3>
                <div>{uiText.locationWas} </div>
                <h3>
                  {locations[userData.randomLocationNumber]}
                </h3>
              </div>
            )}

            {userData.roundOver && !userData.gameInProgress && (
              <div className="action-pending wrapper">
                {uiText.getReady}
              </div>
            )}

            {!userData.roundOver && userData.players.some((player) => player.name === userData.name && player.spy) && (
              <div className="action wrapper">{uiText.isSpy}</div>
            )}

            {!userData.roundOver && !userData.players.some((player) => player.name === userData.name && player.spy) && (
              <div className="action-pending wrapper">
                {locations[userData.randomLocationNumber]}
              </div>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>{uiText.nameHeader}</th>
                <th>{uiText.pointsHeader}</th>
                <th>{uiText.accuseHeader}</th>
              </tr>
            </thead>
            <tbody>
              {userData.players.map((player) => (
                <tr key={player.name}>
                  <td>{player.name}</td>
                  <td>{player.points}</td>
                  <td>
                    {player.name === userData.name && player.spy && (
                      uiText.youAreSpy
                    )}

                    {player.name === userData.name && !player.spy && (
                      uiText.you
                    )}

                    {!userData.roundOver && userData.players.some(player => player.name !== userData.name && player.spy) && player.name !== userData.name && (
                      <button
                        className={`accuse-button ${userData.players.find(p => p.name === userData.name)?.guess === player.name ? 'accused' : ''}`}
                        onClick={() => handleGuess(player.name)}
                        disabled={userData.roundOver}
                      >
                        {uiText.accuseSpy}
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
                  {uiText.newRoundButton}
                </button>
                <button className="boss" onClick={resetGame}>
                  {uiText.newGameButton}
                </button>
              </>
            )}
            <button onClick={leaveGame}>
              {uiText.leaveGameButton}
            </button>
          </div>
        </div>
      )
      }
      <div className='messages'>
        {messages.map((msg) => (
          <div key={msg.id} className='message'>
            {msg.text}
          </div>
        ))}
      </div>
    </div >
  );
};

export default App;