---
description: Automatic scene state capture before and after changes - enables rollback and verification
---

# Scene Awareness

## AUTOMATIC BEHAVIOR - Claude MUST do this without being asked

**Before making significant changes, capture the current state. After changes, verify the result.**

This is NOT optional. Claude proactively maintains awareness of scene state for:
- Safe rollback if changes fail
- Verification that changes worked
- Debugging when issues occur
- Progress tracking during iteration

---

## Trigger Conditions (Auto-Apply)

### BEFORE Changes - Capture State

Automatically capture scene state when about to:
- Modify 3+ GameObjects
- Create or modify scripts
- Change physics configuration
- Modify UI elements
- Add/remove components on multiple objects
- Make any change user might want to undo

### AFTER Changes - Verify State

Automatically verify after:
- Any script modification
- Adding new game elements
- Changing physics/collisions
- UI modifications
- Asset imports

---

## Pre-Change Capture Process

### Quick Capture (Default - Most Changes)
```
1. manage_scene action="get_hierarchy"
   → Store object names, parent-child relationships

2. For key objects being modified:
   manage_gameobject action="get_components" target="[name]"
   → Store component list and key property values

3. Note the capture in working memory:
   "Pre-change state captured: [X objects, Y components noted]"
```

### Full Capture (Major Changes)
```
1. manage_scene action="get_hierarchy"
2. manage_console action="get" types=["error"] count=10
3. manage_physics action="get_layer_names"
4. For ALL modified objects: get full component state
5. Take screenshot if visual changes expected
```

---

## Post-Change Verification Process

### Quick Verify (Default)
```
1. manage_console action="get" types=["error", "exception"] count=5
   → Check for new errors

2. If errors found:
   - Analyze the error
   - Attempt automatic fix
   - If can't fix, report and offer rollback

3. If no errors:
   - Confirm change succeeded
   - Note what changed
```

### Full Verify (After Major Changes)
```
1. manage_console action="get" types=["all"] count=20
2. manage_scene action="get_hierarchy" → Compare to pre-change
3. Verify expected objects exist
4. Verify expected components attached
5. Take screenshot for visual verification
6. Run quick auto-test (5 seconds)
```

---

## State Tracking

Claude maintains mental model of:

### Current Session Changes
```
Changes this session:
1. [Timestamp] Created "Enemy" GameObject
2. [Timestamp] Modified PlayerMovement.cs: speed 5→10
3. [Timestamp] Added Rigidbody to "Coin"
...
```

### Rollback Points
```
Rollback points:
- Before enemy system: [state snapshot]
- Before UI changes: [state snapshot]
- Before physics update: [state snapshot]
```

### Known Good States
```
Last verified working state:
- After: "Added player movement"
- Console: Clean (no errors)
- Test: Passed 5s auto-test
```

---

## Automatic Behaviors by Change Type

### Script Changes
```
BEFORE:
1. Read current script content
2. Note what's being changed

AFTER:
1. Wait for Unity recompile (1-2 seconds)
2. Check console for compile errors
3. If errors: analyze and fix immediately
4. If clean: note success
```

### GameObject Changes
```
BEFORE:
1. Get hierarchy snapshot
2. Get components of affected objects

AFTER:
1. Verify objects exist/don't exist as expected
2. Verify components attached correctly
3. Check for missing references
```

### Physics/Collision Changes
```
BEFORE:
1. Get layer names
2. Get collision matrix
3. Note current physics settings

AFTER:
1. Verify layers configured
2. Check collision matrix updated
3. Quick play test to verify physics work
```

### Visual Changes (Materials, UI, Positions)
```
BEFORE:
1. Take screenshot
2. Note current visual state

AFTER:
1. Take screenshot
2. Compare visually
3. Verify changes look correct
```

---

## Integration with Other Systems

### With verify-changes Skill
Scene awareness captures state → verify-changes tests functionality

### With quality-gate Skill
Scene awareness provides state data → quality-gate evaluates quality

### With /rollback Command
Scene awareness tracks changes → rollback uses that data to revert

### With iterator Agent
Scene awareness tracks progress → iterator knows what's been tried

---

## Error Recovery Patterns

### Compile Error After Script Change
```
1. Scene awareness detects error in post-change check
2. Read the error message
3. Read the script
4. Identify the issue
5. Fix the script
6. Verify recompile succeeds
7. Continue with original task
```

### Missing Reference After Changes
```
1. Scene awareness detects NullReferenceException
2. Identify which object/script has missing reference
3. Check if reference was lost during changes
4. Reconnect reference OR restore from pre-change state
5. Verify fix
```

### Objects Not Behaving Correctly
```
1. Scene awareness compares pre/post state
2. Identify what changed unexpectedly
3. Either fix the issue OR rollback specific change
4. Verify correct behavior
```

---

## Output to User

Keep user informed without overwhelming:

**Minimal (Default):**
```
"Making changes to enemy system..."
"Done - verified working, no errors."
```

**On Issues:**
```
"Making changes to enemy system..."
"Found compile error - fixing..."
"Fixed missing semicolon, verified working."
```

**On Request (verbose):**
```
"Captured state: 15 objects, 3 scripts to modify
Making changes...
Post-check:
- 2 new objects created
- PlayerMovement.cs updated
- No console errors
- Visual verified via screenshot
Changes complete and verified."
```

---

## Quick Reference

| Situation | Action |
|-----------|--------|
| About to modify script | Read current version first |
| About to change 3+ objects | Get hierarchy snapshot |
| After any script change | Wait, check console |
| After adding components | Verify with get_components |
| After visual changes | Take screenshot |
| Error detected | Analyze → Fix → Verify |
| User asks "what changed" | Report from change log |
| User wants rollback | Use captured pre-state |

---

## REMINDER: This is AUTOMATIC

Claude does NOT wait for user to ask for state capture. Every significant change includes:

1. ✅ **Pre-capture** → Know what we're changing
2. ✅ **Make change** → Do the actual modification
3. ✅ **Post-verify** → Confirm it worked
4. ✅ **Log change** → Track for rollback/reporting

This enables confident iteration without fear of breaking things.
