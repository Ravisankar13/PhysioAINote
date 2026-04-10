import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dumbbell,
  Cable,
  CircleDot,
  Zap,
  Layers,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type { CompromisedTissue } from './ClinicalTextInput';
import {
  type TissueViewMode,
  type TissueOverlayEntry,
  type TendonEntry,
  type JointSurfaceEntry,
  type NervePathwayEntry,
  type FascialLayerEntry,
  TISSUE_MODE_COLORS,
  COOK_STAGING,
  KELLGREN_LAWRENCE,
  getTissueEntriesForMode,
} from '@/lib/tissueViewData';

interface MuscleOverrideData {
  tension?: number;
  isManual?: boolean;
  pathology?: string;
}

interface TissueViewSelectorProps {
  activeMode: TissueViewMode;
  onModeChange: (mode: TissueViewMode) => void;
  selectedEntryId: string | null;
  onEntrySelect: (id: string | null) => void;
  chainIntegrityScores?: Map<string, { score: number; issues: string[]; problematicLinks: string[] }>;
  jointForceData?: Array<{ boneName: string; totalForce: number; status: string; label: string }>;
  musclePathologyData?: Record<string, MuscleOverrideData>;
  clinicallyAffectedNerves?: Set<string>;
  compromisedTissues?: CompromisedTissue[];
}

const MODE_ICONS: Record<Exclude<TissueViewMode, null>, typeof Dumbbell> = {
  muscle: Dumbbell,
  tendon: Cable,
  joint: CircleDot,
  nerve: Zap,
  fascia: Layers,
};

const MODE_DESCRIPTIONS: Record<Exclude<TissueViewMode, null>, string> = {
  muscle: 'Muscle activation & pathology overlay',
  tendon: 'Tendon insertion points with Cook\'s staging',
  joint: 'Joint surfaces with degeneration grading',
  nerve: 'Peripheral nerve pathways & entrapment sites',
  fascia: 'Myofascial chain layers & tension lines',
};

function TendonInfoCard({ entry, musclePathologyData }: { entry: TendonEntry; musclePathologyData?: Record<string, MuscleOverrideData> }) {
  const derivedStage = (() => {
    if (!musclePathologyData) return entry.cookStage;
    const regionMuscles = Object.entries(musclePathologyData).filter(([key]) => {
      const entryRegion = entry.region.toLowerCase();
      const keyLower = key.toLowerCase();
      return keyLower.includes(entryRegion) ||
        entry.bones.some(b => keyLower.includes(b.replace(/_[LR]$/, '').toLowerCase()));
    });
    const hasPathology = regionMuscles.some(([, v]) => v.pathology && v.pathology !== 'none');
    const hasHighTension = regionMuscles.some(([, v]) => (v.tension ?? 50) > 75);
    if (hasPathology) return 3 as const;
    if (hasHighTension) return 2 as const;
    return entry.cookStage;
  })();

  const stage = derivedStage ? COOK_STAGING[derivedStage] : null;
  const isPathologyDriven = musclePathologyData && derivedStage !== entry.cookStage;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Origin</div>
        <div className="text-sm">{entry.origin}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Insertion</div>
        <div className="text-sm">{entry.insertion}</div>
      </div>
      {stage && derivedStage && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={
                  derivedStage === 1 ? 'border-green-500 text-green-500' :
                  derivedStage === 2 ? 'border-yellow-500 text-yellow-500' :
                  'border-red-500 text-red-500'
                }
              >
                Stage {derivedStage}
              </Badge>
              <span className="text-sm font-medium">{stage.name}</span>
              {isPathologyDriven && (
                <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400">
                  Pathology-driven
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{stage.description}</p>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Prognosis</div>
              <div className="text-xs">{stage.prognosis}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Treatment</div>
              <div className="text-xs">{stage.treatment}</div>
            </div>
          </div>
        </>
      )}
      <Separator />
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Common Pathology</div>
        <div className="text-xs">{entry.commonPathology}</div>
      </div>
    </div>
  );
}

