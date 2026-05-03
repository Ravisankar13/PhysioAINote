import { useMemo } from 'react';
import type { MovementSequence, JointTimeline, JointKeyframe } from '@/lib/movementSequences';

interface Props {
  intendedSequence: MovementSequence;
  actualSequence: MovementSequence;
  progress: number;
  failureFrame: number;
  failureBone?: string;
  width?: number;
  height?: number;
}

interface Bone {
  id: string;
  parent: string | null;
  len: number;
  baseAngleDeg: number;
}

const RIG: Bone[] = [
  { id: 'pelvis', parent: null, len: 0, baseAngleDeg: 0 },
  { id: 'spine', parent: 'pelvis', len: 46, baseAngleDeg: -90 },
  { id: 'neck', parent: 'spine', len: 12, baseAngleDeg: -90 },
  { id: 'head', parent: 'neck', len: 16, baseAngleDeg: -90 },
  { id: 'shoulder_L', parent: 'spine', len: 22, baseAngleDeg: 60 },
  { id: 'elbow_L', parent: 'shoulder_L', len: 18, baseAngleDeg: 0 },
  { id: 'shoulder_R', parent: 'spine', len: 22, baseAngleDeg: 120 },
  { id: 'elbow_R', parent: 'shoulder_R', len: 18, baseAngleDeg: 0 },
  { id: 'hip_L', parent: 'pelvis', len: 28, baseAngleDeg: 80 },
  { id: 'knee_L', parent: 'hip_L', len: 26, baseAngleDeg: 0 },
  { id: 'ankle_L', parent: 'knee_L', len: 12, baseAngleDeg: 90 },
  { id: 'hip_R', parent: 'pelvis', len: 28, baseAngleDeg: 100 },
  { id: 'knee_R', parent: 'hip_R', len: 26, baseAngleDeg: 0 },
  { id: 'ankle_R', parent: 'knee_R', len: 12, baseAngleDeg: 90 },
];

function sampleKf(kfs: JointKeyframe[], t: number): number {
  if (!kfs || kfs.length === 0) return 0;
  if (kfs.length === 1) return kfs[0].value;
  if (t <= kfs[0].time) return kfs[0].value;
  if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
  for (let i = 1; i < kfs.length; i++) {
    if (t <= kfs[i].time) {
      const a = kfs[i - 1], b = kfs[i];
      const span = b.time - a.time;
      const f = span === 0 ? 0 : (t - a.time) / span;
      return a.value + (b.value - a.value) * f;
    }
  }
  return kfs[kfs.length - 1].value;
}

function buildJointMap(seq: MovementSequence, t: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tl of seq.joints as JointTimeline[]) {
    out[`${tl.joint}::${tl.property}`] = sampleKf(tl.keyframes, t);
  }
  return out;
}

function val(jm: Record<string, number>, joint: string, prop: string): number {
  return jm[`${joint}::${prop}`] ?? 0;
}

interface Computed { x: number; y: number; angle: number }

function jointAngleFor(boneId: string, jm: Record<string, number>): number {
  switch (boneId) {
    case 'spine': {
      const flex = val(jm, 'spine', 'flexion') - val(jm, 'spine', 'extension');
      const lat = val(jm, 'spine', 'lateralFlexion');
      return -flex + lat;
    }
    case 'shoulder_L':  return val(jm, 'leftShoulder', 'flexion');
    case 'elbow_L':     return val(jm, 'leftElbow', 'flexion');
    case 'shoulder_R':  return -val(jm, 'rightShoulder', 'flexion');
    case 'elbow_R':     return -val(jm, 'rightElbow', 'flexion');
    case 'hip_L': {
      const flex = val(jm, 'leftHip', 'flexion') - val(jm, 'leftHip', 'extension');
      const abd = val(jm, 'leftHip', 'abduction');
      return -flex - abd;
    }
    case 'knee_L':  return val(jm, 'leftKnee', 'flexion') + val(jm, 'leftKnee', 'varus');
    case 'ankle_L': return -val(jm, 'leftAnkle', 'plantarflexion') + val(jm, 'leftAnkle', 'dorsiflexion');
    case 'hip_R': {
      const flex = val(jm, 'rightHip', 'flexion') - val(jm, 'rightHip', 'extension');
      const abd = val(jm, 'rightHip', 'abduction');
      return -flex + abd;
    }
    case 'knee_R':  return val(jm, 'rightKnee', 'flexion') + val(jm, 'rightKnee', 'varus');
    case 'ankle_R': return -val(jm, 'rightAnkle', 'plantarflexion') + val(jm, 'rightAnkle', 'dorsiflexion');
    default:        return 0;
  }
}

