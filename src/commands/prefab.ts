import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface PrefabCreateResult {
  path: string;
  name: string;
  type: string;
  isVariant: boolean;
}

interface PrefabInstantiateResult {
  name: string;
  path: string;
  instanceId: number;
  prefabPath: string;
}

interface PrefabOverridesResult {
  gameObject: string;
  path: string;
  isPrefabInstance: boolean;
  assetType: string;
  hasOverrides: boolean;
  overrides: Array<{
    target: string;
    targetType: string;
    propertyPath: string;
    value: string;
  }>;
}

export function registerPrefabCommand(program: Command): void {
  const prefab = program.command('prefab').description('Manage prefab assets');

  prefab
    .command('create <gameObjectPath>')
    .description('Create a prefab from a scene GameObject')
    .option('--output <assetPath>', 'Output asset path (default: Assets/Prefabs/<name>.prefab)')
    .option('--no-connect', 'Do not keep the scene object connected as a prefab instance')
    .action(async (gameObjectPath: string, opts: { output?: string; connect: boolean }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PrefabCreateResult>(info.port, 'POST', '/prefab/create', {
          gameObjectPath,
          assetPath: opts.output,
          connect: opts.connect,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Created ${result.type} prefab: ${result.path}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct GameObject path.`
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

  prefab
    .command('instantiate <prefabPath>')
    .description('Instantiate a prefab into the scene')
    .option('--parent <path>', 'Parent GameObject path')
    .action(async (prefabPath: string, opts: { parent?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PrefabInstantiateResult>(info.port, 'POST', '/prefab/instantiate', {
          prefabPath,
          parent: opts.parent,
        });
        outputSuccess(result, globalOpts);
        logSuccess(`Instantiated: ${result.path}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit list prefabs' to find available prefab paths.`
            );
          } else if (error.code === 'PARENT_NOT_FOUND') {
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

  prefab
    .command('overrides <gameObjectPath>')
    .description('List property overrides on a prefab instance')
    .action(async (gameObjectPath: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PrefabOverridesResult>(
          info.port,
          'GET',
          `/prefab/overrides?path=${encodeURIComponent(gameObjectPath)}`
        );
        outputSuccess(result, globalOpts);
        log(`${result.overrides.length} override(s) found on ${result.gameObject}`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct GameObject path.`
            );
          } else if (error.code === 'NOT_PREFAB_INSTANCE') {
            outputError(
              error.code,
              `${error.message}\n\nTip: This command only works on prefab instances in the scene.`
            );
          } else {
            outputError(error.code, error.message);
          }
        }
        throw error;
      }
    });
}
