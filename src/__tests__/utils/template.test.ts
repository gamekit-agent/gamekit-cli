import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getTemplatePath,
  copyTemplate,
  hashFile,
  getFilesRecursive,
  generateHashes,
  writeHashes,
  readHashes,
  writeCommandsVersion,
  getCommandsVersion,
  areCommandsOutdated,
  compareWithTemplate
} from '../../utils/template.js';

describe('template utils', () => {
  describe('getTemplatePath', () => {
    it('should return the template path', () => {
      const templatePath = getTemplatePath();
      expect(templatePath).toContain('template');
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('should contain Claude commands structure', () => {
      const templatePath = getTemplatePath();
      expect(fs.existsSync(path.join(templatePath, '.claude'))).toBe(true);
      expect(fs.existsSync(path.join(templatePath, '.claude', 'CLAUDE.md'))).toBe(true);
    });

  });

  describe('copyTemplate', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should copy template to destination', () => {
      const destPath = path.join(testDir, 'my-game');
      copyTemplate(destPath);

      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.existsSync(path.join(destPath, '.claude'))).toBe(true);
    });

    it('should copy CLAUDE.md', () => {
      const destPath = path.join(testDir, 'my-game');
      copyTemplate(destPath);

      const claudeMdPath = path.join(destPath, '.claude', 'CLAUDE.md');
      expect(fs.existsSync(claudeMdPath)).toBe(true);
    });

    it('should copy commands folder', () => {
      const destPath = path.join(testDir, 'my-game');
      copyTemplate(destPath);

      const commandsPath = path.join(destPath, '.claude', 'commands');
      expect(fs.existsSync(commandsPath)).toBe(true);
    });

    it('should copy skills folder', () => {
      const destPath = path.join(testDir, 'my-game');
      copyTemplate(destPath);

      const skillsPath = path.join(destPath, '.claude', 'skills');
      expect(fs.existsSync(skillsPath)).toBe(true);
    });

    it('should copy agents folder', () => {
      const destPath = path.join(testDir, 'my-game');
      copyTemplate(destPath);

      const agentsPath = path.join(destPath, '.claude', 'agents');
      expect(fs.existsSync(agentsPath)).toBe(true);
    });
  });

  describe('hashFile', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-hash-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should return consistent hash for same content', () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'hello world');

      const hash1 = hashFile(filePath);
      const hash2 = hashFile(filePath);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex is 64 chars
    });

    it('should return different hash for different content', () => {
      const file1 = path.join(testDir, 'test1.txt');
      const file2 = path.join(testDir, 'test2.txt');
      fs.writeFileSync(file1, 'hello');
      fs.writeFileSync(file2, 'world');

      expect(hashFile(file1)).not.toBe(hashFile(file2));
    });
  });

  describe('getFilesRecursive', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-files-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should return all files with relative paths', () => {
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content');
      fs.mkdirSync(path.join(testDir, 'subdir'));
      fs.writeFileSync(path.join(testDir, 'subdir', 'file2.txt'), 'content');

      const files = getFilesRecursive(testDir);

      expect(files).toContain('file1.txt');
      expect(files).toContain(path.join('subdir', 'file2.txt'));
      expect(files).toHaveLength(2);
    });

    it('should return empty array for empty directory', () => {
      const files = getFilesRecursive(testDir);
      expect(files).toHaveLength(0);
    });
  });

  describe('writeHashes and readHashes', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-hashes-test-'));
      fs.mkdirSync(path.join(testDir, '.claude'));
      fs.writeFileSync(path.join(testDir, '.claude', 'test.md'), 'test content');
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should write and read hashes correctly', () => {
      writeHashes(testDir);

      const hashes = readHashes(testDir);
      // Use 'in' operator instead of toHaveProperty due to Bun test runner quirk
      expect('test.md' in hashes).toBe(true);
      expect(hashes['test.md']).toHaveLength(64);
    });

    it('should return empty object when no hashes file exists', () => {
      const hashes = readHashes(testDir);
      expect(hashes).toEqual({});
    });
  });

  describe('writeCommandsVersion and getCommandsVersion', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-version-test-'));
      fs.mkdirSync(path.join(testDir, '.claude'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should write and read version correctly', () => {
      writeCommandsVersion(testDir);

      const version = getCommandsVersion(testDir);
      expect(version).toBeTruthy();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/); // semver format
    });

    it('should return null when no version file exists', () => {
      const version = getCommandsVersion(testDir);
      expect(version).toBeNull();
    });
  });

  describe('areCommandsOutdated', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-outdated-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should return false if no .claude directory', () => {
      expect(areCommandsOutdated(testDir)).toBe(false);
    });

    it('should return true if no version file (old installation)', () => {
      fs.mkdirSync(path.join(testDir, '.claude'));
      expect(areCommandsOutdated(testDir)).toBe(true);
    });

    it('should return false if version matches current', () => {
      fs.mkdirSync(path.join(testDir, '.claude'));
      writeCommandsVersion(testDir);
      expect(areCommandsOutdated(testDir)).toBe(false);
    });

    it('should return true if installed version is older', () => {
      fs.mkdirSync(path.join(testDir, '.claude'));
      fs.writeFileSync(path.join(testDir, '.claude', '.version'), '0.0.1');
      expect(areCommandsOutdated(testDir)).toBe(true);
    });
  });

  describe('compareWithTemplate', () => {
    let testDir: string;
    let templateDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-compare-test-'));
      templateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-template-test-'));

      // Create template structure
      fs.mkdirSync(path.join(templateDir, '.claude', 'commands'), { recursive: true });
      fs.writeFileSync(path.join(templateDir, '.claude', 'CLAUDE.md'), 'template content');
      fs.writeFileSync(path.join(templateDir, '.claude', 'commands', 'test.md'), 'command content');

      // Create project structure (copy of template)
      fs.mkdirSync(path.join(testDir, '.claude', 'commands'), { recursive: true });
      fs.writeFileSync(path.join(testDir, '.claude', 'CLAUDE.md'), 'template content');
      fs.writeFileSync(path.join(testDir, '.claude', 'commands', 'test.md'), 'command content');

      // Write hashes for project
      writeHashes(testDir);
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
      fs.rmSync(templateDir, { recursive: true, force: true });
    });

    it('should detect unchanged files', () => {
      const changes = compareWithTemplate(testDir, templateDir);

      const claudeMd = changes.find(c => c.file === 'CLAUDE.md');
      expect(claudeMd?.status).toBe('unchanged');
    });

    it('should detect modified files', () => {
      // Modify a file in the project
      fs.writeFileSync(path.join(testDir, '.claude', 'CLAUDE.md'), 'modified content');

      const changes = compareWithTemplate(testDir, templateDir);

      const claudeMd = changes.find(c => c.file === 'CLAUDE.md');
      expect(claudeMd?.status).toBe('modified');
    });

    it('should detect new files in template', () => {
      // Add a new file to template
      fs.writeFileSync(path.join(templateDir, '.claude', 'new-file.md'), 'new content');

      const changes = compareWithTemplate(testDir, templateDir);

      const newFile = changes.find(c => c.file === 'new-file.md');
      expect(newFile?.status).toBe('new');
    });
  });
});
