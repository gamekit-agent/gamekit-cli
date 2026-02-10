# Pitfalls Research

**Domain:** Unity Editor CLI Integration via HTTP Bridge
**Researched:** 2026-02-09
**Confidence:** MEDIUM (based on training data -- web verification unavailable; Unity Editor scripting domain is well-established and unlikely to have shifted significantly)

## Critical Pitfalls

### Pitfall 1: Main Thread Requirement for Unity API Calls

**What goes wrong:**
HttpListener runs on a background thread. Calling nearly any Unity API (EditorApplication, AssetDatabase, GameView, SceneManager, etc.) from a non-main thread throws exceptions or causes silent corruption/crashes. The exceptions are often not `InvalidOperationException` with a clear message -- in older Unity versions they can be native crashes with no managed stack trace.

**Why it happens:**
Developers familiar with standard .NET HTTP servers expect request handlers to just call whatever API they need. Unity's entire Editor API is main-thread-only, but this is not enforced at compile time -- it fails at runtime, sometimes inconsistently.

**How to avoid:**
Implement a thread-safe command queue pattern:
1. HttpListener callback enqueues a request object into a `ConcurrentQueue<Action>` (or custom struct queue).
2. An `EditorApplication.update` callback dequeues and executes on the main thread.
3. Use `ManualResetEventSlim` or `TaskCompletionSource<T>` to signal the HTTP thread when the result is ready, so the response can be sent back synchronously from the listener's perspective.

Key detail: the `EditorApplication.update` delegate fires ~100 times/second in a focused Editor, but can drop to ~4/second when the Editor is in the background or unfocused. This means response latency is variable (10ms-250ms) depending on Editor focus state.

**Warning signs:**
- Intermittent `UnityException: ... can only be called from the main thread` in Console
- Native crashes in Editor logs (Editor.log) without managed stack traces
- HTTP requests that work sometimes but fail under load or when Editor is busy compiling

**Phase to address:**
Phase 1 (Core HTTP Server) -- this is the foundational architecture decision. Getting this wrong means rewriting the entire request handling pipeline.

---

### Pitfall 2: Domain Reload Destroys Server State

**What goes wrong:**
Every time a C# script is modified, saved, or Unity detects a change in Assets/, Unity triggers a domain reload. This process:
1. Serializes all serializable state
2. Unloads the entire .NET AppDomain
3. Recompiles scripts
4. Loads a new AppDomain
5. Restores serialized state

HttpListener, background threads, ConcurrentQueues, event subscriptions, and any in-memory state are **completely destroyed** during this process. The HTTP server silently stops responding. The port may or may not be released depending on OS-level socket teardown timing.

**Why it happens:**
Domain reload is a fundamental Unity Editor mechanism that most plugin developers underestimate. It is not like a "hot reload" -- it is a full AppDomain teardown. Static variables reset to defaults. Thread handles become invalid. Socket handles are orphaned at the OS level.

**How to avoid:**
1. Use `[InitializeOnLoadMethod]` or `[InitializeOnLoad]` static constructor to restart the server after every domain reload.
2. Register `AssemblyReloadEvents.beforeAssemblyReload` to cleanly shut down HttpListener and release the port BEFORE reload starts.
3. Register `AssemblyReloadEvents.afterAssemblyReload` as a backup restart path.
4. Implement port file persistence: write the active port to a temp file (e.g., `{ProjectPath}/Temp/GameKitServer.port`) so the CLI can re-discover the port after reload.
5. Store minimal server config in `EditorPrefs` or a `ScriptableSingleton<T>` (Unity 2020+) so settings survive reload.
6. Consider the "Enter Play Mode Settings" option: Unity 2019.3+ allows disabling domain reload on play mode entry. Your server must work both with and without this setting enabled.

**Warning signs:**
- Server becomes unreachable after editing any C# script in the project
- Port conflicts on restart (previous listener did not release the socket)
- CLI reports "connection refused" after user makes code changes
- Server works perfectly until the first recompilation, then never recovers

**Phase to address:**
Phase 1 (Core HTTP Server) -- must be designed in from the start. Retrofitting domain-reload resilience is a near-complete rewrite.

---

### Pitfall 3: Port Conflicts and Stale Port Files

