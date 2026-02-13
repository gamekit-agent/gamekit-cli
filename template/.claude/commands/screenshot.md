# /screenshot

Capture a screenshot of the Unity Editor's Game view for visual verification.

**User's request:** $ARGUMENTS

## What This Does

Takes a screenshot of what the game currently looks like - either in Edit mode (scene view) or Play mode (game view). This allows Claude to SEE the game and verify visual quality, layout, colors, and overall appearance.

Examples:
- `/screenshot` -> Capture current game view
- `/screenshot game` -> Capture Game view specifically
- `/screenshot scene` -> Capture Scene view
- `/screenshot ui` -> Focus on UI elements

## Why This Matters

Claude can read scene hierarchies and console logs, but cannot verify:
- Does the UI look correct?
- Are colors/materials applied properly?
- Is the layout visually appealing?
- Are objects positioned correctly?
- Does the game "look right"?

Screenshots enable visual verification and iteration.

## Process

### Step 1: Capture Screenshot
```bash
# Game view (default)
gamekit screenshot

# Scene view
gamekit screenshot --scene

# From a specific camera
gamekit screenshot --camera MainCamera

# Custom resolution
gamekit screenshot --width 1920 --height 1080
```

### Step 2: Read and Analyze
```
# Read the screenshot file (Claude can see images)
# The gamekit screenshot command returns the file path in its output
Read file_path="<path from output>"

# Analyze visual elements:
#   - Layout and composition
#   - Color scheme and contrast
#   - UI readability
#   - Object placement
#   - Overall polish level
```

### Step 3: Report Findings
```
Present to user or use internally:
- What looks good
- What needs improvement
- Specific issues spotted
- Suggestions for visual polish
```

## Visual Quality Checklist

When analyzing a screenshot, check:

### Layout
- [ ] Objects are well-positioned
- [ ] Nothing overlaps unintentionally
- [ ] Scene has good composition
- [ ] Player/important elements are visible

### UI
- [ ] Text is readable
- [ ] Buttons are clearly visible
- [ ] Health/score displays make sense
- [ ] No UI elements cut off

### Colors/Materials
- [ ] Colors are intentional and cohesive
- [ ] Materials are applied (not pink/missing)
- [ ] Lighting looks appropriate
- [ ] No visual artifacts

### Polish
- [ ] Scene doesn't look empty
- [ ] Objects have appropriate scale
- [ ] Visual hierarchy is clear
- [ ] Overall aesthetic is consistent

## Automatic Usage

Claude should capture screenshots:
- After making visual changes (materials, UI, positioning)
- When user says "does it look right?"
- Before declaring a feature complete
- When debugging visual issues
- During quality gate checks

## Integration with Other Tools

- **quality-gate skill**: Screenshot is part of visual verification
- **verify-changes skill**: Capture before/after for visual diff
- **iterator agent**: Use screenshots to assess iteration progress

## Output Format

When reporting screenshot analysis:
```
## Visual Check: [View Type]

### Screenshot Captured
Location: [file path]

### Analysis
**Looks Good:**
- [Positive observations]

**Needs Attention:**
- [Issues spotted]

**Recommendations:**
- [Suggested improvements]

### Visual Quality Score: [1-5]/5
```
