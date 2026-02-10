# Phase 4: Scene Inspection - Research

**Researched:** 2026-02-10
**Domain:** Unity Editor scripting -- scene management, hierarchy traversal, SerializedProperty introspection
**Confidence:** HIGH

## Summary

Phase 4 adds read-only scene understanding to gamekit: listing scenes, opening scenes, querying the hierarchy tree, and inspecting GameObject components with their serialized property values. All five requirements (SINSP-01 through SINSP-05) are achievable using well-documented Unity Editor APIs that have been stable for years.

The Unity side needs three new handlers (SceneHandler, HierarchyHandler, InspectHandler) backed by two new services (SceneService, HierarchyService). The CLI side needs three new command files (`scene.ts`, `hierarchy.ts`, `inspect.ts`) registered in `index.ts`. The implementation follows the exact same patterns established in Phases 1-3: static handler classes returning `ApiResponse`, static service classes with `[InitializeOnLoadMethod]` where state is needed, function-based command registration with Commander, and the `request<T>()` bridge for HTTP communication.

The hardest part of this phase is **SerializedProperty value serialization** -- reading every property type and converting it to a JSON-safe representation. There are 29 distinct `SerializedPropertyType` values, and each requires a different accessor (e.g., `intValue`, `floatValue`, `vector3Value`, `objectReferenceValue`). A robust switch/case over `propertyType` is essential. The hierarchy traversal is straightforward recursive descent over `Transform.GetChild()`.

**Primary recommendation:** Follow the established handler/service/command pattern exactly. The only novel code is the `SerializedPropertyType` switch for value extraction -- build this as a dedicated `PropertySerializer` utility in the Unity plugin. Everything else is mechanical.

## Standard Stack

### Core (already in project -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Commander.js | ^12.1.0 | CLI command registration | Already used for play, screenshot, etc. |
| Newtonsoft.Json | (Unity built-in) | JSON serialization in Unity plugin | Already used in all handlers |
| fetch (Bun built-in) | N/A | HTTP client in CLI | Already used via `bridge.ts` |

### Unity Editor APIs Used

| API | Namespace | Purpose | Stability |
|-----|-----------|---------|-----------|
| `AssetDatabase.FindAssets("t:Scene")` | UnityEditor | Find all .unity scene files in project | Stable, years-old API |
| `AssetDatabase.GUIDToAssetPath()` | UnityEditor | Convert GUID to asset path | Stable |
| `EditorBuildSettings.scenes` | UnityEditor | Get scenes in build settings | Stable |
| `EditorSceneManager.OpenScene()` | UnityEditor.SceneManagement | Open a scene by path | Stable |
| `EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()` | UnityEditor.SceneManagement | Prompt save before scene switch | Stable |
| `SceneManager.GetActiveScene()` | UnityEngine.SceneManagement | Get currently active scene | Stable |
| `Scene.GetRootGameObjects()` | UnityEngine.SceneManagement | Get root-level GameObjects | Stable |
| `Transform.childCount` / `Transform.GetChild()` | UnityEngine | Traverse hierarchy tree | Stable |
| `GameObject.GetComponents<Component>()` | UnityEngine | List all components on a GameObject | Stable |
| `SerializedObject` / `SerializedProperty` | UnityEditor | Read serialized property values | Stable |
| `SerializedObject.GetIterator()` | UnityEditor | Iterate all properties on a component | Stable |
| `GameObject.Find()` | UnityEngine | Find GameObject by path (slash notation) | Stable |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `AssetDatabase.FindAssets("t:Scene")` | Directory scan for .unity files | FindAssets respects Unity's asset database, handles packages correctly |
| `SerializedObject` iteration | Reflection over component fields | SerializedObject is the canonical way; reflection misses Unity's serialization rules |
| `GameObject.Find()` for path lookup | Manual recursive search | Find() already supports slash-delimited paths natively |
| Newtonsoft.Json for serialization | JsonUtility (Unity built-in) | Newtonsoft already used in project, supports anonymous objects; JsonUtility does not |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure (new files only)

