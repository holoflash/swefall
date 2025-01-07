import languages from '../data/languages.json';

const LanguageToggle = ({ language, setLanguage }) => {
    const { flag } = languages[language] || languages['english'];

    const toggleLanguage = () => {
        setLanguage((prevLanguage) => {
            const availableLanguages = Object.keys(languages);
            const nextLanguageIndex =
                (availableLanguages.indexOf(prevLanguage) + 1) %
                availableLanguages.length;
            return availableLanguages[nextLanguageIndex];
        });
    };

    return (
        <button onClick={toggleLanguage} className="language">
            {flag}
        </button>
    );
};

export default LanguageToggle;
