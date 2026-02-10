# Phase 5: Scene Authoring - Research

**Researched:** 2026-02-10
**Domain:** Unity Editor scripting -- GameObject creation/destruction, component management, SerializedProperty writing, Undo system integration
**Confidence:** HIGH

## Summary

Phase 5 extends the read-only scene understanding from Phase 4 into full scene authoring: creating and destroying GameObjects, adding components, setting serialized properties, and manipulating transforms. All operations must be undoable via Ctrl+Z in Unity. The eight requirements (SAUTH-01 through SAUTH-08) map directly to well-documented Unity Editor APIs that have been stable for years.

The Unity side needs new handlers for each write operation (CreateHandler, DestroyHandler, AddComponentHandler, SetPropertyHandler, TransformHandler) and a new AuthoringService to encapsulate the undo-aware scene modification logic. The CLI side needs new command files (`create.ts`, `destroy.ts`, `add-component.ts`, `set.ts`, `transform.ts`) registered in `index.ts`. All write operations are POST requests with JSON bodies, following the same pattern established in Phase 2-4 (SceneHandler.HandleOpen is the closest existing example of POST+body parsing).

The key technical challenges are: (1) **type resolution** -- resolving a component type name string like "Rigidbody" or "BoxCollider" into a `System.Type` for `AddComponent`; (2) **property value deserialization** -- parsing JSON values back into the correct Unity type for each `SerializedPropertyType` (the inverse of Phase 4's PropertySerializer.ReadValue); and (3) **undo integration** -- using the correct Undo API for each operation type. The Undo system has dedicated methods for each mutation kind (create, destroy, add component, reparent, property change), and using the wrong one results in broken undo or no undo at all. Crucially, `SerializedObject.ApplyModifiedProperties()` handles undo automatically -- it records undo before applying, making property setting the easiest operation to get right.

**Primary recommendation:** Use `ObjectFactory.CreateGameObject` (auto-registers undo) for creation, `Undo.DestroyObjectImmediate` for destruction, `ObjectFactory.AddComponent` (auto-registers undo) for adding components, `SerializedObject.ApplyModifiedProperties()` (auto-records undo) for property setting, and `Undo.RecordObject` + direct Transform assignment for transform manipulation. Build a `PropertyDeserializer` utility (the write-side counterpart to `PropertySerializer`) that maps JSON values to SerializedProperty setters via a type switch mirroring the existing read switch.

## Standard Stack

### Core (already in project -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Commander.js | ^12.1.0 | CLI command registration | Already used for all commands |
| Newtonsoft.Json | (Unity built-in) | JSON serialization/deserialization in Unity plugin | Already used in all handlers |
| fetch (Bun built-in) | N/A | HTTP client in CLI | Already used via `bridge.ts` |

### Unity Editor APIs Used

| API | Namespace | Purpose | Stability |
|-----|-----------|---------|-----------|
| `ObjectFactory.CreateGameObject(name, types)` | UnityEditor | Create GameObject with auto-undo | Stable, auto-registers undo |
| `ObjectFactory.AddComponent(go, type)` | UnityEditor | Add component with auto-undo | Stable, auto-registers undo |
| `Undo.DestroyObjectImmediate(obj)` | UnityEditor | Destroy object with undo support | Stable, fully restores on undo |
| `Undo.SetTransformParent(t, parent, worldPositionStays, name)` | UnityEditor | Set parent with undo | Stable, has worldPositionStays overload |
| `Undo.RecordObject(obj, name)` | UnityEditor | Record pre-change state for undo | Stable, use before direct property assignment |
| `SerializedObject.FindProperty(path)` | UnityEditor | Find property by path for writing | Stable |
| `SerializedObject.ApplyModifiedProperties()` | UnityEditor | Apply changes with automatic undo recording | Stable, auto-records undo |
| `TypeCache.GetTypesDerivedFrom<Component>()` | UnityEditor | Fast cached type lookup for component resolution | Stable (Unity 2019.2+) |
| `EditorUtility.InstanceIDToObject(id)` | UnityEditor | Resolve object reference by instance ID | Stable |
| `SceneService.FindGameObjectByPath(path)` | GameKit.Services | Find GameObject by hierarchy path (existing) | Custom, from Phase 4 |
| `PropertySerializer.ReadValue(prop)` | GameKit.Utils | Read property value after writing for response (existing) | Custom, from Phase 4 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ObjectFactory.CreateGameObject` | `new GameObject()` + `Undo.RegisterCreatedObjectUndo` | ObjectFactory handles undo+presets automatically; manual approach requires explicit registration |
| `ObjectFactory.AddComponent` | `Undo.AddComponent<T>(go)` | ObjectFactory applies presets; Undo.AddComponent is more commonly documented. Both auto-undo. ObjectFactory is strictly better. |
| `TypeCache.GetTypesDerivedFrom` | `System.Type.GetType()` + assembly scanning | TypeCache is cached natively by Unity, much faster; Type.GetType requires fully qualified names with assembly |
| `SerializedObject` for property setting | Direct field assignment via reflection | SerializedObject respects Unity serialization rules, handles undo automatically; reflection bypasses serialization |
| `Undo.RecordObject` for transform | `SerializedObject` on Transform component | Direct assignment to transform.position/rotation/localScale is simpler and universally used; SerializedObject works too but is unnecessarily complex for Transform |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure (new files only)

```
template/Editor/GameKit/
├── Handlers/
│   ├── CreateHandler.cs           # NEW: POST /api/create
│   ├── DestroyHandler.cs          # NEW: POST /api/destroy
│   ├── AddComponentHandler.cs     # NEW: POST /api/add-component
│   ├── SetPropertyHandler.cs      # NEW: POST /api/set
│   └── TransformHandler.cs        # NEW: POST /api/transform
├── Services/
│   └── AuthoringService.cs        # NEW: undo-aware scene mutations
└── Utils/
    └── PropertyDeserializer.cs    # NEW: JSON value -> SerializedProperty write
    └── TypeResolver.cs            # NEW: string type name -> System.Type

src/
├── commands/
│   ├── create.ts                  # NEW: gamekit create <name> [--parent <path>]
│   ├── destroy.ts                 # NEW: gamekit destroy <path>
│   ├── add-component.ts           # NEW: gamekit add-component <path> <type>
│   ├── set.ts                     # NEW: gamekit set <path> <component> <property> <value>
│   └── transform.ts               # NEW: gamekit transform <path> --position --rotation --scale
```

### Pattern 1: POST Handler with JSON Body Parsing (Established)

**What:** Write operations use POST with JSON body, parsed via Newtonsoft JObject.
**When to use:** Every scene authoring endpoint.
**Source:** Existing SceneHandler.HandleOpen pattern.
**Example:**
```csharp
// Source: Existing codebase pattern (SceneHandler.cs)
public static ApiResponse Handle(HttpListenerRequest request)
{
    string body;
    using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
    {
        body = reader.ReadToEnd();
    }

    var json = JObject.Parse(body);
    var name = json["name"]?.ToString();

    if (string.IsNullOrEmpty(name))
        return ApiResponse.Error("INVALID_REQUEST", "Missing 'name' field");

    var result = AuthoringService.CreateGameObject(name, parentPath);
    return ApiResponse.Success(result);
}
```

### Pattern 2: ObjectFactory for Undo-Safe Creation (NEW)

**What:** Use `ObjectFactory.CreateGameObject` and `ObjectFactory.AddComponent` for creation operations -- they auto-register with Unity's Undo system.
**When to use:** Creating GameObjects and adding components.
**Source:** [Unity docs - ObjectFactory](https://docs.unity3d.com/ScriptReference/ObjectFactory.html)
**Example:**
```csharp
// ObjectFactory automatically registers with Undo
var go = ObjectFactory.CreateGameObject(name);
// No need for Undo.RegisterCreatedObjectUndo -- already done

// For parenting, use Undo.SetTransformParent (undo-safe)
if (parent != null)
    Undo.SetTransformParent(go.transform, parent.transform, true, "Set Parent");
```

### Pattern 3: SerializedObject for Undo-Safe Property Writing (NEW)

**What:** Use `SerializedObject.FindProperty()` + setter + `ApplyModifiedProperties()` for property changes. ApplyModifiedProperties auto-records undo.
**When to use:** The `set` command for setting component properties.
**Source:** [Unity docs - SerializedObject.ApplyModifiedProperties](https://docs.unity3d.com/ScriptReference/SerializedObject.ApplyModifiedProperties.html)
**Example:**
```csharp
var so = new SerializedObject(component);
var prop = so.FindProperty(propertyPath);
if (prop == null)
    throw new Exception($"Property not found: {propertyPath}");

// Set value based on property type
PropertyDeserializer.WriteValue(prop, jsonValue);

// ApplyModifiedProperties auto-records undo
so.ApplyModifiedProperties();
```

### Pattern 4: TypeCache for Component Type Resolution (NEW)

**What:** Use `TypeCache.GetTypesDerivedFrom<Component>()` to build a name-to-type map, then match user input against it.
**When to use:** Resolving "Rigidbody" or "BoxCollider" string to System.Type for AddComponent.
**Source:** [Unity docs - TypeCache](https://docs.unity3d.com/ScriptReference/TypeCache.html)
**Example:**
```csharp
public static class TypeResolver
{
    private static Dictionary<string, Type> _componentTypes;

    public static Type ResolveComponentType(string typeName)
    {
        if (_componentTypes == null)
        {
            _componentTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase);
            foreach (var type in TypeCache.GetTypesDerivedFrom<Component>())
            {
                if (type.IsAbstract) continue;
                // Store by short name, skip duplicates (first wins)
                if (!_componentTypes.ContainsKey(type.Name))
                    _componentTypes[type.Name] = type;
            }
        }

        if (_componentTypes.TryGetValue(typeName, out var resolved))
            return resolved;

        // Fallback: try fully qualified name
        var fullType = Type.GetType(typeName);
        if (fullType != null && typeof(Component).IsAssignableFrom(fullType))
            return fullType;

        return null;
    }
}
```

### Pattern 5: Undo.RecordObject for Transform Manipulation (NEW)

**What:** Use `Undo.RecordObject` before directly setting transform properties. Unlike SerializedObject, this is the standard pattern for Transform because transform properties (position, rotation, scale) are commonly set via direct assignment.
**When to use:** The `transform` command.
**Source:** [Unity docs - Undo.RecordObject](https://docs.unity3d.com/ScriptReference/Undo.RecordObject.html)
**Example:**
```csharp
var go = SceneService.FindGameObjectByPath(path);
Undo.RecordObject(go.transform, "Set Transform");

