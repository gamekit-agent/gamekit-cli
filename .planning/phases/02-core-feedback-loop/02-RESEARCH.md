# Phase 2: Core Feedback Loop - Research

**Researched:** 2026-02-09
**Domain:** Unity compilation pipeline, console log capture, play mode control, HTTP streaming (SSE)
**Confidence:** HIGH

## Summary

Phase 2 builds the primary development loop: write code, trigger compilation, read errors, enter play mode, read runtime logs. This is the most critical phase for Claude's development workflow -- without it, Claude writes code blind with no feedback on whether it compiles or what happens at runtime. The phase requires three work streams on both the Unity plugin side (C# handlers) and CLI side (TypeScript commands): (1) a refresh/compile endpoint that triggers `AssetDatabase.Refresh()`, collects structured `CompilerMessage` data via `CompilationPipeline.assemblyCompilationFinished`, and waits for compilation to finish; (2) a log buffer that captures Unity console output via `Application.logMessageReceived`, stores entries in a ring buffer with mode/timestamp tags, and exposes them via both a polling endpoint and a streaming SSE endpoint; (3) play mode control via `EditorApplication.EnterPlaymode()` / `ExitPlaymode()` with state tracking via `EditorApplication.playModeStateChanged`.

The Unity C# APIs for all three areas are well-documented and stable. The main architectural challenge is the compilation wait pattern: `AssetDatabase.Refresh()` is synchronous but triggers an asynchronous compilation pipeline. The handler must subscribe to `CompilationPipeline.compilationFinished` before calling Refresh, then block the HTTP response until compilation completes (or times out). The log streaming requirement (LOG-05) introduces the only non-request/response pattern in the system -- Server-Sent Events (SSE) via chunked transfer encoding on the C# HttpListener side, consumed by streaming `fetch` on the CLI side.

**Primary recommendation:** Build refresh/compile first (it exercises the most complex async-wait pattern and validates the full feedback loop), then console logs (the ring buffer is independent and straightforward), then play mode control (simplest handlers, but depends on log buffer being in place to verify runtime logs are captured).

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| `AssetDatabase.Refresh()` | Unity 2020+ | Trigger reimport of changed assets and scripts | The canonical way to tell Unity "files changed on disk, reimport them." Triggers the compilation pipeline for C# files. |
| `CompilationPipeline.assemblyCompilationFinished` | Unity 2020+ (`UnityEditor.Compilation`) | Collect structured compilation errors per assembly | Fires on main thread with `CompilerMessage[]` containing file, line, column, message, and type (Error/Warning). The only way to get structured compiler output. |
| `CompilationPipeline.compilationFinished` | Unity 2020+ | Know when all compilation is done | Fires after the last `assemblyCompilationFinished`. Use as the "compilation complete" signal. |
| `Application.logMessageReceived` | Unity 2020+ | Capture all Debug.Log/Warning/Error/Exception output | Main-thread callback with message string, stack trace, and LogType. Fires for both edit-mode and play-mode logs. |
| `EditorApplication.EnterPlaymode()` | Unity 2020+ | Enter play mode programmatically | Simple void method. Equivalent to `EditorApplication.isPlaying = true`. |
| `EditorApplication.ExitPlaymode()` | Unity 2020+ | Exit play mode programmatically | Simple void method. Equivalent to `EditorApplication.isPlaying = false`. |
| `EditorApplication.playModeStateChanged` | Unity 2020+ | Track play mode state transitions | Fires with `PlayModeStateChange` enum: `EnteredEditMode`, `ExitingEditMode`, `EnteredPlayMode`, `ExitingPlayMode`. |
| `EditorApplication.isPlaying` / `isCompiling` | Unity 2020+ | Query current editor state | Boolean properties. Already used in HealthHandler. |
| `HttpListenerResponse.SendChunked` | .NET Standard 2.1 | Enable chunked transfer for SSE streaming | Property on HttpListenerResponse. Set to `true` before writing to OutputStream. Required for SSE. |
| Bun `fetch` + `ReadableStream` | Bun built-in | Consume SSE stream on CLI side | `fetch` returns `Response` with `body` as `ReadableStream`. Use `getReader()` to consume chunks. Built into Bun runtime. |
| Commander.js | ^12.1.0 (existing) | CLI subcommand registration | Already in use. Add `refresh`, `console`, and `play` subcommands. |

