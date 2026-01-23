---
description: Creating materials, colors, textures, and visual styles for objects
---

# Creating Materials

Use this skill to give objects visual identity through colors, textures, and material properties.

## Trigger Phrases
- "color", "colored", "red", "blue", etc.
- "shiny", "metallic", "glossy"
- "transparent", "glass", "see-through"
- "glowing", "emissive", "neon"
- "texture", "wood", "stone", "metal"

## When to Apply (Automatically)

Apply materials when:
- Creating any visible object (give it identity)
- User describes a look ("red enemy", "golden coin")
- Objects need visual distinction (player vs enemy)
- Effects need glow (lasers, power-ups)

## Implementation

### Creating Materials via MCP
```
manage_asset action="create"
  path="Assets/Materials/MyMaterial.mat"
  asset_type="Material"
  properties={"color": [R, G, B, A]}
```

### Applying to Objects
```
manage_gameobject action="set_component_property"
  target="ObjectName"
  component_name="MeshRenderer"
  component_properties={"MeshRenderer": {"sharedMaterial": "Assets/Materials/MyMaterial.mat"}}
```

## Color Presets (RGBA 0-1)

| Color | Values | Use For |
|-------|--------|---------|
| Red | [1, 0.2, 0.2, 1] | Enemies, damage, hazards |
| Green | [0.2, 1, 0.2, 1] | Health, goals, safe zones |
| Blue | [0.2, 0.5, 1, 1] | Player, water, UI |
| Gold | [1, 0.85, 0, 1] | Coins, treasure, rewards |
| Cyan | [0, 1, 1, 1] | Player ship, energy |
| Purple | [0.7, 0.2, 1, 1] | Magic, special items |
| Orange | [1, 0.5, 0, 1] | Fire, warnings |
| White | [1, 1, 1, 1] | Neutral, projectiles |
| Dark Gray | [0.3, 0.3, 0.3, 1] | Environment, rocks |
| Brown | [0.5, 0.3, 0.1, 1] | Wood, dirt, crates |

## Material Types

### Matte (Default)
```
color: [R, G, B, 1]
metallic: 0
smoothness: 0.2
```

### Shiny/Glossy
```
color: [R, G, B, 1]
metallic: 0
smoothness: 0.8
```

### Metallic
```
color: [0.8, 0.8, 0.8, 1]
metallic: 1.0
smoothness: 0.7
```

### Transparent/Glass
```
color: [R, G, B, 0.3]  // Low alpha
renderingMode: Transparent
metallic: 0
smoothness: 1.0
```

### Glowing/Emissive
```
color: [R, G, B, 1]
emission: [R*2, G*2, B*2, 1]  // Brighter than base
```

## Organization

Store materials organized by purpose:
```
Assets/Materials/
├── Player/
├── Enemies/
├── Environment/
├── Effects/
└── UI/
```

## Visual Language

Establish consistent meaning:
- **Player**: Cool colors (blue, cyan)
- **Enemies**: Warm/danger colors (red, orange)
- **Collectibles**: Reward colors (gold, green)
- **Hazards**: Warning colors (red, orange)
- **Environment**: Neutral (gray, brown)
- **Goals**: Positive (green, gold)

## Output to User
Don't explain material properties:
- "I made your spaceship cyan and the enemies red so they're easy to tell apart"
- "The coins are golden and slightly glowing"
- "Hazards are marked in red"
