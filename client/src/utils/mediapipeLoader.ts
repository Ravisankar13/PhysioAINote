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

  // Load directly from CDN as primary method
  console.log('[MediaPipeLoader] Loading MediaPipe from CDN...');
  return await loadFromCDN();
}

async function loadFromCDN(): Promise<boolean> {
  try {
    // Check if scripts are already loaded
    const scripts = document.querySelectorAll('script[src*="mediapipe"]');
    if (scripts.length > 0) {
      console.log('[MediaPipeLoader] MediaPipe scripts already in DOM');
    }
    
    // Load Drawing Utils first (dependency for Pose)
    if (!window.drawConnectors) {
      console.log('[MediaPipeLoader] Loading Drawing Utils from CDN...');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js');
      console.log('[MediaPipeLoader] Drawing Utils loaded');
    }
    
    // Load Camera Utils
    if (!window.Camera) {
      console.log('[MediaPipeLoader] Loading Camera Utils from CDN...');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js');
      console.log('[MediaPipeLoader] Camera Utils loaded');
    }
    
    // Load Pose last (depends on drawing utils)
    if (!window.Pose) {
      console.log('[MediaPipeLoader] Loading Pose from CDN...');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');
      console.log('[MediaPipeLoader] Pose loaded');
    }
    
    // Wait a moment for scripts to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify everything loaded
    if (window.Pose && window.Camera && window.drawConnectors) {
      console.log('[MediaPipeLoader] All MediaPipe libraries loaded successfully from CDN');
      return true;
    } else {
      console.error('[MediaPipeLoader] Some MediaPipe libraries failed to load:', {
        Pose: !!window.Pose,
        Camera: !!window.Camera,
        drawConnectors: !!window.drawConnectors
      });
      return false;
    }
  } catch (error) {
    console.error('[MediaPipeLoader] CDN loading failed:', error);
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      console.log(`[MediaPipeLoader] Script already exists: ${src}`);
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.async = false; // Load scripts in order
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log(`[MediaPipeLoader] Script loaded successfully: ${src}`);
      resolve();
    };
    
    script.onerror = (error) => {
      console.error(`[MediaPipeLoader] Failed to load script: ${src}`, error);
      reject(new Error(`Failed to load script: ${src}`));
    };
    
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