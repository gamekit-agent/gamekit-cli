using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace GameKit.Services
{
    public static class SceneService
    {
        public static object ListScenes()
        {
            var guids = AssetDatabase.FindAssets("t:Scene");
            var buildScenes = EditorBuildSettings.scenes;

            var scenes = new List<object>();

            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.EndsWith(".unity")) continue;

                var name = Path.GetFileNameWithoutExtension(path);
                var buildScene = buildScenes.FirstOrDefault(s => s.path == path);
                var inBuildSettings = buildScene != null;
                var enabled = buildScene != null && buildScene.enabled;

                scenes.Add(new
                {
                    path,
                    name,
                    inBuildSettings,
                    enabled
                });
            }

            return scenes;
        }

        public static object OpenScene(string sceneNameOrPath)
        {
            if (sceneNameOrPath.EndsWith(".unity"))
            {
                // Open by exact path
                var asset = AssetDatabase.LoadAssetAtPath<SceneAsset>(sceneNameOrPath);
                if (asset == null)
                {
                    throw new Exception($"Scene not found at path: {sceneNameOrPath}");
                }

                EditorSceneManager.SaveOpenScenes();
                EditorSceneManager.OpenScene(sceneNameOrPath);

                var scene = SceneManager.GetActiveScene();
                return new
                {
                    path = sceneNameOrPath,
                    name = Path.GetFileNameWithoutExtension(sceneNameOrPath),
                    rootCount = scene.rootCount
                };
            }

            // Search by name
            var guids = AssetDatabase.FindAssets("t:Scene " + sceneNameOrPath);
            var matches = new List<string>();

            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.EndsWith(".unity")) continue;

                var fileName = Path.GetFileNameWithoutExtension(path);
                if (string.Equals(fileName, sceneNameOrPath, StringComparison.OrdinalIgnoreCase))
                {
                    matches.Add(path);
                }
            }

            if (matches.Count == 0)
            {
                throw new Exception($"Scene not found: {sceneNameOrPath}");
            }

            if (matches.Count > 1)
            {
                var pathList = string.Join(", ", matches);
                throw new Exception($"Ambiguous scene name '{sceneNameOrPath}'. Multiple matches: {pathList}");
            }

            var scenePath = matches[0];
            EditorSceneManager.SaveOpenScenes();
            EditorSceneManager.OpenScene(scenePath);

            var openedScene = SceneManager.GetActiveScene();
            return new
            {
                path = scenePath,
                name = Path.GetFileNameWithoutExtension(scenePath),
                rootCount = openedScene.rootCount
            };
        }

        public static object GetHierarchy(string nameFilter, string componentFilter, int maxDepth)
        {
            var scene = SceneManager.GetActiveScene();
            var rootObjects = scene.GetRootGameObjects();

            var hierarchy = new List<object>();
            foreach (var go in rootObjects)
            {
                var node = BuildNode(go.transform, nameFilter, componentFilter, 0, maxDepth);
                if (node != null)
                {
                    hierarchy.Add(node);
                }
            }

            return new
            {
                scene = scene.name,
                scenePath = scene.path,
                rootCount = rootObjects.Length,
                hierarchy
            };
        }

        private static object BuildNode(Transform t, string nameFilter, string componentFilter, int depth, int maxDepth)
        {
            bool hasFilter = !string.IsNullOrEmpty(nameFilter) || !string.IsNullOrEmpty(componentFilter);

            var components = t.GetComponents<Component>()
                .Where(c => c != null)
                .Select(c => c.GetType().Name)
                .ToList();

            // Build children (unless maxDepth reached)
            var children = new List<object>();
            if (maxDepth <= 0 || depth < maxDepth)
            {
                for (int i = 0; i < t.childCount; i++)
                {
                    var childNode = BuildNode(t.GetChild(i), nameFilter, componentFilter, depth + 1, maxDepth);
                    if (childNode != null)
                    {
                        children.Add(childNode);
                    }
                }
            }

            // Apply filters
            if (hasFilter)
            {
                bool nameMatch = !string.IsNullOrEmpty(nameFilter) &&
                    t.name.IndexOf(nameFilter, StringComparison.OrdinalIgnoreCase) >= 0;
                bool componentMatch = !string.IsNullOrEmpty(componentFilter) &&
                    components.Any(c => c.IndexOf(componentFilter, StringComparison.OrdinalIgnoreCase) >= 0);

                bool selfMatches = nameMatch || componentMatch;
                bool hasMatchingDescendants = children.Count > 0;

                if (!selfMatches && !hasMatchingDescendants)
                {
                    return null;
                }
            }

            return new
            {
                name = t.name,
                path = GetHierarchyPath(t),
                activeSelf = t.gameObject.activeSelf,
                activeInHierarchy = t.gameObject.activeInHierarchy,
                components,
                children
            };
        }

        public static GameObject FindGameObjectByPath(string path)
        {
            var segments = path.Split('/');
            if (segments.Length == 0) return null;

            var scene = SceneManager.GetActiveScene();
            var rootObjects = scene.GetRootGameObjects();

            // Find root object
            GameObject current = null;
            foreach (var go in rootObjects)
            {
                if (go.name == segments[0])
                {
                    current = go;
                    break;
                }
            }

            if (current == null) return null;

            // Walk through remaining segments using Transform.Find for each
            for (int i = 1; i < segments.Length; i++)
            {
                var child = current.transform.Find(segments[i]);
                if (child == null) return null;
                current = child.gameObject;
            }

            return current;
        }

        internal static string GetHierarchyPath(Transform t)
        {
            var parts = new List<string>();
            var current = t;
            while (current != null)
            {
                parts.Add(current.name);
                current = current.parent;
            }
            parts.Reverse();
            return string.Join("/", parts);
        }
    }
}
