import * as os from 'os';
import * as path from 'path';

/**
 * Get current platform (exposed for testing)
 */
export function getPlatform(): NodeJS.Platform {
  return os.platform();
}

/**
 * Check if running on Windows
 */
export function isWindows(platform: NodeJS.Platform = getPlatform()): boolean {
  return platform === 'win32';
}

/**
 * Check if running on macOS
 */
export function isMac(platform: NodeJS.Platform = getPlatform()): boolean {
  return platform === 'darwin';
}

/**
 * Get user's home directory
 */
export function getHomeDir(): string {
  return os.homedir();
}

/**
 * Get the path to the Unity MCP relay launch script
 * This script is installed by the advanced-unity-mcp Unity package
 *
 * @param platform - Override platform for testing
 * @param homeDir - Override home directory for testing
 * @param localAppData - Override LOCALAPPDATA for testing (Windows)
 */
export function getMcpRelayPath(
  platform: NodeJS.Platform = getPlatform(),
  homeDir: string = getHomeDir(),
  localAppData: string = process.env.LOCALAPPDATA || ''
): string {
  if (isMac(platform)) {
    return path.join(
      homeDir,
      'Library/Application Support/CodeMaestro/UnityMcpRelay/launch.sh'
    );
  } else if (isWindows(platform)) {
    // Windows uses LOCALAPPDATA (not APPDATA/Roaming)
    return path.join(
      localAppData,
      'Programs',
      'CodeMaestro',
      'UnityMcpRelay',
      'launch.bat'
    );
  }

  throw new Error('Unsupported platform: only macOS and Windows are supported');
}
