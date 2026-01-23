import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { addMcpToManifest } from '../../utils/manifest.js';

describe('manifest utils', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('addMcpToManifest', () => {
    it('should add MCP package to empty dependencies', () => {
      const manifestPath = path.join(testDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        dependencies: {}
      }));

      addMcpToManifest(manifestPath, '6000.1.0f1');

      const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(result.dependencies['com.codemaestroai.advancedunitymcp']).toBe(
        'https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity6'
      );
    });

    it('should preserve existing packages', () => {
      const manifestPath = path.join(testDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        dependencies: {
          'com.unity.inputsystem': '1.14.0',
          'com.unity.textmeshpro': '3.0.0'
        }
      }));

      addMcpToManifest(manifestPath, '6000.1.0f1');

      const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(result.dependencies['com.unity.inputsystem']).toBe('1.14.0');
      expect(result.dependencies['com.unity.textmeshpro']).toBe('3.0.0');
      expect(result.dependencies['com.codemaestroai.advancedunitymcp']).toBeDefined();
    });

    it('should update existing MCP entry', () => {
      const manifestPath = path.join(testDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        dependencies: {
          'com.codemaestroai.advancedunitymcp': 'old-url'
        }
      }));

      addMcpToManifest(manifestPath, '6000.1.0f1');

      const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(result.dependencies['com.codemaestroai.advancedunitymcp']).toBe(
        'https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity6'
      );
    });

    it('should use Unity2020_2022 path for Unity 2022', () => {
      const manifestPath = path.join(testDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        dependencies: {}
      }));

      addMcpToManifest(manifestPath, '2022.3.20f1');

      const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(result.dependencies['com.codemaestroai.advancedunitymcp']).toBe(
        'https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity2020_2022'
      );
    });

    it('should not add MCP for unsupported Unity versions', () => {
      const manifestPath = path.join(testDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        dependencies: {
          'com.unity.inputsystem': '1.0.0'
        }
      }));

      addMcpToManifest(manifestPath, '2019.4.0f1');

      const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(result.dependencies['com.codemaestroai.advancedunitymcp']).toBeUndefined();
      // Should preserve existing packages
      expect(result.dependencies['com.unity.inputsystem']).toBe('1.0.0');
    });

    it('should preserve scopedRegistries if present', () => {
      const manifestPath = path.join(testDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        scopedRegistries: [
          { name: 'test', url: 'https://test.com', scopes: ['com.test'] }
        ],
        dependencies: {}
      }));

      addMcpToManifest(manifestPath, '6000.1.0f1');

      const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(result.scopedRegistries).toHaveLength(1);
      expect(result.scopedRegistries[0].name).toBe('test');
    });
  });
});
