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
   * Generate anatomically accurate scapula based on landmarks with dynamic sizing
   */
  generateScapula(landmarks: any[], width: number, height: number, side: 'left' | 'right'): ScapulaStructure {
    const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
    const oppositeShoulder = side === 'left' ? landmarks[12] : landmarks[11];
    const elbow = side === 'left' ? landmarks[13] : landmarks[14];
    const hip = side === 'left' ? landmarks[23] : landmarks[24];
    const oppositeHip = side === 'left' ? landmarks[24] : landmarks[23];
    const nose = landmarks[0];
    
    if (!shoulder || !oppositeShoulder || !hip) return this.getDefaultScapula();
    
    const shoulderX = shoulder.x * width;
    const shoulderY = shoulder.y * height;
    const shoulderZ = shoulder.z || 0;
    
    // Calculate body proportions for dynamic sizing
    const shoulderWidth = Math.abs((oppositeShoulder.x - shoulder.x) * width);
    const torsoHeight = Math.abs((hip.y - shoulder.y) * height);
    const bodyDepth = Math.abs(shoulder.z || 0) * width;
    
    // Dynamic scapula dimensions based on body proportions
    // Scapula height is approximately 15-17cm in adults (covers ribs 2-7)
    const scapulaHeight = torsoHeight * 0.25; // Slightly smaller for proper coverage
    // Scapula width is approximately 10-11cm
    const scapulaWidth = shoulderWidth * 0.24; // Reduced width
    
    // Position scapula with three key anatomical points forming a triangle:
    // 1. Superior angle (at T2 vertebra - about 2-3 inches below neck base)
    // 2. Inferior angle (at T7 vertebra)  
    // 3. Lateral angle (glenoid - MUST be at shoulder joint)
    
    // The medial border should be only 2-3 inches (5-7cm) from spine
    // This needs to be MUCH closer to the midline
    const midlineX = (shoulder.x + oppositeShoulder.x) / 2 * width; // Center of body
    
    // Medial border should be only about 2-3 inches from spine
    const medialBorderDistanceFromSpine = shoulderWidth * 0.08; // About 2-3 inches scaled
    
    // Superior angle position (T2 level - very close to spine)
    const superiorAngleX = midlineX + (side === 'left' ? medialBorderDistanceFromSpine : -medialBorderDistanceFromSpine);
    const superiorAngleY = shoulderY + scapulaHeight * 0.05; // Below shoulder level at T2
    
    // Account for scapular plane (30-35° anterior to coronal plane)
    const planeAngle = 32 * Math.PI / 180;
    const depthAdjustment = Math.sin(planeAngle) * scapulaWidth * 0.3;
    
    // Define the three key angles of the scapular triangle
    // Inferior angle position (bottom of scapula, at T7 - also very close to spine)
    const inferiorAngleX = midlineX + (side === 'left' ? medialBorderDistanceFromSpine * 1.1 : -medialBorderDistanceFromSpine * 1.1);
    const inferiorAngleY = superiorAngleY + scapulaHeight; // Full height from superior angle
    
    // Lateral angle (glenoid) - EXACTLY at shoulder joint for proper articulation
    const lateralAngleX = shoulderX; // Glenoid must be precisely at shoulder
    const lateralAngleY = shoulderY;
    
    // Create the three borders forming a triangle
    const medialBorder: Vector3[] = [];
    const lateralBorder: Vector3[] = [];
    const superiorBorder: Vector3[] = [];
    
    // Medial (vertebral) border - runs VERTICALLY from superior to inferior angle
    const medialPoints = 12;
    for (let i = 0; i <= medialPoints; i++) {
      const t = i / medialPoints;
      // Very slight curve for natural shape (reduced for more vertical border)
      const curve = Math.sin(t * Math.PI) * scapulaWidth * 0.02;
      // Keep X coordinate nearly constant for vertical border
      const medialX = superiorAngleX + (t * (inferiorAngleX - superiorAngleX) * 0.1); // Minimal X change
      medialBorder.push(new Vector3(
        medialX - curve * (side === 'left' ? 1 : -1),
        superiorAngleY + (t * (inferiorAngleY - superiorAngleY)),
        shoulderZ - depthAdjustment
      ));
    }
    
    // Lateral border - runs from inferior angle to lateral angle (glenoid)
    const lateralPoints = 10;
    for (let i = 0; i <= lateralPoints; i++) {
      const t = i / lateralPoints;
      // Slight curve toward glenoid
      const curve = Math.sin(t * Math.PI * 0.5) * scapulaWidth * 0.03;
      lateralBorder.push(new Vector3(
        inferiorAngleX + (t * (lateralAngleX - inferiorAngleX)) + curve * (side === 'left' ? -1 : 1),
        inferiorAngleY + (t * (lateralAngleY - inferiorAngleY)),
        shoulderZ - depthAdjustment + (t * bodyDepth * 0.05)
      ));
    }
    
    // Superior border - runs from superior angle to lateral angle (glenoid)
    const superiorPoints = 8;
    for (let i = 0; i <= superiorPoints; i++) {
      const t = i / superiorPoints;
      // Add suprascapular notch at 70% from medial
      const notchDepth = (t > 0.65 && t < 0.75) ? scapulaHeight * 0.015 : 0;
      superiorBorder.push(new Vector3(
        superiorAngleX + (t * (lateralAngleX - superiorAngleX)),
        superiorAngleY + (t * (lateralAngleY - superiorAngleY)) + notchDepth,
        shoulderZ - depthAdjustment + (t * bodyDepth * 0.08)
      ));
    }
    
    // Scapular spine - runs from medial border toward acromion
    const spineY = superiorAngleY + scapulaHeight * 0.3; // At upper third
    const spineMedialX = superiorAngleX + (side === 'left' ? scapulaWidth * 0.02 : -scapulaWidth * 0.02); // Start near medial border
    const spineLateralX = shoulderX + (side === 'left' ? -scapulaWidth * 0.05 : scapulaWidth * 0.05); // End near acromion
    
    // Spine rises laterally toward acromion
    const spineElevation = scapulaHeight * 0.08;
    const spine = {
      medialEnd: new Vector3(spineMedialX, spineY, shoulderZ - depthAdjustment * 0.8),
      lateralEnd: new Vector3(spineLateralX, spineY - spineElevation, shoulderZ - depthAdjustment * 0.4),
      thickness: scapulaHeight * 0.035 // Proportional thickness
    };
    
    // Acromion process - properly sized and positioned over shoulder
    const acromionWidth = scapulaWidth * 0.12;
    const acromionLength = scapulaWidth * 0.18;
    const acromionHeight = scapulaHeight * 0.04;
    
    // Calculate arm elevation for scapular rotation
    const armElevation = elbow ? Math.atan2(shoulder.y - elbow.y, Math.abs(shoulder.x - elbow.x)) : 0;
    const scapularRotation = Math.min(armElevation * 0.3, Math.PI / 6); // Up to 30° upward rotation
    
    const acromion = {
      anteriorEdge: new Vector3(
        spineLateralX + (side === 'left' ? -acromionLength : acromionLength),
        spineY - spineElevation - acromionHeight,
        shoulderZ + bodyDepth * 0.05
      ),
      posteriorEdge: new Vector3(
        spineLateralX + (side === 'left' ? -acromionLength * 0.6 : acromionLength * 0.6),
        spineY - spineElevation,
        shoulderZ - depthAdjustment * 0.3
      ),
      lateralEdge: new Vector3(
        spineLateralX + (side === 'left' ? -acromionLength * 1.2 : acromionLength * 1.2),
        spineY - spineElevation - acromionHeight * 0.5 - (scapularRotation * scapulaHeight * 0.1),
        shoulderZ - depthAdjustment * 0.15
      ),
      undersurface: new Vector3(
        spineLateralX + (side === 'left' ? -acromionLength : acromionLength),
        spineY - spineElevation + acromionHeight * 0.3,
        shoulderZ - depthAdjustment * 0.1
      ),
      type: 'curved' as const
    };
    
    // Coracoid process - projects anteriorly from superior border
    const coracoidBaseX = shoulderX + (side === 'left' ? -scapulaWidth * 0.03 : scapulaWidth * 0.03);
    const coracoidBaseY = shoulderY - scapulaHeight * 0.05;
    const coracoidLength = scapulaWidth * 0.15;
    
    const coracoid = {
      base: new Vector3(coracoidBaseX, coracoidBaseY, shoulderZ + bodyDepth * 0.1),
      tip: new Vector3(
        coracoidBaseX + (side === 'left' ? -coracoidLength : coracoidLength),
        coracoidBaseY - scapulaHeight * 0.03,
        shoulderZ + bodyDepth * 0.25
      ),
      curvature: [
        new Vector3(
          coracoidBaseX + (side === 'left' ? -coracoidLength * 0.3 : coracoidLength * 0.3),
          coracoidBaseY - scapulaHeight * 0.01,
          shoulderZ + bodyDepth * 0.15
        ),
        new Vector3(
          coracoidBaseX + (side === 'left' ? -coracoidLength * 0.7 : coracoidLength * 0.7),
          coracoidBaseY - scapulaHeight * 0.02,
          shoulderZ + bodyDepth * 0.22
        ),
        new Vector3(
          coracoidBaseX + (side === 'left' ? -coracoidLength : coracoidLength),
          coracoidBaseY - scapulaHeight * 0.03,
          shoulderZ + bodyDepth * 0.25
        )
      ]
    };
    
    // Glenoid fossa - at the lateral angle (shoulder joint)
    const glenoidX = lateralAngleX; // At shoulder joint
    const glenoidY = lateralAngleY; // At shoulder joint
    const glenoidHeight = scapulaHeight * 0.08;
    const glenoidWidth = scapulaWidth * 0.06;
    
    const glenoid = {
      center: new Vector3(glenoidX, glenoidY, shoulderZ),
      superiorPole: new Vector3(glenoidX, glenoidY - glenoidHeight * 0.5, shoulderZ),
      inferiorPole: new Vector3(glenoidX, glenoidY + glenoidHeight * 0.5, shoulderZ),
      anteriorRim: new Vector3(
        glenoidX + (side === 'left' ? -glenoidWidth * 0.3 : glenoidWidth * 0.3),
        glenoidY,
        shoulderZ + bodyDepth * 0.03
      ),
      posteriorRim: new Vector3(
        glenoidX + (side === 'left' ? glenoidWidth * 0.3 : -glenoidWidth * 0.3),
        glenoidY,
        shoulderZ - bodyDepth * 0.03
      ),
      version: -5, // 5° retroversion
      inclination: 5 // 5° superior tilt
    };
    
    // Fossae - positioned relative to spine location
    const fossaCenterX = (superiorAngleX + inferiorAngleX) / 2; // Midpoint of medial border
    
    const supraspinousFossa = {
      center: new Vector3(
        fossaCenterX + (side === 'left' ? -scapulaWidth * 0.1 : scapulaWidth * 0.1),
        spineY - scapulaHeight * 0.15, // Above spine
        shoulderZ - depthAdjustment * 0.7
      ),
      depth: scapulaHeight * 0.05
    };
    
    const infraspinousFossa = {
      center: new Vector3(
        fossaCenterX + (side === 'left' ? -scapulaWidth * 0.1 : scapulaWidth * 0.1),
        spineY + scapulaHeight * 0.25, // Below spine
        shoulderZ - depthAdjustment * 0.7
      ),
      depth: scapulaHeight * 0.06
    };
    
    // The three angles of the scapular triangle are already defined
    const superiorAngleVec = new Vector3(
      superiorAngleX,
      superiorAngleY,
      shoulderZ - depthAdjustment
    );
    const inferiorAngleVec = new Vector3(
      inferiorAngleX,
      inferiorAngleY,
      shoulderZ - depthAdjustment - bodyDepth * 0.03
    );
    const lateralAngleVec = new Vector3(lateralAngleX, lateralAngleY, shoulderZ);
    
    return {
      body: { medialBorder, lateralBorder, superiorBorder },
      spine,
      acromion,
      coracoid,
      glenoid,
      supraspinousFossa,
      infraspinousFossa,
      superiorAngle: superiorAngleVec,
      inferiorAngle: inferiorAngleVec,
      lateralAngle: lateralAngleVec,
      planeAngle: 35 // 35° anterior to coronal plane
    };
  }
  
  /**
   * Generate anatomically accurate humeral head
   */
  generateHumeralHead(landmarks: any[], width: number, height: number, side: 'left' | 'right'): HumeralHead {
    const shoulder = side === 'left' ? landmarks[11] : landmarks[12];
    const oppositeShoulder = side === 'left' ? landmarks[12] : landmarks[11];
    const elbow = side === 'left' ? landmarks[13] : landmarks[14];
    
    if (!shoulder || !elbow) return this.getDefaultHumeralHead();
    
    const shoulderX = shoulder.x * width;
    const shoulderY = shoulder.y * height;
    const shoulderZ = shoulder.z || 0;
    
    // Calculate proportional radius based on body size
    const shoulderWidth = oppositeShoulder ? Math.abs((oppositeShoulder.x - shoulder.x) * width) : 150;
    
    // Humeral head center and dimensions - positioned at glenohumeral joint
    const center = new Vector3(shoulderX, shoulderY, shoulderZ);
    const radius = shoulderWidth * 0.06; // Proportional to body size
    
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
    
    // Add subtle shadow for depth perception
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    
    // Create gradient for realistic bone appearance
    const gradient = ctx.createLinearGradient(
      scapula.superiorAngle.x, scapula.superiorAngle.y,
      scapula.inferiorAngle.x, scapula.inferiorAngle.y
    );
    gradient.addColorStop(0, 'rgba(248, 248, 248, 0.95)');
    gradient.addColorStop(0.3, 'rgba(243, 243, 243, 0.9)');
    gradient.addColorStop(0.7, 'rgba(238, 238, 238, 0.85)');
    gradient.addColorStop(1, 'rgba(233, 233, 233, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#d5d5d5';
    ctx.lineWidth = 2;
    
    // Draw body outline with smooth curves
    ctx.beginPath();
    
    // Start from superior angle
    const firstPoint = scapula.body.medialBorder[0];
    ctx.moveTo(firstPoint.x, firstPoint.y);
    
    // Draw medial border with smooth curves
    for (let i = 1; i < scapula.body.medialBorder.length; i++) {
      const prev = scapula.body.medialBorder[i - 1];
      const curr = scapula.body.medialBorder[i];
      const next = scapula.body.medialBorder[i + 1] || curr;
      
      // Use quadratic curve for smoother appearance
      const cpx = curr.x;
      const cpy = (prev.y + next.y) / 2;
      ctx.quadraticCurveTo(cpx, prev.y, curr.x, cpy);
    }
    const lastMedial = scapula.body.medialBorder[scapula.body.medialBorder.length - 1];
    ctx.lineTo(lastMedial.x, lastMedial.y);
    
    // Draw lateral border (reversed for proper connection)
    const reversedLateral = [...scapula.body.lateralBorder].reverse();
    for (let i = 0; i < reversedLateral.length; i++) {
      const point = reversedLateral[i];
      if (i === 0) {
        // Smooth transition from inferior angle
        ctx.quadraticCurveTo(
          lastMedial.x - 10, lastMedial.y,
          point.x, point.y
        );
      } else {
        const prev = reversedLateral[i - 1];
        ctx.lineTo(point.x, point.y);
      }
    }
    
    // Draw superior border to close the shape
    scapula.body.superiorBorder.forEach((point, i) => {
      if (i > 0) {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Reset shadow for detailed features
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw scapular spine with anatomical accuracy
    const spineGradient = ctx.createLinearGradient(
      scapula.spine.medialEnd.x, scapula.spine.medialEnd.y,
      scapula.spine.lateralEnd.x, scapula.spine.lateralEnd.y
    );
    spineGradient.addColorStop(0, '#d0d0d0');
    spineGradient.addColorStop(0.5, '#c8c8c8');
    spineGradient.addColorStop(1, '#c0c0c0');
    
    ctx.strokeStyle = spineGradient;
    ctx.lineWidth = scapula.spine.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(scapula.spine.medialEnd.x, scapula.spine.medialEnd.y);
    ctx.lineTo(scapula.spine.lateralEnd.x, scapula.spine.lateralEnd.y);
    ctx.stroke();
    
    // Draw acromion with enhanced anatomical detail
    const acromionGradient = ctx.createRadialGradient(
      scapula.acromion.lateralEdge.x, scapula.acromion.lateralEdge.y, 0,
      scapula.acromion.lateralEdge.x, scapula.acromion.lateralEdge.y, 25
    );
    acromionGradient.addColorStop(0, 'rgba(238, 238, 238, 0.95)');
    acromionGradient.addColorStop(1, 'rgba(228, 228, 228, 0.85)');
    
    ctx.fillStyle = acromionGradient;
    ctx.strokeStyle = '#c5c5c5';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(scapula.spine.lateralEnd.x, scapula.spine.lateralEnd.y);
    ctx.quadraticCurveTo(
      scapula.acromion.anteriorEdge.x,
      scapula.acromion.anteriorEdge.y + 3,
      scapula.acromion.lateralEdge.x,
      scapula.acromion.lateralEdge.y
    );
    ctx.quadraticCurveTo(
      scapula.acromion.posteriorEdge.x,
      scapula.acromion.posteriorEdge.y - 2,
      scapula.spine.lateralEnd.x,
      scapula.spine.lateralEnd.y + 5
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw coracoid process with anatomical accuracy
    ctx.strokeStyle = '#b5b5b5';
    ctx.fillStyle = 'rgba(225, 225, 225, 0.7)';
    ctx.lineWidth = Math.max(3, scapula.spine.thickness * 0.8);
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(scapula.coracoid.base.x, scapula.coracoid.base.y);
    
    // Smooth curve through coracoid points
    for (let i = 0; i < scapula.coracoid.curvature.length; i++) {
      const point = scapula.coracoid.curvature[i];
      if (i === scapula.coracoid.curvature.length - 1) {
        ctx.lineTo(point.x, point.y);
      } else {
        const next = scapula.coracoid.curvature[i + 1];
        ctx.quadraticCurveTo(
          point.x, point.y,
          (point.x + next.x) / 2, (point.y + next.y) / 2
        );
      }
    }
    ctx.stroke();
    
    // Add coracoid tip
    ctx.beginPath();
    ctx.arc(scapula.coracoid.tip.x, scapula.coracoid.tip.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw glenoid fossa with proper pear shape
    const glenoidHeight = Math.abs(scapula.glenoid.inferiorPole.y - scapula.glenoid.superiorPole.y);
    const glenoidWidth = Math.abs(scapula.glenoid.anteriorRim.x - scapula.glenoid.posteriorRim.x) || glenoidHeight * 0.7;
    
    ctx.strokeStyle = '#a8a8a8';
    ctx.fillStyle = 'rgba(215, 215, 215, 0.5)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    // Pear-shaped glenoid (narrower superior, wider inferior)
    ctx.moveTo(scapula.glenoid.superiorPole.x, scapula.glenoid.superiorPole.y);
    ctx.quadraticCurveTo(
      scapula.glenoid.center.x - glenoidWidth * 0.4,
      scapula.glenoid.center.y - glenoidHeight * 0.2,
      scapula.glenoid.center.x - glenoidWidth * 0.5,
      scapula.glenoid.center.y
    );
    ctx.quadraticCurveTo(
      scapula.glenoid.center.x - glenoidWidth * 0.4,
      scapula.glenoid.center.y + glenoidHeight * 0.3,
      scapula.glenoid.inferiorPole.x,
      scapula.glenoid.inferiorPole.y
    );
    ctx.quadraticCurveTo(
      scapula.glenoid.center.x + glenoidWidth * 0.4,
      scapula.glenoid.center.y + glenoidHeight * 0.3,
      scapula.glenoid.center.x + glenoidWidth * 0.5,
      scapula.glenoid.center.y
    );
    ctx.quadraticCurveTo(
      scapula.glenoid.center.x + glenoidWidth * 0.4,
      scapula.glenoid.center.y - glenoidHeight * 0.2,
      scapula.glenoid.superiorPole.x,
      scapula.glenoid.superiorPole.y
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Add subtle fossa indications
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    // Supraspinous fossa
    ctx.beginPath();
    ctx.ellipse(
      scapula.supraspinousFossa.center.x,
      scapula.supraspinousFossa.center.y,
      scapula.supraspinousFossa.depth * 1.5,
      scapula.supraspinousFossa.depth,
      0, 0, Math.PI * 2
    );
    ctx.stroke();
    
    // Infraspinous fossa
    ctx.beginPath();
    ctx.ellipse(
      scapula.infraspinousFossa.center.x,
      scapula.infraspinousFossa.center.y,
      scapula.infraspinousFossa.depth * 1.5,
      scapula.infraspinousFossa.depth,
      0, 0, Math.PI * 2
    );
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset line dash
    
    // Add anatomical labels with improved visibility
    ctx.fillStyle = '#4a4a4a';
    ctx.font = 'bold 11px Arial';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 3;
    
    // Dynamic label positioning
    ctx.fillText(
      'Acromion',
      scapula.acromion.lateralEdge.x - 35,
      scapula.acromion.lateralEdge.y - 8
    );
    ctx.fillText(
      'Glenoid',
      scapula.glenoid.center.x - 25,
      scapula.glenoid.inferiorPole.y + 15
    );
    ctx.fillText(
      'Coracoid',
      scapula.coracoid.tip.x - 30,
      scapula.coracoid.tip.y + 12
    );
    
    // Spine label
    ctx.font = '10px Arial';
    const spineMiddleX = (scapula.spine.medialEnd.x + scapula.spine.lateralEnd.x) / 2;
    const spineMiddleY = (scapula.spine.medialEnd.y + scapula.spine.lateralEnd.y) / 2;
    ctx.fillText('Spine', spineMiddleX - 15, spineMiddleY - 8);
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
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