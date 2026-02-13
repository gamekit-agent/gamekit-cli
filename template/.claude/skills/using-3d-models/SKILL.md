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
```bash
# 1. Instantiate the FBX into the scene
gamekit prefab instantiate Assets/Downloaded/Models/model.fbx

# 2. Save the scene object as a proper prefab
gamekit prefab create TempConvert --output Assets/Resources/Prefabs/ModelName.prefab

# 3. Remove the temp object
gamekit destroy TempConvert

# 4. Refresh assets
gamekit refresh

# 5. USE the prefab path in code, NEVER the FBX path
```

---

## The Core Problem

**FBX files are NOT prefabs.** They cannot be loaded at runtime via `Resources.Load<GameObject>()`.

```
Resources.Load<GameObject>("Models/character")  // Returns NULL for FBX
Resources.Load<GameObject>("Prefabs/Character") // Works for actual prefabs
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

### Via gamekit CLI (Preferred - Automatic)

```bash
# Step 1: Instantiate from FBX into scene
gamekit prefab instantiate Assets/Downloaded/Models/character.fbx

# Step 2: Save as prefab
gamekit prefab create character --output Assets/Resources/Prefabs/Character.prefab

# Step 3: Delete temp object
gamekit destroy character

# Step 4: Refresh assets
gamekit refresh
```

### Scene-based (Manual steps)

```
1. Drag FBX from Project into Scene hierarchy
2. Add any needed components (Collider, Rigidbody, scripts)
3. Drag the configured object from Hierarchy back to Project
4. Unity creates a prefab variant
5. Move prefab to Resources/ if needed for runtime loading
```

## Automatic Conversion Pattern

**ALWAYS do this after downloading 3D models:**

```
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

1. Download FBX/OBJ to `Assets/Downloaded/Models/`
2. Refresh Unity assets (`gamekit refresh`)
3. Convert to prefab in `Assets/Resources/Prefabs/`
4. Add needed components (Collider, Rigidbody, scripts)
5. Report PREFAB path to user, not FBX path
6. Use prefab path in any scripts that need runtime loading

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
```bash
# Always refresh after creating prefabs
gamekit refresh
```

## Quick Reference

| Task | Command |
|------|---------|
| Check if FBX | File extension is .fbx, .obj, .blend |
| Instantiate from FBX | `gamekit prefab instantiate path/to/model.fbx` |
| Save as prefab | `gamekit prefab create Name --output Assets/Resources/...` |
| Load at runtime | `Resources.Load<GameObject>("Prefabs/Name")` (no .prefab extension) |
| Refresh assets | `gamekit refresh` |

## Output to User

When working with 3D models, explain:
- "I downloaded the zombie model and converted it to a prefab so it can spawn at runtime"
- "The model is at Assets/Resources/Prefabs/Zombie.prefab - use Resources.Load to spawn it"
- "FBX files can't be loaded at runtime, so I created a prefab version"

---

## REMINDER: This is AUTOMATIC

Claude does NOT wait for `/convert-models` command. The moment an FBX file is involved:

1. **Download** -> Immediately convert to prefab
2. **Write spawning code** -> Use prefab path, convert if needed
3. **User mentions model** -> Check if prefab exists, convert if not
4. **Resources.Load for model** -> ALWAYS use Prefabs/ path

**The `/convert-models` command exists only as a manual fallback if something was missed.**

### Quick Auto-Conversion (Copy-Paste Ready)
```bash
gamekit prefab instantiate Assets/Downloaded/Models/MODEL.fbx
gamekit prefab create MODEL --output Assets/Resources/Prefabs/MODEL.prefab
gamekit destroy MODEL
gamekit refresh
```

Then in code: `Resources.Load<GameObject>("Prefabs/MODEL")`
