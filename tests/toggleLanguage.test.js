import { describe, it, expect, vi } from 'vitest';

describe('toggleLanguage', () => {
    it('cycles through the available languages correctly', () => {
        const languages = {
            en: 'English',
            fr: 'French',
            es: 'Spanish',
        };

        const setLanguage = vi.fn();

        const toggleLanguage = () => {
            setLanguage((prevLanguage) => {
                const availableLanguages = Object.keys(languages);
                const nextLanguageIndex =
                    (availableLanguages.indexOf(prevLanguage) + 1) %
                    availableLanguages.length;
                return availableLanguages[nextLanguageIndex];
            });
        };

        let currentLanguage = 'en';
        setLanguage.mockImplementation((callback) => {
            currentLanguage = callback(currentLanguage);
        });

        toggleLanguage();
        expect(currentLanguage).toBe('fr');

        toggleLanguage();
        expect(currentLanguage).toBe('es');

        toggleLanguage();
        expect(currentLanguage).toBe('en');
        toggleLanguage();
        expect(currentLanguage).toBe('fr');
    });
});
