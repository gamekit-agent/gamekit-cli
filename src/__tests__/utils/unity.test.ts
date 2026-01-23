import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getUnityHubPath,
  parseUnityVersion,
  isUnity6OrNewer,
  getUnityExecutablePath,
  getMcpPackageUrl,
  isUnityProject,
  UnityInstall
} from '../../utils/unity.js';

describe('unity utilities', () => {
  describe('getUnityHubPath', () => {
    it('returns correct path on Mac', () => {
      const result = getUnityHubPath('darwin');
      expect(result).toBe('/Applications/Unity/Hub/Editor');
    });

    it('returns correct path on Windows', () => {
      const result = getUnityHubPath('win32');
      expect(result).toBe('C:\\Program Files\\Unity\\Hub\\Editor');
    });

    it('throws on unsupported platform', () => {
      expect(() => getUnityHubPath('linux')).toThrow('Unsupported platform');
    });
  });

  describe('parseUnityVersion', () => {
    it('parses Unity 6 version correctly', () => {
      const result = parseUnityVersion('6000.1.12f1');
      expect(result).toEqual({ major: 6000, minor: 1, patch: 12, type: 'f', build: 1 });
    });

    it('parses Unity 2022 version correctly', () => {
      const result = parseUnityVersion('2022.3.20f1');
      expect(result).toEqual({ major: 2022, minor: 3, patch: 20, type: 'f', build: 1 });
    });

    it('parses beta versions', () => {
      const result = parseUnityVersion('6000.0.0b1');
      expect(result).toEqual({ major: 6000, minor: 0, patch: 0, type: 'b', build: 1 });
    });

    it('returns null for invalid version', () => {
      const result = parseUnityVersion('invalid');
      expect(result).toBeNull();
    });
  });

  describe('isUnity6OrNewer', () => {
    it('returns true for Unity 6000.x', () => {
      expect(isUnity6OrNewer('6000.1.12f1')).toBe(true);
      expect(isUnity6OrNewer('6000.0.0f1')).toBe(true);
    });

    it('returns false for Unity 2022.x', () => {
      expect(isUnity6OrNewer('2022.3.20f1')).toBe(false);
    });

    it('returns false for Unity 2021.x', () => {
      expect(isUnity6OrNewer('2021.3.0f1')).toBe(false);
    });

    it('returns false for invalid version', () => {
      expect(isUnity6OrNewer('invalid')).toBe(false);
    });
  });

  describe('getUnityExecutablePath', () => {
    it('returns correct executable path on Mac', () => {
      const result = getUnityExecutablePath('6000.1.12f1', 'darwin');
      expect(result).toBe('/Applications/Unity/Hub/Editor/6000.1.12f1/Unity.app/Contents/MacOS/Unity');
    });

    it('returns correct executable path on Windows', () => {
      const result = getUnityExecutablePath('6000.1.12f1', 'win32');
      // path.join uses native separators, so check components instead
      expect(result).toContain('Program Files');
      expect(result).toContain('Unity');
      expect(result).toContain('Hub');
      expect(result).toContain('Editor');
      expect(result).toContain('6000.1.12f1');
      expect(result).toContain('Unity.exe');
    });
  });

  describe('UnityInstall interface', () => {
    it('should have expected properties', () => {
      const install: UnityInstall = {
        version: '6000.1.12f1',
        path: '/path/to/unity',
        isUnity6: true
      };

      expect(install.version).toBe('6000.1.12f1');
      expect(install.path).toBe('/path/to/unity');
      expect(install.isUnity6).toBe(true);
    });
  });

  describe('getMcpPackageUrl', () => {
    it('returns Unity6 path for Unity 6000.x', () => {
      const url = getMcpPackageUrl('6000.1.12f1');
      expect(url).toBe('https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity6');
    });

    it('returns Unity2020_2022 path for Unity 2022.x', () => {
      const url = getMcpPackageUrl('2022.3.20f1');
      expect(url).toBe('https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity2020_2022');
    });

    it('returns Unity2020_2022 path for Unity 2021.x', () => {
      const url = getMcpPackageUrl('2021.3.0f1');
      expect(url).toBe('https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity2020_2022');
    });

    it('returns Unity2020_2022 path for Unity 2020.x', () => {
      const url = getMcpPackageUrl('2020.3.0f1');
      expect(url).toBe('https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity2020_2022');
    });

    it('returns null for Unity 2019.x (unsupported)', () => {
      const url = getMcpPackageUrl('2019.4.0f1');
      expect(url).toBeNull();
    });

    it('returns null for Unity 2018.x (unsupported)', () => {
      const url = getMcpPackageUrl('2018.4.0f1');
      expect(url).toBeNull();
    });

    it('returns null for invalid version', () => {
      const url = getMcpPackageUrl('invalid');
      expect(url).toBeNull();
    });
  });

  describe('isUnityProject', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unity-project-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('returns true for valid Unity project structure', () => {
      // Create minimal Unity project structure
      fs.mkdirSync(path.join(testDir, 'Assets'));
      fs.mkdirSync(path.join(testDir, 'Packages'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'Packages', 'manifest.json'),
        JSON.stringify({ dependencies: {} })
      );

      expect(isUnityProject(testDir)).toBe(true);
    });

    it('returns false when Assets folder is missing', () => {
      fs.mkdirSync(path.join(testDir, 'Packages'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'Packages', 'manifest.json'),
        JSON.stringify({ dependencies: {} })
      );

      expect(isUnityProject(testDir)).toBe(false);
    });

    it('returns false when manifest.json is missing', () => {
      fs.mkdirSync(path.join(testDir, 'Assets'));
      fs.mkdirSync(path.join(testDir, 'Packages'));

      expect(isUnityProject(testDir)).toBe(false);
    });

    it('returns false for empty directory', () => {
      expect(isUnityProject(testDir)).toBe(false);
    });

    it('returns false for non-existent directory', () => {
      expect(isUnityProject('/non/existent/path')).toBe(false);
    });
  });
});
