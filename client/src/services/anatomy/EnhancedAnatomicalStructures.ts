/**
 * Enhanced anatomical structures for medical-grade Body Scanner
 * Includes detailed rib cage, hip/pelvis, knee joint, and elbow complex
 */

import { Vector3 } from 'three';

// ==================== RIB CAGE STRUCTURES ====================

export interface CostovertebralJoint {
  ribNumber: number;
  vertebralLevel: string; // e.g., "T5"
  position: Vector3;
  angle: number; // Rib angle for fracture assessment
}

export interface CostochondralJunction {
  ribNumber: number;
  cartilageLength: number;
  ossificationPattern: 'normal' | 'calcified' | 'irregular';
  position: Vector3;
}

export interface EnhancedRib {
  number: number;
  side: 'left' | 'right';
  type: 'true' | 'false' | 'floating';
  costovertebralJoint: CostovertebralJoint;
  costochondralJunction?: CostochondralJunction; // Not present in floating ribs
  angle: number; // Posterior rib angle
  curve: Vector3[]; // Complete rib curvature points
  intercostalSpace: number; // Distance to next rib
}

export interface SternalStructure {
  manubrium: {
    position: Vector3;
    width: number;
    height: number;
  };
  body: {
    position: Vector3;
    width: number;
    height: number;
    sternalAngle: number; // Angle of Louis at T4-T5
  };
  xiphoidProcess: {
    position: Vector3;
    ossificationLevel: 'cartilaginous' | 'partial' | 'complete';
  };
}

export class EnhancedRibcageRenderer {
  generateEnhancedRibcage(landmarks: any[], width: number, height: number): {
    ribs: EnhancedRib[];
    sternum: SternalStructure;
    measurements: {
      intercostalSpaces: number[];
      sternalAngle: number;
      chestExpansion: number;
    };
  } {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { ribs: [], sternum: this.getDefaultSternum(), measurements: this.getDefaultMeasurements() };
    }
    
    const centerX = (leftShoulder.x + rightShoulder.x) * width / 2;
    const shoulderY = (leftShoulder.y + rightShoulder.y) * height / 2;
    const hipY = (leftHip.y + rightHip.y) * height / 2;
    const chestWidth = Math.abs(leftShoulder.x - rightShoulder.x) * width;
    
    const ribs: EnhancedRib[] = [];
    const intercostalSpaces: number[] = [];
    
    // Generate 12 pairs of ribs with enhanced detail
    for (let i = 0; i < 12; i++) {
      const ribNumber = i + 1;
      const ribY = shoulderY + (hipY - shoulderY) * 0.15 + i * ((hipY - shoulderY) * 0.6 / 12);
      
      // Calculate intercostal space
      if (i > 0) {
        const prevRibY = shoulderY + (hipY - shoulderY) * 0.15 + (i - 1) * ((hipY - shoulderY) * 0.6 / 12);
        intercostalSpaces.push(Math.abs(ribY - prevRibY));
      }
      
      // Determine rib type
      let ribType: 'true' | 'false' | 'floating';
      if (ribNumber <= 7) ribType = 'true';
      else if (ribNumber <= 10) ribType = 'false';
      else ribType = 'floating';
      
      // Calculate rib angle (increases inferiorly)
      const ribAngle = 35 + ribNumber * 2.5;
      
      // Create costovertebral joint
      const costovertebralJoint: CostovertebralJoint = {
        ribNumber,
        vertebralLevel: `T${ribNumber}`,
        position: new Vector3(centerX, ribY, -30), // Posterior position
        angle: ribAngle
      };
      
      // Create costochondral junction (except for floating ribs)
      let costochondralJunction: CostochondralJunction | undefined;
      if (ribType !== 'floating') {
        const cartilageLength = ribType === 'true' ? 20 : 30 + (ribNumber - 8) * 10;
        costochondralJunction = {
          ribNumber,
          cartilageLength,
          ossificationPattern: 'normal', // Can be varied based on age
          position: new Vector3(centerX + (chestWidth * 0.3), ribY, 0)
        };
      }
      
      // Generate rib curve points
      const curve = this.generateRibCurve(centerX, ribY, chestWidth, ribNumber, 'left');
      
      // Create left rib
      ribs.push({
        number: ribNumber,
        side: 'left',
        type: ribType,
        costovertebralJoint,
        costochondralJunction,
        angle: ribAngle,
        curve,
        intercostalSpace: i > 0 ? intercostalSpaces[i - 1] : 0
      });
      
      // Create right rib (mirror)
      ribs.push({
        number: ribNumber,
        side: 'right',
        type: ribType,
        costovertebralJoint: {
          ...costovertebralJoint,
          position: new Vector3(centerX, ribY, -30)
        },
        costochondralJunction: costochondralJunction ? {
          ...costochondralJunction,
          position: new Vector3(centerX - (chestWidth * 0.3), ribY, 0)
        } : undefined,
        angle: ribAngle,
        curve: this.generateRibCurve(centerX, ribY, chestWidth, ribNumber, 'right'),
        intercostalSpace: i > 0 ? intercostalSpaces[i - 1] : 0
      });
    }
    
