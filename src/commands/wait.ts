import { readServerInfo, GameKitError } from '../utils/connection.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface HealthData {
  status: string;
  unityVersion: string;
  projectPath: string;
  projectName: string;
  platform: string;
}

/**
 * Poll Unity's health endpoint until it reports an idle status.
 * Handles connection failures during domain reload gracefully.
 */
export async function wait(options: OutputOptions & { timeout?: string }): Promise<void> {
  const timeoutMs = options.timeout ? parseInt(options.timeout, 10) * 1000 : 60000;
  const pollIntervalMs = 500;
  const start = Date.now();

  const info = readServerInfo(process.cwd());

  let lastStatus = '';

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${info.port}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const body = await res.json() as { success: boolean; data: HealthData };

      if (body.success) {
        const status = body.data.status;

        if (status !== lastStatus) {
          if (status === 'compiling') {
            log('Unity is compiling...');
          } else if (status === 'idle' || status === 'playing' || status === 'paused') {
            logSuccess(`Unity is ${status}`);
            outputSuccess(body.data, options);
            return;
          }
          lastStatus = status;
        }
      }
    } catch {
      // Connection refused or timeout — Unity is likely in domain reload
      if (lastStatus !== 'reloading') {
        log('Waiting for Unity (domain reload)...');
        lastStatus = 'reloading';
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new GameKitError(
    'TIMEOUT',
    `Unity did not become ready within ${timeoutMs / 1000}s`
  );
}
