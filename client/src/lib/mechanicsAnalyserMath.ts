/**
 * Mechanics Analyser math library (Task #294)
 *
 * Pure, framework-free helpers used by the Mechanics Analyser tab and its
 * derivation drawers. Every helper that produces a clinically reportable
 * number returns a `MathReadout` with the substituted formula, units,
 * normative range, and a citation so the KaTeX "show math" drawer can
 * surface a fully-explained derivation for every figure on screen.
 *
 * References (authoritative):
 *   - de Leva P. (1996). Adjustments to Zatsiorsky-Seluyanov's segment
 *     inertia parameters. J Biomech 29(9):1223-1230.
 *   - Pandy MG. (1999). Moment arm of a muscle force. Exerc Sport Sci Rev.
 *     27:79-118.
 *   - Delp SL et al. (1990). An interactive graphics-based model of the
 *     lower extremity to study orthopaedic surgical procedures. IEEE
 *     Trans Biomed Eng 37(8):757-767.
 *   - Arnold EM, Ward SR, Lieber RL, Delp SL. (2010). A model of the lower
 *     limb for analysis of human movement. Ann Biomed Eng 38(2):269-279.
 *   - Hoy MG, Zajac FE, Gordon ME. (1990). A musculoskeletal model of the
 *     human lower extremity. J Biomech 23(2):157-169.
 *   - Hof AL. (2008). The "extrapolated center of mass" concept suggests
 *     a simple control of balance in walking. Hum Mov Sci 27(1):112-125.
 *   - Brinckmann P, Frobin W, Leivseth G. (2002). Musculoskeletal
 *     Biomechanics. Thieme. (Articular contact-area constants.)
 *   - Insall J, Salvati E. (1971). Patella position in the normal knee.
 *     Radiology 101:101-104. (Q-angle norms.)
 *   - Cobb JR. (1948). Outline for the study of scoliosis. AAOS Instr Course
 *     Lect 5:261-275.
 */

export interface MathReadout {
  /** Numerical value in the canonical unit. */
  value: number;
  /** Display unit, e.g. "N", "N·m", "deg", "MPa", "m/s", "BW", "%". */
  units: string;
  /** Optional [low, high] normative range in the same units. */
  normativeRange?: [number, number] | null;
  /** Plain-language interpretation of where the value sits. */
  interpretation?: string;
  /** Raw KaTeX-ready formula (no $...$ wrapper). */
  formula: string;
  /** Substituted values rendered as a KaTeX equation chain. */
  substitutions: string;
  /** Short list of bullet assumptions. */
  assumptions: string[];
  /** Citation strings shown verbatim. */
  citations: string[];
}

const round = (x: number, dp = 2): number => {
  if (!Number.isFinite(x)) return 0;
  const m = Math.pow(10, dp);
  return Math.round(x * m) / m;
};

const fmt = (x: number, dp = 2): string => {
  if (!Number.isFinite(x)) return '0';
  return round(x, dp).toString();
};

const G = 9.81; // m/s^2

// ---------------------------------------------------------------------------
// 1. de Leva (1996) anthropometric segment parameters.
//    massPct: % of total body mass.
//    comProx: COM as fraction of segment length, measured from PROXIMAL end.
//    radGyr:  radius of gyration as fraction of segment length about COM.
// ---------------------------------------------------------------------------

export type SegmentId =
  | 'head' | 'trunk' | 'upper_arm' | 'forearm' | 'hand'
  | 'thigh' | 'shank' | 'foot';

export interface SegmentParameters {
  id: SegmentId;
  label: string;
  massPct: number;
  comProx: number;
  radGyr: number;
}

/** de Leva (1996) Table 4 — averaged male/female values (rounded). */
export const DE_LEVA_DEFAULTS: Record<SegmentId, SegmentParameters> = {
  head:      { id: 'head',      label: 'Head + neck', massPct: 6.94, comProx: 0.500, radGyr: 0.303 },
  trunk:     { id: 'trunk',     label: 'Trunk',       massPct: 43.46, comProx: 0.450, radGyr: 0.328 },
  upper_arm: { id: 'upper_arm', label: 'Upper arm',   massPct: 2.71,  comProx: 0.577, radGyr: 0.285 },
  forearm:   { id: 'forearm',   label: 'Forearm',     massPct: 1.62,  comProx: 0.457, radGyr: 0.276 },
  hand:      { id: 'hand',      label: 'Hand',        massPct: 0.61,  comProx: 0.790, radGyr: 0.297 },
  thigh:     { id: 'thigh',     label: 'Thigh',       massPct: 14.16, comProx: 0.410, radGyr: 0.329 },
  shank:     { id: 'shank',     label: 'Shank',       massPct: 4.33,  comProx: 0.440, radGyr: 0.255 },
  foot:      { id: 'foot',      label: 'Foot',        massPct: 1.37,  comProx: 0.500, radGyr: 0.245 },
};

/** Default segment lengths as fraction of stature (Drillis & Contini, 1966). */
export const SEGMENT_LENGTH_FRAC: Record<SegmentId, number> = {
  head: 0.130, trunk: 0.288, upper_arm: 0.186, forearm: 0.146, hand: 0.108,
  thigh: 0.245, shank: 0.246, foot: 0.039,
};

export type AnthroOverrides = Partial<Record<SegmentId, Partial<SegmentParameters>>>;

export function resolveSegmentParameters(
  segment: SegmentId,
  overrides?: AnthroOverrides | null,
): SegmentParameters {
  const base = DE_LEVA_DEFAULTS[segment];
  const ov = overrides?.[segment];
  if (!ov) return base;
  return { ...base, ...ov };
}

export function segmentMassKg(
  segment: SegmentId,
  bodyWeightKg: number,
  overrides?: AnthroOverrides | null,
): number {
  const p = resolveSegmentParameters(segment, overrides);
  return (p.massPct / 100) * bodyWeightKg;
}

export function segmentLengthM(segment: SegmentId, statureM: number): number {
  return SEGMENT_LENGTH_FRAC[segment] * statureM;
}

export function segmentInertiaKgM2(
  segment: SegmentId,
  bodyWeightKg: number,
  statureM: number,
  overrides?: AnthroOverrides | null,
): number {
  const p = resolveSegmentParameters(segment, overrides);
  const m = segmentMassKg(segment, bodyWeightKg, overrides);
  const L = segmentLengthM(segment, statureM);
  const k = p.radGyr * L;
  return m * k * k;
}

// ---------------------------------------------------------------------------
// 2. Hill-type muscle model (active force-length, force-velocity, passive).
//    Normalized: F̃ = F / Fmax, L̃ = L / Lopt, Ṽ = V / Vmax (positive = shortening).
//    Active F̃-L̃: Gaussian width tuned to width = 0.45 (Zajac 1989).
//    Active F̃-Ṽ: Hill 1938 with curvature ~0.25.
//    Passive F̃-L̃: exponential rise above slack length 1.0 (Schutte 1992).
// ---------------------------------------------------------------------------

export interface HillState {
  /** Active force-length factor, 0..1 */
  fl: number;
  /** Force-velocity factor, 0..~1.5 (eccentric > 1) */
  fv: number;
  /** Active normalized force = a · fl · fv, 0..~1.5 */
  activeNorm: number;
  /** Passive normalized force, 0..~1 */
  passiveNorm: number;
  /** Total normalized force */
  totalNorm: number;
  /** Total force in N */
  forceN: number;
  /** Predicted % of Fmax */
  pctMax: number;
}

export function hillForceLength(normLength: number): number {
  const w = 0.45;
  const x = (normLength - 1) / w;
  return Math.max(0, Math.exp(-x * x));
}

export function hillForceVelocity(normVelocity: number): number {
  // Concentric (v > 0): classic Hill, asymptotes to 0 at v = Vmax.
  // Eccentric (v < 0): flat-topped at ~1.4 (Katz 1939 / Otten 1987).
  if (normVelocity >= 0) {
    const Fmax = 1;
    const af = 0.25;
    const v = Math.min(normVelocity, 1);
    return Math.max(0, ((1 - v) * Fmax) / (1 + v / af));
  }
  const v = -normVelocity;
  const Fecc = 1.4;
  const slope = 5.0;
  return 1 + (Fecc - 1) * Math.tanh(slope * v);
}

