const RoomCodeButton = ({ uiText, roomCode, messagesRef }) => {
    return (
        <button
            title={uiText.copyRoomCode}
            className="room-code-button"
            onClick={() => {
                navigator.clipboard.writeText(roomCode);
                messagesRef.current.showMessage('roomCodeCopied');
            }}
        >
            {`${uiText.roomCode}: ${roomCode}`}
        </button>
    );
};

export default RoomCodeButton;
