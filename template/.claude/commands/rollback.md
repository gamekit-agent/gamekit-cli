# /rollback

Undo recent changes made by Claude.

**User's request:** $ARGUMENTS

## What This Does

Reverts recent changes to scene objects, scripts, or assets. Helps when a change didn't work out or you want to try a different approach.

Examples:
- `/rollback` -> Undo the most recent change
- `/rollback last 3` -> Undo the last 3 changes
- `/rollback player changes` -> Undo changes to player specifically
- `/rollback script changes` -> Undo script modifications

## How Rollback Works

### For Scene Changes (GameObjects, Components)

Since Unity doesn't have native undo via MCP, rollback works by:
1. Claude tracks changes made during the session
2. On rollback, Claude reverses those changes explicitly

**Track these changes:**
- Object creation → Delete the object
- Object deletion → Cannot fully restore (warn user)
- Property changes → Restore previous value
- Component addition → Remove component
- Component removal → Cannot fully restore

### For Script Changes

Scripts modified via manage_script can be rolled back:
1. Claude reads script before modification (cached)
2. On rollback, restore the cached version
3. Trigger asset refresh

### For Asset Changes

Assets created or modified:
1. Track asset operations
2. On rollback, delete created assets
3. Restore modified assets from cache

## Implementation

### Session Change Log

Claude maintains a mental change log:
```
Changes this session:
1. Created "Enemy" GameObject
2. Modified PlayerMovement.cs: changed speed from 5 to 10
3. Added Rigidbody to "Coin"
4. Created Material "EnemyRed"
5. Modified Enemy position from (0,0,0) to (5,0,0)
```

### Rollback Process

**Single rollback (most recent):**
```
1. Identify last change
2. Determine reversal action
3. Execute reversal
4. Confirm to user
```

**Multiple rollback:**
```
1. Get list of N most recent changes
2. Reverse in LIFO order (last first)
3. Report each reversal
```

**Targeted rollback:**
```
1. Filter changes by target (player, scripts, etc.)
2. Show user what will be rolled back
3. Confirm before executing
4. Execute reversals
```

## Reversal Actions

| Change Type | Reversal Action |
|-------------|-----------------|
| Create object | Delete object |
| Delete object | ⚠️ Cannot restore - offer to recreate |
| Modify property | Set back to previous value |
| Add component | Remove component |
| Remove component | ⚠️ Cannot restore - offer to re-add |
| Create script | Delete script file |
| Modify script | Restore cached version |
| Create asset | Delete asset |
| Modify asset | Restore cached version |

## User Interaction

### Before Rollback
```
"I'm about to undo: [description of change]
This will [specific reversal action].
Proceed?"
```

### After Rollback
```
"Rolled back: [what was undone]
The [object/script/asset] is now back to [previous state]."
```

### Cannot Rollback Warning
```
"I can't fully restore [deleted item] because Unity doesn't
have that data anymore. I can recreate it if you describe
what it should be."
```

## Limitations

**Cannot Rollback:**
- Changes made before this session
- Objects deleted (data is gone)
- Components removed (settings lost)
- Undo/redo in Unity Editor (separate system)

**Partial Rollback:**
- If object was modified multiple times, can only restore to session start state
- Complex prefab changes may not fully revert

## Best Practices

1. **Before major changes:** Take a snapshot (`/snapshot`)
2. **After rollback:** Verify with `/snapshot` or `/playtest`
3. **Multiple iterations:** Consider saving scene before experimenting
4. **Can't rollback?** Claude can recreate from memory if you describe it

## Alternative Approaches

If rollback isn't possible:
1. **Scene reload:** If scene was saved, reload it
2. **Git:** If project uses git, can restore files
3. **Recreate:** Claude remembers what was built and can rebuild
4. **Unity Undo:** Manual Ctrl+Z in Unity Editor (separate from Claude changes)

## Example Session

```
User: Make the player bigger
Claude: [Changes player scale from 1 to 2]
        "Player is now twice as big!"

User: /rollback
Claude: "Rolling back: Player scale change
        Restoring scale from (2,2,2) to (1,1,1)
        Done - player is back to original size."

User: /rollback last 3
Claude: "I'll undo the last 3 changes:
        1. Enemy speed: 8 → 5
        2. Coin color: gold → yellow
        3. Player health: 5 → 3
        All rolled back!"
```

## Integration with Other Commands

- After `/rollback`, suggest `/snapshot` to verify state
- After `/rollback`, suggest `/playtest` to test
- Track changes from all commands for rollback capability
