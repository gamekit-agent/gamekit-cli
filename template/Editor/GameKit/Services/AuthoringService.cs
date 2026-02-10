using System;
using UnityEditor;
using UnityEngine;

namespace GameKit.Services
{
    public static class AuthoringService
    {
        private static void GuardPlayMode()
        {
            if (EditorApplication.isPlaying)
            {
                throw new Exception("Cannot modify scene during play mode. Stop play mode first.");
            }
        }

        public static object CreateGameObject(string name, string parentPath)
        {
            GuardPlayMode();

            var go = ObjectFactory.CreateGameObject(name);

            if (!string.IsNullOrEmpty(parentPath))
            {
                var parent = SceneService.FindGameObjectByPath(parentPath);
                if (parent == null)
                {
                    // Clean up the created object before throwing
                    Undo.DestroyObjectImmediate(go);
                    throw new Exception($"Parent not found: {parentPath}");
                }
                Undo.SetTransformParent(go.transform, parent.transform, false, "Set Parent");
            }

            return new
            {
                name = go.name,
                path = SceneService.GetHierarchyPath(go.transform),
                instanceId = go.GetInstanceID()
            };
        }

        public static object DestroyGameObject(string path)
        {
            GuardPlayMode();

            var go = SceneService.FindGameObjectByPath(path);
            if (go == null)
            {
                throw new Exception($"GameObject not found: {path}");
            }

            var destroyedName = go.name;
            Undo.DestroyObjectImmediate(go);

            return new
            {
                destroyed = destroyedName,
                path
            };
        }

        public static object SetTransform(string path, Vector3? position, Vector3? rotation, Vector3? scale)
        {
            GuardPlayMode();

            var go = SceneService.FindGameObjectByPath(path);
            if (go == null)
            {
                throw new Exception($"GameObject not found: {path}");
            }

            Undo.RecordObject(go.transform, "Set Transform");

            if (position.HasValue)
            {
                go.transform.localPosition = position.Value;
            }

            if (rotation.HasValue)
            {
                go.transform.localEulerAngles = rotation.Value;
            }

            if (scale.HasValue)
            {
                go.transform.localScale = scale.Value;
            }

            return new
            {
                name = go.name,
                path = SceneService.GetHierarchyPath(go.transform),
                position = new
                {
                    x = go.transform.localPosition.x,
                    y = go.transform.localPosition.y,
                    z = go.transform.localPosition.z
                },
                rotation = new
                {
                    x = go.transform.localEulerAngles.x,
                    y = go.transform.localEulerAngles.y,
                    z = go.transform.localEulerAngles.z
                },
                scale = new
                {
                    x = go.transform.localScale.x,
                    y = go.transform.localScale.y,
                    z = go.transform.localScale.z
                }
            };
        }
    }
}
