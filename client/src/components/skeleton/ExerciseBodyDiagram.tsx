import { useMemo } from 'react';

interface ActivationStep {
  muscle: string;
  role: string;
  order: number;
}

interface ForceVectorData {
  direction: string;
  plane: string;
}

interface ExerciseBodyDiagramProps {
  activationPattern: ActivationStep[];
  forceVector: ForceVectorData;
}

const ROLE_COLORS: Record<string, string> = {
  prime_mover: '#ef4444',
  stabilizer: '#3b82f6',
  decelerator: '#f59e0b',
  force_transmitter: '#10b981',
};

const ROLE_LABELS: Record<string, string> = {
  prime_mover: 'Prime Mover',
  stabilizer: 'Stabilizer',
  decelerator: 'Decelerator',
  force_transmitter: 'Force Transmitter',
};

interface MuscleRegion {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  view: 'front' | 'back' | 'both';
}

const MUSCLE_MAP: Record<string, MuscleRegion> = {
  deltoid: { cx: 28, cy: 22, rx: 6, ry: 5, view: 'both' },
  anterior_deltoid: { cx: 28, cy: 21, rx: 5, ry: 4, view: 'front' },
  posterior_deltoid: { cx: 28, cy: 21, rx: 5, ry: 4, view: 'back' },
  lateral_deltoid: { cx: 30, cy: 22, rx: 5, ry: 4, view: 'front' },
  trapezius: { cx: 50, cy: 18, rx: 10, ry: 6, view: 'back' },
  upper_trapezius: { cx: 50, cy: 15, rx: 8, ry: 4, view: 'back' },
  lower_trapezius: { cx: 50, cy: 22, rx: 8, ry: 4, view: 'back' },
  pectoralis: { cx: 40, cy: 26, rx: 8, ry: 5, view: 'front' },
  pectoralis_major: { cx: 40, cy: 26, rx: 8, ry: 5, view: 'front' },
  pec_major: { cx: 40, cy: 26, rx: 8, ry: 5, view: 'front' },
  latissimus_dorsi: { cx: 42, cy: 34, rx: 9, ry: 7, view: 'back' },
  lat_dorsi: { cx: 42, cy: 34, rx: 9, ry: 7, view: 'back' },
  lats: { cx: 42, cy: 34, rx: 9, ry: 7, view: 'back' },
  rhomboids: { cx: 50, cy: 25, rx: 5, ry: 5, view: 'back' },
  serratus_anterior: { cx: 34, cy: 32, rx: 4, ry: 5, view: 'front' },
  biceps: { cx: 26, cy: 33, rx: 4, ry: 6, view: 'front' },
  biceps_brachii: { cx: 26, cy: 33, rx: 4, ry: 6, view: 'front' },
  triceps: { cx: 26, cy: 33, rx: 4, ry: 6, view: 'back' },
  triceps_brachii: { cx: 26, cy: 33, rx: 4, ry: 6, view: 'back' },
  forearm_flexors: { cx: 24, cy: 42, rx: 3, ry: 5, view: 'front' },
  forearm_extensors: { cx: 24, cy: 42, rx: 3, ry: 5, view: 'back' },
  rectus_abdominis: { cx: 50, cy: 36, rx: 5, ry: 8, view: 'front' },
  abdominals: { cx: 50, cy: 36, rx: 5, ry: 8, view: 'front' },
  abs: { cx: 50, cy: 36, rx: 5, ry: 8, view: 'front' },
  transverse_abdominis: { cx: 50, cy: 40, rx: 8, ry: 6, view: 'front' },
  tva: { cx: 50, cy: 40, rx: 8, ry: 6, view: 'front' },
  obliques: { cx: 42, cy: 38, rx: 6, ry: 5, view: 'front' },
  internal_oblique: { cx: 42, cy: 38, rx: 6, ry: 5, view: 'front' },
  external_oblique: { cx: 42, cy: 36, rx: 7, ry: 5, view: 'front' },
  erector_spinae: { cx: 50, cy: 34, rx: 4, ry: 10, view: 'back' },
  multifidus: { cx: 50, cy: 40, rx: 3, ry: 5, view: 'back' },
  quadratus_lumborum: { cx: 44, cy: 42, rx: 4, ry: 4, view: 'back' },
  gluteus_maximus: { cx: 44, cy: 50, rx: 7, ry: 5, view: 'back' },
  glute_max: { cx: 44, cy: 50, rx: 7, ry: 5, view: 'back' },
  gluteus_medius: { cx: 40, cy: 47, rx: 6, ry: 4, view: 'back' },
  glute_med: { cx: 40, cy: 47, rx: 6, ry: 4, view: 'back' },
  gluteus_minimus: { cx: 42, cy: 48, rx: 4, ry: 3, view: 'back' },
  hip_flexors: { cx: 42, cy: 46, rx: 5, ry: 4, view: 'front' },
  iliopsoas: { cx: 44, cy: 46, rx: 5, ry: 4, view: 'front' },
  psoas: { cx: 46, cy: 44, rx: 4, ry: 4, view: 'front' },
  quadriceps: { cx: 44, cy: 58, rx: 5, ry: 8, view: 'front' },
  rectus_femoris: { cx: 44, cy: 58, rx: 4, ry: 8, view: 'front' },
  vastus_lateralis: { cx: 40, cy: 58, rx: 4, ry: 7, view: 'front' },
  vastus_medialis: { cx: 48, cy: 60, rx: 4, ry: 5, view: 'front' },
  hamstrings: { cx: 44, cy: 58, rx: 5, ry: 8, view: 'back' },
  biceps_femoris: { cx: 42, cy: 58, rx: 4, ry: 7, view: 'back' },
  semimembranosus: { cx: 47, cy: 58, rx: 3, ry: 7, view: 'back' },
  semitendinosus: { cx: 46, cy: 58, rx: 3, ry: 7, view: 'back' },
  adductors: { cx: 48, cy: 56, rx: 3, ry: 6, view: 'front' },
  hip_adductors: { cx: 48, cy: 56, rx: 3, ry: 6, view: 'front' },
  tensor_fasciae_latae: { cx: 38, cy: 50, rx: 3, ry: 4, view: 'front' },
  tfl: { cx: 38, cy: 50, rx: 3, ry: 4, view: 'front' },
  it_band: { cx: 37, cy: 58, rx: 2, ry: 8, view: 'front' },
  gastrocnemius: { cx: 44, cy: 72, rx: 4, ry: 6, view: 'back' },
  calf: { cx: 44, cy: 72, rx: 4, ry: 6, view: 'back' },
  calves: { cx: 44, cy: 72, rx: 4, ry: 6, view: 'back' },
  soleus: { cx: 44, cy: 76, rx: 3, ry: 5, view: 'back' },
  tibialis_anterior: { cx: 44, cy: 72, rx: 3, ry: 6, view: 'front' },
  peroneals: { cx: 40, cy: 74, rx: 2, ry: 5, view: 'front' },
  rotator_cuff: { cx: 32, cy: 22, rx: 5, ry: 4, view: 'back' },
  infraspinatus: { cx: 38, cy: 24, rx: 6, ry: 4, view: 'back' },
  supraspinatus: { cx: 38, cy: 18, rx: 5, ry: 3, view: 'back' },
  subscapularis: { cx: 38, cy: 24, rx: 5, ry: 4, view: 'front' },
  teres_minor: { cx: 34, cy: 26, rx: 3, ry: 3, view: 'back' },
  teres_major: { cx: 34, cy: 28, rx: 3, ry: 3, view: 'back' },
  piriformis: { cx: 46, cy: 50, rx: 4, ry: 3, view: 'back' },
  diaphragm: { cx: 50, cy: 30, rx: 7, ry: 3, view: 'front' },
  pelvic_floor: { cx: 50, cy: 48, rx: 5, ry: 2, view: 'front' },
  scapular_stabilizers: { cx: 40, cy: 22, rx: 7, ry: 5, view: 'back' },
};

