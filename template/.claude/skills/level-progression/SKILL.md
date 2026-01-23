---
description: Scene transitions, level unlocking, save/load, and game progression systems
---

# Level Progression

Use this skill when the game needs multiple levels, scene transitions, saving progress, or any progression system.

## Trigger Phrases

- "multiple levels", "next level", "level 2"
- "save", "load", "progress", "checkpoint"
- "unlock", "locked level"
- "scene transition", "go to next scene"
- "main menu", "level select"
- "game over screen", "restart"

## Core Components

### 1. GameManager (Persistent Singleton)

```csharp
// GameManager.cs - Survives scene loads
using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    // Progress data
    public int currentLevel = 1;
    public int highestUnlockedLevel = 1;
    public int totalScore = 0;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadProgress();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    // Scene Management
    public void LoadLevel(int levelNumber)
    {
        currentLevel = levelNumber;
        SceneManager.LoadScene("Level" + levelNumber);
    }

    public void LoadLevel(string sceneName)
    {
        SceneManager.LoadScene(sceneName);
    }

    public void NextLevel()
    {
        currentLevel++;
        if (currentLevel > highestUnlockedLevel)
        {
            highestUnlockedLevel = currentLevel;
            SaveProgress();
        }
        LoadLevel(currentLevel);
    }

    public void RestartLevel()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    public void LoadMainMenu()
    {
        SceneManager.LoadScene("MainMenu");
    }

    // Save/Load using PlayerPrefs
    public void SaveProgress()
    {
        PlayerPrefs.SetInt("HighestLevel", highestUnlockedLevel);
        PlayerPrefs.SetInt("TotalScore", totalScore);
        PlayerPrefs.Save();
    }

    public void LoadProgress()
    {
        highestUnlockedLevel = PlayerPrefs.GetInt("HighestLevel", 1);
        totalScore = PlayerPrefs.GetInt("TotalScore", 0);
    }

    public void ResetProgress()
    {
        PlayerPrefs.DeleteAll();
        highestUnlockedLevel = 1;
        totalScore = 0;
        currentLevel = 1;
    }
}
```

### 2. Level Complete Trigger

```csharp
// LevelGoal.cs - Attach to goal/exit zone
using UnityEngine;

public class LevelGoal : MonoBehaviour
{
    public float delayBeforeNext = 2f;
    private bool triggered = false;

    void OnTriggerEnter(Collider other)
    {
        if (triggered) return;
        if (other.CompareTag("Player"))
        {
            triggered = true;
            OnLevelComplete();
        }
    }

    void OnLevelComplete()
    {
        // Show victory UI
        Debug.Log("Level Complete!");

        // Optional: Add score, show stats

        // Load next level after delay
        Invoke(nameof(GoToNextLevel), delayBeforeNext);
    }

    void GoToNextLevel()
    {
        GameManager.Instance.NextLevel();
    }
}
```

### 3. Scene Transition Effects

```csharp
// SceneTransition.cs - Fade in/out between scenes
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using System.Collections;

public class SceneTransition : MonoBehaviour
{
    public static SceneTransition Instance;
    public Image fadeImage;
    public float fadeDuration = 0.5f;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void TransitionToScene(string sceneName)
    {
        StartCoroutine(DoTransition(sceneName));
    }

    IEnumerator DoTransition(string sceneName)
    {
        // Fade out
        yield return StartCoroutine(Fade(0, 1));

        // Load scene
        SceneManager.LoadScene(sceneName);

        // Fade in
        yield return StartCoroutine(Fade(1, 0));
    }

    IEnumerator Fade(float startAlpha, float endAlpha)
    {
        float elapsed = 0;
        Color color = fadeImage.color;

        while (elapsed < fadeDuration)
        {
            elapsed += Time.deltaTime;
            color.a = Mathf.Lerp(startAlpha, endAlpha, elapsed / fadeDuration);
            fadeImage.color = color;
            yield return null;
        }

        color.a = endAlpha;
        fadeImage.color = color;
    }
}
```

### 4. Level Select Screen

```csharp
// LevelSelectUI.cs
using UnityEngine;
using UnityEngine.UI;

public class LevelSelectUI : MonoBehaviour
{
    public Button[] levelButtons;
    public Sprite lockedSprite;
    public Sprite unlockedSprite;

    void Start()
    {
        RefreshButtons();
    }

    void RefreshButtons()
    {
        int highestUnlocked = GameManager.Instance.highestUnlockedLevel;

        for (int i = 0; i < levelButtons.Length; i++)
        {
            int levelNum = i + 1;
            Button btn = levelButtons[i];

            if (levelNum <= highestUnlocked)
            {
                // Unlocked
                btn.interactable = true;
                btn.GetComponent<Image>().sprite = unlockedSprite;
                btn.onClick.AddListener(() => LoadLevel(levelNum));
            }
            else
            {
                // Locked
                btn.interactable = false;
                btn.GetComponent<Image>().sprite = lockedSprite;
            }
        }
    }

    void LoadLevel(int levelNum)
    {
        GameManager.Instance.LoadLevel(levelNum);
    }
}
```

