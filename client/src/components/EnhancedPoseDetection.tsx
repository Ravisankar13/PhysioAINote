import React, { useRef, useEffect, useState, useCallback } from 'react';
import { loadTensorFlow, loadPoseDetection, initializeTensorFlowBackend } from '@/utils/tensorflowLoader';
import { AdvancedPoseFilterSystem, FilteredPose, PosePoint } from './AdvancedPoseFilters';

// Enhanced pose detection with multiple models and filtering

interface EnhancedPoseDetectionProps {
  videoRefs: React.RefObject<HTMLVideoElement>[];
  canvasRefs: React.RefObject<HTMLCanvasElement>[];
  isActive: boolean;
  onPoseData?: (poses: FilteredPose[], cameraIndex: number) => void;
  enableMultiCamera?: boolean;
  enableAdvancedFiltering?: boolean;
}



// Multi-model pose detector ensemble
class EnhancedPoseDetector {
  private detectors: Map<string, any> = new Map(); // Changed from poseDetection.PoseDetector to any
  private filterSystem: AdvancedPoseFilterSystem;
  private poseHistory: FilteredPose[] = [];
  private readonly historySize = 10;
  private poseDetection: any = null; // Store loaded module

  constructor() {
    this.filterSystem = new AdvancedPoseFilterSystem();
  }

  async initializeModels() {
    try {
      // Load TensorFlow and pose detection dynamically
      await initializeTensorFlowBackend();
      this.poseDetection = await loadPoseDetection();
      
      // Initialize BlazePose (high accuracy)
      const blazePoseDetector = await this.poseDetection.createDetector(
        this.poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'tfjs',
          modelType: 'full',
          enableSmoothing: true,
          enableSegmentation: false
        }
      );
      this.detectors.set('blazepose', blazePoseDetector);

      // Initialize MoveNet (fast)
      const moveNetDetector = await this.poseDetection.createDetector(
        this.poseDetection.SupportedModels.MoveNet,
        {
          modelType: this.poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
          enableSmoothing: true,
          multiPoseMaxDimension: 256,
          enableTracking: true,
          trackerType: this.poseDetection.TrackerType.BoundingBox
        }
      );
      this.detectors.set('movenet', moveNetDetector);

      // Initialize PoseNet (backup)
      const poseNetDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.PoseNet,
        {
          quantBytes: 4,
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 640, height: 480 },
          multiplier: 0.75
        }
      );
      this.detectors.set('posenet', poseNetDetector);

      console.log('Enhanced pose detection models initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize pose detection models:', error);
      return false;
    }
  }

  // Ensemble pose detection with confidence-based selection
  async detectPoses(video: HTMLVideoElement): Promise<FilteredPose[]> {
    const results: any[] = [];
    
    try {
      // Run detection with multiple models
      const blazePoseResults = await this.detectWithModel('blazepose', video);
      const moveNetResults = await this.detectWithModel('movenet', video);
      
      // Select best result based on confidence scores
      let bestResult = blazePoseResults;
      if (moveNetResults && moveNetResults.length > 0) {
        if (!blazePoseResults || blazePoseResults.length === 0 || 
            moveNetResults[0].score > blazePoseResults[0].score) {
          bestResult = moveNetResults;
        }
      }

      // Fallback to PoseNet if others fail
      if (!bestResult || bestResult.length === 0) {
        bestResult = await this.detectWithModel('posenet', video);
      }

      if (bestResult && bestResult.length > 0) {
        const filteredPoses = this.applyAdvancedFiltering(bestResult);
        results.push(...filteredPoses);
      }
    } catch (error) {
      console.error('Pose detection error:', error);
    }

    return results;
  }

  private async detectWithModel(modelName: string, video: HTMLVideoElement): Promise<any[]> {
    const detector = this.detectors.get(modelName);
    if (!detector) return [];

    try {
      const poses = await detector.estimatePoses(video);
      return poses;
    } catch (error) {
      console.warn(`${modelName} detection failed:`, error);
      return [];
    }
  }

  // Advanced filtering with comprehensive filtering system
  private applyAdvancedFiltering(poses: any[]): FilteredPose[] {
    if (!poses || poses.length === 0) return [];

    const timestamp = Date.now();
    const filteredPoses: FilteredPose[] = [];

    poses.forEach((pose, poseIndex) => {
      if (pose.score < 0.3) return; // Skip low-confidence poses

      // Convert pose to FilteredPose format
      const filteredPose: FilteredPose = {
        keypoints: pose.keypoints.map((kp: any) => ({
          x: kp.x,
          y: kp.y,
          z: kp.z || 0,
          confidence: kp.score || 0
        })),
        score: pose.score,
        timestamp
      };

      // Apply advanced filtering system
      const enhancedPose = this.filterSystem.filterPose(filteredPose);
      if (enhancedPose) {
        filteredPoses.push(enhancedPose);
      }
    });

    // Update pose history
    this.poseHistory.push(...filteredPoses);
    if (this.poseHistory.length > this.historySize) {
      this.poseHistory.splice(0, this.poseHistory.length - this.historySize);
    }

    return filteredPoses;
  }

  // Get quality metrics from the filtering system
  getQualityMetrics() {
    return this.filterSystem.getQualityMetrics();
  }

  // Multi-camera pose fusion
  fusePoses(poses: FilteredPose[][]): FilteredPose[] {
    if (poses.length === 1) return poses[0];

    const fusedPoses: FilteredPose[] = [];
    const maxPoses = Math.max(...poses.map(p => p.length));

    for (let i = 0; i < maxPoses; i++) {
      const candidatePoses = poses.map(poseSet => poseSet[i]).filter(Boolean);
      
      if (candidatePoses.length === 0) continue;

      // Select pose with highest confidence
      const bestPose = candidatePoses.reduce((best, current) => 
        current.score > best.score ? current : best
      );

      // Enhance with data from other cameras where confidence is higher
      const enhancedKeypoints = bestPose.keypoints.map((kp, index) => {
        let bestKeypoint = kp;
        candidatePoses.forEach(pose => {
          if (pose.keypoints[index] && pose.keypoints[index].confidence > bestKeypoint.confidence) {
            bestKeypoint = pose.keypoints[index];
          }
        });
        return bestKeypoint;
      });

      fusedPoses.push({
        keypoints: enhancedKeypoints,
        score: Math.max(...candidatePoses.map(p => p.score)),
        timestamp: bestPose.timestamp
      });
    }

    return fusedPoses;
  }
}

