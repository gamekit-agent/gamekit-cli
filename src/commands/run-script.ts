import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface RunScriptResult {
  output: string;
  result: string | null;
}

export async function runScript(code: string, options: OutputOptions): Promise<void> {
  const info = await getConnection(process.cwd());
  const result = await request<RunScriptResult>(info.port, 'POST', '/run-script', { code }, 30000);

  outputSuccess(result, options);

  if (result.output) {
    log(result.output.trimEnd());
  }
  if (result.result != null) {
    log(`=> ${result.result}`);
  }
}
