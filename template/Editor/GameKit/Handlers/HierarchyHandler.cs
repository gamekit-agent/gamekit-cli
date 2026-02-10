using System.Net;
using GameKit.Models;
using GameKit.Services;

namespace GameKit.Handlers
{
    public static class HierarchyHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            var query = request.QueryString;
            var name = query["name"];
            var component = query["component"];
            int depth = ParseInt(query["depth"], 0);

            var result = SceneService.GetHierarchy(name, component, depth);
            return ApiResponse.Success(result);
        }

        private static int ParseInt(string val, int defaultVal)
        {
            if (string.IsNullOrEmpty(val)) return defaultVal;
            return int.TryParse(val, out int result) ? result : defaultVal;
        }
    }
}
