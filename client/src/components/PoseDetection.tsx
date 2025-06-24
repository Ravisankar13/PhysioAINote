import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

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

      // Create pose detector with correct configuration
      const detectorConfig = {
        runtime: 'tfjs' as const,
        enableSmoothing: true,
        modelType: 'SINGLEPOSE_LIGHTNING' as const
      };

      const poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      setDetector(poseDetector);
      setIsLoading(false);
      console.log('Pose detector initialized successfully');

    } catch (err) {
      console.error('Failed to initialize pose detection:', err);
      setError('Pose detection initialization failed');
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

  // Process frames
  const processFrame = useCallback(async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isActive) {
      return;
    }

    try {
      const poses = await detector.estimatePoses(videoRef.current);
      
      if (poses.length > 0) {
        drawPoses(poses, canvasRef.current);
        onPoseData?.(poses);
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
    <div className="pose-detection-status">
      {isLoading && (
        <div className="text-sm text-blue-600">Loading pose detection models...</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      {detector && !isLoading && !error && (
        <div className="text-sm text-green-600">Pose detection ready</div>
      )}
    </div>
  );
};

export default PoseDetection;