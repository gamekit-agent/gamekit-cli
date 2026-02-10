using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace GameKit.Services
{
    public static class BuildService
    {
        public static object Build(string platform, string outputPath)
        {
            var target = ParseBuildTarget(platform);

            var scenes = EditorBuildSettings.scenes
                .Where(s => s.enabled)
                .Select(s => s.path)
                .ToArray();

            if (scenes.Length == 0)
            {
                throw new Exception("No scenes enabled in Build Settings. Add scenes via File > Build Settings.");
            }

            if (string.IsNullOrEmpty(outputPath))
            {
                outputPath = "Builds/" + platform;
            }

            outputPath = GetOutputPath(outputPath, target);

            var dirName = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dirName))
            {
                Directory.CreateDirectory(dirName);
            }
            else
            {
                Directory.CreateDirectory(outputPath);
            }

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = outputPath,
                target = target,
                options = BuildOptions.None
            };

            var report = BuildPipeline.BuildPlayer(options);

            var errors = new List<object>();
            foreach (var step in report.steps)
            {
                foreach (var msg in step.messages)
                {
                    if (msg.type == LogType.Error)
                    {
                        errors.Add(new { message = msg.content });
                    }
                }
            }

            return new
            {
                result = report.summary.result.ToString(),
                platform = report.summary.platform.ToString(),
                outputPath = report.summary.outputPath,
                totalSize = report.summary.totalSize,
                totalTime = report.summary.totalTime.TotalSeconds,
                totalErrors = report.summary.totalErrors,
                totalWarnings = report.summary.totalWarnings,
                errors
            };
        }

        private static BuildTarget ParseBuildTarget(string platform)
        {
            switch (platform.ToLowerInvariant())
            {
                case "windows":
                case "win":
                case "win64":
                case "standalonewindows64":
                    return BuildTarget.StandaloneWindows64;

                case "mac":
                case "macos":
                case "osx":
                case "standaloneosx":
                    return BuildTarget.StandaloneOSX;

                case "linux":
                case "linux64":
                case "standalonelinux64":
                    return BuildTarget.StandaloneLinux64;

                case "ios":
                    return BuildTarget.iOS;

                case "android":
                    return BuildTarget.Android;

                case "webgl":
                    return BuildTarget.WebGL;

                default:
                    throw new Exception($"Unknown platform: {platform}. Supported: windows, mac, linux, ios, android, webgl");
            }
        }

        private static string GetOutputPath(string basePath, BuildTarget target)
        {
            switch (target)
            {
                case BuildTarget.StandaloneWindows64:
                    if (!basePath.EndsWith(".exe"))
                        return basePath + ".exe";
                    return basePath;

                case BuildTarget.StandaloneOSX:
                    if (!basePath.EndsWith(".app"))
                        return basePath + ".app";
                    return basePath;

                case BuildTarget.Android:
                    if (!basePath.EndsWith(".apk"))
                        return basePath + ".apk";
                    return basePath;

                default:
                    return basePath;
            }
        }
    }
}
