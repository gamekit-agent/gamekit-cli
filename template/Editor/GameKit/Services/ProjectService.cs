using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditorInternal;
using UnityEngine;

namespace GameKit.Services
{
    public static class ProjectService
    {
        public static object ListScripts()
        {
            var guids = AssetDatabase.FindAssets("t:Script");
            var scripts = new List<object>();

            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.StartsWith("Assets/")) continue;
                if (!path.EndsWith(".cs")) continue;

                scripts.Add(new
                {
                    path,
                    name = Path.GetFileNameWithoutExtension(path)
                });
            }

            return scripts;
        }

        public static object ListPrefabs()
        {
            var guids = AssetDatabase.FindAssets("t:Prefab");
            var prefabs = new List<object>();

            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.StartsWith("Assets/")) continue;

                prefabs.Add(new
                {
                    path,
                    name = Path.GetFileNameWithoutExtension(path)
                });
            }

            return prefabs;
        }

        public static object GetSettings()
        {
            var gravity = Physics.gravity;

            return new
            {
                layers = InternalEditorUtility.layers,
                tags = InternalEditorUtility.tags,
                sortingLayers = SortingLayer.layers.Select(l => new { l.name, l.id, l.value }).ToArray(),
                physics = new
                {
                    gravity = new { x = gravity.x, y = gravity.y, z = gravity.z },
                    defaultContactOffset = Physics.defaultContactOffset,
                    bounceThreshold = Physics.bounceThreshold,
                    defaultSolverIterations = Physics.defaultSolverIterations,
                    defaultSolverVelocityIterations = Physics.defaultSolverVelocityIterations
                },
                quality = new
                {
                    levels = QualitySettings.names,
                    current = QualitySettings.GetQualityLevel(),
                    currentName = QualitySettings.names[QualitySettings.GetQualityLevel()]
                },
                input = GetInputAxes()
            };
        }

        private static object GetInputAxes()
        {
            try
            {
                var inputManager = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/InputManager.asset")[0];
                var serializedObject = new SerializedObject(inputManager);
                var axesProperty = serializedObject.FindProperty("m_Axes");

                var axes = new List<object>();
                for (int i = 0; i < axesProperty.arraySize; i++)
                {
                    var axis = axesProperty.GetArrayElementAtIndex(i);
                    axes.Add(new
                    {
                        name = axis.FindPropertyRelative("m_Name").stringValue,
                        positiveButton = axis.FindPropertyRelative("positiveButton").stringValue,
                        negativeButton = axis.FindPropertyRelative("negativeButton").stringValue,
                        type = axis.FindPropertyRelative("type").intValue
                    });
                }

                return axes;
            }
            catch
            {
                return new List<object>();
            }
        }
    }
}
