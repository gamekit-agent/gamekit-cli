# Project Research Summary

**Project:** GameKit CLI - Milestone 3 (HTTP Bridge)
**Domain:** Unity Editor CLI Integration via HTTP Bridge
**Researched:** 2026-02-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone replaces the third-party MCP relay architecture with a native HTTP bridge: a C# HttpListener server running inside the Unity Editor process, and a Node.js HTTP client in the TypeScript CLI. The research establishes that this is a well-documented pattern in Unity tooling, with clear architectural requirements around thread safety (Unity's main thread requirement) and lifecycle management (domain reload survival). The recommended stack uses only built-in technologies: `System.Net.HttpListener` on the Unity side and Node's `http` module on the CLI side, with JSON serialization via Unity's bundled `Newtonsoft.Json` package.

The core architectural challenge is Unity's main thread requirement: all Unity API calls must happen on the main thread, but HttpListener callbacks arrive on background threads. This requires a command queue pattern that dispatches work through `EditorApplication.update`. The second critical challenge is domain reload survival: Unity reloads the entire C# domain on every script compilation, destroying all in-memory state. The server must cleanly shut down before reload and restart afterward using `[InitializeOnLoad]` and `AssemblyReloadEvents`.

The recommended implementation approach is to build a minimal "hello world" end-to-end flow first (health check only), then incrementally add the operations Claude needs most: refresh/compile with error output, console log reading, screenshot capture, and play mode control. Scene manipulation operations (create/modify GameObjects) are high-value differentiators but come later due to complexity. This research identifies 8 critical pitfalls that must be designed around from day one, not retrofitted later.

## Key Findings

### Recommended Stack

The stack uses only built-in technologies to avoid external dependencies. Unity's `System.Net.HttpListener` provides the HTTP server inside the Editor process, with `Newtonsoft.Json` (bundled with Unity 2020+) for JSON serialization. The CLI uses Node's built-in `http` module, matching the existing pattern in `updater.ts`. Port discovery uses a simple file-based approach: Unity writes `{projectRoot}/.gamekit/server.json` with the active port and PID, the CLI reads this file and validates with a health check.

