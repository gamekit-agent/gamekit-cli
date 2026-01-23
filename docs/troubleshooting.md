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

## MCP relay not found

**Symptom:** `gamekit doctor` reports MCP relay is missing.

**This is normal** if you haven't opened Unity yet. The MCP relay installs when Unity opens and resolves packages.

**Fix:** Open your project in Unity, wait for it to finish importing, then run `gamekit doctor` again.

## Claude can't connect to Unity

**Symptom:** Claude says it can't reach the MCP server, or MCP commands fail.

**Checklist:**

1. **Unity is open** with your project loaded
2. **MCP server is running** — in Unity, go to `Window > Unity MCP > Start Server`
3. **Restart Claude Code** — sometimes the connection needs a fresh start
4. **.mcp.json exists** — check your project root for this file

If all else fails, run `gamekit configure-mcp` to regenerate the MCP configuration.

## Commands not showing up

**Symptom:** You type `/playtest` and Claude doesn't recognize it.

**Fix:** Make sure you're in the project directory when you start Claude Code:

```bash
cd my-game
claude
```

Claude Code reads commands from `.claude/commands/` in the current directory.

If commands are still missing, run:

```bash
gamekit install-commands
```

## Build fails

**Symptom:** `/build` command fails or produces errors.

**Common causes:**

1. **Missing build support** — you need to install platform build support in Unity Hub (e.g., "WebGL Build Support")
2. **Script errors** — check the Unity console for compilation errors
3. **Missing scenes** — make sure your scenes are added to Build Settings

## Unity console errors

**Symptom:** Game doesn't work, Claude seems confused.

**What to do:**

1. Open the Unity Console (`Window > General > Console`)
2. Look for red error messages
3. Tell Claude about the errors — paste them or use `/fix`

Claude can often fix errors if you show it the exact error message.

## Performance issues

**Symptom:** Everything is slow — MCP responses take forever.

**This is a known limitation.** MCP communication has latency, especially for screenshots.

**Workarounds:**

- Use `/playtest` less frequently. Let Claude make multiple changes before testing
- Be specific about what to check: "test if the player can jump" vs. "test everything"
- For complex debugging, describe the problem in detail rather than relying on screenshots

## Still stuck?

Run `gamekit doctor` and share the output. It checks most common issues and will tell you what's wrong.
