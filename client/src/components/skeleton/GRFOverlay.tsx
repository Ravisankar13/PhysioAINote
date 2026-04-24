import { useEffect, useState } from 'react';
import { forceTimeBuffer } from '@/lib/forceTimeBuffer';
import { computeGRF, formatNewtons } from '@/lib/grfVector';

export interface BoneScreenPosition {
  boneName: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface GRFOverlayProps {
  /** Latest known foot screen positions, supplied by the 3D viewer. */
  positions: BoneScreenPosition[];
  bodyWeightKg: number;
  /** Container size so we can size the SVG properly. */
  width: number;
  height: number;
  visible: boolean;
}

const FOOT_BONE_LEFT = ['Foot_L', 'Toes_L', 'Ankle_L'];
const FOOT_BONE_RIGHT = ['Foot_R', 'Toes_R', 'Ankle_R'];

function findFoot(positions: BoneScreenPosition[], names: string[]) {
  for (const n of names) {
    const p = positions.find(x => x.boneName === n);
    if (p && p.visible) return { x: p.screenX, y: p.screenY };
  }
  return undefined;
}

/**
 * SVG overlay that draws a live ground-reaction-force arrow from each foot.
 * The arrow grows with magnitude and turns red when the COM projection leaves
 * the patient's base of support polygon.
 */
export default function GRFOverlay({ positions, bodyWeightKg, width, height, visible }: GRFOverlayProps) {
  const [, force] = useState(0);
  useEffect(() => {
    return forceTimeBuffer.subscribe(() => force(v => v + 1));
  }, []);

  if (!visible) return null;
  const history = forceTimeBuffer.list();
  if (history.length < 2) return null;

  const leftFoot = findFoot(positions, FOOT_BONE_LEFT);
  const rightFoot = findFoot(positions, FOOT_BONE_RIGHT);
  if (!leftFoot && !rightFoot) return null;

  const grf = computeGRF({ bodyWeightKg, history, leftFoot, rightFoot });

  // Arrow length: clamp 40..200 px scaled to total Newtons (~8 BW max).
  const maxN = bodyWeightKg * 9.81 * 8;
  const len = Math.min(200, Math.max(40, (grf.magnitudeN / maxN) * 200));

  const color = grf.outsideBaseOfSupport ? '#ef4444' : '#fbbf24';
  const strokeW = grf.outsideBaseOfSupport ? 4 : 3;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-testid="grf-overlay"
    >
      <defs>
        <marker
          id="grf-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,8 L8,4 z" fill={color} />
        </marker>
      </defs>

      {/* Base of support polygon */}
      {leftFoot && rightFoot && (
        <polygon
          points={`${leftFoot.x - 18},${leftFoot.y + 6} ${leftFoot.x + 14},${leftFoot.y - 4} ${rightFoot.x - 14},${rightFoot.y - 4} ${rightFoot.x + 18},${rightFoot.y + 6}`}
          fill={grf.outsideBaseOfSupport ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.10)'}
          stroke={grf.outsideBaseOfSupport ? '#ef4444' : '#22c55e'}
          strokeWidth={1}
          strokeDasharray="4,3"
        />
      )}

      {/* COM projection point */}
      {grf.comProjScreen && (
        <circle
          cx={grf.comProjScreen.x}
          cy={grf.comProjScreen.y}
          r={4}
          fill={grf.outsideBaseOfSupport ? '#ef4444' : '#22d3ee'}
          stroke="#0f172a"
          strokeWidth={1}
        />
      )}

      {[leftFoot, rightFoot].filter(Boolean).map((foot, idx) => {
        const f = foot!;
        const tipX = f.x + grf.direction.x * len;
        const tipY = f.y + grf.direction.y * len;
        return (
          <g key={`grf-${idx}`}>
            <line
              x1={f.x}
              y1={f.y}
              x2={tipX}
              y2={tipY}
              stroke={color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              markerEnd="url(#grf-arrowhead)"
            />
          </g>
        );
      })}

      {/* Magnitude label near upper arrow */}
      {(() => {
        const anchor = leftFoot ?? rightFoot!;
        const labelX = anchor.x + grf.direction.x * (len + 6);
        const labelY = anchor.y + grf.direction.y * (len + 6);
        return (
          <g>
            <rect
              x={labelX - 30}
              y={labelY - 12}
              width={60}
              height={16}
              rx={3}
              fill="rgba(15, 23, 42, 0.85)"
              stroke={color}
              strokeWidth={1}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize={10}
              fontFamily="monospace"
              fill={color}
            >
              GRF {formatNewtons(grf.magnitudeN)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
