import { useState, useMemo } from 'react';

interface LimbAdjustments {
  femurLength: number;
  tibiaLength: number;
  humerusLength: number;
  radiusLength: number;
  spineLength: number;
  ribcageWidth: number;
  pelvisWidth: number;
}

interface LineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
  color?: string;
}

function SkeletonLine({ x1, y1, x2, y2, thickness = 10, color = "#333" }: LineProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={thickness}
      strokeLinecap="round"
    />
  );
}

function SkeletonJoint({ x, y, size = 8, color = "#555" }: { x: number; y: number; size?: number; color?: string }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill={color}
    />
  );
}

export function SkeletonModel() {
  const [adjustments, setAdjustments] = useState({
    femurLength: 1,
    tibiaLength: 1,
    humerusLength: 1,
    radiusLength: 1,
    spineLength: 1,
    ribcageWidth: 1,
    pelvisWidth: 1
  });

  const handleAdjustmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdjustments(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  // Calculate skeleton coordinates based on adjustments
  const skeleton = useMemo(() => {
    // Base height and positioning
    const centerX = 100;
    const baseHeight = 250;
    
    // Head position
    const headY = 30;
    const headSize = 20;
    
    // Calculate joint positions based on bone lengths
    const neckY = headY + headSize;
    const shoulderY = neckY + 10;
    
    // Ribcage parameters
    const ribcageTop = shoulderY + 5;
    const ribcageHeight = 45 * adjustments.spineLength;
    const ribcageWidth = 45 * adjustments.ribcageWidth; // Use ribcageWidth adjustment
    
    // Spine
    const spineEnd = ribcageTop + ribcageHeight;
    
    // Arms
    const elbowLeftX = centerX - 30;
    const elbowRightX = centerX + 30;
    const elbowY = shoulderY + 35 * adjustments.humerusLength;
    
    const wristLeftX = centerX - 35;
    const wristRightX = centerX + 35;
    const wristY = elbowY + 30 * adjustments.radiusLength;
    
    // Pelvis and hips
    const pelvisWidth = 35 * adjustments.pelvisWidth; // Adjustable pelvis width
    const pelvisHeight = 25;
    const pelvisTop = spineEnd;
    const pelvisBottom = pelvisTop + pelvisHeight;
    
    // Hip joints
    const hipY = pelvisTop + 15;
    const hipLeftX = centerX - pelvisWidth/2 + 5;
    const hipRightX = centerX + pelvisWidth/2 - 5;
    
    // Legs
    const kneeY = hipY + 50 * adjustments.femurLength;
    const kneeLeftX = centerX - 20;
    const kneeRightX = centerX + 20;
    
    const ankleY = kneeY + 50 * adjustments.tibiaLength;
    const ankleLeftX = centerX - 15;
    const ankleRightX = centerX + 15;
    
    return {
      // Body centers
      head: { x: centerX, y: headY },
      neck: { x: centerX, y: neckY },
      spine: { start: { x: centerX, y: neckY }, end: { x: centerX, y: spineEnd } },
      
      // Ribcage
      ribcage: {
        top: ribcageTop,
        bottom: spineEnd,
        left: centerX - ribcageWidth/2,
        right: centerX + ribcageWidth/2,
        center: centerX,
        width: ribcageWidth,
        height: ribcageHeight
      },
      
      // Pelvis
      pelvis: {
        top: pelvisTop,
        bottom: pelvisBottom,
        left: centerX - pelvisWidth/2,
        right: centerX + pelvisWidth/2,
        width: pelvisWidth,
        height: pelvisHeight
      },
      
      // Shoulders
      shoulderLeft: { x: centerX - 25, y: shoulderY },
      shoulderRight: { x: centerX + 25, y: shoulderY },
      
      // Arms
      elbowLeft: { x: elbowLeftX, y: elbowY },
      elbowRight: { x: elbowRightX, y: elbowY },
      wristLeft: { x: wristLeftX, y: wristY },
      wristRight: { x: wristRightX, y: wristY },
      
      // Hips
      hipLeft: { x: hipLeftX, y: hipY },
      hipRight: { x: hipRightX, y: hipY },
      
      // Legs
      kneeLeft: { x: kneeLeftX, y: kneeY },
      kneeRight: { x: kneeRightX, y: kneeY },
      ankleLeft: { x: ankleLeftX, y: ankleY },
      ankleRight: { x: ankleRightX, y: ankleY },
    };
  }, [adjustments]);

  return (
    <div className="w-full">
      {/* Interactive skeleton visualization */}
      <div className="w-full p-4 mb-4 border rounded-lg bg-white">
        <h2 className="text-lg font-bold mb-4 text-center">Interactive Skeleton Model</h2>
        
        <div className="w-full bg-gray-50 rounded-lg p-4 flex justify-center">
          <svg 
            width="200" 
            height="350" 
            viewBox="0 0 200 350" 
            style={{ maxHeight: '400px' }}
          >
            {/* Ribcage */}
            <ellipse 
              cx={skeleton.ribcage.center} 
              cy={skeleton.ribcage.top + skeleton.ribcage.height/2} 
              rx={skeleton.ribcage.width/2} 
              ry={skeleton.ribcage.height/2} 
              fill="none" 
              stroke="#555" 
              strokeWidth="1.5" 
              strokeDasharray="2,2"
            />
            
            {/* Ribs */}
            {[0.2, 0.35, 0.5, 0.65, 0.8].map((percentage, i) => {
              const y = skeleton.ribcage.top + skeleton.ribcage.height * percentage;
              const horizontalScale = Math.sin(Math.PI * percentage) * 0.95;
              const width = skeleton.ribcage.width * horizontalScale;
              return (
                <line 
                  key={`rib-${i}`}
                  x1={skeleton.ribcage.center - width/2} 
                  y1={y} 
                  x2={skeleton.ribcage.center + width/2} 
                  y2={y} 
                  stroke="#666" 
                  strokeWidth="2"
                />
              );
            })}
            
            {/* Pelvis */}
            <path 
              d={`
                M${skeleton.pelvis.left},${skeleton.pelvis.top + 5}
                C${skeleton.pelvis.left},${skeleton.pelvis.top},${skeleton.pelvis.left + 10},${skeleton.pelvis.top},${skeleton.pelvis.left + skeleton.pelvis.width/2},${skeleton.pelvis.top}
                C${skeleton.pelvis.right - 10},${skeleton.pelvis.top},${skeleton.pelvis.right},${skeleton.pelvis.top},${skeleton.pelvis.right},${skeleton.pelvis.top + 5}
                L${skeleton.pelvis.right},${skeleton.pelvis.bottom - 5}
                C${skeleton.pelvis.right},${skeleton.pelvis.bottom},${skeleton.pelvis.right - 10},${skeleton.pelvis.bottom},${skeleton.pelvis.right - 15},${skeleton.pelvis.bottom}
                L${skeleton.pelvis.left + 15},${skeleton.pelvis.bottom}
                C${skeleton.pelvis.left + 10},${skeleton.pelvis.bottom},${skeleton.pelvis.left},${skeleton.pelvis.bottom},${skeleton.pelvis.left},${skeleton.pelvis.bottom - 5}
                Z
              `}
              fill="none"
              stroke="#555"
              strokeWidth="2"
            />
            
            {/* Head */}
            <circle cx={skeleton.head.x} cy={skeleton.head.y} r="20" fill="#e0e0e0" stroke="#333" strokeWidth="1.5" />
            
            {/* Spine */}
            <SkeletonLine 
              x1={skeleton.spine.start.x}
              y1={skeleton.spine.start.y}
              x2={skeleton.spine.end.x}
              y2={skeleton.spine.end.y}
              thickness={8}
              color="#555"
            />
            
            {/* Clavicles */}
            <SkeletonLine 
              x1={skeleton.shoulderLeft.x}
              y1={skeleton.shoulderLeft.y}
              x2={skeleton.neck.x}
              y2={skeleton.shoulderLeft.y - 2}
              thickness={4}
              color="#666"
            />
            <SkeletonLine 
              x1={skeleton.shoulderRight.x}
              y1={skeleton.shoulderRight.y}
              x2={skeleton.neck.x}
              y2={skeleton.shoulderRight.y - 2}
              thickness={4}
              color="#666"
            />
            
            {/* Arms: Upper arm (humerus) */}
            <SkeletonLine 
              x1={skeleton.shoulderLeft.x}
              y1={skeleton.shoulderLeft.y}
              x2={skeleton.elbowLeft.x}
              y2={skeleton.elbowLeft.y}
              thickness={6}
              color="#666"
            />
            <SkeletonLine 
              x1={skeleton.shoulderRight.x}
              y1={skeleton.shoulderRight.y}
              x2={skeleton.elbowRight.x}
              y2={skeleton.elbowRight.y}
              thickness={6}
              color="#666"
            />
            
            {/* Arms: Lower arm (radius/ulna) */}
            <SkeletonLine 
              x1={skeleton.elbowLeft.x}
              y1={skeleton.elbowLeft.y}
              x2={skeleton.wristLeft.x}
              y2={skeleton.wristLeft.y}
              thickness={5}
              color="#777"
            />
            <SkeletonLine 
              x1={skeleton.elbowRight.x}
              y1={skeleton.elbowRight.y}
              x2={skeleton.wristRight.x}
              y2={skeleton.wristRight.y}
              thickness={5}
              color="#777"
            />
            
            {/* Legs: Upper leg (femur) */}
            <SkeletonLine 
              x1={skeleton.hipLeft.x}
              y1={skeleton.hipLeft.y}
              x2={skeleton.kneeLeft.x}
              y2={skeleton.kneeLeft.y}
              thickness={7}
              color="#666"
            />
            <SkeletonLine 
              x1={skeleton.hipRight.x}
              y1={skeleton.hipRight.y}
              x2={skeleton.kneeRight.x}
              y2={skeleton.kneeRight.y}
              thickness={7}
              color="#666"
            />
            
            {/* Legs: Lower leg (tibia) */}
            <SkeletonLine 
              x1={skeleton.kneeLeft.x}
              y1={skeleton.kneeLeft.y}
              x2={skeleton.ankleLeft.x}
              y2={skeleton.ankleLeft.y}
              thickness={6}
              color="#777"
            />
            <SkeletonLine 
              x1={skeleton.kneeRight.x}
              y1={skeleton.kneeRight.y}
              x2={skeleton.ankleRight.x}
              y2={skeleton.ankleRight.y}
              thickness={6}
              color="#777"
            />
            
            {/* Joints */}
            <SkeletonJoint x={skeleton.neck.x} y={skeleton.neck.y} size={4} color="#666" />
            <SkeletonJoint x={skeleton.shoulderLeft.x} y={skeleton.shoulderLeft.y} size={5} color="#666" />
            <SkeletonJoint x={skeleton.shoulderRight.x} y={skeleton.shoulderRight.y} size={5} color="#666" />
            <SkeletonJoint x={skeleton.elbowLeft.x} y={skeleton.elbowLeft.y} size={4} color="#777" />
            <SkeletonJoint x={skeleton.elbowRight.x} y={skeleton.elbowRight.y} size={4} color="#777" />
            <SkeletonJoint x={skeleton.wristLeft.x} y={skeleton.wristLeft.y} size={3} color="#888" />
            <SkeletonJoint x={skeleton.wristRight.x} y={skeleton.wristRight.y} size={3} color="#888" />
            
            {/* Hip joints - highlighted to emphasize anatomical accuracy */}
            <SkeletonJoint x={skeleton.hipLeft.x} y={skeleton.hipLeft.y} size={6} color="#d32f2f" />
            <SkeletonJoint x={skeleton.hipRight.x} y={skeleton.hipRight.y} size={6} color="#d32f2f" />
            
            <SkeletonJoint x={skeleton.kneeLeft.x} y={skeleton.kneeLeft.y} size={4} color="#777" />
            <SkeletonJoint x={skeleton.kneeRight.x} y={skeleton.kneeRight.y} size={4} color="#777" />
            <SkeletonJoint x={skeleton.ankleLeft.x} y={skeleton.ankleLeft.y} size={3} color="#888" />
            <SkeletonJoint x={skeleton.ankleRight.x} y={skeleton.ankleRight.y} size={3} color="#888" />
            
            {/* Feet */}
            <path 
              d={`M${skeleton.ankleLeft.x-2},${skeleton.ankleLeft.y} L${skeleton.ankleLeft.x-10},${skeleton.ankleLeft.y+10} L${skeleton.ankleLeft.x+5},${skeleton.ankleLeft.y+10} L${skeleton.ankleLeft.x},${skeleton.ankleLeft.y}`} 
              fill="#888" 
            />
            <path 
              d={`M${skeleton.ankleRight.x+2},${skeleton.ankleRight.y} L${skeleton.ankleRight.x+10},${skeleton.ankleRight.y+10} L${skeleton.ankleRight.x-5},${skeleton.ankleRight.y+10} L${skeleton.ankleRight.x},${skeleton.ankleRight.y}`} 
              fill="#888" 
            />
          </svg>
        </div>
        
        <p className="text-sm text-center text-gray-600 mt-3 mb-0">
          Drag the sliders below to adjust bone lengths
        </p>
      </div>
      
      {/* Adjustment Controls - Bone Length */}
      <div className="w-full p-4 border rounded-lg bg-white mb-4">
        <h2 className="text-lg font-bold mb-4 text-center">Bone Length Adjustments</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* Skeleton Body Parts Group */}
          <div className="bg-gray-50 p-3 rounded sm:col-span-2 mb-2 border-b border-gray-200 pb-4">
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Torso Adjustments</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Spine Length: <span className="font-bold">{adjustments.spineLength.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="spineLength"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={adjustments.spineLength}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Ribcage Width: <span className="font-bold">{adjustments.ribcageWidth.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="ribcageWidth"
                  min="0.7"
                  max="1.3"
                  step="0.01"
                  value={adjustments.ribcageWidth}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Pelvis Width: <span className="font-bold">{adjustments.pelvisWidth.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="pelvisWidth"
                  min="0.7"
                  max="1.3"
                  step="0.01"
                  value={adjustments.pelvisWidth}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
          
          {/* Upper Limbs Group */}
          <div className="bg-gray-50 p-3 rounded sm:col-span-2 mb-2 border-b border-gray-200 pb-4">
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Arm Adjustments</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Humerus Length: <span className="font-bold">{adjustments.humerusLength.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="humerusLength"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={adjustments.humerusLength}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Radius Length: <span className="font-bold">{adjustments.radiusLength.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="radiusLength"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={adjustments.radiusLength}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
          
          {/* Lower Limbs Group */}
          <div className="bg-gray-50 p-3 rounded sm:col-span-2">
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Leg Adjustments</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Femur Length: <span className="font-bold">{adjustments.femurLength.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="femurLength"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={adjustments.femurLength}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Tibia Length: <span className="font-bold">{adjustments.tibiaLength.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  name="tibiaLength"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={adjustments.tibiaLength}
                  onChange={handleAdjustmentChange}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setAdjustments({
            femurLength: 1,
            tibiaLength: 1,
            humerusLength: 1,
            radiusLength: 1,
            spineLength: 1,
            ribcageWidth: 1,
            pelvisWidth: 1
          })}
          className="w-full bg-primary text-white py-2 rounded-md mt-4"
        >
          Reset to Default
        </button>
      </div>
      
      {/* Instructions */}
      <div className="w-full p-4 border rounded-lg bg-white">
        <h3 className="font-medium mb-2">How these controls will work:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Adjust sliders to change bone proportions in the 3D model</li>
          <li>Modifications help visualize patient anatomical variations</li>
          <li>Use Reset button to return to default measurements</li>
          <li>Values represent proportional changes (1.0 = normal length)</li>
        </ul>
      </div>
    </div>
  );
}