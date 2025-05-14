import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BodyPartCount {
  bodyPart: string;
  count: number;
}

interface BodyHeatMapProps {
  onSelectBodyPart: (bodyPart: string) => void;
  selectedBodyPart: string;
}

export default function BodyHeatMap({ onSelectBodyPart, selectedBodyPart }: BodyHeatMapProps) {
  // Fetch body part counts
  const { data: bodyPartCounts, isLoading } = useQuery<BodyPartCount[]>({
    queryKey: ['/api/manual-therapy/counts'],
    queryFn: async () => {
      const response = await fetch('/api/manual-therapy/counts');
      if (!response.ok) {
        throw new Error('Failed to fetch technique counts');
      }
      return response.json();
    }
  });
  
  const getCount = (bodyPart: string): number => {
    if (!bodyPartCounts) return 0;
    const found = bodyPartCounts.find(item => item.bodyPart === bodyPart);
    return found ? found.count : 0;
  };
  
  const getHeatLevel = (count: number): string => {
    if (count === 0) return 'bg-gray-200';
    if (count < 5) return 'bg-blue-100';
    if (count < 10) return 'bg-blue-200';
    if (count < 20) return 'bg-blue-300';
    if (count < 30) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  return (
    <div className="w-full mx-auto max-w-4xl">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <h3 className="font-medium mb-2">Upper Body</h3>
          <div className="grid grid-cols-1 gap-2">
            <BodyPartButton 
              bodyPart="shoulder" 
              label="Shoulder" 
              count={getCount('shoulder')}
              heatLevel={getHeatLevel(getCount('shoulder'))}
              selected={selectedBodyPart === 'shoulder'}
              onClick={() => onSelectBodyPart('shoulder')}
            />
            <BodyPartButton 
              bodyPart="neck" 
              label="Neck" 
              count={getCount('neck')}
              heatLevel={getHeatLevel(getCount('neck'))}
              selected={selectedBodyPart === 'neck'}
              onClick={() => onSelectBodyPart('neck')}
            />
            <BodyPartButton 
              bodyPart="back" 
              label="Back" 
              count={getCount('back')}
              heatLevel={getHeatLevel(getCount('back'))}
              selected={selectedBodyPart === 'back'}
              onClick={() => onSelectBodyPart('back')}
            />
            <BodyPartButton 
              bodyPart="elbow" 
              label="Elbow" 
              count={getCount('elbow')}
              heatLevel={getHeatLevel(getCount('elbow'))}
              selected={selectedBodyPart === 'elbow'}
              onClick={() => onSelectBodyPart('elbow')}
            />
            <BodyPartButton 
              bodyPart="wrist" 
              label="Wrist" 
              count={getCount('wrist')}
              heatLevel={getHeatLevel(getCount('wrist'))}
              selected={selectedBodyPart === 'wrist'}
              onClick={() => onSelectBodyPart('wrist')}
            />
            <BodyPartButton 
              bodyPart="hand" 
              label="Hand" 
              count={getCount('hand')}
              heatLevel={getHeatLevel(getCount('hand'))}
              selected={selectedBodyPart === 'hand'}
              onClick={() => onSelectBodyPart('hand')}
            />
          </div>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-64 w-32 mx-auto relative">
              <svg viewBox="0 0 100 200" className="h-full w-full">
                {/* Simple human body outline */}
                <circle cx="50" cy="30" r="20" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Head */}
                <rect x="40" y="50" width="20" height="60" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Torso */}
                <rect x="30" y="50" width="10" height="40" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Left arm */}
                <rect x="60" y="50" width="10" height="40" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Right arm */}
                <rect x="40" y="110" width="10" height="50" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Left leg */}
                <rect x="50" y="110" width="10" height="50" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Right leg */}
                <circle cx="35" cy="100" r="10" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Left hip */}
                <circle cx="65" cy="100" r="10" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" /> {/* Right hip */}
              </svg>
            </div>
            <div className="mt-4">
              <h3 className="font-medium mb-2">General</h3>
              <div className="grid grid-cols-2 gap-2">
                <BodyPartButton 
                  bodyPart="general" 
                  label="General" 
                  count={getCount('general')}
                  heatLevel={getHeatLevel(getCount('general'))}
                  selected={selectedBodyPart === 'general'}
                  onClick={() => onSelectBodyPart('general')}
                />
                <BodyPartButton 
                  bodyPart="other" 
                  label="Other" 
                  count={getCount('other')}
                  heatLevel={getHeatLevel(getCount('other'))}
                  selected={selectedBodyPart === 'other'}
                  onClick={() => onSelectBodyPart('other')}
                />
                <BodyPartButton 
                  bodyPart="all" 
                  label="All" 
                  count={bodyPartCounts?.reduce((total, item) => total + item.count, 0) || 0}
                  heatLevel="bg-blue-600"
                  selected={selectedBodyPart === 'all'}
                  onClick={() => onSelectBodyPart('all')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <h3 className="font-medium mb-2">Lower Body</h3>
          <div className="grid grid-cols-1 gap-2">
            <BodyPartButton 
              bodyPart="hip" 
              label="Hip" 
              count={getCount('hip')}
              heatLevel={getHeatLevel(getCount('hip'))}
              selected={selectedBodyPart === 'hip'}
              onClick={() => onSelectBodyPart('hip')}
            />
            <BodyPartButton 
              bodyPart="knee" 
              label="Knee" 
              count={getCount('knee')}
              heatLevel={getHeatLevel(getCount('knee'))}
              selected={selectedBodyPart === 'knee'}
              onClick={() => onSelectBodyPart('knee')}
            />
            <BodyPartButton 
              bodyPart="ankle" 
              label="Ankle" 
              count={getCount('ankle')}
              heatLevel={getHeatLevel(getCount('ankle'))}
              selected={selectedBodyPart === 'ankle'}
              onClick={() => onSelectBodyPart('ankle')}
            />
            <BodyPartButton 
              bodyPart="foot" 
              label="Foot" 
              count={getCount('foot')}
              heatLevel={getHeatLevel(getCount('foot'))}
              selected={selectedBodyPart === 'foot'}
              onClick={() => onSelectBodyPart('foot')}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-center items-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 mr-1 rounded"></div>
            <span>0</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 mr-1 rounded"></div>
            <span>1-4</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-200 mr-1 rounded"></div>
            <span>5-9</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-300 mr-1 rounded"></div>
            <span>10-19</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-400 mr-1 rounded"></div>
            <span>20-29</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 mr-1 rounded"></div>
            <span>30+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BodyPartButtonProps {
  bodyPart: string;
  label: string;
  count: number;
  heatLevel: string;
  selected: boolean;
  onClick: () => void;
}

const BodyPartButton = ({ bodyPart, label, count, heatLevel, selected, onClick }: BodyPartButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant={selected ? "default" : "outline"}
      size="sm"
      className={cn(
        "w-full justify-between transition-all",
        !selected && heatLevel,
        !selected && "hover:bg-opacity-80"
      )}
    >
      <span>{label}</span>
      <span className="px-2 py-0.5 rounded-full bg-white bg-opacity-30 text-xs">
        {count}
      </span>
    </Button>
  );
};