---
description: Setting up physics, collisions, rigidbodies, and physical interactions
---

# Setting Up Physics

Use this skill when objects need to fall, bounce, collide, be pushed, or have any physical behavior.

## Trigger Phrases
- "fall", "gravity", "drop"
- "bounce", "bouncy"
- "collide", "collision", "hit"
- "push", "physics"
- "roll", "slide"

## When to Apply (Automatically)

Apply physics when:
- Objects need to fall (gravity)
- Objects need to collide with each other
- Objects need trigger detection (OnTriggerEnter)
- Objects need to be pushed or affected by forces
- Objects need realistic movement

## Implementation Checklist

1. **Add Rigidbody**
   - useGravity: true for falling objects, false for floating
   - isKinematic: true for script-controlled, false for physics-controlled
   - mass: affects push/pull behavior
   - drag: slows movement over time

2. **Add Colliders**
   - Primitive (Box, Sphere, Capsule) preferred for performance
   - Mesh Collider only when needed (convex for moving objects)
   - isTrigger = true for detection without physical collision

3. **Physics Materials** (optional)
   - Bounciness: 0 (no bounce) to 1 (full bounce)
   - Friction: 0 (ice) to 1+ (sticky)

4. **Layer Collision Matrix**
   - Configure which layers collide with which
   - Optimize by disabling unnecessary collisions

## Common Setups

### Falling Object (Crate, Ball)
```
Rigidbody:
  - useGravity: true
  - isKinematic: false
  - mass: 1-10 based on size

Collider:
  - BoxCollider or SphereCollider
  - isTrigger: false
```

### Trigger Zone (Pickup, Damage Area)
```
Rigidbody:
  - useGravity: false
  - isKinematic: true

Collider:
  - isTrigger: true
```

### Projectile (Bullet, Laser)
```
Rigidbody:
  - useGravity: false
  - isKinematic: true
  - collisionDetectionMode: Continuous (for fast objects)

Collider:
  - isTrigger: true
```

### Player Character
```
Option A - CharacterController:
  - More precise, less physics-y
  - Good for platformers

Option B - Rigidbody:
  - useGravity: true
  - constraints: Freeze rotation X, Z
  - Good for physics-based games
```

## Gotchas to Remember

1. **Triggers need Rigidbody**: OnTriggerEnter only fires if at least one object has a Rigidbody

2. **Kinematic vs Dynamic**:
   - Kinematic: moved by scripts, not affected by physics
   - Dynamic: moved by physics forces

3. **Collision Detection**:
   - Discrete: default, can miss fast objects
   - Continuous: catches fast objects, more expensive

4. **Layer Matrix**: If collisions aren't working, check Edit > Project Settings > Physics

## Physics Materials

### Bouncy Ball
```
bounciness: 0.8
dynamicFriction: 0.2
staticFriction: 0.2
bounceCombine: Maximum
```

### Ice/Slippery
```
bounciness: 0
dynamicFriction: 0.05
staticFriction: 0.05
frictionCombine: Minimum
```

### Sticky/High Friction
```
bounciness: 0
dynamicFriction: 1
staticFriction: 1
```

## Output to User
Don't mention physics jargon. Say:
- "Now the crates will fall and you can push them"
- "The ball bounces off walls"
- "Walking into the coin picks it up"
