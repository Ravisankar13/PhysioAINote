/**
 * MediaPipe Loader Utility
 * Handles loading MediaPipe libraries with fallback options
 */

export async function loadMediaPipeLibraries() {
  console.log('[MediaPipeLoader] Starting MediaPipe libraries load...');
  
  // Check if MediaPipe is already loaded
  if (window.Pose && window.Camera) {
    console.log('[MediaPipeLoader] MediaPipe already loaded');
    return true;
  }

  try {
    // Try to dynamically import MediaPipe if not already loaded
    if (!window.Pose) {
      console.log('[MediaPipeLoader] Loading Pose library...');
      const poseModule = await import('@mediapipe/pose');
      window.Pose = poseModule.Pose;
      window.POSE_CONNECTIONS = poseModule.POSE_CONNECTIONS;
      console.log('[MediaPipeLoader] Pose library loaded');
    }

    if (!window.Camera) {
      console.log('[MediaPipeLoader] Loading Camera utils...');
      const cameraModule = await import('@mediapipe/camera_utils');
      window.Camera = cameraModule.Camera;
      console.log('[MediaPipeLoader] Camera utils loaded');
    }

    if (!window.drawConnectors) {
      console.log('[MediaPipeLoader] Loading Drawing utils...');
      const drawingModule = await import('@mediapipe/drawing_utils');
      window.drawConnectors = drawingModule.drawConnectors;
      window.drawLandmarks = drawingModule.drawLandmarks;
      console.log('[MediaPipeLoader] Drawing utils loaded');
    }

    console.log('[MediaPipeLoader] All MediaPipe libraries loaded successfully');
    return true;
  } catch (error) {
    console.error('[MediaPipeLoader] Failed to load MediaPipe libraries:', error);
    
    // Try loading from CDN as fallback
    console.log('[MediaPipeLoader] Attempting CDN fallback...');
    return await loadFromCDN();
  }
}

async function loadFromCDN(): Promise<boolean> {
  try {
    // Load Pose from CDN
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');
    
    // Load Camera Utils from CDN
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js');
    
    // Load Drawing Utils from CDN
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js');
    
    console.log('[MediaPipeLoader] CDN fallback successful');
    return true;
  } catch (error) {
    console.error('[MediaPipeLoader] CDN fallback failed:', error);
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Extend Window interface
declare global {
  interface Window {
    Pose: any;
    POSE_CONNECTIONS: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
  }
}