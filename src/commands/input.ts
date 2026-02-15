import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface InputResult {
  key?: string;
  button?: string;
  action: string;
  x?: number;
  y?: number;
}

const TAP_DELAY_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function registerInputCommand(program: Command): void {
  const input = program.command('input').description('Simulate keyboard and mouse input (requires play mode)');

  input
    .command('key <key>')
    .description('Simulate a key press (space, a-z, 0-9, up/down/left/right, enter, escape, shift, ctrl, tab, f1-f12)')
    .option('--down', 'Press key down only (no release)')
    .option('--up', 'Release key only (no press)')
    .option('--hold <seconds>', 'Hold key for specified duration before releasing')
    .action(async (key: string, opts: { down?: boolean; up?: boolean; hold?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        if (opts.down) {
          const result = await request<InputResult>(info.port, 'POST', '/input/key', { key, action: 'down' });
          outputSuccess(result, globalOpts);
          logSuccess(`Key ${key} pressed down`);
        } else if (opts.up) {
          const result = await request<InputResult>(info.port, 'POST', '/input/key', { key, action: 'up' });
          outputSuccess(result, globalOpts);
          logSuccess(`Key ${key} released`);
        } else if (opts.hold) {
          const holdMs = parseFloat(opts.hold) * 1000;
          await request<InputResult>(info.port, 'POST', '/input/key', { key, action: 'down' });
          await sleep(holdMs);
          const result = await request<InputResult>(info.port, 'POST', '/input/key', { key, action: 'up' });
          outputSuccess(result, globalOpts);
          logSuccess(`Key ${key} held for ${opts.hold}s`);
        } else {
          // Tap: press + short delay + release
          await request<InputResult>(info.port, 'POST', '/input/key', { key, action: 'down' });
          await sleep(TAP_DELAY_MS);
          const result = await request<InputResult>(info.port, 'POST', '/input/key', { key, action: 'up' });
          outputSuccess(result, globalOpts);
          logSuccess(`Key ${key} tapped`);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });

  input
    .command('mouse <button>')
    .description('Simulate a mouse click (left/right/middle or 0/1/2)')
    .option('--at <x,y>', 'Screen position to click at')
    .option('--down', 'Press button down only (no release)')
    .option('--up', 'Release button only (no press)')
    .option('--hold <seconds>', 'Hold button for specified duration before releasing')
    .action(async (button: string, opts: { at?: string; down?: boolean; up?: boolean; hold?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        let x: number | undefined;
        let y: number | undefined;
        if (opts.at) {
          const parts = opts.at.split(',');
          if (parts.length !== 2) {
            outputError('INVALID_POSITION', `Invalid position format: "${opts.at}". Expected x,y (e.g., 400,300)`);
            process.exit(1);
          }
          x = parseFloat(parts[0]);
          y = parseFloat(parts[1]);
          if (isNaN(x) || isNaN(y)) {
            outputError('INVALID_POSITION', `Invalid position values: "${opts.at}". Both values must be numbers.`);
            process.exit(1);
          }
        }

        const body: { button: string; action: string; x?: number; y?: number } = { button, action: 'down' };
        if (x !== undefined) body.x = x;
        if (y !== undefined) body.y = y;

        if (opts.down) {
          body.action = 'down';
          const result = await request<InputResult>(info.port, 'POST', '/input/mouse', body);
          outputSuccess(result, globalOpts);
          logSuccess(`Mouse ${button} pressed down${opts.at ? ` at (${x}, ${y})` : ''}`);
        } else if (opts.up) {
          body.action = 'up';
          const result = await request<InputResult>(info.port, 'POST', '/input/mouse', body);
          outputSuccess(result, globalOpts);
          logSuccess(`Mouse ${button} released${opts.at ? ` at (${x}, ${y})` : ''}`);
        } else if (opts.hold) {
          const holdMs = parseFloat(opts.hold) * 1000;
          body.action = 'down';
          await request<InputResult>(info.port, 'POST', '/input/mouse', body);
          await sleep(holdMs);
          body.action = 'up';
          const result = await request<InputResult>(info.port, 'POST', '/input/mouse', body);
          outputSuccess(result, globalOpts);
          logSuccess(`Mouse ${button} held for ${opts.hold}s${opts.at ? ` at (${x}, ${y})` : ''}`);
        } else {
          // Click: press + short delay + release
          body.action = 'down';
          await request<InputResult>(info.port, 'POST', '/input/mouse', body);
          await sleep(TAP_DELAY_MS);
          body.action = 'up';
          const result = await request<InputResult>(info.port, 'POST', '/input/mouse', body);
          outputSuccess(result, globalOpts);
          logSuccess(`Mouse ${button} clicked${opts.at ? ` at (${x}, ${y})` : ''}`);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
