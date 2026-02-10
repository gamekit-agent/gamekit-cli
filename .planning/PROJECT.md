# GameKit CLI — Strip MCP, Native Unity Integration

## What This Is

GameKit is a CLI tool that sets up Unity projects for AI-assisted game development with Claude Code. Currently it relies on a third-party MCP relay (CodeMaestro) to bridge Claude and Unity. This milestone replaces that dependency entirely — gamekit becomes the single interface between Claude Code and the Unity Editor, with its own lightweight Unity plugin and a full set of CLI commands covering the game development loop.

The end goal: gamekit is THE go-to tool for Unity developers who want to vibe code games with Claude Code.

## Core Value

Claude can write code, see the result, fix errors, and iterate on a Unity game through gamekit alone — no MCP server, no third-party relay, no extra dependencies.

## Requirements

### Validated

- ✓ Project scaffolding (`gamekit init`) — creates new Unity projects with Claude Code configuration — existing
- ✓ Diagnostic checks (`gamekit doctor`) — verifies environment setup — existing
- ✓ Template system — copies `.claude/` config (commands, skills, agents) into projects — existing
- ✓ Auto-updater — self-updating binary via GitHub releases — existing
- ✓ Cross-platform support — macOS + Windows binaries — existing

### Active

- [ ] Strip all MCP relay code — remove `.mcp.json` generation, manifest injection for MCP package, relay polling
- [ ] Unity Editor plugin (C# HTTP server) — lightweight Editor script that runs an HTTP server inside Unity, lives in this repo's template
- [ ] `gamekit refresh` — tell Unity to reimport/recompile after Claude edits files, return compilation errors
- [ ] `gamekit screenshot` — capture Game view and/or Scene view from the running editor
- [ ] `gamekit console` — read Unity console logs, warnings, and errors
- [ ] `gamekit scene` — list scenes, open scenes, query hierarchy, create/modify/delete GameObjects, attach components, set properties
- [ ] `gamekit play` — enter/exit play mode, read runtime logs and errors
- [ ] `gamekit build` — trigger a build for a target platform, return build result
- [ ] `gamekit project` — query project state (list scripts, scenes, prefabs, project settings, layers, tags)
- [ ] `gamekit asset` — import assets, create materials, manage prefabs, set up animations
- [ ] Connection management — auto-discover running Unity instance on localhost, health check, reconnect
- [ ] Update `gamekit doctor` — replace MCP checks with Unity plugin connection checks
- [ ] Update `gamekit init` — install Unity plugin instead of MCP package, skip `.mcp.json` generation

### Out of Scope

- MCP compatibility mode — clean break, no fallback to old MCP relay
- Unity Cloud Build integration — local builds only for v1
- Multi-editor support — one Unity instance per project at a time
- Mobile device preview — editor-only for v1
- Asset Store integration — not needed for core game dev loop

## Context

- The existing codebase is a TypeScript CLI built with Commander.js, compiled to standalone binaries via Bun
- Template system already copies Editor scripts into projects (`src/utils/assets.ts` creates C# files)
- The CLI already knows how to find Unity installations and spawn Unity processes (`src/utils/unity.ts`)
- Transport decision: HTTP on localhost. Unity C# plugin runs `HttpListener`, gamekit CLI sends HTTP requests
- Claude writes/edits C# files directly with its native file tools; gamekit handles the Unity-specific operations (compile, screenshot, scene manipulation, play mode, etc.)
- The Unity plugin (C# Editor scripts) will live in this repo under `template/` and get copied into projects during `gamekit init`

## Constraints

- **Platform**: Must work on macOS and Windows (matching current support)
- **Unity versions**: Must support Unity 2020+ through Unity 6+ (matching current support)
- **No external dependencies**: The Unity plugin must use only Unity's built-in APIs (no NuGet packages, no third-party Unity packages)
- **Single binary**: gamekit remains a single self-contained binary — no sidecar processes
- **Editor-only**: The Unity plugin runs only in the Editor (not in builds). It's an Editor script, not a runtime component.
- **Port management**: HTTP server must handle port conflicts gracefully (configurable port, auto-discovery)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Strip MCP entirely (no fallback) | Clean break reduces complexity; MCP relay was a third-party dependency we can't control | — Pending |
| HTTP on localhost for transport | Simple, debuggable, curl-able. No binary protocols, no websocket complexity | — Pending |
| Unity plugin in this repo (template/) | Single repo, single release. Plugin ships with gamekit, no separate install step | — Pending |
| Claude writes files directly, gamekit refreshes | Avoids duplicating Claude's native file tools. gamekit focuses on Unity-specific operations | — Pending |
| Full Unity API exposure in v1 | gamekit's value prop is being THE tool for vibe coding Unity games. Partial coverage means partial value | — Pending |

---
*Last updated: 2026-02-09 after initialization*
