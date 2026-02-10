import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUnityInstalled, checkPluginInstalled, checkPluginConnection, CheckResult } from '../../commands/doctor.js';

// Mock connection module
vi.mock('../../utils/connection.js', () => ({
  readServerInfo: vi.fn(),
  healthCheck: vi.fn(),
  GameKitError: class GameKitError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'GameKitError';
    }
  },
}));

// Mock fs for plugin check
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  };
});

import * as fs from 'fs';
import { readServerInfo, healthCheck, GameKitError } from '../../utils/connection.js';

describe('doctor command', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkUnityInstalled', () => {
    it('should return CheckResult with correct structure', () => {
      const result = checkUnityInstalled();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('passed');
      expect(result.name).toBe('Unity installed');
      expect(typeof result.passed).toBe('boolean');

      // Should have either message (if passed) or fix (if failed)
      if (result.passed) {
        expect(result.message).toBeDefined();
        expect(result.fix).toBeUndefined();
      } else {
        expect(result.fix).toBeDefined();
        expect(result.fix).toContain('unity.com');
      }
    });
  });

  describe('checkPluginInstalled', () => {
    it('should pass when GameKitServer.cs exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = checkPluginInstalled();
      expect(result.name).toBe('GameKit plugin installed');
      expect(result.passed).toBe(true);
      expect(result.fix).toBeUndefined();
    });

    it('should fail when GameKitServer.cs is missing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = checkPluginInstalled();
      expect(result.name).toBe('GameKit plugin installed');
      expect(result.passed).toBe(false);
      expect(result.fix).toContain('gamekit init');
    });
  });

  describe('checkPluginConnection', () => {
    it('should pass when server is healthy', async () => {
      vi.mocked(readServerInfo).mockReturnValue({
        port: 17580,
        pid: 12345,
        unityVersion: '6000.1.0f1',
        projectPath: '/test/project',
        startedAt: '2026-01-01T00:00:00Z',
      });
      vi.mocked(healthCheck).mockResolvedValue(true);

      const result = await checkPluginConnection();
      expect(result.passed).toBe(true);
      expect(result.name).toBe('Unity plugin connected');
      expect(result.message).toContain('17580');
      expect(result.message).toContain('6000.1.0f1');
    });

    it('should fail when health check fails', async () => {
      vi.mocked(readServerInfo).mockReturnValue({
        port: 17580,
        pid: 12345,
        unityVersion: '6000.1.0f1',
        projectPath: '/test/project',
        startedAt: '2026-01-01T00:00:00Z',
      });
      vi.mocked(healthCheck).mockResolvedValue(false);

      const result = await checkPluginConnection();
      expect(result.passed).toBe(false);
      expect(result.fix).toContain('restarting Unity');
    });

    it('should warn when Unity is not running (port file missing)', async () => {
      const { GameKitError: GKE } = await import('../../utils/connection.js');
      vi.mocked(readServerInfo).mockImplementation(() => {
        throw new GKE('UNITY_NOT_RUNNING', 'Unity is not running');
      });

      const result = await checkPluginConnection();
      expect(result.passed).toBe(false);
      expect(result.fix).toBeUndefined(); // Warning, not error
      expect(result.message).toContain('Open your project in Unity');
    });
  });

  describe('CheckResult interface', () => {
    it('should accept valid CheckResult objects', () => {
      const passedResult: CheckResult = {
        name: 'Test check',
        passed: true,
        message: 'Everything is fine'
      };

      const failedResult: CheckResult = {
        name: 'Test check',
        passed: false,
        fix: 'Run: some command'
      };

      const warningResult: CheckResult = {
        name: 'Test check',
        passed: false,
        message: 'Optional component not installed'
      };

      expect(passedResult.passed).toBe(true);
      expect(failedResult.passed).toBe(false);
      expect(warningResult.passed).toBe(false);
    });
  });
});
