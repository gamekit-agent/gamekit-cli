using System;
using System.Net;
using GameKit.Models;
using GameKit.Services;

namespace GameKit.Handlers
{
    public static class AnimatorHandler
    {
        public static ApiResponse HandleList(HttpListenerRequest request)
        {
            try
            {
                var path = request.QueryString["path"];

                if (string.IsNullOrEmpty(path))
                {
                    return ApiResponse.Error("MISSING_PATH",
                        "Missing 'path' query parameter. Provide an asset path or scene GameObject path.");
                }

                var result = AnimatorService.ListAnimator(path);
                return ApiResponse.Success(result);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("No AnimatorController found"))
                {
                    return ApiResponse.Error("NOT_FOUND", ex.Message);
                }
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }
    }
}
