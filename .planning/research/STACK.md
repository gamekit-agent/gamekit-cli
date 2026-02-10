# Stack Research

**Domain:** CLI-to-Unity-Editor bridge (HTTP server in Unity Editor C# plugin, HTTP client in TypeScript CLI)
**Researched:** 2026-02-09
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; recommendations based on training data knowledge of Unity Editor APIs and C# HTTP patterns through early 2025. All Unity API names verified against known stable APIs present since Unity 2020+.)

## Context

GameKit is an existing TypeScript CLI (Commander.js, Bun-compiled binaries). It currently relies on a third-party MCP relay (`advanced-unity-mcp`) to bridge Claude Code and Unity Editor. This milestone replaces that relay with a native HTTP bridge:

- **Unity side:** C# Editor plugin running an HTTP server inside the Editor process
- **CLI side:** TypeScript HTTP client sending requests to that server
- **Capabilities:** refresh/compile, screenshot, console logs, scene manipulation, play mode control, build, asset management
- **Constraints:** Unity 2020+ through Unity 6+, no external C# dependencies, plugin lives in `template/` and gets copied during `gamekit init`

## Recommended Stack

### Unity-Side: C# HTTP Server in Editor Plugin

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `System.Net.HttpListener` | .NET Standard 2.1 / .NET 4.x | HTTP server inside Unity Editor | Built into .NET runtime that ships with Unity. No external dependencies. Available in all Unity versions from 2020 through Unity 6+. Runs on Windows and macOS. Prefix-based routing. |
| `UnityEditor` assembly | Unity 2020+ | Access all Editor APIs (scenes, assets, compilation, play mode) | The standard Editor scripting assembly. Every API we need lives here. |
| `Newtonsoft.Json` (Unity built-in) | 13.0.x | JSON serialization for HTTP request/response bodies | Ships with Unity 2020+ as `com.unity.nuget.newtonsoft-json`. No need to bundle it. Available out of the box. |
| `EditorApplication` | Unity 2020+ | Play mode control, compilation detection, editor lifecycle | Central hub for editor state: `isPlaying`, `isPaused`, `isCompiling`, `EnterPlaymode()`, `ExitPlaymode()`, `update` delegate |
| `EditorSceneManager` | Unity 2020+ | Scene open/save/create/query | Standard API for scene management in Editor context |
| `ScreenCapture` + `EditorWindow` | Unity 2020+ | Screenshot capture | `ScreenCapture.CaptureScreenshotAsTexture()` for game view; can also render specific cameras to RenderTexture |
| `Application.logMessageReceived` | Unity 2020+ | Console log interception | Callback fires on every Debug.Log/Warning/Error with message, stacktrace, and LogType |
| `AssetDatabase` | Unity 2020+ | Asset refresh, import, search | Standard Editor API for all asset operations |
| `BuildPipeline` | Unity 2020+ | Triggering builds programmatically | `BuildPipeline.BuildPlayer()` for player builds |
| `EditorApplication.delayCall` | Unity 2020+ | Thread-safe main-thread dispatch | HttpListener callbacks arrive on a background thread; must dispatch to main thread for all Unity API calls |

### CLI-Side: TypeScript HTTP Client

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js built-in `http` module | Node 18+ | HTTP client for requests to Unity | Zero dependencies. The CLI already uses only Node built-ins for networking (see `updater.ts` using `https`). Consistent with existing patterns. |
| `JSON.stringify` / `JSON.parse` | Built-in | Request/response serialization | Standard. No library needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Newtonsoft.Json` (Unity-bundled) | 13.0.x | C# JSON serialization | All HTTP request/response handling on Unity side. Prefer over `JsonUtility` because it handles dictionaries, nested objects, nulls, and dynamic structures that `JsonUtility` cannot. |
| `System.Threading` | .NET Standard 2.1 | Background thread for HttpListener | HttpListener.BeginGetContext / async pattern runs off Unity's main thread |
| `EditorCoroutines` (Unity built-in package) | 1.0+ | Optional: async editor operations | Only if you need coroutine-style async in Editor code. Not strictly required since `EditorApplication.update` and `delayCall` cover most cases. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Unity Editor 2020+ | Runtime environment for the C# plugin | Plugin compiles as part of the Unity project's Editor assembly |
| `asmdef` (Assembly Definition) | Isolate plugin code into its own assembly | Place an `.asmdef` in the plugin's `Editor/` folder. Speeds up recompilation and prevents namespace pollution. Reference `UnityEditor` and `UnityEngine` assemblies. |
| Vitest | Test the TypeScript HTTP client | Already in the project. Add tests for the client module. |

## Core Architecture Decisions

### 1. HttpListener Threading Model (CRITICAL)

**Confidence: HIGH** (well-established pattern since .NET Framework 2.0; works identically in Unity's Mono and IL2CPP runtimes for Editor)

Unity's main thread owns all UnityEngine and UnityEditor APIs. Calling them from a background thread causes crashes or undefined behavior. HttpListener receives requests on ThreadPool threads.

**Pattern: Background receive, main-thread dispatch**

```csharp
// Simplified architecture
public class GameKitServer
{
    private HttpListener _listener;
    private readonly ConcurrentQueue<HttpListenerContext> _pendingRequests
        = new ConcurrentQueue<HttpListenerContext>();

    // Called from InitializeOnLoad or menu item
    public void Start(int port = 6850)
    {
        _listener = new HttpListener();
        _listener.Prefixes.Add($"http://localhost:{port}/");
        _listener.Start();
        _listener.BeginGetContext(OnRequestReceived, null);

        // Hook into editor update loop for main-thread processing
        EditorApplication.update += ProcessPendingRequests;
    }

    // Runs on ThreadPool thread
    private void OnRequestReceived(IAsyncResult result)
    {
        if (!_listener.IsListening) return;
        var context = _listener.EndGetContext(result);
        _pendingRequests.Enqueue(context);
        _listener.BeginGetContext(OnRequestReceived, null); // Listen for next
    }

    // Runs on main thread via EditorApplication.update
    private void ProcessPendingRequests()
    {
        while (_pendingRequests.TryDequeue(out var context))
        {
            HandleRequest(context); // Safe to call Unity APIs here
        }
    }
}
```

**Why this approach:**
- `EditorApplication.update` fires every editor frame (~100Hz in active editor, lower when idle)
- All Unity API calls happen on main thread -- no threading violations
- `ConcurrentQueue<T>` is lock-free for single-producer/single-consumer patterns
- HttpListener stays responsive on its own thread

### 2. Port Selection Strategy

**Confidence: MEDIUM** (standard pattern, but port conflicts are environment-specific)

| Approach | Port | Rationale |
|----------|------|-----------|
| Default | `6850` | High port, unlikely to conflict with common services. Easy to remember. |
| Fallback | `6851-6859` | Try 10 ports sequentially if default is taken (multiple Unity instances) |
| Discovery | Write port to `{ProjectRoot}/.gamekit-port` | CLI reads this file to know which port to connect to |

**Why a port file, not a fixed port:**
- Users may run multiple Unity Editor instances
- Each instance needs its own port
- The CLI needs to discover which port to use for the current project
- Port file lives in the Unity project root (same directory as `.mcp.json` today)

### 3. Request/Response Protocol

**Confidence: HIGH** (simple REST-like HTTP is well-understood)

**Design: Simple JSON-over-HTTP with flat routing**

```
POST /api/editor/play         -- Enter play mode
POST /api/editor/stop         -- Exit play mode
POST /api/editor/pause        -- Pause play mode
GET  /api/editor/state        -- Get editor state (isPlaying, isCompiling, etc.)

POST /api/assets/refresh      -- Trigger AssetDatabase.Refresh()
GET  /api/assets/find?query=  -- Search assets by name/type

GET  /api/console/logs?count=50&types=error,warning  -- Get recent logs
POST /api/console/clear       -- Clear console

GET  /api/scene/hierarchy     -- Get full scene hierarchy as JSON
GET  /api/scene/object?name=  -- Get specific GameObject details
POST /api/scene/object        -- Create/modify/delete GameObjects

POST /api/screenshot          -- Capture and return screenshot (PNG bytes or base64)
GET  /api/screenshot/latest   -- Get most recent screenshot

POST /api/build               -- Trigger a build
GET  /api/build/status        -- Check build progress

GET  /api/ping                -- Health check (returns server version, Unity version)
```

**Response format:**
```json
{
    "success": true,
    "data": { ... },
    "error": null
}
```

**Error format:**
```json
{
    "success": false,
    "data": null,
    "error": { "code": "COMPILE_ERROR", "message": "..." }
}
```

## Unity Editor APIs by Capability

### Play Mode Control

**Confidence: HIGH** (stable APIs since Unity 5)

| API | Usage |
|-----|-------|
| `EditorApplication.isPlaying` | Get/set play mode state. Setting to `true` enters play mode. |
| `EditorApplication.isPaused` | Get/set pause state during play mode. |
| `EditorApplication.isCompiling` | Read-only. Check if scripts are compiling. |
| `EditorApplication.EnterPlaymode()` | Enter play mode (Unity 2019.3+). Preferred over setting `isPlaying = true`. |
| `EditorApplication.ExitPlaymode()` | Exit play mode (Unity 2019.3+). |
| `EditorApplication.playModeStateChanged` | Event fired when play mode state changes. Use to track transitions. |

### Screenshot Capture

**Confidence: HIGH** (stable API)

| API | Usage |
|-----|-------|
| `ScreenCapture.CaptureScreenshotAsTexture()` | Captures game view as `Texture2D`. Must be called during play mode or with a visible Game view. |
| `Camera.Render()` + `RenderTexture` | Render a specific camera to a texture. Works in edit mode. More reliable for automated capture. |
| `Texture2D.EncodeToPNG()` | Convert captured texture to PNG bytes for HTTP response. |
| `EditorWindow.GetWindow<GameView>()` | Focus/show the Game view window before capture. Internal type, access via reflection. |

**Recommended approach:** Use `Camera.main` or a tagged camera, render to `RenderTexture`, read pixels into `Texture2D`, encode to PNG. This works in both edit and play mode without requiring a visible Game view.

```csharp
public static byte[] CaptureScreenshot(int width = 1920, int height = 1080)
{
    var camera = Camera.main;
    if (camera == null) return null;

    var rt = new RenderTexture(width, height, 24);
    camera.targetTexture = rt;
    camera.Render();

    RenderTexture.active = rt;
    var tex = new Texture2D(width, height, TextureFormat.RGB24, false);
    tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
    tex.Apply();

    camera.targetTexture = null;
    RenderTexture.active = null;
    Object.DestroyImmediate(rt);

    byte[] png = tex.EncodeToPNG();
    Object.DestroyImmediate(tex);
    return png;
}
```

### Console Log Interception

**Confidence: HIGH** (stable callback since Unity 5)

| API | Usage |
|-----|-------|
| `Application.logMessageReceived` | Callback: `(string condition, string stackTrace, LogType type)`. Fires on main thread for all `Debug.Log/Warning/Error` calls. |
| `Application.logMessageReceivedThreaded` | Same but fires on the originating thread. Use if you want to capture logs from background threads. |
| `LogType` enum | `Log`, `Warning`, `Error`, `Assert`, `Exception` |

**Implementation:** Subscribe to `Application.logMessageReceived` on server startup. Store logs in a circular buffer (e.g., last 500 entries). Expose via `GET /api/console/logs` with optional type filtering.

```csharp
public class ConsoleLogBuffer
{
    private readonly Queue<LogEntry> _logs = new Queue<LogEntry>();
    private const int MaxEntries = 500;

    public void Initialize()
    {
        Application.logMessageReceived += OnLogMessage;
    }

    private void OnLogMessage(string condition, string stackTrace, LogType type)
    {
        _logs.Enqueue(new LogEntry {
            message = condition,
            stackTrace = stackTrace,
            type = type.ToString(),
            timestamp = DateTime.UtcNow.ToString("o")
        });
        while (_logs.Count > MaxEntries) _logs.Dequeue();
    }
}
```

### Scene Hierarchy & GameObject Manipulation

**Confidence: HIGH** (core Editor APIs, stable for years)

| API | Usage |
|-----|-------|
| `EditorSceneManager.GetActiveScene()` | Get the currently active scene |
| `EditorSceneManager.OpenScene(path)` | Open a scene by asset path |
| `EditorSceneManager.SaveScene(scene)` | Save the current scene |
| `EditorSceneManager.NewScene(setup)` | Create a new empty scene |
| `scene.GetRootGameObjects()` | Get all root-level GameObjects |
| `GameObject.Find(name)` | Find a GameObject by name |
| `transform.GetChild(i)` / `childCount` | Traverse hierarchy |
| `GameObject.GetComponents<T>()` | Get all components on an object |
| `GameObject.AddComponent<T>()` | Add a component |
| `Object.DestroyImmediate(obj)` | Delete an object in Editor (not `Destroy()` which is for play mode) |
| `new GameObject(name)` | Create a new GameObject |
| `PrefabUtility.InstantiatePrefab()` | Instantiate a prefab in the scene |
| `Undo.RegisterCreatedObjectUndo()` | Register for Editor undo system |
| `EditorUtility.SetDirty(obj)` | Mark object as modified (triggers save) |
| `Selection.activeGameObject` | Get/set the currently selected object |

**Hierarchy serialization pattern:**
```csharp
public static JObject SerializeHierarchy(Scene scene)
{
    var roots = scene.GetRootGameObjects();
    var arr = new JArray();
    foreach (var root in roots)
        arr.Add(SerializeGameObject(root));
    return new JObject { ["scene"] = scene.name, ["objects"] = arr };
}

private static JObject SerializeGameObject(GameObject go)
{
    var obj = new JObject
    {
        ["name"] = go.name,
        ["active"] = go.activeSelf,
        ["tag"] = go.tag,
        ["layer"] = LayerMask.LayerToName(go.layer),
        ["components"] = new JArray(
            go.GetComponents<Component>()
              .Where(c => c != null)
              .Select(c => c.GetType().Name)
        )
    };
    if (go.transform.childCount > 0)
    {
        var children = new JArray();
        for (int i = 0; i < go.transform.childCount; i++)
            children.Add(SerializeGameObject(go.transform.GetChild(i).gameObject));
        obj["children"] = children;
    }
    return obj;
}
```

### Asset Management

**Confidence: HIGH** (stable Editor API)

| API | Usage |
|-----|-------|
| `AssetDatabase.Refresh()` | Reimport changed assets, trigger recompilation |
| `AssetDatabase.ImportAsset(path)` | Import a specific asset |
| `AssetDatabase.FindAssets(filter)` | Search assets by name, type, label |
| `AssetDatabase.GetAssetPath(obj)` | Get the asset path of an object |
| `AssetDatabase.LoadAssetAtPath<T>(path)` | Load an asset by path |
| `AssetDatabase.CreateAsset(obj, path)` | Create a new asset file |
| `AssetDatabase.DeleteAsset(path)` | Delete an asset |
| `AssetDatabase.MoveAsset(old, new)` | Move/rename an asset |

### Build

**Confidence: HIGH** (stable API)

| API | Usage |
|-----|-------|
| `BuildPipeline.BuildPlayer(options)` | Trigger a player build with `BuildPlayerOptions` |
| `BuildPlayerOptions` | Struct: `scenes`, `locationPathName`, `target`, `options` |
| `EditorBuildSettings.scenes` | Get/set the scenes included in build |
| `BuildTarget` enum | `StandaloneWindows64`, `StandaloneOSX`, `WebGL`, etc. |

### Compilation / Refresh

**Confidence: HIGH** (stable API)

| API | Usage |
|-----|-------|
| `AssetDatabase.Refresh()` | Trigger a full refresh (detects file changes, recompiles scripts) |
| `CompilationPipeline.RequestScriptCompilation()` | Explicitly request script recompilation (Unity 2019.3+) |
| `CompilationPipeline.compilationFinished` | Event fired when compilation completes |
| `EditorApplication.isCompiling` | Poll to check if compilation is in progress |

## Server Lifecycle

### Initialization

**Confidence: HIGH** (standard Unity Editor pattern)

Use `[InitializeOnLoad]` attribute to start the server when Unity loads the Editor assembly:

```csharp
[InitializeOnLoad]
public static class GameKitServerBootstrap
{
    static GameKitServerBootstrap()
    {
        // Delay start to after Editor is fully initialized
        EditorApplication.delayCall += () =>
        {
            GameKitServer.Instance.Start();
        };
    }
}
```

**Why `[InitializeOnLoad]`:**
- Runs automatically when Unity loads/recompiles scripts
- No user action needed (no menu item to click)
- Survives domain reloads (re-runs after recompilation)

**Domain Reload handling:** Unity reloads the C# domain on every script recompilation. The server must handle this gracefully:
1. `[InitializeOnLoad]` re-runs, restarting the server
2. Use `AssemblyReloadEvents.beforeAssemblyReload` to cleanly stop the listener
3. Use `AssemblyReloadEvents.afterAssemblyReload` or re-entry via `[InitializeOnLoad]` to restart

```csharp
[InitializeOnLoad]
public static class GameKitServerLifecycle
{
    static GameKitServerLifecycle()
    {
        AssemblyReloadEvents.beforeAssemblyReload += OnBeforeReload;
        EditorApplication.quitting += OnEditorQuitting;
        EditorApplication.delayCall += () => GameKitServer.Instance.Start();
    }

    private static void OnBeforeReload()
    {
        GameKitServer.Instance.Stop();
    }

    private static void OnEditorQuitting()
    {
        GameKitServer.Instance.Stop();
    }
}
```

### Shutdown

Stop the HttpListener and unsubscribe from events:
- `EditorApplication.quitting` -- Editor is closing
- `AssemblyReloadEvents.beforeAssemblyReload` -- Scripts recompiling
- Explicit menu item "GameKit > Stop Server" as fallback

## CLI-Side HTTP Client

### Pattern

**Confidence: HIGH** (matches existing codebase patterns)

The CLI already uses Node.js built-in `https` for GitHub API calls (in `src/utils/updater.ts`). Use the same pattern with `http` for local Unity communication.

```typescript
// src/utils/bridge.ts
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_PORT = 6850;
const TIMEOUT_MS = 30000; // 30s for most operations
const BUILD_TIMEOUT_MS = 300000; // 5min for builds

export function getUnityPort(projectPath: string): number {
    const portFile = path.join(projectPath, '.gamekit-port');
    if (fs.existsSync(portFile)) {
        return parseInt(fs.readFileSync(portFile, 'utf-8').trim(), 10);
    }
    return DEFAULT_PORT;
}

export function unityRequest(
    projectPath: string,
    method: string,
    endpoint: string,
    body?: object
): Promise<{ success: boolean; data: any; error: any }> {
    const port = getUnityPort(projectPath);
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port,
            path: `/api/${endpoint}`,
            method,
            headers: { 'Content-Type': 'application/json' },
            timeout: TIMEOUT_MS,
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { reject(new Error(`Invalid JSON from Unity: ${data}`)); }
            });
        });
        req.on('error', (err) => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('Unity request timed out')); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}
