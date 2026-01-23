# /fix

Help diagnose and fix a specific problem the user describes.

**User's problem:** $ARGUMENTS

## What This Does

Helps fix the specific problem the user described. If no description, ask them what's wrong.

Examples:
- `/fix player clips through walls` -> Fix collision issues
- `/fix multiplayer not syncing` -> Debug Normcore setup
- `/fix error NullReferenceException` -> Find the null reference
- `/fix` (no args) -> Ask what's happening

## Steps

1. Read the user's problem description above
2. If no description provided, ask: "What's happening? What did you expect vs what you see?"
3. Investigate the specific issue:
   - Use Unity MCP to check Console for errors
   - Check relevant scripts and components
   - Look at Inspector settings

## Common Issues & Fixes

**Collision issues (clips through, doesn't collide)**
- Check Collider component exists
- Check layer collision matrix
- Check rigidbody settings

**Multiplayer not syncing**
- Is App Key set in NormcoreAppSettings?
- Does object have RealtimeView?
- Does object have RealtimeTransform?
- Is prefab in Resources/ folder?

**NullReferenceException**
- Click the error to find the line
- Something in Inspector isn't connected
- A GetComponent failed

**Player doesn't move**
- Check movement script is attached
- Check isOwnedLocallyInHierarchy (Normcore)
- Check Input settings

## Explain the Fix

After fixing, always tell them:
- What was wrong
- What you changed to fix it
- Why this happened (so they learn)
