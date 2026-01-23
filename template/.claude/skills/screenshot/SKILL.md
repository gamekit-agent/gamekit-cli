---
description: Capture game view screenshots for visual verification
---

# Screenshot Skill

## Working Screenshot Procedure (TESTED & VERIFIED)

This procedure successfully captures screenshots from the Unity game view.

---

## The Exact Working Steps

### Step 1: Ensure Play Mode
```
mcp__unity-mcp__manage_editor action="play"
```
The game must be running to capture what the player sees.

### Step 2: Wait for World to Render
```bash
sleep 2-3  # Give time for chunks/objects to generate
```
Important: If the world uses procedural generation, wait for it to complete.

### Step 3: Execute Screenshot Menu Item
```
mcp__unity-mcp__manage_menu_item
  action="execute"
  menu_path="Tools/Capture Screenshot"
```
This triggers the custom screenshot tool that saves to `Assets/Screenshots/`.

### Step 4: Wait for File to Write
```bash
sleep 1-2  # Give Unity time to write the file
```

### Step 5: Find the Latest Screenshot
```bash
ls -lt Assets/Screenshots/*.png | head -1
```
Screenshots are named with timestamps like `screenshot_20260116_145528.png`.

### Step 6: Read and Analyze the Image
```
Read file_path="Assets/Screenshots/screenshot_YYYYMMDD_HHMMSS.png"
```
Claude can see the image content and analyze it visually.

---

## Complete Example

```
# 1. Start play mode
mcp__unity-mcp__manage_editor action="play"

# 2. Wait for world to generate
Bash: sleep 3

# 3. Capture screenshot
mcp__unity-mcp__manage_menu_item action="execute" menu_path="Tools/Capture Screenshot"

# 4. Wait and find the file
Bash: sleep 2 && ls -lt Assets/Screenshots/*.png | head -1

# 5. Read the screenshot
Read: Assets/Screenshots/screenshot_20260116_XXXXXX.png

# 6. Analyze what you see and report to user
```

---

## Why This Works

1. **Menu item approach**: Using `Tools/Capture Screenshot` via `manage_menu_item` is more reliable than trying to call `ScreenCapture.CaptureScreenshot()` directly.

2. **Timestamp naming**: Screenshots auto-name with timestamps, so we use `ls -lt | head -1` to find the newest one.

3. **Read tool sees images**: Claude's Read tool can interpret PNG images and describe what it sees.

4. **Screenshots folder**: Files save to `Assets/Screenshots/` which must exist (create with `mkdir -p` if needed).

---

## Troubleshooting

### Screenshot not created
- Ensure `Assets/Screenshots/` folder exists
- Make sure game is in play mode
- Try executing the menu item twice
- Check Unity console for errors

### Same screenshot appearing
- Check timestamps carefully - new files have newer timestamps
- Wait longer between screenshot attempts
- The file might still be writing

### Can't find screenshot
```bash
# List all recent screenshots with timestamps
ls -la Assets/Screenshots/*.png
```

---

## When to Use Screenshots

- **After visual changes**: Materials, UI, positioning
- **During terrain tuning**: Verify mountains, water, trees look right
- **Before declaring done**: Visual quality check
- **Debugging**: "Does it look right?"
- **Iterative design**: Show user current state during adjustments

---

## Integration Notes

This skill works well with:
- **quality-gate**: Visual verification step
- **verify-changes**: Capture before/after
- **scene-awareness**: Document visual state

---

## Key Insight

The screenshot menu item (`Tools/Capture Screenshot`) is a **custom Editor script** in this project. It's more reliable than Unity's built-in `ScreenCapture` API because it handles:
- Correct game view targeting
- Proper file path handling
- Timestamp-based naming
- Asset database refresh
