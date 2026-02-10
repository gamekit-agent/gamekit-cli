# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**GitHub API:**
- Used for: Auto-update checks (fetching latest release), template downloads
- Endpoints consumed:
  - `GET https://api.github.com/repos/gamekit-agent/gamekit-cli/releases/latest` - Version check
  - `GET https://api.github.com/repos/gamekit-agent/gamekit-cli/releases/tags/v{version}` - Download URL lookup
  - `GET https://github.com/gamekit-agent/gamekit-cli/archive/refs/heads/main.tar.gz` - Template tarball download
- SDK/Client: Raw `https` module (Node.js built-in), no SDK
- Auth: None (unauthenticated public API calls)
- Rate limiting: Update checks throttled to once per hour via `~/.gamekit/last-update-check` timestamp file
- Implementation: `src/utils/updater.ts` (version check + binary download), `src/utils/template.ts` (template download)

**GitHub Releases (Distribution):**
- Binary assets published: `gamekit-darwin-arm64`, `gamekit-darwin-x64`, `gamekit-linux-x64`, `gamekit-windows-x64.exe`
- Install scripts published alongside binaries: `install.sh`, `install.ps1`
- Auth: `GITHUB_TOKEN` secret (CI only, via `softprops/action-gh-release@v2`)

## Unity Integration

**Unity Hub / Unity Editor:**
- Direct CLI invocation via `child_process.spawn`
- Creates projects: `Unity -createProject <path> -quit -batchmode`
- Opens projects: `Unity -projectPath <path>` (detached, non-blocking)
- Implementation: `src/utils/unity.ts`
- Platform-specific paths:
  - macOS: `/Applications/Unity/Hub/Editor/{version}/Unity.app/Contents/MacOS/Unity`
  - Windows: `C:\Program Files\Unity\Hub\Editor\{version}\Editor\Unity.exe`

**Unity Package Manager (manifest.json):**
- Injects MCP package dependency into Unity project's `Packages/manifest.json`
- Package: `com.codemaestroai.advancedunitymcp`
- Git URLs by Unity version:
  - Unity 6+ (6000.x): `https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity6`
  - Unity 2020-2023: `https://github.com/codemaestroai/advanced-unity-mcp.git?path=Unity2020_2022`
  - Unity 2019 and older: Not supported
- Implementation: `src/utils/manifest.ts`

**CodeMaestro MCP Relay:**
- A third-party MCP (Model Context Protocol) bridge between Claude Code and Unity Editor
- Installed automatically by the Unity MCP package when Unity opens the project
- Relay script locations:
  - macOS: `~/Library/Application Support/CodeMaestro/UnityMcpRelay/launch.sh`
  - Windows: `%LOCALAPPDATA%\Programs\CodeMaestro\UnityMcpRelay\launch.bat`
- CLI generates `.mcp.json` in project root to configure Claude Code to use this relay
- CLI polls for relay existence with timeout (5 min default, 2s interval) after project creation
- Implementation: `src/utils/mcp.ts`, `src/utils/platform.ts`

## Data Storage

**Databases:**
- None - CLI is stateless; all data is file-system based

**File Storage:**
- Local filesystem only
- Project files written to user's chosen directory
- Config/cache stored in `~/.gamekit/`:
  - `~/.gamekit/bin/` - Self-installed binary location
  - `~/.gamekit/template/` - Cached template from GitHub
  - `~/.gamekit/last-update-check` - Timestamp for rate limiting
  - `~/.gamekit/update-applied` - Marker file for post-update notification
  - `~/.gamekit/update.log` - Update activity log
- Windows equivalent: `%LOCALAPPDATA%\gamekit\bin\`

**Caching:**
- Template caching: Downloaded GitHub tarball extracted to `~/.gamekit/template/`
- Falls back to local `template/` directory during development
- Implementation: `src/utils/template.ts` (`getCachedTemplatePath`, `ensureTemplate`)

## Authentication & Identity

**Auth Provider:**
- None - CLI requires no authentication
- End users authenticate separately with Claude Code and Unity Hub (external to this CLI)

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- Console output only (via `chalk` for colored output, `ora` for spinners)
- Update activity logged to `~/.gamekit/update.log` with ISO timestamps
- Implementation: `src/utils/updater.ts` (`logUpdate`)

## CI/CD & Deployment

**Hosting:**
- GitHub (repository: `gamekit-agent/gamekit-cli`)
- Distributed as GitHub Release assets (standalone binaries)

**CI Pipeline (`.github/workflows/ci.yml`):**
- Trigger: Push to `main`, PRs to `main`
- Runner: `ubuntu-latest`
- Steps:
  1. Setup Bun (latest)
  2. `bun install`
  3. `bun test src/__tests__` - Run test suite
  4. `bunx tsc --noEmit` - Type check
  5. Test Linux binary build + smoke test (`./dist/gamekit-linux-x64 version`)

**Release Pipeline (`.github/workflows/release.yml`):**
- Trigger: Push tag matching `v*`
- Multi-platform build:
  - `ubuntu-latest`: Builds macOS (arm64 + x64) and Linux (x64) binaries
  - `windows-latest`: Builds Windows (x64) binary natively
- Version injected from git tag into `src/version.ts`
- Tests run before build
- Release created via `softprops/action-gh-release@v2` with auto-generated notes
- Artifacts: 4 binaries + 2 install scripts

## Environment Configuration

**Required env vars:**
- None required for normal operation

**Optional env vars:**
- `GAMEKIT_NO_UPDATE_CHECK` - Disables automatic update checks (development use)
- `HOME` / `USERPROFILE` - Home directory (auto-detected by Node.js)
- `LOCALAPPDATA` - Windows local app data path (auto-detected)

**Secrets (CI only):**
- `GITHUB_TOKEN` - Used by release workflow to create GitHub releases (provided automatically by GitHub Actions)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Packages Referenced (not npm dependencies)

**Unity Packages (injected into user projects):**
- `com.codemaestroai.advancedunitymcp` - MCP bridge for Unity, from `codemaestroai/advanced-unity-mcp` GitHub repo

**Claude Code:**
- Not a dependency but the target platform; gamekit configures Unity projects for use with Claude Code
- `.mcp.json` generated to configure Claude Code's MCP server connection
- `.claude/` directory with commands, skills, and agents copied from template

**Normcore (optional, user-facing):**
- `com.normalvr.normcore` - Multiplayer SDK mentioned in template docs, not installed by CLI
- Referenced in template's `CLAUDE.md` and skills

---

*Integration audit: 2026-02-09*