export function hillPassiveForce(normLength: number): number {
  if (normLength <= 1) return 0;
  const k = 4.0;
  const x = normLength - 1;
  return Math.min(1, (Math.exp(k * x) - 1) / (Math.exp(k * 0.6) - 1));
}

export function evaluateHill(
  activation: number,
  normLength: number,
  normVelocity: number,
  fmaxN: number,
): HillState {
  const a = Math.max(0, Math.min(1, activation));
  const fl = hillForceLength(normLength);
  const fv = hillForceVelocity(normVelocity);
  const activeNorm = a * fl * fv;
  const passiveNorm = hillPassiveForce(normLength);
  const totalNorm = activeNorm + passiveNorm;
  const forceN = totalNorm * fmaxN;
  return { fl, fv, activeNorm, passiveNorm, totalNorm, forceN, pctMax: totalNorm * 100 };
}

export function buildHillReadout(state: HillState, muscleName: string, fmaxN: number): MathReadout {
  return {
    value: round(state.forceN, 1),
    units: 'N',
    normativeRange: [0, fmaxN],
    interpretation:
      state.totalNorm < 0.2 ? 'Underloaded — minimal contribution' :
      state.totalNorm < 0.6 ? 'Operating in submaximal range' :
      state.totalNorm < 0.9 ? 'Near optimal operating point' :
      'High normalized force — close to or above isometric maximum',
    formula:
      'F = a \\cdot f_L(\\tilde{L}) \\cdot f_V(\\tilde{V}) \\cdot F_{max} + F_{passive}(\\tilde{L})',
    substitutions:
      `F = ${fmt(state.activeNorm, 3)} \\cdot ${fmt(fmaxN, 0)}\\,\\text{N} + ${fmt(state.passiveNorm, 3)} \\cdot ${fmt(fmaxN, 0)}\\,\\text{N} = ${fmt(state.forceN, 1)}\\,\\text{N}\\;(\\,${fmt(state.pctMax, 1)}\\%\\,F_{max})`,
    assumptions: [
      `Muscle: ${muscleName}.`,
      `Active F-L Gaussian width = 0.45 (Zajac 1989).`,
      `F-V curve af = 0.25, Fecc = 1.4 (Hill 1938 / Katz 1939).`,
      `Passive F-L exponential, slack at L̃ = 1.0 (Schutte 1992).`,
    ],
    citations: [
      'Zajac FE. Crit Rev Biomed Eng 1989;17:359-411.',
      'Hill AV. Proc R Soc B 1938;126:136-195.',
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Pandy / Delp / Arnold polynomial moment arms (m).
//    Inputs are joint angle in DEGREES; outputs are moment arm in METERS.
//    Polynomials are simplified cubic fits within physiological ROM.
// ---------------------------------------------------------------------------

export type MomentArmMuscle =
  | 'quadriceps'         // knee extension
  | 'hamstrings'         // knee flexion / hip extension
  | 'gastrocnemius'      // ankle plantarflexion / knee flexion
  | 'soleus'             // ankle plantarflexion
  | 'tibialis_anterior'  // ankle dorsiflexion
  | 'gluteus_maximus'    // hip extension
  | 'iliopsoas'          // hip flexion
  | 'biceps_brachii'     // elbow flexion
  | 'triceps_brachii'    // elbow extension
  | 'deltoid'            // shoulder abduction
  | 'erector_spinae';    // lumbar extension

interface MomentArmFit {
  joint: 'knee' | 'ankle' | 'hip' | 'elbow' | 'shoulder' | 'lumbar';
  /** Polynomial coefficients [c0, c1, c2, c3] applied to angle in DEGREES. */
  coeffs: [number, number, number, number];
  /** Operational ROM (deg) — outside this we clamp. */
  rom: [number, number];
  /** Citation. */
  citation: string;
}

const MOMENT_ARM_FITS: Record<MomentArmMuscle, MomentArmFit> = {
  quadriceps:        { joint: 'knee',     coeffs: [ 0.045, 6e-4,  -1.5e-5, 0      ], rom: [0, 120],   citation: 'Arnold 2010' },
  hamstrings:        { joint: 'knee',     coeffs: [ 0.030, 7e-4,   0,       0      ], rom: [0, 120],   citation: 'Arnold 2010' },
  gastrocnemius:     { joint: 'ankle',    coeffs: [ 0.052, 2.5e-4, 0,       0      ], rom: [-30, 30],  citation: 'Hoy 1990' },
  soleus:            { joint: 'ankle',    coeffs: [ 0.048, 0,      0,       0      ], rom: [-30, 30],  citation: 'Hoy 1990' },
  tibialis_anterior: { joint: 'ankle',    coeffs: [-0.038, 0,      0,       0      ], rom: [-30, 30],  citation: 'Delp 1990' },
  gluteus_maximus:   { joint: 'hip',      coeffs: [ 0.060, 5e-4,   0,       0      ], rom: [-30, 120], citation: 'Delp 1990' },
  iliopsoas:         { joint: 'hip',      coeffs: [ 0.040, -3e-4,  0,       0      ], rom: [-30, 120], citation: 'Delp 1990' },
  biceps_brachii:    { joint: 'elbow',    coeffs: [ 0.020, 4e-4,  -1e-5,    0      ], rom: [0, 145],   citation: 'Murray 1995' },
  triceps_brachii:   { joint: 'elbow',    coeffs: [-0.025, -2e-4,  0,       0      ], rom: [0, 145],   citation: 'Murray 1995' },
  deltoid:           { joint: 'shoulder', coeffs: [ 0.030, 4e-4,  -2e-6,    0      ], rom: [0, 180],   citation: 'van der Helm 1994' },
  erector_spinae:    { joint: 'lumbar',   coeffs: [ 0.055, 0,      0,       0      ], rom: [-30, 60],  citation: 'McGill 2007' },
};

export function muscleMomentArmM(muscle: MomentArmMuscle, angleDeg: number): number {
  const fit = MOMENT_ARM_FITS[muscle];
  const a = Math.max(fit.rom[0], Math.min(fit.rom[1], angleDeg));
  const [c0, c1, c2, c3] = fit.coeffs;
  return c0 + c1 * a + c2 * a * a + c3 * a * a * a;
}

export function buildMomentArmReadout(muscle: MomentArmMuscle, angleDeg: number): MathReadout {
  const fit = MOMENT_ARM_FITS[muscle];
  const r = muscleMomentArmM(muscle, angleDeg);
  return {
    value: round(r * 1000, 1), // mm for display
    units: 'mm',
    formula: 'r(\\theta) = c_0 + c_1\\theta + c_2\\theta^2 + c_3\\theta^3',
    substitutions: `r(${fmt(angleDeg, 1)}^{\\circ}) = ${fmt(r * 1000, 1)}\\,\\text{mm}`,
    assumptions: [
      `Polynomial fit to ${fit.citation} cadaveric data.`,
      `Valid within ROM [${fit.rom[0]}°, ${fit.rom[1]}°]; clamped outside.`,
    ],
    citations: [`${fit.citation} polynomial fit.`],
  };
}

/** Build a sweep of moment arms across the joint ROM (for the inline mini-chart). */
export function muscleMomentArmSweep(muscle: MomentArmMuscle, samples = 30): { angleDeg: number; armMm: number }[] {
  const fit = MOMENT_ARM_FITS[muscle];
  const out: { angleDeg: number; armMm: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const a = fit.rom[0] + t * (fit.rom[1] - fit.rom[0]);
    out.push({ angleDeg: a, armMm: muscleMomentArmM(muscle, a) * 1000 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. Joint contact pressure (MPa) constants.
//    Pressure = JointReactionForce / contact area (m^2).
// ---------------------------------------------------------------------------

export interface ContactConstant {
  joint: string;
  contactAreaCm2: number;
  cartilageToleranceMPa: number;
  injuryRiskMPa: number;
  citation: string;
}

export const JOINT_CONTACT_AREAS: Record<string, ContactConstant> = {
  hip:         { joint: 'Hip',          contactAreaCm2: 12.0, cartilageToleranceMPa: 5.0, injuryRiskMPa: 10.0, citation: 'Brinckmann 2002' },
  knee_tf:     { joint: 'Tibiofemoral', contactAreaCm2: 11.5, cartilageToleranceMPa: 5.0, injuryRiskMPa: 9.0,  citation: 'Ahmed & Burke 1983' },
  knee_pf:     { joint: 'Patellofemoral', contactAreaCm2: 4.5, cartilageToleranceMPa: 6.0, injuryRiskMPa: 12.0, citation: 'Huberti 1984' },
  ankle:       { joint: 'Talocrural',   contactAreaCm2: 4.4,  cartilageToleranceMPa: 7.0, injuryRiskMPa: 13.0, citation: 'Calhoun 1994' },
  shoulder:    { joint: 'Glenohumeral', contactAreaCm2: 5.5,  cartilageToleranceMPa: 4.0, injuryRiskMPa: 8.0,  citation: 'Soslowsky 1992' },
  elbow:       { joint: 'Humero-ulnar', contactAreaCm2: 3.0,  cartilageToleranceMPa: 5.0, injuryRiskMPa: 10.0, citation: 'Goodfellow 1967' },
  l5s1_disc:   { joint: 'L5/S1 disc',   contactAreaCm2: 18.0, cartilageToleranceMPa: 1.5, injuryRiskMPa: 3.4,  citation: 'Brinckmann 1988' },
  l4l5_disc:   { joint: 'L4/L5 disc',   contactAreaCm2: 17.0, cartilageToleranceMPa: 1.5, injuryRiskMPa: 3.4,  citation: 'Brinckmann 1988' },
};

export function jointContactPressureMPa(forceN: number, jointKey: string): number {
  const c = JOINT_CONTACT_AREAS[jointKey];
  if (!c) return 0;
  const aM2 = c.contactAreaCm2 * 1e-4;
  return aM2 > 0 ? forceN / aM2 / 1e6 : 0;
}

export function buildContactPressureReadout(forceN: number, jointKey: string): MathReadout {
  const c = JOINT_CONTACT_AREAS[jointKey];
  const p = jointContactPressureMPa(forceN, jointKey);
  return {
    value: round(p, 2),
    units: 'MPa',
    normativeRange: c ? [0, c.cartilageToleranceMPa] : null,
    interpretation: c
      ? p < c.cartilageToleranceMPa
        ? 'Within cartilage tolerance'
        : p < c.injuryRiskMPa
          ? 'Above tolerance — degenerative load if sustained'
          : 'Above injury threshold — acute risk'
      : 'No published constant for this joint',
    formula: 'P = \\dfrac{F_{joint}}{A_{contact}}',
    substitutions: c
      ? `P = \\dfrac{${fmt(forceN, 0)}\\,\\text{N}}{${fmt(c.contactAreaCm2, 1)}\\,\\text{cm}^2 \\cdot 10^{-4}} = ${fmt(p, 2)}\\,\\text{MPa}`
      : 'No contact-area constant available',
    assumptions: [
      'Uniform pressure distribution.',
      c ? `Contact area = ${c.contactAreaCm2} cm² (${c.citation}).` : 'No published area for this joint.',
    ],
    citations: c ? [c.citation] : [],
  };
}

// ---------------------------------------------------------------------------
// 5. Angular metrics (Q-angle, varus/valgus, calcaneal angle, scapulohumeral
//    rhythm, Cobb).
// ---------------------------------------------------------------------------

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Q-angle from ASIS, patella, tibial-tuberosity coordinates (frontal plane).
 * Returns the angle in degrees between (ASIS→patella) and (patella→tibial-tub).
 */
export function qAngleDeg(
  asis: { x: number; y: number },
  patella: { x: number; y: number },
  tibialTub: { x: number; y: number },
): number {
  const ax = asis.x - patella.x;
  const ay = asis.y - patella.y;
  const bx = tibialTub.x - patella.x;
  const by = tibialTub.y - patella.y;
  const dot = ax * bx + ay * by;
  const m1 = Math.hypot(ax, ay);
  const m2 = Math.hypot(bx, by);
  if (m1 === 0 || m2 === 0) return 0;
  return toDeg(Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))));
}

export function buildQAngleReadout(qDeg: number, side: 'left' | 'right'): MathReadout {
  return {
    value: round(qDeg, 1),
    units: 'deg',
    normativeRange: [12, 18],
    interpretation:
      qDeg < 10 ? 'Low Q — consider varus alignment' :
      qDeg <= 20 ? 'Within typical range' :
      'Elevated Q — increased lateral patellar load risk',
    formula: 'Q = \\arccos\\left( \\dfrac{ \\vec{u}\\cdot\\vec{v} }{ \\lVert\\vec{u}\\rVert \\lVert\\vec{v}\\rVert } \\right)',
    substitutions: `Q_{${side}} = ${fmt(qDeg, 1)}^{\\circ}`,
    assumptions: [
      'Vectors from patellar centre to ASIS and tibial tuberosity in the frontal plane.',
      'Norms: 12-18° (Insall & Salvati 1971); >20° associated with PFP.',
    ],
    citations: ['Insall J, Salvati E. Radiology 1971;101:101-104.'],
  };
}

/** Tibiofemoral varus/valgus angle. Negative = varus, positive = valgus (degrees). */
export function tibiofemoralVarusValgusDeg(thighFrontalDeg: number, shankFrontalDeg: number): number {
  return shankFrontalDeg - thighFrontalDeg;
}

export function buildVarusValgusReadout(deg: number, side: 'left' | 'right'): MathReadout {
  return {
    value: round(deg, 1),
    units: 'deg',
    normativeRange: [-3, 7],
    interpretation:
      deg < -5 ? 'Varus alignment — medial compartment loading risk' :
      deg > 9 ? 'Valgus alignment — lateral compartment / PFP risk' :
      'Within neutral mechanical axis range',
    formula: '\\theta_{varus/valgus} = \\theta_{shank} - \\theta_{thigh}',
    substitutions: `\\theta_{${side}} = ${fmt(deg, 1)}^{\\circ}`,
    assumptions: ['Frontal-plane bone vectors from skeleton landmarks.'],
    citations: ['Cooke TD. J Orthop Res 2007;25:639-647.'],
  };
}

/** Rearfoot calcaneal angle (degrees, +ve = valgus / pronation). */
export function calcanealAngleDeg(tibialFrontalDeg: number, calcanealFrontalDeg: number): number {
  return calcanealFrontalDeg - tibialFrontalDeg;
}

export function buildCalcanealAngleReadout(deg: number, side: 'left' | 'right'): MathReadout {
  return {
    value: round(deg, 1),
    units: 'deg',
    normativeRange: [-2, 6],
    interpretation:
      deg > 8 ? 'Excessive rearfoot valgus / overpronation' :
      deg < -4 ? 'Rearfoot varus / supination' :
      'Within neutral subtalar range',
    formula: '\\theta_{rearfoot} = \\theta_{calc} - \\theta_{tibia}',
    substitutions: `\\theta_{${side}} = ${fmt(deg, 1)}^{\\circ}`,
    assumptions: ['Frontal-plane vectors of tibia and calcaneus.'],
    citations: ['Donatelli RA. Foot Ankle 1987;8:139-143.'],
  };
}

/** Scapulohumeral rhythm ratio = humeral elevation / scapular upward rotation. */
export function scapulohumeralRhythmRatio(humeralEleDeg: number, scapularUpRotDeg: number): number {
  if (scapularUpRotDeg <= 0) return 0;
  return humeralEleDeg / scapularUpRotDeg;
}

export function buildScapulohumeralRhythmReadout(humEleDeg: number, scapUpDeg: number): MathReadout {
  const r = scapulohumeralRhythmRatio(humEleDeg, scapUpDeg);
  return {
    value: round(r, 2),
    units: ':1',
    normativeRange: [1.7, 2.3],
    interpretation:
      r < 1.4 ? 'Scapular dominance — possible cuff weakness or stiffness' :
      r > 2.5 ? 'Humeral dominance — scapular dyskinesis / weakness risk' :
      'Within Inman 2:1 range',
    formula: 'R_{SH} = \\dfrac{\\theta_{humeral}}{\\theta_{scapular}}',
    substitutions: `R = \\dfrac{${fmt(humEleDeg, 1)}^{\\circ}}{${fmt(scapUpDeg, 1)}^{\\circ}} = ${fmt(r, 2)}`,
    assumptions: ['Inman et al. 1944; values vary 0–30° vs >30° humeral elevation phases.'],
    citations: ['Inman VT, Saunders JBM, Abbott LC. JBJS 1944;26:1-30.'],
  };
}

/**
 * Apex-vertebra Cobb angle from spine landmark list (frontal plane).
 * landmarks: ordered list from upper to lower vertebra centroids (x, y).
 * Returns the maximum subtended angle between the most-tilted upper end-vertebra
 * and the most-tilted lower end-vertebra.
 */
export function cobbAngleDeg(landmarks: { x: number; y: number }[]): number {
  if (landmarks.length < 3) return 0;
  // Vector between adjacent vertebrae and the inclination of each segment.
  const segs: number[] = [];
  for (let i = 0; i < landmarks.length - 1; i++) {
    const dx = landmarks[i + 1].x - landmarks[i].x;
    const dy = landmarks[i + 1].y - landmarks[i].y;
    segs.push(toDeg(Math.atan2(dx, -dy))); // tilt vs vertical
  }
  let maxAngle = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = Math.abs(segs[i] - segs[j]);
      if (a > maxAngle) maxAngle = a;
    }
  }
  return maxAngle;
}

export function buildCobbReadout(deg: number, region: string): MathReadout {
  return {
    value: round(deg, 1),
    units: 'deg',
    normativeRange: [0, 10],
    interpretation:
      deg < 10 ? 'Within normal vertebral asymmetry' :
      deg < 25 ? 'Mild scoliotic curvature — monitor' :
      deg < 45 ? 'Moderate scoliosis — bracing range' :
      'Severe scoliosis — surgical consideration',
    formula: '\\theta_{Cobb} = \\max_{i<j} \\,\\lvert \\theta_i - \\theta_j \\rvert',
    substitutions: `\\theta_{Cobb}^{${region}} = ${fmt(deg, 1)}^{\\circ}`,
    assumptions: [
      'Approximation from detected spine landmarks (not X-ray).',
      'End-vertebra picked as max-tilt segment.',
    ],
    citations: ['Cobb JR. AAOS Instr Course Lect 1948;5:261-275.'],
  };
}

// ---------------------------------------------------------------------------
// 6. Joint power, work, angular momentum.
// ---------------------------------------------------------------------------

export function jointPowerW(momentNm: number, omegaRadPerSec: number): number {
  return momentNm * omegaRadPerSec;
}

export function buildJointPowerReadout(M: number, omega: number, joint: string): MathReadout {
  const P = jointPowerW(M, omega);
  return {
    value: round(P, 1),
    units: 'W',
    interpretation:
      P > 0 ? 'Concentric — muscle generates' :
      P < 0 ? 'Eccentric — muscle absorbs' :
      'Isometric / no power exchange',
    formula: 'P = M \\cdot \\omega',
    substitutions: `P_{${joint}} = ${fmt(M, 1)}\\,\\text{N·m} \\cdot ${fmt(omega, 2)}\\,\\text{rad/s} = ${fmt(P, 1)}\\,\\text{W}`,
    assumptions: ['Sagittal-plane net joint moment × angular velocity.'],
    citations: ['Winter DA. Biomechanics and Motor Control of Human Movement, 4e.'],
  };
}

export function jointWorkJ(momentSeries: number[], omegaSeries: number[], dt: number): { total: number; concentric: number; eccentric: number } {
  let total = 0, conc = 0, ecc = 0;
  const n = Math.min(momentSeries.length, omegaSeries.length);
  for (let i = 0; i < n; i++) {
    const p = momentSeries[i] * omegaSeries[i];
    const w = p * dt;
    total += w;
    if (w >= 0) conc += w; else ecc += w;
  }
  return { total, concentric: conc, eccentric: ecc };
}

export function buildJointWorkReadout(work: { total: number; concentric: number; eccentric: number }, joint: string): MathReadout {
  return {
    value: round(work.total, 1),
    units: 'J',
    interpretation: `Concentric ${fmt(work.concentric, 1)} J · Eccentric ${fmt(work.eccentric, 1)} J`,
    formula: 'W = \\int M \\cdot \\omega \\, dt',
    substitutions: `W_{${joint}} = \\sum_i M_i \\,\\omega_i \\,\\Delta t = ${fmt(work.total, 1)}\\,\\text{J}`,
    assumptions: ['Sample-and-hold integration over recorded movement.'],
    citations: ['Winter DA. Biomechanics and Motor Control, 4e.'],
  };
}

/**
 * Whole-body angular momentum L = Σ ( I_i ω_i + r_i × m_i v_i ).
 * `segments` provides per-segment inertia, angular velocity, COM offset from
 * whole-body COM and linear velocity. Returns scalar L (kg·m²/s) about the
 * vertical axis (3D cross product reduced to z-component).
 */
export interface AngMomentumSegment {
  inertia: number;          // kg·m²
  angularVel: number;       // rad/s
  mass: number;             // kg
  rx: number; ry: number;   // COM offset from body COM, m
  vx: number; vy: number;   // COM linear velocity, m/s
}

export function angularMomentumScalar(segments: AngMomentumSegment[]): number {
  let L = 0;
  for (const s of segments) {
    L += s.inertia * s.angularVel + (s.rx * s.vy - s.ry * s.vx) * s.mass;
  }
  return L;
}

export function buildAngularMomentumReadout(L: number, n: number): MathReadout {
  return {
    value: round(L, 3),
    units: 'kg·m²/s',
    interpretation:
      Math.abs(L) < 0.5 ? 'Near zero — body is angularly balanced' :
      Math.abs(L) < 2 ? 'Modest angular momentum (typical gait)' :
      'High angular momentum — high rotational task',
    formula: 'L = \\sum_i \\big( I_i\\omega_i + (\\vec{r}_i\\times m_i\\vec{v}_i)_z \\big)',
    substitutions: `L = ${fmt(L, 3)}\\,\\text{kg·m}^2/\\text{s} \\quad (n=${n}\\,\\text{segments})`,
    assumptions: ['Segment inertias from de Leva (1996); planar approximation.'],
    citations: ['Herr H, Popovic M. J Exp Biol 2008;211:467-481.'],
  };
}

// ---------------------------------------------------------------------------
// 7. Gait spatiotemporal.
// ---------------------------------------------------------------------------

export interface GaitSpatiotemporal {
  cadenceStepsPerMin: number;
  strideLengthM: number;
  strideTimeSec: number;
  stancePct: number;
  swingPct: number;
  doubleSupportPct: number;
  stepLengthSymmetryIndex: number;
  stepWidthM: number;
}

/**
 * Compute spatiotemporal parameters from heel-strike and toe-off events.
 * Each event has time (s), foot ('L'/'R'), and AP/ML position (m).
 */
export interface GaitEvent {
  time: number;
  type: 'HS' | 'TO';
  foot: 'L' | 'R';
  apM: number;  // anterior-posterior position
  mlM: number;  // mediolateral position
}

export function computeGaitSpatiotemporal(events: GaitEvent[]): GaitSpatiotemporal | null {
  const hsL = events.filter(e => e.type === 'HS' && e.foot === 'L');
  const hsR = events.filter(e => e.type === 'HS' && e.foot === 'R');
  if (hsL.length < 2 || hsR.length < 2) return null;

  const strideTimes: number[] = [];
  for (let i = 1; i < hsL.length; i++) strideTimes.push(hsL[i].time - hsL[i - 1].time);
  const strideTime = strideTimes.reduce((s, v) => s + v, 0) / strideTimes.length;
  const cadence = (2 * 60) / strideTime; // steps per minute

  const strideLens: number[] = [];
  for (let i = 1; i < hsL.length; i++) strideLens.push(Math.abs(hsL[i].apM - hsL[i - 1].apM));
  const strideLen = strideLens.reduce((s, v) => s + v, 0) / strideLens.length;

  // Step length symmetry index between alternating L→R and R→L step lengths.
  const sortedHs = [...hsL, ...hsR].sort((a, b) => a.time - b.time);
  const stepLens: { foot: 'L' | 'R'; len: number }[] = [];
  for (let i = 1; i < sortedHs.length; i++) {
    stepLens.push({ foot: sortedHs[i].foot, len: Math.abs(sortedHs[i].apM - sortedHs[i - 1].apM) });
  }
  const left = stepLens.filter(s => s.foot === 'L').reduce((s, v) => s + v.len, 0) / Math.max(1, stepLens.filter(s => s.foot === 'L').length);
  const right = stepLens.filter(s => s.foot === 'R').reduce((s, v) => s + v.len, 0) / Math.max(1, stepLens.filter(s => s.foot === 'R').length);
  const symmIdx = left + right > 0 ? (Math.abs(left - right) / ((left + right) / 2)) * 100 : 0;

  // Step width = mean ML distance between successive heel strikes.
  const widths: number[] = [];
  for (let i = 1; i < sortedHs.length; i++) widths.push(Math.abs(sortedHs[i].mlM - sortedHs[i - 1].mlM));
  const stepWidth = widths.reduce((s, v) => s + v, 0) / Math.max(1, widths.length);

  // Stance / swing / double support — approximate from per-foot HS→TO times.
  const stanceTimes: number[] = [];
  for (const foot of ['L', 'R'] as const) {
    const hs = events.filter(e => e.type === 'HS' && e.foot === foot);
    const to = events.filter(e => e.type === 'TO' && e.foot === foot);
    for (const h of hs) {
      const next = to.find(t => t.time > h.time);
      if (next) stanceTimes.push(next.time - h.time);
    }
  }
  const stancePct = stanceTimes.length ? (stanceTimes.reduce((s, v) => s + v, 0) / stanceTimes.length / strideTime) * 100 : 60;
  const swingPct = 100 - stancePct;
  const dsPct = Math.max(0, 2 * stancePct - 100);

  return {
    cadenceStepsPerMin: cadence,
    strideLengthM: strideLen,
    strideTimeSec: strideTime,
    stancePct,
    swingPct,
    doubleSupportPct: dsPct,
    stepLengthSymmetryIndex: symmIdx,
    stepWidthM: stepWidth,
  };
}

export function buildCadenceReadout(g: GaitSpatiotemporal): MathReadout {
  return {
    value: round(g.cadenceStepsPerMin, 0),
    units: 'steps/min',
    normativeRange: [100, 130],
    formula: 'cadence = \\dfrac{2 \\cdot 60}{T_{stride}}',
    substitutions: `cadence = \\dfrac{120}{${fmt(g.strideTimeSec, 2)}\\,\\text{s}} = ${fmt(g.cadenceStepsPerMin, 0)}\\,\\text{steps/min}`,
    assumptions: ['Two steps per stride; constant pace assumption.'],
    citations: ['Perry J. Gait Analysis: Normal & Pathological Function, 2e.'],
  };
}

export function buildStepSymmetryReadout(g: GaitSpatiotemporal): MathReadout {
  return {
    value: round(g.stepLengthSymmetryIndex, 1),
    units: '%',
    normativeRange: [0, 5],
    interpretation:
      g.stepLengthSymmetryIndex < 5 ? 'Symmetric step length' :
      g.stepLengthSymmetryIndex < 10 ? 'Mild asymmetry' :
      'Clinically significant step-length asymmetry',
    formula: 'SI = \\dfrac{\\lvert L - R \\rvert}{(L + R) / 2} \\cdot 100\\%',
    substitutions: `SI = ${fmt(g.stepLengthSymmetryIndex, 1)}\\%`,
    assumptions: ['Robinson SI (1987) symmetry index.'],
    citations: ['Robinson RO et al. JMPT 1987;10:172-176.'],
  };
}

// ---------------------------------------------------------------------------
// 8. GRF impulse / loading rate / impact-vs-active peak.
// ---------------------------------------------------------------------------

export interface GrfSeries {
  /** Time in seconds, monotonically increasing. */
  t: number[];
  /** Vertical GRF in N. */
  fz: number[];
  /** Anterior-posterior GRF in N (+ve = forward). */
  fx?: number[];
  /** Mediolateral GRF in N. */
  fy?: number[];
}

export interface GrfMetrics {
  impactPeakBW: number | null;
  activePeakBW: number;
  loadingRateBWperS: number;
  brakingImpulseNs: number;
  propulsiveImpulseNs: number;
  meanMlGrfBW: number;
}

export function computeGrfMetrics(series: GrfSeries, bodyWeightN: number): GrfMetrics {
  const n = series.t.length;
  if (n < 2 || bodyWeightN <= 0) {
    return { impactPeakBW: null, activePeakBW: 0, loadingRateBWperS: 0, brakingImpulseNs: 0, propulsiveImpulseNs: 0, meanMlGrfBW: 0 };
  }
  // Impact peak = first local max within first 50 ms; active peak = global max.
  let impactPeak: number | null = null;
  for (let i = 1; i < n - 1 && series.t[i] - series.t[0] < 0.05; i++) {
    if (series.fz[i] > series.fz[i - 1] && series.fz[i] > series.fz[i + 1]) {
      impactPeak = series.fz[i];
      break;
    }
  }
  const activePeak = Math.max(...series.fz);

  // Loading rate = slope from 20% to 80% of impact peak (or active peak).
  const ref = impactPeak ?? activePeak;
  const lo = 0.2 * ref, hi = 0.8 * ref;
  let tLo = -1, tHi = -1;
  for (let i = 0; i < n; i++) {
    if (tLo < 0 && series.fz[i] >= lo) tLo = series.t[i];
    if (tHi < 0 && series.fz[i] >= hi) tHi = series.t[i];
    if (tLo >= 0 && tHi >= 0) break;
  }
  const loadingRateNps = tHi > tLo && tLo >= 0 ? (hi - lo) / (tHi - tLo) : 0;

  // Braking & propulsive impulses from AP GRF.
  let braking = 0, propulsive = 0;
  if (series.fx) {
    for (let i = 1; i < n; i++) {
      const dt = series.t[i] - series.t[i - 1];
      const f = (series.fx[i] + series.fx[i - 1]) / 2;
      if (f < 0) braking += -f * dt; else propulsive += f * dt;
    }
  }

  // Mean ML GRF.
  let mlSum = 0;
  if (series.fy) for (const v of series.fy) mlSum += Math.abs(v);
  const meanMl = (series.fy?.length ?? 0) > 0 ? mlSum / (series.fy as number[]).length : 0;

  return {
    impactPeakBW: impactPeak != null ? impactPeak / bodyWeightN : null,
    activePeakBW: activePeak / bodyWeightN,
    loadingRateBWperS: loadingRateNps / bodyWeightN,
    brakingImpulseNs: braking,
    propulsiveImpulseNs: propulsive,
    meanMlGrfBW: meanMl / bodyWeightN,
  };
}

export function buildLoadingRateReadout(m: GrfMetrics, bodyWeightN: number): MathReadout {
  return {
    value: round(m.loadingRateBWperS, 1),
    units: 'BW/s',
    normativeRange: [40, 80],
    interpretation:
      m.loadingRateBWperS < 40 ? 'Low loading rate — soft landing' :
      m.loadingRateBWperS < 80 ? 'Within typical running range' :
      'High loading rate — tibial stress / impact injury risk',
    formula: 'LR = \\dfrac{F_{80\\%} - F_{20\\%}}{t_{80\\%} - t_{20\\%}} \\cdot \\dfrac{1}{BW}',
    substitutions: `LR = ${fmt(m.loadingRateBWperS, 1)}\\,\\text{BW/s} \\quad (BW = ${fmt(bodyWeightN, 0)}\\,\\text{N})`,
    assumptions: ['20-80% loading-rate window (Crowell & Davis 2011).'],
    citations: ['Crowell HP, Davis IS. Med Sci Sports Exerc 2011;43:296-302.'],
  };
}

export function buildBrakingImpulseReadout(m: GrfMetrics): MathReadout {
  return {
    value: round(m.brakingImpulseNs, 1),
    units: 'N·s',
    formula: 'I_{brake} = \\int_{F_x<0} F_x \\, dt',
    substitutions: `I_{brake} = ${fmt(m.brakingImpulseNs, 1)}\\,\\text{N·s}`,
    assumptions: ['Trapezoidal integration of negative AP GRF.'],
    citations: ['Munro CF, Miller DI, Fuglevand AJ. J Biomech 1987;20:147-155.'],
  };
}

// ---------------------------------------------------------------------------
// 9. Stability — XCoM dynamic margin, static margin, limits-of-stability cone.
// ---------------------------------------------------------------------------

export function extrapolatedCoM(comX: number, vCoMx: number, legLengthM: number): number {
  const omega0 = Math.sqrt(G / Math.max(0.05, legLengthM));
  return comX + vCoMx / omega0;
}

export interface StabilityInputs {
  /** COM position in the BoS plane (m). */
  comX: number;
  comY: number;
  /** COM linear velocity (m/s). */
  vx: number;
  vy: number;
  /** Effective leg length (m). */
  legLengthM: number;
  /** Convex hull of the base of support (m). */
  bosPolygon: { x: number; y: number }[];
}

export interface StabilityResult {
  staticMarginM: number;
  xcomX: number;
  xcomY: number;
  dynamicMarginM: number;
  losConeScorePct: number;
}

function distancePointToPolygonM(p: { x: number; y: number }, poly: { x: number; y: number }[]): number {
  if (poly.length < 2) return 0;
  // Signed distance: positive when inside (clockwise polygon).
  let minDist = Infinity;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi) inside = !inside;
    const A = p.x - xi, B = p.y - yi, C = xj - xi, D = yj - yi;
    const dot = A * C + B * D, lenSq = C * C + D * D;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
    const x = xi + t * C, y = yi + t * D;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < minDist) minDist = d;
  }
  return inside ? minDist : -minDist;
}

