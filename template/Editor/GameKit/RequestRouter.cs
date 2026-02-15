using System;
using System.Net;
using System.Text;
using GameKit.Handlers;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json;

namespace GameKit
{
    public static class RequestRouter
    {
        public static void HandleRequest(HttpListenerContext context)
        {
            var path = context.Request.Url.AbsolutePath;
            var method = context.Request.HttpMethod;

            // SSE streaming endpoints bypass the normal ApiResponse flow
            // because they hold the connection open and manage the response lifecycle themselves
            if (method == "GET" && path == "/api/console/stream")
            {
                ConsoleHandler.HandleStream(context);
                return;
            }

            // Screenshot endpoint bypasses the normal ApiResponse flow
            // because it may return binary PNG data instead of JSON
            if (method == "GET" && path == "/api/screenshot")
            {
                ScreenshotHandler.Handle(context);
                return;
            }

            ApiResponse response;
            int statusCode = 200;

            try
            {
                if (method == "GET" && path == "/api/health")
                {
                    response = HealthHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/refresh")
                {
                    response = RefreshHandler.Handle(context.Request);
                }
                else if (method == "GET" && path == "/api/console")
                {
                    response = ConsoleHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/play/start")
                {
                    response = PlayHandler.HandleStart(context.Request);
                }
                else if (method == "POST" && path == "/api/play/stop")
                {
                    response = PlayHandler.HandleStop(context.Request);
                }
                else if (method == "GET" && path == "/api/play/status")
                {
                    response = PlayHandler.HandleStatus(context.Request);
                }
                else if (method == "GET" && path == "/api/scene/list")
                {
                    response = SceneHandler.HandleList(context.Request);
                }
                else if (method == "POST" && path == "/api/scene/open")
                {
                    response = SceneHandler.HandleOpen(context.Request);
                }
                else if (method == "GET" && path == "/api/hierarchy")
                {
                    response = HierarchyHandler.Handle(context.Request);
                }
                else if (method == "GET" && path == "/api/inspect")
                {
                    response = InspectHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/create")
                {
                    response = CreateHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/destroy")
                {
                    response = DestroyHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/transform")
                {
                    response = TransformHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/add-component")
                {
                    response = AddComponentHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/set")
                {
                    response = SetPropertyHandler.Handle(context.Request);
                }
                else if (method == "GET" && path == "/api/list/scripts")
                {
                    response = ListHandler.HandleScripts(context.Request);
                }
                else if (method == "GET" && path == "/api/list/prefabs")
                {
                    response = ListHandler.HandlePrefabs(context.Request);
                }
                else if (method == "GET" && path == "/api/settings")
                {
                    response = SettingsHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/build")
                {
                    response = BuildHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/test/run")
                {
                    response = TestHandler.HandleRun(context.Request);
                }
                else if (method == "GET" && path == "/api/test/status")
                {
                    response = TestHandler.HandleStatus(context.Request);
                }
                else if (method == "POST" && path == "/api/prefab/create")
                {
                    response = PrefabHandler.HandleCreate(context.Request);
                }
                else if (method == "POST" && path == "/api/prefab/instantiate")
                {
                    response = PrefabHandler.HandleInstantiate(context.Request);
                }
                else if (method == "GET" && path == "/api/prefab/overrides")
                {
                    response = PrefabHandler.HandleOverrides(context.Request);
                }
                else if (method == "GET" && path == "/api/animator/list")
                {
                    response = AnimatorHandler.HandleList(context.Request);
                }
                else if (method == "POST" && path == "/api/material/create")
                {
                    response = MaterialHandler.HandleCreate(context.Request);
                }
                else if (method == "POST" && path == "/api/material/set")
                {
                    response = MaterialHandler.HandleSet(context.Request);
                }
                else if (method == "POST" && path == "/api/material/assign")
                {
                    response = MaterialHandler.HandleAssign(context.Request);
                }
                else if (method == "POST" && path == "/api/run-script")
                {
                    response = RunScriptHandler.Handle(context.Request);
                }
                else if (method == "POST" && path == "/api/scene/save")
                {
                    response = SceneHandler.HandleSave(context.Request);
                }
                else if (method == "POST" && path == "/api/input/key")
                {
                    response = InputHandler.HandleKey(context.Request);
                }
                else if (method == "POST" && path == "/api/input/mouse")
                {
                    response = InputHandler.HandleMouse(context.Request);
                }
                else
                {
                    statusCode = 404;
                    response = ApiResponse.Error("NOT_FOUND", $"Endpoint not found: {path}");
                }
            }
            catch (Exception ex)
            {
                statusCode = 500;
                response = ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }

            WriteResponse(context, response, statusCode);
        }

        private static void WriteResponse(HttpListenerContext context, ApiResponse response, int statusCode)
        {
            try
            {
                var json = JsonConvert.SerializeObject(response);
                var buffer = Encoding.UTF8.GetBytes(json);

                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json";
                context.Response.ContentLength64 = buffer.Length;
                context.Response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception)
            {
                // IgnoreWriteExceptions handles most cases, but catch any remaining
            }
            finally
            {
                try
                {
                    context.Response.Close();
                }
                catch (Exception)
                {
                    // Response may already be closed
                }
            }
        }
    }
}
