import { AlertTriangle, Activity, Heart, Brain, BookOpen, Users, FileText, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FormattedResponseProps {
  content: string;
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
}

interface ParsedSection {
  category: string;
  title: string;
  content: string[];
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export default function FormattedResponse({ content, evidenceGrade, confidenceLevel }: FormattedResponseProps) {
  const parseResponse = (text: string): ParsedSection[] => {
    const sections: ParsedSection[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection: ParsedSection | null = null;
    let currentContent: string[] = [];
    
    const categoryPatterns = [
      {
        patterns: [/red flag/i, /warning/i, /contraindication/i, /caution/i, /danger/i, /emergency/i],
        category: 'red-flags',
        title: 'Red Flags & Warnings',
        icon: <AlertTriangle className="h-5 w-5" />,
        colorClass: 'text-red-700',
        bgClass: 'bg-red-50',
        borderClass: 'border-l-4 border-red-500'
      },
      {
        patterns: [/assessment/i, /test/i, /examination/i, /diagnosis/i, /differential/i, /evaluate/i, /screen/i],
        category: 'assessment',
        title: 'Assessment & Diagnosis',
        icon: <FileText className="h-5 w-5" />,
        colorClass: 'text-amber-700',
        bgClass: 'bg-amber-50',
        borderClass: 'border-l-4 border-amber-500'
      },
      {
        patterns: [/treatment/i, /intervention/i, /management/i, /therapy/i, /approach/i, /technique/i, /modality/i],
        category: 'treatment',
        title: 'Treatment & Interventions',
        icon: <Heart className="h-5 w-5" />,
        colorClass: 'text-green-700',
        bgClass: 'bg-green-50',
        borderClass: 'border-l-4 border-green-500'
      },
      {
        patterns: [/exercise/i, /prescription/i, /program/i, /movement/i, /activity/i, /strengthen/i, /stretch/i, /mobility/i],
        category: 'exercise',
        title: 'Exercise Prescription',
        icon: <Activity className="h-5 w-5" />,
        colorClass: 'text-blue-700',
        bgClass: 'bg-blue-50',
        borderClass: 'border-l-4 border-blue-500'
      },
      {
        patterns: [/consider/i, /note/i, /important/i, /factor/i, /clinical/i, /recommendation/i],
        category: 'considerations',
        title: 'Clinical Considerations',
        icon: <Brain className="h-5 w-5" />,
        colorClass: 'text-purple-700',
        bgClass: 'bg-purple-50',
        borderClass: 'border-l-4 border-purple-500'
      },
      {
        patterns: [/patient education/i, /explain/i, /educate/i, /inform/i, /advice/i, /lifestyle/i],
        category: 'education',
        title: 'Patient Education',
        icon: <BookOpen className="h-5 w-5" />,
        colorClass: 'text-orange-700',
        bgClass: 'bg-orange-50',
        borderClass: 'border-l-4 border-orange-500'
      },
      {
        patterns: [/monitor/i, /follow-up/i, /review/i, /progress/i, /outcome/i, /reassess/i],
        category: 'monitoring',
        title: 'Monitoring & Follow-up',
        icon: <Users className="h-5 w-5" />,
        colorClass: 'text-teal-700',
        bgClass: 'bg-teal-50',
        borderClass: 'border-l-4 border-teal-500'
      }
    ];
    
    const detectCategory = (line: string) => {
      for (const cat of categoryPatterns) {
        for (const pattern of cat.patterns) {
          if (pattern.test(line)) {
            return cat;
          }
        }
      }
      return null;
    };
    
    const saveCurrentSection = () => {
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent;
        sections.push(currentSection);
        currentContent = [];
        currentSection = null;
      }
    };
    
    for (const line of lines) {
      const category = detectCategory(line);
      
      // Check if this line starts a new section (has a number or bullet followed by a strong indicator)
      const isNewSection = /^[\d\-\*•]\s*\*?\*?.*:/i.test(line) || /^#+\s/.test(line) || /^\*\*.*\*\*/.test(line);
      
      if (category && (isNewSection || !currentSection)) {
        // Save previous section if exists
        saveCurrentSection();
        
        // Start new section
        currentSection = {
          ...category,
          content: []
        };
        currentContent.push(line);
      } else if (currentSection) {
        // Add to current section
        currentContent.push(line);
      } else {
        // No section detected yet, check if we should start a general section
        const generalCategory = categoryPatterns.find(cat => cat.category === 'considerations');
        if (!currentSection && generalCategory) {
          currentSection = {
            ...generalCategory,
            title: 'General Information',
            icon: <Info className="h-5 w-5" />,
            content: []
          };
        }
        currentContent.push(line);
      }
    }
    
    // Save last section
    saveCurrentSection();
    
    // If no sections were created, create a general section with all content
    if (sections.length === 0 && lines.length > 0) {
      sections.push({
        category: 'general',
        title: 'Clinical Information',
        content: lines,
        icon: <Info className="h-5 w-5" />,
        colorClass: 'text-gray-700',
        bgClass: 'bg-gray-50',
        borderClass: 'border-l-4 border-gray-400'
      });
    }
    
    return sections;
  };
  
  const formatContent = (contentLines: string[]): React.ReactNode[] => {
    return contentLines.map((line, idx) => {
      // Remove markdown bold syntax but keep the emphasis
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Handle numbered lists
      if (/^\d+\./.test(line)) {
        formattedLine = formattedLine.replace(/^(\d+\.)/, '<span class="font-semibold">$1</span>');
      }
      
      // Handle bullet points
      if (/^[\-\*•]/.test(line)) {
        formattedLine = '• ' + formattedLine.replace(/^[\-\*•]\s*/, '');
      }
      
      return (
        <div 
          key={idx} 
          className="mb-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };
  
  const getEvidenceBadgeColor = (grade?: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const getConfidenceBadgeColor = (level?: string) => {
    switch (level) {
      case 'High': return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Low': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Very Low': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const sections = parseResponse(content);
  
  return (
    <div className="space-y-4">
      {/* Evidence badges if available */}
      {(evidenceGrade || confidenceLevel) && (
        <div className="flex gap-2 mb-4">
          {evidenceGrade && (
            <Badge className={`${getEvidenceBadgeColor(evidenceGrade)} border`}>
              Evidence Grade: {evidenceGrade}
            </Badge>
          )}
          {confidenceLevel && (
            <Badge className={`${getConfidenceBadgeColor(confidenceLevel)} border`}>
              Confidence: {confidenceLevel}
            </Badge>
          )}
        </div>
      )}
      
      {/* Formatted sections */}
      {sections.map((section, index) => (
        <div 
          key={index}
          className={`${section.borderClass} ${section.bgClass} p-4 rounded-r-lg shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className={`flex items-center gap-2 mb-3 ${section.colorClass}`}>
            {section.icon}
            <h3 className="font-semibold text-lg">{section.title}</h3>
          </div>
          <div className={`${section.colorClass} opacity-90`}>
            {formatContent(section.content)}
          </div>
        </div>
      ))}
    </div>
  );
}