if (position.HasValue)
    go.transform.localPosition = position.Value;
if (rotation.HasValue)
    go.transform.localEulerAngles = rotation.Value;
if (scale.HasValue)
    go.transform.localScale = scale.Value;
```

### Anti-Patterns to Avoid

- **Using `new GameObject()` without Undo registration:** Created objects will not be undoable. Always use `ObjectFactory.CreateGameObject` or manually call `Undo.RegisterCreatedObjectUndo`.
- **Using `Object.DestroyImmediate()` instead of `Undo.DestroyObjectImmediate()`:** Destroyed objects will be gone permanently with no undo capability.
- **Using `transform.parent = x` instead of `Undo.SetTransformParent()`:** Parent changes will not be undoable. The Undo system has a dedicated method for this because parent changes cannot be captured by `Undo.RecordObject` on the transform alone.
- **Using `ApplyModifiedPropertiesWithoutUndo()` instead of `ApplyModifiedProperties()`:** The "WithoutUndo" variant exists for performance in continuous preview scenarios (like color pickers). For CLI-driven one-shot operations, always use the undo-recording variant.
- **Setting properties via direct C# reflection instead of SerializedObject:** Reflection bypasses Unity's serialization rules (e.g., `[SerializeField]` private fields, `[NonSerialized]` public fields), creating inconsistencies between what the Inspector shows and what the code does.
- **Skipping type validation for AddComponent:** Users might type "rigidbody" (lowercase) or "UnityEngine.Rigidbody" (fully qualified). The TypeResolver must handle case-insensitive matching and graceful error messages for unknown types.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Undo-safe object creation | `new GameObject()` + manual undo registration | `ObjectFactory.CreateGameObject()` | Auto-registers undo, applies project presets |
| Undo-safe component addition | `go.AddComponent()` + manual undo | `ObjectFactory.AddComponent()` | Auto-registers undo, applies presets |
| Undo-safe destruction | `Object.DestroyImmediate()` + custom tracking | `Undo.DestroyObjectImmediate()` | Stores full object state for restoration |
| Undo-safe parenting | `transform.parent = x` + `Undo.RecordObject` | `Undo.SetTransformParent()` | Dedicated API that correctly handles parent changes in undo system |
| Undo-safe property changes | Direct field assignment + `EditorUtility.SetDirty` | `SerializedObject.ApplyModifiedProperties()` | Auto-records undo, marks scene dirty, respects serialization rules |
| Component type resolution from string | Assembly scanning with `AppDomain.CurrentDomain.GetAssemblies()` | `TypeCache.GetTypesDerivedFrom<Component>()` | Natively cached by Unity, much faster, no GC pressure |
| Object reference resolution by ID | Scene traversal to find objects | `EditorUtility.InstanceIDToObject(id)` | Direct instance ID lookup, works for any loaded object |

**Key insight:** Unity's Undo system has dedicated methods for every type of scene mutation. Using the wrong method (or no method) results in broken undo. The pattern is: creation uses ObjectFactory (auto-undo), destruction uses `Undo.DestroyObjectImmediate`, parenting uses `Undo.SetTransformParent`, and property changes use `SerializedObject.ApplyModifiedProperties`. Do not mix these patterns.

## Common Pitfalls

### Pitfall 1: Using RecordObject for Operations That Have Dedicated Undo Methods
**What goes wrong:** `Undo.RecordObject` cannot capture AddComponent, DestroyImmediate, or parent changes. Using it for these operations results in silent undo failure -- the operation appears to work but Ctrl+Z does nothing.
**Why it happens:** RecordObject takes a snapshot and diffs at end of frame. Some operations (component add/remove, parent change) are structural changes that cannot be captured by property diffing.
**How to avoid:** Use the dedicated Undo method for each operation type: `ObjectFactory` for create/add, `Undo.DestroyObjectImmediate` for destroy, `Undo.SetTransformParent` for parenting.
**Warning signs:** Ctrl+Z does not undo a create/destroy/parent operation.

### Pitfall 2: Component Type Name Ambiguity
**What goes wrong:** Multiple components share the same short name (e.g., custom "Camera" script vs `UnityEngine.Camera`), or the user types a name that does not exist.
**Why it happens:** TypeCache returns all types derived from Component across all loaded assemblies. Short names are not unique.
**How to avoid:** Use case-insensitive matching. If multiple types match the same short name, prefer UnityEngine/UnityEditor types. If still ambiguous, return an error listing all matches with their full type names. Accept fully qualified names as a disambiguation fallback.
**Warning signs:** Wrong component type gets added silently.

### Pitfall 3: SerializedProperty Type Mismatch During Write
**What goes wrong:** Setting `intValue` on a Float property, or `stringValue` on a Vector3 property, causes silent corruption or exceptions.
**Why it happens:** The CLI receives all values as JSON (strings/numbers/objects), and the PropertyDeserializer must match the target property's `propertyType` exactly before assigning.
**How to avoid:** Always check `prop.propertyType` first, then parse the JSON value accordingly. The PropertyDeserializer should mirror the PropertySerializer's type switch exactly, with write-side equivalents for each case.
**Warning signs:** Properties appear unchanged after set, or Unity console shows serialization errors.

### Pitfall 4: Object Reference Resolution
**What goes wrong:** Setting an ObjectReference property (e.g., a Material slot, a target Transform) requires an actual Unity Object reference, not a string.
**Why it happens:** JSON can only carry identifiers (instance IDs, asset paths), not live object references.
**How to avoid:** Accept instance IDs (from `gamekit inspect` output) or asset paths (for project assets). Use `EditorUtility.InstanceIDToObject(id)` for scene objects and `AssetDatabase.LoadAssetAtPath<Object>(path)` for project assets. Validate the resolved object is the correct type.
**Warning signs:** Object reference fields are set to null when they should have a value, or "type mismatch" errors.

### Pitfall 5: Enum Value Resolution
**What goes wrong:** Setting an enum property fails because the user provides the enum name (e.g., "Dynamic") but the property expects an index.
**Why it happens:** SerializedProperty stores enums as integer indices, not string names.
**How to avoid:** Accept both string names and integer values. For string names, look up the index in `prop.enumNames`. For integer values, validate the index is within bounds.
**Warning signs:** Enum property is set to wrong value, or IndexOutOfRangeException.

### Pitfall 6: Scene Not Marked Dirty After Changes
**What goes wrong:** After creating/modifying objects, the scene does not show the asterisk (*) in the title bar, and changes are silently lost when switching scenes.
**Why it happens:** If the Undo system is not properly engaged, the scene dirty flag is not set.
**How to avoid:** Using `ObjectFactory`, `Undo.*`, and `SerializedObject.ApplyModifiedProperties()` correctly should automatically mark the scene dirty. If not, `EditorSceneManager.MarkSceneDirty()` is the explicit fallback.
**Warning signs:** No asterisk in scene title after modifications, changes lost on scene switch.

### Pitfall 7: Operations During Play Mode
**What goes wrong:** Scene authoring operations during play mode affect the runtime scene, and all changes are lost when play mode exits.
**Why it happens:** In play mode, Unity operates on a runtime copy of the scene. All modifications are discarded on exit.
**How to avoid:** Check `EditorApplication.isPlaying` at the start of every write handler and return a clear error: "Cannot modify scene during play mode. Stop play mode first."
**Warning signs:** User creates objects, exits play mode, objects are gone.

## Code Examples

Verified patterns from official sources and established codebase conventions:

### GameObject Creation (Unity side)
```csharp
// Source: Unity docs - ObjectFactory.CreateGameObject, Undo.SetTransformParent
public static object CreateGameObject(string name, string parentPath)
{
    var go = ObjectFactory.CreateGameObject(name);
    // ObjectFactory auto-registers with Undo

