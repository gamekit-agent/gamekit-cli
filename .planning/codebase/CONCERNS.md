# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Duplicated `copyDirectorySync` function:**
- Issue: The same recursive directory copy function is implemented independently in two files with identical logic (skip symlinks, recursive copy).
- Files: `src/utils/commands.ts` (line 34-53), `src/utils/template.ts` (line 162-180)
- Impact: Bug fixes or security improvements to one copy won't propagate to the other. Maintenance burden doubles for this critical file-operation code.
- Fix approach: Extract `copyDirectorySync` into a shared utility (e.g., `src/utils/fs.ts`) and import it from both `commands.ts` and `template.ts`.

**Duplicated HTTP fetch/download logic in updater:**
- Issue: `src/utils/updater.ts` contains two complete implementations of `fetchJson` and `downloadFile` -- one as proper TypeScript functions (lines 63-92) and one duplicated as raw JavaScript inside the background update script string (lines 179-219). The inline script also duplicates `compareVersions`.
- Files: `src/utils/updater.ts`
- Impact: Any fix to redirect handling, error handling, or security improvements must be applied in two places. The inline string version has no type checking and cannot be tested independently.
- Fix approach: Write the background update logic as a separate script file (e.g., `src/scripts/background-update.ts`) that gets compiled, rather than embedding it as a string template. This eliminates duplication and enables testing.

**`commands.ts` is partially redundant with `template.ts`:**
- Issue: `src/utils/commands.ts` provides `getCommandsTemplatePath()` and `copyCommands()` which overlap with `getTemplatePath()` and `copyTemplateAsync()` in `src/utils/template.ts`. The commands version uses a different path resolution strategy and only copies `.claude/`, while template copies the entire template. The init command only uses `template.ts` functions, making the `commands.ts` functions potentially dead code in production.
- Files: `src/utils/commands.ts`, `src/utils/template.ts`
- Impact: Confusing API surface -- two ways to do the same thing with subtly different behavior. The `commands.ts` version does not write version tracking or hashes, so using it bypasses the update-detection system.
- Fix approach: Audit usage of `commands.ts` functions. If only used in tests, consider removing or marking as internal. Consolidate into `template.ts` if functionality overlaps.

**Inline C# source code in TypeScript:**
- Issue: A full C# Unity editor script (`ScreenshotCapture.cs`) is stored as a template literal string inside `src/utils/assets.ts`. This makes the C# code impossible to lint, syntax-check, or edit with proper tooling.
- Files: `src/utils/assets.ts`
- Impact: C# syntax errors will not be caught until runtime. Adding more editor scripts this way will make the file increasingly unwieldy.
- Fix approach: Move the C# source to a separate `.cs` file in the `template/` directory and read it at copy time, or include it as part of the template copy process rather than generating it programmatically.

**`verify.sh` script references npm but project uses bun:**
- Issue: The `scripts/verify.sh` verification script uses `npx tsc`, `npm test`, and `npm run build`, but the project's CI and `package.json` scripts use `bun`. The script instructs users to run `npm install` if `node_modules` is missing.
- Files: `scripts/verify.sh`
- Impact: Inconsistent developer experience. Running the verify script may produce different results than CI, or fail if npm is not installed.
- Fix approach: Update `verify.sh` to use `bun` commands (`bunx tsc`, `bun test`, `bun run build`) and instruct users to run `bun install`.

## Known Bugs

**Redundant `mcpUrl` check in `initExistingProject`:**
- Symptoms: `getMcpPackageUrl` is called to check support, but then `addMcpToManifest` is called with the raw version string (which internally calls `getMcpPackageUrl` again). The outer check's result (`mcpUrl`) is never used to pass the URL.
- Files: `src/commands/init.ts` (lines 106-113), repeated at lines 262-270 in `createNewProject`
- Trigger: Always occurs during init flow.
- Workaround: The code works correctly because `addMcpToManifest` does its own internal check. The outer check just gates the "not supported" warning message. However, the double call is wasteful and confusing.

**Infinite redirect loop potential in `downloadFile` and `fetchJson`:**
- Symptoms: If a server returns a redirect loop (301/302 pointing back to itself), the recursive call in `downloadFile` and `fetchJson` will stack overflow.
- Files: `src/utils/template.ts` (lines 54-77), `src/utils/updater.ts` (lines 63-92, 179-219)
- Trigger: Malformed GitHub API response or a proxy that creates redirect loops.
- Workaround: None. Add a max redirect counter (e.g., limit to 5 redirects).

## Security Considerations

**Auto-update downloads binaries without integrity verification:**
- Risk: The background auto-updater in `src/utils/updater.ts` downloads a binary from GitHub releases and replaces the installed `gamekit` binary without verifying checksums, signatures, or TLS certificate pinning. A compromised GitHub release or MITM attack could deliver malicious code.
- Files: `src/utils/updater.ts` (lines 154-303, the inline update script)
- Current mitigation: HTTPS is used for download. GitHub's infrastructure provides some trust.
- Recommendations: Add SHA256 checksum verification. Publish checksums alongside release binaries and verify before replacing the binary. Consider code signing for the binaries.

