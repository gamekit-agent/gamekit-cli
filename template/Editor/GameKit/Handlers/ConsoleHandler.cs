using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json;

namespace GameKit.Handlers
{
    public static class ConsoleHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            var severity = request.QueryString["severity"];
            int limit = 0;
            int.TryParse(request.QueryString["limit"], out limit);

            var result = LogService.GetEntries(severity, limit);

            return ApiResponse.Success(new
            {
                entries = result.entries,
                totalCount = result.totalCount,
                droppedCount = result.droppedCount
            });
        }

        public static void HandleStream(HttpListenerContext context)
        {
            context.Response.ContentType = "text/event-stream";
            context.Response.SendChunked = true;
            context.Response.Headers.Add("Cache-Control", "no-cache");
            context.Response.Headers.Add("Connection", "keep-alive");

            StreamWriter writer;
            try
            {
                writer = new StreamWriter(context.Response.OutputStream, new UTF8Encoding(false))
                {
                    AutoFlush = true
                };
            }
            catch (Exception)
            {
                try { context.Response.Close(); } catch { }
                return;
            }

            var disconnected = false;
            var disconnectEvent = new ManualResetEventSlim(false);

            Action<LogEntry> listener = (entry) =>
            {
                if (disconnected) return;

                try
                {
                    var json = JsonConvert.SerializeObject(entry);
                    writer.Write("data: " + json + "\n\n");
                }
                catch (Exception)
                {
                    disconnected = true;
                    disconnectEvent.Set();
                }
            };

            LogService.AddListener(listener);

            try
            {
                // Send initial connection comment as heartbeat
                writer.Write(": connected\n\n");

                // Block until disconnected, sending periodic heartbeats
                while (!disconnected)
                {
                    bool signaled = disconnectEvent.Wait(TimeSpan.FromSeconds(15));
                    if (signaled) break;

                    // Send heartbeat to detect dead connections
                    try
                    {
                        writer.Write(": heartbeat\n\n");
                    }
                    catch (Exception)
                    {
                        disconnected = true;
                    }
                }
            }
            finally
            {
                LogService.RemoveListener(listener);
                disconnectEvent.Dispose();

                try { writer.Close(); } catch { }
                try { context.Response.Close(); } catch { }
            }
        }
    }
}