**What goes wrong:**
Multiple Unity Editor instances (different projects) each try to start an HTTP server. If a fixed port is used, only the first Editor wins. If a port file is used for discovery, stale port files from crashed Editor sessions point the CLI to dead endpoints or wrong Editor instances.

**Why it happens:**
Unity developers commonly have 2-5 projects open simultaneously. Each Editor process is independent. A crashed or force-killed Editor will not clean up its port file or release its socket (the OS will release the socket after TIME_WAIT, typically 60-120 seconds on macOS, 30 seconds on Windows).

**How to avoid:**
1. Use port 0 (OS-assigned ephemeral port) with `HttpListener`, then read back the actual port from the listener's `Prefixes` after `Start()`. Actually, `HttpListener` does not support port 0 the same way `TcpListener` does -- you must either pick a port and retry on `AddressInUseException`, or use a port-scanning strategy.
2. Better approach: try ports in a defined range (e.g., 56000-56100), incrementing on failure.
3. Write a port file that includes the Editor process ID (PID). CLI validates the PID is still running before connecting.
4. Include the project path hash in the port file name so multiple projects don't collide: `Temp/GameKitServer-{projectPathHash}.port` in each project, plus a global discovery file like `~/.gamekit/servers.json`.
5. Implement a health check endpoint (`GET /health`) that returns project path and Unity version. CLI verifies it connected to the right project.

**Warning signs:**
- CLI connects but sends commands to the wrong Unity project
- `AddressInUseException` in Editor Console on startup
- Server starts fine in isolation but fails when multiple Editors are open
- Port file exists but server is not running (stale after crash)

**Phase to address:**
Phase 1 (Core HTTP Server) for basic port management; Phase 2 (CLI Integration) for discovery and validation logic.

---

### Pitfall 4: Play Mode Transitions Break Everything

**What goes wrong:**
Entering and exiting Play Mode in Unity Editor causes significant state changes. With domain reload enabled (default), entering Play Mode triggers a full domain reload (see Pitfall 2). Even with domain reload disabled, many Editor APIs behave differently in Play Mode vs Edit Mode. For example:
- `AssetDatabase.Refresh()` does nothing in Play Mode
- Scene manipulation APIs behave differently
- `EditorApplication.isCompiling` can become true during Play Mode exit
- Some EditorWindow references become invalid

**Why it happens:**
Play Mode simulates a runtime build within the Editor. The Editor enters a hybrid state where some APIs are "runtime" and some are "editor." This is one of Unity's most complex internal state machines, and even Unity Technologies' own tools sometimes get it wrong.

**How to avoid:**
1. Subscribe to `EditorApplication.playModeStateChanged` and track the four states: `EnteredEditMode`, `ExitingEditMode`, `EnteredPlayMode`, `ExitingPlayMode`.
2. Queue or reject commands that are invalid for the current Editor state. Return clear error messages: "Cannot refresh assets while in Play Mode."
3. During play mode transitions (the "Exiting" states), pause request processing entirely -- the Editor is in an inconsistent state.
4. If domain reload on play mode is enabled (the default), the server will be destroyed and recreated. Test this flow explicitly.
5. Add an `/editor/state` endpoint that returns the current Editor mode so the CLI can adapt.

**Warning signs:**
- Commands that work in Edit Mode fail silently in Play Mode
- Server goes unresponsive when user clicks Play
- Race conditions during the transition window (commands sent during the ~1-3 second transition)

**Phase to address:**
Phase 2 (Editor Commands) for the state management; Phase 1 must at least survive the domain reload aspect.

---

### Pitfall 5: Screenshot Capture is Harder Than It Looks

**What goes wrong:**
Capturing a screenshot of the Game View or Scene View from an Editor script is unreliable. Common failures:
- `ScreenCapture.CaptureScreenshot()` only works in Play Mode and captures the Game View
- `Camera.Render()` + `RenderTexture` requires a camera to exist in the scene and be configured
- Game View may not exist, may be behind other windows, may be at 0x0 resolution
- Scene View capture requires finding the SceneView window and using internal/reflection-based APIs
- `EditorWindow.GetWindow<GameView>()` fails if GameView is closed; `GameView` type is internal to UnityEditor

**Why it happens:**
Unity's screenshot APIs are designed for runtime (player builds), not Editor tooling. Editor window rendering goes through a completely different pipeline. There is no first-class "capture this EditorWindow as an image" API.

