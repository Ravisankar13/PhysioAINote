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

  // Override render method to include spine, ribcage, and pelvis
  render(context: RenderContext) {
    const { ctx, landmarks, width, height } = context;
    
    // Check if landmarks are available
    if (!landmarks || landmarks.length === 0) return;
    
    // Always render pelvis, spine and ribcage first (behind everything else)
    this.renderPelvis(ctx, landmarks, width, height);
    this.renderSpine(ctx, landmarks, width, height);
    this.renderRibcage(ctx, landmarks, width, height);
    
    // Then render the regular anatomy structures
    super.render(context);
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
    const scapulaWidth = shoulderWidth * 0.25;  // Keep width smaller
    const scapulaHeight = torsoHeight * 0.4;    // Restore original height
    
    // Position scapula on the posterior thorax (T2-T7)
    // The acromion process should align with the shoulder point
    const acromionX = shoulder.x;
    const acromionY = shoulder.y;
    
    // Calculate spine position (medial border should be about 3 inches from spine)
    const spineX = (shoulder.x + oppositeShoulder.x) / 2;
    const medialOffset = shoulderWidth * 0.18; // Increased distance from spine to prevent overlap
    
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
    ctx.lineWidth = 2;  // Reduced from 3
    
    const spineStart = interpolatePoint(superiorAngle, inferiorAngle, 0.3);
    if (spineStart) {
      ctx.moveTo(spineStart.x, spineStart.y);
      ctx.lineTo(acromionX, acromionY);
      ctx.stroke();
    }
    
    // Draw acromion process
    ctx.beginPath();
    ctx.fillStyle = '#DCC8A8';
    ctx.arc(acromionX, acromionY, scapulaWidth * 0.06, 0, Math.PI * 2);  // Reduced from 0.08
    ctx.fill();
    
    // Draw glenoid cavity (shoulder socket)
    ctx.beginPath();
    ctx.fillStyle = '#C0A080';
    ctx.arc(lateralAngle.x, lateralAngle.y, scapulaWidth * 0.05, 0, Math.PI * 2);  // Reduced from 0.06
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

  private renderSpine(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number) {
    const leftShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, width, height);
    const rightShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    const leftHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_HIP, width, height);
    const rightHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_HIP, width, height);
    const nose = getLandmarkPosition(landmarks, POSE_LANDMARKS.NOSE, width, height);
    const leftEar = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_EAR, width, height);
    const rightEar = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_EAR, width, height);
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;
    
    // Calculate spine position (midline of the body)
    const shoulderMidpoint = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    const hipMidpoint = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP, width, height);
    
    if (!shoulderMidpoint || !hipMidpoint) return;
    
    // Calculate skull base position (where spine connects to head)
    let skullBase: { x: number, y: number };
    if (leftEar && rightEar) {
      // Use ears to estimate skull base
      skullBase = {
        x: (leftEar.x + rightEar.x) / 2,
        y: (leftEar.y + rightEar.y) / 2 + getDistance(leftEar, rightEar) * 0.2
      };
    } else if (nose) {
      // Fallback to nose position
      skullBase = {
        x: nose.x,
        y: nose.y + getDistance(leftShoulder, rightShoulder) * 0.2
      };
    } else {
      // Estimate from shoulders
      skullBase = {
        x: shoulderMidpoint.x,
        y: shoulderMidpoint.y - getDistance(leftShoulder, rightShoulder) * 0.4
      };
    }
    
    ctx.save();
    
    // Define spine curve control points for natural S-curve
    const shoulderWidth = getDistance(leftShoulder, rightShoulder);
    
    // Control points for the spine's natural curves
    const cervicalCP = {
      x: skullBase.x + shoulderWidth * 0.05, // Forward curve (lordosis)
      y: skullBase.y + (shoulderMidpoint.y - skullBase.y) * 0.3
    };
    
    const thoracicCP = {
      x: shoulderMidpoint.x - shoulderWidth * 0.03, // Backward curve (kyphosis)
      y: shoulderMidpoint.y + (hipMidpoint.y - shoulderMidpoint.y) * 0.3
    };
    
    const lumbarCP = {
      x: hipMidpoint.x + shoulderWidth * 0.04, // Forward curve (lordosis)
      y: hipMidpoint.y - (hipMidpoint.y - shoulderMidpoint.y) * 0.2
    };
    
    // Draw the spine curve path first (as a guide)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200, 180, 150, 0.3)';
    ctx.lineWidth = shoulderWidth * 0.02;
    ctx.moveTo(skullBase.x, skullBase.y);
    ctx.bezierCurveTo(
      cervicalCP.x, cervicalCP.y,
      shoulderMidpoint.x, shoulderMidpoint.y - shoulderWidth * 0.1,
      shoulderMidpoint.x, shoulderMidpoint.y
    );
    ctx.bezierCurveTo(
      thoracicCP.x, thoracicCP.y,
      lumbarCP.x, lumbarCP.y,
      hipMidpoint.x, hipMidpoint.y
    );
    ctx.stroke();
    
    // Draw vertebrae along the curved path
    const vertebraeCount = 24; // 7 cervical + 12 thoracic + 5 lumbar
    
    for (let i = 0; i < vertebraeCount; i++) {
      const t = i / (vertebraeCount - 1);
      
      // Calculate position along the curved spine
      let vertebraPos: { x: number, y: number };
      let vertebraWidth: number;
      
      if (i < 7) {
        // Cervical vertebrae (C1-C7)
        const cervicalT = i / 6; // 0 to 1 for C1 to C7
        const startY = skullBase.y;
        const endY = shoulderMidpoint.y;
        
        // Create continuous lordotic curve that connects smoothly to thoracic
        // The curve peaks forward at C4-C5 and transitions back toward thoracic spine
        const curveDepth = shoulderWidth * 0.12;
        let curveAmount: number;
        
        if (i <= 4) {
          // C1-C5: Progressive forward curve
          curveAmount = curveDepth * Math.sin(cervicalT * Math.PI * 0.8);
        } else {
          // C6-C7: Transition back toward thoracic alignment
          const transitionT = (i - 4) / 2;
          curveAmount = curveDepth * Math.sin((1 - transitionT * 0.3) * Math.PI * 0.8);
        }
        
        // Use consistent midpoint reference for all spine sections
        vertebraPos = {
          x: shoulderMidpoint.x + curveAmount, // Forward curve from shoulder midpoint
          y: startY + (endY - startY) * cervicalT
        };
        
        // C1-C2 are smaller and more ring-like, C3-C7 gradually increase in size
        if (i === 0) {
          // C1 (Atlas) - smaller, ring-shaped
          vertebraWidth = shoulderWidth * 0.025;
        } else if (i === 1) {
          // C2 (Axis) - slightly larger
          vertebraWidth = shoulderWidth * 0.028;
        } else {
          // C3-C7 - progressively larger, matching thoracic transition
          vertebraWidth = shoulderWidth * (0.03 + (i - 2) * 0.003);
        }
      } else if (i < 19) {
        // Thoracic vertebrae (T1-T12)
        const thoracicT = (i - 7) / 12;
        const startY = shoulderMidpoint.y;
        const endY = shoulderMidpoint.y + (hipMidpoint.y - shoulderMidpoint.y) * 0.7;
        
        // Kyphotic curve (backward) - smooth transition from cervical
        const kyphoticDepth = shoulderWidth * 0.06;
        const curveAmount = -kyphoticDepth * Math.sin(thoracicT * Math.PI);
        
        vertebraPos = {
          x: shoulderMidpoint.x + curveAmount, // Backward curve from midpoint
          y: startY + (endY - startY) * thoracicT
        };
        vertebraWidth = shoulderWidth * 0.04;
      } else {
        // Lumbar vertebrae (L1-L5)
        const lumbarT = (i - 19) / 5;
        const startY = shoulderMidpoint.y + (hipMidpoint.y - shoulderMidpoint.y) * 0.7;
        const endY = hipMidpoint.y;
        
        // Lordotic curve (forward) - smooth transition from thoracic
        const lordoticDepth = shoulderWidth * 0.08;
        const curveAmount = lordoticDepth * Math.sin(lumbarT * Math.PI * 0.7);
        
        vertebraPos = {
          x: shoulderMidpoint.x + curveAmount, // Forward curve from midpoint
          y: startY + (endY - startY) * lumbarT
        };
        vertebraWidth = shoulderWidth * 0.05;
      }
      
      // Draw vertebral body
      ctx.beginPath();
      ctx.fillStyle = '#E8D4B0';
      ctx.strokeStyle = '#D4C4A0';
      ctx.lineWidth = 1;
      
      // Adjust vertebra height and shape based on region
      let vertebraHeight = shoulderWidth * 0.025;
      let rotation = 0; // Rotation angle for vertebra orientation
      
      if (i < 7) {
        // Cervical vertebrae are more horizontal and smaller
        vertebraHeight = shoulderWidth * 0.02;
        // C1-C2 are more horizontal, gradually become vertical
        rotation = (1 - i / 7) * 0.3; // More rotation for upper cervical
        
        // Draw cervical vertebra with proper orientation
        ctx.save();
        ctx.translate(vertebraPos.x, vertebraPos.y);
        ctx.rotate(rotation);
        
        if (i === 0) {
          // C1 (Atlas) - ring-shaped
          ctx.beginPath();
          ctx.arc(0, 0, vertebraWidth * 0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, vertebraWidth * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // C2-C7 - more typical vertebral shape
          ctx.roundRect(
            -vertebraWidth / 2,
            -vertebraHeight / 2,
            vertebraWidth,
            vertebraHeight,
            2
          );
          ctx.fill();
          ctx.stroke();
        }
        
        ctx.restore();
      } else {
        // Thoracic and lumbar vertebrae
        ctx.roundRect(
          vertebraPos.x - vertebraWidth / 2,
          vertebraPos.y - vertebraHeight / 2,
          vertebraWidth,
          vertebraHeight,
          2
        );
        ctx.fill();
        ctx.stroke();
      }
      
      // Draw spinous process (posterior projection)
      ctx.beginPath();
      ctx.strokeStyle = '#C4B4A0';
      ctx.lineWidth = 1.5;
      ctx.moveTo(vertebraPos.x, vertebraPos.y);
      
      // Spinous processes point in different directions based on region
      let processEndX = vertebraPos.x;
      let processEndY = vertebraPos.y;
      
      if (i < 7) {
        // Cervical - bifid (split) spinous processes, point backward
        processEndX = vertebraPos.x - vertebraWidth * 0.4;
        processEndY = vertebraPos.y - vertebraHeight * 0.1;
        
        // Draw bifid process for C2-C6
        if (i > 0 && i < 6) {
          ctx.moveTo(vertebraPos.x, vertebraPos.y);
          ctx.lineTo(processEndX, processEndY - 1);
          ctx.moveTo(vertebraPos.x, vertebraPos.y);
          ctx.lineTo(processEndX, processEndY + 1);
        } else {
          ctx.lineTo(processEndX, processEndY);
        }
      } else if (i < 19) {
        // Thoracic - point more sharply down
        processEndX -= vertebraWidth * 0.2;
        processEndY += vertebraHeight * 0.3;
        ctx.lineTo(processEndX, processEndY);
      } else {
        // Lumbar - point straight back
        processEndX -= vertebraWidth * 0.4;
        ctx.lineTo(processEndX, processEndY);
      }
      
      ctx.stroke();
      
      // Draw intervertebral disc between vertebrae for smooth transitions
      if (i < vertebraeCount - 1) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(150, 150, 200, 0.3)';
        ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
        ctx.lineWidth = 1;
        
        // Calculate next vertebra position for disc placement
        let nextVertebraPos: { x: number, y: number };
        const nextI = i + 1;
        
        if (nextI < 7) {
          // Next is cervical
          const nextCervicalT = nextI / 6;
          const nextY = skullBase.y + (shoulderMidpoint.y - skullBase.y) * nextCervicalT;
          let nextCurveAmount: number;
          
          if (nextI <= 4) {
            nextCurveAmount = shoulderWidth * 0.12 * Math.sin(nextCervicalT * Math.PI * 0.8);
          } else {
            const transitionT = (nextI - 4) / 2;
            nextCurveAmount = shoulderWidth * 0.12 * Math.sin((1 - transitionT * 0.3) * Math.PI * 0.8);
          }
          
          nextVertebraPos = {
            x: shoulderMidpoint.x + nextCurveAmount,
            y: nextY
          };
        } else if (nextI < 19) {
          // Next is thoracic
          const nextThoracicT = (nextI - 7) / 12;
          const nextY = shoulderMidpoint.y + (shoulderMidpoint.y + (hipMidpoint.y - shoulderMidpoint.y) * 0.7 - shoulderMidpoint.y) * nextThoracicT;
          const nextCurveAmount = -shoulderWidth * 0.06 * Math.sin(nextThoracicT * Math.PI);
          
          nextVertebraPos = {
            x: shoulderMidpoint.x + nextCurveAmount,
            y: nextY
          };
        } else {
          // Next is lumbar
          const nextLumbarT = (nextI - 19) / 5;
          const startY = shoulderMidpoint.y + (hipMidpoint.y - shoulderMidpoint.y) * 0.7;
          const nextY = startY + (hipMidpoint.y - startY) * nextLumbarT;
          const nextCurveAmount = shoulderWidth * 0.08 * Math.sin(nextLumbarT * Math.PI * 0.7);
          
          nextVertebraPos = {
            x: shoulderMidpoint.x + nextCurveAmount,
            y: nextY
          };
        }
        
        // Draw disc at midpoint between vertebrae
        const discX = (vertebraPos.x + nextVertebraPos.x) / 2;
        const discY = (vertebraPos.y + nextVertebraPos.y) / 2;
        const discWidth = vertebraWidth * 0.7;
        const discHeight = Math.abs(nextVertebraPos.y - vertebraPos.y) * 0.3;
        
        ctx.ellipse(discX, discY, discWidth / 2, discHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  private renderRibcage(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number) {
    const leftShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, width, height);
    const rightShoulder = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    const leftHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_HIP, width, height);
    const rightHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_HIP, width, height);
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;
    
    const shoulderWidth = getDistance(leftShoulder, rightShoulder);
    const torsoHeight = getDistance(leftShoulder, leftHip);
    const shoulderMidpoint = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, width, height);
    
    if (!shoulderMidpoint) return;
    
    ctx.save();
    
    // Draw sternum first (behind ribs)
    ctx.fillStyle = '#E8D4B0';
    ctx.strokeStyle = '#C4B4A0';
    ctx.lineWidth = 2;
    
    // Position sternum between clavicles
    const sternumTop = shoulderMidpoint.y - shoulderWidth * 0.02; // Just below clavicles
    const sternumBottom = shoulderMidpoint.y + torsoHeight * 0.35; // End at mid-chest
    const sternumWidth = shoulderWidth * 0.06;
    
    // Draw sternum body (manubrium, body, xiphoid)
    ctx.beginPath();
    ctx.roundRect(
      shoulderMidpoint.x - sternumWidth / 2,
      sternumTop,
      sternumWidth,
      sternumBottom - sternumTop,
      3
    );
    ctx.fill();
    ctx.stroke();
    
    // Draw xiphoid process
    ctx.beginPath();
    ctx.fillStyle = '#D4C4A0';
    ctx.moveTo(shoulderMidpoint.x - sternumWidth * 0.25, sternumBottom);
    ctx.lineTo(shoulderMidpoint.x + sternumWidth * 0.25, sternumBottom);
    ctx.lineTo(shoulderMidpoint.x, sternumBottom + shoulderWidth * 0.02);
    ctx.closePath();
    ctx.fill();
    
    // Draw 12 pairs of ribs
    ctx.strokeStyle = '#D4C4A0';
    
    // Calculate where thoracic vertebrae would be (T1-T12)
    const thoracicStartY = shoulderMidpoint.y;
    const thoracicEndY = shoulderMidpoint.y + torsoHeight * 0.5;
    
    for (let i = 0; i < 12; i++) {
      // Calculate vertebra attachment point for this rib
      const vertebraY = thoracicStartY + (thoracicEndY - thoracicStartY) * (i / 11);
      const spineX = shoulderMidpoint.x - shoulderWidth * 0.03; // Spine is slightly behind midline
      
      // Calculate rib parameters
      let ribWidth: number;
      let downwardAngle: number;
      let forwardCurve: number;
      
      if (i === 0) {
        // First rib - most horizontal, narrowest
        ribWidth = shoulderWidth * 0.45;
        downwardAngle = 0.1;
        forwardCurve = 0.15;
      } else if (i < 7) {
        // True ribs (2-7) - progressively wider and more angled
        ribWidth = shoulderWidth * (0.5 + i * 0.06);
        downwardAngle = 0.15 + i * 0.03;
        forwardCurve = 0.2 + i * 0.02;
      } else if (i < 10) {
        // False ribs (8-10) - start to narrow, steeper angle
        ribWidth = shoulderWidth * (0.85 - (i - 7) * 0.08);
        downwardAngle = 0.35 + (i - 7) * 0.05;
        forwardCurve = 0.3;
      } else {
        // Floating ribs (11-12) - shortest, don't reach front
        ribWidth = shoulderWidth * (0.4 - (i - 10) * 0.05);
        downwardAngle = 0.5;
        forwardCurve = 0.2;
      }
      
      // Draw left rib
      ctx.beginPath();
      ctx.lineWidth = 3 - i * 0.2; // Ribs get thinner as they go down
      
      // Start from spine
      ctx.moveTo(spineX, vertebraY);
      
      // Calculate rib path with proper 3D curvature
      const leftRibMidX = spineX - ribWidth * 0.5;
      const leftRibMidY = vertebraY + shoulderWidth * downwardAngle * 0.5;
      
      // Control points for posterior curve (curves backward first)
      const leftCP1 = {
        x: spineX - ribWidth * 0.2,
        y: vertebraY - shoulderWidth * 0.01
      };
      
      // Control point for lateral curve
      const leftCP2 = {
        x: leftRibMidX - ribWidth * 0.1,
        y: leftRibMidY
      };
      
      // End point (curves forward at the front)
      const leftEndX = shoulderMidpoint.x - (i < 10 ? shoulderWidth * 0.03 : ribWidth * 0.3);
      const leftEndY = vertebraY + shoulderWidth * downwardAngle;
      
      // Draw the rib curve
      ctx.bezierCurveTo(
        leftCP1.x, leftCP1.y,
        leftCP2.x, leftCP2.y,
        leftRibMidX, leftRibMidY
      );
      
      // Continue curve to front
      if (i < 10) {
        // Ribs that connect to sternum or cartilage
        const leftCP3 = {
          x: leftRibMidX + ribWidth * forwardCurve,
          y: leftEndY - shoulderWidth * 0.02
        };
        
        ctx.quadraticCurveTo(
          leftCP3.x, leftCP3.y,
          leftEndX, leftEndY
        );
        
        // Connect true ribs directly to sternum
        if (i < 7) {
          const sternumAttachY = sternumTop + (sternumBottom - sternumTop) * ((i + 1) / 7);
          ctx.lineTo(shoulderMidpoint.x - sternumWidth * 0.6, sternumAttachY);
        }
      }
      
      ctx.stroke();
      
      // Draw right rib (mirror of left)
      ctx.beginPath();
      ctx.moveTo(spineX, vertebraY);
      
      const rightRibMidX = spineX + ribWidth * 0.5;
      const rightRibMidY = vertebraY + shoulderWidth * downwardAngle * 0.5;
      
      const rightCP1 = {
        x: spineX + ribWidth * 0.2,
        y: vertebraY - shoulderWidth * 0.01
      };
      
      const rightCP2 = {
        x: rightRibMidX + ribWidth * 0.1,
        y: rightRibMidY
      };
      
      const rightEndX = shoulderMidpoint.x + (i < 10 ? shoulderWidth * 0.03 : ribWidth * 0.3);
      const rightEndY = vertebraY + shoulderWidth * downwardAngle;
      
      ctx.bezierCurveTo(
        rightCP1.x, rightCP1.y,
        rightCP2.x, rightCP2.y,
        rightRibMidX, rightRibMidY
      );
      
      if (i < 10) {
        const rightCP3 = {
          x: rightRibMidX - ribWidth * forwardCurve,
          y: rightEndY - shoulderWidth * 0.02
        };
        
        ctx.quadraticCurveTo(
          rightCP3.x, rightCP3.y,
          rightEndX, rightEndY
        );
        
        if (i < 7) {
          const sternumAttachY = sternumTop + (sternumBottom - sternumTop) * ((i + 1) / 7);
          ctx.lineTo(shoulderMidpoint.x + sternumWidth * 0.6, sternumAttachY);
        }
      }
      
      ctx.stroke();
      
      // Draw costal cartilage for false ribs (8-10)
      if (i >= 7 && i < 10) {
        ctx.save();
        ctx.strokeStyle = 'rgba(150, 150, 200, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        
        // Connect false ribs to the costal margin
        const cartilageAttachY = sternumBottom - shoulderWidth * 0.02;
        
        // Left cartilage
        ctx.beginPath();
        ctx.moveTo(leftEndX, leftEndY);
        ctx.quadraticCurveTo(
          shoulderMidpoint.x - shoulderWidth * 0.08,
          cartilageAttachY - shoulderWidth * 0.02,
          shoulderMidpoint.x - shoulderWidth * 0.04,
          cartilageAttachY
        );
        ctx.stroke();
        
        // Right cartilage
        ctx.beginPath();
        ctx.moveTo(rightEndX, rightEndY);
        ctx.quadraticCurveTo(
          shoulderMidpoint.x + shoulderWidth * 0.08,
          cartilageAttachY - shoulderWidth * 0.02,
          shoulderMidpoint.x + shoulderWidth * 0.04,
          cartilageAttachY
        );
        ctx.stroke();
        
        ctx.restore();
      }
    }
    
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

  private renderPelvis(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number) {
    const leftHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.LEFT_HIP, width, height);
    const rightHip = getLandmarkPosition(landmarks, POSE_LANDMARKS.RIGHT_HIP, width, height);
    
    if (!leftHip || !rightHip) return;
    
    const hipWidth = getDistance(leftHip, rightHip);
    const hipMidpoint = getMidpoint(landmarks, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP, width, height);
    
    if (!hipMidpoint) return;
    
    ctx.save();
    
    // Draw sacrum (triangular bone at base of spine, between hip bones)
    ctx.fillStyle = '#D4C4A0';
    ctx.strokeStyle = '#C4B4A0';
    ctx.lineWidth = 2;
    
    // Sacrum is wedge-shaped and tilted backward
    const sacrumTop = hipMidpoint.y - hipWidth * 0.25;
    const sacrumBottom = hipMidpoint.y + hipWidth * 0.02;
    const sacrumTopWidth = hipWidth * 0.18;
    const sacrumBottomWidth = hipWidth * 0.12;
    
    ctx.beginPath();
    // Top of sacrum (connects to L5 vertebra)
    ctx.moveTo(hipMidpoint.x - sacrumTopWidth / 2, sacrumTop);
    ctx.lineTo(hipMidpoint.x + sacrumTopWidth / 2, sacrumTop);
    
    // Sacroiliac joints (where sacrum meets ilium)
    ctx.lineTo(hipMidpoint.x + sacrumBottomWidth / 2, sacrumBottom);
    ctx.lineTo(hipMidpoint.x - sacrumBottomWidth / 2, sacrumBottom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw sacral foramina (holes in sacrum)
    ctx.fillStyle = 'rgba(200, 180, 160, 0.5)';
    for (let i = 0; i < 4; i++) {
      const y = sacrumTop + (sacrumBottom - sacrumTop) * (0.2 + i * 0.2);
      ctx.beginPath();
      ctx.arc(hipMidpoint.x - sacrumTopWidth * 0.15, y, hipWidth * 0.008, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hipMidpoint.x + sacrumTopWidth * 0.15, y, hipWidth * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw coccyx (tailbone - smaller triangular bone)
    ctx.beginPath();
    ctx.fillStyle = '#C4B4A0';
    ctx.moveTo(hipMidpoint.x - sacrumBottomWidth * 0.4, sacrumBottom);
    ctx.lineTo(hipMidpoint.x + sacrumBottomWidth * 0.4, sacrumBottom);
    ctx.lineTo(hipMidpoint.x, sacrumBottom + hipWidth * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw left innominate bone
    this.renderInnominate(ctx, leftHip, hipMidpoint, hipWidth, 'left');
    
    // Draw right innominate bone
    this.renderInnominate(ctx, rightHip, hipMidpoint, hipWidth, 'right');
    
    // Draw pubic symphysis (connection between pubic bones)
    ctx.beginPath();
    ctx.fillStyle = 'rgba(150, 150, 200, 0.5)';
    ctx.strokeStyle = '#8888AA';
    ctx.lineWidth = 1;
    
    const pubicY = hipMidpoint.y + hipWidth * 0.12;
    ctx.roundRect(
      hipMidpoint.x - hipWidth * 0.03,
      pubicY - hipWidth * 0.02,
      hipWidth * 0.06,
      hipWidth * 0.04,
      2
    );
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
  
  private renderInnominate(ctx: CanvasRenderingContext2D, hipJoint: { x: number, y: number }, 
                           hipMidpoint: { x: number, y: number }, hipWidth: number, side: 'left' | 'right') {
    const sideMultiplier = side === 'left' ? -1 : 1;
    
    ctx.save();
    ctx.fillStyle = '#E8D4B0';
    ctx.strokeStyle = '#D4C4A0';
    ctx.lineWidth = 2;
    
    // Anatomically correct ilium (large wing-like bone)
    ctx.beginPath();
    
    // Iliac crest (top of hip bone - should be wider and more lateral)
    const iliacCrestTop = {
      x: hipJoint.x + sideMultiplier * hipWidth * 0.6,
      y: hipJoint.y - hipWidth * 0.5
    };
    
    // ASIS (Anterior Superior Iliac Spine - front point)
    const asisPoint = {
      x: hipJoint.x + sideMultiplier * hipWidth * 0.4,
      y: hipJoint.y - hipWidth * 0.15
    };
    
    // PSIS (Posterior Superior Iliac Spine - connects to sacrum)
    const psisPoint = {
      x: hipMidpoint.x + sideMultiplier * hipWidth * 0.15,
      y: hipJoint.y - hipWidth * 0.25
    };
    
    // Iliac fossa (inner curve of ilium)
    const iliacFossaPoint = {
      x: hipJoint.x + sideMultiplier * hipWidth * 0.3,
      y: hipJoint.y - hipWidth * 0.35
    };
    
    // Draw ilium wing with proper anatomical shape
    ctx.moveTo(psisPoint.x, psisPoint.y);
    
    // From PSIS to iliac crest (posterior section)
    ctx.bezierCurveTo(
      hipJoint.x + sideMultiplier * hipWidth * 0.25,
      hipJoint.y - hipWidth * 0.45,
      hipJoint.x + sideMultiplier * hipWidth * 0.5,
      hipJoint.y - hipWidth * 0.55,
      iliacCrestTop.x,
      iliacCrestTop.y
    );
    
    // Iliac crest to ASIS (anterior section with characteristic S-curve)
    ctx.bezierCurveTo(
      hipJoint.x + sideMultiplier * hipWidth * 0.55,
      hipJoint.y - hipWidth * 0.35,
      hipJoint.x + sideMultiplier * hipWidth * 0.45,
      hipJoint.y - hipWidth * 0.2,
      asisPoint.x,
      asisPoint.y
    );
    
    // ASIS to acetabulum (descending to hip socket)
    ctx.quadraticCurveTo(
      hipJoint.x + sideMultiplier * hipWidth * 0.2,
      hipJoint.y - hipWidth * 0.05,
      hipJoint.x + sideMultiplier * hipWidth * 0.08,
      hipJoint.y - hipWidth * 0.02
    );
    
    // Inner edge back to PSIS (medial border)
    ctx.bezierCurveTo(
      hipJoint.x + sideMultiplier * hipWidth * 0.05,
      hipJoint.y - hipWidth * 0.1,
      hipMidpoint.x + sideMultiplier * hipWidth * 0.1,
      hipJoint.y - hipWidth * 0.15,
      psisPoint.x,
      psisPoint.y
    );
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw acetabulum (hip socket) - positioned correctly at hip joint
    ctx.beginPath();
    ctx.fillStyle = '#C4B4A0';
    ctx.strokeStyle = '#B4A490';
    ctx.lineWidth = 2;
    
    // Acetabulum is a deep socket where femur connects
    ctx.arc(hipJoint.x, hipJoint.y, hipWidth * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw acetabular labrum (rim of socket)
    ctx.beginPath();
    ctx.strokeStyle = '#A49480';
    ctx.lineWidth = 3;
    ctx.arc(hipJoint.x, hipJoint.y, hipWidth * 0.08, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw femoral head in the socket
    ctx.beginPath();
    ctx.fillStyle = '#F0E4D0';
    ctx.strokeStyle = '#E0D4C0';
    ctx.lineWidth = 1;
    ctx.arc(hipJoint.x, hipJoint.y, hipWidth * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Ischium (sits bone - lower posterior part)
    ctx.beginPath();
    ctx.fillStyle = '#E8D4B0';
    ctx.strokeStyle = '#D4C4A0';
    ctx.lineWidth = 2;
    
    // Ischial tuberosity (sitting bone)
    const ischialTuberosity = {
      x: hipJoint.x - sideMultiplier * hipWidth * 0.1,
      y: hipJoint.y + hipWidth * 0.25
    };
    
    // Ischial ramus
    const ischialRamus = {
      x: hipJoint.x - sideMultiplier * hipWidth * 0.05,
      y: hipJoint.y + hipWidth * 0.15
    };
    
    // Draw ischium body
    ctx.moveTo(hipJoint.x - sideMultiplier * hipWidth * 0.02, hipJoint.y + hipWidth * 0.05);
    
    // Descend to ischial tuberosity
    ctx.bezierCurveTo(
      hipJoint.x - sideMultiplier * hipWidth * 0.08,
      hipJoint.y + hipWidth * 0.12,
      hipJoint.x - sideMultiplier * hipWidth * 0.12,
      hipJoint.y + hipWidth * 0.2,
      ischialTuberosity.x,
      ischialTuberosity.y
    );
    
    // Curve forward to ischial ramus
    ctx.quadraticCurveTo(
      ischialTuberosity.x + sideMultiplier * hipWidth * 0.05,
      ischialTuberosity.y - hipWidth * 0.03,
      ischialRamus.x,
      ischialRamus.y
    );
    
    // Back to acetabulum
    ctx.lineTo(hipJoint.x, hipJoint.y + hipWidth * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Pubis (front lower part)
    ctx.beginPath();
    ctx.fillStyle = '#E8D4B0';
    ctx.strokeStyle = '#D4C4A0';
    ctx.lineWidth = 2;
    
    // Superior pubic ramus (connects acetabulum to pubic symphysis)
    const superiorPubicRamus = {
      x: hipMidpoint.x + sideMultiplier * hipWidth * 0.05,
      y: hipJoint.y + hipWidth * 0.08
    };
    
    // Inferior pubic ramus
    const inferiorPubicRamus = {
      x: hipMidpoint.x + sideMultiplier * hipWidth * 0.04,
      y: hipJoint.y + hipWidth * 0.18
    };
    
    // Draw pubis
    ctx.moveTo(hipJoint.x, hipJoint.y + hipWidth * 0.05);
    
    // Superior pubic ramus to pubic symphysis
    ctx.quadraticCurveTo(
      hipJoint.x - sideMultiplier * hipWidth * 0.15,
      hipJoint.y + hipWidth * 0.06,
      superiorPubicRamus.x,
      superiorPubicRamus.y
    );
    
    // Down to inferior pubic ramus
    ctx.lineTo(inferiorPubicRamus.x, inferiorPubicRamus.y);
    
    // Connect to ischial ramus
    ctx.quadraticCurveTo(
      hipJoint.x - sideMultiplier * hipWidth * 0.08,
      hipJoint.y + hipWidth * 0.17,
      ischialRamus.x,
      ischialRamus.y
    );
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw obturator foramen (large opening in pelvis)
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#C4B4A0';
    ctx.lineWidth = 2;
    
    const foramenCenter = {
      x: hipJoint.x - sideMultiplier * hipWidth * 0.08,
      y: hipJoint.y + hipWidth * 0.12
    };
    
    // Obturator foramen is oval-shaped
    ctx.ellipse(
      foramenCenter.x,
      foramenCenter.y,
      hipWidth * 0.06,
      hipWidth * 0.08,
      sideMultiplier * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
}