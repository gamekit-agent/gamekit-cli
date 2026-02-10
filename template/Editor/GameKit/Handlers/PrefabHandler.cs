using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class PrefabHandler
    {
        public static ApiResponse HandleCreate(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var gameObjectPath = json["gameObjectPath"]?.ToString();
                var assetPath = json["assetPath"]?.ToString();
                var connect = json["connect"]?.Value<bool>() ?? true;

                if (string.IsNullOrEmpty(gameObjectPath))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'gameObjectPath' field in request body");
                }

                var result = PrefabService.CreatePrefab(gameObjectPath, assetPath, connect);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("not found"))
                {
                    return ApiResponse.Error("NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("play mode"))
                {
                    return ApiResponse.Error("PLAY_MODE", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }

        public static ApiResponse HandleInstantiate(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var prefabPath = json["prefabPath"]?.ToString();
                var parent = json["parent"]?.ToString();

                if (string.IsNullOrEmpty(prefabPath))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'prefabPath' field in request body");
                }

                var result = PrefabService.InstantiatePrefab(prefabPath, parent);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("Parent not found"))
                {
                    return ApiResponse.Error("PARENT_NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("not found"))
                {
                    return ApiResponse.Error("NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("play mode"))
                {
                    return ApiResponse.Error("PLAY_MODE", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }

        public static ApiResponse HandleOverrides(HttpListenerRequest request)
        {
            try
            {
                var path = request.QueryString["path"];

                if (string.IsNullOrEmpty(path))
                {
                    return ApiResponse.Error("MISSING_PATH", "Missing 'path' query parameter");
                }

                var result = PrefabService.GetOverrides(path);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("not a prefab instance"))
                {
                    return ApiResponse.Error("NOT_PREFAB_INSTANCE", ex.Message);
                }
                if (ex.Message.Contains("not found"))
                {
                    return ApiResponse.Error("NOT_FOUND", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }
    }
}
