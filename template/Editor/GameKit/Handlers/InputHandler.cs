using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;
using UnityEditor;

namespace GameKit.Handlers
{
    public static class InputHandler
    {
        public static ApiResponse HandleKey(HttpListenerRequest request)
        {
            try
            {
                if (!EditorApplication.isPlaying)
                {
                    return ApiResponse.Error("NOT_PLAYING", "Input simulation requires play mode. Start it with 'gamekit play start'.");
                }

                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var key = json["key"]?.ToString();
                var action = json["action"]?.ToString();

                if (string.IsNullOrEmpty(key))
                {
                    return ApiResponse.Error("MISSING_KEY", "Missing 'key' field in request body");
                }

                if (action != "down" && action != "up")
                {
                    return ApiResponse.Error("INVALID_ACTION", "Action must be 'down' or 'up'");
                }

                var result = InputService.SimulateKey(key, action);
                return ApiResponse.Success(result);
            }
            catch (ArgumentException ex)
            {
                return ApiResponse.Error("INVALID_KEY", ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return ApiResponse.Error("INPUT_SYSTEM_UNAVAILABLE", ex.Message);
            }
            catch (Exception ex)
            {
                return ApiResponse.Error("INPUT_ERROR", ex.Message);
            }
        }

        public static ApiResponse HandleMouse(HttpListenerRequest request)
        {
            try
            {
                if (!EditorApplication.isPlaying)
                {
                    return ApiResponse.Error("NOT_PLAYING", "Input simulation requires play mode. Start it with 'gamekit play start'.");
                }

                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var button = json["button"]?.ToString();
                var action = json["action"]?.ToString();

                if (string.IsNullOrEmpty(button))
                {
                    return ApiResponse.Error("MISSING_BUTTON", "Missing 'button' field in request body");
                }

                if (action != "down" && action != "up")
                {
                    return ApiResponse.Error("INVALID_ACTION", "Action must be 'down' or 'up'");
                }

                float? x = json["x"]?.Value<float>();
                float? y = json["y"]?.Value<float>();

                var result = InputService.SimulateMouse(button, action, x, y);
                return ApiResponse.Success(result);
            }
            catch (ArgumentException ex)
            {
                return ApiResponse.Error("INVALID_BUTTON", ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return ApiResponse.Error("INPUT_SYSTEM_UNAVAILABLE", ex.Message);
            }
            catch (Exception ex)
            {
                return ApiResponse.Error("INPUT_ERROR", ex.Message);
            }
        }
    }
}
