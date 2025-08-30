/**
 * Anatomically Accurate Ribcage Renderer
 * Provides medical-grade ribcage visualization with proper morphology and movement
 */

import { NormalizedLandmark } from '@mediapipe/pose';
import { VertebralSegment } from './DetailedBoneStructures';

export interface Rib {
  number: number;
  type: 'true' | 'false' | 'floating';
  vertebralAttachment: { x: number; y: number };
  sternalAttachment?: { x: number; y: number };
  curvePoints: { x: number; y: number }[];
  angle: number; // Declination angle
  intercostalSpace?: number;
}

export interface Sternum {
  manubrium: { x: number; y: number; width: number; height: number };
  body: { x: number; y: number; width: number; height: number };
  xiphoid: { x: number; y: number; width: number; height: number };
  sternalAngle: { x: number; y: number }; // Angle of Louis at rib 2
}

export class RibcageRenderer {
  private breathingPhase: number = 0;
  private previousBreathingPhase: number = 0;
  private smoothingFactor: number = 0.3;

  /**
   * Generate anatomically accurate ribs based on vertebral positions
   */
  generateRibs(
    vertebrae: VertebralSegment[],
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): Rib[] {
    const ribs: Rib[] = [];
    
    // Get thoracic vertebrae (T1-T12) for rib attachments
    const thoracicVertebrae = vertebrae.slice(7, 19); // Indices 7-18 are T1-T12
    
    // Calculate sternum position from shoulders
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x) * width;
    const chestCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2 * width,
      y: (leftShoulder.y + rightShoulder.y) / 2 * height
    };
    
    // Detect breathing phase from shoulder movement
    const shoulderElevation = (leftShoulder.y + rightShoulder.y) / 2;
    const rawBreathingPhase = Math.sin(shoulderElevation * Math.PI * 2) * 0.05;
    this.breathingPhase = this.previousBreathingPhase + 
      (rawBreathingPhase - this.previousBreathingPhase) * this.smoothingFactor;
    this.previousBreathingPhase = this.breathingPhase;
    
    // Generate each rib pair
    for (let i = 0; i < 12; i++) {
      const ribNumber = i + 1;
      const vertebra = thoracicVertebrae[i];
      
      // Determine rib type
      let ribType: 'true' | 'false' | 'floating';
      if (ribNumber <= 7) {
        ribType = 'true';
      } else if (ribNumber <= 10) {
        ribType = 'false';
      } else {
        ribType = 'floating';
      }
      
      // Calculate rib angle (increases from 1-12)
      const baseAngle = 20 + (i * 3); // Degrees, increasing declination
      const angleRad = (baseAngle * Math.PI) / 180;
      
      // Calculate rib length based on type and number
      let ribLength: number;
      if (ribNumber <= 7) {
        // True ribs - longest at ribs 5-7
        ribLength = shoulderWidth * (0.8 + Math.sin((ribNumber / 7) * Math.PI) * 0.2);
      } else if (ribNumber <= 10) {
        // False ribs - gradually shorter
        ribLength = shoulderWidth * (0.9 - (ribNumber - 7) * 0.05);
      } else {
        // Floating ribs - shortest
        ribLength = shoulderWidth * (0.5 - (ribNumber - 11) * 0.1);
      }
      
      // Apply breathing expansion (more in lower ribs)
      const breathingExpansion = 1 + (this.breathingPhase * (i / 12) * 0.1);
      ribLength *= breathingExpansion;
      
      // Generate left rib
      const leftRib = this.generateSingleRib(
        ribNumber,
        ribType,
        vertebra,
        chestCenter,
        ribLength,
        angleRad,
        'left',
        width,
        height
      );
      ribs.push(leftRib);
      
      // Generate right rib
      const rightRib = this.generateSingleRib(
        ribNumber,
        ribType,
        vertebra,
        chestCenter,
        ribLength,
        angleRad,
        'right',
        width,
        height
      );
      ribs.push(rightRib);
    }
    
    return ribs;
  }
  
  /**
   * Generate a single rib with proper curvature
   */
  private generateSingleRib(
    number: number,
    type: 'true' | 'false' | 'floating',
    vertebra: VertebralSegment,
    chestCenter: { x: number; y: number },
    length: number,
    angle: number,
    side: 'left' | 'right',
    width: number,
    height: number
  ): Rib {
    const vertebralAttachment = {
      x: vertebra.body.x + vertebra.body.width / 2,
      y: vertebra.body.y + vertebra.body.height / 2
    };
    
    // Calculate curve points using quadratic bezier
    const curvePoints: { x: number; y: number }[] = [];
    const numPoints = 20;
    
    // Determine curve characteristics based on rib number
    const curveFactor = number <= 6 ? 0.3 : 0.4; // Upper ribs less curved
    const lateralExpansion = number <= 6 ? 0.7 : 1.0; // Lower ribs more lateral
    
    for (let t = 0; t <= 1; t += 1 / numPoints) {
      // Start at vertebra
      const startX = vertebralAttachment.x;
      const startY = vertebralAttachment.y;
      
      // End point depends on rib type
      let endX: number, endY: number;
      
      if (type === 'floating') {
        // Floating ribs don't reach sternum
        endX = startX + (side === 'left' ? -length : length) * 0.6;
        endY = startY + Math.sin(angle) * length * 0.3;
      } else {
        // True and false ribs curve toward sternum
        endX = chestCenter.x + (side === 'left' ? -20 : 20);
        endY = startY + Math.sin(angle) * length * 0.4;
      }
      
      // Control point for curve
      const controlX = startX + (endX - startX) * 0.5 + 
        (side === 'left' ? -1 : 1) * length * curveFactor * lateralExpansion;
      const controlY = startY + (endY - startY) * 0.5 + 
        Math.cos(angle) * length * 0.2;
      
      // Quadratic bezier curve
      const x = Math.pow(1 - t, 2) * startX + 
        2 * (1 - t) * t * controlX + 
        Math.pow(t, 2) * endX;
      const y = Math.pow(1 - t, 2) * startY + 
        2 * (1 - t) * t * controlY + 
        Math.pow(t, 2) * endY;
      
      curvePoints.push({ x, y });
    }
    
    // Calculate sternal attachment for true ribs
    let sternalAttachment: { x: number; y: number } | undefined;
    if (type === 'true') {
      sternalAttachment = curvePoints[curvePoints.length - 1];
    }
    
    // Calculate intercostal space (varies by location)
    const intercostalSpace = 8 + (number * 0.5); // Increases slightly down the chest
    
    return {
      number,
      type,
      vertebralAttachment,
      sternalAttachment,
      curvePoints,
      angle: angle * 180 / Math.PI,
      intercostalSpace
    };
  }
  
  /**
   * Generate sternum with anatomical landmarks
   */
  generateSternum(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): Sternum {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    const centerX = (leftShoulder.x + rightShoulder.x) / 2 * width;
    const topY = (leftShoulder.y + rightShoulder.y) / 2 * height;
    
    // Manubrium (top part)
    const manubrium = {
      x: centerX - 15,
      y: topY,
      width: 30,
      height: 40
    };
    
    // Sternal angle (Angle of Louis) at T4-T5 level
    const sternalAngle = {
      x: centerX,
      y: topY + 40
    };
    
    // Body of sternum
    const body = {
      x: centerX - 20,
      y: topY + 40,
      width: 40,
      height: 100
    };
    
    // Xiphoid process
    const xiphoid = {
      x: centerX - 10,
      y: topY + 140,
      width: 20,
      height: 20
    };
    
    return {
      manubrium,
      body,
      xiphoid,
      sternalAngle
    };
  }
  
  /**
   * Render the ribcage with clinical annotations
   */
  renderRibcage(
    ctx: CanvasRenderingContext2D,
    ribs: Rib[],
    sternum: Sternum,
    showLabels: boolean = true
  ) {
    // Draw intercostal spaces first (as background)
    ctx.fillStyle = 'rgba(100, 100, 120, 0.1)';
    for (let i = 0; i < ribs.length - 2; i += 2) {
      const upperRib = ribs[i];
      const lowerRib = ribs[i + 2];
      
      if (upperRib.curvePoints.length > 0 && lowerRib.curvePoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(upperRib.curvePoints[0].x, upperRib.curvePoints[0].y);
        
        // Draw upper rib curve
        upperRib.curvePoints.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        
        // Connect to lower rib
        for (let j = lowerRib.curvePoints.length - 1; j >= 0; j--) {
          ctx.lineTo(lowerRib.curvePoints[j].x, lowerRib.curvePoints[j].y);
        }
        
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // Draw sternum
    ctx.fillStyle = 'rgba(230, 230, 230, 0.9)';
    ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
    ctx.lineWidth = 2;
    
    // Manubrium
    ctx.fillRect(sternum.manubrium.x, sternum.manubrium.y, 
      sternum.manubrium.width, sternum.manubrium.height);
    ctx.strokeRect(sternum.manubrium.x, sternum.manubrium.y, 
      sternum.manubrium.width, sternum.manubrium.height);
    
    // Body
    ctx.fillRect(sternum.body.x, sternum.body.y, 
      sternum.body.width, sternum.body.height);
    ctx.strokeRect(sternum.body.x, sternum.body.y, 
      sternum.body.width, sternum.body.height);
    
    // Xiphoid
    ctx.fillRect(sternum.xiphoid.x, sternum.xiphoid.y, 
      sternum.xiphoid.width, sternum.xiphoid.height);
    ctx.strokeRect(sternum.xiphoid.x, sternum.xiphoid.y, 
      sternum.xiphoid.width, sternum.xiphoid.height);
    
    // Sternal angle marker
    ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(sternum.sternalAngle.x, sternum.sternalAngle.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ribs
    ribs.forEach(rib => {
      // Set style based on rib type
      if (rib.type === 'true') {
        ctx.strokeStyle = 'rgba(240, 240, 240, 1)';
        ctx.lineWidth = 3;
      } else if (rib.type === 'false') {
        ctx.strokeStyle = 'rgba(220, 220, 220, 0.9)';
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.lineWidth = 2;
      }
      
      // Draw rib curve
      ctx.beginPath();
      rib.curvePoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      
      // Draw costal cartilage for true and false ribs
      if (rib.sternalAttachment) {
        ctx.strokeStyle = 'rgba(180, 180, 200, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        const lastPoint = rib.curvePoints[rib.curvePoints.length - 1];
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(rib.sternalAttachment.x, rib.sternalAttachment.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Draw vertebral attachment point
      ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
      ctx.beginPath();
      ctx.arc(rib.vertebralAttachment.x, rib.vertebralAttachment.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw labels if enabled
    if (showLabels) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
      ctx.font = '10px monospace';
      
      // Label key ribs
      [1, 5, 10, 12].forEach(ribNum => {
        const rib = ribs.find(r => r.number === ribNum && r.curvePoints.length > 10);
        if (rib) {
          const midPoint = rib.curvePoints[Math.floor(rib.curvePoints.length / 2)];
          ctx.fillText(`R${ribNum}`, midPoint.x, midPoint.y);
        }
      });
      
      // Label sternal angle
      ctx.fillText('Angle of Louis', sternum.sternalAngle.x + 10, sternum.sternalAngle.y);
    }
  }
}