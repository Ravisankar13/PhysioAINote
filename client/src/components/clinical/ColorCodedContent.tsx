import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Stethoscope, 
  Activity, 
  AlertTriangle, 
  BookOpen, 
  GraduationCap, 
  AlertCircle 
} from 'lucide-react';

interface ColorCodedSection {
  type: 'assessment' | 'treatment' | 'differential' | 'evidence' | 'education' | 'precautions';
  content: string;
  title?: string;
}

interface ColorCodedContentProps {
  content: string;
}

// Enhanced keywords and patterns for content classification
const contentClassifiers = {
  assessment: [
    'physical examination', 'assess', 'evaluate', 'test', 'measure', 'palpation', 'observation',
    'range of motion', 'ROM', 'strength test', 'special tests', 'outcome measures',
    'functional assessment', 'postural analysis', 'gait analysis', 'pain scale',
    'neurological examination', 'reflexes', 'sensation', 'inspection', 'palpate',
    'muscle testing', 'joint mobility', 'flexibility', 'stability test', 'provocative test',
    'orthopedic test', 'neurodynamic', 'ligament test', 'meniscus test', 'impingement test',
    'AROM', 'PROM', 'MMT', 'manual muscle test', 'tender points', 'trigger points'
  ],
  treatment: [
    'treatment', 'intervention', 'exercise', 'therapy', 'manual therapy', 'mobilization',
    'manipulation', 'strengthening', 'stretching', 'modalities', 'ultrasound',
    'electrotherapy', 'heat', 'cold', 'massage', 'rehabilitation', 'program',
    'home exercises', 'progressive', 'protocol', 'therapeutic exercise', 'conditioning',
    'eccentric', 'concentric', 'isometric', 'plyometric', 'proprioception', 'balance training',
    'cardiovascular', 'endurance', 'flexibility training', 'core stabilization',
    'soft tissue mobilization', 'joint mobilization', 'neural mobilization', 'dry needling'
  ],
  differential: [
    'differential diagnosis', 'consider', 'rule out', 'possible', 'could be', 'may indicate',
    'differential', 'diagnosis', 'conditions', 'pathology', 'lesion', 'injury',
    'syndrome', 'disorder', 'disease', 'etiology', 'causative factors', 'underlying cause',
    'mimics', 'alternative diagnosis', 'comorbidity', 'associated conditions'
  ],
  evidence: [
    'research', 'study', 'evidence', 'systematic review', 'meta-analysis', 'RCT',
    'clinical trial', 'literature', 'grade', 'level of evidence', 'cochrane',
    'pubmed', 'journal', 'published', 'findings', 'statistics', 'p-value',
    'confidence interval', 'effect size', 'clinical significance', 'evidence-based',
    'best practice', 'guidelines', 'consensus', 'recommendation grade'
  ],
  education: [
    'explain', 'patient education', 'understanding', 'prognosis', 'recovery',
    'self-management', 'lifestyle', 'prevention', 'advice', 'guidance',
    'what to expect', 'healing', 'timeline', 'factors', 'modification', 'ergonomics',
    'activity modification', 'load management', 'pacing', 'sleep hygiene'
  ],
  precautions: [
    'red flags', 'contraindications', 'precautions', 'warning', 'avoid', 'stop',
    'serious', 'emergency', 'refer', 'medical attention', 'danger', 'risk',
    'complications', 'adverse', 'safety', 'caution', 'absolute contraindication',
    'relative contraindication', 'monitoring required', 'immediately discontinue'
  ]
};

const colorSchemes = {
  assessment: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    title: 'text-green-800',
    content: 'text-green-900',
    iconComponent: Stethoscope
  },
  treatment: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-800',
    content: 'text-blue-900',
    iconComponent: Activity
  },
  differential: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    title: 'text-orange-800',
    content: 'text-orange-900',
    iconComponent: AlertTriangle
  },
  evidence: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    title: 'text-purple-800',
    content: 'text-purple-900',
    iconComponent: BookOpen
  },
  education: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'text-teal-600',
    title: 'text-teal-800',
    content: 'text-teal-900',
    iconComponent: GraduationCap
  },
  precautions: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    title: 'text-red-800',
    content: 'text-red-900',
    iconComponent: AlertCircle
  }
};

function classifyContent(text: string): ColorCodedSection['type'] {
  const lowerText = text.toLowerCase();
  const scores: Record<ColorCodedSection['type'], number> = {
    assessment: 0,
    treatment: 0,
    differential: 0,
    evidence: 0,
    education: 0,
    precautions: 0
  };

  // Count keyword matches for each category
  Object.entries(contentClassifiers).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        scores[category as ColorCodedSection['type']]++;
      }
    });
  });

  // Return category with highest score, default to 'education' if tied or no matches
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'education';
  
  return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as ColorCodedSection['type'] || 'education';
}

function parseContentIntoSections(content: string): ColorCodedSection[] {
  // Split content by numbered lists, bullet points, or paragraphs
  const sections = content.split(/(?:\d+\.\s|\*\s|-\s|##\s|###\s|\n\n)/).filter(section => section.trim().length > 20);
  
  if (sections.length <= 1) {
    // If no clear sections, return the whole content
    return [{
      type: classifyContent(content),
      content: content.trim()
    }];
  }

  return sections.map((section, index) => {
    const trimmedSection = section.trim();
    if (!trimmedSection) return null;

    // Extract title if it looks like a header
    const lines = trimmedSection.split('\n');
    const firstLine = lines[0];
    const isTitle = firstLine.length < 100 && (
      firstLine.includes(':') || 
      firstLine.match(/^[A-Z][a-z].*[^.]$/) ||
      firstLine.includes('**')
    );

    return {
      type: classifyContent(trimmedSection),
      content: trimmedSection,
      title: isTitle ? firstLine.replace(/\*\*/g, '') : undefined
    };
  }).filter(Boolean) as ColorCodedSection[];
}

export default function ColorCodedContent({ content }: ColorCodedContentProps) {
  const sections = parseContentIntoSections(content);

  if (sections.length === 1 && !sections[0].title) {
    // Single section without clear categorization - show as plain text
    return (
      <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const scheme = colorSchemes[section.type];
        const IconComponent = scheme.iconComponent;

        return (
          <Card 
            key={index} 
            className={`${scheme.bg} ${scheme.border} border p-3 rounded-lg`}
          >
            <div className="flex items-start gap-2">
              <IconComponent className={`h-4 w-4 ${scheme.icon} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                {section.title && (
                  <h4 className={`font-semibold ${scheme.title} text-sm mb-1`}>
                    {section.title}
                  </h4>
                )}
                <div className={`whitespace-pre-wrap text-xs leading-relaxed ${scheme.content}`}>
                  {section.content}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}