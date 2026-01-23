import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the path to the .claude commands template
 */
export function getCommandsTemplatePath(): string {
  // Get the directory of this module
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Navigate up from src/utils to find template/.claude
  // In development: ../../template/.claude
  // In dist: ../../template/.claude (same relative path)
  const templatePath = path.resolve(__dirname, '..', '..', 'template', '.claude');

  if (fs.existsSync(templatePath)) {
    return templatePath;
  }

  // Fallback: try from dist folder
  const distTemplatePath = path.resolve(__dirname, '..', '..', '..', 'template', '.claude');
  if (fs.existsSync(distTemplatePath)) {
    return distTemplatePath;
  }

  throw new Error(`Commands template not found at ${templatePath}`);
}

/**
 * Recursively copy a directory, skipping symlinks for security
 */
function copyDirectorySync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip symlinks for security
    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy Claude commands (.claude folder) to a project directory
 *
 * @param projectPath - Path to the project directory
 */
export function copyCommands(projectPath: string): void {
  const templatePath = getCommandsTemplatePath();
  const destPath = path.join(projectPath, '.claude');

  copyDirectorySync(templatePath, destPath);
}

/**
 * Check if a project already has Claude commands installed
 *
 * @param projectPath - Path to the project directory
 * @returns true if .claude/CLAUDE.md exists
 */
export function hasClaudeCommands(projectPath: string): boolean {
  const claudeMdPath = path.join(projectPath, '.claude', 'CLAUDE.md');
  return fs.existsSync(claudeMdPath);
}
