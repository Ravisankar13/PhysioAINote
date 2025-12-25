import * as THREE from 'three';

export interface JointForceData {
  lumbarSpine: { compression: number; shear: number; moment: number };
  leftHip: { compression: number };
  rightHip: { compression: number };
  leftKnee: { compression: number; patellofemoral: number };
  rightKnee: { compression: number; patellofemoral: number };
}

export interface MuscleActivationData {
  erectorSpinae: number;
  gluteusMaximus: { left: number; right: number };
  gluteusMedius: { left: number; right: number };
  quadriceps: { left: number; right: number };
  hamstrings: { left: number; right: number };
}

export interface BiomechanicsVisualizationData {
  jointForces: JointForceData;
  muscleActivation: MuscleActivationData;
  showForceArrows: boolean;
  showStressColors: boolean;
  showMuscleGlow: boolean;
}

const CLINICAL_THRESHOLDS = {
  lumbarCompression: { safe: 3400, warning: 5000, critical: 6400 },
  lumbarShear: { safe: 500, warning: 750, critical: 1000 },
  hipCompression: { safe: 4000, warning: 6000, critical: 8000 },
  kneeCompression: { safe: 3000, warning: 5000, critical: 7000 },
  patellofemoral: { safe: 1500, warning: 2500, critical: 3500 },
};

export function getStressColor(value: number, thresholds: { safe: number; warning: number; critical: number }): THREE.Color {
  if (value <= thresholds.safe) {
    const ratio = value / thresholds.safe;
    return new THREE.Color().lerpColors(
      new THREE.Color(0x00ff00),
      new THREE.Color(0xffff00),
      ratio
    );
  } else if (value <= thresholds.warning) {
    const ratio = (value - thresholds.safe) / (thresholds.warning - thresholds.safe);
    return new THREE.Color().lerpColors(
      new THREE.Color(0xffff00),
      new THREE.Color(0xff8800),
      ratio
    );
  } else {
    const ratio = Math.min(1, (value - thresholds.warning) / (thresholds.critical - thresholds.warning));
    return new THREE.Color().lerpColors(
      new THREE.Color(0xff8800),
      new THREE.Color(0xff0000),
      ratio
    );
  }
}

export function getStressLevel(value: number, thresholds: { safe: number; warning: number; critical: number }): 'safe' | 'warning' | 'critical' {
  if (value <= thresholds.safe) return 'safe';
  if (value <= thresholds.warning) return 'warning';
  return 'critical';
}

export interface HoverData {
  label: string;
  value: number;
  unit: string;
  status: 'safe' | 'warning' | 'critical';
  position: { x: number; y: number };
}