```
template/Editor/GameKit/
├── Handlers/
│   ├── SceneHandler.cs          # NEW: /api/scene/list, /api/scene/open
│   ├── HierarchyHandler.cs      # NEW: /api/hierarchy
│   └── InspectHandler.cs        # NEW: /api/inspect
├── Services/
│   └── SceneService.cs          # NEW: scene listing, opening, hierarchy, inspection
└── Utils/
    └── PropertySerializer.cs    # NEW: SerializedProperty -> JSON value extraction

src/
├── commands/
│   ├── scene.ts                 # NEW: gamekit scene list, gamekit scene open
│   ├── hierarchy.ts             # NEW: gamekit hierarchy
│   └── inspect.ts               # NEW: gamekit inspect <path>
```

### Pattern 1: Handler/Service Split (Established)

**What:** Handlers parse HTTP requests and delegate to services; services contain Unity API logic.
**When to use:** Every new endpoint.
**Example (from existing RefreshHandler):**
```csharp
// Handler: thin HTTP adapter
public static ApiResponse Handle(HttpListenerRequest request)
{
    var result = SomeService.DoWork(params);
    return ApiResponse.Success(result);
}
```

### Pattern 2: Function-Based Command Registration (Established)

**What:** Each CLI command group exports a `registerXCommand(program)` function that creates subcommands.
**When to use:** Commands with subcommands (like `scene list`, `scene open`).
**Example (from existing play.ts):**
```typescript
export function registerSceneCommand(program: Command): void {
  const scene = program.command('scene').description('Manage Unity scenes');
  scene.command('list').description('List all scenes in the project').action(async () => { ... });
  scene.command('open <name>').description('Open a scene').action(async (name) => { ... });
}
```

### Pattern 3: Recursive Hierarchy Traversal

**What:** Depth-first traversal of Transform tree to build JSON hierarchy.
**When to use:** `gamekit hierarchy` command.
**Example:**
```csharp
// Source: Unity docs - Transform.GetChild, Scene.GetRootGameObjects
private static object BuildNode(Transform t)
{
    var children = new List<object>();
    for (int i = 0; i < t.childCount; i++)
        children.Add(BuildNode(t.GetChild(i)));

    return new {
        name = t.gameObject.name,
        path = GetHierarchyPath(t),
        activeSelf = t.gameObject.activeSelf,
        childCount = t.childCount,
        children
    };
}
```

### Pattern 4: SerializedProperty Value Switch

**What:** Map each `SerializedPropertyType` to the correct value accessor.
**When to use:** `gamekit inspect` -- reading all property values from components.
**Example:**
```csharp
// Source: Unity docs - SerializedPropertyType, SerializedProperty
private static object ReadValue(SerializedProperty prop)
{
    switch (prop.propertyType)
    {
        case SerializedPropertyType.Integer: return prop.intValue;
        case SerializedPropertyType.Boolean: return prop.boolValue;
        case SerializedPropertyType.Float: return prop.floatValue;
        case SerializedPropertyType.String: return prop.stringValue;
        case SerializedPropertyType.Enum: return prop.enumNames[prop.enumValueIndex];
        case SerializedPropertyType.Color:
            var c = prop.colorValue;
            return new { r = c.r, g = c.g, b = c.b, a = c.a };
        case SerializedPropertyType.Vector2:
            var v2 = prop.vector2Value;
            return new { x = v2.x, y = v2.y };
        case SerializedPropertyType.Vector3:
            var v3 = prop.vector3Value;
            return new { x = v3.x, y = v3.y, z = v3.z };
        case SerializedPropertyType.ObjectReference:
            var obj = prop.objectReferenceValue;
            return obj != null ? new { name = obj.name, type = obj.GetType().Name } : null;
        // ... other types
        default: return null;
    }
}
```

### Pattern 5: Query String Filtering

**What:** Use HTTP query parameters for name/component type filtering.
**When to use:** SINSP-05 -- filtering hierarchy and inspect results.
**Example:**
```csharp
// Hierarchy endpoint: GET /api/hierarchy?name=Player&component=Rigidbody
var nameFilter = request.QueryString["name"];
var componentFilter = request.QueryString["component"];
```

### Anti-Patterns to Avoid

