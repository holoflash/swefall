const GameDisplay = ({ userData, uiText, locations }) => {
    return (
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
                <div className="action-pending wrapper">{uiText.getReady}</div>
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
    );
};

export default GameDisplay;
