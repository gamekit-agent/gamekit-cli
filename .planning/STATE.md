# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Claude can write code, see the result, fix errors, and iterate on a Unity game through gamekit alone -- no MCP server, no third-party relay, no extra dependencies.
**Current focus:** Phase 7: Asset Management

## Current Position

Phase: 7 of 7 (Asset Management)
Plan: 3 of 3 in current phase
Status: Phase Complete
Last activity: 2026-02-10 -- Completed 07-01 (Prefab operations)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 2min
- Total execution time: 0.55 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8min | 3min |
| 02-core-feedback-loop | 3 | 6min | 2min |
| 03-visual-feedback | 1 | 2min | 2min |
| 04-scene-inspection | 2 | 4min | 2min |
| 05-scene-authoring | 2 | 6min | 3min |
| 06-project-context-build | 3 | 6min | 2min |
| 07-asset-management | 2 | 4min | 2min |

**Recent Trend:**
- Last 5 plans: 06-02 (2min), 06-03 (2min), 07-03 (2min), 07-01 (2min)
- Trend: Consistent

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- HTTP on localhost for transport (simple, debuggable, curl-able)
- Unity plugin lives in this repo under template/ (single repo, single release)
- Claude writes files directly, gamekit handles Unity-specific operations
- [InitializeOnLoad] with EditorApplication.delayCall for safe deferred server startup
- Port range 17580-17589 with port file at .gamekit/server.json for multi-instance coexistence
- Full request-response cycle on main thread via MainThreadDispatcher.Invoke()
- Newtonsoft.Json with [JsonProperty] attributes for lowercase JSON field names
- fetch API for HTTP client (Bun built-in, simpler than Node http module)
- GameKitError(code, message) pattern for all CLI-facing errors
- JSON to stdout (machine) + human-readable to stderr (TTY only) output pattern
- outputError exits process (never returns) -- commands catch GameKitError for recovery
- fs.cpSync (recursive) for plugin installation -- single call, Node 16+/Bun
- Plugin connection check is a warning when Unity not running (not an error)
- --json global CLI flag for structured output
- Synchronous-first refresh: call AssetDatabase.Refresh() then check isCompiling, return 'compiling' only if async
- CLI polls same POST /refresh endpoint when compilation is async (no separate status endpoint)
- 60s timeout for refresh requests to handle large Unity projects
- Service layer pattern: static classes in GameKit.Services with [InitializeOnLoadMethod]
- SSE endpoint bypasses MainThreadDispatcher to avoid main-thread deadlock on long-lived connections
- LogService listener notifications use lock+ToArray snapshot for concurrent SSE writes
- Client-side severity filtering for SSE stream (server sends all, client filters)
- Function-based registration pattern (registerPlayCommand) for multi-subcommand CLI commands
- Screenshot bypass route pattern (like SSE) since handler manages own response lifecycle
- Screenshots save to .gamekit/screenshots/ (not Assets/) to avoid AssetDatabase.Refresh
- Dual-mode response: binary PNG for --stdout, JSON file path for default
- 30s timeout for screenshot requests (Camera.Render can be slow)
- Static SceneService (no InitializeOnLoadMethod) -- no persistent state needed
- FindGameObjectByPath walks Transform tree (not GameObject.Find) to support inactive objects
- Scene open auto-saves dirty scenes before switching via EditorSceneManager.SaveOpenScenes()
- Query param filtering pattern for GET endpoints (name/component/depth from QueryString)
- PropertySerializer 26-case type switch for JSON-safe SerializedProperty values
- Enum try-catch fallback to intValue for stale enum data
- Generic types return "<complex>" (no recursive expansion; NextVisible flattens via propertyPath)
- IsComponentEnabled cast chain: Behaviour > Renderer > Collider > default true
- GuardPlayMode private helper for DRY play mode check across all authoring methods
- SceneService.GetHierarchyPath changed from private to internal for cross-service reuse
- ObjectFactory.CreateGameObject for auto-undo (instead of new GameObject + manual undo)
- Clean up created object on parent-not-found before throwing (prevents orphaned objects)
- PropertyDeserializer mirrors PropertySerializer with 18 type cases for round-trip fidelity
- SetPropertyHandler uses ApplyModifiedProperties (not WithoutUndo) for automatic undo support
- CLI set command parses comma-separated values into vector objects client-side
- Reuse existing /api/scene/list endpoint for list scenes subcommand (no duplication)
- SerializedObject + try-catch for InputManager.asset (graceful fallback for new Input System)
- Synchronous BuildPipeline.BuildPlayer with 600s CLI timeout for long builds
- Platform aliases (win, mac, osx, linux64, etc.) mapped to BuildTarget enum
- Directory-based output for WebGL/Linux/iOS, extension-based for Windows/Mac/Android
- Combined TestMode flags (EditMode | PlayMode) for "both" mode -- Unity TestRunner handles sequencing
- 1-second polling interval for test status (balances responsiveness vs overhead)
- Non-zero exit code (process.exit(1)) after outputSuccess when tests fail
- Three-stage AnimatorController resolution: asset path -> AnimatorOverrideController -> scene GameObject Animator component
- Read-only AnimatorService: no Undo, no SetDirty -- purely queries AnimatorController data
- Default connect=true for prefab create (SaveAsPrefabAssetAndConnect matches standard Unity workflow)
- Commander --no-connect pattern for boolean opt-out of prefab connection
- GET with query param for overrides (read-only, matches hierarchy/inspect pattern)
- Color fallback keys: Unity SetProperty reads value['r'] first, falls back to value['x'] so CLI sends x/y/z/w for all vector types
- Asset persistence via EditorUtility.SetDirty + AssetDatabase.SaveAssets (not Undo) for material property changes
- renderer.sharedMaterial for editor-safe assignment (not .material which creates runtime copies)

### Pending Todos

None yet.

### Blockers/Concerns

- Research flags Phase 3 (screenshots) and Phase 5 (scene authoring) for potential research during planning
- Unity 6 CoreCLR verification needed early in Phase 1

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 07-02-PLAN.md (Material management)
Resume file: None
