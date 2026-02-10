using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Newtonsoft.Json.Linq;

namespace GameKit.Services
{
    public static class MaterialService
    {
        private static void GuardPlayMode()
        {
            if (EditorApplication.isPlaying)
            {
                throw new Exception("Cannot modify scene during play mode. Stop play mode first.");
            }
        }

        public static object CreateMaterial(string name, string shaderName, string outputPath)
        {
            var shader = Shader.Find(shaderName);
            if (shader == null)
            {
                throw new Exception($"Shader not found: {shaderName}. Common shaders: Standard, Universal Render Pipeline/Lit, HDRP/Lit");
            }

            var material = new Material(shader);
            material.name = name;

            if (string.IsNullOrEmpty(outputPath))
            {
                outputPath = $"Assets/Materials/{name}.mat";
            }

            var dir = System.IO.Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !AssetDatabase.IsValidFolder(dir))
            {
                CreateFolderRecursive(dir);
            }

            AssetDatabase.CreateAsset(material, outputPath);
            AssetDatabase.SaveAssets();

            return new
            {
                path = outputPath,
                name = material.name,
                shader = shaderName
            };
        }

        public static object SetProperty(string materialPath, string property, JToken value)
        {
            var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (material == null)
            {
                throw new Exception($"Material not found: {materialPath}");
            }

            var shader = material.shader;
            int propIndex = shader.FindPropertyIndex(property);
            if (propIndex < 0)
            {
                var available = ListShaderProperties(shader);
                throw new Exception($"Property '{property}' not found on shader '{shader.name}'. Available properties: {available}");
            }

            var propType = shader.GetPropertyType(propIndex);
            SetPropertyByType(material, property, propType, value);

            EditorUtility.SetDirty(material);
            AssetDatabase.SaveAssets();

            var readBack = ReadPropertyByType(material, property, propType);

            return new
            {
                path = materialPath,
                property,
                value = readBack,
                type = propType.ToString()
            };
        }

        public static object AssignMaterial(string materialPath, string gameObjectPath)
        {
            GuardPlayMode();

            var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (material == null)
            {
                throw new Exception($"Material not found: {materialPath}");
            }

            var go = SceneService.FindGameObjectByPath(gameObjectPath);
            if (go == null)
            {
                throw new Exception($"GameObject not found: {gameObjectPath}");
            }

            var renderer = go.GetComponent<Renderer>();
            if (renderer == null)
            {
                throw new Exception($"No Renderer component on: {gameObjectPath}");
            }

            Undo.RecordObject(renderer, "Assign Material");
            renderer.sharedMaterial = material;

            return new
            {
                gameObject = go.name,
                material = material.name,
                materialPath,
                gameObjectPath
            };
        }

        private static void SetPropertyByType(Material material, string property,
            ShaderPropertyType propType, JToken value)
        {
            switch (propType)
            {
                case ShaderPropertyType.Color:
                    // Support both {r,g,b,a} and {x,y,z,w} keys (CLI sends x/y/z/w)
                    material.SetColor(property, new Color(
                        value["r"]?.Value<float>() ?? value["x"]?.Value<float>() ?? 0f,
                        value["g"]?.Value<float>() ?? value["y"]?.Value<float>() ?? 0f,
                        value["b"]?.Value<float>() ?? value["z"]?.Value<float>() ?? 0f,
                        value["a"]?.Value<float>() ?? value["w"]?.Value<float>() ?? 1f
                    ));
                    break;
                case ShaderPropertyType.Float:
                case ShaderPropertyType.Range:
                    material.SetFloat(property, value.Value<float>());
                    break;
                case ShaderPropertyType.Vector:
                    material.SetVector(property, new Vector4(
                        value["x"]?.Value<float>() ?? 0f,
                        value["y"]?.Value<float>() ?? 0f,
                        value["z"]?.Value<float>() ?? 0f,
                        value["w"]?.Value<float>() ?? 0f
                    ));
                    break;
                case ShaderPropertyType.Int:
                    material.SetInteger(property, value.Value<int>());
                    break;
                case ShaderPropertyType.Texture:
                    if (value.Type == JTokenType.String)
                    {
                        var texPath = value.Value<string>();
                        var texture = AssetDatabase.LoadAssetAtPath<Texture>(texPath);
                        if (texture == null)
                        {
                            throw new Exception($"Texture not found: {texPath}");
                        }
                        material.SetTexture(property, texture);
                    }
                    else if (value.Type == JTokenType.Null)
                    {
                        material.SetTexture(property, null);
                    }
                    break;
                default:
                    throw new Exception($"Unsupported property type: {propType}");
            }
        }

        private static object ReadPropertyByType(Material material, string property,
            ShaderPropertyType propType)
        {
            switch (propType)
            {
                case ShaderPropertyType.Color:
                    var color = material.GetColor(property);
                    return new { r = color.r, g = color.g, b = color.b, a = color.a };
                case ShaderPropertyType.Float:
                case ShaderPropertyType.Range:
                    return material.GetFloat(property);
                case ShaderPropertyType.Vector:
                    var vec = material.GetVector(property);
                    return new { x = vec.x, y = vec.y, z = vec.z, w = vec.w };
                case ShaderPropertyType.Int:
                    return material.GetInteger(property);
                case ShaderPropertyType.Texture:
                    var tex = material.GetTexture(property);
                    return tex != null ? AssetDatabase.GetAssetPath(tex) : null;
                default:
                    return null;
            }
        }

        private static string ListShaderProperties(Shader shader)
        {
            var props = new List<string>();
            int count = shader.GetPropertyCount();
            for (int i = 0; i < count; i++)
            {
                var name = shader.GetPropertyName(i);
                var type = shader.GetPropertyType(i);
                props.Add($"{name} ({type})");
            }
            return string.Join(", ", props);
        }

        private static void CreateFolderRecursive(string path)
        {
            // Normalize separators
            path = path.Replace("\\", "/");
            var parts = path.Split('/');
            var current = parts[0]; // "Assets"

            for (int i = 1; i < parts.Length; i++)
            {
                var next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, parts[i]);
                }
                current = next;
            }
        }
    }
}
