import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface AddComponentResult {
  gameObject: string;
  component: string;
  path: string;
}

export function registerAddComponentCommand(program: Command): void {
  program
    .command('add-component <path> <type>')
    .description('Add a component to a GameObject')
    .action(async (path: string, type: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<AddComponentResult>(info.port, 'POST', '/add-component', {
          path,
          type,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Added ${result.component} to ${result.gameObject}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct path.`
            );
          } else if (error.code === 'TYPE_NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use the full type name if ambiguous (e.g., UnityEngine.Camera).`
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