export function computeStability(inp: StabilityInputs): StabilityResult {
  const xcomX = extrapolatedCoM(inp.comX, inp.vx, inp.legLengthM);
  const xcomY = extrapolatedCoM(inp.comY, inp.vy, inp.legLengthM);
  const staticMargin = distancePointToPolygonM({ x: inp.comX, y: inp.comY }, inp.bosPolygon);
  const dynamicMargin = distancePointToPolygonM({ x: xcomX, y: xcomY }, inp.bosPolygon);
  // Limits-of-stability cone score: 100% when COM at BoS centroid, 0% at edge.
  let cx = 0, cy = 0;
  for (const p of inp.bosPolygon) { cx += p.x; cy += p.y; }
  cx /= Math.max(1, inp.bosPolygon.length);
  cy /= Math.max(1, inp.bosPolygon.length);
  const distFromCentre = Math.hypot(inp.comX - cx, inp.comY - cy);
  const meanRadius = inp.bosPolygon.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) /
    Math.max(1, inp.bosPolygon.length);
  const score = meanRadius > 0 ? Math.max(0, Math.min(100, 100 * (1 - distFromCentre / meanRadius))) : 100;
  return { staticMarginM: staticMargin, xcomX, xcomY, dynamicMarginM: dynamicMargin, losConeScorePct: score };
}

