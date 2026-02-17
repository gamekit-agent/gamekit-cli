using UnityEngine;
using UnityEditor;

namespace GameKit.Services
{
    public static class ScreenshotService
    {
        public static byte[] CaptureCamera(Camera camera, int width, int height)
        {
            RenderTexture rt = null;
            Texture2D tex = null;
            RenderTexture previousTarget = camera.targetTexture;
            RenderTexture previousActive = RenderTexture.active;

            try
            {
                rt = new RenderTexture(width, height, 24, RenderTextureFormat.Default);
                camera.targetTexture = rt;
                RenderTexture.active = rt;

                camera.Render();

                tex = new Texture2D(width, height, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                tex.Apply();

                byte[] pngBytes = tex.EncodeToPNG();
                return pngBytes;
            }
            finally
            {
                camera.targetTexture = previousTarget;
                RenderTexture.active = previousActive;

                if (tex != null) Object.DestroyImmediate(tex);
                if (rt != null) Object.DestroyImmediate(rt);
            }
        }

        /// <summary>
        /// Captures the full game view including IMGUI/OnGUI overlays.
        /// Only works in play mode.
        /// </summary>
        public static byte[] CaptureGameView()
        {
            Texture2D tex = null;
            try
            {
                tex = ScreenCapture.CaptureScreenshotAsTexture();
                return tex.EncodeToPNG();
            }
            finally
            {
                if (tex != null) Object.DestroyImmediate(tex);
            }
        }

        public static Camera FindGameCamera()
        {
            if (Camera.main != null) return Camera.main;
            if (Camera.allCameras.Length > 0) return Camera.allCameras[0];
            return null;
        }

        public static Camera FindSceneViewCamera()
        {
            return SceneView.lastActiveSceneView?.camera;
        }

        public static Camera FindNamedCamera(string name)
        {
            var go = GameObject.Find(name);
            return go != null ? go.GetComponent<Camera>() : null;
        }
    }
}
