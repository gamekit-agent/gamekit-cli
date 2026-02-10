using System;
using System.Collections.Generic;
using System.Net;
using GameKit.Models;
using GameKit.Services;
using GameKit.Utils;
using UnityEngine;

namespace GameKit.Handlers
{
    public static class InspectHandler
    {
        public static ApiResponse Handle(HttpListenerRequest request)
        {
            var query = request.QueryString;
            var path = query["path"];
            var componentFilter = query["component"];

            if (string.IsNullOrEmpty(path))
            {
                return ApiResponse.Error("MISSING_PATH", "Query parameter 'path' is required");
            }

            var go = SceneService.FindGameObjectByPath(path);
            if (go == null)
            {
                return ApiResponse.Error("NOT_FOUND", $"GameObject not found: {path}");
            }

            var allComponents = go.GetComponents<Component>();
            var components = new List<object>();

            foreach (var comp in allComponents)
            {
                // Null component means a missing script
                if (comp == null)
                {
                    components.Add(new
                    {
                        type = "Missing (MonoScript)",
                        enabled = false,
                        properties = (object)null
                    });
                    continue;
                }

                var typeName = comp.GetType().Name;

                // Apply component filter if specified
                if (!string.IsNullOrEmpty(componentFilter) &&
                    !string.Equals(typeName, componentFilter, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var enabled = IsComponentEnabled(comp);
                var properties = PropertySerializer.SerializeProperties(comp);

                components.Add(new
                {
                    type = typeName,
                    enabled,
                    properties
                });
            }

            var result = new
            {
                name = go.name,
                path,
                tag = go.tag,
                layer = LayerMask.LayerToName(go.layer),
                activeSelf = go.activeSelf,
                activeInHierarchy = go.activeInHierarchy,
                isStatic = go.isStatic,
                components
            };

            return ApiResponse.Success(result);
        }

        private static bool IsComponentEnabled(Component c)
        {
            if (c is Behaviour behaviour)
            {
                return behaviour.enabled;
            }

            if (c is Renderer renderer)
            {
                return renderer.enabled;
            }

            if (c is Collider collider)
            {
                return collider.enabled;
            }

            // Transform and other components without an enabled property
            // are always considered enabled
            return true;
        }
    }
}
