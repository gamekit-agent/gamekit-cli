# /build-game

Build the game for a specific platform.

**User's request:** $ARGUMENTS

## What This Does

Builds your game into a playable application for the platform you specify.

Examples:
- `/build-game` -> Build for current platform (usually Windows/Mac)
- `/build-game windows` -> Windows .exe file
- `/build-game mac` -> macOS .app bundle
- `/build-game webgl` -> Browser playable version
- `/build-game android` -> Android .apk (requires Android SDK)
- `/build-game linux` -> Linux build

## Steps

1. Understand target platform from user request
2. Check if scenes are in build settings
3. Start the build
4. Tell user where to find the built game

## Platform Names

| User says | Platform flag |
|-----------|--------------|
| windows, pc, win | `--platform windows` |
| mac, macos, osx | `--platform mac` |
| linux | `--platform linux` |
| webgl, browser, web | `--platform webgl` |
| android | `--platform android` |
| ios, iphone | `--platform ios` |

## Build Process

### 1. Check Scenes
```bash
gamekit list scenes
```
Make sure at least one scene exists. If none, note the issue.

### 2. Build
```bash
gamekit build --platform windows
# Or specify output path:
gamekit build --platform windows --output Builds/Windows/
```

## Build Locations

Suggest putting builds in a `Builds/` folder:
- `Builds/Windows/MyGame.exe`
- `Builds/Mac/MyGame.app`
- `Builds/WebGL/index.html`

## Common Issues

**No scenes in build**
- Ensure scenes exist in the project

**Platform not installed**
- User needs to install platform module in Unity Hub

**Build errors**
- Check console for compile errors
- Fix errors before building

## WebGL Special Notes

- WebGL builds can be hosted online
- Need a web server to test locally (can't just open index.html)
- Compression settings affect file size

## Explain to User

After building, tell them:
- Where the build is saved
- How to run it (double-click .exe, open .app, etc.)
- File size
- Any warnings or issues that occurred
