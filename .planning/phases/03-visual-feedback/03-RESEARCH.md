# Phase 3: Visual Feedback - Research

**Researched:** 2026-02-10
**Domain:** Unity screenshot capture (Game view, Scene view, named camera), binary HTTP responses, CLI binary output
**Confidence:** HIGH

## Summary

Phase 3 adds screenshot capture to gamekit, enabling Claude to visually verify what the game looks like. The phase requires three capture modes (Game view, Scene view, named camera) and two output modes (file path, binary to stdout). The Unity side uses different techniques for each capture mode: the Game view is best captured via `Camera.Render()` on the main camera into a temporary `RenderTexture` (works in both edit and play mode), the Scene view is captured via `SceneView.lastActiveSceneView.camera` rendered into a `RenderTexture`, and named cameras are found via `GameObject.Find()` + `GetComponent<Camera>()` and rendered the same way. All three produce `byte[]` via `Texture2D.EncodeToPNG()`. The handler must break the existing `ApiResponse` JSON-only pattern to support returning raw binary PNG data when requested.

The CLI side adds a `gamekit screenshot` command with `--scene`, `--camera <name>`, and `--output <path>` flags. When output is a file (default), the Unity endpoint saves the PNG and returns the file path as JSON. When piped to stdout, the CLI requests binary mode from the endpoint and writes raw bytes to stdout. This enables `gamekit screenshot | claude-read-image` style pipelines.

**Critical insight:** `ScreenCapture.CaptureScreenshot()` requires play mode AND the Game view to be focused -- it is NOT suitable as the primary capture method. The `Camera.Render()` + `RenderTexture` + `ReadPixels` + `EncodeToPNG` pipeline works in both edit mode and play mode without any window focus requirements. This is the approach to use for all three capture modes.

**Primary recommendation:** Use a single `ScreenshotService` that implements `CaptureCamera(Camera cam, int width, int height) -> byte[]` as the core primitive. Game view = main camera or `Camera.main`, Scene view = `SceneView.lastActiveSceneView.camera`, named camera = lookup by name. One endpoint, one handler, query parameters select the mode.

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| `Camera.Render()` | Unity 2020+ | Render a camera's view into its targetTexture | Manual camera rendering without requiring play mode or window focus. The foundation for all three capture modes. |
| `RenderTexture` | Unity 2020+ | Off-screen render target | Temporary GPU texture that cameras render into. Created, used, then destroyed per screenshot. |
| `Texture2D.ReadPixels()` | Unity 2020+ | Transfer GPU pixels to CPU memory | Reads from `RenderTexture.active` into a Texture2D. Required step before encoding to PNG. |
| `Texture2D.EncodeToPNG()` | Unity 2020+ | Encode texture as PNG byte array | Returns `byte[]` ready for file write or HTTP response. Works on ARGB32 and RGB24 formats. |
| `SceneView.lastActiveSceneView` | Unity 2020+ (UnityEditor) | Access the active Scene view window | Returns the most recently focused Scene view. Its `.camera` property provides the scene view camera. |
| `Camera.main` | Unity 2020+ | Access the main camera tagged "MainCamera" | Standard way to get the Game view camera. Returns null if no camera has the "MainCamera" tag. |
| `Camera.allCameras` | Unity 2020+ | List all enabled cameras in the scene | Used to find a camera by name for `--camera <name>`. Iterating is fast (typically 1-5 cameras). |
| `GameObject.Find()` + `GetComponent<Camera>()` | Unity 2020+ | Find camera by GameObject name | Alternative to iterating `Camera.allCameras`. Works for disabled cameras too. |
| `HttpListenerResponse.ContentType` | .NET Standard 2.1 | Set response MIME type | Set to `image/png` for binary responses, `application/json` for JSON responses. |
| Commander.js | ^12.1.0 (existing) | CLI command registration | Already in use. Add `screenshot` command with options. |

### Supporting

