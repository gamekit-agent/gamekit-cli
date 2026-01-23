---
description: Adding sound effects, music, and audio feedback to games
---

# Adding Audio

Use this skill to add sound effects, background music, and audio feedback.

## Trigger Phrases
- "sound", "audio", "music"
- "sound effect", "SFX"
- "background music", "BGM"
- "when X happens, play sound"

## When to Apply (Automatically)

Consider adding audio when:
- Player collects something (satisfying ding)
- Player takes damage (pain/hit sound)
- Player shoots (pew pew)
- Enemy dies (explosion/defeat)
- Completing a level (victory fanfare)
- Background ambience (always)

## Implementation

### Audio Source Setup
```csharp
// On an object that makes sound
AudioSource audioSource = gameObject.AddComponent<AudioSource>();
audioSource.clip = myClip;
audioSource.playOnAwake = false;
audioSource.loop = false; // true for music
audioSource.spatialBlend = 0; // 0 = 2D, 1 = 3D positional
```

### Playing Sounds
```csharp
// One-shot (doesn't interrupt)
audioSource.PlayOneShot(clipToPlay);

// Replace current (interrupts)
audioSource.clip = newClip;
audioSource.Play();
```

## Audio Manager Pattern

```csharp
public class AudioManager : MonoBehaviour
{
    public static AudioManager Instance;

    [Header("Music")]
    public AudioSource musicSource;
    public AudioClip[] musicTracks;

    [Header("SFX")]
    public AudioSource sfxSource;
    public AudioClip collectSound;
    public AudioClip hitSound;
    public AudioClip shootSound;
    public AudioClip deathSound;
    public AudioClip victorySound;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else Destroy(gameObject);
    }

    public void PlaySFX(AudioClip clip)
    {
        if (clip != null)
            sfxSource.PlayOneShot(clip);
    }

    public void PlayCollect() => PlaySFX(collectSound);
    public void PlayHit() => PlaySFX(hitSound);
    public void PlayShoot() => PlaySFX(shootSound);
    public void PlayDeath() => PlaySFX(deathSound);
    public void PlayVictory() => PlaySFX(victorySound);

    public void PlayMusic(int trackIndex)
    {
        if (trackIndex < musicTracks.Length)
        {
            musicSource.clip = musicTracks[trackIndex];
            musicSource.Play();
        }
    }
}
```

### Using the Manager
```csharp
// In collection script
void Collect()
{
    AudioManager.Instance.PlayCollect();
    Destroy(gameObject);
}

// In health script
void TakeDamage(int amount)
{
    health -= amount;
    AudioManager.Instance.PlayHit();
}
```

## Audio Settings

### Music
- Volume: 0.3-0.5 (quieter than SFX)
- Loop: true
- Spatial Blend: 0 (2D, always same volume)

### UI Sounds
- Volume: 0.7
- Loop: false
- Spatial Blend: 0 (2D)

### Game SFX
- Volume: 0.8-1.0
- Loop: false
- Spatial Blend: 0 (2D) or 1 (3D for positional)

### Ambient/Environmental
- Volume: 0.3-0.5
- Loop: true
- Spatial Blend: 1 (3D, fades with distance)

## Free Audio Sources

For finding sounds, delegate to asset-finder agent with:
- **Freesound.org** - CC-licensed sounds
- **OpenGameArt.org** - Game audio
- **Kenney.nl** - UI and game sounds (CC0)
- **Mixkit.co** - Free SFX and music

## Placeholder Approach

If no audio files available yet:
1. Create AudioManager with empty clips
2. Add the PlayX() calls in code
3. User can drag in audio files later
4. Or delegate to asset-finder to get audio

## Output to User
Describe the audio experience:
- "I added a satisfying 'ding' when you collect coins"
- "There's background music that plays during the game"
- "You'll hear a 'pew' sound when you shoot"
