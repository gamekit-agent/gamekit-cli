import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { checkUnityInstalled, CheckResult } from '../../commands/doctor.js';

describe('doctor command', () => {
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