### Supporting

| Library/API | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `CompilationPipeline.RequestScriptCompilation()` | Unity 2020+ | Force recompilation without file changes | Alternative to `AssetDatabase.Refresh()` when only script recompilation is needed. However, `AssetDatabase.Refresh()` is preferred because it also handles asset reimport. |
| `Application.logMessageReceivedThreaded` | Unity 2020+ | Capture logs from non-main threads | Same as `logMessageReceived` but fires on any thread. Not needed initially since `logMessageReceived` covers all main-thread logs including play mode. Only needed if worker thread logs are missing. |
| `LogType` enum | Unity 2020+ | Categorize log entries | Values: `Log`, `Warning`, `Error`, `Assert`, `Exception`. Maps to CLI filter flags. |
| `PlayModeStateChange` enum | Unity 2020+ | Identify state transitions | Values: `EnteredEditMode`, `ExitingEditMode`, `EnteredPlayMode`, `ExitingPlayMode`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `AssetDatabase.Refresh()` | `CompilationPipeline.RequestScriptCompilation()` | `RequestScriptCompilation` only recompiles scripts. `AssetDatabase.Refresh()` also handles new/changed asset files. Since Claude writes C# files AND may add assets, `Refresh` is the right call. |
| `Application.logMessageReceived` (main thread) | `Application.logMessageReceivedThreaded` (any thread) | Threaded version requires thread-safe handler code. Main-thread version is simpler and captures all Unity logs including Debug.Log calls from MonoBehaviours. Use main-thread version unless logs from Jobs/Burst are needed (unlikely for game dev workflow). |
| SSE (Server-Sent Events) for log streaming | WebSocket | SSE is unidirectional (server-to-client) which is exactly the log streaming use case. Simpler than WebSocket -- just HTTP with `text/event-stream` content type. No additional library needed on either side. |
| SSE for log streaming | Polling at short interval | Polling wastes bandwidth and adds latency. SSE delivers logs immediately as they appear. The CLI can still fall back to polling if SSE connection drops. |
| Ring buffer for log storage | Unbounded list | Unity projects can generate thousands of logs per second during play mode. An unbounded list would grow without limit. A ring buffer (e.g., 1000-2000 entries) keeps memory bounded while retaining recent logs. |

## Architecture Patterns

### Recommended Project Structure

New files for Phase 2 (additions to existing structure):

```
template/Editor/GameKit/
├── Handlers/
│   ├── HealthHandler.cs            # EXISTING
│   ├── RefreshHandler.cs           # NEW: POST /api/refresh
│   ├── ConsoleHandler.cs           # NEW: GET /api/console, GET /api/console/stream
│   └── PlayHandler.cs              # NEW: POST /api/play/start, POST /api/play/stop, GET /api/play/status
├── Services/
│   ├── CompilationService.cs       # NEW: CompilationPipeline event subscription, error collection
│   └── LogService.cs               # NEW: Log buffer, Application.logMessageReceived subscription
├── Models/
│   ├── ApiResponse.cs              # EXISTING
│   ├── CompilerError.cs            # NEW: Structured compilation error model
│   └── LogEntry.cs                 # NEW: Structured log entry model
└── ...existing files...

src/
├── commands/
│   ├── init.ts                     # EXISTING
│   ├── doctor.ts                   # EXISTING
│   ├── refresh.ts                  # NEW: gamekit refresh command
│   ├── console.ts                  # NEW: gamekit console command
│   └── play.ts                     # NEW: gamekit play command
└── utils/
    └── ...existing files...
```

### Pattern 1: Compilation Wait with Callback

**What:** HTTP handler triggers AssetDatabase.Refresh(), subscribes to CompilationPipeline events to collect errors, and blocks the HTTP response until compilation finishes or times out.

**When to use:** POST /api/refresh endpoint.

**How it works:**

