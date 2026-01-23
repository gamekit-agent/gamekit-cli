---
description: Creating user interface elements like health bars, score displays, menus
---

# Adding UI Elements

Use this skill when the user needs any user interface: health bars, score, menus, buttons, text displays.

## Trigger Phrases
- "health bar", "HP", "lives"
- "score", "points", "counter"
- "menu", "pause", "game over"
- "UI", "HUD", "display", "show"
- "button", "text", "label"

## Implementation Checklist

1. **Create Canvas** (if none exists)
   - Screen Space - Overlay for HUD
   - Screen Space - Camera for world-anchored UI
   - World Space for in-game UI (health bars above enemies)

2. **Add UI Elements**
   - Use Unity UI components (Image, Text/TextMeshPro, Slider, Button)
   - Anchor appropriately (corners for HUD elements)
   - Set raycast target = false for non-interactive elements

3. **Create UI Manager Script**
   - References to UI elements
   - Public methods to update (UpdateHealth, UpdateScore, etc.)
   - Listen to game events

4. **For Multiplayer**
   - Local UI doesn't need sync
   - Shared UI (leaderboard) needs RealtimeModel

## Common UI Patterns

### Health Bar (Slider-based)
```csharp
public class HealthUI : MonoBehaviour
{
    public Slider healthSlider;
    public Image fillImage;
    public Health playerHealth;

    void Start()
    {
        if (playerHealth != null)
            playerHealth.OnHealthChanged += UpdateHealth;
    }

    public void UpdateHealth(int current, int max)
    {
        healthSlider.value = (float)current / max;

        // Color based on health
        if (healthSlider.value > 0.5f)
            fillImage.color = Color.green;
        else if (healthSlider.value > 0.25f)
            fillImage.color = Color.yellow;
        else
            fillImage.color = Color.red;
    }
}
```

### Score Display
```csharp
public class ScoreUI : MonoBehaviour
{
    public TextMeshProUGUI scoreText;

    void Start()
    {
        ScoreManager.Instance.OnScoreChanged += UpdateScore;
        UpdateScore(0);
    }

    void UpdateScore(int score)
    {
        scoreText.text = $"Score: {score}";
    }
}
```

### Pause Menu
```csharp
public class PauseMenu : MonoBehaviour
{
    public GameObject pausePanel;
    private bool isPaused = false;

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Escape))
            TogglePause();
    }

    public void TogglePause()
    {
        isPaused = !isPaused;
        pausePanel.SetActive(isPaused);
        Time.timeScale = isPaused ? 0 : 1;
    }

    public void Resume() => TogglePause();
    public void Quit() => Application.Quit();
}
```

### Game Over Screen
```csharp
public class GameOverUI : MonoBehaviour
{
    public GameObject gameOverPanel;
    public TextMeshProUGUI finalScoreText;

    public void ShowGameOver(int finalScore)
    {
        gameOverPanel.SetActive(true);
        finalScoreText.text = $"Final Score: {finalScore}";
        Time.timeScale = 0;
    }

    public void Restart()
    {
        Time.timeScale = 1;
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }
}
```

## UI Layout Tips

### Anchoring
- Top-left: Score, lives
- Top-right: Timer, mini-map
- Bottom-center: Health bar, abilities
- Center: Menus, dialogs

### Colors
- Health: Green → Yellow → Red
- Score: White or Gold
- Damage flash: Red overlay
- Positive feedback: Green flash

## Output to User
Explain simply:
- "I added a health bar in the top-left corner"
- "Your score shows in the top-right"
- "Press ESC to pause the game"
