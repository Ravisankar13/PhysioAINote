import { AnatomyRenderer } from '../AnatomyRenderer';
import { AnatomicalStructure, RenderContext, AnatomyRegion } from '../types';
import { 
  getLandmarkPosition, 
  getMidpoint, 
  interpolatePoint,
  getDistance,
  POSE_LANDMARKS 
} from '../utils/landmarkMapping';

export class ShoulderAnatomy extends AnatomyRenderer {
  constructor() {
    const region: AnatomyRegion = {
      id: 'shoulder',
      name: 'Shoulder',
      landmarks: [
        POSE_LANDMARKS.LEFT_SHOULDER,
        POSE_LANDMARKS.RIGHT_SHOULDER,
        POSE_LANDMARKS.LEFT_ELBOW,
        POSE_LANDMARKS.RIGHT_ELBOW,
        POSE_LANDMARKS.LEFT_HIP,
        POSE_LANDMARKS.RIGHT_HIP,
        POSE_LANDMARKS.NOSE
      ],
      structures: [
        // Bones
        {
          id: 'clavicle_left',
          type: 'bone',
          name: 'Left Clavicle',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER],
          renderMethod: 'path',
          color: '#E8D4B0',
          layer: 1
        },
        {
          id: 'clavicle_right',
          type: 'bone',
          name: 'Right Clavicle',
          landmarks: [POSE_LANDMARKS.RIGHT_SHOULDER],
          renderMethod: 'path',
          color: '#E8D4B0',
          layer: 1
        },
        {
          id: 'scapula_left',
          type: 'bone',
          name: 'Left Scapula',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
          renderMethod: 'polygon',
          color: '#D4C4A0',
          layer: 0
        },
        {
          id: 'scapula_right',
          type: 'bone',
          name: 'Right Scapula',
          landmarks: [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
          renderMethod: 'polygon',
          color: '#D4C4A0',
          layer: 0
        },
        {
          id: 'humerus_left',
          type: 'bone',
          name: 'Left Humerus (upper)',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
          renderMethod: 'path',
          color: '#E8D4B0',
          layer: 1
        },
        {
          id: 'humerus_right',
          type: 'bone',
          name: 'Right Humerus (upper)',
          landmarks: [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
          renderMethod: 'path',
          color: '#E8D4B0',
          layer: 1
        },
        
        // Muscles
        {
          id: 'deltoid_left',
          type: 'muscle',
          name: 'Left Deltoid',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
          renderMethod: 'polygon',
          color: 'rgba(220, 38, 127, 0.4)',
          layer: 2
        },
        {
          id: 'deltoid_right',
          type: 'muscle',
          name: 'Right Deltoid',
          landmarks: [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
          renderMethod: 'polygon',
          color: 'rgba(220, 38, 127, 0.4)',
          layer: 2
        },
        {
          id: 'trapezius',
          type: 'muscle',
          name: 'Trapezius',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.NOSE],
          renderMethod: 'polygon',
          color: 'rgba(200, 38, 100, 0.3)',
          layer: 2
        },
        {
          id: 'pectoralis_major',
          type: 'muscle',
          name: 'Pectoralis Major',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
          renderMethod: 'polygon',
          color: 'rgba(180, 50, 120, 0.3)',
          layer: 2
        },
        
        // Ligaments
        {
          id: 'ac_ligament_left',
          type: 'ligament',
          name: 'Left AC Ligament',
          landmarks: [POSE_LANDMARKS.LEFT_SHOULDER],
          renderMethod: 'line',
          color: '#4A5568',
          layer: 3
        },
        {
          id: 'ac_ligament_right',
          type: 'ligament',
          name: 'Right AC Ligament',
          landmarks: [POSE_LANDMARKS.RIGHT_SHOULDER],
          renderMethod: 'line',
          color: '#4A5568',
          layer: 3
        }
      ]
    };
    
    super(region);
  }

  protected renderPath(structure: AnatomicalStructure, context: RenderContext): void {
    const { ctx, landmarks, width, height } = context;
    
    switch (structure.id) {
      case 'clavicle_left':
        this.renderClavicle(ctx, landmarks, width, height, 'left');
        break;
      case 'clavicle_right':
        this.renderClavicle(ctx, landmarks, width, height, 'right');
        break;
      case 'humerus_left':
        this.renderHumerus(ctx, landmarks, width, height, 'left');
        break;
      case 'humerus_right':
        this.renderHumerus(ctx, landmarks, width, height, 'right');
        break;
    }
  }

  private renderClavicle(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, side: 'left' | 'right') {
    const shoulderIndex = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
    const oppositeShoulderIndex = side === 'left' ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
    
    const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
    const oppositeShoulder = getLandmarkPosition(landmarks, oppositeShoulderIndex, width, height);
    const sternum = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    
    if (!shoulder || !sternum) return;
    
    const thickness = getDistance(shoulder, oppositeShoulder) * 0.05;
    
    ctx.beginPath();
    ctx.strokeStyle = '#E8D4B0';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    
    // Draw clavicle as curved line from sternum to shoulder
    const controlPoint = {
      x: sternum.x + (shoulder.x - sternum.x) * 0.5,
      y: sternum.y - thickness * 2
    };
    
    ctx.moveTo(sternum.x, sternum.y);
    ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, shoulder.x, shoulder.y);
    ctx.stroke();
    
    // Add gradient fill for depth
    const gradient = ctx.createLinearGradient(sternum.x, sternum.y, shoulder.x, shoulder.y);
    gradient.addColorStop(0, '#F4E4C1');
    gradient.addColorStop(0.5, '#E8D4B0');
    gradient.addColorStop(1, '#D4C4A0');
    
    ctx.strokeStyle = gradient;
    ctx.stroke();
  }

