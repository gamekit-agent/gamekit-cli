using System;
using System.Net;
using GameKit.Models;
using UnityEditor;
using UnityEngine;

namespace GameKit.Handlers
{
    public static class HealthHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            try
            {
                var status = "idle";

                if (EditorApplication.isCompiling)
                {
                    status = "compiling";
                }
                else if (EditorApplication.isPlaying && EditorApplication.isPaused)
                {
                    status = "paused";
                }
                else if (EditorApplication.isPlaying)
                {
                    status = "playing";
                }

                return ApiResponse.Success(new
                {
                    status,
                    unityVersion = Application.unityVersion,
                    projectPath = Application.dataPath.Replace("/Assets", ""),
                    projectName = Application.productName,
                    platform = Application.platform.ToString()
                });
            }
            catch (Exception ex)
            {
                return ApiResponse.Error("HEALTH_CHECK_FAILED", ex.Message);
            }
        }
    }
}