export function buildXcomReadout(s: StabilityResult, legLengthM: number): MathReadout {
  return {
    value: round(s.dynamicMarginM * 100, 1),
    units: 'cm',
    normativeRange: [3, 12],
    interpretation:
      s.dynamicMarginM < 0 ? 'XCoM outside BoS — falling / step required' :
      s.dynamicMarginM < 0.03 ? 'Marginal dynamic stability' :
      'Stable extrapolated CoM',
    formula: 'XCoM = CoM + \\dfrac{v_{CoM}}{\\sqrt{g/L}}',
    substitutions: `XCoM_x = ${fmt(s.xcomX, 3)}\\,\\text{m},\\;\\text{margin} = ${fmt(s.dynamicMarginM * 100, 1)}\\,\\text{cm}\\;(L=${fmt(legLengthM, 2)}\\,\\text{m})`,
    assumptions: ['Inverted-pendulum approximation about the standing leg.'],
    citations: ['Hof AL. Hum Mov Sci 2008;27:112-125.'],
  };
}

export function buildStaticMarginReadout(s: StabilityResult): MathReadout {
  return {
    value: round(s.staticMarginM * 100, 1),
    units: 'cm',
    normativeRange: [4, 15],
    interpretation:
      s.staticMarginM < 0 ? 'CoM outside BoS — unstable' :
      s.staticMarginM < 0.04 ? 'Narrow static margin' :
      'Comfortable static margin',
    formula: 'd_{static} = \\min_{e\\in BoS} \\lVert CoM - e \\rVert',
    substitutions: `d_{static} = ${fmt(s.staticMarginM * 100, 1)}\\,\\text{cm}`,
    assumptions: ['BoS = convex hull of foot contacts.'],
    citations: ['Pai YC, Patton J. J Biomech 1997;30:347-354.'],
  };
}

