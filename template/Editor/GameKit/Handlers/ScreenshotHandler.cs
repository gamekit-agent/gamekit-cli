using System;
using System.IO;
using System.Net;
using System.Text;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json;
using UnityEngine;
using UnityEditor;

namespace GameKit.Handlers
{
    public static class ScreenshotHandler
    {
        public static void Handle(HttpListenerContext context)
        {
            try
            {
                var query = context.Request.QueryString;
                var source = query["source"] ?? "game";
                var format = query["format"] ?? "file";
                int width = ParseInt(query["width"], 1920);
                int height = ParseInt(query["height"], 1080);

                Camera camera;
                switch (source)
                {
                    case "scene":
                        camera = ScreenshotService.FindSceneViewCamera();
                        if (camera == null)
                        {
                            WriteJsonResponse(context, ApiResponse.Error("CAMERA_NOT_FOUND", "No active Scene view"), 400);
                            return;
                        }
                        break;
                    case "game":
                        // In play mode, use ScreenCapture to include IMGUI overlays
                        if (EditorApplication.isPlaying)
                        {
                            byte[] gameViewBytes = ScreenshotService.CaptureGameView();
                            if (format == "binary")
                            {
                                WriteBinaryResponse(context, gameViewBytes);
                            }
                            else
                            {
                                var dir2 = Path.Combine(Directory.GetCurrentDirectory(), ".gamekit", "screenshots");
                                Directory.CreateDirectory(dir2);
                                var filename2 = $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}.png";
                                var filePath2 = Path.Combine(dir2, filename2);
                                File.WriteAllBytes(filePath2, gameViewBytes);
                                WriteJsonResponse(context, ApiResponse.Success(new { path = filePath2 }), 200);
                            }
                            return;
                        }
                        camera = ScreenshotService.FindGameCamera();
                        if (camera == null)
                        {
                            WriteJsonResponse(context, ApiResponse.Error("CAMERA_NOT_FOUND", "No cameras in scene"), 400);
                            return;
                        }
                        break;
                    default:
                        camera = ScreenshotService.FindNamedCamera(source);
                        if (camera == null)
                        {
                            WriteJsonResponse(context, ApiResponse.Error("CAMERA_NOT_FOUND", $"Camera '{source}' not found"), 400);
                            return;
                        }
                        break;
                }

                byte[] pngBytes = ScreenshotService.CaptureCamera(camera, width, height);

                if (format == "binary")
                {
                    WriteBinaryResponse(context, pngBytes);
                }
                else
                {
                    var dir = Path.Combine(Directory.GetCurrentDirectory(), ".gamekit", "screenshots");
                    Directory.CreateDirectory(dir);

                    var filename = $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}.png";
                    var filePath = Path.Combine(dir, filename);
                    File.WriteAllBytes(filePath, pngBytes);

                    WriteJsonResponse(context, ApiResponse.Success(new { path = filePath }), 200);
                }
            }
            catch (Exception ex)
            {
                WriteJsonResponse(context, ApiResponse.Error("SCREENSHOT_FAILED", ex.Message), 500);
            }
            finally
            {
                try { context.Response.Close(); } catch { }
            }
        }

        private static void WriteJsonResponse(HttpListenerContext context, ApiResponse response, int statusCode)
        {
            var json = JsonConvert.SerializeObject(response);
            var buffer = Encoding.UTF8.GetBytes(json);

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";
            context.Response.ContentLength64 = buffer.Length;
            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
        }

        private static void WriteBinaryResponse(HttpListenerContext context, byte[] pngBytes)
        {
            context.Response.StatusCode = 200;
            context.Response.ContentType = "image/png";
            context.Response.ContentLength64 = pngBytes.Length;
            context.Response.OutputStream.Write(pngBytes, 0, pngBytes.Length);
        }

        private static int ParseInt(string val, int defaultVal)
        {
            if (string.IsNullOrEmpty(val)) return defaultVal;
            return int.TryParse(val, out int result) ? result : defaultVal;
        }
    }
}
