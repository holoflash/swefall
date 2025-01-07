import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './styles.css';
import { generateRandomString } from './utils/generateRandomString';
import languages from './data/languages.json';
import Messages from './components/Messages';
import LoginForm from './components/LoginForm';
import GameView from './components/GameView';
import LanguageToggle from './components/LanguageToggle';
import Instructions from './components/Instructions';

const URL =
    process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
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

    const messagesRef = useRef();
    const [userData, setUserData] = useState(initialUserData);
    const [isConnected, setIsConnected] = useState(socket.connected);

    const defaultLanguage = 'english';
    const [language, setLanguage] = useState(() => {
        const storedLanguage = localStorage.getItem('language');
        return storedLanguage || defaultLanguage;
    });

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    useEffect(() => {
        if (userData.name && userData.roomCode) {
            localStorage.setItem('userData', JSON.stringify(userData));
        }
    }, [userData]);

    const { uiText, locations, uiMessages } =
        languages[language] || languages[defaultLanguage];

    const updateUserData = (updates) => {
        setUserData((prevData) => ({
            ...prevData,
            ...updates,
        }));
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

    const generateRoomCode = () => {
        const roomCode = generateRandomString(6);

        socket.emit('generate-room-code', { roomCode }, (response) => {
            if (response.success) {
                updateUserData({ roomCode });
                messagesRef.current.showMessage('roomCodeGenerated');
            } else {
                messagesRef.current.showMessage(response.errorKey);
            }
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const { name, roomCode } = userData;

        if (!name || !roomCode) {
            messagesRef.current.showMessage('nameAndRoomCodeRequired');
            return;
        }

        socket.emit('join-game', { name, roomCode }, (response) => {
            if (response.errorKey) {
                messagesRef.current.showMessage(response.errorKey);
            } else {
                updateUserData({
                    inGame: true,
                    players: response.players || [],
                    creator: response.creator || false,
                });
                messagesRef.current.showMessage('joinedGame');
            }
        });
    };

    const getNewAction = () => {
        const randomLocationNumber =
            Math.floor(Math.random() * Object.keys(locations).length) + 1;
        socket.emit(
            'new-action',
            userData.roomCode,
            randomLocationNumber,
            (response) => {
                if (response.errorKey) {
                    messagesRef.current.showMessage(response.errorKey);
                }
            }
        );
    };

    const leaveGame = () => {
        socket.emit(
            'leave-room',
            { name: userData.name, roomCode: userData.roomCode },
            () => {
                setUserData(initialUserData);
                localStorage.removeItem('userData');
                messagesRef.current.showMessage('leftGame');
                socket.disconnect();
            }
        );
    };

    const handleGuess = (guessedPlayerName) => {
        socket.emit(
            'make-guess',
            { roomCode: userData.roomCode, guessedPlayerName },
            (response) => {
                if (response.errorKey) {
                    messagesRef.current.showMessage(response.errorKey);
                } else {
                    messagesRef.current.showMessage('guessRegistered');
                }
            }
        );
    };

    const resetGame = () => {
        socket.emit('new-game', userData.roomCode, (response) => {
            if (response.errorKey) {
                messagesRef.current.showMessage(response.errorKey);
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
                    messagesRef.current.showMessage(response.errorKey);
                } else {
                    updateUserData({
                        inGame: true,
                        players: response.players,
                        creator: response.creator,
                        randomLocationNumber: response.randomLocationNumber,
                    });
                    messagesRef.current.showMessage('reconnected');
                }
            });
        }
    }, []);

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
            messagesRef.current.showMessage('newRolesAssigned');
        });

        socket.on('player-joined', (response) => {
            updateUserData({
                gameInProgress: false,
                roundOver: true,
                players: response.players,
            });
            if (userData.name !== response.name) {
                messagesRef.current.showMessage('playerJoined', {
                    name: response.name,
                });
            }
        });

        socket.on('player-left-room', (response) => {
            if (response.creator) {
                setUserData(initialUserData);
            }
            updateUserData({
                gameInProgress: false,
                roundOver: true,
                players: response.players,
            });
            messagesRef.current.showMessage('playerLeft', {
                name: response.name,
            });
        });

        socket.on('round-over', (response) => {
            updateUserData({
                roundOver: true,
                players: response.players,
            });
            messagesRef.current.showMessage('roundOver');
        });

        socket.on('update-guess', (response) => {
            updateUserData({ players: response.players });
        });

        socket.on('game-reset', (response) => {
            updateUserData({
                roundOver: true,
                gameInProgress: false,
                players: response.players,
            });
            messagesRef.current.showMessage('gameReset');
        });

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            messagesRef.current.showMessage('disconnected');
        });

        return () => {
            socket.off('new-action');
            socket.off('player-joined');
            socket.off('player-left-room');
            socket.off('round-over');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('update-guess');
            socket.off('game-reset');
        };
    }, [isConnected, userData]);

    return (
        <div className="container">
            {!userData.inGame ? (
                <LoginForm
                    {...{
                        uiText,
                        userData,
                        updateUserData,
                        handleSubmit,
                        generateRoomCode,
                    }}
                />
            ) : (
                <GameView
                    {...{
                        uiText,
                        userData,
                        locations,
                        messagesRef,
                        handleGuess,
                        getNewAction,
                        resetGame,
                        leaveGame,
                    }}
                />
            )}
            <div className="user-tools">
                <LanguageToggle {...{ language, setLanguage, uiText }} />
                <Instructions {...{ uiText }} />
            </div>
            <Messages ref={messagesRef} uiMessages={uiMessages} />
        </div>
    );
};

export default App;
