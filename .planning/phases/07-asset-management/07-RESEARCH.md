# Phase 7: Asset Management - Research

**Researched:** 2026-02-10
**Domain:** Unity Editor scripting -- prefab creation/instantiation/variants, material creation/property-setting/assignment, Animator controller state queries
**Confidence:** HIGH

## Summary

Phase 7 adds three new asset management capabilities to gamekit: prefab operations (create, instantiate, variants/overrides), material management (create, set properties, assign to renderers), and animator controller queries (read-only listing of states, parameters, transitions). These map to seven requirements (ASSET-01 through ASSET-07) and three planned implementations (07-01 prefabs, 07-02 materials, 07-03 animator).

The Unity-side implementation uses well-established Editor APIs: `PrefabUtility` for prefab operations (stable since Unity 2018.3 when the nested prefab workflow was introduced), `Material`/`Shader`/`AssetDatabase` for material creation and property setting, and `UnityEditor.Animations.AnimatorController` for read-only animator queries. All three domains are read/write operations on assets (not scene objects), which means they interact with `AssetDatabase` rather than the scene hierarchy -- a key architectural difference from Phase 5's scene authoring. Material assignment (`ASSET-05`) is the one exception that bridges both domains: it modifies a scene object's Renderer component to reference an asset.

The CLI side follows the established multi-subcommand pattern (like `gamekit play start/stop/status` and `gamekit list scripts/scenes/prefabs`) with three new command groups: `gamekit prefab create/instantiate`, `gamekit material create/set/assign`, and `gamekit animator list`. The Unity side needs new services (`PrefabService`, `MaterialService`, `AnimatorService`) and handlers (`PrefabHandler`, `MaterialHandler`, `AnimatorHandler`) following the same patterns from Phases 2-6.

**Primary recommendation:** Use `PrefabUtility.SaveAsPrefabAsset` / `SaveAsPrefabAssetAndConnect` for prefab creation (auto-creates variants when input is a prefab instance), `PrefabUtility.InstantiatePrefab` for instantiation (maintains prefab link), `new Material(Shader.Find(name))` + `AssetDatabase.CreateAsset` for material creation, `Material.SetColor/SetFloat/SetVector/SetTexture` for property setting with `EditorUtility.SetDirty` + `AssetDatabase.SaveAssets` for persistence, `Renderer.sharedMaterial` assignment for material-to-renderer binding, and direct property reads on `AnimatorController.layers[].stateMachine` for animator queries.

## Standard Stack

### Core (already in project -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Commander.js | ^12.1.0 | CLI command registration | Already used for all commands |
| Newtonsoft.Json | (Unity built-in) | JSON serialization in Unity plugin | Already used in all handlers |
| fetch (Node built-in) | N/A | HTTP client in CLI | Already used via `bridge.ts` |

### Unity Editor APIs Used

| API | Namespace | Purpose | Stability |
|-----|-----------|---------|-----------|
| `PrefabUtility.SaveAsPrefabAsset(go, path)` | UnityEditor | Create prefab from scene GameObject | Stable (Unity 2018.3+) |
| `PrefabUtility.SaveAsPrefabAssetAndConnect(go, path, mode)` | UnityEditor | Create prefab and make source a prefab instance | Stable (Unity 2018.3+) |
| `PrefabUtility.InstantiatePrefab(asset)` | UnityEditor | Instantiate prefab maintaining prefab link | Stable |
| `PrefabUtility.GetPrefabAssetType(go)` | UnityEditor | Query if object is Regular, Variant, Model, etc. | Stable |
| `PrefabUtility.GetPropertyModifications(instance)` | UnityEditor | Read property overrides on prefab instance | Stable |
| `PrefabUtility.GetObjectOverrides(instance, includeDefault)` | UnityEditor | Read object overrides on prefab instance | Stable |
| `PrefabUtility.HasPrefabInstanceAnyOverrides(instance, includeDefault)` | UnityEditor | Check if instance has any overrides | Stable |
| `PrefabUtility.GetCorrespondingObjectFromSource(obj)` | UnityEditor | Get source prefab asset object | Stable |
| `new Material(shader)` | UnityEngine | Create material with shader | Stable |
| `Shader.Find(name)` | UnityEngine | Find shader by name | Stable |
| `Shader.GetPropertyCount()` | UnityEngine | Count shader properties | Stable (Unity 2019.3+) |
| `Shader.GetPropertyName(index)` | UnityEngine | Get shader property name by index | Stable (Unity 2019.3+) |
| `Shader.GetPropertyType(index)` | UnityEngine | Get shader property type by index | Stable (Unity 2019.3+) |
| `Material.SetColor/SetFloat/SetVector/SetTexture` | UnityEngine | Set material property values | Stable |
| `Material.GetColor/GetFloat/GetVector/GetTexture` | UnityEngine | Read material property values | Stable |
| `AssetDatabase.CreateAsset(obj, path)` | UnityEditor | Save asset to disk | Stable |
| `AssetDatabase.LoadAssetAtPath<T>(path)` | UnityEditor | Load asset by path | Stable |
| `AssetDatabase.FindAssets(filter)` | UnityEditor | Find assets by type/name | Stable |
| `AssetDatabase.SaveAssets()` | UnityEditor | Save all modified assets | Stable |
| `EditorUtility.SetDirty(obj)` | UnityEditor | Mark asset as modified (needed for asset saves) | Stable |
| `AnimatorController.layers` | UnityEditor.Animations | Access animator layers | Stable |
| `AnimatorControllerLayer.stateMachine` | UnityEditor.Animations | Access state machine for a layer | Stable |
| `AnimatorStateMachine.states` | UnityEditor.Animations | Get ChildAnimatorState array | Stable |
| `AnimatorState.transitions` | UnityEditor.Animations | Get outgoing transitions | Stable |
| `AnimatorController.parameters` | UnityEditor.Animations | Get animator parameters | Stable |
| `Renderer.sharedMaterial` | UnityEngine | Assign material to renderer (shared, no copy) | Stable |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `PrefabUtility.SaveAsPrefabAsset` | `PrefabUtility.SaveAsPrefabAssetAndConnect` | SaveAsPrefabAsset does NOT turn the scene object into an instance; SaveAsPrefabAssetAndConnect does. Use SaveAsPrefabAssetAndConnect for "create and keep link" |
| `Shader.GetPropertyCount/Name/Type` | `ShaderUtil.GetPropertyCount/Name/Type` | ShaderUtil methods are obsolete; Shader methods are the current API (Unity 2019.3+) |
| `Renderer.sharedMaterial = mat` | `Renderer.material = mat` | `sharedMaterial` modifies the shared material reference (what we want for editor authoring); `material` creates a runtime copy (leaks in editor) |
| `EditorUtility.SetDirty` + `AssetDatabase.SaveAssets` | `Undo.RecordObject` for materials | SetDirty is correct for persistent assets (materials); Undo.RecordObject is for scene objects. Materials are assets, not scene objects. |
| Direct `AnimatorController` property access | `Animator.GetCurrentAnimatorStateInfo` | Direct controller access works in editor without play mode; Animator runtime API requires play mode |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure (new files only)

