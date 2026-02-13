# /convert-models

Convert FBX/OBJ files to runtime-ready prefabs.

**User's request:** $ARGUMENTS

## What This Does

FBX and OBJ files cannot be loaded at runtime via `Resources.Load()`. This command converts 3D model files into prefabs that can be spawned, instantiated, and used with multiplayer.

Examples:
- `/convert-models` -> Convert all FBX files in Downloaded/Models/
- `/convert-models zombie.fbx` -> Convert specific file
- `/convert-models Assets/Downloaded/Models/` -> Convert all in folder

## Why This Is Needed

```
Resources.Load<GameObject>("Models/zombie")     // NULL - FBX doesn't work
Resources.Load<GameObject>("Prefabs/Zombie")   // Works - actual prefab
```

FBX files are **source assets** that Unity imports. They are NOT directly instantiable.
To use 3D models at runtime, they must be converted to prefabs.

## Process

### 1. Find FBX/OBJ Files

```bash
# If no specific file given, search for model files
# Use Glob to find: Assets/Downloaded/**/*.fbx, *.obj
```

### 2. For Each Model File

```bash
# Step 1: Instantiate from model into scene
gamekit prefab instantiate Assets/Downloaded/Models/[model].fbx

# Step 2: Save as prefab
gamekit prefab create [ModelName] --output Assets/Resources/Prefabs/[ModelName].prefab

# Step 3: Clean up temp object
gamekit destroy [ModelName]
```

### 3. Refresh Assets

```bash
gamekit refresh
```

### 4. Report Results

```
## Model Conversion Complete

| Source FBX | Created Prefab | Runtime Path |
|------------|----------------|--------------|
| zombie.fbx | Zombie.prefab | "Prefabs/Zombie" |
| ship.fbx | Ship.prefab | "Prefabs/Ship" |

To load at runtime:
```csharp
GameObject zombie = Resources.Load<GameObject>("Prefabs/Zombie");
Instantiate(zombie);
```
```

## Options

### Add Components During Conversion

Ask user:
- Add BoxCollider? (for physics/triggers)
- Add Rigidbody? (for movement/physics)
- Add specific script?

Or auto-detect based on name:
- "enemy" / "character" -> Add Collider + basic setup
- "pickup" / "item" -> Add Collider (trigger) + Rigidbody (kinematic)
- "projectile" -> Add Collider (trigger) + Rigidbody

### Batch Conversion

For multiple files:
```
Converting 5 models...
[1/5] zombie.fbx -> Prefabs/Zombie.prefab
[2/5] skeleton.fbx -> Prefabs/Skeleton.prefab
[3/5] ghost.fbx -> Prefabs/Ghost.prefab
[4/5] boss.fbx -> Prefabs/Boss.prefab
[5/5] coin.fbx -> Prefabs/Coin.prefab

All models converted! Ready for runtime loading.
```

## Folder Structure

```
Before:
Assets/
├── Downloaded/
│   └── Models/
│       ├── zombie.fbx      # Source - can't load at runtime
│       └── spaceship.fbx

After:
Assets/
├── Downloaded/
│   └── Models/
│       ├── zombie.fbx      # Source (kept for reference)
│       └── spaceship.fbx
├── Resources/
│   └── Prefabs/
│       ├── Zombie.prefab   # Runtime-ready!
│       └── Spaceship.prefab
```

## Common Issues

### "Prefab already exists"
- Will overwrite by default
- Can skip if prefab exists (ask user preference)

### "Model has no renderer"
- Some FBX files have nested structure
- May need to find child with MeshRenderer
- Report which child contains the visual

### "Model is huge/tiny"
- FBX scale varies by source
- May need to adjust scale in prefab
- Report actual size and suggest adjustments

## Integration

This command is automatically suggested when:
- Asset-finder downloads FBX/OBJ files
- User tries to use Resources.Load on a model file
- Runtime spawning fails with null reference

## Output to User

After conversion:
```
"Converted zombie.fbx to a prefab at Assets/Resources/Prefabs/Zombie.prefab

To spawn zombies in your code:
  GameObject zombiePrefab = Resources.Load<GameObject>("Prefabs/Zombie");
  Instantiate(zombiePrefab, spawnPosition, Quaternion.identity);

The original FBX is still at Assets/Downloaded/Models/ if you need it."
```