- **Returning the entire scene hierarchy + all properties in a single response:** Scene hierarchy and property inspection should be separate endpoints. Hierarchy gives you the tree; inspect gives you details on one GameObject. Combining them creates unbounded response sizes.
- **Using `Next()` instead of `NextVisible()` for property iteration:** `Next()` includes hidden internal Unity properties (like `m_ObjectHideFlags`). Use `NextVisible()` to match what the Inspector shows, unless there is a specific reason to include hidden properties.
- **Skipping `SerializedObject.Update()` before reading:** Always call `serializedObject.Update()` to ensure the serialized data is fresh before reading property values.
- **Deep recursive property expansion without a depth limit:** Nested structs/classes can create very deep trees. Limit recursion depth (e.g., 3-4 levels) to prevent enormous responses.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all scenes in project | File system scan for .unity files | `AssetDatabase.FindAssets("t:Scene")` + `GUIDToAssetPath()` | Respects Unity's asset database, handles Packages/ correctly |
| Finding a GameObject by path | Manual recursive string-split search | `GameObject.Find("/path/to/object")` | Built-in, handles slash-delimited paths natively |
| Getting hierarchy path of a GameObject | Manual parent-walking string builder | `AnimationUtility.CalculateTransformPath()` or simple helper | Unity provides the utility; or a 5-line helper is sufficient |
| Reading serialized property values | Reflection over MonoBehaviour fields | `SerializedObject` + `SerializedProperty` iteration | SerializedObject respects Unity's serialization rules (e.g., `[SerializeField]`, `[HideInInspector]`) which reflection does not |
| Opening a scene in the editor | Direct scene file manipulation | `EditorSceneManager.OpenScene()` | Handles dirty scene prompting, proper scene lifecycle |

**Key insight:** Unity's Editor API surface is comprehensive for scene inspection. Every operation needed in this phase has a direct, stable API. The only "custom" code is the property-type-to-JSON-value mapping switch.

## Common Pitfalls

### Pitfall 1: Dirty Scene Loss on Scene Open
**What goes wrong:** Opening a new scene without saving discards unsaved changes to the current scene.
**Why it happens:** `EditorSceneManager.OpenScene()` does not prompt to save by default.
**How to avoid:** Call `EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()` before opening, OR provide a `--force` flag on the CLI and use `OpenSceneMode.Single` only when the user confirms. For a CLI tool consumed by AI, skipping the prompt with `--force` or always saving first is better since there is no interactive dialog.
**Warning signs:** Users report lost scene changes after `gamekit scene open`.

### Pitfall 2: `GameObject.Find()` Only Finds Active Objects
**What goes wrong:** Inactive GameObjects in the hierarchy are invisible to `GameObject.Find()`.
**Why it happens:** Unity's `Find()` skips inactive GameObjects by design.
**How to avoid:** For the `inspect` command, use the hierarchy path from the hierarchy response and walk the Transform tree manually instead of using `GameObject.Find()`. Alternatively, use `Transform.Find()` from a known root, which CAN find inactive children. The hierarchy traversal itself naturally includes inactive objects since it walks `Transform.GetChild()` which returns all children regardless of active state.
**Warning signs:** `gamekit inspect <path>` returns "not found" for GameObjects that appear in `gamekit hierarchy`.

### Pitfall 3: Unbounded Response Size for Large Scenes
**What goes wrong:** Scenes with thousands of GameObjects produce multi-megabyte hierarchy JSON responses.
**Why it happens:** No pagination or depth limiting.
**How to avoid:** Include a `--depth` flag on the hierarchy command to limit tree depth. Default to full depth but warn in the response if the tree exceeds a threshold (e.g., 1000 nodes). For inspect, only serialize the requested single GameObject's components, never expand recursively into child objects.
**Warning signs:** CLI hangs or times out on large open-world scenes.

### Pitfall 4: SerializedProperty Enum Index Out of Bounds
**What goes wrong:** `prop.enumValueIndex` throws when the stored enum value is invalid or the enum definition has changed.
**Why it happens:** Asset serialization can store stale enum values after code changes.
**How to avoid:** Wrap enum reading in a try-catch. Fall back to `prop.intValue` (the raw stored integer) if `enumNames[enumValueIndex]` fails.
**Warning signs:** `gamekit inspect` crashes on specific GameObjects with stale serialized data.

