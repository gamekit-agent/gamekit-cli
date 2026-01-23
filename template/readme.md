# Unity + Claude Code Template

This template sets up Claude Code as your Unity game development expert.

## What's Included

- `.claude/` - Claude Code configuration
  - `CLAUDE.md` - Claude's identity as Unity expert
  - `commands/` - User-facing commands (/new-game, /playtest, etc.)
  - `skills/` - Auto-invoked game dev skills
  - `agents/` - Specialized worker agents
  - `settings.local.json` - Permissions and hooks

- `LEARNINGS.md` - Tracks issues and improvements

## Setup Instructions

1. **Create Unity Project**
   - Open Unity Hub
   - Create new 3D project in this folder
   - Or open existing project and copy these files in

2. **Install Unity MCP**
   - Follow instructions at: https://github.com/anthropics/unity-mcp
   - This connects Claude to Unity Editor

3. **Install [Normcore](https://normcore.io/) (Optional)**
   - For multiplayer support
   - Package Manager → Add by name: `com.normalvr.normcore`

4. **Start Building**
   - Open Claude Code in this folder
   - Say "I want to make a [game type]" or use `/new-game`

## Commands Available

| Command | Purpose |
|---------|---------|
| `/new-game [idea]` | Start a new game with planning |
| `/playtest` | Test and catch errors |
| `/auto-test` | Automated testing without manual play |
| `/build [platform]` | Build for platforms |
| `/find-asset [thing]` | Search for free assets |
| `/preview-assets [thing]` | Preview assets before downloading |
| `/explain [topic]` | Learn about concepts |
| `/fix [problem]` | Fix something specific |
| `/snapshot` | Capture full scene state |
| `/screenshot` | Capture game view for visual verification |
| `/rollback` | Undo recent changes |
| `/convert-models` | Convert FBX to prefabs |

## Autonomous Quality Features

This template includes self-verification capabilities that let Claude iterate until quality is high:

### Auto-Triggered Skills
- **scene-awareness** - Captures state before/after changes for rollback
- **verify-changes** - Automatically tests and fixes after modifications
- **quality-gate** - Checks quality before presenting work as "done"
- **using-3d-models** - Auto-converts FBX to prefabs

### Iteration Agent
The `iterator` agent orchestrates build-test-fix cycles:
1. Build the feature
2. Test automatically
3. Fix any issues
4. Repeat until quality gate passes

### Visual Verification
Claude can take screenshots of the game to verify:
- UI looks correct
- Materials are applied
- Positions are right
- Overall visual quality

## How It Works

Just describe the game you want. Claude handles all Unity implementation AND verifies its own work.

"I want a platformer where you collect coins" → Claude builds it, tests it, fixes issues, and only shows you the working result.

## Skills (18 total)

### Game Building
- `adding-player` - Player movement and controls
- `adding-enemies` - Enemy AI and behavior
- `adding-collectibles` - Pickups and rewards
- `adding-audio` - Sound effects and music
- `adding-ui` - Health bars, scores, menus
- `adding-juice` - Screen shake, particles, polish

### Technical
- `setting-up-physics` - Collisions and rigidbodies
- `setting-up-triggers` - Trigger detection
- `setting-up-cameras` - Camera follow and setup
- `creating-animations` - Animation controllers
- `creating-materials` - Colors and textures
- `using-3d-models` - FBX to prefab conversion

### Progression
- `level-progression` - Scenes, saves, checkpoints
- `multiplayer-setup` - Normcore integration
- `quick-tweaks` - Speed, size, color adjustments

### Quality (NEW)
- `scene-awareness` - State capture for rollback
- `verify-changes` - Auto test-fix loop
- `quality-gate` - Quality checklist before done

## Agents (6 total)

- `game-planner` - Creates game design documents
- `asset-finder` - Searches and downloads free assets
- `level-designer` - Builds game levels
- `code-debugger` - Finds and fixes bugs
- `optimizer` - Improves performance
- `iterator` - Orchestrates quality iteration (NEW)

Template created by [gamekit-cli](https://github.com/gamekit-agent/gamekit-cli) & the team at [Normal](https://normcore.io).