// ---------------------------------------------------------------------------
// 10. Lever / mechanical advantage + free-body diagram geometry.
// ---------------------------------------------------------------------------

export type LeverClass = 1 | 2 | 3;

export interface LeverAnalysis {
  leverClass: LeverClass;
  effortArmM: number;
  loadArmM: number;
  mechanicalAdvantage: number;
  interpretation: string;
}

/**
 * Classify a lever from the FBD geometry of the selected joint.
 * Inputs:
 *   - effortDistance: distance from fulcrum (joint) to muscle insertion (m)
 *   - loadDistance:   distance from fulcrum to external load (m)
 *   - relativeOrientation: 'opposite' if effort and load on opposite sides
 *     of the fulcrum (1st class); 'sameLoadFurther' for 2nd class;
 *     'sameEffortFurther' for 3rd class.
 */
export function classifyLever(
  effortDistance: number,
  loadDistance: number,
  relativeOrientation: 'opposite' | 'sameLoadFurther' | 'sameEffortFurther',
): LeverAnalysis {
  const cls: LeverClass = relativeOrientation === 'opposite' ? 1 : relativeOrientation === 'sameLoadFurther' ? 2 : 3;
  const ma = loadDistance > 0 ? effortDistance / loadDistance : 0;
  const interp = ma > 1
    ? 'MA > 1 → trades ROM/speed for force (force advantage)'
    : ma === 1
      ? 'MA = 1 → balanced'
      : 'MA < 1 → trades force for ROM/speed (most human joints are 3rd-class levers)';
  return { leverClass: cls, effortArmM: effortDistance, loadArmM: loadDistance, mechanicalAdvantage: ma, interpretation: interp };
}

