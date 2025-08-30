// MediaPipe Pose Landmark indices
export const POSE_LANDMARKS = {
  // Face
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_MOUTH: 9,
  RIGHT_MOUTH: 10,
  
  // Upper body
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  
  // Lower body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

// Helper function to get landmark position
export function getLandmarkPosition(landmarks: any, index: number, width: number, height: number) {
  if (!landmarks || !landmarks[index]) return null;
  return {
    x: landmarks[index].x * width,
    y: landmarks[index].y * height,
    z: landmarks[index].z || 0,
    visibility: landmarks[index].visibility || 0
  };
}

// Calculate midpoint between two landmarks
export function getMidpoint(landmarks: any, index1: number, index2: number, width: number, height: number) {
  const p1 = getLandmarkPosition(landmarks, index1, width, height);
  const p2 = getLandmarkPosition(landmarks, index2, width, height);
  
  if (!p1 || !p2) return null;
  
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: (p1.z + p2.z) / 2,
    visibility: Math.min(p1.visibility, p2.visibility)
  };
}

// Calculate angle between three points (in degrees)
export function calculateAngle(p1: any, p2: any, p3: any): number {
  if (!p1 || !p2 || !p3) return 0;
  
  const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let degrees = angle * (180 / Math.PI);
  
  // Normalize to 0-360 degrees
  if (degrees < 0) degrees += 360;
  if (degrees > 360) degrees -= 360;
  
  return degrees;
}

// Calculate distance between two points
export function getDistance(p1: any, p2: any): number {
  if (!p1 || !p2) return 0;
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Interpolate point along a line
export function interpolatePoint(p1: any, p2: any, ratio: number) {
  if (!p1 || !p2) return null;
  
  return {
    x: p1.x + (p2.x - p1.x) * ratio,
    y: p1.y + (p2.y - p1.y) * ratio,
    z: p1.z + (p2.z - p1.z) * ratio,
    visibility: Math.min(p1.visibility, p2.visibility)
  };
}

// Check if landmark is visible enough to render
export function isLandmarkVisible(landmark: any, threshold = 0.5): boolean {
  return landmark && landmark.visibility >= threshold;
}