import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_CAPTURE_CS = `using UnityEngine;
using UnityEditor;
using System.IO;

public static class ScreenshotCapture
{
    [MenuItem("Tools/Capture Screenshot")]
    public static void CaptureScreenshot()
    {
        string folderPath = "Assets/Screenshots";
        if (!Directory.Exists(folderPath))
            Directory.CreateDirectory(folderPath);

        string filename = $"screenshot_{System.DateTime.Now:yyyyMMdd_HHmmss}.png";
        string path = Path.Combine(folderPath, filename);

        ScreenCapture.CaptureScreenshot(path);
        Debug.Log($"Screenshot saved to: {path}");

        EditorApplication.delayCall += () => AssetDatabase.Refresh();
    }
}
`;

/**
 * Create Unity editor scripts in the project
 * These are utilities that Claude Code skills depend on
 */
export function createEditorScripts(projectPath: string): void {
  const editorDir = path.join(projectPath, 'Assets', '_Game', 'Scripts', 'Editor');
  fs.mkdirSync(editorDir, { recursive: true });

  const screenshotPath = path.join(editorDir, 'ScreenshotCapture.cs');
  fs.writeFileSync(screenshotPath, SCREENSHOT_CAPTURE_CS);
}
