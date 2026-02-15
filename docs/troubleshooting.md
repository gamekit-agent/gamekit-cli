# Troubleshooting

Common issues and how to fix them.

## Unity not found

**Symptom:** `gamekit init` says it can't find Unity.

**Fix:** Make sure Unity is installed via Unity Hub to the default location:

| Platform | Expected location |
|----------|-------------------|
| macOS | `/Applications/Unity/Hub/Editor/` |
| Windows | `C:\Program Files\Unity\Hub\Editor\` |
| Linux | `~/Unity/Hub/Editor/` |

If you installed Unity somewhere else, gamekit won't find it automatically. Move it to the default location or symlink it.

## Can't connect to Unity

**Symptom:** `gamekit doctor` fails, or commands return "Cannot connect to Unity."

**Checklist:**

1. **Unity is open** with your project loaded
2. **Wait for Unity to finish importing** — the plugin starts after initial import completes
3. **Check `.gamekit/server.json`** exists in your project root — this file is created when the plugin starts
4. **Restart Unity** if the plugin didn't start — it loads automatically on project open

If all else fails, run `gamekit doctor` for a detailed diagnosis.

## Commands fail during compilation

**Symptom:** Commands return errors or unexpected results right after editing C# files.

**Fix:** Unity compiles in the background. Always wait for compilation to finish:

```bash
gamekit refresh        # Trigger recompilation
gamekit wait           # Block until Unity is idle
gamekit console --errors  # Now safe to check results
```

## Unity unresponsive during domain reload

**Symptom:** Commands time out briefly after compilation finishes.

This is a known limitation. When Unity performs a domain reload (reloading compiled assemblies), the HTTP server briefly stops. The CLI retries automatically with exponential backoff, but very fast sequential commands may fail.

**Workaround:** Add a short delay or use `gamekit wait` between `gamekit refresh` and subsequent commands.

## Commands not showing up

**Symptom:** You type `/playtest` and Claude doesn't recognize it.

**Fix:** Make sure you're in the project directory when you start Claude Code:

```bash
cd my-game
claude
```

Claude Code reads commands from `.claude/commands/` in the current directory.

If commands are missing, re-run:

```bash
gamekit init
```

## Input simulation doesn't work

**Symptom:** `gamekit input key space` returns an error.

**Common causes:**

1. **Not in play mode** — Input simulation only works during play mode. Run `gamekit play start` first.
2. **Input System package missing** — Run `gamekit init` to install `com.unity.inputsystem`, then reopen Unity.
3. **No keyboard/mouse device** — This can happen in headless or batch mode Unity sessions.

## Build fails

**Symptom:** `gamekit build` fails or produces errors.

**Common causes:**

1. **Missing build support** — Install platform build support in Unity Hub (e.g., "WebGL Build Support")
2. **Script errors** — Check `gamekit console --errors` for compilation errors
3. **Missing scenes** — Make sure your scenes are added to Build Settings

## Screenshot is blank or wrong

**Symptom:** `gamekit screenshot` returns a blank or unexpected image.

**Common causes:**

1. **Game view not visible** — Unity needs the Game view tab to be visible for game view screenshots
2. **Wrong camera** — Use `--camera CameraName` to target a specific camera
3. **Scene view** — Use `--scene` for scene view instead of game view

## Still stuck?

Run `gamekit doctor` and share the output. It checks most common issues and will tell you what's wrong.

Join our [Discord](https://discord.gg/jmJkNbwxYc) for help.
