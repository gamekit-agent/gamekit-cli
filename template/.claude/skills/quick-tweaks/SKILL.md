---
description: Quick adjustments to game values - speeds, sizes, colors, difficulty
---

# Quick Tweaks

Use this skill when the user wants to make simple adjustments to existing game elements. This is for iteration, not creation.

## Trigger Phrases

**Speed adjustments:**
- "make it faster", "slow down", "speed up"
- "too fast", "too slow"
- "increase speed", "decrease speed"

**Size adjustments:**
- "make it bigger", "make it smaller"
- "too big", "too small"
- "scale up", "scale down"

**Color changes:**
- "change color to...", "make it red/blue/green"
- "darker", "lighter", "brighter"

**Difficulty:**
- "make it harder", "make it easier"
- "too easy", "too hard"
- "more challenging"

**Quantity:**
- "more enemies", "fewer enemies"
- "spawn faster", "spawn slower"

## Quick Reference: Common Tweaks

### Speed Adjustments

| What | Property | Location |
|------|----------|----------|
| Player movement | `speed` or `moveSpeed` | Player script |
| Enemy movement | `speed` | Enemy AI script |
| Projectile speed | `speed` | Projectile script |
| Spawn rate | `spawnInterval` | Spawner script |
| Animation speed | `speed` multiplier | Animator |

**Typical multipliers:**
- "a bit faster" = 1.25x
- "faster" = 1.5x
- "much faster" = 2x
- "a bit slower" = 0.8x
- "slower" = 0.5x

### Size Adjustments

```
manage_gameobject action="modify" target="[name]" scale=[x, y, z]
```

**Typical multipliers:**
- "a bit bigger" = 1.25x current
- "bigger" = 1.5x current
- "much bigger" = 2x current
- "smaller" = 0.75x current
- "much smaller" = 0.5x current

**Note:** When scaling, consider:
- Collider might need adjustment
- Speed might feel different at new scale
- Camera framing might need update

### Color Changes

```
manage_gameobject action="set_component_property"
  target="[name]"
  component_name="MeshRenderer"
  component_properties={"MeshRenderer": {"material.color": [r, g, b, 1]}}
```

**Color presets (RGBA 0-1):**
| Color | Values |
|-------|--------|
| Red | [1, 0, 0, 1] |
| Green | [0, 1, 0, 1] |
| Blue | [0, 0, 1, 1] |
| Yellow | [1, 1, 0, 1] |
| Orange | [1, 0.5, 0, 1] |
| Purple | [0.5, 0, 1, 1] |
| Pink | [1, 0.4, 0.7, 1] |
| Cyan | [0, 1, 1, 1] |
| White | [1, 1, 1, 1] |
| Black | [0, 0, 0, 1] |
| Gold | [1, 0.84, 0, 1] |
| Silver | [0.75, 0.75, 0.75, 1] |

**Lighter/Darker:**
- Lighter: Multiply each RGB by 1.3 (cap at 1)
- Darker: Multiply each RGB by 0.7

### Difficulty Adjustments

**"Make it harder":**
- Increase enemy speed by 1.25x
- Decrease player health
- Increase enemy damage
- Faster spawn rates
- More enemies per wave

**"Make it easier":**
- Decrease enemy speed by 0.8x
- Increase player health
- Decrease enemy damage
- Slower spawn rates
- Fewer enemies per wave

### Spawn Rate Adjustments

Find spawner script and modify:
```csharp
public float spawnInterval = 3f; // Lower = more frequent
public int maxEnemies = 10;      // Higher = more on screen
public int spawnCount = 1;       // Higher = more per spawn
```

**Adjustments:**
- "spawn faster" = spawnInterval * 0.7
- "spawn slower" = spawnInterval * 1.5
- "more at once" = spawnCount + 1 or + 2

## Implementation Pattern

### 1. Identify what to change
```
User: "make the player faster"
Target: Player GameObject
Property: speed in movement script
```

### 2. Get current value
```
manage_gameobject action="get_components" target="Player"
// Find the movement script and current speed value
```

### 3. Calculate new value
```
Current: 5
Request: "faster"
Multiplier: 1.5x
New value: 7.5
```

### 4. Apply change
```
manage_script action="read" name="PlayerMovement"
// Edit the script to change the default, OR
// Use manage_gameobject to change instance value
```

### 5. Confirm to user
```
"I increased the player speed from 5 to 7.5 (50% faster).
Try it out - let me know if you want it even faster!"
```

## Batch Tweaks

When user says "make everything faster/bigger":

1. Identify all relevant objects
2. Apply consistent multiplier to each
3. Report all changes made

Example for "make enemies faster":
```
Found 3 enemy types:
- BasicEnemy: 3 -> 4.5
- FastEnemy: 6 -> 9
- Boss: 2 -> 3
All enemies are now 50% faster.
```

## Script Modification Patterns

### Changing a public variable default

Read the script, find the line:
```csharp
public float speed = 5f;
```

Change to:
```csharp
public float speed = 7.5f;
```

### Changing a serialized instance value

If value is set per-instance in the inspector:
```
manage_gameobject action="set_component_property"
  target="Player"
  component_name="PlayerMovement"
  component_properties={"PlayerMovement": {"speed": 7.5}}
```

## Communication Style

Always tell user:
1. What was changed
2. From what value to what value
3. How to test it
4. Offer further adjustment

Examples:
- "Doubled the asteroid speed from 2 to 4. They'll fall much faster now!"
- "Made the player 50% bigger. The hitbox scaled too, so collisions still work."
- "Changed all enemies from red to purple. Looking spooky!"
- "Increased difficulty: enemies are faster, spawn more frequently, and deal more damage."
