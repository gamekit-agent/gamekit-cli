# How It Works

gamekit connects Claude Code to Unity through a lightweight HTTP bridge.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   You describe  │────▶│  Claude Code    │────▶│     Unity       │
│   what to build │     │  writes code    │     │   runs it       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        ▲
                               │                        │
                               ▼                        │
                        ┌─────────────────┐             │
                        │   gamekit CLI   │─── HTTP ────┘
                        │   commands      │  localhost
                        └─────────────────┘
```

## The Flow

1. **You** describe what you want: a feature, a fix, a new system
2. **Claude Code** reads your project, plans the implementation, writes C# code
3. **gamekit CLI** sends HTTP requests to the Unity Editor plugin to compile, inspect scenes, take screenshots, simulate input, and more
4. **Unity** runs your game so you can test it

## The Unity Plugin

gamekit installs a C# Editor plugin into `Assets/Editor/GameKit/`. This plugin:

- Starts an HTTP server on localhost (port range 17580-17589) when Unity opens
- Exposes Unity Editor APIs as REST endpoints
- Runs on a background thread, dispatching work to Unity's main thread
- Stores connection info in `.gamekit/server.json`

The plugin architecture follows a handler/service pattern:
- **Handlers** parse HTTP requests and return `ApiResponse` envelopes
- **Services** contain the actual Unity logic
- **RequestRouter** dispatches requests to the right handler

## What gamekit init Sets Up

When you run `gamekit init`, it:

1. **Installs the GameKit plugin** into `Assets/Editor/GameKit/`
2. **Ensures Unity packages** — Newtonsoft JSON (serialization), Input System (input simulation), Test Framework, UGUI
3. **Configures input** — Sets `activeInputHandler` to "Both" so legacy `Input` and the new Input System coexist
4. **Installs Claude config** — Commands, skills, and agents in `.claude/`
5. **Configures .gitignore** — Adds `.gamekit/` to prevent committing runtime state

## The Commands Layer

On top of the CLI, gamekit installs slash commands that encode good workflows:

- `/new-game`: Creates a design doc first, then implements step by step
- `/playtest`: Enters play mode, checks for errors, captures screenshots
- `/build`: Handles platform-specific build settings

## Why HTTP?

The CLI-to-Unity HTTP bridge is fast, composable, and scriptable:

- Commands run instantly with minimal overhead
- JSON responses pipe naturally into other tools
- Each command is a single HTTP request (or a small sequence for input simulation)
- The plugin starts automatically — no manual server management
- All scene modifications are undoable (Ctrl+Z in Unity)
