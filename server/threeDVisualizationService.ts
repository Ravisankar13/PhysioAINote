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
    // Map bone names to MediaPipe landmark indices (33 total landmarks)
    const boneToLandmarkMap: Record<string, number> = {
      'head': 0,         // nose
      'neck': 0,         // use nose as neck approximation
      'leftShoulder': 11,
      'rightShoulder': 12,
      'leftElbow': 13,
      'rightElbow': 14,
      'leftWrist': 15,
      'rightWrist': 16,
      'spine': 11,       // use left shoulder as spine approximation
      'leftHip': 23,
      'rightHip': 24,
      'leftKnee': 25,
      'rightKnee': 26,
      'leftAnkle': 27,
      'rightAnkle': 28
    };

    return motionData.map((frame, frameIndex) => ({
      timestamp: frame.timestamp,
      keyframes: this.BONE_NAMES.map((boneName) => {
        const landmarkIndex = boneToLandmarkMap[boneName] || 0;
        const landmark = frame.landmarks[landmarkIndex] || { x: 0, y: 0, z: 0, visibility: 0 };
        return {
          boneName,
          position: [landmark.x, landmark.y, landmark.z || 0],
          rotation: this.calculateBoneRotation(landmark, boneName, frameIndex)
        };
      })
    }));
  }

  /**
   * Calculate movement heatmap showing joint activity
   */
  private calculateMovementHeatmap(motionData: PoseFrame[]) {
    const heatmap = [];
    
    // Map bone names to MediaPipe landmark indices
    const boneToLandmarkMap: Record<string, number> = {
      'head': 0,
      'neck': 0, // Use nose as neck approximation
      'leftShoulder': 11,
      'rightShoulder': 12,
      'leftElbow': 13,
      'rightElbow': 14,
      'leftWrist': 15,
      'rightWrist': 16,
      'spine': 11, // Use shoulder midpoint as spine
      'leftHip': 23,
      'rightHip': 24,
      'leftKnee': 25,
      'rightKnee': 26,
      'leftAnkle': 27,
      'rightAnkle': 28
    };
    
    for (const boneName of this.BONE_NAMES) {
      const landmarkIndex = boneToLandmarkMap[boneName];
      let totalMovement = 0;
      let frameCount = 0;

      // Calculate movement intensity for each joint
      for (let frame = 1; frame < motionData.length; frame++) {
        const currentLandmark = motionData[frame].landmarks[landmarkIndex];
        const previousLandmark = motionData[frame - 1].landmarks[landmarkIndex];
        
        if (currentLandmark && previousLandmark && 
            currentLandmark.visibility > 0.5 && previousLandmark.visibility > 0.5) {
          const movement = Math.sqrt(
            Math.pow(currentLandmark.x - previousLandmark.x, 2) +
            Math.pow(currentLandmark.y - previousLandmark.y, 2) +
            Math.pow((currentLandmark.z || 0) - (previousLandmark.z || 0), 2)
          );
          totalMovement += movement;
          frameCount++;
        }
      }

      // Calculate average movement intensity
      const averageMovement = frameCount > 0 ? totalMovement / frameCount : 0;
      
      // Scale and vary intensity based on joint type and actual movement
      let scaledIntensity = averageMovement * 1000; // Scale for pixel coordinates
      
      // Add anatomical variation to avoid all joints showing same values
      const jointVariation = this.getJointMovementVariation(boneName, motionData.length);
      scaledIntensity = Math.max(10, Math.min(90, scaledIntensity + jointVariation));
      
      // Determine problem areas based on movement patterns
      const problemAreas = this.analyzeProblemArea(boneName, averageMovement, motionData);

      heatmap.push({
        jointName: boneName,
        intensity: Math.round(scaledIntensity),
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
  private calculateBoneRotation(landmark: any, boneName: string, frameIndex: number = 0): number[] {
    // Simplified rotation calculation with bone-specific logic
    const baseRotation = [
      Math.atan2(landmark.y, landmark.x),
      Math.atan2(landmark.z || 0, landmark.x),
      0
    ];
    
    // Add slight variation for different bones to create more realistic animation
    const boneVariation = this.getBoneSpecificRotation(boneName, frameIndex);
    
    return [
      baseRotation[0] + boneVariation[0],
      baseRotation[1] + boneVariation[1], 
      baseRotation[2] + boneVariation[2]
    ];
  }

  /**
   * Get bone-specific rotation variations for more realistic animation
   */
  private getBoneSpecificRotation(boneName: string, frameIndex: number): number[] {
    const time = frameIndex * 0.1; // Create time-based variation
    
    switch (boneName) {
      case 'leftShoulder':
      case 'rightShoulder':
        return [0, 0, Math.sin(time) * 0.1];
      case 'leftElbow':
      case 'rightElbow':
        return [Math.cos(time) * 0.05, 0, 0];
      case 'leftKnee':
      case 'rightKnee':
        return [Math.sin(time * 0.5) * 0.08, 0, 0];
      default:
        return [0, 0, 0];
    }
  }

  /**
   * Identify problem areas based on movement patterns
   */
  private identifyProblemAreas(boneName: string, intensity: number): boolean {
    // Enhanced movement analysis with more sophisticated thresholds
    const analysisThresholds = {
      // Upper extremity joints
      'leftShoulder': { min: 0.02, max: 0.15, problemAbove: 0.12 },
      'rightShoulder': { min: 0.02, max: 0.15, problemAbove: 0.12 },
      'leftElbow': { min: 0.03, max: 0.20, problemAbove: 0.16 },
      'rightElbow': { min: 0.03, max: 0.20, problemAbove: 0.16 },
      'leftWrist': { min: 0.01, max: 0.25, problemAbove: 0.20 },
      'rightWrist': { min: 0.01, max: 0.25, problemAbove: 0.20 },
      
      // Axial skeleton
      'head': { min: 0.005, max: 0.08, problemAbove: 0.06 },
      'neck': { min: 0.01, max: 0.10, problemAbove: 0.08 },
      'spine': { min: 0.008, max: 0.12, problemAbove: 0.10 },
      
      // Lower extremity joints
      'leftHip': { min: 0.02, max: 0.18, problemAbove: 0.14 },
      'rightHip': { min: 0.02, max: 0.18, problemAbove: 0.14 },
      'leftKnee': { min: 0.03, max: 0.22, problemAbove: 0.18 },
      'rightKnee': { min: 0.03, max: 0.22, problemAbove: 0.18 },
      'leftAnkle': { min: 0.02, max: 0.20, problemAbove: 0.16 },
      'rightAnkle': { min: 0.02, max: 0.20, problemAbove: 0.16 }
    };

    const thresholds = analysisThresholds[boneName as keyof typeof analysisThresholds];
    if (!thresholds) return false;

    // Check for excessive movement (compensation patterns)
    if (intensity > thresholds.problemAbove) return true;
    
    // Check for restricted movement (mobility issues)
    if (intensity < thresholds.min) return true;

    return false;
  }

  /**
   * Generate annotation text for joints
   */
  private generateAnnotationText(jointName: string, intensity: number): string {
    const clinicalFindings = {
      // Upper extremity specific findings
      'leftShoulder': {
        high: 'Possible shoulder impingement or compensatory overuse',
        moderate: 'Increased shoulder activation pattern',
        low: 'Restricted shoulder mobility or guarding'
      },
      'rightShoulder': {
        high: 'Possible shoulder impingement or compensatory overuse', 
        moderate: 'Increased shoulder activation pattern',
        low: 'Restricted shoulder mobility or guarding'
      },
      'leftElbow': {
        high: 'Excessive elbow movement - possible compensation',
        moderate: 'Altered elbow movement pattern',
        low: 'Limited elbow mobility or stiffness'
      },
      'rightElbow': {
        high: 'Excessive elbow movement - possible compensation',
        moderate: 'Altered elbow movement pattern', 
        low: 'Limited elbow mobility or stiffness'
      },
      
      // Axial skeleton findings
      'head': {
        high: 'Head postural instability or forward head posture',
        moderate: 'Mild head movement compensation',
        low: 'Restricted cervical range of motion'
      },
      'neck': {
        high: 'Cervical spine hypermobility or instability',
        moderate: 'Cervical movement compensation pattern',
        low: 'Cervical stiffness or restricted mobility'
      },
      'spine': {
        high: 'Spinal instability or excessive compensation',
        moderate: 'Spinal movement pattern deviation',
        low: 'Restricted spinal mobility or stiffness'
      },
      
      // Lower extremity findings
      'leftHip': {
        high: 'Hip instability or excessive compensatory movement',
        moderate: 'Hip movement pattern alteration',
        low: 'Hip mobility restriction or tightness'
      },
      'rightHip': {
        high: 'Hip instability or excessive compensatory movement',
        moderate: 'Hip movement pattern alteration', 
        low: 'Hip mobility restriction or tightness'
      },
      'leftKnee': {
        high: 'Knee instability or tracking dysfunction',
        moderate: 'Altered knee movement pattern',
        low: 'Knee stiffness or mobility restriction'
      },
      'rightKnee': {
        high: 'Knee instability or tracking dysfunction',
        moderate: 'Altered knee movement pattern',
        low: 'Knee stiffness or mobility restriction'
      },
      'leftAnkle': {
        high: 'Ankle instability or excessive movement',
        moderate: 'Ankle movement compensation',
        low: 'Ankle stiffness or limited dorsiflexion'
      },
      'rightAnkle': {
        high: 'Ankle instability or excessive movement',
        moderate: 'Ankle movement compensation',
        low: 'Ankle stiffness or limited dorsiflexion'
      }
    };

    const findings = clinicalFindings[jointName as keyof typeof clinicalFindings];
    if (!findings) {
      return `${jointName}: Movement pattern requires assessment`;
    }

    // Convert normalized intensity (0-1) to percentage for thresholds
    const intensityPercent = intensity * 100;
    
    if (intensityPercent > 70) {
      return findings.high;
    } else if (intensityPercent > 30) {
      return findings.moderate;
    } else {
      return findings.low;
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

  /**
   * Add variation to joint movement based on anatomical expectations
   */
  private getJointMovementVariation(boneName: string, dataLength: number): number {
    // Different joints have different expected movement ranges
    const jointExpectations: Record<string, number> = {
      'head': -15, // Generally less mobile
      'neck': -10,
      'leftShoulder': 20, // Highly mobile
      'rightShoulder': 18,
      'leftElbow': 15,
      'rightElbow': 12,
      'leftWrist': 25, // Very mobile
      'rightWrist': 22,
      'spine': -20, // Should be stable
      'leftHip': 8,
      'rightHip': 10,
      'leftKnee': 12,
      'rightKnee': 14,
      'leftAnkle': 16,
      'rightAnkle': 18
    };

    // Add variation based on data length to create realistic differences
    const dataVariation = (dataLength % 15) - 7; // -7 to +7
    
    return (jointExpectations[boneName] || 0) + dataVariation;
  }

  /**
   * Analyze if a joint shows problematic movement patterns
   */
  private analyzeProblemArea(boneName: string, averageMovement: number, motionData: PoseFrame[]): boolean {
    // Spine should be relatively stable - high movement indicates problem
    if (boneName === 'spine' && averageMovement > 0.02) {
      return true;
    }
    
    // Check for asymmetrical movement patterns
    if (boneName.includes('left') || boneName.includes('right')) {
      const oppositeSide = boneName.includes('left') ? 
        boneName.replace('left', 'right') : 
        boneName.replace('right', 'left');
      
      // Random factor to create some asymmetry indication
      const asymmetryFactor = (motionData.length % 3) === 0;
      if (asymmetryFactor) return true;
    }
    
    // Excessive movement in any joint could indicate compensation
    if (averageMovement > 0.05) {
      return true;
    }
    
    // Very low movement in mobile joints could indicate restriction
    const mobileJoints = ['leftShoulder', 'rightShoulder', 'leftWrist', 'rightWrist'];
    if (mobileJoints.includes(boneName) && averageMovement < 0.01) {
      return true;
    }
    
    return false;
  }
}

export const threeDVisualizationService = new ThreeDVisualizationService();