function computePose(jm: Record<string, number>, originX: number, originY: number): Map<string, Computed> {
  const out = new Map<string, Computed>();
  out.set('pelvis', { x: originX, y: originY, angle: val(jm, 'pelvis', 'drop') });
  for (const bone of RIG) {
    if (!bone.parent) continue;
    const parent = out.get(bone.parent);
    if (!parent) continue;
    const dynDeg = jointAngleFor(bone.id, jm);
    const angleDeg = bone.baseAngleDeg + dynDeg + parent.angle;
    const rad = (angleDeg * Math.PI) / 180;
    const ex = parent.x + Math.cos(rad) * bone.len;
    const ey = parent.y + Math.sin(rad) * bone.len;
    out.set(bone.id, { x: ex, y: ey, angle: angleDeg });
  }
  return out;
}

function renderFigure(
  pose: Map<string, Computed>,
  color: string,
  glow: string,
  failureXY: { x: number; y: number } | null,
  isFailure: boolean,
): JSX.Element[] {
  const elems: JSX.Element[] = [];
  for (const bone of RIG) {
    if (!bone.parent || bone.len === 0) continue;
    const a = pose.get(bone.parent);
    const b = pose.get(bone.id);
    if (!a || !b) continue;
    elems.push(
      <line key={`${bone.id}-l`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={color} strokeWidth={3} strokeOpacity={0.95} strokeLinecap="round" />
    );
  }
  for (const bone of RIG) {
    const p = pose.get(bone.id);
    if (!p) continue;
    if (bone.id === 'head') {
      elems.push(<circle key="head" cx={p.x} cy={p.y} r={9} stroke={color} strokeWidth={2.2} fill={glow} fillOpacity={0.18} />);
    } else if (bone.parent && bone.len > 0) {
      elems.push(<circle key={`${bone.id}-j`} cx={p.x} cy={p.y} r={2.4} fill={color} />);
    }
  }
  if (failureXY && isFailure) {
    elems.push(<circle key="fx" cx={failureXY.x} cy={failureXY.y} r={9} fill="#ef4444" opacity={0.9} stroke="#fff" strokeWidth={1.5} />);
    elems.push(<text key="fxt" x={failureXY.x} y={failureXY.y + 4} fontSize={10} fontWeight={700} textAnchor="middle" fill="#fff">✕</text>);
  }
  return elems;
}

const BONE_TO_RIG: Record<string, string> = {
  Ankle_L: 'ankle_L', Ankle_R: 'ankle_R',
  Knee_L: 'knee_L', Knee_R: 'knee_R',
  Hip_L: 'hip_L', Hip_R: 'hip_R',
  HipPart1_L: 'hip_L', HipPart1_R: 'hip_R',
  Shoulder_L: 'shoulder_L', Shoulder_R: 'shoulder_R',
  ShoulderPart1_L: 'shoulder_L', ShoulderPart1_R: 'shoulder_R',
  Spine1_M: 'spine', Spine1Part1_M: 'spine', Spine1Part2_M: 'spine',
  Chest_M: 'spine', Neck_M: 'neck',
  RootPart1_M: 'pelvis', RootPart2_M: 'pelvis', Root_M: 'pelvis',
};

export default function DualGhostStickFigure(props: Props) {
  const { intendedSequence, actualSequence, progress, failureFrame, failureBone, width = 280, height = 220 } = props;
  const t = Math.max(0, Math.min(1, progress));
  const isFailure = Math.abs(t - failureFrame) < 0.08;

  const intendedPose = useMemo(() => computePose(buildJointMap(intendedSequence, t), width * 0.27, 32), [intendedSequence, t, width]);
  const actualPose   = useMemo(() => computePose(buildJointMap(actualSequence,   t), width * 0.73, 32), [actualSequence,   t, width]);

  const failureRig = failureBone ? BONE_TO_RIG[failureBone] : undefined;
  const intendedFailureXY = failureRig ? intendedPose.get(failureRig) ?? null : null;
  const actualFailureXY   = failureRig ? actualPose.get(failureRig)   ?? null : null;

  return (
    <div className="bg-gray-950/70 border border-gray-700/50 rounded p-1.5" data-testid="sfv-dual-ghost">
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-[8.5px] font-semibold uppercase tracking-wider text-emerald-300/90">Intended</span>
        <span className="text-[8.5px] text-gray-500 font-mono">t={Math.round(t * 100)}%</span>
        <span className="text-[8.5px] font-semibold uppercase tracking-wider text-rose-300/90">Actual</span>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={width / 2} y1={6} x2={width / 2} y2={height - 6} stroke="#374151" strokeDasharray="2 3" strokeOpacity={0.6} />
        {renderFigure(intendedPose, '#34d399', '#10b981', intendedFailureXY, false)}
        {renderFigure(actualPose,   '#fb7185', '#f43f5e', actualFailureXY,   isFailure)}
        {isFailure && (
          <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fca5a5">
            FAILURE FRAME
          </text>
        )}
      </svg>
    </div>
  );
}
