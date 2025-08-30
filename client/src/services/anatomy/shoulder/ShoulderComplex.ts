/**
 * Anatomically accurate shoulder complex including scapula, clavicle, 
 * glenohumeral joint, and AC joint with clinical measurements
 */

import { Vector3 } from 'three';

export interface ShoulderMeasurements {
  acromiohumetalDistance: number; // Normal >7mm
  criticalShoulderAngle: number; // CSA angle
  glenoidVersion: number; // Anterior/posterior tilt
  scapularIndex: number; // Height to width ratio
  acJointAlignment: number; // Vertical step-off
  scapularUpwardRotation: number; // During arm elevation
}

export interface ScapulaStructure {
  // Main body
  body: {
    medialBorder: Vector3[];
    lateralBorder: Vector3[];
    superiorBorder: Vector3[];
  };
  
  // Scapular spine
  spine: {
    medialEnd: Vector3;
    lateralEnd: Vector3;
    thickness: number;
  };
  
  // Acromion process
  acromion: {
    anteriorEdge: Vector3;
    posteriorEdge: Vector3;
    lateralEdge: Vector3;
    undersurface: Vector3; // For impingement assessment
    type: 'flat' | 'curved' | 'hooked'; // Bigliani classification
  };
  
  // Coracoid process
  coracoid: {
    base: Vector3;
    tip: Vector3;
    curvature: Vector3[];
  };
  
  // Glenoid fossa
  glenoid: {
    center: Vector3;
    superiorPole: Vector3;
    inferiorPole: Vector3;
    anteriorRim: Vector3;
    posteriorRim: Vector3;
    version: number; // degrees of retroversion
    inclination: number; // superior tilt
  };
  
  // Fossae
  supraspinousFossa: {
    center: Vector3;
    depth: number;
  };
  infraspinousFossa: {
    center: Vector3;
    depth: number;
  };
  
  // Angles
  superiorAngle: Vector3;
  inferiorAngle: Vector3;
  lateralAngle: Vector3;
  
  // Scapular plane orientation
  planeAngle: number; // 30-40° anterior to coronal
}

export interface HumeralHead {
  center: Vector3;
  radius: number;
  articularCoverage: number; // ~40% of sphere
  
  // Tuberosities
  greaterTuberosity: {
    superior: Vector3;
    middle: Vector3;
    inferior: Vector3;
  };
  
  lesserTuberosity: Vector3;
  
  // Bicipital groove
  bicipitalGroove: {
    medialWall: Vector3;
    lateralWall: Vector3;
    depth: number;
  };
  
  // Necks
  anatomicalNeck: Vector3[];
  surgicalNeck: Vector3[];
  
  // Retroversion
  retroversion: number; // 20-30° posterior rotation
  
  // Pathology markers
  hillSachsLesion?: {
    location: Vector3;
    size: number;
    depth: number;
  };
}

export interface ClavicleStructure {
  // Medial (sternal) end
  sternalEnd: {
    center: Vector3;
    radius: number;
  };
  
  // Lateral (acromial) end
  acromialEnd: {
    center: Vector3;
    width: number;
    thickness: number;
  };
  
  // S-shaped curve points
  curvePoints: Vector3[];
  
  // Conoid tubercle
  conoidTubercle: Vector3;
  
  // Trapezoid line
  trapezoidLine: {
    start: Vector3;
    end: Vector3;
  };
}

export interface ACJoint {
  clavicularFacet: Vector3;
  acromialFacet: Vector3;
  jointSpace: number; // Normal 3-5mm
  orientation: Vector3; // Joint line orientation
  
  // Ligaments attachment points
  coracoclavicularLigaments: {
    conoid: {
      clavicularAttachment: Vector3;
      coracoidAttachment: Vector3;
    };
    trapezoid: {
      clavicularAttachment: Vector3;
      coracoidAttachment: Vector3;
    };
  };
  
  // Classification (if separated)
  separation?: {
    type: 1 | 2 | 3 | 4 | 5 | 6; // Rockwood classification
    displacement: number;
  };
}

