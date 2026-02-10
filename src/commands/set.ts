import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface SetResult {
  gameObject: string;
  component: string;
  property: string;
  value: unknown;
}

function parseValue(raw: string): unknown {
  // JSON object
  if (raw.startsWith('{')) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fall through to string
    }
  }

  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Comma-separated numbers: Vector2 (x,y), Vector3 (x,y,z), Vector4/Color (x,y,z,w)
  const commaPattern = /^-?\d+\.?\d*(?:,-?\d+\.?\d*)+$/;
  if (commaPattern.test(raw)) {
    const parts = raw.split(',').map(Number);
    if (parts.length === 2) return { x: parts[0], y: parts[1] };
    if (parts.length === 3) return { x: parts[0], y: parts[1], z: parts[2] };
    if (parts.length === 4) return { x: parts[0], y: parts[1], z: parts[2], w: parts[3] };
  }

  // Number
  const num = Number(raw);
  if (!isNaN(num) && raw.trim() !== '') return num;

  // String (handles enum names like "Dynamic", "Interpolate")
  return raw;
}

export function registerSetCommand(program: Command): void {
  program
    .command('set <path> <component> <property> <value>')
    .description('Set a property value on a component')
    .action(async (path: string, component: string, property: string, rawValue: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const parsedValue = parseValue(rawValue);
        const result = await request<SetResult>(info.port, 'POST', '/set', {
          path,
          component,
          property,
          value: parsedValue,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Set ${result.property} = ${formatValue(result.value)}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct path.`
            );
          } else if (error.code === 'COMPONENT_NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit inspect <path>' to see available components.`
            );
          } else if (error.code === 'PROPERTY_NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit inspect <path> --component <type>' to see available properties.`
            );
          } else if (error.code === 'PLAY_MODE') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Stop play mode first with 'gamekit play stop'.`
            );
          } else if (error.code === 'INVALID_VALUE') {
            outputError(error.code, error.message);
          } else {
            outputError(error.code, error.message);
          }
        }
        throw error;
      }
    });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
