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
    <div className="w-full">
      {/* Placeholder message */}
      <div className="w-full p-4 mb-4 border rounded-lg bg-cyan-50 text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 mx-auto mb-2 text-primary">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 6.343L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Interactive 3D Model Coming Soon</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            In the meantime, you can use the controls below to see how they'll work with the 3D model.
          </p>
        </div>
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