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
  /** Task #381 — declutter stress cloud.
   *  - 'clean' (default): thin camera-billboarded ring per joint, a single
   *    translucent halo on the most-loaded joint, and numeric badges on the
   *    top 1–2 joints. Designed to never occlude the upper-body skeleton.
   *  - 'detailed': legacy behavior — full translucent sphere per joint. */
  stressVizMode?: 'clean' | 'detailed';
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
  // Task #381 — widened from `Mesh` to `Object3D` so badge sprites can sit
  // alongside ring/sphere meshes without unsafe casting.
  private stressIndicators: Map<string, THREE.Object3D> = new Map();
  private muscleGlows: Map<string, THREE.Mesh> = new Map();
  private forceLabels: Map<string, THREE.Sprite> = new Map();
  /** Task #381 — objects that need camera-facing reorientation each frame
   *  (rings in clean mode). Sprites self-billboard, so they aren't included. */
  private billboardTargets: THREE.Object3D[] = [];
  private bones: { [name: string]: THREE.Object3D };
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private forceMetadata: Map<THREE.Object3D, { label: string; value: number; unit: string; threshold: { safe: number; warning: number; critical: number } }> = new Map();
  
  private jointPositions: { [key: string]: { boneNames: string[]; offset: THREE.Vector3 } } = {
    lumbarSpine: { boneNames: ['Spine1_M', 'RootPart2_M'], offset: new THREE.Vector3(0, 0, 0.3) },
    leftHip: { boneNames: ['Hip_L'], offset: new THREE.Vector3(0, 0, 0.2) },
    rightHip: { boneNames: ['Hip_R'], offset: new THREE.Vector3(0, 0, 0.2) },
    leftKnee: { boneNames: ['Knee_L'], offset: new THREE.Vector3(0, 0, 0.15) },
    rightKnee: { boneNames: ['Knee_R'], offset: new THREE.Vector3(0, 0, 0.15) },
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
    
    // Task #381 — walk every intersection (sorted near→far) and return the
    // first one that has metadata. Without this, a hover on a badge sprite
    // (which has no metadata) would block the underlying ring's tooltip.
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !this.forceMetadata.has(obj)) {
        obj = obj.parent;
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
          position: { x, y },
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

  /** Task #381 — thin camera-facing ring used in 'clean' mode. Frames the
   *  joint without filling space, so multiple rings never blend into a blob.
   *  Stress level scales the outer radius only — the ring stays flat. */
  private createStressRing(position: THREE.Vector3, color: THREE.Color, level: 'safe' | 'warning' | 'critical'): THREE.Mesh {
    const outerRadius = level === 'critical' ? 0.135 : level === 'warning' ? 0.108 : 0.09;
    const innerRadius = outerRadius - 0.022;
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 48);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.renderOrder = 999;
    return mesh;
  }

  /** Task #381 — small numeric label sprite reserved for the most-stressed
   *  joints. Sprites auto-face the camera so no per-frame work is needed. */
  private createBadgeSprite(text: string, color: THREE.Color): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d')!;
    const radius = 14;
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `#${color.getHexString()}`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold 40px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.36, 0.1, 1);
    sprite.renderOrder = 1000;
    return sprite;
  }

  /** Task #381 — call once per render frame so clean-mode rings always face
   *  the camera (sprites self-orient and don't need this). No-op in detailed
   *  mode because billboardTargets stays empty. */
  updateBillboards(camera?: THREE.Camera): void {
    const cam = camera ?? this.camera;
    if (!cam || this.billboardTargets.length === 0) return;
    const camPos = new THREE.Vector3();
    cam.getWorldPosition(camPos);
    for (const obj of this.billboardTargets) {
      obj.lookAt(camPos);
    }
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
      // Task #381 — clean mode is the new default; only render the legacy
      // volumetric blob when the clinician explicitly opts into 'detailed'.
      const mode = data.stressVizMode ?? 'clean';
      this.updateStressIndicators(data.jointForces, mode);
    }

    if (data.showMuscleGlow) {
      this.updateMuscleGlows(data.muscleActivation);
    }

    // Reorient any rings on the very next frame the caller renders, so the
    // viewer doesn't see a stale 0-degree orientation flash before its
    // animation loop fires.
    this.updateBillboards();
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

  private updateStressIndicators(forces: JointForceData, mode: 'clean' | 'detailed' = 'clean'): void {
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

    // Task #381 — pre-compute stress ratios so 'clean' mode can pick the
    // single focal halo (highest ratio) and the top-1/2 numeric badges.
    const ranked = joints
      .map((j) => ({ ...j, ratio: j.force / Math.max(1, j.threshold.critical) }))
      .sort((a, b) => b.ratio - a.ratio);
    // Deterministic per the task spec: focal halo always goes on the single
    // top-ranked joint; numeric badges always go on the top one or two
    // joints. We do skip joints with zero force (no data → nothing to show),
    // but never gate on a stress-ratio threshold.
    const focalKey = mode === 'clean' && ranked.length > 0 && ranked[0].force > 0
      ? ranked[0].key
      : null;
    const badgeKeys = new Set<string>(
      mode === 'clean'
        ? ranked.slice(0, 2).filter((r) => r.force > 0).map((r) => r.key)
        : []
    );

    for (const joint of joints) {
      const pos = this.getJointWorldPosition(joint.key);
      if (!pos) continue;
      const color = getStressColor(joint.force, joint.threshold);
      const stressLevel = getStressLevel(joint.force, joint.threshold);

      if (mode === 'detailed') {
        // Legacy behavior — full translucent sphere at every joint.
        const size = stressLevel === 'critical' ? 0.15 : stressLevel === 'warning' ? 0.12 : 0.08;
        const indicator = this.createStressIndicator(pos, color, size);
        this.scene.add(indicator);
        this.stressIndicators.set(joint.key, indicator);
        this.forceMetadata.set(indicator, {
          label: `${labelMap[joint.key] || joint.key} Stress`,
          value: joint.force,
          unit: 'N',
          threshold: joint.threshold,
        });
        continue;
      }

      // Clean mode — Tier 1: thin billboarded ring at every joint.
      const ring = this.createStressRing(pos, color, stressLevel);
      this.scene.add(ring);
      this.stressIndicators.set(joint.key, ring);
      this.billboardTargets.push(ring);
      this.forceMetadata.set(ring, {
        label: `${labelMap[joint.key] || joint.key} Stress`,
        value: joint.force,
        unit: 'N',
        threshold: joint.threshold,
      });

      // Clean mode — Tier 2: focal halo on the single most-loaded joint.
      if (joint.key === focalKey) {
        const haloSize = stressLevel === 'critical' ? 0.15 : stressLevel === 'warning' ? 0.12 : 0.1;
        const halo = this.createStressIndicator(pos, color, haloSize);
        (halo.material as THREE.MeshBasicMaterial).opacity = 0.32;
        this.scene.add(halo);
        this.stressIndicators.set(`${joint.key}__halo`, halo);
        // Forward hover hits on the halo to the same metadata as the ring.
        this.forceMetadata.set(halo, {
          label: `${labelMap[joint.key] || joint.key} Stress`,
          value: joint.force,
          unit: 'N',
          threshold: joint.threshold,
        });
      }

      // Clean mode — Tier 3: numeric badge on the top 1–2 joints only.
      if (badgeKeys.has(joint.key)) {
        const text = joint.force >= 1000 ? `${(joint.force / 1000).toFixed(1)} kN` : `${Math.round(joint.force)} N`;
        const badge = this.createBadgeSprite(text, color);
        const badgePos = pos.clone();
        badgePos.y += 0.16;
        badge.position.copy(badgePos);
        this.scene.add(badge);
        this.stressIndicators.set(`${joint.key}__badge`, badge);
      }
    }

    // Patellofemoral indicators — same mode-aware treatment so the knee area
    // doesn't sprout extra blobs in clean mode.
    const pfJoints: { key: string; force: number }[] = [
      { key: 'leftKnee', force: forces.leftKnee.patellofemoral },
      { key: 'rightKnee', force: forces.rightKnee.patellofemoral },
    ];
    for (const pf of pfJoints) {
      if (pf.force <= 500) continue;
      const basePos = this.getJointWorldPosition(pf.key);
      if (!basePos) continue;
      const pos = basePos.clone().add(new THREE.Vector3(0, 0, 0.1));
      const pfColor = getStressColor(pf.force, CLINICAL_THRESHOLDS.patellofemoral);
      const pfLevel = getStressLevel(pf.force, CLINICAL_THRESHOLDS.patellofemoral);
      const labelText = pf.key === 'leftKnee' ? 'Left Patellofemoral' : 'Right Patellofemoral';

      const indicator = mode === 'clean'
        ? this.createStressRing(pos, pfColor, pfLevel)
        : this.createStressIndicator(pos, pfColor, 0.08);
      this.scene.add(indicator);
      this.stressIndicators.set(`${pf.key}_pf`, indicator);
      if (mode === 'clean') this.billboardTargets.push(indicator);
      this.forceMetadata.set(indicator, {
        label: labelText,
        value: pf.force,
        unit: 'N',
        threshold: CLINICAL_THRESHOLDS.patellofemoral,
      });
    }
  }

  private updateMuscleGlows(muscles: MuscleActivationData): void {
    const musclePositions: { name: string; boneNames: string[]; offset: THREE.Vector3 }[] = [
      { name: 'erectorSpinae', boneNames: ['Spine1_M', 'RootPart2_M'], offset: new THREE.Vector3(0, 0, -0.2) },
      { name: 'gluteMaxL', boneNames: ['Hip_L'], offset: new THREE.Vector3(-0.1, 0.1, -0.2) },
      { name: 'gluteMaxR', boneNames: ['Hip_R'], offset: new THREE.Vector3(0.1, 0.1, -0.2) },
      { name: 'gluteMedL', boneNames: ['Hip_L'], offset: new THREE.Vector3(-0.15, 0.2, 0) },
      { name: 'gluteMedR', boneNames: ['Hip_R'], offset: new THREE.Vector3(0.15, 0.2, 0) },
      { name: 'quadsL', boneNames: ['HipPart1_L'], offset: new THREE.Vector3(0, 0, 0.15) },
      { name: 'quadsR', boneNames: ['HipPart1_R'], offset: new THREE.Vector3(0, 0, 0.15) },
      { name: 'hamstringsL', boneNames: ['HipPart1_L'], offset: new THREE.Vector3(0, 0, -0.15) },
      { name: 'hamstringsR', boneNames: ['HipPart1_R'], offset: new THREE.Vector3(0, 0, -0.15) },
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
      // Sprites have no `geometry` field — guard before disposing so badge
      // sprites stored alongside rings/spheres don't throw on cleanup.
      const anyInd = indicator as unknown as { geometry?: THREE.BufferGeometry };
      if (anyInd.geometry && typeof anyInd.geometry.dispose === 'function') {
        anyInd.geometry.dispose();
      }
      const mat = (indicator as unknown as { material: THREE.Material | THREE.Material[] }).material;
      const disposeOne = (m: THREE.Material) => {
        // SpriteMaterial holds a CanvasTexture map that won't be GC'd
        // unless we dispose it explicitly.
        const map = (m as unknown as { map?: THREE.Texture }).map;
        if (map && typeof map.dispose === 'function') map.dispose();
        m.dispose();
      };
      if (Array.isArray(mat)) {
        mat.forEach(disposeOne);
      } else {
        disposeOne(mat);
      }
    });
    this.stressIndicators.clear();
    this.billboardTargets.length = 0;

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
