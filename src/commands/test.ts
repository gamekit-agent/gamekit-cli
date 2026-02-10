import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface TestResult {
  name: string;
  fullName: string;
  status: string;
  duration: number;
  message: string | null;
  stackTrace: string | null;
}

interface TestStatus {
  status: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  results: TestResult[];
}

export function registerTestCommand(program: Command): void {
  program
    .command('test')
    .description('Run Unity Test Framework tests')
    .option('--editmode', 'Run only EditMode tests')
    .option('--playmode', 'Run only PlayMode tests')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        const mode = opts.editmode ? 'editmode' : opts.playmode ? 'playmode' : 'both';
        log('Starting test run (mode: ' + mode + ')...');

        await request(info.port, 'POST', '/test/run', { mode }, 30000);

        let status: TestStatus;
        do {
          await new Promise(r => setTimeout(r, 1000));
          status = await request<TestStatus>(info.port, 'GET', '/test/status', undefined, 30000);
        } while (status.status === 'running');

        outputSuccess(status, globalOpts);
        logSuccess('Tests complete: ' + status.passed + ' passed, ' + status.failed + ' failed, ' + status.skipped + ' skipped');

        if (status.failed > 0) {
          for (const result of status.results) {
            if (result.status === 'Failed') {
              log('  FAIL: ' + result.fullName);
              if (result.message) {
                log('    ' + result.message);
              }
            }
          }
          process.exit(1);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
