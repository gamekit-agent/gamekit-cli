using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace GameKit.Utils
{
    public static class TypeResolver
    {
        private static Dictionary<string, Type> _typeCache;

        private static void EnsureCache()
        {
            if (_typeCache != null) return;

            _typeCache = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase);

            var componentTypes = TypeCache.GetTypesDerivedFrom<Component>();
            foreach (var type in componentTypes)
            {
                if (type.IsAbstract) continue;

                // First-wins for duplicate short names
                if (!_typeCache.ContainsKey(type.Name))
                {
                    _typeCache[type.Name] = type;
                }
            }
        }

        public static Type ResolveComponentType(string typeName)
        {
            EnsureCache();

            // Try short name lookup first
            if (_typeCache.TryGetValue(typeName, out var cached))
            {
                return cached;
            }

            // Fallback: fully qualified name
            var resolved = Type.GetType(typeName);
            if (resolved != null && typeof(Component).IsAssignableFrom(resolved))
            {
                return resolved;
            }

            return null;
        }
    }
}
