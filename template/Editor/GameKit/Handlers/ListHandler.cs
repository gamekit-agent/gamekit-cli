using System.Net;
using GameKit.Models;
using GameKit.Services;

namespace GameKit.Handlers
{
    public static class ListHandler
    {
        public static ApiResponse HandleScripts(HttpListenerRequest request)
        {
            var result = ProjectService.ListScripts();
            return ApiResponse.Success(result);
        }

        public static ApiResponse HandlePrefabs(HttpListenerRequest request)
        {
            var result = ProjectService.ListPrefabs();
            return ApiResponse.Success(result);
        }
    }
}
