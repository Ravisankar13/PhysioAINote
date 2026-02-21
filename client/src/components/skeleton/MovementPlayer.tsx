import { useState, useCallback } from 'react';
import { Play, Pause, Square, Repeat, ChevronDown, ChevronUp, Activity, Gauge } from 'lucide-react';
import { MOVEMENT_SEQUENCES, MOVEMENT_CATEGORIES, type MovementSequence } from '@/lib/movementSequences';
import type { AnimationState } from './PureThreeGLBViewer';

interface MovementPlayerProps {
  animationState: AnimationState;
  onAnimationStateChange: (state: AnimationState) => void;
}

export default function MovementPlayer({ animationState, onAnimationStateChange }: MovementPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentMovement = animationState.currentMovement
    ? MOVEMENT_SEQUENCES.find(m => m.id === animationState.currentMovement)
    : null;

  const handleSelectMovement = useCallback((movement: MovementSequence) => {
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

  const speedPresets = [0.25, 0.5, 1, 1.5, 2];

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden pointer-events-auto max-w-lg mx-auto">
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

            <div className="grid grid-cols-2 gap-2">
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
        </div>
      </div>
    </div>
  );
}
