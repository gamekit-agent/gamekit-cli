import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  findUnityInstalls,
  createUnityProject,
  openUnityProject,
  isUnityProject,
  UnityInstall
} from '../utils/unity.js';
import { copyTemplateAsync } from '../utils/template.js';
import { createEditorScripts } from '../utils/assets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Validate project name to prevent path traversal
 */
export function isValidProjectName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Get the path to the GameKit Unity plugin source directory.
 * Resolves relative to this file, matching how template.ts locates the template.
 */
function getPluginSourcePath(): string {
  // From src/commands/ -> ../../template/Editor/GameKit
  const localPath = path.resolve(__dirname, '..', '..', 'template', 'Editor', 'GameKit');
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Fallback: from dist/commands/ -> ../../template/Editor/GameKit
  const distPath = path.resolve(__dirname, '..', '..', '..', 'template', 'Editor', 'GameKit');
  if (fs.existsSync(distPath)) {
    return distPath;
  }

  throw new Error('GameKit plugin source not found. Check your gamekit installation.');
}

/**
 * Copy the GameKit Unity plugin into the project's Assets/Editor/GameKit/ directory.
 * Uses fs.cpSync for recursive copy (available in Node.js 16+ / Bun).
 */
export function copyGameKitPlugin(projectPath: string): void {
  const src = getPluginSourcePath();
  const dest = path.join(projectPath, 'Assets', 'Editor', 'GameKit');
  fs.cpSync(src, dest, { recursive: true });
}

/**
 * Ensure .gamekit/ is in the project's .gitignore.
 * Creates .gitignore if it doesn't exist.
 */
export function addGameKitToGitignore(projectPath: string): void {
  const gitignorePath = path.join(projectPath, '.gitignore');
  let content = '';

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  if (!content.includes('.gamekit/')) {
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(gitignorePath, content + separator + '.gamekit/\n');
  }
}

/**
 * Ensure required Unity packages are present in Packages/manifest.json.
 * Adds com.unity.nuget.newtonsoft-json if missing (needed by GameKit C# code).
 */
