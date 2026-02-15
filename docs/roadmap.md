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

### Domain reload interrupts

When Unity reloads compiled assemblies (domain reload), the GameKit HTTP server briefly stops. This means commands issued immediately after compilation may time out.

**Workaround:** Use `gamekit wait` after `gamekit refresh` to block until Unity is idle.

### Context grows fast

Complex games with lots of iteration can hit context limits:
- Every screenshot adds to context
- Long conversations accumulate
- Large codebases take space to understand

**Workarounds:**
- Start fresh conversations for new features
- Keep projects focused
- Use specific commands rather than open-ended requests

## What's Coming

### Better asset workflows

Exploring integrations for:
- Asset store search and import
- Procedural generation for placeholders
- AI image generation for textures/sprites

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

Open an issue or PR at the [repo](https://github.com/gamekit-agent/gamekit-cli). We're happy to help you get started.
