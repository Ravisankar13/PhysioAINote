import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  Activity, 
  ArrowRight, 
  Brain,
  Lightbulb,
  BookOpen,
  User,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Clipboard,
  ClipboardCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";

interface VirtualPatientDetailProps {
  patientId: number;
  onBackToList: () => void;
}

export default function VirtualPatientDetail({ patientId, onBackToList }: VirtualPatientDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");

  const { data: patient, isLoading, isError, error } = useQuery<any>({
    queryKey: [`/api/virtual-patients/${patientId}`],
    queryFn: async () => {
      const response = await fetch(`/api/virtual-patients/${patientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient details");
      }
      return response.json();
    },
  });

  const analyzePatientMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/virtual-patients/${patientId}/analyze`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/virtual-patients/${patientId}`] });
      toast({
        title: "Analysis Complete",
        description: "The virtual patient case has been analyzed successfully",
      });
      setActiveTab("diagnosis");
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: `Failed to analyze the patient case: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button variant="ghost" onClick={onBackToList} className="h-8 w-8 p-0 mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Error</CardTitle>
          </div>
          <CardDescription>
            Failed to load patient details: {error?.message}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={onBackToList}>
            Return to Patient List
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button variant="ghost" onClick={onBackToList} className="h-8 w-8 p-0 mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasDiagnosis = !!patient?.diagnosis;

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBackToList} className="h-8 w-8 p-0 mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{patient.patientName}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{patient.age} years</Badge>
            <Badge variant="outline">{patient.gender}</Badge>
            <Badge>{patient.bodyPart}</Badge>
          </div>
        </div>
        <CardDescription>
          Chief Complaint: {patient.chiefComplaint}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Patient Info
            </TabsTrigger>
            <TabsTrigger value="diagnosis" disabled={!hasDiagnosis} className="flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Diagnosis
            </TabsTrigger>
            <TabsTrigger value="research" disabled={!hasDiagnosis} className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Research
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Symptoms Description</h3>
                <p className="text-sm leading-relaxed">{patient.symptomsDescription}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patient.pastMedicalHistory && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">Past Medical History</h3>
                    <p className="text-sm leading-relaxed">{patient.pastMedicalHistory}</p>
                  </div>
                )}
                
                {patient.pastSurgicalHistory && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">Past Surgical History</h3>
                    <p className="text-sm leading-relaxed">{patient.pastSurgicalHistory}</p>
                  </div>
                )}
                
                {patient.socialHistory && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">Social History</h3>
                    <p className="text-sm leading-relaxed">{patient.socialHistory}</p>
                  </div>
                )}
                
                {patient.familyHistory && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">Family History</h3>
                    <p className="text-sm leading-relaxed">{patient.familyHistory}</p>
                  </div>
                )}
                
                {patient.medications && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">Medications</h3>
                    <p className="text-sm leading-relaxed">{patient.medications}</p>
                  </div>
                )}
                
                {patient.allergies && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">Allergies</h3>
                    <p className="text-sm leading-relaxed">{patient.allergies}</p>
                  </div>
                )}
              </div>

              {!hasDiagnosis && (
                <div className="flex justify-center mt-8">
                  <Button 
                    onClick={() => analyzePatientMutation.mutate()}
                    disabled={analyzePatientMutation.isPending}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    {analyzePatientMutation.isPending ? (
                      <>
                        <Activity className="mr-2 h-4 w-4 animate-pulse" />
                        Analyzing Patient Data...
                      </>
                    ) : (
                      <>
                        <Activity className="mr-2 h-4 w-4" />
                        Analyze Patient Data
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="diagnosis" className="p-6">
            {!hasDiagnosis ? (
              <div className="text-center p-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No diagnosis available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Analyze the patient data to generate a diagnosis and treatment recommendations.
                </p>
                <Button 
                  onClick={() => analyzePatientMutation.mutate()}
                  disabled={analyzePatientMutation.isPending}
                >
                  {analyzePatientMutation.isPending ? (
                    <>
                      <Activity className="mr-2 h-4 w-4 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Activity className="mr-2 h-4 w-4" />
                      Analyze Patient Data
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary" />
                    Primary Diagnosis
                  </h3>
                  <h4 className="text-md font-medium mb-1">{patient.diagnosis}</h4>
                  {patient.differentialDiagnosis && patient.differentialDiagnosis[0]?.description && (
                    <p className="text-sm leading-relaxed">
                      {patient.differentialDiagnosis[0].description}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                    Differential Diagnoses
                  </h3>
                  <div className="space-y-3">
                    {patient.differentialDiagnosis && patient.differentialDiagnosis.slice(1).map((diff: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-md font-medium">{diff.name}</h4>
                          <Badge variant={
                            diff.likelihood === "high" ? "destructive" : 
                            diff.likelihood === "medium" ? "secondary" : 
                            "outline"
                          }>
                            {diff.likelihood} likelihood
                          </Badge>
                        </div>
                        <p className="text-sm">{diff.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <ClipboardCheck className="h-5 w-5 mr-2 text-green-500" />
                    Treatment Options
                  </h3>
                  <div className="space-y-3">
                    {patient.treatmentOptions && patient.treatmentOptions.map((treatment: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-md font-medium">{treatment.name}</h4>
                          <div className="flex space-x-2">
                            <Badge variant="outline">
                              {treatment.evidenceLevel} evidence
                            </Badge>
                            <Badge variant={
                              treatment.recommendationStrength === "highly recommended" ? "default" : 
                              treatment.recommendationStrength === "recommended" ? "secondary" : 
                              "outline"
                            }>
                              {treatment.recommendationStrength}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm">{treatment.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="research" className="p-6">
            {!hasDiagnosis ? (
              <div className="text-center p-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No research available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Analyze the patient data to see relevant research articles.
                </p>
                <Button 
                  onClick={() => analyzePatientMutation.mutate()}
                  disabled={analyzePatientMutation.isPending}
                >
                  {analyzePatientMutation.isPending ? (
                    <>
                      <Activity className="mr-2 h-4 w-4 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Activity className="mr-2 h-4 w-4" />
                      Analyze Patient Data
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-3">Relevant Research</h3>
                
                {/* Related Articles Section */}
                {patient.relatedArticleIds && patient.relatedArticleIds.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 mb-2">
                      The following research articles may provide valuable insights for this case:
                    </p>
                    
                    {/* Article list would be displayed here */}
                    <div className="space-y-3">
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-md">Related Articles</CardTitle>
                          <CardDescription>
                            View these articles in the Research section for more information
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="py-0">
                          <Link href="/research" className="text-primary hover:underline text-sm flex items-center">
                            Go to Research Section <ArrowRight className="h-4 w-4 ml-1" />
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">
                      No specific research articles have been linked to this case yet.
                    </p>
                  </div>
                )}
                
                {/* Research Considerations Section */}
                {patient.treatmentOptions && patient.treatmentOptions[0]?.researchConsiderations && (
                  <div className="mt-6">
                    <h3 className="text-md font-semibold mb-2">Key Research Considerations</h3>
                    <div className="space-y-3">
                      {patient.treatmentOptions[0].researchConsiderations.map((consideration: any, idx: number) => (
                        <div key={idx} className="border rounded p-3">
                          <h4 className="text-sm font-medium mb-1">{consideration.topic}</h4>
                          <p className="text-xs text-gray-600">{consideration.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="border-t p-4">
        <div className="w-full flex justify-between items-center">
          <Button variant="outline" onClick={onBackToList}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          
          {hasDiagnosis && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => analyzePatientMutation.mutate()}
                disabled={analyzePatientMutation.isPending}
              >
                <RefreshAnalysis className="h-4 w-4 mr-2" />
                Refresh Analysis
              </Button>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Custom components
function RefreshAnalysis(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12.5V8.5a4 4 0 0 0-4-4h-8a4 4 0 0 0-4 4v7a4 4 0 0 0 4 4h8" />
      <path d="M16 9h0" />
      <path d="M17 15l-4-4" />
      <path d="M19 17l3 3" />
      <path d="M19 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}