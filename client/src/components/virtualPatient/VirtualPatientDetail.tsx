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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Patient Info
            </TabsTrigger>
            <TabsTrigger value="diagnosis" disabled={!hasDiagnosis} className="flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Diagnosis
            </TabsTrigger>
            <TabsTrigger value="assessment" disabled={!hasDiagnosis} className="flex items-center">
              <Clipboard className="h-4 w-4 mr-2" />
              Assessment Tests
            </TabsTrigger>
            <TabsTrigger value="findings" disabled={!hasDiagnosis} className="flex items-center">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Objective Findings
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
                  <div className="space-y-6">
                    {patient.treatmentOptions && patient.treatmentOptions.map((treatmentCategory: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                          {treatmentCategory.category}
                        </h4>
                        
                        {/* Manual Therapy Techniques */}
                        {treatmentCategory.techniques && treatmentCategory.techniques.length > 0 && (
                          <div className="mb-4 space-y-3">
                            {treatmentCategory.techniques.map((technique: any, techIdx: number) => (
                              <div key={techIdx} className="border border-gray-200 rounded-md p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="text-md font-medium">{technique.name}</h5>
                                  <div className="flex space-x-2">
                                    <Badge variant="outline">
                                      {technique.evidenceLevel} evidence
                                    </Badge>
                                    <Badge variant={
                                      technique.recommendationStrength === "highly recommended" ? "default" : 
                                      technique.recommendationStrength === "recommended" ? "secondary" : 
                                      "outline"
                                    }>
                                      {technique.recommendationStrength}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm mb-2"><strong>Description:</strong> {technique.description}</p>
                                <p className="text-sm mb-2"><strong>Target Tissue:</strong> {technique.targetTissue}</p>
                                <p className="text-sm mb-2"><strong>Research Support:</strong> {technique.researchSupport}</p>
                                {technique.contraindications && technique.contraindications.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Contraindications:</p>
                                    <ul className="list-disc list-inside text-sm ml-2">
                                      {technique.contraindications.map((contraindication: string, i: number) => (
                                        <li key={i}>{contraindication}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Progressive Loading Exercises */}
                        {treatmentCategory.exercises && treatmentCategory.exercises.length > 0 && (
                          <div className="mb-4 space-y-3">
                            {treatmentCategory.exercises.map((exercise: any, exIdx: number) => (
                              <div key={exIdx} className="border border-gray-200 rounded-md p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="text-md font-medium">{exercise.name}</h5>
                                  <div className="flex space-x-2">
                                    <Badge variant="outline">
                                      {exercise.evidenceLevel} evidence
                                    </Badge>
                                    <Badge variant={
                                      exercise.recommendationStrength === "highly recommended" ? "default" : 
                                      exercise.recommendationStrength === "recommended" ? "secondary" : 
                                      "outline"
                                    }>
                                      {exercise.recommendationStrength}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm mb-2"><strong>Description:</strong> {exercise.description}</p>
                                <p className="text-sm mb-2"><strong>Target Muscle Group:</strong> {exercise.targetMuscleGroup}</p>
                                
                                <div className="bg-gray-50 p-2 rounded my-2">
                                  <p className="text-sm font-medium mb-1">Loading Parameters:</p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p><strong>Sets:</strong> {exercise.loadingParameters.sets}</p>
                                    <p><strong>Reps:</strong> {exercise.loadingParameters.reps}</p>
                                    <p><strong>Frequency:</strong> {exercise.loadingParameters.frequency}</p>
                                    <p><strong>Intensity:</strong> {exercise.loadingParameters.intensity}</p>
                                  </div>
                                  <p className="text-sm mt-1"><strong>Progression Criteria:</strong> {exercise.loadingParameters.progressionCriteria}</p>
                                </div>
                                
                                <p className="text-sm mb-2"><strong>Research Support:</strong> {exercise.researchSupport}</p>
                                
                                {exercise.modificationOptions && exercise.modificationOptions.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Modification Options:</p>
                                    <ul className="list-disc list-inside text-sm ml-2">
                                      {exercise.modificationOptions.map((modification: string, i: number) => (
                                        <li key={i}>{modification}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Patient Education */}
                        {treatmentCategory.recommendations && treatmentCategory.recommendations.length > 0 && (
                          <div className="space-y-3">
                            {treatmentCategory.recommendations.map((education: any, eduIdx: number) => (
                              <div key={eduIdx} className="border border-gray-200 rounded-md p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="text-md font-medium">{education.topic}</h5>
                                  <div className="flex space-x-2">
                                    <Badge variant="outline">
                                      {education.evidenceLevel} evidence
                                    </Badge>
                                    <Badge variant={
                                      education.recommendationStrength === "highly recommended" ? "default" : 
                                      education.recommendationStrength === "recommended" ? "secondary" : 
                                      "outline"
                                    }>
                                      {education.recommendationStrength}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {education.keyPoints && education.keyPoints.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium">Key Points:</p>
                                    <ul className="list-disc list-inside text-sm ml-2">
                                      {education.keyPoints.map((point: string, i: number) => (
                                        <li key={i}>{point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Legacy format fallback - still handle old structure */}
                        {!treatmentCategory.category && treatmentCategory.name && (
                          <div className="border border-gray-200 rounded-md p-3">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-md font-medium">{treatmentCategory.name}</h5>
                              <div className="flex space-x-2">
                                <Badge variant="outline">
                                  {treatmentCategory.evidenceLevel} evidence
                                </Badge>
                                <Badge variant={
                                  treatmentCategory.recommendationStrength === "highly recommended" ? "default" : 
                                  treatmentCategory.recommendationStrength === "recommended" ? "secondary" : 
                                  "outline"
                                }>
                                  {treatmentCategory.recommendationStrength}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm">{treatmentCategory.description}</p>
                          </div>
                        )}
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

          {/* Assessment Tests Tab */}
          <TabsContent value="assessment" className="p-6">
            {!hasDiagnosis ? (
              <div className="text-center p-8">
                <Clipboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No assessment tests available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Analyze the patient data to see recommended assessment tests.
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
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Clipboard className="h-5 w-5 mr-2 text-blue-500" />
                  Recommended Assessment Tests
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  The following clinical tests can help confirm the diagnosis, determine the extent of injury, and identify related issues.
                </p>
                
                <div className="space-y-4">
                  {patient.differentialDiagnosis?.assessmentTests?.map((test: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-md font-semibold">{test.name}</h4>
                        <Badge variant={
                          test.relevance === "primary" ? "default" : 
                          test.relevance === "secondary" ? "secondary" : 
                          "outline"
                        }>
                          {test.relevance} test
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h5 className="text-sm font-medium mb-1">Purpose</h5>
                          <p className="text-sm">{test.purpose}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium mb-1">Procedure</h5>
                          <p className="text-sm">{test.procedure}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium mb-1">Positive Findings</h5>
                          <p className="text-sm">{test.positiveFindings}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium mb-1">Negative Findings</h5>
                          <p className="text-sm">{test.negativeFindings}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t">
                        <div className="flex flex-wrap gap-3 mb-2">
                          {test.sensitivity && (
                            <Badge variant="outline" className="bg-blue-50">
                              Sensitivity: {test.sensitivity}
                            </Badge>
                          )}
                          {test.specificity && (
                            <Badge variant="outline" className="bg-green-50">
                              Specificity: {test.specificity}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-1">Research Support</h5>
                          <p className="text-sm">{test.supportingResearch}</p>
                        </div>
                        
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-1">Expert Recommendation</h5>
                          <p className="text-sm">{test.expertRecommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!patient.differentialDiagnosis?.assessmentTests || patient.differentialDiagnosis.assessmentTests.length === 0) && (
                    <div className="text-center p-4 border rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500">No specific assessment tests available for this case.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Objective Findings Tab */}
          <TabsContent value="findings" className="p-6">
            {!hasDiagnosis ? (
              <div className="text-center p-8">
                <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No objective findings available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Analyze the patient data to see expected objective findings.
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
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <ClipboardCheck className="h-5 w-5 mr-2 text-green-500" />
                  Expected Objective Findings
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Expected clinical presentation based on the patient's condition. These findings would help confirm the diagnosis and inform treatment planning.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Range of Motion */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="text-md font-semibold mb-3 flex items-center">
                      <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                      Range of Motion
                    </h4>
                    {patient.differentialDiagnosis?.objectiveFindings?.rangeOfMotion?.map((rom: any, idx: number) => (
                      <div key={idx} className="mb-3 pb-3 border-b last:border-0">
                        <div className="flex justify-between items-start">
                          <h5 className="text-sm font-medium">{rom.movement}</h5>
                        </div>
                        <p className="text-sm mt-1"><strong>Finding:</strong> {rom.finding}</p>
                        <p className="text-xs mt-1 text-gray-600"><strong>Significance:</strong> {rom.significance}</p>
                      </div>
                    ))}
                    {(!patient.differentialDiagnosis?.objectiveFindings?.rangeOfMotion || 
                      patient.differentialDiagnosis.objectiveFindings.rangeOfMotion.length === 0) && (
                      <p className="text-sm text-gray-500">No range of motion findings specified.</p>
                    )}
                  </div>
                  
                  {/* Strength */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="text-md font-semibold mb-3 flex items-center">
                      <ThumbsUp className="h-4 w-4 mr-2 text-amber-500" />
                      Strength
                    </h4>
                    {patient.differentialDiagnosis?.objectiveFindings?.strength?.map((strength: any, idx: number) => (
                      <div key={idx} className="mb-3 pb-3 border-b last:border-0">
                        <div className="flex justify-between items-start">
                          <h5 className="text-sm font-medium">{strength.muscleGroup}</h5>
                          <Badge variant="outline">{strength.gradingScale}</Badge>
                        </div>
                        <p className="text-sm mt-1"><strong>Finding:</strong> {strength.finding}</p>
                        <p className="text-xs mt-1 text-gray-600"><strong>Significance:</strong> {strength.significance}</p>
                      </div>
                    ))}
                    {(!patient.differentialDiagnosis?.objectiveFindings?.strength || 
                      patient.differentialDiagnosis.objectiveFindings.strength.length === 0) && (
                      <p className="text-sm text-gray-500">No strength findings specified.</p>
                    )}
                  </div>
                  
                  {/* Neurological Signs */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="text-md font-semibold mb-3 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                      Neurological Signs
                    </h4>
                    {patient.differentialDiagnosis?.objectiveFindings?.neurologicalSigns?.map((neuro: any, idx: number) => (
                      <div key={idx} className="mb-3 pb-3 border-b last:border-0">
                        <h5 className="text-sm font-medium">{neuro.test}</h5>
                        <p className="text-sm mt-1"><strong>Finding:</strong> {neuro.finding}</p>
                        <p className="text-xs mt-1 text-gray-600"><strong>Significance:</strong> {neuro.significance}</p>
                      </div>
                    ))}
                    {(!patient.differentialDiagnosis?.objectiveFindings?.neurologicalSigns || 
                      patient.differentialDiagnosis.objectiveFindings.neurologicalSigns.length === 0) && (
                      <p className="text-sm text-gray-500">No neurological findings specified.</p>
                    )}
                  </div>
                  
                  {/* Palpation Findings */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="text-md font-semibold mb-3 flex items-center">
                      <ThumbsDown className="h-4 w-4 mr-2 text-red-500" />
                      Palpation Findings
                    </h4>
                    {patient.differentialDiagnosis?.objectiveFindings?.palpationFindings?.map((palp: any, idx: number) => (
                      <div key={idx} className="mb-3 pb-3 border-b last:border-0">
                        <h5 className="text-sm font-medium">{palp.structure}</h5>
                        <p className="text-sm mt-1"><strong>Finding:</strong> {palp.finding}</p>
                        <p className="text-xs mt-1 text-gray-600"><strong>Significance:</strong> {palp.significance}</p>
                      </div>
                    ))}
                    {(!patient.differentialDiagnosis?.objectiveFindings?.palpationFindings || 
                      patient.differentialDiagnosis.objectiveFindings.palpationFindings.length === 0) && (
                      <p className="text-sm text-gray-500">No palpation findings specified.</p>
                    )}
                  </div>
                  
                  {/* Functional Tests */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="text-md font-semibold mb-3 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-indigo-500" />
                      Functional Tests
                    </h4>
                    {patient.differentialDiagnosis?.objectiveFindings?.functionalTests?.map((func: any, idx: number) => (
                      <div key={idx} className="mb-3 pb-3 border-b last:border-0">
                        <h5 className="text-sm font-medium">{func.test}</h5>
                        <p className="text-sm mt-1"><strong>Finding:</strong> {func.finding}</p>
                        <p className="text-xs mt-1 text-gray-600"><strong>Significance:</strong> {func.significance}</p>
                      </div>
                    ))}
                    {(!patient.differentialDiagnosis?.objectiveFindings?.functionalTests || 
                      patient.differentialDiagnosis.objectiveFindings.functionalTests.length === 0) && (
                      <p className="text-sm text-gray-500">No functional test findings specified.</p>
                    )}
                  </div>
                  
                  {/* Additional Observations */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm md:col-span-2">
                    <h4 className="text-md font-semibold mb-3">Additional Observations</h4>
                    {patient.differentialDiagnosis?.objectiveFindings?.additionalObservations?.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {patient.differentialDiagnosis.objectiveFindings.additionalObservations.map((obs: string, idx: number) => (
                          <li key={idx} className="text-sm">{obs}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No additional observations specified.</p>
                    )}
                  </div>
                </div>
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