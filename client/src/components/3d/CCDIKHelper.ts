import * as THREE from 'three';

// CCD IK Solver implementation for Three.js
// Based on the Cyclic Coordinate Descent algorithm

export interface IKLink {
  index: number; // bone index in skeleton
  enabled: boolean;
  limitation?: THREE.Vector3; // rotation limitations per axis
  rotationMin?: THREE.Vector3;
  rotationMax?: THREE.Vector3;
}

export interface IKConfig {
  target: number; // target bone index
  effector: number; // end effector bone index  
  links: IKLink[];
  iteration?: number;
  minAngle?: number;
  maxAngle?: number;
}

export class CCDIKSolver {
  private mesh: THREE.SkinnedMesh;
  private iks: IKConfig[];
  
  constructor(mesh: THREE.SkinnedMesh, iks: IKConfig[] = []) {
    this.mesh = mesh;
    this.iks = iks;
  }

  /**
   * Updates IK chains
   */
  update() {
    const bones = this.mesh.skeleton.bones;
    
    for (const ik of this.iks) {
      const iterations = ik.iteration !== undefined ? ik.iteration : 1;
      
      for (let i = 0; i < iterations; i++) {
        this.updateOne(ik);
      }
    }
  }

  /**
   * Updates single IK chain using CCD algorithm
   */
  private updateOne(ik: IKConfig) {
    const bones = this.mesh.skeleton.bones;
    const targetBone = bones[ik.target];
    const effectorBone = bones[ik.effector];
    
    if (!targetBone || !effectorBone) return;
    
    // Get world positions
    const targetPos = new THREE.Vector3();
    const effectorPos = new THREE.Vector3();
    const linkPos = new THREE.Vector3();
    
    targetBone.getWorldPosition(targetPos);
    
    // Iterate through links from end to start
    for (let i = ik.links.length - 1; i >= 0; i--) {
      const link = ik.links[i];
      if (!link.enabled) continue;
      
      const bone = bones[link.index];
      if (!bone) continue;
      
      // Get current positions
      bone.getWorldPosition(linkPos);
      effectorBone.getWorldPosition(effectorPos);
      
      // Calculate vectors
      const toEffector = effectorPos.clone().sub(linkPos).normalize();
      const toTarget = targetPos.clone().sub(linkPos).normalize();
      
      // Calculate rotation axis and angle
      const rotationAxis = toEffector.clone().cross(toTarget);
      if (rotationAxis.lengthSq() > 0.00001) {
        rotationAxis.normalize();
        
        let angle = Math.acos(Math.max(-1, Math.min(1, toEffector.dot(toTarget))));
        
        // Apply angle constraints
        if (ik.minAngle !== undefined) {
          angle = Math.max(angle, ik.minAngle);
        }
        if (ik.maxAngle !== undefined) {
          angle = Math.min(angle, ik.maxAngle);
        }
        
        // Apply rotation to bone
        const q = new THREE.Quaternion();
        q.setFromAxisAngle(rotationAxis, angle);
        
        // Convert to bone's local space
        const parentWorldQ = new THREE.Quaternion();
        if (bone.parent) {
          bone.parent.getWorldQuaternion(parentWorldQ);
        }
        
        q.premultiply(parentWorldQ.invert());
        bone.quaternion.multiply(q);
        
        // Apply rotation limits if specified
        if (link.limitation || (link.rotationMin && link.rotationMax)) {
          this.applyRotationLimits(bone, link);
        }
        
        // Update bone matrices
        bone.updateMatrixWorld(true);
      }
    }
  }

  /**
   * Apply rotation constraints to a bone
   */
  private applyRotationLimits(bone: THREE.Bone, link: IKLink) {
    const euler = new THREE.Euler();
    euler.setFromQuaternion(bone.quaternion, 'XYZ');
    
    if (link.rotationMin && link.rotationMax) {
      euler.x = Math.max(link.rotationMin.x, Math.min(link.rotationMax.x, euler.x));
      euler.y = Math.max(link.rotationMin.y, Math.min(link.rotationMax.y, euler.y));
      euler.z = Math.max(link.rotationMin.z, Math.min(link.rotationMax.z, euler.z));
    } else if (link.limitation) {
      // Apply simple limitation
      euler.x = Math.max(-link.limitation.x, Math.min(link.limitation.x, euler.x));
      euler.y = Math.max(-link.limitation.y, Math.min(link.limitation.y, euler.y));
      euler.z = Math.max(-link.limitation.z, Math.min(link.limitation.z, euler.z));
    }
    
    bone.quaternion.setFromEuler(euler);
  }

  /**
   * Create IK configuration for spine control
   */
  static createSpineIKConfig(skeleton: THREE.Skeleton, spineIndices: number[], targetIndex: number): IKConfig {
    const links: IKLink[] = [];
    
    for (let i = 0; i < spineIndices.length - 1; i++) {
      links.push({
        index: spineIndices[i],
        enabled: true,
        limitation: new THREE.Vector3(
          Math.PI * 0.1, // X axis limitation (10% of PI)
          Math.PI * 0.1, // Y axis limitation
          Math.PI * 0.05  // Z axis limitation (smaller for lateral)
        )
      });
    }
    
    return {
      target: targetIndex,
      effector: spineIndices[spineIndices.length - 1],
      links: links,
      iteration: 3,
      minAngle: 0,
      maxAngle: Math.PI * 0.25
    };
  }

  /**
   * Create IK configuration for limb control (arm or leg)
   */
  static createLimbIKConfig(
    skeleton: THREE.Skeleton,
    rootIndex: number,
    midIndex: number,
    endIndex: number,
    targetIndex: number
  ): IKConfig {
    return {
      target: targetIndex,
      effector: endIndex,
      links: [
        {
          index: midIndex,
          enabled: true,
          limitation: new THREE.Vector3(0, Math.PI * 0.5, 0) // Elbow/knee bends mainly on one axis
        },
        {
          index: rootIndex,
          enabled: true,
          limitation: new THREE.Vector3(Math.PI * 0.3, Math.PI * 0.3, Math.PI * 0.3)
        }
      ],
      iteration: 5,
      minAngle: 0,
      maxAngle: Math.PI * 0.5
    };
  }
}