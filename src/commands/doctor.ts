import chalk from 'chalk';
import * as fs from 'fs';
import { hasMcpConfig, mcpRelayExists } from '../utils/mcp.js';
import { hasClaudeCommands } from '../utils/commands.js';
import { findUnityInstalls } from '../utils/unity.js';

export interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  fix?: string;
}

export async function runDoctor(): Promise<void> {
  console.log(chalk.blue('\n🔍 Diagnosing gamekit setup...\n'));

  const checks = [
    checkUnityInstalled(),
    checkUnityProject(),
    checkClaudeCommands(),
    checkMcpConfig(),
    checkMcpRelay(),
  ];

  let allPassed = true;
  let hasWarnings = false;

  for (const check of checks) {
    if (check.passed) {
      console.log(chalk.green(`✓ ${check.name}`));
      if (check.message) {
        console.log(chalk.gray(`  ${check.message}`));
      }
    } else if (check.fix) {
      console.log(chalk.red(`✗ ${check.name}`));
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
    console.log(chalk.green('✓ All checks passed! Ready to build games.\n'));
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

function checkMcpConfig(): CheckResult {
  const hasConfig = hasMcpConfig(process.cwd());
  return {
    name: 'MCP configured (.mcp.json)',
    passed: hasConfig,
    fix: hasConfig ? undefined : 'Run: gamekit init'
  };
}

function checkMcpRelay(): CheckResult {
  const relayExists = mcpRelayExists();
  if (relayExists) {
    return {
      name: 'MCP relay installed',
      passed: true
    };
  }
  return {
    name: 'MCP relay installed',
    passed: false,
    // No fix - this is a warning since it installs when Unity opens
    message: 'Opens Unity to install packages (relay installs automatically)'
  };
}
