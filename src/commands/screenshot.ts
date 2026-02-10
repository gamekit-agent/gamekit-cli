import fs from 'node:fs';
import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface ScreenshotResult {
  path: string;
}

export function registerScreenshotCommand(program: Command): void {
  program
    .command('screenshot')
    .description('Capture a screenshot from Unity')
    .option('--scene', 'Capture the Scene view instead of Game view')
    .option('--camera <name>', 'Capture from a specific camera')
    .option('--width <pixels>', 'Screenshot width', '1920')
    .option('--height <pixels>', 'Screenshot height', '1080')
    .option('--output <path>', 'Save screenshot to specific file path')
    .option('--stdout', 'Write raw PNG binary to stdout')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        const source = opts.scene ? 'scene' : (opts.camera ?? 'game');
        let params = `?source=${encodeURIComponent(source)}&width=${opts.width}&height=${opts.height}`;

        if (opts.stdout) {
          // Binary mode: raw PNG to stdout
          params += '&format=binary';
          const url = `http://localhost:${info.port}/api/screenshot${params}`;

          const res = await fetch(url, {
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            const body = await res.json() as { error?: { code?: string; message?: string } };
            throw new GameKitError(
              body.error?.code ?? 'SCREENSHOT_FAILED',
              body.error?.message ?? 'Screenshot capture failed'
            );
          }

          const buffer = Buffer.from(await res.arrayBuffer());
          process.stdout.write(buffer);
        } else {
          // File mode: JSON response with path
          params += '&format=file';
          const result = await request<ScreenshotResult>(info.port, 'GET', '/screenshot' + params, undefined, 30000);

          if (opts.output) {
            fs.copyFileSync(result.path, opts.output);
            result.path = opts.output;
          }

          outputSuccess(result, globalOpts);
          logSuccess('Screenshot saved to ' + result.path);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
