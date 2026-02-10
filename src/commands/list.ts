import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface ScriptInfo {
  path: string;
  name: string;
}

interface SceneInfo {
  path: string;
  name: string;
  inBuildSettings: boolean;
  enabled: boolean;
}

interface PrefabInfo {
  path: string;
  name: string;
}

export function registerListCommand(program: Command): void {
  const list = program.command('list').description('List project assets');

  list
    .command('scripts')
    .description('List all C# scripts in the project')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<ScriptInfo[]>(info.port, 'GET', '/list/scripts');
        outputSuccess(result, opts);
        for (const s of result) {
          log(`  ${s.name} (${s.path})`);
        }
        logSuccess(`Found ${result.length} script(s)`);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });

  list
    .command('scenes')
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

  list
    .command('prefabs')
    .description('List all prefabs in the project')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<PrefabInfo[]>(info.port, 'GET', '/list/prefabs');
        outputSuccess(result, opts);
        for (const s of result) {
          log(`  ${s.name} (${s.path})`);
        }
        logSuccess(`Found ${result.length} prefab(s)`);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
