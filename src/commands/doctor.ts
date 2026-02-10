import chalk from 'chalk';
import * as fs from 'fs';
import { readServerInfo, healthCheck, GameKitError } from '../utils/connection.js';
import { hasClaudeCommands } from '../utils/commands.js';
import { findUnityInstalls } from '../utils/unity.js';

export interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  fix?: string;
}

export async function runDoctor(): Promise<void> {
  console.log(chalk.blue('\nDiagnosing gamekit setup...\n'));

  const syncChecks = [
    checkUnityInstalled(),
    checkUnityProject(),
    checkClaudeCommands(),
    checkPluginInstalled(),
  ];

  const asyncChecks = [
    await checkPluginConnection(),
  ];

  const checks = [...syncChecks, ...asyncChecks];

  let allPassed = true;
  let hasWarnings = false;

  for (const check of checks) {
    if (check.passed) {
      console.log(chalk.green(`  ${check.name}`));
      if (check.message) {
        console.log(chalk.gray(`  ${check.message}`));
      }
    } else if (check.fix) {
      console.log(chalk.red(`  ${check.name}`));
      console.log(chalk.gray(`  Fix: ${check.fix}`));
      allPassed = false;
    } else {
      console.log(chalk.yellow(`! ${check.name}`));
      if (check.message) {
        console.log(chalk.gray(`  ${check.message}`));
      }
      hasWarnings = true;
    }
  }

  console.log('');

  if (allPassed && !hasWarnings) {
    console.log(chalk.green('All checks passed! Ready to build games.\n'));
    console.log(chalk.gray('Run "claude" in this directory to start coding.\n'));
  } else if (allPassed && hasWarnings) {
    console.log(chalk.yellow('Setup looks good with minor warnings.\n'));
    console.log(chalk.gray('Run "claude" in this directory to start coding.\n'));
  } else {
    console.log(chalk.yellow('Some issues found. See above for fixes.\n'));
  }
}

export function checkUnityInstalled(): CheckResult {
  const installs = findUnityInstalls();
  if (installs.length === 0) {
    return {
      name: 'Unity installed',
      passed: false,
      fix: 'Install Unity via Unity Hub from https://unity.com/download'
    };
  }
  const versions = installs.map(i => i.version).join(', ');
  return {
    name: 'Unity installed',
    passed: true,
    message: `Found: ${versions}`
  };
}

function checkUnityProject(): CheckResult {
  const isUnityProject = fs.existsSync('Assets') && fs.existsSync('Packages');
  return {
    name: 'Unity project',
    passed: isUnityProject,
    fix: isUnityProject ? undefined : 'Run from inside a Unity project, or run: gamekit init'
  };
}

function checkClaudeCommands(): CheckResult {
  const hasCommands = hasClaudeCommands(process.cwd());
  return {
    name: 'Claude commands installed',
    passed: hasCommands,
    fix: hasCommands ? undefined : 'Run: gamekit init'
  };
}

export function checkPluginInstalled(): CheckResult {
  const pluginExists = fs.existsSync('Assets/Editor/GameKit/GameKitServer.cs');
  return {
    name: 'GameKit plugin installed',
    passed: pluginExists,
    fix: pluginExists ? undefined : 'Run: gamekit init'
  };
}

export async function checkPluginConnection(): Promise<CheckResult> {
  try {
    const info = readServerInfo(process.cwd());
    const healthy = await healthCheck(info.port);

    if (healthy) {
      return {
        name: 'Unity plugin connected',
        passed: true,
        message: `Port ${info.port}, Unity ${info.unityVersion}`
      };
    }

    return {
      name: 'Unity plugin connected',
      passed: false,
      fix: 'Plugin not responding, try restarting Unity'
    };
  } catch (error) {
    if (error instanceof GameKitError) {
      if (error.code === 'UNITY_NOT_RUNNING') {
        return {
          name: 'Unity plugin connected',
          passed: false,
          // No fix -- this is a warning since Unity just needs to be open
          message: 'Open your project in Unity to start the plugin'
        };
      }
    }

    return {
      name: 'Unity plugin connected',
      passed: false,
      message: 'Unity is not running'
    };
  }
}
