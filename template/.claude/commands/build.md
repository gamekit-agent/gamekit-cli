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
3. Configure build settings
4. Start the build
5. Tell user where to find the built game

## Platform Names

| User says | Platform to use |
|-----------|-----------------|
| windows, pc, win | StandaloneWindows64 |
| mac, macos, osx | StandaloneOSX |
| linux | StandaloneLinux64 |
| webgl, browser, web | WebGL |
| android | Android |
| ios, iphone | iOS |

## Build Process

### 1. Check Scenes
```
manage_build action="list_scenes"
```
Make sure at least one scene is in build settings. If none:
- Add the current scene to build settings

### 2. Set Platform (if needed)
```
manage_platform action="get_current"
manage_platform action="switch" platform="StandaloneWindows64"
```

### 3. Configure Build
```
manage_build action="set_dev_mode" dev_mode=false  // For release
// or dev_mode=true for debugging
```

### 4. Build
```
manage_build action="build"
  build_path="/path/to/Builds"
  build_filename="MyGame.exe"  // or .app, etc.
  build_autorun=true  // Opens game after build
```

## Build Locations

Suggest putting builds in a `Builds/` folder:
- `Builds/Windows/MyGame.exe`
- `Builds/Mac/MyGame.app`
- `Builds/WebGL/index.html`

## Common Issues

**No scenes in build**
- Add scenes using manage_build action="add_scene"

**Platform not installed**
- User needs to install platform module in Unity Hub
- Check with manage_platform action="list_installed"

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
