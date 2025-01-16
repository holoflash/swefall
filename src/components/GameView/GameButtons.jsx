const GameButtons = ({
    creator,
    getNewAction,
    uiText,
    resetGame,
    leaveGame,
}) => {
    return (
        <div className="game-buttons">
            {creator ? (
                <>
                    <button className="boss" onClick={getNewAction}>
                        {uiText.newRoundButton}
                    </button>
                    <button className="boss" onClick={resetGame}>
                        {uiText.newGameButton}
                    </button>
                    <button onClick={leaveGame}>
                        {uiText.closeRoomButton}
                    </button>
                </>
            ) : (
                <button onClick={leaveGame}>{uiText.leaveGameButton}</button>
            )}
        </div>
    );
};

export default GameButtons;
