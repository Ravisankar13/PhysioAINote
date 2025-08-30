/**
 * Detailed Bone Structures for Medical-Grade Visualization
 * Provides anatomically accurate bone geometry for X-ray alternative visualization
 */

import { NormalizedLandmark } from '@mediapipe/pose';

export interface BoneStructure {
  name: string;
  points: { x: number; y: number }[];
  type: 'bone' | 'cartilage' | 'joint';
  clinicalSignificance?: string;
  depth: number; // For layered rendering
}

export interface VertebralSegment {
  level: string;
  body: { x: number; y: number; width: number; height: number };
  spinousProcess: { x: number; y: number }[];
  transverseProcesses: { left: { x: number; y: number }[], right: { x: number; y: number }[] };
  facetJoints: { superior: { x: number; y: number }, inferior: { x: number; y: number } };
}

export class DetailedSpineRenderer {
  private vertebralLevels = {
    cervical: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    thoracic: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    lumbar: ['L1', 'L2', 'L3', 'L4', 'L5'],
    sacral: ['S1-S5'],
    coccygeal: ['Co1-Co4']
  };

  /**
   * Generate detailed vertebrae with anatomical processes
   */
  generateDetailedVertebrae(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): VertebralSegment[] {
    const vertebrae: VertebralSegment[] = [];
    
    // Calculate spine line from shoulders to hips
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    // Generate cervical vertebrae (C1-C7)
    const neckTop = { x: shoulderMidpoint.x, y: shoulderMidpoint.y - 0.15 };
    const cervicalHeight = (shoulderMidpoint.y - neckTop.y) / 7;
    
    for (let i = 0; i < 7; i++) {
      const level = `C${i + 1}`;
      const yPos = neckTop.y + (i * cervicalHeight);
      
      vertebrae.push(this.createVertebra(
        level,
        shoulderMidpoint.x * width,
        yPos * height,
        width * 0.025, // Cervical vertebrae are smaller
        height * 0.018,
        'cervical'
      ));
    }

    // Generate thoracic vertebrae (T1-T12)
    const thoracicLength = Math.abs(shoulderMidpoint.y - (shoulderMidpoint.y + hipMidpoint.y) / 2);
    const thoracicHeight = thoracicLength / 12;
    
    for (let i = 0; i < 12; i++) {
      const level = `T${i + 1}`;
      const yPos = shoulderMidpoint.y + (i * thoracicHeight);
      
      vertebrae.push(this.createVertebra(
        level,
        shoulderMidpoint.x * width,
        yPos * height,
        width * 0.03 + (i * 0.001), // Gradually increase size
        height * 0.022,
        'thoracic'
      ));
    }

    // Generate lumbar vertebrae (L1-L5)
    const lumbarStart = shoulderMidpoint.y + thoracicLength;
    const lumbarHeight = (hipMidpoint.y - lumbarStart) / 5;
    
    for (let i = 0; i < 5; i++) {
      const level = `L${i + 1}`;
      const yPos = lumbarStart + (i * lumbarHeight);
      
      vertebrae.push(this.createVertebra(
        level,
        hipMidpoint.x * width,
        yPos * height,
        width * 0.04, // Lumbar vertebrae are largest
        height * 0.028,
        'lumbar'
      ));
    }

    return vertebrae;
  }

  private createVertebra(
    level: string,
    x: number,
    y: number,
    width: number,
    height: number,
    type: 'cervical' | 'thoracic' | 'lumbar'
  ): VertebralSegment {
    // Adjust morphology based on vertebral type
    const bodyShape = type === 'cervical' ? 0.8 : type === 'thoracic' ? 0.9 : 1.0;
    const processLength = type === 'cervical' ? 0.6 : type === 'thoracic' ? 0.8 : 1.0;

    return {
      level,
      body: {
        x: x - width / 2,
        y: y - height / 2,
        width: width * bodyShape,
        height: height
      },
      spinousProcess: [
        { x, y },
        { x: x - width * 0.15 * processLength, y: y - height * 0.8 },
        { x: x - width * 0.2 * processLength, y: y - height * 1.2 }
      ],
      transverseProcesses: {
        left: [
          { x, y },
          { x: x - width * 0.8, y: y - height * 0.3 },
          { x: x - width * 1.2, y: y - height * 0.4 }
        ],
        right: [
          { x, y },
          { x: x + width * 0.8, y: y - height * 0.3 },
          { x: x + width * 1.2, y: y - height * 0.4 }
        ]
      },
      facetJoints: {
        superior: { x, y: y - height / 2 },
        inferior: { x, y: y + height / 2 }
      }
    };
  }

