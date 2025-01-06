export const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVXYZ0123456789';
    const charactersLength = characters.length;
    return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * charactersLength))).join('');
};