**Install scripts download and execute binaries without checksum verification:**
- Risk: `scripts/install/install.sh` and `scripts/install/install.ps1` download the binary from GitHub and immediately make it executable / run it without any integrity check.
- Files: `scripts/install/install.sh`, `scripts/install/install.ps1`
- Current mitigation: HTTPS transport. macOS quarantine attribute is explicitly removed (`xattr -d com.apple.quarantine`).
- Recommendations: Add checksum verification to install scripts. Publish a `checksums.txt` in releases and verify before installation.

**`tar` extraction without path validation:**
- Risk: In `downloadTemplate()`, a tarball is downloaded from GitHub and extracted using `execSync('tar -xzf ...')`. If the tarball contains files with path traversal names (e.g., `../../etc/cron.d/evil`), they could be written outside the temp directory.
- Files: `src/utils/template.ts` (line 94)
- Current mitigation: The source is the official GitHub repo tarball, which GitHub generates safely. The extraction happens in a temp directory.
- Recommendations: Use `tar --strip-components=1` and explicitly specify the extraction directory, or use a library that validates paths.

**No Linux support but Linux binaries are built:**
- Risk: `src/utils/platform.ts` throws "Unsupported platform" for Linux in `getMcpRelayPath` and `getUnityHubPath`, but the CI/CD pipeline builds `gamekit-linux-x64` binaries. Linux users can install the binary but will get runtime errors when running `gamekit init`.
- Files: `src/utils/platform.ts`, `src/utils/unity.ts`, `.github/workflows/release.yml`
- Current mitigation: None. The error message is clear but the experience is confusing.
- Recommendations: Either add Linux support (Unity Hub has Linux support) or stop building/publishing Linux binaries and document the limitation.

## Performance Bottlenecks

**Synchronous file operations throughout:**
- Problem: All file system operations (`fs.existsSync`, `fs.readFileSync`, `fs.writeFileSync`, `fs.readdirSync`, `fs.copyFileSync`, `fs.mkdirSync`) are synchronous. The `copyDirectorySync` function recursively copies entire directory trees synchronously.
- Files: `src/utils/template.ts`, `src/utils/commands.ts`, `src/utils/manifest.ts`, `src/utils/assets.ts`, `src/utils/mcp.ts`
- Cause: The original code chose synchronous APIs for simplicity. For a CLI tool with small file counts, this is acceptable, but it blocks the event loop during template copy operations.
- Improvement path: For current template sizes (roughly 40 files), this is not a real bottleneck. If the template grows significantly, consider using `fs.promises` and `async` directory traversal. Low priority.

**SHA256 hashing reads entire files into memory:**
- Problem: `hashFile()` in `src/utils/template.ts` reads the entire file content into memory with `fs.readFileSync` before hashing.
- Files: `src/utils/template.ts` (line 228-231)
- Cause: Simple implementation using `readFileSync` rather than streaming.
- Improvement path: For the current use case (small markdown files), this is fine. If ever applied to large files, switch to `fs.createReadStream` piped to `crypto.createHash`. Low priority.

## Fragile Areas

**Version injection system:**
- Files: `src/version.ts`, `scripts/inject-version.ts`, `.github/workflows/release.yml` (lines 28-32, 70-73)
- Why fragile: The version is managed in three different places: `package.json` (source of truth), `src/version.ts` (auto-generated), and the release workflow (which overwrites `version.ts` from the git tag). The `inject-version.ts` script reads from `package.json`, but the release workflow ignores `package.json` and writes the tag version directly. If the tag does not match `package.json`, the release binary will have a different version than what `npm` or local dev would show.
- Safe modification: Always ensure the git tag matches `package.json` version. The `version.ts` file is committed to git with the `package.json` version, so local dev uses the `package.json` value.
- Test coverage: The `updater.test.ts` tests verify `getCurrentVersion()` returns a semver string, but do not test the injection pipeline itself.

**Template path resolution:**
- Files: `src/utils/commands.ts` (lines 8-28), `src/utils/template.ts` (lines 27-43)
- Why fragile: Both files use relative path resolution from `import.meta.url` with `..` traversals to find the `template/` directory. The path differs between development (`src/utils/` -> `../../template`), compiled (`dist/utils/` -> `../../template`), and binary build (bundled by Bun -- template may not exist as a filesystem path). The `commands.ts` version has an additional fallback path (`../../../template`). If the directory structure changes, both will silently break.
- Safe modification: If moving source files or changing the build output structure, test both `getCommandsTemplatePath()` and `getTemplatePath()` manually. The `template.ts` version has a GitHub download fallback, but `commands.ts` does not.
- Test coverage: Tests verify the paths resolve correctly in the test environment but would not catch failures in compiled binaries.

**`process.exit(1)` throughout init command:**
- Files: `src/commands/init.ts` (10 occurrences)
- Why fragile: Heavy use of `process.exit(1)` makes the init flow impossible to test as a function call. Any error in any step kills the entire process. There is no cleanup logic (e.g., removing partially-created directories) when steps fail mid-way.
- Safe modification: Wrap the init flow in try/catch at the top level and throw errors instead of calling `process.exit`. Let the top-level handler decide whether to exit.
- Test coverage: The init command has no integration tests due to its interactive nature and `process.exit` calls. Only `isValidProjectName` is unit tested.

