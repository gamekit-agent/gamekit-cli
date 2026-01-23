import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import {
  findUnityInstalls,
  createUnityProject,
  openUnityProject,
  getMcpPackageUrl,
  isUnityProject,
  UnityInstall
} from '../utils/unity.js';
import { copyTemplateAsync } from '../utils/template.js';
import { addMcpToManifest } from '../utils/manifest.js';
import { generateMcpConfig, waitForMcpRelay, mcpRelayExists } from '../utils/mcp.js';
import { createEditorScripts } from '../utils/assets.js';

/**
 * Validate project name to prevent path traversal
 */
export function isValidProjectName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Initialize an existing Unity project with Claude Code support
 */
async function initExistingProject(projectPath: string): Promise<void> {
  console.log(chalk.blue(`
╔════════════════════════════════════════╗
║    🎮 gamekit - Initialize Project     ║
║   Adding Claude Code to your project   ║
╚════════════════════════════════════════╝
`));

  console.log(chalk.green(`✓ Found existing Unity project\n`));

  // Find Unity installations to get version choices
  const installs = findUnityInstalls();

  if (installs.length === 0) {
    console.log(chalk.red('❌ No Unity installations found.\n'));
    console.log(chalk.gray('Unity Hub installs Unity to:'));
    console.log(chalk.gray('  Mac: /Applications/Unity/Hub/Editor/'));
    console.log(chalk.gray('  Windows: C:\\Program Files\\Unity\\Hub\\Editor\\\n'));
    console.log(chalk.gray('Please install Unity via Unity Hub and try again.\n'));
    process.exit(1);
  }

  // Check for existing .claude directory
  const claudeDir = path.join(projectPath, '.claude');
  let shouldOverwrite = true;

  if (fs.existsSync(claudeDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Found existing .claude directory. Overwrite?',
        default: false
      }
    ]);
    shouldOverwrite = overwrite;
    if (!shouldOverwrite) {
      console.log(chalk.yellow('\nSkipping Claude commands installation.\n'));
    }
  }

  // Ask for Unity version
  const { unityVersion } = await inquirer.prompt([
    {
      type: 'list',
      name: 'unityVersion',
      message: 'Which Unity version is this project using?',
      choices: installs.map((install: UnityInstall) => ({
        name: `${install.version}${install.isUnity6 ? chalk.green(' (Unity 6 - recommended)') : ''}`,
        value: install.version
      }))
    }
  ]);

  const spinner = ora();

  // Step 1: Copy template files (if not skipped)
  if (shouldOverwrite) {
    spinner.start('Installing Claude commands, skills, and agents...');
    try {
      await copyTemplateAsync(projectPath);
      createEditorScripts(projectPath);
      spinner.succeed('Claude commands installed');
    } catch (error) {
      spinner.fail('Failed to install Claude commands');
      if (error instanceof Error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  }

  // Step 2: Add MCP package to manifest.json
  spinner.start('Adding MCP package to project...');
  try {
    const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const mcpUrl = getMcpPackageUrl(unityVersion);
      if (mcpUrl) {
        addMcpToManifest(manifestPath, unityVersion);
        spinner.succeed('MCP package added');
      } else {
        spinner.warn('MCP package not added (Unity version not supported)');
        console.log(chalk.yellow('   Unity 2019 and older are not supported for MCP integration.\n'));
      }
    } else {
      spinner.warn('manifest.json not found');
    }
  } catch (error) {
    spinner.fail('Failed to add MCP package');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 3: Generate .mcp.json
  spinner.start('Configuring MCP for Claude Code...');
  try {
    generateMcpConfig(projectPath);
    spinner.succeed('MCP configured');
  } catch (error) {
    spinner.fail('Failed to configure MCP');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Check if MCP relay already exists (user may have used this before)
  if (mcpRelayExists()) {
    console.log(chalk.green(`
╔════════════════════════════════════════╗
║       ✓ Project Initialized!           ║
╚════════════════════════════════════════╝
`));
    console.log(chalk.blue('Ready to go!\n'));
    console.log(chalk.white(`  1. ${chalk.cyan('Restart Unity')}`));
    console.log(chalk.gray('     To load the new MCP package\n'));
    console.log(chalk.white(`  2. ${chalk.cyan('claude')}`));
    console.log(chalk.gray('     Start building with AI!\n'));
  } else {
    console.log(chalk.green(`
╔════════════════════════════════════════╗
║       ✓ Project Initialized!           ║
╚════════════════════════════════════════╝
`));
    console.log(chalk.blue('Next steps:\n'));
    console.log(chalk.white(`  1. ${chalk.cyan('Restart Unity')}`));
    console.log(chalk.gray('     To load the new MCP package\n'));
    console.log(chalk.white(`  2. ${chalk.cyan('claude')}`));
    console.log(chalk.gray('     Start building with AI!\n'));
  }

  console.log(chalk.gray('─'.repeat(44)));
  console.log(chalk.gray('\nTip: Use /new-game to start building!'));
  console.log(chalk.gray('Example: /new-game space shooter where you dodge asteroids\n'));
}

/**
 * Create a new Unity project with Claude Code support
 */
async function createNewProject(): Promise<void> {
  console.log(chalk.blue(`
╔════════════════════════════════════════╗
║       🎮 gamekit - Create Game         ║
║   AI-powered Unity game development    ║
╚════════════════════════════════════════╝
`));

  // Step 1: Find Unity installations
  console.log(chalk.gray('Finding Unity installations...\n'));
  const installs = findUnityInstalls();

  if (installs.length === 0) {
    console.log(chalk.red('❌ No Unity installations found.\n'));
    console.log(chalk.gray('Unity Hub installs Unity to:'));
    console.log(chalk.gray('  Mac: /Applications/Unity/Hub/Editor/'));
    console.log(chalk.gray('  Windows: C:\\Program Files\\Unity\\Hub\\Editor\\\n'));
    console.log(chalk.gray('Please install Unity via Unity Hub and try again.\n'));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Found ${installs.length} Unity installation${installs.length > 1 ? 's' : ''}\n`));

  // Step 2: Get project details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What\'s your game called?',
      validate: (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return 'Project name is required';
        if (!isValidProjectName(trimmed)) {
          return 'Use only letters, numbers, hyphens, and underscores';
        }
        if (fs.existsSync(path.resolve(trimmed))) {
          return `Folder "${trimmed}" already exists`;
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'unityVersion',
      message: 'Select Unity version:',
      choices: installs.map((install: UnityInstall) => ({
        name: `${install.version}${install.isUnity6 ? chalk.green(' (Unity 6 - recommended)') : ''}`,
        value: install.version
      }))
    }
  ]);

  const projectName = answers.projectName.trim();
  const projectPath = path.resolve(projectName);
  const selectedInstall = installs.find((i: UnityInstall) => i.version === answers.unityVersion)!;

  console.log(chalk.blue(`\n📁 Creating "${projectName}"...\n`));

  // Step 3: Create Unity project
  const spinner = ora('Creating Unity project (this may take a minute)...').start();

  try {
    await createUnityProject(selectedInstall.path, projectPath);
    spinner.succeed('Unity project created');
  } catch (error) {
    spinner.fail('Failed to create Unity project');
    if (error instanceof Error) {
      console.log(chalk.red(`\nError: ${error.message}`));
      console.log(chalk.gray('\nMake sure Unity is installed correctly and try again.\n'));
    }
    process.exit(1);
  }

  // Step 4: Copy template files and create editor scripts
  spinner.start('Installing Claude commands, skills, and agents...');
  try {
    await copyTemplateAsync(projectPath);
    createEditorScripts(projectPath);
    spinner.succeed('Claude commands installed');
  } catch (error) {
    spinner.fail('Failed to install Claude commands');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 5: Add MCP package to Unity's manifest.json
  spinner.start('Adding MCP package to project...');
  try {
    const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const mcpUrl = getMcpPackageUrl(answers.unityVersion);
      if (mcpUrl) {
        addMcpToManifest(manifestPath, answers.unityVersion);
        spinner.succeed('MCP package added');
      } else {
        spinner.warn('MCP package not added (Unity version not supported)');
        console.log(chalk.yellow('   Unity 2019 and older are not supported for MCP integration.\n'));
      }
    } else {
      spinner.warn('manifest.json not found');
    }
  } catch (error) {
    spinner.fail('Failed to add MCP package');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 6: Generate .mcp.json
  spinner.start('Configuring MCP for Claude Code...');
  try {
    generateMcpConfig(projectPath);
    spinner.succeed('MCP configured');
  } catch (error) {
    spinner.fail('Failed to configure MCP');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 7: Open Unity
  spinner.start('Opening Unity...');
  try {
    openUnityProject(selectedInstall.path, projectPath);
    spinner.succeed('Unity is opening');
  } catch (error) {
    spinner.warn('Could not open Unity automatically');
    console.log(chalk.gray('  Please open the project manually in Unity Hub.\n'));
  }

  // Step 8: Wait for MCP relay to be installed
  console.log(chalk.gray('\n  Unity is installing packages. This usually takes 1-2 minutes.\n'));
  const mcpReady = await waitForMcpRelay({ timeoutMs: 5 * 60 * 1000 });

  // Success!
  console.log(chalk.green(`
╔════════════════════════════════════════╗
║         ✓ Project Created!             ║
╚════════════════════════════════════════╝
`));

  const cdCmd = `cd ${projectName}`;

  if (mcpReady) {
    console.log(chalk.blue('Next steps:\n'));
    console.log(chalk.white(`  1. ${chalk.cyan(cdCmd)}`));
    console.log(chalk.gray('     Navigate to your project\n'));
    console.log(chalk.white(`  2. ${chalk.green('✓')} ${chalk.cyan('Wait for Unity to finish loading')}`));
    console.log(chalk.gray('     Packages installed automatically\n'));
    console.log(chalk.white(`  3. ${chalk.cyan('claude')}`));
    console.log(chalk.gray('     Start building with AI!\n'));
  } else {
    console.log(chalk.blue('Next steps:\n'));
    console.log(chalk.white(`  1. ${chalk.cyan(cdCmd)}`));
    console.log(chalk.gray('     Navigate to your project\n'));
    console.log(chalk.white(`  2. ${chalk.cyan('Wait for Unity to finish loading')}`));
    console.log(chalk.gray('     Packages will install automatically (~1-2 min)\n'));
    console.log(chalk.white(`  3. ${chalk.cyan('claude')}`));
    console.log(chalk.gray('     Start building with AI!\n'));
  }

  console.log(chalk.gray('─'.repeat(44)));
  console.log(chalk.gray('\nTip: Use /new-game to start building!'));
  console.log(chalk.gray('Example: /new-game space shooter where you dodge asteroids\n'));
}

/**
 * Main interactive wizard for setting up a game project
 * Detects if running in an existing Unity project and handles accordingly
 */
export async function init(): Promise<void> {
  const cwd = process.cwd();

  // Check if we're in an existing Unity project
  if (isUnityProject(cwd)) {
    await initExistingProject(cwd);
  } else {
    await createNewProject();
  }
}