```csharp
// Source: Unity Scripting API - CompilationPipeline events
// https://docs.unity3d.com/ScriptReference/Compilation.CompilationPipeline.html

public static class CompilationService
{
    private static List<CompilerError> _errors = new List<CompilerError>();
    private static bool _isCompiling;
    private static bool _compilationComplete;

    [InitializeOnLoadMethod]
    private static void Init()
    {
        CompilationPipeline.assemblyCompilationFinished += OnAssemblyCompiled;
        CompilationPipeline.compilationFinished += OnCompilationFinished;
        CompilationPipeline.compilationStarted += OnCompilationStarted;
    }

    private static void OnCompilationStarted(object context)
    {
        _errors.Clear();
        _isCompiling = true;
        _compilationComplete = false;
    }

    private static void OnAssemblyCompiled(string assemblyPath, CompilerMessage[] messages)
    {
        foreach (var msg in messages)
        {
            if (msg.type == CompilerMessageType.Error || msg.type == CompilerMessageType.Warning)
            {
                _errors.Add(new CompilerError
                {
                    file = msg.file,
                    line = msg.line,
                    column = msg.column,
                    message = msg.message,
                    severity = msg.type == CompilerMessageType.Error ? "error" : "warning"
                });
            }
        }
    }

    private static void OnCompilationFinished(object context)
    {
        _isCompiling = false;
        _compilationComplete = true;
    }

    // Called by RefreshHandler to get last compilation results
    public static (bool hasErrors, List<CompilerError> errors) GetLastResults()
    {
        return (_errors.Any(e => e.severity == "error"), new List<CompilerError>(_errors));
    }
}
```

**Critical detail:** The `compilationFinished` event fires on the main thread. Since HTTP handlers also run on the main thread (via MainThreadDispatcher), the handler cannot simply block waiting for the event. The handler must:
1. Call `AssetDatabase.Refresh()`
2. If `EditorApplication.isCompiling` is true after Refresh, return immediately with a "compiling" status
3. The CLI polls or waits and then calls a second endpoint to get results
OR:
1. Call `AssetDatabase.Refresh()`
2. If compilation is needed, `AssetDatabase.Refresh()` may return after compilation completes (it is partially synchronous)
3. Check `CompilationService.GetLastResults()` for errors

**Important nuance on Refresh behavior:** `AssetDatabase.Refresh()` is synchronous for the import phase but compilation may happen asynchronously afterward. The safest pattern is to call `AssetDatabase.Refresh()`, then check `EditorApplication.isCompiling` -- if false, compilation either finished immediately or was not needed. If true, the handler needs to poll until `isCompiling` becomes false.

### Pattern 2: Log Ring Buffer with SSE Streaming

**What:** A persistent service captures all Unity console output into a ring buffer. The console endpoint returns buffered entries. The console/stream endpoint holds the HTTP connection open and writes new entries as SSE events.

**When to use:** GET /api/console (polling) and GET /api/console/stream (SSE).

**How the ring buffer works:**

```csharp
// Source: Unity Scripting API - Application.logMessageReceived
// https://docs.unity3d.com/ScriptReference/Application-logMessageReceived.html

public static class LogService
{
    private static readonly LogEntry[] _buffer = new LogEntry[2000];
    private static int _writeIndex;
    private static int _totalCount;
    private static long _sequence; // monotonic sequence number for SSE cursor
    private static readonly List<Action<LogEntry>> _listeners = new List<Action<LogEntry>>();

    [InitializeOnLoadMethod]
    private static void Init()
    {
        Application.logMessageReceived += OnLogReceived;
        EditorApplication.playModeStateChanged += OnPlayModeChanged;
    }

    private static void OnLogReceived(string message, string stackTrace, LogType type)
    {
        var entry = new LogEntry
        {
            message = message,
            stackTrace = type == LogType.Exception || type == LogType.Error ? stackTrace : null,
            severity = MapSeverity(type),
            mode = EditorApplication.isPlaying ? "play" : "edit",
            timestamp = DateTime.UtcNow.ToString("o"),
            sequence = Interlocked.Increment(ref _sequence)
        };

        _buffer[_writeIndex % _buffer.Length] = entry;
        _writeIndex++;
        _totalCount++;

        // Notify SSE listeners
        foreach (var listener in _listeners.ToArray())
        {
            listener(entry);
        }
    }

    private static string MapSeverity(LogType type)
    {
        return type switch
        {
            LogType.Error => "error",
            LogType.Exception => "error",
            LogType.Assert => "error",
            LogType.Warning => "warning",
            _ => "info"
        };
    }

    public static void AddListener(Action<LogEntry> listener) => _listeners.Add(listener);
    public static void RemoveListener(Action<LogEntry> listener) => _listeners.Remove(listener);
}
```

### Pattern 3: SSE Streaming from HttpListener

