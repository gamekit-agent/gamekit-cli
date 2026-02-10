using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class MaterialHandler
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
                var name = json["name"]?.ToString();
                var shaderName = json["shader"]?.ToString() ?? "Standard";
                var outputPath = json["outputPath"]?.ToString();

                if (string.IsNullOrEmpty(name))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'name' field in request body");
                }

                var result = MaterialService.CreateMaterial(name, shaderName, outputPath);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("Shader not found"))
                {
                    return ApiResponse.Error("SHADER_NOT_FOUND", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }

        public static ApiResponse HandleSet(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var materialPath = json["materialPath"]?.ToString();
                var property = json["property"]?.ToString();
                var value = json["value"];

                if (string.IsNullOrEmpty(materialPath))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'materialPath' field in request body");
                }

                if (string.IsNullOrEmpty(property))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'property' field in request body");
                }

                if (value == null)
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'value' field in request body");
                }

                var result = MaterialService.SetProperty(materialPath, property, value);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("Material not found"))
                {
                    return ApiResponse.Error("NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("not found on shader"))
                {
                    return ApiResponse.Error("PROPERTY_NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("Unsupported property type") || ex.Message.Contains("Texture not found"))
                {
                    return ApiResponse.Error("INVALID_VALUE", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }

        public static ApiResponse HandleAssign(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var materialPath = json["materialPath"]?.ToString();
                var gameObjectPath = json["gameObjectPath"]?.ToString();

                if (string.IsNullOrEmpty(materialPath))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'materialPath' field in request body");
                }

                if (string.IsNullOrEmpty(gameObjectPath))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'gameObjectPath' field in request body");
                }

                var result = MaterialService.AssignMaterial(materialPath, gameObjectPath);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("Material not found") || ex.Message.Contains("GameObject not found"))
                {
                    return ApiResponse.Error("NOT_FOUND", ex.Message);
                }
                if (ex.Message.Contains("No Renderer component"))
                {
                    return ApiResponse.Error("NO_RENDERER", ex.Message);
                }
                if (ex.Message.Contains("play mode"))
                {
                    return ApiResponse.Error("PLAY_MODE", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }
    }
}
