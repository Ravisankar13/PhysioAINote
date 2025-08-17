import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ClipboardCheck,
  Edit,
  Pencil,
  Plus,
  Save,
  X,
  LineChart,
  BarChart3,
  ZoomIn,
  Target,
  MessageSquare,
} from "lucide-react";
import PatientProgressTracker from "./PatientProgressTracker";
import BodyPartZoom from "./BodyPartZoom";
import { getPlaceholderImage, placeholderImages } from "./bodyPartImages";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MixamoSkeleton from "@/components/3d/MixamoSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface VirtualPatientDetailProps {
  patientId: number;
  onBackToList: () => void;
  onEditPatient?: (patient: any) => void;
}

export default function VirtualPatientDetail({
  patientId,
  onBackToList,
  onEditPatient,
}: VirtualPatientDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [isAddingObjectiveFindings, setIsAddingObjectiveFindings] =
    useState(false);
  const [objectiveFindingsInput, setObjectiveFindingsInput] = useState("");
  const [objectiveFindings, setObjectiveFindings] = useState<
    Array<{ id: number; finding: string }>
  >([]);

  const {
    data: patient,
    isLoading,
    isError,
    error,
  } = useQuery<any>({
    queryKey: [`/api/virtual-patients/${patientId}`],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/virtual-patients/${patientId}`);
        const data = await response.json();
        console.log("Virtual patient data with research:", data);

        // Process assessment tests if they exist
        if (data.assessmentTests) {
          // Ensure assessmentTests is properly parsed if it's a string
          if (typeof data.assessmentTests === "string") {
            try {
              data.assessmentTests = JSON.parse(data.assessmentTests);
            } catch (err) {
              console.error("Error parsing assessment tests:", err);
              // If parsing fails, set a default empty array
              data.assessmentTests = [];
            }
          }
        } else {
          // Initialize with empty array if missing
          data.assessmentTests = [];
        }

        // If patient has objective findings stored, parse and set them
        if (data.objectiveFindings) {
          try {
            const findings =
              typeof data.objectiveFindings === "string"
                ? JSON.parse(data.objectiveFindings)
                : data.objectiveFindings;

            if (Array.isArray(findings)) {
              setObjectiveFindings(findings);
            }
          } catch (err) {
            console.error("Error parsing objective findings:", err);
          }
        }

        return data;
      } catch (error) {
        console.error("Error fetching virtual patient:", error);
        throw new Error("Failed to fetch patient details");
      }
    },
    enabled: !!patientId,
  });

  // Mutation to save objective findings
  const updateObjectiveFindingsMutation = useMutation({
    mutationFn: async (findings: Array<{ id: number; finding: string }>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/virtual-patients/${patientId}`,
        {
          objectiveFindings: findings,
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/virtual-patients/${patientId}`],
      });
      toast({
        title: "Findings Saved",
        description: "Objective findings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: `Failed to save objective findings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const analyzePatientMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/virtual-patients/${patientId}/analyze`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/virtual-patients/${patientId}`],
      });
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
            <Button
              variant="ghost"
              onClick={onBackToList}
              className="h-8 w-8 p-0 mr-2"
            >
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
            <Button
              variant="ghost"
              onClick={onBackToList}
              className="h-8 w-8 p-0 mr-2"
            >
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

  // Renders the analyze button consistently across tabs
  const renderAnalyzeButton = () => (
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
  );

  // Renders the empty state message for tabs when there's no diagnosis yet
  const renderEmptyState = (
    icon: React.ReactNode,
    title: string,
    description: string
  ) => (
    <div className="text-center p-8">
      {icon}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {renderAnalyzeButton()}
    </div>
  );

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={onBackToList}
              className="h-8 w-8 p-0 mr-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{patient.patient_name}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {onEditPatient && (
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
                onClick={() => onEditPatient(patient)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit Patient
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="mr-2"
              onClick={() => analyzePatientMutation.mutate()}
              disabled={analyzePatientMutation.isPending}
            >
              {analyzePatientMutation.isPending ? (
                <>
                  <Activity className="h-4 w-4 mr-1 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-1" />
                  Reanalyze
                </>
              )}
            </Button>
            <Link to={`/physiogpt?patient=${patientId}`}>
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Discuss with PhysioGPT
              </Button>
            </Link>
            <Badge variant="outline">{patient.age} years</Badge>
            <Badge variant="outline">{patient.gender}</Badge>
            <Badge>{patient.body_part}</Badge>
          </div>
        </div>
        <CardDescription>
          Chief Complaint: {patient.chief_complaint}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="info" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Patient Info
            </TabsTrigger>
            <TabsTrigger
              value="diagnosis"
              disabled={!hasDiagnosis}
              className="flex items-center"
            >
              <Brain className="h-4 w-4 mr-2" />
              Diagnosis
            </TabsTrigger>
            <TabsTrigger
              value="assessment"
              disabled={!hasDiagnosis}
              className="flex items-center"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Assessment Tests
            </TabsTrigger>
            <TabsTrigger
              value="treatment"
              disabled={!hasDiagnosis}
              className="flex items-center"
            >
              <Activity className="h-4 w-4 mr-2" />
              Treatment Options
            </TabsTrigger>
            <TabsTrigger
              value="progression"
              disabled={!hasDiagnosis}
              className="flex items-center"
            >
              <LineChart className="h-4 w-4 mr-2" />
              Symptom Progression
            </TabsTrigger>
            <TabsTrigger value="anatomy" className="flex items-center">
              <ZoomIn className="h-4 w-4 mr-2" />
              Interactive Anatomy
            </TabsTrigger>
            <TabsTrigger value="3d-model" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              3D Skeleton
            </TabsTrigger>
            <TabsTrigger
              value="additional-info"
              disabled={!hasDiagnosis}
              className="flex items-center"
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Additional Info Needed
            </TabsTrigger>
            <TabsTrigger
              value="research"
              disabled={!hasDiagnosis}
              className="flex items-center"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Research
            </TabsTrigger>
          </TabsList>

          {/* PATIENT INFO TAB */}
          <TabsContent value="info" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Symptoms Description
                </h3>
                <p className="text-sm leading-relaxed">
                  {patient.symptoms_description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patient.past_medical_history && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">
                      Medical History
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {patient.past_medical_history}
                    </p>
                  </div>
                )}

                {/* Assessment field has been removed since it's not in our database */}
              </div>

              {/* Objective Findings Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Objective Findings</h3>
                  {!isAddingObjectiveFindings && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingObjectiveFindings(true)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Finding
                    </Button>
                  )}
                </div>

                {isAddingObjectiveFindings ? (
                  <div className="bg-background border rounded-lg p-4 mb-4">
                    <Label htmlFor="objectiveFinding" className="mb-2 block">
                      Enter Objective Finding
                    </Label>
                    <Textarea
                      id="objectiveFinding"
                      value={objectiveFindingsInput}
                      onChange={(e) =>
                        setObjectiveFindingsInput(e.target.value)
                      }
                      placeholder="Enter clinical observation or measurement (e.g., 'Limited shoulder abduction to 90 degrees with pain at end range')"
                      className="mb-3"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingObjectiveFindings(false);
                          setObjectiveFindingsInput("");
                        }}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (objectiveFindingsInput.trim()) {
                            // Add to local state first
                            const newFinding = {
                              id: Date.now(),
                              finding: objectiveFindingsInput.trim(),
                            };
                            const updatedFindings = [
                              ...objectiveFindings,
                              newFinding,
                            ];
                            setObjectiveFindings(updatedFindings);

                            // Save to server
                            updateObjectiveFindingsMutation.mutate(
                              updatedFindings
                            );

                            // Reset form
                            setObjectiveFindingsInput("");
                            setIsAddingObjectiveFindings(false);
                          }
                        }}
                        disabled={!objectiveFindingsInput.trim()}
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Save Finding
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Display existing objective findings */}
                <div className="space-y-2">
                  {objectiveFindings.length > 0 ? (
                    objectiveFindings.map((finding) => (
                      <div
                        key={finding.id}
                        className="bg-muted/40 rounded-md p-3 flex justify-between items-start"
                      >
                        <p className="text-sm">{finding.finding}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2 text-muted-foreground"
                          onClick={() => {
                            const updatedFindings = objectiveFindings.filter(
                              (f) => f.id !== finding.id
                            );
                            setObjectiveFindings(updatedFindings);
                            updateObjectiveFindingsMutation.mutate(
                              updatedFindings
                            );
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 border border-dashed rounded-md">
                      <p className="text-muted-foreground text-sm">
                        No objective findings recorded yet. Click "Add Finding"
                        to record physical examination results or clinical
                        measurements.
                      </p>
                    </div>
                  )}
                </div>

                {!hasDiagnosis && objectiveFindings.length > 0 && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Ready to generate a differential diagnosis and treatment
                      plan based on the patient's information and your objective
                      findings?
                    </p>
                    {renderAnalyzeButton()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* DIAGNOSIS TAB */}
          <TabsContent value="diagnosis" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No diagnosis available",
                "Analyze the patient data to generate a detailed diagnosis and differential."
              )
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary" />
                    Primary Diagnosis
                  </h3>
                  <div className="bg-primary/10 p-4 rounded-md">
                    <p className="font-medium text-lg">{patient.diagnosis}</p>
                    {patient.diagnosisExplanation && (
                      <p className="mt-2 text-sm">
                        {patient.diagnosisExplanation}
                      </p>
                    )}
                  </div>
                </div>

                {patient.differentialDiagnoses &&
                  patient.differentialDiagnoses.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Differential Diagnoses
                      </h3>
                      <div className="space-y-3">
                        {patient.differentialDiagnoses.map(
                          (diff: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 border rounded-md bg-card"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-base">
                                  {diff.diagnosis}
                                </h4>
                                <Badge
                                  variant={
                                    diff.likelihood === "High"
                                      ? "default"
                                      : diff.likelihood === "Medium"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {diff.likelihood} likelihood
                                </Badge>
                              </div>
                              {diff.explanation && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {diff.explanation}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {patient.clinicalReasoning && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                      Clinical Reasoning
                    </h3>
                    <div className="bg-card p-4 rounded-md border">
                      <p className="text-sm whitespace-pre-line">
                        {patient.clinicalReasoning}
                      </p>
                    </div>
                  </div>
                )}

                {patient.redFlags && patient.redFlags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                      Red Flags
                    </h3>
                    <div className="bg-red-50 p-4 rounded-md border border-red-200">
                      <ul className="space-y-1">
                        {patient.redFlags.map((flag: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-sm flex items-start text-red-700"
                          >
                            <span className="mr-2">•</span>
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ASSESSMENT TESTS TAB */}
          <TabsContent value="assessment" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <Clipboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No assessment tests available",
                "Analyze the patient data to get recommended assessment tests."
              )
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Clipboard className="h-5 w-5 mr-2 text-blue-500" />
                    Recommended Assessment Tests
                  </h3>
                  <div className="space-y-4">
                    {patient.assessmentTests &&
                      patient.assessmentTests.map(
                        (test: any, idx: number) => (
                          <div
                            key={idx}
                            className="border rounded-lg p-4 bg-card"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-md font-semibold">
                                {test.name}
                              </h4>
                              <div className="flex space-x-2">
                                <Badge variant="outline">
                                  {test.category || "Physical"}
                                </Badge>
                                {test.specificity && (
                                  <Badge
                                    variant={
                                      test.specificity >= 0.8
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {Math.round(test.specificity * 100)}%
                                    specificity
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p className="text-sm mb-3">{test.description}</p>

                            <div className="space-y-2">
                              {test.procedure && (
                                <div>
                                  <h5 className="text-sm font-medium">
                                    Procedure:
                                  </h5>
                                  <p className="text-sm text-muted-foreground">
                                    {test.procedure}
                                  </p>
                                </div>
                              )}

                              {test.interpretation && (
                                <div>
                                  <h5 className="text-sm font-medium">
                                    Interpretation:
                                  </h5>
                                  <p className="text-sm text-muted-foreground">
                                    {test.interpretation}
                                  </p>
                                </div>
                              )}

                              {test.evidence && (
                                <div>
                                  <h5 className="text-sm font-medium">
                                    Evidence:
                                  </h5>
                                  <p className="text-sm text-muted-foreground">
                                    {test.evidence}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TREATMENT OPTIONS TAB */}
          <TabsContent value="treatment" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No treatment options available",
                "Analyze the patient data to generate treatment recommendations."
              )
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <ClipboardCheck className="h-5 w-5 mr-2 text-green-500" />
                    Treatment Options
                  </h3>
                  {patient.treatmentOptions && typeof patient.treatmentOptions === 'object' && (
                    <div className="space-y-6">
                      {/* Progressive Loading Exercises Section */}
                      {patient.treatmentOptions && (
                        <div className="space-y-6">
                          {/* Manual Therapy Techniques */}
                          {Array.isArray(patient.treatmentOptions) && patient.treatmentOptions.find((category: any) => category.category === "Manual Therapy") && (
                            <div className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-3 bg-blue-50 p-2 rounded flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-blue-600" />
                                Manual Therapy Techniques
                              </h4>
                              <div className="space-y-4">
                                {patient.treatmentOptions.find((category: any) => category.category === "Manual Therapy")?.techniques?.map((technique: any, idx: number) => (
                                  <div key={idx} className="border border-blue-200 rounded-md p-4 bg-blue-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="text-md font-semibold text-blue-800">{technique.name}</h5>
                                      <Badge variant={
                                        technique.recommendationStrength === "highly recommended" ? "default" : 
                                        technique.recommendationStrength === "recommended" ? "secondary" : 
                                        "outline"
                                      }>
                                        {technique.recommendationStrength}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">{technique.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="font-medium text-blue-700">Target: </span>
                                        {technique.targetTissue}
                                      </div>
                                      <div>
                                        <span className="font-medium text-blue-700">Evidence: </span>
                                        <Badge variant="outline" className="ml-1">{technique.evidenceLevel}</Badge>
                                      </div>
                                    </div>
                                    {technique.researchSupport && (
                                      <p className="text-xs text-gray-600 mt-2 italic">
                                        Research: {technique.researchSupport}
                                      </p>
                                    )}
                                    {technique.contraindications && technique.contraindications.length > 0 && (
                                      <div className="mt-2">
                                        <span className="font-medium text-red-700 text-xs">Contraindications: </span>
                                        <span className="text-xs text-red-600">{technique.contraindications.join(", ")}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Progressive Loading Exercises */}
                          {Array.isArray(patient.treatmentOptions) && patient.treatmentOptions.find((category: any) => category.category === "Progressive Loading Exercises") && (
                            <div className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-3 bg-green-50 p-2 rounded flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-green-600" />
                                Progressive Loading Exercises
                              </h4>
                              <div className="space-y-4">
                                {patient.treatmentOptions.find((category: any) => category.category === "Progressive Loading Exercises")?.exercises?.map((exercise: any, idx: number) => (
                                  <div key={idx} className="border border-green-200 rounded-md p-4 bg-green-50/30">
                                    <div className="flex justify-between items-start mb-3">
                                      <h5 className="text-md font-semibold text-green-800">{exercise.name}</h5>
                                      <Badge variant={
                                        exercise.recommendationStrength === "highly recommended" ? "default" : 
                                        exercise.recommendationStrength === "recommended" ? "secondary" : 
                                        "outline"
                                      }>
                                        {exercise.recommendationStrength}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-3">{exercise.description}</p>
                                    
                                    {exercise.loadingParameters && (
                                      <div className="bg-white border rounded-md p-3 mb-3">
                                        <h6 className="font-semibold text-green-700 mb-2 flex items-center">
                                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                          Exercise Prescription
                                        </h6>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          <div>
                                            <span className="font-medium text-green-700">Sets: </span>
                                            {exercise.loadingParameters.sets}
                                          </div>
                                          <div>
                                            <span className="font-medium text-green-700">Repetitions: </span>
                                            {exercise.loadingParameters.reps}
                                          </div>
                                          <div>
                                            <span className="font-medium text-green-700">Frequency: </span>
                                            {exercise.loadingParameters.frequency}
                                          </div>
                                          <div>
                                            <span className="font-medium text-green-700">Intensity: </span>
                                            {exercise.loadingParameters.intensity}
                                          </div>
                                        </div>
                                        {exercise.loadingParameters.progressionCriteria && (
                                          <div className="mt-2">
                                            <span className="font-medium text-green-700">Progression: </span>
                                            <span className="text-sm text-gray-700">{exercise.loadingParameters.progressionCriteria}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="font-medium text-green-700">Target: </span>
                                        {exercise.targetMuscleGroup}
                                      </div>
                                      <div>
                                        <span className="font-medium text-green-700">Evidence: </span>
                                        <Badge variant="outline" className="ml-1">{exercise.evidenceLevel}</Badge>
                                      </div>
                                    </div>

                                    {exercise.researchSupport && (
                                      <p className="text-xs text-gray-600 mt-2 italic">
                                        Research: {exercise.researchSupport}
                                      </p>
                                    )}

                                    {exercise.modificationOptions && exercise.modificationOptions.length > 0 && (
                                      <div className="mt-2">
                                        <span className="font-medium text-green-700 text-sm">Modifications: </span>
                                        <ul className="text-xs text-gray-600 list-disc list-inside">
                                          {exercise.modificationOptions.map((mod: string, modIdx: number) => (
                                            <li key={modIdx}>{mod}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Patient Education */}
                          {Array.isArray(patient.treatmentOptions) && patient.treatmentOptions.find((category: any) => category.category === "Patient Education") && (
                            <div className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-3 bg-purple-50 p-2 rounded flex items-center">
                                <BookOpen className="h-4 w-4 mr-2 text-purple-600" />
                                Patient Education
                              </h4>
                              <div className="space-y-3">
                                {patient.treatmentOptions.find((category: any) => category.category === "Patient Education")?.recommendations?.map((rec: any, idx: number) => (
                                  <div key={idx} className="border border-purple-200 rounded-md p-3 bg-purple-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="text-md font-medium text-purple-800">{rec.topic}</h5>
                                      <Badge variant="outline">{rec.evidenceLevel}</Badge>
                                    </div>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                      {rec.keyPoints?.map((point: string, pointIdx: number) => (
                                        <li key={pointIdx} className="flex items-start">
                                          <span className="text-purple-500 mr-2 mt-1">•</span>
                                          {point}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback for old format or other exercises */}
                          {patient.treatmentOptions.recommendedExercises && patient.treatmentOptions.recommendedExercises.length > 0 && (
                            <div className="border rounded-lg p-4">
                              <h4 className="text-md font-semibold mb-3 bg-gray-50 p-2 rounded">
                                Additional Exercises
                              </h4>
                              <div className="space-y-3">
                                {patient.treatmentOptions.recommendedExercises.map((exercise: any, idx: number) => (
                                  <div key={idx} className="border border-gray-200 rounded-md p-3">
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="text-md font-medium">{exercise.name}</h5>
                                      <Badge variant="outline">Exercise</Badge>
                                    </div>
                                    {exercise.purpose && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        <span className="font-medium">Purpose: </span>
                                        {exercise.purpose}
                                      </p>
                                    )}
                                    {exercise.technique && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        <span className="font-medium">Technique: </span>
                                        {exercise.technique}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Education Points Section */}
                      {patient.treatmentOptions.educationPoints && patient.treatmentOptions.educationPoints.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                            Education Points
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {patient.treatmentOptions.educationPoints.map((point: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Progression Criteria Section */}
                      {patient.treatmentOptions.progressionCriteria && patient.treatmentOptions.progressionCriteria.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                            Progression Criteria
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {patient.treatmentOptions.progressionCriteria.map((criteria: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">{criteria}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Immediate Interventions Section */}
                      {patient.treatmentOptions.immediateInterventions && patient.treatmentOptions.immediateInterventions.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                            Immediate Interventions
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {patient.treatmentOptions.immediateInterventions.map((intervention: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">{intervention}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Rehabilitation Progression Section */}
                      {patient.treatmentOptions.rehabilitationProgression && patient.treatmentOptions.rehabilitationProgression.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                            Rehabilitation Progression
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {patient.treatmentOptions.rehabilitationProgression.map((progression: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">{progression}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Expected Outcomes Section */}
                      {patient.treatmentOptions.expectedOutcomes && patient.treatmentOptions.expectedOutcomes.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                            Expected Outcomes
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {patient.treatmentOptions.expectedOutcomes.map((outcome: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">{outcome}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* PATIENT PROGRESS TAB */}
          <TabsContent value="progression" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No Patient Progress Data",
                "Analyze the patient data to view rehabilitation progress tracking."
              )
            ) : (
              <PatientProgressTracker
                patientId={patientId}
                patientName={patient.patient_name}
                diagnosis={patient.diagnosis}
                bodyPart={patient.body_part || "general"}
              />
            )}
          </TabsContent>

          {/* INTERACTIVE ANATOMY TAB */}
          <TabsContent value="anatomy" className="p-6">
            <BodyPartZoom
              bodyPart={patient.body_part}
              patientId={patientId}
              userId={patient.user_id}
            />
          </TabsContent>

          {/* RESEARCH TAB */}
          <TabsContent value="research" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No Research References Available",
                "Analyze the patient data to view relevant research articles."
              )
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-indigo-500" />
                    Related Research Articles
                  </h3>

                  {patient.relatedArticles && patient.relatedArticles.length > 0 ? (
                    <div className="space-y-4">
                      {patient.relatedArticles.map((article: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex justify-between">
                            <h4 className="text-md font-semibold mb-1">
                              {article.title}
                            </h4>
                            <Badge>
                              {article.evidence_level || "Level 1"} Evidence
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {article.authors} - {article.journal},{" "}
                            {article.publication_year}
                          </p>
                          <p className="text-sm mb-2">{article.abstract}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {article.keywords &&
                              article.keywords.map(
                                (keyword: string, kIdx: number) => (
                                  <Badge
                                    key={kIdx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {keyword}
                                  </Badge>
                                )
                              )}
                          </div>
                          <div className="mt-3 flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">
                              DOI: {article.doi || "N/A"}
                            </p>
                            {article.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Full Article{" "}
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 border rounded-md border-dashed">
                      <p className="text-muted-foreground">
                        No research articles available for this patient case.
                      </p>
                    </div>
                  )}
                </div>

                {patient.expertSources && patient.expertSources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Expert Clinical Approaches
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {patient.expertSources.map((source: any, idx: number) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-4 bg-muted/30"
                        >
                          <h4 className="text-md font-semibold mb-2 flex items-center">
                            <ThumbsUp className="h-4 w-4 mr-1 text-green-500" />
                            {source.name}
                          </h4>
                          <p className="text-sm mb-2">{source.description}</p>
                          {source.recommendations && (
                            <div>
                              <h5 className="text-sm font-medium mb-1">
                                Key Recommendations:
                              </h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {source.recommendations.map(
                                  (rec: string, recIdx: number) => (
                                    <li key={recIdx} className="text-sm">
                                      {rec}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ADDITIONAL INFORMATION NEEDED TAB */}
          <TabsContent value="additional-info" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No Additional Information Guidelines Available",
                "Analyze the patient data to view suggested follow-up questions and assessments."
              )
            ) : (
              <div className="space-y-6">
                {patient.additionalInformationNeeded && (
                  <>
                    {/* History Questions Section */}
                    {patient.additionalInformationNeeded.historyQuestions && 
                     patient.additionalInformationNeeded.historyQuestions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <User className="h-5 w-5 mr-2 text-blue-500" />
                          Additional History Questions
                        </h3>
                        <div className="space-y-4">
                          {patient.additionalInformationNeeded.historyQuestions.map((category: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <h4 className="font-semibold text-md mb-2 text-blue-600">
                                {category.category}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-3">
                                {category.purpose}
                              </p>
                              <ul className="space-y-2">
                                {category.questions.map((question: string, qIdx: number) => (
                                  <li key={qIdx} className="flex items-start">
                                    <span className="text-blue-500 mr-2 mt-1">•</span>
                                    <span className="text-sm">{question}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Objective Assessments Section */}
                    {patient.additionalInformationNeeded.objectiveAssessments && 
                     patient.additionalInformationNeeded.objectiveAssessments.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <Clipboard className="h-5 w-5 mr-2 text-green-500" />
                          Recommended Objective Assessments
                        </h3>
                        <div className="space-y-4">
                          {patient.additionalInformationNeeded.objectiveAssessments.map((assessment: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-md text-green-600">
                                  {assessment.test}
                                </h4>
                                <Badge variant={
                                  assessment.priority === "high" ? "destructive" : 
                                  assessment.priority === "medium" ? "secondary" : 
                                  "outline"
                                }>
                                  {assessment.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Rationale:</strong> {assessment.rationale}
                              </p>
                              {assessment.expectedFindings && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  <strong>Expected Findings:</strong> {assessment.expectedFindings}
                                </p>
                              )}
                              {assessment.technique && (
                                <p className="text-sm">
                                  <strong>Technique:</strong> {assessment.technique}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Imaging Considerations Section */}
                    {patient.additionalInformationNeeded.imagingConsiderations && 
                     patient.additionalInformationNeeded.imagingConsiderations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-purple-500" />
                          Imaging Considerations
                        </h3>
                        <div className="space-y-4">
                          {patient.additionalInformationNeeded.imagingConsiderations.map((imaging: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <h4 className="font-semibold text-md mb-2 text-purple-600">
                                {imaging.modality}
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p><strong>Indication:</strong> {imaging.indication}</p>
                                <p><strong>Expected Findings:</strong> {imaging.expectedFindings}</p>
                                {imaging.differentialFindings && (
                                  <p><strong>Differential Findings:</strong> {imaging.differentialFindings}</p>
                                )}
                                {imaging.costBenefit && (
                                  <p className="text-muted-foreground">
                                    <strong>Cost-Benefit Analysis:</strong> {imaging.costBenefit}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specialized Tests Section */}
                    {patient.additionalInformationNeeded.specializedTests && 
                     patient.additionalInformationNeeded.specializedTests.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <Brain className="h-5 w-5 mr-2 text-orange-500" />
                          Specialized Clinical Tests
                        </h3>
                        <div className="space-y-4">
                          {patient.additionalInformationNeeded.specializedTests.map((test: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <h4 className="font-semibold text-md mb-2 text-orange-600">
                                {test.test}
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p><strong>Purpose:</strong> {test.purpose}</p>
                                <p><strong>Technique:</strong> {test.technique}</p>
                                <p><strong>Interpretation:</strong> {test.interpretation}</p>
                                {test.timing && (
                                  <p className="text-muted-foreground">
                                    <strong>Optimal Timing:</strong> {test.timing}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* No additional information available */}
                {!patient.additionalInformationNeeded && (
                  <div className="text-center p-6 border rounded-md border-dashed">
                    <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No additional information gathering guidelines available for this analysis.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* 3D SKELETON MODEL TAB */}
          <TabsContent value="3d-model" className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-500" />
                  3D Patient Skeleton Model
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Interactive 3D skeleton model showing patient-specific anatomical features, joint restrictions, and pain areas.
                </p>
              </div>
              
              <MixamoSkeleton
                patientData={{
                  anthropometrics: {
                    height: parseInt(patient.patient_data?.height) || 170,
                    weight: parseInt(patient.patient_data?.weight) || 70,
                    limbLengths: {
                      upperArm: 30,
                      forearm: 25,
                      thigh: 40,
                      shin: 35,
                    },
                  },
                  jointRestrictions: {
                    shoulder: {
                      flexion: patient.patient_data?.shoulderFlexion || 180,
                      extension: patient.patient_data?.shoulderExtension || 60,
                      abduction: patient.patient_data?.shoulderAbduction || 180,
                      adduction: patient.patient_data?.shoulderAdduction || 30,
                    },
                    elbow: {
                      flexion: patient.patient_data?.elbowFlexion || 145,
                      extension: patient.patient_data?.elbowExtension || 0,
                    },
                    hip: {
                      flexion: patient.patient_data?.hipFlexion || 120,
                      extension: patient.patient_data?.hipExtension || 30,
                      abduction: patient.patient_data?.hipAbduction || 45,
                      adduction: patient.patient_data?.hipAdduction || 30,
                    },
                    knee: {
                      flexion: patient.patient_data?.kneeFlexion || 140,
                      extension: patient.patient_data?.kneeExtension || 0,
                    },
                  },
                  painAreas: patient.pain_areas || [patient.body_part].filter(Boolean),
                  movementPatterns: patient.movement_patterns,
                }}
                className="h-[700px]"
                showControls={true}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBackToList} size="sm">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Patient List
        </Button>
        {!hasDiagnosis && (
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Ready to analyze this patient?
            </p>
            {renderAnalyzeButton()}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}