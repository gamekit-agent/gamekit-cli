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
