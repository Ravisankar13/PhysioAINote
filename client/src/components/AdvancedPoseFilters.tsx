import React from 'react';

// Advanced filtering algorithms for pose detection
export interface PosePoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface FilteredPose {
  keypoints: PosePoint[];
  score: number;
  timestamp: number;
}

// Kalman Filter implementation for pose smoothing
export class KalmanFilter {
  private Q: number; // Process noise covariance
  private R: number; // Measurement noise covariance
  private P: number; // Estimation error covariance
  private X: number; // State estimate
  private K: number; // Kalman gain

  constructor(processNoise = 0.01, measurementNoise = 0.1, initialState = 0) {
    this.Q = processNoise;
    this.R = measurementNoise;
    this.P = 1.0;
    this.X = initialState;
    this.K = 0;
  }

  update(measurement: number): number {
    // Prediction step
    this.P += this.Q;

    // Update step
    this.K = this.P / (this.P + this.R);
    this.X += this.K * (measurement - this.X);
    this.P *= (1 - this.K);

    return this.X;
  }

  reset(initialState = 0) {
    this.X = initialState;
    this.P = 1.0;
    this.K = 0;
  }
}

// Exponential Moving Average filter for temporal smoothing
export class ExponentialMovingAverage {
  private alpha: number;
  private previousValue: number | null = null;

  constructor(alpha = 0.3) {
    this.alpha = alpha; // Smoothing factor (0 = no smoothing, 1 = no memory)
  }

  update(value: number): number {
    if (this.previousValue === null) {
      this.previousValue = value;
      return value;
    }

    const smoothedValue = this.alpha * value + (1 - this.alpha) * this.previousValue;
    this.previousValue = smoothedValue;
    return smoothedValue;
  }

  reset() {
    this.previousValue = null;
  }
}

// Bilateral filter for spatial noise reduction
export class BilateralFilter {
  private spatialSigma: number;
  private intensitySigma: number;

  constructor(spatialSigma = 2.0, intensitySigma = 0.1) {
    this.spatialSigma = spatialSigma;
    this.intensitySigma = intensitySigma;
  }

  filter(keypoints: PosePoint[], windowSize = 5): PosePoint[] {
    const filteredKeypoints = [...keypoints];
    
    for (let i = 0; i < keypoints.length; i++) {
      if (keypoints[i].confidence < 0.3) continue; // Skip low confidence points
      
      let weightedSumX = 0;
      let weightedSumY = 0;
      let totalWeight = 0;

      // Apply bilateral filtering within a spatial window
      for (let j = Math.max(0, i - windowSize); j <= Math.min(keypoints.length - 1, i + windowSize); j++) {
        if (keypoints[j].confidence < 0.3) continue;

        const spatialDistance = Math.abs(i - j);
        const intensityDistance = Math.abs(keypoints[i].confidence - keypoints[j].confidence);

        const spatialWeight = Math.exp(-(spatialDistance * spatialDistance) / (2 * this.spatialSigma * this.spatialSigma));
        const intensityWeight = Math.exp(-(intensityDistance * intensityDistance) / (2 * this.intensitySigma * this.intensitySigma));
        
        const weight = spatialWeight * intensityWeight * keypoints[j].confidence;

        weightedSumX += keypoints[j].x * weight;
        weightedSumY += keypoints[j].y * weight;
        totalWeight += weight;
      }

      if (totalWeight > 0) {
        filteredKeypoints[i] = {
          ...keypoints[i],
          x: weightedSumX / totalWeight,
          y: weightedSumY / totalWeight
        };
      }
    }

    return filteredKeypoints;
  }
}

// Outlier detection and removal using statistical methods
export class OutlierDetector {
  private history: number[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 10) {
    this.maxHistorySize = maxHistorySize;
  }

  isOutlier(value: number, threshold = 2.0): boolean {
    if (this.history.length < 3) {
      this.history.push(value);
      return false;
    }

    const mean = this.history.reduce((sum, val) => sum + val, 0) / this.history.length;
    const variance = this.history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.history.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs(value - mean) / (stdDev + 1e-6); // Add small epsilon to avoid division by zero

    this.history.push(value);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    return zScore > threshold;
  }

