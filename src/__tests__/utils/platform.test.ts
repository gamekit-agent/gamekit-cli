import { describe, it, expect } from 'vitest';
import { isWindows, isMac, getHomeDir, getMcpRelayPath } from '../../utils/platform.js';

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

  describe('getMcpRelayPath', () => {
    it('returns correct path on Mac', () => {
      const result = getMcpRelayPath('darwin', '/Users/testuser', '');

      expect(result).toBe('/Users/testuser/Library/Application Support/CodeMaestro/UnityMcpRelay/launch.sh');
    });

    it('returns correct path on Windows', () => {
      const result = getMcpRelayPath(
        'win32',
        'C:\\Users\\testuser',
        'C:\\Users\\testuser\\AppData\\Local'
      );

      // path.join on Mac will use forward slashes, so we check the components
      expect(result).toContain('Programs');
      expect(result).toContain('CodeMaestro');
      expect(result).toContain('UnityMcpRelay');
      expect(result).toContain('launch.bat');
    });

    it('throws on unsupported platform', () => {
      expect(() => getMcpRelayPath('linux', '/home/user', '')).toThrow('Unsupported platform');
    });

    it('returns .sh extension on Mac', () => {
      const result = getMcpRelayPath('darwin', '/Users/test', '');
      expect(result.endsWith('.sh')).toBe(true);
    });

    it('returns .bat extension on Windows', () => {
      const result = getMcpRelayPath('win32', '', 'C:\\AppData\\Local');
      expect(result.endsWith('.bat')).toBe(true);
    });
  });
});