    if (!string.IsNullOrEmpty(parentPath))
    {
        var parent = SceneService.FindGameObjectByPath(parentPath);
        if (parent == null)
            throw new Exception($"Parent not found: {parentPath}");

        Undo.SetTransformParent(go.transform, parent.transform, false, "Set Parent");
    }

    return new
    {
        name = go.name,
        path = GetHierarchyPath(go.transform),
        instanceId = go.GetInstanceID()
    };
}
```

### GameObject Destruction (Unity side)
```csharp
// Source: Unity docs - Undo.DestroyObjectImmediate
public static object DestroyGameObject(string path)
{
    var go = SceneService.FindGameObjectByPath(path);
    if (go == null)
        throw new Exception($"GameObject not found: {path}");

    var name = go.name;
    Undo.DestroyObjectImmediate(go);

    return new { destroyed = name, path };
}
```

### Add Component (Unity side)
```csharp
// Source: Unity docs - ObjectFactory.AddComponent, TypeCache
public static object AddComponent(string gameObjectPath, string typeName)
{
    var go = SceneService.FindGameObjectByPath(gameObjectPath);
    if (go == null)
        throw new Exception($"GameObject not found: {gameObjectPath}");

    var type = TypeResolver.ResolveComponentType(typeName);
    if (type == null)
        throw new Exception($"Component type not found: {typeName}");

