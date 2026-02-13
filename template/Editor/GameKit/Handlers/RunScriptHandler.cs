using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using Newtonsoft.Json.Linq;

namespace GameKit.Handlers
{
    public static class RunScriptHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            string body;
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                body = reader.ReadToEnd();
            }

            var json = JObject.Parse(body);
            var code = json["code"]?.ToString();

            if (string.IsNullOrEmpty(code))
            {
                return ApiResponse.Error("INVALID_REQUEST", "Missing 'code' field in request body");
            }

            var result = ScriptExecutionService.Execute(code);

            if (result.error != null)
            {
                return ApiResponse.Error("SCRIPT_ERROR", result.error);
            }

            return ApiResponse.Success(new
            {
                output = result.output,
                result = result.result
            });
        }
    }
}
