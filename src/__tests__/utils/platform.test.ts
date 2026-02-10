import { describe, it, expect } from 'vitest';
import { isWindows, isMac, getHomeDir } from '../../utils/platform.js';

describe('platform utilities', () => {
  describe('isWindows', () => {
    it('returns true for win32', () => {
      expect(isWindows('win32')).toBe(true);
    });

    it('returns false for darwin', () => {
      expect(isWindows('darwin')).toBe(false);
    });

    it('returns false for linux', () => {
      expect(isWindows('linux')).toBe(false);
    });
  });

  describe('isMac', () => {
    it('returns true for darwin', () => {
      expect(isMac('darwin')).toBe(true);
    });

    it('returns false for win32', () => {
      expect(isMac('win32')).toBe(false);
    });

    it('returns false for linux', () => {
      expect(isMac('linux')).toBe(false);
    });
  });

  describe('getHomeDir', () => {
    it('returns a non-empty string', () => {
      const home = getHomeDir();
      expect(typeof home).toBe('string');
      expect(home.length).toBeGreaterThan(0);
    });
  });

});
