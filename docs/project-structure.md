# Project Structure

After running `gamekit init`, your project will have this structure:

```
my-game/
├── .claude/                    # Claude Code configuration
│   ├── CLAUDE.md               # Project-specific instructions for Claude
│   ├── commands/               # Slash commands (/playtest, /build, etc.)
│   ├── skills/                 # Game development skills
│   └── agents/                 # Specialized agents
├── .gamekit/                   # Runtime state (gitignored)
│   └── server.json             # Plugin connection info (port, PID)
├── Assets/
│   ├── Editor/
│   │   └── GameKit/            # GameKit Unity plugin
│   │       ├── GameKitServer.cs
│   │       ├── RequestRouter.cs
│   │       ├── Handlers/       # HTTP request handlers
│   │       ├── Services/       # Unity logic
│   │       └── Models/         # Data models
│   └── _Game/                  # Your game files go here
│       ├── Scripts/
│       ├── Prefabs/
│       ├── Scenes/
│       └── Materials/
├── Packages/
│   └── manifest.json           # Unity packages
└── ProjectSettings/            # Unity project settings
```

## Key Directories

### .claude/

This is where Claude Code looks for project-specific configuration.

- **CLAUDE.md:** Instructions that Claude reads when starting. Describes the project, coding conventions, and available gamekit commands.
- **commands/:** Slash commands like `/playtest`, `/build`, `/new-game`. These are markdown files that define prompts.
- **skills/:** Larger capabilities like "add enemy AI" or "create inventory system". Claude uses these when relevant.
- **agents/:** Specialized sub-agents for tasks like planning, debugging, or asset finding.

### Assets/Editor/GameKit/

The GameKit Unity plugin. This runs an HTTP server inside the Unity Editor that the gamekit CLI communicates with. It starts automatically when Unity opens the project.

### Assets/_Game/

gamekit creates a `_Game` folder for your code to keep it separate from Unity's default folders and any packages you import. This makes it easy to see what's yours vs. what's third-party.

### .gamekit/

Runtime state directory (gitignored). Contains `server.json` with the port and PID of the running plugin, used by the CLI to discover the connection.

## Adding to an Existing Project

If you run `gamekit init` inside an existing Unity project, it will add:
- The GameKit plugin to `Assets/Editor/GameKit/`
- The `.claude/` directory with commands, skills, and agents
- Required Unity packages to `Packages/manifest.json`

It won't modify your existing Assets or project structure.
