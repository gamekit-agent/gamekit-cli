---
description: Capture game view screenshots for visual verification
---

# Screenshot Skill

## Working Screenshot Procedure

This procedure captures screenshots from the Unity game view using the `gamekit` CLI.

---

## The Exact Working Steps

### Step 1: Capture Screenshot
```bash
# Game view (default)
gamekit screenshot

# Scene view
gamekit screenshot --scene

# From a specific camera
gamekit screenshot --camera MainCamera
```

The command returns a JSON response with the screenshot file path.

### Step 2: Read and Analyze the Image
```
Read file_path="<path from gamekit screenshot output>"
```
Claude can see the image content and analyze it visually.

---

## Complete Example

```bash
# 1. Capture screenshot (works in both edit and play mode)
gamekit screenshot

# 2. Read the screenshot file path from the JSON output
# 3. Read the screenshot using Claude's Read tool
# 4. Analyze what you see and report to user
```

### Play Mode Screenshot
```bash
# Start play mode first if needed
gamekit play start
sleep 2

# Capture what the player sees
gamekit screenshot

# Read and analyze the image
# Then stop play mode
gamekit play stop
```

---

## Options

| Flag | Purpose |
|------|---------|
| `--scene` | Capture Scene view instead of Game view |
| `--camera <name>` | Capture from a specific camera |
| `--width <pixels>` | Screenshot width (default: 1920) |
| `--height <pixels>` | Screenshot height (default: 1080) |
| `--output <path>` | Save to a specific file path |

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
