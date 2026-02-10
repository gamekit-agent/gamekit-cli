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

export async function refresh(options: OutputOptions): Promise<void> {
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

  outputSuccess({ success: true, errors: result.errors, errorCount: 0, warningCount }, options);

  if (warningCount > 0) {
    logSuccess(`Compilation successful (${warningCount} warning(s))`);
  } else {
    logSuccess('Compilation successful');
  }
}
