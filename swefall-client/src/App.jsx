import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

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

  const generateRoomCode = () => {
    socket.emit('generate-room-code', (response) => {
      if (response.roomCode) {
        setUserData((prevData) => ({
          ...prevData,
          roomCode: response.roomCode,
        }));
        setMessage('Rumskod genererades framgångsrikt!');
      } else {
        setMessage('Misslyckades att generera rumskod');
      }
    });
  };

  const getNewAction = () => {
    socket.emit('new-action', userData.roomCode, (response) => {
      if (response.error) {
        setMessage(response.error);
      }
    });
  };

  const leaveGame = () => {
    socket.emit('leave-room', { name: userData.name, roomCode: userData.roomCode },
      () => {
        setUserData(initialUserData);
        localStorage.removeItem('userData');
        setMessage('Du har lämnat spelet');
        socket.disconnect();
      }
    );
  };

  const handleInputChange = (event) => {
    const { name, type, value, checked } = event.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGuess = (guessedPlayerName) => {
    socket.emit('make-guess', { roomCode: userData.roomCode, guessedPlayerName },
      (response) => {
        if (response.error) {
          setMessage(response.error);
        } else {
          setMessage('Din gissning har registrerats!');
        }
      }
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { name, roomCode } = userData;

    if (!name || !roomCode) {
      setMessage('Namn och rumskod krävs');
      return;
    }

    socket.emit('join-game', { name, roomCode },
      (response) => {
        if (response.error) {
          setMessage(response.error);
        } else {
          setUserData((prevData) => ({
            ...prevData,
            playing: true,
            action: response.action || '',
            players: response.players || [],
            creator: response.creator || false,
          }));
          setMessage('Du har gått med i spelet!');
        }
      }
    );
  };

  const resetGame = () => {
    socket.emit('new-game', userData.roomCode, (response) => {
      if (response.error) {
        setMessage(response.error);
      } else {
        setMessage('Spelet har återställts!');
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
      setMessage(`${response.name} har anslutit sig till spelet`);
    });

    socket.on('player-left-room', (response) => {
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage(`${response.name} har lämnat spelet`);
    });

    socket.on('round-started', () => {
      setMessage('Rundan har börjat');
      setRoundOver(false);
    });

    socket.on('round-over', (response) => {
      setRoundOver(true);
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage('Runda över! Poäng uppdaterade.');
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
      setMessage('Frånkopplad från servern');
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
          <div className='title'>swefall</div>
          <div className='description wrapper'>
            Välkommen till SWEFALL! Ange ditt namn, skriv in eller generera rumskoden och tryck på anslut för att starta spelet.
          </div>
          <form onSubmit={handleSubmit} className='login-form wrapper' autoComplete='off'>
            <input
              type='text'
              name='name'
              maxLength={10}
              value={userData.name}
              onChange={handleInputChange}
              placeholder="Skriv ditt namn"
              required
            />
            <input
              type='text'
              name='roomCode'
              value={userData.roomCode}
              onChange={handleInputChange}
              placeholder="Skriv rumskod"
              required
            />
            <div className='game-buttons'>
              <button type='button' onClick={generateRoomCode}>
                GENERERA KOD
              </button>
              <button type='submit'>
                GÅ MED I RUMMET
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className='game-view wrapper'>
          <button
            title="Kopiera rumskod till urklipp"
            className='room-code-button'
            onClick={() => {
              navigator.clipboard.writeText(userData.roomCode);
              setMessage('Koden har kopierats till urklipp');
            }}>
            {`RUMSKOD: ${userData.roomCode}`}
          </button>

          <div>
            {roundOver && userData.players.some(player => player.action) && (
              <div className="action-finished wrapper">
                <h3>
                  {userData.players.find(player => player.spy).name}
                  var spionen!
                </h3>
                <div>Platsen var:</div>
                <h3>
                  {userData.players.find(player => player.name === userData.name).action}
                </h3>
              </div>
            )}

            {!roundOver && userData.players.some(player => player.name === userData.name && player.spy) && (
              <div className='action wrapper'>
                Du är SPIONEN
              </div>
            )}

            {!roundOver && !userData.players.some(player => player.name === userData.name && player.spy) && (
              <div className='action-pending wrapper'>
                {userData.players.find(player => player.name === userData.name)?.action || "Gör dig redo!"}
              </div>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>NAMN</th>
                <th>POÄNG</th>
                <th>ANKLAGA</th>
              </tr>
            </thead>
            <tbody>
              {userData.players.map((player) => (
                <tr key={player.name}>
                  <td>{player.name}</td>
                  <td>{player.points}</td>
                  <td>
                    {player.name === userData.name && player.spy && (
                      "Du är spionen!"
                    )}

                    {player.name === userData.name && !player.spy && (
                      "DU"
                    )}

                    {!roundOver && userData.players.some(player => player.name !== userData.name && player.spy) && player.name !== userData.name && (
                      <button
                        className={`accuse-button ${userData.players.find(p => p.name === userData.name)?.guess === player.name ? 'accused' : ''}`}
                        onClick={() => handleGuess(player.name)}
                        disabled={roundOver}
                      >
                        SPION!
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
                  NY RUNDA
                </button>
                <button className="boss" onClick={resetGame}>
                  NYTT SPEL
                </button>
              </>
            )}
            <button onClick={leaveGame}>
              LÄMNA SPELET
            </button>
          </div>
        </div>
      )
      }
      {message && <div className='message'>{message}</div>}
    </div >
  );
}

export default App;