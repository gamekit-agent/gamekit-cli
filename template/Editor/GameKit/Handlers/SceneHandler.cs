using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class SceneHandler
    {
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