  /**
   * Render detailed vertebrae with clinical annotations
   */
  renderVertebrae(
    ctx: CanvasRenderingContext2D,
    vertebrae: VertebralSegment[],
    showLabels: boolean = true
  ) {
    vertebrae.forEach(vertebra => {
      // Draw vertebral body
      ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
      ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
      ctx.lineWidth = 2;
      
      // Vertebral body (rounded rectangle for realism)
      ctx.beginPath();
      this.roundRect(
        ctx,
        vertebra.body.x,
        vertebra.body.y,
        vertebra.body.width,
        vertebra.body.height,
        5
      );
      ctx.fill();
      ctx.stroke();

      // Draw spinous process
      ctx.strokeStyle = 'rgba(220, 220, 220, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      vertebra.spinousProcess.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Draw transverse processes
      ctx.strokeStyle = 'rgba(210, 210, 210, 0.7)';
      ctx.lineWidth = 2;
      
      // Left transverse process
      ctx.beginPath();
      vertebra.transverseProcesses.left.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      
      // Right transverse process
      ctx.beginPath();
      vertebra.transverseProcesses.right.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Draw facet joints
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(180, 180, 180, 1)';
      ctx.lineWidth = 1;
      
      // Superior facet
      ctx.beginPath();
      ctx.arc(vertebra.facetJoints.superior.x, vertebra.facetJoints.superior.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Inferior facet
      ctx.beginPath();
      ctx.arc(vertebra.facetJoints.inferior.x, vertebra.facetJoints.inferior.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw label if enabled
      if (showLabels) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(vertebra.level, vertebra.body.x + vertebra.body.width + 5, vertebra.body.y + vertebra.body.height / 2);
      }
    });
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export class RibcageRenderer {
  /**
   * Generate anatomically accurate ribcage
   */
  generateRibcage(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): BoneStructure[] {
    const ribs: BoneStructure[] = [];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    const chestWidth = Math.abs(leftShoulder.x - rightShoulder.x) * width;
    const chestHeight = Math.abs(shoulderMidpoint.y - (leftHip.y + rightHip.y) / 2) * height * 0.6;

    // Generate 12 pairs of ribs
    for (let i = 0; i < 12; i++) {
      const ribLevel = i + 1;
      const yOffset = shoulderMidpoint.y * height + (i * chestHeight / 12);
      
      // Adjust rib curvature and length based on position
      const curvature = this.getRibCurvature(ribLevel);
      const ribLength = this.getRibLength(ribLevel, chestWidth);
      
      // Left rib
      ribs.push({
        name: `Rib ${ribLevel}L`,
        points: this.generateRibPoints(
          shoulderMidpoint.x * width,
          yOffset,
          ribLength,
          curvature,
          'left'
        ),
        type: 'bone',
        depth: ribLevel,
        clinicalSignificance: this.getRibClinicalSignificance(ribLevel)
      });
      
      // Right rib
      ribs.push({
        name: `Rib ${ribLevel}R`,
        points: this.generateRibPoints(
          shoulderMidpoint.x * width,
          yOffset,
          ribLength,
          curvature,
          'right'
        ),
        type: 'bone',
        depth: ribLevel,
        clinicalSignificance: this.getRibClinicalSignificance(ribLevel)
      });
    }

    // Add sternum
    ribs.push(this.generateSternum(shoulderMidpoint, width, height));

    return ribs;
  }

  private getRibCurvature(ribLevel: number): number {
    // True ribs (1-7) have more curvature
    // False ribs (8-10) have moderate curvature
    // Floating ribs (11-12) have less curvature
    if (ribLevel <= 7) return 0.4;
    if (ribLevel <= 10) return 0.3;
    return 0.2;
  }

  private getRibLength(ribLevel: number, maxWidth: number): number {
    // Ribs 1-2 are shorter, 3-7 are longest, 8-12 gradually shorten
    const lengthFactors = [0.7, 0.8, 0.9, 0.95, 1.0, 1.0, 0.95, 0.9, 0.85, 0.75, 0.6, 0.5];
    return maxWidth * lengthFactors[ribLevel - 1];
  }

  private getRibClinicalSignificance(ribLevel: number): string {
    if (ribLevel <= 7) return 'True rib - directly attached to sternum';
    if (ribLevel <= 10) return 'False rib - indirectly attached via cartilage';
    return 'Floating rib - no sternal attachment';
  }

  private generateRibPoints(
    centerX: number,
    centerY: number,
    length: number,
    curvature: number,
    side: 'left' | 'right'
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const direction = side === 'left' ? -1 : 1;
    
    // Generate curved rib path
    for (let t = 0; t <= 1; t += 0.1) {
      const x = centerX + direction * length * t;
      const y = centerY + Math.sin(t * Math.PI) * length * curvature;
      points.push({ x, y });
    }
    
    return points;
  }

  private generateSternum(
    midpoint: { x: number; y: number },
    width: number,
    height: number
  ): BoneStructure {
    const sternumWidth = width * 0.03;
    const sternumHeight = height * 0.2;
    
    return {
      name: 'Sternum',
      points: [
        { x: midpoint.x * width - sternumWidth / 2, y: midpoint.y * height },
        { x: midpoint.x * width + sternumWidth / 2, y: midpoint.y * height },
        { x: midpoint.x * width + sternumWidth / 2, y: midpoint.y * height + sternumHeight },
        { x: midpoint.x * width, y: midpoint.y * height + sternumHeight + 20 }, // Xiphoid process
        { x: midpoint.x * width - sternumWidth / 2, y: midpoint.y * height + sternumHeight }
      ],
      type: 'bone',
      depth: 0,
      clinicalSignificance: 'Central chest bone - attachment for ribs and clavicles'
    };
  }

  renderRibcage(ctx: CanvasRenderingContext2D, ribs: BoneStructure[]) {
    ribs.forEach(rib => {
      ctx.strokeStyle = 'rgba(230, 230, 230, 0.8)';
      ctx.fillStyle = 'rgba(245, 245, 245, 0.6)';
      ctx.lineWidth = rib.name.includes('Sternum') ? 4 : 3;
      
      ctx.beginPath();
      rib.points.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      
      if (rib.name.includes('Sternum')) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();
    });
  }
}

export class PelvisRenderer {
  /**
   * Generate detailed pelvic anatomy
   */
  generatePelvis(
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): BoneStructure[] {
    const pelvis: BoneStructure[] = [];
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const hipWidth = Math.abs(leftHip.x - rightHip.x) * width;
    const centerX = (leftHip.x + rightHip.x) / 2 * width;
    const centerY = (leftHip.y + rightHip.y) / 2 * height;

    // Generate ilium (hip blade)
    pelvis.push({
      name: 'Left Ilium',
      points: this.generateIliumPoints(centerX - hipWidth / 2, centerY, hipWidth * 0.3, height * 0.1),
      type: 'bone',
      depth: 1,
      clinicalSignificance: 'Large wing-like bone of pelvis'
    });

    pelvis.push({
      name: 'Right Ilium',
      points: this.generateIliumPoints(centerX + hipWidth / 2, centerY, hipWidth * 0.3, height * 0.1),
      type: 'bone',
      depth: 1,
      clinicalSignificance: 'Large wing-like bone of pelvis'
    });

    // Generate pubis
    pelvis.push({
      name: 'Pubic Symphysis',
      points: [
        { x: centerX - 10, y: centerY + height * 0.05 },
        { x: centerX + 10, y: centerY + height * 0.05 },
        { x: centerX + 10, y: centerY + height * 0.08 },
        { x: centerX - 10, y: centerY + height * 0.08 }
      ],
      type: 'cartilage',
      depth: 0,
      clinicalSignificance: 'Central joint of pelvis - important for alignment'
    });

    // Generate sacrum
    pelvis.push({
      name: 'Sacrum',
      points: this.generateSacrumPoints(centerX, centerY - height * 0.05, width * 0.08, height * 0.12),
      type: 'bone',
      depth: 2,
      clinicalSignificance: 'Fused vertebrae connecting spine to pelvis'
    });

    return pelvis;
  }

  private generateIliumPoints(x: number, y: number, width: number, height: number): { x: number; y: number }[] {
    return [
      { x: x - width / 2, y: y - height },
      { x: x + width / 2, y: y - height * 0.8 },
      { x: x + width / 3, y: y },
      { x: x, y: y + height / 2 },
      { x: x - width / 3, y: y }
    ];
  }

  private generateSacrumPoints(x: number, y: number, width: number, height: number): { x: number; y: number }[] {
    return [
      { x: x - width / 2, y },
      { x: x + width / 2, y },
      { x: x + width / 3, y: y + height },
      { x: x, y: y + height * 1.2 }, // Coccyx tip
      { x: x - width / 3, y: y + height }
    ];
  }

  renderPelvis(ctx: CanvasRenderingContext2D, pelvis: BoneStructure[]) {
    pelvis.forEach(bone => {
      if (bone.type === 'cartilage') {
        ctx.fillStyle = 'rgba(200, 220, 240, 0.7)';
        ctx.strokeStyle = 'rgba(150, 180, 210, 1)';
      } else {
        ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
        ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
      }
      
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      bone.points.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
}

// Clinical measurement utilities
export class BoneMeasurements {
  /**
   * Calculate Cobb angle for scoliosis assessment
   */
  static calculateCobbAngle(vertebrae: VertebralSegment[]): number {
    if (vertebrae.length < 3) return 0;
    
    // Find the most tilted vertebrae at the top and bottom of the curve
    let maxTilt = 0;
    let topVertebra = vertebrae[0];
    let bottomVertebra = vertebrae[vertebrae.length - 1];
    
    // Calculate tilt for each vertebra
    vertebrae.forEach(v => {
      const tilt = Math.abs(v.transverseProcesses.left[1].y - v.transverseProcesses.right[1].y);
      if (tilt > maxTilt) {
        maxTilt = tilt;
      }
    });
    
    // Calculate angle between end vertebrae
    const angle = Math.atan2(
      bottomVertebra.body.y - topVertebra.body.y,
      bottomVertebra.body.x - topVertebra.body.x
    ) * (180 / Math.PI);
    
    return Math.abs(angle);
  }

  /**
   * Calculate kyphosis/lordosis angles
   */
  static calculateSpinalCurvature(vertebrae: VertebralSegment[], region: 'thoracic' | 'lumbar'): number {
    const regionVertebrae = vertebrae.filter(v => {
      if (region === 'thoracic') return v.level.startsWith('T');
      return v.level.startsWith('L');
    });
    
    if (regionVertebrae.length < 2) return 0;
    
    const first = regionVertebrae[0];
    const last = regionVertebrae[regionVertebrae.length - 1];
    
    // Calculate sagittal plane angle
    const angle = Math.atan2(
      last.body.y - first.body.y,
      Math.abs(last.spinousProcess[2].x - first.spinousProcess[2].x)
    ) * (180 / Math.PI);
    
    return angle;
  }

  /**
   * Detect potential compression fractures
   */
  static detectCompressionIndicators(vertebrae: VertebralSegment[]): string[] {
    const indicators: string[] = [];
    
    for (let i = 1; i < vertebrae.length; i++) {
      const current = vertebrae[i];
      const previous = vertebrae[i - 1];
      
      // Check for reduced vertebral height
      if (current.body.height < previous.body.height * 0.8) {
        indicators.push(`Potential height loss at ${current.level}`);
      }
      
      // Check for wedging (anterior height less than posterior)
      const anteriorHeight = Math.abs(current.spinousProcess[0].y - current.body.y);
      const posteriorHeight = current.body.height;
      
      if (anteriorHeight < posteriorHeight * 0.7) {
        indicators.push(`Potential wedging at ${current.level}`);
      }
    }
    
    return indicators;
  }
}