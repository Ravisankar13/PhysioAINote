import { useEffect, useRef, useState, useMemo } from 'react';
import type { BoneScreenPosition } from './TreatmentOverlay';
import type { SlingFailureScenario } from '@shared/schema';

interface Props {
  scenario: SlingFailureScenario;
  bonePathway: string[];
  slingColor: string;
  /** 0..1 from MovementPlayer animationState.progress */
  progress: number;
  /** Live bone screen positions ref from PureThreeGLBViewer. */
  boneScreenPositionsRef: React.MutableRefObject<BoneScreenPosition[]>;
  /** Cycle frequency hint — pulses re-trigger each cycle. */
  isPlaying: boolean;
  /** Which ghost layer the panel is currently driving on the live skeleton. */
  ghostMode?: 'actual' | 'intended' | 'compare';
}

/**
 * SVG overlay rendered absolutely over the 3D skeleton viewer. Draws:
 *  - The full sling pathway as a continuous tube (gradient stroke)
 *  - A bright tension pulse traveling along the tube
 *  - A red dim/stall band over the weak segment when progress is at the failure frame
 *  - A reroute arrow from the failed segment into the compensating tissue
 *  - A failure-frame badge with the weak muscle label
 */
export default function SlingFailureVisualizerOverlay(props: Props) {
  const { scenario, bonePathway, slingColor, progress, boneScreenPositionsRef, isPlaying, ghostMode = 'actual' } = props;

  const [, force] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      force(c => (c + 1) % 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const positions = boneScreenPositionsRef.current;
  const posMap = useMemo(() => {
    const m = new Map<string, BoneScreenPosition>();
    for (const p of positions) m.set(p.boneName, p);
    return m;
  }, [positions]);

  // Build the polyline from bone pathway → screen points (skip invisible).
  const points = bonePathway
    .map(b => posMap.get(b))
    .filter((p): p is BoneScreenPosition => !!p && p.visible);

  if (points.length < 2) return null;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.screenX.toFixed(1)} ${p.screenY.toFixed(1)}`).join(' ');

  // Pulse position along the path
  const pulseT = ((progress % 1) + 1) % 1;
  const failureT = Math.max(0, Math.min(1, scenario.failureFrame));
  const atFailure = Math.abs(pulseT - failureT) < 0.08;

  // Find pulse XY by lerping along segments by length
  const pulseXY = pointAlongPolyline(points, pulseT);
  const failureXY = pointAlongPolyline(points, failureT);

  // Weak segment: the indices of bones in scenario.weakSegmentBones that exist
  const weakIdx = scenario.weakSegmentBones
    .map(b => bonePathway.indexOf(b))
    .filter(i => i >= 0)
    .sort((a, b) => a - b);

  // Reroute target — first available bone that has a screen position
  const rerouteTargetXY = (() => {
    for (const b of scenario.rerouteTargetBones) {
      const p = posMap.get(b);
      if (p && p.visible) return { x: p.screenX, y: p.screenY };
    }
    return null;
  })();

  const gradId = `sfv-grad-${scenario.slingId}`;
  const arrowId = `sfv-arrow-${scenario.slingId}`;

  // Intended-ghost path: same polyline but offset perpendicular to the
  // failure-region tangent by ~22 px in the opposite direction of the
  // mean joint delta. Acts as a translucent "what mechanics SHOULD look
  // like" layer next to the actual skeleton, satisfying the dual-ghost
  // visual without a second 3D skinned mesh.
  const showIntendedGhost = ghostMode !== 'actual';
  const showActualLayer = ghostMode !== 'intended';
  const ghostOffset = (() => {
    if (!failureXY || points.length < 2) return null;
    // Perpendicular to the local tangent at the failure XY.
    const i = Math.max(1, Math.min(points.length - 1, Math.floor(failureT * (points.length - 1))));
    const a = points[i - 1], b = points[i];
    const dx = b.screenX - a.screenX, dy = b.screenY - a.screenY;
    const len = Math.hypot(dx, dy) || 1;
    // Perp vector (left side of tangent), magnitude scaled to ~22 px
    return { ox: (-dy / len) * 22, oy: (dx / len) * 22 };
  })();
  const ghostPathD = ghostOffset
    ? points.map((p, i) => {
        // Blend: full offset around the failure region, fading to 0 at the ends.
        const t = points.length === 1 ? 0 : i / (points.length - 1);
        const w = Math.max(0, 1 - Math.abs(t - failureT) * 2.4);
        const ox = ghostOffset.ox * w, oy = ghostOffset.oy * w;
        return `${i === 0 ? 'M' : 'L'} ${(p.screenX + ox).toFixed(1)} ${(p.screenY + oy).toFixed(1)}`;
      }).join(' ')
    : null;

  const modeBadge = ghostMode === 'intended'
    ? { label: 'INTENDED', color: '#34d399', bg: 'rgba(16,185,129,0.18)' }
    : ghostMode === 'actual'
      ? { label: 'ACTUAL', color: '#fb7185', bg: 'rgba(244,63,94,0.18)' }
      : { label: 'COMPARE', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' };

  const firstPt = points[0];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 25 }}
      data-testid={`sling-failure-overlay-${scenario.slingId}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={slingColor} stopOpacity="0.55" />
          <stop offset={`${Math.round(failureT * 100)}%`} stopColor={atFailure ? '#ef4444' : slingColor} stopOpacity={atFailure ? 0.4 : 0.7} />
          <stop offset="100%" stopColor={slingColor} stopOpacity="0.55" />
        </linearGradient>
        <marker id={arrowId} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M 0 0 L 12 6 L 0 12 z" fill="#fb7185" />
        </marker>
      </defs>

      {/* Intended-ghost layer — translucent emerald path showing where the
          sling SHOULD route if no compensation occurred. Only visible in
          'intended' or 'compare' modes. */}
      {showIntendedGhost && ghostPathD && (
        <g>
          <path
            d={ghostPathD}
            stroke="#34d399"
            strokeOpacity={0.32}
            strokeWidth={10}
            strokeDasharray="3 4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={ghostPathD}
            stroke="#34d399"
            strokeOpacity={0.85}
            strokeWidth={3}
            strokeDasharray="3 4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {showActualLayer && (
        <>
          {/* Halo / outer glow */}
          <path
            d={pathD}
            stroke={slingColor}
            strokeOpacity={0.18}
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Continuous tube */}
          <path
            d={pathD}
            stroke={`url(#${gradId})`}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Mode badge — shows which ghost layer the live skeleton is currently
          rendering. Helps the clinician interpret the dual-ghost comparison. */}
      {firstPt && (
        <g>
          <rect
            x={firstPt.screenX - 6} y={firstPt.screenY - 30}
            width={86} height={20} rx={4}
            fill={modeBadge.bg} stroke={modeBadge.color} strokeWidth={1}
          />
          <text
            x={firstPt.screenX + 37} y={firstPt.screenY - 16}
            textAnchor="middle" fontSize={10} fontWeight={700}
            fill={modeBadge.color}
            style={{ letterSpacing: '0.08em' }}
          >
            {modeBadge.label}
          </text>
        </g>
      )}

      {/* Tension pulse — bright dot traveling along the polyline */}
      {isPlaying && pulseXY && (
        <>
          <circle
            cx={pulseXY.x}
            cy={pulseXY.y}
            r={atFailure ? 6 : 9}
            fill={atFailure ? '#ef4444' : '#fef9c3'}
            opacity={atFailure ? 0.55 : 0.95}
          >
            <animate attributeName="r" values={atFailure ? "6;5;6" : "8;11;8"} dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={pulseXY.x}
            cy={pulseXY.y}
            r={18}
            fill="none"
            stroke={atFailure ? '#ef4444' : slingColor}
            strokeOpacity={0.6}
            strokeWidth={2}
          >
            <animate attributeName="r" values="14;26;14" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Failure-frame badge — pinned at the failure XY along the tube */}
      {failureXY && (
        <g>
          <circle
            cx={failureXY.x}
            cy={failureXY.y}
            r={atFailure ? 14 : 9}
            fill="#ef4444"
            opacity={atFailure ? 0.85 : 0.55}
            stroke="#fff"
            strokeWidth={2}
          />
          <text
            x={failureXY.x + 18}
            y={failureXY.y - 6}
            fill="#fecaca"
            fontSize={11}
            fontWeight={600}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            ✕ {prettyMuscle(scenario.weakSegmentMuscle)}
          </text>
          <text
            x={failureXY.x + 18}
            y={failureXY.y + 8}
            fill="#fecaca"
            fontSize={9}
            opacity={0.85}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            failure point
          </text>
        </g>
      )}

      {/* Reroute arrow — from failure point to compensating tissue */}
      {failureXY && rerouteTargetXY && (
        <g opacity={atFailure ? 0.95 : 0.55}>
          <path
            d={`M ${failureXY.x} ${failureXY.y} Q ${(failureXY.x + rerouteTargetXY.x) / 2 + 30} ${(failureXY.y + rerouteTargetXY.y) / 2 - 30} ${rerouteTargetXY.x} ${rerouteTargetXY.y}`}
            stroke="#fb7185"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            fill="none"
            markerEnd={`url(#${arrowId})`}
          >
            {atFailure && (
              <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.8s" repeatCount="indefinite" />
            )}
          </path>
          <text
            x={rerouteTargetXY.x + 8}
            y={rerouteTargetXY.y - 8}
            fill="#fb7185"
            fontSize={10}
            fontWeight={600}
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            ↳ {prettyMuscle(scenario.rerouteTargetMuscle)}
          </text>
        </g>
      )}
    </svg>
  );
}

function pointAlongPolyline(points: Array<{ screenX: number; screenY: number }>, t: number): { x: number; y: number } | null {
  if (points.length < 2) return null;
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].screenX - points[i - 1].screenX;
    const dy = points[i].screenY - points[i - 1].screenY;
    const d = Math.hypot(dx, dy);
    lengths.push(d);
    total += d;
  }
  if (total < 1) return { x: points[0].screenX, y: points[0].screenY };
  let target = total * Math.max(0, Math.min(1, t));
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const f = lengths[i] === 0 ? 0 : target / lengths[i];
      return {
        x: points[i].screenX + (points[i + 1].screenX - points[i].screenX) * f,
        y: points[i].screenY + (points[i + 1].screenY - points[i].screenY) * f,
      };
    }
    target -= lengths[i];
  }
  const last = points[points.length - 1];
  return { x: last.screenX, y: last.screenY };
}

function prettyMuscle(m: string): string {
  return m.replace(/_/g, ' ');
}
