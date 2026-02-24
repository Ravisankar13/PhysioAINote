import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Square, ChevronDown, ChevronUp, Activity, Gauge, GripVertical, SlidersHorizontal, AlertTriangle, Bone, ArrowRight, PersonStanding } from 'lucide-react';
import { MOVEMENT_SEQUENCES, MOVEMENT_CATEGORIES, MOVEMENT_RESTRICTIONS, type MovementSequence } from '@/lib/movementSequences';
import { calculateCompensations, computePostureDeviations, NORMAL_ROM, type JointConstraint, type ClinicalWarning } from '@/lib/jointConstraints';
import type { AnimationState, AnimationConstraint } from './PureThreeGLBViewer';

type PostureConfig = Record<string, Record<string, number | undefined> | undefined>;

interface MovementPlayerProps {
  animationState: AnimationState;
  onAnimationStateChange: (state: AnimationState) => void;
  onConstraintsChange?: (constraints: AnimationConstraint[]) => void;
  modelConfig?: PostureConfig;
}

export default function MovementPlayer({ animationState, onAnimationStateChange, onConstraintsChange, modelConfig }: MovementPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [restrictions, setRestrictions] = useState<Record<string, number>>({});
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMovement = animationState.currentMovement
    ? MOVEMENT_SEQUENCES.find(m => m.id === animationState.currentMovement)
    : null;

  const currentRestrictions = animationState.currentMovement
    ? MOVEMENT_RESTRICTIONS[animationState.currentMovement] || []
    : [];

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragRef.current = { startX: clientX, startY: clientY, origX: position.x, origY: position.y };
    setIsDragging(true);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragRef.current) return;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setPosition({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!animationState.currentMovement) {
      setRestrictions({});
      setShowRestrictions(false);
    }
  }, [animationState.currentMovement]);

  useEffect(() => {
    if (!onConstraintsChange) return;
    const movementId = animationState.currentMovement;
    if (!movementId) {
      onConstraintsChange([]);
      return;
    }
    const defs = MOVEMENT_RESTRICTIONS[movementId] || [];
    const constraints: AnimationConstraint[] = [];
    defs.forEach(def => {
      const key = `${def.joint}:${def.movement}`;
      const maxROM = restrictions[key];
      if (maxROM !== undefined && maxROM < def.defaultMaxROM) {
        constraints.push({
          joint: def.joint,
          movement: def.movement,
          maxROM,
          normalROM: def.defaultMaxROM,
        });
      }
    });
    onConstraintsChange(constraints);
  }, [restrictions, animationState.currentMovement, onConstraintsChange]);

  const handleSelectMovement = useCallback((movement: MovementSequence) => {
    setRestrictions({});
    onAnimationStateChange({
      isPlaying: true,
      currentMovement: movement.id,
      progress: 0,
      speed: animationState.speed,
    });
    setIsExpanded(false);
  }, [animationState.speed, onAnimationStateChange]);

  const handlePlayPause = useCallback(() => {
    if (!animationState.currentMovement) return;
    onAnimationStateChange({
      ...animationState,
      isPlaying: !animationState.isPlaying,
    });
  }, [animationState, onAnimationStateChange]);

  const handleStop = useCallback(() => {
    onAnimationStateChange({
      isPlaying: false,
      currentMovement: null,
      progress: 0,
      speed: animationState.speed,
    });
  }, [animationState.speed, onAnimationStateChange]);

  const handleSpeedChange = useCallback((speed: number) => {
    onAnimationStateChange({
      ...animationState,
      speed,
    });
  }, [animationState, onAnimationStateChange]);

  const handleRestrictionChange = useCallback((key: string, value: number) => {
    setRestrictions(prev => ({ ...prev, [key]: value }));
  }, []);

  const postureContext = useMemo(() => {
    if (!modelConfig) return undefined;
    return computePostureDeviations(modelConfig);
  }, [modelConfig]);

  const compensationResult = useMemo(() => {
    if (!animationState.currentMovement) return null;
    const defs = MOVEMENT_RESTRICTIONS[animationState.currentMovement] || [];
    const jointConstraints: JointConstraint[] = [];
    defs.forEach(def => {
      const key = `${def.joint}:${def.movement}`;
      const maxROM = restrictions[key];
      if (maxROM !== undefined && maxROM < def.defaultMaxROM) {
        const normalROM = NORMAL_ROM[def.joint as keyof typeof NORMAL_ROM]?.[def.movement] || def.defaultMaxROM;
        jointConstraints.push({
          id: key,
          joint: def.joint as any,
          movement: def.movement as any,
          maxROM,
          normalROM,
          reason: 'stiffness',
          isActive: true,
        });
      }
    });
    if (jointConstraints.length === 0) return null;
    return calculateCompensations(jointConstraints, postureContext);
  }, [restrictions, animationState.currentMovement, postureContext]);

  const speedPresets = [0.25, 0.5, 1, 1.5, 2];

  return (
    <div
      ref={containerRef}
      className="absolute z-20 w-72"
      style={{
        top: `calc(3.5rem + ${position.y}px)`,
        right: `calc(0.75rem - ${position.x}px)`,
        cursor: isDragging ? 'grabbing' : undefined,
        userSelect: isDragging ? 'none' : undefined,
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
        <div
          className="flex items-center justify-center gap-1 py-1 cursor-grab active:cursor-grabbing bg-gray-800/50 border-b border-gray-700/30 select-none"
          onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }}
          onTouchStart={(e) => { if (e.touches.length === 1) handleDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
        >
          <GripVertical className="w-3 h-3 text-gray-600" />
          <span className="text-[9px] text-gray-600 uppercase tracking-wider font-medium">Drag to move</span>
          <GripVertical className="w-3 h-3 text-gray-600" />
        </div>

        {isExpanded && (
          <div className="max-h-[320px] overflow-y-auto p-3 border-b border-gray-700/50">
            <div className="flex gap-2 mb-3 flex-wrap">
              {MOVEMENT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {(selectedCategory
                ? MOVEMENT_SEQUENCES.filter(m => {
                    const cat = MOVEMENT_CATEGORIES.find(c => c.id === selectedCategory);
                    return cat?.movements.includes(m.id);
                  })
                : MOVEMENT_SEQUENCES
              ).map(movement => {
                const isActive = animationState.currentMovement === movement.id;
                return (
                  <button
                    key={movement.id}
                    onClick={() => handleSelectMovement(movement)}
                    className={`text-left p-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border border-cyan-500/50 ring-1 ring-cyan-500/30'
                        : 'bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700/80 hover:border-gray-600'
                    }`}
                  >
                    <div className={`text-xs font-medium ${isActive ? 'text-cyan-300' : 'text-gray-200'}`}>
                      {movement.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                      {movement.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 min-w-0 flex-1"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                currentMovement && animationState.isPlaying ? 'bg-emerald-500/20' : 'bg-cyan-500/20'
              }`}>
                <Activity className={`w-4 h-4 ${
                  currentMovement && animationState.isPlaying ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'
                }`} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-xs font-medium text-gray-200 truncate">
                  {currentMovement ? currentMovement.name : 'Movement Player'}
                </div>
                <div className="text-[10px] text-gray-500">
                  {currentMovement
                    ? animationState.isPlaying
                      ? `Playing at ${animationState.speed}x`
                      : 'Paused'
                    : 'Select a movement to animate'}
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </button>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {currentMovement && currentRestrictions.length > 0 && (
                <button
                  onClick={() => setShowRestrictions(!showRestrictions)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    showRestrictions
                      ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                  }`}
                  title="Joint Restrictions"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handlePlayPause}
                disabled={!animationState.currentMovement}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  animationState.currentMovement
                    ? animationState.isPlaying
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {animationState.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <button
                onClick={handleStop}
                disabled={!animationState.currentMovement}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  animationState.currentMovement
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {animationState.currentMovement && (
            <div className="mt-2.5">
              <div className="flex items-center gap-2">
                <Gauge className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <span className="text-[10px] text-gray-500 flex-shrink-0">Speed</span>
                <div className="flex items-center gap-1 flex-1">
                  {speedPresets.map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        animationState.speed === speed
                          ? 'bg-cyan-500/30 text-cyan-300'
                          : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showRestrictions && currentRestrictions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">Joint Restrictions</span>
              </div>
              <div className="space-y-2.5">
                {currentRestrictions.map(restriction => {
                  const key = `${restriction.joint}:${restriction.movement}`;
                  const currentValue = restrictions[key] ?? restriction.defaultMaxROM;
                  const isRestricted = currentValue < restriction.defaultMaxROM;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-medium ${isRestricted ? 'text-amber-300' : 'text-gray-400'}`}>
                          {restriction.label}
                        </span>
                        <span className={`text-[10px] font-mono ${isRestricted ? 'text-amber-400' : 'text-gray-500'}`}>
                          {Math.round(currentValue)}/{restriction.defaultMaxROM}°
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min={0}
                          max={restriction.defaultMaxROM}
                          step={1}
                          value={currentValue}
                          onChange={(e) => handleRestrictionChange(key, Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, ${isRestricted ? '#f59e0b' : '#06b6d4'} 0%, ${isRestricted ? '#f59e0b' : '#06b6d4'} ${(currentValue / restriction.defaultMaxROM) * 100}%, #374151 ${(currentValue / restriction.defaultMaxROM) * 100}%, #374151 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setRestrictions({})}
                className="mt-2 w-full py-1 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all"
              >
                Reset All
              </button>

              {compensationResult && (compensationResult.patterns.length > 0 || compensationResult.clinicalWarnings.length > 0 || compensationResult.postureNotes.length > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Consequences</span>
                    <span className="ml-auto text-[9px] text-gray-500 font-mono">{compensationResult.patterns.length} compensation{compensationResult.patterns.length !== 1 ? 's' : ''}</span>
                  </div>

                  {compensationResult.postureNotes.length > 0 && (
                    <div className="mb-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <PersonStanding className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-medium text-blue-300">Posture Influence</span>
                      </div>
                      <div className="space-y-1">
                        {compensationResult.postureNotes.map((note, i) => (
                          <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1.5">
                            <span className="text-[9px] text-blue-300">{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {compensationResult.patterns.length > 0 && (
                    <div className="mb-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-medium text-amber-300">Active Compensations</span>
                      </div>
                      <div className="space-y-1.5">
                        {compensationResult.patterns.map((p, i) => (
                          <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-[10px] text-amber-300 font-medium">
                              <span>{formatJoint(p.compensatingJoint)}</span>
                              <span className="text-amber-500/60">compensating for</span>
                              <span className="text-amber-400/80">{formatJoint(p.sourceJoint)}</span>
                            </div>
                            <div className="text-[9px] text-gray-400 mt-0.5">{p.clinicalNote}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-mono ${p.additionalLoad > 30 ? 'text-red-400' : 'text-amber-400'}`}>+{Math.round(p.additionalLoad)}% load</span>
                              <span className="text-[9px] text-gray-600">|</span>
                              <span className="text-[9px] text-amber-500/80 font-mono">{Math.round(p.compensationRatio * 100)}% ratio</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {compensationResult.overloadedStructures.length > 0 && (
                    <div className="mb-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bone className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] font-medium text-red-300">At-Risk Structures</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {compensationResult.overloadedStructures.map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-[9px] text-red-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {compensationResult.clinicalWarnings.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] font-medium text-red-300">Clinical Warnings</span>
                      </div>
                      <div className="space-y-1">
                        {compensationResult.clinicalWarnings.map((w, i) => (
                          <div key={i} className={`rounded-lg px-2 py-1.5 ${
                            w.severity === 'severe'
                              ? 'bg-red-500/10 border border-red-500/20'
                              : 'bg-amber-500/10 border border-amber-500/20'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                w.severity === 'severe' ? 'bg-red-400' : 'bg-amber-400'
                              }`} />
                              <span className={`text-[9px] ${
                                w.severity === 'severe' ? 'text-red-300' : 'text-amber-300'
                              }`}>{w.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatJoint(joint: string): string {
  return joint.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
