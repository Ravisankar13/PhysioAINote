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
    
    if (!shoulder || !oppositeShoulder) return;
    
    // Calculate sternum position (slightly below midpoint between shoulders)
    const sternum = {
      x: (shoulder.x + oppositeShoulder.x) / 2,
      y: Math.min(shoulder.y, oppositeShoulder.y) + getDistance(shoulder, oppositeShoulder) * 0.1
    };
    
    const thickness = getDistance(shoulder, oppositeShoulder) * 0.03;
    
    // Create anatomically correct S-curve for clavicle
    ctx.beginPath();
    ctx.strokeStyle = '#E8D4B0';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    
    // Calculate control points for S-curve
    const midPoint = interpolatePoint(sternum, shoulder, 0.5);
    if (!midPoint) return;
    
    // First control point (medial curve - convex anteriorly)
    const cp1 = {
      x: sternum.x + (midPoint.x - sternum.x) * 0.8,
      y: sternum.y - thickness * 1.5 // Curves slightly upward and forward
    };
    
    // Second control point (lateral curve - concave anteriorly)  
    const cp2 = {
      x: midPoint.x + (shoulder.x - midPoint.x) * 0.3,
      y: shoulder.y + thickness * 0.5 // Curves slightly backward
    };
    
    // Draw the S-curved clavicle
    ctx.moveTo(sternum.x, sternum.y);
    ctx.bezierCurveTo(
      cp1.x, cp1.y,
      cp2.x, cp2.y,
      shoulder.x, shoulder.y
    );
    
    // Apply gradient for 3D effect
    const gradient = ctx.createLinearGradient(sternum.x, sternum.y, shoulder.x, shoulder.y);
    gradient.addColorStop(0, '#F4E4C1');
    gradient.addColorStop(0.3, '#EDD9B5');
    gradient.addColorStop(0.7, '#E8D4B0');
    gradient.addColorStop(1, '#D4C4A0');
    
    ctx.strokeStyle = gradient;
    ctx.stroke();
    
    // Add bone ends (sternoclavicular and acromioclavicular joints)
    ctx.fillStyle = '#E8D4B0';
    ctx.beginPath();
    ctx.arc(sternum.x, sternum.y, thickness * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(shoulder.x, shoulder.y, thickness * 0.8, 0, Math.PI * 2);
    ctx.fill();
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
    const oppositeShoulderIndex = side === 'left' ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
    const hipIndex = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
    const elbowIndex = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    
    const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
    const oppositeShoulder = getLandmarkPosition(landmarks, oppositeShoulderIndex, width, height);
    const hip = getLandmarkPosition(landmarks, hipIndex, width, height);
    const elbow = getLandmarkPosition(landmarks, elbowIndex, width, height);
    
    if (!shoulder || !oppositeShoulder || !hip) return;
    
    const shoulderWidth = getDistance(shoulder, oppositeShoulder);
    const torsoHeight = hip ? getDistance(shoulder, hip) : shoulderWidth * 1.5;
    
    // Anatomically correct scapula dimensions and position
    const scapulaWidth = shoulderWidth * 0.35;
    const scapulaHeight = torsoHeight * 0.4;
    
    // Position scapula on the posterior thorax (T2-T7)
    // The acromion process should align with the shoulder point
    const acromionX = shoulder.x;
    const acromionY = shoulder.y;
    
    // Calculate spine position (medial border should be about 3 inches from spine)
    const spineX = (shoulder.x + oppositeShoulder.x) / 2;
    const medialOffset = shoulderWidth * 0.15; // Distance from spine to medial border
    
    // Superior angle (top point of scapula)
    const superiorAngle = {
      x: spineX + (side === 'left' ? -medialOffset : medialOffset),
      y: acromionY - scapulaHeight * 0.1
    };
    
    // Inferior angle (bottom point of scapula)
    const inferiorAngle = {
      x: spineX + (side === 'left' ? -medialOffset * 1.2 : medialOffset * 1.2),
      y: acromionY + scapulaHeight * 0.8
    };
    
    // Lateral angle (glenoid cavity area)
    const lateralAngle = {
      x: acromionX + (side === 'left' ? -scapulaWidth * 0.1 : scapulaWidth * 0.1),
      y: acromionY + scapulaHeight * 0.15
    };
    
    // Draw scapula body
    ctx.save();
    ctx.globalAlpha = 0.8;
    
    // Main triangular body
    ctx.beginPath();
    ctx.fillStyle = '#D4C4A0';
    ctx.moveTo(superiorAngle.x, superiorAngle.y);
    ctx.lineTo(inferiorAngle.x, inferiorAngle.y);
    ctx.lineTo(lateralAngle.x, lateralAngle.y);
    ctx.closePath();
    
    // Apply gradient for depth
    const gradient = ctx.createLinearGradient(
      superiorAngle.x, superiorAngle.y,
      lateralAngle.x, lateralAngle.y
    );
    gradient.addColorStop(0, '#E8D4B0');
    gradient.addColorStop(0.5, '#DCC8A8');
    gradient.addColorStop(1, '#C4B4A0');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw spine of scapula (ridge across posterior surface)
    ctx.beginPath();
    ctx.strokeStyle = '#C4B4A0';
    ctx.lineWidth = 3;
    
    const spineStart = interpolatePoint(superiorAngle, inferiorAngle, 0.3);
    if (spineStart) {
      ctx.moveTo(spineStart.x, spineStart.y);
      ctx.lineTo(acromionX, acromionY);
      ctx.stroke();
    }
    
    // Draw acromion process
    ctx.beginPath();
    ctx.fillStyle = '#DCC8A8';
    ctx.arc(acromionX, acromionY, scapulaWidth * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw glenoid cavity (shoulder socket)
    ctx.beginPath();
    ctx.fillStyle = '#C0A080';
    ctx.arc(lateralAngle.x, lateralAngle.y, scapulaWidth * 0.06, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private renderDeltoid(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, side: 'left' | 'right', color: string) {
    const shoulderIndex = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
    const elbowIndex = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    const oppositeShoulderIndex = side === 'left' ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
    
    const shoulder = getLandmarkPosition(landmarks, shoulderIndex, width, height);
    const elbow = getLandmarkPosition(landmarks, elbowIndex, width, height);
    const oppositeShoulder = getLandmarkPosition(landmarks, oppositeShoulderIndex, width, height);
    
    if (!shoulder || !elbow) return;
    
    const armLength = getDistance(shoulder, elbow);
    const shoulderWidth = oppositeShoulder ? getDistance(shoulder, oppositeShoulder) : armLength;
    const insertionPoint = interpolatePoint(shoulder, elbow, 0.35); // Deltoid inserts about 1/3 down humerus
    
    if (!insertionPoint) return;
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    
    // Deltoid has three heads: anterior, middle, and posterior
    // Draw as a cap over the shoulder joint
    
    // Anterior deltoid (front)
    ctx.beginPath();
    const anteriorOrigin = {
      x: shoulder.x + (side === 'left' ? -shoulderWidth * 0.08 : shoulderWidth * 0.08),
      y: shoulder.y - armLength * 0.1
    };
    ctx.moveTo(anteriorOrigin.x, anteriorOrigin.y);
    ctx.quadraticCurveTo(
      shoulder.x,
      shoulder.y - armLength * 0.05,
      insertionPoint.x - armLength * 0.05,
      insertionPoint.y
    );
    ctx.lineTo(insertionPoint.x, insertionPoint.y);
    ctx.quadraticCurveTo(
      shoulder.x - armLength * 0.1,
      shoulder.y,
      anteriorOrigin.x,
      anteriorOrigin.y
    );
    ctx.fill();
    
    // Middle deltoid (lateral)
    ctx.beginPath();
    const middleOrigin = {
      x: shoulder.x,
      y: shoulder.y - armLength * 0.12
    };
    ctx.moveTo(middleOrigin.x, middleOrigin.y);
    ctx.quadraticCurveTo(
      shoulder.x + (side === 'left' ? -armLength * 0.15 : armLength * 0.15),
      shoulder.y,
      insertionPoint.x,
      insertionPoint.y
    );
    ctx.lineTo(insertionPoint.x + armLength * 0.03, insertionPoint.y);
    ctx.quadraticCurveTo(
      shoulder.x + (side === 'left' ? -armLength * 0.08 : armLength * 0.08),
      shoulder.y - armLength * 0.05,
      middleOrigin.x,
      middleOrigin.y
    );
    ctx.fill();
    
    // Posterior deltoid (back)
    ctx.beginPath();
    const posteriorOrigin = {
      x: shoulder.x + (side === 'left' ? armLength * 0.08 : -armLength * 0.08),
      y: shoulder.y - armLength * 0.08
    };
    ctx.moveTo(posteriorOrigin.x, posteriorOrigin.y);
    ctx.quadraticCurveTo(
      shoulder.x + (side === 'left' ? armLength * 0.05 : -armLength * 0.05),
      shoulder.y,
      insertionPoint.x + armLength * 0.05,
      insertionPoint.y
    );
    ctx.lineTo(insertionPoint.x, insertionPoint.y);
    ctx.quadraticCurveTo(
      shoulder.x,
      shoulder.y - armLength * 0.03,
      posteriorOrigin.x,
      posteriorOrigin.y
    );
    ctx.fill();
    
    ctx.restore();
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