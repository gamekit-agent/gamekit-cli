# Feature Research

**Domain:** CLI-to-Unity Editor bridge for AI-assisted game development
**Researched:** 2026-02-09
**Confidence:** MEDIUM (web research tools unavailable; findings based on Unity Editor API knowledge, codebase analysis, and known competitor patterns from training data. Specific competitor feature lists may be incomplete.)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must work or the tool is useless for an AI-driven game dev loop. These map to the core loop: Claude writes code -> sees result -> fixes errors -> iterates.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Refresh/recompile** | After Claude edits a C# file, Unity must recompile. Without this the AI has no way to know if code compiles. | LOW | `AssetDatabase.Refresh()` + poll `EditorApplication.isCompiling`. Return compilation errors from `CompilationPipeline`. |
| **Read compilation errors** | Claude needs compiler output to fix its own mistakes. This is the #1 feedback signal. | LOW | Subscribe to `CompilationPipeline.assemblyCompilationFinished`. Cache errors, expose via HTTP. |
| **Screenshot Game view** | Visual feedback is how Claude understands what the game looks like. Without screenshots Claude is coding blind. | LOW | `ScreenCapture.CaptureScreenshot` or render to RenderTexture. Return PNG bytes. |
| **Screenshot Scene view** | Scene view shows editor state (object placement, gizmos, selection). Game view alone is insufficient for spatial reasoning. | MEDIUM | Requires `SceneView.lastActiveSceneView` camera rendering to RenderTexture. Less straightforward than Game view. |
| **Read console logs** | Errors, warnings, and Debug.Log output are Claude's primary debugging signal after compilation errors. | LOW | `Application.logMessageReceived` callback. Buffer recent entries, expose via HTTP with severity filtering. |
| **Enter/exit Play mode** | Claude must be able to run the game to test changes. Manual play mode toggling defeats the purpose of automation. | LOW | `EditorApplication.isPlaying = true/false`. Wait for state transition callback. |
| **Read runtime logs** | Logs emitted during play mode (crashes, null refs, gameplay logs) are distinct from editor-time logs. Claude needs both. | LOW | Same `logMessageReceived` but tag with play mode state. Filter by session. |
| **Scene hierarchy query** | Claude needs to understand what exists in the scene -- what GameObjects are there, their parent/child relationships. | MEDIUM | Recursive walk of `scene.GetRootGameObjects()`. Serialize to JSON tree. Pagination for large scenes. |
| **GameObject component query** | "What components does this object have and what are their properties?" is fundamental for debugging and modification. | MEDIUM | `GetComponents<Component>()` + reflection over serialized fields. Property serialization is the hard part. |
| **Connection health check** | CLI must know if Unity is running and responsive. Silent failures are unacceptable. | LOW | Simple `/health` endpoint returning editor state (compiling, playing, idle). |
| **Auto-discovery** | Users should not manually configure ports. The CLI should find the running Unity instance. | LOW | Try known port, fall back to port file written by plugin (e.g., in project `Library/` or `Temp/`). |
| **Project file listing** | Claude needs to know what scripts, scenes, and prefabs exist without reading the filesystem directly (which misses Unity's asset metadata). | LOW | `AssetDatabase.FindAssets()` with type filters. Return paths + GUIDs. |

### Differentiators (Competitive Advantage)

Features that make gamekit better than raw MCP servers or manual Unity use with Claude Code.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Structured error output** | MCP servers return screenshots; gamekit returns structured JSON with file, line, column, message. Claude can fix errors in one shot instead of parsing screenshots. | LOW | Already available from `CompilationPipeline`. The differentiator is the structured format, not the capability. |
| **Scene manipulation (create/modify/delete GameObjects)** | Claude can place objects, build levels, set up UI hierarchies without the user touching Unity. Enables true "vibe coding" of scenes, not just scripts. | HIGH | `new GameObject()`, `AddComponent<T>()`, `DestroyImmediate()`, `Undo.RegisterCreatedObjectUndo()`. Property setting via `SerializedObject` for undo support. Complex serialization. |
| **Component property setting** | Set any serialized field on any component by name and value. This is what turns gamekit from a "code compiler" into a "game editor." | HIGH | `SerializedObject`/`SerializedProperty` API. Must handle all Unity types: vectors, colors, references, enums, arrays, nested objects. |
| **Prefab operations** | Create prefabs from scene objects, instantiate prefabs, modify prefab overrides. Prefabs are how Unity projects scale. | HIGH | `PrefabUtility.SaveAsPrefabAsset()`, `PrefabUtility.InstantiatePrefab()`. Prefab variant and override handling adds complexity. |
| **Build trigger with result** | Trigger platform builds and return success/failure with errors. Completes the dev-to-ship loop without leaving the CLI. | MEDIUM | `BuildPipeline.BuildPlayer()`. Must handle build settings, scene list, output path. Return build report. |
| **Material creation/assignment** | Create materials with specific shaders and properties, assign to renderers. Visual iteration without touching Unity. | MEDIUM | `new Material(Shader.Find())`, set properties, assign to `MeshRenderer.material`. Shader property discovery via `Shader.GetPropertyCount()`. |
| **Scene management (list/open/create)** | Switch between scenes, create new ones. Multi-scene projects are the norm. | LOW | `EditorSceneManager.OpenScene()`, `EditorSceneManager.NewScene()`, `EditorBuildSettings.scenes`. |
| **Undo support for all operations** | Every scene modification goes through Unity's undo system. Users can Ctrl+Z anything Claude did. Safety net that builds trust. | MEDIUM | Wrap all modifications in `Undo.RecordObject()` / `Undo.RegisterCreatedObjectUndo()`. Must be consistent across all write operations. |
| **Play mode error capture with stack traces** | Capture exceptions during play mode with full stack traces and map them back to source files. Claude can diagnose runtime crashes, not just compile errors. | LOW | `Application.logMessageReceived` provides stack traces. Parse to extract file:line references. |
| **Streaming console output** | Instead of polling, stream logs in real-time during play mode. Faster feedback loop for runtime debugging. | MEDIUM | HTTP chunked transfer encoding or Server-Sent Events from the Unity plugin. CLI streams to stdout. |
| **Unix-pipe composability** | `gamekit console | grep error`, `gamekit hierarchy | jq '.children'`. Treat Unity data like any other CLI data source. | LOW | Output clean JSON to stdout, human-readable to stderr when TTY. This is architecture, not a feature -- but it is a differentiator against MCP servers that are opaque to the user. |
| **Project settings query** | Read layers, tags, physics settings, quality levels, input mappings. Claude needs this context to write correct code (e.g., using the right layer names). | LOW | `TagManager`, `Physics.gravity`, `QualitySettings`, etc. Read-only is sufficient for v1. |
| **Animation state query** | List Animator controllers, states, parameters, transitions. Animation bugs are extremely common and hard to debug without seeing the state machine. | MEDIUM | `AnimatorController` API. Read states, transitions, parameters. Serialization of the state machine graph. |
| **Test runner integration** | Run Unity Test Framework (EditMode + PlayMode tests), return results. Claude can write tests and verify them. | MEDIUM | `TestRunnerApi.Execute()`. Subscribe to callbacks for results. Must handle both edit mode and play mode test assemblies. |
| **Multi-command batching** | Send multiple operations in one HTTP request. Reduces round-trips for complex scene setups. | MEDIUM | Batch endpoint that accepts an array of operations. Execute sequentially within a single undo group. |
| **Selective screenshot** | Screenshot a specific camera, a specific UI canvas, or a specific region. More targeted visual feedback than "screenshot everything." | MEDIUM | Render specific camera to RenderTexture. Requires camera identification by name or path. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full MCP server in gamekit** | "Keep backward compatibility with existing MCP setup" | MCP adds latency (JSON-RPC over stdio), requires running a relay process, and the third-party dependency is outside our control. The whole point of this milestone is to replace MCP with direct HTTP. | Direct HTTP communication. Claude Code calls `gamekit` CLI which makes HTTP calls to Unity. Simpler, faster, debuggable. |
| **Live code editing from Unity plugin** | "Let the Unity plugin write C# files too" | Claude Code already writes files excellently. Duplicating file I/O in the Unity plugin creates two sources of truth and split-brain bugs. | Claude writes files natively. `gamekit refresh` tells Unity to recompile. Single responsibility. |
| **Visual scripting / node graph generation** | "Generate Bolt/Visual Scripting graphs" | Visual scripting graphs are binary/YAML blobs that are extremely hard to generate correctly. Low ROI for the complexity. AI is better at writing C# than generating node graphs. | Stick to C# script generation. It is what Claude is best at and what the Unity ecosystem is converging on. |
| **Real-time Unity viewport streaming** | "Stream the Scene/Game view to Claude continuously" | Enormous bandwidth, destroys context windows with constant image tokens, and provides minimal value over on-demand screenshots. | On-demand `gamekit screenshot` when Claude needs visual feedback. Explicit is better than continuous. |
| **Asset creation (3D models, textures, audio)** | "Have Claude create art assets" | Claude cannot create binary assets. This is a fundamentally different capability (image generation, 3D generation) that would require separate AI models and pipelines. | `/find-asset` for asset discovery. Future: integration with AI image generation services for textures/sprites. Out of scope for this milestone. |
| **Multi-editor orchestration** | "Control multiple Unity instances simultaneously" | Massively increases complexity for an edge case. Most developers work on one project at a time. | Scope to one Unity instance per project. Connection management targets single instance. |
| **Project settings modification** | "Let Claude change physics settings, quality settings, etc." | Project settings changes are high-risk (break entire project), hard to undo correctly, and rarely needed during iterative development. | Read-only project settings query. If Claude needs a specific layer or tag, it can instruct the user or the CLI can add individual layers/tags as a focused operation. |
| **Runtime object manipulation during Play mode** | "Modify GameObjects while the game is running" | Changes in Play mode are lost when exiting Play mode (Unity's design). This confuses AI agents that expect persistence. | Manipulate scene objects in Edit mode only. Read-only inspection during Play mode (logs, screenshots, hierarchy queries). |
| **Shader code generation** | "Write custom shaders via gamekit" | ShaderLab/HLSL is a distinct language with GPU-specific concerns. Claude can write shader code as files, but gamekit should not try to validate or preview shaders. | Claude writes `.shader` files directly. `gamekit refresh` compiles them. Shader errors appear in console output like any other compilation error. |

## Feature Dependencies

```
[Read compilation errors]
    └──requires──> [Refresh/recompile]

[Screenshot Game view]
    └──enhances──> [Enter/exit Play mode]

[Screenshot Scene view]
    └──independent (works in Edit mode)

[Read runtime logs]
    └──requires──> [Enter/exit Play mode]
    └──requires──> [Read console logs] (same infrastructure)

[Scene manipulation]
    └──requires──> [Scene hierarchy query]
    └──requires──> [GameObject component query]
    └──enhances──> [Undo support]

[Component property setting]
    └──requires──> [GameObject component query]
    └──enhances──> [Undo support]

[Prefab operations]
    └──requires──> [Scene manipulation]
    └──requires──> [Component property setting]

[Build trigger]
    └──requires──> [Refresh/recompile] (must compile cleanly first)
    └──enhances──> [Scene management] (build needs scene list)

[Material creation]
    └──requires──> [Component property setting] (assign to renderers)

[Test runner integration]
    └──requires──> [Read console logs] (test output)
    └──requires──> [Refresh/recompile] (tests must compile)

[Multi-command batching]
    └──requires──> [Scene manipulation]
    └──requires──> [Undo support] (batch = single undo group)

[Streaming console output]
    └──requires──> [Read console logs]
    └──enhances──> [Enter/exit Play mode]

[Animation state query]
    └──requires──> [Project file listing] (find controllers)

[Connection health check]
    └──requires──> [Auto-discovery]

[All CLI commands]
    └──require──> [Connection health check]
    └──require──> [Auto-discovery]
```

### Dependency Notes

- **Refresh/recompile is the foundation:** Nearly everything depends on being able to tell Unity to recompile and reading the result. Build this first.
- **Console log infrastructure is shared:** Edit-mode logs, play-mode logs, compilation errors, and test output all use the same log buffering system. Build the infrastructure once.
- **Scene manipulation requires hierarchy/component queries:** You cannot meaningfully create or modify GameObjects without being able to read what exists. Read before write.
- **Undo support is cross-cutting:** It is not a feature itself but a requirement for all write operations. Must be designed into the architecture from day one, not bolted on later.
- **Connection management underlies everything:** Every CLI command needs to find and talk to Unity. This is infrastructure, not a feature.

## MVP Definition

### Launch With (v1)

Minimum viable product -- the smallest set that closes the AI-assisted game development loop.

- [ ] **Connection management (health check + auto-discovery)** -- without this, nothing works
- [ ] **Refresh/recompile with structured error output** -- the most critical feedback signal; Claude writes code, needs to know if it compiles
- [ ] **Read console logs (edit + play mode, with severity filtering)** -- second most critical feedback signal after compilation
- [ ] **Screenshot Game view** -- visual feedback for Claude to understand game state
- [ ] **Screenshot Scene view** -- visual feedback for Claude to understand editor/spatial state
- [ ] **Enter/exit Play mode** -- Claude must be able to run the game
- [ ] **Scene hierarchy query** -- Claude must know what exists in the scene
- [ ] **GameObject component query** -- Claude must understand object configuration
- [ ] **Project file listing** -- Claude must know what assets exist
- [ ] **Scene management (list/open)** -- multi-scene projects are the norm

### Add After Validation (v1.x)

Features to add once the core loop is working and validated with real users.

- [ ] **Scene manipulation (create/modify/delete GameObjects)** -- high complexity, wait until read operations are solid
- [ ] **Component property setting** -- high complexity, depends on robust serialization
- [ ] **Build trigger with result** -- completes dev-to-ship loop
- [ ] **Undo support for all write operations** -- required before scene manipulation ships to users
- [ ] **Streaming console output** -- improves play mode debugging experience
- [ ] **Project settings query (layers, tags, physics)** -- helps Claude write correct code
- [ ] **Selective screenshot (specific camera/region)** -- more targeted visual feedback

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Prefab operations** -- very high complexity with variants and overrides
- [ ] **Material creation/assignment** -- useful but not critical path
- [ ] **Animation state query** -- niche debugging need
- [ ] **Test runner integration** -- valuable but secondary to the build-run-debug loop
- [ ] **Multi-command batching** -- optimization, not core functionality

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Connection management | HIGH | LOW | P1 |
| Refresh/recompile + errors | HIGH | LOW | P1 |
| Read console logs | HIGH | LOW | P1 |
| Screenshot Game view | HIGH | LOW | P1 |
| Enter/exit Play mode | HIGH | LOW | P1 |
| Scene hierarchy query | HIGH | MEDIUM | P1 |
| GameObject component query | HIGH | MEDIUM | P1 |
| Project file listing | MEDIUM | LOW | P1 |
| Scene management (list/open) | MEDIUM | LOW | P1 |
| Screenshot Scene view | MEDIUM | MEDIUM | P1 |
| Structured error output (JSON) | HIGH | LOW | P1 |
| Scene manipulation | HIGH | HIGH | P2 |
| Component property setting | HIGH | HIGH | P2 |
| Undo support | HIGH | MEDIUM | P2 |
| Build trigger | MEDIUM | MEDIUM | P2 |
| Streaming console | MEDIUM | MEDIUM | P2 |
| Project settings query | MEDIUM | LOW | P2 |
| Selective screenshot | LOW | MEDIUM | P2 |
| Unix-pipe composability | MEDIUM | LOW | P2 |
| Prefab operations | MEDIUM | HIGH | P3 |
| Material creation | LOW | MEDIUM | P3 |
| Animation state query | LOW | MEDIUM | P3 |
| Test runner integration | MEDIUM | MEDIUM | P3 |
| Multi-command batching | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- closes the read-compile-run-debug loop
- P2: Should have, add when core is stable -- enables scene authoring and full dev workflow
- P3: Nice to have, future consideration -- specialized use cases

## Competitor Feature Analysis

| Feature | MCP Servers (CodeMaestro, etc.) | Manual Unity + Claude Code | gamekit CLI (Our Approach) |
|---------|-------------------------------|---------------------------|---------------------------|
| Code compilation feedback | Via MCP tool calls; latency from JSON-RPC + relay process; unstructured text | User manually reads Unity console, pastes errors into Claude | Direct HTTP call, structured JSON with file:line:column, <100ms |
| Visual feedback | Screenshot via MCP tool; high latency; goes through relay | User takes screenshots manually, drags into Claude | `gamekit screenshot` -- direct HTTP to Unity plugin, returns PNG, pipeable |
| Console logs | Via MCP; filtered poorly; relay adds latency | User reads console, copy-pastes | `gamekit console --errors --since 30s` -- structured, filtered, composable |
| Scene manipulation | Some MCP servers support it; unreliable serialization; no undo | User does it manually in Unity Editor | `gamekit scene create/modify/delete` -- with undo, structured, batch-able |
| Play mode control | Some MCP servers; unreliable state management | User clicks Play button | `gamekit play start/stop` -- with state callbacks and log capture |
| Build | Some MCP servers; limited platform support | User triggers build from Unity menu | `gamekit build --platform webgl` -- structured result, CI-friendly |
| Debuggability | Opaque (stdio relay, JSON-RPC, hard to inspect) | N/A (manual process) | curl-able HTTP endpoints, JSON output, pipe to jq |
| Speed | Slow (MCP relay adds 200-500ms per call) | Instant (human is the relay) | Fast (direct HTTP, <100ms per call, no relay process) |
| Reliability | Fragile (relay process crashes, Unity state sync issues) | Reliable (human handles edge cases) | Robust (health checks, reconnection, structured errors) |
| Setup complexity | Install MCP package + relay + configure .mcp.json | None (just use Unity) | `gamekit init` installs plugin, CLI auto-discovers Unity |

## Key Insight: The Read/Write Split

The most important architectural insight for feature prioritization: **read operations are table stakes, write operations are differentiators.**

- **Read operations** (compilation errors, logs, screenshots, hierarchy queries, project listing) close the feedback loop. Without them, Claude is coding blind. These are P1.
- **Write operations** (scene manipulation, component setting, prefab creation, material assignment) enable Claude to author game content, not just code. These are powerful differentiators but complex. P2.
- **The bridge between them** is refresh/recompile -- it turns Claude's file writes into Unity state changes. This is the single most important feature.

## Sources

- Codebase analysis: `/Users/teis/Documents/gamekit-cli/.planning/codebase/ARCHITECTURE.md`, `INTEGRATIONS.md`
- Project definition: `/Users/teis/Documents/gamekit-cli/.planning/PROJECT.md`
- Existing roadmap: `/Users/teis/Documents/gamekit-cli/docs/roadmap.md`
- Unity Editor API knowledge: `UnityEditor` namespace -- `AssetDatabase`, `EditorApplication`, `CompilationPipeline`, `SceneView`, `EditorSceneManager`, `PrefabUtility`, `SerializedObject`, `BuildPipeline`, `TestRunnerApi` (training data, not verified against current docs -- MEDIUM confidence)
- Competitor patterns: CodeMaestro advanced-unity-mcp, other Unity MCP servers (training data, not verified against current repos -- LOW confidence on specific feature lists)

**Confidence note:** Web research tools were unavailable during this session. Unity Editor API capabilities are well-established and unlikely to have changed significantly, but specific competitor feature lists should be verified before finalizing requirements. The feature categorization (table stakes vs differentiators) is based on the game development workflow analysis and is HIGH confidence.

---
*Feature research for: CLI-to-Unity Editor bridge for AI-assisted game development*
*Researched: 2026-02-09*
