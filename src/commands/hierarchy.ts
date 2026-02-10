import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface HierarchyNode {
  name: string;
  path: string;
  activeSelf: boolean;
  activeInHierarchy: boolean;
  components: string[];
  children: HierarchyNode[];
}

interface HierarchyResult {
  scene: string;
  scenePath: string;
  rootCount: number;
  hierarchy: HierarchyNode[];
}

export function registerHierarchyCommand(program: Command): void {
  program
    .command('hierarchy')
    .description('Show the scene hierarchy')
    .option('--name <filter>', 'Filter by GameObject name')
    .option('--component <type>', 'Filter by component type')
    .option('--depth <n>', 'Limit tree depth')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        const params: string[] = [];
        if (opts.name) params.push(`name=${encodeURIComponent(opts.name)}`);
        if (opts.component) params.push(`component=${encodeURIComponent(opts.component)}`);
        if (opts.depth) params.push(`depth=${encodeURIComponent(opts.depth)}`);

        const query = params.length > 0 ? '?' + params.join('&') : '';
        const result = await request<HierarchyResult>(info.port, 'GET', '/hierarchy' + query);
        outputSuccess(result, globalOpts);

        log(`Scene: ${result.scene} (${result.rootCount} root objects)`);
        for (const node of result.hierarchy) {
          printNode(node, 0);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}

function printNode(node: HierarchyNode, depth: number): void {
  const indent = '  '.repeat(depth);
  const inactive = !node.activeSelf ? '(inactive) ' : '';
  const components = node.components.filter(c => c !== 'Transform' && c !== 'RectTransform');
  const componentStr = components.length > 0 ? ` [${components.join(', ')}]` : '';
  log(`${indent}${inactive}${node.name}${componentStr}`);

  for (const child of node.children) {
    printNode(child, depth + 1);
  }
}
