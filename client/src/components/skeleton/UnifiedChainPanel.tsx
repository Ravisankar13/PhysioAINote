import { useState, useCallback } from "react";
import {
  GitBranch,
  Activity,
  Shield,
  AlertTriangle,
  ChevronDown,
  Dumbbell,
  X,
  Zap,
  Lightbulb,
  MapPin,
  Target,
  ChevronRight,
  Network,
  Eye,
  EyeOff,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KINETIC_CHAINS, CHAIN_BONE_MAPPING } from "@/lib/kineticChainExplorer";
import type { KineticChainDefinition } from "@/lib/kineticChainExplorer";
import { MYOFASCIAL_CHAINS, mapJointIdToMuscleIds, type ChainRecommendation, type PainTensionContributor } from "@/lib/myofascialChains";

type TabId = 'explorer' | 'tension' | 'treatments';

interface SelectedNodeDetails {
  state: {
    label: string;
    tension: number;
    activation: string;
    state: string;
    description: string;
  };
  membership: { id: string; name: string; color: string }[];
  propState: {
    totalChainTension: number;
    totalChainActivation: number;
    chainEffects: { chainName: string; sourceMuscle: string; tensionDelta: number }[];
    slingEffects: { slingName: string; sourceMuscle: string; tensionDelta: number }[];
  } | null | undefined;
}

export interface UnifiedChainPanelProps {
  chainIntegrityScores: Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>;
  wholeBodyScore: { score: number; level: string; description: string };
  chainEffects: { chainId: string; avgTension: number }[];
  propagationDeltas: Record<string, number>;
  painMarkers: { id: string; nearestBone: string; anatomicalLabel?: string; type: string }[];
  correlationResult: { painCorrelations: { markerId: string; markerLabel: string; severity: number; relatedChains: { chainId: string; relevanceReason: string }[] }[] } | null;
  manualChainTensions: Record<string, number>;
  setManualChainTensions: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  baseMuscleTensions: { tensions: Record<string, number> };
  chainRecommendations: ChainRecommendation[];
  selectedChainNode: { chainId: string; muscleId: string; chainName: string } | null;
  setSelectedChainNode: (v: { chainId: string; muscleId: string; chainName: string } | null) => void;
  selectedNodeDetails: SelectedNodeDetails | null;
  activeChainIds: string[];
  setActiveChainIds: (fn: (prev: string[]) => string[]) => void;
  painAffectedChainIds: string[];
  showPropagation: boolean;
  setShowPropagation: (fn: (prev: boolean) => boolean) => void;
  onClose: () => void;
  onTensionTabActive: (active: boolean) => void;
  painTensionContributors: PainTensionContributor[];
  selectedChainId: string | null;
  setSelectedChainId: (fn: (prev: string | null) => string | null) => void;
}

const getIntegrityColor = (score: number) => score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
const getIntegrityLabel = (score: number) => score >= 80 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Poor' : 'Critical';

