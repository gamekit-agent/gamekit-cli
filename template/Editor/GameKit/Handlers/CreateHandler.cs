using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class CreateHandler
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
                var name = json["name"]?.ToString();

                if (string.IsNullOrEmpty(name))
                {
                    return ApiResponse.Error("INVALID_REQUEST", "Missing 'name' field in request body");
                }

                var parent = json["parent"]?.ToString();
                var result = AuthoringService.CreateGameObject(name, parent);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("not found"))
                {
                    return ApiResponse.Error("PARENT_NOT_FOUND", ex.Message);
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