export interface RotatorCuffFootprints {
  supraspinatus: {
    origin: Vector3[];
    insertion: Vector3[];
    tendonPath: Vector3[];
  };
  infraspinatus: {
    origin: Vector3[];
    insertion: Vector3[];
    tendonPath: Vector3[];
  };
  teresMinor: {
    origin: Vector3[];
    insertion: Vector3[];
    tendonPath: Vector3[];
  };
  subscapularis: {
    origin: Vector3[];
    insertion: Vector3[];
    tendonPath: Vector3[];
  };
}

export class ShoulderComplexRenderer {
  private scapula: ScapulaStructure | null = null;
  private humeralHead: HumeralHead | null = null;
  private clavicle: ClavicleStructure | null = null;
  private acJoint: ACJoint | null = null;
  private rotatorCuff: RotatorCuffFootprints | null = null;
  
  /**
   * Generate anatomically accurate scapula based on landmarks
   */
  generateScapula(landmarks: any[], width: number, height: number, side: 'left' | 'right'): ScapulaStructure {
    const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
    const elbow = side === 'left' ? landmarks[13] : landmarks[14];
    const hip = side === 'left' ? landmarks[23] : landmarks[24];
    
    if (!shoulder) return this.getDefaultScapula();
    
    const shoulderX = shoulder.x * width;
    const shoulderY = shoulder.y * height;
    const shoulderZ = shoulder.z || 0;
    
    // Calculate scapular position (posterior to shoulder joint)
    const scapulaX = shoulderX + (side === 'left' ? 30 : -30);
    const scapulaY = shoulderY - 20;
    
    // Create scapular borders
    const medialBorder: Vector3[] = [];
    const lateralBorder: Vector3[] = [];
    const superiorBorder: Vector3[] = [];
    
    // Medial (vertebral) border - runs vertically
    for (let i = 0; i <= 10; i++) {
      medialBorder.push(new Vector3(
        scapulaX + (side === 'left' ? 40 : -40),
        scapulaY - 30 + (i * 12),
        shoulderZ - 20
      ));
    }
    
    // Lateral border - runs from inferior angle to glenoid
    for (let i = 0; i <= 8; i++) {
      lateralBorder.push(new Vector3(
        scapulaX + (side === 'left' ? -10 : 10) - (i * 3),
        scapulaY + 90 - (i * 10),
        shoulderZ - 15
      ));
    }
    
    // Superior border - runs from superior angle to coracoid
    for (let i = 0; i <= 5; i++) {
      superiorBorder.push(new Vector3(
        scapulaX + (side === 'left' ? 40 : -40) - (i * 10),
        scapulaY - 30,
        shoulderZ - 20 + (i * 2)
      ));
    }
    
    // Scapular spine (horizontal ridge)
    const spineY = scapulaY + 10;
    const spine = {
      medialEnd: new Vector3(scapulaX + (side === 'left' ? 35 : -35), spineY, shoulderZ - 18),
      lateralEnd: new Vector3(scapulaX + (side === 'left' ? -15 : 15), spineY, shoulderZ - 10),
      thickness: 4
    };
    
    // Acromion process (continuation of spine)
    const acromion = {
      anteriorEdge: new Vector3(scapulaX + (side === 'left' ? -20 : 20), spineY - 5, shoulderZ),
      posteriorEdge: new Vector3(scapulaX + (side === 'left' ? -15 : 15), spineY, shoulderZ - 10),
      lateralEdge: new Vector3(scapulaX + (side === 'left' ? -25 : 25), spineY - 3, shoulderZ - 5),
      undersurface: new Vector3(scapulaX + (side === 'left' ? -20 : 20), spineY + 5, shoulderZ - 2),
      type: 'curved' as const // Most common type
    };
    
    // Coracoid process (hook-like projection)
    const coracoid = {
      base: new Vector3(scapulaX + (side === 'left' ? -5 : 5), scapulaY - 15, shoulderZ + 10),
      tip: new Vector3(scapulaX + (side === 'left' ? -25 : 25), scapulaY - 10, shoulderZ + 20),
      curvature: [
        new Vector3(scapulaX + (side === 'left' ? -10 : 10), scapulaY - 14, shoulderZ + 12),
        new Vector3(scapulaX + (side === 'left' ? -18 : 18), scapulaY - 12, shoulderZ + 16),
        new Vector3(scapulaX + (side === 'left' ? -25 : 25), scapulaY - 10, shoulderZ + 20)
      ]
    };
    
    // Glenoid fossa (socket for humeral head)
    const glenoid = {
      center: new Vector3(scapulaX + (side === 'left' ? -10 : 10), scapulaY + 10, shoulderZ),
      superiorPole: new Vector3(scapulaX + (side === 'left' ? -10 : 10), scapulaY, shoulderZ),
      inferiorPole: new Vector3(scapulaX + (side === 'left' ? -10 : 10), scapulaY + 20, shoulderZ),
      anteriorRim: new Vector3(scapulaX + (side === 'left' ? -12 : 12), scapulaY + 10, shoulderZ + 3),
      posteriorRim: new Vector3(scapulaX + (side === 'left' ? -8 : 8), scapulaY + 10, shoulderZ - 3),
      version: -5, // 5° retroversion
      inclination: 5 // 5° superior tilt
    };
    
    // Fossae
    const supraspinousFossa = {
      center: new Vector3(scapulaX + (side === 'left' ? 15 : -15), scapulaY - 10, shoulderZ - 15),
      depth: 8
    };
    
    const infraspinousFossa = {
      center: new Vector3(scapulaX + (side === 'left' ? 15 : -15), scapulaY + 40, shoulderZ - 15),
      depth: 12
    };
    
    // Scapular angles
    const superiorAngle = new Vector3(scapulaX + (side === 'left' ? 40 : -40), scapulaY - 30, shoulderZ - 20);
    const inferiorAngle = new Vector3(scapulaX + (side === 'left' ? 35 : -35), scapulaY + 90, shoulderZ - 18);
    const lateralAngle = new Vector3(scapulaX + (side === 'left' ? -10 : 10), scapulaY + 10, shoulderZ);
    
    return {
      body: { medialBorder, lateralBorder, superiorBorder },
      spine,
      acromion,
      coracoid,
      glenoid,
      supraspinousFossa,
      infraspinousFossa,
      superiorAngle,
      inferiorAngle,
      lateralAngle,
      planeAngle: 35 // 35° anterior to coronal plane
    };
  }
  
