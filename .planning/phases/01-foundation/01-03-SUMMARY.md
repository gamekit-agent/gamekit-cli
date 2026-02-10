---
phase: 01-foundation
plan: 03
subsystem: cli
tags: [mcp-removal, unity-plugin, gitignore, json-flag, http-bridge, doctor]

# Dependency graph
requires:
  - phase: 01-01
    provides: Unity Editor HTTP plugin (template/Editor/GameKit/)
  - phase: 01-02
    provides: Connection discovery (readServerInfo, healthCheck, GameKitError) and output helpers
provides:
  - "MCP-free codebase (zero MCP references in src/)"
  - "Plugin-based init flow (copies template/Editor/GameKit/ into Assets/Editor/GameKit/)"
  - "Plugin connection doctor checks (readServerInfo + healthCheck instead of MCP relay)"
  - "--json global CLI flag for structured output"
  - ".gamekit/ added to project .gitignore during init"
affects: [02-commands, 03-screenshots]

# Tech tracking
tech-stack:
  added: [fs.cpSync]
  patterns: [plugin-copy-install, gitignore-management]

key-files:
  created: []
  modified:
    - src/commands/init.ts
    - src/commands/doctor.ts
    - src/index.ts
    - src/utils/platform.ts
    - src/utils/unity.ts
    - src/__tests__/commands/doctor.test.ts
    - src/__tests__/commands/init.test.ts
    - src/__tests__/utils/platform.test.ts
    - src/__tests__/utils/unity.test.ts

key-decisions:
  - "Used fs.cpSync (recursive) for plugin installation -- single call, available in Node 16+/Bun"
  - "Removed Unity version prompt from existing project init flow (no longer needed without MCP URL selection)"
  - "Plugin connection check is a warning (not error) when Unity is not running -- user just needs to open Unity"

patterns-established:
  - "Plugin install pattern: copy template/Editor/GameKit/ to Assets/Editor/GameKit/ via fs.cpSync"
  - "Gitignore management: read-check-append pattern for adding entries without duplication"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 1 Plan 3: Strip MCP and Wire Plugin Summary

**Complete MCP removal from CLI codebase, replaced with GameKit plugin copy-install and HTTP bridge connection checks via readServerInfo/healthCheck**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T02:29:04Z
- **Completed:** 2026-02-10T02:33:33Z
- **Tasks:** 2
- **Files modified:** 9 (4 deleted, 5 modified)

## Accomplishments
- Removed all MCP code: deleted mcp.ts, manifest.ts, and their tests; stripped getMcpRelayPath from platform.ts and getMcpPackageUrl from unity.ts
- Rewrote init command to install GameKit Unity plugin via fs.cpSync and add .gamekit/ to .gitignore instead of MCP package injection and .mcp.json generation
- Rewrote doctor command to check plugin installation (GameKitServer.cs) and connection health (readServerInfo + healthCheck) instead of MCP config and relay
- Added --json global flag to CLI entry point for structured output mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip MCP code and clean up utility modules** - `14725c3` (refactor)
2. **Task 2: Update init/doctor commands, add --json flag, update tests** - `1251f12` (feat)

## Files Created/Modified
- `src/utils/mcp.ts` - DELETED (MCP config generation, relay waiting, relay detection)
- `src/__tests__/utils/mcp.test.ts` - DELETED (MCP utility tests)
- `src/utils/manifest.ts` - DELETED (MCP manifest injection)
- `src/__tests__/utils/manifest.test.ts` - DELETED (manifest utility tests)
- `src/utils/platform.ts` - Removed getMcpRelayPath(), kept platform detection utilities
- `src/utils/unity.ts` - Removed getMcpPackageUrl(), kept Unity install discovery and project management
- `src/commands/init.ts` - Rewrote to copy GameKit plugin and manage .gitignore instead of MCP
- `src/commands/doctor.ts` - Rewrote to check plugin files and HTTP bridge connection instead of MCP
- `src/index.ts` - Added --json global option
- `src/__tests__/commands/doctor.test.ts` - Tests for checkPluginInstalled and checkPluginConnection with mocked connection module
- `src/__tests__/commands/init.test.ts` - Tests for copyGameKitPlugin and addGameKitToGitignore
- `src/__tests__/utils/platform.test.ts` - Removed getMcpRelayPath tests
- `src/__tests__/utils/unity.test.ts` - Removed getMcpPackageUrl tests

## Decisions Made
- Used `fs.cpSync(src, dest, { recursive: true })` for plugin installation -- single call, handles directory creation and recursive copy, available in Node 16+ and Bun
- Removed Unity version prompt from existing project init flow entirely -- it was only needed to determine getMcpPackageUrl; the GameKit plugin does not need Unity version at install time
- Plugin connection check in doctor returns a warning (not error with fix) when Unity is not running -- the user just needs to open Unity, which is not an action that needs a "fix" command

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleaned up unity.test.ts MCP references**
- **Found during:** Task 1 verification
- **Issue:** unity.test.ts still imported and tested getMcpPackageUrl which was removed from unity.ts
- **Fix:** Removed getMcpPackageUrl import and describe block from unity.test.ts
- **Files modified:** src/__tests__/utils/unity.test.ts
- **Committed in:** 14725c3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** unity.test.ts was listed under Task 1 files but its cleanup was not explicitly called out in the plan text. Straightforward fix.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 1 (Foundation) is complete: Unity HTTP plugin, CLI connection/output layer, MCP-free commands
- Phase 2 commands can use the bridge module (request<T>) and output helpers immediately
- Init flow installs the plugin automatically, doctor verifies the full stack
- --json flag is available for all commands going forward

## Self-Check: PASSED

- [x] 01-03-SUMMARY.md - FOUND
- [x] Commit 14725c3 - FOUND
- [x] Commit 1251f12 - FOUND
- [x] src/utils/mcp.ts - CONFIRMED DELETED
- [x] src/utils/manifest.ts - CONFIRMED DELETED
- [x] Zero MCP references in src/ - CONFIRMED
- [x] TypeScript compiles cleanly - CONFIRMED
- [x] All 97 tests pass (8 files) - CONFIRMED

---
*Phase: 01-foundation*
*Completed: 2026-02-10*
