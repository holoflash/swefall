import GameTable from './GameTable';
import GameButtons from './GameButtons';
import RoomCodeButton from './RoomCodeButton';
import GameDisplay from './GameDisplay';

const GameView = ({
    uiText,
    userData,
    locations,
    messagesRef,
    handleGuess,
    getNewAction,
    resetGame,
    leaveGame,
}) => {
    return (
        <div className="game-view wrapper">
            <RoomCodeButton
                {...{ uiText, roomCode: userData.roomCode, messagesRef }}
            />
            <GameDisplay {...{ userData, uiText, locations }} />
            <GameTable {...{ uiText, userData, handleGuess }} />
            <GameButtons
                {...{
                    creator: userData.creator,
                    getNewAction,
                    uiText,
                    resetGame,
                    leaveGame,
                }}
            />
        </div>
    );
};

export default GameView;