### Pitfall 5: Missing Script Components
**What goes wrong:** Components whose MonoScript is missing (deleted .cs file) return null from `GetComponents()`.
**Why it happens:** Unity keeps the component slot but cannot resolve the type.
**How to avoid:** Check for null components in the `GetComponents<Component>()` result. Report them in the output as `{ type: "Missing (MonoScript)", properties: null }` rather than crashing.
**Warning signs:** NullReferenceException during inspect on GameObjects with yellow warning icons in the Unity Hierarchy.

### Pitfall 6: Scene Name Ambiguity
**What goes wrong:** `gamekit scene open MyScene` fails because multiple scenes share the name "MyScene" in different folders.
**Why it happens:** Scene names are not unique; paths are.
**How to avoid:** For `scene open`, accept both names and paths. If a name matches multiple scenes, return an error listing all matches with their paths, asking the user to specify the full path.
**Warning signs:** Wrong scene opens silently.

## Code Examples

Verified patterns from Unity official documentation and established project conventions:

### Scene Listing (Unity side)
```csharp
// Source: Unity docs - AssetDatabase.FindAssets, EditorBuildSettings.scenes
public static object ListScenes()
{
    var guids = AssetDatabase.FindAssets("t:Scene");
    var scenes = new List<object>();
    var buildScenePaths = new HashSet<string>();

    foreach (var buildScene in EditorBuildSettings.scenes)
        buildScenePaths.Add(buildScene.path);

    foreach (var guid in guids)
    {
        var path = AssetDatabase.GUIDToAssetPath(guid);
        scenes.Add(new {
            path,
            name = System.IO.Path.GetFileNameWithoutExtension(path),
            inBuildSettings = buildScenePaths.Contains(path),
            enabled = EditorBuildSettings.scenes
                .Any(s => s.path == path && s.enabled)
        });
    }

    return scenes;
}
```

### Scene Opening (Unity side)
```csharp
// Source: Unity docs - EditorSceneManager.OpenScene
using UnityEditor.SceneManagement;

public static object OpenScene(string sceneNameOrPath)
{
    // If it's a path (contains .unity), open directly
    string scenePath = sceneNameOrPath;

    if (!sceneNameOrPath.EndsWith(".unity"))
    {
        // Search by name
        var guids = AssetDatabase.FindAssets("t:Scene " + sceneNameOrPath);
        var matches = guids
            .Select(g => AssetDatabase.GUIDToAssetPath(g))
            .Where(p => System.IO.Path.GetFileNameWithoutExtension(p) == sceneNameOrPath)
            .ToList();

        if (matches.Count == 0)
            throw new System.Exception($"Scene '{sceneNameOrPath}' not found");
        if (matches.Count > 1)
            throw new System.Exception($"Multiple scenes named '{sceneNameOrPath}': {string.Join(", ", matches)}");

        scenePath = matches[0];
    }

    // Save current scene if modified (non-interactive: just save)
    if (EditorSceneManager.GetActiveScene().isDirty)
        EditorSceneManager.SaveOpenScenes();

    var scene = EditorSceneManager.OpenScene(scenePath);
    return new {
        path = scene.path,
        name = scene.name,
        rootCount = scene.rootCount
    };
}
```

### Hierarchy Traversal (Unity side)
```csharp
// Source: Unity docs - Scene.GetRootGameObjects, Transform.GetChild
using UnityEngine.SceneManagement;

public static object GetHierarchy(string nameFilter, string componentFilter)
{
    var scene = SceneManager.GetActiveScene();
    var roots = scene.GetRootGameObjects();
    var nodes = new List<object>();

    foreach (var root in roots)
    {
        var node = BuildNode(root.transform, nameFilter, componentFilter);
        if (node != null)
            nodes.Add(node);
    }

    return new {
        scene = scene.name,
        scenePath = scene.path,
        rootCount = roots.Length,
        hierarchy = nodes
    };
}

private static object BuildNode(Transform t, string nameFilter, string componentFilter)
{
    var children = new List<object>();
    for (int i = 0; i < t.childCount; i++)
    {
        var child = BuildNode(t.GetChild(i), nameFilter, componentFilter);
        if (child != null)
            children.Add(child);
    }

    bool matchesName = nameFilter == null ||
        t.gameObject.name.IndexOf(nameFilter, System.StringComparison.OrdinalIgnoreCase) >= 0;
    bool matchesComponent = componentFilter == null ||
        t.gameObject.GetComponent(componentFilter) != null;

    // Include this node if it matches OR has matching descendants
    if (!matchesName && !matchesComponent && children.Count == 0)
        return null;

    var components = t.gameObject.GetComponents<Component>();
    var componentNames = components
        .Where(c => c != null)
        .Select(c => c.GetType().Name)
        .ToList();

    return new {
        name = t.gameObject.name,
        path = GetHierarchyPath(t),
        activeSelf = t.gameObject.activeSelf,
        activeInHierarchy = t.gameObject.activeInHierarchy,
        components = componentNames,
        children
    };
}

private static string GetHierarchyPath(Transform t)
{
    var path = t.gameObject.name;
    while (t.parent != null)
    {
        t = t.parent;
        path = t.gameObject.name + "/" + path;
    }
    return path;
}
```