  private renderHumerus(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, side: 'left' | 'right') {
    const shoulderIndex = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
    const elbowIndex = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    
    const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
    const elbow = getLandmarkPosition(landmarks, elbowIndex, width, height);
    
    if (!shoulder || !elbow) return;
    
    const length = getDistance(shoulder, elbow);
    const thickness = length * 0.08;
    
    // Draw humerus head (ball joint)
    ctx.beginPath();
    ctx.fillStyle = '#E8D4B0';
    ctx.arc(shoulder.x, shoulder.y, thickness * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw humerus shaft
    ctx.beginPath();
    ctx.strokeStyle = '#E8D4B0';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.stroke();
    
    // Add gradient for depth
    const gradient = ctx.createLinearGradient(shoulder.x, shoulder.y, elbow.x, elbow.y);
    gradient.addColorStop(0, '#F4E4C1');
    gradient.addColorStop(0.5, '#E8D4B0');
    gradient.addColorStop(1, '#D4C4A0');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = thickness * 0.9;
    ctx.stroke();
  }

  protected renderPolygon(structure: AnatomicalStructure, context: RenderContext): void {
    const { ctx, landmarks, width, height } = context;
    
    switch (structure.id) {
      case 'scapula_left':
      case 'scapula_right':
        this.renderScapula(ctx, landmarks, width, height, structure.id === 'scapula_left' ? 'left' : 'right');
        break;
      case 'deltoid_left':
      case 'deltoid_right':
        this.renderDeltoid(ctx, landmarks, width, height, structure.id === 'deltoid_left' ? 'left' : 'right', structure.color);
        break;
      case 'trapezius':
        this.renderTrapezius(ctx, landmarks, width, height, structure.color);
        break;
      case 'pectoralis_major':
        this.renderPectoralis(ctx, landmarks, width, height, structure.color);
        break;
    }
  }

  private renderScapula(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, side: 'left' | 'right') {
    const shoulderIndex = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
    const elbowIndex = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    const hipIndex = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
    
    const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
    const elbow = getLandmarkPosition(landmarks, elbowIndex, width, height);
    const hip = getLandmarkPosition(landmarks, hipIndex, width, height);
    
    if (!shoulder || !elbow) return;
    
    const armLength = getDistance(shoulder, elbow);
    const scapulaWidth = armLength * 0.4;
    const scapulaHeight = armLength * 0.5;
    
    // Calculate scapula position (behind shoulder)
    const scapulaCenter = {
      x: shoulder.x + (side === 'left' ? -scapulaWidth * 0.3 : scapulaWidth * 0.3),
      y: shoulder.y + scapulaHeight * 0.2
    };
    
    ctx.beginPath();
    ctx.fillStyle = '#D4C4A0';
    
    // Draw triangular scapula shape
    ctx.moveTo(scapulaCenter.x, scapulaCenter.y - scapulaHeight * 0.4);
    ctx.lineTo(scapulaCenter.x - scapulaWidth * 0.4, scapulaCenter.y + scapulaHeight * 0.3);
    ctx.lineTo(scapulaCenter.x + scapulaWidth * 0.4, scapulaCenter.y + scapulaHeight * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Add gradient for depth
    const gradient = ctx.createRadialGradient(
      scapulaCenter.x, scapulaCenter.y, 0,
      scapulaCenter.x, scapulaCenter.y, scapulaWidth
    );
    gradient.addColorStop(0, '#E8D4B0');
    gradient.addColorStop(1, '#C4B4A0');
    
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderDeltoid(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, side: 'left' | 'right', color: string) {
    const shoulderIndex = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
    const elbowIndex = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    
    const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
    const elbow = getLandmarkPosition(landmarks, elbowIndex, width, height);
    const midArm = interpolatePoint(shoulder, elbow, 0.3);
    
    if (!shoulder || !elbow || !midArm) return;
    
    const muscleWidth = getDistance(shoulder, elbow) * 0.25;
    
    ctx.beginPath();
    ctx.fillStyle = color;
    
    // Draw deltoid as rounded triangle
    ctx.moveTo(shoulder.x - muscleWidth * 0.5, shoulder.y - muscleWidth * 0.3);
    ctx.quadraticCurveTo(
      shoulder.x, shoulder.y - muscleWidth * 0.5,
      shoulder.x + muscleWidth * 0.5, shoulder.y - muscleWidth * 0.3
    );
    ctx.quadraticCurveTo(
      midArm.x + muscleWidth * 0.3, midArm.y,
      midArm.x, midArm.y + muscleWidth * 0.1
    );
    ctx.quadraticCurveTo(
      midArm.x - muscleWidth * 0.3, midArm.y,
      shoulder.x - muscleWidth * 0.5, shoulder.y - muscleWidth * 0.3
    );
    
    ctx.fill();
  }

  private renderTrapezius(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, color: string) {
    const leftShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, width, height);
    const rightShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    const neck = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    
    if (!leftShoulder || !rightShoulder || !neck) return;
    
    const neckTop = {
      x: neck.x,
      y: neck.y - getDistance(leftShoulder, rightShoulder) * 0.4
    };
    
    ctx.beginPath();
    ctx.fillStyle = color;
    
    // Draw trapezius as diamond shape
    ctx.moveTo(neckTop.x, neckTop.y);
    ctx.quadraticCurveTo(
      leftShoulder.x * 0.7 + neckTop.x * 0.3,
      neckTop.y + (leftShoulder.y - neckTop.y) * 0.5,
      leftShoulder.x, leftShoulder.y
    );
    ctx.lineTo(neck.x, neck.y + getDistance(leftShoulder, rightShoulder) * 0.2);
    ctx.lineTo(rightShoulder.x, rightShoulder.y);
    ctx.quadraticCurveTo(
      rightShoulder.x * 0.7 + neckTop.x * 0.3,
      neckTop.y + (rightShoulder.y - neckTop.y) * 0.5,
      neckTop.x, neckTop.y
    );
    
    ctx.fill();
  }

  private renderPectoralis(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, color: string) {
    const leftShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, width, height);
    const rightShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    const leftHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_HIP, width, height);
    const rightHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_HIP, width, height);
    const sternum = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    
    if (!leftShoulder || !rightShoulder || !sternum) return;
    
