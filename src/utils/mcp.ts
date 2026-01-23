import * as fs from 'fs';
import * as path from 'path';
import ora, { Ora } from 'ora';
import { getPlatform, getHomeDir, getMcpRelayPath, isMac, isWindows } from './platform.js';

/**
 * The MCP server name used in configuration
 */
export const MCP_SERVER_NAME = 'advanced-unity-mcp';

/**
 * MCP configuration structure
 */
export interface McpConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
    };
  };
}

/**
 * Get the MCP configuration object for the current platform
 *
 * Mac uses: { command: "bash", args: ["/path/to/launch.sh"] }
 * Windows uses: { command: "C:\\path\\to\\launch.bat", args: [] }
 *
 * @param platform - Override platform for testing
 * @param homeDir - Override home directory for testing (Mac)
 * @param localAppData - Override LOCALAPPDATA for testing (Windows)
 */
export function getMcpConfigObject(
  platform: NodeJS.Platform = getPlatform(),
  homeDir: string = getHomeDir(),
  localAppData: string = process.env.LOCALAPPDATA || ''
): McpConfig {
  const relayPath = getMcpRelayPath(platform, homeDir, localAppData);

  if (isMac(platform)) {
    return {
      mcpServers: {
        [MCP_SERVER_NAME]: {
          command: 'bash',
          args: [relayPath]
        }
      }
    };
  } else if (isWindows(platform)) {
    // Windows: command is the .bat path directly, args is empty
    return {
      mcpServers: {
        [MCP_SERVER_NAME]: {
          command: relayPath,
          args: []
        }
      }
    };
  }

  throw new Error('Unsupported platform');
}

/**
 * Generate and write the .mcp.json configuration file to a project directory
 *
 * @param projectPath - Path to the project directory
 * @param platform - Override platform for testing
 * @param homeDir - Override home directory for testing (Mac)
 * @param localAppData - Override LOCALAPPDATA for testing (Windows)
 */
export function generateMcpConfig(
  projectPath: string,
  platform: NodeJS.Platform = getPlatform(),
  homeDir: string = getHomeDir(),
  localAppData: string = process.env.LOCALAPPDATA || ''
): void {
  const config = getMcpConfigObject(platform, homeDir, localAppData);
  const configPath = path.join(projectPath, '.mcp.json');

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Check if a project has an .mcp.json file
 */
export function hasMcpConfig(projectPath: string): boolean {
  const configPath = path.join(projectPath, '.mcp.json');
  return fs.existsSync(configPath);
}

/**
 * Check if the MCP relay script exists on the system
 * (It gets installed when Unity MCP package is installed and Unity is opened)
 */
export function mcpRelayExists(
  platform: NodeJS.Platform = getPlatform(),
  homeDir: string = getHomeDir(),
  localAppData: string = process.env.LOCALAPPDATA || ''
): boolean {
  const relayPath = getMcpRelayPath(platform, homeDir, localAppData);
  return fs.existsSync(relayPath);
}

/**
 * Wait for the MCP relay to be installed by Unity
 * Shows a spinner and polls until the relay file exists or timeout is reached
 *
 * @param options - Configuration options
 * @param options.timeoutMs - Maximum time to wait in milliseconds (default: 5 minutes)
 * @param options.pollIntervalMs - How often to check in milliseconds (default: 2 seconds)
 * @param options.spinner - Optional existing spinner to use
 * @returns Promise that resolves to true if relay found, false if timed out
 */
export async function waitForMcpRelay(options: {
  timeoutMs?: number;
  pollIntervalMs?: number;
  spinner?: Ora;
} = {}): Promise<boolean> {
  const {
    timeoutMs = 5 * 60 * 1000, // 5 minutes default
    pollIntervalMs = 2000,     // 2 seconds default
    spinner: externalSpinner
  } = options;

  const spinner = externalSpinner || ora('Waiting for Unity to install MCP package...').start();
  const startTime = Date.now();
  let dots = 0;

  const updateSpinnerText = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const dotStr = '.'.repeat((dots % 3) + 1);
    spinner.text = `Waiting for Unity to install MCP package${dotStr} (${elapsed}s)`;
    dots++;
  };

  return new Promise((resolve) => {
    const check = () => {
      if (mcpRelayExists()) {
        // Add 5 second buffer to ensure MCP server is fully ready
        spinner.text = 'MCP relay found, waiting for server to initialize...';
        setTimeout(() => {
          spinner.succeed('MCP relay installed and ready');
          resolve(true);
        }, 5000);
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        spinner.warn('MCP relay not found yet (Unity may still be loading)');
        resolve(false);
        return;
      }

      updateSpinnerText();
      setTimeout(check, pollIntervalMs);
    };

    check();
  });
}
