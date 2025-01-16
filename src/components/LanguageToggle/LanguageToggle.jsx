const LanguageToggle = ({ language, textData, setLanguage, uiText }) => {
    const { flag } = textData[language] || textData['english'];

    const toggleLanguage = () => {
        setLanguage((prevLanguage) => {
            const availableLanguages = Object.keys(textData);
            const nextLanguageIndex =
                (availableLanguages.indexOf(prevLanguage) + 1) %
                availableLanguages.length;
            return availableLanguages[nextLanguageIndex];
        });
    };

    return (
        <div>
            {uiText.changeLanguage}
            <button onClick={toggleLanguage} className="language">
                {flag}
            </button>
        </div>
    );
};

export default LanguageToggle;