export function buildLeverReadout(l: LeverAnalysis, joint: string): MathReadout {
  return {
    value: round(l.mechanicalAdvantage, 2),
    units: ':1',
    interpretation: `${l.leverClass}${['st','nd','rd'][l.leverClass - 1]}-class lever — ${l.interpretation}`,
    formula: 'MA = \\dfrac{\\text{effort arm}}{\\text{load arm}}',
    substitutions: `MA_{${joint}} = \\dfrac{${fmt(l.effortArmM * 100, 1)}\\,\\text{cm}}{${fmt(l.loadArmM * 100, 1)}\\,\\text{cm}} = ${fmt(l.mechanicalAdvantage, 2)}`,
    assumptions: ['Lever arms drawn from FBD geometry at current pose.'],
    citations: ['Hamill J, Knutzen KM. Biomechanical Basis of Human Movement, 4e.'],
  };
}

// ---------------------------------------------------------------------------
// 11. Inverse-dynamics walkthrough (Newton-Euler, single segment).
//    Fproximal = m·a + (Fdistal + W)
//    Mproximal = I·α + (Mdistal + r_distal × Fdistal + r_com × W)
// ---------------------------------------------------------------------------

export interface InverseDynamicsInputs {
  segmentMassKg: number;
  segmentInertiaKgM2: number;
  /** Linear acceleration of segment COM (m/s², horizontal & vertical). */
  ax: number; ay: number;
  /** Angular acceleration of segment (rad/s²). */
  alpha: number;
  /** Distal force applied to segment (N). */
  fxDistal: number; fyDistal: number;
  /** Distal moment (N·m). */
  mDistal: number;
  /** Vector from proximal end to COM (m). */
  rComX: number; rComY: number;
  /** Vector from proximal end to distal end (m). */
  rDistalX: number; rDistalY: number;
}

export interface InverseDynamicsStep {
  label: string;
  formula: string;
  substitutions: string;
  result: string;
}

export interface InverseDynamicsResult {
  fxProx: number; fyProx: number;
  mProx: number;
  steps: InverseDynamicsStep[];
}

