const GameTable = ({ uiText, userData, handleGuess }) => {
    return (
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
                                                (p) => p.name === userData.name
                                            )?.guess === player.name
                                                ? 'accused'
                                                : ''
                                        }`}
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
    );
};

export default GameTable;
