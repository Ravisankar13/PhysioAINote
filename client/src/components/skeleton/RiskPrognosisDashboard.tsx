import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  Copy,
  Check,
  Zap,
  Heart,
  Target,
  ArrowRight,
} from "lucide-react";
import type { ForceAnalysisResult, JointSurfaceForce } from "@/lib/posturalForceEngine";
import type { PathologyCompensationResult } from "@/lib/pathologyCompensationEngine";
import type { MuscleOverride } from "@/lib/muscleBiomechanicsEngine";
import type { IndividualMuscle } from "@/lib/muscleBiomechanicsEngine";
import { calculateFullBiomechanics, type BiomechanicsResult } from "@/lib/biomechanicsEngine";
import { calculateInjuryRisks, type InjuryRiskResult, type RiskLevel, type RiskScore, type BilateralRisk } from "@/lib/injuryRiskEngine";
import { generateTreatmentPlan, type TreatmentPlan, type PhaseBlock, type TreatmentInput } from "@/lib/treatmentPathwayEngine";
import type { CrossSystemCorrelationResult } from "@/lib/crossSystemCorrelation";

const CLINICAL_FORCE_THRESHOLDS = {
  lumbarCritical: 6400,
  kneePFCritical: 4000,
  generic: 5000,
};

interface ModelConfig {
  limbScales: { upperArm: number; forearm: number; thigh: number; shin: number; overall: number };
  spine: { cervicalLordosis: number; thoracicKyphosis: number; lumbarLordosis: number; scoliosis: number; forwardHead: number; lateralShift: number; cervicalRotation: number; cervicalLateralFlexion: number; thoracicRotation: number; lumbarRotation: number; flexion: number; lateralFlexion: number; lumbarScoliosis: number; thoracicScoliosis: number; cervicalScoliosis: number };
  neck: { flexion: number; extension: number; rotation: number; lateralFlexion: number; forwardHead: number };
  pelvis: { tilt: number; obliquity: number; rotation: number; drop: number; leftInnominateRotation: number; rightInnominateRotation: number };
  sacrum: { nutation: number; counternutation: number; torsion: number; lateralFlexion: number };
  leftHip: { flexion: number; extension: number; abduction: number; adduction: number; internalRotation: number; externalRotation: number; anteversion: number; neckShaftAngle: number };
  rightHip: { flexion: number; extension: number; abduction: number; adduction: number; internalRotation: number; externalRotation: number; anteversion: number; neckShaftAngle: number };
  leftKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  rightKnee: { flexion: number; varus: number; tibialTorsion: number; recurvatum: number; tibialSlope: number; patellaAlta: number };
  leftAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; forefootVarus: number; toeExtension: number; archHeight: number };
  rightAnkle: { dorsiflexion: number; plantarflexion: number; inversion: number; eversion: number; forefootVarus: number; toeExtension: number; archHeight: number };
  leftShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  rightShoulder: { flexion: number; abduction: number; internalRotation: number; externalRotation: number; retroversion: number; elevation: number; protraction: number; winging: number; clavicleLength: number };
  leftScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  rightScapula: { protraction: number; retraction: number; elevation: number; depression: number; upwardRotation: number; downwardRotation: number; anteriorTilt: number; posteriorTilt: number; winging: number; clavicleRotation: number };
  leftElbow: { flexion: number; carryingAngle: number; pronation: number };
  rightElbow: { flexion: number; carryingAngle: number; pronation: number };
  leftWrist: { deviation: number; flexion: number };
  rightWrist: { deviation: number; flexion: number };
}

interface RiskItem {
  id: string;
  label: string;
  region: string;
  score: number;
  level: RiskLevel;
  factors: string[];
}

interface PrognosticFactor {
  factor: string;
  impact: 'positive' | 'negative';
}

