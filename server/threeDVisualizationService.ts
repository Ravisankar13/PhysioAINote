/**
 * 3D Visualization Service for Motion Capture Data
 * Converts pose detection data into 3D skeletal models and animations
 */

interface PoseFrame {
  timestamp: number;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  worldLandmarks?: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
}

interface ThreeDVisualization {
  skeletalMesh: {
    vertices: number[][];
    faces: number[][];
    bones: Array<{
      name: string;
      position: number[];
      rotation: number[];
      parent?: string;
    }>;
  };
  animationSequences: Array<{
    timestamp: number;
    keyframes: Array<{
      boneName: string;
      position: number[];
      rotation: number[];
    }>;
  }>;
  cameraSettings: {
    position: number[];
    target: number[];
    fov: number;
  };
  movementHeatmap: Array<{
    jointName: string;
    intensity: number;
    problemAreas: boolean;
  }>;
  clinicalAnnotations: Array<{
    position: number[];
    text: string;
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
  }>;
  generatedAt: string;
}

export class ThreeDVisualizationService {
  // MediaPipe pose landmark indices for skeletal structure
  private readonly POSE_CONNECTIONS = [
    // Face outline
    [0, 1], [1, 2], [2, 3], [3, 7],
    [0, 4], [4, 5], [5, 6], [6, 8],
    // Shoulders
    [9, 10],
    // Left arm
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    // Right arm
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Left leg
    [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
    // Right leg
    [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
  ];

  private readonly BONE_NAMES = [
    'head', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
    'leftWrist', 'rightWrist', 'spine', 'leftHip', 'rightHip', 'leftKnee',
    'rightKnee', 'leftAnkle', 'rightAnkle'
  ];

  /**
   * Generate 3D visualization data from motion capture frames
   */
  async generate3DVisualization(
    motionData: PoseFrame[], 
    clinicalAnalysis?: any
  ): Promise<ThreeDVisualization> {
    try {
      // Create skeletal mesh from pose landmarks
      const skeletalMesh = this.createSkeletalMesh(motionData);
      
      // Generate animation sequences
      const animationSequences = this.createAnimationSequences(motionData);
      
      // Calculate movement heatmap
      const movementHeatmap = this.calculateMovementHeatmap(motionData);
      
      // Generate clinical annotations based on analysis
      const clinicalAnnotations = this.generateClinicalAnnotations(motionData, clinicalAnalysis);
      
      // Set optimal camera position
      const cameraSettings = this.calculateOptimalCameraPosition(motionData);

      return {
        skeletalMesh,
        animationSequences,
        cameraSettings,
        movementHeatmap,
        clinicalAnnotations,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating 3D visualization:', error);
      throw new Error('Failed to generate 3D visualization');
    }
  }

  /**
   * Create skeletal mesh from pose landmarks
   */
  private createSkeletalMesh(motionData: PoseFrame[]) {
    const vertices: number[][] = [];
    const faces: number[][] = [];
    const bones = [];

    if (motionData.length === 0) {
      throw new Error('No motion data provided');
    }

    // Use first frame to establish base skeleton structure
    const baseFrame = motionData[0];
    
    // Create vertices from landmarks
    baseFrame.landmarks.forEach((landmark, index) => {
      vertices.push([landmark.x, landmark.y, landmark.z || 0]);
    });

    // Create faces (triangles) from pose connections
    for (let i = 0; i < this.POSE_CONNECTIONS.length - 2; i += 3) {
      const connection1 = this.POSE_CONNECTIONS[i];
      const connection2 = this.POSE_CONNECTIONS[i + 1];
      const connection3 = this.POSE_CONNECTIONS[i + 2];
      
      if (connection1 && connection2 && connection3) {
        faces.push([connection1[0], connection2[0], connection3[0]]);
      }
    }

    // Create bone structure
    this.BONE_NAMES.forEach((boneName, index) => {
      const landmark = baseFrame.landmarks[index] || baseFrame.landmarks[0];
      bones.push({
        name: boneName,
        position: [landmark.x, landmark.y, landmark.z || 0],
        rotation: [0, 0, 0],
        parent: this.getBoneParent(boneName)
      });
    });

    return { vertices, faces, bones };
  }

  /**
   * Create animation sequences from motion data
   */
  private createAnimationSequences(motionData: PoseFrame[]) {
    return motionData.map(frame => ({
      timestamp: frame.timestamp,
      keyframes: this.BONE_NAMES.map((boneName, index) => {
        const landmark = frame.landmarks[index] || frame.landmarks[0];
        return {
          boneName,
          position: [landmark.x, landmark.y, landmark.z || 0],
          rotation: this.calculateBoneRotation(landmark, boneName)
        };
      })
    }));
  }

  /**
   * Calculate movement heatmap showing joint activity
   */
  private calculateMovementHeatmap(motionData: PoseFrame[]) {
    const heatmap = [];
    
    for (let i = 0; i < this.BONE_NAMES.length; i++) {
      const boneName = this.BONE_NAMES[i];
      let totalMovement = 0;
      let frameCount = 0;

      // Calculate movement intensity for each joint
      for (let frame = 1; frame < motionData.length; frame++) {
        const currentLandmark = motionData[frame].landmarks[i];
        const previousLandmark = motionData[frame - 1].landmarks[i];
        
        if (currentLandmark && previousLandmark) {
          const movement = Math.sqrt(
            Math.pow(currentLandmark.x - previousLandmark.x, 2) +
            Math.pow(currentLandmark.y - previousLandmark.y, 2) +
            Math.pow((currentLandmark.z || 0) - (previousLandmark.z || 0), 2)
          );
          totalMovement += movement;
          frameCount++;
        }
      }

      const intensity = frameCount > 0 ? totalMovement / frameCount : 0;
      const problemAreas = this.identifyProblemAreas(boneName, intensity);

      heatmap.push({
        jointName: boneName,
        intensity: Math.min(intensity * 100, 100), // Normalize to 0-100
        problemAreas
      });
    }

    return heatmap;
  }

  /**
   * Generate clinical annotations for problem areas
   */
  private generateClinicalAnnotations(motionData: PoseFrame[], clinicalAnalysis?: any) {
    const annotations = [];

    if (motionData.length === 0) return annotations;

    // Add annotations for high-movement areas
    const heatmap = this.calculateMovementHeatmap(motionData);
    
    heatmap.forEach(joint => {
      if (joint.problemAreas || joint.intensity > 50) {
        const landmark = motionData[0].landmarks[this.BONE_NAMES.indexOf(joint.jointName)];
        if (landmark) {
          annotations.push({
            position: [landmark.x, landmark.y, landmark.z || 0],
            text: this.generateAnnotationText(joint.jointName, joint.intensity),
            severity: this.getSeverityLevel(joint.intensity)
          });
        }
      }
    });

    // Add annotations from clinical analysis if provided
    if (clinicalAnalysis?.dysfunctionPatterns) {
      clinicalAnalysis.dysfunctionPatterns.forEach((pattern: string) => {
        const position = this.getPatternPosition(pattern, motionData[0]);
        if (position) {
          annotations.push({
            position,
            text: pattern,
            severity: 'moderate' as const
          });
        }
      });
    }

    return annotations;
  }

  /**
   * Calculate optimal camera position for viewing the skeletal model
   */
  private calculateOptimalCameraPosition(motionData: PoseFrame[]) {
    if (motionData.length === 0) {
      return {
        position: [0, 0, 5],
        target: [0, 0, 0],
        fov: 60
      };
    }

    // Calculate bounding box of all movement
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    motionData.forEach(frame => {
      frame.landmarks.forEach(landmark => {
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
        minZ = Math.min(minZ, landmark.z || 0);
        maxZ = Math.max(maxZ, landmark.z || 0);
      });
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const distance = Math.max(maxX - minX, maxY - minY) * 2;

    return {
      position: [centerX, centerY, centerZ + distance],
      target: [centerX, centerY, centerZ],
      fov: 60
    };
  }

  /**
   * Get bone parent for hierarchical structure
   */
  private getBoneParent(boneName: string): string | undefined {
    const parentMap: Record<string, string> = {
      'head': 'neck',
      'leftShoulder': 'neck',
      'rightShoulder': 'neck',
      'leftElbow': 'leftShoulder',
      'rightElbow': 'rightShoulder',
      'leftWrist': 'leftElbow',
      'rightWrist': 'rightElbow',
      'spine': 'neck',
      'leftHip': 'spine',
      'rightHip': 'spine',
      'leftKnee': 'leftHip',
      'rightKnee': 'rightHip',
      'leftAnkle': 'leftKnee',
      'rightAnkle': 'rightKnee'
    };
    return parentMap[boneName];
  }

  /**
   * Calculate bone rotation from landmark position
   */
  private calculateBoneRotation(landmark: any, boneName: string): number[] {
    // Simplified rotation calculation - could be enhanced with more sophisticated algorithms
    return [
      Math.atan2(landmark.y, landmark.x),
      Math.atan2(landmark.z || 0, landmark.x),
      0
    ];
  }

  /**
   * Identify problem areas based on movement patterns
   */
  private identifyProblemAreas(boneName: string, intensity: number): boolean {
    // Flag joints with abnormal movement patterns
    const highMovementThreshold = 0.1;
    const lowMovementThreshold = 0.01;

    // Joints that should move more
    const shouldMoveJoints = ['leftKnee', 'rightKnee', 'leftElbow', 'rightElbow'];
    
    // Joints that should move less (stability joints)
    const stabilityJoints = ['head', 'neck', 'spine'];

    if (shouldMoveJoints.includes(boneName) && intensity < lowMovementThreshold) {
      return true; // Too little movement
    }

    if (stabilityJoints.includes(boneName) && intensity > highMovementThreshold) {
      return true; // Too much movement
    }

    return false;
  }

  /**
   * Generate annotation text for joints
   */
  private generateAnnotationText(jointName: string, intensity: number): string {
    if (intensity > 75) {
      return `${jointName}: Excessive movement detected`;
    } else if (intensity > 50) {
      return `${jointName}: Increased movement`;
    } else if (intensity < 10) {
      return `${jointName}: Limited movement`;
    } else {
      return `${jointName}: Movement pattern noted`;
    }
  }

  /**
   * Get severity level based on intensity
   */
  private getSeverityLevel(intensity: number): 'normal' | 'mild' | 'moderate' | 'severe' {
    if (intensity > 80) return 'severe';
    if (intensity > 60) return 'moderate';
    if (intensity > 30) return 'mild';
    return 'normal';
  }

  /**
   * Get position for clinical pattern annotations
   */
  private getPatternPosition(pattern: string, frame: PoseFrame): number[] | null {
    // Map common patterns to body positions
    const patternMap: Record<string, number> = {
      'shoulder': 11, // Left shoulder landmark
      'hip': 23,     // Left hip landmark
      'knee': 25,    // Left knee landmark
      'ankle': 27,   // Left ankle landmark
      'spine': 11,   // Use shoulder as spine reference
    };

    for (const [key, landmarkIndex] of Object.entries(patternMap)) {
      if (pattern.toLowerCase().includes(key)) {
        const landmark = frame.landmarks[landmarkIndex];
        if (landmark) {
          return [landmark.x, landmark.y, landmark.z || 0];
        }
      }
    }

    return null;
  }
}

export const threeDVisualizationService = new ThreeDVisualizationService();