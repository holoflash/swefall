import React, { useState } from 'react';

const Instructions = ({ uiText }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDialog = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div>
            <button onClick={toggleDialog} className="open-instructions">
                {uiText.help}
            </button>

            {isOpen && (
                <div className="dialog-overlay">
                    <div className="dialog">
                        <div
                            className="instructions wrapper"
                            onClick={toggleDialog}
                        >
                            <h2>{uiText.instructions.header}</h2>
                            {uiText.instructions.howToPlay.map(
                                (instruction) => (
                                    <div key={instruction.step}>
                                        <h3>{instruction.step}</h3>
                                        <p>{instruction.description}</p>
                                    </div>
                                )
                            )}
                            <a href="https://github.com/holoflash/swefall">
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Instructions;
