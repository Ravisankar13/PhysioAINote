import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Zap, Shield, RotateCcw, Crosshair } from 'lucide-react';
import type { TreatmentPriorityResult, TreatmentTarget, TreatmentAction, EvidenceGrade } from '@/lib/treatmentPriorityEngine';
import { MUSCLE_BONE_POSITIONS } from '@/lib/myofascialChains';

export interface BoneScreenPosition {
  boneName: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

interface TreatmentOverlayProps {
  treatmentPriorities: TreatmentPriorityResult;
  boneScreenPositions: BoneScreenPosition[];
  containerWidth: number;
  containerHeight: number;
  visible: boolean;
}

const ACTION_ICON_MAP: Record<TreatmentAction, typeof Dumbbell> = {
  release: RotateCcw,
  stretch: Zap,
  strengthen: Dumbbell,
  activate: Zap,
  mobilize: Crosshair,
  stabilize: Shield,
};

const ACTION_STYLE: Record<TreatmentAction, { color: string; bg: string; border: string; glow: string }> = {
  release: { color: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-500/40', glow: 'rgba(244,63,94,0.4)' },
  stretch: { color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/40', glow: 'rgba(245,158,11,0.4)' },
  strengthen: { color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', glow: 'rgba(16,185,129,0.4)' },
  activate: { color: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', glow: 'rgba(6,182,212,0.4)' },
  mobilize: { color: 'text-violet-300', bg: 'bg-violet-500/20', border: 'border-violet-500/40', glow: 'rgba(139,92,246,0.4)' },
  stabilize: { color: 'text-blue-300', bg: 'bg-blue-500/20', border: 'border-blue-500/40', glow: 'rgba(59,130,246,0.4)' },
};

const EVIDENCE_COLORS: Record<EvidenceGrade, string> = {
  A: 'bg-green-500/20 text-green-300',
  B: 'bg-blue-500/20 text-blue-300',
  C: 'bg-yellow-500/20 text-yellow-300',
  Expert: 'bg-purple-500/20 text-purple-300',
};

const EXTENDED_BONE_MAP: Record<string, string> = {
  ...MUSCLE_BONE_POSITIONS,
  upper_trap_l: 'Shoulder_L', upper_trap_r: 'Shoulder_R',
  lower_trap_l: 'Scapula_L', lower_trap_r: 'Scapula_R',
  pec_major_l: 'Chest_M', pec_major_r: 'Chest_M',
  pec_minor_l: 'Chest_M', pec_minor_r: 'Chest_M',
  lat_l: 'Spine1_M', lat_r: 'Spine1_M',
  erector_spinae: 'Spine1_M', erector_spinae_l: 'Spine1_M', erector_spinae_r: 'Spine1_M',
  multifidus: 'RootPart1_M', multifidus_l: 'RootPart1_M', multifidus_r: 'RootPart1_M',
  transverse_abdominis: 'RootPart1_M',
  rectus_abdominis: 'Chest_M',
  obliques: 'RootPart1_M', obliques_l: 'RootPart1_M', obliques_r: 'RootPart1_M',
  iliopsoas_l: 'Hip_L', iliopsoas_r: 'Hip_R',
  hip_flexor_l: 'Hip_L', hip_flexor_r: 'Hip_R',
  rectus_femoris_l: 'HipPart2_L', rectus_femoris_r: 'HipPart2_R',
  hamstring_l: 'Knee_L', hamstring_r: 'Knee_R',
  adductor_l: 'Hip_L', adductor_r: 'Hip_R',
  tfl_l: 'Hip_L', tfl_r: 'Hip_R',
  piriformis_l: 'Hip_L', piriformis_r: 'Hip_R',
  soleus_l: 'Ankle_L', soleus_r: 'Ankle_R',
  gastrocnemius_l: 'Knee_L', gastrocnemius_r: 'Knee_R',
  tibialis_anterior_l: 'Ankle_L', tibialis_anterior_r: 'Ankle_R',
  peroneus_l: 'Ankle_L', peroneus_r: 'Ankle_R',
  rotator_cuff_l: 'Shoulder_L', rotator_cuff_r: 'Shoulder_R',
  infraspinatus_l: 'Shoulder_L', infraspinatus_r: 'Shoulder_R',
  supraspinatus_l: 'Shoulder_L', supraspinatus_r: 'Shoulder_R',
  subscapularis_l: 'Scapula_L', subscapularis_r: 'Scapula_R',
  teres_minor_l: 'Scapula_L', teres_minor_r: 'Scapula_R',
  serratus_anterior_l: 'Scapula_L', serratus_anterior_r: 'Scapula_R',
  rhomboid_l: 'Scapula_L', rhomboid_r: 'Scapula_R',
  levator_scapulae_l: 'Neck_M', levator_scapulae_r: 'Neck_M',
  scm_l: 'Neck_M', scm_r: 'Neck_M',
  deep_neck_flexors: 'Neck_M',
  tricep_l: 'Elbow_L', tricep_r: 'Elbow_R',
  wrist_flexor_l: 'Elbow_L', wrist_flexor_r: 'Elbow_R',
  wrist_extensor_l: 'Elbow_L', wrist_extensor_r: 'Elbow_R',
  glute_med_l: 'Hip_L', glute_med_r: 'Hip_R',
  glute_min_l: 'Hip_L', glute_min_r: 'Hip_R',
};

export function resolveBoneName(targetId: string): string {
  const normalized = targetId.toLowerCase().replace(/\s+/g, '_');
  const direct = EXTENDED_BONE_MAP[normalized];
  if (direct) return direct;

  for (const [key, bone] of Object.entries(EXTENDED_BONE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return bone;
    }
  }

  const words = normalized.split('_');
  for (const [key, bone] of Object.entries(EXTENDED_BONE_MAP)) {
    if (words.some(w => key.includes(w) && w.length > 2)) {
      return bone;
    }
  }

  return 'Spine1_M';
}

export function getRequiredBoneNames(targets: TreatmentTarget[]): string[] {
  const boneSet = new Set<string>();
  for (const target of targets) {
    if (target.clinicalStatus === 'normal') continue;
    boneSet.add(resolveBoneName(target.targetId));
  }
  return Array.from(boneSet);
}

interface PositionedBubble {
  target: TreatmentTarget;
  anchorX: number;
  anchorY: number;
  bubbleX: number;
  bubbleY: number;
}

const BUBBLE_COLLAPSED_W = 160;
const BUBBLE_COLLAPSED_H = 50;
const BUBBLE_EXPANDED_W = 280;
const BUBBLE_EXPANDED_H = 200;
const COLLISION_PADDING = 8;

function resolveCollisions(
  bubbles: PositionedBubble[],
  containerW: number,
  containerH: number,
  expandedTargetId: string | null
): PositionedBubble[] {
  if (bubbles.length <= 1) return bubbles;

  const resolved = bubbles.map(b => ({ ...b }));

  function getDims(b: PositionedBubble): { w: number; h: number } {
    const isExpanded = b.target.targetId === expandedTargetId;
    return {
      w: isExpanded ? BUBBLE_EXPANDED_W : BUBBLE_COLLAPSED_W,
      h: isExpanded ? BUBBLE_EXPANDED_H : BUBBLE_COLLAPSED_H,
    };
  }

  for (let iter = 0; iter < 12; iter++) {
    let moved = false;
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i];
        const b = resolved[j];
        const aDims = getDims(a);
        const bDims = getDims(b);
        const dx = b.bubbleX - a.bubbleX;
        const dy = b.bubbleY - a.bubbleY;
        const reqX = (aDims.w + bDims.w) / 2 + COLLISION_PADDING;
        const reqY = (aDims.h + bDims.h) / 2 + COLLISION_PADDING;
        const overlapX = reqX - Math.abs(dx);
        const overlapY = reqY - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          moved = true;
          if (overlapY < overlapX) {
            const shift = (overlapY / 2) + 2;
            if (dy >= 0) { a.bubbleY -= shift; b.bubbleY += shift; }
            else { a.bubbleY += shift; b.bubbleY -= shift; }
          } else {
            const shift = (overlapX / 2) + 2;
            if (dx >= 0) { a.bubbleX -= shift; b.bubbleX += shift; }
            else { a.bubbleX += shift; b.bubbleX -= shift; }
          }
        }
      }
    }
    if (!moved) break;
  }

  for (const b of resolved) {
    const dims = getDims(b);
    b.bubbleX = Math.max(5, Math.min(containerW - dims.w - 5, b.bubbleX));
    b.bubbleY = Math.max(5, Math.min(containerH - dims.h - 5, b.bubbleY));
  }

  return resolved;
}

function TreatmentBubble({ bubble, expanded, onToggle, refreshing }: {
  bubble: PositionedBubble;
  expanded: boolean;
  onToggle: () => void;
  refreshing: boolean;
}) {
  const { target, anchorX, anchorY, bubbleX, bubbleY } = bubble;
  const style = ACTION_STYLE[target.treatmentAction] || ACTION_STYLE.stabilize;
  const Icon = ACTION_ICON_MAP[target.treatmentAction] || Shield;
  const [animating, setAnimating] = useState(true);
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
  const showExpanded = expanded || (!isTouch && hovered);

  useEffect(() => {
    const t = setTimeout(() => setAnimating(false), 400);
    return () => clearTimeout(t);
  }, []);

  const handleMouseEnter = () => {
    if (isTouch) return;
    hoverTimerRef.current = setTimeout(() => setHovered(true), 200);
  };
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(false);
  };

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ overflow: 'visible' }}
      >
        <line
          x1={anchorX} y1={anchorY}
          x2={bubbleX + 80} y2={bubbleY + 20}
          stroke={style.glow} strokeWidth={1.5}
          strokeDasharray="4 3" opacity={0.7}
        />
        <circle cx={anchorX} cy={anchorY} r={4} fill={style.glow} opacity={0.9} />
      </svg>
      <div
        className={`absolute z-10 transition-all duration-300 ${animating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'} ${refreshing ? 'animate-pulse' : ''}`}
        style={{ left: bubbleX, top: bubbleY, width: showExpanded ? 260 : 'auto', maxWidth: 280 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${style.bg} border ${style.border} backdrop-blur-md shadow-lg hover:shadow-xl transition-all cursor-pointer group`}
          style={{ boxShadow: `0 0 12px ${style.glow}` }}
        >
          <Icon className={`h-3.5 w-3.5 ${style.color} flex-shrink-0`} />
          <div className="flex flex-col items-start min-w-0">
            <span className={`text-[10px] font-bold ${style.color} leading-none`}>{target.actionLabel}</span>
            <span className="text-[9px] text-gray-300 leading-none mt-0.5 truncate max-w-[120px]">{target.targetName}</span>
          </div>
          {target.isRootCause && (
            <span className="text-[7px] bg-red-500/30 text-red-300 px-1 py-0.5 rounded font-bold leading-none flex-shrink-0">ROOT</span>
          )}
          {showExpanded ? <ChevronUp className="h-3 w-3 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>

        {showExpanded && (
          <div className="mt-1 bg-gray-900/95 backdrop-blur-xl rounded-lg border border-gray-700/50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="px-3 py-2 border-b border-gray-700/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white">{target.targetName}</span>
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
                  target.clinicalStatus === 'shortened' ? 'bg-amber-500/20 text-amber-300' :
                  target.clinicalStatus === 'overactive' ? 'bg-rose-500/20 text-rose-300' :
                  target.clinicalStatus === 'inhibited' ? 'bg-cyan-500/20 text-cyan-300' :
                  target.clinicalStatus === 'weak' ? 'bg-emerald-500/20 text-emerald-300' :
                  target.clinicalStatus === 'spasm' ? 'bg-red-500/20 text-red-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {target.clinicalStatus}
                </span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">{target.rationale}</p>
            </div>
            <div className="px-3 py-2 max-h-[280px] overflow-y-auto">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Techniques</span>
              <div className="mt-1.5 space-y-1.5">
                {target.techniques.map((tech, i) => (
                  <div key={i} className="bg-white/5 rounded-md px-2 py-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white font-medium leading-tight">{tech.name}</span>
                      <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full flex-shrink-0 ${EVIDENCE_COLORS[tech.evidenceGrade]}`}>
                        {tech.evidenceGrade}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">{tech.dosage}</p>
                    <p className="text-[8px] text-gray-500 mt-0.5 italic">{tech.rationale}</p>
                  </div>
                ))}
              </div>
              {target.contraindications.length > 0 && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1.5">
                  <span className="text-[9px] text-red-400 font-medium">Contraindications</span>
                  {target.contraindications.map((c, i) => (
                    <p key={i} className="text-[8px] text-red-300/80 mt-0.5">{c.flag}: {c.reason}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function TreatmentOverlay({
  treatmentPriorities,
  boneScreenPositions,
  containerWidth,
  containerHeight,
  visible,
}: TreatmentOverlayProps) {
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const prevTargetSignatureRef = useRef('');

  useEffect(() => {
    const sig = treatmentPriorities.targets
      .map(t => `${t.targetId}:${t.treatmentAction}:${t.clinicalStatus}`)
      .sort()
      .join('|');
    if (prevTargetSignatureRef.current && sig !== prevTargetSignatureRef.current) {
      const prevEntries = new Map(
        prevTargetSignatureRef.current.split('|').filter(Boolean).map(s => {
          const id = s.split(':')[0];
          return [id, s] as [string, string];
        })
      );
      const changed = new Set<string>();
      for (const t of treatmentPriorities.targets) {
        const prevEntry = prevEntries.get(t.targetId);
        if (!prevEntry || prevEntry !== `${t.targetId}:${t.treatmentAction}:${t.clinicalStatus}`) {
          changed.add(t.targetId);
        }
      }
      if (changed.size > 0) {
        setRefreshingIds(changed);
        const timer = setTimeout(() => setRefreshingIds(new Set()), 1200);
        prevTargetSignatureRef.current = sig;
        return () => clearTimeout(timer);
      }
    }
    prevTargetSignatureRef.current = sig;
  }, [treatmentPriorities.targets]);

  const boneMap = useMemo(() => {
    const map = new Map<string, BoneScreenPosition>();
    for (const bp of boneScreenPositions) {
      map.set(bp.boneName, bp);
    }
    return map;
  }, [boneScreenPositions]);

  const positionedBubbles = useMemo((): PositionedBubble[] => {
    if (!visible || containerWidth === 0 || containerHeight === 0) return [];

    const raw: PositionedBubble[] = [];

    for (const target of treatmentPriorities.targets) {
      if (target.clinicalStatus === 'normal') continue;

      const boneName = resolveBoneName(target.targetId);
      const bonePos = boneMap.get(boneName);
      if (!bonePos || !bonePos.visible) continue;

      const offsetX = bonePos.screenX > containerWidth / 2 ? 60 : -170;

      raw.push({
        target,
        anchorX: bonePos.screenX,
        anchorY: bonePos.screenY,
        bubbleX: bonePos.screenX + offsetX,
        bubbleY: bonePos.screenY - 20,
      });
    }

    return resolveCollisions(raw, containerWidth, containerHeight, expandedTarget);
  }, [treatmentPriorities.targets, boneMap, containerWidth, containerHeight, visible, expandedTarget]);

  if (!visible || positionedBubbles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-15" style={{ width: containerWidth, height: containerHeight }}>
      {positionedBubbles.map((bubble) => (
        <div key={bubble.target.targetId} className="pointer-events-auto">
          <TreatmentBubble
            bubble={bubble}
            expanded={expandedTarget === bubble.target.targetId}
            onToggle={() => setExpandedTarget(prev => prev === bubble.target.targetId ? null : bubble.target.targetId)}
            refreshing={refreshingIds.has(bubble.target.targetId)}
          />
        </div>
      ))}
    </div>
  );
}

const POSITION_THRESHOLD = 2;

function positionsChanged(prev: BoneScreenPosition[], next: BoneScreenPosition[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (p.boneName !== n.boneName || p.visible !== n.visible) return true;
    if (Math.abs(p.screenX - n.screenX) > POSITION_THRESHOLD || Math.abs(p.screenY - n.screenY) > POSITION_THRESHOLD) return true;
  }
  return false;
}

interface TreatmentOverlayBridgeProps {
  treatmentPriorities: TreatmentPriorityResult;
  containerWidth: number;
  containerHeight: number;
  visible: boolean;
  positionsRef: React.MutableRefObject<BoneScreenPosition[]>;
}

export const TreatmentOverlayBridge = memo(function TreatmentOverlayBridge({
  treatmentPriorities,
  containerWidth,
  containerHeight,
  visible,
  positionsRef,
}: TreatmentOverlayBridgeProps) {
  const [positions, setPositions] = useState<BoneScreenPosition[]>([]);
  const prevPositionsRef = useRef<BoneScreenPosition[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      const incoming = positionsRef.current;
      if (positionsChanged(prevPositionsRef.current, incoming)) {
        prevPositionsRef.current = incoming;
        setPositions([...incoming]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, positionsRef]);

  return (
    <TreatmentOverlay
      treatmentPriorities={treatmentPriorities}
      boneScreenPositions={positions}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      visible={visible}
    />
  );
});