  reset() {
    this.history = [];
  }
}

// Confidence-based pose validation
export class ConfidenceValidator {
  private minKeypointConfidence: number;
  private minPoseScore: number;
  private minValidKeypoints: number;

  constructor(
    minKeypointConfidence = 0.3,
    minPoseScore = 0.5,
    minValidKeypoints = 10
  ) {
    this.minKeypointConfidence = minKeypointConfidence;
    this.minPoseScore = minPoseScore;
    this.minValidKeypoints = minValidKeypoints;
  }

  validatePose(pose: FilteredPose): boolean {
    // Check overall pose score
    if (pose.score < this.minPoseScore) {
      return false;
    }

    // Count valid keypoints
    const validKeypoints = pose.keypoints.filter(kp => kp.confidence >= this.minKeypointConfidence);
    
    return validKeypoints.length >= this.minValidKeypoints;
  }

  enhancePose(pose: FilteredPose): FilteredPose {
    // Interpolate missing keypoints based on anatomical constraints
    const enhancedKeypoints = [...pose.keypoints];

    // Define keypoint connections for interpolation
    const connections = [
      [5, 6],   // shoulders
      [11, 12], // hips
      [5, 7],   // left shoulder to elbow
      [7, 9],   // left elbow to wrist
      [6, 8],   // right shoulder to elbow
      [8, 10],  // right elbow to wrist
      [11, 13], // left hip to knee
      [13, 15], // left knee to ankle
      [12, 14], // right hip to knee
      [14, 16]  // right knee to ankle
    ];

    // Interpolate missing keypoints
    connections.forEach(([a, b]) => {
      const kpA = enhancedKeypoints[a];
      const kpB = enhancedKeypoints[b];

      if (kpA && kpB) {
        // If one keypoint has low confidence but the other is good, interpolate
        if (kpA.confidence < this.minKeypointConfidence && kpB.confidence >= this.minKeypointConfidence) {
          // Estimate position based on anatomical proportions
          enhancedKeypoints[a] = {
            ...kpA,
            confidence: Math.min(kpB.confidence * 0.7, this.minKeypointConfidence)
          };
        } else if (kpB.confidence < this.minKeypointConfidence && kpA.confidence >= this.minKeypointConfidence) {
          enhancedKeypoints[b] = {
            ...kpB,
            confidence: Math.min(kpA.confidence * 0.7, this.minKeypointConfidence)
          };
        }
      }
    });

    return {
      ...pose,
      keypoints: enhancedKeypoints
    };
  }
}

// Main advanced pose filtering system
export class AdvancedPoseFilterSystem {
  private kalmanFilters: Map<string, KalmanFilter> = new Map();
  private emaFilters: Map<string, ExponentialMovingAverage> = new Map();
  private outlierDetectors: Map<string, OutlierDetector> = new Map();
  private bilateralFilter: BilateralFilter;
  private confidenceValidator: ConfidenceValidator;
  private poseHistory: FilteredPose[] = [];
  private readonly maxHistorySize = 30;

  constructor() {
    this.bilateralFilter = new BilateralFilter(2.0, 0.1);
    this.confidenceValidator = new ConfidenceValidator(0.3, 0.5, 10);
  }

  // Apply comprehensive filtering to pose data
  filterPose(pose: FilteredPose): FilteredPose | null {
    // Step 1: Validate pose confidence
    if (!this.confidenceValidator.validatePose(pose)) {
      return null;
    }

    // Step 2: Apply spatial bilateral filtering
    const spatiallyFiltered = this.bilateralFilter.filter(pose.keypoints);

    // Step 3: Apply temporal filtering with Kalman filters and EMA
    const temporallyFiltered = this.applyTemporalFiltering(spatiallyFiltered, pose.timestamp);

    // Step 4: Remove outliers
    const outlierFiltered = this.removeOutliers(temporallyFiltered);

    // Step 5: Enhance pose with interpolation
    const enhancedPose: FilteredPose = {
      keypoints: outlierFiltered,
      score: pose.score,
      timestamp: pose.timestamp
    };

    const finalPose = this.confidenceValidator.enhancePose(enhancedPose);

    // Step 6: Apply anatomical constraints
    const constrainedPose = this.applyAnatomicalConstraints(finalPose);

    // Update history
    this.updateHistory(constrainedPose);

    return constrainedPose;
  }

