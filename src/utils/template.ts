import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as os from 'os';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { getCurrentVersion, compareVersions } from './updater.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub repo for downloading template
const GITHUB_REPO = 'gamekit-agent/gamekit-cli';
const TEMPLATE_BRANCH = 'main';

/**
 * Get the path to the cached template directory
 */
function getCachedTemplatePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.gamekit', 'template');
}

/**
 * Get the path to the template directory (local dev or cached)
 */
export function getTemplatePath(): string {
  // First, try local development path
  const localPath = path.join(__dirname, '..', '..', 'template');
  if (fs.existsSync(localPath) && fs.existsSync(path.join(localPath, '.claude'))) {
    return localPath;
  }

  // Check for cached template
  const cachedPath = getCachedTemplatePath();
  if (fs.existsSync(cachedPath) && fs.existsSync(path.join(cachedPath, '.claude'))) {
    return cachedPath;
  }

  throw new Error(
    `Template not found. Run 'gamekit install-commands' first or check your installation.`
  );
}

/**
 * Download file from URL
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'gamekit' }
    };

    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

/**
 * Download and cache the template from GitHub
 */
export async function downloadTemplate(): Promise<string> {
  const cachedPath = getCachedTemplatePath();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-template-'));
  const tarballPath = path.join(tempDir, 'template.tar.gz');

  try {
    // Download tarball from GitHub
    const tarballUrl = `https://github.com/${GITHUB_REPO}/archive/refs/heads/${TEMPLATE_BRANCH}.tar.gz`;
    console.log('Downloading template from GitHub...');
    await downloadFile(tarballUrl, tarballPath);

    // Extract tarball
    execSync(`tar -xzf "${tarballPath}" -C "${tempDir}"`, { stdio: 'ignore' });

    // Find the extracted directory (it will be named like repo-branch)
    const extractedDir = fs.readdirSync(tempDir).find(f =>
      f.startsWith('gamekit-cli-') && fs.statSync(path.join(tempDir, f)).isDirectory()
    );

    if (!extractedDir) {
      throw new Error('Failed to find extracted template directory');
    }

    const templateSrc = path.join(tempDir, extractedDir, 'template');

    if (!fs.existsSync(templateSrc)) {
      throw new Error('Template directory not found in downloaded archive');
    }

    // Remove old cached template if exists
    if (fs.existsSync(cachedPath)) {
      fs.rmSync(cachedPath, { recursive: true, force: true });
    }

    // Copy to cache location
    fs.mkdirSync(path.dirname(cachedPath), { recursive: true });
    copyDirectorySync(templateSrc, cachedPath);

    console.log('Template cached successfully.');
    return cachedPath;
  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Ensure template is available (download if needed)
 */
export async function ensureTemplate(): Promise<string> {
  try {
    return getTemplatePath();
  } catch {
    // Template not found, download it
    return await downloadTemplate();
  }
}

/**
 * Copy the Unity project template to a destination directory
 */
export function copyTemplate(destPath: string): void {
  const templatePath = getTemplatePath();
  copyDirectorySync(templatePath, destPath);
}

/**
 * Copy the Unity project template to a destination directory (async, downloads if needed)
 * Also writes a version file and hashes to track which CLI version installed the commands
 */
export async function copyTemplateAsync(destPath: string): Promise<void> {
  const templatePath = await ensureTemplate();
  copyDirectorySync(templatePath, destPath);
  writeCommandsVersion(destPath);
  writeHashes(destPath);
}

/**
 * Recursively copy a directory
 */
function copyDirectorySync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
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
 * Write the commands version file to track which CLI version installed them
 */
export function writeCommandsVersion(projectPath: string): void {
  const versionPath = path.join(projectPath, '.claude', '.version');
  fs.writeFileSync(versionPath, getCurrentVersion());
}

/**
 * Get the installed commands version for a project
 * Returns null if no version file exists
 */
export function getCommandsVersion(projectPath: string): string | null {
  const versionPath = path.join(projectPath, '.claude', '.version');
  try {
    if (fs.existsSync(versionPath)) {
      return fs.readFileSync(versionPath, 'utf-8').trim();
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Check if commands are outdated in a project
 * Returns true if CLI version > installed commands version
 */
export function areCommandsOutdated(projectPath: string): boolean {
  const claudeDir = path.join(projectPath, '.claude');
  if (!fs.existsSync(claudeDir)) {
    return false; // No commands installed
  }

  const installedVersion = getCommandsVersion(projectPath);
  if (!installedVersion) {
    return true; // No version file = old installation, probably outdated
  }

  const currentVersion = getCurrentVersion();
  return compareVersions(currentVersion, installedVersion) > 0;
}

/**
 * Calculate SHA256 hash of a file
 */
export function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get all files in a directory recursively (relative paths)
 */
export function getFilesRecursive(dir: string, baseDir?: string): string[] {
  const base = baseDir || dir;
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(base, fullPath);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...getFilesRecursive(fullPath, base));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Generate hashes for all files in the .claude directory
 */
export function generateHashes(claudeDir: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  const files = getFilesRecursive(claudeDir);

  for (const file of files) {
    // Skip the hashes file itself and version file
    if (file === '.hashes.json' || file === '.version') {
      continue;
    }
    const fullPath = path.join(claudeDir, file);
    hashes[file] = hashFile(fullPath);
  }

  return hashes;
}

/**
 * Write hashes file to track original file states
 */
export function writeHashes(projectPath: string): void {
  const claudeDir = path.join(projectPath, '.claude');
  const hashesPath = path.join(claudeDir, '.hashes.json');
  const hashes = generateHashes(claudeDir);
  fs.writeFileSync(hashesPath, JSON.stringify(hashes, null, 2));
}

/**
 * Read stored hashes from a project
 */
export function readHashes(projectPath: string): Record<string, string> {
  const hashesPath = path.join(projectPath, '.claude', '.hashes.json');
  try {
    if (fs.existsSync(hashesPath)) {
      return JSON.parse(fs.readFileSync(hashesPath, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return {};
}

export interface FileChange {
  file: string;
  status: 'new' | 'modified' | 'unchanged';
  currentHash?: string;
  originalHash?: string;
  templateHash?: string;
}

/**
 * Compare installed files with template to find changes
 */
export function compareWithTemplate(projectPath: string, templatePath: string): FileChange[] {
  const claudeDir = path.join(projectPath, '.claude');
  const templateClaudeDir = path.join(templatePath, '.claude');

  const storedHashes = readHashes(projectPath);
  const templateFiles = getFilesRecursive(templateClaudeDir);
  const changes: FileChange[] = [];

  for (const file of templateFiles) {
    // Skip metadata files
    if (file === '.hashes.json' || file === '.version') {
      continue;
    }

    const installedPath = path.join(claudeDir, file);
    const templateFilePath = path.join(templateClaudeDir, file);
    const templateHash = hashFile(templateFilePath);

    if (!fs.existsSync(installedPath)) {
      // New file in template
      changes.push({ file, status: 'new', templateHash });
    } else {
      const currentHash = hashFile(installedPath);
      const originalHash = storedHashes[file];

      if (!originalHash || currentHash === originalHash) {
        // User hasn't modified this file (or no hash tracking)
        changes.push({ file, status: 'unchanged', currentHash, originalHash, templateHash });
      } else {
        // User has modified this file
        changes.push({ file, status: 'modified', currentHash, originalHash, templateHash });
      }
    }
  }

  return changes;
}
