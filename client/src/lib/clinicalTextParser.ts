import type { AnatomicalRegion } from '@/components/skeleton/PureThreeGLBViewer';

export type HighlightType = 'pain' | 'dysfunction' | 'referral' | 'weakness' | 'stiffness';

export interface RegionHighlight {
  region: AnatomicalRegion;
  type: HighlightType;
  severity: number; // 0-1
  label: string;
}

export interface ParsedClinicalContext {
  highlights: RegionHighlight[];
  primaryRegion: AnatomicalRegion | null;
}

interface RegionPattern {
  patterns: RegExp[];
  region: AnatomicalRegion;
  label: string;
}

const REGION_PATTERNS: RegionPattern[] = [
  {
    patterns: [
      /\b(low(er)?\s*back|lumbar|lumbosacral|L[1-5]|sacroiliac|SI\s*joint)\b/i,
      /\b(lumbar\s*(spine|region|area|disc|stenosis|radiculopathy|spondylosis))\b/i,
    ],
    region: 'lumbar_spine',
    label: 'Lumbar Spine',
  },
  {
    patterns: [
      /\b(thoracic|mid[\s-]*back|upper\s*back|T[1-9]|T1[0-2]|rib|costal|intercostal)\b/i,
      /\b(thoracic\s*(spine|region|area|kyphosis))\b/i,
    ],
    region: 'thoracic_spine',
    label: 'Thoracic Spine',
  },
  {
    patterns: [
      /\b(cervical|neck|C[1-7]|whiplash|torticollis|cervicogenic)\b/i,
      /\b(cervical\s*(spine|region|area|radiculopathy|myelopathy|spondylosis))\b/i,
    ],
    region: 'cervical_spine',
    label: 'Cervical Spine',
  },
  {
    patterns: [
      /\b(left\s*(shoulder|rotator\s*cuff|supraspinatus|infraspinatus|subscapularis|deltoid|acromion|AC\s*joint|glenohumeral|labr[au]m|SLAP))\b/i,
    ],
    region: 'left_shoulder',
    label: 'Left Shoulder',
  },
  {
    patterns: [
      /\b(right\s*(shoulder|rotator\s*cuff|supraspinatus|infraspinatus|subscapularis|deltoid|acromion|AC\s*joint|glenohumeral|labr[au]m|SLAP))\b/i,
    ],
    region: 'right_shoulder',
    label: 'Right Shoulder',
  },
  {
    patterns: [
      /\b(shoulder|rotator\s*cuff|supraspinatus|infraspinatus|subscapularis|deltoid|acromion|AC\s*joint|glenohumeral|labr[au]m|SLAP|impingement|frozen\s*shoulder|adhesive\s*capsulitis)\b/i,
    ],
    region: 'left_shoulder',
    label: 'Shoulder',
  },
  {
    patterns: [
      /\b(left\s*(hip|groin|trochant|gluteal|piriformis|labr[au]m|acetabul|femoral|FAI))\b/i,
    ],
    region: 'left_hip',
    label: 'Left Hip',
  },
  {
    patterns: [
      /\b(right\s*(hip|groin|trochant|gluteal|piriformis|labr[au]m|acetabul|femoral|FAI))\b/i,
    ],
    region: 'right_hip',
    label: 'Right Hip',
  },
  {
    patterns: [
      /\b(hip|groin|trochant|gluteal|piriformis|acetabul|FAI|femoroacetabular)\b/i,
    ],
    region: 'left_hip',
    label: 'Hip',
  },
  {
    patterns: [
      /\b(left\s*(knee|patell|meniscus|ACL|PCL|MCL|LCL|tibial|popliteal|ITB|IT\s*band))\b/i,
    ],
    region: 'left_knee',
    label: 'Left Knee',
  },
  {
    patterns: [
      /\b(right\s*(knee|patell|meniscus|ACL|PCL|MCL|LCL|tibial|popliteal|ITB|IT\s*band))\b/i,
    ],
    region: 'right_knee',
    label: 'Right Knee',
  },
  {
    patterns: [
      /\b(knee|patell|meniscus|ACL|PCL|MCL|LCL|popliteal|patellofemoral|chondromalacia)\b/i,
    ],
    region: 'left_knee',
    label: 'Knee',
  },
  {
    patterns: [
      /\b(left\s*(ankle|foot|achilles|plantar|calcaneal|talar|subtalar|metatarsal))\b/i,
    ],
    region: 'left_ankle',
    label: 'Left Ankle/Foot',
  },
  {
    patterns: [
      /\b(right\s*(ankle|foot|achilles|plantar|calcaneal|talar|subtalar|metatarsal))\b/i,
    ],
    region: 'right_ankle',
    label: 'Right Ankle/Foot',
  },
  {
    patterns: [
      /\b(ankle|foot|achilles|plantar\s*fasci|calcaneal|subtalar|metatarsal|heel\s*(pain|spur))\b/i,
    ],
    region: 'left_ankle',
    label: 'Ankle/Foot',
  },
  {
    patterns: [
      /\b(left\s*(elbow|epicondyl|olecranon|ulnar|radial\s*head|tennis\s*elbow|golfer'?s?\s*elbow))\b/i,
    ],
    region: 'left_elbow',
    label: 'Left Elbow',
  },
  {
    patterns: [
      /\b(right\s*(elbow|epicondyl|olecranon|ulnar|radial\s*head|tennis\s*elbow|golfer'?s?\s*elbow))\b/i,
    ],
    region: 'right_elbow',
    label: 'Right Elbow',
  },
  {
    patterns: [
      /\b(elbow|epicondyl|olecranon|tennis\s*elbow|golfer'?s?\s*elbow|lateral\s*epicondyl|medial\s*epicondyl)\b/i,
    ],
    region: 'left_elbow',
    label: 'Elbow',
  },
  {
    patterns: [
      /\b(pelvis|pelvic|sacr(um|al)|coccyx|pubic|SIJ|iliac|ischial)\b/i,
    ],
    region: 'pelvis',
    label: 'Pelvis',
  },
];

interface TypePattern {
  patterns: RegExp[];
  type: HighlightType;
  severityBoost: number;
}

const TYPE_PATTERNS: TypePattern[] = [
  {
    patterns: [
      /\b(pain|painful|ache|aching|hurt|sore|soreness|tender|tenderness|sharp|shooting|burning|throbbing|stabbing|excruciating|agony|discomfort|nociceptive)\b/i,
      /\b(VAS|NRS|pain\s*scale|pain\s*level|pain\s*score)\b/i,
    ],
    type: 'pain',
    severityBoost: 0,
  },
  {
    patterns: [
      /\b(dysfunction|dysfunctional|impairment|instability|unstable|sublux|malalign|deformity|degenerat|pathology|lesion|tear|rupture|fracture|sprain|strain)\b/i,
    ],
    type: 'dysfunction',
    severityBoost: 0.1,
  },
  {
    patterns: [
      /\b(referr|radiat|radiating|radiculopathy|radicular|sciatica|referred\s*pain|nerve\s*root|dermatomal|myotomal)\b/i,
    ],
    type: 'referral',
    severityBoost: 0,
  },
  {
    patterns: [
      /\b(weak|weakness|atrophy|atrophied|wasting|inhibit|inhibited|give\s*way|give\s*out|muscle\s*loss|paresis)\b/i,
    ],
    type: 'weakness',
    severityBoost: 0,
  },
  {
    patterns: [
      /\b(stiff|stiffness|restricted|restriction|limited|limitation|ROM|range\s*of\s*motion|hypomobil|tight|tightness|contracture|frozen)\b/i,
    ],
    type: 'stiffness',
    severityBoost: 0,
  },
];

const SEVERITY_PATTERNS: { pattern: RegExp; severity: number }[] = [
  { pattern: /\b(mild|slight|minor|minimal|low[\s-]*grade)\b/i, severity: 0.3 },
  { pattern: /\b(moderate|medium|intermediate)\b/i, severity: 0.6 },
  { pattern: /\b(severe|significant|marked|intense|acute|extreme|excruciating|debilitating|high[\s-]*grade)\b/i, severity: 0.9 },
  { pattern: /\b(chronic|persistent|long[\s-]*standing|recurrent|ongoing)\b/i, severity: 0.5 },
];

export function parseClinicalText(text: string): ParsedClinicalContext {
  const highlights: RegionHighlight[] = [];
  const seen = new Set<string>();

  let globalSeverity = 0.5;
  for (const sp of SEVERITY_PATTERNS) {
    if (sp.pattern.test(text)) {
      globalSeverity = sp.severity;
      break;
    }
  }

  let globalType: HighlightType = 'pain';
  for (const tp of TYPE_PATTERNS) {
    if (tp.patterns.some(p => p.test(text))) {
      globalType = tp.type;
      break;
    }
  }

  for (const rp of REGION_PATTERNS) {
    for (const pattern of rp.patterns) {
      if (pattern.test(text)) {
        const key = rp.region;
        if (!seen.has(key)) {
          seen.add(key);

          let regionType = globalType;
          let regionSeverity = globalSeverity;

          const surroundingMatch = text.match(new RegExp(`.{0,80}${pattern.source}.{0,80}`, 'i'));
          if (surroundingMatch) {
            const context = surroundingMatch[0];
            for (const tp of TYPE_PATTERNS) {
              if (tp.patterns.some(p => p.test(context))) {
                regionType = tp.type;
                regionSeverity = Math.min(1, regionSeverity + tp.severityBoost);
                break;
              }
            }
            for (const sp of SEVERITY_PATTERNS) {
              if (sp.pattern.test(context)) {
                regionSeverity = sp.severity;
                break;
              }
            }
          }

          highlights.push({
            region: rp.region,
            type: regionType,
            severity: regionSeverity,
            label: rp.label,
          });
        }
        break;
      }
    }
  }

  const primaryRegion = highlights.length > 0
    ? highlights.reduce((a, b) => a.severity >= b.severity ? a : b).region
    : null;

  return { highlights, primaryRegion };
}

export function mergeHighlights(contexts: ParsedClinicalContext[]): ParsedClinicalContext {
  const regionMap = new Map<AnatomicalRegion, RegionHighlight>();

  for (const ctx of contexts) {
    for (const h of ctx.highlights) {
      const existing = regionMap.get(h.region);
      if (!existing || h.severity > existing.severity) {
        regionMap.set(h.region, h);
      }
    }
  }

  const highlights = Array.from(regionMap.values());
  const primaryRegion = highlights.length > 0
    ? highlights.reduce((a, b) => a.severity >= b.severity ? a : b).region
    : null;

  return { highlights, primaryRegion };
}

export const HIGHLIGHT_COLORS: Record<HighlightType, { hex: number; css: string; label: string }> = {
  pain: { hex: 0xff3333, css: '#ff3333', label: 'Pain' },
  dysfunction: { hex: 0xff9900, css: '#ff9900', label: 'Dysfunction' },
  referral: { hex: 0x3399ff, css: '#3399ff', label: 'Referral' },
  weakness: { hex: 0xaa44ff, css: '#aa44ff', label: 'Weakness' },
  stiffness: { hex: 0xffcc00, css: '#ffcc00', label: 'Stiffness' },
};
