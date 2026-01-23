import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { getPlatform, isWindows, isMac } from './platform.js';

/**
 * Represents a Unity installation
 */
export interface UnityInstall {
  version: string;
  path: string;
  isUnity6: boolean;
}

/**
 * Parsed Unity version components
 */
export interface UnityVersion {
  major: number;
  minor: number;
  patch: number;
  type: string;  // 'f' for final, 'b' for beta, 'a' for alpha
  build: number;
}

/**
 * Get the Unity Hub Editor installation path
 */
export function getUnityHubPath(platform: NodeJS.Platform = getPlatform()): string {
  if (isMac(platform)) {
    return '/Applications/Unity/Hub/Editor';
  } else if (isWindows(platform)) {
    return 'C:\\Program Files\\Unity\\Hub\\Editor';
  }
  throw new Error('Unsupported platform: only macOS and Windows are supported');
}

/**
 * Parse a Unity version string into components
 * Examples: "6000.1.12f1", "2022.3.20f1", "6000.0.0b1"
 */
export function parseUnityVersion(version: string): UnityVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)([a-z])(\d+)$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    type: match[4],
    build: parseInt(match[5], 10)
  };
}

/**
 * Check if a version is Unity 6 or newer
 * Unity 6 uses version numbers starting with 6000
 */
export function isUnity6OrNewer(version: string): boolean {
  const parsed = parseUnityVersion(version);
  if (!parsed) return false;
  return parsed.major >= 6000;
}

/**
 * Get the path to the Unity executable for a given version
 */
export function getUnityExecutablePath(
  version: string,
  platform: NodeJS.Platform = getPlatform()
): string {
  const hubPath = getUnityHubPath(platform);

  if (isMac(platform)) {
    return path.join(hubPath, version, 'Unity.app', 'Contents', 'MacOS', 'Unity');
  } else if (isWindows(platform)) {
    return path.join(hubPath, version, 'Editor', 'Unity.exe');
  }

  throw new Error('Unsupported platform');
}

/**
 * Find all Unity installations on the system
 */
export function findUnityInstalls(platform: NodeJS.Platform = getPlatform()): UnityInstall[] {
  let hubPath: string;
  try {
    hubPath = getUnityHubPath(platform);
  } catch {
    // Unsupported platform (e.g., Linux)
    return [];
  }

  if (!fs.existsSync(hubPath)) {
    return [];
  }

  const installs: UnityInstall[] = [];
  const entries = fs.readdirSync(hubPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const version = entry.name;
    const parsed = parseUnityVersion(version);
    if (!parsed) continue;

    const execPath = getUnityExecutablePath(version, platform);

    // On Mac, check if the .app exists; on Windows, check if the .exe exists
    const checkPath = isMac(platform)
      ? path.join(hubPath, version, 'Unity.app')
      : execPath;

    if (fs.existsSync(checkPath)) {
      installs.push({
        version,
        path: execPath,
        isUnity6: isUnity6OrNewer(version)
      });
    }
  }

  // Sort by version (newest first)
  installs.sort((a, b) => {
    const vA = parseUnityVersion(a.version);
    const vB = parseUnityVersion(b.version);
    if (!vA || !vB) return 0;

    if (vA.major !== vB.major) return vB.major - vA.major;
    if (vA.minor !== vB.minor) return vB.minor - vA.minor;
    if (vA.patch !== vB.patch) return vB.patch - vA.patch;
    return vB.build - vA.build;
  });

  return installs;
}

/**
 * Create a new Unity project using the CLI
 *
 * @param unityPath - Path to Unity executable
 * @param projectPath - Path where the project should be created
 * @returns Promise that resolves when project is created
 */
export function createUnityProject(
  unityPath: string,
  projectPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['-createProject', projectPath, '-quit', '-batchmode'];

    const child = spawn(unityPath, args, {
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start Unity: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Unity exited with code ${code}`));
      }
    });
  });
}

/**
 * Get the Unity MCP package URL based on the Unity version
 * Returns null for unsupported versions (2019 and older)
 */
export function getMcpPackageUrl(version: string): string | null {
  const parsed = parseUnityVersion(version);
  if (!parsed) return null;

  // Unity 6+ (version numbers starting with 6000)
  if (parsed.major >= 6000) {
    return 'https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity6';
  }

  // Unity 2020-2023
  if (parsed.major >= 2020 && parsed.major <= 2023) {
    return 'https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity2020_2022';
  }

  // Unity 2019 or older - not supported
  return null;
}

/**
 * Check if a directory is a Unity project
 * A valid Unity project has Assets/ folder and Packages/manifest.json
 */
export function isUnityProject(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;

  const assetsDir = path.join(dir, 'Assets');
  const manifestPath = path.join(dir, 'Packages', 'manifest.json');

  return fs.existsSync(assetsDir) && fs.existsSync(manifestPath);
}

/**
 * Open a Unity project (non-blocking)
 * Unity will open in the background while the CLI continues
 *
 * @param unityPath - Path to Unity executable
 * @param projectPath - Path to the project to open
 */
export function openUnityProject(unityPath: string, projectPath: string): void {
  const args = ['-projectPath', projectPath];

  // Spawn detached so Unity continues running after CLI exits
  const child = spawn(unityPath, args, {
    detached: true,
    stdio: 'ignore'
  });

  // Unref so the CLI can exit while Unity runs
  child.unref();
}
