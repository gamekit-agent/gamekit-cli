# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Claude can write code, see the result, fix errors, and iterate on a Unity game through gamekit alone -- no MCP server, no third-party relay, no extra dependencies.
**Current focus:** Phase 3: Visual Feedback

## Current Position

Phase: 3 of 7 (Visual Feedback) -- COMPLETE
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-02-10 -- Completed 03-01 (Screenshot capture)

Progress: [████░░░░░░] 43%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 2min
- Total execution time: 0.26 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8min | 3min |
| 02-core-feedback-loop | 3 | 6min | 2min |
| 03-visual-feedback | 1 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 02-01 (2min), 02-02 (2min), 02-03 (2min), 03-01 (2min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- Research flags Phase 3 (screenshots) and Phase 5 (scene authoring) for potential research during planning
- Unity 6 CoreCLR verification needed early in Phase 1

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 03-01-PLAN.md (Screenshot capture) -- Phase 3 complete
Resume file: None
