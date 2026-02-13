using System;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;
using Newtonsoft.Json.Linq;

namespace GameKit.Utils
{
    public static class PropertyDeserializer
    {
        /// <summary>
        /// Get the System.Type for a SerializedProperty's objectReferenceValue field type.
        /// Uses reflection on the target object to determine the declared field type.
        /// </summary>
        private static System.Type GetObjectReferenceType(SerializedProperty prop)
        {
            var targetObject = prop.serializedObject.targetObject;
            if (targetObject == null) return typeof(UnityEngine.Object);

            // Walk the type hierarchy to find private fields declared in base classes
            var type = targetObject.GetType();
            while (type != null)
            {
                var fieldInfo = type.GetField(prop.name,
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly);
                if (fieldInfo != null) return fieldInfo.FieldType;
                type = type.BaseType;
            }
            return typeof(UnityEngine.Object);
        }

        private static GameObject FindByNameRecursive(Transform parent, string name)
        {
            if (parent.gameObject.name == name) return parent.gameObject;
            for (int i = 0; i < parent.childCount; i++)
            {
                var result = FindByNameRecursive(parent.GetChild(i), name);
                if (result != null) return result;
            }
            return null;
        }

        /// <summary>
        /// Try to resolve a string value as a scene object reference.
        /// Finds the GameObject by name/path and returns the appropriate component
        /// based on the property's declared type.
        /// </summary>
        private static UnityEngine.Object ResolveSceneReference(string value, SerializedProperty prop)
        {
            // Search by path first, then by name across all root objects
            GameObject go = null;

            var scene = SceneManager.GetActiveScene();
            var rootObjects = scene.GetRootGameObjects();

            // Try exact path match
            if (value.Contains("/"))
            {
                go = GameKit.Services.SceneService.FindGameObjectByPath(value);
            }

            // Try name match across entire hierarchy (recursive)
            if (go == null)
            {
                foreach (var root in rootObjects)
                {
                    go = FindByNameRecursive(root.transform, value);
                    if (go != null) break;
                }
            }

            if (go == null) return null;

            var expectedType = GetObjectReferenceType(prop);

            // If the field expects a GameObject, return it directly
            if (expectedType == typeof(GameObject))
                return go;

            // If the field expects Transform, return it
            if (expectedType == typeof(Transform))
                return go.transform;

            // If the field expects a Component subclass, find it on the GameObject
            if (typeof(Component).IsAssignableFrom(expectedType))
                return go.GetComponent(expectedType);

            // Fallback: return the GameObject itself
            return go;
        }

