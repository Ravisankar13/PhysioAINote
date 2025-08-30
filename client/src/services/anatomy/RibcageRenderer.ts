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
    
    // Draw ribs as 3D bone structures
    ribs.forEach(rib => {
      // Calculate rib thickness based on type and number
      let ribThickness: number;
      if (rib.type === 'true') {
        ribThickness = 6 - (rib.number - 1) * 0.2; // Thicker at top
      } else if (rib.type === 'false') {
        ribThickness = 4;
      } else {
        ribThickness = 3;
      }
      
      // Draw rib as 3D bone with gradient
      ctx.save();
      
      // Create gradient for 3D effect
      const gradient = ctx.createLinearGradient(
        rib.curvePoints[0].x, 
        rib.curvePoints[0].y - ribThickness,
        rib.curvePoints[0].x, 
        rib.curvePoints[0].y + ribThickness
      );
      
      if (rib.type === 'true') {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.3, 'rgba(245, 245, 245, 1)');
        gradient.addColorStop(0.5, 'rgba(240, 240, 240, 1)');
        gradient.addColorStop(0.7, 'rgba(230, 230, 230, 1)');
        gradient.addColorStop(1, 'rgba(210, 210, 210, 0.9)');
      } else if (rib.type === 'false') {
        gradient.addColorStop(0, 'rgba(245, 245, 245, 0.9)');
        gradient.addColorStop(0.5, 'rgba(230, 230, 230, 0.95)');
        gradient.addColorStop(1, 'rgba(200, 200, 200, 0.85)');
      } else {
        gradient.addColorStop(0, 'rgba(240, 240, 240, 0.85)');
        gradient.addColorStop(0.5, 'rgba(220, 220, 220, 0.9)');
        gradient.addColorStop(1, 'rgba(190, 190, 190, 0.8)');
      }
      
      // Draw rib body as filled shape with thickness
      ctx.fillStyle = gradient;
      ctx.strokeStyle = 'rgba(180, 180, 180, 0.8)';
      ctx.lineWidth = 1;
      
      // Create rib bone shape with proper thickness
      ctx.beginPath();
      
      // Top edge of rib
      rib.curvePoints.forEach((point, index) => {
        const thickness = ribThickness * (1 - index / rib.curvePoints.length * 0.3); // Taper toward end
        if (index === 0) {
          ctx.moveTo(point.x, point.y - thickness / 2);
        } else {
          ctx.lineTo(point.x, point.y - thickness / 2);
        }
      });
      
      // Bottom edge of rib (reverse order)
      for (let i = rib.curvePoints.length - 1; i >= 0; i--) {
        const point = rib.curvePoints[i];
        const thickness = ribThickness * (1 - i / rib.curvePoints.length * 0.3);
        ctx.lineTo(point.x, point.y + thickness / 2);
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Add highlight for 3D effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      rib.curvePoints.forEach((point, index) => {
        const thickness = ribThickness * (1 - index / rib.curvePoints.length * 0.3);
        if (index === 0) {
          ctx.moveTo(point.x, point.y - thickness / 2);
        } else {
          ctx.lineTo(point.x, point.y - thickness / 2);
        }
      });
      ctx.stroke();
      
      // Add shadow for depth
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      rib.curvePoints.forEach((point, index) => {
        const thickness = ribThickness * (1 - index / rib.curvePoints.length * 0.3);
        if (index === 0) {
          ctx.moveTo(point.x, point.y + thickness / 2);
        } else {
          ctx.lineTo(point.x, point.y + thickness / 2);
        }
      });
      ctx.stroke();
      
      ctx.restore();
      
      // Draw costal cartilage for true and false ribs as 3D structures
      if (rib.sternalAttachment) {
        const lastPoint = rib.curvePoints[rib.curvePoints.length - 1];
        const cartilageThickness = 3;
        
        // Create gradient for cartilage (bluish-white)
        const cartilageGradient = ctx.createLinearGradient(
          lastPoint.x, lastPoint.y - cartilageThickness,
          lastPoint.x, lastPoint.y + cartilageThickness
        );
        cartilageGradient.addColorStop(0, 'rgba(220, 230, 245, 0.9)');
        cartilageGradient.addColorStop(0.5, 'rgba(200, 210, 230, 0.95)');
        cartilageGradient.addColorStop(1, 'rgba(180, 190, 210, 0.85)');
        
        // Draw cartilage as a tapered 3D connection
        ctx.fillStyle = cartilageGradient;
        ctx.strokeStyle = 'rgba(160, 170, 190, 0.6)';
        ctx.lineWidth = 0.5;
        
        ctx.beginPath();
        // Top edge
        ctx.moveTo(lastPoint.x, lastPoint.y - cartilageThickness);
        ctx.lineTo(rib.sternalAttachment.x, rib.sternalAttachment.y - cartilageThickness * 0.5);
        // Bottom edge
        ctx.lineTo(rib.sternalAttachment.x, rib.sternalAttachment.y + cartilageThickness * 0.5);
        ctx.lineTo(lastPoint.x, lastPoint.y + cartilageThickness);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      
      // Draw vertebral attachment point as a 3D joint
      const jointGradient = ctx.createRadialGradient(
        rib.vertebralAttachment.x, rib.vertebralAttachment.y, 0,
        rib.vertebralAttachment.x, rib.vertebralAttachment.y, 5
      );
      jointGradient.addColorStop(0, 'rgba(255, 245, 240, 0.9)');
      jointGradient.addColorStop(0.5, 'rgba(240, 220, 210, 0.8)');
      jointGradient.addColorStop(1, 'rgba(220, 180, 160, 0.6)');
      
      ctx.fillStyle = jointGradient;
      ctx.strokeStyle = 'rgba(200, 150, 130, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rib.vertebralAttachment.x, rib.vertebralAttachment.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
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