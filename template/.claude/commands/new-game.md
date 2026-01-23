---
description: Start creating a new game from scratch with planning and setup
---

# /new-game

Start a new game project with proper planning.

**User's game idea:** $ARGUMENTS

## What This Command Does

This is the starting point for any new game. It:
1. Delegates to `game-planner` agent to create a design document
2. Sets up the project structure
3. Spawns `asset-finder` agents to search for needed assets in parallel
4. Begins building the core game

## Process

### Step 1: Plan the Game
Delegate to `game-planner` agent with the user's description.
The agent will create `GAME_DESIGN.md` with:
- Core concept and mechanics
- Player abilities and controls
- Enemies, collectibles, hazards
- Milestones for implementation
- Asset list

### Step 2: Find and Download Assets (Parallel)
Based on the design doc, spawn multiple `asset-finder` agents to search for:
- Character models/sprites
- Environment assets
- Sound effects
- Music

**Asset Download Priority (by reliability):**
1. **OpenGameArt.org** - Auto-download works! Use direct links from `/sites/default/files/`
2. **Other sources** - Search and provide manual download links

**After downloading, ALWAYS:**
1. Verify file type with `file` command
2. If HTML returned, provide manual download instructions
3. Move sounds to `Assets/Resources/` for runtime loading
4. Refresh Unity AssetDatabase

### Step 3: Create Project Structure
Set up folders:
```
Assets/
├── _Game/
│   ├── Scenes/
│   ├── Scripts/
│   ├── Prefabs/
│   └── Materials/
├── Resources/  (for multiplayer prefabs)
└── Downloaded/ (for imported assets)
```

### Step 4: Build Milestone 1
Start implementing the first milestone from the design doc:
- Create main scene
- Build player with controls
- Set up camera
- Basic gameplay loop

## What Claude Does Automatically

When building the game, Claude will automatically use skills for:
- Adding player characters (`adding-player`)
- Creating enemies (`adding-enemies`)
- Setting up collectibles (`adding-collectibles`)
- Physics and collisions (`setting-up-physics`)
- UI elements (`adding-ui`)
- Multiplayer sync (`multiplayer-setup`)

The user doesn't need to know about these - Claude handles the technical details.

## Example Usage

User types: `/new-game space shooter where you dodge asteroids`

Claude:
1. Creates design doc for space shooter
2. Searches for spaceship, asteroid, explosion assets
3. Sets up top-down scene with space background
4. Creates player ship with movement
5. Adds asteroid spawning
6. Sets up shooting mechanic
7. Adds score UI
8. Configures for multiplayer

## Output to User

Keep the user informed without technical jargon:
- "I'm planning out your space shooter game..."
- "Searching for spaceship and asteroid models..."
- "Building your player ship - you'll control it with WASD..."
- "Adding asteroids that float toward you..."
- "Your game is ready to test! Press Play in Unity."
