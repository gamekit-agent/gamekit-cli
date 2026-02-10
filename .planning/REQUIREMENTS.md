# Requirements: GameKit CLI — Strip MCP, Native Unity Integration

**Defined:** 2026-02-09
**Core Value:** Claude can write code, see the result, fix errors, and iterate on a Unity game through gamekit alone — no MCP server, no third-party relay, no extra dependencies.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### MCP Removal

- [ ] **MCP-01**: All MCP relay code removed from CLI (mcp.ts, .mcp.json generation, relay polling)
- [ ] **MCP-02**: MCP Unity package injection removed from manifest.ts (no more com.codemaestroai.advancedunitymcp)
- [ ] **MCP-03**: Doctor command updated to check Unity plugin connection instead of MCP relay
- [ ] **MCP-04**: Init command updated to install gamekit Unity plugin instead of MCP package

### Connection & Infrastructure

- [ ] **CONN-01**: Unity Editor plugin runs an HTTP server (HttpListener) on localhost with configurable port
- [ ] **CONN-02**: Plugin writes port and PID to `.gamekit/server.json` in project root for CLI discovery
- [ ] **CONN-03**: CLI auto-discovers running Unity instance by reading port file (no manual config)
- [ ] **CONN-04**: Health check endpoint returns editor state (idle, compiling, playing, paused)
- [ ] **CONN-05**: Plugin survives domain reload (restarts via [InitializeOnLoad] + AssemblyReloadEvents)
- [ ] **CONN-06**: Plugin dispatches all Unity API calls to main thread via EditorApplication.update queue
- [ ] **CONN-07**: CLI reports clear error when Unity is not running or plugin is not responding

### Compile & Refresh

- [ ] **COMP-01**: `gamekit refresh` triggers AssetDatabase.Refresh() and waits for compilation to complete
- [ ] **COMP-02**: Compilation errors returned as structured JSON (file, line, column, message, severity)
- [ ] **COMP-03**: CLI exits with non-zero code when compilation has errors

### Console & Logs

- [ ] **LOG-01**: `gamekit console` reads buffered Unity console logs (errors, warnings, info)
- [ ] **LOG-02**: Console output filterable by severity (--errors, --warnings, --info)
- [ ] **LOG-03**: Runtime exceptions during play mode captured with full stack traces
- [ ] **LOG-04**: Logs tagged with mode (edit/play) and timestamp
- [ ] **LOG-05**: `gamekit console --follow` streams logs in real-time (SSE or chunked transfer)

### Visual Feedback

- [ ] **VIS-01**: `gamekit screenshot` captures Game view as PNG
- [ ] **VIS-02**: `gamekit screenshot --scene` captures Scene view as PNG
- [ ] **VIS-03**: `gamekit screenshot --camera <name>` captures from a specific camera
- [ ] **VIS-04**: Screenshots returned as file path or piped to stdout as binary

### Play Mode

- [ ] **PLAY-01**: `gamekit play start` enters play mode
- [ ] **PLAY-02**: `gamekit play stop` exits play mode
- [ ] **PLAY-03**: `gamekit play status` returns current play mode state
- [ ] **PLAY-04**: Runtime logs accessible during play mode via console commands

### Scene Inspection

- [x] **SINSP-01**: `gamekit scene list` lists all scenes in the project
- [x] **SINSP-02**: `gamekit scene open <name>` opens a scene by name or path
- [x] **SINSP-03**: `gamekit hierarchy` returns full scene hierarchy as JSON tree (GameObjects + parent/child)
- [x] **SINSP-04**: `gamekit inspect <path>` returns all components and their serialized properties on a GameObject
- [x] **SINSP-05**: Hierarchy and inspect support filtering by name or component type

### Scene Authoring

- [ ] **SAUTH-01**: `gamekit create <name>` creates a new empty GameObject in the scene
- [ ] **SAUTH-02**: `gamekit create <name> --parent <path>` creates GameObject under a specific parent
- [ ] **SAUTH-03**: `gamekit add-component <path> <type>` adds a component to a GameObject
- [ ] **SAUTH-04**: `gamekit set <path> <component> <property> <value>` sets a serialized property on a component
- [ ] **SAUTH-05**: `gamekit destroy <path>` removes a GameObject from the scene
- [ ] **SAUTH-06**: `gamekit transform <path> --position x,y,z --rotation x,y,z --scale x,y,z` sets transform
- [ ] **SAUTH-07**: All scene write operations go through Unity's Undo system (Ctrl+Z reverts)
- [ ] **SAUTH-08**: Property setting supports core Unity types (Vector3, Color, bool, int, float, string, enum, object references)

### Project Context

- [ ] **PROJ-01**: `gamekit list scripts` lists all C# scripts in the project
- [ ] **PROJ-02**: `gamekit list scenes` lists all scenes with build index
- [ ] **PROJ-03**: `gamekit list prefabs` lists all prefabs in the project
- [ ] **PROJ-04**: `gamekit settings` reads project settings (layers, tags, physics, quality, input)
- [ ] **PROJ-05**: `gamekit build --platform <target>` triggers a build and returns success/failure with errors
- [ ] **PROJ-06**: `gamekit build` returns build report (size, warnings, errors)
- [ ] **PROJ-07**: `gamekit test` runs Unity Test Framework tests (EditMode + PlayMode)
- [ ] **PROJ-08**: Test results returned as structured JSON (passed, failed, skipped, error messages)

