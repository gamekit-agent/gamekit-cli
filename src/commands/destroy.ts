import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface DestroyResult {
  destroyed: string;
  path: string;
}

export function registerDestroyCommand(program: Command): void {
  program
    .command('destroy <path>')
    .description('Remove a GameObject from the scene')
    .action(async (path: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<DestroyResult>(info.port, 'POST', '/destroy', { path });
        outputSuccess(result, globalOpts);
        logSuccess(`Destroyed: ${result.destroyed}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct path.`
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