export const EnhancedPoseDetection: React.FC<EnhancedPoseDetectionProps> = ({
  videoRefs,
  canvasRefs,
  isActive,
  onPoseData,
  enableMultiCamera = false,
  enableAdvancedFiltering = true
}) => {
  const [detector, setDetector] = useState<EnhancedPoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const animationIdRef = useRef<number>();

  // Initialize enhanced pose detection
  const initializeDetection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      await tf.ready();
      console.log('TensorFlow.js ready, backend:', tf.getBackend());

      const enhancedDetector = new EnhancedPoseDetector();
      const success = await enhancedDetector.initializeModels();
      
      if (success) {
        setDetector(enhancedDetector);
        console.log('Enhanced pose detection initialized successfully');
      } else {
        throw new Error('Failed to initialize enhanced pose detection models');
      }
    } catch (error) {
      console.error('Enhanced pose detection initialization error:', error);
      setError('Failed to initialize enhanced pose detection');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Multi-camera pose detection loop
  const detectPoses = useCallback(async () => {
    if (!detector || !isActive) return;

    try {
      const allPoses: FilteredPose[][] = [];

      // Process each camera
      for (let i = 0; i < videoRefs.length; i++) {
        const video = videoRefs[i]?.current;
        const canvas = canvasRefs[i]?.current;
        
        if (!video || !canvas || video.readyState !== 4) continue;

        const poses = await detector.detectPoses(video);
        allPoses.push(poses);

        // Draw poses on canvas
        drawPoses(canvas, poses, video);
      }

      // Fuse poses from multiple cameras if enabled
      if (enableMultiCamera && allPoses.length > 1) {
        const fusedPoses = detector.fusePoses(allPoses);
        onPoseData?.(fusedPoses, -1); // -1 indicates fused data
      } else if (allPoses.length > 0) {
        // Send individual camera data
        allPoses.forEach((poses, index) => {
          if (poses.length > 0) {
            onPoseData?.(poses, index);
          }
        });
      }

    } catch (error) {
      console.error('Pose detection error:', error);
    }

    if (isActive) {
      animationIdRef.current = requestAnimationFrame(detectPoses);
    }
  }, [detector, isActive, videoRefs, canvasRefs, onPoseData, enableMultiCamera]);

  // Draw enhanced pose visualization
  const drawPoses = (canvas: HTMLCanvasElement, poses: FilteredPose[], video: HTMLVideoElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    poses.forEach((pose, poseIndex) => {
      // Draw keypoints with confidence-based styling
      pose.keypoints.forEach((keypoint) => {
        if (keypoint.confidence > 0.3) {
          const radius = 3 + (keypoint.confidence * 4);
          const alpha = keypoint.confidence;
          
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw skeleton connections
      drawSkeleton(ctx, pose.keypoints);

      // Draw confidence score
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText(`Confidence: ${(pose.score * 100).toFixed(1)}%`, 10, 30 + poseIndex * 25);
    });
  };

  // Draw anatomically accurate skeleton
  const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: PosePoint[]) => {
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4], // Head
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
      [5, 11], [6, 12], [11, 12], // Torso
      [11, 13], [13, 15], [12, 14], [14, 16] // Legs
    ];

    connections.forEach(([a, b]) => {
      const kpA = keypoints[a];
      const kpB = keypoints[b];
      
      if (kpA && kpB && kpA.confidence > 0.3 && kpB.confidence > 0.3) {
        const avgConfidence = (kpA.confidence + kpB.confidence) / 2;
        
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.strokeStyle = `rgba(0, 255, 0, ${avgConfidence})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
  };

  // Lifecycle management
  useEffect(() => {
    initializeDetection();
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [initializeDetection]);

  useEffect(() => {
    if (isActive && detector) {
      detectPoses();
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
  }, [isActive, detector, detectPoses]);

  return (
    <div className="enhanced-pose-detection">
      {isLoading && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded">
          Initializing Enhanced Pose Detection...
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-2 rounded">
          {error}
        </div>
      )}
      {detector && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-2 rounded">
          Enhanced Detection Active
        </div>
      )}
    </div>
  );
};

export default EnhancedPoseDetection;