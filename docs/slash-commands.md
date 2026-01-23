# Slash Commands

gamekit installs 14 slash commands for common game development workflows. Type these in Claude Code when working on your project.

## Game Creation

### /new-game [description]

Plan and build a new game from a description.

```
/new-game a roguelike dungeon crawler with procedural generation
```

This command:
1. Creates a design document with scope, mechanics, and milestones
2. Gets your approval on the plan
3. Implements it step by step

Use this for starting fresh or major new features.

### /add-feature [description]

Add a feature to an existing game.

```
/add-feature power-ups that the player can collect
```

Similar to `/new-game` but assumes you have an existing project to build on.

## Testing & Debugging

### /playtest

Build and run the game, then report what happened.

```
/playtest
```

Claude will:
1. Build the game
2. Run it
3. Capture screenshots and console output
4. Report any errors or issues

### /fix [problem]

Fix a specific issue.

```
/fix player falls through the floor sometimes
```

Focused debugging. Claude will investigate and fix the specific problem.

### /screenshot

Capture the current game view.

```
/screenshot
```

Useful for showing Claude what's on screen without a full playtest cycle.

## Building

### /build [platform]

Build the game for a specific platform.

```
/build webgl
/build windows
/build mac
```

Handles platform-specific settings and outputs a playable build.

## Assets

### /find-asset [description]

Search for free assets that match your needs.

```
/find-asset low-poly medieval weapons
```

Claude will search the Unity Asset Store and other sources for free assets you can use.

### /import-asset [url or name]

Import an asset into your project.

```
/import-asset https://assetstore.unity.com/packages/...
```

## Code & Learning

### /explain [topic]

Learn about a game development concept.

```
/explain how state machines work in Unity
/explain the difference between Update and FixedUpdate
```

Claude will explain with examples relevant to your project.

### /show [thing]

Show code or configuration for something in your project.

```
/show player movement script
/show all enemies in the scene
```

### /refactor [description]

Improve existing code.

```
/refactor the player controller to use a state machine
```

## Project Management

### /rollback

Undo recent changes if something broke.

```
/rollback
```

Uses git to revert to a previous state.

### /status

Get an overview of the project state.

```
/status
```

Shows what's implemented, what's in progress, and any known issues.

### /help

List available commands.

```
/help
```

## Tips

- **Be specific:** `/fix player jumps too high` works better than `/fix jumping`
- **One thing at a time:** Let Claude finish one command before starting another
- **Check the output:** Claude will tell you what it did, read it before moving on
- **Use /playtest sparingly:** It's slow, so batch up changes first
