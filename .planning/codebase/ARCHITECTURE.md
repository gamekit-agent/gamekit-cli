# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** CLI Application with Command Pattern + Utility Layer

**Key Characteristics:**
- Single-binary CLI tool built with Commander.js command pattern
- Two commands (`init`, `doctor`) orchestrating utility functions
- Template-based project scaffolding (copies `.claude/` config into Unity projects)
- Platform-aware (macOS + Windows) with dependency injection for testability
- Background self-update mechanism via detached child processes
- No server, no database, no API -- purely a local filesystem tool

## Layers

**CLI Entry Point (Commander):**
- Purpose: Parse CLI arguments, route to command handlers
- Location: `src/index.ts`
- Contains: Command registration, version display, default behavior (runs `init` if no args)
- Depends on: `commander`, `src/commands/*`, `src/utils/updater.ts`
- Used by: End user via `gamekit` binary

**Commands:**
- Purpose: User-facing workflows that orchestrate utilities
- Location: `src/commands/`
- Contains: `init.ts` (interactive project wizard), `doctor.ts` (diagnostic checks)
- Depends on: All utilities (`unity`, `template`, `manifest`, `mcp`, `assets`, `commands`)
- Used by: `src/index.ts` via Commander action handlers

**Utilities:**
- Purpose: Reusable, testable functions for specific concerns
- Location: `src/utils/`
- Contains: 7 modules covering platform detection, Unity interaction, template management, MCP configuration, manifest editing, asset creation, and auto-updating
- Depends on: Node.js built-ins (`fs`, `path`, `child_process`, `https`, `os`, `crypto`)
- Used by: Commands layer and each other (minimal cross-utility dependencies)

**Template:**
- Purpose: Claude Code configuration files that get copied into Unity projects
- Location: `template/`
- Contains: `.claude/` directory with CLAUDE.md, commands, skills, agents, settings
- Depends on: Nothing (static content)
- Used by: `src/utils/template.ts` (copies to destination), `src/utils/commands.ts` (checks existence)

**Build Scripts:**
- Purpose: Version injection, verification, installation
- Location: `scripts/`
- Contains: `inject-version.ts`, `verify.sh`, `install/install.sh`, `install/install.ps1`
- Depends on: `package.json` (for version), Bun runtime
- Used by: CI/CD pipelines, end-user installation

## Data Flow

**`gamekit init` (New Project):**

1. Entry point (`src/index.ts`) routes to `init()` in `src/commands/init.ts`
2. `init()` checks `isUnityProject(cwd)` via `src/utils/unity.ts` -- if false, runs `createNewProject()`
3. `findUnityInstalls()` scans filesystem for Unity Hub installations
4. User prompted for project name and Unity version via `inquirer`
5. `createUnityProject()` spawns Unity CLI in batchmode to create project
6. `copyTemplateAsync()` copies `template/` to project, writes version + hashes
7. `createEditorScripts()` writes C# screenshot utility to `Assets/_Game/Scripts/Editor/`
8. `addMcpToManifest()` injects MCP Unity package into `Packages/manifest.json`
9. `generateMcpConfig()` writes `.mcp.json` with platform-specific relay paths
10. `openUnityProject()` spawns Unity detached
11. `waitForMcpRelay()` polls for MCP relay installation (up to 5 minutes)

**`gamekit init` (Existing Project):**

1. Same as above but skips steps 3-5 (project creation + naming)
2. Detects existing `.claude/` directory, prompts for overwrite
3. Skips opening Unity and waiting for relay (assumes already running)

**`gamekit doctor`:**

1. Runs 5 sequential checks: Unity installed, Unity project detected, Claude commands installed, MCP config present, MCP relay exists
2. Each check returns `CheckResult` with pass/fail/fix info
3. Results displayed with color-coded status symbols

**Background Auto-Update:**