interface RiskPrognosisDashboardProps {
  forceAnalysis: ForceAnalysisResult | null;
  compensatedOverrides: Record<string, Partial<MuscleOverride>>;
  pathologyCompensation: PathologyCompensationResult | null;
  chainIntegrityScores: Map<string, { score: number; issues: string[]; problematicLinks: string[] }>;
  painMarkers: Array<{ id: string; nearestBone: string; anatomicalLabel?: string; type: string; description?: string; severity?: number }>;
  modelConfig: ModelConfig;
  bodyWeightKg?: number;
  muscleAnalysis?: IndividualMuscle[];
  correlationResult?: CrossSystemCorrelationResult | null;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  minimal: 'text-green-400 border-green-500/30 bg-green-500/10',
  low: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  moderate: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  high: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  critical: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const RISK_BAR_COLORS: Record<RiskLevel, string> = {
  minimal: 'bg-green-500',
  low: 'bg-blue-500',
  moderate: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function flattenBilateralRisk(name: string, region: string, bilateral: BilateralRisk): RiskItem[] {
  const items: RiskItem[] = [];
  if (bilateral.left.risk > 10) {
    items.push({ id: `${name}_left`, label: `Left ${name}`, region: `Left ${region}`, score: bilateral.left.risk, level: bilateral.left.level, factors: bilateral.factors });
  }
  if (bilateral.right.risk > 10) {
    items.push({ id: `${name}_right`, label: `Right ${name}`, region: `Right ${region}`, score: bilateral.right.risk, level: bilateral.right.level, factors: bilateral.factors });
  }
  return items;
}

function flattenRiskScore(name: string, region: string, risk: RiskScore): RiskItem | null {
  if (risk.risk <= 10) return null;
  return { id: name, label: name, region, score: risk.risk, level: risk.level, factors: risk.factors };
}

export default function RiskPrognosisDashboard({
  forceAnalysis,
  compensatedOverrides,
  pathologyCompensation,
  chainIntegrityScores,
  painMarkers,
  modelConfig,
  bodyWeightKg = 75,
  muscleAnalysis,
  correlationResult,
}: RiskPrognosisDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    risks: true,
    timeline: false,
    reinjury: false,
    load: false,
    prognostic: false,
  });
  const [copied, setCopied] = useState(false);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const injuryRiskResult = useMemo((): InjuryRiskResult | null => {
    try {
      const biomechanics = calculateFullBiomechanics(175, bodyWeightKg, modelConfig);
      return calculateInjuryRisks(biomechanics);
    } catch {
      return null;
    }
  }, [modelConfig, bodyWeightKg]);

  const treatmentPlan = useMemo((): TreatmentPlan | null => {
    if (!forceAnalysis) return null;
    try {
      const forces = forceAnalysis.joints || [];
      const muscles = muscleAnalysis || [];
      const markers = painMarkers.map(pm => ({
        id: pm.id,
        label: pm.anatomicalLabel || pm.nearestBone,
        severity: pm.severity || 5,
        region: pm.nearestBone,
        type: pm.type,
      }));
      const input: TreatmentInput = {
        correlationResult: correlationResult || null,
        muscles,
        forces,
        painMarkers: markers,
        chainIntegrityScores: chainIntegrityScores as Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>,
        bodyWeightKg,
      };
      return generateTreatmentPlan(input);
    } catch {
      return null;
    }
  }, [forceAnalysis, muscleAnalysis, painMarkers, chainIntegrityScores, bodyWeightKg, correlationResult]);

