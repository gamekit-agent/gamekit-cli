---
description: Quality checklist before presenting work to user - ensures high quality output
---

# Quality Gate

## AUTOMATIC BEHAVIOR - Claude MUST do this before declaring work complete

**Before telling the user a feature or game is "done", run the quality gate checklist.**

This ensures Claude only presents high-quality, polished work - not broken prototypes.

---

## Trigger Conditions (Auto-Apply)

Run quality gate before:
- Saying "done", "finished", "complete", "ready"
- Presenting a new feature to the user
- Before the user tests something
- Responding to "is it ready?"
- After completing a game design milestone
- Before recommending user playtest

---

## The Quality Gate Checklist

### Gate 1: Functional (MUST PASS)

All of these must be true before proceeding:

```
□ Game runs without errors
  → manage_console action="get" types=["error", "exception"]
  → Must return empty or only ignorable warnings

□ No compile errors
  → manage_console shows no CS#### errors

□ Core loop works
  → Player can perform main action
  → Win/lose conditions function
  → Game doesn't crash during play

□ 30-second play test passes
  → manage_editor action="play"
  → Wait 30 seconds
  → Check console clean
  → manage_editor action="stop"
```

**If Gate 1 fails:** Fix issues before continuing. Do not present to user.

---

### Gate 2: Playability (SHOULD PASS)

These should be true for good user experience:

```
□ Controls are responsive
  → Input is processed without noticeable delay
  → Movement feels smooth

□ Collisions work correctly
  → Player doesn't fall through floor
  → Triggers fire appropriately
  → Physics behave as expected

□ Game state is clear
  → Player knows what to do
  → Objectives are apparent
  → Progress is visible

□ Difficulty is reasonable
  → Not impossible
  → Not trivially easy
  → Challenge feels fair
```

**If Gate 2 fails:** Note issues for improvement, but can present with caveats.

---

### Gate 3: Visual Quality (SHOULD CHECK)

Take screenshot and verify:

```
□ Scene isn't empty/bare
  → Environment has substance
  → Not just floating objects in void

□ Colors are intentional
  → Not default Unity gray everywhere
  → Materials applied to objects
  → No pink (missing material) errors

□ UI is readable
  → Text is visible against background
  → Elements are appropriately sized
  → Nothing is cut off or overlapping

□ Camera shows the action
  → Player is visible
  → Important elements in frame
  → No clipping issues

□ Scale feels right
  → Objects are proportional
  → Player size appropriate to world
```

**Visual check process:**
```
1. mcp__unity-mcp__manage_menu_item action="execute" menu_path="Tools/Capture Screenshot"
2. sleep 1-2, then: ls -lt Assets/Screenshots/*.png | head -1
3. Read the newest screenshot PNG file
4. Evaluate against checklist
5. Note any visual issues
```

---

### Gate 4: Polish (NICE TO HAVE)

For high-quality presentation:

```
□ Audio feedback exists
  → Actions have sound effects
  → Background music (if appropriate)

□ Visual feedback exists
  → Hit effects
  → Collection effects
  → UI responds to actions

□ Game feel is good
  → Screen shake on impacts
  → Particle effects where appropriate
  → Animations are smooth

□ Edge cases handled
  → Player can't get stuck
  → Enemies don't behave erratically
  → Game handles rapid inputs
```

---

## Quality Gate Process

### Before Presenting Work
```
1. Run Gate 1 (Functional)
   → If FAIL: Fix and re-test
   → If PASS: Continue

2. Run Gate 2 (Playability)
   → Note any issues
   → Fix critical playability issues

3. Run Gate 3 (Visual)
   → Take screenshot
   → Evaluate visuals
   → Fix glaring visual issues

4. Consider Gate 4 (Polish)
   → Note polish opportunities
   → Apply quick wins if time allows

5. Generate Quality Report
```

### Quality Report Format
```
## Quality Gate: [PASS/PASS WITH NOTES/NEEDS WORK]

### Functional (Gate 1): ✓ PASS
- No errors in 30s test
- Core loop verified
- Stable performance

### Playability (Gate 2): ✓ PASS
- Controls responsive
- Collisions working
- Objectives clear

### Visual (Gate 3): ⚠️ NOTES
- Scene looks good
- UI readable
- Note: Could use more environment detail

### Polish (Gate 4): ℹ️ OPPORTUNITIES
- Sound effects: Not yet added
- Particles: Basic only
- Could add: screen shake on damage

### Ready for User: YES
[OR: NEEDS FIXES - see issues above]
```

---

## Automatic Quality Improvements

If quality gate finds issues, attempt automatic fixes:

### Visual Issues
```
Empty scene → Add environment basics
Missing materials → Create and apply simple materials
UI hard to read → Adjust text size/color
```

### Playability Issues
```
Controls unresponsive → Check input script
Collisions not working → Verify physics setup
Unclear objectives → Add UI hints
```

### Polish Quick Wins
```
No audio → Add placeholder sounds from free assets
No effects → Add basic particles (Unity built-in)
Stiff movement → Add smoothing/lerping
```

---

## Integration with Other Skills

### With verify-changes Skill
```
verify-changes: Ensures no errors (Gate 1 subset)
quality-gate: Full quality assessment
```

### With scene-awareness Skill
```
scene-awareness: Provides current state data
quality-gate: Uses that data for evaluation
```

### With adding-juice Skill
```
quality-gate identifies polish gaps
→ adding-juice skill applies polish
→ quality-gate re-evaluates
```

---

## Quality Levels

### Minimum Viable (Gate 1 only)
- Runs without errors
- Core loop works
- User can play
- **For:** Early prototypes, quick tests

### Good Quality (Gates 1-2)
- All functional requirements
- Playable and fair
- Clear objectives
- **For:** Feature demos, milestone reviews

### High Quality (Gates 1-3)
- Fully functional
- Great playability
- Visually polished
- **For:** User presentation, "done" status

### Ship Quality (All Gates)
- Everything above
- Audio and effects
- Full polish
- **For:** Final builds, releases

---

## Common Quality Issues & Fixes

| Issue | Auto-Fix |
|-------|----------|
| Pink materials | Create basic colored materials |
| Empty environment | Add ground plane, skybox, lighting |
| UI too small | Scale up canvas elements |
| No feedback on actions | Add audio source, play clips |
| Floaty controls | Adjust Rigidbody drag/gravity |
| Objects in void | Add world boundaries |

---

## Output to User

### High Quality Pass
```
"Enemy system complete! Ran quality checks:
✓ No errors in 30 second test
✓ Enemies chase and damage player correctly
✓ Visuals look good (screenshot verified)

Ready for you to play!"
```

### Pass with Notes
```
"Enemy system is functional and ready to test!

Quality check notes:
- Works correctly, no errors
- Enemies could be a bit faster for more challenge
- Visual: enemies are basic cubes, can add models later

Want me to improve anything before you test?"
```

### Needs Work
```
"I've built the enemy system but found some issues:
- Enemies sometimes get stuck on corners
- Collision detection misses fast-moving players

Working on fixes before you test..."
```

---

## REMINDER: This is AUTOMATIC

Claude does NOT skip quality checks:

1. ✅ **Feature complete** → Run quality gate
2. ✅ **Gate 1 fails** → Fix before continuing
3. ✅ **Visual issues** → Screenshot and verify
4. ✅ **Polish gaps** → Note or quick-fix
5. ✅ **Only then** → Present to user as "done"

**Never present broken or low-quality work. Quality gate ensures everything Claude delivers is worth the user's time to test.**
