import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Stethoscope, AlertTriangle, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";
import { JointConstraint, CompensationResult } from "@/lib/jointConstraints";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DiagnosticResult {
  diagnoses: {
    name: string;
    confidence: "high" | "moderate" | "low";
    icd10Code?: string;
    reasoning: string;
  }[];
  clinicalReasoning: string;
  recommendedTests: {
    name: string;
    purpose: string;
    expectedFinding: string;
  }[];
  redFlags: string[];
  differentialConsiderations: string[];
}

interface DiagnosticAssessmentPanelProps {
  constraints: JointConstraint[];
  compensationResult: CompensationResult;
  className?: string;
}

export function DiagnosticAssessmentPanel({
  constraints,
  compensationResult,
  className = "",
}: DiagnosticAssessmentPanelProps) {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);

  const diagnoseMutation = useMutation({
    mutationFn: async () => {
      const activeConstraints = constraints.filter(c => c.isActive);
      console.log("Sending diagnosis request with:", { 
        constraints: activeConstraints,
        compensationPatterns: compensationResult.patterns 
      });
      
      const result = await apiRequest("/api/diagnose-movement-pattern", "POST", {
        constraints: activeConstraints,
        compensationPatterns: compensationResult.patterns,
        overloadedStructures: compensationResult.overloadedStructures,
        clinicalWarnings: compensationResult.clinicalWarnings,
      });
      
      console.log("Diagnosis result:", result);
      return result;
    },
    onSuccess: (data) => {
      setDiagnosticResult(data);
    },
    onError: (error) => {
      console.error("Diagnosis mutation error:", error);
    },
  });

  const activeConstraints = constraints.filter(c => c.isActive);

  const getConfidenceBadge = (confidence: "high" | "moderate" | "low") => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-green-500 text-white">High</Badge>;
      case "moderate":
        return <Badge className="bg-yellow-500 text-white">Moderate</Badge>;
      case "low":
        return <Badge className="bg-gray-500 text-white">Low</Badge>;
    }
  };

  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Stethoscope className="h-5 w-5 text-blue-400" />
          Diagnostic Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeConstraints.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add joint constraints to enable diagnostic analysis</p>
            <p className="text-xs mt-1 opacity-70">
              Set movement restrictions using the Constraints panel
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-300 mb-2">
                <span className="font-medium text-white">{activeConstraints.length}</span> active constraint{activeConstraints.length !== 1 ? 's' : ''} detected
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {activeConstraints.slice(0, 4).map((c) => (
                  <Badge key={c.id} variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {c.joint.replace(/_/g, ' ')} - {c.movement.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {activeConstraints.length > 4 && (
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                    +{activeConstraints.length - 4} more
                  </Badge>
                )}
              </div>
              <Button
                onClick={() => diagnoseMutation.mutate()}
                disabled={diagnoseMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-analyze-diagnosis"
              >
                {diagnoseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Analyze Movement Pattern
                  </>
                )}
              </Button>
            </div>

            {diagnoseMutation.isError && (
              <div className="bg-red-900/30 border border-red-700 rounded-md p-3 mb-4">
                <p className="text-red-400 text-sm">
                  Failed to analyze. Please try again.
                </p>
              </div>
            )}

            {diagnosticResult && (
              <ScrollArea className="h-[400px] pr-2">
                {diagnosticResult.redFlags.length > 0 && (
                  <div className="bg-red-900/30 border border-red-700 rounded-md p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="font-medium text-red-400">Red Flags</span>
                    </div>
                    <ul className="text-sm text-red-300 space-y-1">
                      {diagnosticResult.redFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Differential Diagnoses
                  </h4>
                  <div className="space-y-3">
                    {diagnosticResult.diagnoses.map((dx, i) => (
                      <div
                        key={i}
                        className="bg-slate-700/50 rounded-md p-3 border border-slate-600"
                        data-testid={`diagnosis-card-${i}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-white">{dx.name}</span>
                          {getConfidenceBadge(dx.confidence)}
                        </div>
                        {dx.icd10Code && (
                          <span className="text-xs text-slate-400 block mb-1">
                            ICD-10: {dx.icd10Code}
                          </span>
                        )}
                        <p className="text-sm text-slate-300">{dx.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-4 bg-slate-700" />

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">Clinical Reasoning</h4>
                  <p className="text-sm text-slate-300 bg-slate-700/30 p-3 rounded-md">
                    {diagnosticResult.clinicalReasoning}
                  </p>
                </div>

                <Separator className="my-4 bg-slate-700" />

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">Recommended Clinical Tests</h4>
                  <div className="space-y-2">
                    {diagnosticResult.recommendedTests.map((test, i) => (
                      <div
                        key={i}
                        className="bg-slate-700/30 rounded-md p-2 text-sm"
                        data-testid={`test-recommendation-${i}`}
                      >
                        <div className="flex items-center gap-1 text-blue-400 font-medium">
                          <ArrowRight className="h-3 w-3" />
                          {test.name}
                        </div>
                        <p className="text-slate-400 text-xs mt-1">
                          <span className="text-slate-500">Purpose:</span> {test.purpose}
                        </p>
                        <p className="text-slate-400 text-xs">
                          <span className="text-slate-500">Expected:</span> {test.expectedFinding}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {diagnosticResult.differentialConsiderations.length > 0 && (
                  <>
                    <Separator className="my-4 bg-slate-700" />
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Additional Considerations</h4>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {diagnosticResult.differentialConsiderations.map((consideration, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            {consideration}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
