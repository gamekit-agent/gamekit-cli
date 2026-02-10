using System.Net;
using GameKit.Models;
using GameKit.Services;
using UnityEditor;

namespace GameKit.Handlers
{
    public static class RefreshHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            CompilationService.ClearResults();

            AssetDatabase.Refresh();

            if (EditorApplication.isCompiling)
            {
                return ApiResponse.Success(new { status = "compiling", errors = new CompilerError[0] });
            }

            var (hasErrors, errors) = CompilationService.GetLastResults();
            return ApiResponse.Success(new
            {
                status = hasErrors ? "error" : "success",
                errors
            });
        }
    }
}
