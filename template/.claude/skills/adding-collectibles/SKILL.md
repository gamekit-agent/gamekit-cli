---
description: Creating pickups, collectibles, coins, power-ups, and items
---

# Adding Collectibles and Pickups

Use this skill when the user wants items to collect, pickups, coins, power-ups, or inventory items.

## Trigger Phrases
- "collect", "pickup", "pick up"
- "coins", "gems", "stars", "points"
- "power-up", "health pack", "ammo"
- "items", "loot", "treasure"

## Implementation Checklist

1. **Create Collectible GameObject**
   - Visual (coin, gem, glowing orb, etc.)
   - Collider set as TRIGGER (isTrigger = true)
   - Rigidbody (isKinematic = true, useGravity = false) for trigger detection
   - Tag appropriately ("Coin", "PowerUp", etc.)

2. **Add Collection Script**
   - OnTriggerEnter to detect player
   - Effect on collect (add score, heal, etc.)
   - Feedback (sound, particles)
   - Destroy or disable after collection

3. **Visual Polish**
   - Spinning animation
   - Bobbing up/down
   - Glow or particle effect
   - Distinct color (gold for coins, red for health, etc.)

4. **Multiplayer Setup (Normcore)**
   - Add RealtimeView
   - Sync collection state (so collected items disappear for all)
   - Consider: first-touch-owns for collection

5. **Scoring/Inventory**
   - Create or update score manager
   - UI to display count/score

## Collection Script

```csharp
public class Collectible : MonoBehaviour
{
    public int value = 1;
    public CollectibleType type = CollectibleType.Coin;

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Collect(other.gameObject);
        }
    }

    void Collect(GameObject player)
    {
        switch (type)
        {
            case CollectibleType.Coin:
                ScoreManager.Instance.AddScore(value);
                break;
            case CollectibleType.Health:
                player.GetComponent<Health>()?.Heal(value);
                break;
            case CollectibleType.PowerUp:
                player.GetComponent<PowerUpHandler>()?.ApplyPowerUp(this);
                break;
        }

        // Feedback
        // AudioManager.Instance.Play("collect");
        // Instantiate(collectEffect, transform.position, Quaternion.identity);

        Destroy(gameObject);
    }
}

public enum CollectibleType { Coin, Health, PowerUp, Key, Ammo }
```

## Visual Effects

### Spinning
```csharp
void Update()
{
    transform.Rotate(0, 90 * Time.deltaTime, 0);
}
```

### Bobbing
```csharp
private Vector3 startPos;
void Start() => startPos = transform.position;
void Update()
{
    transform.position = startPos + Vector3.up * Mathf.Sin(Time.time * 2) * 0.2f;
}
```

### Combined
```csharp
void Update()
{
    transform.Rotate(0, 90 * Time.deltaTime, 0);
    transform.position = startPos + Vector3.up * Mathf.Sin(Time.time * 2) * 0.2f;
}
```

## Score Manager (Singleton)

```csharp
public class ScoreManager : MonoBehaviour
{
    public static ScoreManager Instance;
    public int score { get; private set; }
    public event System.Action<int> OnScoreChanged;

    void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);
    }

    public void AddScore(int amount)
    {
        score += amount;
        OnScoreChanged?.Invoke(score);
    }
}
```

## Output to User
Explain simply:
- "I added coins you can collect by walking into them"
- "Each coin adds 10 points to your score"
- "The coins spin and float so they're easy to spot"
