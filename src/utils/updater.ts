import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub repo for releases
const GITHUB_REPO = 'gamekit-agent/gamekit-cli';

// Version injected at build time (see scripts/inject-version.ts)
import { VERSION } from '../version.js';

/**
 * Get the path to the gamekit config directory (~/.gamekit)
 */
export function getConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const configDir = path.join(home, '.gamekit');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  return configDir;
}

/**
 * Get the install directory for the binary
 */
export function getInstallDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'gamekit', 'bin');
  }
  return path.join(os.homedir(), '.gamekit', 'bin');
}

/**
 * Get the current version
 */
export function getCurrentVersion(): string {
  return VERSION;
}

/**
 * Get the binary name for the current platform
 */
export function getBinaryName(): string {
  const platform = process.platform === 'darwin' ? 'darwin' :
                   process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const ext = process.platform === 'win32' ? '.exe' : '';

  return `gamekit-${platform}-${arch}${ext}`;
}

/**
 * Fetch JSON from HTTPS URL
 */
function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'gamekit-updater'
      }
    };

    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          fetchJson(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch the latest version from GitHub releases
 */
export async function fetchLatestVersion(): Promise<string> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  const release = await fetchJson(url) as { tag_name?: string };

  // Remove 'v' prefix if present (e.g., 'v0.1.0' -> '0.1.0')
  const version = release.tag_name?.replace(/^v/, '') || '0.0.0';
  return version;
}

/**
 * Get download URL for the current platform from a release
 */
export async function getDownloadUrl(version: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/v${version}`;
  const release = await fetchJson(url) as {
    assets?: Array<{ name: string; browser_download_url: string }>
  };

  const binaryName = getBinaryName();
  const asset = release.assets?.find(a => a.name === binaryName);

  return asset?.browser_download_url || null;
}

/**
 * Compare semver versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Log update activity
 */
export function logUpdate(message: string): void {
  const configDir = getConfigDir();
  const logPath = path.join(configDir, 'update.log');
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;

  fs.appendFileSync(logPath, logLine);
}

/**
 * Check for updates and install in background (non-blocking)
 * This spawns a detached process that runs independently
 */
export function checkForUpdatesInBackground(): void {
  const currentVersion = getCurrentVersion();
  const configDir = getConfigDir();
  const installDir = getInstallDir();
  const binaryName = getBinaryName();

  // Create the update script inline
  const updateScript = `
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const GITHUB_REPO = '${GITHUB_REPO}';
    const currentVersion = '${currentVersion}';
    const configDir = '${configDir.replace(/\\/g, '\\\\')}';
    const installDir = '${installDir.replace(/\\/g, '\\\\')}';
    const binaryName = '${binaryName}';
    const logPath = path.join(configDir, 'update.log');

    function log(msg) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logPath, '[' + timestamp + '] ' + msg + '\\n');
    }

    function fetchJson(url) {
      return new Promise((resolve, reject) => {
        const options = {
          headers: { 'User-Agent': 'gamekit-updater' }
        };
        https.get(url, options, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            fetchJson(res.headers.location).then(resolve).catch(reject);
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(e); }
          });
        }).on('error', reject);
      });
    }

    function downloadFile(url, dest) {
      return new Promise((resolve, reject) => {
        const options = {
          headers: { 'User-Agent': 'gamekit-updater' }
        };
        https.get(url, options, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            downloadFile(res.headers.location, dest).then(resolve).catch(reject);
            return;
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (e) => {
          fs.unlink(dest, () => {});
          reject(e);
        });
      });
    }

    function compareVersions(a, b) {
      const partsA = a.split('.').map(Number);
      const partsB = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((partsA[i] || 0) > (partsB[i] || 0)) return 1;
        if ((partsA[i] || 0) < (partsB[i] || 0)) return -1;
      }
      return 0;
    }

    async function main() {
      try {
        log('Checking for updates... (current: ' + currentVersion + ')');

        // Fetch latest release
        const releaseUrl = 'https://api.github.com/repos/' + GITHUB_REPO + '/releases/latest';
        const release = await fetchJson(releaseUrl);
        const latest = (release.tag_name || '').replace(/^v/, '');
        log('Latest version: ' + latest);

        if (compareVersions(latest, currentVersion) > 0) {
          log('New version available! Updating...');

          // Find download URL for our binary
          const asset = (release.assets || []).find(a => a.name === binaryName);
          if (!asset) {
            log('No binary found for ' + binaryName);
            return;
          }

          // Download to temp location
          const tempPath = path.join(os.tmpdir(), 'gamekit-update-' + Date.now());
          log('Downloading from ' + asset.browser_download_url);
          await downloadFile(asset.browser_download_url, tempPath);

          // Make executable (Unix)
          if (process.platform !== 'win32') {
            fs.chmodSync(tempPath, 0o755);
          }

          // Ensure install dir exists
          if (!fs.existsSync(installDir)) {
            fs.mkdirSync(installDir, { recursive: true });
          }

          // Move to install location
          const targetPath = path.join(installDir, process.platform === 'win32' ? 'gamekit.exe' : 'gamekit');

          // On Windows, rename old binary first (can't overwrite running exe)
          if (process.platform === 'win32' && fs.existsSync(targetPath)) {
            const oldPath = targetPath + '.old';
            try { fs.unlinkSync(oldPath); } catch {}
            fs.renameSync(targetPath, oldPath);
          }

          fs.renameSync(tempPath, targetPath);
          log('Updated to version ' + latest + ' successfully!');

          // Write marker file so next run can notify user
          const updateAppliedPath = path.join(configDir, 'update-applied');
          fs.writeFileSync(updateAppliedPath, latest);
        } else {
          log('Already up to date.');
        }
      } catch (e) {
        log('Update check failed: ' + e.message);
      }
    }

    main();
  `;

  // Spawn detached Node process to run the update script
  const child = spawn(process.execPath, ['-e', updateScript], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32'
  });

  // Unref so parent can exit independently
  child.unref();
}

/**
 * Check if we should run an update check
 * Limits checks to once per hour to avoid hammering GitHub API
 */
export function shouldCheckForUpdates(): boolean {
  const configDir = getConfigDir();
  const lastCheckPath = path.join(configDir, 'last-update-check');

  try {
    if (fs.existsSync(lastCheckPath)) {
      const lastCheck = parseInt(fs.readFileSync(lastCheckPath, 'utf-8'), 10);
      const hourAgo = Date.now() - (60 * 60 * 1000);

      if (lastCheck > hourAgo) {
        return false; // Checked less than an hour ago
      }
    }
  } catch {
    // Ignore errors, proceed with check
  }

  // Update last check time
  try {
    fs.writeFileSync(lastCheckPath, Date.now().toString());
  } catch {
    // Ignore write errors
  }

  return true;
}

/**
 * Check if an update was applied and return the new version
 * Returns null if no update was applied
 */
export function checkForAppliedUpdate(): string | null {
  const configDir = getConfigDir();
  const updateAppliedPath = path.join(configDir, 'update-applied');

  try {
    if (fs.existsSync(updateAppliedPath)) {
      const newVersion = fs.readFileSync(updateAppliedPath, 'utf-8').trim();
      // Delete the file so we only show the message once
      fs.unlinkSync(updateAppliedPath);
      return newVersion;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Main entry point - check for updates if appropriate
 */
export function maybeCheckForUpdates(): void {
  // Skip update checks in development
  if (process.env.GAMEKIT_NO_UPDATE_CHECK) {
    return;
  }

  if (shouldCheckForUpdates()) {
    checkForUpdatesInBackground();
  }
}
