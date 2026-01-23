import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateMcpConfig,
  getMcpConfigObject,
  MCP_SERVER_NAME
} from '../../utils/mcp.js';

describe('mcp utilities', () => {
  describe('MCP_SERVER_NAME', () => {
    it('should be advanced-unity-mcp', () => {
      expect(MCP_SERVER_NAME).toBe('advanced-unity-mcp');
    });
  });

  describe('getMcpConfigObject', () => {
    it('returns correct structure for Mac', () => {
      const config = getMcpConfigObject('darwin', '/Users/test');

      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['advanced-unity-mcp']).toBeDefined();
      expect(config.mcpServers['advanced-unity-mcp'].command).toBe('bash');
      expect(config.mcpServers['advanced-unity-mcp'].args).toHaveLength(1);
      expect(config.mcpServers['advanced-unity-mcp'].args[0]).toContain('launch.sh');
    });

    it('returns correct structure for Windows', () => {
      const config = getMcpConfigObject('win32', '', 'C:\\Users\\test\\AppData\\Local');

      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['advanced-unity-mcp']).toBeDefined();
      // Windows: command IS the .bat path, args is empty
      expect(config.mcpServers['advanced-unity-mcp'].command).toContain('launch.bat');
      expect(config.mcpServers['advanced-unity-mcp'].args).toEqual([]);
    });

    it('Mac config uses bash command', () => {
      const config = getMcpConfigObject('darwin', '/Users/test');
      expect(config.mcpServers['advanced-unity-mcp'].command).toBe('bash');
    });

    it('Windows config puts path in command', () => {
      const config = getMcpConfigObject('win32', '', 'C:\\AppData\\Local');
      const cmd = config.mcpServers['advanced-unity-mcp'].command;
      expect(cmd).toContain('CodeMaestro');
      expect(cmd).toContain('launch.bat');
    });
  });

  describe('generateMcpConfig', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-mcp-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('creates .mcp.json file in project directory', () => {
      generateMcpConfig(testDir, 'darwin', '/Users/test');

      const mcpPath = path.join(testDir, '.mcp.json');
      expect(fs.existsSync(mcpPath)).toBe(true);
    });

    it('writes valid JSON', () => {
      generateMcpConfig(testDir, 'darwin', '/Users/test');

      const mcpPath = path.join(testDir, '.mcp.json');
      const content = fs.readFileSync(mcpPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('contains mcpServers key', () => {
      generateMcpConfig(testDir, 'darwin', '/Users/test');

      const mcpPath = path.join(testDir, '.mcp.json');
      const config = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));

      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['advanced-unity-mcp']).toBeDefined();
    });

    it('is formatted with 2-space indentation', () => {
      generateMcpConfig(testDir, 'darwin', '/Users/test');

      const mcpPath = path.join(testDir, '.mcp.json');
      const content = fs.readFileSync(mcpPath, 'utf-8');

      // Should have newlines and 2-space indentation
      expect(content).toContain('\n');
      expect(content).toContain('  "mcpServers"');
    });
  });
});
