#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init.js';
import { runDoctor } from './commands/doctor.js';
import { refresh } from './commands/refresh.js';
import { runScript } from './commands/run-script.js';
import { consoleCommand } from './commands/console.js';
import { registerPlayCommand } from './commands/play.js';
import { registerScreenshotCommand } from './commands/screenshot.js';
import { registerSceneCommand } from './commands/scene.js';
import { registerHierarchyCommand } from './commands/hierarchy.js';
import { registerInspectCommand } from './commands/inspect.js';
import { registerCreateCommand } from './commands/create.js';
import { registerDestroyCommand } from './commands/destroy.js';
import { registerTransformCommand } from './commands/transform.js';
import { registerAddComponentCommand } from './commands/add-component.js';
import { registerSetCommand } from './commands/set.js';
import { registerListCommand } from './commands/list.js';
import { registerSettingsCommand } from './commands/settings.js';
import { registerBuildCommand } from './commands/build.js';
import { registerTestCommand } from './commands/test.js';
import { registerPrefabCommand } from './commands/prefab.js';
import { registerMaterialCommand } from './commands/material.js';
import { registerAnimatorCommand } from './commands/animator.js';
import { maybeCheckForUpdates, getCurrentVersion, checkForAppliedUpdate } from './utils/updater.js';
import { GameKitError } from './utils/connection.js';
import { outputError } from './utils/output.js';

// Check if an update was applied in the background
const updatedVersion = checkForAppliedUpdate();
if (updatedVersion) {
  console.log(chalk.green(`✓ Updated to gamekit v${updatedVersion}\n`));
}

// Check for updates in background (non-blocking)
maybeCheckForUpdates();

const program = new Command();

program
  .name('gamekit')
  .description('AI-powered Unity game development with Claude')
  .option('--json', 'Output raw JSON (default when stdout is piped)');

// Version command
program
  .command('version')
  .description('Show the current version')
  .action(() => {
    console.log(getCurrentVersion());
  });

// Main command - interactive wizard
program
  .command('init')
  .description('Set up a Unity project for AI-powered game development')
  .action(init);

// Doctor - diagnose issues
program
  .command('doctor')
  .description('Diagnose setup issues and check configuration')
  .action(runDoctor);

// Refresh - trigger Unity recompilation
program
  .command('refresh')
  .description('Trigger Unity recompilation and return results')
  .action(async () => {
    try {
      await refresh(program.opts());
    } catch (error) {
      if (error instanceof GameKitError) {
        outputError(error.code, error.message);
      }
      throw error;
    }
  });

// Run Script - execute arbitrary C# in Unity Editor
program
  .command('run-script <code>')
  .description('Execute C# code in the Unity Editor (last expression value becomes result; do not use return)')
  .action(async (code: string) => {
    try {
      await runScript(code, program.opts());
    } catch (error) {
      if (error instanceof GameKitError) {
        outputError(error.code, error.message);
      }
      throw error;
    }
  });

// Console - read Unity console logs
program
  .command('console')
  .description('Read Unity console logs')
  .option('--errors', 'Show only errors')
  .option('--warnings', 'Show only warnings')
  .option('--info', 'Show only info messages')
  .option('--follow', 'Stream logs in real-time')
  .option('--limit <n>', 'Limit number of entries returned')
  .action(async (cmdOptions) => {
    try {
      await consoleCommand({ ...program.opts(), ...cmdOptions });
    } catch (error) {
      if (error instanceof GameKitError) {
        outputError(error.code, error.message);
      }
      throw error;
    }
  });

// Play - control Unity play mode
registerPlayCommand(program);

// Screenshot - capture screenshots from Unity
registerScreenshotCommand(program);

// Scene - manage Unity scenes
registerSceneCommand(program);

// Hierarchy - inspect scene hierarchy
registerHierarchyCommand(program);

// Inspect - inspect GameObject properties
registerInspectCommand(program);

// Create - create GameObjects in the scene
registerCreateCommand(program);

// Destroy - remove GameObjects from the scene
registerDestroyCommand(program);

// Transform - set position, rotation, scale on GameObjects
registerTransformCommand(program);

// Add Component - add components to GameObjects
registerAddComponentCommand(program);

// Set - set property values on components
registerSetCommand(program);

// List - list project assets (scripts, scenes, prefabs)
registerListCommand(program);

// Settings - show project settings
registerSettingsCommand(program);

// Build - trigger Unity player build
registerBuildCommand(program);

// Test - run Unity Test Framework tests
registerTestCommand(program);

// Material - create, set properties, and assign materials
registerMaterialCommand(program);

// Prefab - create, instantiate, and query prefab assets
registerPrefabCommand(program);

// Animator - query Animator controllers
registerAnimatorCommand(program);

// Show error for unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.error(`Run ${chalk.cyan('gamekit --help')} to see available commands.`);
  console.error(`Run ${chalk.cyan('gamekit init')} to initialize a new project or add gamekit to an existing one.`);
  process.exit(1);
});

// Default to init if no command specified
if (process.argv.length === 2) {
  init();
} else {
  program.parse();
}
