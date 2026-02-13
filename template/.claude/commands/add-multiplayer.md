---
description: Add Normcore multiplayer support to the project
---

# /add-multiplayer

Add Normcore multiplayer networking to your game.

## What This Command Does

1. Sets up the Normcore package
2. Creates a Realtime component in the scene
3. Explains how to make objects sync between players

## Process

### Step 1: Add Normcore Package

The Normcore package needs to be added via Unity's Package Manager. Guide the user:

```
To add Normcore:
1. Open Unity > Window > Package Manager
2. Click "+" > "Add package by name"
3. Enter: com.normalvr.normcore
4. Click Add
```

**Note:** If this fails with XR errors, you may need to install XR modules first via Unity Hub.

### Step 2: Create Realtime Object

Create a GameObject with the Realtime component:

```bash
gamekit create Realtime
gamekit add-component Realtime "Normal.Realtime.Realtime"
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
```bash
gamekit add-component Player "Normal.Realtime.RealtimeView"
gamekit add-component Player "Normal.Realtime.RealtimeTransform"
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
