using System.Net;
using GameKit.Models;
using GameKit.Services;

namespace GameKit.Handlers
{
    public static class SettingsHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            var result = ProjectService.GetSettings();
            return ApiResponse.Success(result);
        }
    }
}
