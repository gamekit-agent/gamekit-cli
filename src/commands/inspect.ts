import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface PropertyInfo {
  name: string;
  displayName: string;
  type: string;
  value: unknown;
  path: string;
}

interface ComponentInfo {
  type: string;
  enabled: boolean;
  properties: PropertyInfo[] | null;
}

interface InspectResult {
  name: string;
  path: string;
  tag: string;
  layer: string;
  activeSelf: boolean;
  activeInHierarchy: boolean;
  isStatic: boolean;
  components: ComponentInfo[];
}

export function registerInspectCommand(program: Command): void {
  program
    .command('inspect <path>')
    .description('Inspect a GameObject and its component properties')
    .option('--component <type>', 'Filter to a specific component type')
    .action(async (path: string, opts: { component?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        const params: string[] = [`path=${encodeURIComponent(path)}`];
        if (opts.component) {
          params.push(`component=${encodeURIComponent(opts.component)}`);
        }

        const query = '?' + params.join('&');
        const result = await request<InspectResult>(info.port, 'GET', '/inspect' + query);
        outputSuccess(result, globalOpts);

        // Human-readable output to stderr
        const activeStr = result.activeSelf ? '' : ' (inactive)';
        const staticStr = result.isStatic ? ' [static]' : '';
        log(`${result.name}${activeStr}${staticStr}`);
        log(`  path: ${result.path}`);
        log(`  tag: ${result.tag}  layer: ${result.layer}`);
        log('');

        for (const comp of result.components) {
          if (comp.type === 'Missing (MonoScript)') {
            log(`  [Missing (MonoScript)] -- script file not found`);
            log('');
            continue;
          }

          const enabledStr = comp.enabled ? '' : ' (disabled)';
          log(`  [${comp.type}]${enabledStr}`);

          if (comp.properties && comp.properties.length > 0) {
            for (const prop of comp.properties) {
              log(`    ${prop.displayName}: ${formatValue(prop.value)}`);
            }
          }

          log('');
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          if (error.code === 'NOT_FOUND') {
            outputError(
              error.code,
              `${error.message}\n\nTip: Use 'gamekit hierarchy' to find the correct path.`
            );
          } else if (error.code === 'MISSING_PATH') {
            outputError(
              error.code,
              `${error.message}\n\nUsage: gamekit inspect <path> [--component <type>]`
            );
          } else {
            outputError(error.code, error.message);
          }
        }
        throw error;
      }
    });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
