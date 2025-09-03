import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Maximize2, Minimize2, RotateCw, Eye, User, Move3D } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HybridSkeletonProps {
  patientData?: {
    anthropometrics?: {
      height: number;
      weight: number;
      limbLengths?: {
        upperArm: number;
        forearm: number;
        thigh: number;
        shin: number;
      };
      torsoScale?: number;
      overallScale?: number;
    };
    jointRestrictions?: {
      shoulder?: { flexion?: number; abduction?: number; rotation?: number };
      elbow?: { flexion?: number; extension?: number };
      hip?: { flexion?: number; abduction?: number; rotation?: number };
      knee?: { flexion?: number; extension?: number };
      spine?: { flexion?: number; extension?: number; rotation?: number };
      neck?: { flexion?: number; extension?: number; rotation?: number };
    };
    painAreas?: string[];
    movementPatterns?: any;
  };
  className?: string;
  showControls?: boolean;
}

export default function HybridSkeleton({
  patientData,
  className = '',
  showControls = true,
}: HybridSkeletonProps) {
  const [viewMode, setViewMode] = useState<'front' | 'side' | 'back'>('front');
  const [show3D, setShow3D] = useState(false);
  const [is3DExpanded, setIs3DExpanded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const threeDRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  
  // Calculate joint angles based on restrictions
  const getJointAngles = useCallback(() => {
    const restrictions = patientData?.jointRestrictions || {};
    return {
      shoulderFlexion: restrictions.shoulder?.flexion || 180,
      shoulderAbduction: restrictions.shoulder?.abduction || 180,
      elbowFlexion: restrictions.elbow?.flexion || 145,
      hipFlexion: restrictions.hip?.flexion || 120,
      hipAbduction: restrictions.hip?.abduction || 45,
      kneeFlexion: restrictions.knee?.flexion || 135,
      spineFlexion: restrictions.spine?.flexion || 80,
      neckFlexion: restrictions.neck?.flexion || 50,
    };
  }, [patientData]);

  // Draw 2D skeleton
  const draw2DSkeleton = useCallback(() => {
    if (!svgRef.current) return;
    
    const angles = getJointAngles();
    const svg = svgRef.current;
    
    // Clear existing content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Set viewBox for consistent scaling
    svg.setAttribute('viewBox', '0 0 400 600');
    
    // Create gradient for restricted joints
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = 'restrictionGradient';
    gradient.innerHTML = `
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#f87171" />
    `;
    defs.appendChild(gradient);
    svg.appendChild(defs);
    
    // Define skeleton structure
    const skeleton = {
      head: { x: 200, y: 80, r: 25 },
      neck: { x: 200, y: 110 },
      shoulders: { left: { x: 160, y: 140 }, right: { x: 240, y: 140 } },
      elbows: { left: { x: 140, y: 200 }, right: { x: 260, y: 200 } },
      hands: { left: { x: 130, y: 260 }, right: { x: 270, y: 260 } },
      spine: { top: { x: 200, y: 140 }, mid: { x: 200, y: 240 }, bottom: { x: 200, y: 300 } },
      hips: { left: { x: 180, y: 300 }, right: { x: 220, y: 300 } },
      knees: { left: { x: 175, y: 400 }, right: { x: 225, y: 400 } },
      ankles: { left: { x: 170, y: 500 }, right: { x: 230, y: 500 } },
      feet: { left: { x: 165, y: 530 }, right: { x: 235, y: 530 } }
    };
    
    // Adjust positions based on view mode
    if (viewMode === 'side') {
      // Side view adjustments
      skeleton.shoulders.left.x = skeleton.shoulders.right.x = 200;
      skeleton.elbows.left.x = skeleton.elbows.right.x = 200;
      skeleton.hands.left.x = skeleton.hands.right.x = 200;
      skeleton.hips.left.x = skeleton.hips.right.x = 200;
      skeleton.knees.left.x = skeleton.knees.right.x = 200;
      skeleton.ankles.left.x = skeleton.ankles.right.x = 200;
      skeleton.feet.left.x = skeleton.feet.right.x = 200;
      
      // Adjust for flexion angles in side view
      if (angles.shoulderFlexion < 180) {
        skeleton.elbows.left.x = skeleton.elbows.right.x = 200 - (180 - angles.shoulderFlexion) * 0.5;
        skeleton.hands.left.x = skeleton.hands.right.x = 200 - (180 - angles.shoulderFlexion) * 0.8;
      }
      
      if (angles.hipFlexion < 120) {
        skeleton.knees.left.x = skeleton.knees.right.x = 200 + (120 - angles.hipFlexion) * 0.5;
        skeleton.ankles.left.x = skeleton.ankles.right.x = 200 + (120 - angles.hipFlexion) * 0.7;
      }
    }
    
    // Draw bones (lines)
    const drawBone = (from: any, to: any, restricted = false) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x.toString());
      line.setAttribute('y1', from.y.toString());
      line.setAttribute('x2', to.x.toString());
      line.setAttribute('y2', to.y.toString());
      line.setAttribute('stroke', restricted ? '#ef4444' : '#94a3b8');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    };
    
    // Draw joints (circles)
    const drawJoint = (pos: any, size = 6, restricted = false) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x.toString());
      circle.setAttribute('cy', pos.y.toString());
      circle.setAttribute('r', size.toString());
      circle.setAttribute('fill', restricted ? '#ef4444' : '#475569');
      svg.appendChild(circle);
    };
    
    // Draw angle measurement
    const drawAngle = (pos: any, angle: number, label: string) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (pos.x + 20).toString());
      text.setAttribute('y', pos.y.toString());
      text.setAttribute('fill', '#64748b');
      text.setAttribute('font-size', '12');
      text.textContent = `${label}: ${angle}°`;
      svg.appendChild(text);
    };
    
    // Draw skeleton based on current view
    // Head and neck
    drawBone(skeleton.head, skeleton.neck);
    drawJoint(skeleton.head, 25, false);
    
    // Spine
    drawBone(skeleton.neck, skeleton.spine.top);
    drawBone(skeleton.spine.top, skeleton.spine.mid, angles.spineFlexion < 80);
    drawBone(skeleton.spine.mid, skeleton.spine.bottom);
    
    // Arms
    if (viewMode !== 'side' || show3D) {
      // Left arm
      drawBone(skeleton.spine.top, skeleton.shoulders.left);
      drawBone(skeleton.shoulders.left, skeleton.elbows.left, angles.shoulderFlexion < 180);
      drawBone(skeleton.elbows.left, skeleton.hands.left, angles.elbowFlexion < 145);
      
      // Right arm
      drawBone(skeleton.spine.top, skeleton.shoulders.right);
      drawBone(skeleton.shoulders.right, skeleton.elbows.right, angles.shoulderFlexion < 180);
      drawBone(skeleton.elbows.right, skeleton.hands.right, angles.elbowFlexion < 145);
    } else {
      // Single arm line for side view
      drawBone(skeleton.spine.top, skeleton.shoulders.left);
      drawBone(skeleton.shoulders.left, skeleton.elbows.left, angles.shoulderFlexion < 180);
      drawBone(skeleton.elbows.left, skeleton.hands.left, angles.elbowFlexion < 145);
    }
    
    // Legs
    if (viewMode !== 'side' || show3D) {
      // Left leg
      drawBone(skeleton.spine.bottom, skeleton.hips.left);
      drawBone(skeleton.hips.left, skeleton.knees.left, angles.hipFlexion < 120);
      drawBone(skeleton.knees.left, skeleton.ankles.left, angles.kneeFlexion < 135);
      drawBone(skeleton.ankles.left, skeleton.feet.left);
      
      // Right leg
      drawBone(skeleton.spine.bottom, skeleton.hips.right);
      drawBone(skeleton.hips.right, skeleton.knees.right, angles.hipFlexion < 120);
      drawBone(skeleton.knees.right, skeleton.ankles.right, angles.kneeFlexion < 135);
      drawBone(skeleton.ankles.right, skeleton.feet.right);
    } else {
      // Single leg line for side view
      drawBone(skeleton.spine.bottom, skeleton.hips.left);
      drawBone(skeleton.hips.left, skeleton.knees.left, angles.hipFlexion < 120);
      drawBone(skeleton.knees.left, skeleton.ankles.left, angles.kneeFlexion < 135);
      drawBone(skeleton.ankles.left, skeleton.feet.left);
    }
    
    // Draw joints
    drawJoint(skeleton.neck);
    drawJoint(skeleton.shoulders.left, 8, angles.shoulderFlexion < 180);
    drawJoint(skeleton.shoulders.right, 8, angles.shoulderFlexion < 180);
    drawJoint(skeleton.elbows.left, 6, angles.elbowFlexion < 145);
    drawJoint(skeleton.elbows.right, 6, angles.elbowFlexion < 145);
    drawJoint(skeleton.hands.left, 5);
    drawJoint(skeleton.hands.right, 5);
    drawJoint(skeleton.spine.top);
    drawJoint(skeleton.spine.mid, 7, angles.spineFlexion < 80);
    drawJoint(skeleton.spine.bottom);
    drawJoint(skeleton.hips.left, 8, angles.hipFlexion < 120);
    drawJoint(skeleton.hips.right, 8, angles.hipFlexion < 120);
    drawJoint(skeleton.knees.left, 7, angles.kneeFlexion < 135);
    drawJoint(skeleton.knees.right, 7, angles.kneeFlexion < 135);
    drawJoint(skeleton.ankles.left, 6);
    drawJoint(skeleton.ankles.right, 6);
    
    // Draw angle measurements for restricted joints
    if (angles.shoulderFlexion < 180) {
      drawAngle(skeleton.shoulders.left, angles.shoulderFlexion, 'Shoulder');
    }
    if (angles.elbowFlexion < 145) {
      drawAngle(skeleton.elbows.left, angles.elbowFlexion, 'Elbow');
    }
    if (angles.hipFlexion < 120) {
      drawAngle(skeleton.hips.left, angles.hipFlexion, 'Hip');
    }
    if (angles.kneeFlexion < 135) {
      drawAngle(skeleton.knees.left, angles.kneeFlexion, 'Knee');
    }
  }, [viewMode, patientData, show3D]);

  // Initialize 3D preview
  useEffect(() => {
    if (!show3D || !threeDRef.current) return;
    
    const mount = threeDRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    
    // Create simple 3D scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 1, 0);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    // Create simple stick figure
    const createStickFigure = () => {
      const angles = getJointAngles();
      const material = new THREE.MeshPhongMaterial({ color: 0x94a3b8 });
      const restrictedMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444 });
      
      const group = new THREE.Group();
      
      // Head
      const headGeometry = new THREE.SphereGeometry(0.15);
      const head = new THREE.Mesh(headGeometry, material);
      head.position.set(0, 1.7, 0);
      group.add(head);
      
      // Torso
      const torsoGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
      const torso = new THREE.Mesh(torsoGeometry, angles.spineFlexion < 80 ? restrictedMaterial : material);
      torso.position.set(0, 1.2, 0);
      group.add(torso);
      
      // Arms
      const armGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3);
      const leftArm = new THREE.Mesh(armGeometry, angles.shoulderFlexion < 180 ? restrictedMaterial : material);
      leftArm.position.set(0.25, 1.35, 0);
      leftArm.rotation.z = Math.PI / 6;
      group.add(leftArm);
      
      const rightArm = new THREE.Mesh(armGeometry, angles.shoulderFlexion < 180 ? restrictedMaterial : material);
      rightArm.position.set(-0.25, 1.35, 0);
      rightArm.rotation.z = -Math.PI / 6;
      group.add(rightArm);
      
      // Legs
      const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
      const leftLeg = new THREE.Mesh(legGeometry, angles.hipFlexion < 120 ? restrictedMaterial : material);
      leftLeg.position.set(0.1, 0.65, 0);
      group.add(leftLeg);
      
      const rightLeg = new THREE.Mesh(legGeometry, angles.hipFlexion < 120 ? restrictedMaterial : material);
      rightLeg.position.set(-0.1, 0.65, 0);
      group.add(rightLeg);
      
      return group;
    };
    
    const stickFigure = createStickFigure();
    scene.add(stickFigure);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (stickFigure) {
        stickFigure.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();
    
    // Store scene reference
    sceneRef.current = { scene, camera, renderer, model: stickFigure };
    
    // Cleanup
    return () => {
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [show3D, getJointAngles]);

  // Update 2D skeleton when data changes
  useEffect(() => {
    draw2DSkeleton();
  }, [draw2DSkeleton, patientData]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <Card className="w-full h-full bg-background/95 backdrop-blur">
        {/* Main 2D View */}
        <div className="relative h-full">
          {/* Controls */}
          {showControls && (
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <TabsList>
                  <TabsTrigger value="front">
                    <User className="w-4 h-4 mr-1" />
                    Front
                  </TabsTrigger>
                  <TabsTrigger value="side">
                    <Eye className="w-4 h-4 mr-1" />
                    Side
                  </TabsTrigger>
                  <TabsTrigger value="back">
                    <RotateCw className="w-4 h-4 mr-1" />
                    Back
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow3D(!show3D)}
              >
                <Move3D className="w-4 h-4 mr-1" />
                {show3D ? 'Hide' : 'Show'} 3D
              </Button>
            </div>
          )}
          
          {/* 2D Skeleton SVG */}
          <div className="flex items-center justify-center h-full pt-16">
            <svg
              ref={svgRef}
              className="w-full max-w-md h-full"
              style={{ maxHeight: 'calc(100% - 4rem)' }}
            />
          </div>
          
          {/* 3D Preview Window */}
          {show3D && (
            <div className={cn(
              "absolute bg-background/95 border rounded-lg shadow-lg transition-all",
              is3DExpanded ? "inset-4" : "bottom-4 right-4 w-64 h-64"
            )}>
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIs3DExpanded(!is3DExpanded)}
                >
                  {is3DExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div
                ref={threeDRef}
                className="w-full h-full rounded-lg overflow-hidden"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}