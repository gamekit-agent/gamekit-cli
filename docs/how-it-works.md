# How It Works

gamekit connects Claude Code to Unity through MCP (Model Context Protocol).

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   You describe  │────▶│  Claude Code    │────▶│     Unity       │
│   what to build │     │  writes code    │     │   runs it       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               ▲
                               │
                               ▼
                        ┌─────────────────┐
                        │   Unity MCP     │
                        │   server        │
                        └─────────────────┘
```

## The Flow

1. **You** describe what you want: a feature, a fix, a new system
2. **Claude Code** reads your project, plans the implementation, writes code
3. **Unity MCP** gives Claude access to the Unity Editor — scenes, scripts, console, screenshots
4. **Unity** runs your game so you can test it

## What is MCP?

MCP (Model Context Protocol) is a standard for connecting AI assistants to external tools. The Unity MCP server runs inside the Unity Editor and exposes capabilities like:

- **Scene access:** Read and modify GameObjects, components, hierarchy
- **Script management:** Create, read, update C# files
- **Console output:** See errors, warnings, logs
- **Screenshots:** Capture the game view or scene view
- **Build system:** Trigger builds for different platforms

## What gamekit Sets Up

When you run `gamekit init`, it:

1. **Creates a Unity project** with the standard folder structure
2. **Installs Unity MCP** as a package dependency
3. **Generates .mcp.json** so Claude Code knows how to connect
4. **Installs slash commands** that wrap common workflows (`/playtest`, `/build`, etc.)
5. **Installs skills and agents** for more complex tasks

## The Commands Layer

On top of MCP, gamekit installs slash commands that encode good workflows:

- `/new-game`: Creates a design doc first, then implements
- `/playtest`: Builds, runs, captures output, reports issues
- `/build`: Handles platform-specific build settings

## Why This Approach?

Direct MCP access is powerful but low-level. The commands layer adds:

- **Guardrails:** Encourages planning before coding
- **Best practices:** Encodes patterns that work well
- **Discoverability:** You can see what's available with `/help`

You can always bypass the commands and talk to Claude directly. The commands are shortcuts, not restrictions.
