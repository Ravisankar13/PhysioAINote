import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MockPoseDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  onPoseData?: (poses: any[]) => void;
}

export const MockPoseDetection: React.FC<MockPoseDetectionProps> = ({
  videoRef,
  canvasRef,
  isActive,
  onPoseData
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const animationIdRef = useRef<number>();

  // Generate realistic pose keypoints that simulate a person moving
  const generateMockPose = useCallback((time: number) => {
    const baseTime = time * 0.001; // Convert to seconds
    
    // Simulate natural movement with sine waves
    const armSwing = Math.sin(baseTime * 2) * 20;
    const legStep = Math.sin(baseTime * 1.5) * 15;
    const bodyBob = Math.sin(baseTime * 3) * 5;
    
    // Base pose in normalized coordinates (0-1)
    const keypoints = [
      // Nose (0)
      { x: 0.5, y: 0.15 + bodyBob * 0.01, z: 0, score: 0.9 },
      // Left Eye (1)
      { x: 0.48, y: 0.12 + bodyBob * 0.01, z: 0, score: 0.8 },
      // Right Eye (2)
      { x: 0.52, y: 0.12 + bodyBob * 0.01, z: 0, score: 0.8 },
      // Left Ear (3)
      { x: 0.46, y: 0.14 + bodyBob * 0.01, z: 0, score: 0.7 },
      // Right Ear (4)
      { x: 0.54, y: 0.14 + bodyBob * 0.01, z: 0, score: 0.7 },
      // Left Shoulder (5)
      { x: 0.4, y: 0.25 + bodyBob * 0.01, z: 0, score: 0.9 },
      // Right Shoulder (6)
      { x: 0.6, y: 0.25 + bodyBob * 0.01, z: 0, score: 0.9 },
      // Left Elbow (7)
      { x: 0.35 + armSwing * 0.005, y: 0.4 + armSwing * 0.003, z: 0, score: 0.8 },
      // Right Elbow (8)
      { x: 0.65 - armSwing * 0.005, y: 0.4 - armSwing * 0.003, z: 0, score: 0.8 },
      // Left Wrist (9)
      { x: 0.3 + armSwing * 0.01, y: 0.55 + armSwing * 0.008, z: 0, score: 0.7 },
      // Right Wrist (10)
      { x: 0.7 - armSwing * 0.01, y: 0.55 - armSwing * 0.008, z: 0, score: 0.7 },
      // Left Hip (11)
      { x: 0.42, y: 0.55 + bodyBob * 0.01, z: 0, score: 0.9 },
      // Right Hip (12)
      { x: 0.58, y: 0.55 + bodyBob * 0.01, z: 0, score: 0.9 },
      // Left Knee (13)
      { x: 0.4 + legStep * 0.002, y: 0.75 + legStep * 0.005, z: 0, score: 0.8 },
      // Right Knee (14)
      { x: 0.6 - legStep * 0.002, y: 0.75 - legStep * 0.005, z: 0, score: 0.8 },
      // Left Ankle (15)
      { x: 0.38 + legStep * 0.008, y: 0.95 + legStep * 0.01, z: 0, score: 0.7 },
      // Right Ankle (16)
      { x: 0.62 - legStep * 0.008, y: 0.95 - legStep * 0.01, z: 0, score: 0.7 }
    ];

    return {
      keypoints,
      score: 0.8
    };
  }, []);

  // Convert normalized coordinates to canvas coordinates
  const scaleKeypoints = useCallback((pose: any, canvas: HTMLCanvasElement) => {
    return {
      ...pose,
      keypoints: pose.keypoints.map((kp: any) => ({
        ...kp,
        x: kp.x * canvas.width,
        y: kp.y * canvas.height
      }))
    };
  }, []);

  // Draw pose on canvas
  const drawPoses = useCallback((poses: any[], canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    poses.forEach(pose => {
      if (pose.keypoints) {
        // Draw keypoints
        pose.keypoints.forEach((keypoint: any, index: number) => {
          if (keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = keypoint.score > 0.7 ? 'lime' : 'yellow';
            ctx.fill();
            
            // Add keypoint labels
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(index.toString(), keypoint.x + 5, keypoint.y - 5);
          }
        });

        // Draw skeleton connections
        const connections = [
          [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
          [5, 11], [6, 12], [11, 12], // Torso
          [11, 13], [13, 15], [12, 14], [14, 16], // Legs
          [0, 1], [0, 2], [1, 3], [2, 4] // Head
        ];

        connections.forEach(([from, to]) => {
          const fromPoint = pose.keypoints[from];
          const toPoint = pose.keypoints[to];
          
          if (fromPoint && toPoint && fromPoint.score > 0.3 && toPoint.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(fromPoint.x, fromPoint.y);
            ctx.lineTo(toPoint.x, toPoint.y);
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      }
    });
  }, []);

  // Main detection loop
  const detectPose = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) {
      animationIdRef.current = requestAnimationFrame(detectPose);
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Generate mock pose data
      const mockPose = generateMockPose(Date.now());
      const scaledPose = scaleKeypoints(mockPose, canvas);
      const poses = [scaledPose];

      // Draw poses on canvas
      drawPoses(poses, canvas);

      // Send pose data to parent component
      if (onPoseData) {
        onPoseData(poses);
      }
      
    } catch (error) {
      console.error('Error during mock pose detection:', error);
    }

    animationIdRef.current = requestAnimationFrame(detectPose);
  }, [isActive, onPoseData, generateMockPose, scaleKeypoints, drawPoses]);

  // Start/stop detection based on isActive prop
  useEffect(() => {
    if (isActive) {
      console.log('Starting mock pose detection...');
      detectPose();
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isActive, detectPose]);

  // Initialize immediately
  useEffect(() => {
    setIsLoading(false);
    setError('');
    console.log('Mock pose detection initialized successfully');
  }, []);

  return null; // This component doesn't render anything
};

export default MockPoseDetection;