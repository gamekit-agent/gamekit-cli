<div align="center">
<img width="700" height="314" alt="github-banner" src="docs/assets/logo.png" />

[![Discord](https://img.shields.io/badge/Discord-Join%20us-blue)](https://discord.gg/jmJkNbwxYc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

## 
🌐 gamekit-agent is an open-source command-line tool for developing Unity games with Claude Code.

🛠️ work fast - gamekit allows you to create fresh projects from command line, install a Unity MCP server, and includes helpful Claude commands & skills for Unity dev.

💡 Join our [Discord](https://discord.gg/jmJkNbwxYc) and help us build! Have feature requests? [Suggest here](https://github.com/gamekit-agent/gamekit-cli/issues).

## Quick Start

**Prerequisites:** [Unity Hub](https://unity.com/download) with Unity 6 or 2022.x, and [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

**Install:**

macOS / Linux / WSL
```bash
curl -fsSL https://github.com/gamekit-agent/gamekit-cli/releases/latest/download/install.sh | bash
```
Windows PowerShell
```
irm https://github.com/gamekit-agent/gamekit-cli/releases/latest/download/install.ps1 | iex
```

**Run `gamekit init`:**
![](./docs/assets/gamekit-init.gif)


## Who it's for

- 🎮 **New to Unity** - Go from idea to playable prototype fast. Describe what you want, iterate on it, learn by doing.

- 🚀 **Experienced teams** - Accelerate the parts Claude is good at: systems code, state machines, networking, UI logic, NPC behavior. Keep your existing workflow, add AI assistance where it helps.

- 🤝 **Multiplayer game devs** - Claude is excellent at writing multiplayer code and test suites to verify everything will work correctly in production.

## Demos

### 🎮 Create game prototypes quickly
<div align="center">
<img src="docs/assets/golf-demo.gif">
<p align="center"><em>/new-game Create a mini golf game with 3 holes.</em></p><br><br>
</div>

<div align="center">
<img src="docs/assets/minecraft-demo.gif">
<p align="center"><em>/new-game Create a Minecraft-style voxel world.</em></p><br><br>
</div>

### 🌐 Add multiplayer to your game
<div align="center">
<img src="docs/assets/multiplayer-demo.gif">
<p align="center"><em>/add-multiplayer</em></p><br><br>
</div>

## Core Commands

| Command | What it does |
|---------|--------------|
| `gamekit init` | Interactive project setup. Finds Unity, creates project, installs everything or adds everything to an existing Unity project folder|
| `gamekit doctor` | Diagnose setup issues |

See [full command reference](docs/commands.md) for all options.

## What gamekit does well

- **Prototyping:** Go from idea to playable build in one session
- **Systems code:** NPCs, inventory, state machines, networking, save/load
- **Iteration:** `/playtest`, `/fix`, `/build` commands for tight feedback loops
- **Learning:** See how Unity code works by watching Claude build it

## Limitations

- **Assets:** Claude writes code, but does not create art/audio/3D models. (Check out our `/find-asset` prototype command)
- **MCP is slow:** Screenshot-based iteration has latency. We're working on a faster alternative that allows gamekit to communicate directly with Unity.

See [roadmap](docs/roadmap.md) for more details on how we plan to improve.

## Documentation

- [Commands](docs/commands.md): Full CLI reference
- [Slash Commands](docs/slash-commands.md): All 14 commands available in Claude
- [Project Structure](docs/project-structure.md): What gamekit creates
- [How It Works](docs/how-it-works.md): Architecture and MCP integration
- [Troubleshooting](docs/troubleshooting.md): Common issues and fixes
- [Roadmap](docs/roadmap.md): What's next, known limitations

## License

MIT

Created by the team at [Normal](https://normcore.io/).
