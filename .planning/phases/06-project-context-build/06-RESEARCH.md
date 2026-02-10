# Phase 6: Project Context & Build - Research

**Researched:** 2026-02-10
**Domain:** Unity Editor scripting -- AssetDatabase queries, project settings reading, BuildPipeline build automation, TestRunnerApi test execution
**Confidence:** HIGH

## Summary

Phase 6 adds three capabilities: (1) project asset listing (scripts, scenes, prefabs), (2) project settings reading (layers, tags, physics, quality, input), and (3) build/test automation. The eight requirements (PROJ-01 through PROJ-08) map to well-documented Unity Editor APIs. The project listing and settings reading are straightforward read-only operations using `AssetDatabase.FindAssets`, `InternalEditorUtility.tags/layers`, `Physics.*`, `QualitySettings.*`, and `SerializedObject` on `InputManager.asset`. These follow the exact same handler/service/command pattern established across Phases 1-5.

The build and test operations are architecturally different because they are **long-running**: builds can take minutes and `BuildPipeline.BuildPlayer` blocks the main thread until complete, while PlayMode tests trigger domain reloads that destroy registered callbacks. The key design challenge is handling these long-running operations within the existing HTTP request-response model where the main thread is blocked during builds (preventing the HTTP response from being sent until the build finishes). For builds, the synchronous nature of `BuildPipeline.BuildPlayer` means the HTTP request will naturally block until the build completes and then return the `BuildReport` -- the CLI just needs a very long timeout. For tests, the `TestRunnerApi` is callback-based and asynchronous, requiring a pattern where the handler starts the test run, collects results via callbacks, and exposes a polling endpoint for the CLI to retrieve results.

The scene listing already exists (`SceneService.ListScenes`, `GET /api/scene/list`, `gamekit scene list`) from Phase 4. The CLI success criterion says `gamekit list scenes` -- this means restructuring the CLI to have a unified `gamekit list` command with subcommands (scripts, scenes, prefabs), while the scene listing Unity-side endpoint can be reused directly.

**Primary recommendation:** For Plan 06-01 (listing + settings), create a new `ProjectService` with methods for listing scripts, prefabs, and reading settings, plus corresponding `ListHandler` and `SettingsHandler`. Reuse the existing scene list endpoint from Phase 4 under the new `gamekit list scenes` CLI command. For Plan 06-02 (build), create a `BuildService` and `BuildHandler` that calls `BuildPipeline.BuildPlayer` synchronously on the main thread (the HTTP response naturally blocks until completion), with the CLI using a very long timeout (10+ minutes). For Plan 06-03 (test), create a `TestService` with `TestRunnerApi` that collects results via `ICallbacks`, stores them in static state, and exposes start + poll endpoints.

## Standard Stack

### Core (already in project -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Commander.js | ^12.1.0 | CLI command registration | Already used for all commands |
| Newtonsoft.Json | (Unity built-in) | JSON serialization in Unity plugin | Already used in all handlers |
| fetch (Bun built-in) | N/A | HTTP client in CLI | Already used via `bridge.ts` |

### Unity Editor APIs Used

