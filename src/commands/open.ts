import * as fs from 'fs';
import * as path from 'path';
import { logSuccess, log } from '../utils/output.js';
import { isUnityProject, openUnityProject, getUnityExecutablePath, parseUnityVersion } from '../utils/unity.js';
import { GameKitError } from '../utils/connection.js';

/**
 * Read the Unity version from ProjectSettings/ProjectVersion.txt
 */
function getProjectUnityVersion(projectPath: string): string | null {
  const versionFile = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
  if (!fs.existsSync(versionFile)) return null;

  const content = fs.readFileSync(versionFile, 'utf-8');
  const match = content.match(/m_EditorVersion:\s*(.+)/);
  if (!match) return null;

  const version = match[1].trim();
  return parseUnityVersion(version) ? version : null;
}

/**
 * Open the current project in Unity using the correct editor version.
 */
export async function open(): Promise<void> {
  const projectPath = process.cwd();

  if (!isUnityProject(projectPath)) {
    throw new GameKitError('NOT_UNITY_PROJECT', 'Current directory is not a Unity project');
  }

  const version = getProjectUnityVersion(projectPath);
  if (!version) {
    throw new GameKitError('VERSION_NOT_FOUND', 'Could not determine Unity version from ProjectSettings/ProjectVersion.txt');
  }

  const execPath = getUnityExecutablePath(version);
  if (!fs.existsSync(execPath.replace('/Contents/MacOS/Unity', ''))) {
    throw new GameKitError('UNITY_NOT_INSTALLED', `Unity ${version} is not installed. Install it via Unity Hub.`);
  }

  openUnityProject(execPath, projectPath);
  logSuccess(`Opening project in Unity ${version}`);
}