### Asset Management

- [ ] **ASSET-01**: `gamekit prefab create <path>` creates a prefab from a scene GameObject
- [ ] **ASSET-02**: `gamekit prefab instantiate <path>` instantiates a prefab into the scene
- [ ] **ASSET-03**: `gamekit material create <name> --shader <shader>` creates a material
- [ ] **ASSET-04**: `gamekit material set <name> <property> <value>` sets material properties
- [ ] **ASSET-05**: `gamekit material assign <material> <gameobject>` assigns material to a renderer
- [ ] **ASSET-06**: `gamekit animator list <path>` lists Animator controller states, parameters, transitions
- [ ] **ASSET-07**: Prefab operations support variants and overrides

### CLI Quality

- [ ] **CLI-01**: All commands output clean JSON to stdout (machine-readable)
- [ ] **CLI-02**: Human-readable format to stderr when running in TTY
- [ ] **CLI-03**: All commands support `--json` flag for explicit JSON output
- [ ] **CLI-04**: Consistent error format across all commands (exit codes, error messages)
- [ ] **CLI-05**: `gamekit doctor` validates Unity plugin connection, port file, editor state

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Scene Authoring

- **SAUTH-10**: Multi-command batching (send array of operations in single request, single undo group)
- **SAUTH-11**: Scene creation (new empty scene)

### Advanced Assets

- **ASSET-10**: Animation controller creation/modification
- **ASSET-11**: Physics material creation
- **ASSET-12**: Scriptable object creation and editing

### Advanced Project

- **PROJ-10**: Project settings modification (add layers, tags)
- **PROJ-11**: Package manager integration (add/remove Unity packages)

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP backward compatibility | Clean break — the whole point is replacing MCP |
| Live viewport streaming | Enormous bandwidth, destroys context windows. On-demand screenshots are sufficient. |
| Visual scripting generation | Binary/YAML blobs, extremely hard to generate correctly. Claude writes C# better. |
| Asset creation (3D models, textures) | Claude cannot create binary assets. Different AI capability entirely. |
| Runtime object manipulation in Play mode | Changes lost on exit Play mode (Unity's design). Confuses AI agents. Edit mode only for writes. |
| Multi-editor orchestration | Edge case. One Unity instance per project. |
| Shader code generation via gamekit | Claude writes .shader files directly. gamekit refresh compiles them. |
| Mobile device preview | Editor-only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCP-01 | Phase 1 | Pending |
| MCP-02 | Phase 1 | Pending |
| MCP-03 | Phase 1 | Pending |
| MCP-04 | Phase 1 | Pending |
| CONN-01 | Phase 1 | Pending |
| CONN-02 | Phase 1 | Pending |
| CONN-03 | Phase 1 | Pending |
| CONN-04 | Phase 1 | Pending |
| CONN-05 | Phase 1 | Pending |
| CONN-06 | Phase 1 | Pending |
| CONN-07 | Phase 1 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| LOG-01 | Phase 2 | Pending |
| LOG-02 | Phase 2 | Pending |
| LOG-03 | Phase 2 | Pending |
| LOG-04 | Phase 2 | Pending |
| LOG-05 | Phase 2 | Pending |
| PLAY-01 | Phase 2 | Pending |
| PLAY-02 | Phase 2 | Pending |
| PLAY-03 | Phase 2 | Pending |
| PLAY-04 | Phase 2 | Pending |
| VIS-01 | Phase 3 | Pending |
| VIS-02 | Phase 3 | Pending |
| VIS-03 | Phase 3 | Pending |
| VIS-04 | Phase 3 | Pending |
| SINSP-01 | Phase 4 | Pending |
| SINSP-02 | Phase 4 | Pending |
| SINSP-03 | Phase 4 | Pending |
| SINSP-04 | Phase 4 | Pending |
| SINSP-05 | Phase 4 | Pending |
| SAUTH-01 | Phase 5 | Pending |
| SAUTH-02 | Phase 5 | Pending |
| SAUTH-03 | Phase 5 | Pending |
| SAUTH-04 | Phase 5 | Pending |
| SAUTH-05 | Phase 5 | Pending |
| SAUTH-06 | Phase 5 | Pending |
| SAUTH-07 | Phase 5 | Pending |
| SAUTH-08 | Phase 5 | Pending |
| PROJ-01 | Phase 6 | Pending |
| PROJ-02 | Phase 6 | Pending |
| PROJ-03 | Phase 6 | Pending |
| PROJ-04 | Phase 6 | Pending |
| PROJ-05 | Phase 6 | Pending |
| PROJ-06 | Phase 6 | Pending |
| PROJ-07 | Phase 6 | Pending |
| PROJ-08 | Phase 6 | Pending |
| ASSET-01 | Phase 7 | Pending |
| ASSET-02 | Phase 7 | Pending |
| ASSET-03 | Phase 7 | Pending |
| ASSET-04 | Phase 7 | Pending |
| ASSET-05 | Phase 7 | Pending |
| ASSET-06 | Phase 7 | Pending |
| ASSET-07 | Phase 7 | Pending |
| CLI-01 | Phase 1 | Pending |
| CLI-02 | Phase 1 | Pending |
| CLI-03 | Phase 1 | Pending |
| CLI-04 | Phase 1 | Pending |
| CLI-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after roadmap creation*
