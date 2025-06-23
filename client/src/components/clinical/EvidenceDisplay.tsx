import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  FileText, 
  TrendingUp,
  Award,
  Calendar,
  Users,
  BookOpen
} from 'lucide-react';

interface ResearchPaper {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  pmid?: string;
  doi?: string;
  abstract: string;
  studyType: 'RCT' | 'Systematic Review' | 'Meta-Analysis' | 'Cohort' | 'Case Study' | 'Clinical Guideline';
  evidenceLevel: 'I' | 'II' | 'III' | 'IV' | 'V';
  gradeRecommendation: 'A' | 'B' | 'C' | 'D';
  relevanceScore: number;
}

interface EvidenceSummary {
  topic: string;
  primaryRecommendation: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  confidenceLevel: 'High' | 'Moderate' | 'Low' | 'Very Low';
  supportingStudies: ResearchPaper[];
  contradictoryEvidence?: string;
  clinicalConsiderations: string[];
  lastUpdated: Date;
}

interface EvidenceDisplayProps {
  evidenceSummary?: EvidenceSummary;
  researchPapers?: ResearchPaper[];
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
}

const getEvidenceGradeBadge = (grade: 'A' | 'B' | 'C' | 'D') => {
  const variants = {
    'A': { variant: 'default' as const, color: 'bg-green-500', label: 'Strong Evidence' },
    'B': { variant: 'secondary' as const, color: 'bg-blue-500', label: 'Moderate Evidence' },
    'C': { variant: 'outline' as const, color: 'bg-yellow-500', label: 'Limited Evidence' },
    'D': { variant: 'destructive' as const, color: 'bg-red-500', label: 'Insufficient Evidence' }
  };
  return variants[grade];
};

const getConfidenceBadge = (level: 'High' | 'Moderate' | 'Low' | 'Very Low') => {
  const variants = {
    'High': { variant: 'default' as const, color: 'text-green-700' },
    'Moderate': { variant: 'secondary' as const, color: 'text-blue-700' },
    'Low': { variant: 'outline' as const, color: 'text-yellow-700' },
    'Very Low': { variant: 'destructive' as const, color: 'text-red-700' }
  };
  return variants[level];
};

const getStudyTypeBadge = (type: ResearchPaper['studyType']) => {
  const variants = {
    'Meta-Analysis': { variant: 'default' as const, icon: TrendingUp },
    'Systematic Review': { variant: 'default' as const, icon: BookOpen },
    'RCT': { variant: 'secondary' as const, icon: Award },
    'Cohort': { variant: 'outline' as const, icon: Users },
    'Case Study': { variant: 'outline' as const, icon: FileText },
    'Clinical Guideline': { variant: 'default' as const, icon: BookOpen }
  };
  return variants[type];
};

export default function EvidenceDisplay({ 
  evidenceSummary, 
  researchPapers = [], 
  evidenceGrade, 
  confidenceLevel 
}: EvidenceDisplayProps) {
  const [expandedPapers, setExpandedPapers] = useState<Set<number>>(new Set());
  const [isEvidenceSummaryExpanded, setIsEvidenceSummaryExpanded] = useState(true);

  if (!evidenceSummary && (!researchPapers || researchPapers.length === 0)) {
    return null;
  }

  const togglePaperExpansion = (index: number) => {
    const newExpanded = new Set(expandedPapers);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPapers(newExpanded);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Evidence Summary */}
      {evidenceSummary && (
        <Card className="border-blue-200 bg-blue-50/30">
          <Collapsible 
            open={isEvidenceSummaryExpanded} 
            onOpenChange={setIsEvidenceSummaryExpanded}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-blue-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Award className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-blue-900">Evidence Summary</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge {...getEvidenceGradeBadge(evidenceSummary.evidenceGrade)}>
                          Grade {evidenceSummary.evidenceGrade}
                        </Badge>
                        <Badge {...getConfidenceBadge(evidenceSummary.confidenceLevel)}>
                          {evidenceSummary.confidenceLevel} Confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {isEvidenceSummaryExpanded ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Primary Recommendation</h4>
                  <p className="text-blue-800 bg-blue-50 p-3 rounded-md">
                    {evidenceSummary.primaryRecommendation}
                  </p>
                </div>

                {evidenceSummary.clinicalConsiderations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Clinical Considerations</h4>
                    <ul className="space-y-1">
                      {evidenceSummary.clinicalConsiderations.map((consideration, index) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          {consideration}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {evidenceSummary.supportingStudies.length} Supporting Studies
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Updated {new Date(evidenceSummary.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Research Papers */}
      {researchPapers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Supporting Research ({researchPapers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {researchPapers.map((paper, index) => {
                  const studyTypeBadge = getStudyTypeBadge(paper.studyType);
                  const isExpanded = expandedPapers.has(index);
                  
                  return (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm leading-tight mb-2">
                                {paper.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge {...studyTypeBadge}>
                                  <studyTypeBadge.icon className="h-3 w-3 mr-1" />
                                  {paper.studyType}
                                </Badge>
                                <Badge variant="outline">
                                  Level {paper.evidenceLevel}
                                </Badge>
                                <Badge {...getEvidenceGradeBadge(paper.gradeRecommendation)}>
                                  Grade {paper.gradeRecommendation}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePaperExpansion(index)}
                              className="flex-shrink-0"
                            >
                              {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </Button>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span>{paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}</span>
                              <span>•</span>
                              <span className="font-medium">{paper.journal}</span>
                              <span>•</span>
                              <span>{paper.year}</span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="space-y-3 pt-3 border-t">
                              <div>
                                <h5 className="font-medium text-sm mb-1">Abstract</h5>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {paper.abstract}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {paper.pmid && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a 
                                      href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      PubMed
                                    </a>
                                  </Button>
                                )}
                                {paper.doi && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a 
                                      href={`https://doi.org/${paper.doi}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      DOI
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Overall Evidence Grade (if not part of summary) */}
      {!evidenceSummary && (evidenceGrade || confidenceLevel) && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-blue-600" />
              <div className="flex items-center gap-2">
                {evidenceGrade && (
                  <Badge {...getEvidenceGradeBadge(evidenceGrade)}>
                    Evidence Grade {evidenceGrade}
                  </Badge>
                )}
                {confidenceLevel && (
                  <Badge {...getConfidenceBadge(confidenceLevel)}>
                    {confidenceLevel} Confidence
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}