---
description: Setting up cameras for different game perspectives and following behavior
---

# Setting Up Cameras

Use this skill to configure how the player sees the game world.

## Trigger Phrases
- "camera", "view", "perspective"
- "top-down", "side view", "first person", "third person"
- "follow", "track"
- "zoom", "field of view"

## When to Apply (Automatically)

Apply camera setup when:
- Creating a new scene (needs a camera)
- Creating a player (camera might need to follow)
- Game type implies camera style (platformer = side view)
- Multiplayer (each player needs own camera)

## Camera Types by Game Genre

### Top-Down (Shooter, RPG, Strategy)
```
Position: Above player, looking down
Rotation: (90, 0, 0) - pointing straight down
Orthographic: true (optional, removes perspective)
OrthographicSize: 10-15 (adjust for zoom level)
```

### Side-Scroller (Platformer)
```
Position: To the side of play area
Rotation: (0, 0, 0) or (0, 90, 0)
Orthographic: true (classic 2D look)
Camera follows player X, fixed Y
```

### Third-Person (Action, Adventure)
```
Position: Behind and above player
Offset: (0, 5, -10) typical
Rotation: Looking at player
Follow with smoothing
```

### First-Person (FPS, Horror)
```
Position: Player's eye level
Child of player object
Rotation: Controlled by mouse look
```

## Camera Follow Scripts

### Simple Follow
```csharp
public class CameraFollow : MonoBehaviour
{
    public Transform target;
    public Vector3 offset = new Vector3(0, 10, -5);
    public float smoothSpeed = 5f;

    void LateUpdate()
    {
        if (target == null) return;

        Vector3 desiredPosition = target.position + offset;
        transform.position = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
        transform.LookAt(target);
    }
}
```

### Top-Down Follow (No Rotation)
```csharp
public class TopDownCamera : MonoBehaviour
{
    public Transform target;
    public float height = 15f;
    public float smoothSpeed = 5f;

    void LateUpdate()
    {
        if (target == null) return;

        Vector3 desiredPosition = new Vector3(target.position.x, height, target.position.z);
        transform.position = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
    }
}
```

### Side-Scroller Follow
```csharp
public class SideScrollCamera : MonoBehaviour
{
    public Transform target;
    public float xOffset = 3f;
    public float fixedY = 5f;
    public float fixedZ = -10f;

    void LateUpdate()
    {
        if (target == null) return;

        Vector3 pos = transform.position;
        pos.x = Mathf.Lerp(pos.x, target.position.x + xOffset, 5f * Time.deltaTime);
        pos.y = fixedY;
        pos.z = fixedZ;
        transform.position = pos;
    }
}
```

## Multiplayer Camera Setup

For Normcore multiplayer:
```csharp
public class PlayerCamera : MonoBehaviour
{
    public Camera playerCamera;
    private RealtimeView realtimeView;

    void Start()
    {
        realtimeView = GetComponent<RealtimeView>();

        // Only enable camera for local player
        if (playerCamera != null)
        {
            playerCamera.enabled = realtimeView.isOwnedLocallyInHierarchy;
            playerCamera.GetComponent<AudioListener>().enabled = realtimeView.isOwnedLocallyInHierarchy;
        }
    }
}
```

## Camera Settings

### Orthographic (2D-style)
- No perspective distortion
- Good for: top-down, side-scrollers, pixel art
- OrthographicSize controls zoom

### Perspective (3D)
- Has depth/distance effect
- Good for: 3D games, first-person, third-person
- Field of View controls zoom (60° typical)

### Background
- Skybox: 3D outdoor scenes
- Solid Color: Simple or stylized games
- Clear Flags: Skybox, Solid Color, Depth Only, Don't Clear

## Output to User
Explain the view simply:
- "You'll see the game from above, looking down at your character"
- "The camera follows you as you move"
- "Each player has their own view in multiplayer"
