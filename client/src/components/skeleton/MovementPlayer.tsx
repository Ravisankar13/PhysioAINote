import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Square, ChevronDown, ChevronUp, Activity, Gauge, GripVertical, SlidersHorizontal, AlertTriangle, Bone, ArrowRight, PersonStanding, Zap, TrendingUp } from 'lucide-react';
import { MOVEMENT_SEQUENCES, MOVEMENT_CATEGORIES, MOVEMENT_RESTRICTIONS, type MovementSequence } from '@/lib/movementSequences';
import { calculateCompensations, computePostureDeviations, NORMAL_ROM, getClinicalConsequences, type JointConstraint, type ClinicalWarning, type CompensationResult, type ClinicalConsequence } from '@/lib/jointConstraints';
import { getMovementBiomechanics, computeRestrictionOverloads, type BiomechanicsSnapshot } from '@/lib/movementBiomechanics';
import type { MuscleRestrictionEffect } from '@/lib/bidirectionalMuscleJoint';
import type { AnimationState, AnimationConstraint } from './PureThreeGLBViewer';

type PostureConfig = Record<string, Record<string, number | undefined> | undefined>;

function mapMovement(m: string): string {
  const movementMap: Record<string, string> = {
    'lateralFlexion': 'lateral_flexion',
    'internalRotation': 'internal_rotation',
    'externalRotation': 'external_rotation',
  };
  return movementMap[m] || m;
}

function mapToCompensationNames(animJoint: string, animMovement: string): { joint: string; movement: string } {
  if (animJoint === 'neck') {
    return { joint: 'cervical_spine', movement: mapMovement(animMovement) };
  }
  if (animJoint === 'spine') {
    if (animMovement === 'thoracicRotation') return { joint: 'thoracic_spine', movement: 'rotation' };
    if (animMovement === 'lumbarRotation') return { joint: 'lumbar_spine', movement: 'rotation' };
    if (animMovement === 'lateralFlexion') return { joint: 'thoracic_spine', movement: 'lateral_flexion' };
    if (animMovement === 'flexion') return { joint: 'lumbar_spine', movement: 'flexion' };
    if (animMovement === 'extension') return { joint: 'lumbar_spine', movement: 'extension' };
    return { joint: 'thoracic_spine', movement: mapMovement(animMovement) };
  }
  const jointMap: Record<string, string> = {
    'leftHip': 'left_hip', 'rightHip': 'right_hip',
    'leftKnee': 'left_knee', 'rightKnee': 'right_knee',
    'leftAnkle': 'left_ankle', 'rightAnkle': 'right_ankle',
    'leftShoulder': 'left_shoulder', 'rightShoulder': 'right_shoulder',
    'leftElbow': 'left_elbow', 'rightElbow': 'right_elbow',
    'leftScapula': 'left_scapula', 'rightScapula': 'right_scapula',
  };
  return { joint: jointMap[animJoint] || animJoint, movement: mapMovement(animMovement) };
}

interface MovementPlayerProps {
  animationState: AnimationState;
  onAnimationStateChange: (state: AnimationState) => void;
  onConstraintsChange?: (constraints: AnimationConstraint[]) => void;
  onCompensationChange?: (result: CompensationResult | null, movementName: string | null, restrictions: Record<string, number>) => void;
  modelConfig?: PostureConfig;
  muscleRestrictionEffects?: MuscleRestrictionEffect[];
}

