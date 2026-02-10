import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom error class for gamekit-specific errors.
 * Includes an error code for programmatic handling.
 */
export class GameKitError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'GameKitError';
  }
}

/**
 * Information about a running Unity instance's gamekit server.
 * Read from .gamekit/server.json in the project root.
 */
export interface ServerInfo {
  port: number;
  pid: number;
  unityVersion: string;
  projectPath: string;
  startedAt: string;
}

/**
 * Check if a process with the given PID is still alive.
 * Uses the cross-platform `process.kill(pid, 0)` trick:
 * signal 0 does not kill, but throws if the process doesn't exist.
 */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and validate the Unity server info from the port file.
 *
 * Reads `.gamekit/server.json` from the given project path.
 * Validates that the PID in the file is still alive.
 * Throws GameKitError if Unity is not running or port file is stale.
 */
export function readServerInfo(projectPath: string): ServerInfo {
  const portFilePath = path.join(projectPath, '.gamekit', 'server.json');

  if (!fs.existsSync(portFilePath)) {
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Unity is not running.\n\nOpen your project in Unity, then try again.\nThe gamekit plugin starts automatically when Unity opens.'
    );
  }

  const info: ServerInfo = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));

  if (!isProcessRunning(info.pid)) {
    fs.unlinkSync(portFilePath);
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Unity is no longer running (stale port file removed).\n\nReopen Unity and try again.'
    );
  }

  return info;
}

/**
 * Health-check the Unity gamekit plugin by hitting GET /api/health.
 *
 * Returns true if the server responds with { success: true },
 * false for any error (timeout, connection refused, bad response).
 */
export async function healthCheck(port: number, timeoutMs: number = 3000): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.json();
    return body.success === true;
  } catch {
    return false;
  }
}

/**
 * Discover and validate a running Unity instance.
 *
 * Reads the port file, validates the PID, and health-checks the server.
 * Returns ServerInfo on success, throws GameKitError on any failure.
 */
export async function getConnection(projectPath: string): Promise<ServerInfo> {
  const info = readServerInfo(projectPath);
  const healthy = await healthCheck(info.port);

  if (!healthy) {
    throw new GameKitError(
      'UNITY_NOT_RESPONDING',
      'Unity is running but the gamekit plugin is not responding.\n\nTry restarting Unity, or run: gamekit doctor'
    );
  }

  return info;
}
