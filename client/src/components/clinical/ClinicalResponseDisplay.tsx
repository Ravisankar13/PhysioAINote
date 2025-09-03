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
  Info
} from "lucide-react";

interface ClinicalSections {
  assessment?: string;
  clinicalReasoning?: string;
  treatmentPlan?: string;
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
        {!parsedSections.assessment && !parsedSections.clinicalReasoning && !parsedSections.treatmentPlan ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="space-y-4">
            {/* Assessment Section */}
            {parsedSections.assessment && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{parsedSections.assessment}</p>
                </CardContent>
              </Card>
            )}

            {/* Clinical Reasoning */}
            {parsedSections.clinicalReasoning && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    Clinical Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{parsedSections.clinicalReasoning}</p>
                </CardContent>
              </Card>
            )}

            {/* Differential Diagnosis */}
            {parsedSections.differentialDiagnosis && parsedSections.differentialDiagnosis.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-600" />
                    Differential Diagnosis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {parsedSections.differentialDiagnosis.map((dx, idx) => (
                      <li key={idx} className="text-sm">{dx}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Treatment Plan */}
            {parsedSections.treatmentPlan && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    Treatment Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{parsedSections.treatmentPlan}</p>
                </CardContent>
              </Card>
            )}

            {/* Red Flags */}
            {parsedSections.redFlags && parsedSections.redFlags.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Red Flags to Monitor</div>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Precautions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{parsedSections.precautions}</p>
                </CardContent>
              </Card>
            )}

            {/* Outcome Measures */}
            {parsedSections.outcomeMeasures && parsedSections.outcomeMeasures.length > 0 && (
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                    Recommended Outcome Measures
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    Billing Codes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
              <div className="mt-4 text-sm whitespace-pre-wrap">
                {extractRemainingContent(parsedSections, content)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to parse content for clinical sections
function parseContentForSections(content: string): ClinicalSections {
  const sections: ClinicalSections = {};
  
  // Look for common section headers and extract content
  const assessmentMatch = content.match(/(?:Assessment|ASSESSMENT):?\s*([\s\S]*?)(?=\n(?:Clinical Reasoning|Treatment|Differential|Red Flags|Precautions|Outcome|$))/i);
  if (assessmentMatch) sections.assessment = assessmentMatch[1].trim();
  
  const reasoningMatch = content.match(/(?:Clinical Reasoning|CLINICAL REASONING):?\s*([\s\S]*?)(?=\n(?:Assessment|Treatment|Differential|Red Flags|Precautions|Outcome|$))/i);
  if (reasoningMatch) sections.clinicalReasoning = reasoningMatch[1].trim();
  
  const treatmentMatch = content.match(/(?:Treatment Plan|TREATMENT PLAN|Treatment):?\s*([\s\S]*?)(?=\n(?:Assessment|Clinical Reasoning|Differential|Red Flags|Precautions|Outcome|$))/i);
  if (treatmentMatch) sections.treatmentPlan = treatmentMatch[1].trim();
  
  const precautionsMatch = content.match(/(?:Precautions|PRECAUTIONS):?\s*([\s\S]*?)(?=\n(?:Assessment|Clinical Reasoning|Treatment|Differential|Red Flags|Outcome|$))/i);
  if (precautionsMatch) sections.precautions = precautionsMatch[1].trim();
  
  // Look for numbered lists for differential diagnosis
  const differentialMatch = content.match(/(?:Differential Diagnosis|DIFFERENTIAL):?\s*((?:\d+\.\s*[^\n]+\n?)+)/i);
  if (differentialMatch) {
    sections.differentialDiagnosis = differentialMatch[1]
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }
  
  // Look for red flags
  const redFlagsMatch = content.match(/(?:Red Flags|RED FLAGS):?\s*((?:[-•]\s*[^\n]+\n?)+)/i);
  if (redFlagsMatch) {
    sections.redFlags = redFlagsMatch[1]
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-•]\s*/, '').trim());
  }
  
  return sections;
}

function containsAllContent(sections: ClinicalSections, content: string): boolean {
  const sectionContent = Object.values(sections).flat().join('');
  return sectionContent.length >= content.length * 0.8; // If sections contain 80% of content
}

function extractRemainingContent(sections: ClinicalSections, content: string): string {
  // Remove sectioned content from original to show remainder
  let remaining = content;
  Object.values(sections).flat().forEach(section => {
    if (typeof section === 'string') {
      remaining = remaining.replace(section, '');
    }
  });
  return remaining.trim();
}