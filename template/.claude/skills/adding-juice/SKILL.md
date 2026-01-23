---
description: Visual polish, game feel, particles, screen shake, and feedback effects
---

# Adding Juice / Visual Polish

Use this skill to make games FEEL good, not just work correctly. "Juice" refers to all the small feedback effects that make games satisfying.

## Trigger Phrases

- "make it feel better", "add polish", "add juice"
- "screen shake", "camera shake"
- "particles", "effects", "sparkles", "explosion"
- "flash", "hit effect", "feedback"
- "feels flat", "needs more impact"
- "satisfying", "punchy"

## The Juice Toolbox

### 1. Screen Shake
When something impactful happens (hit, explosion, landing)

```csharp
// CameraShake.cs - Add to main camera
using UnityEngine;

public class CameraShake : MonoBehaviour
{
    public static CameraShake Instance;
    private Vector3 originalPosition;
    private float shakeDuration = 0f;
    private float shakeIntensity = 0f;

    void Awake()
    {
        Instance = this;
        originalPosition = transform.localPosition;
    }

    void Update()
    {
        if (shakeDuration > 0)
        {
            transform.localPosition = originalPosition + Random.insideUnitSphere * shakeIntensity;
            shakeDuration -= Time.deltaTime;
        }
        else
        {
            transform.localPosition = originalPosition;
        }
    }

    public void Shake(float duration = 0.1f, float intensity = 0.1f)
    {
        shakeDuration = duration;
        shakeIntensity = intensity;
    }
}

// Usage anywhere:
// CameraShake.Instance.Shake(0.15f, 0.2f);
```

**Shake intensities:**
- Light hit: duration=0.05f, intensity=0.05f
- Medium hit: duration=0.1f, intensity=0.1f
- Heavy hit: duration=0.15f, intensity=0.2f
- Explosion: duration=0.3f, intensity=0.3f
- Earthquake: duration=1f, intensity=0.15f

### 2. Hit Flash (Damage Feedback)

```csharp
// HitFlash.cs - Add to any damageable object
using UnityEngine;
using System.Collections;

public class HitFlash : MonoBehaviour
{
    private Renderer rend;
    private Color originalColor;
    public Color flashColor = Color.white;
    public float flashDuration = 0.1f;

    void Start()
    {
        rend = GetComponent<Renderer>();
        if (rend != null)
            originalColor = rend.material.color;
    }

    public void Flash()
    {
        if (rend != null)
            StartCoroutine(DoFlash());
    }

    IEnumerator DoFlash()
    {
        rend.material.color = flashColor;
        yield return new WaitForSeconds(flashDuration);
        rend.material.color = originalColor;
    }
}

// Call when damaged:
// GetComponent<HitFlash>()?.Flash();
```

### 3. Scale Punch (Squash and Stretch)

```csharp
// ScalePunch.cs
using UnityEngine;
using System.Collections;

public class ScalePunch : MonoBehaviour
{
    private Vector3 originalScale;

    void Start()
    {
        originalScale = transform.localScale;
    }

    public void Punch(float amount = 0.2f, float duration = 0.1f)
    {
        StartCoroutine(DoPunch(amount, duration));
    }

    IEnumerator DoPunch(float amount, float duration)
    {
        Vector3 punchScale = originalScale * (1 + amount);
        transform.localScale = punchScale;

        float elapsed = 0;
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            transform.localScale = Vector3.Lerp(punchScale, originalScale, t);
            yield return null;
        }
        transform.localScale = originalScale;
    }

    // Squash (flatten then restore)
    public void Squash()
    {
        StartCoroutine(DoSquash());
    }

    IEnumerator DoSquash()
    {
        Vector3 squashed = new Vector3(originalScale.x * 1.2f, originalScale.y * 0.8f, originalScale.z * 1.2f);
        transform.localScale = squashed;
        yield return new WaitForSeconds(0.05f);

        float elapsed = 0;
        while (elapsed < 0.1f)
        {
            elapsed += Time.deltaTime;
            transform.localScale = Vector3.Lerp(squashed, originalScale, elapsed / 0.1f);
            yield return null;
        }
        transform.localScale = originalScale;
    }
}
```

### 4. Particle Effects

**Explosion/Pop:**
```csharp
// Create via code - simple particle burst
public static void CreateExplosion(Vector3 position, Color color)
{
    GameObject particleObj = new GameObject("Explosion");
    particleObj.transform.position = position;

    var ps = particleObj.AddComponent<ParticleSystem>();
    var main = ps.main;
    main.startLifetime = 0.5f;
    main.startSpeed = 5f;
    main.startSize = 0.2f;
    main.startColor = color;
    main.duration = 0.1f;
    main.loop = false;

    var emission = ps.emission;
    emission.rateOverTime = 0;
    emission.SetBursts(new ParticleSystem.Burst[] {
        new ParticleSystem.Burst(0f, 20)
    });

    var shape = ps.shape;
    shape.shapeType = ParticleSystemShapeType.Sphere;

    ps.Play();
    Destroy(particleObj, 1f);
}
```

**Coin/Pickup Sparkle:**
```csharp
// Continuous sparkle effect
void SetupSparkle(ParticleSystem ps)
{
    var main = ps.main;
    main.startLifetime = 0.5f;
    main.startSpeed = 1f;
    main.startSize = 0.1f;
    main.startColor = new Color(1f, 0.9f, 0.3f); // Gold
    main.simulationSpace = ParticleSystemSimulationSpace.World;

    var emission = ps.emission;
    emission.rateOverTime = 5;

    var shape = ps.shape;
    shape.shapeType = ParticleSystemShapeType.Sphere;
    shape.radius = 0.3f;
}
```

