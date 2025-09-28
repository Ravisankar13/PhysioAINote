/**
 * Anatomical Skeleton Renderer
 * Renders anatomically accurate bone shapes that scale to match the detected person's proportions
 */

export interface BoneSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  width: number;
  type: 'bone' | 'joint';
  name: string;
}

export interface BodyProportions {
  shoulderWidth: number;
  torsoLength: number;
  armLength: number;
  forearmLength: number;
  thighLength: number;
  shinLength: number;
  hipWidth: number;
  scale: number;
}

export class AnatomicalSkeletonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Calculate body proportions from MediaPipe landmarks
   */
  calculateBodyProportions(landmarks: any[]): BodyProportions {
    if (!landmarks || landmarks.length < 33) {
      return this.getDefaultProportions();
    }

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Key landmarks
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return this.getDefaultProportions();
    }

    // Calculate distances in pixels, then convert to relative scale
    const shoulderWidth = Math.sqrt(
      Math.pow((rightShoulder.x - leftShoulder.x) * canvasWidth, 2) +
      Math.pow((rightShoulder.y - leftShoulder.y) * canvasHeight, 2)
    );

    const torsoLength = Math.sqrt(
      Math.pow((leftHip.x - leftShoulder.x) * canvasWidth, 2) +
      Math.pow((leftHip.y - leftShoulder.y) * canvasHeight, 2)
    );

    const hipWidth = Math.sqrt(
      Math.pow((rightHip.x - leftHip.x) * canvasWidth, 2) +
      Math.pow((rightHip.y - leftHip.y) * canvasHeight, 2)
    );

    let armLength = 0, forearmLength = 0, thighLength = 0, shinLength = 0;

    if (leftElbow && leftWrist) {
      armLength = Math.sqrt(
        Math.pow((leftElbow.x - leftShoulder.x) * canvasWidth, 2) +
        Math.pow((leftElbow.y - leftShoulder.y) * canvasHeight, 2)
      );
      
      forearmLength = Math.sqrt(
        Math.pow((leftWrist.x - leftElbow.x) * canvasWidth, 2) +
        Math.pow((leftWrist.y - leftElbow.y) * canvasHeight, 2)
      );
    }

    if (leftKnee && leftAnkle) {
      thighLength = Math.sqrt(
        Math.pow((leftKnee.x - leftHip.x) * canvasWidth, 2) +
        Math.pow((leftKnee.y - leftHip.y) * canvasHeight, 2)
      );
      
      shinLength = Math.sqrt(
        Math.pow((leftAnkle.x - leftKnee.x) * canvasWidth, 2) +
        Math.pow((leftAnkle.y - leftKnee.y) * canvasHeight, 2)
      );
    }

    // Overall scale based on average body size
    const scale = (shoulderWidth + torsoLength + thighLength) / 3 / 100;

    return {
      shoulderWidth,
      torsoLength,
      armLength,
      forearmLength,
      thighLength,
      shinLength,
      hipWidth,
      scale: Math.max(0.5, Math.min(2.0, scale)) // Clamp scale between 0.5 and 2.0
    };
  }

  private getDefaultProportions(): BodyProportions {
    return {
      shoulderWidth: 120,
      torsoLength: 180,
      armLength: 100,
      forearmLength: 90,
      thighLength: 150,
      shinLength: 140,
      hipWidth: 100,
      scale: 1.0
    };
  }

  /**
   * Render anatomically accurate skeleton overlay
   */
  renderAnatomicalSkeleton(landmarks: any[], proportions: BodyProportions) {
    if (!landmarks || landmarks.length < 33) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set rendering style
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Convert landmarks to canvas coordinates
    const getCanvasCoords = (landmark: any) => ({
      x: landmark.x * this.canvas.width,
      y: landmark.y * this.canvas.height
    });

    // Render bones with anatomical accuracy
    this.renderSpine(landmarks, proportions, getCanvasCoords);
    this.renderRibcage(landmarks, proportions, getCanvasCoords);
    this.renderArms(landmarks, proportions, getCanvasCoords);
    this.renderLegs(landmarks, proportions, getCanvasCoords);
    this.renderJoints(landmarks, proportions, getCanvasCoords);
  }

  private renderSpine(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}) {
    const leftShoulder = getCanvasCoords(landmarks[11]);
    const rightShoulder = getCanvasCoords(landmarks[12]);
    const leftHip = getCanvasCoords(landmarks[23]);
    const rightHip = getCanvasCoords(landmarks[24]);

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

    // Calculate spine center points
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    // Draw vertebrae as connected segments
    this.ctx.strokeStyle = '#e8e4d9'; // Bone color
    this.ctx.fillStyle = '#f5f1e8';
    this.ctx.lineWidth = 8 * proportions.scale;

    // Draw spine as a series of vertebrae
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      
      const start = {
        x: shoulderCenter.x + t1 * (hipCenter.x - shoulderCenter.x),
        y: shoulderCenter.y + t1 * (hipCenter.y - shoulderCenter.y)
      };
      
      const end = {
        x: shoulderCenter.x + t2 * (hipCenter.x - shoulderCenter.x),
        y: shoulderCenter.y + t2 * (hipCenter.y - shoulderCenter.y)
      };

      this.drawBone(start, end, 6 * proportions.scale);
    }
  }

  private renderRibcage(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}) {
    const leftShoulder = getCanvasCoords(landmarks[11]);
    const rightShoulder = getCanvasCoords(landmarks[12]);
    const leftHip = getCanvasCoords(landmarks[23]);
    const rightHip = getCanvasCoords(landmarks[24]);

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

    // Simplified ribcage outline
    this.ctx.strokeStyle = '#e8e4d9';
    this.ctx.lineWidth = 3 * proportions.scale;
    this.ctx.fillStyle = 'transparent';

    // Draw simplified rib curves
    const ribLevels = 4;
    for (let i = 0; i < ribLevels; i++) {
      const t = (i + 1) / (ribLevels + 1);
      const y = leftShoulder.y + t * (leftHip.y - leftShoulder.y);
      const width = proportions.shoulderWidth * (1 - t * 0.3); // Tapers toward waist

      this.ctx.beginPath();
      this.ctx.ellipse(
        (leftShoulder.x + rightShoulder.x) / 2,
        y,
        width / 2,
        10 * proportions.scale,
        0,
        0,
        Math.PI
      );
      this.ctx.stroke();
    }
  }

  private renderArms(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}) {
    // Left arm
    this.renderArm(landmarks, proportions, getCanvasCoords, 'left');
    // Right arm
    this.renderArm(landmarks, proportions, getCanvasCoords, 'right');
  }

  private renderArm(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}, side: 'left' | 'right') {
    const shoulderIdx = side === 'left' ? 11 : 12;
    const elbowIdx = side === 'left' ? 13 : 14;
    const wristIdx = side === 'left' ? 15 : 16;

    const shoulder = getCanvasCoords(landmarks[shoulderIdx]);
    const elbow = getCanvasCoords(landmarks[elbowIdx]);
    const wrist = getCanvasCoords(landmarks[wristIdx]);

    if (!shoulder || !elbow || !wrist) return;

    // Upper arm (humerus)
    this.drawBone(shoulder, elbow, 12 * proportions.scale);
    
    // Forearm (radius/ulna)
    this.drawBone(elbow, wrist, 10 * proportions.scale);
  }

  private renderLegs(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}) {
    // Left leg
    this.renderLeg(landmarks, proportions, getCanvasCoords, 'left');
    // Right leg
    this.renderLeg(landmarks, proportions, getCanvasCoords, 'right');
  }

  private renderLeg(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}, side: 'left' | 'right') {
    const hipIdx = side === 'left' ? 23 : 24;
    const kneeIdx = side === 'left' ? 25 : 26;
    const ankleIdx = side === 'left' ? 27 : 28;

    const hip = getCanvasCoords(landmarks[hipIdx]);
    const knee = getCanvasCoords(landmarks[kneeIdx]);
    const ankle = getCanvasCoords(landmarks[ankleIdx]);

    if (!hip || !knee || !ankle) return;

    // Thigh (femur) - largest bone
    this.drawBone(hip, knee, 16 * proportions.scale);
    
    // Shin (tibia/fibula)
    this.drawBone(knee, ankle, 14 * proportions.scale);
  }

  private renderJoints(landmarks: any[], proportions: BodyProportions, getCanvasCoords: (landmark: any) => {x: number, y: number}) {
    const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]; // Major joints
    
    this.ctx.fillStyle = '#d4af8c'; // Joint color
    
    jointIndices.forEach(idx => {
      const landmark = landmarks[idx];
      if (landmark) {
        const coords = getCanvasCoords(landmark);
        this.ctx.beginPath();
        this.ctx.arc(coords.x, coords.y, 8 * proportions.scale, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    });
  }

  private drawBone(start: {x: number, y: number}, end: {x: number, y: number}, width: number) {
    const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    this.ctx.save();
    this.ctx.translate(start.x, start.y);
    this.ctx.rotate(angle);

    // Draw bone shape with rounded ends
    this.ctx.fillStyle = '#f5f1e8'; // Light bone color
    this.ctx.strokeStyle = '#e8e4d9'; // Bone outline
    this.ctx.lineWidth = 2;

    // Bone shaft
    this.ctx.beginPath();
    this.ctx.roundRect(-width/4, -width/2, length + width/2, width, width/4);
    this.ctx.fill();
    this.ctx.stroke();

    // Bone ends (epiphyses)
    this.ctx.fillStyle = '#e8e4d9';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, width/2, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(length, 0, width/2, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.restore();
  }
}

// Helper function to create and use the renderer
export function renderAnatomicalSkeletonOverlay(
  canvas: HTMLCanvasElement, 
  landmarks: any[]
) {
  const renderer = new AnatomicalSkeletonRenderer(canvas);
  const proportions = renderer.calculateBodyProportions(landmarks);
  renderer.renderAnatomicalSkeleton(landmarks, proportions);
}