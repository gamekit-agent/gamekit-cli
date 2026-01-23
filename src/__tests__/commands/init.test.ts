import { describe, it, expect } from 'vitest';
import { isValidProjectName } from '../../commands/init.js';

describe('init command', () => {
  describe('isValidProjectName', () => {
    it('should accept valid project names', () => {
      expect(isValidProjectName('my-game')).toBe(true);
      expect(isValidProjectName('MyGame')).toBe(true);
      expect(isValidProjectName('my_game')).toBe(true);
      expect(isValidProjectName('game123')).toBe(true);
      expect(isValidProjectName('Game-123_test')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(isValidProjectName('../etc/passwd')).toBe(false);
      expect(isValidProjectName('..\\windows\\system32')).toBe(false);
      expect(isValidProjectName('/root')).toBe(false);
      expect(isValidProjectName('game/../other')).toBe(false);
    });

    it('should reject names with spaces', () => {
      expect(isValidProjectName('my game')).toBe(false);
      expect(isValidProjectName(' game')).toBe(false);
      expect(isValidProjectName('game ')).toBe(false);
    });

    it('should reject names with special characters', () => {
      expect(isValidProjectName('game@test')).toBe(false);
      expect(isValidProjectName('game#1')).toBe(false);
      expect(isValidProjectName('game$')).toBe(false);
      expect(isValidProjectName('game!')).toBe(false);
      expect(isValidProjectName('game.test')).toBe(false);
    });

    it('should reject empty names', () => {
      expect(isValidProjectName('')).toBe(false);
    });
  });
});
