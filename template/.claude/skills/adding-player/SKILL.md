---
description: Creating player characters with movement, controls, and multiplayer sync
---

# Adding Player Characters

Use this skill when the user wants a player character, avatar, or controllable entity.

## Trigger Phrases
- "player", "character", "avatar"
- "move around", "control", "walk", "run", "fly"
- "WASD", "arrow keys", "controller"

## Implementation Checklist

1. **Create Player GameObject**
   - Visual representation (primitives or imported model)
   - Appropriate scale and position

2. **Add Movement Script**
   - WASD/Arrow keys for direction
   - Appropriate for game type:
     - Top-down: X/Z movement
     - Platformer: X movement + jump
     - Flying: Full 3D movement
     - Space: Thrust-based

3. **Add Physics (if needed)**
   - Rigidbody for physics-based movement
   - CharacterController for precise control
   - Colliders for collision detection

4. **Multiplayer Setup (Normcore)**
   - Add RealtimeView component
   - Add RealtimeTransform component
   - Wrap input in ownership check:
     ```csharp
     if (!realtimeView.isOwnedLocallyInHierarchy) return;
     ```
   - Save prefab to Resources/ folder

5. **Camera Setup**
   - Consider if camera should follow player
   - For multiplayer: camera only for local player

## Movement Patterns

### Top-Down
```csharp
float h = Input.GetAxis("Horizontal");
float v = Input.GetAxis("Vertical");
Vector3 move = new Vector3(h, 0, v).normalized * speed * Time.deltaTime;
transform.Translate(move, Space.World);
```

### Platformer
```csharp
float h = Input.GetAxis("Horizontal");
rb.velocity = new Vector3(h * speed, rb.velocity.y, 0);
if (Input.GetButtonDown("Jump") && isGrounded)
    rb.velocity = new Vector3(rb.velocity.x, jumpForce, 0);
```

### Flying/Space
```csharp
float h = Input.GetAxis("Horizontal");
float v = Input.GetAxis("Vertical");
float up = Input.GetKey(KeyCode.Space) ? 1 : Input.GetKey(KeyCode.LeftShift) ? -1 : 0;
transform.Translate(new Vector3(h, up, v) * speed * Time.deltaTime);
```

## Output to User
Explain in simple terms:
- "I created your player character"
- "Use WASD to move and Space to jump"
- "Your character is ready for multiplayer - each player gets their own"
