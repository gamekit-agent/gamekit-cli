# Phase 1: Foundation - Research

**Researched:** 2026-02-09
**Domain:** MCP removal, Unity Editor HTTP plugin, CLI connection layer, output formatting
**Confidence:** HIGH

## Summary

Phase 1 replaces the existing MCP relay architecture with a direct HTTP bridge between the gamekit CLI and a Unity Editor plugin. The phase has three distinct work streams: (1) strip all MCP code and update init/doctor commands, (2) build a C# Unity Editor plugin that runs an HttpListener-based HTTP server with main thread dispatch and domain reload survival, and (3) build the CLI-side connection layer with port file discovery, health checking, and consistent JSON/TTY output formatting.

The existing codebase is a TypeScript CLI built with Commander.js and compiled to standalone Bun binaries. MCP code is concentrated in four files (`src/utils/mcp.ts`, `src/utils/manifest.ts`, `src/utils/platform.ts`, `src/commands/init.ts`) plus the doctor command. The stripping work is mechanical and well-scoped. The Unity plugin is the most technically demanding work -- the main thread dispatch pattern and domain reload survival are foundational architectural decisions that cannot be retrofitted. The CLI connection layer is straightforward HTTP client work using Bun's built-in `fetch` API.

**Primary recommendation:** Build the Unity plugin first (it is the riskiest and most architecturally critical component), then the CLI connection layer, then strip MCP code last (since stripping MCP makes init/doctor non-functional until the new connection layer exists).

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| `System.Net.HttpListener` | .NET Standard 2.1 (Unity Mono) | HTTP server inside Unity Editor | Built into .NET runtime shipped with Unity 2020+. No external dependencies. Works on Windows and macOS. Prefix-based URL routing. |
| `Newtonsoft.Json` (Unity built-in) | 13.0.x via `com.unity.nuget.newtonsoft-json` 3.x | JSON serialization in Unity plugin | Ships with Unity as an official package. Handles dictionaries, nested objects, nulls -- things `JsonUtility` cannot. Declare as package dependency. |
| `EditorApplication.update` | Unity 2020+ | Main thread dispatch target | Fires every Editor frame (~100Hz active, ~4Hz background). Standard pattern for queuing work from background threads onto Unity's main thread. |
| `[InitializeOnLoad]` + `AssemblyReloadEvents` | Unity 2020+ | Server lifecycle (startup, domain reload survival) | `[InitializeOnLoad]` re-executes after every domain reload. `AssemblyReloadEvents.beforeAssemblyReload` allows clean shutdown before reload. Standard Unity plugin lifecycle pattern. |
| `ConcurrentQueue<T>` | .NET Standard 2.1 | Thread-safe request queue | Lock-free queue for passing HttpListener contexts from thread pool to main thread. Part of `System.Collections.Concurrent`. |
| Bun global `fetch` | Built into Bun runtime | HTTP client for CLI-to-Unity requests | Available globally in Bun (and in compiled standalone binaries). Simpler API than Node's `http` module. The CLI compiles to Bun standalone binaries, so `fetch` is always available. |
| `process.stdout.isTTY` | Node.js/Bun built-in | TTY detection for output formatting | Standard way to determine if stdout is connected to a terminal. Drives the JSON-to-stdout vs human-readable-to-stderr decision. |
| Commander.js | ^12.1.0 | CLI command registration and argument parsing | Already in use. Add `--json` flag to program-level options. |
| chalk | ^5.3.0 | Terminal color output for stderr human-readable mode | Already in use. Continue using for stderr output. |

### Supporting