**What:** The console stream endpoint keeps the HTTP connection open and writes log entries as SSE events using chunked transfer encoding.

**When to use:** GET /api/console/stream endpoint.

**How it works (C# side):**

```csharp
// Source: HttpListenerResponse.SendChunked
// https://learn.microsoft.com/en-us/dotnet/api/system.net.httplistenerresponse.sendchunked

public static void HandleStream(HttpListenerContext context)
{
    context.Response.ContentType = "text/event-stream";
    context.Response.SendChunked = true;
    context.Response.Headers.Add("Cache-Control", "no-cache");
    context.Response.Headers.Add("Connection", "keep-alive");

    var stream = context.Response.OutputStream;
    var writer = new StreamWriter(stream, Encoding.UTF8) { AutoFlush = true };

    Action<LogEntry> listener = (entry) =>
    {
        try
        {
            var json = JsonConvert.SerializeObject(entry);
            writer.Write($"data: {json}\n\n");
            writer.Flush();
        }
        catch (Exception)
        {
            // Client disconnected
        }
    };

    LogService.AddListener(listener);

    // Keep connection open until client disconnects
    // This needs special handling -- see Pitfalls section
}
```

**How it works (CLI side):**

```typescript
// Bun fetch with ReadableStream for SSE consumption
const res = await fetch(`http://localhost:${port}/api/console/stream`);
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n\n');
  buffer = lines.pop()!; // keep incomplete chunk

  for (const block of lines) {
    if (block.startsWith('data: ')) {
      const json = block.slice(6);
      const entry = JSON.parse(json);
      // Format and output to terminal
    }
  }
}
```

### Pattern 4: Play Mode Control

**What:** Simple handler that calls `EditorApplication.EnterPlaymode()` / `ExitPlaymode()` and reports state.

**When to use:** POST /api/play/start, POST /api/play/stop, GET /api/play/status.

```csharp
// Source: Unity Scripting API - EditorApplication
// https://docs.unity3d.com/ScriptReference/EditorApplication.html

public static class PlayHandler
{
    public static ApiResponse HandleStart(HttpListenerRequest request)
    {
        if (EditorApplication.isPlaying)
            return ApiResponse.Success(new { status = "already_playing" });

        if (EditorApplication.isCompiling)
            return ApiResponse.Error("COMPILING", "Cannot enter play mode while compiling");

        EditorApplication.EnterPlaymode();
        return ApiResponse.Success(new { status = "entering_play_mode" });
    }

    public static ApiResponse HandleStop(HttpListenerRequest request)
    {
        if (!EditorApplication.isPlaying)
            return ApiResponse.Success(new { status = "already_stopped" });

        EditorApplication.ExitPlaymode();
        return ApiResponse.Success(new { status = "exiting_play_mode" });
    }

