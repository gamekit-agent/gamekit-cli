---
description: Working with 3D models (FBX, OBJ) - importing, converting to prefabs, runtime loading
---

# Using 3D Models

## AUTOMATIC BEHAVIOR - Claude MUST do this without being asked

**Whenever Claude downloads, imports, or works with FBX/OBJ files, IMMEDIATELY convert them to prefabs.**

This is NOT optional. Do NOT wait for user to ask. Do NOT use the FBX path in code.

### Trigger Conditions (Auto-Apply)
- Asset-finder downloads a .fbx, .obj, or .blend file
- User mentions "3D model", "downloaded model", "FBX"
- Writing code that needs to spawn/instantiate a model
- Any `Resources.Load<GameObject>()` involving models

### Automatic Conversion Steps
```
1. manage_gameobject action="create" name="TempConvert" prefab_path="Assets/Downloaded/Models/model.fbx"
2. manage_gameobject action="save_as_prefab" target="TempConvert" prefab_path="Assets/Resources/Prefabs/ModelName.prefab"
3. manage_gameobject action="delete" target="TempConvert"
4. manage_asset action="refresh"
5. USE the prefab path in code, NEVER the FBX path
```

---

## The Core Problem

**FBX files are NOT prefabs.** They cannot be loaded at runtime via `Resources.Load<GameObject>()`.

```
❌ Resources.Load<GameObject>("Models/character")  // Returns NULL for FBX
✅ Resources.Load<GameObject>("Prefabs/Character") // Works for actual prefabs
```

## When This Matters

| Scenario | FBX Works? | Prefab Needed? |
|----------|------------|----------------|
| Drag into scene in Editor | Yes | No |
| Assign via Inspector (SerializeField) | Yes | No |
| Instantiate at runtime | **NO** | **YES** |
| Resources.Load() | **NO** | **YES** |
| Spawning enemies/items | **NO** | **YES** |
| Multiplayer networked objects | **NO** | **YES** |

## Solution: Convert FBX to Prefab

### Method 1: Via MCP (Preferred - Automatic)

```
Step 1: Create temporary instance from FBX
manage_gameobject action="create"
  name="TempModel"
  prefab_path="Assets/Downloaded/Models/character.fbx"

Step 2: Save as prefab
manage_gameobject action="save_as_prefab"
  target="TempModel"
  prefab_path="Assets/Resources/Prefabs/Character.prefab"

Step 3: Delete temp object
manage_gameobject action="delete" target="TempModel"

Step 4: Refresh assets
manage_asset action="refresh"
```

### Method 2: Using manage_asset directly

```
For prefab operations on FBX:
manage_asset action="create"
  path="Assets/Resources/Prefabs/Character.prefab"
  asset_type="Prefab"
  properties={
    "sourceModel": "Assets/Downloaded/Models/character.fbx"
  }
```

### Method 3: Scene-based (Manual steps)

```
1. Drag FBX from Project into Scene hierarchy
2. Add any needed components (Collider, Rigidbody, scripts)
3. Drag the configured object from Hierarchy back to Project
4. Unity creates a prefab variant
5. Move prefab to Resources/ if needed for runtime loading
```

## Automatic Conversion Pattern

**ALWAYS do this after downloading 3D models:**

```python
# After asset-finder downloads an FBX:
1. Check file type (is it .fbx, .obj, .blend?)
2. If yes, immediately convert to prefab
3. Place prefab in Resources/Prefabs/ for runtime access
4. Report the PREFAB path to user, not the FBX path
```

## Runtime Loading Patterns

### For Spawnable Objects (enemies, items, projectiles)

```csharp
// WRONG - FBX files return null
GameObject enemy = Resources.Load<GameObject>("Models/Zombie");
Instantiate(enemy); // NullReferenceException!

// RIGHT - Load converted prefab
GameObject enemyPrefab = Resources.Load<GameObject>("Prefabs/Zombie");
Instantiate(enemyPrefab); // Works!
```

### For Dynamically-Created Components