```
template/Editor/GameKit/
├── Handlers/
│   ├── PrefabHandler.cs           # NEW: POST /api/prefab/create, /api/prefab/instantiate
│   ├── MaterialHandler.cs         # NEW: POST /api/material/create, /api/material/set, /api/material/assign
│   └── AnimatorHandler.cs         # NEW: GET /api/animator/list
├── Services/
│   ├── PrefabService.cs           # NEW: prefab create/instantiate/variant logic
│   ├── MaterialService.cs         # NEW: material create/set/assign logic
│   └── AnimatorService.cs         # NEW: animator controller query logic

src/
├── commands/
│   ├── prefab.ts                  # NEW: gamekit prefab create/instantiate
│   ├── material.ts                # NEW: gamekit material create/set/assign
│   └── animator.ts                # NEW: gamekit animator list
```

### Pattern 1: Asset Operations vs Scene Operations (KEY DISTINCTION)

**What:** Phase 5 operations (create, destroy, transform, set) modify scene objects and use the Undo system. Phase 7 prefab/material creation operates on **project assets** via `AssetDatabase`, not scene objects. The Undo system works differently for assets vs scene objects.

**When to use:** Any time you create or modify a material or prefab asset file.

**Critical difference:**
```csharp
// Scene object modification (Phase 5 pattern -- uses Undo system):
Undo.RecordObject(go.transform, "Set Transform");
go.transform.localPosition = newPos;
// Scene is auto-marked dirty by Undo

// Asset modification (Phase 7 pattern -- uses SetDirty + SaveAssets):
material.SetColor("_Color", color);
EditorUtility.SetDirty(material);
AssetDatabase.SaveAssets();
// Asset saved to disk explicitly
```

**Exception:** `prefab instantiate` and `material assign` modify the scene (placing a prefab instance, assigning material to renderer) and should use Undo for undoability. `prefab create` and `material create/set` modify assets and should use `AssetDatabase`.

### Pattern 2: Multi-Subcommand CLI Registration (Established)

**What:** Commands with multiple sub-actions use `program.command('group').command('subcommand')` pattern.
**When to use:** `gamekit prefab create/instantiate`, `gamekit material create/set/assign`, `gamekit animator list`.
**Source:** Established codebase convention from `play.ts`, `scene.ts`, `list.ts`.
**Example:**
```typescript
// Source: Existing codebase pattern (play.ts, list.ts)
export function registerPrefabCommand(program: Command): void {
  const prefab = program.command('prefab').description('Manage prefab assets');

  prefab
    .command('create <gameObjectPath>')
    .description('Create a prefab from a scene GameObject')
    .option('--output <assetPath>', 'Output asset path (default: Assets/Prefabs/<name>.prefab)')
    .option('--connect', 'Keep the scene object connected as a prefab instance')
    .action(async (gameObjectPath: string, opts) => {
      // ... standard connection + request + output pattern
    });

  prefab
    .command('instantiate <prefabPath>')
    .description('Instantiate a prefab into the scene')
    .option('--parent <path>', 'Parent GameObject path')
    .action(async (prefabPath: string, opts) => {
      // ...
    });
}
```

### Pattern 3: PrefabService with Undo-Aware Instantiation

