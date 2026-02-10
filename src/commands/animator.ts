import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface AnimatorCondition {
  parameter: string;
  mode: string;
  threshold: number;
}

interface AnimatorTransition {
  destinationState: string;
  hasExitTime: boolean;
  exitTime: number;
  duration: number;
  conditions: AnimatorCondition[];
}

interface AnimatorState {
  name: string;
  tag: string;
  speed: number;
  motion: string | null;
  transitions: AnimatorTransition[];
}

interface AnimatorLayer {
  name: string;
  stateCount: number;
  states: AnimatorState[];
}

interface AnimatorParameter {
  name: string;
  type: string;
  defaultFloat: number;
  defaultInt: number;
  defaultBool: boolean;
}

interface AnimatorListResult {
  name: string;
  path: string;
  layerCount: number;
  parameterCount: number;
  layers: AnimatorLayer[];
  parameters: AnimatorParameter[];
}

export function registerAnimatorCommand(program: Command): void {
  const animator = program.command('animator').description('Query Animator controllers');

  animator
    .command('list <path>')
    .description('List Animator controller states, parameters, and transitions')
    .action(async (path: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        const result = await request<AnimatorListResult>(
          info.port,
          'GET',
          `/animator/list?path=${encodeURIComponent(path)}`
        );
        outputSuccess(result, globalOpts);

        log(`Controller: ${result.name}`);
        log(`  ${result.parameterCount} parameter(s), ${result.layerCount} layer(s)`);
        for (const layer of result.layers) {
          log(`  Layer: ${layer.name} (${layer.stateCount} states)`);
        }
        logSuccess('Animator info retrieved');
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\nTip: Provide an asset path (.controller) or a scene GameObject path with an Animator component.`
            );
          }
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
