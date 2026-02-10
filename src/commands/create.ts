import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface CreateResult {
  name: string;
  path: string;
  instanceId: number;
}

export function registerCreateCommand(program: Command): void {
  program
    .command('create <name>')
    .description('Create a new GameObject in the scene')
    .option('--parent <path>', 'Parent GameObject path')
    .action(async (name: string, opts: { parent?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<CreateResult>(info.port, 'POST', '/create', {
          name,
          parent: opts.parent,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Created: ${result.path}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'PARENT_NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct parent path.`
            );
          } else if (error.code === 'PLAY_MODE') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Stop play mode first with 'gamekit play stop'.`
            );
          } else {
            outputError(error.code, error.message);
          }
        }
        throw error;
      }
    });
}
