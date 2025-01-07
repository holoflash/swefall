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
            <button
                title={uiText.copyRoomCode}
                className="room-code-button"
                onClick={() => {
                    navigator.clipboard.writeText(userData.roomCode);
                    messagesRef.current.showMessage('roomCodeCopied');
                }}
            >
                {`${uiText.roomCode}: ${userData.roomCode}`}
            </button>

            <div>
                {userData.roundOver && userData.gameInProgress && (
                    <div className="action-finished wrapper">
                        <h3>
                            {userData.players.find((player) => player.spy).name}{' '}
                            {uiText.spyWas}
                        </h3>
                        <div>{uiText.locationWas} </div>
                        <h3>{locations[userData.randomLocationNumber]}</h3>
                    </div>
                )}

                {userData.roundOver && !userData.gameInProgress && (
                    <div className="action-pending wrapper">
                        {uiText.getReady}
                    </div>
                )}

                {!userData.roundOver &&
                    userData.players.some(
                        (player) => player.name === userData.name && player.spy
                    ) && <div className="action wrapper">{uiText.isSpy}</div>}

                {!userData.roundOver &&
                    !userData.players.some(
                        (player) => player.name === userData.name && player.spy
                    ) && (
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
                                {player.name === userData.name &&
                                    player.spy &&
                                    uiText.youAreSpy}

                                {player.name === userData.name &&
                                    !player.spy &&
                                    uiText.you}

                                {!userData.roundOver &&
                                    userData.players.some(
                                        (player) =>
                                            player.name !== userData.name &&
                                            player.spy
                                    ) &&
                                    player.name !== userData.name && (
                                        <button
                                            className={`accuse-button ${
                                                userData.players.find(
                                                    (p) =>
                                                        p.name === userData.name
                                                )?.guess === player.name
                                                    ? 'accused'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                handleGuess(player.name)
                                            }
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

            <div className="game-buttons">
                {userData.creator ? (
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
                    <button onClick={leaveGame}>
                        {uiText.leaveGameButton}
                    </button>
                )}
            </div>
        </div>
    );
};

export default GameView;
