---
description: Creating simple animations like spinning, bobbing, pulsing for objects
---

# Creating Animations

Use this skill to make objects move, spin, bob, pulse, or animate.

## Trigger Phrases
- "spin", "rotate", "spinning"
- "bob", "float", "hover"
- "pulse", "grow", "shrink"
- "animate", "moving"
- "wiggle", "shake"

## When to Apply (Automatically)

Add animation when:
- Collectibles (coins spin, gems bob)
- Power-ups (pulse/glow)
- Decorations (flags wave, fans spin)
- Feedback (damage shake, collect bounce)
- Idle objects (breathing, shifting)

## Simple Animation Scripts

### Spin/Rotate
```csharp
public class Spinner : MonoBehaviour
{
    public Vector3 rotationSpeed = new Vector3(0, 90, 0);

    void Update()
    {
        transform.Rotate(rotationSpeed * Time.deltaTime);
    }
}
```

### Bob/Float
```csharp
public class Bobber : MonoBehaviour
{
    public float amplitude = 0.3f;
    public float frequency = 1f;

    private Vector3 startPos;

    void Start() => startPos = transform.localPosition;

    void Update()
    {
        Vector3 pos = startPos;
        pos.y += Mathf.Sin(Time.time * frequency * Mathf.PI * 2) * amplitude;
        transform.localPosition = pos;
    }
}
```

### Pulse/Scale
```csharp
public class Pulser : MonoBehaviour
{
    public float minScale = 0.9f;
    public float maxScale = 1.1f;
    public float speed = 2f;

    private Vector3 originalScale;

    void Start() => originalScale = transform.localScale;

    void Update()
    {
        float t = (Mathf.Sin(Time.time * speed) + 1) / 2; // 0 to 1
        float scale = Mathf.Lerp(minScale, maxScale, t);
        transform.localScale = originalScale * scale;
    }
}
```

### Spin + Bob Combined (Common for Collectibles)
```csharp
public class CollectibleAnimation : MonoBehaviour
{
    public float spinSpeed = 90f;
    public float bobAmplitude = 0.2f;
    public float bobFrequency = 1f;

    private Vector3 startPos;

    void Start() => startPos = transform.localPosition;

    void Update()
    {
        // Spin
        transform.Rotate(0, spinSpeed * Time.deltaTime, 0);

        // Bob
        Vector3 pos = startPos;
        pos.y += Mathf.Sin(Time.time * bobFrequency * Mathf.PI * 2) * bobAmplitude;
        transform.localPosition = pos;
    }
}
```

### Shake (for damage feedback)
```csharp
public class Shaker : MonoBehaviour
{
    public float shakeDuration = 0.3f;
    public float shakeMagnitude = 0.1f;

    private Vector3 originalPos;
    private float shakeTimeRemaining;

    void Start() => originalPos = transform.localPosition;

    public void Shake()
    {
        shakeTimeRemaining = shakeDuration;
    }

    void Update()
    {
        if (shakeTimeRemaining > 0)
        {
            transform.localPosition = originalPos + Random.insideUnitSphere * shakeMagnitude;
            shakeTimeRemaining -= Time.deltaTime;
        }
        else
        {
            transform.localPosition = originalPos;
        }
    }
}
```

### Swing/Pendulum
```csharp
public class Swinger : MonoBehaviour
{
    public float angle = 30f;
    public float speed = 2f;

    void Update()
    {
        float rot = Mathf.Sin(Time.time * speed) * angle;
        transform.localRotation = Quaternion.Euler(0, 0, rot);
    }
}
```

## Animation Presets

| Object Type | Animation | Settings |
|-------------|-----------|----------|
| Coin | Spin + Bob | spinSpeed: 90, bobAmp: 0.2 |
| Gem | Bob + Pulse | bobAmp: 0.15, pulse: 0.9-1.1 |
| Power-up | Pulse + Glow | pulse: 0.8-1.2, emissive |
| Flag | Swing | angle: 15, speed: 3 |
| Floating platform | Bob | bobAmp: 0.5, freq: 0.5 |
| Enemy idle | Pulse (breathing) | 0.95-1.05, speed: 1 |

## Output to User
Describe the motion:
- "The coins spin and float up and down"
- "Power-ups pulse with a glow effect"
- "The platform moves up and down slowly"