export function inverseDynamicsSegment(inp: InverseDynamicsInputs): InverseDynamicsResult {
  const W = inp.segmentMassKg * G;
  const fxProx = inp.segmentMassKg * inp.ax - inp.fxDistal;
  const fyProx = inp.segmentMassKg * inp.ay + W - inp.fyDistal;
  const cross = (rx: number, ry: number, fx: number, fy: number) => rx * fy - ry * fx;
  const mProx = inp.segmentInertiaKgM2 * inp.alpha
    - inp.mDistal
    - cross(inp.rDistalX, inp.rDistalY, inp.fxDistal, inp.fyDistal)
    + cross(inp.rComX, inp.rComY, 0, -W);

  const steps: InverseDynamicsStep[] = [
    {
      label: 'Step 1 — Segment kinematics',
      formula: '\\vec{a}_{COM},\\;\\alpha',
      substitutions: `a = (${fmt(inp.ax,2)}, ${fmt(inp.ay,2)})\\,\\text{m/s}^2,\\;\\alpha = ${fmt(inp.alpha,2)}\\,\\text{rad/s}^2`,
      result: 'Linear & angular acceleration of segment.',
    },
    {
      label: 'Step 2 — Newton (linear)',
      formula: '\\vec{F}_{prox} = m\\vec{a} - \\vec{F}_{distal} - m\\vec{g}',
      substitutions: `F_{prox} = (${fmt(fxProx,1)}, ${fmt(fyProx,1)})\\,\\text{N}`,
      result: `Net proximal joint reaction = ${fmt(Math.hypot(fxProx, fyProx),1)} N.`,
    },
    {
      label: 'Step 3 — Euler (rotational)',
      formula: 'M_{prox} = I\\alpha - M_{distal} - \\vec{r}_{distal}\\times\\vec{F}_{distal} + \\vec{r}_{com}\\times m\\vec{g}',
      substitutions: `M_{prox} = ${fmt(mProx,2)}\\,\\text{N·m}`,
      result: `Net proximal moment = ${fmt(mProx,2)} N·m (${mProx > 0 ? 'extension' : 'flexion'}-equivalent).`,
    },
    {
      label: 'Step 4 — Convert to muscle force estimate',
      formula: 'F_{muscle} \\approx \\dfrac{M_{prox}}{r_{muscle}}',
      substitutions: 'Use Pandy/Delp/Arnold polynomial moment arm at this angle.',
      result: 'Estimated muscle line-of-action force.',
    },
  ];

  return { fxProx, fyProx, mProx, steps };
}

// ---------------------------------------------------------------------------
// 12. Free-body diagram geometry helper.
//    Returns the 2D segment, gravity vector, muscle line of action, joint
//    reaction vector, and labeled lever arms scaled to a target SVG box.
// ---------------------------------------------------------------------------

export interface FbdSegmentInputs {
  segmentLengthM: number;
  segmentMassKg: number;
  comProx: number;             // 0..1 along segment
  bodyWeightN: number;
  jointReactionN: number;      // |F_R|
  jointReactionAngleDeg: number; // direction of F_R (0 = +x, 90 = +y/up)
  muscleArmM: number;          // r_muscle (perpendicular distance)
  muscleAngleDeg: number;      // line-of-action angle vs segment (0 = along segment)
}

export interface FbdGeometry {
  segmentStart: { x: number; y: number };
  segmentEnd:   { x: number; y: number };
  comPoint:     { x: number; y: number };
  gravityVector: { from: { x: number; y: number }; to: { x: number; y: number }; mag: number };
  muscleLine:    { from: { x: number; y: number }; to: { x: number; y: number } };
  jointReactionVector: { from: { x: number; y: number }; to: { x: number; y: number }; mag: number };
  loadArmLabel:   { x: number; y: number; lengthM: number };
  effortArmLabel: { x: number; y: number; lengthM: number };
}

export function buildFbdGeometry(inp: FbdSegmentInputs, svg: { width: number; height: number; padding: number }): FbdGeometry {
  const { width, height, padding } = svg;
  const cw = width - padding * 2;
  const ch = height - padding * 2;
  // Segment drawn vertically, proximal end at bottom of usable area, distal end at top.
  const startY = padding + ch * 0.85;
  const endY = padding + ch * 0.15;
  const x = padding + cw * 0.55;
  const segLenPx = startY - endY;
  const comPx = startY - segLenPx * inp.comProx;
  const gravMagPx = Math.min(ch * 0.35, 20 + inp.segmentMassKg * 1.5);
  const reactionMagPx = Math.min(ch * 0.4, 20 + inp.jointReactionN * 0.04);
  const muscleAngleRad = (inp.muscleAngleDeg * Math.PI) / 180;
  const reactionAngleRad = (inp.jointReactionAngleDeg * Math.PI) / 180;
  const muscleLen = cw * 0.30;
  return {
    segmentStart: { x, y: startY },
    segmentEnd:   { x, y: endY },
    comPoint:     { x, y: comPx },
    gravityVector: {
      from: { x, y: comPx },
      to:   { x, y: comPx + gravMagPx },
      mag: inp.segmentMassKg * G,
    },
    muscleLine: {
      from: { x: x - muscleLen * Math.cos(muscleAngleRad), y: comPx + muscleLen * Math.sin(muscleAngleRad) * 0.4 },
      to:   { x: x + muscleLen * Math.cos(muscleAngleRad) * 0.6, y: comPx - muscleLen * 0.7 },
    },
    jointReactionVector: {
      from: { x, y: startY },
      to:   { x: x + reactionMagPx * Math.cos(reactionAngleRad), y: startY - reactionMagPx * Math.sin(reactionAngleRad) },
      mag: inp.jointReactionN,
    },
    loadArmLabel:   { x: x + cw * 0.05, y: comPx, lengthM: inp.segmentLengthM * inp.comProx },
    effortArmLabel: { x: x - cw * 0.05, y: startY - segLenPx * 0.15, lengthM: inp.muscleArmM },
  };
}

// ---------------------------------------------------------------------------
// 13. Helpers for downstream readouts.
// ---------------------------------------------------------------------------

/** Convert a force in BW (multiples of body weight) to Newtons. */
export function bwToN(bw: number, bodyWeightKg: number): number {
  return bw * bodyWeightKg * G;
}

export function bodyWeightN(bodyWeightKg: number): number {
  return bodyWeightKg * G;
}

export function nToBW(n: number, bodyWeightKg: number): number {
  const w = bodyWeightKg * G;
  return w > 0 ? n / w : 0;
}

export function buildJointReactionReadout(forceN: number, jointLabel: string, bodyWeightKg: number): MathReadout {
  const bw = nToBW(forceN, bodyWeightKg);
  return {
    value: round(forceN, 0),
    units: 'N',
    interpretation: `${fmt(bw, 2)} BW (body weight)`,
    formula: 'F_R = \\sqrt{F_x^2 + F_y^2 + F_z^2}',
    substitutions: `F_R^{${jointLabel}} = ${fmt(forceN, 0)}\\,\\text{N} = ${fmt(bw, 2)}\\,\\text{BW} \\;(BW = ${fmt(bodyWeightKg * G, 0)}\\,\\text{N})`,
    assumptions: ['Vector sum of compression, shear, tension components from postural force engine.'],
    citations: ['Bergmann G et al. J Biomech 2001;34:859-871.'],
  };
}

export function buildJointMomentReadout(M: number, joint: string): MathReadout {
  return {
    value: round(M, 1),
    units: 'N·m',
    formula: 'M_{net} = \\sum_i F_i \\cdot r_i',
    substitutions: `M_{${joint}} = ${fmt(M, 1)}\\,\\text{N·m}`,
    assumptions: ['Sum of muscle and external moments about joint axis.'],
    citations: ['Winter DA. Biomechanics and Motor Control, 4e.'],
  };
}

// ----------------------------------------------------------------------------
// Generic per-metric readout builders so EVERY visible number ships with a
// MathChip / derivation drawer (Task #294 review feedback).
// ----------------------------------------------------------------------------

export function buildJointAngleReadout(angleDeg: number, jointLabel: string, axisLabel: string, romDeg: [number, number]): MathReadout {
  return {
    value: round(angleDeg, 1),
    units: '°',
    normativeRange: romDeg,
    formula: '\\theta = \\cos^{-1}\\!\\Big(\\dfrac{\\vec{u}\\cdot\\vec{v}}{\\lVert\\vec u\\rVert\\,\\lVert\\vec v\\rVert}\\Big)',
    substitutions: `\\theta_{${jointLabel}}^{${axisLabel}} = ${fmt(angleDeg, 1)}^{\\circ}\\;(ROM\\;${romDeg[0]}\\!-\\!${romDeg[1]}^{\\circ})`,
    assumptions: ['Angle taken between proximal and distal segment vectors in the joint plane.'],
    citations: ['Norkin & White, Measurement of Joint Motion, 5e.'],
  };
}

