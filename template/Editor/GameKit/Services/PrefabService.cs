using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace GameKit.Services
{
    public static class PrefabService
    {
        private static void GuardPlayMode()
        {
            if (EditorApplication.isPlaying)
            {
                throw new Exception("Cannot modify prefabs during play mode. Stop play mode first.");
            }
        }

        public static object CreatePrefab(string gameObjectPath, string assetPath, bool connect)
        {
            GuardPlayMode();

            var go = SceneService.FindGameObjectByPath(gameObjectPath);
            if (go == null)
            {
                throw new Exception($"GameObject not found: {gameObjectPath}");
            }

            if (string.IsNullOrEmpty(assetPath))
            {
                assetPath = $"Assets/Prefabs/{go.name}.prefab";
            }

            var dir = Path.GetDirectoryName(assetPath);
            if (!string.IsNullOrEmpty(dir) && !AssetDatabase.IsValidFolder(dir))
            {
                CreateFolderRecursive(dir);
            }

            bool success;
            GameObject prefab;
            if (connect)
            {
                prefab = PrefabUtility.SaveAsPrefabAssetAndConnect(
                    go, assetPath, InteractionMode.AutomatedAction, out success);
            }
            else
            {
                prefab = PrefabUtility.SaveAsPrefabAsset(go, assetPath, out success);
            }

            if (!success)
            {
                throw new Exception($"Failed to create prefab at: {assetPath}");
            }

            var assetType = PrefabUtility.GetPrefabAssetType(prefab);
            return new
            {
                path = assetPath,
                name = prefab.name,
                type = assetType.ToString(),
                isVariant = assetType == PrefabAssetType.Variant
            };
        }

        public static object InstantiatePrefab(string prefabPath, string parentPath)
        {
            GuardPlayMode();

            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
            if (prefab == null)
            {
                throw new Exception($"Prefab not found: {prefabPath}");
            }

            var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            Undo.RegisterCreatedObjectUndo(instance, "Instantiate Prefab");

            if (!string.IsNullOrEmpty(parentPath))
            {
                var parent = SceneService.FindGameObjectByPath(parentPath);
                if (parent == null)
                {
                    Undo.DestroyObjectImmediate(instance);
                    throw new Exception($"Parent not found: {parentPath}");
                }
                Undo.SetTransformParent(instance.transform, parent.transform, false, "Set Parent");
            }

            return new
            {
                name = instance.name,
                path = SceneService.GetHierarchyPath(instance.transform),
                instanceId = instance.GetInstanceID(),
                prefabPath
            };
        }

        public static object GetOverrides(string gameObjectPath)
        {
            var go = SceneService.FindGameObjectByPath(gameObjectPath);
            if (go == null)
            {
                throw new Exception($"GameObject not found: {gameObjectPath}");
            }

            if (!PrefabUtility.IsPartOfPrefabInstance(go))
            {
                throw new Exception($"'{gameObjectPath}' is not a prefab instance");
            }

            var modifications = PrefabUtility.GetPropertyModifications(go);
            var overrides = new List<object>();
            if (modifications != null)
            {
                foreach (var mod in modifications)
                {
                    if (PrefabUtility.IsDefaultOverride(mod)) continue;
                    overrides.Add(new
                    {
                        target = mod.target?.name,
                        targetType = mod.target?.GetType().Name,
                        propertyPath = mod.propertyPath,
                        value = mod.value
                    });
                }
            }

            var hasOverrides = PrefabUtility.HasPrefabInstanceAnyOverrides(go, false);
            return new
            {
                gameObject = go.name,
                path = gameObjectPath,
                isPrefabInstance = true,
                assetType = PrefabUtility.GetPrefabAssetType(go).ToString(),
                hasOverrides,
                overrides
            };
        }

        private static void CreateFolderRecursive(string path)
        {
            // Normalize separators
            path = path.Replace("\\", "/");
            var segments = path.Split('/');

            var current = segments[0]; // "Assets"
            for (int i = 1; i < segments.Length; i++)
            {
                var next = current + "/" + segments[i];
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, segments[i]);
                }
                current = next;
            }
        }
    }
}