    var component = ObjectFactory.AddComponent(go, type);
    // ObjectFactory auto-registers with Undo

    return new
    {
        gameObject = go.name,
        component = component.GetType().Name,
        path = gameObjectPath
    };
}
```

### Set Property (Unity side)
```csharp
// Source: Unity docs - SerializedObject.FindProperty, ApplyModifiedProperties
public static object SetProperty(string gameObjectPath, string componentName,
    string propertyPath, JToken value)
{
    var go = SceneService.FindGameObjectByPath(gameObjectPath);
    if (go == null)
        throw new Exception($"GameObject not found: {gameObjectPath}");

    var component = FindComponentByName(go, componentName);
    if (component == null)
        throw new Exception($"Component not found: {componentName}");

    var so = new SerializedObject(component);
    so.Update();

    var prop = so.FindProperty(propertyPath);
    if (prop == null)
        throw new Exception($"Property not found: {propertyPath}");

    PropertyDeserializer.WriteValue(prop, value);

    // ApplyModifiedProperties auto-records undo
    so.ApplyModifiedProperties();

    // Read back the value to confirm
    so.Update();
    var readProp = so.FindProperty(propertyPath);
    var newValue = PropertySerializer.ReadValue(readProp);

    return new
    {
        gameObject = go.name,
        component = componentName,
        property = propertyPath,
        value = newValue
    };
}
```

### PropertyDeserializer Type Switch (Unity side)
```csharp
// Source: Unity docs - SerializedProperty value setters
public static void WriteValue(SerializedProperty prop, JToken value)
{
    switch (prop.propertyType)
    {
        case SerializedPropertyType.Integer:
            prop.intValue = value.Value<int>();
            break;
        case SerializedPropertyType.Boolean:
            prop.boolValue = value.Value<bool>();
            break;
        case SerializedPropertyType.Float:
            prop.floatValue = value.Value<float>();
            break;
        case SerializedPropertyType.String:
            prop.stringValue = value.Value<string>();
            break;
        case SerializedPropertyType.Enum:
            // Accept both string name and integer index
            if (value.Type == JTokenType.String)
            {
                var enumName = value.Value<string>();
                var index = Array.IndexOf(prop.enumNames, enumName);
                if (index < 0)
                    throw new Exception($"Invalid enum value '{enumName}'. Valid: {string.Join(", ", prop.enumNames)}");
                prop.enumValueIndex = index;
            }
            else
            {
                prop.enumValueIndex = value.Value<int>();
            }
            break;
        case SerializedPropertyType.Color:
            var c = value.ToObject<ColorData>();
            prop.colorValue = new Color(c.r, c.g, c.b, c.a);
            break;
        case SerializedPropertyType.Vector3:
            var v3 = value.ToObject<Vector3Data>();
            prop.vector3Value = new Vector3(v3.x, v3.y, v3.z);
            break;
        case SerializedPropertyType.Vector2:
            var v2 = value.ToObject<Vector2Data>();
            prop.vector2Value = new Vector2(v2.x, v2.y);
            break;
        case SerializedPropertyType.ObjectReference:
            if (value.Type == JTokenType.Integer)
            {
                // Resolve by instance ID
                var obj = EditorUtility.InstanceIDToObject(value.Value<int>());
                prop.objectReferenceValue = obj;
            }
            else if (value.Type == JTokenType.String)
            {
                // Resolve by asset path
                var obj = AssetDatabase.LoadAssetAtPath<Object>(value.Value<string>());
                prop.objectReferenceValue = obj;
            }
            else if (value.Type == JTokenType.Null)
            {
                prop.objectReferenceValue = null;
            }
            break;
        // ... other types
        default:
            throw new Exception($"Unsupported property type: {prop.propertyType}");
    }
}
```

### Transform Manipulation (Unity side)
```csharp
// Source: Unity docs - Undo.RecordObject
public static object SetTransform(string path, Vector3? position, Vector3? rotation, Vector3? scale)
{
    var go = SceneService.FindGameObjectByPath(path);
    if (go == null)
        throw new Exception($"GameObject not found: {path}");

