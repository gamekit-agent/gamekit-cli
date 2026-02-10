import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { isValidProjectName, copyGameKitPlugin, addGameKitToGitignore } from '../../commands/init.js';

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

  describe('copyGameKitPlugin', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-init-test-'));
      // Create Assets directory (simulating a Unity project)
      fs.mkdirSync(path.join(testDir, 'Assets'), { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should copy plugin files to Assets/Editor/GameKit/', () => {
      copyGameKitPlugin(testDir);

      const pluginDir = path.join(testDir, 'Assets', 'Editor', 'GameKit');
      expect(fs.existsSync(pluginDir)).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'GameKitServer.cs'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'GameKit.asmdef'))).toBe(true);
    });

    it('should copy subdirectories (Handlers, Models, Utils)', () => {
      copyGameKitPlugin(testDir);

      const pluginDir = path.join(testDir, 'Assets', 'Editor', 'GameKit');
      expect(fs.existsSync(path.join(pluginDir, 'Handlers', 'HealthHandler.cs'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'Models', 'ApiResponse.cs'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'Utils', 'PortManager.cs'))).toBe(true);
    });

    it('should create directories recursively', () => {
      // Remove Assets dir to test recursive creation
      fs.rmSync(path.join(testDir, 'Assets'), { recursive: true });

      copyGameKitPlugin(testDir);

      const pluginDir = path.join(testDir, 'Assets', 'Editor', 'GameKit');
      expect(fs.existsSync(pluginDir)).toBe(true);
    });
  });

  describe('addGameKitToGitignore', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-gitignore-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should create .gitignore with .gamekit/ if it does not exist', () => {
      addGameKitToGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.gamekit/');
    });

    it('should append .gamekit/ to existing .gitignore', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');

      addGameKitToGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.gamekit/');
    });

    it('should not duplicate .gamekit/ if already present', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), '.gamekit/\n');

      addGameKitToGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      const matches = content.match(/\.gamekit\//g);
      expect(matches).toHaveLength(1);
    });

    it('should handle .gitignore without trailing newline', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/');

      addGameKitToGitignore(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toBe('node_modules/\n.gamekit/\n');
    });
  });
});
