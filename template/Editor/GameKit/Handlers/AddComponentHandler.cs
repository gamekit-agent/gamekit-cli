using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using GameKit.Utils;
using Newtonsoft.Json.Linq;
using UnityEditor;

namespace GameKit.Handlers
{
    public static class AddComponentHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var path = json["path"]?.ToString();
                var type = json["type"]?.ToString();

                if (string.IsNullOrEmpty(path))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'path' field in request body");
                }

                if (string.IsNullOrEmpty(type))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'type' field in request body");
                }

                if (EditorApplication.isPlaying)
                {
                    return ApiResponse.Error("PLAY_MODE",
                        "Cannot modify scene during play mode. Stop play mode first.");
                }

                var go = SceneService.FindGameObjectByPath(path);
                if (go == null)
                {
                    return ApiResponse.Error("NOT_FOUND", $"GameObject not found: {path}");
                }

                var resolvedType = TypeResolver.ResolveComponentType(type);
                if (resolvedType == null)
                {
                    return ApiResponse.Error("TYPE_NOT_FOUND",
                        $"Component type not found: {type}");
                }

                ObjectFactory.AddComponent(go, resolvedType);

                return ApiResponse.Success(new
                {
                    gameObject = go.name,
                    component = resolvedType.Name,
                    path
                });
            }
            catch (Exception ex)
            {
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }
    }
}