function JointInfoCard({ entry, forceData }: { entry: JointSurfaceEntry; forceData?: Array<{ boneName: string; totalForce: number; status: string; label: string }> }) {
  const derivedKL = (() => {
    if (!forceData) return entry.kellgrenLawrence ?? 0;
    const matchedForce = forceData.find(f => entry.bones.includes(f.boneName));
    if (!matchedForce) return entry.kellgrenLawrence ?? 0;
    const bw = matchedForce.totalForce;
    if (bw > 3.5) return 4;
    if (bw > 2.5) return 3;
    if (bw > 1.5) return 2;
    if (bw > 0.8) return 1;
    return 0;
  })() as 0|1|2|3|4;
  const kl = KELLGREN_LAWRENCE[derivedKL];
  const isDerived = forceData && derivedKL !== (entry.kellgrenLawrence ?? 0);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Joint Type</div>
        <div className="text-sm">{entry.jointType}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Normal ROM</div>
        <div className="text-sm">{entry.normalROM}</div>
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              derivedKL === 0 ? 'border-green-500 text-green-500' :
              derivedKL === 1 ? 'border-blue-500 text-blue-500' :
              derivedKL === 2 ? 'border-yellow-500 text-yellow-500' :
              derivedKL === 3 ? 'border-orange-500 text-orange-500' :
              'border-red-500 text-red-500'
            }
          >
            K-L {derivedKL}
          </Badge>
          <span className="text-xs">{kl.grade}</span>
          {isDerived && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/30">
              Force-derived
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{kl.description}</p>
      </div>
    </div>
  );
}

