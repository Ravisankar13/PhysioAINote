import { useState, useMemo } from 'react';

interface LimbAdjustments {
  femurLength: number;
  tibiaLength: number;
  humerusLength: number;
  radiusLength: number;
  spineLength: number;
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
    spineLength: 1
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
    const baseHeight = 200;
    
    // Head position
    const headY = 30;
    const headSize = 20;
    
    // Calculate joint positions based on bone lengths
    const neckY = headY + headSize;
    const shoulderY = neckY + 10;
    const spineEnd = shoulderY + 50 * adjustments.spineLength;
    
    // Arms
    const elbowLeftX = centerX - 30;
    const elbowRightX = centerX + 30;
    const elbowY = shoulderY + 35 * adjustments.humerusLength;
    
    const wristLeftX = centerX - 35;
    const wristRightX = centerX + 35;
    const wristY = elbowY + 30 * adjustments.radiusLength;
    
    // Legs
    const hipY = spineEnd;
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
      
      // Shoulders
      shoulderLeft: { x: centerX - 20, y: shoulderY },
      shoulderRight: { x: centerX + 20, y: shoulderY },
      
      // Arms
      elbowLeft: { x: elbowLeftX, y: elbowY },
      elbowRight: { x: elbowRightX, y: elbowY },
      wristLeft: { x: wristLeftX, y: wristY },
      wristRight: { x: wristRightX, y: wristY },
      
      // Hips
      hipLeft: { x: centerX - 15, y: hipY },
      hipRight: { x: centerX + 15, y: hipY },
      
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
            height="300" 
            viewBox="0 0 200 300" 
            style={{ maxHeight: '350px' }}
          >
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
            
            {/* Shoulders */}
            <SkeletonLine 
              x1={skeleton.shoulderLeft.x}
              y1={skeleton.shoulderLeft.y}
              x2={skeleton.shoulderRight.x}
              y2={skeleton.shoulderRight.y}
              thickness={8}
              color="#555"
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
            
            {/* Hips */}
            <SkeletonLine 
              x1={skeleton.hipLeft.x}
              y1={skeleton.hipLeft.y}
              x2={skeleton.hipRight.x}
              y2={skeleton.hipRight.y}
              thickness={8}
              color="#555"
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
            <SkeletonJoint x={skeleton.neck.x} y={skeleton.neck.y} size={4} />
            <SkeletonJoint x={skeleton.shoulderLeft.x} y={skeleton.shoulderLeft.y} size={5} />
            <SkeletonJoint x={skeleton.shoulderRight.x} y={skeleton.shoulderRight.y} size={5} />
            <SkeletonJoint x={skeleton.elbowLeft.x} y={skeleton.elbowLeft.y} size={4} />
            <SkeletonJoint x={skeleton.elbowRight.x} y={skeleton.elbowRight.y} size={4} />
            <SkeletonJoint x={skeleton.wristLeft.x} y={skeleton.wristLeft.y} size={3} />
            <SkeletonJoint x={skeleton.wristRight.x} y={skeleton.wristRight.y} size={3} />
            <SkeletonJoint x={skeleton.hipLeft.x} y={skeleton.hipLeft.y} size={5} />
            <SkeletonJoint x={skeleton.hipRight.x} y={skeleton.hipRight.y} size={5} />
            <SkeletonJoint x={skeleton.kneeLeft.x} y={skeleton.kneeLeft.y} size={4} />
            <SkeletonJoint x={skeleton.kneeRight.x} y={skeleton.kneeRight.y} size={4} />
            <SkeletonJoint x={skeleton.ankleLeft.x} y={skeleton.ankleLeft.y} size={3} />
            <SkeletonJoint x={skeleton.ankleRight.x} y={skeleton.ankleRight.y} size={3} />
            
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
          <div className="bg-gray-50 p-3 rounded">
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
          
          <div className="bg-gray-50 p-3 rounded">
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
          
          <div className="bg-gray-50 p-3 rounded">
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
          
          <div className="bg-gray-50 p-3 rounded">
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
          
          <div className="bg-gray-50 p-3 rounded sm:col-span-2">
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
        </div>
        
        <button
          onClick={() => setAdjustments({
            femurLength: 1,
            tibiaLength: 1,
            humerusLength: 1,
            radiusLength: 1,
            spineLength: 1
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