**Core technologies:**
- **System.Net.HttpListener** (Unity C#): HTTP server in Editor process — built into .NET runtime shipped with Unity 2020+, no external dependencies, works on Windows and macOS
- **Node.js `http` module** (CLI): HTTP client for localhost requests — zero dependencies, matches existing codebase patterns in updater.ts
- **Newtonsoft.Json** (Unity built-in package): JSON serialization — ships with Unity 2020+ as `com.unity.nuget.newtonsoft-json`, handles complex structures that `JsonUtility` cannot
- **EditorApplication.update + ConcurrentQueue**: Main thread dispatch pattern — critical for thread safety, all Unity API calls must route through this
- **Port file discovery** (.gamekit/server.json): Connection discovery — simple, reliable, handles multiple Unity instances per machine

**Critical version requirements:**
- Unity 2020.3+ minimum (HttpListener available, Newtonsoft.Json bundled)
- Works through Unity 6 (6000.x) without code changes
- Node 18+ (matches existing CLI requirement)

### Expected Features

Research identifies a clear split between **read operations** (table stakes — enable Claude's feedback loop) and **write operations** (differentiators — enable scene authoring). The most critical operation is refresh/recompile with structured compilation errors, which closes the "Claude edits code -> Unity compiles -> Claude fixes errors" loop.

**Must have (table stakes):**
- Refresh/recompile with structured compilation errors — the #1 feedback signal for Claude's code loop
- Console log reading (edit + play mode, filterable by severity) — second most critical feedback signal
- Screenshot capture (Game view and Scene view) — visual feedback for understanding game state
- Enter/exit play mode control — enables testing changes without manual interaction
- Scene hierarchy query — Claude needs to understand what exists in the scene
- GameObject component query — understanding object configuration and debugging
- Connection health check and auto-discovery — users should not configure ports manually
- Project file listing (scripts, scenes, prefabs) — Claude needs asset context

**Should have (competitive differentiators):**
- Scene manipulation (create/modify/delete GameObjects) — enables "vibe coding" of scenes, not just scripts
- Component property setting — turns gamekit from "code compiler" into "game editor"
- Build trigger with structured results — completes dev-to-ship loop without leaving CLI
- Undo support for all write operations — safety net that builds user trust
- Streaming console output — faster feedback loop during play mode debugging
- Project settings query (layers, tags, physics) — provides context for correct code generation

**Defer (v2+):**
- Prefab operations (create/modify/instantiate) — very high complexity with variants and overrides
- Material creation and shader property setting — useful but not critical path
- Animation state query — niche debugging need
- Test runner integration — valuable but secondary to build-run-debug loop
- Multi-command batching — optimization, not core functionality

### Architecture Approach

The architecture is a clean request/response HTTP bridge with explicit main thread dispatch. The CLI is a thin orchestrator: parse args, call `bridge.ts`, format output. All HTTP logic lives in `bridge.ts` (single HTTP client module) and `connection.ts` (discovery and health checks). The Unity plugin uses prefix-based routing (`/api/editor/*`, `/api/console/*`, `/api/scene/*`) with one handler file per route group. All Unity API calls funnel through `MainThreadDispatcher.Invoke()` which queues work onto `EditorApplication.update` callbacks.

**Major components:**
1. **CLI Commands** (src/commands/*.ts) — thin wrappers that parse args and call bridge.ts; one file per `gamekit` subcommand
2. **HTTP Client** (src/utils/bridge.ts) — unified client for all Unity communication; handles response envelope parsing and error translation
3. **Connection Manager** (src/utils/connection.ts) — port file reading, health checks, reconnection logic; commands never touch discovery directly
4. **Unity HTTP Server** (GameKitServer.cs) — HttpListener lifecycle, port selection, port file I/O, domain reload survival
5. **Main Thread Dispatcher** (MainThreadDispatcher.cs) — the critical architectural component; queues Unity API calls from background threads onto main thread via EditorApplication.update
6. **Request Handlers** (Handlers/*.cs) — one file per route group; maps HTTP routes to Unity API calls; all Unity API access goes through MainThreadDispatcher

**Key patterns:**
- **Port file discovery**: Unity writes `{projectRoot}/.gamekit/server.json` with port, PID, and Unity version; CLI reads this file and validates with health check
- **Standard API envelope**: All responses use `{ success: bool, data: object, error: object }` format for uniform error handling
- **Main thread dispatch**: HttpListener callbacks queue work onto Unity's main thread; responses block until work completes
- **Domain reload survival**: `[InitializeOnLoad]` restarts server after every compilation; `AssemblyReloadEvents.beforeAssemblyReload` shuts down cleanly

### Critical Pitfalls

1. **Main thread requirement for Unity API calls** — HttpListener runs on background threads; calling Unity APIs directly causes crashes or silent corruption. Prevention: all Unity API calls must go through `MainThreadDispatcher.Invoke()` which queues work onto `EditorApplication.update`. This is foundational architecture, not a bolt-on. Recovery cost: HIGH.

2. **Domain reload destroys server state** — Unity reloads the C# AppDomain on every script compilation, destroying all static state, threads, and socket handles. Prevention: use `[InitializeOnLoad]` to restart server after reload, `AssemblyReloadEvents.beforeAssemblyReload` to shut down cleanly before reload, and persist port number to file for CLI discovery. Recovery cost: HIGH.

3. **Port conflicts and stale port files** — Multiple Unity instances or crashed Editor sessions create conflicts. Prevention: try ports in range (e.g., 17580-17589), write port file with PID for validation, implement health check to detect stale files. Recovery cost: MEDIUM.

4. **Play mode transitions break state** — Entering/exiting play mode causes domain reload (if enabled) or significant state changes. Prevention: track play mode state via `EditorApplication.playModeStateChanged`; reject or queue operations invalid for current state; pause request processing during transitions. Recovery cost: MEDIUM.

5. **Screenshot capture is unreliable** — Game View may be closed/hidden; Scene View capture requires reflection-based APIs; resolution depends on window size. Prevention: use RenderTexture approach with explicit camera (works in edit mode); handle missing Game View gracefully; document resolution behavior. Recovery cost: LOW.

## Implications for Roadmap

Based on research, suggested phase structure emphasizes getting a minimal end-to-end flow working first, then building the operations Claude uses most, then expanding to scene manipulation.

### Phase 1: HTTP Bridge Foundation (Core Server + Connection)
**Rationale:** Establish the architectural foundation before building features. Main thread dispatch and domain reload survival cannot be retrofitted — they must be designed in from the start. The minimal deliverable is a health check endpoint that proves the entire chain works: Unity plugin starts on `[InitializeOnLoad]`, writes port file, survives domain reload, CLI discovers port, connects, gets response.

**Delivers:**
- Unity plugin: GameKitServer.cs with HttpListener lifecycle and port management
- MainThreadDispatcher.cs for thread-safe Unity API calls
- HealthHandler.cs returning editor state
- CLI: connection.ts (port discovery, health check, retry logic)
- CLI: bridge.ts (HTTP client with standard envelope parsing)
- CLI: `gamekit doctor` updated to check Unity connection (not MCP)

**Addresses features:**
- Connection health check (table stakes)
- Auto-discovery (table stakes)

**Avoids pitfalls:**
- Pitfall 1 (main thread) — MainThreadDispatcher is the foundation
- Pitfall 2 (domain reload) — lifecycle management from day one
- Pitfall 3 (port conflicts) — dynamic port selection and validation
- Pitfall 6 (HttpListener platform differences) — tested on both Windows and macOS

**Research flag:** SKIP RESEARCH — well-established patterns, fully documented in ARCHITECTURE.md and STACK.md

### Phase 2: Core Feedback Loop (Compilation + Console + Play Mode)
**Rationale:** These four operations enable Claude's primary workflow: write code, compile, test, see result. They share infrastructure (console log buffering, editor state tracking) and are the most frequently used operations. Building them together validates the main thread dispatch pattern under real load.

**Delivers:**
- Unity handlers: RefreshHandler (AssetDatabase.Refresh + compilation error capture), ConsoleHandler (log buffering and filtering), EditorHandler (play mode control and state query)
- CLI commands: `gamekit refresh`, `gamekit console`, `gamekit play`
- Log buffer with bounded capacity (prevent memory exhaustion from Pitfall 8)
- Compilation pipeline integration (capture errors with file:line:column)

**Addresses features:**
- Refresh/recompile with structured errors (table stakes, highest priority)
- Console log reading (table stakes)
- Enter/exit play mode (table stakes)
- Read runtime logs (table stakes)

**Avoids pitfalls:**
- Pitfall 4 (play mode transitions) — state tracking and request gating
- Pitfall 8 (log flooding) — bounded circular buffer, no unbounded memory growth

**Research flag:** SKIP RESEARCH — APIs are stable (`EditorApplication`, `AssetDatabase`, `CompilationPipeline`), patterns are documented in STACK.md

### Phase 3: Visual Feedback (Screenshots)
**Rationale:** Screenshot capture is complex enough to warrant its own phase. Game View capture requires handling closed/minimized windows. Scene View capture requires reflection to access internal Unity types. Treating this as a distinct phase prevents scope creep in Phase 2 and allows focused testing across different Editor layouts.

**Delivers:**
- Unity handler: ScreenshotHandler with multiple capture modes (game view, scene view, specific camera)
- RenderTexture-based capture (works in edit mode)
- CLI command: `gamekit screenshot --view=game|scene`
- Graceful fallbacks for missing Game View

**Addresses features:**
- Screenshot Game view (table stakes)
- Screenshot Scene view (table stakes)
- Selective screenshot (differentiator, if time permits)

**Avoids pitfalls:**
- Pitfall 5 (screenshot unreliability) — RenderTexture approach, explicit error handling

**Research flag:** MEDIUM RESEARCH — may need to verify reflection-based Scene View capture APIs in Unity 6, test across Editor layouts

### Phase 4: Scene Inspection (Hierarchy + Components)
**Rationale:** Read-before-write: Claude cannot meaningfully create or modify GameObjects without first understanding what exists. These are read-only operations, simpler than scene manipulation, but still require efficient serialization to avoid Pitfall 4 (large hierarchies).

**Delivers:**
- Unity handler: SceneHandler with hierarchy serialization (recursive tree walk with pagination/depth limits)
- GameObject component query with property serialization
- CLI commands: `gamekit scene ls`, `gamekit scene inspect <object>`

**Addresses features:**
- Scene hierarchy query (table stakes)
- GameObject component query (table stakes)

**Avoids pitfalls:**
- Performance trap: large scene hierarchies (implement depth limiting and pagination)

**Research flag:** SKIP RESEARCH — `EditorSceneManager` and `GameObject` APIs are stable

### Phase 5: Scene Authoring (GameObject Manipulation)
**Rationale:** This is the highest-complexity feature set: create/modify/delete GameObjects, add/configure components, set serialized properties. It requires undo system integration, robust SerializedObject/SerializedProperty handling, and careful validation. This is a major differentiator but must come after the read operations are solid.

**Delivers:**
- Unity handler: SceneHandler write operations (create/modify/delete GameObjects, add components, set properties)
- Undo integration for all write operations (`Undo.RecordObject`, `Undo.RegisterCreatedObjectUndo`)
- SerializedObject-based property setting (handles all Unity types: vectors, colors, references, arrays)
- CLI commands: `gamekit scene create`, `gamekit scene modify`, `gamekit scene delete`

**Addresses features:**
- Scene manipulation (differentiator, high value)
- Component property setting (differentiator, turns gamekit into "game editor")
- Undo support (differentiator, builds user trust)

**Avoids pitfalls:**
- Integration gotcha: Undo system (all operations must register for undo)

**Research flag:** HIGH RESEARCH — SerializedObject property setting is complex; may need research-phase on specific property types (arrays, nested objects, asset references)

### Phase 6: Project Context (Assets + Build)
**Rationale:** These operations are less frequent than the core loop but complete the dev-to-ship workflow. Asset search helps Claude discover existing resources. Build triggering enables end-to-end automation. Project settings query provides context for correct code generation.

**Delivers:**
- Unity handlers: ProjectHandler (asset search, project settings, layers/tags), BuildHandler (trigger builds, return results)
- CLI commands: `gamekit project ls`, `gamekit project settings`, `gamekit build`

**Addresses features:**
- Project file listing (table stakes)
- Build trigger with result (differentiator)
- Project settings query (differentiator)

**Avoids pitfalls:**
- Performance trap: AssetDatabase.FindAssets on large projects (cache results, invalidate on import)

**Research flag:** SKIP RESEARCH — `AssetDatabase` and `BuildPipeline` are stable APIs

### Phase 7: Template Migration (Remove MCP)
**Rationale:** Only migrate templates after the HTTP bridge is feature-complete and validated. Changing templates mid-development risks breaking existing users. This phase updates `gamekit init` to install the Unity plugin instead of the MCP package, updates template skills/commands to use `gamekit` CLI instead of MCP tools, and removes all MCP-related code.

**Delivers:**
- Modified `gamekit init`: copy Unity plugin to `Assets/Editor/GameKit/`, remove MCP package injection
- Updated template skills/commands/agents: replace MCP tool calls with `gamekit` CLI calls
- Removed: src/utils/mcp.ts, MCP-related code in init.ts

**Addresses:**
- Completion of MCP replacement
- New project templates use HTTP bridge by default

**Research flag:** SKIP RESEARCH — template migration is mechanical once HTTP bridge is proven

### Phase Ordering Rationale

- **Foundation first (Phase 1):** Main thread dispatch and domain reload survival cannot be retrofitted. Building these patterns into the architecture from day one prevents HIGH recovery cost later.
- **Most-used operations next (Phase 2):** Refresh/console/play mode are the highest-frequency operations. Building them early validates the architecture under real load and delivers immediate value to Claude's workflow.
- **Visual feedback separate (Phase 3):** Screenshot capture has unique complexity (reflection, window state handling). Isolating it prevents scope creep in Phase 2.
- **Read before write (Phase 4 before 5):** Scene inspection must work before scene manipulation. Understanding existing state is a prerequisite to modifying it.
- **High-complexity features later (Phase 5):** Scene authoring is the most complex feature set (undo, SerializedObject, validation). Building it after read operations are proven reduces risk.
- **Low-frequency features last (Phase 6):** Project context and builds are valuable but less frequent than the core loop. Deferring them allows earlier validation of the primary workflow.
- **Template migration after validation (Phase 7):** Don't change templates until the HTTP bridge is feature-complete and tested. This protects existing users from incomplete implementations.

### Research Flags

**Needs research during planning:**
- **Phase 3 (Screenshots):** Scene View capture reflection APIs may differ in Unity 6 vs 2020-2023. Verify `SceneView.lastActiveSceneView` and camera access.
- **Phase 5 (Scene Authoring):** SerializedObject property setting for complex types (arrays, nested objects, asset references). May need targeted research on specific Unity types.

**Standard patterns (skip research-phase):**
- **Phase 1 (HTTP Bridge):** HttpListener, EditorApplication.update, AssemblyReloadEvents — fully documented
- **Phase 2 (Core Loop):** AssetDatabase, CompilationPipeline, EditorApplication — stable APIs since Unity 2020
- **Phase 4 (Scene Inspection):** EditorSceneManager, GameObject — stable APIs
- **Phase 6 (Project Context):** AssetDatabase, BuildPipeline — stable APIs

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | HttpListener and Unity Editor APIs are well-established. All recommended technologies are built-in, no external dependencies. |
| Features | MEDIUM-HIGH | Feature categorization (table stakes vs differentiators) based on Claude's workflow analysis. MCP comparison incomplete (no web access) but existing codebase shows current usage patterns. |
| Architecture | HIGH | Main thread dispatch and domain reload patterns are standard Unity plugin architecture. Component boundaries are clear. |
| Pitfalls | MEDIUM-HIGH | Core pitfalls (main thread, domain reload, play mode, HttpListener platform differences) are well-documented Unity patterns. Unity 6 CoreCLR behavior not verified (web unavailable) but unlikely to affect HttpListener. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

**Unity 6 CoreCLR verification:** Unity 6 transitioned from Mono to CoreCLR in some configurations. STACK.md notes this was "in flux during 2024-2025" and HttpListener behavior may differ. **Mitigation:** Test Phase 1 implementation on Unity 6 early. If issues arise, this is the first place to look.

**Scene View capture reflection APIs:** Screenshot capture requires accessing internal Unity types (`GameView`, `SceneView`). These are not part of the public API and could change across Unity versions. **Mitigation:** Phase 3 implementation should use try-catch with graceful fallbacks. If reflection fails, document the limitation and suggest workarounds (render specific camera instead of capturing window).

**SerializedObject property setting complexity:** ARCHITECTURE.md notes that setting arbitrary component properties via SerializedObject is "the hard part." Research captured the APIs (`SerializedObject`, `SerializedProperty`) but not the full complexity of handling all Unity property types. **Mitigation:** Phase 5 should start with simple property types (floats, strings, vectors) before tackling asset references, arrays, and nested objects. If complexity grows, consider requesting `/gsd:research-phase` focused on SerializedProperty edge cases.

**MCP feature parity:** Research did not exhaustively compare against all MCP server features due to lack of web access. **Mitigation:** During Phase 2-6 implementation, cross-reference against the existing MCP operations list in ARCHITECTURE.md ("API Surface" section maps MCP operations to HTTP routes). Ensure no critical operations are missed.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: src/utils/unity.ts, src/utils/mcp.ts, src/commands/init.ts, template/.claude/skills/*, template/.claude/commands/*
- Project definition: .planning/PROJECT.md
- Unity Editor API knowledge: EditorApplication, AssetDatabase, EditorSceneManager, BuildPipeline, CompilationPipeline, AssemblyReloadEvents (training data through 2025, stable APIs since Unity 2020)
- .NET HttpListener documentation: System.Net.HttpListener, available in Unity's Mono runtime

### Secondary (MEDIUM confidence)
- Unity domain reload mechanics: well-documented pattern, unchanged since Unity 2017
- Cross-platform HttpListener behavior: Windows HTTP.sys vs macOS managed implementation
- Unity 6 transition: CoreCLR vs Mono for Editor runtime (noted as "in flux" — needs verification)

### Tertiary (LOW confidence — web unavailable)
- Competitor feature analysis: CodeMaestro advanced-unity-mcp and other Unity MCP servers (training data, not verified against current repos)
- Unity 6 specific API changes: release notes and breaking changes not verified due to no web access

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
