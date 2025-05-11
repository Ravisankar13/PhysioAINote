import { useState } from 'react';

interface LimbAdjustments {
  femurLength: number;
  tibiaLength: number;
  humerusLength: number;
  radiusLength: number;
  spineLength: number;
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

  return (
    <div className="flex flex-col md:flex-row w-full gap-4">
      <div className="w-full md:w-3/4 h-[600px] border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-32 h-32 mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-primary">
              <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 6.343L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Interactive 3D Model Coming Soon</h3>
          <p className="text-gray-500 max-w-md">
            Our 3D skeletal model is currently being optimized to provide the best possible experience.
            Check back soon for a fully interactive model that allows precise adjustments to bone dimensions.
          </p>
        </div>
      </div>
      
      <div className="w-full md:w-1/4 p-4 border rounded-lg bg-white">
        <h2 className="text-lg font-bold mb-4">Adjust Skeletal Model</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Femur Length: {adjustments.femurLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="femurLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.femurLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Tibia Length: {adjustments.tibiaLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="tibiaLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.tibiaLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Humerus Length: {adjustments.humerusLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="humerusLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.humerusLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Radius Length: {adjustments.radiusLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="radiusLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.radiusLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Spine Length: {adjustments.spineLength.toFixed(2)}
            </label>
            <input
              type="range"
              name="spineLength"
              min="0.5"
              max="1.5"
              step="0.01"
              value={adjustments.spineLength}
              onChange={handleAdjustmentChange}
              className="w-full"
            />
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
      </div>
    </div>
  );
}