| Library/API | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `UnityEditorInternal.InternalEditorUtility.ReadScreenPixel()` | Unity 2020+ (Internal) | Capture raw screen pixels from an editor window | Fallback approach for capturing the Game view if Camera.Render approach has issues. Captures the actual rendered window pixels. Internal API -- less stable but used by Unity itself. |
| `File.WriteAllBytes()` | .NET Standard 2.1 | Write PNG bytes to disk | When the handler saves the screenshot to a file before returning the path. |
| `process.stdout.write(Buffer)` | Node.js / Bun | Write binary data to stdout | When `--stdout` flag is set, write raw PNG bytes instead of JSON. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Camera.Render()` + RenderTexture | `ScreenCapture.CaptureScreenshot()` | ScreenCapture requires play mode AND Game view focus. Completely unsuitable for edit-mode screenshots or headless operation. Camera.Render works everywhere. |
| `Camera.Render()` + RenderTexture | `ScreenCapture.CaptureScreenshotAsTexture()` | Also requires play mode + WaitForEndOfFrame coroutine. Cannot be called from an HTTP handler on the main thread. |
| `Camera.Render()` + RenderTexture | `InternalEditorUtility.ReadScreenPixel()` | ReadScreenPixel captures the actual window pixels (including UI chrome). Camera.Render captures a clean render. ReadScreenPixel is an internal API with stability risk. However, it captures post-processing effects that Camera.Render may miss depending on render pipeline. |
| Returning file path as JSON | Returning only binary PNG in response | File path approach is simpler and matches existing JSON envelope pattern. Binary mode is needed for piping but should be opt-in (query parameter `?format=binary`). |
| Saving to `Assets/Screenshots/` | Saving to `.gamekit/screenshots/` | Saving inside Assets triggers AssetDatabase import, which is slow and unnecessary. `.gamekit/` is already used for server.json and is gitignored. |

## Architecture Patterns

### Recommended Project Structure

New files for Phase 3 (additions to existing structure):

```
template/Editor/GameKit/
├── Handlers/
│   ├── HealthHandler.cs            # EXISTING
│   ├── RefreshHandler.cs           # EXISTING
│   ├── ConsoleHandler.cs           # EXISTING
│   ├── PlayHandler.cs              # EXISTING
│   └── ScreenshotHandler.cs       # NEW: GET /api/screenshot
├── Services/
│   ├── CompilationService.cs       # EXISTING
│   ├── LogService.cs               # EXISTING
│   └── ScreenshotService.cs       # NEW: Camera rendering + PNG encoding
├── Models/
│   ├── ApiResponse.cs              # EXISTING (may need binary response support)
│   └── ...existing models...
└── ...existing files...

src/
├── commands/
│   ├── ...existing commands...
│   └── screenshot.ts              # NEW: gamekit screenshot command
└── utils/
    ├── bridge.ts                   # EXISTING (may need binary response support)
    └── ...existing utils...
```

### Pattern 1: Camera-to-PNG Capture Pipeline

**What:** A reusable method that takes any Camera, renders it to a temporary RenderTexture, reads pixels into a Texture2D, encodes to PNG, and cleans up all temporary objects.

**When to use:** All three capture modes (Game view, Scene view, named camera).

**Example:**

```csharp
// Source: Unity Scripting API - Camera.Render, RenderTexture, Texture2D.ReadPixels
// https://docs.unity3d.com/ScriptReference/Camera.Render.html
// https://docs.unity3d.com/ScriptReference/Texture2D.ReadPixels.html

public static class ScreenshotService
{
    public static byte[] CaptureCamera(Camera camera, int width, int height)
    {
        // Create temporary render texture
        var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);

        // Save and replace camera's target texture
        var previousTarget = camera.targetTexture;
        var previousActive = RenderTexture.active;

        camera.targetTexture = rt;
        RenderTexture.active = rt;

        // Render the camera
        camera.Render();

        // Read pixels into Texture2D
        var tex = new Texture2D(width, height, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
        tex.Apply();

        // Encode to PNG
        byte[] pngBytes = tex.EncodeToPNG();

        // Cleanup
        camera.targetTexture = previousTarget;
        RenderTexture.active = previousActive;
        Object.DestroyImmediate(tex);
        Object.DestroyImmediate(rt);

        return pngBytes;
    }

    public static byte[] CaptureGameView(int width, int height)
    {
        var cam = Camera.main;
        if (cam == null)
        {
            // Fallback: find any camera
            var cameras = Camera.allCameras;
            if (cameras.Length == 0)
                throw new System.InvalidOperationException("No cameras found in scene");
            cam = cameras[0];
        }
        return CaptureCamera(cam, width, height);
    }

