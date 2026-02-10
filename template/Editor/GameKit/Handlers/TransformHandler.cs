using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace GameKit.Handlers
{
    public static class TransformHandler
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

                if (string.IsNullOrEmpty(path))
                {
                    return ApiResponse.Error("MISSING_PATH", "Missing 'path' field in request body");
                }

                Vector3? position = ParseVector3(json["position"]);
                Vector3? rotation = ParseVector3(json["rotation"]);
                Vector3? scale = ParseVector3(json["scale"]);

                var result = AuthoringService.SetTransform(path, position, rotation, scale);
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
                throw;
            }
        }

        private static Vector3? ParseVector3(JToken token)
        {
            if (token == null || token.Type == JTokenType.Null)
            {
                return null;
            }

            return new Vector3(
                token["x"].Value<float>(),
                token["y"].Value<float>(),
                token["z"].Value<float>()
            );
        }
    }
}
