const LoginForm = ({
    uiText,
    userData,
    handleSubmit,
    generateRoomCode,
    updateUserData,
}) => {
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (name === 'roomCode') {
            updateUserData({ [name]: value.toUpperCase() });
        } else {
            updateUserData({ [name]: value });
        }
    };

    return (
        <>
            <div className="title">{uiText.title}</div>
            <div className="description wrapper">{uiText.welcome}</div>
            <form
                onSubmit={handleSubmit}
                className="login-form wrapper"
                autoComplete="off"
            >
                <input
                    type="text"
                    name="name"
                    maxLength={10}
                    value={userData.name}
                    onChange={handleInputChange}
                    placeholder={uiText.namePlaceholder}
                    required
                />
                <input
                    type="text"
                    name="roomCode"
                    value={userData.roomCode}
                    onChange={handleInputChange}
                    placeholder={uiText.roomCodePlaceholder}
                    required
                />
                <div className="game-buttons">
                    <button type="button" onClick={generateRoomCode}>
                        {uiText.generateCodeButton}
                    </button>
                    <button type="submit">{uiText.joinRoomButton}</button>
                </div>
            </form>
        </>
    );
};

export default LoginForm;
