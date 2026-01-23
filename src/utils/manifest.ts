import * as fs from 'fs';
import { getMcpPackageUrl } from './unity.js';

/**
 * Add the MCP package to an existing manifest.json
 * Preserves all existing packages and other manifest properties
 *
 * @param manifestPath - Path to the manifest.json file
 * @param unityVersion - Unity version string (e.g., "6000.1.0f1")
 */
export function addMcpToManifest(manifestPath: string, unityVersion: string): void {
  const content = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(content);

  const mcpUrl = getMcpPackageUrl(unityVersion);

  // Only add MCP package if Unity version is supported
  if (mcpUrl) {
    manifest.dependencies = manifest.dependencies || {};
    manifest.dependencies['com.codemaestroai.advancedunitymcp'] = mcpUrl;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
