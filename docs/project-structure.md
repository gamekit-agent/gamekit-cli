# Project Structure

After running `gamekit init`, your project will have this structure:

```
my-game/
├── .claude/                    # Claude Code configuration
│   ├── CLAUDE.md               # Project-specific instructions for Claude
│   ├── commands/               # Slash commands
│   ├── skills/                 # Game development skills
│   └── agents/                 # Specialized agents
├── .mcp.json                   # MCP server configuration
├── Assets/
│   └── _Game/                  # Your game files go here
│       ├── Scripts/
│       ├── Prefabs/
│       ├── Scenes/
│       └── ...
├── Packages/
│   └── manifest.json           # Unity packages (includes Unity MCP)
└── ProjectSettings/            # Unity project settings
```

## Key Directories

### .claude/

This is where Claude Code looks for project-specific configuration.

- **CLAUDE.md:** Instructions that Claude reads when starting. Describes the project, coding conventions, and what commands are available.
- **commands/:** Slash commands like `/playtest`, `/build`, `/new-game`. These are markdown files that define prompts.
- **skills/:** Larger capabilities like "add enemy AI" or "create inventory system". Claude uses these when relevant.
- **agents/:** Specialized sub-agents for tasks like planning, debugging, or asset finding.

### Assets/_Game/

gamekit creates a `_Game` folder for your code to keep it separate from Unity's default folders and any packages you import. This makes it easy to see what's yours vs. what's third-party.

### .mcp.json

Configuration file that tells Claude Code how to connect to the Unity MCP server. This enables Claude to:
- Read and modify scenes
- Create and edit scripts
- Access Unity's console output
- Take screenshots of the game view

## Adding to an Existing Project

If you run `gamekit add` in an existing project, it will add:
- The `.claude/` directory with all commands, skills, and agents
- The `.mcp.json` configuration
- The Unity MCP package to your manifest

It won't modify your existing Assets or project structure.
