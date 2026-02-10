import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface TransformResult {
  name: string;
  path: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

function parseVector3(str: string): Vector3 {
  const parts = str.split(',');
  if (parts.length !== 3) {
    throw new Error(`Invalid vector format: "${str}". Expected x,y,z (e.g., 1,2,3)`);
  }

  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1]);
  const z = parseFloat(parts[2]);

  if (isNaN(x) || isNaN(y) || isNaN(z)) {
    throw new Error(`Invalid vector values: "${str}". All values must be numbers.`);
  }

  return { x, y, z };
}

function formatVec(v: Vector3): string {
  return `(${v.x}, ${v.y}, ${v.z})`;
}

export function registerTransformCommand(program: Command): void {
  program
    .command('transform <path>')
    .description('Set transform values on a GameObject')
    .option('--position <xyz>', 'Set local position (x,y,z)')
    .option('--rotation <xyz>', 'Set local rotation in euler angles (x,y,z)')
    .option('--scale <xyz>', 'Set local scale (x,y,z)')
    .action(async (path: string, opts: { position?: string; rotation?: string; scale?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        const body: {
          path: string;
          position?: Vector3;
          rotation?: Vector3;
          scale?: Vector3;
        } = { path };

        if (opts.position) {
          body.position = parseVector3(opts.position);
        }
        if (opts.rotation) {
          body.rotation = parseVector3(opts.rotation);
        }
        if (opts.scale) {
          body.scale = parseVector3(opts.scale);
        }

        const result = await request<TransformResult>(info.port, 'POST', '/transform', body);
        outputSuccess(result, globalOpts);

        log(`${result.name} (${result.path})`);
        log(`  position: ${formatVec(result.position)}`);
        log(`  rotation: ${formatVec(result.rotation)}`);
        log(`  scale:    ${formatVec(result.scale)}`);
        logSuccess('Transform updated');
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
        if (error instanceof Error && error.message.startsWith('Invalid vector')) {
          outputError('INVALID_VECTOR', error.message);
        }
        throw error;
      }
    });
}
