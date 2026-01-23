---
description: Setting up Normcore multiplayer synchronization
---

# Multiplayer Setup (Normcore)

**AUTOMATIC BEHAVIOR** - Claude applies this by default for new games unless told "single-player only".

Use this skill for ANY game - we assume multiplayer by default using Normcore.

## Always Apply

Every game should be multiplayer-ready:
- Players can join the same room
- Objects sync between players
- Each player controls their own character

## Core Concepts (For Claude's Understanding)

1. **Realtime** - Connection manager, lives in scene
2. **RealtimeView** - Identity for synced objects
3. **RealtimeTransform** - Syncs position/rotation
4. **Ownership** - Who controls an object
5. **Resources/** - Prefabs must be here for runtime spawning

## Implementation Checklist

### Scene Setup
1. Add Realtime component to scene
2. Set App Key in NormcoreAppSettings
3. Configure room name (or auto-generate)

### Player Setup
1. Create player prefab with:
   - RealtimeView
   - RealtimeTransform
   - Player controller script
2. Save to Resources/ folder
3. Create spawner that instantiates on connect

### Synced Objects
1. Add RealtimeView
2. Add RealtimeTransform (if it moves)
3. For custom data: create RealtimeModel

## Player Spawner

```csharp
using Normal.Realtime;

public class PlayerSpawner : MonoBehaviour
{
    public string playerPrefabName = "Player"; // Must be in Resources/

    private Realtime _realtime;

    void Awake()
    {
        _realtime = GetComponent<Realtime>();
        _realtime.didConnectToRoom += DidConnectToRoom;
    }

    void DidConnectToRoom(Realtime realtime)
    {
        var options = new Realtime.InstantiateOptions
        {
            ownedByClient = true,
            preventOwnershipTakeover = true,
            useInstance = realtime
        };

        Realtime.Instantiate(playerPrefabName, Vector3.zero, Quaternion.identity, options);
    }
}
```

## Ownership Check in Scripts

```csharp
using Normal.Realtime;

public class PlayerController : MonoBehaviour
{
    private RealtimeView _realtimeView;

    void Start()
    {
        _realtimeView = GetComponent<RealtimeView>();
    }

    void Update()
    {
        // CRITICAL: Only process input for local player
        if (!_realtimeView.isOwnedLocallyInHierarchy)
            return;

        // Normal movement code here
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        // ...
    }
}
```

## Syncing Custom Data

For health, score, or other data:

```csharp
// 1. Create model
[RealtimeModel]
public partial class PlayerHealthModel
{
    [RealtimeProperty(1, true, true)]
    private int _health;
}

// 2. Create component
public class PlayerHealth : RealtimeComponent<PlayerHealthModel>
{
    public int maxHealth = 100;

    protected override void OnRealtimeModelReplaced(PlayerHealthModel previousModel, PlayerHealthModel currentModel)
    {
        if (previousModel != null)
            previousModel.healthDidChange -= HealthChanged;
        if (currentModel != null)
            currentModel.healthDidChange += HealthChanged;
    }

    void HealthChanged(PlayerHealthModel model, int health)
    {
        // Update UI, check for death, etc.
    }

    public void TakeDamage(int amount)
    {
        model.health = Mathf.Max(0, model.health - amount);
    }
}
```

## Common Patterns

### Collectible (First-touch-wins)
```csharp
public class NetworkedCollectible : MonoBehaviour
{
    private RealtimeView _view;
    private bool _collected;

    void Start() => _view = GetComponent<RealtimeView>();

    void OnTriggerEnter(Collider other)
    {
        if (_collected) return;
        if (!other.CompareTag("Player")) return;

        // Request ownership to collect
        _view.RequestOwnership();

        if (_view.isOwnedLocally)
        {
            _collected = true;
            // Give reward to collector
            Realtime.Destroy(gameObject);
        }
    }
}
```

### Enemy (Server/First-Player Authority)
- First player to connect owns enemies
- Or: enemies owned by nobody, take ownership on hit

## Prefab Requirements

Objects spawned at runtime MUST be in `Assets/Resources/`:
```
Assets/Resources/
├── Player.prefab
├── Projectile.prefab
└── NetworkedPickup.prefab
```

## Output to User
Explain multiplayer simply:
- "Your friend can join using the same room code"
- "Each player controls their own character"
- "When you pick up a coin, it disappears for everyone"
