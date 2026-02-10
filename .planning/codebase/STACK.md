# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- TypeScript 5.7.2 - All CLI source code (`src/**/*.ts`), tests, and build scripts

**Secondary:**
- C# - Generated Unity editor scripts embedded as string literals in `src/utils/assets.ts`
- Bash - Install script (`scripts/install/install.sh`), verification script (`scripts/verify.sh`)
- PowerShell - Windows install script (`scripts/install/install.ps1`)

## Runtime

**Environment:**
- Bun (latest) - Primary runtime for development, testing, and binary compilation
- Node.js >= 18.0.0 - Declared engine requirement in `package.json`; used as fallback for `tsc` builds

**Package Manager:**
- npm - Lockfile: `package-lock.json` present (77KB)
- Bun - Used in CI and build scripts (`bun install`, `bun test`, `bun build`)
- No `bun.lockb` or `bun.lock` present; npm lockfile is the source of truth

## Frameworks

**Core:**
- Commander 12.1.0 - CLI framework for command parsing and routing (`src/index.ts`)
- Inquirer 9.3.7 - Interactive prompts for user input (`src/commands/init.ts`)

**Testing:**
- Vitest 2.1.8 - Test runner and assertion library
  - Config: `vitest.config.ts`
  - Environment: `node`
  - Coverage provider: `v8`

**Build/Dev:**
- TypeScript 5.7.2 - Type checking and `tsc` compilation to `dist/`
- Bun compiler - Produces standalone cross-platform binaries via `bun build --compile`
- tsx 4.19.2 - TypeScript execution for dev scripts

## Key Dependencies

**Critical (runtime):**
- `commander` ^12.1.0 - CLI argument parsing, subcommand routing
- `inquirer` ^9.3.7 - Interactive terminal prompts (project name, Unity version selection)
- `chalk` ^5.3.0 - Terminal color output for status messages and UI
- `ora` ^8.1.1 - Spinner animations for long-running operations

**Dev Dependencies:**
- `@types/inquirer` ^9.0.7 - TypeScript types for inquirer
- `@types/node` ^22.10.5 - Node.js type definitions
- `typescript` ^5.7.2 - TypeScript compiler
- `tsx` ^4.19.2 - TypeScript execution (used for `scripts/inject-version.ts`)
- `vitest` ^2.1.8 - Test runner

**Node.js Built-in Modules Used:**
- `fs` - File system operations (project scaffolding, config file management)
- `path` - Cross-platform path construction
- `child_process` (`spawn`, `execSync`) - Unity CLI invocation, background update process
- `https` - GitHub API calls for updates and template downloads
- `os` - Platform detection, home directory resolution
- `crypto` - SHA256 hashing for template file integrity tracking
- `url` (`fileURLToPath`) - ESM `__dirname` equivalent

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2022
- Module: NodeNext (ESM)
- Module Resolution: NodeNext
- Strict mode: enabled
- Output: `dist/`
- Source root: `src/`
- Generates declarations (`.d.ts`)
- Resolves JSON modules
- Excludes test files from compilation

**Vitest (`vitest.config.ts`):**
- Globals: enabled (no need to import `describe`/`it`/`expect`)
- Environment: node
- Test pattern: `src/__tests__/**/*.test.ts`
- Coverage: v8 provider, text + HTML reporters

**Bun (`bunfig.toml`):**
- Test root: `./src/__tests__`

**Module System:**
- ESM (`"type": "module"` in `package.json`)
- All internal imports use `.js` extension (required for NodeNext resolution)

## Build System

**Development:**
- `bun run dev` - Execute `src/index.ts` directly via Bun
- `bun run build` - TypeScript compilation via `tsc` to `dist/`

**Binary Compilation:**
- `bun run build:binary` - Builds standalone binaries for 4 targets:
  - `gamekit-darwin-arm64` (macOS Apple Silicon)
  - `gamekit-darwin-x64` (macOS Intel)
  - `gamekit-linux-x64` (Linux x64)
  - `gamekit-windows-x64.exe` (Windows x64)
- Binaries are self-contained Bun executables (no runtime needed)
- Minification enabled via `--minify`

**Version Injection:**
- `scripts/inject-version.ts` reads version from `package.json` and writes `src/version.ts`
- CI overrides this: extracts version from git tag (`v*`) and writes directly to `src/version.ts`
- `src/version.ts` is auto-generated, committed to repo

**Testing:**
- `bun test` / `vitest run` - Run all tests
- `vitest` - Watch mode

## Platform Requirements

**Development:**
- Bun (latest) - Required for binary compilation and dev workflow
- Node.js >= 18 - For npm/tsc compatibility
- macOS or Linux recommended (Windows supported for builds)

**Production (End User):**
- No runtime required - distributed as self-contained binaries
- macOS (arm64/x64), Linux (x64), or Windows (x64)
- Unity Hub with Unity 2020+ installed
- Claude Code CLI (the tool this sets up projects for)

**Distribution:**
- GitHub Releases via `softprops/action-gh-release@v2`
- Install scripts: `curl | bash` (Unix) or `irm | iex` (Windows)
- Self-updating: binary checks GitHub API hourly for new releases

---

*Stack analysis: 2026-02-09*
