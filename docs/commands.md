# CLI Commands

Full reference for all gamekit commands.

## gamekit init

Interactive wizard that creates a complete game project.

```bash
gamekit init
```

This will:
1. Find your Unity installations
2. Prompt for project name
3. Let you select Unity version
4. Create a new Unity project
5. Install Claude commands, skills, and agents
6. Configure MCP for Claude ↔ Unity communication
7. Open Unity automatically

## gamekit create-unity [name]

Create a Unity project directly, skipping the interactive prompts.

```bash
gamekit create-unity my-shooter
```

Same as `init`, but you can pass the project name as an argument.

## gamekit install-commands

Add gamekit's Claude commands to an existing Unity project.

```bash
cd my-existing-project
gamekit install-commands
```

Installs:
- **14 slash commands:** `/playtest`, `/build`, `/find-asset`, etc.
- **18 skills:** Adding enemies, UI, physics, etc.
- **6 agents:** game-planner, asset-finder, code-debugger, etc.

Use this when you have an existing Unity project and want to add Claude integration.

## gamekit configure-mcp

Generate `.mcp.json` for Claude Code to connect to Unity.

```bash
cd my-project
gamekit configure-mcp
```

This creates the MCP configuration file that allows Claude to communicate with the Unity Editor.

## gamekit doctor

Diagnose setup issues.

```bash
gamekit doctor
```

Checks:
- Unity installed and findable
- Valid Unity project structure
- Claude commands installed
- MCP configured correctly
- MCP relay available

Run this if something isn't working — it will tell you what's missing.

## Installation Locations

The installer places gamekit at:

| Platform | Location |
|----------|----------|
| macOS / Linux | `~/.gamekit/bin/gamekit` |
| Windows | `%LOCALAPPDATA%\gamekit\bin\gamekit.exe` |

gamekit automatically updates in the background to keep you on the latest version.
