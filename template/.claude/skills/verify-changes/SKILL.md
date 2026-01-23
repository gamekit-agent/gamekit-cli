---
description: Automatic test-fix loop after changes - ensures changes work before moving on
---

# Verify Changes

## AUTOMATIC BEHAVIOR - Claude MUST do this without being asked

**After making changes, automatically test and fix until working.**

This is NOT optional. Claude does not move to the next task until the current change is verified working. This prevents accumulating broken code that becomes hard to debug later.

---

## Trigger Conditions (Auto-Apply)

Run verification after:
- Any script creation or modification
- Adding new GameObjects with behavior
- Changing physics configuration
- Adding/modifying player controls
- Adding/modifying enemy AI
- Creating new game mechanics
- UI implementation
- Any change that could break existing functionality

---

## The Verify Loop

```
┌─────────────────────────────────────────────────┐
│  MAKE CHANGE                                    │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  QUICK TEST (5 seconds play mode)               │
│  - Enter play mode                              │
│  - Wait 5 seconds                               │
│  - Check console for errors                     │
└────────────────────┬────────────────────────────┘
                     ▼
              ┌──────┴──────┐
              │ Errors?     │
              └──────┬──────┘
         No ◄────────┴────────► Yes
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────────────┐
│ VERIFIED ✓      │    │ ANALYZE & FIX           │
│ Move to next    │    │ - Read error message    │
│ task            │    │ - Identify root cause   │
│                 │    │ - Apply fix             │
└─────────────────┘    └───────────┬─────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │ Loop back to TEST     │
                       │ (max 3 attempts)      │
                       └───────────────────────┘
```

---

## Verification Process

### Step 1: Quick Console Check
```
manage_console action="clear"
manage_console action="get" types=["error", "exception"] count=10
```

If compile errors exist before even playing → fix those first.

### Step 2: Enter Play Mode Test
```
manage_editor action="play"
# Wait 5 seconds
manage_console action="get" types=["error", "exception"] count=20
manage_editor action="stop"
```

### Step 3: Analyze Results
```
IF no errors:
  → Verification passed
  → Report success briefly
  → Continue to next task

IF errors found:
  → Analyze each error
  → Determine root cause
  → Apply fix
  → Return to Step 1 (max 3 loops)

IF 3 attempts failed:
  → Report the persistent issue
  → Ask user for guidance OR
  → Rollback to last known good state
```

---

## Error Analysis Patterns

### NullReferenceException
```
Error: NullReferenceException at PlayerMovement.cs:25
Analysis:
1. Read PlayerMovement.cs line 25
2. Identify what variable is null
3. Common causes:
   - GetComponent failed (component not attached)
   - Inspector reference not set
   - Object was destroyed
   - Accessed in Awake before other object's Awake

Fix patterns:
- Add null check
- Add GetComponent in Awake
- Verify component is attached
- Use FindObjectOfType as fallback
```

### MissingComponentException
```
Error: Missing component on "Player"
Analysis:
1. Check what component is expected
2. Verify it was added

Fix:
- Add the missing component via MCP
```

### Compile Errors
```
Error: CS1002: ; expected at line 45
Analysis:
1. Read the script
2. Find the syntax error

Fix:
- Edit the script to correct syntax
- Common: missing semicolons, brackets, typos
```

### Physics/Collision Issues
```
Symptom: Objects pass through each other (no error in console)
Detection: Requires play-testing or user report

Fix process:
1. Check Colliders exist
2. Check at least one has Rigidbody
3. Check layer collision matrix
4. Check isTrigger settings
```

---

## Automatic Fix Patterns

### Pattern 1: Missing Component Reference
```csharp
// Before (causes error):
rb.AddForce(Vector3.up);

// After (auto-fixed):
if (rb == null) rb = GetComponent<Rigidbody>();
if (rb != null) rb.AddForce(Vector3.up);
```

### Pattern 2: Start() Dependencies
```csharp
// Before (race condition):
void Start() {
    other = FindObjectOfType<OtherScript>();
    other.DoThing(); // May be null!
}

// After (auto-fixed):
void Start() {
    other = FindObjectOfType<OtherScript>();
}
void Update() {
    if (other == null) other = FindObjectOfType<OtherScript>();
    // Use other safely
}
```

### Pattern 3: Missing Using Statement
```csharp
// Error: The type or namespace 'List' could not be found

// Fix: Add at top of file
using System.Collections.Generic;
```

---

## Verification Levels

### Level 1: Quick Verify (Default)
- Check for compile errors
- 5 second play test
- Console error check
- **Use for:** Most changes

### Level 2: Standard Verify
- Compile error check
- 15 second play test
- Console check
- Basic functionality test
- **Use for:** New features, mechanics

### Level 3: Full Verify
- Compile error check
- 30 second play test
- Console check (all types)
- Performance check
- Visual screenshot
- **Use for:** Before presenting to user, major features

---

## Integration with Other Systems

### With scene-awareness Skill
```
scene-awareness captures pre-state
→ verify-changes tests post-state
→ If broken, can rollback using scene-awareness data
```

### With quality-gate Skill
```
verify-changes ensures no errors
→ quality-gate then checks quality level
```

### With code-debugger Agent
```
If verify-changes can't fix after 3 attempts
→ Delegate to code-debugger agent for deep analysis
```

---

## Failure Handling

### After 3 Failed Fix Attempts
```
Options (in order of preference):
1. Rollback the specific change that broke things
2. Delegate to code-debugger agent
3. Report to user with:
   - What was attempted
   - What error persists
   - What was tried to fix it
   - Ask for guidance
```

### Persistent Issues
```
If same error keeps occurring across multiple changes:
1. Log in LEARNINGS.md
2. Note the pattern
3. Create a skill/pattern to prevent in future
```

---

## Output Communication

### Success (Brief)
```
"Added enemy AI - verified working, no errors."
```

### Fixed Issue (Informative)
```
"Added enemy AI. Found missing Rigidbody - added it. Verified working."
```

### Persistent Issue (Detailed)
```
"Added enemy AI but encountering persistent NullReferenceException.
Tried:
1. Added null check - still fails
2. Verified component exists - it does
3. Checked execution order - appears correct

The error occurs at EnemyAI.cs:42 when accessing 'player' reference.
Would you like me to:
A) Rollback this change and try a different approach
B) Continue investigating with code-debugger
C) Show you the code to debug together"
```

---

## Quick Reference

| Situation | Action |
|-----------|--------|
| Script modified | Quick verify (5s test) |
| New feature added | Standard verify (15s test) |
| Before telling user "done" | Full verify (30s test) |
| Error found | Analyze → Fix → Re-test |
| 3 failed fixes | Rollback OR escalate |
| User reports issue | Full verify + investigate |

---

## REMINDER: This is AUTOMATIC

Claude does NOT ask "should I test this?" - testing happens automatically:

1. ✅ **Change made** → Immediately test
2. ✅ **Error found** → Immediately fix
3. ✅ **Fix applied** → Immediately re-test
4. ✅ **Verified clean** → Then continue
5. ✅ **Can't fix** → Report and get guidance

**Never leave broken code behind. Every change must be verified before moving on.**
