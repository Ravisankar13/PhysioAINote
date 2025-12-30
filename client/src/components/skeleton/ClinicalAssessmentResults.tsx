import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Stethoscope, 
  AlertTriangle, 
  BookOpen, 
  Activity, 
  Target, 
  FileText,
  CheckCircle2,
  Clock,
  Dumbbell,
  Brain
} from "lucide-react";

interface TreatmentIntervention {
  type: string;
  name: string;
  description: string;
  frequency: string;
  evidence: string;
}

interface TreatmentPhase {
  name: string;
  duration: string;
  goals: string[];
  interventions: TreatmentIntervention[];
}

interface ResearchCitation {
  title: string;
  authors: string;
  year: number;
  journal: string;
  keyFinding: string;
  clinicalRelevance: string;
}

interface ClinicalAssessmentResult {
  diagnosis: {
    primaryHypothesis: string;
    differentialDiagnoses: string[];
    confidence: string;
    clinicalReasoning: string;
  };
  movementFindings: {
    summary: string;
    keyImpairments: string[];
    functionalLimitations: string[];
  };
  treatmentPlan: {
    phase1: TreatmentPhase;
    phase2: TreatmentPhase;
    phase3: TreatmentPhase;
    precautions: string[];
    prognosis: string;
  };
  researchEvidence: {
    articles: ResearchCitation[];
    evidenceSummary: string;
    levelOfEvidence: string;
  };
  redFlagAlert: {
    present: boolean;
    flags: string[];
    recommendation: string;
  } | null;
}

interface ClinicalAssessmentResultsProps {
  assessment: ClinicalAssessmentResult;
  isLoading?: boolean;
  className?: string;
}

export default function ClinicalAssessmentResults({ 
  assessment, 
  isLoading,
  className 
}: ClinicalAssessmentResultsProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-slate-400">Analyzing movement patterns and generating clinical assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const diagnosis = assessment?.diagnosis || { primaryHypothesis: 'Assessment pending', differentialDiagnoses: [], confidence: 'low', clinicalReasoning: '' };
  const movementFindings = assessment?.movementFindings || { summary: '', keyImpairments: [], functionalLimitations: [] };
  const treatmentPlan = assessment?.treatmentPlan || { phase1: { name: '', duration: '', goals: [], interventions: [] }, phase2: { name: '', duration: '', goals: [], interventions: [] }, phase3: { name: '', duration: '', goals: [], interventions: [] }, precautions: [], prognosis: '' };
  const researchEvidence = assessment?.researchEvidence || { articles: [], evidenceSummary: '', levelOfEvidence: '' };

  const confidenceColor = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[diagnosis.confidence] || 'bg-slate-500/20 text-slate-400';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-purple-500" />
          Clinical Assessment Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assessment?.redFlagAlert?.present && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Red Flags Identified</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {assessment.redFlagAlert.flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
              <p className="mt-2 font-semibold">{assessment.redFlagAlert.recommendation}</p>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="diagnosis" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="diagnosis" className="text-xs">
              <Stethoscope className="h-3 w-3 mr-1" />
              Diagnosis
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Findings
            </TabsTrigger>
            <TabsTrigger value="treatment" className="text-xs">
              <Dumbbell className="h-3 w-3 mr-1" />
              Treatment
            </TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Evidence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagnosis" className="mt-0">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-400">Primary Hypothesis</h4>
                    <Badge className={confidenceColor}>
                      {diagnosis.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-lg font-medium">{diagnosis.primaryHypothesis}</p>
                </div>

                {diagnosis.differentialDiagnoses.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-400" />
                      Differential Diagnoses
                    </h4>
                    <ul className="space-y-1">
                      {diagnosis.differentialDiagnoses.map((dx, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          {dx}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    Clinical Reasoning
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {diagnosis.clinicalReasoning}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="findings" className="mt-0">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Movement Analysis Summary</h4>
                  <p className="text-sm text-slate-300">{movementFindings.summary}</p>
                </div>

                {movementFindings.keyImpairments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-orange-400">Key Impairments</h4>
                    <div className="flex flex-wrap gap-2">
                      {movementFindings.keyImpairments.map((imp, i) => (
                        <Badge key={i} variant="outline" className="border-orange-500/30">
                          {imp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {movementFindings.functionalLimitations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-400">Functional Limitations</h4>
                    <ul className="space-y-1">
                      {movementFindings.functionalLimitations.map((lim, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          {lim}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="treatment" className="mt-0">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {[treatmentPlan.phase1, treatmentPlan.phase2, treatmentPlan.phase3]
                  .filter(phase => phase.goals.length > 0 || phase.interventions.length > 0)
                  .map((phase, i) => (
                    <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-400">{phase.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {phase.duration}
                        </Badge>
                      </div>
                      
                      {phase.goals.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-400 mb-1">Goals:</p>
                          <ul className="space-y-1">
                            {phase.goals.map((goal, j) => (
                              <li key={j} className="text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {phase.interventions.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Interventions:</p>
                          <div className="space-y-2">
                            {phase.interventions.map((int, j) => (
                              <div key={j} className="p-2 bg-slate-900/50 rounded text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs">{int.type}</Badge>
                                  <span className="font-medium">{int.name}</span>
                                </div>
                                <p className="text-slate-400 text-xs">{int.description}</p>
                                <div className="flex items-center justify-between mt-1 text-xs">
                                  <span className="text-cyan-400">Frequency: {int.frequency}</span>
                                </div>
                                {int.evidence && (
                                  <p className="text-xs text-purple-400 mt-1 italic">
                                    Evidence: {int.evidence}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                {treatmentPlan.precautions.length > 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Precautions
                    </h4>
                    <ul className="space-y-1">
                      {treatmentPlan.precautions.map((p, i) => (
                        <li key={i} className="text-sm">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-semibold text-green-400 mb-1">Prognosis</h4>
                  <p className="text-sm">{treatmentPlan.prognosis}</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="evidence" className="mt-0">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-purple-400">Evidence Summary</h4>
                    <Badge variant="outline" className="text-xs">
                      {researchEvidence.levelOfEvidence || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300">{researchEvidence.evidenceSummary || 'Assessment pending...'}</p>
                </div>

                {researchEvidence.articles.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      Supporting Research
                    </h4>
                    <div className="space-y-3">
                      {researchEvidence.articles.map((article, i) => (
                        <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                          <p className="font-medium text-sm">{article.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {article.authors} ({article.year}) - {article.journal}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs">
                              <span className="text-cyan-400">Key Finding: </span>
                              {article.keyFinding}
                            </p>
                            <p className="text-xs">
                              <span className="text-green-400">Clinical Relevance: </span>
                              {article.clinicalRelevance}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {researchEvidence.articles.length === 0 && (
                  <p className="text-sm text-slate-400 italic">
                    No specific research articles matched the clinical presentation. 
                    Recommendations are based on clinical guidelines and expert consensus.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
