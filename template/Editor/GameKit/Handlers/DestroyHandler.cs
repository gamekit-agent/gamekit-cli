using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class DestroyHandler
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

                var result = AuthoringService.DestroyGameObject(path);
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
    }
}