    public static ApiResponse HandleStatus(HttpListenerRequest request)
    {
        string state;
        if (EditorApplication.isPlaying && EditorApplication.isPaused)
            state = "paused";
        else if (EditorApplication.isPlaying)
            state = "playing";
        else
            state = "stopped";

        return ApiResponse.Success(new { state });
    }
}
```

### Anti-Patterns to Avoid

- **Blocking the main thread indefinitely during compilation:** `AssetDatabase.Refresh()` can trigger compilation that takes tens of seconds. The HTTP handler must not hold a lock on the main thread that prevents compilation events from firing. The handler should either return quickly and let the CLI poll, or carefully yield control.

- **Unbounded log buffer:** Never use an unbounded List for log storage. Play mode can generate thousands of logs per second (e.g., Debug.Log in Update()). Use a fixed-size ring buffer.

- **Forgetting to unsubscribe SSE listeners:** If the client disconnects, the listener lambda stays in the listeners list and throws on every write. Always wrap writes in try/catch and remove the listener on failure.

- **Mixing console handler with compilation errors:** Compilation errors come from `CompilationPipeline`, not from `Application.logMessageReceived`. They are separate systems. The log buffer should NOT try to capture compilation errors -- those come through `CompilationService` and are returned by the refresh endpoint.

- **Calling Unity API from non-main thread in SSE handler:** The SSE listener callback fires on the main thread (since `logMessageReceived` fires on main thread). However, the SSE write happens on the main thread too, which blocks other work. Keep writes minimal -- just serialize and flush.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured compilation errors | Manual regex parsing of compiler output | `CompilationPipeline.assemblyCompilationFinished` with `CompilerMessage[]` | The struct already has file, line, column, message, type. Regex parsing compiler output is fragile and version-dependent. |
| Log capture | Custom log file parsing | `Application.logMessageReceived` event | Unity's built-in event captures all Debug.Log/Warning/Error/Exception calls with stack traces. Parsing log files is fragile and misses real-time data. |
| Play mode control | Simulating keypress or menu click | `EditorApplication.EnterPlaymode()` / `ExitPlaymode()` | Direct API calls. No need for UI automation. |
| SSE framing | Custom protocol over raw TCP | Standard SSE format (`data: ...\n\n`) over `text/event-stream` | SSE is a well-understood standard. The `fetch` API on the client side handles it natively via ReadableStream. |
| Thread-safe ring buffer | Lock-based synchronized list | Array with modular index + `Interlocked.Increment` for sequence counter | Lock-free ring buffer is simple and fast for single-writer (main thread) scenario. |

**Key insight:** Unity provides structured APIs for all three domain areas (compilation, logging, play mode). The work is wiring these APIs to HTTP endpoints and consuming them on the CLI side -- not building custom solutions for any of these problems.

## Common Pitfalls

### Pitfall 1: Refresh-Then-Wait Deadlock

**What goes wrong:** The HTTP handler calls `AssetDatabase.Refresh()` on the main thread, then tries to wait for `compilationFinished` to fire -- but `compilationFinished` also fires on the main thread, which is blocked by the handler.

**Why it happens:** Both `MainThreadDispatcher.Invoke()` and Unity compilation events run on the main thread. If the handler blocks waiting for a compilation event, the event can never fire.

**How to avoid:** Two viable approaches:
1. **Return-and-poll:** The refresh endpoint calls `AssetDatabase.Refresh()`, then immediately returns `{ "status": "compiling" }`. The CLI polls `/api/refresh/status` until compilation finishes. Simple, no deadlock risk.
2. **Synchronous Refresh:** In practice, `AssetDatabase.Refresh()` often completes compilation synchronously before returning (especially for small projects). After calling Refresh, check `EditorApplication.isCompiling` -- if false, compilation is done and errors are available immediately. Only use poll-then-check as fallback.

**Warning signs:** HTTP request times out, Unity editor freezes during gamekit commands.

### Pitfall 2: SSE Connection Lifetime Management

**What goes wrong:** The SSE streaming endpoint keeps the HTTP connection open indefinitely. If the client disconnects without proper cleanup, the server accumulates dead listeners that throw on every write attempt.

**Why it happens:** HttpListener doesn't provide a built-in "client disconnected" notification. The server only discovers disconnection when a write fails.

**How to avoid:**
1. Wrap every SSE write in try/catch. On exception, remove the listener from LogService.
2. Send periodic "heartbeat" events (e.g., every 10 seconds) with `event: heartbeat\ndata: {}\n\n` to detect dead connections proactively.
3. On the CLI side, handle `AbortSignal` for Ctrl+C cleanup -- call `reader.cancel()` to close the stream gracefully.

**Warning signs:** Memory growth over time, increasing number of exceptions in Unity console from failed SSE writes.

### Pitfall 3: Log Buffer Overflow During Play Mode

**What goes wrong:** A game with `Debug.Log()` in `Update()` generates 60+ logs per second per message. At 5 active log points, that is 300 logs/second. A 1000-entry buffer fills in 3 seconds, losing older entries.

**Why it happens:** Games frequently log in hot paths during development.

**How to avoid:** Use a 2000-entry ring buffer (covers ~7 seconds at 300 logs/sec). When returning buffered logs, include total count and dropped count so the CLI can warn the user. The SSE stream does NOT have this problem since entries are sent immediately.

**Warning signs:** CLI shows gaps in log sequences, `gamekit console` shows fewer entries than expected.

### Pitfall 4: Compilation Errors Persist Across Refreshes

**What goes wrong:** After a failed compilation, calling `AssetDatabase.Refresh()` again without fixing the code returns the same errors. But the `assemblyCompilationFinished` event may NOT fire again if Unity determines nothing changed.

**Why it happens:** Unity's incremental compilation skips unchanged assemblies. If the source files haven't changed, no compilation happens, so no events fire.

**How to avoid:** The `CompilationService` should store the last compilation result persistently (not just during the compilation callback). When the CLI calls `/api/refresh` and no compilation occurs (no `compilationStarted` event fires within a short window), return the cached results. Include a `cached: true` flag so the CLI knows these are stale results.

**Warning signs:** `gamekit refresh` returns "no errors" after a failed compile when the user hasn't actually fixed the code.

### Pitfall 5: Play Mode Transition Is Not Instantaneous

**What goes wrong:** `EditorApplication.EnterPlaymode()` does not immediately set `isPlaying` to true. The transition happens over multiple frames (domain reload, scene setup, etc.).

**Why it happens:** Unity's play mode entry involves saving scene state, reloading assemblies (unless Domain Reload is disabled), and initializing all MonoBehaviours.

**How to avoid:** The POST /api/play/start handler should return `{ "status": "entering_play_mode" }` immediately. The CLI should then poll `GET /api/play/status` (or use the existing health endpoint which already reports play state) to confirm the transition completed. The `playModeStateChanged` event can update an internal state tracker that the status endpoint reads.

**Warning signs:** CLI reports "entering play mode" but subsequent commands assume play mode is active when it is not yet.

### Pitfall 6: Domain Reload Destroys Log Buffer During Play Mode Entry

**What goes wrong:** When entering play mode with Domain Reload enabled (the default), all static state is destroyed and re-initialized. The log buffer, compilation results, and SSE listeners are all lost.

**Why it happens:** Unity reloads all managed assemblies when entering play mode, which re-executes all `[InitializeOnLoad]` and `[InitializeOnLoadMethod]` code.

**How to avoid:** For the log buffer, this is partially acceptable -- logs from before play mode entry are less relevant than runtime logs. However, the `LogService` must re-subscribe to `Application.logMessageReceived` in its `[InitializeOnLoadMethod]`. The `CompilationService` similarly re-subscribes to compilation events. The SSE streaming endpoint must handle the case where the listener is lost during domain reload -- the connection will likely fail on the next write, triggering cleanup. The CLI `--follow` mode should detect connection loss and reconnect automatically.

**Warning signs:** `gamekit console --follow` stops receiving logs after entering play mode.

## Code Examples

### CLI Command: gamekit refresh

```typescript
// src/commands/refresh.ts
// Pattern: connect, call API, format output
import { getConnection } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log, logSuccess } from '../utils/output.js';

