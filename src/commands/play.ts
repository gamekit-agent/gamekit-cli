import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface PlayActionResult {
  status: string;
}

interface PlayStatusResult {
  state: string;
}

export function registerPlayCommand(program: Command): void {
  const play = program.command('play').description('Control Unity play mode');

  play
    .command('start')
    .description('Enter play mode')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PlayActionResult>(info.port, 'POST', '/play/start');
        outputSuccess(result, opts);
        if (result.status === 'entering_play_mode') {
          logSuccess('Entering play mode');
        } else if (result.status === 'already_playing') {
          log('Already in play mode');
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });

  play
    .command('stop')
    .description('Exit play mode')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PlayActionResult>(info.port, 'POST', '/play/stop');
        outputSuccess(result, opts);
        if (result.status === 'exiting_play_mode') {
          logSuccess('Exiting play mode');
        } else if (result.status === 'already_stopped') {
          log('Already stopped');
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });

  play
    .command('status')
    .description('Check play mode state')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PlayStatusResult>(info.port, 'GET', '/play/status');
        outputSuccess(result, opts);
        log(`Play mode: ${result.state}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