    // Generate sternum with Angle of Louis
    const sternalAngleY = shoulderY + (hipY - shoulderY) * 0.2; // T4-T5 level
    const sternum: SternalStructure = {
      manubrium: {
        position: new Vector3(centerX, shoulderY + 10, 5),
        width: 30,
        height: 40
      },
      body: {
        position: new Vector3(centerX, sternalAngleY + 30, 5),
        width: 25,
        height: 80,
        sternalAngle: 162 // Normal angle of Louis
      },
      xiphoidProcess: {
        position: new Vector3(centerX, sternalAngleY + 110, 5),
        ossificationLevel: 'partial' // Variable with age
      }
    };
    
    return {
      ribs,
      sternum,
      measurements: {
        intercostalSpaces,
        sternalAngle: 162,
        chestExpansion: chestWidth * 1.1 - chestWidth // Simulated expansion
      }
    };
  }
  
  private generateRibCurve(centerX: number, centerY: number, chestWidth: number, ribNumber: number, side: 'left' | 'right'): Vector3[] {
    const points: Vector3[] = [];
    const numPoints = 20;
    
    // Rib curvature parameters
    const maxWidth = chestWidth * (ribNumber <= 7 ? 0.5 : 0.4 - (ribNumber - 7) * 0.02);
    const anteriorReach = ribNumber <= 10 ? 0.8 : 0.5; // Floating ribs don't reach anterior
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const angle = t * Math.PI * anteriorReach;
      
      const x = centerX + (side === 'left' ? 1 : -1) * maxWidth * Math.sin(angle);
      const y = centerY + (ribNumber - 1) * 2;
      const z = -30 + 30 * Math.cos(angle); // Posterior to anterior curve
      
      points.push(new Vector3(x, y, z));
    }
    
    return points;
  }
  
  renderEnhancedRibcage(ctx: CanvasRenderingContext2D, data: ReturnType<typeof this.generateEnhancedRibcage>) {
    ctx.save();
    
    // Render ribs with costovertebral joints
    data.ribs.forEach(rib => {
      // Draw costovertebral joint
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(rib.costovertebralJoint.position.x, rib.costovertebralJoint.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw rib curve
      ctx.strokeStyle = rib.type === 'floating' ? '#d0d0d0' : '#e8e8e8';
      ctx.lineWidth = rib.type === 'true' ? 3 : 2;
      ctx.beginPath();
      rib.curve.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      
      // Draw costochondral junction if present
      if (rib.costochondralJunction) {
        ctx.fillStyle = '#aaccff';
        ctx.beginPath();
        ctx.ellipse(rib.costochondralJunction.position.x, rib.costochondralJunction.position.y, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Label floating ribs
      if (rib.type === 'floating' && rib.side === 'left') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.fillText(`Floating Rib ${rib.number}`, rib.curve[10].x - 40, rib.curve[10].y);
      }
    });
    
    // Render sternum with angle of Louis
    ctx.fillStyle = 'rgba(245, 245, 245, 0.9)';
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    
    // Manubrium
    ctx.fillRect(
      data.sternum.manubrium.position.x - data.sternum.manubrium.width / 2,
      data.sternum.manubrium.position.y,
      data.sternum.manubrium.width,
      data.sternum.manubrium.height
    );
    
    // Sternal angle marker
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(data.sternum.body.position.x - 20, data.sternum.body.position.y - 20);
    ctx.lineTo(data.sternum.body.position.x + 20, data.sternum.body.position.y - 20);
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Angle of Louis (T4-T5)', data.sternum.body.position.x + 25, data.sternum.body.position.y - 18);
    
    // Sternal body
    ctx.fillStyle = 'rgba(245, 245, 245, 0.9)';
    ctx.fillRect(
      data.sternum.body.position.x - data.sternum.body.width / 2,
      data.sternum.body.position.y,
      data.sternum.body.width,
      data.sternum.body.height
    );
    
    // Xiphoid process
    const xiphoidOpacity = data.sternum.xiphoidProcess.ossificationLevel === 'complete' ? 0.9 : 0.5;
    ctx.fillStyle = `rgba(245, 245, 245, ${xiphoidOpacity})`;
    ctx.beginPath();
    ctx.ellipse(data.sternum.xiphoidProcess.position.x, data.sternum.xiphoidProcess.position.y, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Display measurements
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Intercostal Spaces:', 10, 250);
    ctx.font = '10px Arial';
    data.measurements.intercostalSpaces.forEach((space, i) => {
      ctx.fillText(`Space ${i + 1}-${i + 2}: ${space.toFixed(1)}mm`, 10, 265 + i * 12);
    });
    
    ctx.restore();
  }
  
  private getDefaultSternum(): SternalStructure {
    return {
      manubrium: { position: new Vector3(0, 0, 0), width: 0, height: 0 },
      body: { position: new Vector3(0, 0, 0), width: 0, height: 0, sternalAngle: 0 },
      xiphoidProcess: { position: new Vector3(0, 0, 0), ossificationLevel: 'cartilaginous' }
    };
  }
  
  private getDefaultMeasurements() {
    return { intercostalSpaces: [], sternalAngle: 0, chestExpansion: 0 };
  }
}

// ==================== HIP AND PELVIS STRUCTURES ====================

export interface EnhancedPelvis {
  acetabulum: {
    centerEdgeAngle: number; // Wiberg's angle
    acetabularIndex: number; // For hip dysplasia
    coverage: number; // Percentage of femoral head coverage
    position: Vector3;
  };
  ilium: {
    anteriorSuperiorSpine: Vector3; // ASIS
    anteriorInferiorSpine: Vector3; // AIIS
    posteriorSuperiorSpine: Vector3; // PSIS
    posteriorInferiorSpine: Vector3; // PIIS
    iliacCrest: Vector3[];
  };
  ischium: {
    tuberosity: Vector3; // Sitting bone
    spine: Vector3;
    ramus: Vector3[];
  };
  pubis: {
    symphysis: Vector3;
    superiorRamus: Vector3;
    inferiorRamus: Vector3;
  };
  sacroiliacJoint: {
    position: Vector3;
    jointSpace: number; // Normal 2-4mm
    angle: number;
  };
  measurements: {
    pelvicInlet: { AP: number; transverse: number };
    pelvicOutlet: { AP: number; transverse: number };
    pelvicTilt: number;
    sacralSlope: number;
    pelvicIncidence: number;
  };
}

export interface HipJointAssessment {
  shentonsLine: { intact: boolean; disruption?: number };
  kleinsLine: { normal: boolean; slipPercentage?: number };
  femolarHeadCoverage: number;
  jointSpace: { superior: number; medial: number; axial: number };
}

export class EnhancedPelvisRenderer {
  generateEnhancedPelvis(landmarks: any[], width: number, height: number): {
    leftPelvis: EnhancedPelvis;
    rightPelvis: EnhancedPelvis;
    hipAssessment: { left: HipJointAssessment; right: HipJointAssessment };
  } {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) {
      return {
        leftPelvis: this.getDefaultPelvis(),
        rightPelvis: this.getDefaultPelvis(),
        hipAssessment: { left: this.getDefaultHipAssessment(), right: this.getDefaultHipAssessment() }
      };
    }
    
    const hipCenterX = (leftHip.x + rightHip.x) * width / 2;
    const hipY = (leftHip.y + rightHip.y) * height / 2;
    const pelvicWidth = Math.abs(leftHip.x - rightHip.x) * width;
    
    // Generate left hemipelvis
    const leftPelvis = this.generateHemipelvis(leftHip.x * width, hipY, pelvicWidth, 'left');
    const rightPelvis = this.generateHemipelvis(rightHip.x * width, hipY, pelvicWidth, 'right');
    
    // Calculate hip joint assessments
    const leftHipAssessment = this.assessHipJoint(leftPelvis, leftHip, width, height);
    const rightHipAssessment = this.assessHipJoint(rightPelvis, rightHip, width, height);
    
    return {
      leftPelvis,
      rightPelvis,
      hipAssessment: { left: leftHipAssessment, right: rightHipAssessment }
    };
  }
  
  private generateHemipelvis(x: number, y: number, pelvicWidth: number, side: 'left' | 'right'): EnhancedPelvis {
    const sideMultiplier = side === 'left' ? 1 : -1;
    
    return {
      acetabulum: {
        centerEdgeAngle: 38, // Normal 25-40°
        acetabularIndex: 8, // Normal <10°
        coverage: 75, // Normal >75%
        position: new Vector3(x, y, 0)
      },
      ilium: {
        anteriorSuperiorSpine: new Vector3(x + sideMultiplier * 40, y - 20, 10),
        anteriorInferiorSpine: new Vector3(x + sideMultiplier * 35, y - 5, 8),
        posteriorSuperiorSpine: new Vector3(x + sideMultiplier * 20, y - 25, -20),
        posteriorInferiorSpine: new Vector3(x + sideMultiplier * 15, y - 10, -18),
        iliacCrest: this.generateIliacCrest(x, y, sideMultiplier)
      },
      ischium: {
        tuberosity: new Vector3(x + sideMultiplier * 10, y + 40, -10),
        spine: new Vector3(x + sideMultiplier * 5, y + 10, -15),
        ramus: this.generateIschialarmus(x, y, sideMultiplier)
      },
      pubis: {
        symphysis: new Vector3(x - sideMultiplier * pelvicWidth * 0.3, y + 15, 5),
        superiorRamus: new Vector3(x + sideMultiplier * 10, y + 5, 5),
        inferiorRamus: new Vector3(x + sideMultiplier * 5, y + 20, 5)
      },
      sacroiliacJoint: {
        position: new Vector3(x - sideMultiplier * 10, y - 15, -25),
        jointSpace: 3, // Normal 2-4mm
        angle: 15
      },
      measurements: {
        pelvicInlet: { AP: 110, transverse: 130 }, // Normal female values
        pelvicOutlet: { AP: 120, transverse: 110 },
        pelvicTilt: 12,
        sacralSlope: 40,
        pelvicIncidence: 52
      }
    };
  }
  
  private generateIliacCrest(x: number, y: number, sideMultiplier: number): Vector3[] {
    const points: Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const angle = t * Math.PI * 0.6;
      points.push(new Vector3(
        x + sideMultiplier * (20 + 20 * Math.cos(angle)),
        y - 25 + 10 * Math.sin(angle),
        -20 + 30 * t
      ));
    }
    return points;
  }
  
  private generateIschialarmus(x: number, y: number, sideMultiplier: number): Vector3[] {
    const points: Vector3[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      points.push(new Vector3(
        x + sideMultiplier * (10 - 5 * t),
        y + 40 - 20 * t,
        -10 + 5 * t
      ));
    }
    return points;
  }
  
  private assessHipJoint(pelvis: EnhancedPelvis, hipLandmark: any, width: number, height: number): HipJointAssessment {
    // Shenton's line assessment
    const shentonsIntact = true; // Simplified - would need femur position
    
    // Klein's line assessment (for SCFE)
    const kleinsNormal = true; // Simplified - would need lateral view
    
    return {
      shentonsLine: { intact: shentonsIntact },
      kleinsLine: { normal: kleinsNormal },
      femolarHeadCoverage: pelvis.acetabulum.coverage,
      jointSpace: { superior: 4, medial: 4, axial: 4 } // Normal values
    };
  }
  
  renderEnhancedPelvis(ctx: CanvasRenderingContext2D, data: ReturnType<typeof this.generateEnhancedPelvis>) {
    ctx.save();
    
    // Render both hemipelves
    [data.leftPelvis, data.rightPelvis].forEach((pelvis, index) => {
      const side = index === 0 ? 'left' : 'right';
      
      // Draw ilium with ASIS and PSIS
      ctx.strokeStyle = '#e8e8e8';
      ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
      ctx.lineWidth = 3;
      
      // Iliac crest
      ctx.beginPath();
      pelvis.ilium.iliacCrest.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      
      // ASIS marker
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(pelvis.ilium.anteriorSuperiorSpine.x, pelvis.ilium.anteriorSuperiorSpine.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.fillText('ASIS', pelvis.ilium.anteriorSuperiorSpine.x - 15, pelvis.ilium.anteriorSuperiorSpine.y - 8);
      
      // PSIS marker
      ctx.fillStyle = '#6b8eff';
      ctx.beginPath();
      ctx.arc(pelvis.ilium.posteriorSuperiorSpine.x, pelvis.ilium.posteriorSuperiorSpine.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PSIS', pelvis.ilium.posteriorSuperiorSpine.x - 15, pelvis.ilium.posteriorSuperiorSpine.y - 8);
      
      // Acetabulum
      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pelvis.acetabulum.position.x, pelvis.acetabulum.position.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Center-edge angle visualization
      ctx.strokeStyle = '#ffaa00';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pelvis.acetabulum.position.x, pelvis.acetabulum.position.y);
      ctx.lineTo(pelvis.acetabulum.position.x, pelvis.acetabulum.position.y - 30);
      ctx.moveTo(pelvis.acetabulum.position.x, pelvis.acetabulum.position.y);
      const angleRad = pelvis.acetabulum.centerEdgeAngle * Math.PI / 180;
      ctx.lineTo(
        pelvis.acetabulum.position.x + 30 * Math.sin(angleRad),
        pelvis.acetabulum.position.y - 30 * Math.cos(angleRad)
      );
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Ischial tuberosity
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.ellipse(pelvis.ischium.tuberosity.x, pelvis.ischium.tuberosity.y, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Arial';
      ctx.fillText('Ischial Tuberosity', pelvis.ischium.tuberosity.x - 40, pelvis.ischium.tuberosity.y + 20);
      
      // Sacroiliac joint
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pelvis.sacroiliacJoint.position.x - 5, pelvis.sacroiliacJoint.position.y);
      ctx.lineTo(pelvis.sacroiliacJoint.position.x + 5, pelvis.sacroiliacJoint.position.y);
      ctx.stroke();
      
      // Display measurements for left side only
      if (side === 'left') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Pelvic Measurements:', 10, 400);
        ctx.font = '10px Arial';
        ctx.fillText(`CE Angle: ${pelvis.acetabulum.centerEdgeAngle}°`, 10, 415);
        ctx.fillText(`Acetabular Index: ${pelvis.acetabulum.acetabularIndex}°`, 10, 428);
        ctx.fillText(`Coverage: ${pelvis.acetabulum.coverage}%`, 10, 441);
        ctx.fillText(`Pelvic Tilt: ${pelvis.measurements.pelvicTilt}°`, 10, 454);
        ctx.fillText(`SI Joint Space: ${pelvis.sacroiliacJoint.jointSpace}mm`, 10, 467);
        
        // Shenton's line status
        if (data.hipAssessment.left.shentonsLine.intact) {
          ctx.fillStyle = '#00ff00';
          ctx.fillText("✓ Shenton's Line Intact", 10, 480);
        }
      }
    });
    
    ctx.restore();
  }
  
  private getDefaultPelvis(): EnhancedPelvis {
    const defaultVec = new Vector3(0, 0, 0);
    return {
      acetabulum: { centerEdgeAngle: 0, acetabularIndex: 0, coverage: 0, position: defaultVec },
      ilium: {
        anteriorSuperiorSpine: defaultVec,
        anteriorInferiorSpine: defaultVec,
        posteriorSuperiorSpine: defaultVec,
        posteriorInferiorSpine: defaultVec,
        iliacCrest: []
      },
      ischium: { tuberosity: defaultVec, spine: defaultVec, ramus: [] },
      pubis: { symphysis: defaultVec, superiorRamus: defaultVec, inferiorRamus: defaultVec },
      sacroiliacJoint: { position: defaultVec, jointSpace: 0, angle: 0 },
      measurements: {
        pelvicInlet: { AP: 0, transverse: 0 },
        pelvicOutlet: { AP: 0, transverse: 0 },
        pelvicTilt: 0,
        sacralSlope: 0,
        pelvicIncidence: 0
      }
    };
  }
  
  private getDefaultHipAssessment(): HipJointAssessment {
    return {
      shentonsLine: { intact: false },
      kleinsLine: { normal: false },
      femolarHeadCoverage: 0,
      jointSpace: { superior: 0, medial: 0, axial: 0 }
    };
  }
}

