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
  AlertTriangle,
  Info,
} from 'lucide-react';
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

interface TissueViewSelectorProps {
  activeMode: TissueViewMode;
  onModeChange: (mode: TissueViewMode) => void;
  selectedEntryId: string | null;
  onEntrySelect: (id: string | null) => void;
  chainIntegrityScores?: Map<string, { score: number; issues: string[]; problematicLinks: string[] }>;
  jointForceData?: Array<{ boneName: string; totalForce: number; status: string; label: string }>;
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

function TendonInfoCard({ entry }: { entry: TendonEntry }) {
  const stage = entry.cookStage ? COOK_STAGING[entry.cookStage] : null;

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
      {stage && entry.cookStage && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  entry.cookStage === 1 ? 'border-green-500 text-green-500' :
                  entry.cookStage === 2 ? 'border-yellow-500 text-yellow-500' :
                  'border-red-500 text-red-500'
                }
              >
                Stage {entry.cookStage}
              </Badge>
              <span className="text-sm font-medium">{stage.name}</span>
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

function JointInfoCard({ entry }: { entry: JointSurfaceEntry }) {
  const kl = entry.kellgrenLawrence !== undefined ? KELLGREN_LAWRENCE[entry.kellgrenLawrence] : null;

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
      {kl && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  entry.kellgrenLawrence === 0 ? 'border-green-500 text-green-500' :
                  entry.kellgrenLawrence === 1 ? 'border-blue-500 text-blue-500' :
                  entry.kellgrenLawrence === 2 ? 'border-yellow-500 text-yellow-500' :
                  entry.kellgrenLawrence === 3 ? 'border-orange-500 text-orange-500' :
                  'border-red-500 text-red-500'
                }
              >
                K-L {entry.kellgrenLawrence}
              </Badge>
              <span className="text-xs">{kl.grade}</span>
            </div>
            <p className="text-xs text-muted-foreground">{kl.description}</p>
          </div>
        </>
      )}
    </div>
  );
}

function NerveInfoCard({ entry }: { entry: NervePathwayEntry }) {
  return (
    <div className="space-y-3">
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

function TissueInfoCard({ entry, mode, chainIntegrityScores, jointForceData }: {
  entry: TissueOverlayEntry;
  mode: TissueViewMode;
  chainIntegrityScores?: Map<string, { score: number; issues: string[]; problematicLinks: string[] }>;
  jointForceData?: Array<{ boneName: string; totalForce: number; status: string; label: string }>;
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

      {mode === 'tendon' && <TendonInfoCard entry={entry as TendonEntry} />}
      {mode === 'joint' && (
        <>
          <JointInfoCard entry={entry as JointSurfaceEntry} />
          <JointForceIndicator entry={entry as JointSurfaceEntry} forceData={jointForceData} />
        </>
      )}
      {mode === 'nerve' && <NerveInfoCard entry={entry as NervePathwayEntry} />}
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
}: TissueViewSelectorProps) {
  const [showList, setShowList] = useState(false);
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
        />
      )}
    </div>
  );
}