    const chestBottom = {
      x: sternum.x,
      y: sternum.y + getDistance(leftShoulder, rightShoulder) * 0.6
    };
    
    // Draw left pectoralis
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(sternum.x, sternum.y);
    ctx.quadraticCurveTo(
      leftShoulder.x * 0.8 + sternum.x * 0.2,
      sternum.y,
      leftShoulder.x, leftShoulder.y
    );
    ctx.quadraticCurveTo(
      leftShoulder.x,
      chestBottom.y,
      chestBottom.x, chestBottom.y
    );
    ctx.fill();
    
    // Draw right pectoralis
    ctx.beginPath();
    ctx.moveTo(sternum.x, sternum.y);
    ctx.quadraticCurveTo(
      rightShoulder.x * 0.8 + sternum.x * 0.2,
      sternum.y,
      rightShoulder.x, rightShoulder.y
    );
    ctx.quadraticCurveTo(
      rightShoulder.x,
      chestBottom.y,
      chestBottom.x, chestBottom.y
    );
    ctx.fill();
  }

  protected renderLine(structure: AnatomicalStructure, context: RenderContext): void {
    const { ctx, landmarks, width, height } = context;
    
    // Render AC ligaments
    if (structure.id.includes('ac_ligament')) {
      const side = structure.id.includes('left') ? 'left' : 'right';
      const shoulderIndex = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
      const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
      
      if (!shoulder) return;
      
      // Draw ligament as short line connecting acromion to clavicle
      const ligamentLength = 20;
      ctx.beginPath();
      ctx.strokeStyle = structure.color;
      ctx.lineWidth = 2;
      ctx.moveTo(shoulder.x - ligamentLength * 0.5, shoulder.y);
      ctx.lineTo(shoulder.x + ligamentLength * 0.5, shoulder.y - ligamentLength * 0.3);
      ctx.stroke();
    }
  }

  protected renderCircle(structure: AnatomicalStructure, context: RenderContext): void {
    // Not used for shoulder anatomy currently
  }

  protected renderLabels(context: RenderContext): void {
    const { ctx, landmarks, width, height } = context;
    
    ctx.font = '12px Arial';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    
    // Label key structures
    const leftShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, width, height);
    const rightShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    
    if (leftShoulder && leftShoulder.visibility > 0.5) {
      ctx.strokeText('Shoulder', leftShoulder.x - 25, leftShoulder.y - 10);
      ctx.fillText('Shoulder', leftShoulder.x - 25, leftShoulder.y - 10);
    }
    
    if (rightShoulder && rightShoulder.visibility > 0.5) {
      ctx.strokeText('Shoulder', rightShoulder.x - 25, rightShoulder.y - 10);
      ctx.fillText('Shoulder', rightShoulder.x - 25, rightShoulder.y - 10);
    }
  }
}