```csharp
// WRONG - SerializeField won't be populated
public class MiniGame : MonoBehaviour
{
    [SerializeField] GameObject model; // NULL if AddComponent<MiniGame>()
}

// RIGHT - Load from Resources in Awake/Start
public class MiniGame : MonoBehaviour
{
    private GameObject model;

    void Awake()
    {
        model = Resources.Load<GameObject>("Prefabs/MyModel");
    }
}
```

### For Visual-Only Objects (no runtime spawning)

```csharp
// If you just need a visual and don't spawn at runtime,
// create primitives programmatically:
GameObject visual = GameObject.CreatePrimitive(PrimitiveType.Cube);
visual.transform.localScale = new Vector3(1, 2, 0.5f);
visual.GetComponent<Renderer>().material.color = Color.red;
```

## Folder Structure for 3D Models

```
Assets/
├── Downloaded/
│   └── Models/           # Raw FBX/OBJ files (source)
│       ├── zombie.fbx
│       └── spaceship.fbx
├── Resources/
│   └── Prefabs/          # Converted prefabs (runtime-ready)
│       ├── Zombie.prefab
│       └── Spaceship.prefab
└── _Game/
    └── Prefabs/          # Game-specific prefabs (may not need runtime loading)
```

## Checklist: After Downloading 3D Models

1. ✅ Download FBX/OBJ to `Assets/Downloaded/Models/`
2. ✅ Refresh Unity assets (`manage_asset action="refresh"`)
3. ✅ Convert to prefab in `Assets/Resources/Prefabs/`
4. ✅ Add needed components (Collider, Rigidbody, scripts)
5. ✅ Report PREFAB path to user, not FBX path
6. ✅ Use prefab path in any scripts that need runtime loading

## Common Mistakes

### Mistake 1: Using FBX path in Resources.Load
```csharp
// WRONG
var model = Resources.Load<GameObject>("Downloaded/Models/character");

// RIGHT
var model = Resources.Load<GameObject>("Prefabs/Character");
```

### Mistake 2: Expecting SerializeField to work on runtime-added components
```csharp
// If you do this:
gameObject.AddComponent<EnemyVisual>();

// SerializeField references will be NULL
// Must use Resources.Load or pass references via code
```

### Mistake 3: Not refreshing assets after conversion
```
// Always refresh after creating prefabs
manage_asset action="refresh"
```

## Quick Reference

| Task | Command |
|------|---------|
| Check if FBX | File extension is .fbx, .obj, .blend |
| Create from FBX | `manage_gameobject action="create" prefab_path="path/to/model.fbx"` |
| Save as prefab | `manage_gameobject action="save_as_prefab" target="Name" prefab_path="Assets/Resources/..."` |
| Load at runtime | `Resources.Load<GameObject>("Prefabs/Name")` (no .prefab extension) |
| Refresh assets | `manage_asset action="refresh"` |

## Output to User

When working with 3D models, explain:
- "I downloaded the zombie model and converted it to a prefab so it can spawn at runtime"
- "The model is at Assets/Resources/Prefabs/Zombie.prefab - use Resources.Load to spawn it"
- "FBX files can't be loaded at runtime, so I created a prefab version"

---

## REMINDER: This is AUTOMATIC

Claude does NOT wait for `/convert-models` command. The moment an FBX file is involved:

1. ✅ **Download** → Immediately convert to prefab
2. ✅ **Write spawning code** → Use prefab path, convert if needed
3. ✅ **User mentions model** → Check if prefab exists, convert if not
4. ✅ **Resources.Load for model** → ALWAYS use Prefabs/ path

**The `/convert-models` command exists only as a manual fallback if something was missed.**

### Quick Auto-Conversion (Copy-Paste Ready)
```
manage_gameobject action="create" name="TempConvert" prefab_path="Assets/Downloaded/Models/MODEL.fbx"
manage_gameobject action="save_as_prefab" target="TempConvert" prefab_path="Assets/Resources/Prefabs/MODEL.prefab"
manage_gameobject action="delete" target="TempConvert"
manage_asset action="refresh"
```

Then in code: `Resources.Load<GameObject>("Prefabs/MODEL")`