```

### Connection Health Check

Before sending commands, verify Unity is reachable:

```typescript
export async function isUnityReachable(projectPath: string): Promise<boolean> {
    try {
        const result = await unityRequest(projectPath, 'GET', 'ping');
        return result.success === true;
    } catch {
        return false;
    }
}
```

## Installation / Packaging

### Plugin File Structure in Template

```
template/
  Packages/
    com.gamekit.bridge/
      package.json           # Unity package manifest
      Editor/
        GameKitBridge.asmdef # Assembly definition (Editor-only)
        GameKitServer.cs     # HttpListener server + routing
        ConsoleLogBuffer.cs  # Log interception + circular buffer
        ScreenshotCapture.cs # Camera render to PNG
        SceneInspector.cs    # Hierarchy serialization + manipulation
        BuildRunner.cs       # Build pipeline wrapper
        ServerLifecycle.cs   # InitializeOnLoad + domain reload handling
```

**Why a Unity Package (not loose scripts in Assets/):**
- Clean install/uninstall via Unity Package Manager
- Assembly definition isolates compilation
- `package.json` declares Unity version compatibility
- Can be referenced by path in `Packages/manifest.json` as a local package
- Prevents users from accidentally modifying plugin code

**package.json for Unity package:**
```json
{
    "name": "com.gamekit.bridge",
    "version": "1.0.0",
    "displayName": "GameKit Bridge",
    "description": "HTTP bridge between GameKit CLI and Unity Editor",
    "unity": "2020.3",
    "dependencies": {
        "com.unity.nuget.newtonsoft-json": "3.0.0"
    },
    "keywords": ["gamekit", "cli", "bridge"],
    "author": { "name": "Normal" }
}
```

### Integration with `gamekit init`

During `gamekit init`, the CLI:
1. Copies `template/Packages/com.gamekit.bridge/` to `{project}/Packages/com.gamekit.bridge/`
2. Adds `"com.gamekit.bridge": "file:com.gamekit.bridge"` to `Packages/manifest.json`
3. Removes the old MCP package reference (`com.codemaestroai.advancedunitymcp`)
4. Removes `.mcp.json` (no longer needed)
5. Unity auto-imports the local package on next Editor focus

This replaces the current `addMcpToManifest()` + `generateMcpConfig()` flow.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `HttpListener` | `TcpListener` + manual HTTP parsing | HttpListener handles HTTP parsing, headers, content-length, keep-alive. Reimplementing HTTP is error-prone and unnecessary. |
| `HttpListener` | Embedded web server library (e.g., EmbedIO, NanoHTTPD) | External dependency. Violates "no external C# dependencies" constraint. HttpListener is sufficient for this use case. |
| `HttpListener` | Unity's built-in `UnityWebServer` (internal) | Internal/undocumented API. Not guaranteed stable across Unity versions. |
| `HttpListener` | Named pipes / Unix domain sockets | Not cross-platform (named pipes are Windows-specific; Unix sockets don't exist on Windows). HTTP is simpler to debug (curl, browser). |
| `HttpListener` | WebSocket server | Bidirectional streaming is not needed. CLI sends request, waits for response. HTTP request/response fits perfectly. WebSocket adds complexity without benefit. |
| `Newtonsoft.Json` | `JsonUtility` (Unity built-in) | `JsonUtility` cannot serialize dictionaries, doesn't handle null values well, requires `[Serializable]` on all types, and can't deserialize into dynamic structures. Newtonsoft is far more flexible for HTTP API payloads. |
| `Newtonsoft.Json` | `System.Text.Json` | Not available in Unity's Mono/.NET runtime. Would require external DLL. Newtonsoft ships with Unity. |
| Node `http` module | `fetch` (Bun global) | Would work, but `http` matches existing codebase pattern (`updater.ts` uses `https`). Consistency matters. Also `fetch` is less flexible for timeout control in Node <20. |
| Node `http` module | `axios`, `got`, `undici` | External dependency. The CLI currently has zero HTTP client dependencies. No need to add one for simple local requests. |
| Port file discovery | mDNS / Bonjour | Massively overcomplicated for localhost communication. Port file is simple, reliable, zero-dependency. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `UnityWebRequest` | This is for making HTTP *requests* from Unity (client), not for *serving* HTTP (server). | `HttpListener` for the server. |
| `EditorUtility.DisplayDialog()` in request handlers | Blocks the editor on the main thread, which blocks the HTTP response. | Return error responses as JSON. Log to console. |
| `Thread.Sleep()` in Editor code | Freezes the entire Editor UI. | Use `EditorApplication.delayCall`, `EditorApplication.update`, or coroutine-style patterns. |
| `Destroy()` in Editor mode | `Destroy()` is for play mode. In Editor mode it logs errors and doesn't work reliably. | `DestroyImmediate()` in Editor code. |
| `PlayerPrefs` for server state | PlayerPrefs is for runtime game data, persists in registry (Windows) or plist (Mac). | `EditorPrefs` or a JSON config file in `Library/` for editor-time settings. |
| `Resources.Load()` in Editor | Slower, doesn't support all asset types, limited to `Resources/` folder. | `AssetDatabase.LoadAssetAtPath<T>()` in Editor code. |
| `MonoBehaviour` for the server | Server needs to run in Editor without a scene object. MonoBehaviour requires a GameObject. | Static class with `[InitializeOnLoad]` or `ScriptableObject`-based singleton. |
| MCP relay (`advanced-unity-mcp`) | Third-party dependency, complex relay architecture, requires external process, less reliable. This is what we are replacing. | Direct HTTP bridge (this design). |

## Stack Patterns by Variant

**If targeting Unity 2020-2021 (older LTS):**
- `Newtonsoft.Json` may not be auto-included. Add `"com.unity.nuget.newtonsoft-json": "3.0.0"` to the package dependencies.
- `EditorApplication.EnterPlaymode()` is available (added in 2019.3).
- `CompilationPipeline.RequestScriptCompilation()` is available.
- Use `#if UNITY_2020_1_OR_NEWER` preprocessor guards if any API differs.