function findMuscleRegion(muscleName: string): { key: string; region: MuscleRegion } | null {
  const normalized = muscleName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (MUSCLE_MAP[normalized]) return { key: normalized, region: MUSCLE_MAP[normalized] };

  for (const [key, region] of Object.entries(MUSCLE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { key, region };
    }
  }

  const words = normalized.split('_');
  for (const word of words) {
    if (word.length < 4) continue;
    for (const [key, region] of Object.entries(MUSCLE_MAP)) {
      if (key.includes(word)) {
        return { key, region };
      }
    }
  }
  return null;
}

function getForceArrow(direction: string, plane: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const dir = direction.toLowerCase();
  const p = plane.toLowerCase();

  let dx = 0, dy = 0;
  if (dir.includes('superior') || dir.includes('up')) dy = -1;
  if (dir.includes('inferior') || dir.includes('down')) dy = 1;
  if (dir.includes('lateral') || dir.includes('out')) dx = 1;
  if (dir.includes('medial') || dir.includes('in')) dx = -1;
  if (dir.includes('anterior') || dir.includes('forward')) dy = -0.5;
  if (dir.includes('posterior') || dir.includes('backward')) dy = 0.5;

  if (p.includes('sagittal')) { dx = 0; dy = dy || -1; }
  if (p.includes('frontal') || p.includes('coronal')) { dy = 0; dx = dx || 1; }
  if (p.includes('transverse') || p.includes('horizontal')) { dx = dx || 1; dy = dy || 0; }

  if (dx === 0 && dy === 0) dy = -1;

  const magnitude = Math.sqrt(dx * dx + dy * dy);
  dx /= magnitude;
  dy /= magnitude;

  const cx = 50, cy = 45;
  const len = 12;
  return { x1: cx - dx * len / 2, y1: cy - dy * len / 2, x2: cx + dx * len / 2, y2: cy + dy * len / 2 };
}

