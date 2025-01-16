import Messages from '../Messages';
import LoginForm from '../LoginForm';
import GameView from '../GameView';
import LanguageToggle from '../LanguageToggle';
import Instructions from '../Instructions';

const Main = ({
    uiText,
    userData,
    updateUserData,
    handleSubmit,
    generateRoomCode,
    locations,
    messagesRef,
    handleGuess,
    getNewAction,
    resetGame,
    leaveGame,
    language,
    textData,
    setLanguage,
    uiMessages,
}) => {
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
                <LanguageToggle
                    {...{ language, textData, setLanguage, uiText }}
                />
                <Instructions {...{ uiText }} />
            </div>
            <Messages ref={messagesRef} uiMessages={uiMessages} />
        </div>
    );
};

export default Main;