    Undo.RecordObject(go.transform, "Set Transform");

    if (position.HasValue)
        go.transform.localPosition = position.Value;
    if (rotation.HasValue)
        go.transform.localEulerAngles = rotation.Value;
    if (scale.HasValue)
        go.transform.localScale = scale.Value;

    return new
    {
        name = go.name,
        path,
        position = new { x = go.transform.localPosition.x, y = go.transform.localPosition.y, z = go.transform.localPosition.z },
        rotation = new { x = go.transform.localEulerAngles.x, y = go.transform.localEulerAngles.y, z = go.transform.localEulerAngles.z },
        scale = new { x = go.transform.localScale.x, y = go.transform.localScale.y, z = go.transform.localScale.z }
    };
}
```

### CLI Command Pattern (TypeScript side)
```typescript
// Source: Established codebase conventions (scene.ts, play.ts)
import { Command } from 'commander';
import { getConnection, GameKitError } from '../utils/connection.js';
import { request } from '../utils/bridge.js';
import { outputSuccess, outputError, logSuccess, log } from '../utils/output.js';
import type { OutputOptions } from '../utils/output.js';

interface CreateResult {
  name: string;
  path: string;
  instanceId: number;
}

export function registerCreateCommand(program: Command): void {
  program
    .command('create <name>')
    .description('Create a new GameObject in the scene')
    .option('--parent <path>', 'Parent GameObject path')
    .action(async (name: string, opts: { parent?: string }) => {
      try {
        const globalOpts = program.opts() as OutputOptions;
        const info = await getConnection(process.cwd());
        const result = await request<CreateResult>(
          info.port, 'POST', '/create',
          { name, parent: opts.parent }
        );
        outputSuccess(result, globalOpts);
        logSuccess(`Created: ${result.path}`);
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
| `new GameObject()` + `Undo.RegisterCreatedObjectUndo` | `ObjectFactory.CreateGameObject()` | Unity 2018.3+ | ObjectFactory auto-handles undo + presets |
| `go.AddComponent()` + manual undo | `ObjectFactory.AddComponent()` | Unity 2018.3+ | Same auto-undo + preset behavior |
| Assembly scanning for type resolution | `TypeCache.GetTypesDerivedFrom<T>()` | Unity 2019.2+ | Cached natively, order of magnitude faster |
| `EditorUtility.SetDirty()` for scene changes | Undo system auto-marks dirty | Long-standing | SetDirty is only needed for non-undo-tracked changes |
| Per-property type accessor for value setting | `SerializedProperty.boxedValue` | Unity 2022.1+ | Can read/write any property as boxed object, but less type-safe |

**Deprecated/outdated:**
- `EditorUtility.SetDirty(sceneObject)` for marking scene changes -- use Undo system instead, which auto-tracks dirty state
- `EditorApplication.MarkSceneDirty()` -- replaced by `EditorSceneManager.MarkSceneDirty()` (but rarely needed with proper Undo usage)

**Note on boxedValue:** `SerializedProperty.boxedValue` (Unity 2022.1+) could simplify the PropertyDeserializer by avoiding the type switch. However, it boxes value types and has performance overhead. For the initial implementation, use the explicit type switch for clarity and correctness, matching the existing PropertySerializer.ReadValue pattern. Consider boxedValue as a future simplification if supporting Unity 2022.1+ only.

## Open Questions

1. **Should `gamekit set` accept property values as CLI arguments or JSON?**
   - What we know: The CLI syntax is `gamekit set <path> <component> <property> <value>`. For simple types (int, float, string, bool), the value is a single string. For complex types (Vector3, Color), the value needs structure.
   - What's unclear: Whether to parse "1,2,3" as Vector3, or require JSON `{"x":1,"y":2,"z":3}`, or accept both.
   - Recommendation: Accept simple comma-separated syntax for Vector3 ("1,2,3") and Color ("1,0,0,1"), and JSON objects as a fallback for any type. The CLI should parse the value string and convert to a JSON body for the HTTP request. This matches the `--position x,y,z` syntax already planned for the transform command.

2. **Should `gamekit create` support creating primitives (Cube, Sphere, etc.)?**
   - What we know: `ObjectFactory.CreatePrimitive(PrimitiveType)` creates primitives with mesh + collider. This is a common operation for game development.
   - What's unclear: Whether to add `--primitive <type>` flag or a separate command.
   - Recommendation: Add `--primitive <type>` flag to `gamekit create`. When specified, use `ObjectFactory.CreatePrimitive()` instead of `CreateGameObject()`. Primitive types: Sphere, Capsule, Cylinder, Cube, Plane, Quad.

3. **Should write operations during play mode be blocked or warned?**
   - What we know: Changes during play mode are lost when play mode exits. This is a fundamental Unity behavior.
   - What's unclear: Whether there are legitimate use cases for runtime modifications via gamekit.
   - Recommendation: Block all write operations during play mode with a clear error message. This prevents user confusion. If a legitimate use case emerges, a `--force` flag can be added later.

4. **Should `gamekit destroy` support destroying components (not just GameObjects)?**
   - What we know: `Undo.DestroyObjectImmediate` works on both GameObjects and Components. The requirement says "removes a GameObject" but component removal is a natural extension.
   - What's unclear: Whether to add this now or defer.
   - Recommendation: Implement component destruction as part of `gamekit destroy <path> --component <type>`. The Unity-side code is identical (`Undo.DestroyObjectImmediate(component)`). Defer to the planner to decide scope.

## Sources

### Primary (HIGH confidence)
- [Unity docs: ObjectFactory](https://docs.unity3d.com/ScriptReference/ObjectFactory.html) - "The creation process handles Undo registration and applies default values from your project"
- [Unity docs: ObjectFactory.CreateGameObject](https://docs.unity3d.com/ScriptReference/ObjectFactory.CreateGameObject.html) - method signatures and parameters
- [Unity docs: Undo class](https://docs.unity3d.com/ScriptReference/Undo.html) - complete list of all 24 undo methods
- [Unity docs: Undo.DestroyObjectImmediate](https://docs.unity3d.com/ScriptReference/Undo.DestroyObjectImmediate.html) - "stores all destroyed objects in the undo buffer so that they can be fully recreated"
- [Unity docs: Undo.SetTransformParent](https://docs.unity3d.com/ScriptReference/Undo.SetTransformParent.html) - method signature, worldPositionStays overload confirmed
- [Unity docs: Undo.RecordObject](https://docs.unity3d.com/ScriptReference/Undo.RecordObject.html) - "transform parent, AddComponent, object destruction can not be recorded with this function"
- [Unity docs: Undo.AddComponent](https://docs.unity3d.com/ScriptReference/Undo.AddComponent.html) - generic and non-generic overloads
- [Unity docs: SerializedObject.ApplyModifiedProperties](https://docs.unity3d.com/ScriptReference/SerializedObject.ApplyModifiedProperties.html) - "First Undo information is recorded"
- [Unity docs: SerializedProperty](https://docs.unity3d.com/ScriptReference/SerializedProperty.html) - complete list of 30+ writable value accessors
- [Unity docs: TypeCache](https://docs.unity3d.com/ScriptReference/TypeCache.html) - GetTypesDerivedFrom for fast type resolution
- [Unity docs: EditorUtility.InstanceIDToObject](https://docs.unity3d.com/ScriptReference/EditorUtility.InstanceIDToObject.html) - instance ID resolution
- [Unity docs: EditorSceneManager.MarkSceneDirty](https://docs.unity3d.com/ScriptReference/SceneManagement.EditorSceneManager.MarkSceneDirty.html) - scene dirty marking
- [Unity C# Reference: Undo.bindings.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/Undo/Undo.bindings.cs) - complete Undo API source
- [Unity C# Reference: ObjectFactory.bindings.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Editor/Mono/ObjectFactory.bindings.cs) - ObjectFactory source

### Secondary (MEDIUM confidence)
- [Unity Discussions: Undo system not registering changes](https://discussions.unity.com/t/undo-system-not-registering-changes/927392) - common undo pitfalls
- [Unity Discussions: Unable to get Type from string](https://discussions.unity.com/t/unable-to-get-type-from-string-from-the-editor-solved/903315) - type resolution approaches
- [Unity Issue Tracker: worldPositionStays missing from Undo.SetTransformParent](https://issuetracker.unity3d.com/issues/worldpositionstays-argument-is-missing-from-unity-dot-undo-dot-settransformparent-in-comparison-with-transform-dot-setparent) - confirmed overload exists in newer Unity

### Tertiary (LOW confidence)
- None. All findings verified against official Unity documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all Unity APIs well-documented and stable
- Architecture: HIGH - Follows exact patterns from Phases 1-4 (handler/service/command), POST body parsing pattern exists
- Pitfalls: HIGH - Undo system gotchas well-documented in Unity official docs and community discussions
- PropertyDeserializer: HIGH - Mirror of existing PropertySerializer.ReadValue, all setter accessors documented
- Type resolution: HIGH - TypeCache API documented, verified against Unity C# Reference source

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (stable Unity APIs, unlikely to change)
