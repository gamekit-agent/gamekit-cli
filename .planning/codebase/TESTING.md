# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Runner:**
- Vitest ^2.1.8
- Config: `vitest.config.ts`
- Globals enabled (`globals: true` in config)
- Environment: `node`

**Assertion Library:**
- Vitest built-in (`expect` from `vitest`)

**Run Commands:**
```bash
npm run test               # Run all tests (vitest run)
npm run test:watch         # Watch mode (vitest)
npx vitest run --coverage  # Coverage (v8 provider configured)
```

**Note:** Tests use `vitest` directly. There is also a `bunfig.toml` with `[test] root = "./src/__tests__"` for Bun test runner compatibility, but `vitest` is the primary test runner.

## Test File Organization

**Location:**
- Centralized in `src/__tests__/` directory (NOT co-located with source files)
- Mirror the source directory structure under `src/__tests__/`

**Naming:**
- `{module-name}.test.ts` suffix

**Structure:**
```
src/__tests__/
├── commands/
│   ├── doctor.test.ts      # Tests for src/commands/doctor.ts
│   └── init.test.ts        # Tests for src/commands/init.ts
└── utils/
    ├── assets.test.ts       # Tests for src/utils/assets.ts
    ├── commands.test.ts     # Tests for src/utils/commands.ts
    ├── manifest.test.ts     # Tests for src/utils/manifest.ts
    ├── mcp.test.ts          # Tests for src/utils/mcp.ts
    ├── platform.test.ts     # Tests for src/utils/platform.ts
    ├── template.test.ts     # Tests for src/utils/template.ts
    ├── unity.test.ts        # Tests for src/utils/unity.ts
    └── updater.test.ts      # Tests for src/utils/updater.ts
```

**Vitest config (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', 'src/__tests__'],
    },
  },
});
```

## Test Structure

**Suite Organization:**
- Use `describe` blocks grouped by function or feature name
- Nest `describe` blocks to group related tests within a module
- Use concise `it` descriptions starting with "should" or a verb

```typescript
describe('unity utilities', () => {
  describe('parseUnityVersion', () => {
    it('parses Unity 6 version correctly', () => {
      const result = parseUnityVersion('6000.1.12f1');
      expect(result).toEqual({ major: 6000, minor: 1, patch: 12, type: 'f', build: 1 });
    });

    it('returns null for invalid version', () => {
      const result = parseUnityVersion('invalid');
      expect(result).toBeNull();
    });
  });
});
```

**Import pattern:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
```
Always explicitly import test functions from `vitest` even though `globals: true` is set.

**Setup/Teardown pattern for filesystem tests:**
```typescript
describe('some feature', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamekit-{feature}-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should do something', () => {
    // Use testDir as isolated workspace
  });
});
```

## Mocking

**Framework:** Vitest built-in (`vi` from `vitest`)

**Current usage:** Mocking is minimal. The `vi` import appears in `src/__tests__/commands/doctor.test.ts` and `src/__tests__/utils/unity.test.ts` but is not actively used in most tests.

**Preferred approach: Dependency injection over mocking.**
Instead of mocking `os.platform()`, functions accept platform as a parameter with a default:

```typescript
// Source code pattern - testable without mocks
export function getMcpRelayPath(
  platform: NodeJS.Platform = getPlatform(),
  homeDir: string = getHomeDir(),
  localAppData: string = process.env.LOCALAPPDATA || ''
): string {

// Test code - pass platform directly, no mock needed
it('returns correct path on Mac', () => {
  const result = getMcpRelayPath('darwin', '/Users/testuser', '');
  expect(result).toBe('/Users/testuser/Library/Application Support/CodeMaestro/UnityMcpRelay/launch.sh');
});
```

**What to Mock:**
- Nothing is currently mocked. Prefer DI-style parameter overrides.
- If mocking becomes needed, use `vi.mock()` for module-level mocks.

**What NOT to Mock:**
- Filesystem operations -- use real temp directories instead (see Fixtures section)
- Platform detection -- use parameter injection instead
- Pure functions -- test with real inputs

## Fixtures and Factories

**Test Data:**
Tests create real temporary directories and files rather than using fixtures or factories.

```typescript
// Create minimal Unity project structure for testing
fs.mkdirSync(path.join(testDir, 'Assets'));
fs.mkdirSync(path.join(testDir, 'Packages'), { recursive: true });
fs.writeFileSync(
  path.join(testDir, 'Packages', 'manifest.json'),
  JSON.stringify({ dependencies: {} })
);
```

