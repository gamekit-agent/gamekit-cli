# /find-asset

Find and import free game assets based on the user's description.

**User's request:** $ARGUMENTS

## What This Does

Searches free asset sources for models, textures, or other game assets matching what the user described, then helps import them into Unity.

Examples:
- `/find-asset pirate character` -> Find a pirate 3D model
- `/find-asset wooden crate` -> Find a crate prop
- `/find-asset grass texture` -> Find a tileable grass texture
- `/find-asset sword` -> Find a sword model

## Asset Sources

Search these free asset sources in order:

### 1. Kenney (Best for game-ready assets)
- **Website:** https://kenney.nl/assets
- **What they have:** Characters, props, UI, textures - all game-ready and CC0
- **How to search:** Browse categories or use site search
- **Import:** Download ZIP, extract, drag into Unity Assets folder

### 2. Polyhaven (Best for textures and HDRIs)
- **API:** https://api.polyhaven.com/assets
- **Website:** https://polyhaven.com/
- **What they have:** High-quality textures, HDRIs, 3D models - all CC0
- **How to search:** Use API or browse website
- **Import:** Download, drag into Unity Assets folder

### 3. Mixamo (Best for animated characters)
- **Website:** https://www.mixamo.com/
- **What they have:** Free rigged & animated humanoid characters
- **How to search:** Browse character library
- **Import:** Download as FBX, drag into Unity Assets folder

### 4. Sketchfab (Large variety)
- **Website:** https://sketchfab.com/search?features=downloadable&licenses=322a749bcfa841b29dff1571c1d5b170&licenses=b9ddc40b93e34cdca1fc152f39b9f375&type=models
- **What they have:** Huge library, filter by "Downloadable" and "CC" license
- **Import:** Download as FBX or GLTF, may need conversion

### 5. Unity Asset Store (Free section)
- **Website:** https://assetstore.unity.com/?category=3d&free=true
- **What they have:** Unity-ready assets, some free
- **Import:** Import directly through Unity Package Manager

## Steps

1. Understand what the user is looking for (character, prop, texture, etc.)
2. Search the most appropriate source(s) above using WebFetch or WebSearch
3. Find 2-3 good options and present them to the user with:
   - Name and preview link
   - What's included (model, textures, animations?)
   - License (should be free for commercial use)
4. Once user picks one, guide them through downloading and importing
5. Help set up the asset in their scene (add components, configure materials, etc.)

## For Character Assets

If importing a character model:
1. Download as FBX format when possible
2. Place in `Assets/Characters/` or `Assets/Models/`
3. Check if it has animations - if not, suggest Mixamo for rigging
4. Help add required components (Animator, Collider, Rigidbody)
5. For multiplayer: Add RealtimeView and RealtimeTransform
6. Save as prefab in `Assets/Resources/` if it needs to spawn at runtime

## Explain to User

After finding assets, tell them:
- What options you found and where they're from
- The license (confirm it's free to use)
- How to download and import step-by-step
- Any setup needed after importing