    public static byte[] CaptureSceneView(int width, int height)
    {
        var sceneView = SceneView.lastActiveSceneView;
        if (sceneView == null)
            throw new System.InvalidOperationException("No active Scene view");

        return CaptureCamera(sceneView.camera, width, height);
    }

    public static byte[] CaptureNamedCamera(string cameraName, int width, int height)
    {
        var go = GameObject.Find(cameraName);
        if (go == null)
            throw new System.InvalidOperationException($"GameObject '{cameraName}' not found");

        var cam = go.GetComponent<Camera>();
        if (cam == null)
            throw new System.InvalidOperationException(
                $"GameObject '{cameraName}' does not have a Camera component");

        return CaptureCamera(cam, width, height);
    }
}
```

### Pattern 2: Dual-Mode HTTP Response (JSON or Binary)

**What:** The screenshot handler returns either a JSON envelope with the file path (default) or raw binary PNG data, controlled by a query parameter.

**When to use:** GET /api/screenshot endpoint.

**Example:**

```csharp
// The RequestRouter needs to handle binary responses differently
// from the standard ApiResponse JSON path

public static class ScreenshotHandler
{
    public static void Handle(HttpListenerContext context)
    {
        var request = context.Request;
        var format = request.QueryString["format"] ?? "file"; // "file" or "binary"
        var source = request.QueryString["source"] ?? "game"; // "game", "scene", or camera name
        var widthStr = request.QueryString["width"];
        var heightStr = request.QueryString["height"];

        int width = string.IsNullOrEmpty(widthStr) ? 1920 : int.Parse(widthStr);
        int height = string.IsNullOrEmpty(heightStr) ? 1080 : int.Parse(heightStr);

        try
        {
            byte[] pngBytes;

            if (source == "scene")
                pngBytes = ScreenshotService.CaptureSceneView(width, height);
            else if (source == "game")
                pngBytes = ScreenshotService.CaptureGameView(width, height);
            else
                pngBytes = ScreenshotService.CaptureNamedCamera(source, width, height);

            if (format == "binary")
            {
                // Return raw PNG bytes
                context.Response.ContentType = "image/png";
                context.Response.ContentLength64 = pngBytes.Length;
                context.Response.OutputStream.Write(pngBytes, 0, pngBytes.Length);
            }
            else
            {
                // Save to file and return path as JSON
                string filename = $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}.png";
                string dir = Path.Combine(
                    Directory.GetCurrentDirectory(), ".gamekit", "screenshots");
                Directory.CreateDirectory(dir);
                string filePath = Path.Combine(dir, filename);

                File.WriteAllBytes(filePath, pngBytes);

                var response = ApiResponse.Success(new { path = filePath });
                var json = JsonConvert.SerializeObject(response);
                var buffer = Encoding.UTF8.GetBytes(json);

                context.Response.ContentType = "application/json";
                context.Response.ContentLength64 = buffer.Length;
                context.Response.OutputStream.Write(buffer, 0, buffer.Length);
            }
        }
        catch (Exception ex)
        {
            var response = ApiResponse.Error("SCREENSHOT_FAILED", ex.Message);
            var json = JsonConvert.SerializeObject(response);
            var buffer = Encoding.UTF8.GetBytes(json);

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            context.Response.ContentLength64 = buffer.Length;
            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
        }
        finally
        {
            try { context.Response.Close(); } catch { }
        }
    }
}
```

### Pattern 3: CLI Screenshot Command with Output Modes

**What:** The CLI command determines output mode based on flags and TTY detection, then either saves to file (default) or writes binary to stdout.

**When to use:** `gamekit screenshot` command.

**Example:**

```typescript
// src/commands/screenshot.ts
import { Command } from 'commander';
import * as fs from 'fs';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';

interface ScreenshotResult {
  path: string;
}