export async function refresh(options: { json?: boolean }): Promise<void> {
  const info = await getConnection(process.cwd());

  try {
    const result = await request<RefreshResult>(info.port, 'POST', '/refresh', null, 60000);

    if (result.errors.length > 0) {
      const errorCount = result.errors.filter(e => e.severity === 'error').length;
      const warnCount = result.errors.filter(e => e.severity === 'warning').length;

      outputSuccess({ success: false, errors: result.errors }, options);

      log(`${errorCount} error(s), ${warnCount} warning(s)`);
      for (const err of result.errors) {
        log(`  ${err.file}:${err.line}:${err.column} ${err.severity}: ${err.message}`);
      }

      process.exit(1); // COMP-03: non-zero exit on errors
    }

    outputSuccess({ success: true, errors: [] }, options);
    logSuccess('Compilation successful');
  } catch (error) {
    if (error instanceof GameKitError) {
      outputError(error.code, error.message);
    }
    throw error;
  }
}

interface RefreshResult {
  errors: Array<{
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
}
```

### CLI Command: gamekit console

```typescript
// src/commands/console.ts
export async function console(options: {
  json?: boolean;
  errors?: boolean;
  warnings?: boolean;
  info?: boolean;
  follow?: boolean;
}): Promise<void> {
  const info = await getConnection(process.cwd());

  if (options.follow) {
    return streamLogs(info.port, options);
  }

  // Build query params for severity filtering
  const params = new URLSearchParams();
  if (options.errors) params.set('severity', 'error');
  else if (options.warnings) params.set('severity', 'warning');
  else if (options.info) params.set('severity', 'info');

  const logs = await request<LogResult>(info.port, 'GET', `/console?${params}`);
  outputSuccess(logs, options);
}

async function streamLogs(port: number, options: any): Promise<void> {
  const url = `http://localhost:${port}/api/console/stream`;
  const res = await fetch(url);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    reader.cancel();
    process.exit(0);
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop()!;

    for (const event of events) {
      if (event.startsWith('data: ')) {
        const entry = JSON.parse(event.slice(6));
        // Apply severity filter client-side for --follow mode
        if (shouldShow(entry, options)) {
          // Output each log entry
          process.stdout.write(JSON.stringify(entry) + '\n');
        }
      }
    }
  }
}
```

### CLI Command: gamekit play

```typescript
// src/commands/play.ts
export function registerPlayCommand(program: Command): void {
  const play = program.command('play').description('Control Unity play mode');

  play
    .command('start')
    .description('Enter play mode')
    .action(async () => {
      const info = await getConnection(process.cwd());
      const result = await request(info.port, 'POST', '/play/start');
      outputSuccess(result, program.opts());
      logSuccess('Entering play mode');
    });

  play
    .command('stop')
    .description('Exit play mode')
    .action(async () => {
      const info = await getConnection(process.cwd());
      const result = await request(info.port, 'POST', '/play/stop');
      outputSuccess(result, program.opts());
      logSuccess('Exiting play mode');
    });

  play
    .command('status')
    .description('Check play mode state')
    .action(async () => {
      const info = await getConnection(process.cwd());
      const result = await request(info.port, 'GET', '/play/status');
      outputSuccess(result, program.opts());
    });
}
```

### Unity Handler: RefreshHandler

```csharp
// template/Editor/GameKit/Handlers/RefreshHandler.cs
using System.Collections.Generic;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using UnityEditor;

