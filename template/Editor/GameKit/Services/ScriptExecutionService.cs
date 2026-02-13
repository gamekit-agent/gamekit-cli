using System;
using System.IO;
using System.Text;
using Mono.CSharp;
using UnityEngine;

namespace GameKit.Services
{
    public static class ScriptExecutionService
    {
        private static Evaluator _evaluator;
        private static StringBuilder _reportOutput;

        private static void EnsureEvaluator()
        {
            if (_evaluator != null) return;

            _reportOutput = new StringBuilder();
            var reportWriter = new StringWriter(_reportOutput);

            var settings = new CompilerSettings();
            var report = new StreamReportPrinter(reportWriter);
            var context = new CompilerContext(settings, report);
            _evaluator = new Evaluator(context);

            // Reference key assemblies
            _evaluator.ReferenceAssembly(typeof(object).Assembly);
            _evaluator.ReferenceAssembly(typeof(System.Linq.Enumerable).Assembly);
            _evaluator.ReferenceAssembly(typeof(UnityEngine.Debug).Assembly);
            _evaluator.ReferenceAssembly(typeof(UnityEditor.EditorApplication).Assembly);

            // Pre-import common namespaces
            _evaluator.Run("using System;");
            _evaluator.Run("using System.Linq;");
            _evaluator.Run("using System.Collections.Generic;");
            _evaluator.Run("using UnityEngine;");
            _evaluator.Run("using UnityEditor;");
        }

        public static ScriptResult Execute(string code)
        {
            EnsureEvaluator();
            _reportOutput.Clear();

            var output = new StringBuilder();

            // Capture Debug.Log output during execution
            Application.LogCallback logHandler = (message, stackTrace, type) =>
            {
                output.AppendLine(message);
            };

            Application.logMessageReceived += logHandler;

            try
            {
                object result;
                bool resultSet;

                string error = _evaluator.Evaluate(code, out result, out resultSet);

                // If Evaluate returned a partial/error string, try Run instead
                if (error != null)
                {
                    _evaluator.Run(code);
                    return new ScriptResult
                    {
                        output = output.ToString(),
                        result = null,
                        error = null
                    };
                }

                // Check if the compiler reported errors
                var compilerOutput = _reportOutput.ToString().Trim();
                if (!string.IsNullOrEmpty(compilerOutput))
                {
                    return new ScriptResult
                    {
                        output = output.ToString(),
                        result = null,
                        error = compilerOutput
                    };
                }

                return new ScriptResult
                {
                    output = output.ToString(),
                    result = resultSet ? (result?.ToString()) : null,
                    error = null
                };
            }
            catch (Exception ex)
            {
                return new ScriptResult
                {
                    output = output.ToString(),
                    result = null,
                    error = ex.Message
                };
            }
            finally
            {
                Application.logMessageReceived -= logHandler;
            }
        }

        public static void Reset()
        {
            _evaluator = null;
        }
    }

    public class ScriptResult
    {
        public string output;
        public string result;
        public string error;
    }
}
