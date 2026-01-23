---
description: Add Normcore multiplayer support to the project
---

# /add-multiplayer

Add Normcore multiplayer networking to your game.

## What This Command Does

1. Installs the Normcore package
2. Creates a Realtime component in the scene
3. Explains how to make objects sync between players

## Process

### Step 1: Add Normcore Package

First, add the Normcore scoped registry and package:

```bash
# The package manager will handle this
mcp__unity-mcp__manage_packagemanager action="add_package" package_id="com.normalvr.normcore"
```

**Note:** If this fails with XR errors, you may need to install XR modules first via Unity Hub.

### Step 2: Create Realtime Object

Create a GameObject with the Realtime component:

```
mcp__unity-mcp__manage_gameobject action="create" name="Realtime"
mcp__unity-mcp__manage_gameobject action="add_component" target="Realtime" component_name="Normal.Realtime.Realtime"
```

### Step 3: Configure App Key

Tell the user:
```
To connect players:
1. Go to https://normcore.io/dashboard
2. Create a free account
3. Create an app and copy the App Key
4. Select the Realtime object in Unity
5. Paste your App Key in the Inspector
```

### Step 4: Make Objects Sync

For any object that should sync between players:

1. Add `RealtimeView` component
2. Add `RealtimeTransform` for position/rotation sync
3. For custom data, create a `RealtimeModel`

Example for player:
```
mcp__unity-mcp__manage_gameobject action="add_component" target="Player" component_name="Normal.Realtime.RealtimeView"
mcp__unity-mcp__manage_gameobject action="add_component" target="Player" component_name="Normal.Realtime.RealtimeTransform"
```

### Step 5: Move Prefabs to Resources

Any prefab that spawns at runtime must be in `Assets/Resources/`:

```bash
mkdir -p Assets/Resources
# Move prefabs there
```

Use `Realtime.Instantiate()` instead of `GameObject.Instantiate()` for networked spawning.

## Quick Reference

| Component | Purpose |
|-----------|---------|
| `Realtime` | Connects to Normcore servers (one per scene) |
| `RealtimeView` | Identifies a networked object |
| `RealtimeTransform` | Syncs position/rotation |
| `RealtimeModel` | Custom synced data (health, score, etc.) |

## Ownership

Only the owner of an object can modify it:
```csharp
if (realtimeView.isOwnedLocallySelf)
{
    // Only the owner can move this object
    transform.position += movement;
}
```

Request ownership when needed:
```csharp
realtimeView.RequestOwnership();
```

## Common Patterns

### Synced Player Spawning
```csharp
// In a manager script
var player = Realtime.Instantiate("PlayerPrefab", position, rotation);
```

### Synced Collectible
```csharp
// When collected, destroy for everyone
Realtime.Destroy(gameObject);
```

## Troubleshooting

**XR Compilation Errors:**
Normcore requires XR modules. Install via Unity Hub > Installs > Your Version > Add Modules > XR.

**Objects Not Syncing:**
- Check RealtimeView is on the object
- Check the object is owned (green = owned, red = not owned in hierarchy)
- Ensure Realtime component has valid App Key

## Documentation

Full Normcore docs: https://normcore.io/documentation
