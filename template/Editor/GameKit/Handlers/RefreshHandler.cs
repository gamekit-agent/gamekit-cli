using System.IO;
using System.Linq;
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

            if (!hasErrors && ScriptsExist())
            {
                var assemblyCSharpPath = Path.Combine("Library", "ScriptAssemblies", "Assembly-CSharp.dll");
                if (!File.Exists(assemblyCSharpPath))
                {
                    return ApiResponse.Success(new
                    {
                        status = "error",
                        errors,
                        missingAssembly = true,
                        message = "Assembly-CSharp.dll was not produced. Check for package or reference errors."
                    });
                }
            }

            return ApiResponse.Success(new
            {
                status = hasErrors ? "error" : "success",
                errors
            });
        }

        private static bool ScriptsExist()
        {
            if (!Directory.Exists("Assets")) return false;
            return Directory.GetFiles("Assets", "*.cs", SearchOption.AllDirectories).Any();
        }
    }
}