**How to avoid:**
1. For Game View: use `UnityEditorInternal.InternalEditorUtility.RepaintAllViews()` followed by a frame delay, then access GameView via reflection: `System.Type.GetType("UnityEditor.GameView,UnityEditor")`.
2. For reliable capture: force the Game View open with `EditorApplication.ExecuteMenuItem("Window/General/Game")`, ensure it has focus, use `ScreenCapture.CaptureScreenshotAsTexture()` (requires Play Mode), or use `RenderTexture` approach with an explicit camera.
3. For Scene View: `SceneView.lastActiveSceneView.camera` provides access to the scene camera, then render to a `RenderTexture` and read back with `Texture2D.ReadPixels()`.
4. Resolution gotcha: Game View resolution depends on the Game View window size and the "Resolution" dropdown. Capture may be at unexpected sizes.
5. Consider offering multiple capture modes: "game" (Game View, Play Mode only), "scene" (Scene View camera), "camera" (specific named camera rendered offscreen).
6. The `Texture2D.ReadPixels()` call must happen within `OnPostRender` or after `Camera.Render()` -- not in an arbitrary frame. Getting the timing wrong produces black or corrupted images.

**Warning signs:**
- Black or corrupted screenshots
- Screenshots at wrong resolution
- `NullReferenceException` when Game View is not open
- Capture works on developer's machine but fails for users with different Editor layouts

**Phase to address:**
Dedicated phase for screenshot support -- this is a feature with enough complexity to warrant its own implementation phase. Do not bundle with simpler Editor commands.

---

### Pitfall 6: HttpListener Platform Differences (Windows vs macOS)

