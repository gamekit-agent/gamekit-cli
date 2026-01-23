# /playtest

Enter play mode and monitor for issues.

**User's request:** $ARGUMENTS

## What This Does

Starts the game in Unity's Play mode and watches for errors, warnings, or issues. Helps debug problems without manually checking the console.

Examples:
- `/playtest` -> Start playing and watch for any errors
- `/playtest for 30 seconds` -> Play for a specific duration
- `/playtest and check performance` -> Also monitor FPS/performance
- `/playtest the multiplayer` -> Test with focus on Normcore sync

## Steps

1. Clear the console of old messages
2. Enter Play mode using manage_editor
3. Wait for user to play or for specified duration
4. Check console for errors and warnings
5. Report any issues found
6. Stop play mode when done

## Process

### Before Playing
```
1. manage_console action="clear" - Clear old logs
2. manage_editor action="get_state" - Check current state
```

### Start Playing
```
1. manage_editor action="play" - Enter play mode
2. Tell user "Game is running! Play around and I'll watch for issues."
```

### While Playing
```
1. Periodically check: manage_console action="get" types=["error", "warning"]
2. If errors found, report them immediately
3. Monitor for common issues
```

### Stop Playing
```
1. manage_editor action="stop" - Exit play mode
2. Final console check
3. Summarize all issues found
```

## Common Issues to Watch For

**NullReferenceException**
- Something in a script isn't connected
- Check what object is null and suggest fix

**Missing Component**
- A required component wasn't added
- Identify which component and where to add it

**Network Errors (Normcore)**
- App Key not set
- Room connection failed
- Ownership issues

**Physics Issues**
- Objects falling through floor
- Erratic collision behavior

**Performance**
- If checking performance, use manage_profiler

## What to Report

For each issue found, tell the user:
1. What error/warning appeared
2. Which script/object caused it (if known)
3. A simple explanation of what went wrong
4. How to fix it

## Explain to User

After playtest, give them:
- Summary: "Found X errors, Y warnings"
- List of each issue with explanation
- Suggested fixes
- Or: "No issues found! Your game is running smoothly!"
