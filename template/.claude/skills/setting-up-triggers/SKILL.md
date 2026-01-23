---
description: Creating trigger zones for detection, damage areas, checkpoints, goals
---

# Setting Up Triggers

Use this skill for invisible (or visible) zones that detect when something enters them.

## Trigger Phrases
- "when player enters", "when touched"
- "detection", "detect"
- "zone", "area"
- "checkpoint", "goal", "finish"
- "damage area", "hazard"
- "teleport", "portal"

## When to Apply (Automatically)

Apply triggers when:
- Collecting items (player touches coin)
- Taking damage (player enters hazard)
- Reaching goals (player reaches end zone)
- Teleporting (player enters portal)
- Triggering events (player enters room → enemies spawn)
- Checkpoints (save progress)

## Implementation Checklist

1. **Create Trigger Zone**
   - GameObject with Collider (isTrigger = true)
   - Rigidbody (isKinematic = true) for detection
   - Size/shape appropriate for the zone

2. **Add Trigger Script**
   - OnTriggerEnter for first contact
   - OnTriggerStay for continuous (damage over time)
   - OnTriggerExit for leaving

3. **Filter by Tag**
   - Check for specific tags (Player, Enemy, Projectile)
   - Ignore irrelevant collisions

4. **Visual Feedback** (optional)
   - Semi-transparent material for visible zones
   - Gizmos for editor visibility
   - Particles or effects on trigger

## Common Trigger Types

### Collection Trigger (Coins, Items)
```csharp
void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Player"))
    {
        // Give reward
        ScoreManager.Instance.AddScore(10);
        // Remove item
        Destroy(gameObject);
    }
}
```

### Damage Zone (Hazard, Spikes)
```csharp
public int damagePerSecond = 10;

void OnTriggerStay(Collider other)
{
    if (other.CompareTag("Player"))
    {
        var health = other.GetComponent<Health>();
        health?.TakeDamage(Mathf.RoundToInt(damagePerSecond * Time.deltaTime));
    }
}
```

### Instant Death
```csharp
void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Player"))
    {
        GameManager.Instance.PlayerDied();
    }
}
```

### Checkpoint
```csharp
void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Player"))
    {
        GameManager.Instance.SetCheckpoint(transform.position);
        // Visual feedback - flag raises, color changes
        GetComponent<Renderer>().material.color = Color.green;
    }
}
```

### Goal/Win Zone
```csharp
void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Player"))
    {
        GameManager.Instance.LevelComplete();
    }
}
```

### Teleporter
```csharp
public Transform destination;

void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Player"))
    {
        other.transform.position = destination.position;
    }
}
```

### Enemy Spawn Trigger (One-time)
```csharp
public GameObject[] enemiesToSpawn;
public Transform[] spawnPoints;
private bool triggered = false;

void OnTriggerEnter(Collider other)
{
    if (!triggered && other.CompareTag("Player"))
    {
        triggered = true;
        for (int i = 0; i < enemiesToSpawn.Length; i++)
        {
            Instantiate(enemiesToSpawn[i], spawnPoints[i % spawnPoints.Length].position, Quaternion.identity);
        }
    }
}
```

## Visual Helpers

### Editor Gizmo (visible in editor only)
```csharp
void OnDrawGizmos()
{
    Gizmos.color = new Color(1, 0, 0, 0.3f);
    Gizmos.DrawCube(transform.position, transform.localScale);
}
```

### Semi-transparent Material
- Create material with Transparent rendering mode
- Low alpha (0.2-0.3)
- Color indicates type (red = damage, green = goal)

## Output to User
Explain the effect, not the trigger:
- "Walk into the green zone to complete the level"
- "The red areas will hurt you - avoid them!"
- "Touch the flag to save your progress"