export function buildStrideLengthReadout(g: GaitSpatiotemporal, statureM: number): MathReadout {
  const ratio = statureM > 0 ? g.strideLengthM / statureM : 0;
  return {
    value: round(g.strideLengthM, 2),
    units: 'm',
    normativeRange: [1.2, 1.6],
    interpretation: `${fmt(ratio, 2)} × stature`,
    formula: 'L_{stride} = x_{HS_2} - x_{HS_1}',
    substitutions: `L_{stride} = ${fmt(g.strideLengthM, 2)}\\,\\text{m} = ${fmt(ratio, 2)}\\,H`,
    assumptions: ['Distance between consecutive ipsilateral heel strikes.'],
    citations: ['Perry J & Burnfield JM. Gait Analysis: Normal & Pathological Function, 2e.'],
  };
}

export function buildStancePctReadout(g: GaitSpatiotemporal): MathReadout {
  return {
    value: round(g.stancePct, 1),
    units: '%',
    normativeRange: [58, 62],
    formula: '\\%_{stance} = \\dfrac{T_{HS\\to TO}}{T_{HS\\to HS_2}}\\times100',
    substitutions: `\\%_{stance} = ${fmt(g.stancePct, 1)}\\%`,
    assumptions: ['Stance = heel-strike to ipsilateral toe-off; cycle = HS→HS.'],
    citations: ['Perry J & Burnfield JM. Gait Analysis, 2e.'],
  };
}

export function buildSwingPctReadout(g: GaitSpatiotemporal): MathReadout {
  return {
    value: round(g.swingPct, 1),
    units: '%',
    normativeRange: [38, 42],
    formula: '\\%_{swing} = 100 - \\%_{stance}',
    substitutions: `\\%_{swing} = 100 - ${fmt(g.stancePct, 1)} = ${fmt(g.swingPct, 1)}\\%`,
    assumptions: ['Sum of stance and swing equals one cycle.'],
    citations: ['Perry J & Burnfield JM. Gait Analysis, 2e.'],
  };
}

export function buildDoubleSupportReadout(g: GaitSpatiotemporal): MathReadout {
  return {
    value: round(g.doubleSupportPct, 1),
    units: '%',
    normativeRange: [18, 24],
    formula: '\\%_{DS} = \\dfrac{T_{both\\,feet\\,grounded}}{T_{cycle}}\\times100',
    substitutions: `\\%_{DS} = ${fmt(g.doubleSupportPct, 1)}\\%`,
    assumptions: ['Two double-support phases per gait cycle (early and late stance).'],
    citations: ['Perry J & Burnfield JM. Gait Analysis, 2e.'],
  };
}

export function buildStepWidthReadout(g: GaitSpatiotemporal): MathReadout {
  return {
    value: round(g.stepWidthM * 100, 1),
    units: 'cm',
    normativeRange: [8, 16],
    formula: 'w_{step} = \\big|y_{HS_L} - y_{HS_R}\\big|',
    substitutions: `w_{step} = ${fmt(g.stepWidthM * 100, 1)}\\,\\text{cm}`,
    assumptions: ['Mediolateral distance between contralateral heel strikes; preferred 8-16 cm in adults.'],
    citations: ['Owings TM, Grabiner MD. Gait Posture 2004;20:26-29.'],
  };
}

export function buildActivePeakReadout(grf: GrfMetrics, bwN: number): MathReadout {
  return {
    value: round(grf.activePeakBW, 2),
    units: 'BW',
    normativeRange: [1.0, 2.5],
    formula: 'F_z^{active} = \\max_{t\\in mid\\,stance}F_z(t)',
    substitutions: `F_z^{active} = ${fmt(grf.activePeakBW, 2)}\\,\\text{BW} = ${fmt(grf.activePeakBW * bwN, 0)}\\,\\text{N}`,
    assumptions: ['Active (mid-stance) peak ≈ 1.0–1.2 BW walking, 2.0–2.5 BW running.'],
    citations: ['Nilsson J, Thorstensson A. Acta Physiol Scand 1989;136:217-227.'],
  };
}

export function buildImpactPeakReadout(grf: GrfMetrics, bwN: number): MathReadout {
  const peak = grf.impactPeakBW ?? 0;
  return {
    value: round(peak, 2),
    units: 'BW',
    normativeRange: [1.5, 2.5],
    formula: 'F_z^{impact} = \\max_{t<50ms}F_z(t)',
    substitutions: `F_z^{impact} = ${fmt(peak, 2)}\\,\\text{BW} = ${fmt(peak * bwN, 0)}\\,\\text{N}`,
    assumptions: ['Impact transient < 50 ms post heel-strike (rear-foot strikers).'],
    citations: ['Lieberman DE et al. Nature 2010;463:531-535.'],
  };
}

export function buildPropulsiveImpulseReadout(grf: GrfMetrics): MathReadout {
  return {
    value: round(grf.propulsiveImpulseNs, 1),
    units: 'N·s',
    formula: 'J_{prop} = \\int_{0}^{TO} F_x^{+}(t)\\,dt',
    substitutions: `J_{prop} = ${fmt(grf.propulsiveImpulseNs, 1)}\\,\\text{N·s}`,
    assumptions: ['Anterior (positive AP) GRF integrated over second half of stance.'],
    citations: ['Hamner SR, Delp SL. J Biomech 2013;46:780-787.'],
  };
}

export function buildMlGrfReadout(grf: GrfMetrics): MathReadout {
  return {
    value: round(grf.meanMlGrfBW, 3),
    units: 'BW',
    formula: '\\bar F_y = \\dfrac{1}{T}\\int_0^T F_y(t)\\,dt / W',
    substitutions: `\\bar F_y = ${fmt(grf.meanMlGrfBW, 3)}\\,\\text{BW}`,
    assumptions: ['Mean mediolateral GRF normalised to body weight; ≈ 0 in symmetric gait.'],
    citations: ['Winter DA. Biomechanics and Motor Control, 4e.'],
  };
}

export function buildLosConeReadout(scorePct: number): MathReadout {
  return {
    value: round(scorePct, 0),
    units: '%',
    normativeRange: [40, 100],
    formula: 'LoS = \\dfrac{\\text{achievable\\;CoP\\;excursion}}{\\text{theoretical\\;cone}}\\times100',
    substitutions: `LoS = ${fmt(scorePct, 0)}\\%`,
    assumptions: ['Limit-of-stability cone score; <40 % associated with elevated fall risk.'],
    citations: ['Pai YC, Patton J. J Biomech 1997;30:347-354.'],
  };
}

export function buildLegLengthReadout(legM: number, statureM: number): MathReadout {
  const frac = statureM > 0 ? legM / statureM : 0;
  return {
    value: round(legM, 2),
    units: 'm',
    formula: 'L_{leg} = L_{thigh} + L_{shank}',
    substitutions: `L_{leg} = ${fmt(legM, 2)}\\,\\text{m} \\approx ${fmt(frac, 2)}\\,H`,
    assumptions: ['Sum of de Leva thigh + shank lengths; ≈ 0.53 H in adults.'],
    citations: ['de Leva P. J Biomech 1996;29:1223-1230.'],
  };
}

export function buildConcentricWorkReadout(work: { concentric: number; total: number }, joint: string): MathReadout {
  const pct = work.total > 0 ? (work.concentric / work.total) * 100 : 0;
  return {
    value: round(work.concentric, 1),
    units: 'J',
    formula: 'W_{con} = \\int_{M\\omega>0} M(t)\\,\\omega(t)\\,dt',
    substitutions: `W_{con}^{${joint}} = ${fmt(work.concentric, 1)}\\,\\text{J}\\;(${fmt(pct, 0)}\\% \\text{ of cycle work})`,
    assumptions: ['Concentric phase: muscle shortens while producing positive moment.'],
    citations: ['Winter DA. Biomechanics and Motor Control, 4e.'],
  };
}

export function buildEccentricWorkReadout(work: { eccentric: number; total: number }, joint: string): MathReadout {
  const pct = work.total > 0 ? (Math.abs(work.eccentric) / work.total) * 100 : 0;
  return {
    value: round(work.eccentric, 1),
    units: 'J',
    formula: 'W_{ecc} = \\int_{M\\omega<0} M(t)\\,\\omega(t)\\,dt',
    substitutions: `W_{ecc}^{${joint}} = ${fmt(work.eccentric, 1)}\\,\\text{J}\\;(${fmt(pct, 0)}\\% \\text{ of cycle work, energy absorbed})`,
    assumptions: ['Eccentric phase: muscle lengthens under load; energy absorbed.'],
    citations: ['Lindstedt SL et al. News Physiol Sci 2001;16:256-261.'],
  };
}
