# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
gamekit-cli/
├── src/                    # TypeScript source code
│   ├── index.ts            # CLI entry point (Commander setup)
│   ├── version.ts          # Auto-generated version constant
│   ├── commands/           # CLI command handlers
│   │   ├── init.ts         # Interactive project setup wizard
│   │   └── doctor.ts       # Diagnostic checks
│   ├── utils/              # Reusable utility modules
│   │   ├── assets.ts       # Unity C# editor script generation
│   │   ├── commands.ts     # Claude commands template location/copying
│   │   ├── manifest.ts     # Unity Packages/manifest.json editing
│   │   ├── mcp.ts          # MCP config generation and relay detection
│   │   ├── platform.ts     # OS detection (macOS/Windows)
│   │   ├── template.ts     # Template copying, versioning, hashing
│   │   └── updater.ts      # Background auto-update via GitHub releases
│   └── __tests__/          # Test files (mirrored structure)
│       ├── commands/
│       │   ├── doctor.test.ts
│       │   └── init.test.ts
│       └── utils/
│           ├── assets.test.ts
│           ├── commands.test.ts
│           ├── manifest.test.ts
│           ├── mcp.test.ts
│           ├── platform.test.ts
│           ├── template.test.ts
│           ├── unity.test.ts
│           └── updater.test.ts
├── template/               # Files copied into user Unity projects
│   ├── readme.md           # Template documentation
│   └── .claude/            # Claude Code configuration for Unity dev
│       ├── CLAUDE.md       # Claude's identity and behavior instructions
│       ├── LEARNINGS.md    # Issue tracking for improvement
│       ├── settings.local.json  # Permissions and hooks
│       ├── commands/       # 12 slash commands (/new-game, /playtest, etc.)
│       ├── skills/         # 18 auto-invoked skills (adding-player, etc.)
│       │   └── [skill-name]/SKILL.md
│       └── agents/         # 6 specialized worker agents
│           └── [agent-name].md
├── scripts/                # Build and install scripts
│   ├── inject-version.ts   # Reads package.json version -> src/version.ts
│   ├── verify.sh           # Dev health check (typecheck + test + build)
│   └── install/            # End-user install scripts
│       ├── install.sh      # Unix installer (curl | bash)
│       └── install.ps1     # Windows installer (irm | iex)
├── docs/                   # Project documentation
│   ├── assets/             # Images and GIFs for README
│   ├── commands.md
│   ├── how-it-works.md
│   ├── project-structure.md
│   ├── roadmap.md
│   ├── slash-commands.md
│   └── troubleshooting.md
├── .github/workflows/      # CI/CD
│   ├── ci.yml              # Test + typecheck + build-check on push/PR
│   └── release.yml         # Multi-platform binary build on tag push
├── package.json            # npm manifest (dependencies, scripts, bin)
├── tsconfig.json           # TypeScript config (ES2022, NodeNext, strict)
├── vitest.config.ts        # Test runner config (node env, v8 coverage)
├── bunfig.toml             # Bun config (test root)
├── .gitignore              # Ignores node_modules, dist, sample, tmp, .claude
├── readme.md               # Project README
└── license.md              # MIT license
```

## Directory Purposes

**`src/`:**
- Purpose: All TypeScript source code for the CLI tool
- Contains: Entry point, commands, utilities, and tests
- Key files: `src/index.ts` (entry), `src/version.ts` (auto-generated)

**`src/commands/`:**
- Purpose: CLI command handlers that orchestrate user-facing workflows
- Contains: One file per CLI command
- Key files: `src/commands/init.ts` (main wizard, 355 lines), `src/commands/doctor.ts` (diagnostics, 119 lines)

**`src/utils/`:**
- Purpose: Pure utility functions organized by domain concern
- Contains: One module per concern (7 modules total)
- Key files: `src/utils/template.ts` (349 lines, largest util), `src/utils/updater.ts` (371 lines), `src/utils/unity.ts` (226 lines)

**`src/__tests__/`:**
- Purpose: Unit tests mirroring the source structure
- Contains: Test files for commands and utils
- Key files: 10 test files covering all source modules

**`template/`:**
- Purpose: Static files that get copied into user Unity projects during `gamekit init`
- Contains: Claude Code configuration (commands, skills, agents, settings)
- Key files: `template/.claude/CLAUDE.md` (278 lines, defines Claude's Unity expert persona)

**`template/.claude/commands/`:**
- Purpose: User-facing slash commands for Claude Code in Unity projects
- Contains: 12 markdown command files
- Key files: `new-game.md`, `playtest.md`, `build.md`, `find-asset.md`, `fix.md`, `screenshot.md`, `rollback.md`, etc.

**`template/.claude/skills/`:**
- Purpose: Auto-invoked knowledge modules for specific game dev tasks
- Contains: 18 skill directories, each with a `SKILL.md`
- Key files: `adding-player/SKILL.md`, `adding-enemies/SKILL.md`, `quality-gate/SKILL.md`, `verify-changes/SKILL.md`

**`template/.claude/agents/`:**
- Purpose: Specialized worker agent definitions for delegation
- Contains: 6 agent markdown files
- Key files: `game-planner.md`, `asset-finder.md`, `level-designer.md`, `code-debugger.md`, `optimizer.md`, `iterator.md`

**`scripts/`:**
- Purpose: Build tooling and end-user installation scripts
- Contains: Version injection, verification, platform installers
- Key files: `scripts/inject-version.ts`, `scripts/install/install.sh`

**`docs/`:**
- Purpose: External documentation and media assets
- Contains: Markdown docs and demo GIFs/images
- Key files: `docs/how-it-works.md`, `docs/troubleshooting.md`

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD pipelines
- Contains: CI (test + build-check) and Release (multi-platform binary build)
- Key files: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

## Key File Locations

**Entry Points:**
- `src/index.ts`: CLI binary entry point (registered as `gamekit` in package.json `bin`)
- `scripts/install/install.sh`: Unix end-user installer
- `scripts/install/install.ps1`: Windows end-user installer

**Configuration:**
- `package.json`: Dependencies, scripts, bin mapping, engine requirements
- `tsconfig.json`: TypeScript compiler options (ES2022, strict, NodeNext modules)
- `vitest.config.ts`: Test runner (globals, node env, coverage with v8)
- `bunfig.toml`: Bun test root override

**Core Logic:**
- `src/commands/init.ts`: Main user workflow -- project creation/initialization wizard
- `src/utils/unity.ts`: Unity installation discovery, project creation, version parsing
- `src/utils/template.ts`: Template management (copy, download, cache, hash, version)
- `src/utils/mcp.ts`: MCP relay configuration and detection
- `src/utils/updater.ts`: Background auto-update from GitHub releases

**Testing:**
- `src/__tests__/commands/init.test.ts`: Init command tests
- `src/__tests__/commands/doctor.test.ts`: Doctor command tests
- `src/__tests__/utils/*.test.ts`: Utility module tests (8 files)

**Auto-Generated:**
- `src/version.ts`: Version constant, generated by `scripts/inject-version.ts` -- DO NOT EDIT

## Naming Conventions

**Files:**
- Source files: `kebab-case.ts` (e.g., `src/utils/updater.ts`)
- Test files: `kebab-case.test.ts` (e.g., `src/__tests__/utils/updater.test.ts`)
- Template skill dirs: `kebab-case/SKILL.md` (e.g., `template/.claude/skills/adding-player/SKILL.md`)
- Template agent files: `kebab-case.md` (e.g., `template/.claude/agents/game-planner.md`)
- Template command files: `kebab-case.md` (e.g., `template/.claude/commands/new-game.md`)
- Scripts: `kebab-case.ts` or `kebab-case.sh` (e.g., `scripts/inject-version.ts`)

**Directories:**
- Source dirs: `lowercase` (e.g., `commands/`, `utils/`)
- Test dirs: `__tests__/` with mirrored subdirectories (`commands/`, `utils/`)
- Template skill dirs: `kebab-case` matching the skill name

**Exports:**
- Functions: `camelCase` (e.g., `findUnityInstalls`, `copyTemplateAsync`)
- Interfaces: `PascalCase` (e.g., `UnityInstall`, `CheckResult`, `McpConfig`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MCP_SERVER_NAME`, `VERSION`)

## Where to Add New Code

**New CLI Command:**
1. Create handler: `src/commands/{command-name}.ts`
2. Export main function (async)
3. Register in `src/index.ts` via `program.command('{name}').action({handler})`
4. Add tests: `src/__tests__/commands/{command-name}.test.ts`

**New Utility Module:**
1. Create module: `src/utils/{module-name}.ts`
2. Export functions with platform params for testability
3. Add tests: `src/__tests__/utils/{module-name}.test.ts`
4. Import in commands as `import { fn } from '../utils/{module-name}.js'` (note `.js` extension for NodeNext)

**New Template Skill:**
1. Create directory: `template/.claude/skills/{skill-name}/`
2. Add `SKILL.md` with skill definition
3. The skill gets copied to user projects automatically via `copyTemplateAsync()`

**New Template Command:**
1. Create file: `template/.claude/commands/{command-name}.md`
2. Follow existing command format (see `template/.claude/commands/new-game.md`)
3. Gets copied to user projects automatically

**New Template Agent:**
1. Create file: `template/.claude/agents/{agent-name}.md`
2. Follow existing agent format (see `template/.claude/agents/game-planner.md`)
3. Gets copied to user projects automatically

**New Install Script:**
1. Add to `scripts/install/`
2. Reference in `.github/workflows/release.yml` under `files:` to include in releases

## Special Directories

**`dist/`:**
- Purpose: Compiled TypeScript output (tsc) and compiled Bun binaries
- Generated: Yes (by `npm run build` or `npm run build:binary`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm/bun dependencies
- Generated: Yes (by `npm install` / `bun install`)
- Committed: No (in `.gitignore`)

**`template/`:**
- Purpose: Static template files bundled with the CLI
- Generated: No (manually authored)
- Committed: Yes
- Note: Listed in package.json `files` array, included in npm package and binary builds

**`.planning/`:**
- Purpose: Project planning and codebase analysis documents
- Generated: Yes (by planning tools)
- Committed: Varies

**`~/.gamekit/` (external, on user's machine):**
- Purpose: CLI config, cached templates, update logs, installed binaries
- Generated: Yes (at runtime by the CLI)
- Committed: N/A (not in repo)
- Subdirs: `bin/` (binary), `template/` (cached template), `update.log`, `last-update-check`, `update-applied`

---

*Structure analysis: 2026-02-09*
