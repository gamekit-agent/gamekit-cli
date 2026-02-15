#if GAMEKIT_INPUT_SYSTEM
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

namespace GameKit.Services
{
    public static class InputService
    {
        private static readonly Dictionary<string, Key> KeyAliases = new Dictionary<string, Key>(StringComparer.OrdinalIgnoreCase)
        {
            { "space", Key.Space },
            { "enter", Key.Enter },
            { "return", Key.Enter },
            { "escape", Key.Escape },
            { "esc", Key.Escape },
            { "tab", Key.Tab },
            { "backspace", Key.Backspace },
            { "delete", Key.Delete },
            { "up", Key.UpArrow },
            { "down", Key.DownArrow },
            { "left", Key.LeftArrow },
            { "right", Key.RightArrow },
            { "shift", Key.LeftShift },
            { "leftshift", Key.LeftShift },
            { "rightshift", Key.RightShift },
            { "ctrl", Key.LeftCtrl },
            { "leftctrl", Key.LeftCtrl },
            { "rightctrl", Key.RightCtrl },
            { "alt", Key.LeftAlt },
            { "leftalt", Key.LeftAlt },
            { "rightalt", Key.RightAlt },
            // Digits
            { "0", Key.Digit0 },
            { "1", Key.Digit1 },
            { "2", Key.Digit2 },
            { "3", Key.Digit3 },
            { "4", Key.Digit4 },
            { "5", Key.Digit5 },
            { "6", Key.Digit6 },
            { "7", Key.Digit7 },
            { "8", Key.Digit8 },
            { "9", Key.Digit9 },
            // F-keys
            { "f1", Key.F1 },
            { "f2", Key.F2 },
            { "f3", Key.F3 },
            { "f4", Key.F4 },
            { "f5", Key.F5 },
            { "f6", Key.F6 },
            { "f7", Key.F7 },
            { "f8", Key.F8 },
            { "f9", Key.F9 },
            { "f10", Key.F10 },
            { "f11", Key.F11 },
            { "f12", Key.F12 },
        };

        public static object SimulateKey(string keyName, string action)
        {
            var keyboard = Keyboard.current;
            if (keyboard == null)
                throw new InvalidOperationException("No keyboard device found. Is the Input System enabled?");

            Key key;
            if (!KeyAliases.TryGetValue(keyName, out key))
            {
                // Try parsing as Key enum directly (handles a-z and other named keys)
                if (!Enum.TryParse<Key>(keyName, true, out key))
                {
                    throw new ArgumentException($"Unknown key: '{keyName}'. Use a-z, 0-9, space, enter, escape, shift, ctrl, up/down/left/right, f1-f12, etc.");
                }
            }

            bool pressed = action == "down";

            using (StateEvent.From(keyboard, out var eventPtr))
            {
                keyboard[key].WriteValueIntoEvent(pressed ? 1f : 0f, eventPtr);
                InputSystem.QueueEvent(eventPtr);
            }

            return new { key = keyName, action };
        }

        public static object SimulateMouse(string button, string action, float? x, float? y)
        {
            var mouse = Mouse.current;
            if (mouse == null)
                throw new InvalidOperationException("No mouse device found. Is the Input System enabled?");

            // Move mouse position if specified
            if (x.HasValue && y.HasValue)
            {
                InputState.Change(mouse.position, new Vector2(x.Value, y.Value));
            }

            var control = ResolveMouseButton(mouse, button);
            bool pressed = action == "down";

            using (StateEvent.From(mouse, out var eventPtr))
            {
                control.WriteValueIntoEvent(pressed ? 1f : 0f, eventPtr);
                if (x.HasValue && y.HasValue)
                {
                    mouse.position.WriteValueIntoEvent(new Vector2(x.Value, y.Value), eventPtr);
                }
                InputSystem.QueueEvent(eventPtr);
            }

            return new { button, action, x, y };
        }

        private static UnityEngine.InputSystem.Controls.ButtonControl ResolveMouseButton(Mouse mouse, string button)
        {
            switch (button.ToLowerInvariant())
            {
                case "left":
                case "0":
                    return mouse.leftButton;
                case "right":
                case "1":
                    return mouse.rightButton;
                case "middle":
                case "2":
                    return mouse.middleButton;
                default:
                    throw new ArgumentException($"Unknown mouse button: '{button}'. Use left/right/middle or 0/1/2.");
            }
        }
    }
}
#else
namespace GameKit.Services
{
    public static class InputService
    {
        public static object SimulateKey(string keyName, string action)
        {
            throw new System.InvalidOperationException(
                "Input simulation requires the Unity Input System package (com.unity.inputsystem). " +
                "Run 'gamekit init' to install it, then reopen Unity.");
        }

        public static object SimulateMouse(string button, string action, float? x, float? y)
        {
            throw new System.InvalidOperationException(
                "Input simulation requires the Unity Input System package (com.unity.inputsystem). " +
                "Run 'gamekit init' to install it, then reopen Unity.");
        }
    }
}
#endif