### 5. Checkpoint System

```csharp
// Checkpoint.cs - Place at checkpoint locations
using UnityEngine;

public class Checkpoint : MonoBehaviour
{
    public int checkpointID;
    private static int lastCheckpoint = 0;
    private static Vector3 lastCheckpointPosition;

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player") && checkpointID > lastCheckpoint)
        {
            lastCheckpoint = checkpointID;
            lastCheckpointPosition = transform.position;
            SaveCheckpoint();
            Debug.Log("Checkpoint reached!");
        }
    }

    void SaveCheckpoint()
    {
        PlayerPrefs.SetInt("Checkpoint_" + GameManager.Instance.currentLevel, checkpointID);
        PlayerPrefs.SetFloat("CheckpointX", lastCheckpointPosition.x);
        PlayerPrefs.SetFloat("CheckpointY", lastCheckpointPosition.y);
        PlayerPrefs.SetFloat("CheckpointZ", lastCheckpointPosition.z);
        PlayerPrefs.Save();
    }

    public static Vector3 GetRespawnPosition()
    {
        if (lastCheckpoint > 0)
            return lastCheckpointPosition;
        return Vector3.zero; // Default spawn
    }

    public static void ResetCheckpoints()
    {
        lastCheckpoint = 0;
    }
}

// PlayerRespawn.cs - Handles player death/respawn
public class PlayerRespawn : MonoBehaviour
{
    public void Respawn()
    {
        transform.position = Checkpoint.GetRespawnPosition();
        // Reset health, etc.
    }
}
```

## Scene Setup Requirements

### Build Settings
All scenes must be added to Build Settings:
```
File > Build Settings > Drag scenes in order:
0 - MainMenu
1 - Level1
2 - Level2
3 - Level3
...
```

### Required Scenes

**MainMenu Scene:**
- Start Game button → LoadLevel(1)
- Level Select button → LoadScene("LevelSelect")
- Options button
- Quit button

**LevelSelect Scene:**
- Grid of level buttons
- Back to menu button
- Lock/unlock states

**Game Scenes (Level1, Level2, etc.):**
- Player spawn point
- Level goal trigger
- Optional: Checkpoints
- Pause menu (ESC)

**GameOver Scene (or overlay):**
- Retry button → RestartLevel()
- Main Menu button → LoadMainMenu()
- Score display

## Implementation Checklist

1. **Create GameManager**
   - Add to first scene (MainMenu)
   - Mark as DontDestroyOnLoad
   - Initialize save system

2. **Set up scenes**
   - MainMenu, LevelSelect, Level1, Level2, etc.
   - Add all to Build Settings
   - Consistent naming (Level1, Level2...)

3. **Add LevelGoal to each level**
   - Trigger zone at end of level
   - Calls GameManager.NextLevel()

4. **Add transitions (optional)**
   - Create UI Canvas with full-screen image
   - Add SceneTransition script
   - Use DontDestroyOnLoad

5. **Add save/load**
   - Save on level complete
   - Save on checkpoint
   - Load on game start

6. **Add level select**
   - Button for each level
   - Lock/unlock visuals
   - Connect to GameManager

## Save Data Structure

Using PlayerPrefs (simple):
```
HighestLevel: int (1-N)
TotalScore: int
Checkpoint_Level1: int (checkpoint ID)
Checkpoint_Level2: int
...
```

Using JSON file (advanced):
```json
{
  "highestLevel": 5,
  "totalScore": 12500,
  "levelScores": [1000, 2500, 3000, 2800, 3200],
  "checkpoints": {
    "Level1": 3,
    "Level2": 2
  },
  "settings": {
    "musicVolume": 0.8,
    "sfxVolume": 1.0
  }
}
```

## Quick Setup Commands

**Add basic progression to game:**
1. Create GameManager object in MainMenu
2. Add GameManager.cs script
3. Create LevelGoal trigger at end of first level
4. Set up Build Settings with scenes

**Add checkpoints:**
1. Create empty GameObjects at checkpoint locations
2. Add Checkpoint.cs to each
3. Set unique checkpointID (1, 2, 3...)
4. Add respawn logic to player death

**Add level select:**
1. Create LevelSelect scene
2. Add buttons for each level
3. Add LevelSelectUI.cs
4. Connect buttons to array

## Output to User

Explain simply:
- "Your game now saves progress - when you beat a level, the next one unlocks"
- "Added checkpoints - if you die, you respawn at the last checkpoint you touched"
- "Created a level select screen where you can replay any level you've beaten"
- "The game fades to black between levels for a smoother transition"
