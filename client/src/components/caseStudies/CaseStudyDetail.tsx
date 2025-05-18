import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { 
  ChevronLeft, 
  Activity, 
  Brain,
  Lightbulb,
  BookOpen,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clipboard,
  BookOpen as ResearchIcon,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CaseStudyDetailProps {
  caseId: number;
  onBackToList: () => void;
}

// Form schema for case study attempt
const attemptFormSchema = z.object({
  userDiagnosis: z.string().min(3, { message: "Diagnosis is required" }),
  userReasoning: z.string().min(20, { message: "Please provide your clinical reasoning" }),
  assessmentTests: z.array(z.string()).min(1, { message: "Select at least one assessment test" }),
  proposedTreatment: z.string().min(20, { message: "Please provide a treatment plan" }),
});

type AttemptFormData = z.infer<typeof attemptFormSchema>;

export default function CaseStudyDetail({ caseId, onBackToList }: CaseStudyDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("case");
  const [showHiddenFindings, setShowHiddenFindings] = useState(false);
  const [showCorrectDiagnosis, setShowCorrectDiagnosis] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  // Fetch case study details
  const { data: caseStudy, isLoading, isError, error } = useQuery({
    queryKey: [`/api/case-studies/${caseId}`],
    queryFn: async () => {
      const response = await fetch(`/api/case-studies/${caseId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch case study details");
      }
      return response.json();
    },
  });

  // Fetch previous attempts for this case
  const { data: attempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: [`/api/case-studies/${caseId}/attempts`],
    queryFn: async () => {
      const response = await fetch(`/api/case-studies/${caseId}/attempts`);
      if (!response.ok) {
        throw new Error("Failed to fetch attempts");
      }
      return response.json();
    },
    enabled: !!caseId,
  });

  const form = useForm<AttemptFormData>({
    resolver: zodResolver(attemptFormSchema),
    defaultValues: {
      userDiagnosis: "",
      userReasoning: "",
      assessmentTests: [],
      proposedTreatment: "",
    },
  });

  const submitAttemptMutation = useMutation({
    mutationFn: async (data: AttemptFormData) => {
      const response = await apiRequest("POST", `/api/case-studies/${caseId}/attempt`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/case-studies/${caseId}/attempts`] });
      toast({
        title: "Success",
        description: "Your diagnostic attempt has been submitted and analyzed",
      });
      setAttemptId(data.id);
      setActiveTab("feedback");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to submit attempt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: AttemptFormData) {
    submitAttemptMutation.mutate(data);
  }

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
            Failed to load case study details: {error?.message}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={onBackToList}>
            Return to Case List
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

  // Extract attempt with highest accuracy
  const bestAttempt = attempts && attempts.length > 0
    ? attempts.reduce((best, current) => 
        !best || (current.overallAccuracy > best.overallAccuracy) ? current : best
      , null)
    : null;

  // Create a list of possible assessment tests for the form
  const possibleAssessmentTests = [
    // Common assessment tests for different body parts
    "Range of Motion Testing",
    "Manual Muscle Testing",
    "Joint Mobility Assessment",
    "Neurological Examination",
    "Palpation",
    "Gait Analysis",
    "Functional Movement Screen",
    "Special Tests (Joint-Specific)",
    "Pain Provocation Tests",
    "Balance Assessment",
    "Coordination Tests",
    "Posture Analysis",
    "Sensory Testing",
    "Deep Tendon Reflexes",
    "Proprioception Tests",
    // More specific tests that get populated from the case study
    ...(caseStudy?.correctAssessmentApproach || [])
  ];

  // Remove duplicates from assessment tests
  const uniqueAssessmentTests = Array.from(new Set(possibleAssessmentTests));

  return (
    <Card className="max-w-5xl mx-auto mb-8">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBackToList} className="h-8 w-8 p-0 mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{caseStudy.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="capitalize">{caseStudy.bodyPart}</Badge>
            <Badge className="capitalize">{caseStudy.complexity}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="case" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Case Details
            </TabsTrigger>
            <TabsTrigger value="attempt" className="flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Diagnostic Attempt
            </TabsTrigger>
            <TabsTrigger 
              value="feedback" 
              disabled={!attemptId && (!attempts || attempts.length === 0)} 
              className="flex items-center"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="research" className="flex items-center">
              <ResearchIcon className="h-4 w-4 mr-2" />
              Research
            </TabsTrigger>
          </TabsList>

          {/* Case Information Tab */}
          <TabsContent value="case" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Patient Information</h3>
                <p className="text-md mb-4">{caseStudy.patientDescription}</p>
                
                <h4 className="text-lg font-medium mb-2">History</h4>
                <p className="text-md mb-4">{caseStudy.history}</p>
                
                <h4 className="text-lg font-medium mb-2">Presenting Symptoms</h4>
                <p className="text-md mb-4">{caseStudy.presentingSymptoms}</p>
                
                {caseStudy.vitalSigns && (
                  <>
                    <h4 className="text-lg font-medium mb-2">Vital Signs</h4>
                    <p className="text-md mb-4">{caseStudy.vitalSigns}</p>
                  </>
                )}
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold mb-2">Hidden Findings</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowHiddenFindings(!showHiddenFindings)}
                  >
                    {showHiddenFindings ? "Hide Findings" : "Reveal Findings"}
                  </Button>
                </div>
                
                {showHiddenFindings ? (
                  <div className="space-y-4 bg-muted/50 p-4 rounded-md">
                    {caseStudy.hiddenFindings.rangeOfMotion && (
                      <div>
                        <h4 className="text-md font-medium">Range of Motion</h4>
                        <p className="text-sm">{caseStudy.hiddenFindings.rangeOfMotion}</p>
                      </div>
                    )}
                    
                    {caseStudy.hiddenFindings.strength && (
                      <div>
                        <h4 className="text-md font-medium">Strength</h4>
                        <p className="text-sm">{caseStudy.hiddenFindings.strength}</p>
                      </div>
                    )}
                    
                    {caseStudy.hiddenFindings.specialTests && (
                      <div>
                        <h4 className="text-md font-medium">Special Tests</h4>
                        <p className="text-sm">{caseStudy.hiddenFindings.specialTests}</p>
                      </div>
                    )}
                    
                    {caseStudy.hiddenFindings.palpation && (
                      <div>
                        <h4 className="text-md font-medium">Palpation</h4>
                        <p className="text-sm">{caseStudy.hiddenFindings.palpation}</p>
                      </div>
                    )}
                    
                    {caseStudy.hiddenFindings.additionalObservations && (
                      <div>
                        <h4 className="text-md font-medium">Additional Observations</h4>
                        <p className="text-sm">{caseStudy.hiddenFindings.additionalObservations}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-center text-muted-foreground">
                      Hidden findings will be revealed after you submit your diagnostic attempt.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold mb-2">Correct Diagnosis</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowCorrectDiagnosis(!showCorrectDiagnosis)}
                  >
                    {showCorrectDiagnosis ? "Hide Diagnosis" : "Reveal Diagnosis"}
                  </Button>
                </div>
                
                {showCorrectDiagnosis ? (
                  <div className="bg-primary/5 p-4 rounded-md">
                    <h4 className="text-lg font-medium">{caseStudy.correctDiagnosis}</h4>
                    
                    <h4 className="text-md font-medium mt-4">Differential Diagnoses</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {caseStudy.differentialDiagnoses.map((diagnosis: string, index: number) => (
                        <li key={index}>{diagnosis}</li>
                      ))}
                    </ul>
                    
                    <h4 className="text-md font-medium mt-4">Correct Assessment Approach</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {caseStudy.correctAssessmentApproach.map((test: string, index: number) => (
                        <li key={index}>{test}</li>
                      ))}
                    </ul>
                    
                    <h4 className="text-md font-medium mt-4">Correct Treatment Approach</h4>
                    <p>{caseStudy.correctTreatmentApproach}</p>
                  </div>
                ) : (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-center text-muted-foreground">
                      The correct diagnosis will be revealed after you submit your diagnostic attempt.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Diagnostic Attempt Tab */}
          <TabsContent value="attempt" className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Submit Your Diagnostic Attempt</h3>
                  <p className="text-muted-foreground mb-6">
                    Based on the case information, provide your diagnosis, clinical reasoning, assessment approach, and treatment plan.
                    Your answers will be analyzed against evidence-based practice and expert approaches.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="userDiagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Diagnosis</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your primary diagnosis" {...field} />
                      </FormControl>
                      <FormDescription>
                        What is your primary diagnosis for this patient?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userReasoning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Reasoning</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain your clinical reasoning that led to this diagnosis" 
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Explain your clinical reasoning process and how you arrived at this diagnosis
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessmentTests"
                  render={() => (
                    <FormItem>
                      <FormLabel>Assessment Tests</FormLabel>
                      <FormDescription>
                        Select the assessment tests you would perform for this patient
                      </FormDescription>
                      <div className="mt-2">
                        <CheckboxGroup>
                          {uniqueAssessmentTests.map((test, index) => (
                            <FormField
                              key={index}
                              control={form.control}
                              name="assessmentTests"
                              render={({ field }) => {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`test-${test.replace(/\s+/g, '-').toLowerCase()}-${index}`}
                                      checked={field.value?.includes(test)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, test])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== test
                                              )
                                            );
                                      }}
                                    />
                                    <Label 
                                      htmlFor={`test-${test.replace(/\s+/g, '-').toLowerCase()}-${index}`}
                                      className="text-sm font-normal"
                                    >
                                      {test}
                                    </Label>
                                  </div>
                                );
                              }}
                            />
                          ))}
                        </CheckboxGroup>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proposedTreatment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Treatment Plan</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your treatment approach for this patient" 
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Outline your evidence-based treatment plan, including manual therapy techniques, exercises, and patient education
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("case")}
                  >
                    Back to Case
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitAttemptMutation.isPending}
                  >
                    {submitAttemptMutation.isPending ? (
                      <>
                        <Activity className="mr-2 h-4 w-4 animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      "Submit Diagnostic Attempt"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="p-6">
            {isLoadingAttempts ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : !attempts || attempts.length === 0 ? (
              <div className="text-center p-8 border rounded-lg bg-muted/50">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No attempts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Submit a diagnostic attempt to receive feedback
                </p>
                <Button onClick={() => setActiveTab("attempt")}>
                  Start Diagnostic Attempt
                </Button>
              </div>
            ) : (
              <div>
                {attemptId ? (
                  // Show specific attempt
                  attempts.filter(a => a.id === attemptId).map((attempt) => (
                    <AttemptFeedback 
                      key={attempt.id} 
                      attempt={attempt} 
                      caseStudy={caseStudy} 
                    />
                  ))
                ) : (
                  // Show latest attempt
                  <AttemptFeedback 
                    attempt={attempts[0]} 
                    caseStudy={caseStudy} 
                  />
                )}

                {attempts.length > 1 && (
                  <>
                    <Separator className="my-6" />
                    
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Previous Attempts</h3>
                      <Accordion type="single" collapsible className="w-full">
                        {attempts.map((attempt, index) => (
                          <AccordionItem key={attempt.id} value={`attempt-${attempt.id}`}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span>Attempt #{attempts.length - index} - {new Date(attempt.createdAt).toLocaleDateString()}</span>
                                <div className="flex items-center">
                                  <span className="text-sm mr-2">Accuracy: {attempt.overallAccuracy}%</span>
                                  <Progress 
                                    value={attempt.overallAccuracy} 
                                    max={100}
                                    className="w-20 h-2"
                                  />
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <AttemptFeedback 
                                attempt={attempt} 
                                caseStudy={caseStudy}
                                isCollapsed
                              />
                              <div className="mt-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setAttemptId(attempt.id)}
                                >
                                  View Full Feedback
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="p-6">
            <div className="space-y-6">
              {(!caseStudy.researchBasis || caseStudy.researchBasis.length === 0) && 
               (!caseStudy.expertSources || caseStudy.expertSources.length === 0) ? (
                <div className="text-center p-8 border rounded-lg bg-muted/50">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No research information available</h3>
                  <p className="text-sm text-muted-foreground">
                    This case study does not include research references
                  </p>
                </div>
              ) : (
                <>
                  {caseStudy.researchBasis && caseStudy.researchBasis.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Research Basis</h3>
                      <ul className="space-y-2">
                        {caseStudy.researchBasis.map((study: string, index: number) => (
                          <li key={index} className="pl-6 relative">
                            <span className="absolute left-0 top-1.5 h-2 w-2 bg-primary rounded-full"></span>
                            {study}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {caseStudy.expertSources && caseStudy.expertSources.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Expert Sources</h3>
                      <ul className="space-y-2">
                        {caseStudy.expertSources.map((source: string, index: number) => (
                          <li key={index} className="pl-6 relative">
                            <span className="absolute left-0 top-1.5 h-2 w-2 bg-primary rounded-full"></span>
                            {source}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Component to display attempt feedback
function AttemptFeedback({ 
  attempt, 
  caseStudy,
  isCollapsed = false 
}: { 
  attempt: any, 
  caseStudy: any,
  isCollapsed?: boolean 
}) {
  const accuracyColor = 
    attempt.overallAccuracy >= 80 ? "text-green-600" :
    attempt.overallAccuracy >= 60 ? "text-amber-600" :
    "text-red-600";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h3 className="text-xl font-semibold">Diagnostic Feedback</h3>
        <div className="flex items-center mt-2 md:mt-0">
          <span className="mr-2">Overall Accuracy:</span>
          <span className={`text-lg font-bold ${accuracyColor}`}>
            {attempt.overallAccuracy}%
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="bg-muted p-4 rounded-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Your Diagnosis</h4>
              <p className="text-sm">{attempt.userDiagnosis}</p>
            </div>
            <div>
              <h4 className="font-medium">Correct Diagnosis</h4>
              <p className="text-sm">{caseStudy.correctDiagnosis}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center mb-2">
          <Brain className="mr-2 h-5 w-5 text-primary" />
          <h4 className="text-lg font-medium">Diagnosis Feedback</h4>
        </div>
        <div className="bg-muted/50 p-4 rounded-md">
          <p>{attempt.feedback?.diagnosisFeedback}</p>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div>
            <div className="flex items-center mb-2">
              <Clipboard className="mr-2 h-5 w-5 text-primary" />
              <h4 className="text-lg font-medium">Assessment Approach Feedback</h4>
            </div>
            <div className="bg-muted/50 p-4 rounded-md">
              <p>{attempt.feedback?.assessmentFeedback}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <Activity className="mr-2 h-5 w-5 text-primary" />
              <h4 className="text-lg font-medium">Treatment Plan Feedback</h4>
            </div>
            <div className="bg-muted/50 p-4 rounded-md">
              <p>{attempt.feedback?.treatmentFeedback}</p>
            </div>
          </div>

          {attempt.feedback?.keyLearningPoints && attempt.feedback.keyLearningPoints.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                <h4 className="text-lg font-medium">Key Learning Points</h4>
              </div>
              <div className="bg-muted/50 p-4 rounded-md">
                <ul className="space-y-2">
                  {attempt.feedback.keyLearningPoints.map((point: string, index: number) => (
                    <li key={index} className="flex">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {attempt.feedback?.suggestedResources && attempt.feedback.suggestedResources.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <BookOpen className="mr-2 h-5 w-5 text-primary" />
                <h4 className="text-lg font-medium">Suggested Resources</h4>
              </div>
              <div className="bg-muted/50 p-4 rounded-md">
                <ul className="space-y-2">
                  {attempt.feedback.suggestedResources.map((resource: string, index: number) => (
                    <li key={index} className="flex">
                      <BookOpen className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                      <span>{resource}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}