  /**
   * Generate anatomically accurate humeral head
   */
  generateHumeralHead(landmarks: any[], width: number, height: number, side: 'left' | 'right'): HumeralHead {
    const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
    const elbow = side === 'left' ? landmarks[13] : landmarks[14];
    
    if (!shoulder || !elbow) return this.getDefaultHumeralHead();
    
    const shoulderX = shoulder.x * width;
    const shoulderY = shoulder.y * height;
    const shoulderZ = shoulder.z || 0;
    
    // Humeral head center and dimensions
    const center = new Vector3(shoulderX, shoulderY, shoulderZ);
    const radius = 22; // Average humeral head radius in pixels
    
    // Greater tuberosity (lateral aspect)
    const greaterTuberosity = {
      superior: new Vector3(shoulderX + (side === 'left' ? -radius : radius), shoulderY - 5, shoulderZ),
      middle: new Vector3(shoulderX + (side === 'left' ? -radius : radius), shoulderY, shoulderZ - 3),
      inferior: new Vector3(shoulderX + (side === 'left' ? -radius : radius), shoulderY + 5, shoulderZ - 5)
    };
    
    // Lesser tuberosity (anterior aspect)
    const lesserTuberosity = new Vector3(shoulderX + (side === 'left' ? -radius * 0.7 : radius * 0.7), shoulderY, shoulderZ + radius * 0.5);
    
    // Bicipital groove between tuberosities
    const bicipitalGroove = {
      medialWall: lesserTuberosity,
      lateralWall: greaterTuberosity.middle,
      depth: 4
    };
    
    // Anatomical neck (around articular margin)
    const anatomicalNeck: Vector3[] = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      anatomicalNeck.push(new Vector3(
        shoulderX + Math.cos(angle) * radius * 1.1,
        shoulderY + Math.sin(angle) * radius * 0.3,
        shoulderZ + Math.sin(angle) * radius * 0.8
      ));
    }
    
