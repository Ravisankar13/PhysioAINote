/**
 * MediaPipe configuration for production deployment
 * This ensures consistent loading of MediaPipe resources across environments
 */

// Use a specific version to ensure consistency across deployments
export const MEDIAPIPE_VERSION = '0.5.1675469404';
export const MEDIAPIPE_HANDS_VERSION = '0.4.1675469240';

// Helper to detect if device is mobile/tablet
export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

// MediaPipe CDN configuration
export const MEDIAPIPE_CONFIG = {
  pose: {
    // Use specific version for reliability
    locateFile: (file: string) => {
      const baseUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_VERSION}`;
      console.log(`[MediaPipe] Loading: ${file} from ${baseUrl}`);
      return `${baseUrl}/${file}`;
    },
    
    // Pose detection settings — using "heavy" model for better limb accuracy
    options: {
      modelComplexity: 2 as 0 | 1 | 2,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
      selfieMode: false // Don't mirror for back camera
    }
  },

  hands: {
    locateFile: (file: string) => {
      const baseUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VERSION}`;
      console.log(`[MediaPipe] Loading hand model: ${file} from ${baseUrl}`);
      return `${baseUrl}/${file}`;
    },
    options: {
      maxNumHands: 2,
      modelComplexity: 1 as 0 | 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }
  },
  
  // Camera settings optimized for web
  camera: {
    width: 1280,
    height: 720,
    // Default to back camera (environment) on mobile devices, front camera (user) on desktop
    facingMode: (isMobileDevice() ? 'environment' : 'user') as 'user' | 'environment'
  },
  
  // Timeout settings for production
  timeouts: {
    modelLoad: 30000, // 30 seconds for model loading
    cameraStart: 15000, // 15 seconds for camera start
    permission: 10000 // 10 seconds for permission request
  }
};

// Helper function to check if environment supports MediaPipe
export function checkMediaPipeSupport(): { supported: boolean; error?: string } {
  // Check for secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    return {
      supported: false,
      error: 'MediaPipe requires a secure context (HTTPS). Please ensure you\'re accessing the site via HTTPS.'
    };
  }
  
  // Check for WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) {
    return {
      supported: false,
      error: 'Your browser doesn\'t support WebGL, which is required for pose detection.'
    };
  }
  
  // Check for getUserMedia support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      error: 'Your browser doesn\'t support camera access. Please use a modern browser.'
    };
  }
  
  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    return {
      supported: false,
      error: 'Your browser doesn\'t support WebAssembly, which is required for pose detection.'
    };
  }
  
  return { supported: true };
}

// Helper function to request camera permission with better error handling
export async function requestCameraPermission(preferredFacingMode?: 'user' | 'environment'): Promise<void> {
  const facingMode = preferredFacingMode || MEDIAPIPE_CONFIG.camera.facingMode;
  
  try {
    // First try with ideal constraint for better compatibility
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: MEDIAPIPE_CONFIG.camera.width },
          height: { ideal: MEDIAPIPE_CONFIG.camera.height },
          facingMode: { ideal: facingMode }
        }
      });
    } catch (firstError) {
      // If ideal fails, try with exact constraint
      console.warn('Ideal camera constraint failed, trying exact:', firstError);
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: MEDIAPIPE_CONFIG.camera.width },
          height: { ideal: MEDIAPIPE_CONFIG.camera.height },
          facingMode: { exact: facingMode }
        }
      });
    }
    
    // Stop the stream as we only need to check permission
    stream.getTracks().forEach(track => track.stop());
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No camera found. Please connect a camera and refresh the page.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera is already in use by another application. Please close other apps using the camera.');
    } else if (error.name === 'OverconstrainedError') {
      throw new Error('Camera doesn\'t support the requested resolution. Trying with default settings.');
    } else {
      throw new Error(`Camera error: ${error.message || 'Unknown error occurred'}`);
    }
  }
}