```typescript
// Create manifest.json with specific content
const manifestPath = path.join(testDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({
  dependencies: {
    'com.unity.inputsystem': '1.14.0',
    'com.unity.textmeshpro': '3.0.0'
  }
}));
```

**Location:**
- No shared fixtures directory. Each test file creates its own test data inline.
- Temp directories use prefix pattern: `gamekit-{feature}-test-` for identification in `/tmp`

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**Configuration (from `vitest.config.ts`):**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  exclude: ['node_modules', 'dist', 'src/__tests__'],
}
```

**View Coverage:**
```bash
npx vitest run --coverage    # Generates text + HTML reports
```

## Test Types

**Unit Tests:**
- All tests are unit tests targeting individual exported functions
- Tests exercise pure logic (version parsing, path construction, validation)
- Tests exercise filesystem operations using real temp directories
- Tests verify interface/type contracts by constructing typed objects

**Integration Tests:**
- Not used. No integration or end-to-end test infrastructure.

**E2E Tests:**
- Not used. The CLI is tested at the function level, not by invoking the binary.

## Common Patterns

**Pure Function Testing:**
```typescript
it('parses Unity 6 version correctly', () => {
  const result = parseUnityVersion('6000.1.12f1');
  expect(result).toEqual({ major: 6000, minor: 1, patch: 12, type: 'f', build: 1 });
});
```

**Boolean Function Testing (exhaustive cases):**
```typescript
describe('isWindows', () => {
  it('returns true for win32', () => {
    expect(isWindows('win32')).toBe(true);
  });
  it('returns false for darwin', () => {
    expect(isWindows('darwin')).toBe(false);
  });
  it('returns false for linux', () => {
    expect(isWindows('linux')).toBe(false);
  });
});
```

**Filesystem Side-Effect Testing:**
```typescript
it('creates .mcp.json file in project directory', () => {
  generateMcpConfig(testDir, 'darwin', '/Users/test');

  const mcpPath = path.join(testDir, '.mcp.json');
  expect(fs.existsSync(mcpPath)).toBe(true);
});
```

**Error/Throw Testing:**
```typescript
it('throws on unsupported platform', () => {
  expect(() => getMcpRelayPath('linux', '/home/user', '')).toThrow('Unsupported platform');
});
```

**Validation Testing (boundary/negative cases):**
```typescript
it('should reject path traversal attempts', () => {
  expect(isValidProjectName('../etc/passwd')).toBe(false);
  expect(isValidProjectName('..\\windows\\system32')).toBe(false);
  expect(isValidProjectName('/root')).toBe(false);
  expect(isValidProjectName('game/../other')).toBe(false);
});
```

**Content Verification Testing:**
```typescript
it('should create valid C# script content', () => {
  createEditorScripts(testDir);

  const scriptPath = path.join(testDir, 'Assets', '_Game', 'Scripts', 'Editor', 'ScreenshotCapture.cs');
  const content = fs.readFileSync(scriptPath, 'utf-8');

  expect(content).toContain('using UnityEngine;');
  expect(content).toContain('public static class ScreenshotCapture');
});
```

## Adding New Tests

**For a new utility module `src/utils/foo.ts`:**
1. Create `src/__tests__/utils/foo.test.ts`
2. Import test functions: `import { describe, it, expect, beforeEach, afterEach } from 'vitest';`
3. Import the functions to test: `import { myFunction } from '../../utils/foo.js';`
4. If filesystem is involved, use temp directory pattern with `beforeEach`/`afterEach`
5. If platform-dependent, use parameter injection (not mocks)

**For a new command `src/commands/bar.ts`:**
1. Create `src/__tests__/commands/bar.test.ts`
2. Export pure/testable helper functions from the command module
3. Test those helpers directly (do not test the full interactive command flow)

## Untested Areas

- `src/commands/init.ts` interactive flows (only `isValidProjectName` is tested)
- `src/commands/doctor.ts` `runDoctor()` orchestration (only `checkUnityInstalled` result structure is tested)
- `src/utils/updater.ts` background update process (`checkForUpdatesInBackground`)
- `src/utils/template.ts` `downloadTemplate()` and `ensureTemplate()` (network-dependent)
- `src/utils/mcp.ts` `waitForMcpRelay()` (time-dependent polling)
- `src/utils/unity.ts` `createUnityProject()` and `openUnityProject()` (requires Unity binary)
- `src/index.ts` CLI entry point / command routing

---

*Testing analysis: 2026-02-09*