1. `maybeCheckForUpdates()` called at startup in `src/index.ts`
2. `shouldCheckForUpdates()` rate-limits to once per hour using `~/.gamekit/last-update-check`
3. `checkForUpdatesInBackground()` spawns a detached Node.js process with an inline CommonJS script
4. Background process fetches GitHub API for latest release, downloads binary if newer, writes `update-applied` marker
5. Next CLI invocation reads marker via `checkForAppliedUpdate()` and displays update notice

**State Management:**
- No runtime state -- all state is filesystem-based
- `~/.gamekit/` stores cached templates, update logs, last-check timestamps, and update markers
- Per-project state lives in `.claude/.version` and `.claude/.hashes.json`

## Key Abstractions

**UnityInstall:**
- Purpose: Represents a discovered Unity editor installation
- Definition: `src/utils/unity.ts` (interface `UnityInstall`)
- Fields: `version`, `path` (to executable), `isUnity6` (boolean)
- Used in: `findUnityInstalls()`, `init.ts` prompt choices

**UnityVersion:**
- Purpose: Parsed Unity version string (e.g., `6000.1.12f1`)
- Definition: `src/utils/unity.ts` (interface `UnityVersion`)
- Fields: `major`, `minor`, `patch`, `type`, `build`
- Used in: Version comparison, MCP URL selection, Unity 6 detection

**CheckResult:**
- Purpose: Standardized diagnostic check output
- Definition: `src/commands/doctor.ts` (interface `CheckResult`)
- Fields: `name`, `passed`, `message?`, `fix?`
- Pattern: Each check function returns a `CheckResult`, displayed uniformly

**McpConfig:**
- Purpose: Structure of `.mcp.json` file for Claude Code MCP integration
- Definition: `src/utils/mcp.ts` (interface `McpConfig`)
- Pattern: Platform-specific command/args for launching the Unity MCP relay

**FileChange:**
- Purpose: Tracks whether template files have been modified by the user
- Definition: `src/utils/template.ts` (interface `FileChange`)
- Fields: `file`, `status` (`new`/`modified`/`unchanged`), hashes
- Used in: `compareWithTemplate()` for safe template updates

## Entry Points

**CLI Binary:**
- Location: `src/index.ts`
- Triggers: User runs `gamekit` command
- Responsibilities: Parse args, check for applied updates, trigger background update check, route to command handlers, default to `init` when no args

**Version File (auto-generated):**
- Location: `src/version.ts`
- Triggers: `scripts/inject-version.ts` or CI tag injection
- Responsibilities: Export `VERSION` constant read from `package.json`

**Install Scripts:**
- Location: `scripts/install/install.sh` (Unix), `scripts/install/install.ps1` (Windows)
- Triggers: User runs curl/iex one-liner
- Responsibilities: Download platform binary from GitHub releases, install to `~/.gamekit/bin`, configure PATH

## Error Handling

**Strategy:** Fail-fast with user-friendly messages; spinners indicate progress

**Patterns:**
- Commands wrap each step in try/catch with `ora` spinner transitions (`start` -> `succeed`/`fail`)
- On failure: spinner shows fail state, error message printed with `chalk.red`, `process.exit(1)`
- Utility functions throw plain `Error` objects; commands catch and format them
- Background update process silently logs errors to `~/.gamekit/update.log` without interrupting the user
- Doctor command uses a softer pattern: checks return results without throwing, displayed as pass/warn/fail

## Cross-Cutting Concerns

**Logging:** Console output only via `chalk` for colors and `ora` for spinners. No structured logging framework. Background updater writes to `~/.gamekit/update.log`.

**Validation:** Project name validated with regex (`/^[a-zA-Z0-9_-]+$/`). Unity version strings parsed and validated. Symlinks skipped during directory copy for security.

**Authentication:** None -- GitHub API calls are unauthenticated (public repos). No user accounts or tokens.

**Platform Abstraction:** `src/utils/platform.ts` provides `getPlatform()`, `isMac()`, `isWindows()` with parameter injection for testing. All platform-specific paths flow through this module.

**Testability:** Utility functions accept platform/path overrides as optional parameters (dependency injection via function arguments) to enable unit testing without filesystem access.

---

*Architecture analysis: 2026-02-09*