export class ForceVisualizationManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;
  private forceArrows: Map<string, THREE.ArrowHelper> = new Map();
  private stressIndicators: Map<string, THREE.Mesh> = new Map();
  private muscleGlows: Map<string, THREE.Mesh> = new Map();
  private forceLabels: Map<string, THREE.Sprite> = new Map();
  private bones: { [name: string]: THREE.Object3D };
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private forceMetadata: Map<THREE.Object3D, { label: string; value: number; unit: string; threshold: { safe: number; warning: number; critical: number } }> = new Map();
  
  private jointPositions: { [key: string]: { boneNames: string[]; offset: THREE.Vector3 } } = {
    lumbarSpine: { boneNames: ['spine4', 'spine5'], offset: new THREE.Vector3(0, 0, 0.3) },
    leftHip: { boneNames: ['Femer_Root_L'], offset: new THREE.Vector3(0, 0, 0.2) },
    rightHip: { boneNames: ['Femer_Root_R'], offset: new THREE.Vector3(0, 0, 0.2) },
    leftKnee: { boneNames: ['fibula_tibia_L'], offset: new THREE.Vector3(0, 0, 0.15) },
    rightKnee: { boneNames: ['fibula_tibia_R'], offset: new THREE.Vector3(0, 0, 0.15) },
  };

  constructor(scene: THREE.Scene, bones: { [name: string]: THREE.Object3D }) {
    this.scene = scene;
    this.bones = bones;
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  checkHover(mouse: THREE.Vector2, containerRect: DOMRect): HoverData | null {
    if (!this.camera) return null;

    this.raycaster.setFromCamera(mouse, this.camera);
    
    const allObjects: THREE.Object3D[] = [];
    this.forceArrows.forEach((arrow) => {
      arrow.traverse((child) => {
        if (child instanceof THREE.Mesh) allObjects.push(child);
      });
    });
    this.stressIndicators.forEach((indicator) => allObjects.push(indicator));
    this.muscleGlows.forEach((glow) => allObjects.push(glow));
    
    const intersects = this.raycaster.intersectObjects(allObjects, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      let obj = hit.object;
      
      while (obj && !this.forceMetadata.has(obj)) {
        obj = obj.parent as THREE.Object3D;
      }
      
      if (obj && this.forceMetadata.has(obj)) {
        const meta = this.forceMetadata.get(obj)!;
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        
        const screenPos = worldPos.project(this.camera);
        const x = ((screenPos.x + 1) / 2) * containerRect.width;
        const y = ((-screenPos.y + 1) / 2) * containerRect.height;
        
        return {
          label: meta.label,
          value: meta.value,
          unit: meta.unit,
          status: getStressLevel(meta.value, meta.threshold),
          position: { x, y }
        };
      }
    }
    
    return null;
  }

  private createArrowHelper(origin: THREE.Vector3, direction: THREE.Vector3, length: number, color: THREE.Color): THREE.ArrowHelper {
    const arrow = new THREE.ArrowHelper(
      direction.normalize(),
      origin,
      length,
      color.getHex(),
      length * 0.3,
      length * 0.15
    );
    return arrow;
  }

  private createStressIndicator(position: THREE.Vector3, color: THREE.Color, size: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
  }

  private createMuscleGlow(position: THREE.Vector3, color: THREE.Color, intensity: number): THREE.Mesh {
    const size = 0.1 + intensity * 0.15;
    const geometry = new THREE.SphereGeometry(size, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3 + intensity * 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
  }

  private getJointWorldPosition(jointKey: string): THREE.Vector3 | null {
    const jointInfo = this.jointPositions[jointKey];
    if (!jointInfo) return null;

    for (const boneName of jointInfo.boneNames) {
      const bone = this.bones[boneName];
      if (bone) {
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);
        worldPos.add(jointInfo.offset);
        return worldPos;
      }
    }
    return null;
  }

  updateVisualization(data: BiomechanicsVisualizationData): void {
    this.clearVisualization();

    if (data.showForceArrows) {
      this.updateForceArrows(data.jointForces);
    }

    if (data.showStressColors) {
      this.updateStressIndicators(data.jointForces);
    }

    if (data.showMuscleGlow) {
      this.updateMuscleGlows(data.muscleActivation);
    }
  }

  private updateForceArrows(forces: JointForceData): void {
    const lumbarPos = this.getJointWorldPosition('lumbarSpine');
    if (lumbarPos) {
      const compressionForce = forces.lumbarSpine.compression;
      const shearForce = forces.lumbarSpine.shear;
      
      const compressionLength = Math.min(1.5, compressionForce / 4000);
      const compressionColor = getStressColor(compressionForce, CLINICAL_THRESHOLDS.lumbarCompression);
      const compressionArrow = this.createArrowHelper(
        lumbarPos.clone(),
        new THREE.Vector3(0, -1, 0),
        compressionLength,
        compressionColor
      );
      this.scene.add(compressionArrow);
      this.forceArrows.set('lumbar_compression', compressionArrow);
      this.forceMetadata.set(compressionArrow, {
        label: 'Lumbar Compression',
        value: compressionForce,
        unit: 'N',
        threshold: CLINICAL_THRESHOLDS.lumbarCompression
      });

      if (Math.abs(shearForce) > 50) {
        const shearLength = Math.min(0.8, Math.abs(shearForce) / 500);
        const shearColor = getStressColor(Math.abs(shearForce), CLINICAL_THRESHOLDS.lumbarShear);
        const shearArrow = this.createArrowHelper(
          lumbarPos.clone().add(new THREE.Vector3(0.1, 0, 0)),
          new THREE.Vector3(0, 0, shearForce > 0 ? 1 : -1),
          shearLength,
          shearColor
        );
        this.scene.add(shearArrow);
        this.forceArrows.set('lumbar_shear', shearArrow);
        this.forceMetadata.set(shearArrow, {
          label: 'Lumbar Shear',
          value: Math.abs(shearForce),
          unit: 'N',
          threshold: CLINICAL_THRESHOLDS.lumbarShear
        });
      }
    }

    const jointConfigs: { key: string; forceKey: keyof JointForceData; threshold: { safe: number; warning: number; critical: number } }[] = [
      { key: 'leftHip', forceKey: 'leftHip', threshold: CLINICAL_THRESHOLDS.hipCompression },
      { key: 'rightHip', forceKey: 'rightHip', threshold: CLINICAL_THRESHOLDS.hipCompression },
      { key: 'leftKnee', forceKey: 'leftKnee', threshold: CLINICAL_THRESHOLDS.kneeCompression },
      { key: 'rightKnee', forceKey: 'rightKnee', threshold: CLINICAL_THRESHOLDS.kneeCompression },
    ];

    for (const config of jointConfigs) {
      const pos = this.getJointWorldPosition(config.key);
      if (pos) {
        const forceData = forces[config.forceKey];
        const compression = 'compression' in forceData ? forceData.compression : 0;
        const length = Math.min(1.2, compression / 5000);
        const color = getStressColor(compression, config.threshold);
        
        const arrow = this.createArrowHelper(
          pos.clone(),
          new THREE.Vector3(0, -1, 0),
          length,
          color
        );
        this.scene.add(arrow);
        this.forceArrows.set(`${config.key}_compression`, arrow);
        
        const labelMap: { [key: string]: string } = {
          leftHip: 'Left Hip Compression',
          rightHip: 'Right Hip Compression',
          leftKnee: 'Left Knee Compression',
          rightKnee: 'Right Knee Compression'
        };
        this.forceMetadata.set(arrow, {
          label: labelMap[config.key] || `${config.key} Compression`,
          value: compression,
          unit: 'N',
          threshold: config.threshold
        });
      }
    }
  }

  private updateStressIndicators(forces: JointForceData): void {
    const joints: { key: string; force: number; threshold: { safe: number; warning: number; critical: number } }[] = [
      { key: 'lumbarSpine', force: forces.lumbarSpine.compression, threshold: CLINICAL_THRESHOLDS.lumbarCompression },
      { key: 'leftHip', force: forces.leftHip.compression, threshold: CLINICAL_THRESHOLDS.hipCompression },
      { key: 'rightHip', force: forces.rightHip.compression, threshold: CLINICAL_THRESHOLDS.hipCompression },
      { key: 'leftKnee', force: forces.leftKnee.compression, threshold: CLINICAL_THRESHOLDS.kneeCompression },
      { key: 'rightKnee', force: forces.rightKnee.compression, threshold: CLINICAL_THRESHOLDS.kneeCompression },
    ];

    const labelMap: { [key: string]: string } = {
      lumbarSpine: 'Lumbar Spine',
      leftHip: 'Left Hip',
      rightHip: 'Right Hip',
      leftKnee: 'Left Knee',
      rightKnee: 'Right Knee'
    };

    for (const joint of joints) {
      const pos = this.getJointWorldPosition(joint.key);
      if (pos) {
        const color = getStressColor(joint.force, joint.threshold);
        const stressLevel = getStressLevel(joint.force, joint.threshold);
        const size = stressLevel === 'critical' ? 0.15 : stressLevel === 'warning' ? 0.12 : 0.08;
        
        const indicator = this.createStressIndicator(pos, color, size);
        this.scene.add(indicator);
        this.stressIndicators.set(joint.key, indicator);
        this.forceMetadata.set(indicator, {
          label: `${labelMap[joint.key] || joint.key} Stress`,
          value: joint.force,
          unit: 'N',
          threshold: joint.threshold
        });
      }
    }

    const leftKneePos = this.getJointWorldPosition('leftKnee');
    if (leftKneePos && forces.leftKnee.patellofemoral > 500) {
      const pfColor = getStressColor(forces.leftKnee.patellofemoral, CLINICAL_THRESHOLDS.patellofemoral);
      const pfIndicator = this.createStressIndicator(
        leftKneePos.clone().add(new THREE.Vector3(0, 0, 0.1)),
        pfColor,
        0.08
      );
      this.scene.add(pfIndicator);
      this.stressIndicators.set('leftKnee_pf', pfIndicator);
      this.forceMetadata.set(pfIndicator, {
        label: 'Left Patellofemoral',
        value: forces.leftKnee.patellofemoral,
        unit: 'N',
        threshold: CLINICAL_THRESHOLDS.patellofemoral
      });
    }

    const rightKneePos = this.getJointWorldPosition('rightKnee');
    if (rightKneePos && forces.rightKnee.patellofemoral > 500) {
      const pfColor = getStressColor(forces.rightKnee.patellofemoral, CLINICAL_THRESHOLDS.patellofemoral);
      const pfIndicator = this.createStressIndicator(
        rightKneePos.clone().add(new THREE.Vector3(0, 0, 0.1)),
        pfColor,
        0.08
      );
      this.scene.add(pfIndicator);
      this.stressIndicators.set('rightKnee_pf', pfIndicator);
      this.forceMetadata.set(pfIndicator, {
        label: 'Right Patellofemoral',
        value: forces.rightKnee.patellofemoral,
        unit: 'N',
        threshold: CLINICAL_THRESHOLDS.patellofemoral
      });
    }
  }

  private updateMuscleGlows(muscles: MuscleActivationData): void {
    const musclePositions: { name: string; boneNames: string[]; offset: THREE.Vector3 }[] = [
      { name: 'erectorSpinae', boneNames: ['spine4', 'spine6'], offset: new THREE.Vector3(0, 0, -0.2) },
      { name: 'gluteMaxL', boneNames: ['Femer_Root_L'], offset: new THREE.Vector3(-0.1, 0.1, -0.2) },
      { name: 'gluteMaxR', boneNames: ['Femer_Root_R'], offset: new THREE.Vector3(0.1, 0.1, -0.2) },
      { name: 'gluteMedL', boneNames: ['Femer_Root_L'], offset: new THREE.Vector3(-0.15, 0.2, 0) },
      { name: 'gluteMedR', boneNames: ['Femer_Root_R'], offset: new THREE.Vector3(0.15, 0.2, 0) },
      { name: 'quadsL', boneNames: ['Femer_L'], offset: new THREE.Vector3(0, 0, 0.15) },
      { name: 'quadsR', boneNames: ['Femer_R'], offset: new THREE.Vector3(0, 0, 0.15) },
      { name: 'hamstringsL', boneNames: ['Femer_L'], offset: new THREE.Vector3(0, 0, -0.15) },
      { name: 'hamstringsR', boneNames: ['Femer_R'], offset: new THREE.Vector3(0, 0, -0.15) },
    ];

    const getActivation = (name: string): number => {
      switch (name) {
        case 'erectorSpinae': return muscles.erectorSpinae / 100;
        case 'gluteMaxL': return muscles.gluteusMaximus.left / 100;
        case 'gluteMaxR': return muscles.gluteusMaximus.right / 100;
        case 'gluteMedL': return muscles.gluteusMedius.left / 100;
        case 'gluteMedR': return muscles.gluteusMedius.right / 100;
        case 'quadsL': return muscles.quadriceps.left / 100;
        case 'quadsR': return muscles.quadriceps.right / 100;
        case 'hamstringsL': return muscles.hamstrings.left / 100;
        case 'hamstringsR': return muscles.hamstrings.right / 100;
        default: return 0;
      }
    };

    for (const muscle of musclePositions) {
      const activation = getActivation(muscle.name);
      if (activation < 0.1) continue;

      for (const boneName of muscle.boneNames) {
        const bone = this.bones[boneName];
        if (bone) {
          const worldPos = new THREE.Vector3();
          bone.getWorldPosition(worldPos);
          worldPos.add(muscle.offset);

          const intensity = Math.min(1, activation);
          const color = new THREE.Color().lerpColors(
            new THREE.Color(0x4444ff),
            new THREE.Color(0xff4444),
            intensity
          );
          
          const glow = this.createMuscleGlow(worldPos, color, intensity);
          this.scene.add(glow);
          this.muscleGlows.set(muscle.name, glow);
          break;
        }
      }
    }
  }

  clearVisualization(): void {
    this.forceArrows.forEach((arrow) => {
      this.scene.remove(arrow);
      this.forceMetadata.delete(arrow);
      arrow.dispose();
    });
    this.forceArrows.clear();

    this.stressIndicators.forEach((indicator) => {
      this.scene.remove(indicator);
      this.forceMetadata.delete(indicator);
      indicator.geometry.dispose();
      (indicator.material as THREE.Material).dispose();
    });
    this.stressIndicators.clear();

    this.muscleGlows.forEach((glow) => {
      this.scene.remove(glow);
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    });
    this.muscleGlows.clear();

    this.forceLabels.forEach((label) => {
      this.scene.remove(label);
      if (label.material instanceof THREE.SpriteMaterial) {
        label.material.dispose();
      }
    });
    this.forceLabels.clear();
    
    this.forceMetadata.clear();
  }

  dispose(): void {
    this.clearVisualization();
  }
}