| Library/API | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `EditorApplication.quitting` | Unity 2020+ | Clean server shutdown when Editor closes | Register cleanup handler to stop HttpListener and delete port file. |
| `EditorApplication.delayCall` | Unity 2020+ | Deferred server startup | Use in `[InitializeOnLoad]` static constructor to defer server start until Editor is fully initialized. Avoids asset-operation errors during early init. |
| `System.Diagnostics.Process` | .NET Standard | Get current process ID for port file | Write PID to `server.json` so CLI can validate the Unity process is still alive. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fetch` (Bun global) | Node.js `http` module | `http` module is used in `updater.ts` but is more verbose. `fetch` is simpler, fully supported in Bun standalone binaries, and is the modern standard. Since we are breaking from old patterns (removing MCP), this is a good time to adopt `fetch`. |
| `Newtonsoft.Json` | Unity `JsonUtility` | `JsonUtility` cannot serialize dictionaries, handle nulls properly, or work with dynamic structures. Not suitable for HTTP API payloads. |
| `Newtonsoft.Json` | Manual `StringBuilder` JSON | Error-prone, no validation, no deserialization. Only viable as fallback if Newtonsoft is unavailable. |
| `HttpListener` | `TcpListener` + manual HTTP parsing | Reimplementing HTTP is unnecessary. HttpListener handles parsing, headers, content-length. |
| `HttpListener` | Third-party embedded server (EmbedIO) | External dependency violates "no external C# dependencies" constraint. |
| Port file discovery | Fixed port number | Fails with multiple Unity instances. Dynamic port + port file is required. |
| Port file discovery | mDNS/Bonjour | Massively overcomplicated for localhost communication. |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── index.ts                    # CLI entry point (MODIFY: add --json global flag)
├── commands/
│   ├── init.ts                 # MODIFY: remove MCP, install Unity plugin
│   └── doctor.ts               # MODIFY: replace MCP checks with plugin connection checks
├── utils/
│   ├── bridge.ts               # NEW: HTTP client for Unity communication
│   ├── connection.ts           # NEW: Port discovery, health check, error types
│   ├── output.ts               # NEW: JSON/TTY output formatting helpers
│   ├── unity.ts                # MODIFY: remove getMcpPackageUrl
│   ├── platform.ts             # MODIFY: remove getMcpRelayPath
│   ├── template.ts             # KEEP: template management
│   ├── updater.ts              # KEEP: auto-updater
│   ├── commands.ts             # KEEP: command template helpers
│   ├── assets.ts               # MODIFY: remove inline C# (move to template)
│   └── mcp.ts                  # DELETE: entire file
└── __tests__/
    ├── utils/
    │   ├── bridge.test.ts      # NEW: HTTP client tests
    │   ├── connection.test.ts  # NEW: connection manager tests
    │   ├── output.test.ts      # NEW: output formatting tests
    │   ├── manifest.test.ts    # MODIFY: remove MCP tests
    │   └── mcp.test.ts         # DELETE: entire file
    └── commands/
        └── doctor.test.ts      # MODIFY: update for new checks

template/
├── .claude/                    # KEEP: existing Claude config
└── Editor/
    └── GameKit/
        ├── GameKit.asmdef      # NEW: Assembly definition (Editor-only)
        ├── GameKitServer.cs    # NEW: HttpListener lifecycle, port management
        ├── MainThreadDispatcher.cs  # NEW: Thread-safe main thread dispatch
        ├── RequestRouter.cs    # NEW: URL routing to handlers
        ├── Handlers/
        │   └── HealthHandler.cs     # NEW: GET /api/health endpoint
        ├── Models/
        │   └── ApiResponse.cs       # NEW: Standard response envelope
        └── Utils/
            └── PortManager.cs       # NEW: Port selection, port file I/O
```

### Pattern 1: Port File Discovery

**What:** Unity plugin writes its port number, PID, and metadata to `.gamekit/server.json` in the project root. CLI reads this file to discover the running Unity instance.

**When to use:** Every CLI command that communicates with Unity.

**Port file format:**
```json
{
  "port": 17580,
  "pid": 12345,
  "unityVersion": "6000.1.12f1",
  "projectPath": "/Users/dev/MyGame",
  "startedAt": "2026-02-09T15:30:00Z"
}
```

**CLI discovery flow:**
```typescript
// src/utils/connection.ts
export interface ServerInfo {
  port: number;
  pid: number;
  unityVersion: string;
  projectPath: string;
  startedAt: string;
}

export async function discoverUnity(projectPath: string): Promise<ServerInfo> {
  const portFilePath = path.join(projectPath, '.gamekit', 'server.json');

  if (!fs.existsSync(portFilePath)) {
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Unity is not running. Open your project in Unity, then try again.'
    );
  }

  const info: ServerInfo = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));

  // Validate PID is still alive
  if (!isProcessRunning(info.pid)) {
    fs.unlinkSync(portFilePath);
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Unity is no longer running (stale port file removed). Reopen Unity and try again.'
    );
  }

  // Health check to confirm server is responding
  const healthy = await healthCheck(info.port);
  if (!healthy) {
    throw new GameKitError(
      'UNITY_NOT_RESPONDING',
      'Unity is running but the gamekit plugin is not responding. Try restarting Unity.'
    );
  }

  return info;
}
```

