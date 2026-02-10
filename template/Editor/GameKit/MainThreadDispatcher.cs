using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using UnityEditor;

namespace GameKit
{
    public static class MainThreadDispatcher
    {
        private static readonly ConcurrentQueue<Action> _queue = new ConcurrentQueue<Action>();

        [InitializeOnLoadMethod]
        private static void Init()
        {
            EditorApplication.update += ProcessQueue;
        }

        private static void ProcessQueue()
        {
            while (_queue.TryDequeue(out var action))
            {
                action();
            }
        }

        public static T Invoke<T>(Func<T> func)
        {
            if (IsMainThread())
                return func();

            var tcs = new TaskCompletionSource<T>();
            _queue.Enqueue(() =>
            {
                try
                {
                    tcs.SetResult(func());
                }
                catch (Exception e)
                {
                    tcs.SetException(e);
                }
            });
            return tcs.Task.Result;
        }

        public static void Invoke(Action action)
        {
            if (IsMainThread())
            {
                action();
                return;
            }

            var tcs = new TaskCompletionSource<bool>();
            _queue.Enqueue(() =>
            {
                try
                {
                    action();
                    tcs.SetResult(true);
                }
                catch (Exception e)
                {
                    tcs.SetException(e);
                }
            });
            tcs.Task.Wait();
        }

        private static bool IsMainThread()
        {
            return Thread.CurrentThread.ManagedThreadId == 1;
        }
    }
}