function BodyOutline({ side }: { side: 'front' | 'back' }) {
  return (
    <g opacity={0.3} stroke="#6b7280" strokeWidth={0.6} fill="none">
      <ellipse cx={50} cy={8} rx={6} ry={7} />
      <line x1={50} y1={15} x2={50} y2={46} />
      <line x1={50} y1={20} x2={32} y2={28} />
      <line x1={32} y1={28} x2={22} y2={44} />
      <line x1={50} y1={20} x2={68} y2={28} />
      <line x1={68} y1={28} x2={78} y2={44} />
      <ellipse cx={50} cy={32} rx={12} ry={15} />
      <line x1={50} y1={46} x2={40} y2={48} />
      <line x1={50} y1={46} x2={60} y2={48} />
      <line x1={40} y1={48} x2={38} y2={70} />
      <line x1={38} y1={70} x2={36} y2={86} />
      <line x1={60} y1={48} x2={62} y2={70} />
      <line x1={62} y1={70} x2={64} y2={86} />
      <text x={50} y={97} textAnchor="middle" fill="#6b7280" fontSize={4} fontFamily="sans-serif">
        {side === 'front' ? 'ANTERIOR' : 'POSTERIOR'}
      </text>
    </g>
  );
}

export default function ExerciseBodyDiagram({ activationPattern, forceVector }: ExerciseBodyDiagramProps) {
  const { frontMuscles, backMuscles, arrow, roles } = useMemo(() => {
    const front: { region: MuscleRegion; role: string; order: number; muscle: string }[] = [];
    const back: { region: MuscleRegion; role: string; order: number; muscle: string }[] = [];
    const rolesUsed = new Set<string>();

    for (const step of activationPattern) {
      const found = findMuscleRegion(step.muscle);
      if (!found) continue;
      rolesUsed.add(step.role);
      const entry = { region: found.region, role: step.role, order: step.order, muscle: step.muscle };

      if (found.region.view === 'front') front.push(entry);
      else if (found.region.view === 'back') back.push(entry);
      else { front.push(entry); back.push(entry); }
    }

    const arrow = getForceArrow(forceVector.direction, forceVector.plane);

    return { frontMuscles: front, backMuscles: back, arrow, roles: Array.from(rolesUsed) };
  }, [activationPattern, forceVector]);

  return (
    <div className="w-full">
      <div className="flex gap-1">
        <svg viewBox="0 0 100 100" className="flex-1" style={{ maxHeight: 160 }}>
          <BodyOutline side="front" />
          {frontMuscles.map((m, i) => (
            <g key={`f-${i}`}>
              <ellipse
                cx={m.region.cx}
                cy={m.region.cy}
                rx={m.region.rx}
                ry={m.region.ry}
                fill={ROLE_COLORS[m.role] || '#6b7280'}
                opacity={0.4}
                stroke={ROLE_COLORS[m.role] || '#6b7280'}
                strokeWidth={0.5}
              />
              <text
                x={m.region.cx}
                y={m.region.cy + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={2.5}
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {m.order}
              </text>
            </g>
          ))}
          {arrow && (
            <g>
              <line
                x1={arrow.x1} y1={arrow.y1}
                x2={arrow.x2} y2={arrow.y2}
                stroke="#06b6d4" strokeWidth={1.2} opacity={0.7}
                markerEnd="url(#arrowhead-front)"
              />
              <defs>
                <marker id="arrowhead-front" markerWidth={4} markerHeight={3} refX={4} refY={1.5} orient="auto">
                  <polygon points="0 0, 4 1.5, 0 3" fill="#06b6d4" opacity={0.7} />
                </marker>
              </defs>
            </g>
          )}
        </svg>

        <svg viewBox="0 0 100 100" className="flex-1" style={{ maxHeight: 160 }}>
          <BodyOutline side="back" />
          {backMuscles.map((m, i) => (
            <g key={`b-${i}`}>
              <ellipse
                cx={m.region.cx}
                cy={m.region.cy}
                rx={m.region.rx}
                ry={m.region.ry}
                fill={ROLE_COLORS[m.role] || '#6b7280'}
                opacity={0.4}
                stroke={ROLE_COLORS[m.role] || '#6b7280'}
                strokeWidth={0.5}
              />
              <text
                x={m.region.cx}
                y={m.region.cy + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={2.5}
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {m.order}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 mt-1.5 justify-center">
        {roles.map(role => (
          <div key={role} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[role] || '#6b7280' }} />
            <span className="text-[7px] text-gray-400">{ROLE_LABELS[role] || role.replace(/_/g, ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-cyan-500 rounded" />
          <span className="text-[7px] text-gray-400">Force Vector</span>
        </div>
      </div>
    </div>
  );
}
