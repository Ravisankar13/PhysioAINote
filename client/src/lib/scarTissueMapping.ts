import { MYOFASCIAL_CHAINS, type MyofascialChain } from './myofascialChains';
import { MUSCLE_GROUPS } from './muscleGroupSplitter';

export type ScarType = 'surgical_scar' | 'adhesion_band' | 'fibrotic_area';
export type TissueLayer = 'superficial' | 'fascial' | 'muscular' | 'periosteal';
export type ScarAge = 'acute' | 'subacute' | 'chronic' | 'mature';
export type ScarMobility = 'mobile' | 'tethered' | 'fixed';

export interface ScarMarker {
  id: string;
  position: { x: number; y: number; z: number };
  nearestBone: string;
  anatomicalLabel: string;
  type: ScarType;
  length: number;
  width: number;
  orientation: number;
  affectedLayers: TissueLayer[];
  severity: number;
  age: ScarAge;
  mobility: ScarMobility;
  painOnPalpation: number;
  notes: string;
}

export interface AdhesionBand {
  id: string;
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
  startBone: string;
  endBone: string;
  restrictedMovements: string[];
  tensionLevel: number;
  depth: 'superficial' | 'deep';
}

export const SCAR_TYPES: Record<ScarType, { label: string; color: string; icon: string; description: string }> = {
  surgical_scar: { label: 'Surgical Scar', color: '#e91e8f', icon: '🔪', description: 'Post-surgical incision scar' },
  adhesion_band: { label: 'Adhesion Band', color: '#8b0000', icon: '🔗', description: 'Fibrous tissue band restricting movement' },
  fibrotic_area: { label: 'Fibrotic Area', color: '#8b4513', icon: '🟤', description: 'Area of fibrotic tissue change' },
};

export const TISSUE_LAYERS: Record<TissueLayer, { label: string; depth: number }> = {
  superficial: { label: 'Superficial (Skin/Subcutaneous)', depth: 1 },
  fascial: { label: 'Fascial Layer', depth: 2 },
  muscular: { label: 'Muscular Layer', depth: 3 },
  periosteal: { label: 'Periosteal (Bone Surface)', depth: 4 },
};

export const SCAR_SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Minimal', color: '#22c55e' },
  2: { label: 'Mild', color: '#84cc16' },
  3: { label: 'Moderate', color: '#eab308' },
  4: { label: 'Significant', color: '#f97316' },
  5: { label: 'Severe', color: '#ef4444' },
};

export const SCAR_AGE_LABELS: Record<ScarAge, { label: string; description: string }> = {
  acute: { label: 'Acute (0-6 weeks)', description: 'Active healing phase, fragile tissue' },
  subacute: { label: 'Subacute (6 weeks - 3 months)', description: 'Remodeling phase, gaining strength' },
  chronic: { label: 'Chronic (3-12 months)', description: 'Maturing scar, may still respond to treatment' },
  mature: { label: 'Mature (>12 months)', description: 'Fully matured scar tissue' },
};

const BONE_TO_MUSCLE_REGION: Record<string, string[]> = {};
for (const group of MUSCLE_GROUPS) {
  for (const bone of group.bones) {
    if (!BONE_TO_MUSCLE_REGION[bone]) BONE_TO_MUSCLE_REGION[bone] = [];
    BONE_TO_MUSCLE_REGION[bone].push(group.id);
  }
}

export interface ScarImpact {
  affectedChains: { chain: MyofascialChain; affectedMuscles: string[] }[];
  restrictedMovements: string[];
  clinicalNotes: string[];
}

