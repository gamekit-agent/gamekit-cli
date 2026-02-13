import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface SceneInfo {
  path: string;
  name: string;
  inBuildSettings: boolean;
  enabled: boolean;
}

interface SceneOpenResult {
  path: string;
  name: string;
  rootCount: number;
}

export function registerSceneCommand(program: Command): void {
  const scene = program.command('scene').description('Manage Unity scenes');

  scene
    .command('list')
    .description('List all scenes in the project')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<SceneInfo[]>(info.port, 'GET', '/scene/list');
        outputSuccess(result, opts);
        for (const s of result) {
          const buildTag = s.inBuildSettings ? ' [build]' : '';
          const disabledTag = s.inBuildSettings && !s.enabled ? ' (disabled)' : '';
          log(`  ${s.name} (${s.path})${buildTag}${disabledTag}`);
        }
        logSuccess(`Found ${result.length} scene(s)`);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });

  scene
    .command('open <name>')
    .description('Open a scene by name or path')
    .action(async (name: string) => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<SceneOpenResult>(info.port, 'POST', '/scene/open', { scene: name });
        outputSuccess(result, opts);
        logSuccess(`Opened scene: ${result.name} (${result.path})`);
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'SCENE_NOT_FOUND' || error.code === 'SCENE_AMBIGUOUS') {
            log(error.message);
          }
          outputError(error.code, error.message);
        }
        throw error;
      }
    });

  scene
    .command('save')
    .description('Save the active scene')
    .option('--path <path>', 'Save path for unnamed scenes (e.g. Assets/Scenes/Main.unity)')
    .action(async (cmdOptions: { path?: string }) => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const body = cmdOptions.path ? { path: cmdOptions.path } : undefined;
        const result = await request<{ scene: string; path: string }>(info.port, 'POST', '/scene/save', body);
        outputSuccess(result, opts);
        logSuccess(`Saved scene: ${result.scene} (${result.path})`);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
