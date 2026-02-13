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

```bash
# Game runs without errors
gamekit console --errors
# -> Must return empty or only ignorable warnings

# No compile errors (check for CS#### errors)

# Core loop works
# -> Player can perform main action
# -> Win/lose conditions function
# -> Game doesn't crash during play

# 30-second play test passes
gamekit play start
sleep 30
gamekit console --errors
gamekit play stop
```

**If Gate 1 fails:** Fix issues before continuing. Do not present to user.

---

### Gate 2: Playability (SHOULD PASS)

These should be true for good user experience:

```
- Controls are responsive (input processed without noticeable delay)
- Collisions work correctly (player doesn't fall through floor)
- Game state is clear (player knows what to do)
- Difficulty is reasonable (not impossible, not trivially easy)
```

**If Gate 2 fails:** Note issues for improvement, but can present with caveats.

---

### Gate 3: Visual Quality (SHOULD CHECK)

Take screenshot and verify:

```bash
# Capture and analyze game view
gamekit screenshot
# Read the returned screenshot path and analyze the image

# Check:
# - Scene isn't empty/bare
# - Colors are intentional (not default gray everywhere)
# - No pink (missing material) errors
# - UI is readable
# - Camera shows the action
# - Scale feels right
```

---

### Gate 4: Polish (NICE TO HAVE)

For high-quality presentation:

```
- Audio feedback exists (actions have sound effects)
- Visual feedback exists (hit effects, collection effects)
- Game feel is good (screen shake, particles, animations)
- Edge cases handled (player can't get stuck, enemies don't behave erratically)
```

---

## Quality Gate Process

### Before Presenting Work
```
1. Run Gate 1 (Functional)
   -> If FAIL: Fix and re-test
   -> If PASS: Continue

2. Run Gate 2 (Playability)
   -> Note any issues
   -> Fix critical playability issues

3. Run Gate 3 (Visual)
   -> Take screenshot
   -> Evaluate visuals
   -> Fix glaring visual issues

4. Consider Gate 4 (Polish)
   -> Note polish opportunities
   -> Apply quick wins if time allows

5. Generate Quality Report
```

### Quality Report Format
```
## Quality Gate: [PASS/PASS WITH NOTES/NEEDS WORK]

### Functional (Gate 1): PASS
- No errors in 30s test
- Core loop verified
- Stable performance

### Playability (Gate 2): PASS
- Controls responsive
- Collisions working
- Objectives clear

### Visual (Gate 3): NOTES
- Scene looks good
- UI readable
- Note: Could use more environment detail

### Polish (Gate 4): OPPORTUNITIES
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
Empty scene -> Add environment basics
Missing materials -> Create and apply simple materials
UI hard to read -> Adjust text size/color
```

### Playability Issues
```
Controls unresponsive -> Check input script
Collisions not working -> Verify physics setup
Unclear objectives -> Add UI hints
```

### Polish Quick Wins
```
No audio -> Add placeholder sounds from free assets
No effects -> Add basic particles (Unity built-in)
Stiff movement -> Add smoothing/lerping
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
-> adding-juice skill applies polish
-> quality-gate re-evaluates
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
- No errors in 30 second test
- Enemies chase and damage player correctly
- Visuals look good (screenshot verified)

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

1. **Feature complete** -> Run quality gate
2. **Gate 1 fails** -> Fix before continuing
3. **Visual issues** -> Screenshot and verify
4. **Polish gaps** -> Note or quick-fix
5. **Only then** -> Present to user as "done"

**Never present broken or low-quality work. Quality gate ensures everything Claude delivers is worth the user's time to test.**