        public static void WriteValue(SerializedProperty prop, JToken value)
        {
            switch (prop.propertyType)
            {
                case SerializedPropertyType.Integer:
                    prop.intValue = value.Value<int>();
                    break;

                case SerializedPropertyType.Boolean:
                    prop.boolValue = value.Value<bool>();
                    break;

                case SerializedPropertyType.Float:
                    prop.floatValue = value.Value<float>();
                    break;

                case SerializedPropertyType.String:
                    prop.stringValue = value.Value<string>();
                    break;

                case SerializedPropertyType.Enum:
                    if (value.Type == JTokenType.String)
                    {
                        var enumName = value.Value<string>();
                        var index = Array.IndexOf(prop.enumNames, enumName);
                        if (index < 0)
                        {
                            var validValues = string.Join(", ", prop.enumNames);
                            throw new ArgumentException(
                                $"Invalid enum value '{enumName}'. Valid values: {validValues}");
                        }
                        prop.enumValueIndex = index;
                    }
                    else
                    {
                        prop.enumValueIndex = value.Value<int>();
                    }
                    break;

                case SerializedPropertyType.Color:
                    prop.colorValue = new Color(
                        value["r"]?.Value<float>() ?? 0f,
                        value["g"]?.Value<float>() ?? 0f,
                        value["b"]?.Value<float>() ?? 0f,
                        value["a"]?.Value<float>() ?? 1f
                    );
                    break;

                case SerializedPropertyType.Vector2:
                    prop.vector2Value = new Vector2(
                        value["x"]?.Value<float>() ?? 0f,
                        value["y"]?.Value<float>() ?? 0f
                    );
                    break;

                case SerializedPropertyType.Vector3:
                    prop.vector3Value = new Vector3(
                        value["x"]?.Value<float>() ?? 0f,
                        value["y"]?.Value<float>() ?? 0f,
                        value["z"]?.Value<float>() ?? 0f
                    );
                    break;

                case SerializedPropertyType.Vector4:
                    prop.vector4Value = new Vector4(
                        value["x"]?.Value<float>() ?? 0f,
                        value["y"]?.Value<float>() ?? 0f,
                        value["z"]?.Value<float>() ?? 0f,
                        value["w"]?.Value<float>() ?? 0f
                    );
                    break;

                case SerializedPropertyType.Quaternion:
                    prop.quaternionValue = new Quaternion(
                        value["x"]?.Value<float>() ?? 0f,
                        value["y"]?.Value<float>() ?? 0f,
                        value["z"]?.Value<float>() ?? 0f,
                        value["w"]?.Value<float>() ?? 0f
                    );
                    break;

                case SerializedPropertyType.Rect:
                    prop.rectValue = new Rect(
                        value["x"]?.Value<float>() ?? 0f,
                        value["y"]?.Value<float>() ?? 0f,
                        value["width"]?.Value<float>() ?? 0f,
                        value["height"]?.Value<float>() ?? 0f
                    );
                    break;

                case SerializedPropertyType.Bounds:
                {
                    var center = value["center"];
                    var size = value["size"];
                    prop.boundsValue = new Bounds(
                        new Vector3(
                            center?["x"]?.Value<float>() ?? 0f,
                            center?["y"]?.Value<float>() ?? 0f,
                            center?["z"]?.Value<float>() ?? 0f
                        ),
                        new Vector3(
                            size?["x"]?.Value<float>() ?? 0f,
                            size?["y"]?.Value<float>() ?? 0f,
                            size?["z"]?.Value<float>() ?? 0f
                        )
                    );
                    break;
                }

                case SerializedPropertyType.Vector2Int:
                    prop.vector2IntValue = new Vector2Int(
                        value["x"]?.Value<int>() ?? 0,
                        value["y"]?.Value<int>() ?? 0
                    );
                    break;

                case SerializedPropertyType.Vector3Int:
                    prop.vector3IntValue = new Vector3Int(
                        value["x"]?.Value<int>() ?? 0,
                        value["y"]?.Value<int>() ?? 0,
                        value["z"]?.Value<int>() ?? 0
                    );
                    break;

                case SerializedPropertyType.RectInt:
                    prop.rectIntValue = new RectInt(
                        value["x"]?.Value<int>() ?? 0,
                        value["y"]?.Value<int>() ?? 0,
                        value["width"]?.Value<int>() ?? 0,
                        value["height"]?.Value<int>() ?? 0
                    );
                    break;

                case SerializedPropertyType.BoundsInt:
                {
                    var pos = value["position"];
                    var sz = value["size"];
                    prop.boundsIntValue = new BoundsInt(
                        new Vector3Int(
                            pos?["x"]?.Value<int>() ?? 0,
                            pos?["y"]?.Value<int>() ?? 0,
                            pos?["z"]?.Value<int>() ?? 0
                        ),
                        new Vector3Int(
                            sz?["x"]?.Value<int>() ?? 0,
                            sz?["y"]?.Value<int>() ?? 0,
                            sz?["z"]?.Value<int>() ?? 0
                        )
                    );
                    break;
                }

                case SerializedPropertyType.ObjectReference:
                    if (value.Type == JTokenType.Null)
                    {
                        prop.objectReferenceValue = null;
                    }
                    else if (value.Type == JTokenType.Integer)
                    {
                        var instanceId = value.Value<int>();
                        prop.objectReferenceValue = EditorUtility.InstanceIDToObject(instanceId);
                    }
                    else if (value.Type == JTokenType.String)
                    {
                        var str = value.Value<string>();
                        // Try as asset path first
                        var asset = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(str);
                        if (asset != null)
                        {
                            prop.objectReferenceValue = asset;
                        }
                        else
                        {
                            // Fall back to scene object lookup by name/path
                            prop.objectReferenceValue = ResolveSceneReference(str, prop);
                        }
                    }
                    break;

                case SerializedPropertyType.LayerMask:
                    prop.intValue = value.Value<int>();
                    break;

                default:
                    throw new NotSupportedException(
                        $"Unsupported property type: {prop.propertyType}");
            }
        }
    }
}
