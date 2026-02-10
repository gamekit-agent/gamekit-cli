using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.TestTools.TestRunner.Api;
using UnityEngine;

namespace GameKit.Services
{
    public static class TestService
    {
        private class TestResult
        {
            public string name;
            public string fullName;
            public string status;
            public double duration;
            public string message;
            public string stackTrace;
        }

        private static string _runStatus = "idle";
        private static List<TestResult> _results = new List<TestResult>();
        private static readonly object _lock = new object();

        [InitializeOnLoadMethod]
        private static void Init()
        {
            var api = ScriptableObject.CreateInstance<TestRunnerApi>();
            api.RegisterCallbacks(new TestCallbacks());
        }

        public static void RunTests(string mode)
        {
            lock (_lock)
            {
                _results.Clear();
                _runStatus = "running";
            }

            var api = ScriptableObject.CreateInstance<TestRunnerApi>();

            TestMode testMode;
            if (mode == "editmode")
                testMode = TestMode.EditMode;
            else if (mode == "playmode")
                testMode = TestMode.PlayMode;
            else
                testMode = TestMode.EditMode | TestMode.PlayMode;

            var filter = new Filter { testMode = testMode };
            api.Execute(new ExecutionSettings(filter));
        }

        public static object GetStatus()
        {
            List<TestResult> snapshot;
            string runStatus;

            lock (_lock)
            {
                snapshot = _results.ToList();
                runStatus = _runStatus;
            }

            var passed = snapshot.Count(r => r.status == "Passed");
            var failed = snapshot.Count(r => r.status == "Failed");
            var skipped = snapshot.Count(r => r.status == "Skipped");

            return new
            {
                status = runStatus,
                passed,
                failed,
                skipped,
                total = snapshot.Count,
                results = snapshot.Select(r => new
                {
                    r.name,
                    r.fullName,
                    r.status,
                    r.duration,
                    r.message,
                    r.stackTrace
                })
            };
        }

        private class TestCallbacks : ICallbacks
        {
            public void RunStarted(ITestAdaptor testsToRun)
            {
                // no-op
            }

            public void RunFinished(ITestResultAdaptor result)
            {
                lock (_lock)
                {
                    _runStatus = "complete";
                }
            }

            public void TestStarted(ITestAdaptor test)
            {
                // no-op
            }

            public void TestFinished(ITestResultAdaptor result)
            {
                if (!result.HasChildren)
                {
                    lock (_lock)
                    {
                        _results.Add(new TestResult
                        {
                            name = result.Name,
                            fullName = result.FullName,
                            status = result.TestStatus.ToString(),
                            duration = result.Duration,
                            message = result.Message,
                            stackTrace = result.StackTrace
                        });
                    }
                }
            }
        }
    }
}
