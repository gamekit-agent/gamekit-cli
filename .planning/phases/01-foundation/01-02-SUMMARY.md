---
phase: 01-foundation
plan: 02
subsystem: connection
tags: [fetch, http-bridge, port-discovery, json-output, tty-detection, error-handling]

# Dependency graph
requires: []
provides:
  - "GameKitError class for typed CLI errors with error codes"
  - "ServerInfo interface and port file discovery (readServerInfo, getConnection)"
  - "HTTP bridge client for CLI-to-Unity requests (request<T>)"
  - "Output formatting helpers (outputSuccess, outputError, log, logSuccess, logWarning)"
  - "isJsonMode for --json flag and piped output detection"
affects: [01-03, 02-refresh, 02-console, 02-play, 02-scene, 03-screenshot]

# Tech tracking
tech-stack:
  added: []
  patterns: [port-file-discovery, api-response-envelope, json-stdout-human-stderr, pid-liveness-check]

key-files:
  created:
    - src/utils/connection.ts
    - src/utils/bridge.ts
    - src/utils/output.ts
  modified: []

key-decisions:
  - "Used fetch API (Bun built-in) over Node http module for HTTP client"
  - "outputSuccess always writes 2-space indented JSON to stdout regardless of TTY mode"
  - "outputError exits the process (never returns) -- commands wanting error recovery catch GameKitError themselves"

patterns-established:
  - "GameKitError pattern: throw GameKitError(code, message) for all CLI-facing errors"
  - "Port file pattern: read .gamekit/server.json, validate PID, health-check server"
  - "Output pattern: JSON to stdout (machine), human text to stderr (TTY only)"
  - "Bridge pattern: request<T>() unwraps ApiResponse envelope, translates network errors"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 1 Plan 2: CLI Connection & Output Layer Summary

**Port file discovery, typed HTTP bridge with ApiResponse envelope parsing, and JSON-stdout/human-stderr output formatting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T02:23:28Z
- **Completed:** 2026-02-10T02:26:05Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Connection discovery module that reads .gamekit/server.json, validates PID liveness, and health-checks Unity plugin
- Typed HTTP bridge that sends requests to Unity plugin, unwraps ApiResponse envelopes, and translates network errors into descriptive GameKitError
- Output formatting with consistent JSON-to-stdout and human-readable-to-stderr, respecting TTY detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create connection discovery and HTTP bridge modules** - `39491d7` (feat)
2. **Task 2: Create CLI output formatting module** - `f2d1b05` (feat)

## Files Created/Modified
- `src/utils/connection.ts` - GameKitError class, ServerInfo interface, port file discovery, PID validation, health check, getConnection
- `src/utils/bridge.ts` - Typed HTTP client with ApiResponse envelope parsing, error translation for ECONNREFUSED/timeout/API errors
- `src/utils/output.ts` - outputSuccess (JSON to stdout), outputError (JSON + stderr + exit), log/logSuccess/logWarning (stderr TTY only), isJsonMode

## Decisions Made
- Used fetch API (available in Bun standalone binaries) over Node http module for simplicity and modern API
- outputSuccess always writes 2-space indented JSON to stdout regardless of TTY mode -- data is always machine-readable
- outputError exits the process (return type `never`) -- this is intentional for CLI error flow; commands wanting to handle errors catch GameKitError before it reaches output

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing npm dependencies**
- **Found during:** Task 1 verification (type-checking)
- **Issue:** node_modules was missing entirely -- npm install had not been run
- **Fix:** Ran `npm install` to install all dependencies
- **Files modified:** package-lock.json (not committed -- pre-existing state)
- **Verification:** tsc --noEmit passes with zero errors
- **Committed in:** Not committed separately (node_modules is gitignored, package-lock.json was already tracked)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for verification only. No scope creep.

## Issues Encountered
None beyond the npm install deviation noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three utility modules are ready for use by CLI commands
- Plan 01-03 (MCP stripping) can import connection.ts and bridge.ts to replace MCP relay code
- Phase 2 commands (refresh, console, play, scene) can use bridge.request<T>() and output helpers immediately

## Self-Check: PASSED

- [x] src/utils/connection.ts - FOUND
- [x] src/utils/bridge.ts - FOUND
- [x] src/utils/output.ts - FOUND
- [x] 01-02-SUMMARY.md - FOUND
- [x] Commit 39491d7 - FOUND
- [x] Commit f2d1b05 - FOUND

---
*Phase: 01-foundation*
*Completed: 2026-02-10*