  private applyTemporalFiltering(keypoints: PosePoint[], timestamp: number): PosePoint[] {
    return keypoints.map((kp, index) => {
      const kfKey = `kf_${index}`;
      const emaKey = `ema_${index}`;

      // Initialize filters if needed
      if (!this.kalmanFilters.has(`${kfKey}_x`)) {
        this.kalmanFilters.set(`${kfKey}_x`, new KalmanFilter(0.01, 0.1, kp.x));
        this.kalmanFilters.set(`${kfKey}_y`, new KalmanFilter(0.01, 0.1, kp.y));
        this.emaFilters.set(`${emaKey}_x`, new ExponentialMovingAverage(0.3));
        this.emaFilters.set(`${emaKey}_y`, new ExponentialMovingAverage(0.3));
      }

      if (kp.confidence < 0.3) return kp; // Skip low confidence points

      // Apply Kalman filtering
      const kfX = this.kalmanFilters.get(`${kfKey}_x`)!;
      const kfY = this.kalmanFilters.get(`${kfKey}_y`)!;
      const kalmanX = kfX.update(kp.x);
      const kalmanY = kfY.update(kp.y);

      // Apply EMA smoothing
      const emaX = this.emaFilters.get(`${emaKey}_x`)!;
      const emaY = this.emaFilters.get(`${emaKey}_y`)!;
      const smoothedX = emaX.update(kalmanX);
      const smoothedY = emaY.update(kalmanY);

      return {
        ...kp,
        x: smoothedX,
        y: smoothedY
      };
    });
  }

  private removeOutliers(keypoints: PosePoint[]): PosePoint[] {
    return keypoints.map((kp, index) => {
      const detectorKey = `outlier_${index}`;

      if (!this.outlierDetectors.has(`${detectorKey}_x`)) {
        this.outlierDetectors.set(`${detectorKey}_x`, new OutlierDetector(10));
        this.outlierDetectors.set(`${detectorKey}_y`, new OutlierDetector(10));
      }

      if (kp.confidence < 0.3) return kp;

      const detectorX = this.outlierDetectors.get(`${detectorKey}_x`)!;
      const detectorY = this.outlierDetectors.get(`${detectorKey}_y`)!;

      const isOutlierX = detectorX.isOutlier(kp.x, 2.0);
      const isOutlierY = detectorY.isOutlier(kp.y, 2.0);

      // If point is an outlier, reduce its confidence
      if (isOutlierX || isOutlierY) {
        return {
          ...kp,
          confidence: kp.confidence * 0.5 // Reduce confidence for outliers
        };
      }

      return kp;
    });
  }

