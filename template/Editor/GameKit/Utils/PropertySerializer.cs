using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace GameKit.Utils
{
    public static class PropertySerializer
    {
        public static object ReadValue(SerializedProperty prop)
        {
            switch (prop.propertyType)
            {
                case SerializedPropertyType.Integer:
                    return prop.intValue;

                case SerializedPropertyType.Boolean:
                    return prop.boolValue;

                case SerializedPropertyType.Float:
                    return prop.floatValue;

                case SerializedPropertyType.String:
                    return prop.stringValue;

                case SerializedPropertyType.Enum:
                    try
                    {
                        return prop.enumNames[prop.enumValueIndex];
                    }
                    catch (IndexOutOfRangeException)
                    {
                        // Stale enum data — fall back to raw int
                        return prop.intValue;
                    }

                case SerializedPropertyType.Color:
                    var c = prop.colorValue;
                    return new { r = c.r, g = c.g, b = c.b, a = c.a };

                case SerializedPropertyType.Vector2:
                    var v2 = prop.vector2Value;
                    return new { x = v2.x, y = v2.y };

                case SerializedPropertyType.Vector3:
                    var v3 = prop.vector3Value;
                    return new { x = v3.x, y = v3.y, z = v3.z };

                case SerializedPropertyType.Vector4:
                    var v4 = prop.vector4Value;
                    return new { x = v4.x, y = v4.y, z = v4.z, w = v4.w };

                case SerializedPropertyType.Quaternion:
                    var q = prop.quaternionValue;
                    return new { x = q.x, y = q.y, z = q.z, w = q.w };

                case SerializedPropertyType.Rect:
                    var r = prop.rectValue;
                    return new { x = r.x, y = r.y, width = r.width, height = r.height };

                case SerializedPropertyType.Bounds:
                    var b = prop.boundsValue;
                    return new
                    {
                        center = new { x = b.center.x, y = b.center.y, z = b.center.z },
                        size = new { x = b.size.x, y = b.size.y, z = b.size.z }
                    };

                case SerializedPropertyType.Vector2Int:
                    var v2i = prop.vector2IntValue;
                    return new { x = v2i.x, y = v2i.y };

                case SerializedPropertyType.Vector3Int:
                    var v3i = prop.vector3IntValue;
                    return new { x = v3i.x, y = v3i.y, z = v3i.z };

                case SerializedPropertyType.RectInt:
                    var ri = prop.rectIntValue;
                    return new { x = ri.x, y = ri.y, width = ri.width, height = ri.height };

                case SerializedPropertyType.BoundsInt:
                    var bi = prop.boundsIntValue;
                    return new
                    {
                        position = new { x = bi.position.x, y = bi.position.y, z = bi.position.z },
                        size = new { x = bi.size.x, y = bi.size.y, z = bi.size.z }
                    };

                case SerializedPropertyType.ObjectReference:
                    var obj = prop.objectReferenceValue;
                    if (obj != null)
                    {
                        return new
                        {
                            name = obj.name,
                            type = obj.GetType().Name,
                            instanceId = obj.GetInstanceID()
                        };
                    }
                    return null;

                case SerializedPropertyType.LayerMask:
                    return prop.intValue;

                case SerializedPropertyType.ArraySize:
                    return prop.intValue;

                case SerializedPropertyType.Character:
                    return prop.intValue;

                case SerializedPropertyType.AnimationCurve:
                    return new { keys = prop.animationCurveValue.length };

                case SerializedPropertyType.Gradient:
                    return "<gradient>";

                case SerializedPropertyType.ExposedReference:
                    return "<exposed reference>";

                case SerializedPropertyType.ManagedReference:
                    var typeName = prop.managedReferenceFullTypename;
                    if (!string.IsNullOrEmpty(typeName))
                    {
                        return new { type = typeName };
                    }
                    return null;

                case SerializedPropertyType.Hash128:
                    return prop.hash128Value.ToString();

                case SerializedPropertyType.Generic:
                    // Do NOT recursively expand — top-level NextVisible iteration
                    // already flattens nested properties via propertyPath
                    return "<complex>";

                default:
                    return null;
            }
        }

        public static List<object> SerializeProperties(Component component, int maxDepth = 0)
        {
            var properties = new List<object>();
            var so = new SerializedObject(component);
            so.Update();

            var iterator = so.GetIterator();
            bool enterChildren = true;

            while (iterator.NextVisible(enterChildren))
            {
                enterChildren = false;

                if (maxDepth > 0 && iterator.depth > maxDepth)
                {
                    continue;
                }

                properties.Add(new
                {
                    name = iterator.name,
                    displayName = iterator.displayName,
                    type = iterator.propertyType.ToString(),
                    value = ReadValue(iterator),
                    path = iterator.propertyPath
                });
            }

            return properties;
        }
    }
}
