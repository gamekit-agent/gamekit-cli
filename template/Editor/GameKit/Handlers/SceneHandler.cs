using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;
using UnityEditor.SceneManagement;

namespace GameKit.Handlers
{
    public static class SceneHandler
    {
        public static ApiResponse HandleSave(HttpListenerRequest request)
        {
            string savePath = null;

            // Read optional path from request body
            if (request.HasEntityBody)
            {
                try
                {
                    string body;
                    using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                    {
                        body = reader.ReadToEnd();
                    }
                    if (!string.IsNullOrWhiteSpace(body))
                    {
                        var json = JObject.Parse(body);
                        savePath = json["path"]?.ToString();
                    }
                }
                catch
                {
                    // No body or invalid JSON — proceed without path
                }
            }

            var scene = EditorSceneManager.GetActiveScene();

            // If scene is unnamed and no path provided, return an error
            // instead of opening a Finder dialog that blocks the CLI
            if (string.IsNullOrEmpty(scene.path) && string.IsNullOrEmpty(savePath))
            {
                return ApiResponse.Error("SCENE_UNNAMED",
                    "Scene has not been saved yet. Provide a path, e.g.: gamekit scene save --path Assets/Scenes/MyScene.unity");
            }

            if (!string.IsNullOrEmpty(savePath))
            {
                EditorSceneManager.SaveScene(scene, savePath);
            }
            else
            {
                EditorSceneManager.SaveScene(scene);
            }

            // Re-fetch scene after save (path may have changed)
            scene = EditorSceneManager.GetActiveScene();
            return ApiResponse.Success(new { scene = scene.name, path = scene.path });
        }

        public static ApiResponse HandleList(HttpListenerRequest request)
        {
            var scenes = SceneService.ListScenes();
            return ApiResponse.Success(scenes);
        }

        public static ApiResponse HandleOpen(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var scene = json["scene"]?.ToString();

                if (string.IsNullOrEmpty(scene))
                {
                    return ApiResponse.Error("INVALID_REQUEST", "Missing 'scene' field in request body");
                }

                var result = SceneService.OpenScene(scene);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("not found"))
                {
                    return ApiResponse.Error("SCENE_NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("Ambiguous"))
                {
                    return ApiResponse.Error("SCENE_AMBIGUOUS", ex.Message);
                }
                throw;
            }
        }
    }
}