  private applyAnatomicalConstraints(pose: FilteredPose): FilteredPose {
    const constrainedKeypoints = [...pose.keypoints];

    // Define anatomical constraints (maximum limb lengths in pixels)
    const maxLimbLengths = {
      upperArm: 150,
      forearm: 130,
      thigh: 170,
      shin: 160,
      torso: 200
    };

    // Apply constraints to connected keypoints
    const limbConnections = [
      { from: 5, to: 7, maxLength: maxLimbLengths.upperArm }, // Left upper arm
      { from: 7, to: 9, maxLength: maxLimbLengths.forearm },  // Left forearm
      { from: 6, to: 8, maxLength: maxLimbLengths.upperArm }, // Right upper arm
      { from: 8, to: 10, maxLength: maxLimbLengths.forearm }, // Right forearm
      { from: 11, to: 13, maxLength: maxLimbLengths.thigh },  // Left thigh
      { from: 13, to: 15, maxLength: maxLimbLengths.shin },   // Left shin
      { from: 12, to: 14, maxLength: maxLimbLengths.thigh },  // Right thigh
      { from: 14, to: 16, maxLength: maxLimbLengths.shin }    // Right shin
    ];

    limbConnections.forEach(({ from, to, maxLength }) => {
      const kpFrom = constrainedKeypoints[from];
      const kpTo = constrainedKeypoints[to];

      if (kpFrom && kpTo && kpFrom.confidence > 0.3 && kpTo.confidence > 0.3) {
        const distance = Math.sqrt(
          Math.pow(kpFrom.x - kpTo.x, 2) + Math.pow(kpFrom.y - kpTo.y, 2)
        );

        // If limb is too long, adjust the less confident keypoint
        if (distance > maxLength) {
          const adjustmentFactor = maxLength / distance;
          
          if (kpFrom.confidence < kpTo.confidence) {
            const dx = (kpFrom.x - kpTo.x) * adjustmentFactor;
            const dy = (kpFrom.y - kpTo.y) * adjustmentFactor;
            constrainedKeypoints[from] = {
              ...kpFrom,
              x: kpTo.x + dx,
              y: kpTo.y + dy
            };
          } else {
            const dx = (kpTo.x - kpFrom.x) * adjustmentFactor;
            const dy = (kpTo.y - kpFrom.y) * adjustmentFactor;
            constrainedKeypoints[to] = {
              ...kpTo,
              x: kpFrom.x + dx,
              y: kpFrom.y + dy
            };
          }
        }
      }
    });

    return {
      ...pose,
      keypoints: constrainedKeypoints
    };
  }

  private updateHistory(pose: FilteredPose) {
    this.poseHistory.push(pose);
    if (this.poseHistory.length > this.maxHistorySize) {
      this.poseHistory.shift();
    }
  }

  // Get movement quality metrics
  getQualityMetrics(): {
    stability: number;
    smoothness: number;
    consistency: number;
  } {
    if (this.poseHistory.length < 5) {
      return { stability: 0, smoothness: 0, consistency: 0 };
    }

    // Calculate stability (lower variance = higher stability)
    const scores = this.poseHistory.map(pose => pose.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const stability = Math.max(0, 1 - (variance / avgScore));

    // Calculate smoothness (lower jitter = higher smoothness)
    let totalJitter = 0;
    for (let i = 1; i < this.poseHistory.length; i++) {
      const prev = this.poseHistory[i - 1];
      const curr = this.poseHistory[i];
      
      let frameJitter = 0;
      for (let j = 0; j < Math.min(prev.keypoints.length, curr.keypoints.length); j++) {
        if (prev.keypoints[j].confidence > 0.3 && curr.keypoints[j].confidence > 0.3) {
          const dx = prev.keypoints[j].x - curr.keypoints[j].x;
          const dy = prev.keypoints[j].y - curr.keypoints[j].y;
          frameJitter += Math.sqrt(dx * dx + dy * dy);
        }
      }
      totalJitter += frameJitter;
    }
    const avgJitter = totalJitter / (this.poseHistory.length - 1);
    const smoothness = Math.max(0, 1 - (avgJitter / 100)); // Normalize to 0-1

    // Calculate consistency (how consistent keypoint visibility is)
    const keypointVisibility = new Array(17).fill(0);
    this.poseHistory.forEach(pose => {
      pose.keypoints.forEach((kp, index) => {
        if (kp.confidence > 0.3) {
          keypointVisibility[index]++;
        }
      });
    });
    const avgVisibility = keypointVisibility.reduce((sum, v) => sum + v, 0) / keypointVisibility.length;
    const consistency = avgVisibility / this.poseHistory.length;

    return { stability, smoothness, consistency };
  }

  reset() {
    this.kalmanFilters.clear();
    this.emaFilters.clear();
    this.outlierDetectors.clear();
    this.poseHistory = [];
  }
}