import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface SettingsResult {
  layers: string[];
  tags: string[];
  sortingLayers: { name: string; id: number; value: number }[];
  physics: {
    gravity: { x: number; y: number; z: number };
    defaultContactOffset: number;
    bounceThreshold: number;
    defaultSolverIterations: number;
    defaultSolverVelocityIterations: number;
  };
  quality: {
    levels: string[];
    current: number;
    currentName: string;
  };
  input: { name: string; positiveButton: string; negativeButton: string; type: number }[];
}

export function registerSettingsCommand(program: Command): void {
  program
    .command('settings')
    .description('Show project settings (layers, tags, physics, quality, input)')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<SettingsResult>(info.port, 'GET', '/settings');
        outputSuccess(result, opts);
        log('Layers: ' + result.layers.join(', '));
        log('Tags: ' + result.tags.join(', '));
        log('Physics: gravity=' + JSON.stringify(result.physics.gravity));
        log('Quality: ' + result.quality.currentName + ' (' + result.quality.levels.length + ' levels)');
        log('Input axes: ' + result.input.length + ' configured');
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
