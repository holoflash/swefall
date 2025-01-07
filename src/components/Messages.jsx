import { useState, forwardRef, useImperativeHandle } from 'react';

const Messages = forwardRef(({ uiMessages }, ref) => {
    const [messages, setMessages] = useState([]);

    const showMessage = (key, replacements = {}) => {
        const text = Object.entries(replacements).reduce(
            (msg, [placeholder, value]) => msg.replace(`{${placeholder}}`, value),
            uiMessages[key]
        );

        const messageObject = {
            id: `${Date.now()}-${Math.random()}`,
            text,
        };

        setMessages((prevMessages) => [...prevMessages, messageObject]);

        setTimeout(() => {
            setMessages((prevMessages) =>
                prevMessages.filter((msg) => msg.id !== messageObject.id)
            );
        }, 1500);
    };

    useImperativeHandle(ref, () => ({
        showMessage,
    }));

    return (
        <div className="messages">
            {messages.map((msg) => (
                <div key={msg.id} className="message">
                    {msg.text}
                </div>
            ))}
        </div>
    );
});

export default Messages;
