# /preview-assets

Search for assets and show options before downloading.

**User's request:** $ARGUMENTS

## What This Does

Searches multiple free asset sources and presents options with descriptions, previews, and license info BEFORE downloading anything. Lets you choose exactly what you want.

Examples:
- `/preview-assets spaceship` -> Show spaceship options from multiple sources
- `/preview-assets zombie sounds` -> Show audio options for zombies
- `/preview-assets low poly trees` -> Show 3D tree model options
- `/preview-assets pixel art character` -> Show 2D sprite options

## Process

### 1. Search Multiple Sources
```
Search in parallel:
- Polyhaven API (textures, HDRIs)
- OpenGameArt (2D, 3D, audio)
- Kenney.nl (game-ready assets)
- itch.io free assets
- Sketchfab (3D models)
```

### 2. Gather Options
For each result, collect:
- Name and description
- Preview URL (if available)
- Source website
- License type
- File format
- Download method (auto/manual)

### 3. Present Options

```
## Asset Search: "[query]"

### Option 1: [Asset Name]
- Source: Polyhaven
- License: CC0 (free, no attribution)
- Format: PNG textures (1K/2K/4K)
- Preview: [URL to preview image]
- Download: Automatic
- Description: [brief description]

### Option 2: [Asset Name]
- Source: OpenGameArt
- License: CC-BY 3.0 (attribution required)
- Format: ZIP with FBX models
- Preview: [URL to preview]
- Download: Automatic
- Description: [brief description]

### Option 3: [Asset Name]
- Source: Sketchfab
- License: CC-BY
- Format: FBX/OBJ
- Preview: [URL]
- Download: Manual (requires login)
- Description: [brief description]

---
Which option would you like? (1, 2, 3, or "none")
```

### 4. User Selects
User picks an option or says "none" / "search again with different terms"

### 5. Download Selected
Once user confirms, use asset-finder agent to download the chosen asset.

## Preview Information

### For Textures (Polyhaven)
```
Name: rock_ground_02
Preview: https://cdn.polyhaven.com/asset_img/thumbs/rock_ground_02.png
Resolution options: 1K, 2K, 4K, 8K
Includes: Diffuse, Normal, Roughness, Displacement
```

### For 3D Models
```
Name: Low Poly Spaceship
Preview: [thumbnail URL]
Polygon count: ~500 tris
Includes: FBX model, textures
Rigged: No
Animated: No
```

### For Audio
```
Name: Laser Shot SFX Pack
Preview: [Cannot preview audio - describe instead]
Duration: 10 sounds, 0.5-2 seconds each
Format: WAV 44.1kHz
Style: Sci-fi, arcade
```

### For 2D/Sprites
```
Name: Platformer Character Pack
Preview: [sprite sheet thumbnail]
Sprites: 48 frames
Size: 32x32 pixels
Animations: Idle, Walk, Jump, Attack
```

## Search Strategy

### By Asset Type

**3D Models:**
1. Polyhaven (if available)
2. Sketchfab (CC filter)
3. OpenGameArt
4. itch.io

**Textures:**
1. Polyhaven (best quality, API works)
2. OpenGameArt
3. itch.io

**Audio/SFX:**
1. OpenGameArt (reliable downloads)
2. Freesound (manual download)
3. itch.io

**2D/Sprites:**
1. Kenney via OpenGameArt
2. OpenGameArt directly
3. itch.io

**UI Elements:**
1. Kenney via OpenGameArt
2. itch.io

## Quality Indicators

Show quality hints:
```
[HIGH QUALITY] - Polyhaven, Kenney (professional grade)
[GOOD] - OpenGameArt popular items
[VARIES] - itch.io, Sketchfab (check individual)
```

## License Quick Reference

| License | Attribution | Commercial | Modify |
|---------|-------------|------------|--------|
| CC0 | No | Yes | Yes |
| CC-BY | Yes | Yes | Yes |
| CC-BY-SA | Yes | Yes | Yes (share alike) |
| CC-BY-NC | Yes | No | Yes |

Always prefer CC0 when available.

## Integration with Asset Finder

After user selects:
```
1. Call asset-finder agent with specific URL/source
2. Download to appropriate folder
3. Report success/failure
4. If failure, provide manual instructions
```

## Handling "None of these work"

If user rejects all options:
```
"None of these quite right? I can:
1. Search with different terms
2. Search a specific site
3. Describe what you're looking for and I'll suggest alternatives
4. You can find your own and tell me where to download from"
```

## Example Session

```
User: /preview-assets zombie

Claude:
## Asset Search: "zombie"

### Option 1: Zombie Character Pack (Kenney)
- Source: OpenGameArt (Kenney mirror)
- License: CC0
- Format: FBX models + PNG textures
- Download: Automatic
- Contents: 4 zombie variations, low poly

### Option 2: Zombie Sounds Pack
- Source: OpenGameArt
- License: CC-BY 3.0
- Format: WAV files
- Download: Automatic
- Contents: Groans, screams, attacks (12 sounds)

### Option 3: Animated Zombie
- Source: Mixamo
- License: Free (Mixamo terms)
- Format: FBX with animations
- Download: Manual (Adobe account)
- Contents: Rigged zombie with walk, attack anims

Which would you like? Or describe what you need more specifically.

User: 1 and 2

Claude: [Downloads both automatically, places in correct folders]
"Done! Zombie models in Assets/Downloaded/Models/Kenney_Zombies/
Zombie sounds in Assets/Downloaded/Audio/SFX/Zombies/"
```

## Benefits Over Direct Download

1. **No wasted downloads** - See before you commit
2. **Compare options** - Multiple sources at once
3. **Understand licenses** - Know attribution requirements
4. **Quality preview** - Thumbnails when available
5. **Format awareness** - Know what you're getting