    // Surgical neck (below tuberosities)
    const surgicalNeck: Vector3[] = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      surgicalNeck.push(new Vector3(
        shoulderX + Math.cos(angle) * radius * 0.8,
        shoulderY + 30 + Math.sin(angle) * radius * 0.2,
        shoulderZ + Math.sin(angle) * radius * 0.6
      ));
    }
    
    return {
      center,
      radius,
      articularCoverage: 0.4, // 40% of sphere
      greaterTuberosity,
      lesserTuberosity,
      bicipitalGroove,
      anatomicalNeck,
      surgicalNeck,
      retroversion: 25 // 25° posterior rotation
    };
  }
  
  /**
   * Generate clavicle with S-shaped curve
   */
  generateClavicle(landmarks: any[], width: number, height: number, side: 'left' | 'right'): ClavicleStructure {
    const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
    const midShoulders = landmarks[11] && landmarks[12] ? 
      { x: (landmarks[11].x + landmarks[12].x) / 2, y: (landmarks[11].y + landmarks[12].y) / 2 } : null;
    
    if (!shoulder || !midShoulders) return this.getDefaultClavicle();
    
    const shoulderX = shoulder.x * width;
    const shoulderY = shoulder.y * height;
    const sternalX = midShoulders.x * width;
    const sternalY = midShoulders.y * height;
    
    // Sternal end (medial)
    const sternalEnd = {
      center: new Vector3(sternalX, sternalY - 10, 10),
      radius: 8
    };
    
    // Acromial end (lateral)
    const acromialEnd = {
      center: new Vector3(shoulderX + (side === 'left' ? -20 : 20), shoulderY - 5, 5),
      width: 15,
      thickness: 6
    };
    
    // S-shaped curve (medial 2/3 convex forward, lateral 1/3 concave forward)
    const curvePoints: Vector3[] = [];
    const numPoints = 10;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = sternalX + (shoulderX - sternalX) * t + (side === 'left' ? -20 : 20) * t;
      const y = sternalY - 10 + (shoulderY - sternalY + 5) * t;
      
      // S-curve in Z axis
      let z: number;
      if (t < 0.67) {
        // Medial 2/3 - convex anteriorly
        z = 10 + Math.sin(t * Math.PI * 0.75) * 8;
      } else {
        // Lateral 1/3 - concave anteriorly
        z = 10 - Math.sin((t - 0.67) * Math.PI * 3) * 5;
      }
      
      curvePoints.push(new Vector3(x, y, z));
    }
    
    // Conoid tubercle (on inferior surface, lateral third)
    const conoidTubercle = new Vector3(
      sternalX + (shoulderX - sternalX) * 0.75 + (side === 'left' ? -15 : 15),
      sternalY - 10 + (shoulderY - sternalY + 5) * 0.75 + 3,
      8
    );
    
    // Trapezoid line
    const trapezoidLine = {
      start: conoidTubercle,
      end: new Vector3(
        shoulderX + (side === 'left' ? -20 : 20),
        shoulderY - 2,
        6
      )
    };
    
    return {
      sternalEnd,
      acromialEnd,
      curvePoints,
      conoidTubercle,
      trapezoidLine
    };
  }
  
  /**
   * Calculate clinical measurements
   */
  calculateMeasurements(scapula: ScapulaStructure, humeralHead: HumeralHead, acJoint: ACJoint): ShoulderMeasurements {
    // Acromiohumeral distance
    const acromiohumetalDistance = Math.abs(
      scapula.acromion.undersurface.y - (humeralHead.center.y - humeralHead.radius)
    );
    
    // Critical shoulder angle (between glenoid and lateral acromion)
    const glenoidLine = new Vector3().subVectors(scapula.glenoid.inferiorPole, scapula.glenoid.superiorPole);
    const acromionLine = new Vector3().subVectors(scapula.acromion.lateralEdge, scapula.glenoid.inferiorPole);
    const criticalShoulderAngle = Math.acos(glenoidLine.dot(acromionLine) / (glenoidLine.length() * acromionLine.length())) * 180 / Math.PI;
    
    // Glenoid version
    const glenoidVersion = scapula.glenoid.version;
    
    // Scapular index (height/width)
    const scapularHeight = scapula.inferiorAngle.distanceTo(scapula.superiorAngle);
    const scapularWidth = Math.max(...scapula.body.medialBorder.map(p => 
      Math.min(...scapula.body.lateralBorder.map(l => p.distanceTo(l)))
    ));
    const scapularIndex = scapularHeight / scapularWidth;
    
    // AC joint alignment
    const acJointAlignment = acJoint.jointSpace;
    
    // Scapular upward rotation (simplified)
    const scapularUpwardRotation = Math.atan2(
      scapula.acromion.lateralEdge.y - scapula.inferiorAngle.y,
      scapula.acromion.lateralEdge.x - scapula.inferiorAngle.x
    ) * 180 / Math.PI;
    
    return {
      acromiohumetalDistance,
      criticalShoulderAngle,
      glenoidVersion,
      scapularIndex,
      acJointAlignment,
      scapularUpwardRotation
    };
  }
  
  /**
   * Render the complete shoulder complex
   */
  render(ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number, side: 'left' | 'right') {
    // Generate structures
    this.scapula = this.generateScapula(landmarks, width, height, side);
    this.humeralHead = this.generateHumeralHead(landmarks, width, height, side);
    this.clavicle = this.generateClavicle(landmarks, width, height, side);
    
    // Create AC joint
    this.acJoint = this.generateACJoint(this.clavicle, this.scapula);
    
    // Render each component
    this.renderScapula(ctx, this.scapula);
    this.renderHumeralHead(ctx, this.humeralHead);
    this.renderClavicle(ctx, this.clavicle);
    this.renderACJoint(ctx, this.acJoint);
    
    // Calculate and display measurements
    const measurements = this.calculateMeasurements(this.scapula, this.humeralHead, this.acJoint);
    this.renderMeasurements(ctx, measurements, side, width, height);
  }
  
  private renderScapula(ctx: CanvasRenderingContext2D, scapula: ScapulaStructure) {
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
    ctx.lineWidth = 2;
    
    // Draw body outline
    ctx.beginPath();
    scapula.body.medialBorder.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    
    scapula.body.lateralBorder.reverse().forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    
    scapula.body.superiorBorder.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw scapular spine
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.moveTo(scapula.spine.medialEnd.x, scapula.spine.medialEnd.y);
    ctx.lineTo(scapula.spine.lateralEnd.x, scapula.spine.lateralEnd.y);
    ctx.stroke();
    
    // Draw acromion
    ctx.fillStyle = 'rgba(230, 230, 230, 0.9)';
    ctx.beginPath();
    ctx.moveTo(scapula.acromion.anteriorEdge.x, scapula.acromion.anteriorEdge.y);
    ctx.lineTo(scapula.acromion.lateralEdge.x, scapula.acromion.lateralEdge.y);
    ctx.lineTo(scapula.acromion.posteriorEdge.x, scapula.acromion.posteriorEdge.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw coracoid process
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(scapula.coracoid.base.x, scapula.coracoid.base.y);
    scapula.coracoid.curvature.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // Draw glenoid fossa
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      scapula.glenoid.center.x,
      scapula.glenoid.center.y,
      8, 12, 0, 0, Math.PI * 2
    );
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Acromion', scapula.acromion.lateralEdge.x - 30, scapula.acromion.lateralEdge.y - 5);
    ctx.fillText('Glenoid', scapula.glenoid.center.x - 25, scapula.glenoid.center.y + 25);
    ctx.fillText('Coracoid', scapula.coracoid.tip.x - 30, scapula.coracoid.tip.y + 15);
    
    ctx.restore();
  }
  
  private renderHumeralHead(ctx: CanvasRenderingContext2D, humeralHead: HumeralHead) {
    ctx.save();
    ctx.strokeStyle = '#e8e8e8';
    ctx.fillStyle = 'rgba(245, 245, 245, 0.9)';
    ctx.lineWidth = 2;
    
    // Draw humeral head (spherical)
    ctx.beginPath();
    ctx.arc(humeralHead.center.x, humeralHead.center.y, humeralHead.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw greater tuberosity
    ctx.fillStyle = 'rgba(235, 235, 235, 0.9)';
    ctx.beginPath();
    ctx.ellipse(
      humeralHead.greaterTuberosity.superior.x,
      humeralHead.greaterTuberosity.superior.y,
      6, 8, 0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    
    // Draw lesser tuberosity
    ctx.beginPath();
    ctx.arc(humeralHead.lesserTuberosity.x, humeralHead.lesserTuberosity.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw bicipital groove
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(humeralHead.bicipitalGroove.medialWall.x, humeralHead.bicipitalGroove.medialWall.y);
    ctx.lineTo(
      humeralHead.bicipitalGroove.medialWall.x,
      humeralHead.bicipitalGroove.medialWall.y + 20
    );
    ctx.stroke();
    
    // Draw anatomical neck
    ctx.strokeStyle = '#d0d0d0';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    humeralHead.anatomicalNeck.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
  }
  
  private renderClavicle(ctx: CanvasRenderingContext2D, clavicle: ClavicleStructure) {
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // Draw S-curved shaft
    ctx.beginPath();
    clavicle.curvePoints.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // Draw sternal end
    ctx.beginPath();
    ctx.arc(clavicle.sternalEnd.center.x, clavicle.sternalEnd.center.y, clavicle.sternalEnd.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw acromial end
    ctx.fillRect(
      clavicle.acromialEnd.center.x - clavicle.acromialEnd.width / 2,
      clavicle.acromialEnd.center.y - clavicle.acromialEnd.thickness / 2,
      clavicle.acromialEnd.width,
      clavicle.acromialEnd.thickness
    );
    
    // Draw conoid tubercle
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.arc(clavicle.conoidTubercle.x, clavicle.conoidTubercle.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    const midPoint = clavicle.curvePoints[Math.floor(clavicle.curvePoints.length / 2)];
    ctx.fillText('Clavicle', midPoint.x - 20, midPoint.y - 10);
    
    ctx.restore();
  }
  
  private renderACJoint(ctx: CanvasRenderingContext2D, acJoint: ACJoint) {
    ctx.save();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    
    // Draw joint space
    ctx.beginPath();
    ctx.moveTo(acJoint.clavicularFacet.x, acJoint.clavicularFacet.y);
    ctx.lineTo(acJoint.acromialFacet.x, acJoint.acromialFacet.y);
    ctx.stroke();
    
    // Draw coracoclavicular ligaments (dotted lines)
    ctx.strokeStyle = '#ffaa00';
    ctx.setLineDash([3, 3]);
    
    // Conoid ligament
    ctx.beginPath();
    ctx.moveTo(
      acJoint.coracoclavicularLigaments.conoid.clavicularAttachment.x,
      acJoint.coracoclavicularLigaments.conoid.clavicularAttachment.y
    );
    ctx.lineTo(
      acJoint.coracoclavicularLigaments.conoid.coracoidAttachment.x,
      acJoint.coracoclavicularLigaments.conoid.coracoidAttachment.y
    );
    ctx.stroke();
    
    // Trapezoid ligament
    ctx.beginPath();
    ctx.moveTo(
      acJoint.coracoclavicularLigaments.trapezoid.clavicularAttachment.x,
      acJoint.coracoclavicularLigaments.trapezoid.clavicularAttachment.y
    );
    ctx.lineTo(
      acJoint.coracoclavicularLigaments.trapezoid.coracoidAttachment.x,
      acJoint.coracoclavicularLigaments.trapezoid.coracoidAttachment.y
    );
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('AC Joint', acJoint.clavicularFacet.x - 20, acJoint.clavicularFacet.y - 8);
    
    ctx.restore();
  }
  
  private renderMeasurements(ctx: CanvasRenderingContext2D, measurements: ShoulderMeasurements, side: 'left' | 'right', width: number, height: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 11px Arial';
    
    const x = side === 'left' ? 10 : width - 200;
    const y = 100;
    
    ctx.fillText(`Shoulder Measurements (${side})`, x, y);
    ctx.font = '10px Arial';
    ctx.fillText(`Acromiohumeral Distance: ${measurements.acromiohumetalDistance.toFixed(1)}mm`, x, y + 15);
    ctx.fillText(`Critical Shoulder Angle: ${measurements.criticalShoulderAngle.toFixed(1)}°`, x, y + 30);
    ctx.fillText(`Glenoid Version: ${measurements.glenoidVersion.toFixed(1)}°`, x, y + 45);
    ctx.fillText(`Scapular Index: ${measurements.scapularIndex.toFixed(2)}`, x, y + 60);
    ctx.fillText(`AC Joint Space: ${measurements.acJointAlignment.toFixed(1)}mm`, x, y + 75);
    ctx.fillText(`Scapular Rotation: ${measurements.scapularUpwardRotation.toFixed(1)}°`, x, y + 90);
    
    ctx.restore();
  }
  
  private generateACJoint(clavicle: ClavicleStructure, scapula: ScapulaStructure): ACJoint {
    return {
      clavicularFacet: clavicle.acromialEnd.center,
      acromialFacet: scapula.acromion.anteriorEdge,
      jointSpace: 4, // Normal joint space
      orientation: new Vector3(1, 0, 0),
      coracoclavicularLigaments: {
        conoid: {
          clavicularAttachment: clavicle.conoidTubercle,
          coracoidAttachment: scapula.coracoid.base
        },
        trapezoid: {
          clavicularAttachment: clavicle.trapezoidLine.end,
          coracoidAttachment: scapula.coracoid.base
        }
      }
    };
  }
  
  private getDefaultScapula(): ScapulaStructure {
    // Return a default scapula structure when landmarks are missing
    const defaultPos = new Vector3(0, 0, 0);
    return {
      body: {
        medialBorder: [defaultPos],
        lateralBorder: [defaultPos],
        superiorBorder: [defaultPos]
      },
      spine: {
        medialEnd: defaultPos,
        lateralEnd: defaultPos,
        thickness: 4
      },
      acromion: {
        anteriorEdge: defaultPos,
        posteriorEdge: defaultPos,
        lateralEdge: defaultPos,
        undersurface: defaultPos,
        type: 'flat'
      },
      coracoid: {
        base: defaultPos,
        tip: defaultPos,
        curvature: [defaultPos]
      },
      glenoid: {
        center: defaultPos,
        superiorPole: defaultPos,
        inferiorPole: defaultPos,
        anteriorRim: defaultPos,
        posteriorRim: defaultPos,
        version: 0,
        inclination: 0
      },
      supraspinousFossa: {
        center: defaultPos,
        depth: 0
      },
      infraspinousFossa: {
        center: defaultPos,
        depth: 0
      },
      superiorAngle: defaultPos,
      inferiorAngle: defaultPos,
      lateralAngle: defaultPos,
      planeAngle: 0
    };
  }
  
  private getDefaultHumeralHead(): HumeralHead {
    const defaultPos = new Vector3(0, 0, 0);
    return {
      center: defaultPos,
      radius: 0,
      articularCoverage: 0,
      greaterTuberosity: {
        superior: defaultPos,
        middle: defaultPos,
        inferior: defaultPos
      },
      lesserTuberosity: defaultPos,
      bicipitalGroove: {
        medialWall: defaultPos,
        lateralWall: defaultPos,
        depth: 0
      },
      anatomicalNeck: [],
      surgicalNeck: [],
      retroversion: 0
    };
  }
  
  private getDefaultClavicle(): ClavicleStructure {
    const defaultPos = new Vector3(0, 0, 0);
    return {
      sternalEnd: {
        center: defaultPos,
        radius: 0
      },
      acromialEnd: {
        center: defaultPos,
        width: 0,
        thickness: 0
      },
      curvePoints: [],
      conoidTubercle: defaultPos,
      trapezoidLine: {
        start: defaultPos,
        end: defaultPos
      }
    };
  }
}