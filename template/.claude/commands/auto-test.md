# /auto-test

Automatically test the game and verify functionality without manual intervention.

**User's request:** $ARGUMENTS

## What This Does

Enters play mode, runs for a specified duration (or until conditions are met), captures all console output, and reports results. This allows Claude to verify changes work without asking the user to manually playtest.

Examples:
- `/auto-test` -> Quick 5-second test, check for errors
- `/auto-test 30 seconds` -> Longer test duration
- `/auto-test spawning` -> Test until spawning occurs
- `/auto-test until error` -> Run until an error happens
- `/auto-test performance` -> Include FPS/performance metrics

## Steps

1. Save the current scene (preserve state)
2. Clear console logs
3. Start profiler if performance test
4. Enter play mode
5. Wait for duration or condition
6. Capture console output
7. Stop play mode
8. Analyze and report results

## Process

### Pre-Test Setup
```
1. manage_scene action="save" - Save current scene state
2. manage_console action="clear" - Clear old logs
3. manage_editor action="get_state" - Confirm ready state
4. If performance test: manage_profiler action="start"
```

### Enter Play Mode
```
1. manage_editor action="play"
2. Record start time
```

### Monitoring Loop
```
Every 1-2 seconds while playing:
1. manage_console action="get" types=["error", "exception"] count=10
2. If critical error found and not "until error" mode, may stop early
3. Track elapsed time
4. If performance mode: manage_profiler action="get_rendering_stats"
```

### Exit Conditions
```
Stop when ANY of these occur:
- Duration reached (default 5 seconds)
- User-specified condition met
- Critical crash/exception
- Maximum time (60 seconds safety limit)
```

### Stop and Collect
```
1. manage_editor action="stop" - Exit play mode
2. manage_console action="get" types=["all"] - Get ALL logs
3. If profiling: manage_profiler action="stop"
4. If profiling: manage_profiler action="get_memory_stats"
```

## Test Configurations

### Quick Smoke Test (default)
```
Duration: 5 seconds
Checks: Errors, exceptions, warnings
Pass criteria: No errors
```

### Extended Test
```
Duration: 30 seconds
Checks: Errors, performance degradation, memory leaks
Pass criteria: No errors, stable FPS
```

### Performance Test
```
Duration: 15 seconds
Profiler: Enabled
Checks: FPS, draw calls, memory allocation
Reports: Min/Max/Avg FPS, bottlenecks
```

### Stress Test
```
Duration: 60 seconds
Focus: Memory growth, performance over time
Checks: GC allocations, frame drops
```

## Output Report

```
## Auto-Test Results

### Summary
- Duration: X seconds
- Status: PASS / FAIL / WARNINGS
- Errors: X | Warnings: Y | Logs: Z

### Errors Found
[List each error with:]
- Message
- Script/Line (if available)
- Likely cause
- Suggested fix

### Warnings
[List warnings that might indicate issues]

### Performance (if tested)
- Average FPS: X
- Min FPS: X (at timestamp)
- Draw Calls: X
- Memory: X MB

### Verification
[What was confirmed working:]
- Game starts without crash
- Player spawns correctly
- No null reference errors
- [Feature-specific checks]

### Recommendations
[Any improvements suggested based on results]
```

## Automatic Test Scenarios

When Claude makes changes, auto-test can verify:

**After adding player:**
- Player spawns
- No movement errors
- Camera follows (if set up)

**After adding enemies:**
- Enemies spawn
- AI doesn't error
- Damage system works

**After adding collectibles:**
- Items appear
- Collection triggers work
- Score updates (check logs)

**After physics changes:**
- Objects don't fall through floor
- Collisions register
- No physics explosions

## Integration with Other Commands

`/auto-test` can be called automatically after:
- `/fix` - Verify the fix worked
- Adding new features - Smoke test
- `/playtest` - As automated portion before manual testing

## Safety

- Maximum runtime: 60 seconds (prevents infinite loops)
- Auto-stop on repeated exceptions
- Scene is saved before test (can recover)
- Reports any scene changes during test