**If targeting Unity 6 (6000.x):**
- All APIs listed above work identically.
- Unity 6 uses a newer .NET runtime but `HttpListener` remains available.
- Newtonsoft.Json is bundled by default.
- No code changes needed -- the same plugin works across Unity 2020 through Unity 6.

**If multiple Unity instances on same machine:**
- Server must try multiple ports and write the chosen port to `.gamekit-port`
- CLI reads `.gamekit-port` from the project root
- Consider adding the project path to the port file for validation

## Version Compatibility

| Component | Compatible With | Notes |
|-----------|-----------------|-------|
| `HttpListener` | Unity 2020.3+ through Unity 6 (6000.x) | Uses .NET Standard 2.1 / .NET 4.x scripting backend. Both Mono and IL2CPP Editor runtimes support it. |
| `Newtonsoft.Json` (com.unity.nuget.newtonsoft-json) | Unity 2020.3+ | Package version 3.0.0+ recommended. Auto-included in Unity 2022+. For 2020-2021, declare as package dependency. |
| `EditorApplication.EnterPlaymode()` | Unity 2019.3+ | Safe for our 2020+ minimum. |
| `CompilationPipeline.RequestScriptCompilation()` | Unity 2019.3+ | Safe for our 2020+ minimum. In `UnityEditor.Compilation` namespace. |
| `AssemblyReloadEvents` | Unity 2017.3+ | Safe for our 2020+ minimum. Critical for domain reload handling. |
| `ScreenCapture.CaptureScreenshotAsTexture()` | Unity 2019.1+ | Safe for our 2020+ minimum. |
| Node.js `http` module | Node 18+ | Matches existing engine requirement in `package.json`. |

