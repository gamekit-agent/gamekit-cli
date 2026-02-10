using System.Net;
using GameKit.Models;
using UnityEditor;

namespace GameKit.Handlers
{
    public static class PlayHandler
    {
        public static ApiResponse HandleStart(HttpListenerRequest request)
        {
            if (EditorApplication.isCompiling)
            {
                return ApiResponse.Error("COMPILING", "Cannot enter play mode while compiling");
            }

            if (EditorApplication.isPlaying)
            {
                return ApiResponse.Success(new { status = "already_playing" });
            }

            EditorApplication.EnterPlaymode();
            return ApiResponse.Success(new { status = "entering_play_mode" });
        }

        public static ApiResponse HandleStop(HttpListenerRequest request)
        {
            if (!EditorApplication.isPlaying)
            {
                return ApiResponse.Success(new { status = "already_stopped" });
            }

            EditorApplication.ExitPlaymode();
            return ApiResponse.Success(new { status = "exiting_play_mode" });
        }

        public static ApiResponse HandleStatus(HttpListenerRequest request)
        {
            string state;

            if (EditorApplication.isPlaying && EditorApplication.isPaused)
            {
                state = "paused";
            }
            else if (EditorApplication.isPlaying)
            {
                state = "playing";
            }
            else
            {
                state = "stopped";
            }

            return ApiResponse.Success(new { state });
        }
    }
}
