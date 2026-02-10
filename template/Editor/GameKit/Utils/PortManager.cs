using System;
using System.IO;
using System.Net;
using Newtonsoft.Json;
using UnityEngine;

namespace GameKit.Utils
{
    public static class PortManager
    {
        public static int FindAvailablePort(int start, int end)
        {
            for (int port = start; port <= end; port++)
            {
                try
                {
                    var listener = new HttpListener();
                    listener.Prefixes.Add($"http://localhost:{port}/");
                    listener.Start();
                    listener.Stop();
                    listener.Close();
                    return port;
                }
                catch (HttpListenerException)
                {
                    continue;
                }
            }
            return -1;
        }

        public static void WritePortFile(int port)
        {
            var projectRoot = Application.dataPath.Replace("/Assets", "");
            var gamekitDir = Path.Combine(projectRoot, ".gamekit");
            Directory.CreateDirectory(gamekitDir);

            var serverInfo = new ServerInfo
            {
                port = port,
                pid = System.Diagnostics.Process.GetCurrentProcess().Id,
                unityVersion = Application.unityVersion,
                projectPath = projectRoot,
                startedAt = DateTime.UtcNow.ToString("o")
            };

            var json = JsonConvert.SerializeObject(serverInfo, Formatting.Indented);
            File.WriteAllText(Path.Combine(gamekitDir, "server.json"), json);
        }

        public static void DeletePortFile()
        {
            var path = GetPortFilePath();
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }

        private static string GetPortFilePath()
        {
            var projectRoot = Application.dataPath.Replace("/Assets", "");
            return Path.Combine(projectRoot, ".gamekit", "server.json");
        }

        [System.Serializable]
        private class ServerInfo
        {
            public int port;
            public int pid;
            public string unityVersion;
            public string projectPath;
            public string startedAt;
        }
    }
}
