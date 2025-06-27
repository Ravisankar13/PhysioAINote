import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as bodyPix from '@tensorflow-models/body-pix';

// Ensure TensorFlow.js is properly loaded
if (typeof window !== 'undefined') {
  // Set up TensorFlow.js platform with local backend preference
  tf.ready().then(() => {
    console.log('TensorFlow.js ready, backend:', tf.getBackend());
  });
}

interface PoseDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  onPoseData?: (poses: any[]) => void;
}

export const PoseDetection: React.FC<PoseDetectionProps> = ({
  videoRef,
  canvasRef,
  isActive,
  onPoseData
}) => {
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const animationIdRef = useRef<number>();

  // Initialize TensorFlow.js pose detection
  const initializePoseDetection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Initializing TensorFlow.js pose detection...');

      // Initialize TensorFlow.js backend with improved compatibility
      console.log('Setting up TensorFlow.js backend...');
      
      try {
        // First ensure we have a clean state
        await tf.ready();
        console.log('Current backend:', tf.getBackend());
        
        // Try to force WebGL if available, otherwise use CPU
        if (tf.getBackend() !== 'webgl') {
          try {
            await tf.setBackend('webgl');
            await tf.ready();
            console.log('Switched to WebGL backend');
          } catch (webglError) {
            console.warn('WebGL unavailable, using CPU:', webglError.message);
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('Using CPU backend');
          }
        }
      } catch (backendError) {
        console.error('Backend initialization failed:', backendError);
        throw new Error(`TensorFlow.js backend failed: ${backendError.message}`);
      }

      console.log('TensorFlow.js backend ready:', tf.getBackend());

      // Initialize pose detection with full body optimization
      let poseDetector;
      
      // Try MoveNet Thunder first - best for full body detection including legs
      try {
        console.log('Loading MoveNet Thunder for full body detection...');
        
        const moveNetConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER, // More accurate for full body
          enableSmoothing: true,
          enableSegmentation: false
        };
        
        poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          moveNetConfig
        );
        console.log('✓ MoveNet Thunder loaded successfully');
        
      } catch (moveNetError) {
        console.warn('MoveNet Thunder failed, trying Lightning:', moveNetError.message);
        
        // Fallback to MoveNet Lightning
        try {
          console.log('Trying MoveNet Lightning as backup...');
          const moveNetConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
          };
          
          poseDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            moveNetConfig
          );
          console.log('✓ MoveNet Lightning loaded successfully');
          
        } catch (lightningError) {
          console.warn('MoveNet Lightning failed, trying PoseNet:', lightningError.message);
          
          // Final fallback to PoseNet with optimized settings for full body
          try {
            console.log('Loading PoseNet with full body optimization...');
            
            const poseNetConfig = {
              architecture: 'ResNet50' as const, // Better accuracy for full body
              outputStride: 16, // Good balance of accuracy and performance
              inputResolution: { width: 513, height: 513 }, // Higher resolution for better leg detection
              multiplier: 1.0, // Full model for better accuracy
              quantBytes: 4 // Higher precision
            };
            
            poseDetector = await poseDetection.createDetector(
              poseDetection.SupportedModels.PoseNet,
              poseNetConfig
            );
            console.log('✓ PoseNet with full body optimization loaded successfully');
            
          } catch (poseNetError) {
            console.error('All pose detection models failed');
            throw new Error(`All pose detection models failed. Last error: ${poseNetError.message}`);
          }
        }
      }

      if (!poseDetector) {
        throw new Error('No pose detector was created');
      }

      setDetector(poseDetector);
      setIsLoading(false);
      setError(''); // Clear any previous errors
      console.log('✓ Pose detection system ready');

    } catch (err) {
      console.error('❌ Pose detection initialization failed:', err);
      console.error('Full error:', err);
      console.error('Stack trace:', err.stack);
      
      let errorMessage = 'AI pose detection failed to initialize';
      
      // Provide specific error messages based on the error type
      if (err.message.includes('403') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Model download blocked (network/CORS error). Network restrictions prevent TensorFlow.js model loading.';
      } else if (err.message.includes('WebGL') || err.message.includes('backend')) {
        errorMessage = 'Graphics acceleration unavailable. WebGL backend required for pose detection.';
      } else if (err.message.includes('tfhub') || err.message.includes('model')) {
        errorMessage = 'TensorFlow model loading failed. External model servers may be unreachable.';
      } else {
        errorMessage = `Pose detection error: ${err.message}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      console.log('💡 Suggestion: Try demo mode for motion capture testing');
    }
  }, []);

  // Draw pose on canvas
  const drawPoses = useCallback((poses: any[], canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame first
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw poses
    poses.forEach(pose => {
      if (pose.keypoints) {
        // Draw keypoints
        pose.keypoints.forEach((keypoint: any) => {
          if (keypoint.score > 0.2) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff0000';
            ctx.fill();
            // Add white border for better visibility
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });

        // Draw skeleton connections using MoveNet keypoint indices
        const connections = [
          // Torso
          [5, 6], [5, 11], [6, 12], [11, 12],
          // Left arm
          [5, 7], [7, 9],
          // Right arm  
          [6, 8], [8, 10],
          // Left leg
          [11, 13], [13, 15],
          // Right leg
          [12, 14], [14, 16],
          // Head (nose to eyes, ears)
          [0, 1], [0, 2], [1, 3], [2, 4]
        ];

        connections.forEach(([i, j]) => {
          const kp1 = pose.keypoints[i];
          const kp2 = pose.keypoints[j];
          
          if (kp1 && kp2 && kp1.score > 0.2 && kp2.score > 0.2) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        });
      }
    });
  }, [videoRef]);

  // Process frames with robust error handling
  const processFrame = useCallback(async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Comprehensive video validation
    if (video.readyState < 4 || 
        video.videoWidth === 0 || 
        video.videoHeight === 0 || 
        !video.srcObject ||
        video.paused ||
        video.ended) {
      
      // Wait for video to be ready
      setTimeout(() => {
        if (isActive) {
          animationIdRef.current = requestAnimationFrame(processFrame);
        }
      }, 200);
      return;
    }

    try {
      // Get video dimensions with fallbacks
      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;
      
      // Validate dimensions are reasonable
      if (videoWidth < 100 || videoHeight < 100 || videoWidth > 4000 || videoHeight > 4000) {
        console.warn('Unusual video dimensions:', videoWidth, 'x', videoHeight);
        setTimeout(() => {
          if (isActive) {
            animationIdRef.current = requestAnimationFrame(processFrame);
          }
        }, 200);
        return;
      }

      // Update canvas size if needed
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        console.log('Canvas resized to:', videoWidth, 'x', videoHeight);
      }

      // Create a temporary canvas to ensure we have a clean frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoWidth;
      tempCanvas.height = videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        throw new Error('Could not create temporary canvas context');
      }

      // Draw video frame to temporary canvas first
      tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Use the temporary canvas for pose detection
      const poses = await detector.estimatePoses(tempCanvas);
      
      if (poses && poses.length > 0) {
        console.log('Poses detected:', poses.length, 'poses with', poses[0].keypoints?.length || 0, 'keypoints');
        drawPoses(poses, canvas);
        
        // Send formatted pose data to parent
        if (onPoseData) {
          console.log('Sending pose data to parent component');
          const formattedPoses = poses.map(pose => ({
            keypoints: pose.keypoints ? pose.keypoints.map(kp => ({
              x: kp.x || 0,
              y: kp.y || 0,
              z: kp.z || 0,
              score: kp.score || 0,
              name: kp.name || ''
            })) : [],
            score: pose.score || 0.5
          }));
          onPoseData(formattedPoses);
        }
      } else {
        // Clear canvas if no poses detected
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (err) {
      if (err.message.includes('roi width cannot be 0') || 
          err.message.includes('width') || 
          err.message.includes('height')) {
        // Video dimension related error - wait longer
        console.warn('Video dimension error, waiting for stream to stabilize...');
        setTimeout(() => {
          if (isActive) {
            animationIdRef.current = requestAnimationFrame(processFrame);
          }
        }, 1000);
        return;
      } else {
        console.error('Pose detection error:', err);
      }
    }

    if (isActive) {
      animationIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [detector, isActive, drawPoses, onPoseData]);

  // Start/stop detection based on isActive prop
  useEffect(() => {
    if (isActive && detector) {
      console.log('Starting AI pose detection with detector ready');
      processFrame();
    } else if (animationIdRef.current) {
      console.log('Stopping pose detection');
      cancelAnimationFrame(animationIdRef.current);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isActive, detector, processFrame]);

  // Initialize when component mounts
  useEffect(() => {
    initializePoseDetection();
  }, [initializePoseDetection]);

  return (
    <div className="absolute top-2 left-2 z-10">
      {isLoading && (
        <div className="bg-blue-500/80 text-white px-2 py-1 rounded text-xs">
          Loading pose detection...
        </div>
      )}
      {error && (
        <div className="bg-red-500/80 text-white px-2 py-1 rounded text-xs">
          {error}
        </div>
      )}
      {detector && !isLoading && !error && (
        <div className="bg-green-500/80 text-white px-2 py-1 rounded text-xs">
          Pose detection active
        </div>
      )}
    </div>
  );
};

export default PoseDetection;