| API | Namespace | Purpose | Stability |
|-----|-----------|---------|-----------|
| `AssetDatabase.FindAssets("t:Script")` | UnityEditor | Find all C# scripts in project | Stable, well-documented |
| `AssetDatabase.FindAssets("t:Prefab")` | UnityEditor | Find all prefabs in project | Stable, well-documented |
| `AssetDatabase.GUIDToAssetPath(guid)` | UnityEditor | Convert GUID to asset path | Stable, well-documented |
| `InternalEditorUtility.tags` | UnityEditorInternal | Get all project tags | Stable (public static, used by TagManagerInspector) |
| `InternalEditorUtility.layers` | UnityEditorInternal | Get all project layers | Stable (public static, used by TagManagerInspector) |
| `SortingLayer.layers` | UnityEngine | Get all sorting layers | Stable, public API |
| `Physics.gravity` | UnityEngine | Read physics gravity setting | Stable, public static |
| `Physics.defaultContactOffset` | UnityEngine | Read physics contact offset | Stable, public static |
| `Physics.bounceThreshold` | UnityEngine | Read physics bounce threshold | Stable, public static |
| `Physics.defaultSolverIterations` | UnityEngine | Read solver iterations | Stable, public static |
| `QualitySettings.names` | UnityEngine | Get all quality level names | Stable, public static |
| `QualitySettings.GetQualityLevel()` | UnityEngine | Get current quality level index | Stable, public static |
| `BuildPipeline.BuildPlayer(opts)` | UnityEditor | Trigger a player build | Stable, returns BuildReport |
| `BuildReport.summary` | UnityEditor.Build.Reporting | Build outcome, size, errors, warnings | Stable |
| `TestRunnerApi.Execute(settings)` | UnityEditor.TestTools.TestRunner.Api | Run tests programmatically | Stable (Test Framework 1.1+) |
| `TestRunnerApi.RegisterCallbacks(cb)` | UnityEditor.TestTools.TestRunner.Api | Receive test results | Stable |
| `ITestResultAdaptor` | UnityEditor.TestTools.TestRunner.Api | Individual test result data | Stable |
| `EditorBuildSettings.scenes` | UnityEditor | Get scenes in build settings | Stable |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `InternalEditorUtility.tags/layers` | `SerializedObject` on `TagManager.asset` | InternalEditorUtility is simpler (one-liner); SerializedObject requires manual property traversal |
| `Physics.*` static properties | `SerializedObject` on `DynamicsManager.asset` | Static properties are simpler; SerializedObject would give access to ALL settings including undocumented ones |
| Synchronous build with long timeout | Async build with polling | BuildPipeline.BuildPlayer is inherently synchronous and blocks the main thread; async polling adds complexity for no benefit since the editor is frozen during build anyway |
| `TestRunnerApi` callbacks | `runSynchronously` flag on `ExecutionSettings` | `runSynchronously` only works for EditMode tests and filters out multi-frame tests; callback approach works for both EditMode and PlayMode |
| `AssetDatabase.FindAssets("t:Script")` | `AssetDatabase.FindAssets("t:MonoScript")` | Both work; "t:Script" is the shorter form; they return the same results |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure (new files only)

```
template/Editor/GameKit/
├── Handlers/
│   ├── ListHandler.cs              # NEW: GET /api/list/scripts, /api/list/prefabs
│   ├── SettingsHandler.cs          # NEW: GET /api/settings
│   ├── BuildHandler.cs             # NEW: POST /api/build
│   └── TestHandler.cs              # NEW: POST /api/test/run, GET /api/test/status
├── Services/
│   ├── ProjectService.cs           # NEW: asset queries + settings reading
│   ├── BuildService.cs             # NEW: build trigger + report extraction
│   └── TestService.cs              # NEW: TestRunnerApi wrapper + result collection

src/
├── commands/
│   ├── list.ts                     # NEW: gamekit list scripts|scenes|prefabs
│   ├── settings.ts                 # NEW: gamekit settings
│   ├── build.ts                    # NEW: gamekit build --platform <target>
│   └── test.ts                     # NEW: gamekit test [--editmode|--playmode]
```

### Pattern 1: Asset Listing via AssetDatabase.FindAssets (NEW)