export default function UnifiedChainPanel({
  chainIntegrityScores,
  wholeBodyScore,
  chainEffects,
  propagationDeltas,
  painMarkers,
  correlationResult,
  manualChainTensions,
  setManualChainTensions,
  baseMuscleTensions,
  chainRecommendations,
  selectedChainNode,
  setSelectedChainNode,
  selectedNodeDetails,
  activeChainIds,
  setActiveChainIds,
  painAffectedChainIds,
  showPropagation,
  setShowPropagation,
  onClose,
  onTensionTabActive,
  painTensionContributors,
  selectedChainId,
  setSelectedChainId,
}: UnifiedChainPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('explorer');
  const [chainIntegrityMode, setChainIntegrityMode] = useState(false);
  const [expandedChainIntegrity, setExpandedChainIntegrity] = useState<string | null>(null);
  const [expandedChainLink, setExpandedChainLink] = useState<string | null>(null);
  const [showRecommendationDetails, setShowRecommendationDetails] = useState(false);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    onTensionTabActive(tab === 'tension');
  }, [onTensionTabActive]);

  const baseTensions = baseMuscleTensions.tensions;
  const hasManualTensions = Object.keys(manualChainTensions).length > 0;

  const originalTensions = (() => {
    if (!hasManualTensions) return baseTensions;
    const orig: Record<string, number> = { ...baseTensions };
    for (const key of Object.keys(manualChainTensions)) {
      delete orig[key];
    }
    return orig;
  })();

  return (
    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg px-3 py-2.5 z-10 w-[320px] max-h-[calc(100%-60px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-white">Chains & Tension</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex gap-0.5 mb-2 bg-white/5 rounded p-0.5">
        {([
          { id: 'explorer' as TabId, label: 'Explorer', icon: GitBranch },
          { id: 'tension' as TabId, label: 'Tension', icon: Activity },
          { id: 'treatments' as TabId, label: 'Treatments', icon: Target },
        ]).map(tab => (
          <button
            key={tab.id}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[8px] font-medium transition-colors ${activeTab === tab.id ? 'bg-emerald-500/30 text-emerald-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <tab.icon className="h-2.5 w-2.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'explorer' && (
        <ExplorerTab
          chainIntegrityMode={chainIntegrityMode}
          setChainIntegrityMode={setChainIntegrityMode}
          chainIntegrityScores={chainIntegrityScores}
          expandedChainIntegrity={expandedChainIntegrity}
          setExpandedChainIntegrity={setExpandedChainIntegrity}
          expandedChainLink={expandedChainLink}
          setExpandedChainLink={setExpandedChainLink}
          correlationResult={correlationResult}
          selectedChainId={selectedChainId}
          setSelectedChainId={setSelectedChainId}
          manualChainTensions={manualChainTensions}
          setManualChainTensions={setManualChainTensions}
          baseTensions={baseTensions}
          setShowPropagation={setShowPropagation}
        />
      )}

      {activeTab === 'tension' && (
        <TensionTab
          wholeBodyScore={wholeBodyScore}
          chainEffects={chainEffects}
          propagationDeltas={propagationDeltas}
          painAffectedChainIds={painAffectedChainIds}
          activeChainIds={activeChainIds}
          setActiveChainIds={setActiveChainIds}
          showPropagation={showPropagation}
          setShowPropagation={setShowPropagation}
          showRecommendationDetails={showRecommendationDetails}
          setShowRecommendationDetails={setShowRecommendationDetails}
          selectedChainNode={selectedChainNode}
          setSelectedChainNode={setSelectedChainNode}
          selectedNodeDetails={selectedNodeDetails}
          manualChainTensions={manualChainTensions}
          setManualChainTensions={setManualChainTensions}
          chainRecommendations={chainRecommendations}
          baseTensions={baseTensions}
          hasManualTensions={hasManualTensions}
        />
      )}

      {activeTab === 'treatments' && (
        <TreatmentsTab
          chainRecommendations={chainRecommendations}
          painTensionContributors={painTensionContributors}
          painMarkers={painMarkers}
          manualChainTensions={manualChainTensions}
          chainEffects={chainEffects}
          baseTensions={baseTensions}
          hasManualTensions={hasManualTensions}
        />
      )}
    </div>
  );
}

function ExplorerTab({
  chainIntegrityMode,
  setChainIntegrityMode,
  chainIntegrityScores,
  expandedChainIntegrity,
  setExpandedChainIntegrity,
  expandedChainLink,
  setExpandedChainLink,
  correlationResult,
  selectedChainId,
  setSelectedChainId,
  manualChainTensions,
  setManualChainTensions,
  baseTensions,
  setShowPropagation,
}: {
  chainIntegrityMode: boolean;
  setChainIntegrityMode: (v: boolean) => void;
  chainIntegrityScores: Map<string, { score: number; issues: string[]; problematicLinks: string[]; exercises: string[] }>;
  expandedChainIntegrity: string | null;
  setExpandedChainIntegrity: (v: string | null) => void;
  expandedChainLink: string | null;
  setExpandedChainLink: (v: string | null) => void;
  correlationResult: UnifiedChainPanelProps['correlationResult'];
  selectedChainId: string | null;
  setSelectedChainId: (fn: (prev: string | null) => string | null) => void;
  manualChainTensions: Record<string, number>;
  setManualChainTensions: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  baseTensions: Record<string, number>;
  setShowPropagation: (fn: (prev: boolean) => boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] text-gray-400">{chainIntegrityMode ? 'Chain health scores based on posture.' : 'Select a chain to explore its pathway.'}</p>
        <button
          className={`text-[7px] px-1.5 py-0.5 rounded transition-colors ${chainIntegrityMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          onClick={() => setChainIntegrityMode(!chainIntegrityMode)}
        >
          <Shield className="h-2.5 w-2.5 inline mr-0.5" />
          Integrity
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {(['myofascial', 'functional', 'biomechanical'] as const).map(cat => (
          <span key={cat} className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
            {cat === 'myofascial' ? 'Myofascial Lines' : cat === 'functional' ? 'Functional Slings' : 'Biomechanical'}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {KINETIC_CHAINS.map(chain => {
          const isSelected = selectedChainId === chain.id;
          const integrity = chainIntegrityScores.get(chain.id);
          const integrityScore = integrity?.score ?? 100;
          const isIntegrityExpanded = expandedChainIntegrity === chain.id;
          return (
            <div key={chain.id} className={`rounded transition-colors ${isSelected ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/3'}`}>
              <button
                className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
                onClick={() => {
                  setSelectedChainId(prev => prev === chain.id ? null : chain.id);
                  setExpandedChainLink(null);
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2" style={{ borderColor: chain.color, backgroundColor: isSelected ? chain.color : 'transparent' }} />
                <span className="text-[10px] font-medium text-gray-200 flex-1 text-left">{chain.label}</span>
                {chainIntegrityMode ? (
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${integrityScore}%`, backgroundColor: getIntegrityColor(integrityScore) }} />
                    </div>
                    <span className="text-[7px] font-bold" style={{ color: getIntegrityColor(integrityScore) }}>{integrityScore}%</span>
                  </div>
                ) : (
                  <span className={`text-[7px] px-1 py-0.5 rounded ${chain.category === 'myofascial' ? 'bg-blue-500/20 text-blue-400' : chain.category === 'functional' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {chain.category}
                  </span>
                )}
                <ChevronDown className={`h-2.5 w-2.5 text-gray-500 transition-transform ${isSelected ? '' : '-rotate-90'}`} />
              </button>

              {isSelected && (
                <div className="px-2 pb-2 space-y-1.5">
                  {chainIntegrityMode && integrity && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 p-1.5 rounded-lg" style={{ backgroundColor: getIntegrityColor(integrityScore) + '15', border: `1px solid ${getIntegrityColor(integrityScore)}30` }}>
                        <Shield className="h-3 w-3" style={{ color: getIntegrityColor(integrityScore) }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold" style={{ color: getIntegrityColor(integrityScore) }}>Chain Integrity: {getIntegrityLabel(integrityScore)}</span>
                            <span className="text-[8px] font-bold" style={{ color: getIntegrityColor(integrityScore) }}>{integrityScore}%</span>
                          </div>
                          <div className="w-full h-1 bg-gray-700 rounded-full mt-0.5">
                            <div className="h-full rounded-full transition-all" style={{ width: `${integrityScore}%`, backgroundColor: getIntegrityColor(integrityScore) }} />
                          </div>
                        </div>
                      </div>
                      {integrity.problematicLinks.length > 0 && (
                        <div>
                          <span className="text-[8px] text-red-400 font-medium">Problematic Links ({integrity.problematicLinks.length})</span>
                          <div className="mt-0.5 space-y-0.5">
                            {integrity.problematicLinks.map((link, i) => (
                              <div key={i} className="flex items-center gap-1 text-[7px] text-red-300/80 bg-red-500/10 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="h-2 w-2 text-red-400 flex-shrink-0" />
                                {link}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {integrity.issues.length > 0 && (
                        <div>
                          <button className="text-[8px] text-orange-400 font-medium flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setExpandedChainIntegrity(expandedChainIntegrity === chain.id ? null : chain.id); }}>
                            <Activity className="h-2.5 w-2.5" />
                            Muscle Issues ({integrity.issues.length})
                            <ChevronDown className={`h-2 w-2 transition-transform ${isIntegrityExpanded ? '' : '-rotate-90'}`} />
                          </button>
                          {isIntegrityExpanded && (
                            <div className="mt-0.5 space-y-0.5 ml-1">
                              {integrity.issues.map((issue, i) => (
                                <div key={i} className="text-[7px] text-orange-300/70 bg-orange-500/10 px-1.5 py-0.5 rounded">{issue}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {integrity.exercises.length > 0 && (
                        <div>
                          <span className="text-[8px] text-cyan-400 font-medium">Recommended Exercises</span>
                          <div className="mt-0.5 space-y-0.5">
                            {integrity.exercises.map((ex, i) => (
                              <div key={i} className="flex items-center gap-1 text-[7px] text-cyan-300/80 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                                <Dumbbell className="h-2 w-2 text-cyan-400 flex-shrink-0" />
                                {ex}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[8px] text-gray-400 leading-relaxed">{chain.description}</p>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
                    <span className="text-[8px] text-emerald-400 font-medium">Clinical Relevance</span>
                    <p className="text-[7px] text-emerald-300/80 mt-0.5 leading-relaxed">{chain.clinicalRelevance}</p>
                  </div>

                  {correlationResult && correlationResult.painCorrelations.length > 0 && (() => {
                    const chainCorrelations = correlationResult.painCorrelations.filter(pc => pc.relatedChains.some(rc => rc.chainId === chain.id));
                    if (chainCorrelations.length === 0) return null;
                    return (
                      <div className="bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                        <span className="text-[8px] text-red-400 font-medium">Pain Markers on This Chain ({chainCorrelations.length})</span>
                        <div className="mt-0.5 space-y-0.5">
                          {chainCorrelations.map((pc) => {
                            const chainData = pc.relatedChains.find(rc => rc.chainId === chain.id);
                            return (
                              <div key={pc.markerId} className="text-[7px] text-red-300/80">
                                <span className="text-red-300">{pc.markerLabel}</span>
                                <span className="text-gray-500 ml-1">(severity {pc.severity}/10)</span>
                                {chainData && <span className="text-gray-500 ml-1">- {chainData.relevanceReason}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <span className="text-[8px] text-gray-300 font-medium">Chain Pathway ({chain.links.length} links)</span>
                    <div className="mt-1 space-y-0.5">
                      {chain.links.map((link, li) => {
                        const isExpanded = expandedChainLink === `${chain.id}_${li}`;
                        const isProblematic = integrity?.problematicLinks.includes(link.label);
                        const linkMuscleIds = link.muscles.map(m => m.toLowerCase().replace(/\s+/g, '_'));
                        return (
                          <div key={li}>
                            <button
                              className={`w-full flex items-center gap-1 px-1.5 py-1 rounded text-left transition-colors ${isExpanded ? 'bg-white/10' : 'hover:bg-white/5'} ${isProblematic ? 'ring-1 ring-red-500/30' : ''}`}
                              onClick={() => setExpandedChainLink(expandedChainLink === `${chain.id}_${li}` ? null : `${chain.id}_${li}`)}
                            >
                              <div className="flex flex-col items-center flex-shrink-0 w-3">
                                <div className="w-2 h-2 rounded-full border" style={{ borderColor: isProblematic ? '#ef4444' : chain.color, backgroundColor: isProblematic ? '#ef444480' : (link.role === 'primary' ? chain.color : 'transparent') }} />
                                {li < chain.links.length - 1 && <div className="w-0.5 h-3 mt-0.5" style={{ backgroundColor: chain.color + '60' }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-[9px] truncate block ${isProblematic ? 'text-red-300' : 'text-white'}`}>{link.label}</span>
                                <span className="text-[7px] text-gray-500">{link.region}</span>
                                {(() => {
                                  const mapping = CHAIN_BONE_MAPPING[chain.id];
                                  if (!mapping) return null;
                                  const hasLeft = mapping.left.length > 0;
                                  const hasRight = mapping.right.length > 0;
                                  const isMidlineRegion = ['spine', 'head', 'neck', 'trunk', 'pelvis', 'core', 'chest', 'sacrum', 'lumbar', 'thoracic', 'cervical'].some(r => link.region.toLowerCase().includes(r));
                                  if (isMidlineRegion) return <span className="text-[6px] text-purple-400/60 ml-1">M</span>;
                                  if (hasLeft && hasRight) return <span className="text-[6px] text-blue-400/60 ml-1">L/R</span>;
                                  if (hasLeft) return <span className="text-[6px] text-blue-400/60 ml-1">L</span>;
                                  if (hasRight) return <span className="text-[6px] text-blue-400/60 ml-1">R</span>;
                                  return null;
                                })()}
                              </div>
                              {isProblematic && <AlertTriangle className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />}
                              <span className={`text-[6px] px-1 rounded ${link.role === 'primary' ? 'bg-white/10 text-gray-300' : 'bg-white/5 text-gray-500'}`}>
                                {link.role}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="ml-5 px-2 py-1 bg-white/5 rounded mb-0.5 border-l-2 space-y-1" style={{ borderColor: chain.color }}>
                                <div className="text-[7px] text-gray-400 mb-0.5">
                                  <span className="text-gray-300 font-medium">Muscles: </span>
                                  {link.muscles.join(', ')}
                                </div>
                                <div className="text-[7px] text-gray-400">
                                  <span className="text-gray-300 font-medium">Force Role: </span>
                                  {link.forceContribution}
                                </div>
                                {chainIntegrityMode && (() => {
                                  const linkIssues = integrity?.issues.filter(issue => link.muscles.some(m => issue.toLowerCase().includes(m.toLowerCase().substring(0, 6)))) || [];
                                  if (linkIssues.length === 0) return null;
                                  return (
                                    <div className="mt-1 pt-1 border-t border-white/5">
                                      <span className="text-[7px] text-red-400 font-medium">Issues at this link:</span>
                                      {linkIssues.map((issue, i) => (
                                        <div key={i} className="text-[6px] text-red-300/70 mt-0.5">{issue}</div>
                                      ))}
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const mappedIds = mapJointIdToMuscleIds(link.jointId);
                                  const primaryId = mappedIds[0] || link.jointId;
                                  return (
                                    <InlineTensionSlider
                                      muscleId={primaryId}
                                      label={link.label}
                                      baseTension={baseTensions[primaryId] ?? 50}
                                      manualTension={manualChainTensions[primaryId]}
                                      onTensionChange={(val) => {
                                        setManualChainTensions(prev => {
                                          const updates: Record<string, number> = { ...prev };
                                          for (const mid of mappedIds) {
                                            updates[mid] = val;
                                          }
                                          return updates;
                                        });
                                        setShowPropagation(() => true);
                                      }}
                                      onReset={() => {
                                        setManualChainTensions(prev => {
                                          const next = { ...prev };
                                          for (const mid of mappedIds) {
                                            delete next[mid];
                                          }
                                          return next;
                                        });
                                      }}
                                    />
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] text-red-400 font-medium">Common Dysfunctions</span>
                    <div className="mt-0.5 space-y-0.5">
                      {chain.commonDysfunctions.map((d, di) => (
                        <div key={di} className="flex items-start gap-1">
                          <AlertTriangle className="h-2 w-2 text-red-400/60 flex-shrink-0 mt-0.5" />
                          <span className="text-[7px] text-gray-400 leading-relaxed">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] text-cyan-400 font-medium">Assessment Tests</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {chain.assessmentTests.map((t, ti) => (
                        <span key={ti} className="text-[7px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/80">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-1 text-[7px]">
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-blue-500/50 border border-blue-500" /><span className="text-gray-400">Myofascial</span></div>
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-orange-500/50 border border-orange-500" /><span className="text-gray-400">Functional</span></div>
          <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-purple-500/50 border border-purple-500" /><span className="text-gray-400">Biomechanical</span></div>
        </div>
        {chainIntegrityMode ? (
          <div className="flex items-center gap-2 mt-1 text-[7px]">
            <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-green-500" /><span className="text-gray-500">Good</span></div>
            <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-yellow-500" /><span className="text-gray-500">Fair</span></div>
            <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-orange-500" /><span className="text-gray-500">Poor</span></div>
            <div className="flex items-center gap-0.5"><div className="w-2 h-1 rounded bg-red-500" /><span className="text-gray-500">Critical</span></div>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1 text-[7px]">
            <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-gray-500">Primary</span></div>
            <div className="flex items-center gap-0.5"><div className="w-2 h-2 rounded-full border border-emerald-500" /><span className="text-gray-500">Secondary</span></div>
          </div>
        )}
      </div>
    </>
  );
}

function InlineTensionSlider({
  muscleId,
  label,
  baseTension,
  manualTension,
  onTensionChange,
  onReset,
}: {
  muscleId: string;
  label: string;
  baseTension: number;
  manualTension: number | undefined;
  onTensionChange: (val: number) => void;
  onReset: () => void;
}) {
  const currentVal = manualTension ?? baseTension;
  const delta = currentVal - baseTension;
  const hasDelta = manualTension !== undefined && Math.abs(delta) > 0.5;

  return (
    <div className="mt-1 p-1.5 rounded border border-amber-500/20 bg-amber-500/5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] text-amber-300 font-medium">Tension</span>
        <div className="flex items-center gap-1">
          {hasDelta && (
            <span className={`text-[7px] font-bold ${delta > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
              {delta > 0 ? '+' : ''}{Math.round(delta)}%
            </span>
          )}
          {manualTension !== undefined && (
            <button className="text-[6px] text-red-400 hover:text-red-300 underline" onClick={onReset}>Reset</button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={currentVal}
        onChange={e => onTensionChange(parseInt(e.target.value))}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[6px] text-gray-500">0%</span>
        <span className={`text-[7px] font-bold ${currentVal > 70 ? 'text-red-400' : currentVal > 55 ? 'text-yellow-400' : 'text-green-400'}`}>
          {Math.round(currentVal)}%
        </span>
        <span className="text-[6px] text-gray-500">100%</span>
      </div>
    </div>
  );
}

function TensionTab({
  wholeBodyScore,
  chainEffects,
  propagationDeltas,
  painAffectedChainIds,
  activeChainIds,
  setActiveChainIds,
  showPropagation,
  setShowPropagation,
  showRecommendationDetails,
  setShowRecommendationDetails,
  selectedChainNode,
  setSelectedChainNode,
  selectedNodeDetails,
  manualChainTensions,
  setManualChainTensions,
  chainRecommendations,
  baseTensions,
  hasManualTensions,
}: {
  wholeBodyScore: { score: number; level: string; description: string };
  chainEffects: { chainId: string; avgTension: number }[];
  propagationDeltas: Record<string, number>;
  painAffectedChainIds: string[];
  activeChainIds: string[];
  setActiveChainIds: (fn: (prev: string[]) => string[]) => void;
  showPropagation: boolean;
  setShowPropagation: (fn: (prev: boolean) => boolean) => void;
  showRecommendationDetails: boolean;
  setShowRecommendationDetails: (fn: (prev: boolean) => boolean) => void;
  selectedChainNode: UnifiedChainPanelProps['selectedChainNode'];
  setSelectedChainNode: UnifiedChainPanelProps['setSelectedChainNode'];
  selectedNodeDetails: SelectedNodeDetails | null;
  manualChainTensions: Record<string, number>;
  setManualChainTensions: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  chainRecommendations: ChainRecommendation[];
  baseTensions: Record<string, number>;
  hasManualTensions: boolean;
}) {
  return (
    <>
      <div className={`mb-3 p-2 rounded-lg border ${
        wholeBodyScore.level === 'critical' ? 'border-red-500/50 bg-red-500/10' :
        wholeBodyScore.level === 'high' ? 'border-orange-500/50 bg-orange-500/10' :
        wholeBodyScore.level === 'moderate' ? 'border-yellow-500/50 bg-yellow-500/10' :
        'border-green-500/50 bg-green-500/10'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-gray-300">Whole-Body Tension</span>
          <span className={`text-sm font-bold ${
            wholeBodyScore.level === 'critical' ? 'text-red-400' :
            wholeBodyScore.level === 'high' ? 'text-orange-400' :
            wholeBodyScore.level === 'moderate' ? 'text-yellow-400' :
            'text-green-400'
          }`}>{wholeBodyScore.score}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${
            wholeBodyScore.level === 'critical' ? 'bg-red-500' :
            wholeBodyScore.level === 'high' ? 'bg-orange-500' :
            wholeBodyScore.level === 'moderate' ? 'bg-yellow-500' :
            'bg-green-500'
          }`} style={{ width: `${wholeBodyScore.score}%` }} />
        </div>
      </div>

      <div className="flex gap-1 mb-2">
        <button
          className={`flex-1 px-2 py-1 rounded text-[8px] font-medium transition-colors ${showPropagation ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}
          onClick={() => setShowPropagation(prev => !prev)}
        >
          <Zap className="h-2.5 w-2.5 inline mr-0.5" />
          Propagation
        </button>
        <button
          className={`flex-1 px-2 py-1 rounded text-[8px] font-medium transition-colors ${showRecommendationDetails ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'}`}
          onClick={() => setShowRecommendationDetails(prev => !prev)}
        >
          <Lightbulb className="h-2.5 w-2.5 inline mr-0.5" />
          Advice
        </button>
      </div>

      {painAffectedChainIds.length > 0 && (
        <div className="mb-2 p-1.5 rounded border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-1 mb-1">
            <MapPin className="h-3 w-3 text-red-400" />
            <span className="text-[9px] font-medium text-red-300">{painAffectedChainIds.length} chain{painAffectedChainIds.length !== 1 ? 's' : ''} through pain areas</span>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {painAffectedChainIds.map(cid => {
              const chain = MYOFASCIAL_CHAINS.find(c => c.id === cid);
              return chain ? (
                <span key={cid} className="text-[7px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                  {chain.name.replace(/ \([LR]\)$/, '')}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <span className="text-[9px] text-gray-400 font-medium">Myofascial Chains</span>
        {MYOFASCIAL_CHAINS.map(chain => {
          const effect = chainEffects.find(e => e.chainId === chain.id);
          const isActive = activeChainIds.includes(chain.id);
          const isPainAffected = painAffectedChainIds.includes(chain.id);
          return (
            <button
              key={chain.id}
              className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors ${isPainAffected ? 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/20' : isActive ? 'bg-white/10 hover:bg-white/15' : 'bg-white/3 hover:bg-white/8 opacity-50'}`}
              onClick={() => setActiveChainIds(prev => prev.includes(chain.id) ? prev.filter(id => id !== chain.id) : [...prev, chain.id])}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isPainAffected ? '#ff4444' : chain.color }} />
                <span className="text-[9px] text-gray-200">{chain.name}</span>
                {isPainAffected && <MapPin className="h-2.5 w-2.5 text-red-400" />}
              </div>
              <div className="flex items-center gap-1">
                {showPropagation && effect && (() => {
                  const chainMuscles = chain.links.map(l => l.muscleId);
                  const totalProp = chainMuscles.reduce((sum, mid) => sum + (propagationDeltas[mid] ?? 0), 0);
                  if (Math.abs(totalProp) < 1) return null;
                  return (
                    <span className={`text-[7px] ${totalProp > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                      {totalProp > 0 ? '+' : ''}{Math.round(totalProp)}
                    </span>
                  );
                })()}
                {effect && (
                  <span className={`text-[8px] font-medium ${
                    effect.avgTension > 70 || effect.avgTension < 30 ? 'text-red-400' :
                    effect.avgTension > 60 || effect.avgTension < 40 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>{Math.round(effect.avgTension)}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedChainNode && selectedNodeDetails && (
        <div className="mt-2 p-2 rounded-lg border border-teal-500/30 bg-teal-500/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-teal-300">{selectedNodeDetails.state.label}</span>
            <button onClick={() => setSelectedChainNode(null)} className="text-gray-400 hover:text-white">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-1.5">
            <div className="bg-black/30 rounded p-1">
              <span className="text-[7px] text-gray-400 block">Tension</span>
              <span className={`text-[10px] font-bold ${selectedNodeDetails.state.tension > 65 ? 'text-red-400' : selectedNodeDetails.state.tension > 55 ? 'text-yellow-400' : 'text-green-400'}`}>
                {Math.round(selectedNodeDetails.state.tension)}%
              </span>
            </div>
            <div className="bg-black/30 rounded p-1">
              <span className="text-[7px] text-gray-400 block">Activation</span>
              <span className="text-[10px] font-bold text-blue-300">{selectedNodeDetails.state.activation}</span>
            </div>
            <div className="bg-black/30 rounded p-1">
              <span className="text-[7px] text-gray-400 block">State</span>
              <span className={`text-[10px] font-bold ${selectedNodeDetails.state.state === 'shortened' ? 'text-orange-400' : selectedNodeDetails.state.state === 'lengthened' ? 'text-blue-400' : 'text-green-400'}`}>
                {selectedNodeDetails.state.state}
              </span>
            </div>
            {selectedNodeDetails.propState && Math.abs(selectedNodeDetails.propState.totalChainTension) > 0.5 && (
              <div className="bg-black/30 rounded p-1">
                <span className="text-[7px] text-gray-400 block">Propagation</span>
                <span className={`text-[10px] font-bold ${selectedNodeDetails.propState.totalChainTension > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                  {selectedNodeDetails.propState.totalChainTension > 0 ? '+' : ''}{Math.round(selectedNodeDetails.propState.totalChainTension)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[8px] text-gray-300 mb-1.5">{selectedNodeDetails.state.description}</p>
          <div className="mb-2 p-1.5 rounded border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-medium text-amber-300">Introduce Tension</span>
              {manualChainTensions[selectedChainNode.muscleId] !== undefined && (
                <button
                  className="text-[7px] text-red-400 hover:text-red-300 underline"
                  onClick={() => setManualChainTensions(prev => {
                    const next = { ...prev };
                    delete next[selectedChainNode.muscleId];
                    return next;
                  })}
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={manualChainTensions[selectedChainNode.muscleId] ?? Math.round(selectedNodeDetails.state.tension)}
              onChange={e => {
                const val = parseInt(e.target.value);
                setManualChainTensions(prev => ({ ...prev, [selectedChainNode.muscleId]: val }));
                if (!showPropagation) setShowPropagation(() => true);
              }}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[7px] text-gray-500">Relaxed 0%</span>
              <span className={`text-[8px] font-bold ${
                (manualChainTensions[selectedChainNode.muscleId] ?? selectedNodeDetails.state.tension) > 70 ? 'text-red-400' :
                (manualChainTensions[selectedChainNode.muscleId] ?? selectedNodeDetails.state.tension) > 55 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {manualChainTensions[selectedChainNode.muscleId] ?? Math.round(selectedNodeDetails.state.tension)}%
              </span>
              <span className="text-[7px] text-gray-500">100% Max</span>
            </div>
          </div>
          {selectedNodeDetails.membership.length > 0 && (
            <div>
              <span className="text-[7px] text-gray-400">Chains through this muscle:</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {selectedNodeDetails.membership.map(c => (
                  <span key={c.id} className="text-[7px] px-1 py-0.5 rounded" style={{ backgroundColor: c.color + '30', color: c.color }}>
                    {c.name.replace(/ \([LR]\)$/, '')}
                  </span>
                ))}
              </div>
            </div>
          )}
          {selectedNodeDetails.propState && selectedNodeDetails.propState.chainEffects.length > 0 && (
            <div className="mt-1.5">
              <span className="text-[7px] text-gray-400">Tension sources:</span>
              {selectedNodeDetails.propState.chainEffects.slice(0, 3).map((eff, i) => (
                <div key={i} className="flex items-center justify-between mt-0.5">
                  <span className="text-[7px] text-gray-300">via {eff.chainName.replace(/ \([LR]\)$/, '')} from {eff.sourceMuscle}</span>
                  <span className={`text-[7px] font-medium ${eff.tensionDelta > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                    {eff.tensionDelta > 0 ? '+' : ''}{eff.tensionDelta.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRecommendationDetails && chainRecommendations.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
            <Lightbulb className="h-3 w-3 text-blue-400" />
            Clinical Recommendations
          </span>
          {chainRecommendations.slice(0, 4).map(rec => (
            <Collapsible key={rec.chainId}>
              <CollapsibleTrigger className="w-full">
                <div className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                  rec.level === 'critical' ? 'bg-red-500/15 border border-red-500/30' :
                  rec.level === 'high' ? 'bg-orange-500/15 border border-orange-500/30' :
                  'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                  <span className="text-[8px] text-gray-200">{rec.chainName.replace(/ \([LR]\)$/, '')}</span>
                  <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${
                    rec.level === 'critical' ? 'bg-red-500/30 text-red-300' :
                    rec.level === 'high' ? 'bg-orange-500/30 text-orange-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>{rec.level}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2 py-1.5 bg-white/5 rounded-b">
                  <p className="text-[7px] text-gray-400 mb-1">{rec.description}</p>
                  <div className="mb-1">
                    <span className="text-[7px] font-medium text-green-400">Stretches:</span>
                    {rec.stretches.map((s, i) => (
                      <span key={i} className="text-[7px] text-gray-300 block ml-1">- {s}</span>
                    ))}
                  </div>
                  <div>
                    <span className="text-[7px] font-medium text-blue-400">Treatment:</span>
                    {rec.treatments.map((t, i) => (
                      <span key={i} className="text-[7px] text-gray-300 block ml-1">- {t}</span>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {showRecommendationDetails && chainRecommendations.length === 0 && (
        <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
          <span className="text-[8px] text-green-300">All chains within normal tension range. No specific interventions needed.</span>
        </div>
      )}

      {hasManualTensions && (
        <div className="mt-2 flex items-center justify-between p-1.5 rounded border border-amber-500/20 bg-amber-500/10">
          <span className="text-[8px] text-amber-300">{Object.keys(manualChainTensions).length} manual tension{Object.keys(manualChainTensions).length !== 1 ? 's' : ''} active</span>
          <button
            className="text-[7px] text-red-400 hover:text-red-300 underline"
            onClick={() => setManualChainTensions(() => ({}))}
          >
            Reset All
          </button>
        </div>
      )}

      <div className="mt-2 text-[7px] text-gray-500 text-center">
        Click chain nodes on skeleton to inspect & inject tension
      </div>
    </>
  );
}

function TreatmentsTab({
  chainRecommendations,
  painTensionContributors,
  painMarkers,
  manualChainTensions,
  chainEffects,
  baseTensions,
  hasManualTensions,
}: {
  chainRecommendations: ChainRecommendation[];
  painTensionContributors: PainTensionContributor[];
  painMarkers: { id: string; nearestBone: string; anatomicalLabel?: string; type: string }[];
  manualChainTensions: Record<string, number>;
  chainEffects: { chainId: string; avgTension: number }[];
  baseTensions: Record<string, number>;
  hasManualTensions: boolean;
}) {
  return (
    <>
      {hasManualTensions && (
        <div className="mb-2 p-1.5 rounded border border-amber-500/20 bg-amber-500/5">
          <span className="text-[8px] text-amber-300 font-medium">Before / After Tension Deltas</span>
          <div className="mt-1 space-y-0.5">
            {Object.entries(manualChainTensions).map(([muscleId, newVal]) => {
              const originalVal = baseTensions[muscleId] ?? 50;
              const delta = newVal - originalVal;
              if (Math.abs(delta) < 0.5) return null;
              return (
                <div key={muscleId} className="flex items-center justify-between text-[7px]">
                  <span className="text-gray-300">{muscleId.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{Math.round(originalVal)}%</span>
                    <ChevronRight className="h-2 w-2 text-gray-500" />
                    <span className={newVal > 70 ? 'text-red-400' : newVal > 55 ? 'text-yellow-400' : 'text-green-400'}>{Math.round(newVal)}%</span>
                    <span className={`font-bold ${delta > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                      ({delta > 0 ? '+' : ''}{Math.round(delta)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {painTensionContributors.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Target className="h-3 w-3 text-red-400" />
            <span className="text-[9px] font-medium text-red-300">Pain Tension Drivers</span>
          </div>
          <div className="space-y-2">
            {painTensionContributors.map(ptc => (
              <div key={ptc.painMarkerId} className="p-1.5 rounded border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="h-2.5 w-2.5 text-red-400" />
                  <span className="text-[8px] font-medium text-red-300">{ptc.painLabel}</span>
                </div>
                <div className="space-y-0.5">
                  {ptc.contributors.slice(0, 5).map((c, i) => (
                    <div key={`${c.chainId}_${c.muscleId}_${i}`} className="flex items-center justify-between text-[7px]">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.chainColor }} />
                        <span className="text-gray-300">{c.muscleId.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={c.tension > 70 ? 'text-red-400' : c.tension > 55 ? 'text-yellow-400' : 'text-green-400'}>
                          {Math.round(c.tension)}%
                        </span>
                        <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.min(100, c.score * 3)}%`,
                            backgroundColor: c.score > 15 ? '#ef4444' : c.score > 8 ? '#f97316' : '#eab308'
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <Lightbulb className="h-3 w-3 text-blue-400" />
          <span className="text-[9px] font-medium text-blue-300">Treatment Recommendations</span>
        </div>
        {chainRecommendations.length > 0 ? (
          <div className="space-y-1.5">
            {chainRecommendations.map(rec => {
              const effect = chainEffects.find(e => e.chainId === rec.chainId);
              return (
                <Collapsible key={rec.chainId}>
                  <CollapsibleTrigger className="w-full">
                    <div className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                      rec.level === 'critical' ? 'bg-red-500/15 border border-red-500/30' :
                      rec.level === 'high' ? 'bg-orange-500/15 border border-orange-500/30' :
                      'bg-yellow-500/10 border border-yellow-500/20'
                    }`}>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-gray-200">{rec.chainName.replace(/ \([LR]\)$/, '')}</span>
                        {effect && (
                          <span className={`text-[7px] ${effect.avgTension > 65 ? 'text-red-400' : 'text-yellow-400'}`}>
                            ({Math.round(effect.avgTension)}%)
                          </span>
                        )}
                      </div>
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${
                        rec.level === 'critical' ? 'bg-red-500/30 text-red-300' :
                        rec.level === 'high' ? 'bg-orange-500/30 text-orange-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>{rec.level}</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 py-1.5 bg-white/5 rounded-b space-y-1">
                      <p className="text-[7px] text-gray-400">{rec.description}</p>
                      <div>
                        <span className="text-[7px] font-medium text-green-400">Stretches:</span>
                        {rec.stretches.map((s, i) => (
                          <span key={i} className="text-[7px] text-gray-300 block ml-1">- {s}</span>
                        ))}
                      </div>
                      <div>
                        <span className="text-[7px] font-medium text-blue-400">Manual Therapy:</span>
                        {rec.treatments.map((t, i) => (
                          <span key={i} className="text-[7px] text-gray-300 block ml-1">- {t}</span>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
            <span className="text-[8px] text-green-300">All chains within normal range. No interventions needed.</span>
          </div>
        )}
      </div>
    </>
  );
}