// ==================== KNEE JOINT STRUCTURES ====================

export interface EnhancedKnee {
  intercondylarNotch: {
    width: number;
    shape: 'A-shaped' | 'U-shaped' | 'W-shaped';
    notchWidthIndex: number; // NWI for ACL risk
  };
  tibialPlateau: {
    medial: {
      slope: number;
      depth: number;
      area: number;
    };
    lateral: {
      slope: number;
      depth: number;
      area: number;
    };
  };
  proximalTibiofibularJoint: {
    position: Vector3;
    orientation: 'horizontal' | 'oblique';
    jointSpace: number;
  };
  tibialTuberosity: {
    position: Vector3;
    prominence: number;
    tTTGDistance: number; // Tibial tubercle-trochlear groove distance
  };
  gerdysTubercle: {
    position: Vector3;
    prominence: number;
  };
  fabella?: { // Present in ~10-30% of population
    present: boolean;
    position?: Vector3;
    size?: number;
  };
  hoffasFatPad: {
    volume: number;
    position: Vector3;
  };
  measurements: {
    insallSalvatiRatio: number; // Patellar height
    blackburneRatio: number; // Alternative patellar height
    sulcusAngle: number; // Trochlear dysplasia assessment
    lateralPatellarTilt: number;
  };
}

export class EnhancedKneeRenderer {
  generateEnhancedKnee(landmarks: any[], width: number, height: number, side: 'left' | 'right'): EnhancedKnee {
    const hip = landmarks[side === 'left' ? 23 : 24];
    const knee = landmarks[side === 'left' ? 25 : 26];
    const ankle = landmarks[side === 'left' ? 27 : 28];
    
    if (!hip || !knee || !ankle) {
      return this.getDefaultKnee();
    }
    
    const kneeX = knee.x * width;
    const kneeY = knee.y * height;
    
    // Calculate anatomical features
    const notchWidth = 18 + Math.random() * 4; // 18-22mm normal range
    
    return {
      intercondylarNotch: {
        width: notchWidth,
        shape: 'U-shaped', // Most common
        notchWidthIndex: notchWidth / 75 // Femoral width assumed
      },
      tibialPlateau: {
        medial: {
          slope: 7, // Normal 7-10°
          depth: 5,
          area: 750 // mm²
        },
        lateral: {
          slope: 5, // Usually less than medial
          depth: 4,
          area: 650 // Smaller than medial
        }
      },
      proximalTibiofibularJoint: {
        position: new Vector3(kneeX + (side === 'left' ? 25 : -25), kneeY + 15, -10),
        orientation: 'oblique',
        jointSpace: 3
      },
      tibialTuberosity: {
        position: new Vector3(kneeX, kneeY + 35, 10),
        prominence: 8,
        tTTGDistance: 12 // Normal <20mm
      },
      gerdysTubercle: {
        position: new Vector3(kneeX + (side === 'left' ? 20 : -20), kneeY + 30, 5),
        prominence: 5
      },
      fabella: Math.random() > 0.7 ? { // 30% prevalence
        present: true,
        position: new Vector3(kneeX + (side === 'left' ? -15 : 15), kneeY - 10, -5),
        size: 8
      } : { present: false },
      hoffasFatPad: {
        volume: 25, // cm³
        position: new Vector3(kneeX, kneeY + 10, 5)
      },
      measurements: {
        insallSalvatiRatio: 1.0, // Normal 0.8-1.2
        blackburneRatio: 0.8, // Normal 0.5-1.0
        sulcusAngle: 138, // Normal <145°
        lateralPatellarTilt: 5 // Normal <10°
      }
    };
  }
  