**What:** Use `AssetDatabase.FindAssets("t:TYPE")` to find all assets of a given type, then `GUIDToAssetPath` to get paths.
**When to use:** All three listing commands (scripts, prefabs, scenes).
**Source:** [Unity docs: AssetDatabase.FindAssets](https://docs.unity3d.com/ScriptReference/AssetDatabase.FindAssets.html)
**Example:**
```csharp
// Source: Unity docs - AssetDatabase.FindAssets
public static object ListScripts()
{
    var guids = AssetDatabase.FindAssets("t:Script");
    var scripts = new List<object>();

    foreach (var guid in guids)
    {
        var path = AssetDatabase.GUIDToAssetPath(guid);
        // Filter to project scripts only (exclude Packages/)
        if (!path.StartsWith("Assets/")) continue;
        if (!path.EndsWith(".cs")) continue;

        scripts.Add(new
        {
            path,
            name = Path.GetFileNameWithoutExtension(path)
        });
    }

    return scripts;
}

public static object ListPrefabs()
{
    var guids = AssetDatabase.FindAssets("t:Prefab");
    var prefabs = new List<object>();

    foreach (var guid in guids)
    {
        var path = AssetDatabase.GUIDToAssetPath(guid);
        if (!path.StartsWith("Assets/")) continue;

        prefabs.Add(new
        {
            path,
            name = Path.GetFileNameWithoutExtension(path)
        });
    }

    return prefabs;
}
```

### Pattern 2: Project Settings via Static APIs (NEW)

**What:** Read project settings from public static Unity APIs rather than parsing YAML files.
**When to use:** The `settings` command.
**Source:** [Unity docs: InternalEditorUtility](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/InternalEditorUtility.bindings.cs), [Physics](https://docs.unity3d.com/ScriptReference/Physics.html), [QualitySettings](https://docs.unity3d.com/ScriptReference/QualitySettings.html)
**Example:**
```csharp
// Source: Unity APIs - InternalEditorUtility, Physics, QualitySettings
using UnityEditorInternal;

public static object GetSettings()
{
    return new
    {
        layers = InternalEditorUtility.layers,
        tags = InternalEditorUtility.tags,
        sortingLayers = SortingLayer.layers.Select(l => new { l.name, l.id, l.value }).ToArray(),
        physics = new
        {
            gravity = new { x = Physics.gravity.x, y = Physics.gravity.y, z = Physics.gravity.z },
            defaultContactOffset = Physics.defaultContactOffset,
            bounceThreshold = Physics.bounceThreshold,
            defaultSolverIterations = Physics.defaultSolverIterations,
            defaultSolverVelocityIterations = Physics.defaultSolverVelocityIterations
        },
        quality = new
        {
            levels = QualitySettings.names,
            current = QualitySettings.GetQualityLevel(),
            currentName = QualitySettings.names[QualitySettings.GetQualityLevel()]
        }
    };
}
```

### Pattern 3: Input Settings via SerializedObject (NEW)

**What:** Read input axes from `InputManager.asset` using `SerializedObject` since there is no direct public API.
**When to use:** The `settings` command, input section.
**Source:** [Blog: Manipulating Input Manager](https://plyoung.appspot.com/blog/manipulating-input-manager-in-script.html)
**Example:**
```csharp
// Source: SerializedObject on InputManager.asset
public static object GetInputSettings()
{
    var inputManager = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/InputManager.asset")[0];
    var so = new SerializedObject(inputManager);
    var axes = so.FindProperty("m_Axes");

    var result = new List<object>();
    for (int i = 0; i < axes.arraySize; i++)
    {
        var axis = axes.GetArrayElementAtIndex(i);
        result.Add(new
        {
            name = axis.FindPropertyRelative("m_Name").stringValue,
            positiveButton = axis.FindPropertyRelative("positiveButton").stringValue,
            negativeButton = axis.FindPropertyRelative("negativeButton").stringValue,
            type = axis.FindPropertyRelative("type").intValue
        });
    }

    return result;
}
```

### Pattern 4: Synchronous Build with Long Timeout (NEW)

**What:** `BuildPipeline.BuildPlayer` is synchronous and blocks the main thread. The HTTP request dispatched via `MainThreadDispatcher.Invoke()` naturally blocks until the build completes. The CLI sets a very long timeout.
**When to use:** The `build` command.
**Source:** [Unity docs: BuildPipeline.BuildPlayer](https://docs.unity3d.com/ScriptReference/BuildPipeline.BuildPlayer.html)
**Example:**
```csharp
// Source: Unity docs - BuildPipeline, BuildReport
public static object Build(string platform, string outputPath)
{
    var target = ParseBuildTarget(platform);

    var scenes = EditorBuildSettings.scenes
        .Where(s => s.enabled)
        .Select(s => s.path)
        .ToArray();

    if (scenes.Length == 0)
        throw new Exception("No scenes enabled in Build Settings");

    var options = new BuildPlayerOptions
    {
        scenes = scenes,
        locationPathName = outputPath,
        target = target,
        options = BuildOptions.None
    };

    // This blocks until build completes (can take minutes)
    var report = BuildPipeline.BuildPlayer(options);
    var summary = report.summary;

    return new
    {
        result = summary.result.ToString(),
        platform = summary.platform.ToString(),
        outputPath = summary.outputPath,
        totalSize = summary.totalSize,
        totalTime = summary.totalTime.TotalSeconds,
        totalErrors = summary.totalErrors,
        totalWarnings = summary.totalWarnings,
        errors = report.SummarizeErrors()
    };
}
```

### Pattern 5: Async Test Execution with Polling (NEW)

**What:** `TestRunnerApi` is async and callback-based. Tests (especially PlayMode) can trigger domain reloads. Use `[InitializeOnLoadMethod]` for callback persistence and a static results store with a poll endpoint.
**When to use:** The `test` command.
**Source:** [Unity docs: TestRunnerApi](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/api/UnityEditor.TestTools.TestRunner.Api.TestRunnerApi.html), [ICallbacks](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/manual/extension-get-test-results.html)
**Example:**
```csharp
// Source: Unity Test Framework docs - TestRunnerApi, ICallbacks
using UnityEditor.TestTools.TestRunner.Api;

public static class TestService
{
    private static bool _running;
    private static List<TestResult> _results = new List<TestResult>();
    private static string _runStatus = "idle"; // idle, running, complete

    [InitializeOnLoadMethod]
    private static void Init()
    {
        var api = ScriptableObject.CreateInstance<TestRunnerApi>();
        api.RegisterCallbacks(new TestCallbacks());
    }

    public static void RunTests(TestMode mode)
    {
        _results.Clear();
        _running = true;
        _runStatus = "running";

        var api = ScriptableObject.CreateInstance<TestRunnerApi>();
        var filter = new Filter { testMode = mode };
        api.Execute(new ExecutionSettings(filter));
    }

    public static object GetStatus()
    {
        return new
        {
            status = _runStatus,
            passed = _results.Count(r => r.status == "Passed"),
            failed = _results.Count(r => r.status == "Failed"),
            skipped = _results.Count(r => r.status == "Skipped"),
            total = _results.Count,
            results = _results
        };
    }

    private class TestCallbacks : ICallbacks
    {
        public void RunStarted(ITestAdaptor testsToRun) { }

        public void RunFinished(ITestResultAdaptor result)
        {
            _running = false;
            _runStatus = "complete";
        }

        public void TestStarted(ITestAdaptor test) { }

        public void TestFinished(ITestResultAdaptor result)
        {
            if (!result.HasChildren) // Leaf tests only
            {
                _results.Add(new TestResult
                {
                    name = result.Name,
                    fullName = result.FullName,
                    status = result.TestStatus.ToString(),
                    duration = result.Duration,
                    message = result.Message,
                    stackTrace = result.StackTrace
                });
            }
        }
    }
}
```

### Pattern 6: Unified List Command with Subcommands (CLI)

**What:** Create a `gamekit list` parent command with `scripts`, `scenes`, and `prefabs` subcommands using Commander's `.command()` nesting.
**When to use:** The CLI list command.
**Source:** Established codebase pattern (`play` command has `start`, `stop`, `status` subcommands).
**Example:**
```typescript
// Source: Established codebase pattern (play.ts, scene.ts)
export function registerListCommand(program: Command): void {
  const list = program.command('list').description('List project assets');

  list
    .command('scripts')
    .description('List all C# scripts in the project')
    .action(async () => {
      const opts = program.opts() as OutputOptions;
      const info = await getConnection(process.cwd());
      const result = await request(info.port, 'GET', '/list/scripts');
      outputSuccess(result, opts);
    });

  list
    .command('scenes')
    .description('List all scenes in the project')
    .action(async () => {
      // Reuse existing /scene/list endpoint
      const opts = program.opts() as OutputOptions;
      const info = await getConnection(process.cwd());
      const result = await request(info.port, 'GET', '/scene/list');
      outputSuccess(result, opts);
    });

  list
    .command('prefabs')
    .description('List all prefabs in the project')
    .action(async () => {
      const opts = program.opts() as OutputOptions;
      const info = await getConnection(process.cwd());
      const result = await request(info.port, 'GET', '/list/prefabs');
      outputSuccess(result, opts);
    });
}
```

### Anti-Patterns to Avoid

- **Scanning the filesystem for scripts/prefabs instead of using AssetDatabase:** `AssetDatabase.FindAssets` is the correct Unity API; filesystem scanning misses meta files, doesn't respect asset import state, and is slower.
- **Parsing ProjectSettings YAML files directly:** Use the APIs (Physics.*, QualitySettings.*, InternalEditorUtility.*). YAML parsing is fragile, undocumented in structure, and breaks across Unity versions.
- **Making build requests with the default 10-second timeout:** Builds can take 5+ minutes. The CLI must use a very long timeout (600000ms / 10 minutes minimum).
- **Trying to make BuildPipeline.BuildPlayer asynchronous:** It blocks the main thread by design. The HTTP response will naturally be delayed until the build completes. Accept this and set long timeouts.
- **Using `runSynchronously` for PlayMode tests:** The `ExecutionSettings.runSynchronously` flag only works for EditMode tests. PlayMode tests require the callback-based approach with a poll endpoint.
- **Forgetting to re-register TestRunnerApi callbacks after domain reload:** PlayMode tests trigger domain reloads that destroy ScriptableObject instances and their registered callbacks. Use `[InitializeOnLoadMethod]` to re-register on every reload.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all scripts in project | Filesystem traversal of Assets/ | `AssetDatabase.FindAssets("t:Script")` | Respects asset database, handles packages, import state |
| Finding all prefabs in project | `Directory.GetFiles("*.prefab")` | `AssetDatabase.FindAssets("t:Prefab")` | Same reasons as above |
| Reading tags/layers | Parsing TagManager.asset YAML | `InternalEditorUtility.tags/layers` | One-liner, always current, no YAML fragility |
| Reading physics settings | Parsing DynamicsManager.asset YAML | `Physics.gravity`, `Physics.defaultContactOffset`, etc. | Public API, type-safe, no YAML |
| Reading quality settings | Parsing QualitySettings.asset YAML | `QualitySettings.names`, `QualitySettings.GetQualityLevel()` | Public API, simple |
| Running tests programmatically | Invoking NUnit directly | `TestRunnerApi.Execute()` + `ICallbacks` | Official Unity API, handles EditMode + PlayMode, integrates with Unity Test Runner UI |
| Build output path extensions | Hardcoding `.exe`, `.app` | Platform-aware output path construction | Windows needs `.exe`, macOS needs `.app`, WebGL is a directory, etc. |

**Key insight:** Phase 6 is primarily about reading existing Unity state and delegating to Unity's built-in build/test systems. The complexity is in the CLI-side timeout handling and the test runner's asynchronous callback model, not in the Unity-side logic.

## Common Pitfalls

### Pitfall 1: Build Request Timeout
**What goes wrong:** The CLI's HTTP request times out before the build finishes, causing the user to see a timeout error even though the build is still running successfully in Unity.
**Why it happens:** The default `bridge.ts` timeout is 10 seconds. Builds can take minutes.
**How to avoid:** The build command must use a very long timeout (600000ms = 10 minutes). Consider making it configurable. The `request()` function in `bridge.ts` already accepts a `timeoutMs` parameter.
**Warning signs:** "Request to Unity timed out" error when running `gamekit build`.

### Pitfall 2: Build Output Path Platform Mismatch
**What goes wrong:** Build fails because the output path doesn't have the correct extension for the target platform.
**Why it happens:** `BuildPlayerOptions.locationPathName` must include the correct extension: `.exe` for Windows, `.app` for macOS, no extension for WebGL (it's a directory), `.apk` for Android.
**How to avoid:** Either (a) let the user specify the full path including extension, or (b) auto-append the correct extension based on the target platform. Recommend option (b) with the ability to override.
**Warning signs:** "Build completed with a result of 'Failed'" with no obvious error.

### Pitfall 3: No Scenes in Build Settings
**What goes wrong:** Build fails or produces an empty build because no scenes are enabled in Build Settings.
**Why it happens:** `EditorBuildSettings.scenes` may be empty or all scenes may be disabled.
**How to avoid:** Check for enabled scenes before starting the build. Return a clear error: "No scenes enabled in Build Settings. Add scenes via File > Build Settings."
**Warning signs:** Build succeeds but produces a non-functional player.

### Pitfall 4: Test Callbacks Lost on Domain Reload
**What goes wrong:** PlayMode tests trigger a domain reload (entering play mode). The TestRunnerApi ScriptableObject instance is destroyed, and callbacks are lost. Test results are never reported.
**Why it happens:** ScriptableObjects don't survive domain reloads. PlayMode tests enter play mode, which causes a domain reload by default.
**How to avoid:** Use `[InitializeOnLoadMethod]` to re-register callbacks after every domain reload. Store collected results in a static list that persists across the single-domain portion of the test run. For PlayMode tests, the `RunFinished` callback fires after play mode exits and the editor returns to edit mode.
**Warning signs:** `gamekit test` reports "running" forever and never transitions to "complete".

### Pitfall 5: EditMode vs PlayMode Test Confusion
**What goes wrong:** Running both EditMode and PlayMode tests in a single `Execute()` call may only execute EditMode tests.
**Why it happens:** Known issue documented in Unity discussions -- running both modes simultaneously can skip PlayMode tests.
**How to avoid:** Run EditMode and PlayMode tests separately with two `Execute()` calls. The CLI can default to running both sequentially: first EditMode (synchronous), then PlayMode (async with callbacks).
**Warning signs:** PlayMode tests never appear in results even though they exist.

### Pitfall 6: Including Package Scripts/Prefabs in List Results
**What goes wrong:** `gamekit list scripts` returns hundreds of scripts from Packages/ (Unity built-in packages, third-party packages) instead of just the user's project scripts.
**Why it happens:** `AssetDatabase.FindAssets` searches the entire asset database including packages.
**How to avoid:** Filter results to paths starting with "Assets/" (project assets only). Optionally support `--all` flag to include packages.
**Warning signs:** Listing returns thousands of results that are mostly Unity/package internals.

### Pitfall 7: Build Blocks HTTP Server Completely
**What goes wrong:** During a build, the HTTP server cannot respond to any other requests because `BuildPipeline.BuildPlayer` blocks the main thread, and all requests are dispatched to the main thread.
**Why it happens:** The build is synchronous on the main thread, and `MainThreadDispatcher.Invoke()` queues other requests behind it.
**How to avoid:** This is expected behavior and cannot be avoided without significant architecture changes. Document this: during a build, the gamekit server is unresponsive. The CLI should set its timeout to match the expected build duration. Other CLI commands will timeout during a build.
**Warning signs:** `gamekit play status` or other commands timeout while a build is in progress.

## Code Examples

Verified patterns from official sources and established codebase conventions:

### BuildTarget String-to-Enum Mapping (Unity side)
```csharp
// Source: Unity docs - BuildTarget enum
private static BuildTarget ParseBuildTarget(string platform)
{
    switch (platform.ToLowerInvariant())
    {
        case "windows":
        case "win":
        case "win64":
        case "standalonewindows64":
            return BuildTarget.StandaloneWindows64;
        case "mac":
        case "macos":
        case "osx":
        case "standaloneosx":
            return BuildTarget.StandaloneOSX;
        case "linux":
        case "linux64":
        case "standalonelinux64":
            return BuildTarget.StandaloneLinux64;
        case "ios":
            return BuildTarget.iOS;
        case "android":
            return BuildTarget.Android;
        case "webgl":
            return BuildTarget.WebGL;
        default:
            throw new Exception(
                $"Unknown platform: {platform}. " +
                "Supported: windows, mac, linux, ios, android, webgl");
    }
}
```

### Build Output Path Extension (Unity side)
```csharp
// Source: Unity docs - BuildPlayerOptions.locationPathName
private static string GetOutputPath(string basePath, BuildTarget target)
{
    switch (target)
    {
        case BuildTarget.StandaloneWindows64:
            return basePath.EndsWith(".exe") ? basePath : basePath + ".exe";
        case BuildTarget.StandaloneOSX:
            return basePath.EndsWith(".app") ? basePath : basePath + ".app";
        case BuildTarget.Android:
            return basePath.EndsWith(".apk") ? basePath : basePath + ".apk";
        case BuildTarget.WebGL:
        case BuildTarget.StandaloneLinux64:
        case BuildTarget.iOS:
            return basePath; // Directory-based output
        default:
            return basePath;
    }
}
```

### CLI Build Command with Long Timeout (TypeScript side)
```typescript
// Source: Established codebase pattern + long timeout for builds
export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build the Unity project')
    .requiredOption('--platform <target>', 'Target platform (windows, mac, linux, ios, android, webgl)')
    .option('--output <path>', 'Output path', 'Builds')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        // 10-minute timeout for builds
        const result = await request(
          info.port, 'POST', '/build',
          { platform: opts.platform, outputPath: opts.output },
          600000
        );
        outputSuccess(result, globalOpts);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
```

### CLI Test Command with Polling (TypeScript side)
```typescript
// Source: Established codebase pattern + polling for async results
export function registerTestCommand(program: Command): void {
  program
    .command('test')
    .description('Run Unity Test Framework tests')
    .option('--editmode', 'Run only EditMode tests')
    .option('--playmode', 'Run only PlayMode tests')
    .action(async (opts) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());

        // Start test run
        const mode = opts.editmode ? 'editmode' : opts.playmode ? 'playmode' : 'both';
        await request(info.port, 'POST', '/test/run', { mode }, 30000);

        // Poll for completion
        let status;
        do {
          await new Promise(r => setTimeout(r, 1000));
          status = await request(info.port, 'GET', '/test/status');
        } while (status.status === 'running');

        outputSuccess(status, globalOpts);
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `AssetDatabase.GetAllAssetPaths()` + manual filtering | `AssetDatabase.FindAssets("t:TYPE")` | Long-standing | FindAssets is faster with built-in type filtering |
| Parsing TagManager.asset YAML for tags/layers | `InternalEditorUtility.tags/layers` | Long-standing | Stable API, no YAML fragility |
| `TestRunnerApi.RetrieveTestList()` | `TestRunnerApi.RetrieveTestTree()` | Test Framework 1.1+ | RetrieveTestList is obsolete |
| BuildPipeline legacy overloads (`string[]`, `BuildTarget`, `BuildOptions`) | `BuildPlayerOptions` struct | Unity 2018+ | Cleaner API, more options |
| `BuildReport` basic info | `BuildReport.SummarizeErrors()` + `GetFiles()` | Unity 2020+ | Richer error reporting |
| `EditorUtility.SetDirty()` for build-related changes | Undo system | Long-standing | Not applicable to builds (read-only query) |

**Deprecated/outdated:**
- `TestRunnerApi.RetrieveTestList()` -- use `RetrieveTestTree()` instead
- Legacy `BuildPipeline.BuildPlayer(string[], string, BuildTarget, BuildOptions)` overload -- use `BuildPlayerOptions` struct overload instead
- `BuildTarget.StandaloneWindows` (32-bit) -- effectively deprecated in favor of `StandaloneWindows64`

## Open Questions

1. **Should `gamekit list scenes` reuse the existing `/api/scene/list` endpoint or create a new `/api/list/scenes`?**
   - What we know: `SceneService.ListScenes()` already returns scenes with path, name, inBuildSettings, enabled. The CLI currently has `gamekit scene list` for this.
   - What's unclear: Whether to have `gamekit list scenes` as an alias that calls the same endpoint, or create a new endpoint.
   - Recommendation: `gamekit list scenes` should call the existing `/api/scene/list` endpoint. No new Unity-side code needed for scene listing. The existing `gamekit scene list` command remains as-is for backward compatibility.

2. **Should `gamekit settings` return input axes from the old Input Manager or the new Input System?**
   - What we know: Unity has two input systems -- the old InputManager (always available) and the new Input System package (optional). The requirement says "input" without specifying which.
   - What's unclear: Whether projects use the old or new input system.
   - Recommendation: Read the old InputManager axes (always available via `ProjectSettings/InputManager.asset`). If the new Input System package is installed, also list its Input Action assets via `AssetDatabase.FindAssets("t:InputActionAsset")`. This covers both cases without requiring the new Input System as a dependency.

3. **Should builds default to a specific output directory?**
   - What we know: `BuildPlayerOptions.locationPathName` must be specified. The requirement says `gamekit build --platform <target>`.
   - What's unclear: Where to put build output.
   - Recommendation: Default to `Builds/{platform}/` under the project root (e.g., `Builds/windows/GameName.exe`). Use `PlayerSettings.productName` for the filename. Allow override with `--output <path>`.

4. **Should `gamekit test` support filtering by test name or assembly?**
   - What we know: `Filter` class supports `testNames`, `groupNames`, `assemblyNames` fields.
   - What's unclear: Whether filtering is needed for the initial implementation.
   - Recommendation: Start with mode filtering only (`--editmode`, `--playmode`, default both). Add name/assembly filtering later if needed. The `Filter` class makes this straightforward to add.

5. **How to handle the build blocking the HTTP server for other commands?**
   - What we know: During a build, `BuildPipeline.BuildPlayer` blocks the main thread. All other HTTP requests dispatched via `MainThreadDispatcher.Invoke()` will queue behind it.
   - What's unclear: Whether this is acceptable UX.
   - Recommendation: Accept this limitation. Document it. The build command should log a warning: "Build in progress. Other gamekit commands will be unavailable until build completes." In practice, Claude Code runs commands sequentially, so this is unlikely to be a user-facing issue.

## Sources

### Primary (HIGH confidence)
- [Unity docs: AssetDatabase.FindAssets](https://docs.unity3d.com/ScriptReference/AssetDatabase.FindAssets.html) - asset querying with type filters
- [Unity docs: BuildPipeline.BuildPlayer](https://docs.unity3d.com/ScriptReference/BuildPipeline.BuildPlayer.html) - build automation entry point
- [Unity docs: BuildPlayerOptions](https://docs.unity3d.com/ScriptReference/BuildPlayerOptions.html) - build configuration struct
- [Unity docs: BuildReport](https://docs.unity3d.com/ScriptReference/Build.Reporting.BuildReport.html) - build result data
- [Unity docs: BuildSummary](https://docs.unity3d.com/ScriptReference/Build.Reporting.BuildSummary.html) - build outcome, size, errors, warnings
- [Unity docs: BuildResult](https://docs.unity3d.com/ScriptReference/Build.Reporting.BuildResult.html) - enum: Unknown, Succeeded, Failed, Cancelled
- [Unity docs: BuildTarget](https://docs.unity3d.com/ScriptReference/BuildTarget.html) - platform enum values
- [Unity docs: TestRunnerApi](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/api/UnityEditor.TestTools.TestRunner.Api.TestRunnerApi.html) - programmatic test execution
- [Unity docs: ExecutionSettings](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/api/UnityEditor.TestTools.TestRunner.Api.ExecutionSettings.html) - test run configuration
- [Unity docs: ICallbacks](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/manual/extension-get-test-results.html) - test result callbacks with code examples
- [Unity docs: ITestResultAdaptor](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/manual/reference-itest-result-adaptor.html) - test result data fields
- [Unity docs: Filter](https://docs.unity3d.com/Packages/com.unity.test-framework@1.1/api/UnityEditor.TestTools.TestRunner.Api.Filter.html) - test filtering by mode/name/assembly
- [Unity docs: Physics](https://docs.unity3d.com/ScriptReference/Physics.html) - static properties for physics settings
- [Unity docs: QualitySettings](https://docs.unity3d.com/ScriptReference/QualitySettings.html) - quality level names and current level
- [Unity C# Reference: InternalEditorUtility.bindings.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/InternalEditorUtility.bindings.cs) - tags/layers public static properties
- [Unity docs: EditorBuildSettings.scenes](https://docs.unity3d.com/ScriptReference/EditorBuildSettings-scenes.html) - build settings scene list

### Secondary (MEDIUM confidence)
- [Unity Discussions: TestRunnerApi callbacks for PlayMode tests](https://discussions.unity.com/t/testrunnerapi-getting-callbacks-for-playmode-tests/778665) - domain reload callback issue, workaround with InitializeOnLoad
- [Unity Discussions: Running PlayMode tests through TestRunnerApi](https://discussions.unity.com/t/running-playmode-tests-through-testrunnerapi/934305) - confirmed EditMode+PlayMode simultaneous execution issues
- [Blog: Manipulating Input Manager in Script](https://plyoung.appspot.com/blog/manipulating-input-manager-in-script.html) - SerializedObject approach for InputManager.asset
- [Unity Issue Tracker: WebGL editor freeze after BuildPlayer](https://issuetracker.unity3d.com/issues/webgl-editor-freezes-during-recompilation-after-building-using-buildpipeline-dot-buildplayer) - confirmed BuildPlayer synchronous behavior

### Tertiary (LOW confidence)
- None. All findings verified against official Unity documentation or source code.

## Metadata

**Confidence breakdown:**
- Project listing (scripts/prefabs): HIGH - `AssetDatabase.FindAssets` is well-documented, simple, identical pattern to existing `SceneService.ListScenes`
- Project settings reading: HIGH - Public static APIs (Physics.*, QualitySettings.*, InternalEditorUtility.*) verified in Unity C# Reference source
- Build automation: HIGH - `BuildPipeline.BuildPlayer` returns `BuildReport` with all needed fields, synchronous behavior is documented
- Test runner integration: MEDIUM-HIGH - `TestRunnerApi` API is documented, but PlayMode test domain reload callbacks are a known complexity area with community-reported issues
- Architecture: HIGH - Follows exact patterns from Phases 1-5, no new infrastructure needed

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (stable Unity APIs, unlikely to change)