namespace GameKit.Handlers
{
    public static class RefreshHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            // Clear previous results
            CompilationService.ClearResults();

            // Trigger refresh -- this may trigger compilation
            AssetDatabase.Refresh();

            // After Refresh returns, check if compilation happened
            // If EditorApplication.isCompiling is still true, compilation is async
            // In practice, Refresh often completes compilation synchronously
            if (EditorApplication.isCompiling)
            {
                return ApiResponse.Success(new { status = "compiling", errors = new object[0] });
            }

            var (hasErrors, errors) = CompilationService.GetLastResults();
            return ApiResponse.Success(new
            {
                status = hasErrors ? "error" : "success",
                errors
            });
        }
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `CompilationPipeline.assemblyCompilationFinished` (per-assembly) | Still current, no replacement | Stable since Unity 2019 | Provides `CompilerMessage[]` with file, line, column, message, type |
| `Application.RegisterLogCallback` | `Application.logMessageReceived` event | Unity 5.x | Modern event-based API replaces the old singleton callback |
| `EditorApplication.isPlaying = true` (setter) | `EditorApplication.EnterPlaymode()` method | Unity 2019+ | Clearer intent, same functionality |
| Manual SSE protocol implementation | Still manual on HttpListener | N/A (HttpListener has no SSE helper) | No framework support -- must implement SSE format manually, which is trivial |

**Deprecated/outdated:**
- `Application.RegisterLogCallback`: Replaced by `Application.logMessageReceived`. Do not use.
- `EditorApplication.playmodeStateChanged` (lowercase 'm'): Renamed to `playModeStateChanged` in Unity 2017+.

## Open Questions

1. **Refresh endpoint: synchronous or poll-based?**
   - What we know: `AssetDatabase.Refresh()` is partially synchronous. For small projects, compilation completes before Refresh returns. For large projects, it may be async.
   - What's unclear: Whether the synchronous path is reliable enough to avoid a poll-based fallback. Unity's behavior may depend on project size, complexity, and Domain Reload settings.
   - Recommendation: Start with synchronous approach (call Refresh, check isCompiling, return results). Add poll-based fallback (return "compiling" status + poll endpoint) only if testing reveals the synchronous path is unreliable. The CLI should handle both response shapes.

2. **SSE connection survival across domain reload**
   - What we know: Domain reload during play mode entry destroys all static state including SSE listeners. The HttpListener itself restarts via `[InitializeOnLoad]`.
   - What's unclear: Whether the TCP connection survives the reload or is dropped entirely. If the HttpListener is stopped and restarted, existing connections are likely dropped.
   - Recommendation: The CLI `--follow` mode should detect connection drops and automatically reconnect. Simple retry loop with exponential backoff (500ms, 1s, 2s, max 5s).

3. **Log buffer size**
   - What we know: Need to balance memory usage against log retention. Too small loses logs, too large wastes memory.
   - What's unclear: Typical log volume in development gameplay.
   - Recommendation: Start with 2000 entries. Include `totalCount` and `droppedCount` in the API response so the CLI can warn when logs have been dropped. Can be tuned later.

