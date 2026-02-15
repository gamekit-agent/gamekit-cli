# CLI Commands

Full reference for all gamekit commands. All commands output JSON to stdout and human-readable text to stderr. Use `--json` to force JSON output.

## Setup

### gamekit init

Interactive wizard that creates a new Unity project or adds gamekit to an existing one.

```bash
gamekit init          # In an existing Unity project, adds gamekit
gamekit init          # Outside a Unity project, creates a new one
```

When initializing, gamekit:
1. Installs the GameKit Unity plugin to `Assets/Editor/GameKit/`
2. Installs Claude commands, skills, and agents to `.claude/`
3. Ensures required Unity packages (Newtonsoft JSON, Input System, etc.)
4. Configures the Input System to "Both" mode
5. Adds `.gamekit/` to `.gitignore`

### gamekit doctor

Diagnose setup issues and verify the Unity connection.

```bash
gamekit doctor
```

Checks that Unity is running, the GameKit plugin is loaded, and the HTTP bridge is healthy.

### gamekit open

Open the project in the correct Unity Editor version.

```bash
gamekit open
```

Reads the project's `ProjectVersion.txt` and launches the matching Unity Editor.

### gamekit version

Show the installed gamekit CLI version.

```bash
gamekit version
```

## Compilation & Waiting

### gamekit refresh

Trigger Unity recompilation and return structured results.

```bash
gamekit refresh
gamekit refresh --wait    # Wait for Unity to become idle after refresh
```

### gamekit wait

Block until Unity finishes compiling and becomes idle.

```bash
gamekit wait
gamekit wait --timeout 120    # Wait up to 120 seconds (default: 60)
```

**Important:** After writing C# files or running `gamekit refresh`, always run `gamekit wait` before issuing other commands.

## Play Mode

### gamekit play

Control Unity play mode.

```bash
gamekit play start      # Enter play mode
gamekit play stop       # Exit play mode
gamekit play status     # Check current state
```

## Console

### gamekit console

Read Unity console logs.

```bash
gamekit console              # All logs
gamekit console --errors     # Errors only
gamekit console --warnings   # Warnings only
gamekit console --info       # Info only
gamekit console --follow     # Stream logs in real-time (SSE)
gamekit console --limit 10   # Last 10 entries
```

## Scene & Hierarchy

### gamekit scene

List, open, and save scenes.

```bash
gamekit scene list                                  # List all scenes
gamekit scene open MainScene                        # Open a scene
gamekit scene save                                  # Save active scene
gamekit scene save --path Assets/Scenes/Main.unity  # Save to specific path
```

### gamekit hierarchy

Query the scene hierarchy as a JSON tree.

```bash
gamekit hierarchy                        # Full scene tree
gamekit hierarchy --name Player          # Filter by name
gamekit hierarchy --component Camera     # Filter by component type
```

### gamekit inspect

Inspect a GameObject's components and properties.

```bash
gamekit inspect Player               # By name
gamekit inspect "Player/Camera"      # By hierarchy path
```

## Scene Authoring

### gamekit create

Create GameObjects in the scene.

```bash
gamekit create Enemy                  # Create empty GameObject
gamekit create Enemy --parent Level   # With parent
```

### gamekit destroy

Remove GameObjects from the scene.

```bash
gamekit destroy "Level/Enemy"
```

### gamekit transform

Set position, rotation, and scale on GameObjects.

```bash
gamekit transform Cube --position 0,3,0
gamekit transform Cube --rotation 0,45,0
gamekit transform Cube --scale 2,2,2
```

### gamekit add-component

Add a component to a GameObject.

```bash
gamekit add-component Player Rigidbody
```

### gamekit set

Set property values on components.

```bash
gamekit set Player Rigidbody mass 2.5
gamekit set Player Transform localScale 2,2,2
```

## Materials

### gamekit material

Create, configure, and assign materials.

```bash
gamekit material create Red
gamekit material create Red --shader Standard
gamekit material set Assets/Materials/Red.mat _Color 1,0,0,1
gamekit material assign Assets/Materials/Red.mat Cube
```

## Prefabs

### gamekit prefab

Create, instantiate, and query prefabs.

```bash
gamekit prefab create Player                              # Save GameObject as prefab
gamekit prefab instantiate Assets/Prefabs/Enemy.prefab    # Instantiate in scene
gamekit prefab overrides Player                            # Show prefab overrides
```

## Input Simulation

### gamekit input

Simulate keyboard and mouse input during play mode.

```bash
gamekit input key space                  # Tap a key (press + release)
gamekit input key w --hold 0.5           # Hold key for 0.5 seconds
gamekit input key space --down           # Press only (no release)
gamekit input key space --up             # Release only
gamekit input mouse left                 # Left click
gamekit input mouse left --at 400,300    # Click at screen position
gamekit input mouse right --hold 1       # Hold right-click for 1 second
```

Keys: `a`-`z`, `0`-`9`, `space`, `enter`, `escape`, `shift`, `ctrl`, `tab`, `up`/`down`/`left`/`right`, `f1`-`f12`.
Mouse buttons: `left`/`right`/`middle` (or `0`/`1`/`2`).

## Assets & Project Info

### gamekit list

List project assets.

```bash
gamekit list scripts    # List C# files
gamekit list scenes     # List scenes
gamekit list prefabs    # List prefabs
```

### gamekit settings

Show project settings (layers, tags, physics, quality, input).

```bash
gamekit settings
```

### gamekit animator

Query Animator controller states and transitions.

```bash
gamekit animator list Assets/Animations/PlayerController.controller
```

## Screenshots & Build

### gamekit screenshot

Capture screenshots from Unity.

```bash
gamekit screenshot                    # Game view
gamekit screenshot --scene            # Scene view
gamekit screenshot --camera Main      # Specific camera
```

### gamekit build

Trigger a Unity player build.

```bash
gamekit build --platform windows
gamekit build --platform webgl
gamekit build --platform mac
```

### gamekit test

Run Unity Test Framework tests.

```bash
gamekit test
```

## Run Script

### gamekit run-script

Execute arbitrary C# code in the Unity Editor.

```bash
gamekit run-script "Debug.Log(1+1)"
gamekit run-script "EditorUtility.RequestScriptReload()"
gamekit run-script "Selection.activeGameObject.name"
```

The last expression's value becomes the `result` field in the response. Do not use `return`. All Unity module types and user MonoBehaviours from Assembly-CSharp are available.

## Installation Locations

The installer places gamekit at:

| Platform | Location |
|----------|----------|
| macOS / Linux | `~/.gamekit/bin/gamekit` |
| Windows | `%LOCALAPPDATA%\gamekit\bin\gamekit.exe` |

gamekit automatically updates in the background.
