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

      // Try different backends in order of preference
      let backendSuccess = false;
      const backends = ['webgl', 'cpu'];
      
      for (const backend of backends) {
        try {
          console.log(`Trying backend: ${backend}`);
          await tf.setBackend(backend);
          await tf.ready();
          console.log(`Successfully initialized ${backend} backend`);
          backendSuccess = true;
          break;
        } catch (backendError) {
          console.warn(`Failed to initialize ${backend} backend:`, backendError);
        }
      }

      if (!backendSuccess) {
        throw new Error('No compatible TensorFlow.js backend available');
      }

      console.log('TensorFlow.js backend ready:', tf.getBackend());

      // Initialize pose detection with proper error handling and model selection
      let poseDetector;
      
      // First try PoseNet with minimal configuration
      try {
        console.log('Attempting to load PoseNet...');
        
        const poseNetConfig = {
          architecture: 'MobileNetV1' as const,
          outputStride: 16,
          inputResolution: { width: 513, height: 513 },
          multiplier: 0.75,
          quantBytes: 2
        };
        
        poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.PoseNet,
          poseNetConfig
        );
        console.log('✓ PoseNet detector created successfully');
        
      } catch (poseNetError) {
        console.warn('PoseNet initialization failed:', poseNetError.message);
        
        // Try BlazePose as it uses different model sources
        try {
          console.log('Trying BlazePose fallback...');
          const blazePoseConfig = {
            runtime: 'tfjs' as const,
            enableSmoothing: true,
            modelType: 'lite' as const
          };
          
          poseDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.BlazePose,
            blazePoseConfig
          );
          console.log('✓ BlazePose detector created successfully');
          
        } catch (blazePoseError) {
          console.warn('BlazePose failed:', blazePoseError.message);
          
          // Final attempt with MoveNet
          try {
            console.log('Final attempt with MoveNet...');
            const moveNetConfig = {
              modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
              enableSmoothing: false
            };
            
            poseDetector = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              moveNetConfig
            );
            console.log('✓ MoveNet detector created successfully');
            
          } catch (moveNetError) {
            console.error('All models failed:', moveNetError.message);
            throw new Error(`Failed to load any pose detection model. Network or compatibility issue: ${moveNetError.message}`);
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
      console.error('Failed to initialize pose detection:', err);
      console.error('Error details:', err.message, err.stack);
      
      let errorMessage = 'Pose detection initialization failed';
      if (err.message.includes('403') || err.message.includes('fetch') || err.message.includes('network')) {
        errorMessage = 'Model loading blocked by network restrictions. Switching to demo mode recommended.';
      } else if (err.message.includes('WebGL') || err.message.includes('backend')) {
        errorMessage = 'Hardware acceleration unavailable. Please enable WebGL or use demo mode.';
      } else {
        errorMessage = `Initialization error: ${err.message}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
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

  // Process frames with improved error handling
  const processFrame = useCallback(async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video is ready
    if (video.readyState < 2) {
      animationIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const poses = await detector.estimatePoses(video);
      
      if (poses && poses.length > 0) {
        drawPoses(poses, canvas);
        
        // Send formatted pose data to parent with better structure
        if (onPoseData) {
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
      console.warn('Error processing frame:', err);
    }

    if (isActive) {
      animationIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [detector, isActive, drawPoses, onPoseData]);

  // Start/stop detection based on isActive prop
  useEffect(() => {
    if (isActive && detector) {
      console.log('Starting pose detection...');
      processFrame();
    } else if (animationIdRef.current) {
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