**What:** Prefab create uses `PrefabUtility.SaveAsPrefabAsset[AndConnect]`. Prefab instantiate uses `PrefabUtility.InstantiatePrefab` + `Undo.RegisterCreatedObjectUndo` for undoability. Variant creation happens automatically when `SaveAsPrefabAsset` receives a prefab instance root.

**When to use:** All prefab operations.
**Source:** [Unity docs - PrefabUtility](https://docs.unity3d.com/ScriptReference/PrefabUtility.html)
**Example:**
```csharp
// Create prefab from scene GameObject
public static object CreatePrefab(string gameObjectPath, string assetPath, bool connect)
{
    GuardPlayMode();

    var go = SceneService.FindGameObjectByPath(gameObjectPath);
    if (go == null) throw new Exception($"GameObject not found: {gameObjectPath}");

    // Ensure directory exists
    var dir = System.IO.Path.GetDirectoryName(assetPath);
    if (!AssetDatabase.IsValidFolder(dir))
        CreateFolderRecursive(dir);

    bool success;
    GameObject prefab;
    if (connect)
    {
        prefab = PrefabUtility.SaveAsPrefabAssetAndConnect(
            go, assetPath, InteractionMode.AutomatedAction, out success);
    }
    else
    {
        prefab = PrefabUtility.SaveAsPrefabAsset(go, assetPath, out success);
    }

    if (!success) throw new Exception($"Failed to create prefab at: {assetPath}");

    var assetType = PrefabUtility.GetPrefabAssetType(prefab);
    return new
    {
        path = assetPath,
        name = prefab.name,
        type = assetType.ToString(), // Regular, Variant, Model
        isVariant = assetType == PrefabAssetType.Variant
    };
}

// Instantiate prefab into scene
public static object InstantiatePrefab(string prefabPath, string parentPath)
{
    GuardPlayMode();

    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
    if (prefab == null) throw new Exception($"Prefab not found: {prefabPath}");

    var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
    Undo.RegisterCreatedObjectUndo(instance, "Instantiate Prefab");

    if (!string.IsNullOrEmpty(parentPath))
    {
        var parent = SceneService.FindGameObjectByPath(parentPath);
        if (parent == null)
        {
            Undo.DestroyObjectImmediate(instance);
            throw new Exception($"Parent not found: {parentPath}");
        }
        Undo.SetTransformParent(instance.transform, parent.transform, false, "Set Parent");
    }

    return new
    {
        name = instance.name,
        path = SceneService.GetHierarchyPath(instance.transform),
        instanceId = instance.GetInstanceID(),
        prefabPath
    };
}
```

### Pattern 4: MaterialService with Asset Persistence

**What:** Material creation uses `new Material(Shader.Find(name))` + `AssetDatabase.CreateAsset`. Property setting uses `Material.Set*` methods with `EditorUtility.SetDirty` + `AssetDatabase.SaveAssets`. Assignment uses `Undo.RecordObject` on the Renderer + `sharedMaterial` assignment.

**When to use:** All material operations.
**Source:** [Unity docs - Material](https://docs.unity3d.com/ScriptReference/Material-ctor.html), [AssetDatabase.CreateAsset](https://docs.unity3d.com/ScriptReference/AssetDatabase.CreateAsset.html)
**Example:**
```csharp
// Create material
public static object CreateMaterial(string name, string shaderName, string outputPath)
{
    var shader = Shader.Find(shaderName);
    if (shader == null)
        throw new Exception($"Shader not found: {shaderName}");

    var material = new Material(shader);
    material.name = name;

    if (string.IsNullOrEmpty(outputPath))
        outputPath = $"Assets/Materials/{name}.mat";

    var dir = System.IO.Path.GetDirectoryName(outputPath);
    if (!AssetDatabase.IsValidFolder(dir))
        CreateFolderRecursive(dir);

    AssetDatabase.CreateAsset(material, outputPath);
    AssetDatabase.SaveAssets();

    return new
    {
        path = outputPath,
        name = material.name,
        shader = shaderName
    };
}

// Set material property
public static object SetMaterialProperty(string materialPath, string property, JToken value)
{
    var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
    if (material == null)
        throw new Exception($"Material not found: {materialPath}");

    var shader = material.shader;
    // Find property index to determine type
    int propIndex = shader.FindPropertyIndex(property);
    if (propIndex < 0)
        throw new Exception($"Property '{property}' not found on shader '{shader.name}'");

    var propType = shader.GetPropertyType(propIndex);
    SetPropertyByType(material, property, propType, value);

    EditorUtility.SetDirty(material);
    AssetDatabase.SaveAssets();

    return new { path = materialPath, property, value = ReadPropertyByType(material, property, propType) };
}

// Assign material to renderer
public static object AssignMaterial(string materialPath, string gameObjectPath)
{
    GuardPlayMode();

    var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
    if (material == null)
        throw new Exception($"Material not found: {materialPath}");

    var go = SceneService.FindGameObjectByPath(gameObjectPath);
    if (go == null)
        throw new Exception($"GameObject not found: {gameObjectPath}");

    var renderer = go.GetComponent<Renderer>();
    if (renderer == null)
        throw new Exception($"No Renderer component on: {gameObjectPath}");

    Undo.RecordObject(renderer, "Assign Material");
    renderer.sharedMaterial = material;

    return new
    {
        gameObject = go.name,
        material = material.name,
        materialPath,
        gameObjectPath
    };
}
```

### Pattern 5: AnimatorService Read-Only Query

**What:** Read-only traversal of `AnimatorController` layers, states, parameters, and transitions. No Undo needed since nothing is modified.

**When to use:** `gamekit animator list` command.
**Source:** [Unity docs - AnimatorController](https://docs.unity3d.com/ScriptReference/Animations.AnimatorController.html)
**Example:**
```csharp
public static object ListAnimator(string assetPathOrGameObjectPath)
{
    AnimatorController controller = ResolveController(assetPathOrGameObjectPath);
    if (controller == null)
        throw new Exception($"No AnimatorController found at: {assetPathOrGameObjectPath}");

    var layers = new List<object>();
    foreach (var layer in controller.layers)
    {
        var states = new List<object>();
        foreach (var childState in layer.stateMachine.states)
        {
            var s = childState.state;
            var transitions = new List<object>();
            foreach (var t in s.transitions)
            {
                var conditions = new List<object>();
                foreach (var c in t.conditions)
                {
                    conditions.Add(new { parameter = c.parameter, mode = c.mode.ToString(), threshold = c.threshold });
                }
                transitions.Add(new
                {
                    destinationState = t.isExit ? "(Exit)" : t.destinationState?.name,
                    hasExitTime = t.hasExitTime,
                    exitTime = t.exitTime,
                    duration = t.duration,
                    conditions
                });
            }
            states.Add(new
            {
                name = s.name,
                tag = s.tag,
                speed = s.speed,
                motion = s.motion?.name,
                transitions
            });
        }
        layers.Add(new
        {
            name = layer.name,
            defaultWeight = layer.defaultWeight,
            states
        });
    }

    var parameters = new List<object>();
    foreach (var p in controller.parameters)
    {
        parameters.Add(new
        {
            name = p.name,
            type = p.type.ToString(), // Float, Int, Bool, Trigger
            defaultFloat = p.defaultFloat,
            defaultInt = p.defaultInt,
            defaultBool = p.defaultBool
        });
    }

    return new
    {
        name = controller.name,
        path = AssetDatabase.GetAssetPath(controller),
        layerCount = controller.layers.Length,
        parameterCount = controller.parameters.Length,
        layers,
        parameters
    };
}
```

### Anti-Patterns to Avoid

- **Using `Object.Instantiate` instead of `PrefabUtility.InstantiatePrefab`:** `Object.Instantiate` breaks the prefab link. The instantiated object becomes a standalone copy with no connection to the prefab asset. Always use `PrefabUtility.InstantiatePrefab` in editor contexts.
- **Using `Renderer.material` instead of `Renderer.sharedMaterial` in editor:** `Renderer.material` creates a runtime material instance copy (leaks memory in editor, shows "[Instance]" suffix). Use `sharedMaterial` for editor material assignment.
- **Forgetting `AssetDatabase.SaveAssets()` after material creation/modification:** Materials are assets on disk. Without SaveAssets, changes exist only in memory and are lost on domain reload or Unity restart.
- **Forgetting `EditorUtility.SetDirty()` before `AssetDatabase.SaveAssets()`:** The dirty flag tells Unity which assets need saving. Without it, SaveAssets may skip the modified material.
- **Using `Undo.RecordObject` for asset creation:** Undo is for scene objects. New asset creation (`AssetDatabase.CreateAsset`) is a file operation. Use `Undo.RegisterCreatedObjectUndo` only for scene object instantiation (like prefab instantiate).
- **Creating folders with `System.IO.Directory.CreateDirectory`:** Use `AssetDatabase.CreateFolder` instead. The AssetDatabase must track all project folders; bypassing it causes import issues.
- **Assuming `Shader.Find` always succeeds:** It returns null for unknown shader names. Always validate and return a helpful error listing available shaders.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prefab creation | Manual file copying + meta files | `PrefabUtility.SaveAsPrefabAsset` | Handles nested prefabs, generates correct .meta files, manages asset references |
| Prefab instantiation | `Object.Instantiate` + manual prefab link | `PrefabUtility.InstantiatePrefab` | Maintains prefab connection, supports nested prefab overrides |
| Variant detection | Custom logic to check if prefab is variant | `PrefabUtility.GetPrefabAssetType` | Returns `PrefabAssetType.Variant` directly |
| Override detection | Manual property comparison | `PrefabUtility.GetPropertyModifications` / `GetObjectOverrides` | Complete override tracking including nested prefabs |
| Material asset persistence | Manual file write + reimport | `AssetDatabase.CreateAsset` + `SaveAssets` | Handles .meta generation, reimport, cache invalidation |
| Shader property enumeration | String-matching known property names | `Shader.GetPropertyCount/Name/Type` | Works for any shader including custom and Shader Graph |
| Folder creation in Assets | `System.IO.Directory.CreateDirectory` | `AssetDatabase.CreateFolder` | Registers with asset pipeline, generates .meta files |
| Animator controller parsing | Manual .controller file parsing (YAML) | `AnimatorController.layers/parameters` | Typed API with full graph traversal |

**Key insight:** Phase 7 operations are primarily asset pipeline operations, not scene operations. The asset pipeline has its own APIs (`AssetDatabase`, `PrefabUtility`, `EditorUtility.SetDirty`) that differ fundamentally from scene manipulation APIs (`Undo`, `ObjectFactory`). Mixing them causes subtle bugs (lost changes, broken undo, import errors).

## Common Pitfalls

### Pitfall 1: Prefab Create From Child Inside Prefab Instance
**What goes wrong:** `PrefabUtility.SaveAsPrefabAsset` throws or creates a corrupt prefab when given a child of a prefab instance (not the root).
**Why it happens:** The API requires either a plain GameObject or the outermost root of a prefab instance. Children inside prefab instances cannot be extracted as standalone prefabs.
**How to avoid:** Validate the input. If the GameObject is part of a prefab instance, check `PrefabUtility.GetOutermostPrefabInstanceRoot(go)` and require it to be the root. Return a clear error: "Cannot create prefab from a child inside a prefab instance. Use the prefab root instead."
**Warning signs:** Null return from SaveAsPrefabAsset, or `success` out parameter is false.

### Pitfall 2: Prefab Variant Created Unintentionally
**What goes wrong:** User expects a new independent prefab but gets a variant because the source GameObject was a prefab instance.
**Why it happens:** `PrefabUtility.SaveAsPrefabAsset` automatically creates a variant when the input is a prefab instance root. This is by design but not obvious.
**How to avoid:** Check if the source is a prefab instance using `PrefabUtility.IsPartOfPrefabInstance(go)`. If creating a non-variant is intended, unpack first with `PrefabUtility.UnpackPrefabInstance(go, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction)`. Report the type in the response (regular vs variant) so the user knows what they got.
**Warning signs:** User creates prefab, inspects it, sees it's a variant when they expected a regular prefab.

### Pitfall 3: Material Not Persisted After Property Change
**What goes wrong:** Material property changes work in the editor session but are lost after domain reload or Unity restart.
**Why it happens:** `Material.SetColor()` etc. modify the in-memory copy. Without `EditorUtility.SetDirty()` + `AssetDatabase.SaveAssets()`, changes never reach disk.
**How to avoid:** Always call `EditorUtility.SetDirty(material)` after modifications, then `AssetDatabase.SaveAssets()` to flush to disk.
**Warning signs:** Material looks correct in this session but reverts after recompilation or restart.

### Pitfall 4: Shader.Find Returns Null for URP/HDRP Shaders
**What goes wrong:** `Shader.Find("Standard")` works in built-in render pipeline but returns null in URP projects. `Shader.Find("Universal Render Pipeline/Lit")` works in URP but returns null in built-in.
**Why it happens:** Available shaders depend on the active render pipeline. "Standard" is built-in only; "Universal Render Pipeline/Lit" is URP only; "HDRP/Lit" is HDRP only.
**How to avoid:** Try the requested shader name first. If null, provide a helpful error message. Consider a fallback chain or listing available shaders. Common shader names: `"Standard"` (built-in), `"Universal Render Pipeline/Lit"` (URP), `"HDRP/Lit"` (HDRP).
**Warning signs:** "Shader not found" errors when the user provides a valid-sounding shader name.

### Pitfall 5: Renderer.material Creates Instance Leak in Editor
**What goes wrong:** Using `renderer.material = mat` in editor creates a material instance copy, Unity shows warning about material leak.
**Why it happens:** `.material` is designed for runtime use and creates a unique instance. In editor, this creates unreferenced material instances that persist until garbage collected.
**How to avoid:** Always use `renderer.sharedMaterial = mat` for editor-time material assignment. `.sharedMaterial` modifies the actual material reference.
**Warning signs:** Unity console warning about material leak, material shows "[Instance]" suffix.

### Pitfall 6: AnimatorController Cast Failure
**What goes wrong:** Loading an Animator controller from a path or from an Animator component's `runtimeAnimatorController` fails to cast to `AnimatorController`.
**Why it happens:** `Animator.runtimeAnimatorController` returns `RuntimeAnimatorController` (the runtime base class). In editor, it must be cast to `AnimatorController` (the editor subclass from `UnityEditor.Animations`). Also, `AnimatorOverrideController` wraps another controller and does not cast directly.
**How to avoid:** Try casting to `AnimatorController` first. If that fails, check for `AnimatorOverrideController` and access its `.runtimeAnimatorController` property to get the underlying controller. Support both asset paths (direct load) and scene GameObject paths (via Animator component).
**Warning signs:** NullReferenceException when accessing `.layers` or `.parameters`.

### Pitfall 7: Prefab Instantiate Without Undo Registration
**What goes wrong:** `PrefabUtility.InstantiatePrefab` creates the instance but does not automatically register with Unity's Undo system. Ctrl+Z does nothing.
**Why it happens:** Unlike `ObjectFactory.CreateGameObject`, `PrefabUtility.InstantiatePrefab` does not auto-register undo. The caller must do it explicitly.
**How to avoid:** Call `Undo.RegisterCreatedObjectUndo(instance, "Instantiate Prefab")` immediately after instantiation.
**Warning signs:** Ctrl+Z does not remove the instantiated prefab.

### Pitfall 8: Material Property Name Mismatch
**What goes wrong:** Setting a material property by name (e.g., `_Color`) fails silently because the property name does not match the shader's internal name.
**Why it happens:** Different shaders use different property names. Standard uses `_Color`, URP Lit uses `_BaseColor`. No error is thrown for non-existent property names -- the call just does nothing.
**How to avoid:** Use `Shader.FindPropertyIndex(name)` to validate the property exists before setting. If it returns -1, the property does not exist. Return a helpful error listing available properties using `Shader.GetPropertyCount/Name`.
**Warning signs:** Property appears unchanged after set call, but no error is returned.

## Code Examples

Verified patterns from official sources and established codebase conventions:

### Prefab Create Handler (Unity side)
```csharp
// Source: Unity docs - PrefabUtility.SaveAsPrefabAsset
public static ApiResponse HandleCreate(HttpListenerRequest request)
{
    try
    {
        string body;
        using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            body = reader.ReadToEnd();

        var json = JObject.Parse(body);
        var gameObjectPath = json["gameObjectPath"]?.ToString();
        var assetPath = json["assetPath"]?.ToString();
        var connect = json["connect"]?.Value<bool>() ?? false;

        if (string.IsNullOrEmpty(gameObjectPath))
            return ApiResponse.Error("MISSING_FIELD", "Missing 'gameObjectPath' field");

        if (EditorApplication.isPlaying)
            return ApiResponse.Error("PLAY_MODE", "Cannot create prefab during play mode.");

        var result = PrefabService.CreatePrefab(gameObjectPath, assetPath, connect);
        return ApiResponse.Success(result);
    }
    catch (Exception ex)
    {
        if (ex.Message.Contains("not found"))
            return ApiResponse.Error("NOT_FOUND", ex.Message);
        return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
    }
}
```

### Material Create Handler (Unity side)
```csharp
// Source: Unity docs - Material constructor, AssetDatabase.CreateAsset
public static ApiResponse HandleCreate(HttpListenerRequest request)
{
    try
    {
        string body;
        using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            body = reader.ReadToEnd();

        var json = JObject.Parse(body);
        var name = json["name"]?.ToString();
        var shaderName = json["shader"]?.ToString() ?? "Standard";
        var outputPath = json["outputPath"]?.ToString();

        if (string.IsNullOrEmpty(name))
            return ApiResponse.Error("MISSING_FIELD", "Missing 'name' field");

        var result = MaterialService.CreateMaterial(name, shaderName, outputPath);
        return ApiResponse.Success(result);
    }
    catch (Exception ex)
    {
        if (ex.Message.Contains("Shader not found"))
            return ApiResponse.Error("SHADER_NOT_FOUND", ex.Message);
        return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
    }
}
```

### Material Set Property -- Type Dispatch
```csharp
// Source: Unity docs - Material.SetColor, Shader.GetPropertyType
private static void SetPropertyByType(Material material, string property,
    ShaderPropertyType propType, JToken value)
{
    switch (propType)
    {
        case ShaderPropertyType.Color:
            material.SetColor(property, new Color(
                value["r"]?.Value<float>() ?? 0f,
                value["g"]?.Value<float>() ?? 0f,
                value["b"]?.Value<float>() ?? 0f,
                value["a"]?.Value<float>() ?? 1f
            ));
            break;
        case ShaderPropertyType.Float:
        case ShaderPropertyType.Range:
            material.SetFloat(property, value.Value<float>());
            break;
        case ShaderPropertyType.Vector:
            material.SetVector(property, new Vector4(
                value["x"]?.Value<float>() ?? 0f,
                value["y"]?.Value<float>() ?? 0f,
                value["z"]?.Value<float>() ?? 0f,
                value["w"]?.Value<float>() ?? 0f
            ));
            break;
        case ShaderPropertyType.Int:
            material.SetInteger(property, value.Value<int>());
            break;
        case ShaderPropertyType.Texture:
            if (value.Type == JTokenType.String)
            {
                var texPath = value.Value<string>();
                var texture = AssetDatabase.LoadAssetAtPath<Texture>(texPath);
                if (texture == null)
                    throw new Exception($"Texture not found: {texPath}");
                material.SetTexture(property, texture);
            }
            else if (value.Type == JTokenType.Null)
            {
                material.SetTexture(property, null);
            }
            break;
        default:
            throw new Exception($"Unsupported property type: {propType}");
    }
}
```

### Animator List CLI (TypeScript side)
```typescript
// Source: Established codebase convention (list.ts, play.ts)
export function registerAnimatorCommand(program: Command): void {
  const animator = program.command('animator').description('Query Animator controllers');

  animator
    .command('list <path>')
    .description('List states, parameters, and transitions of an Animator controller')
    .action(async (path: string) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request(info.port, 'GET', `/animator/list?path=${encodeURIComponent(path)}`);
        outputSuccess(result, globalOpts);
        // Human-readable summary to stderr
        log(`Controller: ${result.name}`);
        log(`  ${result.parameterCount} parameter(s), ${result.layerCount} layer(s)`);
        logSuccess('Animator info retrieved');
      } catch (error) {
        if (error instanceof GameKitError) {
          outputError(error.code, error.message);
        }
        throw error;
      }
    });
}
```

### Prefab Override Query
```csharp
// Source: Unity docs - PrefabUtility.GetPropertyModifications, GetObjectOverrides
public static object GetPrefabOverrides(string gameObjectPath)
{
    var go = SceneService.FindGameObjectByPath(gameObjectPath);
    if (go == null)
        throw new Exception($"GameObject not found: {gameObjectPath}");

    if (!PrefabUtility.IsPartOfPrefabInstance(go))
        throw new Exception($"'{gameObjectPath}' is not a prefab instance");

    var modifications = PrefabUtility.GetPropertyModifications(go);
    var overrides = new List<object>();
    if (modifications != null)
    {
        foreach (var mod in modifications)
        {
            if (PrefabUtility.IsDefaultOverride(mod)) continue;
            overrides.Add(new
            {
                target = mod.target?.name,
                targetType = mod.target?.GetType().Name,
                propertyPath = mod.propertyPath,
                value = mod.value
            });
        }
    }

    var hasOverrides = PrefabUtility.HasPrefabInstanceAnyOverrides(go, false);
    return new
    {
        gameObject = go.name,
        path = gameObjectPath,
        isPrefabInstance = true,
        assetType = PrefabUtility.GetPrefabAssetType(go).ToString(),
        hasOverrides,
        overrides
    };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PrefabUtility.CreatePrefab()` | `PrefabUtility.SaveAsPrefabAsset()` | Unity 2018.3 (nested prefab workflow) | Old method is obsolete; new method handles nested prefabs, variants |
| `ShaderUtil.GetPropertyCount/Name/Type` | `Shader.GetPropertyCount/Name/Type` | Unity 2019.3 | ShaderUtil methods deprecated; Shader methods are on the runtime class |
| No variant support | `PrefabAssetType.Variant`, auto-variant creation | Unity 2018.3 | Prefab variants are first-class citizens in the new workflow |
| `EditorUtility.SetDirty` for scene objects | Undo system auto-marks scene dirty | Unity 5.3+ | SetDirty is now for assets only; scene objects use Undo |
| Manual animator YAML parsing | `UnityEditor.Animations.AnimatorController` API | Long-standing | Full typed API in editor namespace |

**Deprecated/outdated:**
- `PrefabUtility.CreatePrefab()` -- replaced by `SaveAsPrefabAsset` / `SaveAsPrefabAssetAndConnect` (Unity 2018.3+)
- `PrefabUtility.ReplacePrefab()` -- replaced by `SaveAsPrefabAsset` overwrite behavior
- `ShaderUtil.GetPropertyCount/Name/Type` -- replaced by `Shader.GetPropertyCount/Name/Type` (Unity 2019.3+)

## Open Questions

1. **Should `gamekit prefab create` default to connect or disconnect mode?**
   - What we know: `SaveAsPrefabAsset` creates the asset without modifying the scene object. `SaveAsPrefabAssetAndConnect` additionally turns the scene object into a prefab instance. Both are valid workflows.
   - What's unclear: Which is more useful for an AI-driven workflow. Connect mode means the scene object becomes a prefab instance (with the blue icon), which is standard Unity workflow. Disconnect mode leaves the scene object as-is.
   - Recommendation: Default to connect mode (`SaveAsPrefabAssetAndConnect`) since it matches standard Unity workflow (creating a prefab from a scene object normally connects it). Add `--no-connect` flag for the rare case where disconnection is preferred.

2. **Should material `set` accept materials by name or path?**
   - What we know: Requirements say `gamekit material set <name> <property> <value>`. Names are not unique (multiple materials could share a name). Paths are unique.
   - What's unclear: Whether to use name (user-friendly, potentially ambiguous) or path (unambiguous, verbose).
   - Recommendation: Accept both. Try as asset path first (if it contains `/` or ends in `.mat`), fall back to name search via `AssetDatabase.FindAssets("t:Material " + name)`. Error if ambiguous.

3. **Should `gamekit animator list` accept asset paths, scene GameObject paths, or both?**
   - What we know: An AnimatorController can be loaded directly from an asset path, or found via an Animator component on a scene GameObject. Both use cases are common.
   - What's unclear: Which is more convenient for the CLI user.
   - Recommendation: Accept both. Try loading as asset path first (`AssetDatabase.LoadAssetAtPath<AnimatorController>`). If that fails, try finding a GameObject at the path and reading its `Animator.runtimeAnimatorController`. Handle `AnimatorOverrideController` by accessing the underlying controller.

4. **Should `gamekit material create` auto-create the output directory?**
   - What we know: `AssetDatabase.CreateAsset` fails if the target directory does not exist. Users often expect directories to be auto-created.
   - What's unclear: Whether to auto-create or require the directory to exist.
   - Recommendation: Auto-create using `AssetDatabase.CreateFolder` recursively. This matches user expectation and prevents friction. Default output path: `Assets/Materials/<name>.mat`.

5. **How should `gamekit material set` handle value parsing for Color/Vector types on the CLI?**
   - What we know: The `set.ts` command already has a `parseValue` function that handles comma-separated numbers (mapped to Vector objects) and JSON objects. Color values could be expressed as `1,0,0,1` (RGBA) or `{"r":1,"g":0,"b":0,"a":1}`.
   - What's unclear: Whether the material set command's value parser should follow the same pattern.
   - Recommendation: Reuse the same `parseValue` logic from `set.ts`. For colors specifically, accept comma-separated RGBA `1,0,0,1` (mapped to `{r,g,b,a}`). For vectors, use `{x,y,z,w}` keys. The Unity side already has the type dispatch to handle both structures.

6. **Should prefab override queries be part of `gamekit prefab` or `gamekit inspect`?**
   - What we know: ASSET-07 says "prefab operations support variants and overrides." Override information is metadata about a prefab instance (scene object), not the prefab asset.
   - What's unclear: Whether to add `gamekit prefab overrides <path>` as a separate subcommand or extend `gamekit inspect` to include override info for prefab instances.
   - Recommendation: Add `gamekit prefab overrides <path>` as a subcommand. This keeps prefab-specific concerns in the prefab command group. The inspect command already has enough responsibility.

## Sources

### Primary (HIGH confidence)
- [Unity docs: PrefabUtility](https://docs.unity3d.com/ScriptReference/PrefabUtility.html) - Full PrefabUtility API reference
- [Unity docs: PrefabUtility.SaveAsPrefabAsset](https://docs.unity3d.com/ScriptReference/PrefabUtility.SaveAsPrefabAsset.html) - Method signatures, variant behavior
- [Unity docs: PrefabUtility.SaveAsPrefabAssetAndConnect](https://docs.unity3d.com/ScriptReference/PrefabUtility.SaveAsPrefabAssetAndConnect.html) - Connect mode behavior
- [Unity docs: PrefabUtility.InstantiatePrefab](https://docs.unity3d.com/ScriptReference/PrefabUtility.InstantiatePrefab.html) - Instantiation with prefab link
- [Unity docs: PrefabUtility.GetObjectOverrides](https://docs.unity3d.com/ScriptReference/PrefabUtility.GetObjectOverrides.html) - Override query API
- [Unity PrefabAPIExamples](https://github.com/Unity-Technologies/PrefabAPIExamples/blob/master/Assets/Editor/Scripts/CreatePrefab.cs) - Official example code for prefab creation and variants
- [Unity docs: Material constructor](https://docs.unity3d.com/ScriptReference/Material-ctor.html) - Material creation
- [Unity docs: Material.SetColor](https://docs.unity3d.com/ScriptReference/Material.SetColor.html) - Material property setting
- [Unity docs: Shader.GetPropertyName](https://docs.unity3d.com/ScriptReference/Shader.GetPropertyName.html) - Shader property enumeration
- [Unity docs: ShaderPropertyType](https://docs.unity3d.com/ScriptReference/Rendering.ShaderPropertyType.html) - Shader property types enum
- [Unity docs: AssetDatabase.CreateAsset](https://docs.unity3d.com/ScriptReference/AssetDatabase.CreateAsset.html) - Asset creation
- [Unity docs: Renderer.sharedMaterial](https://docs.unity3d.com/ScriptReference/Renderer-sharedMaterial.html) - Material assignment
- [Unity docs: AnimatorController](https://docs.unity3d.com/ScriptReference/Animations.AnimatorController.html) - Controller properties and methods
- [Unity docs: AnimatorState](https://docs.unity3d.com/ScriptReference/Animations.AnimatorState.html) - State properties
- [Unity docs: AnimatorStateTransition](https://docs.unity3d.com/ScriptReference/Animations.AnimatorStateTransition.html) - Transition properties
- [Unity docs: AnimatorCondition](https://docs.unity3d.com/ScriptReference/Animations.AnimatorCondition.html) - Transition condition properties
- [Unity docs: EditorUtility.SetDirty](https://docs.unity3d.com/ScriptReference/EditorUtility.SetDirty.html) - Asset dirty marking

### Secondary (MEDIUM confidence)
- [Unity docs: Renderer.material vs sharedMaterial](https://discussions.unity.com/t/material-vs-sharedmaterial-difference-in-setting/251537) - Confirmed material vs sharedMaterial behavior
- [Unity discussions: PrefabUtility.GetPropertyModifications gotchas](https://discussions.unity.com/t/prefabutility-getpropertymodifications-returns-overrides-not-visible-in-the-editor/875956) - Override API nuances
- [Unity C# Reference: PrefabUtility.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/Prefabs/PrefabUtility.cs/) - Source verification

### Tertiary (LOW confidence)
- None. All findings verified against official Unity documentation.

## Metadata

**Confidence breakdown:**
- Prefab operations: HIGH - PrefabUtility API well-documented, stable since Unity 2018.3, verified against official examples
- Material operations: HIGH - Material/Shader APIs are among the oldest stable Unity APIs, well-documented
- Animator queries: HIGH - AnimatorController editor API stable and well-documented, read-only so low risk
- Asset pipeline patterns: HIGH - AssetDatabase.CreateAsset/SaveAssets/SetDirty pattern is canonical Unity
- CLI patterns: HIGH - Following exact patterns from Phases 1-6 (established in this codebase)

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (stable Unity APIs, unlikely to change)
