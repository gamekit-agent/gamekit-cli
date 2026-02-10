using System.Collections.Generic;
using System.Linq;
using GameKit.Models;
using UnityEditor;
using UnityEditor.Compilation;

namespace GameKit.Services
{
    public static class CompilationService
    {
        private static List<CompilerError> _errors = new List<CompilerError>();
        private static bool _isCompiling;
        private static bool _compilationComplete;

        [InitializeOnLoadMethod]
        private static void Init()
        {
            CompilationPipeline.compilationStarted += OnCompilationStarted;
            CompilationPipeline.assemblyCompilationFinished += OnAssemblyCompiled;
            CompilationPipeline.compilationFinished += OnCompilationFinished;
        }

        private static void OnCompilationStarted(object context)
        {
            _errors.Clear();
            _isCompiling = true;
            _compilationComplete = false;
        }

        private static void OnAssemblyCompiled(string assemblyPath, CompilerMessage[] messages)
        {
            foreach (var msg in messages)
            {
                if (msg.type == CompilerMessageType.Error || msg.type == CompilerMessageType.Warning)
                {
                    _errors.Add(new CompilerError
                    {
                        file = msg.file?.Replace('\\', '/'),
                        line = msg.line,
                        column = msg.column,
                        message = msg.message,
                        severity = msg.type == CompilerMessageType.Error ? "error" : "warning"
                    });
                }
            }
        }

        private static void OnCompilationFinished(object context)
        {
            _isCompiling = false;
            _compilationComplete = true;
        }

        public static void ClearResults()
        {
            _errors.Clear();
            _compilationComplete = false;
        }

        public static (bool hasErrors, List<CompilerError> errors) GetLastResults()
        {
            var hasErrors = _errors.Any(e => e.severity == "error");
            return (hasErrors, new List<CompilerError>(_errors));
        }

        public static bool IsCompiling => _isCompiling;
    }
}