export function getScarImpact(scar: ScarMarker): ScarImpact {
  const nearbyMuscles = BONE_TO_MUSCLE_REGION[scar.nearestBone] || [];

  const parentBone = scar.nearestBone.replace(/Part[12]_[LR]$/, '').replace(/_[LR]$/, '');
  const relatedBones = MUSCLE_GROUPS
    .filter(g => g.bones.some(b => b.includes(parentBone)))
    .map(g => g.id);
  const allMuscles = Array.from(new Set([...nearbyMuscles, ...relatedBones]));

  const affectedChains: { chain: MyofascialChain; affectedMuscles: string[] }[] = [];
  for (const chain of MYOFASCIAL_CHAINS) {
    const overlap = chain.links
      .filter(l => allMuscles.includes(l.muscleId))
      .map(l => l.muscleId);
    if (overlap.length > 0) {
      affectedChains.push({ chain, affectedMuscles: overlap });
    }
  }

  const restrictedMovements: string[] = [];
  const clinicalNotes: string[] = [];

  const severityFactor = scar.severity / 5;
  const mobilityFactor = scar.mobility === 'fixed' ? 1 : scar.mobility === 'tethered' ? 0.6 : 0.2;
  const impactLevel = severityFactor * mobilityFactor;

  if (scar.affectedLayers.includes('fascial')) {
    restrictedMovements.push('Fascial gliding restricted');
    clinicalNotes.push('Fascial layer involvement may cause adhesion to underlying structures');
  }
  if (scar.affectedLayers.includes('muscular')) {
    restrictedMovements.push('Muscle contractility affected');
    clinicalNotes.push('Muscular layer scarring may reduce force output and extensibility');
  }
  if (scar.affectedLayers.includes('periosteal')) {
    clinicalNotes.push('Periosteal involvement — potential bone-tissue tethering');
  }

  if (impactLevel > 0.6) {
    clinicalNotes.push(`High impact scar (severity ${scar.severity}/5, ${scar.mobility}) — likely contributing to movement dysfunction`);
    if (affectedChains.length > 0) {
      clinicalNotes.push(`Disrupting ${affectedChains.length} fascial chain(s) — tension propagation may be altered`);
    }
  } else if (impactLevel > 0.3) {
    clinicalNotes.push(`Moderate scar impact — may contribute to regional movement restrictions`);
  }

  if (scar.age === 'acute') {
    clinicalNotes.push('Acute scar — gentle mobilization indicated, avoid aggressive treatment');
  } else if (scar.age === 'subacute') {
    clinicalNotes.push('Subacute scar — responsive to progressive scar mobilization techniques');
  }

  return { affectedChains, restrictedMovements, clinicalNotes };
}

export interface AdhesionCompensation {
  restrictedRegion: string;
  compensatingRegions: string[];
  clinicalNotes: string[];
}

export function getAdhesionCompensations(adhesion: AdhesionBand): AdhesionCompensation {
  const startMuscles = BONE_TO_MUSCLE_REGION[adhesion.startBone] || [];
  const endMuscles = BONE_TO_MUSCLE_REGION[adhesion.endBone] || [];

  const compensatingRegions: string[] = [];
  const clinicalNotes: string[] = [];

  const allAffected = Array.from(new Set([...startMuscles, ...endMuscles]));
  for (const chain of MYOFASCIAL_CHAINS) {
    const affectedLinks = chain.links.filter(l => allAffected.includes(l.muscleId));
    if (affectedLinks.length > 0) {
      const unaffected = chain.links.filter(l => !allAffected.includes(l.muscleId));
      compensatingRegions.push(...unaffected.map(l => l.muscleId));
    }
  }

  if (adhesion.tensionLevel > 70) {
    clinicalNotes.push('High tension adhesion band — significant tissue restriction likely');
  } else if (adhesion.tensionLevel > 40) {
    clinicalNotes.push('Moderate tension adhesion — may limit end-range movement');
  }

  if (adhesion.depth === 'deep') {
    clinicalNotes.push('Deep adhesion — may require instrument-assisted or sustained pressure techniques');
  }

  if (adhesion.restrictedMovements.length > 0) {
    clinicalNotes.push(`Restricts: ${adhesion.restrictedMovements.join(', ')}`);
  }

  return {
    restrictedRegion: `${adhesion.startBone} to ${adhesion.endBone}`,
    compensatingRegions: Array.from(new Set(compensatingRegions)),
    clinicalNotes,
  };
}