## Security Considerations

**Confidence: MEDIUM** (standard localhost security patterns, but worth calling out explicitly)

| Concern | Mitigation |
|---------|------------|
| Remote access to Editor | Bind HttpListener to `http://localhost:{port}/` only. Never `http://+:{port}/` or `http://*:{port}/`. |
| Port scanning | Server only responds to requests with correct project-specific token (optional: generate a random token at startup, write to `.gamekit-token`, CLI includes in `Authorization` header). |
| Malicious payloads | Validate all input JSON. Reject unknown endpoints with 404. Limit request body size. |
| SSRF via asset paths | Validate all file paths stay within the Unity project directory. No `../` traversal. |
| Denial of service | Rate-limit requests (reasonable: 100/sec). Timeout long operations. |

For a localhost-only developer tool, binding to `localhost` is the primary defense. The token-based auth is optional but recommended for defense-in-depth.

## Sources

- Unity Editor API knowledge: Based on training data through early 2025. Unity's Editor APIs (`EditorApplication`, `EditorSceneManager`, `AssetDatabase`, `BuildPipeline`, `ScreenCapture`, `Application.logMessageReceived`) have been stable since Unity 2020 and are not known to have breaking changes through Unity 6.
- `HttpListener`: Part of .NET Standard 2.1, shipped with all Unity versions 2020+. Well-documented in Microsoft .NET documentation.
- `Newtonsoft.Json` in Unity: Shipped as `com.unity.nuget.newtonsoft-json` package since Unity 2020.
- Existing codebase patterns: Analyzed from `/Users/teis/Documents/gamekit-cli/src/utils/` (particularly `updater.ts` for HTTP client patterns, `mcp.ts` for current MCP approach being replaced, `assets.ts` for existing C# Editor script patterns).

**Confidence caveat:** WebSearch and WebFetch were unavailable during this research session. All Unity API claims are based on training data knowledge. The APIs listed are long-standing stable APIs, but specific parameter signatures or minor behavioral changes in Unity 6 could not be verified against live documentation. **Recommend validating `HttpListener` behavior in a Unity 6 Editor test project before committing to implementation.**

---
*Stack research for: CLI-to-Unity-Editor HTTP bridge*
*Researched: 2026-02-09*
