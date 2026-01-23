import { describe, it, expect, vi } from 'vitest';
import {
  compareVersions,
  getCurrentVersion,
  getBinaryName,
  getInstallDir,
  getConfigDir
} from '../../utils/updater.js';
import * as os from 'os';
import * as path from 'path';
import { VERSION } from '../../version.js';

describe('updater utilities', () => {
  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
    });

    it('returns 1 when first version is greater', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('returns -1 when first version is lesser', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    });

    it('handles missing parts', () => {
      expect(compareVersions('1', '1.0.0')).toBe(0);
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
    });
  });

  describe('getCurrentVersion', () => {
    it('returns a valid semver string', () => {
      const version = getCurrentVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('returns the injected version', () => {
      const version = getCurrentVersion();
      expect(version).toBe(VERSION);
    });
  });

  describe('getBinaryName', () => {
    it('returns platform-specific binary name', () => {
      const binaryName = getBinaryName();
      // Should match pattern: gamekit-{platform}-{arch}
      expect(binaryName).toMatch(/^gamekit-(darwin|linux|windows)-(arm64|x64)(\.exe)?$/);
    });

    it('includes .exe extension on Windows', () => {
      const binaryName = getBinaryName();
      if (process.platform === 'win32') {
        expect(binaryName).toMatch(/\.exe$/);
      } else {
        expect(binaryName).not.toMatch(/\.exe$/);
      }
    });
  });

  describe('getInstallDir', () => {
    it('returns a path containing .gamekit', () => {
      const installDir = getInstallDir();
      expect(installDir).toContain('.gamekit');
      expect(installDir).toContain('bin');
    });

    it('uses home directory', () => {
      const installDir = getInstallDir();
      const home = os.homedir();
      // On Unix, should be under home. On Windows, under LOCALAPPDATA
      if (process.platform !== 'win32') {
        expect(installDir.startsWith(home)).toBe(true);
      }
    });
  });

  describe('getConfigDir', () => {
    it('returns path to .gamekit in home directory', () => {
      const configDir = getConfigDir();
      expect(configDir).toContain('.gamekit');
    });
  });
});
