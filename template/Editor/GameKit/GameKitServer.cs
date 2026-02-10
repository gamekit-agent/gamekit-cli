using System;
using System.Net;
using UnityEditor;
using UnityEngine;
using GameKit.Utils;

namespace GameKit
{
    [InitializeOnLoad]
    public static class GameKitServer
    {
        private static HttpListener _listener;
        private static int _port;

        static GameKitServer()
        {
            AssemblyReloadEvents.beforeAssemblyReload += OnBeforeReload;
            AssemblyReloadEvents.afterAssemblyReload += OnAfterReload;
            EditorApplication.quitting += OnEditorQuitting;

            // Delay start to avoid asset operation errors during early init
            EditorApplication.delayCall += StartServer;
        }

        private static void StartServer()
        {
            if (_listener != null && _listener.IsListening) return;

            _port = PortManager.FindAvailablePort(17580, 17589);
            if (_port < 0)
            {
                Debug.LogError("[GameKit] Could not find available port in range 17580-17589");
                return;
            }

            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://localhost:{_port}/");
                _listener.IgnoreWriteExceptions = true;
                _listener.Start();
                _listener.BeginGetContext(OnRequestReceived, null);

                PortManager.WritePortFile(_port);
                Debug.Log($"[GameKit] Server started on port {_port}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GameKit] Failed to start server: {ex.Message}");
                _listener = null;
            }
        }

        private static void StopServer()
        {
            if (_listener != null && _listener.IsListening)
            {
                _listener.Stop();
                _listener.Close();
                _listener = null;
            }
        }

        private static void OnBeforeReload()
        {
            StopServer();
            // Do NOT delete port file here -- server will restart after reload
        }

        private static void OnAfterReload()
        {
            // Server restarts via [InitializeOnLoad] static constructor
        }

        private static void OnEditorQuitting()
        {
            StopServer();
            PortManager.DeletePortFile();
        }

        private static void OnRequestReceived(IAsyncResult result)
        {
            if (_listener == null || !_listener.IsListening) return;

            try
            {
                var context = _listener.EndGetContext(result);

                // SSE streaming endpoints must NOT be dispatched to the main thread
                // because they hold the connection open indefinitely
                if (context.Request.Url.AbsolutePath == "/api/console/stream")
                {
                    RequestRouter.HandleRequest(context);
                }
                else
                {
                    MainThreadDispatcher.Invoke(() => RequestRouter.HandleRequest(context));
                }
            }
            catch (ObjectDisposedException)
            {
                // Expected when listener is stopped during EndGetContext
            }
            catch (HttpListenerException)
            {
                // Expected when listener is stopped
            }
            finally
            {
                if (_listener != null && _listener.IsListening)
                {
                    _listener.BeginGetContext(OnRequestReceived, null);
                }
            }
        }
    }
}