function NerveInfoCard({ entry, isClinicallyAffected }: { entry: NervePathwayEntry; isClinicallyAffected?: boolean }) {
  return (
    <div className="space-y-3">
      {isClinicallyAffected && (
        <div className="flex items-center gap-2 p-1.5 rounded bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-medium text-red-400">Clinical finding: neuropathic pain in territory</span>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Motor Function</div>
        <div className="text-sm">{entry.motorFunction}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Sensory Territory</div>
        <div className="text-sm">{entry.sensoryTerritory}</div>
      </div>
      {entry.entrapmentSites.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              Entrapment Sites
            </div>
            {entry.entrapmentSites.map((site, idx) => (
              <div key={idx} className="pl-2 border-l-2 border-orange-500/30 space-y-0.5">
                <div className="text-xs font-medium">{site.name}</div>
                <div className="text-xs text-muted-foreground">Test: {site.clinicalTest}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FasciaInfoCard({ entry, chainIntegrityScores }: { entry: FascialLayerEntry; chainIntegrityScores?: Map<string, { score: number; issues: string[]; problematicLinks: string[] }> }) {
  const chainScore = chainIntegrityScores
    ? Array.from(chainIntegrityScores.entries()).find(([key]) =>
        key.toLowerCase().includes(entry.chainName.toLowerCase().split(' ')[0]) ||
        entry.chainName.toLowerCase().includes(key.toLowerCase().split(' ')[0])
      )
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {entry.depth}
        </Badge>
        {chainScore && (
          <Badge
            variant="outline"
            className={`text-xs ${
              chainScore[1].score >= 80 ? 'border-green-500 text-green-500' :
              chainScore[1].score >= 60 ? 'border-yellow-500 text-yellow-500' :
              'border-red-500 text-red-500'
            }`}
          >
            Integrity: {chainScore[1].score}%
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Tension Direction</div>
        <div className="text-sm">{entry.tensionDirection}</div>
      </div>
      {chainScore && chainScore[1].issues.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              Chain Issues
            </div>
            {chainScore[1].issues.slice(0, 4).map((issue, idx) => (
              <div key={idx} className="text-xs text-muted-foreground pl-2 border-l-2 border-orange-500/30">
                {issue}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function JointForceIndicator({ entry, forceData }: { entry: JointSurfaceEntry; forceData?: Array<{ boneName: string; totalForce: number; status: string; label: string }> }) {
  if (!forceData || forceData.length === 0) return null;
  const matchedForce = forceData.find(f =>
    entry.bones.includes(f.boneName) || f.label.toLowerCase().includes(entry.region)
  );
  if (!matchedForce) return null;

  const loadPct = Math.min(100, (matchedForce.totalForce / 4.0) * 100);
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">Current Joint Loading</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${loadPct}%`,
              backgroundColor: loadPct > 75 ? '#ef4444' : loadPct > 50 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
        <span className="text-xs font-mono">{matchedForce.totalForce.toFixed(1)}x BW</span>
        <Badge
          variant="outline"
          className={`text-xs ${
            matchedForce.status === 'low' ? 'border-green-500 text-green-500' :
            matchedForce.status === 'moderate' ? 'border-yellow-500 text-yellow-500' :
            matchedForce.status === 'high' ? 'border-orange-500 text-orange-500' :
            'border-red-500 text-red-500'
          }`}
        >
          {matchedForce.status}
        </Badge>
      </div>
    </div>
  );
}

function TissueInfoCard({ entry, mode, chainIntegrityScores, jointForceData, musclePathologyData, clinicallyAffectedNerves }: {
  entry: TissueOverlayEntry;
  mode: TissueViewMode;
  chainIntegrityScores?: Map<string, { score: number; issues: string[]; problematicLinks: string[] }>;
  jointForceData?: Array<{ boneName: string; totalForce: number; status: string; label: string }>;
  musclePathologyData?: Record<string, MuscleOverrideData>;
  clinicallyAffectedNerves?: Set<string>;
}) {
  return (
    <div
      className="rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-3 space-y-2"
      style={{ borderColor: entry.color.css + '40' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color.css }} />
          <span className="text-sm font-medium">{entry.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs capitalize">{entry.region}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">{entry.clinicalNote}</p>

      <Separator />

      {mode === 'tendon' && <TendonInfoCard entry={entry as TendonEntry} musclePathologyData={musclePathologyData} />}
      {mode === 'joint' && (
        <>
          <JointInfoCard entry={entry as JointSurfaceEntry} forceData={jointForceData} />
          <JointForceIndicator entry={entry as JointSurfaceEntry} forceData={jointForceData} />
        </>
      )}
      {mode === 'nerve' && <NerveInfoCard entry={entry as NervePathwayEntry} isClinicallyAffected={clinicallyAffectedNerves?.has((entry as NervePathwayEntry).id)} />}
      {mode === 'fascia' && <FasciaInfoCard entry={entry as FascialLayerEntry} chainIntegrityScores={chainIntegrityScores} />}
    </div>
  );
}

export default function TissueViewSelector({
  activeMode,
  onModeChange,
  selectedEntryId,
  onEntrySelect,
  chainIntegrityScores,
  jointForceData,
  musclePathologyData,
  clinicallyAffectedNerves,
  compromisedTissues,
}: TissueViewSelectorProps) {
  const [showList, setShowList] = useState(false);
  const [compromisedExpanded, setCompromisedExpanded] = useState(true);
  const entries = activeMode ? getTissueEntriesForMode(activeMode) : [];
  const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) : null;

  const handleModeToggle = (mode: Exclude<TissueViewMode, null>) => {
    if (activeMode === mode) {
      onModeChange(null);
      onEntrySelect(null);
      setShowList(false);
    } else {
      onModeChange(mode);
      onEntrySelect(null);
      setShowList(true);
    }
  };

  const modes: Array<Exclude<TissueViewMode, null>> = ['muscle', 'tendon', 'joint', 'nerve', 'fascia'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border">
        {modes.map(mode => {
          const Icon = MODE_ICONS[mode];
          const isActive = activeMode === mode;
          const modeColor = TISSUE_MODE_COLORS[mode];

          return (
            <Button
              key={mode}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8 px-2 text-xs gap-1"
              style={isActive ? { backgroundColor: modeColor.css, color: '#fff' } : undefined}
              onClick={() => handleModeToggle(mode)}
              title={MODE_DESCRIPTIONS[mode]}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize">{mode}</span>
            </Button>
          );
        })}
      </div>

      {compromisedTissues && compromisedTissues.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 backdrop-blur-sm shadow-sm">
          <button
            className="w-full flex items-center justify-between p-2"
            onClick={() => setCompromisedExpanded(!compromisedExpanded)}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-medium text-red-300">Compromised Tissues</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-red-900/40 text-red-300 border-red-700/40">
                {compromisedTissues.length}
              </Badge>
            </div>
            {compromisedExpanded ? <ChevronUp className="w-3 h-3 text-red-400" /> : <ChevronDown className="w-3 h-3 text-red-400" />}
          </button>
          {compromisedExpanded && (
            <div className="max-h-[180px] overflow-y-auto px-2 pb-2 space-y-1.5 thin-scrollbar">
              {compromisedTissues.map((ct, idx) => {
                const TypeIcon = MODE_ICONS[ct.tissue_type] || Cable;
                const modeColor = TISSUE_MODE_COLORS[ct.tissue_type];
                const allEntries = getTissueEntriesForMode(ct.tissue_type);
                const matchedEntry = allEntries.find(e => e.id === ct.tissue_id);
                const severityColor = ct.severity >= 0.7 ? 'text-red-400 border-red-500/40 bg-red-900/30' :
                  ct.severity >= 0.4 ? 'text-orange-400 border-orange-500/40 bg-orange-900/30' :
                  'text-yellow-400 border-yellow-500/40 bg-yellow-900/30';
                const severityLabel = ct.severity >= 0.7 ? 'High' : ct.severity >= 0.4 ? 'Moderate' : 'Low';

                return (
                  <button
                    key={`${ct.tissue_type}_${ct.tissue_id}_${idx}`}
                    className="w-full text-left rounded bg-black/20 border border-gray-700/40 p-1.5 hover:bg-black/30 transition-colors"
                    onClick={() => {
                      onModeChange(ct.tissue_type);
                      if (matchedEntry) onEntrySelect(ct.tissue_id);
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <TypeIcon className="w-3 h-3 flex-shrink-0" style={{ color: modeColor.css }} />
                      <span className="text-[10px] font-medium text-gray-200 truncate flex-1">
                        {matchedEntry ? matchedEntry.label : ct.tissue_id.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${severityColor}`}>
                        {severityLabel}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-gray-400 leading-tight">{ct.rationale}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeMode && activeMode !== 'muscle' && showList && (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium capitalize">{activeMode} Structures</span>
              <Badge variant="secondary" className="text-xs h-5">{entries.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowList(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {entries.map(entry => (
                <button
                  key={entry.id}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-muted/70 transition-colors ${
                    selectedEntryId === entry.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => onEntrySelect(selectedEntryId === entry.id ? null : entry.id)}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color.css }}
                  />
                  <span className="truncate flex-1">{entry.label}</span>
                  <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${
                    selectedEntryId === entry.id ? 'rotate-90' : ''
                  }`} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {activeMode === 'muscle' && (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Dumbbell className="w-3.5 h-3.5" />
            Muscle view uses the existing muscle visualization system. Adjust muscle states in the Muscles panel.
          </div>
        </div>
      )}

      {selectedEntry && activeMode && (
        <TissueInfoCard
          entry={selectedEntry}
          mode={activeMode}
          chainIntegrityScores={chainIntegrityScores}
          jointForceData={jointForceData}
          musclePathologyData={musclePathologyData}
          clinicallyAffectedNerves={clinicallyAffectedNerves}
        />
      )}
    </div>
  );
}
