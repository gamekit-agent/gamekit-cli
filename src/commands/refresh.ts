import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface RefreshResult {
  status: string;
  errors: Array<{
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

export async function refresh(options: OutputOptions & { wait?: boolean }): Promise<void> {
  const info = await getConnection(process.cwd());

  let result = await request<RefreshResult>(info.port, 'POST', '/refresh', undefined, 60000);

  // Handle async compilation: poll until status is no longer "compiling"
  if (result.status === 'compiling') {
    let retries = 0;
    const maxRetries = 30;

    while (result.status === 'compiling' && retries < maxRetries) {
      await new Promise(r => setTimeout(r, 1000));
      result = await request<RefreshResult>(info.port, 'POST', '/refresh', undefined, 60000);
      retries++;
    }
  }

  const errorCount = result.errors.filter(e => e.severity === 'error').length;
  const warningCount = result.errors.filter(e => e.severity === 'warning').length;

  if (errorCount > 0) {
    outputSuccess({ success: false, errors: result.errors, errorCount, warningCount }, options);

    log(`${errorCount} error(s), ${warningCount} warning(s)`);
    for (const err of result.errors) {
      log(`  ${err.file}:${err.line}:${err.column} ${err.severity}: ${err.message}`);
    }

    process.exit(1);
  }

  if (warningCount > 0) {
    logSuccess(`Compilation successful (${warningCount} warning(s))`);
  } else {
    logSuccess('Compilation successful');
  }

  if (options.wait) {
    await waitForIdle(info.port);
  }

  outputSuccess({ success: true, errors: result.errors, errorCount: 0, warningCount }, options);
}

async function waitForIdle(port: number): Promise<void> {
  const timeoutMs = 60000;
  const pollIntervalMs = 500;
  const start = Date.now();
  let lastStatus = '';

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const body = await res.json() as { success: boolean; data: { status: string } };

      if (body.success) {
        const status = body.data.status;
        if (status !== lastStatus) {
          if (status === 'compiling') {
            log('Unity is compiling...');
          } else if (status === 'idle' || status === 'playing' || status === 'paused') {
            logSuccess(`Unity is ${status}`);
            return;
          }
          lastStatus = status;
        }
      }
    } catch {
      if (lastStatus !== 'reloading') {
        log('Waiting for Unity (domain reload)...');
        lastStatus = 'reloading';
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new GameKitError('TIMEOUT', 'Unity did not become idle within 60s after refresh');
}