  const riskItems = useMemo((): RiskItem[] => {
    if (!injuryRiskResult) return [];
    const items: RiskItem[] = [];
    const jr = injuryRiskResult.jointRisks;

    const lumbar = jr.lumbarSpine;
    const discItem = flattenRiskScore('Disc Herniation', 'Lumbar Spine', lumbar.discHerniation);
    if (discItem) items.push(discItem);
    const facetItem = flattenRiskScore('Facet Joint Dysfunction', 'Lumbar Spine', lumbar.facetJointDysfunction);
    if (facetItem) items.push(facetItem);
    const spondyItem = flattenRiskScore('Spondylolisthesis', 'Lumbar Spine', lumbar.spondylolisthesis);
    if (spondyItem) items.push(spondyItem);
    const strainItem = flattenRiskScore('Muscle Strain', 'Lumbar Spine', lumbar.muscleStrain);
    if (strainItem) items.push(strainItem);

    items.push(...flattenBilateralRisk('ACL Injury', 'Knee', jr.knee.aclInjury));
    items.push(...flattenBilateralRisk('PF Syndrome', 'Knee', jr.knee.patellofemoralSyndrome));
    items.push(...flattenBilateralRisk('Meniscus Tear', 'Knee', jr.knee.meniscusTear));
    items.push(...flattenBilateralRisk('IT Band Syndrome', 'Knee', jr.knee.itBandSyndrome));
    items.push(...flattenBilateralRisk('Patellar Tendinopathy', 'Knee', jr.knee.patellarTendinopathy));

    items.push(...flattenBilateralRisk('Labral Tear', 'Hip', jr.hip.labralTear));
    items.push(...flattenBilateralRisk('FAI', 'Hip', jr.hip.femoralAcetabularImpingement));
    items.push(...flattenBilateralRisk('Hip Flexor Strain', 'Hip', jr.hip.hipFlexorStrain));
    items.push(...flattenBilateralRisk('Trochanteric Bursitis', 'Hip', jr.hip.greaterTrochanterBursitis));

    items.push(...flattenBilateralRisk('Lateral Ankle Sprain', 'Ankle', jr.ankle.lateralAnkleSprain));
    items.push(...flattenBilateralRisk('Achilles Tendinopathy', 'Ankle', jr.ankle.achillesTendinopathy));
    items.push(...flattenBilateralRisk('Plantar Fasciitis', 'Ankle', jr.ankle.plantarFasciitis));
    items.push(...flattenBilateralRisk('Tibial Stress Fracture', 'Ankle', jr.ankle.tibialStressFracture));

    items.push(...flattenBilateralRisk('Rotator Cuff Tear', 'Shoulder', jr.shoulder.rotatorCuffTear));
    items.push(...flattenBilateralRisk('Impingement', 'Shoulder', jr.shoulder.impingementSyndrome));
    items.push(...flattenBilateralRisk('Instability', 'Shoulder', jr.shoulder.instability));
    items.push(...flattenBilateralRisk('Biceps Tendinopathy', 'Shoulder', jr.shoulder.bicepsTendinopathy));

    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 5);
  }, [injuryRiskResult]);

  const overallRiskScore = injuryRiskResult?.overallRiskScore ?? 0;
  const overallRiskLevel = injuryRiskResult?.overallRiskLevel ?? 'minimal';

  const recoveryPhases = useMemo(() => {
    if (!treatmentPlan) {
      return [
        { label: 'Prevention & Optimization', weeks: '1-4', isCurrent: true },
        { label: 'Maintenance', weeks: '4+', isCurrent: false },
      ];
    }
    return treatmentPlan.phases.map((phase: PhaseBlock, i: number) => ({
      label: phase.label,
      weeks: phase.timeframe.replace(/^Weeks?\s*/i, ''),
      isCurrent: i === 0,
    }));
  }, [treatmentPlan]);

  const reinjuryProbability = useMemo(() => {
    let prob = 10;
    const pathologies = Object.values(compensatedOverrides).filter(
      v => v?.pathology && v.pathology !== 'none'
    );
    prob += pathologies.length * 8;

    if (pathologyCompensation) {
      prob += pathologyCompensation.romRestrictions.length * 3;
      prob += pathologyCompensation.posturalDeviations.length * 2;
      pathologyCompensation.clinicalFindings.forEach(f => {
        if (f.severity === 'severe') prob += 12;
        else if (f.severity === 'moderate') prob += 6;
      });
    }

    const chainIssues = Array.from(chainIntegrityScores.values()).filter(c => c.score < 70);
    prob += chainIssues.length * 5;

    prob += painMarkers.length * 4;

    if (injuryRiskResult) {
      const warnings = injuryRiskResult.thresholdWarnings;
      prob += warnings.jointWarnings.filter(w => w.severity === 'critical').length * 8;
      prob += warnings.jointWarnings.filter(w => w.severity === 'high').length * 4;
      prob += warnings.postureWarnings.filter(w => w.severity === 'high' || w.severity === 'critical').length * 3;
    }

    return clamp(prob, 5, 95);
  }, [compensatedOverrides, pathologyCompensation, chainIntegrityScores, painMarkers, injuryRiskResult]);

  const loadTolerance = useMemo(() => {
    if (!forceAnalysis?.joints?.length) return null;
    const sorted = [...forceAnalysis.joints].sort((a: JointSurfaceForce, b: JointSurfaceForce) => b.totalForce - a.totalForce);
    const worstJoint = sorted[0];
    const currentLoadNewtons = worstJoint.totalForce * bodyWeightKg * 9.81;

    let thresholdNewtons = CLINICAL_FORCE_THRESHOLDS.generic;
    const cat = worstJoint.category;
    if (cat.includes('lumbar') || cat.includes('thoracic') || cat.includes('cervical')) {
      thresholdNewtons = CLINICAL_FORCE_THRESHOLDS.lumbarCritical;
    } else if (cat.includes('knee')) {
      thresholdNewtons = CLINICAL_FORCE_THRESHOLDS.kneePFCritical;
    }

    const percent = clamp((currentLoadNewtons / thresholdNewtons) * 100, 0, 150);

    return {
      joint: worstJoint.label,
      currentN: Math.round(currentLoadNewtons),
      thresholdN: thresholdNewtons,
      currentBW: worstJoint.totalForce,
      percent,
      status: worstJoint.status,
    };
  }, [forceAnalysis, bodyWeightKg]);

  const prognosticFactors = useMemo((): PrognosticFactor[] => {
    const factors: PrognosticFactor[] = [];

    if (treatmentPlan) {
      for (const pf of treatmentPlan.clinicalReasoning.prognosticFactors) {
        if (pf.impact === 'positive') {
          factors.push({ factor: pf.factor, impact: 'positive' });
        } else if (pf.impact === 'negative') {
          factors.push({ factor: pf.factor, impact: 'negative' });
        }
      }
    }

    if (injuryRiskResult) {
      if (injuryRiskResult.riskFactors.biomechanical.length > 2) {
        factors.push({ factor: `${injuryRiskResult.riskFactors.biomechanical.length} biomechanical risk factors`, impact: 'negative' });
      }
      if (injuryRiskResult.riskFactors.postural.length > 2) {
        factors.push({ factor: `${injuryRiskResult.riskFactors.postural.length} postural risk factors`, impact: 'negative' });
      }
      if (injuryRiskResult.riskFactors.biomechanical.length === 0 && injuryRiskResult.riskFactors.postural.length === 0) {
        factors.push({ factor: 'No biomechanical/postural risk factors', impact: 'positive' });
      }
    }

    const goodChains = Array.from(chainIntegrityScores.values()).filter(c => c.score >= 80).length;
    const totalChains = chainIntegrityScores.size;
    if (totalChains > 0 && goodChains === totalChains) {
      factors.push({ factor: 'Good fascial chain integrity', impact: 'positive' });
    } else if (totalChains > 0 && goodChains < totalChains / 2) {
      factors.push({ factor: 'Poor fascial chain integrity', impact: 'negative' });
    }

    if (painMarkers.length === 0) {
      factors.push({ factor: 'No active pain markers', impact: 'positive' });
    } else if (painMarkers.length > 3) {
      factors.push({ factor: `Multiple pain regions (${painMarkers.length})`, impact: 'negative' });
    }

    return factors;
  }, [treatmentPlan, injuryRiskResult, chainIntegrityScores, painMarkers]);

  const exportSummary = useCallback(() => {
    const lines: string[] = [];
    lines.push('═══ RISK & PROGNOSIS SUMMARY ═══');
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(`Overall Risk: ${overallRiskScore}% (${overallRiskLevel})`);
    lines.push('');

    lines.push('── TOP INJURY RISKS ──');
    riskItems.forEach(r => {
      lines.push(`  ${r.label} (${r.region}): ${r.score}% (${r.level})`);
      r.factors.forEach(f => lines.push(`    • ${f}`));
    });
    lines.push('');

    lines.push('── RECOVERY TIMELINE ──');
    recoveryPhases.forEach(p => {
      lines.push(`  ${p.isCurrent ? '▶ ' : '  '}${p.label} (${p.weeks})`);
    });
    if (treatmentPlan) {
      lines.push(`  Overall: ${treatmentPlan.overallTimeline}`);
    }
    lines.push('');

    lines.push(`── RE-INJURY PROBABILITY: ${reinjuryProbability}% ──`);
    lines.push('');

    if (loadTolerance) {
      lines.push('── LOAD TOLERANCE ──');
      lines.push(`  ${loadTolerance.joint}: ${loadTolerance.currentN}N / ${loadTolerance.thresholdN}N threshold (${loadTolerance.percent.toFixed(0)}%)`);
      lines.push('');
    }

    lines.push('── PROGNOSTIC FACTORS ──');
    const positive = prognosticFactors.filter(f => f.impact === 'positive');
    const negative = prognosticFactors.filter(f => f.impact === 'negative');
    if (positive.length) {
      lines.push('  Positive:');
      positive.forEach(f => lines.push(`    ✓ ${f.factor}`));
    }
    if (negative.length) {
      lines.push('  Negative:');
      negative.forEach(f => lines.push(`    ✗ ${f.factor}`));
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [overallRiskScore, overallRiskLevel, riskItems, recoveryPhases, treatmentPlan, reinjuryProbability, loadTolerance, prognosticFactors]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Risk & Prognosis</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
          onClick={exportSummary}
        >
          {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Export'}
        </Button>
      </div>

      <div className={`rounded-lg border p-3 ${RISK_COLORS[overallRiskLevel]}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider opacity-80">Overall Risk</span>
          <Badge variant="outline" className={RISK_COLORS[overallRiskLevel]}>
            {overallRiskLevel}
          </Badge>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{overallRiskScore}%</span>
          <span className="text-xs opacity-60 mb-1">composite score</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${RISK_BAR_COLORS[overallRiskLevel]}`}
            style={{ width: `${overallRiskScore}%` }}
          />
        </div>
      </div>

      <Collapsible open={expandedSections.risks} onOpenChange={() => toggleSection('risks')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-medium text-gray-200">Top 5 Injury Risks</span>
          </div>
          {expandedSections.risks ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1.5 mt-1">
            {riskItems.length === 0 && (
              <div className="text-xs text-gray-500 px-2 py-2">No significant risks detected</div>
            )}
            {riskItems.map(risk => (
              <RiskItemRow key={risk.id} risk={risk} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="bg-gray-700/50" />

      <Collapsible open={expandedSections.timeline} onOpenChange={() => toggleSection('timeline')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-gray-200">Recovery Timeline</span>
          </div>
          {expandedSections.timeline ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 px-1">
            {treatmentPlan && (
              <div className="text-[10px] text-gray-400 mb-2 italic">Overall: {treatmentPlan.overallTimeline}</div>
            )}
            <div className="relative">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-700" />
              {recoveryPhases.map((phase, i) => (
                <div key={i} className="relative flex items-start gap-3 mb-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 z-10 ${
                    phase.isCurrent
                      ? 'bg-cyan-500 border-cyan-400'
                      : 'bg-gray-800 border-gray-600'
                  }`}>
                    {phase.isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${phase.isCurrent ? 'text-cyan-300' : 'text-gray-400'}`}>
                        {phase.label}
                      </span>
                      {phase.isCurrent && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-cyan-500/40 text-cyan-400">Current</Badge>}
                    </div>
                    <span className="text-[10px] text-gray-500">{phase.weeks}</span>
                  </div>
                  {i < recoveryPhases.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="bg-gray-700/50" />

      <Collapsible open={expandedSections.reinjury} onOpenChange={() => toggleSection('reinjury')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-gray-200">Re-injury Probability</span>
          </div>
          {expandedSections.reinjury ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 px-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={reinjuryProbability > 60 ? '#ef4444' : reinjuryProbability > 40 ? '#f59e0b' : reinjuryProbability > 20 ? '#3b82f6' : '#22c55e'}
                    strokeWidth="3"
                    strokeDasharray={`${reinjuryProbability}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{reinjuryProbability}%</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-300 mb-1">Based on:</div>
                <div className="space-y-0.5">
                  {Object.values(compensatedOverrides).filter(v => v?.pathology && v.pathology !== 'none').length > 0 && (
                    <div className="text-[10px] text-gray-400">• Active pathologies</div>
                  )}
                  {(pathologyCompensation?.posturalDeviations.length ?? 0) > 0 && (
                    <div className="text-[10px] text-gray-400">• Compensation patterns</div>
                  )}
                  {painMarkers.length > 0 && (
                    <div className="text-[10px] text-gray-400">• Current pain presentation</div>
                  )}
                  {(injuryRiskResult?.thresholdWarnings.jointWarnings.length ?? 0) > 0 && (
                    <div className="text-[10px] text-gray-400">• Clinical threshold warnings</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="bg-gray-700/50" />

      <Collapsible open={expandedSections.load} onOpenChange={() => toggleSection('load')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-gray-200">Load Tolerance</span>
          </div>
          {expandedSections.load ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 px-1">
            {loadTolerance ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-300">{loadTolerance.joint}</div>
                <div className="relative h-5 rounded-full bg-gray-700/50 overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                      loadTolerance.percent > 100 ? 'bg-red-500' :
                      loadTolerance.percent > 80 ? 'bg-orange-500' :
                      loadTolerance.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(loadTolerance.percent, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white drop-shadow">
                      {loadTolerance.currentN}N / {loadTolerance.thresholdN}N
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>0N</span>
                  <span className="text-white/50">Clinical Threshold</span>
                  <span>{loadTolerance.thresholdN}N</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 py-2">No force data available</div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="bg-gray-700/50" />

      <Collapsible open={expandedSections.prognostic} onOpenChange={() => toggleSection('prognostic')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-gray-200">Prognostic Factors</span>
          </div>
          {expandedSections.prognostic ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1 px-1">
            {prognosticFactors.length === 0 && (
              <div className="text-xs text-gray-500 py-1">No prognostic data available</div>
            )}
            {prognosticFactors.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                {f.impact === 'positive' ? (
                  <Heart className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Target className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-xs ${f.impact === 'positive' ? 'text-green-300' : 'text-red-300'}`}>
                  {f.factor}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function RiskItemRow({ risk }: { risk: RiskItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-gray-700/50 bg-gray-800/30 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-200 truncate">{risk.label}</span>
            <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${RISK_COLORS[risk.level]}`}>
              {risk.score}%
            </Badge>
          </div>
          <span className="text-[10px] text-gray-500">{risk.region}</span>
        </div>
        <div className="w-16 h-1.5 rounded-full bg-gray-700/50 overflow-hidden flex-shrink-0">
          <div
            className={`h-full rounded-full ${RISK_BAR_COLORS[risk.level]}`}
            style={{ width: `${risk.score}%` }}
          />
        </div>
        {expanded ? <ChevronUp className="w-3 h-3 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />}
      </button>
      {expanded && risk.factors.length > 0 && (
        <div className="px-2 pb-1.5 space-y-0.5 border-t border-gray-700/30">
          {risk.factors.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5 mt-1">
              <span className="text-[10px] text-yellow-500 mt-px">•</span>
              <span className="text-[10px] text-gray-400">{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