4. **CompilerMessage file path format**
   - What we know: There is a known Unity issue where CompilerMessage.file has incorrect values when the path contains spaces.
   - What's unclear: Whether this is fixed in current Unity versions. The workaround is to normalize paths.
   - Recommendation: Normalize all file paths in CompilationService (replace backslashes, resolve relative paths against project root). This handles both the spaces bug and cross-platform path differences.

## Sources

### Primary (HIGH confidence)
- [Unity Scripting API: CompilationPipeline](https://docs.unity3d.com/ScriptReference/Compilation.CompilationPipeline.html) - CompilationPipeline events, CompilerMessage struct
- [Unity Scripting API: CompilationPipeline.assemblyCompilationFinished](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Compilation.CompilationPipeline-assemblyCompilationFinished.html) - Event signature `Action<string, CompilerMessage[]>`
- [Unity Scripting API: CompilationPipeline.compilationFinished](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Compilation.CompilationPipeline-compilationFinished.html) - Compilation complete event
- [Unity Scripting API: CompilerMessage](https://docs.unity3d.com/ScriptReference/Compilation.CompilerMessage.html) - Struct with file, line, column, message, type fields
- [Unity Scripting API: Application.logMessageReceived](https://docs.unity3d.com/ScriptReference/Application-logMessageReceived.html) - Log callback with message, stackTrace, LogType
- [Unity Scripting API: LogType](https://docs.unity3d.com/ScriptReference/LogType.html) - Enum: Log, Warning, Error, Assert, Exception
- [Unity Scripting API: EditorApplication.EnterPlaymode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/EditorApplication.EnterPlaymode.html) - Enter play mode
- [Unity Scripting API: EditorApplication.ExitPlaymode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/EditorApplication.ExitPlaymode.html) - Exit play mode
- [Unity Scripting API: EditorApplication.playModeStateChanged](https://docs.unity3d.com/ScriptReference/EditorApplication-playModeStateChanged.html) - Play mode state change event
- [Unity Scripting API: PlayModeStateChange](https://docs.unity3d.com/ScriptReference/PlayModeStateChange.html) - Enum: EnteredEditMode, ExitingEditMode, EnteredPlayMode, ExitingPlayMode
- [Unity Scripting API: AssetDatabase.Refresh](https://docs.unity3d.com/ScriptReference/AssetDatabase.Refresh.html) - Trigger asset reimport
- [Unity Scripting API: RequestScriptCompilation](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Compilation.CompilationPipeline.RequestScriptCompilation.html) - Force recompilation
- [UnityCsReference: CompilationPipeline.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/Scripting/ScriptCompilation/CompilationPipeline.cs/) - Unity source reference for event signatures
- [Microsoft: HttpListenerResponse.SendChunked](https://learn.microsoft.com/en-us/dotnet/api/system.net.httplistenerresponse.sendchunked) - Chunked transfer encoding property

### Secondary (MEDIUM confidence)
- [Unity Issue Tracker: CompilerMessage file path with spaces](https://issuetracker.unity3d.com/issues/file-parameter-has-incorrect-value-in-compilermessage-when-the-path-has-spaces) - Known issue with file paths in CompilerMessage
- [Bun Docs: Streams](https://bun.com/docs/runtime/streams) - ReadableStream support in Bun
- [SSE with C# .NET (Medium)](https://medium.com/@kova98/server-sent-events-in-net-7f700b21cdb7) - SSE implementation patterns with .NET

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All Unity APIs (CompilationPipeline, logMessageReceived, EditorApplication play mode) are well-documented, stable since Unity 2019+, and verified against official Unity Scripting API docs.
- Architecture: HIGH - Patterns follow established Phase 1 architecture (HttpListener handlers, MainThreadDispatcher, ApiResponse envelope). SSE is standard HTTP protocol. The only non-trivial pattern is the compilation wait, which has multiple viable approaches.
- Pitfalls: HIGH - Pitfalls identified from Unity API documentation, known Unity issues, and standard HttpListener/SSE limitations. The domain reload pitfall is verified against Phase 1 research (AssemblyReloadEvents behavior).

**Research date:** 2026-02-09
**Valid until:** 2026-03-11 (30 days -- stable APIs, no changes expected)
