# /playtest

Enter play mode and monitor for issues.

**User's request:** $ARGUMENTS

## What This Does

Starts the game in Unity's Play mode and watches for errors, warnings, or issues. Helps debug problems without manually checking the console.

Examples:
- `/playtest` -> Start playing and watch for any errors
- `/playtest for 30 seconds` -> Play for a specific duration
- `/playtest and check performance` -> Also monitor for issues
- `/playtest the multiplayer` -> Test with focus on Normcore sync

## Steps

1. Check console for pre-existing errors
2. Enter Play mode
3. Wait for user to play or for specified duration
4. Check console for errors and warnings
5. Report any issues found
6. Stop play mode when done

## Process

### Before Playing
```bash
gamekit console --errors        # Check for pre-existing errors
gamekit play status             # Check current state
```

### Start Playing
```bash
gamekit play start              # Enter play mode
# Tell user "Game is running! Play around and I'll watch for issues."
```

### While Playing
```bash
# Periodically check for errors
gamekit console --errors
# If errors found, report them immediately
```

### Stop Playing
```bash
gamekit play stop               # Exit play mode
gamekit console --errors        # Final console check
# Summarize all issues found
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
