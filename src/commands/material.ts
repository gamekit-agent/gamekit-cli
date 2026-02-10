import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface MaterialCreateResult {
  path: string;
  name: string;
  shader: string;
}

interface MaterialSetResult {
  path: string;
  property: string;
  value: unknown;
  type: string;
}

interface MaterialAssignResult {
  gameObject: string;
  material: string;
  materialPath: string;
  gameObjectPath: string;
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

  // Comma-separated numbers: Vector2 (x,y), Vector3 (x,y,z), Color/Vector4 (x,y,z,w)
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

  // String (texture paths, etc.)
  return raw;
}

export function registerMaterialCommand(program: Command): void {
  const material = program.command('material').description('Manage material assets');

  material
    .command('create <name>')
    .description('Create a new material asset')
    .option('--shader <shaderName>', 'Shader name', 'Standard')
    .option('--output <assetPath>', 'Output asset path (default: Assets/Materials/<name>.mat)')
    .action(async (name: string, opts: { shader: string; output?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<MaterialCreateResult>(info.port, 'POST', '/material/create', {
          name,
          shader: opts.shader,
          outputPath: opts.output,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Created: ${result.path} (shader: ${result.shader})`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'SHADER_NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Common shader names: Standard, Universal Render Pipeline/Lit, HDRP/Lit`
            );
          } else {
            outputError(error.code, error.message);
          }
        }
        throw error;
      }
    });

  material
    .command('set <materialPath> <property> <value>')
    .description('Set a shader property on a material')
    .action(async (materialPath: string, property: string, rawValue: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const parsedValue = parseValue(rawValue);
        const result = await request<MaterialSetResult>(info.port, 'POST', '/material/set', {
          materialPath,
          property,
          value: parsedValue,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Set ${result.property} on ${result.path}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(error.code, error.message);
          } else if (error.code === 'PROPERTY_NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Property names are shader-specific. Use the available properties listed above.`
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

  material
    .command('assign <materialPath> <gameObjectPath>')
    .description('Assign a material to a GameObject renderer')
    .action(async (materialPath: string, gameObjectPath: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<MaterialAssignResult>(info.port, 'POST', '/material/assign', {
          materialPath,
          gameObjectPath,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Assigned ${result.material} to ${result.gameObject}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(error.code, error.message);
          } else if (error.code === 'NO_RENDERER') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Add a MeshRenderer or other Renderer component first with 'gamekit add-component'.`
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
