import { io } from 'socket.io-client';

const socket = io();

export interface ServerState {
    roomCode: string;
    players: string[];
    role: string | null;
    gameStarted: boolean;
}

export const initializeServerActions = (
    updateState: (partialState: Partial<ServerState>) => void,
    setError: (error: string) => void
) => {
    const handleUpdatePlayers = (updatedPlayers: { username: string }[]) => {
        updateState({ players: updatedPlayers.map((player) => player.username) });
    };

    const handleGameStarted = ({ role }: { role: string }) => {
        updateState({ gameStarted: true, role });
    };

    const handleLocationUpdated = ({ role }: { role: string }) => {
        updateState({ role });
    };

    const handleError = (errorMessage: string) => {
        setError(errorMessage);
    };

    socket.on('update-players', handleUpdatePlayers);
    socket.on('game-started', handleGameStarted);
    socket.on('location-updated', handleLocationUpdated);
    socket.on('error', handleError);

    return () => {
        socket.off('update-players', handleUpdatePlayers);
        socket.off('game-started', handleGameStarted);
        socket.off('location-updated', handleLocationUpdated);
        socket.off('error', handleError);
    };
};


export const createRoom = (updateState: (partialState: Partial<ServerState>) => void) => {
    socket.emit('create-room', (code: string) => {
        updateState({ roomCode: code });
    });
};

export const joinRoom = (
    roomCode: string,
    username: string,
    updateState: (partialState: Partial<ServerState>) => void,
    setError: (error: string) => void
) => {
    socket.emit('join-room', { roomCode, username }, (response: { error?: string }) => {
        if (response.error) {
            setError(response.error);
        } else {
            setError('');
            updateState({ gameStarted: false });
        }
    });
};

export const startGame = (roomCode: string) => {
    socket.emit('start-game', { roomCode });
};

export const nextLocation = (roomCode: string) => {
    socket.emit('next-location', { roomCode });
};