**What goes wrong:**
`HttpListener` in .NET (used by Unity's Mono runtime) behaves differently on Windows vs macOS:
- **Windows:** `HttpListener` uses HTTP.sys kernel driver. Listening on `http://+:PORT/` or `http://*:PORT/` may require admin privileges or URL ACL registration. Listening on `http://localhost:PORT/` works without elevation.
- **macOS:** Uses a managed implementation. No ACL issues, but different socket behavior. `HttpListener.Stop()` may not immediately release the port.
- **Mono vs .NET:** Unity uses Mono (not CoreCLR, except Unity 6 which moved to CoreCLR in some configurations). Mono's HttpListener has known bugs around connection keep-alive, chunked transfer encoding, and large request bodies.

**Why it happens:**
Unity's C# runtime is not standard .NET. It is (historically) Mono with Unity-specific patches. The networking stack has subtle differences from .NET Framework and .NET Core.

**How to avoid:**
1. Always bind to `http://localhost:{port}/` specifically -- never `+` or `*` prefixes on Windows.
2. Set `HttpListener.IgnoreWriteExceptions = true` to prevent crashes when clients disconnect mid-response.
3. Keep request/response bodies small (< 1MB). For screenshots, consider streaming or chunked responses with explicit Content-Length.
4. Test on both platforms early. Do not assume macOS behavior matches Windows.
5. Handle `HttpListenerException` and `ObjectDisposedException` around `GetContext()` / `GetContextAsync()` -- these are thrown on `Stop()` and are expected, not errors.
6. Set reasonable timeouts. Mono's HttpListener does not always respect `ReadWriteTimeout`.

**Warning signs:**
- "Access denied" errors on Windows when starting the listener
- Port not released after `Stop()` on macOS (TIME_WAIT)
- Encoding issues in request/response bodies
- Large responses (screenshots) causing connection resets

**Phase to address:**
Phase 1 (Core HTTP Server) -- cross-platform must be validated from day one.

---

### Pitfall 7: Unity Version Compatibility Across 2020-6+

**What goes wrong:**
APIs change across Unity versions, often without clear deprecation paths:
- `AssemblyReloadEvents` exists since 2017.1 but behavior changed in 2020
- `ScriptableSingleton<T>` availability and behavior varies
- `EditorApplication.update` += delegate registration may be lost differently across versions
- Unity 6 (6000.x) moved from Mono to CoreCLR in some build configurations, changing .NET API availability
- `PackageManager` API changed significantly between 2020 and 2022
- `AssetDatabase.Refresh()` options differ
- `EditorSceneManager` vs `SceneManager` usage in Editor context

**Why it happens:**
Unity Technologies iterates rapidly and sometimes introduces breaking changes in minor versions. The Editor scripting API surface is large and not as rigorously versioned as the Runtime API.

**How to avoid:**
1. Define a minimum version floor explicitly (2020.3 LTS recommended).
2. Use `#if UNITY_2021_1_OR_NEWER` preprocessor directives for version-gated API calls.
3. Wrap version-specific APIs in abstraction methods so the server code does not have `#if` blocks scattered throughout.
4. Create a `VersionCompat` static class that provides unified methods across versions.
5. Test against the oldest supported version (2020.3) and the newest (Unity 6 latest), not just the developer's current version.
6. Be cautious with Unity 6 + CoreCLR: `HttpListener` behavior may differ from Mono. If Unity 6 users report issues, this is the first thing to check.

**Warning signs:**
- Compiler errors when user opens project in a different Unity version
- Runtime `MissingMethodException` or `TypeLoadException`
- Features that silently do nothing on older versions (no error, just no effect)
- User reports that work on 2022 but fail on 2020

**Phase to address:**
Phase 1 must establish the version abstraction layer. Every subsequent phase must test against version boundaries.

---

### Pitfall 8: Editor.log Flooding and Console Log Capture Race Conditions

**What goes wrong:**
When capturing Unity Console logs via `Application.logMessageReceived` or `Application.logMessageReceivedThreaded`:
1. High-frequency log capture (100+ logs/second during asset import) can cause the HTTP bridge to buffer unboundedly, leading to memory exhaustion.
2. `logMessageReceived` fires on the main thread; `logMessageReceivedThreaded` fires on the logging thread. Using the wrong one causes either missed logs or thread-safety issues.
3. Subscribing to these events and never unsubscribing creates a memory leak that survives across domain reloads if using `[InitializeOnLoad]` without cleanup.
4. Unity's internal logging during domain reload/compilation can fire events at times when your handler's captured state is partially torn down, causing NullReferenceExceptions in the log handler itself, which Unity then tries to log, creating an infinite loop.

**Why it happens:**
Log capture seems trivial ("just subscribe to the event"), but Unity's logging system is deeply integrated with the native engine and fires in contexts that managed code does not control.

**How to avoid:**
1. Use `Application.logMessageReceivedThreaded` for completeness, but immediately enqueue to a bounded `ConcurrentQueue<LogEntry>` (cap at ~1000 entries). Drop oldest when full.
2. Unsubscribe in `AssemblyReloadEvents.beforeAssemblyReload`.
3. Wrap the log handler in a try-catch that does NOT log on failure (avoids infinite loop).
4. Implement log polling from CLI side (`GET /logs?since={timestamp}`) rather than server-push, to let the CLI control throughput.
5. Never call `Debug.Log()` inside a `logMessageReceived` handler.

**Warning signs:**
- Memory usage climbing steadily during long Editor sessions
- Editor freezing during asset import (log buffer growing faster than it drains)
- `StackOverflowException` or infinite loop in Console
- Missing logs or duplicate logs

**Phase to address:**
Phase 2 or 3 (Console Log Capture feature). Must be designed carefully -- do not treat as a simple feature.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using reflection to access internal Unity APIs (GameView, etc.) | Access to functionality Unity doesn't expose | Breaks on any Unity update that refactors internals; no compile-time safety | Only for screenshots and window management; wrap in try-catch with graceful fallback |
| Fixed port number instead of dynamic allocation | Simpler CLI discovery | Fails with multiple Editor instances; user conflicts with other local servers | Never -- implement dynamic ports from day one |
| Synchronous `GetContext()` instead of async pattern | Simpler code | Blocks thread; harder to shut down cleanly; `Stop()` throws | Early prototyping only; switch to async before shipping |
| Skipping domain reload handling | Faster initial development | Server silently dies on any recompilation; users think tool is broken | Never -- it is the #1 complaint for Unity Editor plugins that use background threads |
| String-based JSON serialization without a model | No schema overhead | Fragile, no validation, mismatched field names cause silent failures | Never -- use Unity's `JsonUtility` or `EditorJsonUtility` with typed models |
| Using `EditorPrefs` for all server state | Simple persistence | `EditorPrefs` is global (not per-project); leaks state across projects | Only for genuinely global settings (like "enable server on startup"). Per-project state goes in `Temp/` or `ProjectSettings/` |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| HttpListener + Unity threading | Calling `EditorApplication` APIs from listener thread | Enqueue to main thread via `EditorApplication.update` + command queue |
| AssetDatabase.Refresh() | Calling during Play Mode or during another refresh | Check `EditorApplication.isCompiling` and `EditorApplication.isUpdating` before calling; return error if busy |
| EditorBuildSettings | Modifying build settings and starting build in same frame | Delay build start by one frame after settings change; use `EditorApplication.delayCall` |
| Scene loading in Editor | Using `SceneManager.LoadScene()` (runtime API) | Use `EditorSceneManager.OpenScene()` in Edit Mode; `SceneManager` only in Play Mode |
| Unity Package Manager | Adding package via manifest.json and expecting immediate availability | After modifying `manifest.json`, call `Client.Resolve()` or wait for automatic resolve; packages are not available until resolve completes |
| Undo system | Making scene/object changes without undo registration | Use `Undo.RecordObject()` before changes, `Undo.RegisterCreatedObjectUndo()` for new objects -- users expect Ctrl+Z to work |
| Project-relative vs absolute paths | Using absolute paths in APIs that expect Assets-relative paths | Unity Asset APIs expect `Assets/path/to/file.ext` format; always convert with `Path.GetRelativePath()` or strip the project path prefix |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling `EditorApplication.update` with heavy work | Editor becomes sluggish; 100% CPU on one core | Only process queued commands in update; do not poll file systems or scan assets | Immediately if heavy work is done every frame |
| Unbounded log buffer | Memory grows linearly with Editor session length | Ring buffer with fixed capacity (1000 entries); CLI polls and acknowledges | After ~30 minutes of heavy logging (asset imports, build) |
| Screenshot capture every frame | Editor FPS drops to single digits | Throttle to max 2 captures/second; require explicit request, not continuous streaming | Immediately if polling-based |
| Large JSON responses for scene hierarchy | Multi-second response times; Editor hangs during serialization | Paginate or depth-limit scene hierarchy queries; serialize off-main-thread where possible | Scenes with 1000+ GameObjects |
| AssetDatabase.FindAssets in every request | 500ms+ per call on large projects | Cache results; invalidate cache on `AssetDatabase.importCompleted` callback | Projects with 10,000+ assets |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Binding to `0.0.0.0` instead of `127.0.0.1`/`localhost` | Any device on the local network can send commands to the Editor -- execute arbitrary code via build or script compile commands | Always bind to `http://127.0.0.1:{port}/` or `http://localhost:{port}/`. Never expose to network. |
| No authentication on HTTP endpoints | Any local process can send commands -- malicious software or other localhost services could manipulate the Editor | Implement a shared secret token: server writes token to port file, CLI reads it, sends as `Authorization: Bearer {token}` header. Rotate token on each server restart. |
| Executing arbitrary C# via an "eval" endpoint | Full code execution within the Editor process with user's filesystem permissions | Do not build a generic "execute C# code" endpoint. Expose specific, scoped commands only. If REPL is needed, sandbox heavily. |
| Returning full file paths in error messages | Leaks user's filesystem structure, username, project location | Sanitize paths in error responses to be project-relative |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Server silently fails to start (port in use, exception swallowed) | CLI says "cannot connect" with no actionable information | Write status to port file: `{"status": "error", "reason": "port 56000 in use"}`. CLI reads this and shows specific guidance. |
| No feedback during long operations (build, asset import) | User thinks CLI is hung; cancels and retries, making things worse | Implement progress streaming: long operations return 202 Accepted with a job ID; CLI polls `GET /jobs/{id}` for progress |
| Commands fail with generic "internal error" | User cannot self-diagnose; files support tickets | Return structured error JSON: `{"error": "main_thread_timeout", "message": "...", "suggestion": "Check if Unity Editor is responding"}` |
| Server auto-starts but user didn't want it | Unexpected port usage, firewall prompts on Windows, confusion | Off by default. Require explicit enable via `gamekit init` or Editor menu item. Persist preference in EditorPrefs. |
| CLI hangs when Editor is in a modal dialog | HTTP request blocks indefinitely because `EditorApplication.update` doesn't fire during modal dialogs (e.g., save dialog, build dialog) | Set HTTP response timeout (5 seconds). If timeout, return `{"error": "editor_busy", "message": "Editor may be showing a dialog. Dismiss it and retry."}` |

## "Looks Done But Isn't" Checklist

- [ ] **HTTP Server starts:** Often missing domain reload survival -- verify server restarts after editing any C# file in the project
- [ ] **Screenshot capture works:** Often missing Game View closed/minimized case -- verify with Game View tab closed
- [ ] **Console log capture:** Often missing unsubscription on reload -- verify no duplicate log entries after 3+ recompilations
- [ ] **Port discovery:** Often missing stale file cleanup -- verify after force-killing Unity (kill -9 / Task Manager end process)
- [ ] **Scene manipulation:** Often missing Undo integration -- verify Ctrl+Z reverses operations done via CLI
- [ ] **Asset refresh:** Often missing the "already compiling" guard -- verify behavior when triggered during an ongoing compilation
- [ ] **Play Mode toggle:** Often missing the transition window -- verify commands sent during the 1-3 second transition don't crash
- [ ] **Build trigger:** Often missing progress/completion reporting -- verify CLI knows when build finishes and whether it succeeded
- [ ] **Cross-platform:** Often missing Windows HttpListener ACL -- verify on a fresh Windows machine without admin rights
- [ ] **Multi-project:** Often missing project identity validation -- verify with two Unity projects open simultaneously

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Main thread not enforced (Pitfall 1) | HIGH | Requires rearchitecting request handler pipeline. Extract all Unity API calls behind a dispatcher interface. |
| Domain reload not handled (Pitfall 2) | HIGH | Must add lifecycle management to every stateful component. If server was designed as a singleton, may need full rewrite. |
| Fixed port (Pitfall 3) | MEDIUM | Change from fixed to dynamic port; add port file; update CLI discovery. Moderate refactor. |
| Play Mode transitions (Pitfall 4) | MEDIUM | Add state machine and request gating. Can be retrofitted without full rewrite. |
| Screenshot via wrong API (Pitfall 5) | LOW | Replace capture method. Isolated feature, doesn't affect other code. |
| Platform differences (Pitfall 6) | MEDIUM | Primarily testing and conditionals. May require some API-level changes if wrong listener pattern was chosen. |
| Version compat (Pitfall 7) | HIGH if no abstraction | If `#if` directives are scattered, extracting to a compat layer is tedious. If done upfront, adding versions is low cost. |
| Log capture leak (Pitfall 8) | LOW | Fix subscription lifecycle. Bounded buffer is a small change. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Main thread enforcement | Phase 1: Core Server | Unit test that verifies no Unity API call outside main thread dispatcher |
| Domain reload survival | Phase 1: Core Server | Integration test: modify C# file, verify server responds after recompile |
| Port management | Phase 1: Core Server + Phase 2: CLI Discovery | Open 2 Editor instances, verify CLI connects to correct one |
| Play Mode transitions | Phase 2: Editor Commands | Toggle Play Mode during active HTTP request, verify graceful handling |
| Screenshot capture | Dedicated Screenshot Phase | Capture with Game View closed, minimized, and at various resolutions |
| Platform differences | Phase 1: Core Server (CI matrix) | Automated tests on both macOS and Windows |
| Version compatibility | All phases (CI matrix) | Build and run tests against Unity 2020.3 LTS and Unity 6 latest |
| Log capture lifecycle | Console Logs Phase | 5 consecutive domain reloads, verify log count stays bounded |

## Sources

- Unity Editor scripting domain knowledge (training data, HIGH confidence for established patterns)
- .NET Mono HttpListener behavior (training data, MEDIUM confidence -- Mono-specific quirks may have changed in recent Unity 6 builds)
- Unity domain reload mechanics (well-documented, HIGH confidence -- core architecture unchanged since Unity 2017)
- Unity 6 CoreCLR migration (LOW confidence -- verify whether Unity 6 shipping builds use CoreCLR or Mono for Editor, as this was in flux during 2024-2025)
- Cross-platform HttpListener ACL behavior (HIGH confidence -- Windows HTTP.sys behavior is long-established)

**Note:** Web search and Context7 were unavailable during this research. All findings are based on training data. The Unity Editor scripting domain is mature and well-established, so most patterns are unlikely to have changed. The main area of uncertainty is Unity 6's .NET runtime (Mono vs CoreCLR transition), which should be verified against current Unity 6 release notes before implementation begins.

---
*Pitfalls research for: Unity Editor CLI Integration via HTTP Bridge*
*Researched: 2026-02-09*
