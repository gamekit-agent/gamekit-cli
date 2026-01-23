# /explain

Explain a Unity or Normcore concept in simple terms.

**User wants to understand:** $ARGUMENTS

## What This Does

Explains the concept the user asked about using simple language and analogies.

Examples:
- `/explain what is a prefab` -> Explain prefabs with analogies
- `/explain how does multiplayer work` -> Explain Normcore sync
- `/explain the code in PlayerController.cs` -> Walk through the script
- `/explain` (no args) -> Ask what they want to learn about

## How to Explain

1. Read what the user wants to understand above
2. Use simple language - assume they're new to game dev
3. Use real-world analogies
4. Give concrete examples from this project when possible

## Quick Reference (for common concepts)

**GameObject** - "A LEGO brick. By itself it's just a thing. You add components to give it abilities."

**Component** - "Abilities you add to a GameObject. Movement, physics, visuals - each is a component."

**Prefab** - "A template. Make one player, save as prefab, now you can spawn copies."

**Script** - "Instructions in C#. 'When player presses W, move forward.'"

**RealtimeView** - "Normcore's tracking tag. Put on anything that needs to sync between players."

**RealtimeTransform** - "Syncs position/rotation. Add to anything that moves in multiplayer."

**Ownership** - "Only one player controls each object. Owner moves it, others see the movement."

**Room** - "A multiplayer session. Same room name = same game. Like a Discord channel."

## For Code Explanations

If they ask about specific code:
1. Read the file they mention
2. Break it down section by section
3. Explain what each part does in plain English
4. Point out the important parts they should understand
