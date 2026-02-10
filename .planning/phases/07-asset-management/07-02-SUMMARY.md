---
phase: 07-asset-management
plan: 02
subsystem: api
tags: [material, shader, unity-editor, asset-pipeline, cli]

# Dependency graph
requires:
  - phase: 05-scene-authoring
    provides: AuthoringService pattern, GuardPlayMode, SceneService.FindGameObjectByPath
  - phase: 02-core-feedback-loop
    provides: RequestRouter route registration pattern, ApiResponse model
provides:
  - MaterialService (CreateMaterial, SetProperty, AssignMaterial) for Unity material management
  - MaterialHandler (HandleCreate, HandleSet, HandleAssign) HTTP endpoints
  - CLI `gamekit material create/set/assign` subcommands
  - Three new API routes: /api/material/create, /api/material/set, /api/material/assign
affects: [07-asset-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [asset-persistence-pattern (SetDirty+SaveAssets), shader-property-type-dispatch, color-fallback-keys]

key-files:
  created:
    - template/Editor/GameKit/Services/MaterialService.cs
    - template/Editor/GameKit/Handlers/MaterialHandler.cs
    - src/commands/material.ts
  modified:
    - template/Editor/GameKit/RequestRouter.cs
    - src/index.ts

key-decisions:
  - "Color fallback keys: Unity SetProperty reads value['r'] first, falls back to value['x'] so CLI can send x/y/z/w for all vector types"
  - "Asset persistence via EditorUtility.SetDirty + AssetDatabase.SaveAssets (not Undo) for material property changes"
  - "renderer.sharedMaterial for editor-safe assignment (not .material which creates runtime copies)"

patterns-established:
  - "Asset persistence pattern: EditorUtility.SetDirty(asset) + AssetDatabase.SaveAssets() for persistent asset modifications"
  - "Shader property type dispatch: switch on ShaderPropertyType for Color/Float/Range/Vector/Int/Texture"
  - "CreateFolderRecursive helper using AssetDatabase.CreateFolder for asset-pipeline-safe directory creation"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 7 Plan 2: Material Management Summary

**MaterialService with create/set/assign operations, shader property type dispatch, and CLI `gamekit material` command with value parsing for colors and vectors**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T22:35:47Z
- **Completed:** 2026-02-10T22:39:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Full material creation pipeline: CLI -> HTTP -> MaterialService -> AssetDatabase.CreateAsset
- Shader property setting with type validation (FindPropertyIndex) and type dispatch for 6 property types
- Material assignment to scene object Renderers with undo support and sharedMaterial safety
- Value parser handles comma-separated RGBA/vectors, JSON objects, booleans, numbers, and strings

## Task Commits

Each task was committed atomically:

1. **Task 1: MaterialService and MaterialHandler (Unity side)** - `d908285` (feat)
2. **Task 2: CLI material command with create/set/assign subcommands** - `d96f8e0` (feat)

## Files Created/Modified
- `template/Editor/GameKit/Services/MaterialService.cs` - Static service: CreateMaterial, SetProperty, AssignMaterial, plus helpers (CreateFolderRecursive, ListShaderProperties, SetPropertyByType, ReadPropertyByType)
- `template/Editor/GameKit/Handlers/MaterialHandler.cs` - HTTP handlers: HandleCreate, HandleSet, HandleAssign with error code mapping
- `template/Editor/GameKit/RequestRouter.cs` - Three new routes: POST /api/material/create, /set, /assign
- `src/commands/material.ts` - CLI command with create/set/assign subcommands, parseValue for colors/vectors
- `src/index.ts` - Import and register material command

## Decisions Made
- Color fallback keys in Unity: SetPropertyByType for Color reads `value["r"]` first, falls back to `value["x"]` so the CLI can use the same x/y/z/w key scheme for all comma-separated 4-component values. This avoids the CLI needing to know the shader property type.
- Reused parseValue pattern from set.ts (copy, not shared utility) to keep material.ts self-contained. The set command's parseValue uses x/y/z/w keys which works for both Color and Vector types via the fallback mechanism.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

RequestRouter.cs had already been modified by parallel plan execution (07-01 added prefab and animator routes). Material routes were appended after the existing routes without conflict.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Material operations complete and ready for use
- All three Phase 7 plans (prefab, material, animator) are independent and can complete in any order
- Phase 7 completion depends on all three summaries existing

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 07-asset-management*
*Completed: 2026-02-10*
