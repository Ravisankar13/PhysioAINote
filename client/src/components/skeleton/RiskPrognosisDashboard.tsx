import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import type { MuscleOverride, PathologyType } from "@/lib/muscleBiomechanicsEngine";

type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'critical';

interface RiskItem {
  id: string;
  label: string;
  region: string;
  score: number;
  level: RiskLevel;
  factors: string[];
}

interface RecoveryPhase {
  label: string;
  weeks: string;
  isCurrent: boolean;
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
  modelConfig: Record<string, any>;
  bodyWeightKg?: number;
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

function getRiskLevel(score: number): RiskLevel {
  if (score < 20) return 'minimal';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'critical';
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export default function RiskPrognosisDashboard({
  forceAnalysis,
  compensatedOverrides,
  pathologyCompensation,
  chainIntegrityScores,
  painMarkers,
  modelConfig,
  bodyWeightKg = 75,
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

  const riskItems = useMemo((): RiskItem[] => {
    const risks: RiskItem[] = [];
    const joints = forceAnalysis?.joints || [];
    const spine = modelConfig?.spine || {};
    const pelvis = modelConfig?.pelvis || {};
    const leftKnee = modelConfig?.leftKnee || {};
    const rightKnee = modelConfig?.rightKnee || {};
    const leftHip = modelConfig?.leftHip || {};
    const rightHip = modelConfig?.rightHip || {};
    const leftAnkle = modelConfig?.leftAnkle || {};
    const rightAnkle = modelConfig?.rightAnkle || {};
    const leftShoulder = modelConfig?.leftShoulder || {};
    const rightShoulder = modelConfig?.rightShoulder || {};

    const pathologyCount = Object.values(compensatedOverrides).filter(
      v => v?.pathology && v.pathology !== 'none'
    ).length;
    const hasCompensation = pathologyCompensation && pathologyCompensation.clinicalFindings.length > 0;

    const lumbarForces = joints.filter((j: JointSurfaceForce) => j.category === 'lumbar_spine');
    const maxLumbarLoad = lumbarForces.reduce((max: number, j: JointSurfaceForce) => Math.max(max, j.totalForce), 0);
    let discRisk = 0;
    const discFactors: string[] = [];
    if (maxLumbarLoad > 1.5) { discRisk += 25; discFactors.push(`High lumbar loading (${maxLumbarLoad.toFixed(1)}× BW)`); }
    if (Math.abs(spine.lumbarLordosis || 0) > 20) { discRisk += 15; discFactors.push('Excessive lumbar lordosis'); }
    if (Math.abs(spine.flexion || 0) > 30) { discRisk += 20; discFactors.push('Significant forward flexion'); }
    if (Math.abs(spine.scoliosis || 0) > 10) { discRisk += 10; discFactors.push('Scoliotic deviation'); }
    const spinePathology = Object.entries(compensatedOverrides).filter(([k]) => k.includes('spine') || k.includes('erector'));
    if (spinePathology.some(([, v]) => v?.pathology && v.pathology !== 'none')) { discRisk += 20; discFactors.push('Spinal muscle pathology'); }
    if (discRisk > 0) {
      risks.push({ id: 'disc_herniation', label: 'Lumbar Disc Risk', region: 'Lumbar Spine', score: clamp(discRisk, 0, 100), level: getRiskLevel(discRisk), factors: discFactors });
    }

    for (const side of ['left', 'right'] as const) {
      const knee = side === 'left' ? leftKnee : rightKnee;
      const hip = side === 'left' ? leftHip : rightHip;
      const sideLabel = side === 'left' ? 'Left' : 'Right';
      let aclRisk = 0;
      const aclFactors: string[] = [];
      if ((knee.varus || 0) < -10) { aclRisk += 30; aclFactors.push('Dynamic knee valgus'); }
      if ((knee.flexion || 0) > 60) { aclRisk += 15; aclFactors.push('Deep knee flexion'); }
      const quadKey = `quad_${side[0]}`;
      const hamKey = `calf_${side[0]}`;
      const quadOverride = compensatedOverrides[quadKey];
      const hamOverride = compensatedOverrides[hamKey];
      if (quadOverride?.tension && quadOverride.tension > 70 && (!hamOverride?.tension || hamOverride.tension < 40)) {
        aclRisk += 20; aclFactors.push('Quad-dominant activation');
      }
      const gluteKey = `glute_${side[0]}`;
      if (compensatedOverrides[gluteKey]?.pathology === 'weakness') {
        aclRisk += 15; aclFactors.push('Gluteal weakness');
      }
      if (aclRisk > 0) {
        risks.push({ id: `acl_${side}`, label: `${sideLabel} ACL Risk`, region: `${sideLabel} Knee`, score: clamp(aclRisk, 0, 100), level: getRiskLevel(aclRisk), factors: aclFactors });
      }

      let shoulderRisk = 0;
      const shoulderFactors: string[] = [];
      const shoulder = side === 'left' ? leftShoulder : rightShoulder;
      if (Math.abs(shoulder.abduction || 0) > 60 || Math.abs(shoulder.flexion || 0) > 60) {
        shoulderRisk += 15; shoulderFactors.push('Elevated arm position');
      }
      const scapKey = `scapula_${side[0]}`;
      if (compensatedOverrides[scapKey]?.pathology && compensatedOverrides[scapKey]?.pathology !== 'none') {
        shoulderRisk += 20; shoulderFactors.push('Scapular dysfunction');
      }
      const shoulderForces = joints.filter((j: JointSurfaceForce) => j.category === `${side}_shoulder`);
      const maxShoulderLoad = shoulderForces.reduce((max: number, j: JointSurfaceForce) => Math.max(max, j.totalForce), 0);
      if (maxShoulderLoad > 1.0) { shoulderRisk += 15; shoulderFactors.push('High shoulder loading'); }
      if (shoulderRisk > 0) {
        risks.push({ id: `shoulder_${side}`, label: `${sideLabel} Rotator Cuff Risk`, region: `${sideLabel} Shoulder`, score: clamp(shoulderRisk, 0, 100), level: getRiskLevel(shoulderRisk), factors: shoulderFactors });
      }

      let ankleRisk = 0;
      const ankleFactors: string[] = [];
      const ankle = side === 'left' ? leftAnkle : rightAnkle;
      if ((ankle.inversion || 0) > 15) { ankleRisk += 25; ankleFactors.push('Excessive inversion'); }
      if ((ankle.dorsiflexion || 0) < 5 && (ankle.dorsiflexion || 0) !== 0) { ankleRisk += 15; ankleFactors.push('Limited dorsiflexion'); }
      if (ankleRisk > 0) {
        risks.push({ id: `ankle_${side}`, label: `${sideLabel} Ankle Sprain Risk`, region: `${sideLabel} Ankle`, score: clamp(ankleRisk, 0, 100), level: getRiskLevel(ankleRisk), factors: ankleFactors });
      }

      let hipRisk = 0;
      const hipFactors: string[] = [];
      if ((hip.flexion || 0) > 90) { hipRisk += 15; hipFactors.push('Deep hip flexion'); }
      if (Math.abs(hip.internalRotation || 0) > 30) { hipRisk += 15; hipFactors.push('Excessive hip rotation'); }
      if (compensatedOverrides[gluteKey]?.pathology && compensatedOverrides[gluteKey]?.pathology !== 'none') {
        hipRisk += 20; hipFactors.push('Gluteal pathology');
      }
      if (hipRisk > 0) {
        risks.push({ id: `hip_${side}`, label: `${sideLabel} Hip Risk`, region: `${sideLabel} Hip`, score: clamp(hipRisk, 0, 100), level: getRiskLevel(hipRisk), factors: hipFactors });
      }
    }

    if (hasCompensation) {
      for (const finding of pathologyCompensation!.clinicalFindings) {
        let compRisk = finding.severity === 'severe' ? 40 : finding.severity === 'moderate' ? 25 : 10;
        compRisk += pathologyCount * 5;
        risks.push({
          id: `comp_${finding.muscleSource}`,
          label: `${finding.title} Compensation`,
          region: finding.muscleSource,
          score: clamp(compRisk, 0, 100),
          level: getRiskLevel(compRisk),
          factors: [finding.description],
        });
      }
    }

    risks.sort((a, b) => b.score - a.score);
    return risks.slice(0, 8);
  }, [forceAnalysis, compensatedOverrides, pathologyCompensation, modelConfig]);

  const overallRiskScore = useMemo(() => {
    if (riskItems.length === 0) return 0;
    const topScores = riskItems.slice(0, 5);
    return Math.round(topScores.reduce((sum, r) => sum + r.score, 0) / topScores.length);
  }, [riskItems]);
  const overallRiskLevel = getRiskLevel(overallRiskScore);

  const recoveryTimeline = useMemo((): RecoveryPhase[] => {
    const pathologyCount = Object.values(compensatedOverrides).filter(
      v => v?.pathology && v.pathology !== 'none'
    ).length;
    const hasSevere = pathologyCompensation?.clinicalFindings.some(f => f.severity === 'severe');
    const hasModerate = pathologyCompensation?.clinicalFindings.some(f => f.severity === 'moderate');

    if (pathologyCount === 0 && painMarkers.length === 0) {
      return [
        { label: 'Prevention', weeks: '1-2', isCurrent: true },
        { label: 'Optimization', weeks: '3-6', isCurrent: false },
        { label: 'Maintenance', weeks: '6+', isCurrent: false },
      ];
    }

    if (hasSevere) {
      return [
        { label: 'Acute Protection', weeks: '0-2', isCurrent: true },
        { label: 'Early Loading', weeks: '2-6', isCurrent: false },
        { label: 'Progressive Loading', weeks: '6-12', isCurrent: false },
        { label: 'Return to Activity', weeks: '12-16', isCurrent: false },
        { label: 'Maintenance', weeks: '16+', isCurrent: false },
      ];
    }

    if (hasModerate || pathologyCount > 2) {
      return [
        { label: 'Acute Management', weeks: '0-1', isCurrent: true },
        { label: 'Subacute Loading', weeks: '1-4', isCurrent: false },
        { label: 'Progressive Rehab', weeks: '4-8', isCurrent: false },
        { label: 'Return to Activity', weeks: '8-12', isCurrent: false },
      ];
    }

    return [
      { label: 'Active Recovery', weeks: '0-1', isCurrent: true },
      { label: 'Progressive Loading', weeks: '1-3', isCurrent: false },
      { label: 'Return to Activity', weeks: '3-6', isCurrent: false },
    ];
  }, [compensatedOverrides, pathologyCompensation, painMarkers]);

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

    const highForceJoints = forceAnalysis?.joints?.filter((j: JointSurfaceForce) => j.status === 'very_high' || j.status === 'high') || [];
    prob += highForceJoints.length * 2;

    return clamp(prob, 5, 95);
  }, [compensatedOverrides, pathologyCompensation, chainIntegrityScores, painMarkers, forceAnalysis]);

  const loadTolerance = useMemo(() => {
    if (!forceAnalysis?.joints?.length) return null;
    const sorted = [...forceAnalysis.joints].sort((a: JointSurfaceForce, b: JointSurfaceForce) => b.totalForce - a.totalForce);
    const worstJoint = sorted[0];
    const currentLoad = worstJoint.totalForce;
    const threshold = worstJoint.status === 'very_high' ? 3.0 : worstJoint.status === 'high' ? 2.5 : 2.0;
    return {
      joint: worstJoint.label,
      currentBW: currentLoad,
      thresholdBW: threshold,
      percent: clamp((currentLoad / threshold) * 100, 0, 150),
      status: worstJoint.status,
    };
  }, [forceAnalysis]);

  const prognosticFactors = useMemo((): PrognosticFactor[] => {
    const factors: PrognosticFactor[] = [];

    const pathologies = Object.entries(compensatedOverrides).filter(
      ([, v]) => v?.pathology && v.pathology !== 'none'
    );
    if (pathologies.length === 0) {
      factors.push({ factor: 'No active pathology', impact: 'positive' });
    } else if (pathologies.length > 3) {
      factors.push({ factor: `Multiple pathologies (${pathologies.length} regions)`, impact: 'negative' });
    }

    const highTensionCount = Object.values(compensatedOverrides).filter(v => (v?.tension ?? 50) > 75).length;
    if (highTensionCount > 3) {
      factors.push({ factor: 'Widespread muscle tension', impact: 'negative' });
    }

    if (pathologyCompensation) {
      if (pathologyCompensation.posturalDeviations.length > 3) {
        factors.push({ factor: 'Multiple postural compensations', impact: 'negative' });
      }
      if (pathologyCompensation.romRestrictions.length > 2) {
        factors.push({ factor: `ROM restrictions (${pathologyCompensation.romRestrictions.length} joints)`, impact: 'negative' });
      }
      if (pathologyCompensation.clinicalFindings.every(f => f.severity === 'mild')) {
        factors.push({ factor: 'All findings mild severity', impact: 'positive' });
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

    const highLoadJoints = forceAnalysis?.joints?.filter((j: JointSurfaceForce) => j.status === 'very_high') || [];
    if (highLoadJoints.length === 0) {
      factors.push({ factor: 'No critically loaded joints', impact: 'positive' });
    } else {
      factors.push({ factor: `${highLoadJoints.length} joint(s) at critical load`, impact: 'negative' });
    }

    const spine = modelConfig?.spine || {};
    if (Math.abs(spine.forwardHead || 0) < 5 && Math.abs(spine.thoracicKyphosis || 0) < 15 && Math.abs(spine.lumbarLordosis || 0) < 15) {
      factors.push({ factor: 'Good spinal alignment', impact: 'positive' });
    }

    return factors;
  }, [compensatedOverrides, pathologyCompensation, chainIntegrityScores, painMarkers, forceAnalysis, modelConfig]);

  const exportSummary = useCallback(() => {
    const lines: string[] = [];
    lines.push('═══ RISK & PROGNOSIS SUMMARY ═══');
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(`Overall Risk: ${overallRiskScore}% (${overallRiskLevel})`);
    lines.push('');

    lines.push('── TOP INJURY RISKS ──');
    riskItems.forEach(r => {
      lines.push(`  ${r.label}: ${r.score}% (${r.level})`);
      r.factors.forEach(f => lines.push(`    • ${f}`));
    });
    lines.push('');

    lines.push('── RECOVERY TIMELINE ──');
    recoveryTimeline.forEach(p => {
      lines.push(`  ${p.isCurrent ? '▶ ' : '  '}${p.label} (Wk ${p.weeks})`);
    });
    lines.push('');

    lines.push(`── RE-INJURY PROBABILITY: ${reinjuryProbability}% ──`);
    lines.push('');

    if (loadTolerance) {
      lines.push('── LOAD TOLERANCE ──');
      lines.push(`  ${loadTolerance.joint}: ${loadTolerance.currentBW.toFixed(1)}× BW / ${loadTolerance.thresholdBW.toFixed(1)}× BW threshold (${loadTolerance.percent.toFixed(0)}%)`);
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
  }, [overallRiskScore, overallRiskLevel, riskItems, recoveryTimeline, reinjuryProbability, loadTolerance, prognosticFactors]);

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
            <span className="text-xs font-medium text-gray-200">Injury Risks ({riskItems.length})</span>
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
            <div className="relative">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-700" />
              {recoveryTimeline.map((phase, i) => (
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
                    <span className="text-[10px] text-gray-500">Week {phase.weeks}</span>
                  </div>
                  {i < recoveryTimeline.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />}
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
                  {Array.from(chainIntegrityScores.values()).some(c => c.score < 70) && (
                    <div className="text-[10px] text-gray-400">• Chain integrity deficits</div>
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
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                    style={{ left: '100%', transform: 'translateX(-1px)' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white drop-shadow">
                      {loadTolerance.currentBW.toFixed(1)}× / {loadTolerance.thresholdBW.toFixed(1)}× BW
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>0×</span>
                  <span className="text-white/50">Threshold</span>
                  <span>{loadTolerance.thresholdBW.toFixed(1)}×</span>
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
