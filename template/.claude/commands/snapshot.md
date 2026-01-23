# /snapshot

Capture and display the complete state of the current Unity scene.

**User's request:** $ARGUMENTS

## What This Does

Takes a comprehensive snapshot of everything in the current scene - all GameObjects, their components, hierarchy, physics setup, cameras, UI, and more. This gives Claude complete context to debug, modify, or understand the game state.

Examples:
- `/snapshot` -> Full scene overview
- `/snapshot player` -> Focus on player-related objects
- `/snapshot physics` -> Show physics setup (layers, colliders)
- `/snapshot ui` -> Show UI canvas and elements
- `/snapshot enemies` -> Show all enemy objects

## Steps

1. Get the scene hierarchy (all GameObjects)
2. Gather component information for key objects
3. Check physics layer configuration
4. Identify cameras and their setup
5. Check UI canvas state
6. Report lighting/rendering info
7. Present organized summary

## Process

### Scene Hierarchy
```
1. manage_scene action="get_hierarchy" - Get full hierarchy tree
2. Parse and organize by category:
   - Players (tag: Player)
   - Enemies (tag: Enemy)
   - Collectibles (tag: Pickup, Collectible)
   - Environment (floors, walls, platforms)
   - UI (Canvas objects)
   - Cameras
   - Lights
   - Managers (singletons, spawners)
```

### Key Object Details
```
For important objects (Player, main Camera, key managers):
1. manage_gameobject action="get_components" target="[name]"
2. Record: Transform, Rigidbody settings, Collider setup, custom scripts
```

### Physics State
```
1. manage_physics action="get_layer_names" - Get all layers
2. manage_physics action="get_collision_matrix" - Get what collides with what
3. manage_physics action="get_3d_settings" - Global physics settings
```

### Camera Setup
```
1. manage_gameobject action="find" search_term="Camera" search_method="by_component" find_all=true
2. For each camera: get position, projection, follow target
```

### UI State
```
1. manage_gameobject action="find" search_term="Canvas" search_method="by_component" find_all=true
2. List UI elements: health bars, score displays, menus
```

### Lighting/Rendering
```
1. manage_rendering action="get_lighting_info"
2. manage_rendering action="get_rendering_info"
```

## Output Format

Present the snapshot in organized sections:

```
## Scene Snapshot: [Scene Name]

### Hierarchy Overview
- Total GameObjects: X
- Players: X
- Enemies: X
- Collectibles: X
- UI Elements: X

### Player Setup
- Position: (x, y, z)
- Components: [list]
- Movement: [type/speed]
- Health: [current/max]

### Enemies (X total)
[List each with position, AI type, health]

### Collectibles (X total)
[List types and counts]

### Physics Configuration
- Gravity: (x, y, z)
- Collision Layers: [relevant pairs]

### Cameras
[List cameras with their setup]

### UI Elements
[List canvases and their children]

### Potential Issues
[Flag anything that looks misconfigured]
```

## When to Use

Claude should use /snapshot when:
- Starting to debug an issue
- Before making significant changes
- User asks "what's in my scene"
- Need to understand current game state
- Checking if setup is correct

## Focused Snapshots

If user specifies a focus area:

**`/snapshot player`**
- Player GameObject details
- All player-related scripts
- Input configuration
- Health/damage setup

**`/snapshot physics`**
- All Rigidbodies and their settings
- All Colliders (trigger vs solid)
- Layer collision matrix
- Physics materials

**`/snapshot ui`**
- All Canvases
- UI element hierarchy
- Anchoring setup
- Event system

**`/snapshot enemies`**
- All tagged enemies
- AI configurations
- Spawn points
- Health values

**`/snapshot audio`**
- AudioSources in scene
- AudioManager setup
- Volume levels