### Pattern 2: Main Thread Dispatch (Unity C#)

**What:** HTTP request handlers queue Unity API calls onto the main thread and block until results are ready.

**When to use:** Every handler that touches any Unity API.

```csharp
// MainThreadDispatcher.cs
[InitializeOnLoadMethod]
public static class MainThreadDispatcher
{
    private static readonly ConcurrentQueue<Action> _queue = new();

    static MainThreadDispatcher()
    {
        EditorApplication.update += ProcessQueue;
    }

    private static void ProcessQueue()
    {
        while (_queue.TryDequeue(out var action))
        {
            action();
        }
    }

    public static T Invoke<T>(Func<T> func)
    {
        if (IsMainThread())
            return func();

        var tcs = new TaskCompletionSource<T>();
        _queue.Enqueue(() =>
        {
            try { tcs.SetResult(func()); }
            catch (Exception e) { tcs.SetException(e); }
        });
        return tcs.Task.Result; // Blocks HTTP thread until main thread executes
    }

    public static void Invoke(Action action)
    {
        if (IsMainThread())
        {
            action();
            return;
        }

        var tcs = new TaskCompletionSource<bool>();
        _queue.Enqueue(() =>
        {
            try { action(); tcs.SetResult(true); }
            catch (Exception e) { tcs.SetException(e); }
        });
        tcs.Task.Wait();
    }

    private static bool IsMainThread()
    {
        return System.Threading.Thread.CurrentThread.ManagedThreadId == 1;
    }
}
```

### Pattern 3: Standard API Response Envelope

**What:** Every HTTP response uses the same JSON structure for uniform CLI-side parsing.

```json
{
  "success": true,
  "data": {
    "status": "idle",
    "unityVersion": "6000.1.12f1",
    "projectPath": "/Users/dev/MyGame",
    "projectName": "MyGame"
  },
  "error": null
}
```

Error case:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "EDITOR_BUSY",
    "message": "Unity is currently compiling scripts. Try again in a moment."
  }
}
```

**CLI-side parsing:**
```typescript
// src/utils/bridge.ts
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export async function request<T>(
  port: number,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs: number = 10000
): Promise<T> {
  const url = `http://localhost:${port}/api${path}`;

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const envelope: ApiResponse<T> = await res.json();

  if (!envelope.success) {
    throw new GameKitError(
      envelope.error?.code ?? 'UNKNOWN_ERROR',
      envelope.error?.message ?? 'Unknown error from Unity plugin'
    );
  }

  return envelope.data!;
}
```

### Pattern 4: CLI Output Formatting (JSON stdout, human stderr)

**What:** All commands output clean JSON to stdout (machine-readable) and human-readable formatted output to stderr when running in a TTY.

**When to use:** Every command.

```typescript
// src/utils/output.ts
export interface OutputOptions {
  json?: boolean;  // --json flag
}

export function isJsonMode(options: OutputOptions): boolean {
  // Explicit --json flag OR stdout is not a TTY (piped)
  return options.json === true || !process.stdout.isTTY;
}

export function outputResult(data: unknown, options: OutputOptions): void {
  // Always write JSON to stdout
  process.stdout.write(JSON.stringify(data, null, isJsonMode(options) ? undefined : 2) + '\n');
}

export function outputError(code: string, message: string, options: OutputOptions): void {
  const error = { error: { code, message } };
  process.stdout.write(JSON.stringify(error) + '\n');

  // Also write human-readable to stderr if TTY
  if (process.stderr.isTTY && !options.json) {
    process.stderr.write(chalk.red(`Error: ${message}\n`));
  }
}

export function logStatus(message: string): void {
  // Human-readable status messages go to stderr only
  if (process.stderr.isTTY) {
    process.stderr.write(chalk.gray(`${message}\n`));
  }
}
```

### Pattern 5: Domain Reload Survival (Unity C#)

**What:** Server cleanly shuts down before domain reload and restarts afterward.

```csharp
// GameKitServer.cs
[InitializeOnLoad]
public static class GameKitServer
{
    private static HttpListener _listener;
    private static int _port;

    static GameKitServer()
    {
        AssemblyReloadEvents.beforeAssemblyReload += OnBeforeReload;
        AssemblyReloadEvents.afterAssemblyReload += OnAfterReload;
        EditorApplication.quitting += OnEditorQuitting;

        // Delay start to avoid asset operation errors during early init
        EditorApplication.delayCall += StartServer;
    }