export function ensureRequiredPackages(projectPath: string): void {
  const manifestPath = path.join(projectPath, 'Packages', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (!manifest.dependencies) return;

  let modified = false;

  if (!manifest.dependencies['com.unity.nuget.newtonsoft-json']) {
    manifest.dependencies['com.unity.nuget.newtonsoft-json'] = '3.2.1';
    modified = true;
  }

  if (!manifest.dependencies['com.unity.test-framework']) {
    manifest.dependencies['com.unity.test-framework'] = '1.4.5';
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
}

/**
 * Initialize an existing Unity project with Claude Code support
 */
async function initExistingProject(projectPath: string): Promise<void> {
  console.log(chalk.blue(`
╔════════════════════════════════════════╗
║    gamekit - Initialize Project        ║
║   Adding Claude Code to your project   ║
╚════════════════════════════════════════╝
`));

  console.log(chalk.green('Found existing Unity project\n'));

  // Find Unity installations (used for validation only)
  const installs = findUnityInstalls();

  if (installs.length === 0) {
    console.log(chalk.red('No Unity installations found.\n'));
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

  // Step 2: Install GameKit Unity plugin
  spinner.start('Installing GameKit Unity plugin...');
  try {
    copyGameKitPlugin(projectPath);
    spinner.succeed('GameKit plugin installed');
  } catch (error) {
    spinner.fail('Failed to install GameKit plugin');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 3: Ensure required Unity packages
  spinner.start('Checking Unity package dependencies...');
  try {
    ensureRequiredPackages(projectPath);
    spinner.succeed('Package dependencies verified');
  } catch (error) {
    spinner.fail('Failed to verify package dependencies');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 4: Configure project (add .gamekit/ to .gitignore)
  spinner.start('Configuring project...');
  try {
    addGameKitToGitignore(projectPath);
    spinner.succeed('Project configured');
  } catch (error) {
    spinner.fail('Failed to configure project');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  console.log(chalk.green(`
╔════════════════════════════════════════╗
║       Project Initialized!             ║
╚════════════════════════════════════════╝
`));
  console.log(chalk.blue('Next steps:\n'));
  console.log(chalk.white(`  1. ${chalk.cyan('Open Unity')}`));
  console.log(chalk.gray('     To start the GameKit plugin\n'));
  console.log(chalk.white(`  2. ${chalk.cyan('claude')}`));
  console.log(chalk.gray('     Start building with AI!\n'));

  console.log(chalk.gray('\u2500'.repeat(44)));
  console.log(chalk.gray('\nTip: Use /new-game to start building!'));
  console.log(chalk.gray('Example: /new-game space shooter where you dodge asteroids\n'));
}

/**
 * Create a new Unity project with Claude Code support
 */
async function createNewProject(): Promise<void> {
  console.log(chalk.blue(`
╔════════════════════════════════════════╗
║       gamekit - Create Game            ║
║   AI-powered Unity game development    ║
╚════════════════════════════════════════╝
`));

  // Step 1: Find Unity installations
  console.log(chalk.gray('Finding Unity installations...\n'));
  const installs = findUnityInstalls();

  if (installs.length === 0) {
    console.log(chalk.red('No Unity installations found.\n'));
    console.log(chalk.gray('Unity Hub installs Unity to:'));
    console.log(chalk.gray('  Mac: /Applications/Unity/Hub/Editor/'));
    console.log(chalk.gray('  Windows: C:\\Program Files\\Unity\\Hub\\Editor\\\n'));
    console.log(chalk.gray('Please install Unity via Unity Hub and try again.\n'));
    process.exit(1);
  }

  console.log(chalk.green(`Found ${installs.length} Unity installation${installs.length > 1 ? 's' : ''}\n`));

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

  console.log(chalk.blue(`\nCreating "${projectName}"...\n`));

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

  // Step 5: Install GameKit Unity plugin
  spinner.start('Installing GameKit Unity plugin...');
  try {
    copyGameKitPlugin(projectPath);
    spinner.succeed('GameKit plugin installed');
  } catch (error) {
    spinner.fail('Failed to install GameKit plugin');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 6: Ensure required Unity packages
  spinner.start('Checking Unity package dependencies...');
  try {
    ensureRequiredPackages(projectPath);
    spinner.succeed('Package dependencies verified');
  } catch (error) {
    spinner.fail('Failed to verify package dependencies');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 7: Configure project (add .gamekit/ to .gitignore)
  spinner.start('Configuring project...');
  try {
    addGameKitToGitignore(projectPath);
    spinner.succeed('Project configured');
  } catch (error) {
    spinner.fail('Failed to configure project');
    if (error instanceof Error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Step 8: Open Unity
  spinner.start('Opening Unity...');
  try {
    openUnityProject(selectedInstall.path, projectPath);
    spinner.succeed('Unity is opening');
  } catch (error) {
    spinner.warn('Could not open Unity automatically');
    console.log(chalk.gray('  Please open the project manually in Unity Hub.\n'));
  }

  // Success!
  console.log(chalk.green(`
╔════════════════════════════════════════╗
║         Project Created!               ║
╚════════════════════════════════════════╝
`));

  const cdCmd = `cd ${projectName}`;

  console.log(chalk.blue('Next steps:\n'));
  console.log(chalk.white(`  1. ${chalk.cyan(cdCmd)}`));
  console.log(chalk.gray('     Navigate to your project\n'));
  console.log(chalk.white(`  2. ${chalk.cyan('Wait for Unity to finish loading')}`));
  console.log(chalk.gray('     The GameKit plugin starts automatically\n'));
  console.log(chalk.white(`  3. ${chalk.cyan('claude')}`));
  console.log(chalk.gray('     Start building with AI!\n'));

  console.log(chalk.gray('\u2500'.repeat(44)));
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
