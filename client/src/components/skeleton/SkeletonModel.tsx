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

interface LabelProps {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontWeight?: string;
  textAnchor?: "start" | "middle" | "end";
}

function SkeletonLabel({ 
  x, 
  y, 
  text, 
  fontSize = 6, 
  fontWeight = "normal", 
  textAnchor = "middle" 
}: LabelProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAnchor={textAnchor}
      fill="#444"
    >
      {text}
    </text>
  );
}

function SkeletonBone({ 
  path, 
  fill = "none", 
  stroke = "#444", 
  strokeWidth = 1.2,
  opacity = 1
}: { 
  path: string; 
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  return (
    <path
      d={path}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
    />
  );
}

// Helper function for vertebrae
function Vertebra({ 
  centerX, 
  centerY, 
  width, 
  height,
  label = "", 
  showLabel = false
}: { 
  centerX: number; 
  centerY: number; 
  width: number; 
  height: number;
  label?: string;
  showLabel?: boolean;
}) {
  const x1 = centerX - width/2;
  const x2 = centerX + width/2;
  const y1 = centerY - height/2;
  const y2 = centerY + height/2;
  
  return (
    <g>
      <rect 
        x={x1} 
        y={y1} 
        width={width} 
        height={height} 
        rx={1} 
        fill="#f0f0f0" 
        stroke="#666" 
        strokeWidth={0.8} 
      />
      {/* Spinous process */}
      <path 
        d={`M${centerX-1},${y2} L${centerX},${y2+2} L${centerX+1},${y2}`} 
        fill="#f0f0f0" 
        stroke="#666" 
        strokeWidth={0.8} 
      />
      {showLabel && <SkeletonLabel x={centerX + width + 4} y={centerY} text={label} fontSize={5} textAnchor="start" />}
    </g>
  );
}

function SkeletonLine({ x1, y1, x2, y2, thickness = 1.5, color = "#666" }: LineProps) {
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

function SkeletonJoint({ x, y, size = 6, color = "#f0f0f0", stroke = "#666" }: { 
  x: number; 
  y: number; 
  size?: number; 
  color?: string;
  stroke?: string;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill={color}
      stroke={stroke}
      strokeWidth={1}
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

  const [showLabels, setShowLabels] = useState(true);

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
    const baseHeight = 320;
    
    // Head position
    const headY = 30;
    const headSize = 20;
    
    // Calculate joint positions based on bone lengths
    const neckY = headY + headSize;
    const shoulderY = neckY + 15;
    
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
    
    // Hand parameters
    const handSize = 10;
    const fingerLength = 15;
    
    // Pelvis and hips
    const pelvisWidth = 35 * adjustments.pelvisWidth; // Adjustable pelvis width
    const pelvisHeight = 25;
    const pelvisTop = spineEnd + 5;
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
    const ankleLeftX = centerX - 18;
    const ankleRightX = centerX + 18;
    
    // Feet parameters
    const footLength = 25;
    const footHeight = 8;
    
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
      
      // Hands
      handLeft: { 
        x: wristLeftX - 5, 
        y: wristY + 5, 
        width: handSize, 
        height: handSize + 5 
      },
      handRight: { 
        x: wristRightX + 5, 
        y: wristY + 5, 
        width: handSize, 
        height: handSize + 5 
      },
      
      // Hips
      hipLeft: { x: hipLeftX, y: hipY },
      hipRight: { x: hipRightX, y: hipY },
      
      // Legs
      kneeLeft: { x: kneeLeftX, y: kneeY },
      kneeRight: { x: kneeRightX, y: kneeY },
      ankleLeft: { x: ankleLeftX, y: ankleY },
      ankleRight: { x: ankleRightX, y: ankleY },
      
      // Feet
      footLeft: {
        x: ankleLeftX - 10,
        y: ankleY,
        width: footLength,
        height: footHeight
      },
      footRight: {
        x: ankleRightX - 15,
        y: ankleY,
        width: footLength,
        height: footHeight
      },
      
      // Dimensions for bone labels
      dimensions: {
        skull: "Cranium/Skull",
        cervicalVert: "Cervical Vertebrae",
        thoracicVert: "Thoracic Vertebrae",
        lumbarVert: "Lumbar Vertebrae",
        clavicle: "Clavicle",
        scapula: "Scapula",
        sternum: "Sternum",
        humerus: "Humerus",
        radius: "Radius",
        ulna: "Ulna", 
        carpals: "Carpals",
        metacarpals: "Metacarpals",
        phalanges: "Phalanges (Fingers)",
        ribs: "Ribs",
        pelvis: "Pelvis",
        sacrum: "Sacrum",
        coccyx: "Coccyx",
        femur: "Femur",
        patella: "Patella",
        tibia: "Tibia",
        fibula: "Fibula",
        tarsals: "Tarsals",
        metatarsals: "Metatarsals",
        toePhalanges: "Phalanges (Toes)"
      }
    };
  }, [adjustments]);

  return (
    <div className="w-full">
      {/* Interactive skeleton visualization */}
      <div className="w-full p-4 mb-4 border rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-center">Anatomical Skeleton Model</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={() => setShowLabels(!showLabels)}
                className="mr-2"
              />
              Show Labels
            </label>
          </div>
        </div>
        
        <div className="w-full bg-gray-50 rounded-lg p-4 flex justify-center">
          <svg 
            width="240" 
            height="500" 
            viewBox="0 0 240 500" 
            style={{ maxHeight: '600px' }}
          >
            <defs>
              <linearGradient id="boneGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e6e6e6" />
                <stop offset="50%" stopColor="#f8f8f8" />
                <stop offset="100%" stopColor="#e6e6e6" />
              </linearGradient>
            </defs>
            
            {/* Skull */}
            <g>
              {/* Cranium */}
              <ellipse 
                cx={skeleton.head.x} 
                cy={skeleton.head.y - 2} 
                rx={19} 
                ry={21} 
                fill="url(#boneGradient)" 
                stroke="#666" 
                strokeWidth={1.2} 
              />
              
              {/* Face/Jaw */}
              <path 
                d={`
                  M${skeleton.head.x - 14},${skeleton.head.y + 8}
                  Q${skeleton.head.x},${skeleton.head.y + 25},${skeleton.head.x + 14},${skeleton.head.y + 8}
                  L${skeleton.head.x + 12},${skeleton.head.y + 5}
                  Q${skeleton.head.x},${skeleton.head.y + 20},${skeleton.head.x - 12},${skeleton.head.y + 5}
                  Z
                `} 
                fill="url(#boneGradient)" 
                stroke="#666" 
                strokeWidth={1.2} 
              />
              
              {/* Eye sockets */}
              <ellipse 
                cx={skeleton.head.x - 7} 
                cy={skeleton.head.y} 
                rx={4} 
                ry={5} 
                fill="#e0e0e0" 
                stroke="#666" 
                strokeWidth={1} 
              />
              <ellipse 
                cx={skeleton.head.x + 7} 
                cy={skeleton.head.y} 
                rx={4} 
                ry={5} 
                fill="#e0e0e0" 
                stroke="#666" 
                strokeWidth={1} 
              />
              
              {/* Zygomatic arches (cheekbones) */}
              <path 
                d={`
                  M${skeleton.head.x - 10},${skeleton.head.y + 2}
                  Q${skeleton.head.x - 15},${skeleton.head.y + 5},${skeleton.head.x - 12},${skeleton.head.y + 10}
                `}
                fill="none"
                stroke="#666"
                strokeWidth={1}
              />
              <path 
                d={`
                  M${skeleton.head.x + 10},${skeleton.head.y + 2}
                  Q${skeleton.head.x + 15},${skeleton.head.y + 5},${skeleton.head.x + 12},${skeleton.head.y + 10}
                `}
                fill="none"
                stroke="#666"
                strokeWidth={1}
              />
              
              {/* Nasal cavity */}
              <path
                d={`
                  M${skeleton.head.x - 3},${skeleton.head.y + 5}
                  Q${skeleton.head.x},${skeleton.head.y + 10},${skeleton.head.x + 3},${skeleton.head.y + 5}
                `}
                fill="none"
                stroke="#666"
                strokeWidth={1}
              />
              
              {/* Label */}
              {showLabels && (
                <SkeletonLabel 
                  x={skeleton.head.x + 35} 
                  y={skeleton.head.y} 
                  text={skeleton.dimensions.skull} 
                  fontSize={6}
                  textAnchor="start"
                />
              )}
            </g>
            
            {/* Cervical vertebrae */}
            <g>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const yPos = skeleton.neck.y + 4 + i * 3.5;
                return (
                  <Vertebra 
                    key={`cv-${i}`} 
                    centerX={skeleton.neck.x} 
                    centerY={yPos} 
                    width={8} 
                    height={3}
                    label={i === 3 && showLabels ? skeleton.dimensions.cervicalVert : ""}
                    showLabel={i === 3}
                  />
                );
              })}
            </g>
            
            {/* Thoracic and Lumbar vertebrae */}
            <g>
              {/* Thoracic */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
                const progress = i / 12;
                const vertSize = 4 + (progress * 3);
                const yPos = skeleton.ribcage.top + 14 + i * (skeleton.ribcage.height / 14);
                return (
                  <Vertebra 
                    key={`tv-${i}`} 
                    centerX={skeleton.spine.start.x} 
                    centerY={yPos} 
                    width={9 + progress * 3} 
                    height={vertSize}
                    label={i === 5 && showLabels ? skeleton.dimensions.thoracicVert : ""}
                    showLabel={i === 5}
                  />
                );
              })}
              
              {/* Lumbar */}
              {[0, 1, 2, 3, 4].map((i) => {
                const yPos = skeleton.ribcage.bottom + 5 + i * 7;
                return (
                  <Vertebra 
                    key={`lv-${i}`} 
                    centerX={skeleton.spine.start.x} 
                    centerY={yPos} 
                    width={14} 
                    height={6}
                    label={i === 2 && showLabels ? skeleton.dimensions.lumbarVert : ""}
                    showLabel={i === 2}
                  />
                );
              })}
            </g>
            
            {/* Sacrum and Coccyx */}
            <g>
              <path 
                d={`
                  M${skeleton.spine.start.x - 12},${skeleton.pelvis.top - 5}
                  Q${skeleton.spine.start.x},${skeleton.pelvis.top - 8},${skeleton.spine.start.x + 12},${skeleton.pelvis.top - 5}
                  L${skeleton.spine.start.x + 10},${skeleton.pelvis.top + 15}
                  Q${skeleton.spine.start.x},${skeleton.pelvis.top + 18},${skeleton.spine.start.x - 10},${skeleton.pelvis.top + 15}
                  Z
                `}
                fill="url(#boneGradient)"
                stroke="#666"
                strokeWidth={1.2}
              />
              
              {/* Coccyx */}
              <path
                d={`
                  M${skeleton.spine.start.x - 4},${skeleton.pelvis.top + 15}
                  Q${skeleton.spine.start.x},${skeleton.pelvis.top + 24},${skeleton.spine.start.x + 4},${skeleton.pelvis.top + 15}
                `}
                fill="#f0f0f0"
                stroke="#666"
                strokeWidth={1}
              />
              
              {/* Labels */}
              {showLabels && (
                <>
                  <SkeletonLabel 
                    x={skeleton.spine.start.x + 30} 
                    y={skeleton.pelvis.top + 5} 
                    text={skeleton.dimensions.sacrum} 
                    fontSize={6}
                    textAnchor="start"
                  />
                  <SkeletonLabel 
                    x={skeleton.spine.start.x + 30} 
                    y={skeleton.pelvis.top + 20} 
                    text={skeleton.dimensions.coccyx} 
                    fontSize={6}
                    textAnchor="start"
                  />
                </>
              )}
            </g>
            
            {/* Ribcage Structure */}
            <g>
              {/* Sternum */}
              <path 
                d={`
                  M${skeleton.ribcage.center},${skeleton.ribcage.top + 12}
                  Q${skeleton.ribcage.center + 2},${skeleton.ribcage.top + 15},${skeleton.ribcage.center},${skeleton.ribcage.top + 18}
                  Q${skeleton.ribcage.center - 2},${skeleton.ribcage.top + 21},${skeleton.ribcage.center},${skeleton.ribcage.top + 24}
                  Q${skeleton.ribcage.center + 2},${skeleton.ribcage.top + 27},${skeleton.ribcage.center},${skeleton.ribcage.top + 30}
                  Q${skeleton.ribcage.center - 2},${skeleton.ribcage.top + 33},${skeleton.ribcage.center},${skeleton.ribcage.top + 36}
                  Q${skeleton.ribcage.center + 2},${skeleton.ribcage.top + 39},${skeleton.ribcage.center},${skeleton.ribcage.top + 42}
                  Q${skeleton.ribcage.center - 2},${skeleton.ribcage.top + 45},${skeleton.ribcage.center},${skeleton.ribcage.top + 48}
                `}
                fill="#f0f0f0"
                stroke="#666"
                strokeWidth={3}
              />
              
              {/* Individual ribs - using curved paths for each rib pair */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
                const ribSpacing = skeleton.ribcage.height / 13;
                const y = skeleton.ribcage.top + 10 + (i * ribSpacing);
                const ribWidth = (skeleton.ribcage.width * 0.95) * (i < 7 ? 1 - (i * 0.01) : 1 - (i * 0.05));
                const ribHeight = ribSpacing * 0.9;
                const ribCurve = 15 + (i * 1.5);
                
                // Only first 7 pairs are true ribs (connected to sternum)
                const isFloatingRib = i > 9;
                const isFalseRib = i > 6 && i <= 9;
                const isTrueRib = i <= 6;
                const connectToSternum = isTrueRib;
                
                return (
                  <g key={`rib-${i}`}>
                    {/* Left rib */}
                    <path 
                      d={`
                        M${skeleton.spine.start.x - 4},${y}
                        C${skeleton.spine.start.x - ribWidth/4},${y - ribCurve},
                          ${skeleton.spine.start.x - ribWidth/2},${y - ribCurve},
                          ${skeleton.spine.start.x - ribWidth + 10},${y - ribHeight/2}
                        ${connectToSternum ? 
                          `L${skeleton.spine.start.x - ribWidth + 5},${y}
                           C${skeleton.spine.start.x - ribWidth/3},${y + ribCurve/2},
                             ${skeleton.spine.start.x - 15},${y + ribCurve/3},
                             ${skeleton.spine.start.x - 2},${y + (i * 1.5)}` 
                          : 
                          isFloatingRib ? 
                            `Q${skeleton.spine.start.x - ribWidth + 3},${y + 2},${skeleton.spine.start.x - ribWidth},${y}` 
                            : 
                            `Q${skeleton.spine.start.x - ribWidth + 3},${y + 2},${skeleton.spine.start.x - ribWidth + 15},${y + (i * 0.8)}`
                        }
                      `}
                      fill="none"
                      stroke="#666"
                      strokeWidth={1.2}
                      opacity={0.9}
                    />
                    
                    {/* Right rib */}
                    <path 
                      d={`
                        M${skeleton.spine.start.x + 4},${y}
                        C${skeleton.spine.start.x + ribWidth/4},${y - ribCurve},
                          ${skeleton.spine.start.x + ribWidth/2},${y - ribCurve},
                          ${skeleton.spine.start.x + ribWidth - 10},${y - ribHeight/2}
                        ${connectToSternum ? 
                          `L${skeleton.spine.start.x + ribWidth - 5},${y}
                           C${skeleton.spine.start.x + ribWidth/3},${y + ribCurve/2},
                             ${skeleton.spine.start.x + 15},${y + ribCurve/3},
                             ${skeleton.spine.start.x + 2},${y + (i * 1.5)}` 
                          : 
                          isFloatingRib ? 
                            `Q${skeleton.spine.start.x + ribWidth - 3},${y + 2},${skeleton.spine.start.x + ribWidth},${y}` 
                            : 
                            `Q${skeleton.spine.start.x + ribWidth - 3},${y + 2},${skeleton.spine.start.x + ribWidth - 15},${y + (i * 0.8)}`
                        }
                      `}
                      fill="none"
                      stroke="#666"
                      strokeWidth={1.2}
                      opacity={0.9}
                    />
                  </g>
                );
              })}
              
              {/* Labels */}
              {showLabels && (
                <>
                  <SkeletonLabel 
                    x={skeleton.ribcage.center} 
                    y={skeleton.ribcage.top + 24} 
                    text={skeleton.dimensions.sternum} 
                    fontSize={6}
                    textAnchor="middle"
                  />
                  <SkeletonLabel 
                    x={skeleton.ribcage.left - 25} 
                    y={skeleton.ribcage.top + 30} 
                    text={skeleton.dimensions.ribs} 
                    fontSize={6}
                    textAnchor="start"
                  />
                </>
              )}
            </g>
            
            {/* Pelvis */}
            <g>
              {/* Ilium (hip bones) */}
              <path 
                d={`
                  M${skeleton.pelvis.left + 10},${skeleton.pelvis.top}
                  Q${skeleton.pelvis.left},${skeleton.pelvis.top - 5},${skeleton.pelvis.left - 5},${skeleton.pelvis.top + 10}
                  Q${skeleton.pelvis.left - 8},${skeleton.pelvis.top + 20},${skeleton.pelvis.left},${skeleton.pelvis.top + 25}
                  L${skeleton.hipLeft.x - 5},${skeleton.hipLeft.y}
                  Q${skeleton.hipLeft.x},${skeleton.hipLeft.y + 5},${skeleton.hipLeft.x + 10},${skeleton.hipLeft.y}
                  Q${skeleton.hipLeft.x + 15},${skeleton.hipLeft.y - 15},${skeleton.pelvis.left + 10},${skeleton.pelvis.top}
                `}
                fill="url(#boneGradient)"
                stroke="#666"
                strokeWidth={1.2}
              />
              
              <path 
                d={`
                  M${skeleton.pelvis.right - 10},${skeleton.pelvis.top}
                  Q${skeleton.pelvis.right},${skeleton.pelvis.top - 5},${skeleton.pelvis.right + 5},${skeleton.pelvis.top + 10}
                  Q${skeleton.pelvis.right + 8},${skeleton.pelvis.top + 20},${skeleton.pelvis.right},${skeleton.pelvis.top + 25}
                  L${skeleton.hipRight.x + 5},${skeleton.hipRight.y}
                  Q${skeleton.hipRight.x},${skeleton.hipRight.y + 5},${skeleton.hipRight.x - 10},${skeleton.hipRight.y}
                  Q${skeleton.hipRight.x - 15},${skeleton.hipRight.y - 15},${skeleton.pelvis.right - 10},${skeleton.pelvis.top}
                `}
                fill="url(#boneGradient)"
                stroke="#666"
                strokeWidth={1.2}
              />
              
              {/* Pubic bones and ischium */}
              <path 
                d={`
                  M${skeleton.hipLeft.x + 2},${skeleton.hipLeft.y + 2}
                  Q${skeleton.hipLeft.x + 8},${skeleton.hipLeft.y + 15},${skeleton.pelvis.left + skeleton.pelvis.width/2 - 5},${skeleton.pelvis.bottom}
                  L${skeleton.pelvis.left + skeleton.pelvis.width/2 + 5},${skeleton.pelvis.bottom}
                  Q${skeleton.hipRight.x - 8},${skeleton.hipRight.y + 15},${skeleton.hipRight.x - 2},${skeleton.hipRight.y + 2}
                `}
                fill="url(#boneGradient)"
                stroke="#666"
                strokeWidth={1.2}
              />
              
              {/* Acetabulum (hip socket) - left */}
              <circle 
                cx={skeleton.hipLeft.x} 
                cy={skeleton.hipLeft.y} 
                r={8} 
                fill="none" 
                stroke="#666" 
                strokeWidth={1.5} 
              />
              <circle 
                cx={skeleton.hipLeft.x} 
                cy={skeleton.hipLeft.y} 
                r={5} 
                fill="#d5d5d5" 
                stroke="#aaa" 
                strokeWidth={1} 
              />
              
              {/* Acetabulum (hip socket) - right */}
              <circle 
                cx={skeleton.hipRight.x} 
                cy={skeleton.hipRight.y} 
                r={8} 
                fill="none" 
                stroke="#666" 
                strokeWidth={1.5} 
              />
              
              {/* Pelvis label */}
              {showLabels && (
                <SkeletonLabel 
                  x={skeleton.pelvis.left - 20} 
                  y={skeleton.pelvis.top + 15} 
                  text={skeleton.dimensions.pelvis} 
                  fontSize={6}
                  textAnchor="start"
                />
              )}
              <circle 
                cx={skeleton.hipRight.x} 
                cy={skeleton.hipRight.y} 
                r={5} 
                fill="#d5d5d5" 
                stroke="#aaa" 
                strokeWidth={1} 
              />
            </g>
            
            {/* Clavicles */}
            <path 
              d={`
                M${skeleton.neck.x},${skeleton.shoulderLeft.y - 3}
                C${skeleton.neck.x + 8},${skeleton.shoulderLeft.y - 5},
                  ${skeleton.shoulderLeft.x - 10},${skeleton.shoulderLeft.y - 5},
                  ${skeleton.shoulderLeft.x},${skeleton.shoulderLeft.y}
              `}
              fill="none"
              stroke="#d0d0d0"
              strokeWidth={4}
            />
            <path 
              d={`
                M${skeleton.neck.x},${skeleton.shoulderLeft.y - 3}
                C${skeleton.neck.x + 8},${skeleton.shoulderLeft.y - 5},
                  ${skeleton.shoulderLeft.x - 10},${skeleton.shoulderLeft.y - 5},
                  ${skeleton.shoulderLeft.x},${skeleton.shoulderLeft.y}
              `}
              fill="none"
              stroke="#aaa"
              strokeWidth={1}
            />
            
            <path 
              d={`
                M${skeleton.neck.x},${skeleton.shoulderRight.y - 3}
                C${skeleton.neck.x - 8},${skeleton.shoulderRight.y - 5},
                  ${skeleton.shoulderRight.x + 10},${skeleton.shoulderRight.y - 5},
                  ${skeleton.shoulderRight.x},${skeleton.shoulderRight.y}
              `}
              fill="none"
              stroke="#d0d0d0"
              strokeWidth={4}
            />
            <path 
              d={`
                M${skeleton.neck.x},${skeleton.shoulderRight.y - 3}
                C${skeleton.neck.x - 8},${skeleton.shoulderRight.y - 5},
                  ${skeleton.shoulderRight.x + 10},${skeleton.shoulderRight.y - 5},
                  ${skeleton.shoulderRight.x},${skeleton.shoulderRight.y}
              `}
              fill="none"
              stroke="#aaa"
              strokeWidth={1}
            />
            
            {/* Scapula (shoulder blades) */}
            <path 
              d={`
                M${skeleton.shoulderLeft.x},${skeleton.shoulderLeft.y}
                L${skeleton.shoulderLeft.x - 10},${skeleton.shoulderLeft.y + 5}
                Q${skeleton.shoulderLeft.x - 15},${skeleton.shoulderLeft.y + 25},${skeleton.shoulderLeft.x - 8},${skeleton.shoulderLeft.y + 40}
                Q${skeleton.shoulderLeft.x + 8},${skeleton.shoulderLeft.y + 35},${skeleton.shoulderLeft.x + 5},${skeleton.shoulderLeft.y + 10}
                Z
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1}
              opacity={0.6}
            />
            
            <path 
              d={`
                M${skeleton.shoulderRight.x},${skeleton.shoulderRight.y}
                L${skeleton.shoulderRight.x + 10},${skeleton.shoulderRight.y + 5}
                Q${skeleton.shoulderRight.x + 15},${skeleton.shoulderRight.y + 25},${skeleton.shoulderRight.x + 8},${skeleton.shoulderRight.y + 40}
                Q${skeleton.shoulderRight.x - 8},${skeleton.shoulderRight.y + 35},${skeleton.shoulderRight.x - 5},${skeleton.shoulderRight.y + 10}
                Z
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1}
              opacity={0.6}
            />
            
            {/* Arms: Upper arm (humerus) */}
            <path 
              d={`
                M${skeleton.shoulderLeft.x},${skeleton.shoulderLeft.y}
                Q${skeleton.shoulderLeft.x - 2},${skeleton.shoulderLeft.y + 15},${skeleton.elbowLeft.x},${skeleton.elbowLeft.y - 5}
                L${skeleton.elbowLeft.x - 4},${skeleton.elbowLeft.y}
                L${skeleton.elbowLeft.x},${skeleton.elbowLeft.y + 5}
                L${skeleton.elbowLeft.x + 4},${skeleton.elbowLeft.y}
                L${skeleton.elbowLeft.x},${skeleton.elbowLeft.y - 5}
                Q${skeleton.shoulderLeft.x + 2},${skeleton.shoulderLeft.y + 15},${skeleton.shoulderLeft.x},${skeleton.shoulderLeft.y}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            <path 
              d={`
                M${skeleton.shoulderRight.x},${skeleton.shoulderRight.y}
                Q${skeleton.shoulderRight.x + 2},${skeleton.shoulderRight.y + 15},${skeleton.elbowRight.x},${skeleton.elbowRight.y - 5}
                L${skeleton.elbowRight.x + 4},${skeleton.elbowRight.y}
                L${skeleton.elbowRight.x},${skeleton.elbowRight.y + 5}
                L${skeleton.elbowRight.x - 4},${skeleton.elbowRight.y}
                L${skeleton.elbowRight.x},${skeleton.elbowRight.y - 5}
                Q${skeleton.shoulderRight.x - 2},${skeleton.shoulderRight.y + 15},${skeleton.shoulderRight.x},${skeleton.shoulderRight.y}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            {/* Arms: Lower arm (radius and ulna) */}
            <path 
              d={`
                M${skeleton.elbowLeft.x - 3},${skeleton.elbowLeft.y + 1}
                Q${skeleton.elbowLeft.x - 4},${skeleton.elbowLeft.y + 15},${skeleton.wristLeft.x - 2},${skeleton.wristLeft.y - 2}
                L${skeleton.wristLeft.x},${skeleton.wristLeft.y}
                Q${skeleton.elbowLeft.x + 2},${skeleton.elbowLeft.y + 15},${skeleton.elbowLeft.x + 3},${skeleton.elbowLeft.y + 1}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            <path 
              d={`
                M${skeleton.elbowRight.x + 3},${skeleton.elbowRight.y + 1}
                Q${skeleton.elbowRight.x + 4},${skeleton.elbowRight.y + 15},${skeleton.wristRight.x + 2},${skeleton.wristRight.y - 2}
                L${skeleton.wristRight.x},${skeleton.wristRight.y}
                Q${skeleton.elbowRight.x - 2},${skeleton.elbowRight.y + 15},${skeleton.elbowRight.x - 3},${skeleton.elbowRight.y + 1}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            {/* Hand bones - carpals, metacarpals and phalanges */}
            <g>
              {/* Left wrist */}
              <rect 
                x={skeleton.wristLeft.x - 5} 
                y={skeleton.wristLeft.y - 2} 
                width={10} 
                height={6} 
                rx={2} 
                fill="url(#boneGradient)" 
                stroke="#aaa" 
                strokeWidth={0.8} 
              />
              
              {/* Left fingers */}
              {[0, 1, 2, 3, 4].map((i) => {
                const baseX = skeleton.wristLeft.x - 4 + (i * 2);
                const baseY = skeleton.wristLeft.y + 4;
                const length = i === 0 ? 6 : (i === 4 ? 8 : 10);
                
                return (
                  <g key={`lf-${i}`}>
                    <line 
                      x1={baseX} 
                      y1={baseY} 
                      x2={baseX} 
                      y2={baseY + length} 
                      stroke="#d0d0d0" 
                      strokeWidth={1.5} 
                    />
                  </g>
                );
              })}
              
              {/* Right wrist */}
              <rect 
                x={skeleton.wristRight.x - 5} 
                y={skeleton.wristRight.y - 2} 
                width={10} 
                height={6} 
                rx={2} 
                fill="url(#boneGradient)" 
                stroke="#aaa" 
                strokeWidth={0.8} 
              />
              
              {/* Right fingers */}
              {[0, 1, 2, 3, 4].map((i) => {
                const baseX = skeleton.wristRight.x + 4 - (i * 2);
                const baseY = skeleton.wristRight.y + 4;
                const length = i === 0 ? 6 : (i === 4 ? 8 : 10);
                
                return (
                  <g key={`rf-${i}`}>
                    <line 
                      x1={baseX} 
                      y1={baseY} 
                      x2={baseX} 
                      y2={baseY + length} 
                      stroke="#d0d0d0" 
                      strokeWidth={1.5} 
                    />
                  </g>
                );
              })}
            </g>
            
            {/* Legs: Upper leg (femur) */}
            <path 
              d={`
                M${skeleton.hipLeft.x},${skeleton.hipLeft.y}
                Q${skeleton.hipLeft.x - 5},${skeleton.hipLeft.y + 25},${skeleton.kneeLeft.x},${skeleton.kneeLeft.y - 6}
                L${skeleton.kneeLeft.x - 5},${skeleton.kneeLeft.y}
                L${skeleton.kneeLeft.x},${skeleton.kneeLeft.y + 6}
                L${skeleton.kneeLeft.x + 5},${skeleton.kneeLeft.y}
                L${skeleton.kneeLeft.x},${skeleton.kneeLeft.y - 6}
                Q${skeleton.hipLeft.x + 5},${skeleton.hipLeft.y + 25},${skeleton.hipLeft.x},${skeleton.hipLeft.y}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            <path 
              d={`
                M${skeleton.hipRight.x},${skeleton.hipRight.y}
                Q${skeleton.hipRight.x + 5},${skeleton.hipRight.y + 25},${skeleton.kneeRight.x},${skeleton.kneeRight.y - 6}
                L${skeleton.kneeRight.x + 5},${skeleton.kneeRight.y}
                L${skeleton.kneeRight.x},${skeleton.kneeRight.y + 6}
                L${skeleton.kneeRight.x - 5},${skeleton.kneeRight.y}
                L${skeleton.kneeRight.x},${skeleton.kneeRight.y - 6}
                Q${skeleton.hipRight.x - 5},${skeleton.hipRight.y + 25},${skeleton.hipRight.x},${skeleton.hipRight.y}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            {/* Legs: Lower leg (tibia and fibula) */}
            <path 
              d={`
                M${skeleton.kneeLeft.x - 3},${skeleton.kneeLeft.y + 2}
                Q${skeleton.kneeLeft.x - 4},${skeleton.kneeLeft.y + 25},${skeleton.ankleLeft.x - 3},${skeleton.ankleLeft.y - 3}
                L${skeleton.ankleLeft.x},${skeleton.ankleLeft.y}
                Q${skeleton.kneeLeft.x + 2},${skeleton.kneeLeft.y + 25},${skeleton.kneeLeft.x + 3},${skeleton.kneeLeft.y + 2}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            <path 
              d={`
                M${skeleton.kneeRight.x + 3},${skeleton.kneeRight.y + 2}
                Q${skeleton.kneeRight.x + 4},${skeleton.kneeRight.y + 25},${skeleton.ankleRight.x + 3},${skeleton.ankleRight.y - 3}
                L${skeleton.ankleRight.x},${skeleton.ankleRight.y}
                Q${skeleton.kneeRight.x - 2},${skeleton.kneeRight.y + 25},${skeleton.kneeRight.x - 3},${skeleton.kneeRight.y + 2}
              `}
              fill="url(#boneGradient)"
              stroke="#aaa"
              strokeWidth={1.2}
            />
            
            {/* Feet bones */}
            <g>
              {/* Left ankle and foot */}
              <path 
                d={`
                  M${skeleton.ankleLeft.x},${skeleton.ankleLeft.y}
                  L${skeleton.ankleLeft.x - 8},${skeleton.ankleLeft.y + 2}
                  Q${skeleton.ankleLeft.x - 12},${skeleton.ankleLeft.y + 5},${skeleton.ankleLeft.x - 14},${skeleton.ankleLeft.y + 12}
                  L${skeleton.ankleLeft.x + 4},${skeleton.ankleLeft.y + 12}
                  Q${skeleton.ankleLeft.x + 2},${skeleton.ankleLeft.y + 5},${skeleton.ankleLeft.x},${skeleton.ankleLeft.y}
                `}
                fill="url(#boneGradient)"
                stroke="#aaa"
                strokeWidth={1}
              />
              
              {/* Left toes */}
              {[0, 1, 2, 3, 4].map((i) => {
                const baseX = skeleton.ankleLeft.x - 12 + (i * 3);
                const baseY = skeleton.ankleLeft.y + 12;
                
                return (
                  <line 
                    key={`lt-${i}`}
                    x1={baseX} 
                    y1={baseY} 
                    x2={baseX} 
                    y2={baseY + 4} 
                    stroke="#d0d0d0" 
                    strokeWidth={1.5} 
                  />
                );
              })}
              
              {/* Right ankle and foot */}
              <path 
                d={`
                  M${skeleton.ankleRight.x},${skeleton.ankleRight.y}
                  L${skeleton.ankleRight.x + 8},${skeleton.ankleRight.y + 2}
                  Q${skeleton.ankleRight.x + 12},${skeleton.ankleRight.y + 5},${skeleton.ankleRight.x + 14},${skeleton.ankleRight.y + 12}
                  L${skeleton.ankleRight.x - 4},${skeleton.ankleRight.y + 12}
                  Q${skeleton.ankleRight.x - 2},${skeleton.ankleRight.y + 5},${skeleton.ankleRight.x},${skeleton.ankleRight.y}
                `}
                fill="url(#boneGradient)"
                stroke="#aaa"
                strokeWidth={1}
              />
              
              {/* Right toes */}
              {[0, 1, 2, 3, 4].map((i) => {
                const baseX = skeleton.ankleRight.x + 12 - (i * 3);
                const baseY = skeleton.ankleRight.y + 12;
                
                return (
                  <line 
                    key={`rt-${i}`}
                    x1={baseX} 
                    y1={baseY} 
                    x2={baseX} 
                    y2={baseY + 4} 
                    stroke="#d0d0d0" 
                    strokeWidth={1.5} 
                  />
                );
              })}
            </g>
            
            {/* Patella (kneecaps) */}
            <ellipse 
              cx={skeleton.kneeLeft.x} 
              cy={skeleton.kneeLeft.y} 
              rx={6} 
              ry={7} 
              fill="url(#boneGradient)" 
              stroke="#aaa" 
              strokeWidth={1} 
            />
            
            <ellipse 
              cx={skeleton.kneeRight.x} 
              cy={skeleton.kneeRight.y} 
              rx={6} 
              ry={7} 
              fill="url(#boneGradient)" 
              stroke="#aaa" 
              strokeWidth={1} 
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
        <h3 className="font-medium mb-2">How these controls work:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Adjust sliders to change bone proportions in the skeleton model</li>
          <li>Modifications help visualize patient anatomical variations</li>
          <li>Use Reset button to return to default measurements</li>
          <li>Values represent proportional changes (1.0 = normal length)</li>
        </ul>
      </div>
    </div>
  );
}