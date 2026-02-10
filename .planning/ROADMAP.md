# Roadmap: GameKit CLI — Strip MCP, Native Unity Integration

## Overview

This roadmap transforms gamekit from an MCP relay wrapper into a standalone Unity development tool. The journey starts by replacing MCP infrastructure with a native HTTP bridge between the CLI and a Unity Editor plugin, then builds out the operations Claude needs most (compile, console, play mode), adds visual feedback (screenshots), enables scene understanding and manipulation, and finishes with project-level operations and asset management. When complete, gamekit is the single interface between Claude Code and Unity -- no third-party dependencies.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Replace MCP with HTTP bridge infrastructure and establish CLI conventions
- [x] **Phase 2: Core Feedback Loop** - Compilation, console logs, and play mode control
- [x] **Phase 3: Visual Feedback** - Screenshot capture from Game view, Scene view, and specific cameras
- [x] **Phase 4: Scene Inspection** - Read-only scene understanding (hierarchy, components, properties)
- [x] **Phase 5: Scene Authoring** - Create, modify, and delete GameObjects and components
- [ ] **Phase 6: Project Context & Build** - Project queries, build automation, and test runner
- [ ] **Phase 7: Asset Management** - Prefabs, materials, and animation state queries

## Phase Details

### Phase 1: Foundation
**Goal**: Claude can connect to a running Unity Editor through gamekit with zero manual configuration -- MCP is gone, the HTTP bridge works, and the CLI output is clean and consistent
**Depends on**: Nothing (first phase)
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, CONN-07, CLI-01, CLI-02, CLI-03, CLI-04, CLI-05
**Success Criteria** (what must be TRUE):
  1. Running `gamekit doctor` in a project with Unity open reports a healthy connection to the Unity plugin (no MCP checks remain)
  2. Running `gamekit init` on a new project installs the Unity Editor plugin into Assets/Editor -- no .mcp.json, no MCP package in manifest
  3. The Unity plugin starts automatically when Unity opens the project, survives script recompilation, and writes a discoverable port file
  4. All gamekit commands output clean JSON to stdout and human-readable output to stderr in TTY mode, with consistent error formatting
  5. When Unity is not running or the plugin is unresponsive, gamekit commands fail with a clear error message and non-zero exit code
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Build Unity Editor plugin (C# HTTP server, main thread dispatch, domain reload survival, port management)
- [x] 01-02-PLAN.md — Build CLI connection layer (discovery, health check, bridge client, output formatting)
- [x] 01-03-PLAN.md — Strip MCP code and update init/doctor commands

### Phase 2: Core Feedback Loop
**Goal**: Claude can write code, trigger compilation, read errors, enter play mode, and read runtime logs -- the primary development loop works end-to-end through gamekit
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, LOG-01, LOG-02, LOG-03, LOG-04, LOG-05, PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. Running `gamekit refresh` after editing a C# file triggers recompilation and returns structured errors (file, line, column, message) -- CLI exits non-zero when compilation fails
  2. Running `gamekit console` returns buffered Unity logs filterable by severity (--errors, --warnings, --info), with timestamps and edit/play mode tags
  3. Running `gamekit console --follow` streams logs in real-time as they appear in Unity
  4. Running `gamekit play start` enters play mode, `gamekit play stop` exits it, and `gamekit play status` reports current state
  5. Runtime exceptions during play mode are captured with full stack traces and accessible via `gamekit console`
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Refresh/compile handler and CLI command (CompilationService, RefreshHandler, gamekit refresh)
- [x] 02-02-PLAN.md — Console log buffer, filtering, and SSE streaming (LogService, ConsoleHandler, gamekit console --follow)
- [x] 02-03-PLAN.md — Play mode control (PlayHandler, gamekit play start/stop/status)

### Phase 3: Visual Feedback
**Goal**: Claude can see what the game looks like by capturing screenshots from the Unity Editor
**Depends on**: Phase 1
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. Running `gamekit screenshot` captures the Game view as a PNG file and returns the file path
  2. Running `gamekit screenshot --scene` captures the Scene view as a PNG file
  3. Running `gamekit screenshot --camera <name>` captures from a specific camera in the scene
  4. Screenshots can be piped to stdout as binary for direct consumption by tools
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — Screenshot capture (ScreenshotService, ScreenshotHandler, CLI command with Game/Scene/camera/binary modes)

### Phase 4: Scene Inspection
**Goal**: Claude can understand what exists in a Unity scene -- the full hierarchy, every component, and all serialized property values
**Depends on**: Phase 1
**Requirements**: SINSP-01, SINSP-02, SINSP-03, SINSP-04, SINSP-05
**Success Criteria** (what must be TRUE):
  1. Running `gamekit scene list` returns all scenes in the project with their paths
  2. Running `gamekit scene open <name>` opens a scene by name or path in the Editor
  3. Running `gamekit hierarchy` returns the full scene hierarchy as a JSON tree showing parent/child relationships
  4. Running `gamekit inspect <path>` returns all components on a GameObject with their serialized property values
  5. Hierarchy and inspect commands support filtering by name or component type
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Scene listing, scene opening, and hierarchy query (SceneService, SceneHandler, HierarchyHandler + CLI)
- [x] 04-02-PLAN.md — GameObject inspection and property serialization with filtering (PropertySerializer, InspectHandler + CLI)

### Phase 5: Scene Authoring
**Goal**: Claude can build and modify Unity scenes programmatically -- creating GameObjects, adding components, setting properties, all undoable
**Depends on**: Phase 4
**Requirements**: SAUTH-01, SAUTH-02, SAUTH-03, SAUTH-04, SAUTH-05, SAUTH-06, SAUTH-07, SAUTH-08
**Success Criteria** (what must be TRUE):
  1. Running `gamekit create <name>` creates a new GameObject in the scene, optionally under a parent with --parent
  2. Running `gamekit add-component <path> <type>` adds a component and `gamekit destroy <path>` removes a GameObject
  3. Running `gamekit set <path> <component> <property> <value>` sets properties on components, supporting Vector3, Color, bool, int, float, string, enum, and object references
  4. Running `gamekit transform <path>` sets position, rotation, and scale on a GameObject
  5. All scene write operations are undoable via Ctrl+Z in Unity
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Create/destroy GameObjects, transform manipulation, AuthoringService + TypeResolver
- [x] 05-02-PLAN.md — Add components, set properties with PropertyDeserializer, complete scene authoring CLI

### Phase 6: Project Context & Build
**Goal**: Claude can query project structure, read settings, trigger builds, and run tests without leaving the CLI
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, PROJ-08
**Success Criteria** (what must be TRUE):
  1. Running `gamekit list scripts`, `gamekit list scenes`, or `gamekit list prefabs` returns the corresponding project assets
  2. Running `gamekit settings` returns project settings (layers, tags, physics, quality, input)
  3. Running `gamekit build --platform <target>` triggers a build and returns success/failure with a build report (size, warnings, errors)
  4. Running `gamekit test` runs Unity Test Framework tests and returns structured results (passed, failed, skipped, error messages)
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md -- Project asset listing (scripts, scenes, prefabs) and settings query (layers, tags, physics, quality, input)
- [ ] 06-02-PLAN.md -- Build trigger with BuildPipeline.BuildPlayer and structured build report
- [ ] 06-03-PLAN.md -- Test runner integration with TestRunnerApi callbacks and polling

### Phase 7: Asset Management
**Goal**: Claude can create and manage Unity assets -- prefabs, materials, and animation queries -- completing the full game development toolkit
**Depends on**: Phase 1, Phase 4
**Requirements**: ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05, ASSET-06, ASSET-07
**Success Criteria** (what must be TRUE):
  1. Running `gamekit prefab create <path>` creates a prefab from a scene GameObject and `gamekit prefab instantiate <path>` places a prefab into the scene
  2. Running `gamekit material create`, `gamekit material set`, and `gamekit material assign` creates materials, sets their properties, and assigns them to renderers
  3. Running `gamekit animator list <path>` returns Animator controller states, parameters, and transitions
  4. Prefab operations support variants and overrides
**Plans**: TBD

Plans:
- [ ] 07-01: Implement prefab create, instantiate, and variant support
- [ ] 07-02: Implement material creation, property setting, and assignment
- [ ] 07-03: Implement animator state query

## Progress

**Execution Order:**
Phases execute in numeric order. Phases 2, 3, 4, 6 depend only on Phase 1 and could theoretically parallelize, but sequential execution is recommended.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-02-10 |
| 2. Core Feedback Loop | 3/3 | Complete | 2026-02-10 |
| 3. Visual Feedback | 1/1 | Complete | 2026-02-10 |
| 4. Scene Inspection | 2/2 | Complete | 2026-02-10 |
| 5. Scene Authoring | 2/2 | Complete | 2026-02-10 |
| 6. Project Context & Build | 0/3 | Not started | - |
| 7. Asset Management | 0/3 | Not started | - |
