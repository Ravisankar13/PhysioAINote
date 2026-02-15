import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  ClipboardCheck, 
  Target,
  FileText,
  BookOpen,
  Info,
  Stethoscope,
  TrendingUp,
  HelpCircle,
  ListChecks
} from "lucide-react";

interface ClinicalSections {
  sessionSummary?: string;
  clinicalFindings?: string;
  assessment?: string;
  clinicalReasoning?: string;
  treatmentPlan?: string;
  prognosis?: string;
  missingInformation?: string;
  precautions?: string;
  redFlags?: string[];
  differentialDiagnosis?: string[];
  outcomeMeasures?: string[];
}

interface ClinicalResponseProps {
  content: string;
  evidenceGrade?: 'A' | 'B' | 'C' | 'D';
  confidenceLevel?: 'High' | 'Moderate' | 'Low' | 'Very Low';
  clinicalSections?: ClinicalSections;
  contraindications?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
  professionalMode?: boolean;
}

export default function ClinicalResponseDisplay({
  content,
  evidenceGrade,
  confidenceLevel,
  clinicalSections,
  contraindications,
  icdCodes,
  cptCodes,
  professionalMode
}: ClinicalResponseProps) {
  // Parse content for clinical structure if sections not provided
  const parsedSections = clinicalSections || parseContentForSections(content);
  
  return (
    <div className="space-y-4">
      {/* Evidence and Confidence Badges */}
      {(evidenceGrade || confidenceLevel) && (
        <div className="flex gap-2 flex-wrap">
          {evidenceGrade && (
            <Badge 
              variant={evidenceGrade === 'A' ? 'default' : evidenceGrade === 'B' ? 'secondary' : 'outline'}
              className="flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              Grade {evidenceGrade} Evidence
            </Badge>
          )}
          {confidenceLevel && (
            <Badge 
              variant={confidenceLevel === 'High' ? 'default' : confidenceLevel === 'Moderate' ? 'secondary' : 'outline'}
              className="flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              {confidenceLevel} Confidence
            </Badge>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="prose prose-sm max-w-none">
        {!parsedSections.assessment && !parsedSections.clinicalReasoning && !parsedSections.treatmentPlan && !parsedSections.sessionSummary && !parsedSections.clinicalFindings ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(content)}</div>
        ) : (
          <div className="space-y-3">
            {/* Session Summary */}
            {parsedSections.sessionSummary && (
              <Card className="border-slate-200 bg-slate-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-slate-600" />
                    Session Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.sessionSummary)}</div>
                </CardContent>
              </Card>
            )}

            {/* Clinical Findings */}
            {parsedSections.clinicalFindings && (
              <Card className="border-cyan-200 bg-cyan-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-cyan-600" />
                    Clinical Findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.clinicalFindings)}</div>
                </CardContent>
              </Card>
            )}

            {/* Differential Diagnosis */}
            {parsedSections.differentialDiagnosis && parsedSections.differentialDiagnosis.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-600" />
                    Differential Diagnosis
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ul className="space-y-1.5">
                    {parsedSections.differentialDiagnosis.map((dx, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="font-semibold text-amber-700 min-w-[20px]">{idx + 1}.</span>
                        <span>{dx}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Assessment */}
            {parsedSections.assessment && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.assessment)}</div>
                </CardContent>
              </Card>
            )}

            {/* Clinical Reasoning */}
            {parsedSections.clinicalReasoning && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    Clinical Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.clinicalReasoning)}</div>
                </CardContent>
              </Card>
            )}

            {/* Treatment Plan */}
            {parsedSections.treatmentPlan && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    Treatment Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.treatmentPlan)}</div>
                </CardContent>
              </Card>
            )}

            {/* Prognosis */}
            {parsedSections.prognosis && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Prognosis
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.prognosis)}</div>
                </CardContent>
              </Card>
            )}

            {/* Missing Information */}
            {parsedSections.missingInformation && (
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-orange-600" />
                    Missing Information / Additional Assessment Needed
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.missingInformation)}</div>
                </CardContent>
              </Card>
            )}

            {/* Red Flags */}
            {parsedSections.redFlags && parsedSections.redFlags.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium text-red-800">Red Flags</div>
                    <ul className="list-disc list-inside space-y-1">
                      {parsedSections.redFlags.map((flag, idx) => (
                        <li key={idx} className="text-sm">{flag}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Contraindications */}
            {contraindications && contraindications.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Contraindications</div>
                    <ul className="list-disc list-inside space-y-1">
                      {contraindications.map((ci, idx) => (
                        <li key={idx} className="text-sm">{ci}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Precautions */}
            {parsedSections.precautions && (
              <Card className="border-yellow-200 bg-yellow-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Precautions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderMarkdown(parsedSections.precautions)}</div>
                </CardContent>
              </Card>
            )}

            {/* Outcome Measures */}
            {parsedSections.outcomeMeasures && parsedSections.outcomeMeasures.length > 0 && (
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                    Recommended Outcome Measures
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ul className="list-disc list-inside space-y-1">
                    {parsedSections.outcomeMeasures.map((measure, idx) => (
                      <li key={idx} className="text-sm">{measure}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Professional Mode - ICD/CPT Codes */}
            {professionalMode && (icdCodes || cptCodes) && (
              <Card className="border-gray-300 bg-gray-50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    Billing Codes
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-3">
                  {icdCodes && icdCodes.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">ICD-10 Codes</div>
                      <div className="flex flex-wrap gap-1">
                        {icdCodes.map((code, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-mono">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {cptCodes && cptCodes.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">CPT Codes</div>
                      <div className="flex flex-wrap gap-1">
                        {cptCodes.map((code, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-mono">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Remaining content that doesn't fit sections */}
            {content && !containsAllContent(parsedSections, content) && (
              <div className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">
                {renderMarkdown(extractRemainingContent(parsedSections, content))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderInlineFormatting(text: string, keyPrefix: string = ''): JSX.Element[] {
  const parts: JSX.Element[] = [];
  const boldItalicRegex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;
  let partIdx = 0;

  while ((match = boldItalicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-t${partIdx++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-bi${partIdx++}`}><em>{match[1]}</em></strong>);
    } else if (match[2]) {
      parts.push(<strong key={`${keyPrefix}-b${partIdx++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={`${keyPrefix}-i${partIdx++}`}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-t${partIdx}`}>{text.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? parts : [<span key={`${keyPrefix}-raw`}>{text}</span>];
}

function renderMarkdown(text: string): JSX.Element {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-•*]\s*/, '');
      elements.push(
        <div key={i} className="flex items-start gap-1.5 ml-2">
          <span className="text-gray-400 mt-0.5">•</span>
          <span>{renderInlineFormatting(content, `l${i}`)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      const content = trimmed.replace(/^\d+\.\s*/, '');
      elements.push(
        <div key={i} className="flex items-start gap-1.5 ml-2">
          <span className="font-semibold text-gray-500 min-w-[16px]">{num}.</span>
          <span>{renderInlineFormatting(content, `l${i}`)}</span>
        </div>
      );
    } else if (trimmed === '') {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<div key={i}>{renderInlineFormatting(trimmed, `l${i}`)}</div>);
    }
  });

  return <>{elements}</>;
}

function parseContentForSections(content: string): ClinicalSections {
  const sections: ClinicalSections = {};

  const headerKeyMap: [RegExp, string][] = [
    [/session summary/i, 'sessionSummary'],
    [/clinical findings/i, 'clinicalFindings'],
    [/differential diagnos/i, 'differentialDiagnosis'],
    [/assessment/i, 'assessment'],
    [/clinical reasoning/i, 'clinicalReasoning'],
    [/treatment plan/i, 'treatmentPlan'],
    [/prognosis/i, 'prognosis'],
    [/missing information/i, 'missingInformation'],
    [/red flags/i, 'redFlags'],
    [/precautions/i, 'precautions'],
    [/outcome measures/i, 'outcomeMeasures'],
  ];

  const headerRegex = /^#{1,3}\s+(.+)$/gm;
  const headers: { key: string; bodyStart: number; matchStart: number }[] = [];
  let headerMatch;

  while ((headerMatch = headerRegex.exec(content)) !== null) {
    const headerText = headerMatch[1].trim();
    let mappedKey: string | null = null;
    for (const [pattern, key] of headerKeyMap) {
      if (pattern.test(headerText)) {
        mappedKey = key;
        break;
      }
    }
    if (mappedKey) {
      headers.push({ key: mappedKey, bodyStart: headerMatch.index + headerMatch[0].length, matchStart: headerMatch.index });
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const bodyEnd = i + 1 < headers.length ? headers[i + 1].matchStart : content.length;
    const sectionContent = content.slice(headers[i].bodyStart, bodyEnd).trim();

    if (headers[i].key === 'differentialDiagnosis') {
      sections.differentialDiagnosis = sectionContent
        .split('\n')
        .filter(l => l.trim())
        .map(l => l.replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim())
        .filter(l => l.length > 0);
    } else if (headers[i].key === 'redFlags') {
      sections.redFlags = sectionContent
        .split('\n')
        .filter(l => l.trim())
        .map(l => l.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(l => l.length > 0);
    } else if (headers[i].key === 'outcomeMeasures') {
      sections.outcomeMeasures = sectionContent
        .split('\n')
        .filter(l => l.trim())
        .map(l => l.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(l => l.length > 0);
    } else {
      (sections as any)[headers[i].key] = sectionContent;
    }
  }

  if (headers.length === 0) {
    const legacyAssessment = content.match(/(?:Assessment|ASSESSMENT):?\s*([\s\S]*?)(?=\n(?:Clinical Reasoning|Treatment|Differential|Red Flags|Precautions|Outcome|$))/i);
    if (legacyAssessment) sections.assessment = legacyAssessment[1].trim();

    const legacyReasoning = content.match(/(?:Clinical Reasoning|CLINICAL REASONING):?\s*([\s\S]*?)(?=\n(?:Assessment|Treatment|Differential|Red Flags|Precautions|Outcome|$))/i);
    if (legacyReasoning) sections.clinicalReasoning = legacyReasoning[1].trim();

    const legacyTreatment = content.match(/(?:Treatment Plan|TREATMENT PLAN|Treatment):?\s*([\s\S]*?)(?=\n(?:Assessment|Clinical Reasoning|Differential|Red Flags|Precautions|Outcome|$))/i);
    if (legacyTreatment) sections.treatmentPlan = legacyTreatment[1].trim();

    const legacyDiff = content.match(/(?:Differential Diagnosis|DIFFERENTIAL):?\s*((?:\d+\.\s*[^\n]+\n?)+)/i);
    if (legacyDiff) {
      sections.differentialDiagnosis = legacyDiff[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, '').trim());
    }

    const legacyRedFlags = content.match(/(?:Red Flags|RED FLAGS):?\s*((?:[-•]\s*[^\n]+\n?)+)/i);
    if (legacyRedFlags) {
      sections.redFlags = legacyRedFlags[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•]\s*/, '').trim());
    }
  }

  return sections;
}

function containsAllContent(sections: ClinicalSections, content: string): boolean {
  const sectionContent = Object.values(sections).flat().join('');
  return sectionContent.length >= content.length * 0.5;
}

function extractRemainingContent(sections: ClinicalSections, content: string): string {
  let remaining = content;
  remaining = remaining.replace(/#{1,3}\s*(Session Summary|Clinical Findings|Differential Diagnosis|Assessment|Clinical Reasoning|Treatment Plan|Prognosis|Missing Information|Red Flags|Precautions|Outcome Measures)[^\n]*/gi, '');
  Object.values(sections).flat().forEach(section => {
    if (typeof section === 'string' && section.length > 10) {
      remaining = remaining.replace(section, '');
    }
  });
  return remaining.trim();
}