## Scaling Limits

**Single-template architecture:**
- Current capacity: One template (`template/.claude/`) that is copied identically to all projects.
- Limit: Cannot customize templates per Unity version, game type, or user preference.
- Scaling path: Add template variants or a template configuration system if different project types need different setups.

**GitHub API rate limiting on auto-updates:**
- Current capacity: Checks GitHub API once per hour per user (`shouldCheckForUpdates` throttle).
- Limit: GitHub's unauthenticated API rate limit is 60 requests/hour per IP. If multiple users share an IP (corporate network), they could collectively hit the limit.
- Scaling path: Reduce check frequency, add API token support, or use a lightweight "latest version" endpoint.

## Dependencies at Risk

**No pinned dependency versions in CI:**
- Risk: CI uses `bun-version: latest` which means builds are not reproducible. A breaking change in Bun could silently break the build pipeline.
- Impact: Release builds may fail unexpectedly or produce different binaries on different days.
- Migration plan: Pin `bun-version` to a specific version in `.github/workflows/ci.yml` and `.github/workflows/release.yml`.

**Inquirer v9 with ESM:**
- Risk: `inquirer@^9.3.7` is a major version with ESM-only distribution. The caret range (`^9`) allows minor/patch updates that could introduce breaking changes.
- Impact: Interactive prompts in `src/commands/init.ts` could break.
- Migration plan: Pin to exact version or narrow the range. Monitor for deprecation notices.

## Missing Critical Features

**No `--help` documentation for init options:**
- Problem: The `init` command accepts no CLI arguments -- everything is interactive. There is no `--non-interactive` or `--yes` flag for scripted/CI usage.
- Blocks: Automated project setup in CI/CD pipelines, scripted workflows, testing.

**No `update` command:**
- Problem: Template updates happen only through the auto-updater background process, which replaces the binary. There is no explicit `gamekit update` command for users to trigger updates, update just the template, or update commands in an existing project.
- Blocks: Users who want to manually update, or who have the auto-updater disabled (`GAMEKIT_NO_UPDATE_CHECK` env var).

**No error recovery in init flow:**
- Problem: If the init flow fails mid-way (e.g., after creating the Unity project but before copying templates), the user is left with a partially-configured project and no guidance on how to resume.
- Blocks: Clean recovery from network failures, disk space issues, or Unity creation failures.

## Test Coverage Gaps

**Init command flow untested:**
- What's not tested: The main `init()`, `initExistingProject()`, and `createNewProject()` functions have zero test coverage. Only the `isValidProjectName` helper is tested.
- Files: `src/commands/init.ts`
- Risk: Regressions in the primary user-facing flow would go undetected. The interactive prompts and `process.exit` calls make this difficult to test without refactoring.
- Priority: High

**Doctor command flow untested:**
- What's not tested: The `runDoctor()` function and most individual check functions (`checkUnityProject`, `checkClaudeCommands`, `checkMcpConfig`, `checkMcpRelay`) are not tested. Only `checkUnityInstalled` has a basic structural test, and it hits the real filesystem.
- Files: `src/commands/doctor.ts`, `src/__tests__/commands/doctor.test.ts`
- Risk: Doctor could report incorrect pass/fail status without detection.
- Priority: Medium

**Auto-updater untested:**
- What's not tested: `checkForUpdatesInBackground()`, `shouldCheckForUpdates()`, `checkForAppliedUpdate()`, `maybeCheckForUpdates()`, `fetchLatestVersion()`, `getDownloadUrl()` -- none of these functions have tests.
- Files: `src/utils/updater.ts`, `src/__tests__/utils/updater.test.ts`
- Risk: The auto-updater is security-critical code that silently replaces the running binary. A bug here could brick installations or create a security vulnerability. The inline JavaScript string has no type checking at all.
- Priority: High

**Template download path untested:**
- What's not tested: `downloadTemplate()`, `downloadFile()`, `ensureTemplate()` in `src/utils/template.ts`. The GitHub download fallback path when the local template is missing is completely untested.
- Files: `src/utils/template.ts`
- Risk: Binary distributions (where templates are not bundled) rely on this download path. If it breaks, compiled binaries cannot initialize projects.
- Priority: Medium

**`waitForMcpRelay` polling untested:**
- What's not tested: The polling loop, timeout behavior, and spinner interaction in `waitForMcpRelay()`.
- Files: `src/utils/mcp.ts`
- Risk: Timeout logic or polling could hang indefinitely if the filesystem check behaves unexpectedly.
- Priority: Low

**No integration or E2E tests:**
- What's not tested: The complete flow from `gamekit init` to a working Unity project with MCP configured. No tests verify the binary build works correctly.
- Files: Entire project
- Risk: Individual unit tests pass but the assembled flow could fail. The CI `build-check` job runs `./dist/gamekit-linux-x64 version` which is a minimal smoke test, but does not exercise init or doctor.
- Priority: Medium

---

*Concerns audit: 2026-02-09*
