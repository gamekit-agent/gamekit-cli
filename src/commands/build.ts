import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, logWarning, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface BuildResult {
  result: string;
  platform: string;
  outputPath: string;
  totalSize: number;
  totalTime: number;
  totalErrors: number;
  totalWarnings: number;
  errors: Array<{ message: string }>;
}

export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build the Unity project')
    .requiredOption('--platform <target>', 'Target platform (windows, mac, linux, ios, android, webgl)')
    .option('--output <path>', 'Output path (default: Builds/<platform>/)')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        logWarning('Build in progress. This may take several minutes...');

        const result = await request<BuildResult>(
          info.port,
          'POST',
          '/build',
          { platform: opts.platform, outputPath: opts.output },
          600000
        );

        outputSuccess(result, globalOpts);

        if (result.result === 'Succeeded') {
          logSuccess('Build succeeded: ' + result.outputPath);
          log('Size: ' + result.totalSize + ' bytes, Time: ' + Math.round(result.totalTime) + 's');
        } else if (result.result === 'Failed') {
          log('Build failed with ' + result.totalErrors + ' error(s)');
          for (const err of result.errors) {
            log('  - ' + err.message);
          }
          process.exit(1);
        } else if (result.result === 'Cancelled') {
          log('Build was cancelled');
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
