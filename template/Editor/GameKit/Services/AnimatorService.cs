using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace GameKit.Services
{
    public static class AnimatorService
    {
        public static object ListAnimator(string path)
        {
            var controller = ResolveController(path);
            var assetPath = AssetDatabase.GetAssetPath(controller);

            var layers = new List<object>();
            foreach (var layer in controller.layers)
            {
                var states = new List<object>();
                foreach (var childState in layer.stateMachine.states)
                {
                    var state = childState.state;
                    var transitions = new List<object>();

                    foreach (var transition in state.transitions)
                    {
                        var conditions = new List<object>();
                        foreach (var condition in transition.conditions)
                        {
                            conditions.Add(new
                            {
                                parameter = condition.parameter,
                                mode = condition.mode.ToString(),
                                threshold = condition.threshold
                            });
                        }

                        var destinationName = transition.isExit
                            ? "(Exit)"
                            : transition.destinationState != null
                                ? transition.destinationState.name
                                : "(Any)";

                        transitions.Add(new
                        {
                            destinationState = destinationName,
                            hasExitTime = transition.hasExitTime,
                            exitTime = transition.exitTime,
                            duration = transition.duration,
                            conditions
                        });
                    }

                    states.Add(new
                    {
                        name = state.name,
                        tag = state.tag,
                        speed = state.speed,
                        motion = state.motion != null ? state.motion.name : null,
                        transitions
                    });
                }

                layers.Add(new
                {
                    name = layer.name,
                    stateCount = layer.stateMachine.states.Length,
                    states
                });
            }

            var parameters = new List<object>();
            foreach (var param in controller.parameters)
            {
                parameters.Add(new
                {
                    name = param.name,
                    type = param.type.ToString(),
                    defaultFloat = param.defaultFloat,
                    defaultInt = param.defaultInt,
                    defaultBool = param.defaultBool
                });
            }

            return new
            {
                name = controller.name,
                path = assetPath,
                layerCount = controller.layers.Length,
                parameterCount = controller.parameters.Length,
                layers,
                parameters
            };
        }

        private static AnimatorController ResolveController(string path)
        {
            // Try loading as AnimatorController asset
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(path);
            if (controller != null) return controller;

            // Try loading as AnimatorOverrideController asset
            var overrideController = AssetDatabase.LoadAssetAtPath<AnimatorOverrideController>(path);
            if (overrideController != null)
            {
                controller = overrideController.runtimeAnimatorController as AnimatorController;
                if (controller != null) return controller;
            }

            // Try as scene GameObject path
            var go = SceneService.FindGameObjectByPath(path);
            if (go != null)
            {
                var animator = go.GetComponent<Animator>();
                if (animator != null && animator.runtimeAnimatorController != null)
                {
                    controller = animator.runtimeAnimatorController as AnimatorController;
                    if (controller != null) return controller;

                    // Check for AnimatorOverrideController on the component
                    var componentOverride = animator.runtimeAnimatorController as AnimatorOverrideController;
                    if (componentOverride != null)
                    {
                        controller = componentOverride.runtimeAnimatorController as AnimatorController;
                        if (controller != null) return controller;
                    }
                }
            }

            throw new Exception(
                $"No AnimatorController found at: {path}. Provide an asset path (e.g., Assets/Animations/MyController.controller) or a scene GameObject path with an Animator component.");
        }
    }
}