    private static void StartServer()
    {
        if (_listener != null && _listener.IsListening) return;

        _port = PortManager.FindAvailablePort(17580, 17589);
        if (_port < 0)
        {
            Debug.LogError("[GameKit] Could not find available port in range 17580-17589");
            return;
        }

        _listener = new HttpListener();
        _listener.Prefixes.Add($"http://localhost:{_port}/");
        _listener.IgnoreWriteExceptions = true;
        _listener.Start();
        _listener.BeginGetContext(OnRequestReceived, null);

        PortManager.WritePortFile(_port);
        Debug.Log($"[GameKit] Server started on port {_port}");
    }

    private static void StopServer()
    {
        if (_listener != null && _listener.IsListening)
        {
            _listener.Stop();
            _listener.Close();
            _listener = null;
        }
    }

    private static void OnBeforeReload()
    {
        StopServer();
        // Do NOT delete port file here -- server will restart after reload
    }

    private static void OnAfterReload()
    {
        // Server restarts via [InitializeOnLoad] static constructor
    }

    private static void OnEditorQuitting()
    {
        StopServer();
        PortManager.DeletePortFile();
    }

    private static void OnRequestReceived(IAsyncResult result)
    {
        if (_listener == null || !_listener.IsListening) return;
        try
        {
            var context = _listener.EndGetContext(result);
            MainThreadDispatcher.Invoke(() => RequestRouter.HandleRequest(context));
        }
        catch (ObjectDisposedException) { /* Expected on Stop() */ }
        catch (HttpListenerException) { /* Expected on Stop() */ }
        finally
        {
            if (_listener != null && _listener.IsListening)
                _listener.BeginGetContext(OnRequestReceived, null);
        }
    }
}
```

### Anti-Patterns to Avoid

- **Calling Unity APIs from HttpListener thread:** Causes crashes or silent corruption. Always use `MainThreadDispatcher.Invoke()`.
- **Not handling domain reload:** Server silently dies after any C# edit. Must use `[InitializeOnLoad]` + `AssemblyReloadEvents`.
- **Fixed port number without fallback:** Breaks with multiple Unity instances. Always try a port range and write a port file.
- **Blocking Unity main thread with `Thread.Sleep()`:** Freezes the entire Editor UI. Use `EditorApplication.delayCall` or `EditorApplication.update` for deferred work.
- **Using `Destroy()` in Editor code:** Must use `DestroyImmediate()` in Editor context. `Destroy()` is for Play mode.
- **Binding to `0.0.0.0` or `*`:** Exposes the server to the local network. Always bind to `http://localhost:{port}/`.
- **Loading assets in `[InitializeOnLoad]` static constructor:** Asset import may not be complete. Use `EditorApplication.delayCall` to defer.
- **Storing per-project state in `EditorPrefs`:** EditorPrefs is global, not per-project. Use files in the project directory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP server in Unity | Custom TCP socket parsing | `System.Net.HttpListener` | Handles HTTP parsing, headers, content-length, keep-alive. Reimplementing HTTP is error-prone. |
| JSON serialization (C#) | Manual `StringBuilder` JSON | `Newtonsoft.Json` (Unity built-in package) | Edge cases with escaping, Unicode, nested structures, null handling. Newtonsoft handles all of these. |
| Thread-safe queue | Custom locking queue | `ConcurrentQueue<T>` | Lock-free, battle-tested, part of .NET Standard. Custom locking is easy to get wrong. |
| HTTP client (CLI) | Custom `http.request` wrapper with redirect/timeout handling | Bun's built-in `fetch` with `AbortSignal.timeout()` | `fetch` handles redirects, encoding, connection management. `AbortSignal.timeout()` provides clean timeouts. |
| Process alive check | Parsing `ps aux` output | `process.kill(pid, 0)` (Node/Bun) or OS-specific check | Cross-platform PID check is a one-liner: `try { process.kill(pid, 0); return true; } catch { return false; }` |
| TTY detection | Custom terminal detection | `process.stdout.isTTY` / `process.stderr.isTTY` | Built into Node.js/Bun. Correctly handles piping, redirection, and non-terminal environments. |

**Key insight:** The Unity plugin must use only built-in .NET and Unity APIs -- no NuGet packages, no third-party dependencies. Every component in the C# stack is part of Unity's built-in runtime. On the CLI side, use Bun's built-in APIs (`fetch`, `process`) and existing dependencies (Commander.js, chalk).

## Common Pitfalls

### Pitfall 1: Main Thread Requirement for Unity API Calls

**What goes wrong:** HttpListener callbacks arrive on thread pool threads. Calling any Unity API (`EditorApplication`, `AssetDatabase`, `SceneManager`, etc.) from these threads causes crashes, silent corruption, or intermittent exceptions without clear stack traces.

**Why it happens:** Unity's entire Editor API is main-thread-only, but this is not enforced at compile time -- it fails at runtime, sometimes inconsistently.

**How to avoid:** Implement `MainThreadDispatcher` with `ConcurrentQueue<Action>` drained by `EditorApplication.update`. Every request handler must route through `MainThreadDispatcher.Invoke()`. No exceptions.

**Warning signs:** Intermittent `UnityException: can only be called from the main thread`; native crashes in Editor.log; requests that work sometimes but fail under load.

### Pitfall 2: Domain Reload Destroys All Server State

**What goes wrong:** Every C# edit triggers domain reload which unloads the entire AppDomain, destroying static variables, threads, socket handles, event subscriptions, and the HttpListener. Server silently stops responding. Port may not be released (OS TIME_WAIT).

**Why it happens:** Domain reload is a full AppDomain teardown, not a hot reload. This is fundamental to Unity's Editor architecture.

**How to avoid:** Use `[InitializeOnLoad]` to restart server after reload. Use `AssemblyReloadEvents.beforeAssemblyReload` to cleanly stop the listener before reload (release port). Use `EditorApplication.delayCall` in the static constructor to defer startup. Persist the port to a file so the CLI can reconnect after reload.

**Warning signs:** Server works until first code edit, then never recovers. Port conflicts on restart. CLI reports "connection refused" after recompilation.

### Pitfall 3: Port Conflicts and Stale Port Files

**What goes wrong:** Multiple Unity instances try the same port. Crashed/force-killed Unity leaves stale port files pointing to dead servers.

**Why it happens:** Users commonly have multiple projects open. Force-quit (kill -9, Task Manager) does not run cleanup handlers.

**How to avoid:** Try ports in range (17580-17589). Write port file with PID. CLI validates PID is alive before connecting. CLI health-checks the server after reading port file. Clean up stale port files when PID is dead.

**Warning signs:** `AddressInUseException` in Unity console. CLI connects to wrong project. Port file exists but server is not running.

### Pitfall 4: HttpListener Platform Differences (Windows vs macOS)

**What goes wrong:** Windows uses HTTP.sys kernel driver; macOS uses Mono's managed implementation. Binding to `http://+:PORT/` or `http://*:PORT/` requires admin on Windows. `HttpListener.Stop()` may not immediately release the port on macOS (TIME_WAIT).

**How to avoid:** Always bind to `http://localhost:{port}/`. Set `HttpListener.IgnoreWriteExceptions = true`. Handle `HttpListenerException` and `ObjectDisposedException` around `GetContext()` (these are expected on `Stop()`). Test on both platforms.

**Warning signs:** "Access denied" on Windows. Port not released after Stop() on macOS. Connection resets for large responses.

### Pitfall 5: InitializeOnLoad Runs Before Asset Import

**What goes wrong:** `[InitializeOnLoad]` static constructors run during domain reload, before asset import completes. Calling asset operations (`AssetDatabase.LoadAssetAtPath`, etc.) from here fails silently or throws.

**How to avoid:** Use `EditorApplication.delayCall` to defer server startup to after Editor initialization is complete. Never access assets directly in the static constructor.

**Warning signs:** NullReferenceException during Editor startup. Server fails to start on first project open but works after manual restart.

### Pitfall 6: `fetch` Error Handling for Connection Refused

**What goes wrong:** When Unity is not running, `fetch('http://localhost:17580/...')` throws a `TypeError` with the message "fetch failed" and a `cause` property containing the actual error (e.g., `ECONNREFUSED`). The error structure differs from standard HTTP errors.

**How to avoid:** Wrap all `fetch` calls in try/catch. Check `error.cause?.code === 'ECONNREFUSED'` for connection failures. Translate network errors into user-friendly `GameKitError` with clear messages about Unity not running.

**Warning signs:** Unhandled promise rejections with "fetch failed". Users see raw error objects instead of helpful messages.

## Code Examples

### Health Check Endpoint (Unity C#)

```csharp
// Handlers/HealthHandler.cs
public static class HealthHandler
{
    public static ApiResponse Handle(HttpListenerRequest request)
    {
        return MainThreadDispatcher.Invoke(() =>
        {
            var status = "idle";
            if (EditorApplication.isCompiling) status = "compiling";
            else if (EditorApplication.isPlaying && EditorApplication.isPaused) status = "paused";
            else if (EditorApplication.isPlaying) status = "playing";

            return ApiResponse.Success(new
            {
                status,
                unityVersion = Application.unityVersion,
                projectPath = Application.dataPath.Replace("/Assets", ""),
                projectName = Application.productName,
                platform = Application.platform.ToString()
            });
        });
    }
}
```

### Port File Management (Unity C#)

```csharp
// Utils/PortManager.cs
public static class PortManager
{
    private static readonly int PortRangeStart = 17580;
    private static readonly int PortRangeEnd = 17589;

    public static int FindAvailablePort(int start = -1, int end = -1)
    {
        start = start < 0 ? PortRangeStart : start;
        end = end < 0 ? PortRangeEnd : end;

        for (int port = start; port <= end; port++)
        {
            try
            {
                var listener = new HttpListener();
                listener.Prefixes.Add($"http://localhost:{port}/");
                listener.Start();
                listener.Stop();
                listener.Close();
                return port;
            }
            catch (HttpListenerException) { continue; }
        }
        return -1; // No available port
    }

    public static void WritePortFile(int port)
    {
        var projectRoot = Application.dataPath.Replace("/Assets", "");
        var gamekitDir = Path.Combine(projectRoot, ".gamekit");
        Directory.CreateDirectory(gamekitDir);

        var serverInfo = new ServerInfo
        {
            port = port,
            pid = System.Diagnostics.Process.GetCurrentProcess().Id,
            unityVersion = Application.unityVersion,
            projectPath = projectRoot,
            startedAt = DateTime.UtcNow.ToString("o")
        };

        var json = JsonConvert.SerializeObject(serverInfo, Formatting.Indented);
        File.WriteAllText(Path.Combine(gamekitDir, "server.json"), json);
    }

    public static void DeletePortFile()
    {
        var projectRoot = Application.dataPath.Replace("/Assets", "");
        var portFile = Path.Combine(projectRoot, ".gamekit", "server.json");
        if (File.Exists(portFile))
            File.Delete(portFile);
    }

    [System.Serializable]
    private class ServerInfo
    {
        public int port;
        public int pid;
        public string unityVersion;
        public string projectPath;
        public string startedAt;
    }
}
```

### CLI Connection Discovery (TypeScript)

```typescript
// src/utils/connection.ts
import * as fs from 'fs';
import * as path from 'path';

export class GameKitError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'GameKitError';
  }
}

export interface ServerInfo {
  port: number;
  pid: number;
  unityVersion: string;
  projectPath: string;
  startedAt: string;
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readServerInfo(projectPath: string): ServerInfo {
  const portFilePath = path.join(projectPath, '.gamekit', 'server.json');

  if (!fs.existsSync(portFilePath)) {
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Unity is not running.\n\nOpen your project in Unity, then try again.\nThe gamekit plugin starts automatically when Unity opens.'
    );
  }

  const info: ServerInfo = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));

  if (!isProcessRunning(info.pid)) {
    fs.unlinkSync(portFilePath);
    throw new GameKitError(
      'UNITY_NOT_RUNNING',
      'Unity is no longer running (stale port file removed).\n\nReopen Unity and try again.'
    );
  }

  return info;
}

export async function healthCheck(port: number, timeoutMs: number = 3000): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.json();
    return body.success === true;
  } catch {
    return false;
  }
}

export async function getConnection(projectPath: string): Promise<ServerInfo> {
  const info = readServerInfo(projectPath);
  const healthy = await healthCheck(info.port);

  if (!healthy) {
    throw new GameKitError(
      'UNITY_NOT_RESPONDING',
      'Unity is running but the gamekit plugin is not responding.\n\nTry restarting Unity, or run: gamekit doctor'
    );
  }

  return info;
}
```

### CLI Output Formatting (TypeScript)

```typescript
// src/utils/output.ts
import chalk from 'chalk';

export interface OutputOptions {
  json?: boolean;
}

export function isJsonMode(options: OutputOptions): boolean {
  return options.json === true || !process.stdout.isTTY;
}

export function outputSuccess(data: unknown, options: OutputOptions): void {
  const json = JSON.stringify(data, null, 2);
  process.stdout.write(json + '\n');
}

export function outputError(code: string, message: string, exitCode: number = 1): never {
  const json = JSON.stringify({ error: { code, message } });
  process.stdout.write(json + '\n');

  if (process.stderr.isTTY) {
    process.stderr.write(chalk.red(`\nError: ${message}\n`));
  }

  process.exit(exitCode);
}

export function log(message: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(message + '\n');
  }
}
```

### Assembly Definition (Unity)

```json
// template/Editor/GameKit/GameKit.asmdef
{
    "name": "GameKit",
    "rootNamespace": "GameKit",
    "references": [],
    "includePlatforms": ["Editor"],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "overrideReferences": false,
    "precompiledReferences": [],
    "autoReferenced": true,
    "defineConstraints": [],
    "versionDefines": [],
    "noEngineReferences": false
}
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 1) | Impact |
|-------------------------|------------------------|--------|
| MCP relay via CodeMaestro (`advanced-unity-mcp` package) | Direct HTTP bridge (HttpListener in Unity plugin) | Eliminates third-party dependency, reduces latency (no relay process), enables curl-able debugging |
| `.mcp.json` configuration file in project root | `.gamekit/server.json` port file auto-written by Unity plugin | Zero manual configuration -- CLI auto-discovers Unity instance |
| MCP relay polling (wait up to 5 minutes for relay install) | Health check endpoint on Unity plugin | Instant connection validation, no waiting for external processes |
| Unstructured console output only | JSON to stdout + human-readable to stderr | Machine-readable output for AI agents; composable with jq, grep, etc. |
| `getMcpPackageUrl()` injects MCP package into manifest.json | Unity plugin copied to `Assets/Editor/GameKit/` during init | Plugin ships with gamekit, no external package manager dependency |
| `src/utils/mcp.ts` (MCP config generation) | `src/utils/bridge.ts` + `src/utils/connection.ts` | Clean separation: connection discovery vs HTTP communication |

**Deprecated/outdated (to remove):**
- `src/utils/mcp.ts`: Entire file -- MCP config generation, relay waiting, relay existence checking
- `src/utils/manifest.ts`: `addMcpToManifest()` -- MCP package injection into Unity manifest
- `src/utils/platform.ts`: `getMcpRelayPath()` -- MCP relay file path resolution
- `src/commands/init.ts`: All MCP-related steps (manifest injection, .mcp.json generation, relay waiting)
- `src/commands/doctor.ts`: `checkMcpConfig()`, `checkMcpRelay()` checks
- `src/__tests__/utils/mcp.test.ts`: Entire test file
- `src/__tests__/utils/manifest.test.ts`: MCP-specific tests

## Open Questions

1. **Unity plugin location: `Assets/Editor/GameKit/` vs `Packages/com.gamekit.bridge/`**
   - What we know: The research suggests two options. Assets/Editor/ is simpler (just copy files). Packages/ as a local package is cleaner (isolated compilation, package.json declares dependencies, cleaner uninstall).
   - What's unclear: Whether `gamekit init` should add a local package reference to manifest.json or just copy files to Assets/Editor/.
   - Recommendation: Use `Assets/Editor/GameKit/` for simplicity. This matches the prior decision "Unity plugin lives in this repo under template/" and the existing pattern of copying template files. The assembly definition provides compilation isolation without needing a full Unity package. A Unity package adds manifest.json modification complexity that is unnecessary for Phase 1.

2. **Newtonsoft.Json availability in Unity 2020.3 LTS**
   - What we know: `com.unity.nuget.newtonsoft-json` is available as a Unity package. It ships bundled in Unity 2022+. For Unity 2020-2021, it must be declared as a dependency.
   - What's unclear: Whether Unity 2020.3 requires explicit installation or if it is available in the package registry by default.
   - Recommendation: Include `"com.unity.nuget.newtonsoft-json": "3.0.0"` as a dependency in the assembly definition or document it as a requirement. If this proves problematic on Unity 2020, fall back to manual JSON construction for the limited API surface (health check response is simple).

3. **Unity 6 CoreCLR transition and HttpListener**
   - What we know: Unity is migrating from Mono to CoreCLR. As of early 2026, CoreCLR is planned for the desktop player in Unity 6.7 with an Editor migration following. Current Unity 6 (6000.0-6000.3) still uses Mono for the Editor.
   - What's unclear: Exact timeline for CoreCLR in the Editor. Whether HttpListener behavior changes.
   - Recommendation: HttpListener is part of .NET Standard and works on both Mono and CoreCLR. No code changes expected. Test on Unity 6 early in development to verify. LOW risk.

4. **Whether to use `fetch` or Node `http` module on CLI side**
   - What we know: The existing codebase uses Node's `https` module (in updater.ts). Bun's compiled binaries support the global `fetch` API. `fetch` is simpler, handles more edge cases, and is the modern standard.
   - Recommendation: Use `fetch`. The CLI compiles to Bun standalone binaries where `fetch` is globally available. This is a natural evolution of the codebase and simpler than the Node `http` module. The updater.ts pattern can be migrated later but is not part of Phase 1 scope.

5. **`.gamekit/` directory in gitignore**
   - What we know: The port file (`server.json`) should not be committed to git. The `.gamekit/` directory in the project root is runtime-generated.
   - Recommendation: Add `.gamekit/` to the project's `.gitignore` during `gamekit init`. This is a small addition to the init flow.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: All source files in `src/`, all test files in `src/__tests__/`, `template/`, `package.json`, `tsconfig.json`
- Planning documents: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
- Prior research: `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `.planning/research/FEATURES.md`, `.planning/research/SUMMARY.md`
- Codebase analysis: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md`
- [Unity InitializeOnLoadAttribute docs](https://docs.unity3d.com/ScriptReference/InitializeOnLoadAttribute.html)
- [Unity domain reload documentation](https://docs.unity3d.com/Manual/domain-reloading.html)
- [Unity 6 Mono scripting backend docs](https://docs.unity3d.com/6000.3/Documentation/Manual/scripting-backends-mono.html)
- [Bun fetch documentation](https://bun.com/docs/guides/http/fetch)
- [Bun standalone executables documentation](https://bun.com/docs/bundler/executables)
- [Node.js TTY documentation](https://nodejs.org/api/tty.html)

### Secondary (MEDIUM confidence)
- [Unity HttpListener example (GitHub Gist)](https://gist.github.com/amimaro/10e879ccb54b2cacae4b81abea455b10)
- [sachaamm/unity-http-listener (GitHub)](https://github.com/sachaamm/unity-http-listener) - Controller-based routing example
- [AlexStormwood/UnityWithEmbeddedRestServer (GitHub)](https://github.com/AlexStormwood/UnityWithEmbeddedRestServer) - REST server example
- [Unity Newtonsoft.Json package docs](https://docs.unity3d.com/Packages/com.unity.nuget.newtonsoft-json@3.2/manual/index.html)
- [Unity CoreCLR roadmap discussion](https://discussions.unity.com/t/the-unity-engine-roadmap-unite-2025/1696495)
- [Unity 2026 roadmap article](https://digitalproduction.com/2025/11/26/unitys-2026-roadmap-coreclr-verified-packages-fewer-surprises/)

### Tertiary (LOW confidence)
- Unity 6 CoreCLR HttpListener behavior: Not verified with a live Unity 6 installation. CoreCLR migration for the Editor is still upcoming. HttpListener works on both Mono and CoreCLR, so risk is low.
- Newtonsoft.Json availability in Unity 2020.3 LTS without explicit installation: Community reports suggest it is in the registry but not auto-installed. Needs validation on a 2020.3 project.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components are built-in (.NET HttpListener, Unity Editor APIs, Bun fetch). No external dependencies to evaluate.
- Architecture: HIGH - Main thread dispatch and domain reload patterns are well-established Unity plugin patterns documented across official docs and multiple community implementations.
- Pitfalls: HIGH - The pitfalls (main thread, domain reload, port conflicts, platform differences) are well-documented and have known solutions. The prior research at `.planning/research/PITFALLS.md` is thorough.
- MCP removal: HIGH - The MCP code is concentrated in known files. Removal is mechanical and well-scoped. All touch points are identified.
- CLI output formatting: HIGH - JSON-to-stdout/human-to-stderr is a standard CLI pattern. TTY detection via `process.stdout.isTTY` is built-in.

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days -- stable domain, unlikely to change)
