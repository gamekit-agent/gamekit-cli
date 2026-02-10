using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class TestHandler
    {
        public static ApiResponse HandleRun(HttpListenerRequest request)
        {
            string body;
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                body = reader.ReadToEnd();
            }

            var mode = "both";
            if (!string.IsNullOrEmpty(body))
            {
                var json = JObject.Parse(body);
                var modeValue = json["mode"]?.ToString()?.ToLower();
                if (!string.IsNullOrEmpty(modeValue))
                {
                    mode = modeValue;
                }
            }

            if (mode != "editmode" && mode != "playmode" && mode != "both")
            {
                return ApiResponse.Error("INVALID_REQUEST",
                    "Invalid mode. Use 'editmode', 'playmode', or 'both'.");
            }

            TestService.RunTests(mode);
            return ApiResponse.Success(new { status = "started", mode });
        }

        public static ApiResponse HandleStatus(HttpListenerRequest request)
        {
            var result = TestService.GetStatus();
            return ApiResponse.Success(result);
        }
    }
}
