using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class BuildHandler
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
                var platform = json["platform"]?.ToString();
                var outputPath = json["outputPath"]?.ToString();

                if (string.IsNullOrEmpty(platform))
                {
                    return ApiResponse.Error("INVALID_REQUEST", "Missing 'platform' field");
                }

                var result = BuildService.Build(platform, outputPath);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("Unknown platform"))
                {
                    return ApiResponse.Error("INVALID_PLATFORM", ex.Message);
                }
                if (ex.Message.Contains("No scenes enabled"))
                {
                    return ApiResponse.Error("NO_SCENES", ex.Message);
                }
                throw;
            }
        }
    }
}
