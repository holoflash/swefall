import { expect, test } from 'vitest';
import { generateRandomString } from '../src/utils/generateRandomString';

test('generates a string of the correct length', () => {
    const result = generateRandomString(6);
    expect(result.length).toBe(6);
});

test('generates a string with valid characters only', () => {
    const result = generateRandomString(10);
    const validCharacters = /^[A-Za-z0-9]+$/;
    expect(validCharacters.test(result)).toBe(true);
});

test('handles edge case of zero length', () => {
    const result = generateRandomString(0);
    expect(result).toBe('');
});

test('handles large lengths without errors', () => {
    const result = generateRandomString(1000);
    expect(result.length).toBe(1000);
    expect(/^[A-Za-z0-9]+$/.test(result)).toBe(true);
});