### Property Inspection (Unity side)
```csharp
// Source: Unity docs - SerializedObject.GetIterator, SerializedProperty
public static object InspectGameObject(string gameObjectPath)
{
    var go = FindGameObjectByPath(gameObjectPath);
    if (go == null)
        throw new System.Exception($"GameObject not found: {gameObjectPath}");

    var components = go.GetComponents<Component>();
    var result = new List<object>();

    foreach (var component in components)
    {
        if (component == null)
        {
            result.Add(new { type = "Missing (MonoScript)", properties = (object)null });
            continue;
        }

        var so = new SerializedObject(component);
        so.Update();
        var props = new List<object>();

        var iterator = so.GetIterator();
        bool enterChildren = true;
        while (iterator.NextVisible(enterChildren))
        {
            enterChildren = false;
            props.Add(new {
                name = iterator.name,
                displayName = iterator.displayName,
                type = iterator.propertyType.ToString(),
                value = PropertySerializer.ReadValue(iterator),
                path = iterator.propertyPath
            });
        }

        result.Add(new {
            type = component.GetType().Name,
            enabled = IsComponentEnabled(component),
            properties = props
        });
    }

    return new {
        name = go.name,
        path = gameObjectPath,
        tag = go.tag,
        layer = LayerMask.LayerToName(go.layer),
        activeSelf = go.activeSelf,
        isStatic = go.isStatic,
        components = result
    };
}
```

### CLI Command Pattern (TypeScript side)
```typescript
// Source: Existing codebase conventions (play.ts, screenshot.ts)
import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, log, logSuccess } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface SceneInfo {
  path: string;
  name: string;
  inBuildSettings: boolean;
  enabled: boolean;
}

export function registerSceneCommand(program: Command): void {
  const scene = program.command('scene').description('Manage Unity scenes');

  scene
    .command('list')
    .description('List all scenes in the project')
    .action(async () => {
      try {
        const opts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<SceneInfo[]>(info.port, 'GET', '/scene/list');
        outputSuccess(result, opts);
        for (const s of result) {
          log(`  ${s.name} (${s.path})${s.inBuildSettings ? ' [build]' : ''}`);
        }
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EditorApplication.OpenScene()` | `EditorSceneManager.OpenScene()` | Unity 5.3+ (2015) | Old API deprecated, new one handles multi-scene |
| `SceneManager.GetAllScenes()` | `SceneManager.sceneCount` + `GetSceneAt()` | Unity 5.x | GetAllScenes is obsolete |
| `SerializedProperty.intValue` only for int | `numericType` to pick correct accessor (int/uint/long) | Unity 2022+ | Newer Unity versions expose `numericType` for precision |
| No `boxedValue` on SerializedProperty | `SerializedProperty.boxedValue` available | Unity 2022.1+ | Can read any property value as object, but less type-safe |

**Deprecated/outdated:**
- `EditorApplication.OpenScene()` -- use `EditorSceneManager.OpenScene()` instead
- `SceneManager.GetAllScenes()` -- use `SceneManager.sceneCount` / `GetSceneAt()` loop instead

## Open Questions

