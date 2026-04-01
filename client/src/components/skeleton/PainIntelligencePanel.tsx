import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Brain, Zap, Activity, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { PainMarker } from "@/components/skeleton/PureThreeGLBViewer";
import {
  MECHANISM_COLORS,
  findDermatomeForBone,
  findReferralsForBone,
  getNerveRootForRegion,
  type NerveRootProfile,
  type TriggerPointReferral,
} from "@/lib/neurologyMap";

interface BehaviourEffect {
  effect: 'better' | 'worse' | 'neutral';
  explanation: string;
}

interface BehaviourData {
  flexion?: BehaviourEffect;
  extension?: BehaviourEffect;
  loading?: BehaviourEffect;
  rest?: BehaviourEffect;
  morning?: BehaviourEffect;
  fatigue?: BehaviourEffect;
  aggravating_factors?: string[];
  easing_factors?: string[];
  clinical_pattern?: string;
  pattern_confidence?: string;
}

interface PainIntelligencePanelProps {
  marker: PainMarker;
  onClose: () => void;
  onHighlightBones?: (bones: string[]) => void;
  onClearHighlights?: () => void;
  onNerveRootLabels?: (labels: Array<{ root: string; boneName: string }>) => void;
  onReferralZoneBones?: (bones: string[]) => void;
}

const EFFECT_ICONS: Record<string, typeof ArrowUp> = {
  better: ArrowDown,
  worse: ArrowUp,
  neutral: Minus,
};

const EFFECT_COLORS: Record<string, string> = {
  better: 'text-green-400',
  worse: 'text-red-400',
  neutral: 'text-gray-400',
};

