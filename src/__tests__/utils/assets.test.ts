import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createEditorScripts } from '../../utils/assets.js';

describe('assets utils', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-assets-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createEditorScripts', () => {
    it('should create ScreenshotCapture.cs in Editor folder', () => {
      createEditorScripts(testDir);

      const scriptPath = path.join(testDir, 'Assets', '_Game', 'Scripts', 'Editor', 'ScreenshotCapture.cs');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it('should create valid C# script content', () => {
      createEditorScripts(testDir);

      const scriptPath = path.join(testDir, 'Assets', '_Game', 'Scripts', 'Editor', 'ScreenshotCapture.cs');
      const content = fs.readFileSync(scriptPath, 'utf-8');

      expect(content).toContain('using UnityEngine;');
      expect(content).toContain('using UnityEditor;');
      expect(content).toContain('public static class ScreenshotCapture');
      expect(content).toContain('[MenuItem("Tools/Capture Screenshot")]');
    });

    it('should create directory structure if it does not exist', () => {
      createEditorScripts(testDir);

      expect(fs.existsSync(path.join(testDir, 'Assets'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'Assets', '_Game'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'Assets', '_Game', 'Scripts'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'Assets', '_Game', 'Scripts', 'Editor'))).toBe(true);
    });
  });
});
