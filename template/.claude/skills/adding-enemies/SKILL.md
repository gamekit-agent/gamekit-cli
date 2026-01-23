---
description: Creating enemies, NPCs, and AI-controlled characters
---

# Adding Enemies and NPCs

Use this skill when the user wants enemies, hostile creatures, NPCs, or AI-controlled characters.

## Trigger Phrases
- "enemy", "enemies", "bad guy", "monster"
- "NPC", "character that moves on its own"
- "AI", "chase", "patrol", "attack"
- "zombie", "robot", "guard", etc.

## Implementation Checklist

1. **Create Enemy GameObject**
   - Visual representation (often red-tinted for enemies)
   - Appropriate collider (trigger for damage zones)
   - Tag as "Enemy" for identification

2. **Add AI Behavior**
   - Choose pattern based on description:
     - Chase: Move toward player
     - Patrol: Move between waypoints
     - Stationary: Turret-style, doesn't move
     - Wander: Random movement

3. **Add Combat (if applicable)**
   - Health system
   - Damage dealing (trigger collider)
   - Death behavior (destroy, ragdoll, respawn)

4. **Multiplayer Setup (Normcore)**
   - Add RealtimeView
   - Add RealtimeTransform
   - Consider ownership: server-authoritative or first-hit-owns

5. **Spawning**
   - Create prefab in Resources/
   - Set up spawner if needed (waves, continuous)

## AI Patterns

### Simple Chase
```csharp
void Update()
{
    if (target == null) target = GameObject.FindWithTag("Player")?.transform;
    if (target != null)
    {
        Vector3 dir = (target.position - transform.position).normalized;
        transform.position += dir * speed * Time.deltaTime;
        transform.LookAt(target);
    }
}
```

### Patrol Between Points
```csharp
public Transform[] waypoints;
private int currentWaypoint = 0;

void Update()
{
    Transform wp = waypoints[currentWaypoint];
    transform.position = Vector3.MoveTowards(transform.position, wp.position, speed * Time.deltaTime);

    if (Vector3.Distance(transform.position, wp.position) < 0.5f)
        currentWaypoint = (currentWaypoint + 1) % waypoints.Length;
}
```

### Chase + Patrol Hybrid
```csharp
void Update()
{
    float distToPlayer = Vector3.Distance(transform.position, player.position);

    if (distToPlayer < detectionRange)
        ChasePlayer();
    else
        Patrol();
}
```

## Health & Damage

```csharp
public class EnemyHealth : MonoBehaviour
{
    public int maxHealth = 3;
    private int health;

    void Start() => health = maxHealth;

    public void TakeDamage(int amount)
    {
        health -= amount;
        if (health <= 0) Die();
    }

    void Die()
    {
        // Spawn particles, play sound
        Destroy(gameObject);
    }
}
```

## Output to User
Explain behavior simply:
- "I added enemies that will chase you when you get close"
- "They have 3 health - shoot them 3 times to defeat them"
- "New enemies spawn every 5 seconds from the edges"