**Trail Effect:**
```csharp
// Add TrailRenderer for moving objects
void AddTrail(GameObject obj, Color color)
{
    var trail = obj.AddComponent<TrailRenderer>();
    trail.time = 0.3f;
    trail.startWidth = 0.2f;
    trail.endWidth = 0f;
    trail.material = new Material(Shader.Find("Sprites/Default"));
    trail.startColor = color;
    trail.endColor = new Color(color.r, color.g, color.b, 0);
}
```

### 5. Time Effects

**Hit Pause (Freeze Frame):**
```csharp
// TimeManager.cs
using UnityEngine;
using System.Collections;

public class TimeManager : MonoBehaviour
{
    public static TimeManager Instance;

    void Awake() => Instance = this;

    public void HitPause(float duration = 0.05f)
    {
        StartCoroutine(DoHitPause(duration));
    }

    IEnumerator DoHitPause(float duration)
    {
        Time.timeScale = 0.1f;
        yield return new WaitForSecondsRealtime(duration);
        Time.timeScale = 1f;
    }

    public void SlowMotion(float duration = 1f, float scale = 0.3f)
    {
        StartCoroutine(DoSlowMo(duration, scale));
    }

    IEnumerator DoSlowMo(float duration, float scale)
    {
        Time.timeScale = scale;
        yield return new WaitForSecondsRealtime(duration);
        Time.timeScale = 1f;
    }
}
```

### 6. UI Juice

**Score Pop:**
```csharp
// Make score/numbers pop when they change
IEnumerator ScorePop(Transform scoreTransform)
{
    Vector3 original = scoreTransform.localScale;
    scoreTransform.localScale = original * 1.3f;

    float elapsed = 0;
    while (elapsed < 0.15f)
    {
        elapsed += Time.deltaTime;
        scoreTransform.localScale = Vector3.Lerp(original * 1.3f, original, elapsed / 0.15f);
        yield return null;
    }
    scoreTransform.localScale = original;
}
```

**Damage Number Popup:**
```csharp
// Floating damage numbers
public void ShowDamageNumber(Vector3 worldPos, int damage)
{
    // Create UI text at position
    // Animate it floating up and fading out
    // Destroy after animation
}
```

## When to Add Juice

| Event | Effects to Add |
|-------|----------------|
| Player hit | Flash white, screen shake (light), hit pause |
| Enemy hit | Flash white, scale punch, particles |
| Enemy death | Explosion particles, screen shake, slow-mo |
| Collect coin | Scale punch, sparkle burst, sound |
| Jump/Land | Squash on land, dust particles |
| Shoot | Muzzle flash, recoil (scale punch), trail on bullet |
| Level complete | Big particles, slow-mo, screen shake |
| Player death | Heavy screen shake, slow-mo, red flash |

## Implementation Checklist

When adding juice to a game:

1. **Create JuiceManager singleton**
   - Central place for effects
   - Easy to call from anywhere

2. **Add CameraShake to main camera**
   - Most impactful single addition
   - Call on hits, explosions, landings

3. **Add HitFlash to all damageable objects**
   - Players, enemies, destructibles
   - White flash is universal "I got hit"

4. **Add particles for:**
   - Death/destruction (explosion burst)
   - Collection (sparkle burst)
   - Movement (dust, trails)
   - Ambient (floating particles, sparkles on pickups)

5. **Add scale effects:**
   - Punch on collection
   - Squash on landing
   - Pop on UI changes

6. **Add time effects (sparingly):**
   - Brief hit pause on significant hits
   - Slow-mo for dramatic moments (boss death, level end)

## Quick Juice Package

For instant polish, add this to any game:

```csharp
// JuiceManager.cs - One-stop shop for game feel
using UnityEngine;

public class JuiceManager : MonoBehaviour
{
    public static JuiceManager Instance;

    void Awake() => Instance = this;

    public void OnHit(GameObject target, bool heavy = false)
    {
        // Flash
        target.GetComponent<HitFlash>()?.Flash();

        // Shake
        float intensity = heavy ? 0.15f : 0.05f;
        CameraShake.Instance?.Shake(0.1f, intensity);

        // Hit pause
        if (heavy) TimeManager.Instance?.HitPause(0.03f);
    }

    public void OnDeath(Vector3 position, Color color)
    {
        // Particles
        CreateExplosion(position, color);

        // Shake
        CameraShake.Instance?.Shake(0.2f, 0.15f);

        // Brief slow-mo
        TimeManager.Instance?.SlowMotion(0.1f, 0.5f);
    }

    public void OnCollect(GameObject item)
    {
        // Scale punch
        item.GetComponent<ScalePunch>()?.Punch(0.3f, 0.1f);

        // Sparkle burst at position
        CreateSparkle(item.transform.position);
    }
}
```

## Output to User

Explain effects simply:
- "Added screen shake when you get hit - the camera will jostle to show impact"
- "Enemies now flash white and the screen shakes when you hit them"
- "Coins do a little 'pop' animation when collected"
- "Added a brief slow-motion effect when you defeat a boss"
- "The game has more 'juice' now - hits feel impactful, collections feel rewarding"