export default function MovementPlayer({ animationState, onAnimationStateChange, onConstraintsChange, onCompensationChange, modelConfig, muscleRestrictionEffects }: MovementPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [showBiomechanics, setShowBiomechanics] = useState(false);
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

  const effectiveRestrictions = useMemo(() => {
    if (!muscleRestrictionEffects || muscleRestrictionEffects.length === 0) return restrictions;
    if (!animationState.currentMovement) return restrictions;
    const defs = MOVEMENT_RESTRICTIONS[animationState.currentMovement] || [];
    const merged = { ...restrictions };
    for (const effect of muscleRestrictionEffects) {
      const matchingDef = defs.find(d => d.joint === effect.joint && d.movement === effect.movement);
      if (!matchingDef) continue;
      const key = `${effect.joint}:${effect.movement}`;
      const muscleMaxROM = Math.round(matchingDef.defaultMaxROM * (1 - effect.restrictionPercent / 100));
      const currentMax = merged[key];
      if (currentMax === undefined || muscleMaxROM < currentMax) {
        merged[key] = muscleMaxROM;
      }
    }
    return merged;
  }, [restrictions, muscleRestrictionEffects, animationState.currentMovement]);

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
      const maxROM = effectiveRestrictions[key];
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
  }, [effectiveRestrictions, animationState.currentMovement, onConstraintsChange]);

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
      const maxROM = effectiveRestrictions[key];
      if (maxROM !== undefined && maxROM < def.defaultMaxROM) {
        const mapped = mapToCompensationNames(def.joint, def.movement);
        const normalROM = NORMAL_ROM[mapped.joint as keyof typeof NORMAL_ROM]?.[mapped.movement] || def.defaultMaxROM;
        jointConstraints.push({
          id: key,
          joint: mapped.joint as any,
          movement: mapped.movement as any,
          maxROM,
          normalROM,
          reason: 'stiffness',
          isActive: true,
        });
      }
    });
    if (jointConstraints.length === 0) return null;
    return calculateCompensations(jointConstraints, postureContext);
  }, [effectiveRestrictions, animationState.currentMovement, postureContext]);

  useEffect(() => {
    if (!onCompensationChange) return;
    const movementName = currentMovement?.name || null;
    onCompensationChange(compensationResult, movementName, effectiveRestrictions);
  }, [compensationResult, currentMovement, effectiveRestrictions, onCompensationChange]);

  const restrictionOverloads = useMemo(() => {
    if (!compensationResult || compensationResult.patterns.length === 0) return undefined;
    return computeRestrictionOverloads(compensationResult.patterns);
  }, [compensationResult]);

  const biomechanicsSnapshot = useMemo(() => {
    if (!animationState.currentMovement) return null;
    return getMovementBiomechanics(animationState.currentMovement, animationState.progress, restrictionOverloads);
  }, [animationState.currentMovement, animationState.progress, restrictionOverloads]);

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
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
        <div
          className="flex items-center justify-center gap-1 py-1 cursor-grab active:cursor-grabbing bg-gray-800/50 border-b border-gray-700/30 select-none flex-shrink-0"
          onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }}
          onTouchStart={(e) => { if (e.touches.length === 1) handleDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
        >
          <GripVertical className="w-3 h-3 text-gray-600" />
          <span className="text-[9px] text-gray-600 uppercase tracking-wider font-medium">Drag to move</span>
          <GripVertical className="w-3 h-3 text-gray-600" />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
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
              {currentMovement && (
                <button
                  onClick={() => setShowBiomechanics(!showBiomechanics)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    showBiomechanics
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                  }`}
                  title="Real-Time Biomechanics"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
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

          {animationState.currentMovement && animationState.isPlaying && muscleRestrictionEffects && muscleRestrictionEffects.length > 0 && (
            <div className="mt-2.5 px-2 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-orange-300">Pathology Compensation Active</span>
                <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full ml-auto font-mono">
                  {muscleRestrictionEffects.length} {muscleRestrictionEffects.length === 1 ? 'joint' : 'joints'}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {muscleRestrictionEffects.slice(0, 4).map((effect, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400/60 flex-shrink-0" />
                    <span className="text-orange-200/80 truncate">
                      {effect.joint.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — {effect.movement.replace(/([A-Z])/g, ' $1').trim()} restricted {effect.restrictionPercent}%
                    </span>
                  </div>
                ))}
                {muscleRestrictionEffects.length > 4 && (
                  <div className="text-[9px] text-orange-400/60 pl-3">+{muscleRestrictionEffects.length - 4} more</div>
                )}
              </div>
            </div>
          )}

          {showBiomechanics && biomechanicsSnapshot && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Live Biomechanics</span>
                </div>
                <span className="text-[9px] text-emerald-500/70 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">{biomechanicsSnapshot.phase}</span>
              </div>

              <div className="mb-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] font-medium text-cyan-300">Joint Forces</span>
                  <span className="text-[9px] text-gray-600 ml-auto">% body weight</span>
                </div>
                <div className="space-y-1.5">
                  {biomechanicsSnapshot.forces.map((f, i) => {
                    const isHigh = f.forcePercent > 70;
                    const isMod = f.forcePercent > 45;
                    const overloaded = restrictionOverloads && restrictionOverloads[f.joint];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[10px] font-medium ${overloaded ? 'text-red-300' : isHigh ? 'text-amber-300' : 'text-gray-400'}`}>
                            {f.label}
                            {overloaded ? <span className="text-red-400 text-[8px] ml-1">(+{Math.round(overloaded)}%)</span> : null}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono ${overloaded ? 'text-red-400' : isHigh ? 'text-amber-400' : isMod ? 'text-cyan-400' : 'text-gray-500'}`}>
                              {f.forcePercent}%
                            </span>
                            <span className="text-[8px] text-gray-600 italic">{f.direction}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-150 ${
                              overloaded ? 'bg-gradient-to-r from-red-500 to-red-400' :
                              isHigh ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                              isMod ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' :
                              'bg-gradient-to-r from-emerald-600 to-emerald-500'
                            }`}
                            style={{ width: `${Math.min(f.forcePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Activity className="w-3 h-3 text-violet-400" />
                  <span className="text-[10px] font-medium text-violet-300">Muscle Activation</span>
                </div>
                <div className="space-y-1.5">
                  {biomechanicsSnapshot.muscles.map((m, i) => {
                    const roleColors: Record<string, string> = {
                      agonist: 'text-emerald-400',
                      antagonist: 'text-blue-400',
                      stabilizer: 'text-violet-400',
                      synergist: 'text-cyan-400',
                    };
                    const barColors: Record<string, string> = {
                      agonist: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
                      antagonist: 'bg-gradient-to-r from-blue-600 to-blue-400',
                      stabilizer: 'bg-gradient-to-r from-violet-600 to-violet-400',
                      synergist: 'bg-gradient-to-r from-cyan-600 to-cyan-400',
                    };
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-gray-400">{m.muscle}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono ${roleColors[m.role] || 'text-gray-500'}`}>
                              {m.activationPercent}%
                            </span>
                            <span className={`text-[8px] italic ${roleColors[m.role] || 'text-gray-600'}`}>{m.role}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-150 ${barColors[m.role] || 'bg-gray-600'}`}
                            style={{ width: `${Math.min(m.activationPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                  const muscleEffect = muscleRestrictionEffects?.find(e => e.joint === restriction.joint && e.movement === restriction.movement);
                  const effectiveValue = effectiveRestrictions[key] ?? restriction.defaultMaxROM;
                  const isRestricted = effectiveValue < restriction.defaultMaxROM;
                  const isMuscleRestricted = muscleEffect && muscleEffect.restrictionPercent >= 10;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-medium ${isMuscleRestricted ? 'text-purple-300' : isRestricted ? 'text-amber-300' : 'text-gray-400'}`}>
                          {restriction.label}
                          {isMuscleRestricted && (
                            <span className="ml-1 text-[8px] text-purple-400 bg-purple-500/15 px-1 py-0.5 rounded">MUSCLE</span>
                          )}
                        </span>
                        <span className={`text-[10px] font-mono ${isMuscleRestricted ? 'text-purple-400' : isRestricted ? 'text-amber-400' : 'text-gray-500'}`}>
                          {Math.round(effectiveValue)}/{restriction.defaultMaxROM}°
                        </span>
                      </div>
                      {isMuscleRestricted && (
                        <div className="text-[8px] text-purple-400/70 mb-1 italic">{muscleEffect.reason}</div>
                      )}
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
                            background: `linear-gradient(to right, ${isMuscleRestricted ? '#a855f7' : isRestricted ? '#f59e0b' : '#06b6d4'} 0%, ${isMuscleRestricted ? '#a855f7' : isRestricted ? '#f59e0b' : '#06b6d4'} ${(effectiveValue / restriction.defaultMaxROM) * 100}%, #374151 ${(effectiveValue / restriction.defaultMaxROM) * 100}%, #374151 100%)`,
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
                        {compensationResult.patterns.map((p, i) => {
                          const consequences = getClinicalConsequences(p.compensatingJoint, p.compensatingMovement);
                          return (
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
                              {consequences.length > 0 && (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-700/40">
                                  <div className="text-[9px] text-gray-500 mb-1 font-medium uppercase tracking-wider">Clinical Risks</div>
                                  <div className="space-y-1">
                                    {consequences.map((c, ci) => (
                                      <div key={ci} className={`flex items-start gap-1.5 rounded px-1.5 py-1 ${
                                        c.severity === 'severe' 
                                          ? 'bg-red-500/10 border border-red-500/15' 
                                          : 'bg-yellow-500/10 border border-yellow-500/15'
                                      }`}>
                                        <div className={`w-1 h-1 rounded-full mt-1 flex-shrink-0 ${
                                          c.severity === 'severe' ? 'bg-red-400' : 'bg-yellow-400'
                                        }`} />
                                        <div>
                                          <span className={`text-[9px] font-medium ${
                                            c.severity === 'severe' ? 'text-red-300' : 'text-yellow-300'
                                          }`}>{c.condition}</span>
                                          <span className="text-[8px] text-gray-500 ml-1">— {c.mechanism}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
    </div>
  );
}

function formatJoint(joint: string): string {
  return joint.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