export default function PainIntelligencePanel({ marker, onClose, onHighlightBones, onClearHighlights, onNerveRootLabels, onReferralZoneBones }: PainIntelligencePanelProps) {
  const [behaviourData, setBehaviourData] = useState<BehaviourData | null>(null);
  const [behaviourLoading, setBehaviourLoading] = useState(false);
  const [behaviourExpanded, setBehaviourExpanded] = useState(false);
  const [neurologyExpanded, setNeurologyExpanded] = useState(true);

  const mechanism = marker.painMechanism || 'nociceptive';
  const mechInfo = MECHANISM_COLORS[mechanism];

  const nerveRoots = marker.nearestBone
    ? findDermatomeForBone(marker.nearestBone)
    : getNerveRootForRegion(marker.anatomicalLabel);

  const triggerReferrals = marker.nearestBone
    ? findReferralsForBone(marker.nearestBone)
    : [];

  useEffect(() => {
    if (mechanism === 'neuropathic' && nerveRoots.length > 0) {
      const bones = nerveRoots.flatMap(nr => nr.dermatome.skeletonBones);
      const unique = [...new Set(bones)];
      onHighlightBones?.(unique);

      const labels = nerveRoots.map(nr => ({
        root: nr.root,
        boneName: nr.dermatome.skeletonBones[0],
      }));
      onNerveRootLabels?.(labels);
      onReferralZoneBones?.([]);
    } else if (mechanism === 'myofascial' && triggerReferrals.length > 0) {
      const refBones = triggerReferrals.flatMap(tr => tr.referralZoneBones);
      const uniqueRef = [...new Set(refBones)];
      onReferralZoneBones?.(uniqueRef);

      onHighlightBones?.([]);
      onNerveRootLabels?.([]);
    } else {
      onHighlightBones?.([]);
      onNerveRootLabels?.([]);
      onReferralZoneBones?.([]);
    }
    return () => {
      if (onClearHighlights) onClearHighlights();
    };
  }, [marker.id, mechanism]);

  const loadBehaviour = async () => {
    if (behaviourData) {
      setBehaviourExpanded(!behaviourExpanded);
      return;
    }
    setBehaviourLoading(true);
    setBehaviourExpanded(true);
    try {
      const data = await apiRequest('/api/pain-intelligence/behaviour', 'POST', {
        anatomical_label: marker.anatomicalLabel,
        pain_mechanism: mechanism,
        marker_type: marker.type,
        description: marker.description,
        nearest_bone: marker.nearestBone,
        severity: marker.severity || 'moderate',
      });
      setBehaviourData(data as BehaviourData);
    } catch {
      setBehaviourData(null);
    } finally {
      setBehaviourLoading(false);
    }
  };

  const renderBehaviourRow = (label: string, data?: BehaviourEffect) => {
    if (!data) return null;
    const Icon = EFFECT_ICONS[data.effect] || Minus;
    const colorClass = EFFECT_COLORS[data.effect] || 'text-gray-400';
    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
        <div className="flex items-center gap-1.5 min-w-[80px]">
          <Icon className={`h-3 w-3 ${colorClass}`} />
          <span className="text-xs font-medium text-gray-300">{label}</span>
        </div>
        <span className="text-xs text-gray-400 leading-relaxed">{data.explanation}</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden w-[320px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-semibold text-white">Pain Intelligence</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-0.5 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className="text-[10px] px-2 py-0.5 border-0 font-semibold"
              style={{ backgroundColor: mechInfo.css + '33', color: mechInfo.css }}
            >
              {mechInfo.label}
            </Badge>
            <span className="text-[10px] text-gray-400">{mechInfo.badge}</span>
          </div>

          <div className="text-xs text-gray-300">
            <span className="font-medium text-white">{marker.anatomicalLabel}</span>
            {marker.description && (
              <span className="text-gray-400 ml-1">— {marker.description}</span>
            )}
          </div>

          {mechanism === 'neuropathic' && nerveRoots.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setNeurologyExpanded(!neurologyExpanded)}
                className="flex items-center gap-1.5 w-full text-left"
              >
                <Zap className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">Nerve Root Analysis</span>
                {neurologyExpanded ? <ChevronUp className="h-3 w-3 text-gray-400 ml-auto" /> : <ChevronDown className="h-3 w-3 text-gray-400 ml-auto" />}
              </button>
              {neurologyExpanded && (
                <div className="space-y-2 pl-1">
                  {nerveRoots.slice(0, 3).map((nr: NerveRootProfile) => (
                    <NerveRootCard key={nr.root} profile={nr} />
                  ))}
                </div>
              )}
            </div>
          )}

          {mechanism === 'myofascial' && triggerReferrals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">Trigger Point Referral</span>
              </div>
              <div className="space-y-2 pl-1">
                {triggerReferrals.slice(0, 3).map((tr: TriggerPointReferral) => (
                  <ReferralCard key={tr.muscleId} referral={tr} />
                ))}
              </div>
            </div>
          )}

          {(mechanism === 'nociceptive' || mechanism === 'central_sensitization') && nerveRoots.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Related Nerve Roots</span>
              <div className="flex flex-wrap gap-1">
                {nerveRoots.slice(0, 4).map(nr => (
                  <Badge key={nr.root} variant="outline" className="text-[10px] py-0 text-gray-300 border-gray-600">
                    {nr.root}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-700/50 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadBehaviour}
              disabled={behaviourLoading}
              className="w-full h-7 text-xs text-gray-300 hover:text-white hover:bg-gray-800 justify-between"
            >
              <div className="flex items-center gap-1.5">
                {behaviourLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                <span>Symptom Behaviour</span>
              </div>
              {behaviourExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {behaviourExpanded && behaviourData && (
              <div className="mt-2 space-y-1 bg-gray-800/50 rounded-lg p-2">
                {renderBehaviourRow('Flexion', behaviourData.flexion)}
                {renderBehaviourRow('Extension', behaviourData.extension)}
                {renderBehaviourRow('Loading', behaviourData.loading)}
                {renderBehaviourRow('Rest', behaviourData.rest)}
                {renderBehaviourRow('Morning', behaviourData.morning)}
                {renderBehaviourRow('Fatigue', behaviourData.fatigue)}

                {behaviourData.clinical_pattern && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500">Pattern:</span>
                    <Badge variant="outline" className="text-[10px] py-0 capitalize text-gray-300 border-gray-600">
                      {behaviourData.clinical_pattern}
                    </Badge>
                    {behaviourData.pattern_confidence && (
                      <span className="text-[10px] text-gray-500">({behaviourData.pattern_confidence})</span>
                    )}
                  </div>
                )}

                {behaviourData.aggravating_factors && behaviourData.aggravating_factors.length > 0 && (
                  <div className="pt-1.5">
                    <span className="text-[10px] text-red-400/80 uppercase tracking-wider">Aggravating</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {behaviourData.aggravating_factors.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] py-0 text-red-300 border-red-800/50 bg-red-900/20">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {behaviourData.easing_factors && behaviourData.easing_factors.length > 0 && (
                  <div className="pt-1.5">
                    <span className="text-[10px] text-green-400/80 uppercase tracking-wider">Easing</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {behaviourData.easing_factors.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] py-0 text-green-300 border-green-800/50 bg-green-900/20">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {behaviourExpanded && behaviourLoading && (
              <div className="flex items-center gap-2 justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-xs text-gray-400">Analyzing symptom behaviour...</span>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function NerveRootCard({ profile }: { profile: NerveRootProfile }) {
  return (
    <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-2 space-y-1">
      <div className="flex items-center gap-2">
        <Badge className="text-[10px] px-1.5 py-0 bg-blue-600/40 text-blue-200 border-0 font-bold">
          {profile.root}
        </Badge>
        <span className="text-[10px] text-blue-300">{profile.dermatome.sensoryTerritory}</span>
      </div>
      <div className="text-[10px] text-gray-400">
        <span className="text-gray-500">Motor:</span> {profile.myotome.action}
      </div>
      {profile.dermatome.reflex && (
        <div className="text-[10px] text-gray-400">
          <span className="text-gray-500">Reflex:</span> {profile.dermatome.reflex}
        </div>
      )}
      <div className="text-[10px] text-gray-400">
        <span className="text-gray-500">Test:</span> {profile.myotome.mrcTestInstruction}
      </div>
      {profile.dermatome.commonEntrapment && (
        <div className="text-[10px] text-yellow-400/80">
          ⚠ {profile.dermatome.commonEntrapment}
        </div>
      )}
    </div>
  );
}

function ReferralCard({ referral }: { referral: TriggerPointReferral }) {
  return (
    <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-2 space-y-1">
      <span className="text-[10px] font-semibold text-orange-300">{referral.muscleName}</span>
      <div className="text-[10px] text-gray-400">{referral.referralDescription}</div>
      {referral.commonCauses.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {referral.commonCauses.map((c, i) => (
            <Badge key={i} variant="outline" className="text-[9px] py-0 text-orange-300/70 border-orange-700/40">
              {c}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
