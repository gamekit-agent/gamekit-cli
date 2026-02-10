# Architecture Research

**Domain:** CLI-to-Unity-Editor bridge (HTTP-based external tool integration)
**Researched:** 2026-02-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CLI Process (TypeScript/Bun)                  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Commander.js  │  │  CLI Commands │  │  HTTP Client (bridge.ts) │  │
│  │ (index.ts)    │→ │  (gamekit *)  │→ │  localhost:${port}/api/* │  │
│  └──────────────┘  └──────────────┘  └────────────┬─────────────┘  │
│                                                    │                │
│  ┌──────────────────────────────────────────────┐  │                │
│  │  Connection Manager (connection.ts)          │  │                │
│  │  - Port discovery (port file or scan)        │  │                │
│  │  - Health check polling                      │  │                │
│  │  - Retry with backoff                        │  │                │
│  └──────────────────────────────────────────────┘  │                │
└────────────────────────────────────────────────────┼────────────────┘
                                                     │ HTTP
                                                     │ localhost
                                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Unity Editor Process (C#)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  GameKitServer.cs (Editor script, Assets/Editor/GameKit/)    │   │
│  │  HttpListener on localhost:${port}                           │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │   │
│  │  │ /health  │  │ /console │  │ /scene   │  │ /editor    │  │   │
│  │  │ /refresh │  │ /project │  │ /build   │  │ /screenshot│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │   │
│  │                                                              │   │
│  │  Request Router → Handler → Unity API → JSON Response       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Unity Editor APIs (called from main thread via EditorApp)   │   │
│  │  - EditorApplication (play/stop/compile)                     │   │
│  │  - AssetDatabase (import/refresh/search)                     │   │
│  │  - SceneManager / EditorSceneManager                         │   │
│  │  - GameObject / Component manipulation                       │   │
│  │  - BuildPipeline                                             │   │
│  │  - Debug.Log / Console                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CLI Entry Point** | Parse arguments, route to commands | `src/index.ts` with Commander.js (exists) |
| **CLI Commands** | Orchestrate user workflows per subcommand | `src/commands/*.ts` -- one file per `gamekit` subcommand |
| **HTTP Client** | Send requests to Unity plugin, parse responses | `src/utils/bridge.ts` -- thin wrapper around `fetch` |
| **Connection Manager** | Discover Unity instance, health check, reconnect | `src/utils/connection.ts` -- port file reading + polling |
| **Unity HTTP Server** | Listen on localhost, route requests, return JSON | `GameKitServer.cs` in `template/Editor/GameKit/` |
| **Request Handlers** | Map routes to Unity API calls, format responses | One C# file per domain (console, scene, editor, etc.) |
| **Main Thread Dispatcher** | Queue HTTP handler work onto Unity's main thread | Required because HttpListener callbacks run on thread pool |

## Recommended Project Structure

### CLI Side (TypeScript)

```
src/
├── index.ts                    # CLI entry point (exists)
├── version.ts                  # Auto-generated version (exists)
├── commands/                   # CLI command handlers
│   ├── init.ts                 # Project setup wizard (exists, modify)
│   ├── doctor.ts               # Diagnostics (exists, modify)
│   ├── refresh.ts              # Tell Unity to reimport/recompile
│   ├── console.ts              # Read Unity console logs/errors
│   ├── screenshot.ts           # Capture game/scene view
│   ├── scene.ts                # Scene hierarchy and GameObject ops
│   ├── play.ts                 # Enter/exit play mode
│   ├── build.ts                # Trigger Unity build
│   ├── project.ts              # Query project state
│   └── asset.ts                # Asset import/management
├── utils/
│   ├── bridge.ts               # HTTP client for Unity communication [NEW]
│   ├── connection.ts           # Port discovery, health check, retry [NEW]
│   ├── unity.ts                # Unity install discovery (exists)
│   ├── platform.ts             # OS detection (exists)
│   ├── template.ts             # Template management (exists)
│   └── updater.ts              # Auto-updater (exists)
└── __tests__/
    ├── commands/               # Command tests
    └── utils/
        ├── bridge.test.ts      # HTTP client tests (mock server)
        └── connection.test.ts  # Connection manager tests
```

### Unity Plugin Side (C#)

```
template/Editor/GameKit/
├── GameKitServer.cs            # HttpListener setup, lifecycle, port file
├── MainThreadDispatcher.cs     # Queue actions for Unity main thread
├── RequestRouter.cs            # URL routing to handler methods
├── Handlers/
│   ├── HealthHandler.cs        # GET /api/health → { status, unityVersion, projectPath }
│   ├── RefreshHandler.cs       # POST /api/refresh → trigger AssetDatabase.Refresh, return compile errors
│   ├── ConsoleHandler.cs       # GET /api/console → read log entries
│   ├── SceneHandler.cs         # GET/POST /api/scene → hierarchy, open scene, create/modify objects
│   ├── EditorHandler.cs        # POST /api/editor → play/stop, get state
│   ├── ScreenshotHandler.cs    # POST /api/screenshot → capture and return image path
│   ├── BuildHandler.cs         # POST /api/build → trigger build pipeline
│   ├── ProjectHandler.cs       # GET /api/project → scripts, scenes, prefabs, settings
│   └── AssetHandler.cs         # POST /api/asset → import, create materials, prefabs
├── Models/
│   ├── ApiResponse.cs          # Standard { success, data, error } wrapper
│   └── RequestModels.cs        # Deserialized request body types
└── Utils/
    ├── JsonHelper.cs           # Unity-compatible JSON serialization
    └── PortManager.cs          # Port selection, conflict resolution, port file I/O
```

### Structure Rationale

- **`src/commands/` (one file per subcommand):** Each `gamekit` subcommand maps 1:1 to a file. Commands are thin -- they parse CLI args, call `bridge.ts`, and format output. This matches the existing pattern (`init.ts`, `doctor.ts`).
- **`src/utils/bridge.ts` (single HTTP client):** All commands share one HTTP client module. This avoids scattering HTTP logic across commands and centralizes error handling, timeouts, and response parsing.
- **`src/utils/connection.ts` (separate from bridge):** Connection management (discovery, health check, reconnect) is a distinct concern from making API calls. Separating it means commands don't need to think about connection state.
- **`template/Editor/GameKit/` (Unity plugin):** Lives under `template/` so the existing `copyTemplateAsync()` infrastructure copies it into Unity projects during `gamekit init`. Placing it under `Editor/` ensures Unity compiles it as Editor-only code (not included in builds).
- **`Handlers/` (one file per route group):** Mirrors the CLI command structure. Each handler encapsulates one domain of Unity API interaction. This makes it easy to build and test incrementally.
- **`MainThreadDispatcher.cs` (separate utility):** Critical architectural component. Unity APIs must be called from the main thread, but `HttpListener` callbacks arrive on thread pool threads. The dispatcher queues work and executes it during `EditorApplication.update`.

## Architectural Patterns

### Pattern 1: Port File Discovery

**What:** The Unity plugin writes its port number to a well-known file path. The CLI reads this file to know where to connect.
**When to use:** Always -- this is the primary discovery mechanism.
**Trade-offs:** Simple and reliable. Stale port files are the main risk (Unity crashes without cleanup). Mitigated by health check.

**Port file location:**
```
{Unity project root}/.gamekit/server.json
```

**Port file content:**
```json
{
  "port": 17580,
  "pid": 12345,
  "unityVersion": "6000.1.12f1",
  "startedAt": "2026-02-09T15:30:00Z"
}
```

**CLI discovery flow:**
```typescript
// src/utils/connection.ts
async function discoverUnity(projectPath: string): Promise<ConnectionInfo> {
  const portFilePath = path.join(projectPath, '.gamekit', 'server.json');

  // 1. Read port file
  if (!fs.existsSync(portFilePath)) {
    throw new UnityNotRunningError('No port file found. Is Unity open with this project?');
  }

  const info = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));

  // 2. Health check to confirm Unity is actually running
  const healthy = await healthCheck(info.port);
  if (!healthy) {
    // Stale port file -- Unity crashed or closed
    fs.unlinkSync(portFilePath);
    throw new UnityNotRunningError('Unity is not responding. Port file was stale.');
  }

  return info;
}
```

**Unity plugin writes port file on startup:**
```csharp
// GameKitServer.cs
[InitializeOnLoad]
public static class GameKitServer
{
    static GameKitServer()
    {
        StartServer();
    }

    static void StartServer()
    {
        int port = FindAvailablePort(17580, 17589);
        // ... start HttpListener ...
        WritePortFile(port);
        EditorApplication.quitting += CleanupPortFile;
    }
}
```

### Pattern 2: Main Thread Dispatch

**What:** HTTP request handlers queue Unity API calls onto the main thread and wait for results.
**When to use:** Every handler that touches Unity APIs (which is nearly all of them).
**Trade-offs:** Adds latency (waits for next `EditorApplication.update` tick, ~16ms at 60Hz editor framerate) but is the only safe way to call Unity APIs. The alternative -- calling Unity APIs from background threads -- causes crashes.

```csharp
// MainThreadDispatcher.cs
public static class MainThreadDispatcher
{
    private static readonly ConcurrentQueue<Action> _queue = new();

    [InitializeOnLoadMethod]
    static void Initialize()
    {
        EditorApplication.update += ProcessQueue;
    }

    static void ProcessQueue()
    {
        while (_queue.TryDequeue(out var action))
        {
            action();
        }
    }

    // Called from HttpListener thread, blocks until main thread executes
    public static T Invoke<T>(Func<T> func)
    {
        var tcs = new TaskCompletionSource<T>();
        _queue.Enqueue(() => {
            try { tcs.SetResult(func()); }
            catch (Exception e) { tcs.SetException(e); }
        });
        return tcs.Task.Result; // Blocks the HTTP thread until done
    }
}
```

### Pattern 3: Standard API Response Envelope

**What:** Every API response uses the same JSON envelope so the CLI can handle errors uniformly.
**When to use:** Every response from every handler.
**Trade-offs:** Slightly more verbose than raw responses, but eliminates per-command error parsing logic on the CLI side.

**Envelope:**
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

**Error case:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "COMPILATION_ERROR",
    "message": "Assets/Scripts/Player.cs(25,10): error CS1002: ; expected",
    "details": [ ... ]
  }
}
```

**CLI-side parsing:**
```typescript
// src/utils/bridge.ts
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const port = await connection.getPort();
  const url = `http://localhost:${port}/api${path}`;

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  const envelope: ApiResponse<T> = await res.json();

  if (!envelope.success) {
    throw new UnityError(envelope.error!.code, envelope.error!.message, envelope.error!.details);
  }

  return envelope.data!;
}
```

### Pattern 4: CLI Command as Thin Orchestrator

**What:** CLI commands are thin -- they parse args, call bridge.ts, and format output. No business logic.
**When to use:** Every CLI command.
**Trade-offs:** Makes commands easy to test (mock bridge), easy to read (no HTTP details), and consistent.

```typescript
// src/commands/console.ts
import { request } from '../utils/bridge.js';
import chalk from 'chalk';

interface ConsoleEntry {
  type: 'log' | 'warning' | 'error';
  message: string;
  stackTrace: string;
  timestamp: string;
}

export async function console(options: { errors?: boolean; count?: number }) {
  const entries = await request<ConsoleEntry[]>('GET', '/console', {
    params: {
      types: options.errors ? 'error' : 'all',
      count: options.count ?? 50,
    }
  });

  for (const entry of entries) {
    const color = entry.type === 'error' ? chalk.red :
                  entry.type === 'warning' ? chalk.yellow : chalk.gray;
    console.log(color(`[${entry.type}] ${entry.message}`));
  }
}
```

## Data Flow

### Request Flow (CLI to Unity and back)

```
User runs: gamekit refresh
    │
    ▼
CLI (src/commands/refresh.ts)
    │ parse args
    ▼
Connection Manager (src/utils/connection.ts)
    │ read .gamekit/server.json → port 17580
    │ health check passes
    ▼
HTTP Client (src/utils/bridge.ts)
    │ POST http://localhost:17580/api/refresh
    │ Content-Type: application/json
    │ Body: {}
    ▼
Unity HTTP Server (GameKitServer.cs)
    │ HttpListener receives request
    │ RequestRouter dispatches to RefreshHandler
    ▼
RefreshHandler.cs
    │ MainThreadDispatcher.Invoke(() => {
    │     AssetDatabase.Refresh();
    │     // wait for compilation...
    │     return CompilationPipeline.GetCompileErrors();
    │ })
    ▼
Unity APIs (main thread)
    │ AssetDatabase.Refresh() triggers reimport
    │ Compilation runs
    │ Errors collected
    ▼
JSON Response
    │ { "success": true, "data": { "errors": [], "warnings": 2 } }
    ▼
CLI formats and prints result
    │ "Refreshed. 0 errors, 2 warnings."
```

### Connection Lifecycle

```
Unity project opened
    │
    ▼
[InitializeOnLoad] GameKitServer starts
    │ Find available port (17580-17589)
    │ Start HttpListener
    │ Write .gamekit/server.json
    ▼
Server is running, accepting requests
    │
    │ ←── gamekit CLI connects (reads port file, health check)
    │ ←── gamekit CLI sends commands
    │ ←── ...
    │
    ▼
Unity Editor closing (EditorApplication.quitting)
    │ Stop HttpListener
    │ Delete .gamekit/server.json
    ▼
Server is stopped
```

### Key Data Flows

1. **Refresh flow:** CLI tells Unity to reimport assets after Claude edits C# files. Unity reimports, compiles, returns errors. CLI prints errors so Claude can fix them. This is the most frequent operation.
2. **Scene manipulation flow:** CLI sends structured commands (create object, add component, set properties). Unity executes on main thread, returns updated hierarchy. This replaces MCP `manage_gameobject` and `manage_scene`.
3. **Screenshot flow:** CLI requests screenshot. Unity captures game/scene view, writes to disk, returns file path. CLI reads the image file.
4. **Play mode flow:** CLI requests play/stop. Unity toggles play mode on main thread. Subsequent console reads capture runtime errors.

## API Surface

Based on the existing MCP operations used by templates (extracted from skills, commands, and agents), the HTTP API needs these route groups:

| Route Group | Methods | Maps to MCP Operations |
|-------------|---------|----------------------|
| `GET /api/health` | Status, version, project path | New (replaces relay check) |
| `POST /api/refresh` | AssetDatabase.Refresh + compile result | `manage_asset action="refresh"` |
| `GET /api/console` | Read log entries by type/count | `manage_console action="get"` |
| `POST /api/console/clear` | Clear console | `manage_console action="clear"` |
| `GET /api/scene/hierarchy` | Scene hierarchy tree | `manage_scene action="get_hierarchy"` |
| `POST /api/scene/save` | Save current scene | `manage_scene action="save"` |
| `POST /api/scene/open` | Open a scene by path | (new) |
| `GET /api/gameobject/:name/components` | Get components on object | `manage_gameobject action="get_components"` |
| `POST /api/gameobject` | Create GameObject | `manage_gameobject action="create"` |
| `PUT /api/gameobject/:name` | Modify position/rotation/scale | `manage_gameobject action="modify"` |
| `DELETE /api/gameobject/:name` | Delete GameObject | `manage_gameobject action="delete"` |
| `POST /api/gameobject/:name/component` | Add component | `manage_gameobject action="add_component"` |
| `PUT /api/gameobject/:name/component` | Set component property | `manage_gameobject action="set_component_property"` |
| `POST /api/gameobject/:name/prefab` | Save as prefab | `manage_gameobject action="save_as_prefab"` |
| `POST /api/gameobject/find` | Find by name/tag/component | `manage_gameobject action="find"` |
| `POST /api/editor/play` | Enter play mode | `manage_editor action="play"` |
| `POST /api/editor/stop` | Exit play mode | `manage_editor action="stop"` |
| `GET /api/editor/state` | Get editor state | `manage_editor action="get_state"` |
| `POST /api/screenshot` | Capture game/scene view | `manage_menu_item` + screenshot |
| `GET /api/build/scenes` | List build scenes | `manage_build action="list_scenes"` |
| `POST /api/build` | Trigger build | `manage_build action="build"` |
| `GET /api/project/scripts` | List scripts | `manage_script action="read"` (partial) |
| `GET /api/project/settings` | Project settings, layers, tags | `manage_physics action="get_layer_names"` etc. |
| `POST /api/asset/search` | Search assets by pattern | `manage_asset action="search"` |
| `POST /api/asset/create` | Create material/prefab | `manage_asset action="create"` |
| `GET /api/physics` | Physics settings, collision matrix | `manage_physics` |
| `GET /api/rendering` | Lighting and rendering info | `manage_rendering` |
| `POST /api/menu` | Execute menu item | `manage_menu_item` |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single developer, one project | Default setup -- one Unity instance, one port file per project. No changes needed. |
| Multiple Unity projects open | Each project writes its own `.gamekit/server.json` in its project root. CLI reads the port file from `cwd`. No conflict. |
| CI/headless Unity | Same architecture -- Unity can run in batchmode with `-executeMethod` to start the server. Port file still written, CLI connects the same way. |

### Scaling Priorities

1. **First bottleneck: Main thread dispatch latency.** All Unity API calls funnel through one main thread queue. For single-developer use, this is not a problem (requests are sequential). If multiple tools connect simultaneously, requests serialize. Mitigation: keep handler work minimal, avoid long-running main-thread operations.
2. **Second bottleneck: Large response payloads.** Scene hierarchies with thousands of objects produce large JSON responses. Mitigation: support pagination/filtering in scene queries (e.g., `?depth=2` to limit hierarchy depth).

## Anti-Patterns

### Anti-Pattern 1: Calling Unity APIs from HTTP Thread

**What people do:** Call `AssetDatabase.Refresh()` or `EditorApplication.isPlaying = true` directly from the `HttpListener` callback thread.
**Why it's wrong:** Unity APIs are not thread-safe. Calling them from background threads causes crashes, silent corruption, or hangs. The Unity Editor can freeze entirely.
**Do this instead:** Always dispatch to main thread via `MainThreadDispatcher.Invoke()`. Every handler should use it for any Unity API interaction.

### Anti-Pattern 2: Long-Polling for Compilation Results

**What people do:** `POST /api/refresh` starts a refresh and immediately returns, then the CLI polls `/api/console` in a loop waiting for compilation to finish.
**Why it's wrong:** Introduces race conditions (compilation might finish before first poll), wastes network calls, and is hard to get the timing right.
**Do this instead:** Make `/api/refresh` synchronous -- it blocks the HTTP response until `AssetDatabase.Refresh()` completes and compilation finishes (use `CompilationPipeline` callbacks). The CLI sends one request and gets the full result. Use an HTTP timeout of 60+ seconds for this endpoint specifically.

### Anti-Pattern 3: Embedding the Port Number in CLI Config

**What people do:** Store the Unity server port in a config file that the user sets up, or hardcode it.
**Why it's wrong:** If Unity restarts on a different port (due to conflict), the CLI breaks. If multiple Unity instances run, they collide.
**Do this instead:** Unity writes the port file dynamically. CLI reads it fresh each time. Port file lives in the project directory so multiple projects don't conflict.

### Anti-Pattern 4: Binary/Protobuf Transport

**What people do:** Use a binary protocol or protobuf for "performance" in the CLI-to-Unity bridge.
**Why it's wrong:** The bottleneck is Unity main-thread execution, not serialization. Binary protocols are hard to debug, impossible to curl, and add tooling complexity (code generation, versioning). The payloads are small enough that JSON serialization time is negligible.
**Do this instead:** Use plain JSON over HTTP. It's debuggable with curl, readable in logs, and trivially parseable in both TypeScript and C#. Unity has `JsonUtility` built in (with limitations) or simple manual serialization for the response types needed here.

### Anti-Pattern 5: WebSocket for Command-Response

**What people do:** Use WebSockets for the CLI-to-Unity connection because "it's faster" or "bidirectional."
**Why it's wrong:** The CLI is a short-lived process. Each `gamekit` invocation starts, sends one or a few requests, and exits. WebSocket connection setup overhead (upgrade handshake) negates any benefits. And there's no need for server-push -- the CLI always initiates requests.
**Do this instead:** Plain HTTP request-response. Each CLI invocation opens a connection, sends request(s), gets response(s), and exits. Connection reuse within a single invocation (HTTP keep-alive) is fine but not critical.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Unity Editor | HttpListener in Editor C# code | Must use `[InitializeOnLoad]` to auto-start; main thread dispatch required for all API calls |
| Unity AssetDatabase | Called from RefreshHandler, AssetHandler | Triggers reimport, compilation; can take seconds for large projects |
| Unity BuildPipeline | Called from BuildHandler | Long-running (minutes); needs longer timeout or async pattern with polling |
| File System (screenshots) | Unity writes PNG, CLI reads file path from response | CLI uses its native file reading to return image to Claude |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI commands -> bridge.ts | Function calls with typed params | Commands never construct HTTP requests directly |
| bridge.ts -> connection.ts | bridge.ts calls `connection.getPort()` | Connection manager handles discovery; bridge focuses on request/response |
| CLI -> Unity plugin | HTTP JSON over localhost | Only boundary that crosses process boundaries; all others are in-process |
| HTTP thread -> Unity main thread | ConcurrentQueue + EditorApplication.update | The critical architectural boundary inside the Unity plugin |

## Build Order (Suggested Implementation Sequence)

The goal is to get an end-to-end "hello world" working as early as possible, then expand the API surface.

### Phase 1: Skeleton (end-to-end first)

Build the minimum to prove the architecture works:

1. **Unity plugin: GameKitServer.cs + HealthHandler.cs + MainThreadDispatcher.cs + PortManager.cs**
   - HttpListener starts on `[InitializeOnLoad]`
   - Writes port file to `.gamekit/server.json`
   - Responds to `GET /api/health` with `{ unityVersion, projectPath }`
   - Cleans up port file on quit

2. **CLI: connection.ts + bridge.ts**
   - Reads port file from project directory
   - Sends health check request
   - Parses standard API response envelope

3. **CLI: doctor.ts update**
   - Replace MCP relay check with Unity plugin connection check
   - This validates the whole chain works

**Why this order:** Proves HTTP transport, port discovery, main thread dispatch, and response parsing all work before building any real features. The `doctor` command gives immediate user-visible validation.

### Phase 2: Core Loop (the operations Claude uses most)

4. **RefreshHandler + `gamekit refresh`**
   - This is the #1 most-used operation: Claude edits a .cs file, then needs Unity to recompile and report errors.

5. **ConsoleHandler + `gamekit console`**
   - Read errors/warnings/logs. Second most-used operation.

6. **EditorHandler + `gamekit play`**
   - Enter/exit play mode. Together with console, enables the verify-changes loop.

7. **ScreenshotHandler + `gamekit screenshot`**
   - Capture game view. Enables visual verification.

**Why this order:** These four operations enable Claude's core "write code, compile, test, see result" loop. All existing skills and verify-changes workflows depend on these.

### Phase 3: Scene Manipulation

8. **SceneHandler + `gamekit scene`**
   - Hierarchy queries, open scenes, create/modify/delete GameObjects, components, properties.
   - This is the largest handler -- build it incrementally (hierarchy read first, then create, then modify).

### Phase 4: Project and Build

9. **ProjectHandler + `gamekit project`**
   - List scripts, scenes, prefabs, project settings, layers, tags.

10. **BuildHandler + `gamekit build`**
    - Trigger builds. This is less frequently used and can have a longer timeout.

11. **AssetHandler + `gamekit asset`**
    - Asset search, material creation, prefab management.

### Phase 5: Init/Template Update

12. **Update `gamekit init`**
    - Remove MCP package injection from manifest
    - Remove `.mcp.json` generation
    - Copy Unity plugin to `Assets/Editor/GameKit/`
    - Update template commands/skills/agents to reference `gamekit` CLI instead of MCP tools

13. **Strip MCP code**
    - Remove `src/utils/mcp.ts` entirely
    - Remove MCP-related code from `src/commands/init.ts`
    - Remove MCP relay references from `src/utils/platform.ts`

## Error Handling Patterns

### Unity Not Running

```
User runs: gamekit refresh
CLI reads .gamekit/server.json → file not found

Output:
  Error: Unity is not running.

  Open your project in Unity, then try again.
  The gamekit plugin starts automatically when Unity opens.
```

**Implementation:** `connection.ts` throws `UnityNotRunningError` when port file is missing. Commands catch this and print a user-friendly message. Exit code 1.

### Unity Running But Plugin Not Responding (Stale Port File)

```
User runs: gamekit console
CLI reads .gamekit/server.json → port 17580
CLI sends GET http://localhost:17580/api/health → connection refused

Output:
  Error: Unity is not responding.

  This usually means Unity crashed or restarted. Try:
  1. Close and reopen Unity
  2. Run: gamekit doctor
```

**Implementation:** `connection.ts` does a health check after reading the port file. If health check fails, delete the stale port file, throw `UnityNotRespondingError`. Exit code 1.

### Compilation Errors After Refresh

```
User runs: gamekit refresh
CLI sends POST /api/refresh
Unity compiles and finds errors

Output:
  Compilation failed. 2 errors:

  Assets/Scripts/Player.cs(25,10): error CS1002: ; expected
  Assets/Scripts/Enemy.cs(42,5): error CS0246: type 'Rigidbod' not found
```

**Implementation:** `/api/refresh` returns `{ success: true, data: { errors: [...], warnings: [...] } }`. Note `success: true` because the refresh operation itself succeeded -- it's the user's code that has errors. The CLI formats and prints the errors. Exit code 0 (the command succeeded; the errors are informational).

### Request Timeout

```
User runs: gamekit build --platform windows
CLI sends POST /api/build → 60 second timeout exceeded

Output:
  Error: Build request timed out after 60 seconds.

  Large builds can take several minutes. Check Unity for progress.
```

**Implementation:** `bridge.ts` uses `AbortSignal.timeout()`. Different endpoints get different timeouts:

| Operation | Timeout |
|-----------|---------|
| Health check | 3 seconds |
| Console, scene queries, project info | 10 seconds |
| Refresh (includes compilation) | 60 seconds |
| Screenshot | 15 seconds |
| Build | 300 seconds (5 min) |

### Port Conflict

```
Unity starts GameKit server
Port 17580 is in use (another Unity instance, or another app)
Server tries 17581... 17582... finds 17583 available
Writes port 17583 to .gamekit/server.json

CLI reads port file → connects to 17583. Transparent to user.
```

**Implementation:** `PortManager.cs` tries ports 17580-17589 sequentially. If all 10 are taken, logs an error to Unity console with instructions.

## JSON Serialization Strategy (C# Side)

Unity's built-in `JsonUtility` has significant limitations:
- No Dictionary serialization
- No polymorphic types
- No null handling for value types
- Requires `[Serializable]` attribute on all types

**Recommendation:** Use `JsonUtility` for simple flat structures (request/response models). For complex nested data (scene hierarchies, component properties), use manual `StringBuilder`-based JSON construction. This avoids a dependency on third-party JSON libraries (Newtonsoft.Json is not built into Unity < 2020).

For Unity 2020+, `com.unity.nuget.newtonsoft-json` is available as a built-in package. Since the minimum Unity version target is 2020+, **using Newtonsoft.Json from the Unity registry** is the pragmatic choice. It's not a third-party package -- it ships with Unity. Add it to the plugin's assembly definition dependencies.

**Confidence:** MEDIUM -- need to verify `com.unity.nuget.newtonsoft-json` availability across Unity 2020-2023 and Unity 6+. If unavailable in some versions, fall back to manual JSON construction.

## Sources

- Existing codebase analysis: `src/utils/unity.ts`, `src/utils/mcp.ts`, `src/commands/init.ts`, `src/utils/assets.ts`
- Existing template analysis: `template/.claude/skills/`, `template/.claude/commands/`, `template/.claude/agents/`
- Project requirements: `.planning/PROJECT.md`
- Codebase architecture: `.planning/codebase/ARCHITECTURE.md`
- Unity Editor scripting knowledge: `[InitializeOnLoad]`, `EditorApplication.update`, `HttpListener`, `AssetDatabase`, `EditorSceneManager`, `BuildPipeline` -- from training data (HIGH confidence, these are stable Unity APIs unchanged for many years)
- HTTP server in Unity pattern: `System.Net.HttpListener` -- available in all Unity versions via Mono/.NET runtime (HIGH confidence)
- Main thread dispatch pattern: Standard Unity pattern for Editor extensions that need background thread -> main thread communication (HIGH confidence)

---
*Architecture research for: CLI-to-Unity-Editor bridge (HTTP-based)*
*Researched: 2026-02-09*
