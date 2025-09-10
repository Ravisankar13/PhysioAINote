/**
 * TensorFlow Dynamic Loader
 * Loads TensorFlow and related models dynamically at runtime to reduce bundle size
 */

let tfModule: any = null;
let poseDetectionModule: any = null;
let bodyPixModule: any = null;

export async function loadTensorFlow() {
  if (tfModule) return tfModule;
  
  try {
    // Dynamically import TensorFlow
    tfModule = await import('@tensorflow/tfjs');
    await tfModule.ready();
    console.log('TensorFlow.js loaded dynamically');
    return tfModule;
  } catch (error) {
    console.error('Failed to load TensorFlow:', error);
    throw error;
  }
}

export async function loadPoseDetection() {
  if (poseDetectionModule) return poseDetectionModule;
  
  try {
    // Ensure TensorFlow is loaded first
    await loadTensorFlow();
    
    // Dynamically import pose detection
    poseDetectionModule = await import('@tensorflow-models/pose-detection');
    console.log('Pose Detection model loaded dynamically');
    return poseDetectionModule;
  } catch (error) {
    console.error('Failed to load Pose Detection:', error);
    throw error;
  }
}

export async function loadBodyPix() {
  if (bodyPixModule) return bodyPixModule;
  
  try {
    // Ensure TensorFlow is loaded first
    await loadTensorFlow();
    
    // Dynamically import BodyPix
    bodyPixModule = await import('@tensorflow-models/body-pix');
    console.log('BodyPix model loaded dynamically');
    return bodyPixModule;
  } catch (error) {
    console.error('Failed to load BodyPix:', error);
    throw error;
  }
}

export async function initializeTensorFlowBackend() {
  try {
    const tf = await loadTensorFlow();
    
    // Try WebGPU first, then WebGL as fallback
    try {
      await import('@tensorflow/tfjs-backend-webgpu');
      await tf.setBackend('webgpu');
    } catch {
      await import('@tensorflow/tfjs-backend-webgl');
      await tf.setBackend('webgl');
    }
    
    await tf.ready();
    console.log('TensorFlow.js ready, backend:', tf.getBackend());
    return true;
  } catch (error) {
    console.error('Failed to initialize TensorFlow backend:', error);
    return false;
  }
}