export function registerScreenshotCommand(program: Command): void {
  program
    .command('screenshot')
    .description('Capture a screenshot from Unity')
    .option('--scene', 'Capture the Scene view instead of Game view')
    .option('--camera <name>', 'Capture from a specific camera')
    .option('--width <pixels>', 'Screenshot width', '1920')
    .option('--height <pixels>', 'Screenshot height', '1080')
    .option('--output <path>', 'Save screenshot to specific path')
    .option('--stdout', 'Write PNG binary to stdout')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts();
        const info = await getConnection(process.cwd());

        // Determine source
        let source = 'game';
        if (opts.scene) source = 'scene';
        else if (opts.camera) source = opts.camera;

        // Determine format
        const wantBinary = opts.stdout || !process.stdout.isTTY;

        if (wantBinary) {
          // Request binary PNG and write to stdout
          const url = `http://localhost:${info.port}/api/screenshot`
            + `?source=${source}&format=binary`
            + `&width=${opts.width}&height=${opts.height}`;

          const res = await fetch(url);
          if (!res.ok) throw new GameKitError('SCREENSHOT_FAILED', await res.text());

          const buffer = Buffer.from(await res.arrayBuffer());
          process.stdout.write(buffer);
        } else {
          // Request file save and return path
          const params = `?source=${source}&format=file`
            + `&width=${opts.width}&height=${opts.height}`;

          const result = await request<ScreenshotResult>(
            info.port, 'GET', `/screenshot${params}`);

          // If --output specified, copy file to requested location
          if (opts.output) {
            fs.copyFileSync(result.path, opts.output);
            result.path = opts.output;
          }

          outputSuccess(result, globalOpts);
          logSuccess(`Screenshot saved to ${result.path}`);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
```

### Anti-Patterns to Avoid

- **Using `ScreenCapture.CaptureScreenshot()`:** Requires play mode AND Game view focus. Completely unsuitable for a programmatic screenshot tool called via HTTP. Use `Camera.Render()` instead.

- **Using `ScreenCapture.CaptureScreenshotAsTexture()`:** Requires `WaitForEndOfFrame()` coroutine, which cannot run from a synchronous HTTP handler dispatched to the main thread. Use direct `Camera.Render()` approach.

- **Saving screenshots inside `Assets/`:** Triggers `AssetDatabase.Refresh()` which is slow and unnecessary. Save to `.gamekit/screenshots/` instead.

- **Forgetting to clean up RenderTexture and Texture2D:** GPU memory leak. Always call `Object.DestroyImmediate()` on both the temporary `RenderTexture` and `Texture2D` after encoding.

- **Not restoring `camera.targetTexture` and `RenderTexture.active`:** Corrupts the camera's rendering pipeline for subsequent frames. Always save and restore these values.

- **Calling `Camera.Render()` on a camera that is currently rendering:** Unity explicitly prohibits this. Should not happen from an HTTP handler since the handler runs during `EditorApplication.update` (not during camera rendering), but be aware of the constraint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG encoding | Custom PNG encoder | `Texture2D.EncodeToPNG()` | PNG format is complex (deflate compression, CRC checksums). Unity's built-in encoder is fast and correct. |
| Camera rendering to texture | Manual GL commands / shader passes | `Camera.Render()` + `RenderTexture` | Camera.Render handles the entire render pipeline (culling, shadows, post-processing in Built-in RP). Manual GL is fragile and missing features. |
| Finding cameras by name | Scene hierarchy traversal | `GameObject.Find(name).GetComponent<Camera>()` | Built-in method handles the search efficiently. |
| Scene view camera access | Reflection into editor internals | `SceneView.lastActiveSceneView.camera` | Public API since Unity 2017+. Stable and documented. |
| Binary HTTP response | Custom binary protocol | Standard HTTP with `Content-Type: image/png` | HTTP already supports binary responses. Just set the content type and write bytes. |

**Key insight:** Unity provides all the primitives needed: `Camera.Render()`, `RenderTexture`, `Texture2D.ReadPixels()`, and `EncodeToPNG()`. The work is composing these into a service, exposing it via HTTP, and consuming it on the CLI side. No custom rendering or encoding needed.

## Common Pitfalls

### Pitfall 1: ScreenCapture vs Camera.Render Confusion

**What goes wrong:** Developer uses `ScreenCapture.CaptureScreenshot()` or `CaptureScreenshotAsTexture()` and finds it only works during play mode with Game view focused.

**Why it happens:** These methods capture the actual screen/game window, not a camera's render. They require the rendering pipeline to be active (play mode) and the target window to be visible.

**How to avoid:** Use `Camera.Render()` with a temporary `RenderTexture` for all capture modes. This renders the camera's view off-screen, independent of play mode state or window focus.

**Warning signs:** Screenshots return null, throw exceptions, or capture the wrong view (editor chrome instead of game content).

### Pitfall 2: RenderTexture / Texture2D Memory Leak

**What goes wrong:** Each screenshot call creates a `RenderTexture` and `Texture2D` that are never destroyed, leaking GPU and CPU memory.

**Why it happens:** `new RenderTexture()` and `new Texture2D()` allocate unmanaged resources not collected by C# GC. Must be explicitly destroyed.

**How to avoid:** Wrap capture in try/finally. Always call `Object.DestroyImmediate(tex)` and `Object.DestroyImmediate(rt)` in the finally block. Do not use `Destroy()` (delayed) in editor code -- use `DestroyImmediate()`.

**Warning signs:** Unity editor memory usage grows over time, "leaked RenderTexture" warnings in console.

### Pitfall 3: Camera.main Returns Null

**What goes wrong:** `Camera.main` returns null because no camera in the scene has the "MainCamera" tag, causing a NullReferenceException.

**Why it happens:** New scenes or scenes with custom camera setups may not have a camera tagged "MainCamera". Unity caches GameObjects with this tag -- if none exist, `Camera.main` is null.

**How to avoid:** Always null-check `Camera.main`. Fallback to `Camera.allCameras[0]` if main is null. Return a clear error if no cameras exist at all.

**Warning signs:** NullReferenceException in ScreenshotService when capturing Game view.

### Pitfall 4: Scene View Camera Not Available

**What goes wrong:** `SceneView.lastActiveSceneView` returns null because no Scene view window is open, or the Scene view has never been focused.

**Why it happens:** The Scene view is an editor window that may be closed, minimized, or never opened. `lastActiveSceneView` is null if no Scene view has been focused since the editor launched.

**How to avoid:** Null-check `SceneView.lastActiveSceneView` before accessing `.camera`. Return a clear error message: "No active Scene view. Open a Scene view window in Unity."

**Warning signs:** NullReferenceException when using `--scene` flag.

### Pitfall 5: RenderTexture Format Mismatch with Render Pipeline

**What goes wrong:** Screenshots appear black, washed out, or have incorrect colors when using URP or HDRP render pipeline.

**Why it happens:** Different render pipelines use different color spaces and render texture formats. A simple `RenderTextureFormat.ARGB32` may not match the pipeline's expected format. URP/HDRP may also apply post-processing differently when rendering to a custom target.

**How to avoid:** Use `RenderTextureFormat.Default` to let Unity pick the appropriate format. For the Texture2D, use `TextureFormat.RGB24` which works universally after GPU-to-CPU transfer. If color issues arise, try `TextureFormat.ARGB32` and check the project's color space (Linear vs Gamma in Player Settings).

**Warning signs:** Black screenshots, washed-out colors, gamma-shifted images.

### Pitfall 6: Binary Response Breaks JSON Envelope Pattern

**What goes wrong:** The `RequestRouter.WriteResponse()` method always wraps responses in JSON via `ApiResponse`. Binary PNG data cannot go through this path.

**Why it happens:** The existing architecture assumes all responses are JSON. The screenshot handler needs to return raw bytes with `image/png` content type.

**How to avoid:** The screenshot handler must manage its own response writing (like `ConsoleHandler.HandleStream` does for SSE). The `RequestRouter` should route to `ScreenshotHandler.Handle(context)` and let it write the response directly, bypassing `WriteResponse()`. This is the same pattern used for SSE streaming.

**Warning signs:** Binary PNG data wrapped in JSON (garbage output), or deserialization errors on the CLI side.

### Pitfall 7: Screenshot Size Too Large for Context Windows

**What goes wrong:** A 1920x1080 PNG screenshot is 2-5MB. This is fine for file output but wasteful when the screenshot is consumed by an AI model that downscales images anyway.

**Why it happens:** Default resolution matches monitor size, but AI models typically process images at much lower resolution.

**How to avoid:** Use sensible defaults (e.g., 960x540 or 1280x720 for file output). Allow `--width` and `--height` overrides. For binary/stdout mode (piped to AI tools), consider using a smaller default. Document that larger screenshots provide more detail but use more bandwidth.

**Warning signs:** Slow screenshot capture, large files, slow AI processing.

## Code Examples

### Unity Service: Complete Camera Capture Pipeline

```csharp
// template/Editor/GameKit/Services/ScreenshotService.cs
// Source: Unity Scripting API
// https://docs.unity3d.com/ScriptReference/Camera.Render.html
// https://docs.unity3d.com/ScriptReference/Texture2D.ReadPixels.html
// https://docs.unity3d.com/ScriptReference/Texture2D.EncodeToPNG.html

using UnityEngine;
using UnityEditor;

namespace GameKit.Services
{
    public static class ScreenshotService
    {
        public static byte[] CaptureCamera(Camera camera, int width, int height)
        {
            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.Default);
            var previousTarget = camera.targetTexture;
            var previousActive = RenderTexture.active;

            try
            {
                camera.targetTexture = rt;
                RenderTexture.active = rt;
                camera.Render();

                var tex = new Texture2D(width, height, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                tex.Apply();

                byte[] pngBytes = tex.EncodeToPNG();
                Object.DestroyImmediate(tex);

                return pngBytes;
            }
            finally
            {
                camera.targetTexture = previousTarget;
                RenderTexture.active = previousActive;
                Object.DestroyImmediate(rt);
            }
        }

        public static Camera FindGameCamera()
        {
            var cam = Camera.main;
            if (cam != null) return cam;

            var cameras = Camera.allCameras;
            if (cameras.Length > 0) return cameras[0];

            return null;
        }

        public static Camera FindSceneViewCamera()
        {
            var sceneView = SceneView.lastActiveSceneView;
            return sceneView?.camera;
        }

        public static Camera FindNamedCamera(string name)
        {
            var go = GameObject.Find(name);
            if (go == null) return null;

            return go.GetComponent<Camera>();
        }
    }
}
```

### Unity Handler: Screenshot with Dual Response Modes

```csharp
// template/Editor/GameKit/Handlers/ScreenshotHandler.cs

public static class ScreenshotHandler
{
    // This handler manages its own response (like ConsoleHandler.HandleStream)
    // because it may return binary data instead of JSON.
    public static void Handle(HttpListenerContext context)
    {
        var q = context.Request.QueryString;
        var source = q["source"] ?? "game";
        var format = q["format"] ?? "file";
        int width = ParseInt(q["width"], 1920);
        int height = ParseInt(q["height"], 1080);

        try
        {
            Camera cam;
            if (source == "scene")
                cam = ScreenshotService.FindSceneViewCamera();
            else if (source == "game")
                cam = ScreenshotService.FindGameCamera();
            else
                cam = ScreenshotService.FindNamedCamera(source);

            if (cam == null)
            {
                WriteJsonError(context, "CAMERA_NOT_FOUND",
                    source == "scene" ? "No active Scene view"
                    : source == "game" ? "No cameras in scene"
                    : $"Camera '{source}' not found");
                return;
            }

            byte[] pngBytes = ScreenshotService.CaptureCamera(cam, width, height);

            if (format == "binary")
            {
                WriteBinaryResponse(context, pngBytes);
            }
            else
            {
                string filePath = SaveToFile(pngBytes);
                WriteJsonSuccess(context, new { path = filePath });
            }
        }
        catch (Exception ex)
        {
            WriteJsonError(context, "SCREENSHOT_FAILED", ex.Message);
        }
    }
}
```

### CLI Command: gamekit screenshot

```typescript
// src/commands/screenshot.ts
// Pattern: connect, call API, format output (matches play.ts pattern)

export function registerScreenshotCommand(program: Command): void {
  program
    .command('screenshot')
    .description('Capture a screenshot from Unity')
    .option('--scene', 'Capture the Scene view')
    .option('--camera <name>', 'Capture from a specific camera')
    .option('--width <n>', 'Width in pixels', '1920')
    .option('--height <n>', 'Height in pixels', '1080')
    .option('--output <path>', 'Save to specific file path')
    .option('--stdout', 'Output raw PNG to stdout')
    .action(async (opts) => {
      const info = await getConnection(process.cwd());
      const source = opts.scene ? 'scene' : (opts.camera ?? 'game');
      const wantBinary = opts.stdout;

      if (wantBinary) {
        // Binary mode: fetch raw PNG, write to stdout
        const url = `http://localhost:${info.port}/api/screenshot`
          + `?source=${encodeURIComponent(source)}&format=binary`
          + `&width=${opts.width}&height=${opts.height}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        const buf = Buffer.from(await res.arrayBuffer());
        process.stdout.write(buf);
      } else {
        // File mode: save PNG, return path as JSON
        const params = `?source=${encodeURIComponent(source)}&format=file`
          + `&width=${opts.width}&height=${opts.height}`;
        const result = await request<{ path: string }>(
          info.port, 'GET', `/screenshot${params}`, undefined, 30000);

        if (opts.output) {
          fs.copyFileSync(result.path, opts.output);
          result.path = opts.output;
        }

        outputSuccess(result, program.opts());
        logSuccess(`Screenshot saved to ${result.path}`);
      }
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Application.CaptureScreenshot()` | `ScreenCapture.CaptureScreenshot()` | Unity 2017+ (Application version deprecated) | Moved to ScreenCapture class. Same limitation: requires play mode. |
| `ScreenCapture.CaptureScreenshot()` | `Camera.Render()` + RenderTexture (for editor tools) | Always available | ScreenCapture is fine for runtime; Camera.Render is required for editor-mode capture without window focus. |
| Manual pixel manipulation for PNG | `Texture2D.EncodeToPNG()` / `ImageConversion.EncodeToPNG()` | Stable since Unity 5+ | Built-in PNG encoder. `ImageConversion` is the newer namespace but `Texture2D.EncodeToPNG()` still works. |
| `SceneView.currentDrawingSceneView` | `SceneView.lastActiveSceneView` | Stable | `currentDrawingSceneView` is only valid during SceneView rendering callbacks. `lastActiveSceneView` works from any context. |

**Deprecated/outdated:**
- `Application.CaptureScreenshot()`: Deprecated since Unity 2017. Use `ScreenCapture.CaptureScreenshot()` (but note: still requires play mode).
- `Texture2D.EncodeToPNG()` is NOT deprecated despite `ImageConversion.EncodeToPNG()` existing. Both work. The Texture2D version is more convenient.

## Open Questions

1. **Default screenshot resolution**
   - What we know: 1920x1080 is standard HD resolution. Larger takes more time and memory. Smaller may miss detail.
   - What's unclear: What resolution Claude/AI tools prefer when consuming screenshots. Too large wastes context window tokens; too small misses visual issues.
   - Recommendation: Default to 1920x1080 for file mode. This captures good detail. The CLI can always pass `--width` / `--height` to override. If Claude or other AI consumers have preferences, the defaults can be tuned later.

2. **URP/HDRP render pipeline compatibility**
   - What we know: `Camera.Render()` is documented to work with all render pipelines. The render pipeline handles its own rendering when `Camera.Render()` is called.
   - What's unclear: Whether post-processing effects (bloom, color grading, etc.) are applied when rendering to a custom RenderTexture target in URP/HDRP. Some post-processing may be screen-space only.
   - Recommendation: Start with the basic approach (`Camera.Render()` + `RenderTexture`). Test with URP and HDRP projects. If post-processing is missing, investigate `RenderPipeline.SubmitRenderRequest()` (Unity 2023+) as an alternative. Flag this as a known limitation for v1.

3. **Scene view camera behavior during rendering**
   - What we know: `SceneView.lastActiveSceneView.camera` provides access to the scene view camera. It is a real Camera component.
   - What's unclear: Whether calling `Camera.Render()` on the scene view camera with a custom RenderTexture disrupts the scene view's own rendering (flickering, artifacts).
   - Recommendation: Use the scene view camera for rendering but restore all previous settings after capture. If issues arise, fall back to `InternalEditorUtility.ReadScreenPixel()` for scene view only. The Camera.Render approach should be tried first since it produces cleaner output (no editor chrome).

4. **Binary stdout mode vs auto-detection**
   - What we know: The existing output pattern (output.ts) auto-detects JSON mode when stdout is not a TTY.
   - What's unclear: Whether binary output should be the default when stdout is piped (like `gamekit screenshot | tool`) or require explicit `--stdout` flag.
   - Recommendation: Require explicit `--stdout` flag for binary mode. When piped without `--stdout`, output JSON (file path) as usual. This avoids surprising behavior and matches the existing "JSON to stdout, human to stderr" convention.

## Sources

### Primary (HIGH confidence)
- [Unity Scripting API: Camera.Render()](https://docs.unity3d.com/ScriptReference/Camera.Render.html) - Manual camera rendering, works in editor
- [Unity Scripting API: RenderTexture](https://docs.unity3d.com/ScriptReference/RenderTexture.html) - Off-screen render target
- [Unity Scripting API: Texture2D.ReadPixels()](https://docs.unity3d.com/ScriptReference/Texture2D.ReadPixels.html) - GPU-to-CPU pixel transfer
- [Unity Scripting API: Texture2D.EncodeToPNG()](https://docs.unity3d.com/ScriptReference/ImageConversion.EncodeToPNG.html) - PNG encoding, returns byte[]
- [Unity Scripting API: ScreenCapture](https://docs.unity3d.com/ScriptReference/ScreenCapture.html) - Screenshot methods (play mode only)
- [Unity Scripting API: ScreenCapture.CaptureScreenshotAsTexture()](https://docs.unity3d.com/ScriptReference/ScreenCapture.CaptureScreenshotAsTexture.html) - Requires WaitForEndOfFrame
- [Unity Scripting API: SceneView](https://docs.unity3d.com/ScriptReference/SceneView.html) - Scene view camera access via .camera property
- [Unity Scripting API: Camera.main](https://docs.unity3d.com/ScriptReference/Camera-main.html) - Main camera lookup
- [Unity Scripting API: Camera.allCameras](https://docs.unity3d.com/ScriptReference/Camera-allCameras.html) - All enabled cameras
- [Microsoft: HttpListenerResponse.ContentType](https://learn.microsoft.com/en-us/dotnet/api/system.net.httplistenerresponse.contenttype) - Content type for binary responses
- [UnityCsReference: ScreenShotting.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/GUI/ScreenShotting.cs) - Unity's own screenshot implementation using InternalEditorUtility.ReadScreenPixel

### Secondary (MEDIUM confidence)
- [GitHub Gist: Capture SceneView](https://gist.github.com/t-mat/af462377a1200700a94d3aaadfb468e2) - Community implementation using InternalEditorUtility.ReadScreenPixel for Scene view capture
- [GitHub Gist: Screenshot capture methods (2018.3+)](https://gist.github.com/desplesda/39c3d6f5b3683dfe4e1397ca32338d59) - Game view capture using ScreenCapture.CaptureScreenshot + Inspector capture using ReadScreenPixel
- [GitHub Gist: Offscreen rendering](https://gist.github.com/danielbierwirth/10965844fecc38243007f0cd21843d90) - Camera.Render + RenderTexture + EncodeToPNG pipeline
- [Unity Issue Tracker: CaptureScreenshotAsTexture fails outside player window](https://issuetracker.unity3d.com/issues/screencapture-dot-capturescreenshotastexture-will-fail-and-throw-exceptions-when-called-from-outside-of-the-player-window) - Confirms ScreenCapture limitations
- [Bun: Binary Data](https://bun.com/docs/runtime/binary-data) - Uint8Array/Buffer handling for stdout

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Camera.Render, RenderTexture, ReadPixels, and EncodeToPNG are stable Unity APIs available since Unity 5+. Verified against official documentation. The pipeline is well-established in the Unity community.
- Architecture: HIGH - Follows established Phase 1/2 patterns (handler + service + CLI command). The dual-mode response (JSON vs binary) is the only new pattern, and it mirrors the existing SSE streaming pattern where the handler manages its own response.
- Pitfalls: HIGH - Key pitfalls (ScreenCapture limitations, memory leaks, null cameras) are well-documented in official Unity docs and community experience. The render pipeline compatibility question is flagged as an open question with a clear mitigation strategy.

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days -- stable APIs, no changes expected)