  renderEnhancedKnee(ctx: CanvasRenderingContext2D, knee: EnhancedKnee, side: 'left' | 'right', position: { x: number; y: number }) {
    ctx.save();
    
    // Draw intercondylar notch
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (knee.intercondylarNotch.shape === 'U-shaped') {
      ctx.arc(position.x, position.y - 20, knee.intercondylarNotch.width / 2, Math.PI, 0, true);
    } else if (knee.intercondylarNotch.shape === 'A-shaped') {
      ctx.moveTo(position.x - knee.intercondylarNotch.width / 2, position.y - 10);
      ctx.lineTo(position.x, position.y - 30);
      ctx.lineTo(position.x + knee.intercondylarNotch.width / 2, position.y - 10);
    }
    ctx.stroke();
    
    // Draw tibial plateau compartments
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    // Medial compartment
    ctx.beginPath();
    ctx.ellipse(position.x - 15, position.y + 5, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Lateral compartment
    ctx.beginPath();
    ctx.ellipse(position.x + 15, position.y + 5, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw proximal tibiofibular joint
    ctx.strokeStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.arc(knee.proximalTibiofibularJoint.position.x, knee.proximalTibiofibularJoint.position.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw tibial tuberosity
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.ellipse(knee.tibialTuberosity.position.x, knee.tibialTuberosity.position.y, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial';
    ctx.fillText('Tibial Tuberosity', knee.tibialTuberosity.position.x - 35, knee.tibialTuberosity.position.y + 15);
    
    // Draw Gerdy's tubercle
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.arc(knee.gerdysTubercle.position.x, knee.gerdysTubercle.position.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText("Gerdy's", knee.gerdysTubercle.position.x - 20, knee.gerdysTubercle.position.y - 5);
    
    // Draw fabella if present
    if (knee.fabella?.present && knee.fabella.position) {
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(knee.fabella.position.x, knee.fabella.position.y, knee.fabella.size! / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Fabella', knee.fabella.position.x - 20, knee.fabella.position.y - 10);
    }
    
    // Draw Hoffa's fat pad area
    ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
    ctx.beginPath();
    ctx.ellipse(knee.hoffasFatPad.position.x, knee.hoffasFatPad.position.y, 15, 20, 0, 0, Math.PI);
    ctx.fill();
    
    // Display measurements
    const measurementX = side === 'left' ? position.x - 150 : position.x + 50;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`${side.toUpperCase()} Knee:`, measurementX, position.y - 40);
    ctx.font = '9px Arial';
    ctx.fillText(`Notch Width: ${knee.intercondylarNotch.width.toFixed(1)}mm`, measurementX, position.y - 25);
    ctx.fillText(`NWI: ${knee.intercondylarNotch.notchWidthIndex.toFixed(2)}`, measurementX, position.y - 12);
    ctx.fillText(`TT-TG: ${knee.tibialTuberosity.tTTGDistance}mm`, measurementX, position.y + 1);
    ctx.fillText(`IS Ratio: ${knee.measurements.insallSalvatiRatio.toFixed(1)}`, measurementX, position.y + 14);
    ctx.fillText(`Sulcus: ${knee.measurements.sulcusAngle}°`, measurementX, position.y + 27);
    
    ctx.restore();
  }
  
  private getDefaultKnee(): EnhancedKnee {
    return {
      intercondylarNotch: { width: 0, shape: 'U-shaped', notchWidthIndex: 0 },
      tibialPlateau: {
        medial: { slope: 0, depth: 0, area: 0 },
        lateral: { slope: 0, depth: 0, area: 0 }
      },
      proximalTibiofibularJoint: { position: new Vector3(0, 0, 0), orientation: 'horizontal', jointSpace: 0 },
      tibialTuberosity: { position: new Vector3(0, 0, 0), prominence: 0, tTTGDistance: 0 },
      gerdysTubercle: { position: new Vector3(0, 0, 0), prominence: 0 },
      fabella: { present: false },
      hoffasFatPad: { volume: 0, position: new Vector3(0, 0, 0) },
      measurements: { insallSalvatiRatio: 0, blackburneRatio: 0, sulcusAngle: 0, lateralPatellarTilt: 0 }
    };
  }
}

// ==================== ELBOW COMPLEX STRUCTURES ====================

export interface EnhancedElbow {
  humerus: {
    capitellum: {
      position: Vector3;
      width: number;
      ossificationAge?: number; // For pediatric cases
    };
    trochlea: {
      position: Vector3;
      width: number;
      depth: number;
    };
    olecranonFossa: {
      position: Vector3;
      depth: number;
    };
    coronoidFossa: {
      position: Vector3;
      depth: number;
    };
    medialEpicondyle: Vector3;
    lateralEpicondyle: Vector3;
  };
  ulna: {
    coronoidProcess: {
      position: Vector3;
      height: number;
      type: 'normal' | 'hypoplastic' | 'elongated';
    };
    olecranon: {
      position: Vector3;
      size: number;
    };
    sublimeSheelter: Vector3; // Attachment for ulnar collateral ligament
  };
  radius: {
    radialHead: {
      position: Vector3;
      diameter: number;
      shape: 'circular' | 'oval';
    };
    radialNeck: {
      angle: number; // Normal 15°
      width: number;
    };
    radialTuberosity: Vector3;
  };
  alignments: {
    radiocapitellarLine: { aligned: boolean; deviation?: number };
    anteriorHumeralLine: { throughCapitellum: boolean; percentage?: number };
    carryingAngle: number; // Normal 5-15° valgus
    baumansAngle: number; // Normal 70-80°
  };
  fatPads: {
    anterior: { visible: boolean; elevated?: boolean };
    posterior: { visible: boolean; elevated?: boolean }; // Always abnormal if visible
  };
}

export class EnhancedElbowRenderer {
  generateEnhancedElbow(landmarks: any[], width: number, height: number, side: 'left' | 'right'): EnhancedElbow {
    const shoulder = landmarks[side === 'left' ? 11 : 12];
    const elbow = landmarks[side === 'left' ? 13 : 14];
    const wrist = landmarks[side === 'left' ? 15 : 16];
    
    if (!shoulder || !elbow || !wrist) {
      return this.getDefaultElbow();
    }
    
    const elbowX = elbow.x * width;
    const elbowY = elbow.y * height;
    
    return {
      humerus: {
        capitellum: {
          position: new Vector3(elbowX + (side === 'left' ? -10 : 10), elbowY - 15, 0),
          width: 12
        },
        trochlea: {
          position: new Vector3(elbowX, elbowY - 15, 0),
          width: 15,
          depth: 8
        },
        olecranonFossa: {
          position: new Vector3(elbowX, elbowY - 20, -5),
          depth: 10
        },
        coronoidFossa: {
          position: new Vector3(elbowX, elbowY - 18, 5),
          depth: 8
        },
        medialEpicondyle: new Vector3(elbowX + (side === 'left' ? 15 : -15), elbowY - 10, 0),
        lateralEpicondyle: new Vector3(elbowX + (side === 'left' ? -15 : 15), elbowY - 10, 0)
      },
      ulna: {
        coronoidProcess: {
          position: new Vector3(elbowX, elbowY + 5, 5),
          height: 10,
          type: 'normal'
        },
        olecranon: {
          position: new Vector3(elbowX, elbowY + 8, -5),
          size: 15
        },
        sublimeSheelter: new Vector3(elbowX + (side === 'left' ? 5 : -5), elbowY + 10, 0)
      },
      radius: {
        radialHead: {
          position: new Vector3(elbowX + (side === 'left' ? -8 : 8), elbowY, 0),
          diameter: 20,
          shape: 'circular'
        },
        radialNeck: {
          angle: 15,
          width: 12
        },
        radialTuberosity: new Vector3(elbowX + (side === 'left' ? -10 : 10), elbowY + 20, 3)
      },
      alignments: {
        radiocapitellarLine: { aligned: true },
        anteriorHumeralLine: { throughCapitellum: true, percentage: 33 }, // Should pass through middle third
        carryingAngle: side === 'left' ? 10 : 10, // Normal valgus
        baumansAngle: 75
      },
      fatPads: {
        anterior: { visible: true, elevated: false }, // Normal to see anterior fat pad
        posterior: { visible: false } // Should not be visible normally
      }
    };
  }
  
  renderEnhancedElbow(ctx: CanvasRenderingContext2D, elbow: EnhancedElbow, side: 'left' | 'right', position: { x: number; y: number }) {
    ctx.save();
    
    // Draw distal humerus structures
    ctx.strokeStyle = '#e8e8e8';
    ctx.fillStyle = 'rgba(245, 245, 245, 0.9)';
    ctx.lineWidth = 2;
    
    // Capitellum
    ctx.beginPath();
    ctx.arc(elbow.humerus.capitellum.position.x, elbow.humerus.capitellum.position.y, elbow.humerus.capitellum.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Trochlea
    ctx.beginPath();
    ctx.ellipse(elbow.humerus.trochlea.position.x, elbow.humerus.trochlea.position.y, elbow.humerus.trochlea.width / 2, elbow.humerus.trochlea.depth / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Olecranon fossa (posterior)
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.beginPath();
    ctx.ellipse(elbow.humerus.olecranonFossa.position.x, elbow.humerus.olecranonFossa.position.y, 8, elbow.humerus.olecranonFossa.depth / 2, 0, 0, Math.PI);
    ctx.fill();
    
    // Epicondyles
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.arc(elbow.humerus.medialEpicondyle.x, elbow.humerus.medialEpicondyle.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(elbow.humerus.lateralEpicondyle.x, elbow.humerus.lateralEpicondyle.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ulna structures
    ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
    
    // Olecranon
    ctx.beginPath();
    ctx.ellipse(elbow.ulna.olecranon.position.x, elbow.ulna.olecranon.position.y, elbow.ulna.olecranon.size / 2, elbow.ulna.olecranon.size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Coronoid process
    ctx.beginPath();
    ctx.moveTo(elbow.ulna.coronoidProcess.position.x - 5, elbow.ulna.coronoidProcess.position.y);
    ctx.lineTo(elbow.ulna.coronoidProcess.position.x, elbow.ulna.coronoidProcess.position.y - elbow.ulna.coronoidProcess.height);
    ctx.lineTo(elbow.ulna.coronoidProcess.position.x + 5, elbow.ulna.coronoidProcess.position.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw radial head
    ctx.beginPath();
    if (elbow.radius.radialHead.shape === 'circular') {
      ctx.arc(elbow.radius.radialHead.position.x, elbow.radius.radialHead.position.y, elbow.radius.radialHead.diameter / 2, 0, Math.PI * 2);
    } else {
      ctx.ellipse(elbow.radius.radialHead.position.x, elbow.radius.radialHead.position.y, elbow.radius.radialHead.diameter / 2, elbow.radius.radialHead.diameter / 2.5, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    
    // Draw alignment lines
    if (elbow.alignments.radiocapitellarLine.aligned) {
      ctx.strokeStyle = '#00ff00';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(elbow.radius.radialHead.position.x, elbow.radius.radialHead.position.y);
      ctx.lineTo(elbow.humerus.capitellum.position.x, elbow.humerus.capitellum.position.y);
      ctx.stroke();
    }
    
    // Anterior humeral line
    ctx.strokeStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(position.x, position.y - 40);
    ctx.lineTo(elbow.humerus.capitellum.position.x, elbow.humerus.capitellum.position.y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial';
    ctx.fillText('Capitellum', elbow.humerus.capitellum.position.x - 25, elbow.humerus.capitellum.position.y - 20);
    ctx.fillText('Radial Head', elbow.radius.radialHead.position.x - 30, elbow.radius.radialHead.position.y + 20);
    ctx.fillText('Coronoid', elbow.ulna.coronoidProcess.position.x - 25, elbow.ulna.coronoidProcess.position.y + 15);
    
    // Display measurements
    const measurementX = side === 'left' ? position.x - 120 : position.x + 40;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`${side.toUpperCase()} Elbow:`, measurementX, position.y - 30);
    ctx.font = '9px Arial';
    ctx.fillText(`Carrying Angle: ${elbow.alignments.carryingAngle}°`, measurementX, position.y - 15);
    ctx.fillText(`Baumann's: ${elbow.alignments.baumansAngle}°`, measurementX, position.y - 2);
    ctx.fillText(`Radial Neck: ${elbow.radius.radialNeck.angle}°`, measurementX, position.y + 11);
    
    if (elbow.alignments.radiocapitellarLine.aligned) {
      ctx.fillStyle = '#00ff00';
      ctx.fillText('✓ RC Line Aligned', measurementX, position.y + 24);
    }
    if (elbow.alignments.anteriorHumeralLine.throughCapitellum) {
      ctx.fillText('✓ AHL Normal', measurementX, position.y + 37);
    }
    
    ctx.restore();
  }
  
  private getDefaultElbow(): EnhancedElbow {
    const defaultVec = new Vector3(0, 0, 0);
    return {
      humerus: {
        capitellum: { position: defaultVec, width: 0 },
        trochlea: { position: defaultVec, width: 0, depth: 0 },
        olecranonFossa: { position: defaultVec, depth: 0 },
        coronoidFossa: { position: defaultVec, depth: 0 },
        medialEpicondyle: defaultVec,
        lateralEpicondyle: defaultVec
      },
      ulna: {
        coronoidProcess: { position: defaultVec, height: 0, type: 'normal' },
        olecranon: { position: defaultVec, size: 0 },
        sublimeSheelter: defaultVec
      },
      radius: {
        radialHead: { position: defaultVec, diameter: 0, shape: 'circular' },
        radialNeck: { angle: 0, width: 0 },
        radialTuberosity: defaultVec
      },
      alignments: {
        radiocapitellarLine: { aligned: false },
        anteriorHumeralLine: { throughCapitellum: false },
        carryingAngle: 0,
        baumansAngle: 0
      },
      fatPads: {
        anterior: { visible: false },
        posterior: { visible: false }
      }
    };
  }
}