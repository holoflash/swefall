import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
const socket = io(URL, { autoConnect: false });

export default function App() {

  const initialUserData = {
    name: '',
    roomCode: '',
    playing: false,
    action: '',
    players: [],
    creator: false,
    english: false,
  };

  const [userData, setUserData] = useState(initialUserData);
  const [message, setMessage] = useState({ error: '', message: '' });
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roundOver, setRoundOver] = useState(false)

  const generateRoomCode = () => {
    socket.emit('generate-room-code', (response) => {
      if (response.roomCode) {
        setUserData((prevData) => ({ ...prevData, roomCode: response.roomCode }));
        setMessage({ error: '', message: userData.english ? 'Room code generated successfully!' : 'Rumskod genererades framgångsrikt!' });
      } else {
        setMessage({ error: userData.english ? 'Failed to generate room code' : 'Misslyckades att generera rumskod', message: '' });
      }
    });
  };

  const getNewAction = async () => {
    try {
      await new Promise((resolve, reject) => { // Await the promise
        socket.emit('new-action', userData.roomCode, (data) => {
          if (data.success) {
            resolve(); // Resolve only on success
          } else {
            reject(new Error(data.error || (userData.english ? 'Failed to fetch a new action' : 'Misslyckades att hämta en ny handling')));
          }
        });
      });
    } catch (error) {
      setMessage({ error: error.message, message: '' });
    }
  };

  const leaveGame = () => {
    socket.emit('leave-room', { name: userData.name, roomCode: userData.roomCode }, () => {
      setUserData(initialUserData);
      localStorage.removeItem('userData');
      setMessage({ error: '', message: userData.english ? 'You have left the game' : 'Du har lämnat spelet' });
      socket.disconnect();
    });
  };

  const handleInputChange = (event) => {
    const { name, type, value, checked } = event.target;
    setUserData((prevData) => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGuess = (guessedPlayerName) => {
    socket.emit('make-guess', { roomCode: userData.roomCode, guessedPlayerName: guessedPlayerName }, (response) => {
      if (response.error) {
        setMessage({ error: response.error, message: '' });
      } else {
        setMessage({ error: '', message: userData.english ? 'Your guess has been recorded!' : 'Din gissning har registrerats!' });
      }
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { name, roomCode, english } = userData;

    if (!name || !roomCode) {
      setMessage({ error: userData.english ? 'Name and room code are required.' : 'Namn och rumskod krävs.', message: '' });
      return;
    }

    socket.emit('join-game', { name, roomCode, english }, (response) => {
      if (response.error) {
        setMessage({ error: response.error, message: '' });
      } else {
        setUserData((prevData) => ({
          ...prevData,
          playing: true,
          action: response.action,
          players: response.players,
          creator: response.creator,
          id: response.id,
        }));
        setMessage({ error: '', message: userData.english ? 'Successfully joined the game!' : 'Du har gått med i spelet!' });
      }
    });
  };

  const resetGame = () => {
    socket.emit('new-game', userData.roomCode, (response) => {
      if (response.error) {
        setMessage({ error: response.error, message: '' });
      } else {
        setMessage({ error: '', message: userData.english ? 'Game reset successfully!' : 'Spelet har återställts!' });
      }
    });
  };

  useEffect(() => {
    if (message.error || message.message) {
      const timer = setTimeout(() => setMessage({ error: '', message: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const savedUserData = JSON.parse(localStorage.getItem('userData'));
    if (savedUserData?.name && savedUserData?.roomCode) {
      setUserData((prevData) => ({
        ...prevData,
        name: savedUserData.name,
        roomCode: savedUserData.roomCode,
      }));

      socket.connect();
      socket.emit('rejoin-game', savedUserData, (response) => {
        if (response.error) {
          setMessage({ error: response.error, message: '' });
        } else {
          setUserData((prevData) => ({
            ...prevData,
            playing: true,
            players: response.players,
            creator: response.creator,
            id: response.id,
            action: response.action,
          }));
          setRoundOver(response.roundOver);
          setMessage({ error: '', message: userData.english ? 'Successfully rejoined the game!' : 'Du har återanslutit till spelet!' });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    }
  }, [userData]);

  useEffect(() => {
    socket.connect();
    socket.on('new-action', (data) => {
      setUserData((prevData) => ({
        ...prevData,
        players: data.players.map(player => ({
          ...player,
          action: player.action,
          spy: player.spy || false,
        })),
      }));
    });

    socket.on('player-joined', (response) => {
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage({ error: '', message: `${response.name} just joined the game` });
    });

    socket.on('player-left-room', (response) => {
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage({ error: '', message: `${response.name} just left the game` });
    });

    socket.on('round-started', () => {
      setMessage({ error: '', message: userData.english ? 'Round started' : 'Rundan har börjat' });
      setRoundOver(false);
    });

    socket.on('round-over', (response) => {
      setRoundOver(true);
      setUserData((prevData) => ({ ...prevData, players: response.players }));
      setMessage({ error: '', message: userData.english ? 'Round over! Scores updated.' : 'Runda över! Poäng uppdaterade.' });
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
      setMessage({ error: '', message: userData.english ? 'Game has been reset!' : 'Spelet har återställts!' });
    });

    socket.on('connect', () => {
      setIsConnected(true)
    });

    socket.on('disconnect', () => {
      setIsConnected(false)
      setMessage({ error: userData.english ? 'Disconnected from server' : 'Frånkopplad från servern', message: '' });
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
          <div className='title'>SWEFALL</div>
          <div className='description wrapper'>
            {userData.english
              ? 'Welcome to SWEFALL!. Enter your name, enter or generate the room code, and click connect to start the game.'
              : 'Välkommen till SWEFALL! Ange ditt namn, skriv in eller generera rumskoden och tryck på anslut för att starta spelet.'
            }
          </div>

          <form onSubmit={handleSubmit} className='login-form wrapper' autoComplete='off'>
            <input
              type='text'
              name='name'
              maxLength={10}
              value={userData.name}
              onChange={handleInputChange}
              placeholder={userData.english ? 'Enter your name' : 'Skriv ditt namn'}
              required
            />
            <input
              type='text'
              name='roomCode'
              value={userData.roomCode}
              onChange={handleInputChange}
              placeholder={userData.english ? 'Enter room code' : 'Skriv rumskod'}
              required
            />
            <div className='checkbox'>
              <label htmlFor="english">   {userData.english ? 'English' : 'Engelska'}</label>
              <input
                type="checkbox"
                name="english"
                id="english"
                checked={userData.english}
                onChange={handleInputChange}
              />
            </div>
            <div className='game-buttons'>
              <button type='button' onClick={generateRoomCode}>
                {userData.english ? 'GENERATE CODE' : 'GENERERA KOD'}
              </button>
              <button type='submit'>{userData.english ? 'JOIN ROOM' : 'GÅ MED I RUMMET'}</button>
            </div>
          </form>
        </>
      ) : (
        <div className='game-view wrapper'>
          <button
            title={userData.english ? 'Copy room code to clipboard' : 'Kopiera rumskod till urklipp'}
            className='room-code-button'
            onClick={() => {
              navigator.clipboard.writeText(userData.roomCode);
              setMessage({ error: '', message: userData.english ? 'Code copied to clipboard' : 'Koden har kopierats till urklipp' });
            }}
          >
            {userData.english ? `ROOM CODE: ${userData.roomCode}` : `RUMSKOD: ${userData.roomCode}`}
          </button>

          <div>
            {roundOver && userData.players.some(player => player.action) && (
              <div className="action-finished wrapper">
                <h3>
                  {userData.players.find(player => player.spy)?.name || (userData.english ? "No Spy Found" : "Ingen spion hittad")}
                  {userData.english ? ' was the spy!' : ' var spionen!'}
                </h3>
                <div>{userData.english ? 'The location was:' : 'Platsen var:'}</div>
                <h3>
                  {userData.players.find(player => player.name === userData.name)?.action || (userData.english ? "No Action Found (You weren't the spy)" : "Ingen handling hittad (Du var inte spionen)")}
                </h3>
              </div>
            )}

            {!roundOver && userData.players.some(player => player.name === userData.name && player.spy) && (
              <div className='action wrapper'>
                {userData.english ? 'You are the SPY' : 'Du är SPIONEN'}
              </div>
            )}

            {!roundOver && !userData.players.some(player => player.name === userData.name && player.spy) && (
              <div className='action-pending wrapper'>
                {userData.players.find(player => player.name === userData.name)?.action || (userData.english ? "Get ready!" : "Gör dig redo!")}
              </div>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>{userData.english ? 'NAME' : 'NAMN'}</th>
                <th>{userData.english ? 'POINTS' : 'POÄNG'}</th>
                <th>{userData.english ? 'ACCUSE' : 'ANKLAGA'}</th>
              </tr>
            </thead>
            <tbody>
              {userData.players.map((player) => (
                <tr key={player.name}>
                  <td>{player.name}</td>
                  <td>{player.points}</td>
                  <td>
                    {player.name === userData.name && player.spy && (
                      userData.english ? "You are the spy!" : "Du är spionen!"
                    )}

                    {player.name === userData.name && !player.spy && (
                      userData.english ? "YOU" : "DU"
                    )}

                    {!roundOver && userData.players.some(player => player.name !== userData.name && player.spy) && player.name !== userData.name && (
                      <button
                        className="accuse-button"
                        onClick={() => handleGuess(player.name)}
                        disabled={roundOver}
                      >
                        {userData.english ? 'SPY!' : 'SPION!'}
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
                  {userData.english ? 'NEW ROUND' : 'NY RUNDA'}
                </button>
                <button className="boss" onClick={resetGame}>
                  {userData.english ? 'NEW GAME' : 'NYTT SPEL'}
                </button>
              </>
            )}
            <button onClick={leaveGame}>
              {userData.english ? 'LEAVE GAME' : 'LÄMNA SPELET'}
            </button>
          </div>
        </div>
      )
      }
      {message.error && <div className='error'>{message.error}</div>}
      {message.message && <div className='message'>{message.message}</div>}
    </div >
  );
}
