# Roadmap

Where gamekit is headed and current limitations.

## Current Limitations

### Assets are still manual

Claude writes code, not art. For a complete game you'll need:
- 3D models and textures
- Audio (music, sound effects)
- UI sprites and icons
- Animations

**Workarounds:**
- Use `/find-asset` to search for free assets
- Unity's primitive shapes work for prototyping
- ProBuilder (included in Unity) for basic 3D modeling
- Placeholder assets until you have real ones

### MCP can be slow

The Unity MCP server communicates through screenshots and text. This has inherent latency:
- Screenshots take time to capture and transmit
- Claude needs to "see" the game to understand state
- Back-and-forth iteration is slower than direct coding

**Workarounds:**
- Be specific about what to check
- Batch changes before testing
- Describe problems in detail rather than relying solely on screenshots

### Context grows fast

Complex games with lots of iteration can hit context limits:
- Every screenshot adds to context
- Long conversations accumulate
- Large codebases take space to understand

**Workarounds:**
- Start fresh conversations for new features
- Keep projects focused — one game per project
- Use specific commands rather than open-ended requests

## What's Coming

### Faster Unity communication

We're working on adding direct communication to gamekit that bypasses MCP limitations:

```bash
# Future: Unix-philosophy style commands
gamekit get-console | grep -i error | head -10
gamekit get-hierarchy
gamekit run-tests
```

Same pattern that works well for Node.js and other runtimes: fast, composable, scriptable.

### Better asset workflows

Exploring integrations for:
- Asset store search and import
- Procedural generation for placeholders
- AI image generation for textures/sprites

### Test integration

Automated testing support:
- Run Unity Test Framework tests
- Generate tests for game logic
- Catch regressions automatically

### Multi-file awareness

Better understanding of how changes propagate:
- Prefab and variant relationships
- Script dependencies
- Scene references

## Contributing

If you want to help, the most valuable contributions are:

1. **Bug reports:** Especially edge cases in project setup
2. **Command improvements:** Better prompts, new workflows
3. **Platform support:** Windows and Linux testing
4. **Documentation:** Tutorials, examples, guides

Open an issue or PR at the repo. We're happy to help you get started.
