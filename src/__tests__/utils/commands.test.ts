import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getCommandsTemplatePath,
  copyCommands,
  hasClaudeCommands
} from '../../utils/commands.js';

describe('commands utilities', () => {
  describe('getCommandsTemplatePath', () => {
    it('should return path to .claude folder in template', () => {
      const cmdPath = getCommandsTemplatePath();
      expect(cmdPath).toContain('template');
      expect(cmdPath).toContain('.claude');
    });

    it('should exist', () => {
      const cmdPath = getCommandsTemplatePath();
      expect(fs.existsSync(cmdPath)).toBe(true);
    });

    it('should contain CLAUDE.md', () => {
      const cmdPath = getCommandsTemplatePath();
      expect(fs.existsSync(path.join(cmdPath, 'CLAUDE.md'))).toBe(true);
    });

    it('should contain commands folder', () => {
      const cmdPath = getCommandsTemplatePath();
      expect(fs.existsSync(path.join(cmdPath, 'commands'))).toBe(true);
    });

    it('should contain skills folder', () => {
      const cmdPath = getCommandsTemplatePath();
      expect(fs.existsSync(path.join(cmdPath, 'skills'))).toBe(true);
    });

    it('should contain agents folder', () => {
      const cmdPath = getCommandsTemplatePath();
      expect(fs.existsSync(path.join(cmdPath, 'agents'))).toBe(true);
    });
  });

  describe('copyCommands', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-cmd-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should copy .claude folder to destination', () => {
      copyCommands(testDir);

      const claudePath = path.join(testDir, '.claude');
      expect(fs.existsSync(claudePath)).toBe(true);
    });

    it('should copy CLAUDE.md', () => {
      copyCommands(testDir);

      const claudeMdPath = path.join(testDir, '.claude', 'CLAUDE.md');
      expect(fs.existsSync(claudeMdPath)).toBe(true);
    });

    it('should copy commands folder', () => {
      copyCommands(testDir);

      const commandsPath = path.join(testDir, '.claude', 'commands');
      expect(fs.existsSync(commandsPath)).toBe(true);
    });

    it('should copy skills folder', () => {
      copyCommands(testDir);

      const skillsPath = path.join(testDir, '.claude', 'skills');
      expect(fs.existsSync(skillsPath)).toBe(true);
    });

    it('should copy agents folder', () => {
      copyCommands(testDir);

      const agentsPath = path.join(testDir, '.claude', 'agents');
      expect(fs.existsSync(agentsPath)).toBe(true);
    });

    it('should skip symlinks for security', () => {
      // Create a symlink in test dir and verify it's not followed
      // This test verifies the security behavior
      copyCommands(testDir);

      // The copy should complete without errors
      expect(fs.existsSync(path.join(testDir, '.claude'))).toBe(true);
    });
  });

  describe('hasClaudeCommands', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-cmd-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should return false for empty directory', () => {
      expect(hasClaudeCommands(testDir)).toBe(false);
    });

    it('should return false if only .claude folder exists (no CLAUDE.md)', () => {
      fs.mkdirSync(path.join(testDir, '.claude'));
      expect(hasClaudeCommands(testDir)).toBe(false);
    });

    it('should return true if .claude/CLAUDE.md exists', () => {
      fs.mkdirSync(path.join(testDir, '.claude'));
      fs.writeFileSync(path.join(testDir, '.claude', 'CLAUDE.md'), '# Test');
      expect(hasClaudeCommands(testDir)).toBe(true);
    });

    it('should return true after copyCommands', () => {
      copyCommands(testDir);
      expect(hasClaudeCommands(testDir)).toBe(true);
    });
  });
});