1. **Should `scene open` save the current scene automatically or prompt?**
   - What we know: `EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()` shows a dialog, but this is unusable from a CLI-driven tool (no user at the keyboard). `EditorSceneManager.SaveOpenScenes()` saves silently.
   - What's unclear: Whether silent auto-save is always safe, or if a `--no-save` flag is needed.
   - Recommendation: Auto-save modified scenes before opening. Add `--no-save` flag to skip if the user explicitly wants to discard changes. This matches the "AI agent operating autonomously" use case.

2. **Should `hierarchy` include component type names on each node?**
   - What we know: Including component names (e.g., `["Transform", "MeshRenderer", "BoxCollider"]`) on each hierarchy node adds useful context without much overhead.
   - What's unclear: Whether this is too noisy for very large hierarchies.
   - Recommendation: Include component type names by default. They are cheap to compute (just `GetType().Name`) and extremely useful for Claude to understand the scene without needing a separate inspect call on every object.

3. **Depth limit for hierarchy output?**
   - What we know: Real games can have deep hierarchies (UI canvases, imported FBX models with bone trees).
   - What's unclear: What default depth is practical.
   - Recommendation: No depth limit by default (return full tree). Offer `--depth <n>` flag on the CLI side. Most Unity scenes have reasonable depth, and truncating by default would hide information Claude needs.

4. **How to handle `GameObject.Find()` not finding inactive objects for `inspect`?**
   - What we know: `GameObject.Find()` skips inactive GameObjects. The hierarchy traversal CAN include them.
   - What's unclear: Best lookup strategy.
   - Recommendation: Do NOT use `GameObject.Find()` for the inspect endpoint. Instead, walk the hierarchy from root using `Transform.Find()` (which works on inactive children) or implement a path-based recursive search. This ensures inspect works on any object visible in the hierarchy output.

## Sources

### Primary (HIGH confidence)
- [Unity docs: AssetDatabase.FindAssets](https://docs.unity3d.com/ScriptReference/AssetDatabase.FindAssets.html) - scene listing
- [Unity docs: EditorSceneManager.OpenScene](https://docs.unity3d.com/ScriptReference/SceneManagement.EditorSceneManager.OpenScene.html) - scene opening
- [Unity docs: Scene.GetRootGameObjects](https://docs.unity3d.com/ScriptReference/SceneManagement.Scene.GetRootGameObjects.html) - hierarchy root access
- [Unity docs: SerializedObject.GetIterator](https://docs.unity3d.com/ScriptReference/SerializedObject.GetIterator.html) - property iteration
- [Unity docs: SerializedPropertyType](https://docs.unity3d.com/ScriptReference/SerializedPropertyType.html) - all 29 property types
- [Unity docs: SerializedProperty](https://docs.unity3d.com/ScriptReference/SerializedProperty.html) - value accessors
- [Unity docs: GameObject.Find](https://docs.unity3d.com/ScriptReference/GameObject.Find.html) - path-based lookup, slash notation
- [Unity docs: EditorBuildSettings.scenes](https://docs.unity3d.com/ScriptReference/EditorBuildSettings-scenes.html) - build settings scene list
- [Unity docs: AnimationUtility.CalculateTransformPath](https://docs.unity3d.com/ScriptReference/AnimationUtility.CalculateTransformPath.html) - hierarchy path utility
- [Unity C# Reference: SerializedProperty.bindings.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/SerializedProperty.bindings.cs) - source-of-truth for all property accessors

### Secondary (MEDIUM confidence)
- [Newtonsoft.Json Performance Tips](https://www.newtonsoft.com/json/help/html/Performance.htm) - JSON serialization performance
- [Unity Discussion: How to iterate SerializedProperty children](https://discussions.unity.com/t/how-to-iterate-through-all-serialized-property-children-deep-search/222606) - iteration patterns
- [Unity Discussion: Scene traversal recipes](https://www.codecapers.com.au/scene-traversal-recipes-for-unity/) - hierarchy traversal patterns

### Tertiary (LOW confidence)
- None. All findings verified against official Unity documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all Unity APIs are well-documented and stable
- Architecture: HIGH - Follows exact patterns from Phases 1-3 (handler/service/command)
- Pitfalls: HIGH - Well-known Unity Editor API gotchas, verified against official docs
- SerializedProperty types: HIGH - Complete enum verified against official docs (29 types)

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (stable Unity APIs, unlikely to change)
