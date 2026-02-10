using System;
using System.IO;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using GameKit.Utils;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace GameKit.Handlers
{
    public static class SetPropertyHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    body = reader.ReadToEnd();
                }

                var json = JObject.Parse(body);
                var path = json["path"]?.ToString();
                var componentName = json["component"]?.ToString();
                var propertyPath = json["property"]?.ToString();
                var value = json["value"];

                if (string.IsNullOrEmpty(path))
                {
                    return ApiResponse.Error("MISSING_FIELD", "Missing 'path' field in request body");
                }

                if (string.IsNullOrEmpty(componentName))
                {
                    return ApiResponse.Error("MISSING_FIELD",
                        "Missing 'component' field in request body");
                }

                if (string.IsNullOrEmpty(propertyPath))
                {
                    return ApiResponse.Error("MISSING_FIELD",
                        "Missing 'property' field in request body");
                }

                if (value == null)
                {
                    return ApiResponse.Error("MISSING_FIELD",
                        "Missing 'value' field in request body");
                }

                if (EditorApplication.isPlaying)
                {
                    return ApiResponse.Error("PLAY_MODE",
                        "Cannot modify scene during play mode. Stop play mode first.");
                }

                var go = SceneService.FindGameObjectByPath(path);
                if (go == null)
                {
                    return ApiResponse.Error("NOT_FOUND", $"GameObject not found: {path}");
                }

                // Find component by type name (case-insensitive)
                Component targetComponent = null;
                var components = go.GetComponents<Component>();
                foreach (var comp in components)
                {
                    if (comp == null) continue;
                    if (string.Equals(comp.GetType().Name, componentName,
                            StringComparison.OrdinalIgnoreCase))
                    {
                        targetComponent = comp;
                        break;
                    }
                }

                if (targetComponent == null)
                {
                    return ApiResponse.Error("COMPONENT_NOT_FOUND",
                        $"Component '{componentName}' not found on {go.name}");
                }

                var so = new SerializedObject(targetComponent);
                so.Update();

                var prop = so.FindProperty(propertyPath);
                if (prop == null)
                {
                    return ApiResponse.Error("PROPERTY_NOT_FOUND",
                        $"Property '{propertyPath}' not found on {componentName}");
                }

                try
                {
                    PropertyDeserializer.WriteValue(prop, value);
                }
                catch (Exception ex)
                {
                    return ApiResponse.Error("INVALID_VALUE", ex.Message);
                }

                so.ApplyModifiedProperties();

                // Read back the value for confirmation
                so.Update();
                var readProp = so.FindProperty(propertyPath);
                var readBackValue = PropertySerializer.ReadValue(readProp);

                return ApiResponse.Success(new
                {
                    gameObject = go.name,
                    component = componentName,
                    property = propertyPath,
                    value = readBackValue
                });
            }
            catch (Exception ex)
            {
                return ApiResponse.Error("INTERNAL_ERROR", ex.Message);
            }
        }
    }
}
