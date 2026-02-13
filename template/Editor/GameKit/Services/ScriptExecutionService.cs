using System;
using System.IO;
using System.Reflection;
using System.Text;
using UnityEngine;

namespace GameKit.Services
{
    /// <summary>
    /// Executes arbitrary C# code using Mono.CSharp.Evaluator via reflection.
    /// Reflection avoids a compile-time dependency on Mono.CSharp.dll which
    /// isn't auto-referenced by Unity's assembly definition system.
    /// </summary>
    public static class ScriptExecutionService
    {
        private static object _evaluator;
        private static MethodInfo _evaluateMethod;
        private static MethodInfo _runMethod;
        private static MethodInfo _referenceAssemblyMethod;
        private static StringBuilder _reportOutput;
        private static bool _initFailed;
        private static string _initError;

        private static void EnsureEvaluator()
        {
            if (_evaluator != null || _initFailed) return;

            try
            {
                // Load Mono.CSharp.dll from Unity's Mono installation
                var monoPath = Path.Combine(
                    Path.GetDirectoryName(typeof(object).Assembly.Location),
                    "Mono.CSharp.dll"
                );

                if (!File.Exists(monoPath))
                {
                    _initFailed = true;
                    _initError = $"Mono.CSharp.dll not found at: {monoPath}";
                    return;
                }

                var monoCSharp = Assembly.LoadFrom(monoPath);

                var settingsType = monoCSharp.GetType("Mono.CSharp.CompilerSettings");
                var reporterType = monoCSharp.GetType("Mono.CSharp.StreamReportPrinter");
                var contextType = monoCSharp.GetType("Mono.CSharp.CompilerContext");
                var evaluatorType = monoCSharp.GetType("Mono.CSharp.Evaluator");

                _reportOutput = new StringBuilder();
                var reportWriter = new StringWriter(_reportOutput);

                var settings = Activator.CreateInstance(settingsType);
                var reporter = Activator.CreateInstance(reporterType, reportWriter);
                var context = Activator.CreateInstance(contextType, settings, reporter);
                _evaluator = Activator.CreateInstance(evaluatorType, context);

                _evaluateMethod = evaluatorType.GetMethod("Evaluate", new[]
                {
                    typeof(string), typeof(object).MakeByRefType(), typeof(bool).MakeByRefType()
                });
                _runMethod = evaluatorType.GetMethod("Run", new[] { typeof(string) });
                _referenceAssemblyMethod = evaluatorType.GetMethod("ReferenceAssembly",
                    new[] { typeof(Assembly) });

                // Reference key assemblies
                _referenceAssemblyMethod.Invoke(_evaluator, new object[] { typeof(object).Assembly });
                _referenceAssemblyMethod.Invoke(_evaluator, new object[] { typeof(System.Linq.Enumerable).Assembly });
                _referenceAssemblyMethod.Invoke(_evaluator, new object[] { typeof(UnityEngine.Debug).Assembly });
                _referenceAssemblyMethod.Invoke(_evaluator, new object[] { typeof(UnityEditor.EditorApplication).Assembly });

                // Pre-import common namespaces
                _runMethod.Invoke(_evaluator, new object[] { "using System;" });
                _runMethod.Invoke(_evaluator, new object[] { "using System.Linq;" });
                _runMethod.Invoke(_evaluator, new object[] { "using System.Collections.Generic;" });
                _runMethod.Invoke(_evaluator, new object[] { "using UnityEngine;" });
                _runMethod.Invoke(_evaluator, new object[] { "using UnityEditor;" });
            }
            catch (Exception ex)
            {
                _initFailed = true;
                _initError = $"Failed to initialize Mono.CSharp evaluator: {ex.Message}";
                _evaluator = null;
            }
        }

        public static ScriptResult Execute(string code)
        {
            EnsureEvaluator();

            if (_initFailed)
            {
                return new ScriptResult { output = "", result = null, error = _initError };
            }

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
                var evalArgs = new object[] { code, null, false };
                var error = (string)_evaluateMethod.Invoke(_evaluator, evalArgs);

                // If Evaluate returned a partial/error string, try Run instead
                if (error != null)
                {
                    _runMethod.Invoke(_evaluator, new object[] { code });
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

                var resultSet = (bool)evalArgs[2];
                var result = evalArgs[1];

                return new ScriptResult
                {
                    output = output.ToString(),
                    result = resultSet ? (result?.ToString()) : null,
                    error = null
                };
            }
            catch (TargetInvocationException ex)
            {
                return new ScriptResult
                {
                    output = output.ToString(),
                    result = null,
                    error = ex.InnerException?.Message ?? ex.Message
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
            _initFailed = false;
            _initError = null;
        }
    }

    public class ScriptResult
    {
        public string output;
        public string result;
        public string error;
    }
}
